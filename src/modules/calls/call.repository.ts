import { prisma } from '../../lib/prisma';
import { isPrismaRecordNotFound, isPrismaUniqueConstraint } from '../../lib/prisma-errors';
import type { Call, Prisma } from '../../generated/prisma/client';
import { CallCreateInput } from '../../generated/prisma/models';

type CreateCallRecordInput = Omit<CallCreateInput, 'tenant' | 'phoneNumber'> & {
  tenantId: string;
  phoneNumberId: string;
};
type CreateCallRecordResult = { created: false; reason: string } | { created: true; tenantId: string; phoneNumberId: string };
type UpdateCallRecordInput = {
  status: CreateCallRecordInput['status'];
  endedAt?: Date | string;
  durationSeconds?: number;
};
type UpdateCallRecordResult = { updated: false; reason: string } | { updated: true };

export async function createCallRecord(data: CreateCallRecordInput): Promise<CreateCallRecordResult> {
  if (!data.tenantId || !data.phoneNumberId || !data.fromPhoneE164 || !data.toPhoneE164 || !data.startedAt) {
    return {
      created: false,
      reason: 'missing_required_fields',
    };
  }

  let call;
  try {
    const createData: CallCreateInput = {
      tenant: { connect: { id: data.tenantId } },
      phoneNumber: { connect: { id: data.phoneNumberId } },
      callControlId: data.callControlId,
      fromPhoneE164: data.fromPhoneE164,
      toPhoneE164: data.toPhoneE164,
      status: data.status,
      startedAt: data.startedAt,
    };

    call = await prisma.call.create({
      data: createData,
    });
  } catch (error: any) {
    //duplicate callControlId error, in case of few same events received from Telnyx for the same call
    if (isPrismaUniqueConstraint(error)) {
      return {
        created: false,
        reason: 'duplicate_call_control_id',
      };
    }
    throw error;
  }

  return {
    created: true,
    tenantId: call.tenantId,
    phoneNumberId: call.phoneNumberId,
  };
}

async function updateCallRecordByWhere(where: Prisma.CallWhereUniqueInput, data: UpdateCallRecordInput): Promise<UpdateCallRecordResult> {
  if (!data.status) {
    return {
      updated: false,
      reason: 'missing_required_fields',
    };
  }

  try {
    await prisma.call.update({
      where,
      data: {
        status: data.status,
        endedAt: data.endedAt,
        durationSeconds: data.durationSeconds,
      },
    });
  } catch (error: any) {
    if (isPrismaRecordNotFound(error)) {
      return {
        updated: false,
        reason: 'call_not_found',
      };
    }
    throw error;
  }

  return {
    updated: true,
  };
}

export async function updateCallRecordByControlId(callControlId: string, data: UpdateCallRecordInput): Promise<UpdateCallRecordResult> {
  return updateCallRecordByWhere({ callControlId }, data);
}

export async function updateCallRecordById(callId: string, data: UpdateCallRecordInput): Promise<UpdateCallRecordResult> {
  return updateCallRecordByWhere({ id: callId }, data);
}

export async function findCallByControlId(callControlId: string): Promise<Call | null> {
  return prisma.call.findUnique({
    where: { callControlId },
  });
}
