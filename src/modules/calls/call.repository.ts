import { prisma } from '../../lib/prisma';
import { isPrismaUniqueConstraint } from '../../lib/prisma-errors';
import { CallCreateInput } from '../../generated/prisma/models';

type CreateCallRecordInput = Omit<CallCreateInput, 'tenant' | 'phoneNumber'> & {
  tenantId: string;
  phoneNumberId: string;
};
type CreateCallRecordResult = { created: false; reason: string } | { created: true; tenantId: string; phoneNumberId: string };

export async function createCallRecord(data: CreateCallRecordInput): Promise<CreateCallRecordResult> {
  if (!data.tenantId || !data.phoneNumberId || !data.fromPhoneE164 || !data.toPhoneE164) {
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
