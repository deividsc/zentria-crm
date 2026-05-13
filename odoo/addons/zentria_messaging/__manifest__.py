{
    'name': 'Zentria Messaging',
    'version': '17.0.1.0.0',
    'summary': 'Envío de mensajes WhatsApp y Email desde la ficha del lead',
    'category': 'CRM',
    'author': 'Zentria',
    'depends': ['crm', 'mail'],
    'data': [
        'security/ir.model.access.csv',
        'views/crm_lead_views.xml',
        'wizard/send_message_wizard_views.xml',
    ],
    'installable': True,
    'application': False,
    'license': 'LGPL-3',
}
