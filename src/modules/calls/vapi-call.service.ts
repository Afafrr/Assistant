import { logIncomingRequest } from '../../lib/file-logger';
import { handleOrderToolCalls } from '../orders/order.service';
import { findCallByControlId, updateCallRecordById } from './call.repository';
import { mapCallStatus } from './utils/call-event.utils';

export const handleVapiEvent = async (event: any) => {
  logIncomingRequest(event);

  const message = event?.message;
  const type = message?.type;
  const callControlId =
    message?.call?.metadata?.telnyx_call_control_id ??
    message?.call?.transport?.sip?.headers?.['X-telnyx-call-control-id'] ??
    message?.call?.phoneCallProviderDetails?.sip?.headers?.['X-telnyx-call-control-id'];

  if (!callControlId) {
    console.warn('VAPI EVENT missing call_control_id in message:', type);
    return;
  }

  await handleOrderToolCalls(callControlId, message);

  if (type !== 'end-of-call-report') {
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
