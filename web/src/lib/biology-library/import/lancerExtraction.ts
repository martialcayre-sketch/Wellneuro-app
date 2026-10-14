import type { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { classeEtCode } from '@/lib/observability/classeEtCode';
import {
  extraireCompteRendu,
  MODELE_EXTRACTION,
  VERSION_PROCEDE_EXTRACTION,
  type MotifEchec,
  type ResultatExtraction,
} from './extraction';
import { estTypeCompteRendu } from './depot';
import { resoudreLigne } from './resolverLibellesV1';
import { cleVerrouCompteRendu, DELAI_TRANSACTION_LIGNES_MS, PEREMPTION_EN_COURS_MS } from './verrou';

// ORCHESTRATION D'UNE EXTRACTION (BIO-INGEST LOT-02, [[D-256]] A4/A5).
//
// TROIS TEMPS, ET C'EST VOULU :
// 1. l'import naît `en_cours`, avec le MODÈLE et la VERSION DU PROCÉDÉ, et il
//    est COMMITÉ AVANT l'appel : la trace existe même si le processus meurt
//    pendant l'appel (promesse de la v4 : « enregistrés à chaque fois ») ;
// 2. l'appel au fournisseur, HORS de toute transaction — on ne tient pas une
//    transaction Postgres ouverte pendant des minutes d'appel réseau ; l'appel
//    entier est borné (`DUREE_TOTALE_EXTRACTION_MS`) ;
// 3. UNE transaction interactive : les lignes, PUIS la terminaison. Jamais
//    d'écriture imbriquée Prisma, qui terminerait l'import avant ses lignes —
//    la base refuserait alors les lignes d'un import qui n'est plus en cours
//    (consigne de la revue de la migration ; la lettre voulait aussi l'import
//    dans cette transaction, son but est tenu : les lignes avant la fin).
//
// Un échec se consigne par la transition `en_cours` → `echec` avec son motif
// fermé, sans aucune ligne. Un document purgé ([[D-258]]) ne se relit plus :
// `document_purge`, avant que la base ne le refuse elle-même. Un import resté `en_cours` au-delà de la
// péremption (processus mort) est clos `delai_depasse` à la tentative
// suivante sur le même compte rendu.
//
// RELANCER LA LECTURE (LOT-09) : une nouvelle extraction d'un compte rendu
// déjà lu est permise tant qu'AUCUNE ligne d'aucun de ses imports n'est
// `validee` — refus `ligne_validee` sinon, sous le verrou que prend aussi la
// décision (une validation et une relance ne se croisent pas). Rien n'est
// effacé : l'import précédent et ses lignes restent tels quels (proposées ou
// écartées, motifs compris) ; le nouvel import devient le courant dès son
// ouverture, et la décision refuse alors les lignes de l'ancien
// (`import_remplace`). Si la relance échoue, l'ancien redevient le courant.
//
// L'IDENTITÉ MASQUÉE ([[D-284]] §5, lot (j)) : la lecture envoie le DERNIER
// masquage non purgé du compte rendu — ses pages, jamais `contenu`. Sans
// masquage, l'ouverture refuse (`masquage_absent`) et aucun appel ne part. Un
// masquage est figé, et la base en refuse un nouveau pendant une lecture
// ouverte : celui que lit la suite est celui qui existait à l'ouverture.
//
// JOURNAUX : la classe et le code d'une erreur, jamais son message — il peut
// recopier un libellé ou une valeur lue.

export type IssueExtraction =
  | { ok: true; idImport: string; statut: 'extrait'; lignes: number }
  | { ok: true; idImport: string; statut: 'echec'; motif: MotifEchec }
  | {
    ok: false;
    reason:
      | 'compte_rendu_introuvable'
      | 'extraction_en_cours'
      | 'document_purge'
      | 'ligne_validee'
      | 'masquage_absent'
      | 'import_clos'
      | 'server_error';
  };

export type IssueOuverture =
  | { ok: true; idImport: string }
  | {
    ok: false;
    reason: 'compte_rendu_introuvable' | 'extraction_en_cours' | 'document_purge' | 'ligne_validee' | 'masquage_absent';
  };

type ParamsExtraction = {
  idPatient: string;
  idCompteRendu: string;
  lancePar: string;
};

/** Les trois temps d'affilée, hors file — le processus de fond, lui, ouvre dans sa réclamation (`ouvrirExtractionDans`). */
export async function lancerExtraction(params: ParamsExtraction): Promise<IssueExtraction> {
  const ouverture = await ouvrirExtraction(params);
  if (!ouverture.ok) return ouverture;
  return poursuivreExtraction({ ...params, idImport: ouverture.idImport });
}

/** TEMPS 1 seul, dans sa propre transaction. */
export async function ouvrirExtraction(params: ParamsExtraction): Promise<IssueOuverture> {
  // TEMPS 1 — l'import en cours, commité avant l'appel.
  return prisma.$transaction(tx => ouvrirExtractionDans(tx, params));
}

/**
 * TEMPS 1 dans une transaction FOURNIE : la réclamation d'un travail de la
 * file ([[D-282]], G3) ouvre l'import ET met le travail à jour d'un seul
 * tenant — sinon un import neuf, commité seul, bloquerait la relance pendant
 * la péremption (revue du lot 2). Mêmes refus, même ordre.
 */
export async function ouvrirExtractionDans(
  tx: Prisma.TransactionClient,
  params: ParamsExtraction,
): Promise<IssueOuverture> {
  const { idPatient, idCompteRendu, lancePar } = params;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${cleVerrouCompteRendu(idCompteRendu)}))`;
  const compteRendu = await tx.compteRenduBiologique.findFirst({
    where: { id: idCompteRendu, idPatient },
    select: { id: true, typeMime: true, purgeLe: true },
  });
  if (!compteRendu || !estTypeCompteRendu(compteRendu.typeMime)) {
    return { ok: false as const, reason: 'compte_rendu_introuvable' as const };
  }
  // Sous le verrou que prend aussi la purge : la base refuserait l'import
  // (P0001, une 500 opaque) ; on le dit avant (revue de la migration).
  if (compteRendu.purgeLe) return { ok: false as const, reason: 'document_purge' as const };
  // Fraîcheur jugée par l'horloge de la BASE, celle qui a écrit `lance_le`
  // (trigger) — jamais par celle du processus ([[D-282]] lot 5, revue #1414).
  const enCours = await tx.$queryRaw<{ id: string; frais: boolean }[]>`
    SELECT id, lance_le >= (clock_timestamp() AT TIME ZONE 'UTC') - ${`${PEREMPTION_EN_COURS_MS} milliseconds`}::interval AS frais
      FROM imports_biologiques
     WHERE id_compte_rendu = ${idCompteRendu} AND id_patient = ${idPatient} AND statut = 'en_cours'`;
  if (enCours.some(i => i.frais)) {
    return { ok: false as const, reason: 'extraction_en_cours' as const };
  }
  for (const perime of enCours) {
    await tx.importBiologique.update({
      where: { id: perime.id },
      data: { statut: 'echec', motifEchec: 'delai_depasse' },
    });
  }
  // Une ligne validée a créé un résultat : relire ce document en produirait
  // un second jeu. Jamais de relance destructive (LOT-09). Après la clôture
  // des imports périmés : un import mort ne doit pas rester « courant » et
  // bloquer la décision des lignes encore proposées (revue, P2).
  const validees = await tx.ligneBiologiqueCandidate.count({
    where: { idPatient, statut: 'validee', import: { idCompteRendu } },
  });
  if (validees > 0) return { ok: false as const, reason: 'ligne_validee' as const };
  // Rien ne part sans l'identité masquée ([[D-284]] §5) : jamais d'import, donc
  // jamais d'appel, sur un compte rendu que le praticien n'a pas masqué.
  const masquages = await tx.masquageCompteRendu.count({ where: { idCompteRendu, idPatient, purgeLe: null } });
  if (masquages === 0) return { ok: false as const, reason: 'masquage_absent' as const };
  const cree = await tx.importBiologique.create({
    data: {
      idPatient,
      idCompteRendu,
      modele: MODELE_EXTRACTION,
      versionPrompt: VERSION_PROCEDE_EXTRACTION,
      lancePar,
    },
    select: { id: true },
  });
  return { ok: true as const, idImport: cree.id };
}

/** TEMPS 2 et 3, sur un import ouvert par `ouvrirExtraction`. */
export async function poursuivreExtraction(params: {
  idPatient: string;
  idCompteRendu: string;
  idImport: string;
}): Promise<IssueExtraction> {
  const { idPatient, idCompteRendu, idImport } = params;

  // Le DERNIER masquage non purgé — ses pages seules, jamais le document
  // d'origine ([[D-284]] §5). `id` départage deux masquages de même instant.
  const masquage = await prisma.masquageCompteRendu.findFirst({
    where: { idCompteRendu, idPatient, purgeLe: null },
    orderBy: [{ poseLe: 'desc' }, { id: 'desc' }],
    select: { pages: true },
  });

  // TEMPS 2 — l'appel, hors transaction. Sans masquage (purgé avec un document
  // purgé, ce que la base refuse pendant un import), AUCUN appel : l'échec se
  // consigne, aucun repli sur le document entier.
  const resultat = masquage && masquage.pages.length > 0
    ? await extraireCompteRendu(masquage.pages.map(p => Buffer.from(p)))
    : ({ ok: false, motif: 'erreur_fournisseur' } as const);

  // Chaque terminaison est GARDÉE par `statut: 'en_cours'` : une suite qui
  // finit après la péremption (l'import a été clos `delai_depasse` par une
  // tentative suivante) ne réécrit pas un import clos (revue de la PR 2b, P2-5).
  if (!resultat.ok) {
    try {
      await prisma.importBiologique.updateMany({
        where: { id: idImport, statut: 'en_cours' },
        data: { statut: 'echec', motifEchec: resultat.motif },
      });
    } catch (err) {
      console.error('[bio-ingest extraction] échec non consigné :', ...classeEtCode(err));
      return { ok: false, reason: 'server_error' };
    }
    return { ok: true, idImport, statut: 'echec', motif: resultat.motif };
  }

  // TEMPS 3 — les lignes, PUIS la terminaison, dans une seule transaction.
  try {
    const encoreOuvert = await consignerLignes({ idPatient, idCompteRendu, idImport }, resultat);
    if (!encoreOuvert) return { ok: false, reason: 'import_clos' };
  } catch (err) {
    // La réponse a produit des lignes que la base refuse (une contrainte, une
    // FK) : l'import se clôt `reponse_invalide` plutôt que de rester en cours
    // et d'être daté plus tard d'un `delai_depasse` faux (revue, P2-3). Si
    // même cette clôture échoue, la péremption le rattrapera.
    console.error('[bio-ingest extraction] lignes non consignées :', ...classeEtCode(err));
    try {
      await prisma.importBiologique.updateMany({
        where: { id: idImport, statut: 'en_cours' },
        data: { statut: 'echec', motifEchec: 'reponse_invalide' },
      });
    } catch (errCloture) {
      console.error('[bio-ingest extraction] clôture impossible :', ...classeEtCode(errCloture));
    }
    return { ok: false, reason: 'server_error' };
  }
  return { ok: true, idImport, statut: 'extrait', lignes: resultat.lignes.length };
}

/**
 * TEMPS 3 — les lignes, PUIS la terminaison, dans une seule transaction.
 * `false` : l'import n'est plus `en_cours` (clos entre-temps, ou effacé avec
 * son dossier). Exportée pour le banc à deux sessions ([[D-282]] §9).
 */
export async function consignerLignes(
  params: { idPatient: string; idCompteRendu: string; idImport: string },
  resultat: Extract<ResultatExtraction, { ok: true }>,
): Promise<boolean> {
  const { idPatient, idCompteRendu, idImport } = params;
  return prisma.$transaction(async tx => {
    // LE DOSSIER D'ABORD, EN PARTAGE ([[D-282]] §9) : l'ordre de l'effacement
    // (dossier `FOR UPDATE`, puis ses lignes) et de la réclamation. Sans lui,
    // les clés de ces lignes vers le dossier se verrouillaient APRÈS l'import,
    // et un effacement concurrent s'interbloquait avec cette transaction.
    // Dossier effacé entre-temps : l'import n'existe plus, la relecture le dit.
    await tx.$queryRaw`SELECT 1 FROM patients WHERE id_patient = ${idPatient} FOR KEY SHARE`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${cleVerrouCompteRendu(idCompteRendu)}))`;
    // Sous le verrou qui sert aussi à clore les imports périmés : la relecture fait foi.
    if ((await tx.importBiologique.count({ where: { id: idImport, statut: 'en_cours' } })) === 0) return false;
    if (resultat.lignes.length > 0) {
      // Les unités du catalogue départagent un libellé ambigu ([[D-263]]).
      const unitesCatalogue = new Map(
        (await tx.biologyAnalyte.findMany({ select: { code: true, unite: true } }))
          .map(a => [a.code, a.unite] as const),
      );
      await tx.ligneBiologiqueCandidate.createMany({
        data: resultat.lignes.map((ligne, i) => {
          // Le resolver signé, SEUL, propose l'analyte — `ambigu` n'en propose aucun.
          const resolution = resoudreLigne(ligne.libelle, ligne.unite, unitesCatalogue);
          return {
            idPatient,
            idImport,
            rang: i + 1,
            page: ligne.page,
            libelleLu: ligne.libelle,
            valeurLue: ligne.valeur,
            uniteLue: ligne.unite,
            preleveLeLu: ligne.preleveLe,
            heureLue: ligne.heureLue,
            // Faits du laboratoire, tels qu'imprimés ([[D-267]]) ; un fait trop
            // long reste NULL et la ligne le dit (§10).
            intervalleLu: ligne.intervalle,
            marquageLu: ligne.marquage,
            intervalleNonTranscrit: ligne.intervalleNonTranscrit,
            marquageNonTranscrit: ligne.marquageNonTranscrit,
            // Le commentaire du laboratoire sur CE résultat ([[D-278]] §3),
            // même régime : trop long, NULL et signalé.
            commentaireLu: ligne.commentaire,
            commentaireNonTranscrit: ligne.commentaireNonTranscrit,
            analytePropose: resolution.code,
            statutMapping: resolution.statut,
          };
        }),
      });
    }
    await tx.importBiologique.update({
      where: { id: idImport },
      // Les commentaires du compte rendu ENTIER se posent avec la terminaison,
      // jamais avant (le trigger d'insertion le refuse) ni après (figés).
      data: {
        statut: 'extrait',
        laboratoireLu: resultat.laboratoire,
        commentairesLus: resultat.commentaires,
        commentairesNonTranscrits: resultat.commentairesNonTranscrits,
      },
    });
    return true;
  }, { timeout: DELAI_TRANSACTION_LIGNES_MS });
}
