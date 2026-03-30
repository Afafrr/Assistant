import express from 'express';
import { telnyxWebhook } from './modules/calls/telnyx-webhook.controller';
import { handleTelnyxEvent } from './modules/calls/call.service';
import { vapiWebhook } from './modules/calls/vapi-webhook.controller';
import { verifyWebhookSignature } from './integrations/telnyx/telnyx.middleware';

const app = express();
app.get('/', (_, res) => {
  res.send('Server running');
});

// Raw body required for signature verification
app.post('/webhooks/telnyx', express.raw({ type: 'application/json' }), verifyWebhookSignature, telnyxWebhook);
app.post('/webhooks/vapi', express.json(), vapiWebhook);

app.use(express.json());

app.listen(3000, () => {
  console.log('http://localhost:3000');
});
