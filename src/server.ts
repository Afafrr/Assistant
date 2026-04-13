import express from 'express';
import { telnyxWebhook } from './modules/calls/telnyx-webhook.controller';
import { vapiWebhook } from './modules/calls/vapi-webhook.controller';
import { getPromptConfig } from './modules/tenants/tenant-prompt-config.controller';
import { verifyWebhookSignature } from './integrations/telnyx/telnyx.middleware';
import { verifyVapiWebhookSignature } from './integrations/vapi/vapi.middleware';

const app = express();
app.get('/', (_, res) => {
  res.send('Server running');
});

// Raw body required for signature verification
app.post('/webhooks/telnyx', express.raw({ type: 'application/json' }), verifyWebhookSignature, telnyxWebhook);
app.post('/webhooks/vapi', express.raw({ type: 'application/json' }), verifyVapiWebhookSignature, vapiWebhook);

app.get('/tools/agent-prompt', express.raw({ type: 'application/json' }), verifyVapiWebhookSignature, getPromptConfig);

app.use(express.json());

app.listen(3000, () => {
  console.log('http://localhost:3000');
});
