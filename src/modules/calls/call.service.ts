import { isVapiSipDestination } from '../../integrations/vapi/vapi.utils';
import { CallStatus } from '../../generated/prisma/client';
import { findPhoneNumber } from '../phone/phone.repository';
import { parseDurationSeconds, parseEndedAt, resolveHangupStatus } from './utils/call-event.utils';
import { createCallRecord, updateCallRecord } from './call.repository';
import { answerCall } from './handlers/call-actions.handler';
import { transferCallToVapiAgent } from './handlers/call-transfer.handler';

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

  console.log('Telnyx event:', {
    eventType,
    callControlId,
    direction,
    destination,
  });

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
      status: CallStatus.in_progress,
    });

    if (!createResult.created) {
      console.warn('Call record creation skipped:', createResult.reason, callControlId);
      return;
    }
    console.log({ createResult });

    await answerCall(callControlId);
    return;
  }

  if (eventType === 'call.answered') {
    if (!isInboundLeg || isVapiLeg) {
      console.warn('Ignoring call.answered for non-inbound or Vapi leg:', callControlId);
      return;
    }

    const updateResult = await updateCallRecord(callControlId, {
      status: CallStatus.in_progress,
    });
    if (!updateResult.updated) {
      console.warn('Call record update skipped:', updateResult.reason, callControlId);
      return;
    }

    await transferCallToVapiAgent(event.data, callControlId);
    return;
  }

  if (eventType === 'call.hangup') {
    const status = resolveHangupStatus(payload);
    const endedAt = parseEndedAt(payload);
    const durationSeconds = parseDurationSeconds(payload);

    const updateResult = await updateCallRecord(callControlId, {
      status,
      endedAt,
      durationSeconds,
    });

    if (!updateResult.updated) {
      console.warn('Call record update skipped:', updateResult.reason, callControlId);
      return;
    }

    console.log('Call ended:', { callControlId, status, endedAt, durationSeconds });
    return;
  }

  console.log('TELNYX EVENT:', eventType);
};
