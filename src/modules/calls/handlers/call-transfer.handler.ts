import { createTelnyxClient } from "../../../integrations/telnyx/telnyx.client";
import { requireVapiSipUri } from "../../../integrations/vapi/vapi.client";

const customHeaders: Array<{ name: string; value: string }> = [
  { name: 'X-company_name', value: 'BEST COAL POL' },
  // { name: 'X-Products', value: 'Eco Coal 1200 zl; Premium Coal 1500 zl' },
];

export const transferCallToAgent = async (data: any, callControlId: string) => {
  const client = createTelnyxClient();
  const sipUri = requireVapiSipUri();
  const payload = data?.payload;
  const from = typeof payload?.to === 'string' ? payload.to : undefined;

  await client.calls.actions.transfer(callControlId, {
    to: sipUri,
    from,
    command_id: `transfer-to-agent-${callControlId}`,
    custom_headers: customHeaders,
  });

  console.log('Transferred call to agent SIP URI:', {
    callControlId,
    sipUri,
    from,
    customHeaderNames: customHeaders.map((header) => header.name),
  });
};
