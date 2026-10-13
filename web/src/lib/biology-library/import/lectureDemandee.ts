// UNE LECTURE DEMANDÉE RETIENT LE DOSSIER OUVERT ([[D-282]] §9). Module sans
// dépendance au fournisseur de lecture : les routes du dossier (clôture,
// désactivation) l'importent sans charger le client Anthropic.
import type { Prisma } from '@/generated/prisma';
import { DELAI_TRANSACTION_LIGNES_MS } from './verrou';

/** Les statuts d'un travail de lecture encore ouvert : demandé, ou réclamé. */
export const OUVERTS = ['en_attente', 'en_cours'];

/** Le refus opposé à une clôture ou une désactivation ([[D-282]] §9). */
export const MESSAGE_LECTURE_EN_COURS =
  'Une lecture de compte rendu est demandée ou en cours : attendez son issue, quelques minutes, puis recommencez.';
export const RAISON_LECTURE_EN_COURS = 'lecture_en_cours' as const;

/**
 * CLÔTURER OU DÉSACTIVER ATTEND L'ISSUE D'UNE LECTURE ([[D-282]] §9, arbitrage
 * du 2026-10-13). Sans cela, une lecture demandée avant la clôture partait
 * après : le document chez Anthropic, des lignes indécidables dans un dossier
 * clos. À appeler DANS la transaction qui écrit la clôture : le dossier y est
 * verrouillé `FOR UPDATE`, ce qui attend toute demande et toute réclamation
 * en vol (elles le tiennent en partage). `false` : un travail est ouvert,
 * refuser. L'effacement, lui, n'attend pas : il supprime les travaux.
 *
 * LE REFUS PEUT DURER : une lecture qui lève garde son travail jusqu'à
 * l'échéance de sa réservation (6 min), puis une reprise suit ; sans
 * processus de fond vivant, sans limite — c'est l'alerte du signal de vie
 * (§7) qui le dit. L'effacement reste ouvert dans tous les cas.
 */
/**
 * Délai des transactions qui appellent `aucuneLectureDemandee` : le verrou du
 * dossier peut attendre une réclamation ou un enregistrement de lignes, eux-
 * mêmes retenus jusqu'à `DELAI_TRANSACTION_LIGNES_MS` par le verrou du compte
 * rendu. Le défaut de Prisma (5 s) rendrait une erreur technique (revue §9).
 */
export const DELAI_TRANSACTION_CLOTURE_MS = DELAI_TRANSACTION_LIGNES_MS + 5_000;

export async function aucuneLectureDemandee(tx: Prisma.TransactionClient, idPatient: string): Promise<boolean> {
  await tx.$queryRaw`SELECT 1 FROM patients WHERE id_patient = ${idPatient} FOR UPDATE`;
  const ouverts = await tx.travailExtractionBiologique.count({ where: { idPatient, statut: { in: OUVERTS } } });
  return ouverts === 0;
}
