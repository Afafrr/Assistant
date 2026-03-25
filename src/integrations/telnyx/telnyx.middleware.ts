import { Request, Response, NextFunction } from 'express';
import { createTelnyxClient } from './telnyx.client';

export const verifyWebhookSignature = async (req: Request, res: Response, next: NextFunction) => {
  const client = createTelnyxClient();

  try {
    const rawBody = req.body.toString();
    // if successful req.body is json parsed; failure throws and returns 403.
    const event = await client.webhooks.unwrap(rawBody, {
      headers: req.headers as Record<string, string>,
    });
    req.body = event;
    next();
  } catch (error) {
    console.error('Telnyx webhook signature verification failed:', error);
    res.sendStatus(403);
  }
};
