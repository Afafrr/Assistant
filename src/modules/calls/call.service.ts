import { isVapiSipDestination } from '../../integrations/vapi/vapi.utils';
import { CallStatus } from '../../generated/prisma/client';
import { findPhoneNumber } from '../phone/phone.repository';
import { mapCallStatus, parseDurationSeconds, parseEndedAt, parseStartedAt } from './utils/call-event.utils';
import { createCallRecord, updateCallRecordByControlId, updateCallRecordById, findCallByControlId } from './call.repository';
import { answerCall } from './handlers/call-actions.handler';
import { transferCallToAgent } from './handlers/call-transfer.handler';
import { handleOrderToolCalls } from '../orders/order.service';
import { logIncomingRequest } from '../../lib/file-logger';

export const handleTelnyxEvent = async (event: any) => {
  const eventType = event?.data?.event_type;
  const payload = event?.data?.payload;
  const callControlId = payload?.call_control_id;
  const direction = payload?.direction;
  const destination = payload?.to;
  const isVapiLeg = isVapiSipDestination(destination);
  const isInboundLeg = direction ? direction === 'incoming' : !isVapiLeg;
  const fromPhone = payload?.from;

  if (!callControlId) {
    console.warn('TELNYX EVENT missing call_control_id:', eventType);
    return;
  }

  if (eventType === 'call.initiated') {
    if (!isInboundLeg || isVapiLeg) {
      console.warn('Ignoring call.initiated for non-inbound or Vapi leg:', callControlId);
      return;
    }
    if (!destination) {
      console.warn('Missing destination phone number for call:', callControlId);
      return;
    }

    const phoneRouting = await findPhoneNumber(destination);
    if (!phoneRouting) {
      console.warn('No active phone number mapping found for destination:', destination);
      return;
    }

    const createResult = await createCallRecord({
      tenantId: phoneRouting.tenantId,
      phoneNumberId: phoneRouting.id,
      callControlId,
      fromPhoneE164: fromPhone,
      toPhoneE164: destination,
      status: CallStatus.initiated,
      startedAt: parseStartedAt(payload, event?.data) ?? new Date(),
    });

    if (!createResult.created) {
      console.warn('Call record creation skipped:', createResult.reason, callControlId);
      return;
    }

    await answerCall(callControlId);
    return;
  }

  if (eventType === 'call.answered') {
    if (!isInboundLeg || isVapiLeg) {
      console.warn('Ignoring call.answered for non-inbound or Vapi leg:', callControlId);
      return;
    }

    const updateResult = await updateCallRecordByControlId(callControlId, {
      status: CallStatus.in_progress,
    });
    if (!updateResult.updated) {
      console.warn('Call record update skipped:', updateResult.reason, callControlId);
      return;
    }

    await transferCallToAgent(event.data, callControlId);
    return;
  }

  if (eventType === 'call.hangup') {
    const status = mapCallStatus({
      provider: 'telnyx',
      eventType,
      payload,
      context: { isVapiLeg },
    });
    const endedAt = parseEndedAt(payload, event?.data);
    const durationSeconds = parseDurationSeconds(payload);
    const updateResult = await updateCallRecordByControlId(callControlId, {
      status,
      endedAt,
      durationSeconds,
    });

    if (!updateResult.updated) {
      if (updateResult.reason === 'call_not_found' && isVapiLeg) {
        console.log('Ignoring call.hangup for untracked Vapi leg:', callControlId);
        return;
      }
      console.warn('Call record update skipped:', updateResult.reason, callControlId);
      return;
    }

    console.log('Call ended:', { callControlId, status, endedAt, durationSeconds });
    return;
  }
};

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

  if (type === 'end-of-call-report') {
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
      return;
    }
  }
};
