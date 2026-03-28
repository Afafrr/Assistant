import { prisma } from '../../lib/prisma';
import { PhoneNumberModel } from '../../generated/prisma/models';

export async function findPhoneNumber(phoneNumber: string): Promise<PhoneNumberModel | null> {
  const record = await prisma.phoneNumber.findFirst({
    where: {
      e164: phoneNumber,
      isActive: true,
    },
  });
  console.log('Found phone number record:', record);
  if (!record) {
    return null;
  }

  return record;
}
