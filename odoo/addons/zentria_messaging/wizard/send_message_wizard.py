import json
import urllib.request
import urllib.error
import logging

from odoo import models, fields, api, _
from odoo.exceptions import UserError

_logger = logging.getLogger(__name__)


class ZentriaSendMessageWizard(models.TransientModel):
    _name = 'zentria.send.message.wizard'
    _description = 'Enviar mensaje al lead'

    lead_id = fields.Many2one('crm.lead', required=True, ondelete='cascade')

    channel = fields.Selection(
        selection=[
            ('whatsapp', '📱 WhatsApp'),
            ('email', '✉️ Email'),
        ],
        string='Canal',
        required=True,
        default='whatsapp',
    )

    phone = fields.Char(string='Teléfono', compute='_compute_contact_info', store=False)
    email = fields.Char(string='Email', compute='_compute_contact_info', store=False)
    message = fields.Text(string='Mensaje', required=True)

    channel_available = fields.Boolean(compute='_compute_channel_available')
    warning = fields.Char(compute='_compute_channel_available')

    @api.depends('lead_id')
    def _compute_contact_info(self):
        for rec in self:
            rec.phone = rec.lead_id.phone or rec.lead_id.mobile or ''
            rec.email = rec.lead_id.email_from or ''

    @api.depends('channel', 'phone', 'email')
    def _compute_channel_available(self):
        for rec in self:
            if rec.channel == 'whatsapp':
                rec.channel_available = bool(rec.phone)
                rec.warning = '' if rec.phone else 'Este lead no tiene teléfono registrado.'
            else:
                rec.channel_available = bool(rec.email)
                rec.warning = '' if rec.email else 'Este lead no tiene email registrado.'

    def action_send(self):
        self.ensure_one()

        if not self.channel_available:
            raise UserError(self.warning or _('No hay datos de contacto para este canal.'))

        n8n_url = self.env['ir.config_parameter'].sudo().get_param(
            'zentria_messaging.n8n_send_url', ''
        )
        api_key = self.env['ir.config_parameter'].sudo().get_param(
            'zentria_messaging.internal_api_key', ''
        )

        if not n8n_url:
            raise UserError(_(
                'No está configurada la URL de n8n. '
                'Ve a Ajustes → Parámetros del sistema → zentria_messaging.n8n_send_url'
            ))

        payload = {
            'channel':    self.channel,
            'message':    self.message,
            'leadId':     self.lead_id.id,
            'senderName': self.env.user.name,
            'apiKey':     api_key,
        }

        if self.channel == 'whatsapp':
            payload['phone'] = self.phone
        else:
            payload['email'] = self.email

        try:
            data = json.dumps(payload).encode('utf-8')
            req = urllib.request.Request(
                n8n_url,
                data=data,
                headers={'Content-Type': 'application/json'},
                method='POST',
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                result = json.loads(response.read().decode('utf-8'))
                if not result.get('ok'):
                    raise UserError(_('El servicio de mensajería devolvió un error: %s') % str(result))
        except urllib.error.HTTPError as e:
            body = e.read().decode('utf-8', errors='replace')
            _logger.error('zentria_messaging: HTTP error %s — %s', e.code, body)
            raise UserError(_('Error al enviar el mensaje (HTTP %s). Revisá los logs.') % e.code)
        except urllib.error.URLError as e:
            _logger.error('zentria_messaging: URL error — %s', e.reason)
            raise UserError(_('No se pudo conectar con el servicio de mensajería: %s') % str(e.reason))

        # Log in chatter
        channel_label = dict(self._fields['channel'].selection).get(self.channel, self.channel)
        self.lead_id.message_post(
            body=_(
                '<p>%(label)s <strong>%(sender)s</strong> envió por <strong>%(channel)s</strong>:</p><p>%(msg)s</p>'
            ) % {
                'label': '📤',
                'sender': self.env.user.name,
                'channel': channel_label,
                'msg': self.message.replace('\n', '<br/>'),
            },
            message_type='comment',
            subtype_xmlid='mail.mt_note',
        )

        return {'type': 'ir.actions.act_window_close'}
