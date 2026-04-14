import { Request, Response } from 'express';
import { createOrderFromToolCall } from './order.service';

export const orderToolWebhook = async (req: Request, res: Response) => {
  console.log('[TOOL - order]');

  try {
    const agentCallId = req.headers['x-call-id'] as string | undefined;
    const { product, amount_tons, address } = req.body ?? {};

    if (!agentCallId) {
      console.warn('Order tool request missing x-call-id header');
      return res.status(400).json({ error: 'missing x-call-id header' });
    }

    const result = await createOrderFromToolCall(agentCallId, { product, amount_tons, address });

    if (!result.created) {
      console.warn('Order creation failed:', result.reason);
      const status = result.reason === 'call_not_found' ? 404 : 409;
      return res.status(status).json({ error: result.reason });
    }

    console.log('Order created:', result);
    return res.json({ result: 'order saved successfully' });
  } catch (error) {
    console.error('Order tool webhook action failed:', error);
    return res.status(500).json({ error: 'internal error' });
  }
};
