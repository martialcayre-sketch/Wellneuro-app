import { PrismaClient } from '@/generated/prisma';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { stripSslParams, supabasePoolSsl } from '@/lib/postgres';

function createPrismaClient(): PrismaClient {
  const rawConnectionString = process.env.DATABASE_URL;
  if (!rawConnectionString) {
    throw new Error('DATABASE_URL est absent de web/.env.local');
  }
  // On retire les paramètres SSL de la chaîne et on ne laisse que l'option `ssl`
  // du Pool piloter le TLS (sinon l'adaptateur en libpq-compat écrase l'option
  // et re-vérifie la chaîne auto-signée Supabase sur Node 24).
  const connectionString = stripSslParams(rawConnectionString);
  const ssl = supabasePoolSsl(rawConnectionString);

  // Diagnostic non sensible (hôte uniquement) — aide à valider la config TLS en prod.
  let hostForLog = 'non-parseable';
  try {
    hostForLog = new URL(rawConnectionString).hostname || 'vide';
  } catch {
    /* URL non parseable : conservée masquée */
  }
  const sslmodeReste = /[?&]sslmode=/.test(connectionString) ? 'oui' : 'non';
  console.log(
    `[prisma] connexion db host=${hostForLog} tlsNoVerify=${ssl ? 'oui' : 'non'} sslmodeDansUrl=${sslmodeReste}`,
  );

  // `max: 1` : chaque instance serverless (Lambda) ne doit garder qu'une seule
  // connexion physique vers le pooler Supabase (Supavisor, mode transaction).
  // Sans cette borne, `pg.Pool` ouvre par défaut jusqu'à 10 connexions par
  // instance ; plusieurs routes/instances en parallèle épuisent alors le
  // budget de connexions du pooler, qui répond par une erreur
  // « authentication failed » trompeuse au lieu d'un message de saturation.
  const pool = new Pool({ connectionString, ssl, max: 1 });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
