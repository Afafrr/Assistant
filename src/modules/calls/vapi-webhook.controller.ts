import { Request, Response } from 'express';
import { handleVapiEvent } from './call.service';

export const vapiWebhook = async (req: Request, res: Response) => {
  res.sendStatus(200);

  try {
    await handleVapiEvent(req.body);
  } catch (error) {
    console.error('Vapi webhook action failed:', error);
  }
};
