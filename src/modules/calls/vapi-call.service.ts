import { handleOrderToolCalls } from '../orders/order.service';
import { findCallByControlId, updateCallRecordByControlId, updateCallRecordById } from './call.repository';
import { mapCallStatus } from './utils/call-event.utils';

export const handleVapiEvent = async (event: any) => {
  const message = event?.message;
  const type = message?.type;
  const agentCallId = message?.call?.id;
  const callControlId =
    // Vapi has moved this Telnyx header between payload shapes; check the newest metadata slot first and
    // then fall back to SIP transport details used by earlier webhook versions.
    message?.call?.metadata?.telnyx_call_control_id ??
    message?.call?.transport?.sip?.headers?.['X-telnyx-call-control-id'] ??
    message?.call?.phoneCallProviderDetails?.sip?.headers?.['X-telnyx-call-control-id'];

  if (!callControlId) {
    console.warn('VAPI EVENT missing call_control_id in message:', type);
    return;
  }

  if (agentCallId) {
    // Persist the agent-side call ID so server-url tool requests that only send x-call-id can be mapped back to our call row.
    const vapiLinkResult = await updateCallRecordByControlId(callControlId, { agentCallId });
    if (!vapiLinkResult.updated && vapiLinkResult.reason !== 'call_not_found') {
      console.warn('Agent call ID link skipped:', { callControlId, agentCallId, reason: vapiLinkResult.reason });
    }
  }

  await handleOrderToolCalls(callControlId, message);

  if (type !== 'end-of-call-report') {
    // Most Vapi events are intermediate conversation updates. We only finalize call status once Vapi
    // publishes the terminal report so Telnyx remains the source of truth for earlier states.
    return;
  }

  const call = await findCallByControlId(callControlId);
  if (!call) {
    console.warn('No call record found for VAPI event with call_control_id:', callControlId);
    return;
  }

  const durationSeconds = message.durationSeconds;
  const status = mapCallStatus({ provider: 'vapi', payload: message });

  const updateResult = await updateCallRecordById(call.id, {
    status,
    durationSeconds,
  });

  console.log('VAPI call updated:', { callId: call.id, status, durationSeconds });
  if (!updateResult.updated) {
    console.warn('VAPI call update skipped:', updateResult.reason, call.id);
  }
};
