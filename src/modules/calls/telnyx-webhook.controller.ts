import { Request, Response } from 'express';
import { handleTelnyxEvent } from './telnyx-call.service';

export const telnyxWebhook = async (req: Request, res: Response) => {
  res.sendStatus(200);

  try {
    await handleTelnyxEvent(req.body);
  } catch (error) {
    console.error('Telnyx webhook action failed:', error);
  }
};
