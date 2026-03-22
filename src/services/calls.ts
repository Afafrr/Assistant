import { createTelnyxClient } from '../providers/telnyx';
import { requireVapiSipUri } from '../providers/vapi';

const VAPI_SIP_DOMAIN = '@sip.vapi.ai';

const customHeaders: Array<{ name: string; value: string }> = [
  { name: 'X-company_name', value: 'BEST COAL POL' },
  // { name: 'X-Products', value: 'Eco Coal 1200 zl; Premium Coal 1500 zl' },
];

export const isVapiSipDestination = (destination?: string) => Boolean(destination && destination.toLowerCase().includes(VAPI_SIP_DOMAIN));

export const answerCall = async (callControlId: string) => {
  const client = createTelnyxClient();

  await client.calls.actions.answer(callControlId, {});
  console.log('Answered call:', callControlId);
};

export const transferCallToVapiAgent = async (data: any, callControlId: string) => {
  const client = createTelnyxClient();
  const sipUri = requireVapiSipUri();
  const payload = data?.payload;
  const from = typeof payload?.to === 'string' ? payload.to : undefined;

  await client.calls.actions.transfer(callControlId, {
    to: sipUri,
    from,
    command_id: `transfer-to-vapi-${callControlId}`,
    custom_headers: customHeaders,
  });

  console.log('Transferred call to Vapi SIP URI:', {
    callControlId,
    sipUri,
    from,
    customHeaderNames: customHeaders.map((header) => header.name),
  });
};
