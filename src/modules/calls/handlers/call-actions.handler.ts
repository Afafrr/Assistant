import { createTelnyxClient } from '../../../integrations/telnyx/telnyx.client';

export const answerCall = async (callControlId: string) => {
  const client = createTelnyxClient();

  await client.calls.actions.answer(callControlId, {});
};
