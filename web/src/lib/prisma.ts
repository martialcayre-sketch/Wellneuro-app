import { PrismaClient } from '@/generated/prisma';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { withSupabaseSslMode, supabasePoolSsl } from '@/lib/postgres';

function createPrismaClient(): PrismaClient {
  const rawConnectionString = process.env.DATABASE_URL;
  if (!rawConnectionString) {
    throw new Error('DATABASE_URL est absent de web/.env.local');
  }
  const connectionString = withSupabaseSslMode(rawConnectionString);
  const ssl = supabasePoolSsl(rawConnectionString);

  // Diagnostic non sensible (hôte uniquement) — aide à valider la config TLS en prod.
  let hostForLog = 'non-parseable';
  try {
    hostForLog = new URL(rawConnectionString).hostname || 'vide';
  } catch {
    /* URL non parseable : conservée masquée */
  }
  console.log(`[prisma] connexion db host=${hostForLog} tlsNoVerify=${ssl ? 'oui' : 'non'}`);

  const pool = new Pool({ connectionString, ssl });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
