// Production config template — copy to zentria-config.js and fill in real values.
// zentria-config.js is git-ignored — NEVER commit real keys or tokens.
//
// Environments:
//   local → copy zentria-config.local.js  → zentria-config.js
//   prod  → copy zentria-config.example.js → zentria-config.js (fill values)
window.ZENTRIA_CONFIG = {
  apiKey: 'your_api_key_here',
  endpoint: 'https://your-vps-domain.com',
  debug: false,
  webhookUrl: 'https://your-n8n-domain.com/webhook/lead-webform',
  webhookToken: 'your_webhook_secret_token',
};
