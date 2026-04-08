import { CallStatus } from '../../generated/prisma/client';
import { isVapiSipDestination } from '../../integrations/vapi/vapi.utils';
import { findPhoneNumber } from '../phone/phone.repository';
import { createCallRecord, updateCallRecordByControlId } from './call.repository';
import { answerCall } from './handlers/call-actions.handler';
import { transferCallToAgent } from './handlers/call-transfer.handler';
import { mapCallStatus, parseDurationSeconds, parseEndedAt, parseStartedAt } from './utils/call-event.utils';

const handleInitiatedEvent = async (event: any, callControlId: string, isInboundLeg: boolean, isVapiLeg: boolean) => {
  if (!isInboundLeg || isVapiLeg) {
    console.warn('Ignoring call.initiated for non-inbound or Vapi leg:', callControlId);
    return;
  }

  const payload = event?.data?.payload;
  const destination = payload?.to;
  const fromPhone = payload?.from;

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
};

const handleAnsweredEvent = async (event: any, callControlId: string, isInboundLeg: boolean, isVapiLeg: boolean) => {
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
};

const handleHangupEvent = async (event: any, callControlId: string, isVapiLeg: boolean) => {
  const payload = event?.data?.payload;
  const status = mapCallStatus({
    provider: 'telnyx',
    eventType: event?.data?.event_type,
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
};

export const handleTelnyxEvent = async (event: any) => {
  const eventType = event?.data?.event_type;
  const payload = event?.data?.payload;
  const callControlId = payload?.call_control_id;
  const direction = payload?.direction;
  const destination = payload?.to;
  const isVapiLeg = isVapiSipDestination(destination);
  const isInboundLeg = direction ? direction === 'incoming' : !isVapiLeg;

  if (!callControlId) {
    console.warn('TELNYX EVENT missing call_control_id:', eventType);
    return;
  }

  if (eventType === 'call.initiated') {
    await handleInitiatedEvent(event, callControlId, isInboundLeg, isVapiLeg);
    return;
  }

  if (eventType === 'call.answered') {
    await handleAnsweredEvent(event, callControlId, isInboundLeg, isVapiLeg);
    return;
  }

  if (eventType === 'call.hangup') {
    await handleHangupEvent(event, callControlId, isVapiLeg);
  }
};
