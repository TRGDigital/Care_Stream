import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const tenants = await (prisma as any).tenant.findMany({
    select: { id: true, name: true, slug: true, email_allowlist: true }
  })
  console.log(JSON.stringify(tenants, null, 2))
}
main().catch(console.error).finally(() => prisma.$disconnect())
