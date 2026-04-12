import { createTelnyxClient } from '../../../integrations/telnyx/telnyx.client';
import { requireVapiSipUri } from '../../../integrations/vapi/vapi.client';
import type { TenantPromptConfig } from '../../../generated/prisma/client';

// SIP treats commas as list separators, so a comma in a custom header value causes the string to be split into multiple values. Remove commas before sending.
function stripSipCommas(value: string): string {
  return value.replace(/,/g, '');
}

function buildAgentHeaders(config: TenantPromptConfig): Array<{ name: string; value: string }> {
  const headers: Array<{ name: string; value: string }> = [
    { name: 'X-company_name', value: stripSipCommas(config.companyName) },
    { name: 'X-greeting', value: stripSipCommas(config.greeting) },
  ];

  return headers;
}

export const transferCallToAgent = async (data: any, callControlId: string, promptConfig: TenantPromptConfig | null) => {
  const client = createTelnyxClient();
  const sipUri = requireVapiSipUri();
  const payload = data?.payload;
  const from = typeof payload?.to === 'string' ? payload.to : undefined;

  const agentHeaders = promptConfig ? buildAgentHeaders(promptConfig) : [];

  await client.calls.actions.transfer(callControlId, {
    to: sipUri,
    from,
    command_id: `transfer-to-agent-${callControlId}`,
    custom_headers: [{ name: 'X-telnyx-call-control-id', value: callControlId }, ...agentHeaders],
  });

  console.log('Transferred call to agent SIP URI:', {
    callControlId,
    sipUri,
    from,
    customHeaderNames: agentHeaders.map((header) => header.name),
  });
};
