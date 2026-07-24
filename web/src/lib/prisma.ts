import { PrismaClient } from '@/generated/prisma';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { resolveDatabaseUrl, stripSslParams, supabasePoolSsl } from '@/lib/postgres';

function createPrismaClient(): PrismaClient {
  const rawConnectionString = resolveDatabaseUrl();
  if (!rawConnectionString) {
    throw new Error("DATABASE_URL (ou SCALINGO_POSTGRESQL_URL) est absente de l'environnement");
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

  // `max` connexions par instance. Défaut **1** — hérité du modèle serverless
  // Vercel + pooler Supabase (Supavisor, mode transaction), où chaque instance
  // (Lambda) ne doit garder qu'une connexion ; sans cette borne, plusieurs
  // routes/instances épuisent le budget du pooler, qui répond « authentication
  // failed » (trompeur) au lieu d'un message de saturation.
  // Sur un conteneur Scalingo long-running mono-process, relever `DB_POOL_MAX`
  // (5–10) évite de sérialiser tout l'accès DB sur une seule connexion. Garder
  // `DB_POOL_MAX × nombre_de_conteneurs` sous le plafond du plan PostgreSQL.
  const max = Number.parseInt(process.env.DB_POOL_MAX ?? '1', 10) || 1;
  const pool = new Pool({ connectionString, ssl, max });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
