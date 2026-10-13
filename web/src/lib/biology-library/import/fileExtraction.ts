import type { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { classeEtCode } from '@/lib/observability/classeEtCode';
import { accepteNouvelEnvoi } from '@/lib/patient/cycleDeVie';
import { OUVERTS } from './lectureDemandee';
import { estTypeCompteRendu } from './depot';
import { ouvrirExtractionDans, poursuivreExtraction, type IssueExtraction } from './lancerExtraction';
import { cleVerrouCompteRendu, DELAI_TRANSACTION_LIGNES_MS, PEREMPTION_EN_COURS_MS } from './verrou';

// LA FILE DURABLE DES LECTURES ([[D-282]], G3, lot 3). La route DEMANDE une
// lecture (un travail `en_attente`) ; le processus de fond
// (`scripts/bioExtractionWorker.ts`) la RÉCLAME, ouvre l'import, appelle la
// lecture inchangée (`poursuivreExtraction`, LOT-08), puis termine le travail.
//
// CE QUE LA TABLE TIENT DÉJÀ (migration du lot 2) : statut fermé et cohérent,
// deux tentatives, un seul travail ouvert par compte rendu, l'import courant
// du même compte rendu, l'identité figée, un travail terminé figé.
//
// CE QUE CE MODULE TIENT :
// - l'import ne naît qu'à la RÉCLAMATION, jamais à la demande : sa péremption
//   de 5 min se compte depuis sa création et ne doit pas manger l'attente en
//   file (arbitrage du lot 2) ;
// - la réclamation ouvre l'import ET met le travail à jour dans UNE
//   transaction : un import commité seul bloquerait la relance pendant la
//   péremption (revue du lot 2) ;
// - l'ORDRE DES VERROUS de la réclamation : la ligne du DOSSIER en partage
//   (`FOR KEY SHARE`), puis le verrou du compte rendu, puis la ligne du
//   travail. L'effacement verrouille le dossier `FOR UPDATE` AVANT de supprimer
//   les travaux : prendre le travail d'abord, puis créer l'import (qui attend
//   le dossier), croiserait cet ordre — interblocage (banc à deux sessions) ;
// - toute date de la file s'écrit et se compare en SQL
//   (`clock_timestamp() AT TIME ZONE 'UTC'`), jamais à l'horloge du client
//   (Prisma 7 écrit `now()` côté client, revue du lot 2) ;
// - aucun `upsert` : l'unicité d'un travail ouvert est PARTIELLE, hors schéma
//   Prisma — la demande la vérifie sous verrou et intercepte `P2002`.
//
// LA REPRISE ([[D-282]] §5.1). Un processus mort laisse un travail `en_cours`
// dont la réservation (6 min) finit par expirer : il redevient réclamable.
// Son import fantôme est clos `delai_depasse`, puis la lecture est rouverte
// par le chemin de relance du LOT-09 (refus compris), au nom du praticien
// d'origine — sauf si la lecture avait RÉPONDU sans que le travail soit
// terminé : il l'est alors, sans relire. Après
// la seconde tentative, le travail passe `echec` (`tentatives_epuisees`) et
// l'écran rouvre la relance manuelle.
//
// JOURNAUX : la classe et le code d'une erreur, des compteurs — jamais un
// identifiant, jamais un message (il peut recopier une valeur lue).

/** Réservation d'un travail réclamé — chiffre TECHNIQUE (`DC-20`, [[D-282]] §4) : plus longue que la péremption d'un import. */
export const RESERVATION_TRAVAIL_MS = 6 * 60_000;

/** Deux tentatives au plus ([[D-282]] §4) — la base le tient aussi (CHECK). */
export const TENTATIVES_MAX = 2;

/** Les travaux terminés partent à 30 jours, par la purge horaire ([[D-282]] §5.3). */
export const CONSERVATION_TRAVAUX_JOURS = 30;


export type IssueDemande =
  | { ok: true; idTravail: string }
  | {
    ok: false;
    reason:
      | 'compte_rendu_introuvable'
      | 'extraction_en_cours'
      | 'lecture_demandee'
      | 'document_purge'
      | 'ligne_validee'
      | 'dossier_clos';
  };

/**
 * La route DEMANDE une lecture : un travail `en_attente`, sans import. Mêmes
 * refus que l'ouverture, jugés AVANT d'enfiler — le praticien les lit tout de
 * suite, au lieu d'un travail qui échouerait à la réclamation. Celle-ci les
 * rejuge : ils peuvent changer pendant l'attente.
 */
export async function demanderExtraction(params: {
  idPatient: string;
  idCompteRendu: string;
  demandePar: string;
}): Promise<IssueDemande> {
  const { idPatient, idCompteRendu, demandePar } = params;
  try {
    return await prisma.$transaction(async tx => {
      // LE DOSSIER D'ABORD, EN PARTAGE, ET REJUGÉ ICI ([[D-282]] §9). La route
      // l'a lu ouvert, hors transaction ; une clôture a pu passer depuis. Le
      // verrou ordonne la demande et la clôture (`FOR UPDATE`) : la clôture
      // passée, la demande lit le dossier clos et refuse ; la demande passée,
      // la clôture voit le travail et refuse (`aucuneLectureDemandee`).
      const [dossier] = await tx.$queryRaw<{ actif: boolean; suivi_cloture_le: Date | null }[]>`
        SELECT actif, suivi_cloture_le FROM patients WHERE id_patient = ${idPatient} FOR KEY SHARE`;
      if (!dossier || !accepteNouvelEnvoi({ actif: dossier.actif, suiviClotureLe: dossier.suivi_cloture_le })) {
        return { ok: false as const, reason: 'dossier_clos' as const };
      }
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${cleVerrouCompteRendu(idCompteRendu)}))`;
      const compteRendu = await tx.compteRenduBiologique.findFirst({
        where: { id: idCompteRendu, idPatient },
        select: { typeMime: true, purgeLe: true },
      });
      if (!compteRendu || !estTypeCompteRendu(compteRendu.typeMime)) {
        return { ok: false as const, reason: 'compte_rendu_introuvable' as const };
      }
      if (compteRendu.purgeLe) return { ok: false as const, reason: 'document_purge' as const };
      // Une lecture déjà demandée, en file ou en reprise : elle suit son cours.
      // Y compris entre 5 et 6 min, quand son import est périmé mais sa
      // réservation encore vive (revue du lot 2).
      const ouverts = await tx.travailExtractionBiologique.count({
        where: { idCompteRendu, idPatient, statut: { in: OUVERTS } },
      });
      if (ouverts > 0) return { ok: false as const, reason: 'lecture_demandee' as const };
      // Un import `en_cours` sans travail ouvert : l'ancien chemin (`after()`,
      // retiré au lot 5), le temps que le balayage le clôture. Fraîcheur jugée par l'horloge de la BASE, celle qui a écrit
      // `lance_le` (trigger) — jamais par celle du processus web (revue #1414).
      const [{ n: enCours }] = await tx.$queryRaw<{ n: number }[]>`
        SELECT count(*)::int AS n FROM imports_biologiques
        WHERE id_compte_rendu = ${idCompteRendu} AND id_patient = ${idPatient} AND statut = 'en_cours'
          AND lance_le >= (clock_timestamp() AT TIME ZONE 'UTC') - ${`${PEREMPTION_EN_COURS_MS} milliseconds`}::interval`;
      if (enCours > 0) return { ok: false as const, reason: 'extraction_en_cours' as const };
      const validees = await tx.ligneBiologiqueCandidate.count({
        where: { idPatient, statut: 'validee', import: { idCompteRendu } },
      });
      if (validees > 0) return { ok: false as const, reason: 'ligne_validee' as const };
      const cree = await tx.travailExtractionBiologique.create({
        data: { idPatient, idCompteRendu, demandePar },
        select: { id: true },
      });
      return { ok: true as const, idTravail: cree.id };
    });
  } catch (err) {
    // L'index unique partiel : un travail ouvert est né entre-temps.
    if ((err as { code?: string }).code === 'P2002') return { ok: false, reason: 'lecture_demandee' };
    throw err;
  }
}

export type Reclamation =
  | { type: 'lecture'; idTravail: string; idPatient: string; idCompteRendu: string; idImport: string; tentative: number }
  | { type: 'refus'; idTravail: string }
  | { type: 'epuise'; idTravail: string }
  | { type: 'deja_lu'; idTravail: string };

type LigneTravail = {
  id: string;
  id_patient: string;
  id_compte_rendu: string;
  id_import_courant: string | null;
  demande_par: string;
  tentatives: number;
};

/** Le travail se clôt en échec, motif fermé, daté par la base. */
async function echouer(tx: Prisma.TransactionClient, idTravail: string, motif: string) {
  await tx.$executeRaw`
    UPDATE travaux_extraction_biologique
    SET statut = 'echec', motif_echec = ${motif}, reserve_jusqua = NULL,
        termine_le = clock_timestamp() AT TIME ZONE 'UTC'
    WHERE id = ${idTravail}`;
}

async function reclamerUn(candidat: { id: string; id_patient: string; id_compte_rendu: string }) {
  return prisma.$transaction(async (tx): Promise<Reclamation | null> => {
    // L'ordre des verrous : dossier, compte rendu, travail (en-tête).
    await tx.$queryRaw`SELECT 1 FROM patients WHERE id_patient = ${candidat.id_patient} FOR KEY SHARE`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${cleVerrouCompteRendu(candidat.id_compte_rendu)}))`;
    // Rejugé sous verrou : un autre processus a pu le réclamer, l'effacement le tenir.
    const [travail] = await tx.$queryRaw<LigneTravail[]>`
      SELECT id, id_patient, id_compte_rendu, id_import_courant, demande_par, tentatives
      FROM travaux_extraction_biologique
      WHERE id = ${candidat.id}
        AND (statut = 'en_attente'
             OR (statut = 'en_cours' AND reserve_jusqua < clock_timestamp() AT TIME ZONE 'UTC'))
      FOR UPDATE SKIP LOCKED`;
    if (!travail) return null;

    // UNE REPRISE (réservation expirée) juge d'abord SON import, sous verrou.
    if (travail.id_import_courant) {
      const courant = await tx.importBiologique.findUnique({
        where: { id: travail.id_import_courant },
        select: { statut: true, motifEchec: true },
      });
      // La lecture a RÉPONDU (lignes, ou échec consigné du fournisseur) mais le
      // travail n'a pas été terminé (processus tué entre les deux, base
      // coupée) : le terminer, jamais relire — une relecture facturerait deux
      // fois et remplacerait des lignes encore à décider (revue du lot 3, P2-1).
      if (courant && (courant.statut === 'extrait' || (courant.statut === 'echec' && courant.motifEchec !== 'delai_depasse'))) {
        await tx.$executeRaw`
          UPDATE travaux_extraction_biologique
          SET statut = 'termine', reserve_jusqua = NULL, termine_le = clock_timestamp() AT TIME ZONE 'UTC'
          WHERE id = ${travail.id}`;
        return { type: 'deja_lu', idTravail: travail.id };
      }
      // Encore `en_cours` : c'est le fantôme de CE travail — sa réservation (6 min)
      // a expiré. Il est clos ici, sans juger sa péremption à l'horloge du
      // client : un conteneur en retard sur la base la refuserait
      // (`extraction_en_cours`) et la reprise promise serait perdue (P2-3).
      await tx.importBiologique.updateMany({
        where: { id: travail.id_import_courant, statut: 'en_cours' },
        data: { statut: 'echec', motifEchec: 'delai_depasse' },
      });
    }

    if (travail.tentatives >= TENTATIVES_MAX) {
      await echouer(tx, travail.id, 'tentatives_epuisees');
      return { type: 'epuise', idTravail: travail.id };
    }

    const ouverture = await ouvrirExtractionDans(tx, {
      idPatient: travail.id_patient,
      idCompteRendu: travail.id_compte_rendu,
      lancePar: travail.demande_par,
    });
    if (!ouverture.ok) {
      await echouer(tx, travail.id, ouverture.reason);
      return { type: 'refus', idTravail: travail.id };
    }
    await tx.$executeRaw`
      UPDATE travaux_extraction_biologique
      SET statut = 'en_cours', id_import_courant = ${ouverture.idImport}, tentatives = tentatives + 1,
          reserve_jusqua = (clock_timestamp() AT TIME ZONE 'UTC') + ${`${RESERVATION_TRAVAIL_MS} milliseconds`}::interval
      WHERE id = ${travail.id}`;
    return {
      type: 'lecture',
      idTravail: travail.id,
      idPatient: travail.id_patient,
      idCompteRendu: travail.id_compte_rendu,
      idImport: ouverture.idImport,
      tentative: travail.tentatives + 1,
    };
    // Le verrou du compte rendu peut être tenu jusqu'à 20 s par une décision
    // (`verrou.ts`) : le délai implicite de 5 s le manquerait (P2-4).
  }, { timeout: DELAI_TRANSACTION_LIGNES_MS });
}

/**
 * Réclame le plus ancien travail réclamable : en attente, ou en cours dont la
 * réservation a expiré (processus mort). `null` si la file est vide.
 */
export async function reclamerTravail(): Promise<Reclamation | null> {
  const candidats = await prisma.$queryRaw<{ id: string; id_patient: string; id_compte_rendu: string }[]>`
    SELECT id, id_patient, id_compte_rendu
    FROM travaux_extraction_biologique
    WHERE statut = 'en_attente'
       OR (statut = 'en_cours' AND reserve_jusqua < clock_timestamp() AT TIME ZONE 'UTC')
    ORDER BY cree_le
    LIMIT 5`;
  // Un candidat qui lève (verrou tenu trop longtemps, base coupée) n'arrête
  // pas la file : les suivants sont essayés, lui le sera au tour suivant —
  // la transaction annulée n'a consommé aucune tentative (P2-4).
  for (const candidat of candidats) {
    try {
      const reclamation = await reclamerUn(candidat);
      if (reclamation) return reclamation;
    } catch (err) {
      console.error('[bio-ingest file] réclamation refusée :', ...classeEtCode(err));
    }
  }
  return null;
}

/**
 * La lecture a rendu son issue (lignes ou échec consigné sur l'import) : le
 * travail est `termine`. Gardé par l'import courant — un travail repris par
 * un autre processus ne se termine pas au nom de l'ancien. `false` si le
 * travail a disparu (effacement du dossier) ou changé de main.
 */
export async function terminerTravail(idTravail: string, idImport: string): Promise<boolean> {
  const n = await prisma.$executeRaw`
    UPDATE travaux_extraction_biologique
    SET statut = 'termine', reserve_jusqua = NULL, termine_le = clock_timestamp() AT TIME ZONE 'UTC'
    WHERE id = ${idTravail} AND statut = 'en_cours' AND id_import_courant = ${idImport}`;
  return n === 1;
}

export type IssueTraitement =
  | { issue: 'vide' | 'refus' | 'epuise' | 'deja_lu' | 'interrompu' }
  | { issue: 'lu'; tentative: number; statut: 'extrait' | 'echec' | 'sans_issue'; termine: boolean };

/**
 * Un tour du processus de fond : réclamer, lire, terminer. Une lecture qui
 * LÈVE laisse le travail `en_cours` : sa réservation expirera et la reprise le
 * relancera une fois (§5.1). `poursuivre` est injectable pour les bancs : ils
 * n'appellent jamais le fournisseur.
 */
export async function traiterProchainTravail(
  poursuivre: (p: { idPatient: string; idCompteRendu: string; idImport: string }) => Promise<IssueExtraction> =
    poursuivreExtraction,
): Promise<IssueTraitement> {
  const reclamation = await reclamerTravail();
  if (!reclamation) return { issue: 'vide' };
  if (reclamation.type !== 'lecture') return { issue: reclamation.type };
  const { idTravail, idPatient, idCompteRendu, idImport, tentative } = reclamation;
  let resultat: IssueExtraction;
  try {
    resultat = await poursuivre({ idPatient, idCompteRendu, idImport });
  } catch (err) {
    console.error('[bio-ingest file] lecture interrompue :', ...classeEtCode(err));
    return { issue: 'interrompu' };
  }
  // Toute issue RENDUE termine le travail, échec du fournisseur compris : la
  // relance d'une lecture qui a répondu reste un geste du praticien (LOT-09).
  // Un import resté `en_cours` (échec non consigné) sera clos par le balayage.
  const statut = resultat.ok ? resultat.statut : 'sans_issue';
  return { issue: 'lu', tentative, statut, termine: await terminerTravail(idTravail, idImport) };
}

/**
 * Les FANTÔMES ([[D-282]] §5.4) : un import `en_cours` au-delà de la
 * péremption est clos `delai_depasse`, comme le font déjà la relance, l'écart
 * et la purge. Un compte rendu à la fois, sous son verrou ; candidats et
 * clôture jugés par l'horloge de la base. Rend le nombre d'imports clos.
 */
export async function reconcilierFantomes(): Promise<number> {
  const intervalle = `${PEREMPTION_EN_COURS_MS} milliseconds`;
  const comptesRendus = await prisma.$queryRaw<{ id_compte_rendu: string }[]>`
    SELECT DISTINCT id_compte_rendu FROM imports_biologiques
    WHERE statut = 'en_cours'
      AND lance_le < (clock_timestamp() AT TIME ZONE 'UTC') - ${intervalle}::interval`;
  let clos = 0;
  for (const { id_compte_rendu: idCompteRendu } of comptesRendus) {
    clos += await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${cleVerrouCompteRendu(idCompteRendu)}))`;
      return tx.$executeRaw`
        UPDATE imports_biologiques SET statut = 'echec', motif_echec = 'delai_depasse'
        WHERE id_compte_rendu = ${idCompteRendu}
          AND statut = 'en_cours'
          AND lance_le < (clock_timestamp() AT TIME ZONE 'UTC') - ${intervalle}::interval`;
    });
  }
  return clos;
}

/** Les travaux TERMINÉS depuis 30 jours ([[D-282]] §5.3) ; jamais un travail ouvert. Rend le nombre supprimé. */
export async function purgerTravauxTermines(): Promise<number> {
  return prisma.$executeRaw`
    DELETE FROM travaux_extraction_biologique
    WHERE statut IN ('termine', 'echec')
      AND termine_le < (clock_timestamp() AT TIME ZONE 'UTC') - ${`${CONSERVATION_TRAVAUX_JOURS} days`}::interval`;
}
