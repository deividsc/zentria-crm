from odoo import models


class CrmLead(models.Model):
    _inherit = 'crm.lead'

    def action_open_send_message(self):
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': 'Enviar mensaje',
            'res_model': 'zentria.send.message.wizard',
            'view_mode': 'form',
            'target': 'new',
            'context': {'default_lead_id': self.id},
        }
