// LA LECTURE DES CONSTATS D'UN DOSSIER ([[D-331]] §5, §8, BP-11) : les actes
// par hypothèse, la tête de chacune, ce qui la rend « à relire », et les
// pièces que l'écran peut citer. Le praticien du dossier seul la lit — la
// route le garde ; ni portail, ni courrier, ni scoring, ni orientation, ni IA
// ne la lisent (`lecteursConstats.guard.test.ts`).
//
// AUCUNE VALEUR NE SORT D'ICI : une pièce de biologie se dit par son analyte
// et sa date de prélèvement, une passation par son titre et sa date, une
// ligne de traitement par sa nature, son nom et sa date ([[D-335]] §7). La
// dérivation (`aRelire.ts`) est pure ; ce module ne fait que lire. Un échec
// de lecture lève : il ne se replie jamais sur « aucun constat ».

import type { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { annulationParLigne, correctionsParLigne } from '@/lib/biology-library/filCorrection';
import { annulationsActives } from '@/lib/biology-library/annulations';
import {
  raisonsARelire,
  regrouperParHypothese,
  VALIDITES_RETENUES,
  type ActeConstatLu,
  type EtatDuDossier,
  type PieceLue,
  type ReponseCitee,
  type ResultatCite,
} from './aRelire';
import type { RaisonARelire } from './liste';

type Client = Prisma.TransactionClient | typeof prisma;

export type PieceDecrite =
  | { type: 'resultat'; id: string; analyteCode: string; analyteLibelle: string | null; preleveLe: string }
  | { type: 'reponse'; id: string; titre: string; dateReponse: string }
  | { type: 'traitement'; id: string; nature: string | null; nom: string | null; acteLe: string };

export type ActeConstatDecrit = Omit<ActeConstatLu, 'pieces'> & { pieces: PieceDecrite[] };

export type HypotheseDuDossier = {
  hypotheseCode: string;
  tete: ActeConstatDecrit | null;
  /** Vide si la tête tient, ou s'il n'y a pas de tête. */
  aRelire: RaisonARelire[];
  historique: ActeConstatDecrit[];
};

export type ConstatsDuDossier = {
  hypotheses: HypotheseDuDossier[];
  /** Les pièces que l'écran peut citer : têtes de fil non annulées, passations retenues. */
  citables: PieceDecrite[];
};

export type ContexteLecture = {
  hypothesesEnVigueur: ReadonlySet<string>;
  aujourdhui: string;
  /** Sous `WN_PHYSIO_TRAITEMENTS` : les têtes de traitement s'offrent en pièces ([[D-335]] §7). */
  traitementsCitables?: boolean;
};

const iso = (d: Date) => d.toISOString();

/** Les lignes de biologie du dossier, avec leur fil et leurs annulations. */
async function lireResultats(client: Client, idPatient: string) {
  const lignes = await client.resultatBiologique.findMany({
    where: { idPatient },
    select: { id: true, analyteCode: true, preleveLe: true, supersedesResultatId: true, saisiLe: true },
  });
  const maillons = lignes.map(l => ({
    id: l.id,
    supersedesResultatId: l.supersedesResultatId,
    saisiLe: l.saisiLe.toISOString(),
  }));
  const corrigees = correctionsParLigne(maillons);
  const annulees = annulationParLigne(maillons, await annulationsActives(client, idPatient, lignes.map(l => l.id)));
  return { lignes, corrigees, annulees };
}

export async function lireConstatsDuDossier(
  client: Client,
  idPatient: string,
  contexte: ContexteLecture,
): Promise<ConstatsDuDossier> {
  const actes = await client.constatPraticien.findMany({
    where: { idPatient },
    orderBy: { ordre: 'asc' },
    select: {
      id: true,
      ordre: true,
      acte: true,
      hypotheseCode: true,
      verdict: true,
      motif: true,
      note: true,
      aRevoirLe: true,
      idConstatRemplace: true,
      praticienEmail: true,
      acteLe: true,
      pieces: { select: { idResultat: true, idQuestionnaireReponse: true, idTraitement: true } },
    },
  });

  // Les lignes de traitement ([[D-335]] §7) : lues si l'écran peut en citer,
  // ou si un constat en cite une — drapeau éteint et aucune pièce de
  // traitement, la table n'est pas lue.
  const lireTraitements = contexte.traitementsCitables === true
    || actes.some(a => a.pieces.some(p => p.idTraitement !== null));
  const traitements = lireTraitements
    ? await client.traitementEnCours.findMany({
      where: { idPatient },
      select: { id: true, acte: true, nature: true, nom: true, acteLe: true, idLigneRemplacee: true },
    })
    : [];
  const visees = new Set(traitements.map(t => t.idLigneRemplacee).filter((id): id is string => id !== null));

  // Toutes les lignes du dossier : celles que citent les pièces, celles de
  // leurs fils, les prélèvements plus récents, et les citables.
  const { lignes, corrigees, annulees } = await lireResultats(client, idPatient);
  const analytes = [...new Set(lignes.map(l => l.analyteCode))];
  const libelles = new Map(
    (analytes.length === 0
      ? []
      : await client.biologyAnalyte.findMany({ where: { code: { in: analytes } }, select: { code: true, libelle: true } })
    ).map(a => [a.code, a.libelle] as const),
  );

  const reponses = await client.questionnaireReponse.findMany({
    where: { idPatient },
    select: { id: true, idQuestionnaire: true, titre: true, dateReponse: true, statutValidite: true },
  });

  const etat: EtatDuDossier = {
    resultats: new Map<string, ResultatCite>(
      lignes.map(l => [l.id, {
        analyteCode: l.analyteCode,
        preleveLe: iso(l.preleveLe),
        corrigee: corrigees.has(l.id),
        annulee: annulees.has(l.id),
      }]),
    ),
    dernierPrelevement: new Map(),
    reponses: new Map<string, ReponseCitee>(
      reponses.map(r => [r.id, { idQuestionnaire: r.idQuestionnaire, dateReponse: iso(r.dateReponse), statutValidite: r.statutValidite }]),
    ),
    derniereReponse: new Map(),
    traitementsRemplaces: new Map(traitements.map(t => [t.id, visees.has(t.id)])),
    hypothesesEnVigueur: contexte.hypothesesEnVigueur,
    aujourdhui: contexte.aujourdhui,
  };
  const dernierPrelevement = etat.dernierPrelevement as Map<string, string>;
  for (const l of lignes) {
    if (annulees.has(l.id)) continue;
    const deja = dernierPrelevement.get(l.analyteCode);
    if (deja === undefined || l.preleveLe.getTime() > Date.parse(deja)) dernierPrelevement.set(l.analyteCode, iso(l.preleveLe));
  }
  // « Repassé » : une passation plus récente qui alimente le raisonnement —
  // une passation invalidée n'est pas une pièce neuve.
  const derniereReponse = etat.derniereReponse as Map<string, string>;
  for (const r of reponses) {
    if (!VALIDITES_RETENUES.includes(r.statutValidite)) continue;
    const deja = derniereReponse.get(r.idQuestionnaire);
    if (deja === undefined || r.dateReponse.getTime() > Date.parse(deja)) derniereReponse.set(r.idQuestionnaire, iso(r.dateReponse));
  }

  const decrireTraitement = (t: (typeof traitements)[number]): PieceDecrite =>
    ({ type: 'traitement', id: t.id, nature: t.nature, nom: t.nom, acteLe: iso(t.acteLe) });

  // Trois clés, une seule renseignée par pièce (CHECK `une_piece`) : chacune
  // se décode à son type — une pièce qui n'est pas un résultat n'est pas
  // forcément une réponse (revue `wn-reviewer` de la migration).
  type PieceBrute = { idResultat: string | null; idQuestionnaireReponse: string | null; idTraitement: string | null };
  const decrire = (piece: PieceBrute): PieceDecrite | null => {
    if (piece.idResultat !== null) {
      const l = lignes.find(x => x.id === piece.idResultat);
      return l
        ? { type: 'resultat', id: l.id, analyteCode: l.analyteCode, analyteLibelle: libelles.get(l.analyteCode) ?? null, preleveLe: iso(l.preleveLe) }
        : null;
    }
    if (piece.idTraitement !== null) {
      const t = traitements.find(x => x.id === piece.idTraitement);
      return t ? decrireTraitement(t) : null;
    }
    const r = reponses.find(x => x.id === piece.idQuestionnaireReponse);
    return r ? { type: 'reponse', id: r.id, titre: r.titre, dateReponse: iso(r.dateReponse) } : null;
  };
  const pieceLue = (p: PieceBrute): PieceLue | null => {
    if (p.idResultat !== null) return { type: 'resultat', idResultat: p.idResultat };
    if (p.idTraitement !== null) return { type: 'traitement', idTraitement: p.idTraitement };
    if (p.idQuestionnaireReponse !== null) return { type: 'reponse', idReponse: p.idQuestionnaireReponse };
    return null;
  };

  const lus: ActeConstatLu[] = actes.map(a => ({
    id: a.id,
    ordre: a.ordre.toString(),
    acte: a.acte === 'retrait' ? 'retrait' : 'pose',
    hypotheseCode: a.hypotheseCode,
    verdict: a.verdict,
    motif: a.motif,
    note: a.note,
    aRevoirLe: a.aRevoirLe ? a.aRevoirLe.toISOString().slice(0, 10) : null,
    idConstatRemplace: a.idConstatRemplace,
    praticienEmail: a.praticienEmail,
    acteLe: iso(a.acteLe),
    pieces: a.pieces.map(pieceLue).filter((p): p is PieceLue => p !== null),
  }));
  const piecesBrutes = new Map(actes.map(a => [a.id, a.pieces]));
  const decrireActe = (a: ActeConstatLu): ActeConstatDecrit => ({
    ...a,
    pieces: (piecesBrutes.get(a.id) ?? []).map(decrire).filter((p): p is PieceDecrite => p !== null),
  });

  const hypotheses = regrouperParHypothese(lus).map(h => ({
    hypotheseCode: h.hypotheseCode,
    tete: h.tete ? decrireActe(h.tete) : null,
    aRelire: h.tete ? raisonsARelire(h.tete, etat) : [],
    historique: h.historique.map(decrireActe),
  }));

  const citables: PieceDecrite[] = [
    ...lignes
      .filter(l => !corrigees.has(l.id) && !annulees.has(l.id))
      .sort((a, b) => b.preleveLe.getTime() - a.preleveLe.getTime() || (a.analyteCode < b.analyteCode ? -1 : 1))
      .map(l => ({ type: 'resultat' as const, id: l.id, analyteCode: l.analyteCode, analyteLibelle: libelles.get(l.analyteCode) ?? null, preleveLe: iso(l.preleveLe) })),
    ...reponses
      .filter(r => VALIDITES_RETENUES.includes(r.statutValidite))
      .sort((a, b) => b.dateReponse.getTime() - a.dateReponse.getTime())
      .map(r => ({ type: 'reponse' as const, id: r.id, titre: r.titre, dateReponse: iso(r.dateReponse) })),
    // Les têtes de traitement — en cours ou arrêtées : une pose que rien ne vise.
    ...(contexte.traitementsCitables === true
      ? traitements
        .filter(t => t.acte === 'pose' && !visees.has(t.id))
        .sort((a, b) => b.acteLe.getTime() - a.acteLe.getTime())
        .map(decrireTraitement)
      : []),
  ];

  return { hypotheses, citables };
}
