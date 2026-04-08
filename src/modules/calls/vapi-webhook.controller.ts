import { Request, Response } from 'express';
import { handleVapiEvent } from './vapi-call.service';

export const vapiWebhook = async (req: Request, res: Response) => {
  res.json({ success: true });

  try {
    await handleVapiEvent(req.body);
  } catch (error) {
    console.error('Vapi webhook action failed:', error);
  }
};
