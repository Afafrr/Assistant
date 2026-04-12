import { prisma } from '../../lib/prisma';
import type { TenantPromptConfig } from '../../generated/prisma/client';

export async function findPromptConfigByTenantId(tenantId: string): Promise<TenantPromptConfig | null> {
  return prisma.tenantPromptConfig.findUnique({
    where: { tenantId },
  });
}
