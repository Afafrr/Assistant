import Telnyx from 'telnyx';
import { env } from '../../config/env';

export const createTelnyxClient = () => {
  return new Telnyx({
    apiKey: env.TELNYX_API_KEY,
    publicKey: env.TELNYX_PUBLIC_KEY,
  });
};
