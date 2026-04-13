import { Request, Response } from 'express';
import { getPromptConfigResponse } from './tenant-prompt-config.service';

export const getPromptConfig = async (req: Request, res: Response) => {
  const response = await getPromptConfigResponse(req);
  return res.status(response.statusCode).json(response.body);
};
