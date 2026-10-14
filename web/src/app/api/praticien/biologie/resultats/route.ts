import { NextResponse } from 'next/server';
import { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import {
  accepteNouvelEnvoi,
  MESSAGE_DOSSIER_CLOS,
  RAISON_DOSSIER_CLOS,
} from '@/lib/patient/cycleDeVie';
import { garderResultats, type VerdictGardeResultats } from '@/lib/biology-library/gardeResultats';
import { validerSaisieResultat } from '@/lib/biology-library/resultats';
import { annulationParLigne, correctionsParLigne } from '@/lib/biology-library/filCorrection';
import {
  annulationsActives,
  verrouillerCleDuResultat,
  type AnnulationActive,
} from '@/lib/biology-library/annulations';
import { lireValeurQuantitative, unitesConcordent } from '@/lib/biology-library/import/valeurLue';
import { MESSAGES_REFUS_SAISIE, signature } from '@/lib/biology-library/saisieMessages';
import {
  serieParAnalyte,
  type MotifNonComparabilite,
  type PositionDansLeSuivi,
} from '@/lib/biology-library/serieParAnalyte';
import { lireJoursZeroSuccessifs } from '@/lib/protocol/calendriersPersistes';

// Résultats biologiques réels du dossier (étage 2, CB-09, [[D-122]] §2) —
// derrière `isCbResultsEnabled` (posé AVEC ce code, geste daté `D-081`).
//
// L'UNITÉ N'EST JAMAIS FOURNIE PAR LE CLIENT : elle est relue sur l'analyte
// au catalogue au moment de la saisie et consignée avec la mesure — la
// concordance unité résultat ↔ unité analyte (frontière tracée à la PR #838)
// tient PAR CONSTRUCTION, et le vocabulaire partagé (CHECK migration) n'a
// rien à re-juger. Un analyte sans unité au catalogue donne un résultat sans
// unité : on n'en invente pas.
//
// `source` est posée SERVEUR : cette surface est la saisie praticien —
// `import_labo`, l'autre origine de la décision, attend son propre chemin.
//
// LA CORRECTION EST UNE NOUVELLE LIGNE, JAMAIS UN `update` ([[D-124]]) —
// patron maison des chaînes `supersedes_*`, esprit `DC-30` : une erreur se
// signale, elle ne disparaît pas. Le POST porte donc deux gestes :
//
//   • `supersedesResultatId` ABSENT  → saisie neuve. Soumise à la garde
//     anti-doublon (trigger `resultats_biologiques_unicite_mesure` depuis
//     [[D-294]] §3, qui ignore les fils annulés) : le 409 `doublon_mesure`
//     est un `P2002` et n'a pas bougé d'un pouce.
//   • `supersedesResultatId` PRÉSENT → correction. La ligne échappe à la
//     garde parce que sa chaîne n'est pas nulle — et c'est précisément
//     pourquoi la validation de la cible N'EST PAS FACULTATIVE : une chaîne
//     acceptée sans contrôle contournerait la garde autant de fois qu'on veut.
//
// LES QUATRE CONTRÔLES DUS, et comment ils sont tenus. `D-124` en exigeait
// quatre : cible existante, même dossier, même analyte, même date de
// prélèvement, tête de fil. Deux d'entre eux ne sont pas VÉRIFIÉS ici, ils
// sont rendus IMPOSSIBLES : l'analyte et la date de prélèvement ne sont pas
// pris du client, ils sont RELUS SUR LA LIGNE VISÉE — même discipline que
// `source` et que l'unité. Restent trois lectures : la cible existe et
// appartient au dossier (une seule requête, `where { id, idPatient }` — une
// cible d'un autre dossier est « introuvable », et rien ne fuite de son
// existence), et personne ne la supplante déjà.
//
// PÉRIMÈTRE V1 : valeur et unité seulement. L'unité se corrige comme elle se
// pose — relue sur l'analyte au catalogue, le client n'a aucune autorité
// dessus. Corriger l'analyte ou la date serait ANNULER une mesure et en
// saisir une autre : c'est l'acte d'annulation de [[D-294]], en ajout seul,
// servi par `./annulations/route.ts`. Un fil ANNULÉ ne se corrige plus — la
// base le refuse, la route le dit (`correction_resultat_annule`).

const ROUTE_JOURNAL = '/api/praticien/biologie/resultats';

export type ResultatConsigne = {
  id: string;
  analyteCode: string;
  analyteLibelle: string;
  /** Décimal exact en forme canonique (LOT-10) — jamais un `number`, qui arrondirait. */
  valeur: string;
  /** L'unité CONSIGNÉE avec la mesure — celle qui avait cours ce jour-là. */
  unite: string | null;
  /**
   * L'unité que l'analyte porte AUJOURD'HUI au catalogue — celle qu'une
   * correction consignera. Rendue pour TOUTE ligne, analyte retiré compris :
   * la route du catalogue ne sert que les analytes actifs, si bien que l'écran
   * ne pouvait pas comparer les deux là où le catalogue a justement bougé.
   */
  uniteCatalogue: string | null;
  preleveLe: string;
  source: string;
  /** Horodatage serveur de la saisie — inantidatable, et il date la correction. */
  saisiLe: string;
  /** La ligne que celle-ci corrige, `null` si c'est une saisie neuve. */
  supersedesResultatId: string | null;
  /**
   * L'identifiant de la ligne qui CORRIGE celle-ci, `null` si elle est
   * courante. Calculé au SERVEUR, jamais à l'écran : la règle de départage
   * d'une fourche vit à un seul endroit, sinon deux surfaces raconteraient
   * deux histoires du même dossier.
   */
  corrigeeParId: string | null;
  /**
   * Les faits du laboratoire TELS QU'IMPRIMÉS sur la ligne lue qui a créé ce
   * résultat ([[D-267]]) — juxtaposés, attribués au laboratoire, jamais
   * comparés à la valeur. `null` (silence, [[D-157]] §4) : saisie praticien,
   * résultat corrigé (une correction n'a pas de ligne lue et n'hérite de
   * rien), aucun fait imprimé, ou unité du résultat différente de l'unité lue.
   */
  faitsLaboratoire: { intervalle: string | null; marquage: string | null } | null;
  /**
   * Le commentaire du laboratoire sur CE résultat, tel qu'imprimé ([[D-278]]
   * §3, BP-03 arbitrage 4), lu sur la ligne qui l'a créé. `texte: null` avec
   * `nonTranscrit` : imprimé mais trop long, jamais tronqué. `null` : saisie
   * praticien, correction (elle n'a pas de ligne lue), ou aucun commentaire.
   */
  commentaireLaboratoire: { texte: string | null; nonTranscrit: boolean } | null;
  /**
   * L'annulation ACTIVE qui retire le fil de cette ligne ([[D-294]]), `null`
   * si le fil n'est pas annulé. Posée sur TOUTES les lignes du fil, calculée
   * au serveur avec la même racine que la base. La fiche du praticien est le
   * seul lecteur qui montre un fil annulé (§6) — marqué, jamais filtré.
   */
  annulation: AnnulationAffichee | null;
};

/** Ce que la fiche montre d'une annulation : motif, auteur, date (LOT-09). */
export type AnnulationAffichee = {
  id: string;
  /** La ligne que l'annulation a visée — la tête du fil au moment du geste. */
  idResultatVise: string;
  motif: AnnulationActive['motif'];
  par: string;
  /** Posé par la base, ISO. */
  le: string;
};

/**
 * Une plage fonctionnelle ACTIVE, servie telle que le catalogue la porte
 * ([[D-157]]). JUXTAPOSITION, JAMAIS VERDICT : aucun écart n'est calculé ici,
 * aucun état n'est déduit, et la borne n'est jamais comparée à la mesure —
 * l'écran non plus ne le fera pas. Ce que cette structure transporte est un
 * FAIT du corpus, pas une lecture du dossier.
 *
 * Le référentiel LABORATOIRE n'est pas servi : les deux ne se fusionnent
 * jamais (invariant fondateur du schéma), et il est vide en production.
 */
export type PlageFonctionnelleAffichee = {
  borneMin: number | null;
  borneMax: number | null;
  unite: string;
  population: string;
  /** Une plage fonctionnelle n'existe qu'ancrée à son claim — le couple fait foi. */
  claimId: string;
  versionClaim: string;
  niveauPreuve: string;
};

/**
 * Un point de la série d'un analyte (BP-03) : une mesure qui fait foi. Les
 * faits et le commentaire du laboratoire se lisent sur la ligne `idResultat`
 * de `resultats`, qui les porte déjà avec leurs silences.
 */
export type PointDeSerieServi = {
  idResultat: string;
  valeur: string;
  unite: string | null;
  laboratoire: string | null;
  preleveLe: string;
  entreeLe: string;
  correctionLe: string | null;
  position: PositionDansLeSuivi;
};

export type SerieServie = {
  analyteCode: string;
  points: PointDeSerieServi[];
  motifs: MotifNonComparabilite[];
};

export type ResultatsGetResponse =
  | {
      ok: true;
      resultats: ResultatConsigne[];
      plagesParAnalyte: Record<string, PlageFonctionnelleAffichee[]>;
      series: SerieServie[];
    }
  | { ok: false; reason: string; error: string };

export type ResultatsPostResponse =
  | { ok: true; resultat: ResultatConsigne }
  | { ok: false; reason: string; error: string };

function echecGet(reason: string, error: string, status: number) {
  return NextResponse.json<ResultatsGetResponse>({ ok: false, reason, error }, { status });
}

function echecPost(reason: string, error: string, status: number) {
  return NextResponse.json<ResultatsPostResponse>({ ok: false, reason, error }, { status });
}

function depuisVerdictGet(verdict: Exclude<VerdictGardeResultats, { ok: true }>) {
  return echecGet(verdict.reason, verdict.error, verdict.status);
}

function depuisVerdictPost(verdict: Exclude<VerdictGardeResultats, { ok: true }>) {
  return echecPost(verdict.reason, verdict.error, verdict.status);
}

type LigneLue = {
  id: string;
  analyteCode: string;
  /**
   * `Decimal` du client Prisma. `toFixed()` sans argument le rend en notation
   * normale EXACTE — `toString()` passerait en exponentielle (`1e-7`).
   */
  valeur: { toFixed(): string };
  unite: string | null;
  preleveLe: Date;
  source: string;
  saisiLe: Date;
  supersedesResultatId: string | null;
  /** La relation, non filtrée par `actif` : `unite` y est celle d'AUJOURD'HUI. */
  analyte: { libelle: string; unite: string | null };
  /** La ligne lue qui a créé ce résultat, dans ce sens seulement ([[D-256]] A5). */
  ligneCandidate: {
    intervalleLu: string | null;
    marquageLu: string | null;
    uniteLue: string | null;
    valeurLue: string;
    commentaireLu: string | null;
    commentaireNonTranscrit: boolean;
    import: { laboratoireLu: string | null };
  } | null;
};

/** Le commentaire de la ligne lue, ou le silence. */
function commentaireDeLaLigne(ligne: LigneLue): ResultatConsigne['commentaireLaboratoire'] {
  const lue = ligne.ligneCandidate;
  if (!lue || (lue.commentaireLu === null && !lue.commentaireNonTranscrit)) return null;
  return { texte: lue.commentaireLu, nonTranscrit: lue.commentaireNonTranscrit };
}

/** Les faits de la ligne lue, ou le silence ([[D-267]] §5). */
function faitsDeLaLigne(ligne: LigneLue): ResultatConsigne['faitsLaboratoire'] {
  const lue = ligne.ligneCandidate;
  if (!lue || (lue.intervalleLu === null && lue.marquageLu === null)) return null;
  if (!unitesConcordent(lue.uniteLue, ligne.unite)) return null;
  // Valeur corrigée à la validation : la marque imprimée portait sur une autre
  // valeur que celle qui fait foi. Silence (§5 précisé, revue Codex #1333).
  if (lireValeurQuantitative(lue.valeurLue) !== ligne.valeur.toFixed()) return null;
  return { intervalle: lue.intervalleLu, marquage: lue.marquageLu };
}

function versConsigne(
  ligne: LigneLue,
  corrigeeParId: string | null = null,
  annulation: AnnulationActive | null = null,
): ResultatConsigne {
  return {
    id: ligne.id,
    analyteCode: ligne.analyteCode,
    analyteLibelle: ligne.analyte.libelle,
    valeur: ligne.valeur.toFixed(),
    unite: ligne.unite,
    uniteCatalogue: ligne.analyte.unite,
    preleveLe: ligne.preleveLe.toISOString(),
    source: ligne.source,
    saisiLe: ligne.saisiLe.toISOString(),
    supersedesResultatId: ligne.supersedesResultatId,
    corrigeeParId,
    faitsLaboratoire: faitsDeLaLigne(ligne),
    commentaireLaboratoire: commentaireDeLaLigne(ligne),
    annulation: annulation
      ? {
          id: annulation.id,
          idResultatVise: annulation.idResultat,
          motif: annulation.motif,
          par: annulation.praticienEmail,
          le: annulation.acteLe,
        }
      : null,
  };
}

/** Les colonnes rendues à la frontière — une seule liste, deux appels. */
const CHAMPS_LUS = {
  id: true,
  analyteCode: true,
  valeur: true,
  unite: true,
  preleveLe: true,
  source: true,
  saisiLe: true,
  supersedesResultatId: true,
  // La RELATION n'est pas filtrée par `actif` : elle rend l'unité courante
  // même d'un analyte retiré, ce que la route du catalogue ne fait pas.
  analyte: { select: { libelle: true, unite: true } },
  // Les faits du laboratoire ([[D-267]]) : lus par la relation, jamais copiés
  // sur le résultat (A5). Une saisie praticien n'a pas de ligne : `null`.
  // Le commentaire de la ligne et le laboratoire de l'import (BP-03) : le
  // premier recopié sous la valeur ([[D-278]] §3), le second pour les motifs
  // de non-comparabilité de la série.
  ligneCandidate: {
    select: {
      intervalleLu: true,
      marquageLu: true,
      uniteLue: true,
      valeurLue: true,
      commentaireLu: true,
      commentaireNonTranscrit: true,
      import: { select: { laboratoireLu: true } },
    },
  },
} as const;

export async function GET(req: Request) {
  try {
    const idPatient = new URL(req.url).searchParams.get('idPatient')?.trim() ?? '';
    // Lecture de données de santé nommées : l'accès se journalise (GD-1).
    const garde = await garderResultats(idPatient, { route: ROUTE_JOURNAL, methode: 'GET' });
    if (!garde.ok) return depuisVerdictGet(garde);

    const lignes = await prisma.resultatBiologique.findMany({
      where: { idPatient },
      orderBy: [{ analyteCode: 'asc' }, { preleveLe: 'asc' }, { saisiLe: 'asc' }],
      select: CHAMPS_LUS,
    });

    // LA SÉRIE EST RENDUE ENTIÈRE, corrections ET corrigées : une erreur se
    // signale, elle ne disparaît pas (`DC-30`). C'est le marquage qui dit
    // laquelle fait foi — pas un filtre, qui effacerait la trace. Les fils
    // ANNULÉS aussi sont rendus, marqués ([[D-294]] §6) : la fiche est le seul
    // lecteur qui les montre.
    const maillons = lignes.map(l => ({
      id: l.id,
      supersedesResultatId: l.supersedesResultatId,
      saisiLe: l.saisiLe.toISOString(),
    }));
    const corrections = correctionsParLigne(maillons);
    const [actives, joursZero] = await Promise.all([
      annulationsActives(prisma, idPatient),
      lireJoursZeroSuccessifs(idPatient),
    ]);
    const annulations = annulationParLigne(maillons, actives);

    // LA SÉRIE PAR ANALYTE (BP-03) : les seules mesures qui font foi, mêmes
    // lignes et mêmes annulations actives que ci-dessus — la fiche ne peut
    // pas raconter deux histoires du même dossier.
    const series: SerieServie[] = serieParAnalyte(
      lignes.map(l => ({
        id: l.id,
        supersedesResultatId: l.supersedesResultatId,
        saisiLe: l.saisiLe.toISOString(),
        analyteCode: l.analyteCode,
        preleveLe: l.preleveLe.toISOString(),
        valeur: l.valeur.toFixed(),
        unite: l.unite,
        laboratoire: l.ligneCandidate?.import.laboratoireLu ?? null,
      })),
      actives,
      joursZero,
    ).map(serie => ({
      analyteCode: serie.analyteCode,
      motifs: serie.motifs,
      points: serie.points.map(point => ({
        idResultat: point.ligne.id,
        valeur: point.ligne.valeur,
        unite: point.ligne.unite,
        laboratoire: point.ligne.laboratoire,
        preleveLe: point.ligne.preleveLe,
        entreeLe: point.entreeLe,
        correctionLe: point.correctionLe,
        position: point.position,
      })),
    }));

    // Les plages fonctionnelles des SEULS analytes présents au dossier
    // ([[D-157]]). Pas le catalogue entier : une route qui sert des données de
    // santé nommées n'a pas à verser en plus un référentiel que l'écran ne
    // montrera pas. `analyteCode` d'une ligne n'est jamais nul (colonne NOT
    // NULL) ; l'ensemble peut être vide, et alors la requête ne part pas.
    const codes = [...new Set(lignes.map(l => l.analyteCode))];
    const plages = codes.length === 0 ? [] : await prisma.biologyFunctionalRange.findMany({
      where: { analyteCode: { in: codes }, actif: true },
      orderBy: [{ analyteCode: 'asc' }, { population: 'asc' }],
      select: {
        analyteCode: true,
        borneMin: true,
        borneMax: true,
        unite: true,
        population: true,
        claimId: true,
        versionClaim: true,
        niveauPreuve: true,
      },
    });

    // TOUTES les plages actives d'un analyte sont rendues, jamais une seule.
    // En choisir une — « la plus pertinente », « celle de l'adulte » — serait
    // trancher à la place du praticien quelle population décrit ce dossier :
    // c'est précisément l'interprétation que ce lot refuse.
    const plagesParAnalyte: Record<string, PlageFonctionnelleAffichee[]> = {};
    for (const p of plages) {
      const code = p.analyteCode;
      if (code === null) continue;
      (plagesParAnalyte[code] ??= []).push({
        borneMin: p.borneMin,
        borneMax: p.borneMax,
        unite: p.unite,
        population: p.population,
        claimId: p.claimId,
        versionClaim: p.versionClaim,
        niveauPreuve: p.niveauPreuve,
      });
    }

    return NextResponse.json<ResultatsGetResponse>({
      ok: true,
      resultats: lignes.map(l =>
        versConsigne(l, corrections.get(l.id)?.id ?? null, annulations.get(l.id) ?? null),
      ),
      plagesParAnalyte,
      series,
    });
  } catch (err) {
    // JAMAIS `err.message` : un `PrismaClientValidationError` rend ses
    // arguments — dont des valeurs du dossier — et partirait dans les logs.
    console.error('[praticien/biologie/resultats GET] lecture refusée :', signature(err));
    return echecGet('server_error', 'Erreur technique.', 500);
  }
}

/**
 * LE FIL DE LA CIBLE SE CORRIGE-T-IL ? Deux refus, lus sur le FIL ENTIER :
 *
 * - `correction_deja_corrigee` — TÊTE DE FIL, DÉFINIE EXACTEMENT COMME À LA
 *   LECTURE. La base ACCEPTE la fourche (le contrat SQL le prouve exprès), la
 *   route la refuse : on corrige la version qui fait foi, pas une version déjà
 *   dépassée. La garde relit le FIL ENTIER, pas le seul successeur DIRECT. Sur
 *   une fourche préexistante, la branche perdante n'est supplantée par
 *   personne au sens du chaînage : elle passait la garde alors qu'elle ne fait
 *   pas foi, et la corriger faisait basculer l'autorité en silence vers la
 *   branche qui avait perdu (contre-revue du 2026-09-06, m13).
 * - `correction_resultat_annule` — le fil porte une annulation active
 *   ([[D-294]] §3) ; la base le refuse aussi.
 *
 * Le fil tient ENTIER dans la clé de la cible : une correction hérite de
 * l'analyte et de la date de sa cible — servie par `cb_resultat_bio_serie_idx`.
 * La clé peut porter d'AUTRES fils (une place libérée par une annulation) :
 * la racine les sépare, jamais la clé.
 */
async function refusDuFil(
  client: Prisma.TransactionClient | typeof prisma,
  idPatient: string,
  cible: { id: string; analyteCode: string; preleveLe: Date },
): Promise<'correction_deja_corrigee' | 'correction_resultat_annule' | null> {
  const fil = await client.resultatBiologique.findMany({
    where: { idPatient, analyteCode: cible.analyteCode, preleveLe: cible.preleveLe },
    select: { id: true, supersedesResultatId: true, saisiLe: true },
  });
  const maillons = fil.map(l => ({
    id: l.id,
    supersedesResultatId: l.supersedesResultatId,
    saisiLe: l.saisiLe.toISOString(),
  }));
  // L'annulation d'abord : sur un fil annulé, toute ligne — tête ou non —
  // reçoit le refus qui dit pourquoi (contre-revue du lot, P2-3).
  const actives = await annulationsActives(client, idPatient, fil.map(l => l.id));
  if (annulationParLigne(maillons, actives).has(cible.id)) return 'correction_resultat_annule';
  if (correctionsParLigne(maillons).has(cible.id)) return 'correction_deja_corrigee';
  return null;
}

type PostBody = {
  idPatient?: unknown;
  analyteCode?: unknown;
  valeur?: unknown;
  preleveLe?: unknown;
  /** Présent ⇒ correction de cette ligne-là ; absent ⇒ saisie neuve. */
  supersedesResultatId?: unknown;
};

export async function POST(req: Request) {
  try {
    let body: PostBody;
    try {
      body = (await req.json()) as PostBody;
    } catch {
      return echecPost('invalid', 'Corps de requête illisible.', 400);
    }
    // `null`, `42`, `[]` sont du JSON valide : garde AVANT tout accès aux
    // champs, sinon un client anonyme fabrique des 500 pré-auth.
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      return echecPost('invalid', 'Corps de requête illisible.', 400);
    }

    const idPatient = typeof body.idPatient === 'string' ? body.idPatient.trim() : '';
    // PAS d'`acces` ici, AU TITRE DE LA DISPENSE D'ÉCRITURE DE `GD-1` — et
    // c'est ce fondement-là qui vaut, pas « ce POST ne lit rien du dossier »,
    // qui devient faux avec la correction (elle lit la ligne visée). `GD-1`
    // exclut les écritures parce qu'elles « laissent déjà une trace datée et
    // attribuée » : ici `saisi_par` et `saisi_le`, plus le maillon. Le dépôt a
    // déjà tranché ce cas exact au même endroit — voir `D-118`, « le
    // non-journal du POST change de justification, pas de comportement ».
    // Les POST courrier/document patient, eux, journalisent : ils DÉRIVENT la
    // proposition entière, soit une lecture substantielle qui s'ajoute à
    // l'écriture. Ce POST-ci lit le fil d'UNE mesure pour se garder lui-même —
    // il n'en dérive rien et n'en rend rien. Le fondement, lui, est CATÉGORIEL
    // et ne dépend pas de l'ampleur lue : c'est la dispense d'écriture.
    const garde = await garderResultats(idPatient);
    if (!garde.ok) return depuisVerdictPost(garde);

    const patient = await prisma.patient.findUnique({
      where: { idPatient },
      select: { actif: true, suiviClotureLe: true },
    });
    if (!patient || !accepteNouvelEnvoi(patient)) {
      return echecPost(RAISON_DOSSIER_CLOS, MESSAGE_DOSSIER_CLOS, 409);
    }

    // UNE CHAÎNE MALFORMÉE EST UN REFUS, PAS UNE BASCULE SILENCIEUSE. Un champ
    // présent mais illisible (nombre, objet, blancs) valait auparavant
    // « absent » : le client croyait corriger et posait une mesure NEUVE, avec
    // l'analyte et la date qu'il avait envoyés. Changer de geste sans le dire
    // est pire que refuser. `null` seul vaut « pas de chaîne » — c'est la
    // valeur que porte la colonne pour une saisie neuve.
    const chaineDemandee =
      body.supersedesResultatId !== undefined && body.supersedesResultatId !== null;
    const supersedesResultatId =
      typeof body.supersedesResultatId === 'string' ? body.supersedesResultatId.trim() : '';
    if (chaineDemandee && (supersedesResultatId === '' || supersedesResultatId.length > 64)) {
      // Même discipline de borne que `idPatient` dans `garderResultats` : une
      // chaîne arbitrairement longue ne part pas en requête.
      return echecPost(
        'correction_cible_invalide',
        MESSAGES_REFUS_SAISIE.correction_cible_invalide,
        400,
      );
    }

    // LA CIBLE D'UNE CORRECTION, en une seule requête : `where { id, idPatient }`
    // pose l'existence ET l'appartenance au dossier d'un coup. Une cible d'un
    // AUTRE dossier est « introuvable » — le refus ne dit pas qu'elle existe
    // ailleurs, et un identifiant deviné n'apprend rien à celui qui l'essaie.
    const cible = supersedesResultatId
      ? await prisma.resultatBiologique.findFirst({
          where: { id: supersedesResultatId, idPatient },
          select: { id: true, analyteCode: true, preleveLe: true, source: true },
        })
      : null;
    if (supersedesResultatId && !cible) {
      return echecPost(
        'correction_cible_inconnue',
        MESSAGES_REFUS_SAISIE.correction_cible_inconnue,
        409,
      );
    }
    if (cible && cible.source !== 'saisie_praticien') {
      // UNE MESURE DE LABORATOIRE NE SE CORRIGE PAS PAR UNE SAISIE PRATICIEN.
      // `source` est posée serveur à `saisie_praticien` : sans cette garde, la
      // valeur rendue par un laboratoire passerait barrée sous une valeur
      // frappée à la main, dans une surface dont l'en-tête dit qu'`import_labo`
      // attend son propre chemin. Latent aujourd'hui (aucune ligne d'import
      // n'existe) ; la garde est posée AVANT que le cas n'arrive, et la
      // question est portée au registre plutôt que tranchée en silence.
      return echecPost(
        'correction_source_labo',
        MESSAGES_REFUS_SAISIE.correction_source_labo,
        409,
      );
    }
    if (cible) {
      // Tête de fil et fil non annulé (`refusDuFil`). Lecture sans verrou :
      // elle nomme le refus avant la validation de la valeur ; l'écriture la
      // rejoue sous les verrous de la garde.
      const refus = await refusDuFil(prisma, idPatient, cible);
      if (refus) return echecPost(refus, MESSAGES_REFUS_SAISIE[refus], 409);
    }

    // L'ANALYTE EST RELU SUR LA CIBLE en correction : le client n'a aucune
    // autorité dessus, exactement comme sur l'unité et sur `source`. Corriger
    // l'analyte serait annuler une mesure et en saisir une autre.
    const analyteCode = cible
      ? cible.analyteCode
      : typeof body.analyteCode === 'string'
        ? body.analyteCode.trim()
        : '';
    const analyte = analyteCode
      ? await prisma.biologyAnalyte.findUnique({
          where: { code: analyteCode },
          select: { code: true, libelle: true, unite: true, actif: true },
        })
      : null;
    if (!analyte) {
      return echecPost('analyte_inconnu', MESSAGES_REFUS_SAISIE.analyte_inconnu, 409);
    }
    // Un analyte RETIRÉ du catalogue interdit une mesure NEUVE, jamais une
    // correction : refuser enfermerait une valeur fausse pour toujours dans le
    // dossier, sans aucun geste pour la reprendre.
    if (!analyte.actif && !cible) {
      return echecPost('analyte_inactif', MESSAGES_REFUS_SAISIE.analyte_inactif, 409);
    }

    const verdict = validerSaisieResultat(
      {
        valeur: body.valeur,
        // La date vient de la LIGNE en correction, jamais du corps : elle est
        // déjà passée par cette même validation le jour de la saisie.
        preleveLe: cible ? cible.preleveLe.toISOString() : body.preleveLe,
      },
      new Date(),
    );
    if (!verdict.ok) {
      // Refus de FORME : la faute est au corps de requête, 400.
      return echecPost(verdict.raison, MESSAGES_REFUS_SAISIE[verdict.raison], 400);
    }

    try {
      const ecrire = (client: Prisma.TransactionClient | typeof prisma) => client.resultatBiologique.create({
        data: {
          idPatient,
          analyteCode: analyte.code,
          // Chaîne décimale canonique → `Decimal` : aucun flottant entre la
          // saisie et la colonne (LOT-10).
          valeur: new Prisma.Decimal(verdict.valeur),
          // L'unité de l'ANALYTE, relue à l'instant de la saisie — jamais
          // celle du client.
          unite: analyte.unite,
          preleveLe: verdict.preleveLe,
          source: 'saisie_praticien',
          saisiPar: garde.email,
          // Le maillon. `null` en saisie neuve — c'est LUI qui décide si la
          // ligne tombe sous l'unicité partielle ou en sort.
          supersedesResultatId: cible?.id ?? null,
        },
        select: CHAMPS_LUS,
      });
      // UNE CORRECTION S'ÉCRIT SOUS LES VERROUS DE LA GARDE ([[D-294]] §3) :
      // le dossier, puis la clé de la cible — ceux que prend l'acte
      // d'annulation. Le fil se RELIT dessous : une annulation commise entre
      // la lecture ci-dessus et l'écriture se dit `correction_resultat_annule`,
      // pas une 500. La base refuserait de toute façon (trigger
      // `resultats_biologiques_correction_avant_insertion`), elle fait foi.
      const issue = cible
        ? await prisma.$transaction(async tx => {
            await verrouillerCleDuResultat(tx, idPatient, cible.id);
            const refus = await refusDuFil(tx, idPatient, cible);
            return refus ? { refus, ligne: null } : { refus: null, ligne: await ecrire(tx) };
          })
        : { refus: null, ligne: await ecrire(prisma) };
      if (issue.refus !== null) {
        return echecPost(issue.refus, MESSAGES_REFUS_SAISIE[issue.refus], 409);
      }
      return NextResponse.json<ResultatsPostResponse>(
        { ok: true, resultat: versConsigne(issue.ligne) },
        { status: 201 },
      );
    } catch (err) {
      // Duck-typing P2002 (convention du dépôt, cf. api/portail/trust/lecture) :
      // la contrainte unique (patient, analyte, horodatage) a mordu.
      if ((err as { code?: string }).code === 'P2002') {
        return echecPost('doublon_mesure', MESSAGES_REFUS_SAISIE.doublon_mesure, 409);
      }
      // JAMAIS `err.message` : un PrismaClientValidationError rend ses
      // arguments — valeur mesurée comprise — et partirait dans les logs.
      console.error('[praticien/biologie/resultats POST] consignation refusée :', signature(err));
      return echecPost('server_error', 'Erreur technique.', 500);
    }
  } catch (err) {
    // Même discipline que le catch intérieur, qui l'écrivait déjà en toutes
    // lettres : JAMAIS `err.message`. Ce catch-ci enveloppe les lectures du
    // dossier (cible, tête de fil) — un `PrismaClientValidationError` y rendrait
    // ses arguments, et une valeur mesurée partirait dans les logs.
    console.error('[praticien/biologie/resultats POST] refus :', signature(err));
    return echecPost('server_error', 'Erreur technique.', 500);
  }
}
