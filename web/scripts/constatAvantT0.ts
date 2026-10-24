/**
 * Constat H07 (R:Comptage T0) : combien de dossiers n'ont pas atteint le T0,
 * et ce qui les retient. LECTURE SEULE, en conteneur de production :
 *
 *   scalingo --app wellneuro --region osc-fr1 run -d "PGOPTIONS='-c default_transaction_read_only=on' node prisma/runWithAlias.js scripts/constatAvantT0.ts"
 *
 * Le script REFUSE de lire si la session n'est pas en lecture seule : la
 * garde ne repose pas sur la relecture du code des préconditions, mais sur
 * la base, qui rejetterait toute écriture.
 *
 * Population : dossiers actifs portant au moins une assignation, sans épisode
 * T0 (un épisode T0 n'existe que confirmé : `confirmedAt` est requis). Les
 * préconditions s'évaluent par le chemin des trois routes
 * (`preconditionsT0PourPatient`, jalon T0) : un seul calcul, jamais une copie.
 *
 * Sortie : agrégats seuls, masqués sous cinq dossiers ([[D-298]],
 * `agregerConstatAvantT0`). Aucun identifiant, aucune identité.
 */
import { prisma } from '@/lib/prisma';
import { preconditionsT0PourPatient } from '@/lib/clinical-engine/preconditionsT0Prisma';
import { agregerConstatAvantT0, type DossierSansT0 } from '@/lib/constats/avantT0';

const JOUR_MS = 24 * 60 * 60 * 1000;

async function main(): Promise<void> {
  const [{ transaction_read_only: lectureSeule }] = await prisma.$queryRaw<{ transaction_read_only: string }[]>`
    SHOW transaction_read_only`;
  if (lectureSeule !== 'on') {
    console.error("Refus : la session n'est pas en lecture seule. Lancer avec PGOPTIONS='-c default_transaction_read_only=on'.");
    process.exitCode = 2;
    return;
  }

  const assignes = await prisma.assignation.groupBy({
    by: ['idPatient'],
    _min: { dateAssignation: true },
  });
  const [actifs, avecT0] = await Promise.all([
    prisma.patient.findMany({
      where: { actif: true, idPatient: { in: assignes.map(a => a.idPatient) } },
      select: { idPatient: true },
    }),
    prisma.assessmentEpisode.findMany({
      where: { milestone: 'T0' },
      select: { idPatient: true },
      distinct: ['idPatient'],
    }),
  ]);
  const confirmes = new Set(avecT0.map(e => e.idPatient));
  const premiere = new Map(assignes.map(a => [a.idPatient, a._min.dateAssignation]));
  const maintenant = Date.now();

  const dossiers: DossierSansT0[] = [];
  let avecT0Actifs = 0;
  for (const { idPatient } of actifs) {
    if (confirmes.has(idPatient)) {
      avecT0Actifs += 1;
      continue;
    }
    const preconditions = await preconditionsT0PourPatient(idPatient, 'T0');
    const date = premiere.get(idPatient);
    dossiers.push({
      manquantes: preconditions.dures.filter(c => !c.satisfaite).map(c => c.id),
      ancienneteJours: date ? Math.floor((maintenant - date.getTime()) / JOUR_MS) : null,
    });
  }

  console.log(JSON.stringify({
    constat: 'H07',
    leLe: new Date(maintenant).toISOString(),
    ...agregerConstatAvantT0(avecT0Actifs, dossiers),
  }, null, 2));
}

main()
  .catch(erreur => {
    console.error(erreur instanceof Error ? erreur.message : erreur);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
