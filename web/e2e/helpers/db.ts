// Accès DB direct pour le nettoyage des tests Playwright — même schéma de
// connexion que web/prisma/seed.ts (imports relatifs, pas d'alias @/, ce
// fichier n'est pas exécuté via le resolver Next.js).
// N'agit que sur le patient fictif Michel Dogné (PAT_SEED_03, déjà seedé par
// `npm run prisma:seed`) : jamais de patient réel, jamais de DROP/TRUNCATE.
// La provision de la consultation/du token d'accès passe par la vraie route
// praticien (POST /api/praticien/consultations, cf. le spec) plutôt que par
// une écriture DB directe ici — sinon le patient atterrit dans un état
// ("aucune consultation") que le parcours normal ne produit jamais.
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma';
import { withSupabaseSslMode, supabasePoolSsl } from '../../src/lib/postgres';

const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://node@localhost:5433/wellneuro_dev?host=/home/node/pgdata&schema=public';

const pool = new Pool({
  connectionString: withSupabaseSslMode(DATABASE_URL),
  ssl: supabasePoolSsl(DATABASE_URL),
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Nettoie l'état "portail" laissé par un run de test précédent (assignations,
 * consultations, réponses liées) avant de reprovisionner une consultation
 * fraîche via l'API praticien. Ne touche jamais aux 5 réponses historiques
 * seedées par `npm run prisma:seed` (elles ont idAssignation=null, filtrées
 * ici).
 */
export async function resetPortailState(idPatient: string): Promise<void> {
  await prisma.assignation.deleteMany({ where: { idPatient } });
  await prisma.consultation.deleteMany({ where: { idPatient } });
  await prisma.questionnaireReponse.deleteMany({ where: { idPatient, idAssignation: { not: null } } });
}

export async function closePrisma(): Promise<void> {
  await prisma.$disconnect();
}
