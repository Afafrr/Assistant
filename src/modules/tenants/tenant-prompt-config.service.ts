import type { Request } from 'express';
import { findCallByAgentCallId } from '../calls/call.repository';
import { findPromptConfigByTenantId } from './tenant-prompt-config.repository';

export type VapiToolResult = {
  toolCallId?: string;
  result: string;
};

type PromptConfigResponse = {
  statusCode: number;
  body: {
    results: VapiToolResult[];
  };
};

function extractPromptConfigRequest(req: Request): { agentCallId?: string; toolCallId?: string } {
  const message = req.body?.message;

  return {
    agentCallId: req.header('x-call-id') ?? message?.call?.id,
    toolCallId: message?.toolCallList?.[0]?.id,
  };
}

function toolResponse(statusCode: number, toolCallId: string | undefined, result: string): PromptConfigResponse {
  return {
    statusCode,
    body: {
      results: [{ toolCallId, result }],
    },
  };
}

export async function getPromptConfigResponse(req: Request): Promise<PromptConfigResponse> {
  const { agentCallId, toolCallId } = extractPromptConfigRequest(req);

  if (!agentCallId) {
    console.warn('get_prompt_config: missing call identifier');
    return toolResponse(400, toolCallId, 'error: missing call identifier');
  }

  const call = await findCallByAgentCallId(agentCallId);
  if (!call) {
    console.warn('get_prompt_config: no call record for identifier:', { agentCallId });
    return toolResponse(200, toolCallId, 'error: call not found');
  }

  const config = await findPromptConfigByTenantId(call.tenantId);
  if (!config) {
    console.warn('get_prompt_config: no prompt config for tenant:', call.tenantId);
    return toolResponse(200, toolCallId, 'error: prompt config not found');
  }
  console.log('CONFIG RETURNED for tenant:', call.tenantId);

  return toolResponse(
    200,
    toolCallId,
    JSON.stringify({
      companyName: config.companyName,
      greeting: config.greeting,
      systemPrompt: config.systemPrompt ?? null,
      products: config.products,
      additionalInfo: config.additionalInfo ?? null,
    }),
  );
}
