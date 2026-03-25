import { env } from '../../config/env';

const VAPI_SIP_DOMAIN = '@sip.vapi.ai';

export const requireVapiSipUri = () => {
  const sipUri = env.VAPI_SIP_URI.trim();

  if (!sipUri) {
    throw new Error('Missing VAPI_SIP_URI');
  }

  if (!sipUri.startsWith('sip:') || !sipUri.includes(VAPI_SIP_DOMAIN)) {
    throw new Error('VAPI_SIP_URI must be a valid SIP URI ending in @sip.vapi.ai');
  }

  return sipUri;
};
