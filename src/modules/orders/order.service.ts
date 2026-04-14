import { findCallByAgentCallId } from '../calls/call.repository';
import { createOrderRecord, type CreateOrderRecordInput } from './order.repository';
export type SaveOrderArguments = Pick<CreateOrderRecordInput, 'product' | 'amount_tons' | 'address'>;

export type CreateOrderFromToolCallResult =
  | { created: true; orderId: string }
  | { created: false; reason: 'call_not_found' | 'missing_required_fields' | 'duplicate_order' };

export const createOrderFromToolCall = async (agentCallId: string, data: SaveOrderArguments): Promise<CreateOrderFromToolCallResult> => {
  const call = await findCallByAgentCallId(agentCallId);
  if (!call) {
    return { created: false, reason: 'call_not_found' };
  }

  return createOrderRecord(call.id, call.tenantId, call.fromPhoneE164, data as CreateOrderRecordInput);
};
