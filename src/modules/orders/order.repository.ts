import { prisma } from '../../lib/prisma';
import { isPrismaRecordNotFound, isPrismaRequiredRelationViolation, isPrismaUniqueConstraint } from '../../lib/prisma-errors';
import { OrderCreateInput } from '../../generated/prisma/models';

export type CreateOrderRecordInput = Omit<OrderCreateInput, 'tenant' | 'call'>;
export type CreateOrderRecordResult = { created: true; orderId: string } | { created: false; reason: 'missing_required_fields' | 'duplicate_order' };

export type UpdateOrderRecordInput = Pick<OrderCreateInput, 'status' | 'customerName' | 'customerPhone' | 'product' | 'amount_tons' | 'address'>;
export type UpdateOrderRecordResult = { updated: true } | { updated: false; reason: 'missing_required_fields' | 'order_not_found' };

export async function createOrderRecord(callId: string, tenantId: string, customerPhone: string, data: CreateOrderRecordInput): Promise<CreateOrderRecordResult> {
  if (!callId || !tenantId) {
    return {
      created: false,
      reason: 'missing_required_fields',
    };
  }

  try {
    const order = await prisma.order.create({
      data: {
        tenant: { connect: { id: tenantId } },
        call: { connect: { id: callId } },
        customerPhone,
        ...data,
      },
      select: {
        id: true,
      },
    });

    return {
      created: true,
      orderId: order.id,
    };
  } catch (error) {
    if (isPrismaUniqueConstraint(error) || isPrismaRequiredRelationViolation(error)) {
      return {
        created: false,
        reason: 'duplicate_order',
      };
    }
    throw error;
  }
}

export async function updateOrderRecordByCallId(callId: string, data: UpdateOrderRecordInput): Promise<UpdateOrderRecordResult> {
  const hasAnyField = Object.values(data).some((value) => value !== undefined);
  if (!hasAnyField) {
    return {
      updated: false,
      reason: 'missing_required_fields',
    };
  }

  try {
    await prisma.order.update({
      where: { callId },
      data,
    });
  } catch (error) {
    if (isPrismaRecordNotFound(error)) {
      return {
        updated: false,
        reason: 'order_not_found',
      };
    }
    throw error;
  }

  return {
    updated: true,
  };
}
