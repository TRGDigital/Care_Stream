import { PrismaClient } from '@prisma/client'

// §9 / §13.1 — Supabase PostgreSQL via Prisma
// RLS enforced at DB level; tenant_id on every table (§3.1)
// Connection pooling via PgBouncer (built into Supabase)
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
