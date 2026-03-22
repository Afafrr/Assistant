import { Request, Response } from 'express';
import { answerCall, isVapiSipDestination, transferCallToVapiAgent } from '../services/calls';

export const telnyxWebhook = async (req: Request, res: Response) => {
  const event = req.body;
  const eventType = event?.data?.event_type;
  const payload = event?.data?.payload;
  const callControlId = payload?.call_control_id;
  const direction = payload?.direction;
  const destination = payload?.to;
  const isVapiLeg = isVapiSipDestination(destination); // True for transfer-created leg pointing to sip.vapi.ai (Leg B).
  const isInboundLeg = direction ? direction === 'incoming' : !isVapiLeg; // True for original caller leg we should answer/transfer (Leg A).

  // Ack first so Telnyx does not retry while we process call-control actions.
  res.sendStatus(200);

  if (!callControlId) {
    console.warn('TELNYX EVENT missing call_control_id:', eventType);
    return;
  }

  try {
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
      await answerCall(callControlId);
      return;
    }

    if (eventType === 'call.answered') {
      if (!isInboundLeg || isVapiLeg) {
        console.warn('Ignoring call.answered for non-inbound or Vapi leg:', callControlId);
        return;
      }
      await transferCallToVapiAgent(event.data, callControlId);
      return;
    }

    if (eventType === 'call.hangup') {
      console.log('Call ended:', callControlId);
      return;
    }

    console.log('TELNYX EVENT:', eventType);
  } catch (error) {
    console.error('Telnyx webhook action failed:', error);
  }
};
