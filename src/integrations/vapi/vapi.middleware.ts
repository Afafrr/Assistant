import { Request, Response, NextFunction } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '../../config/env';

export const verifyVapiWebhookSignature = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawBody = req.body ? req.body.toString() : '';
    const signature = req.headers['x-signature'] as string;
    const timestamp = req.headers['x-timestamp'] as string;

    if (!signature) {
      console.error('VAPI webhook missing signature header');
      return res.sendStatus(403);
    }

    if (!timestamp) {
      console.error('VAPI webhook missing timestamp header');
      return res.sendStatus(403);
    }
    //replay attack protection - reject if timestamp is more than 5 minutes old
    if (Date.now() - Number(timestamp) > 5 * 60 * 1000) {
      console.error('VAPI webhook timestamp too old');
      return res.sendStatus(403);
    }

    const expected = createHmac('sha256', env.VAPI_WEBHOOK_SECRET).update(`${timestamp}.${rawBody}`).digest('hex');

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    if (sigBuffer.length !== expectedBuffer.length) {
      return res.sendStatus(403);
    }

    if (!timingSafeEqual(sigBuffer, expectedBuffer)) {
      return res.sendStatus(403);
    }

    req.body = rawBody ? JSON.parse(rawBody) : undefined;
    next();
  } catch (error) {
    console.error('VAPI webhook signature verification failed:', error);
    res.sendStatus(403);
  }
};
