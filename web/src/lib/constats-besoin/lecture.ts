// LA LECTURE DES CONSTATS SUR LES BESOINS D'UN DOSSIER ([[D-347]] §5, §6,
// t40) : les actes par besoin, la tête de chacun, ce qui la rend « à
// relire », et les pièces que l'écran peut citer. Le praticien du dossier seul
// la lit — la route le garde ; ni portail, ni courrier, ni scoring, ni
// orientation, ni re-passation, ni IA ne la lisent
// (`lecteursConstatsBesoin.guard.test.ts`).
//
// AUCUNE VALEUR NE SORT D'ICI : une pièce de biologie se dit par son analyte
// et sa date de prélèvement, une passation par son titre et sa date. La
// dérivation (`aRelire.ts`) est pure ; ce module ne fait que lire. Un échec
// de lecture lève : il ne se replie jamais sur « aucun constat ».

import type { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { annulationParLigne, correctionsParLigne } from '@/lib/biology-library/filCorrection';
import { annulationsActives } from '@/lib/biology-library/annulations';
import type { ReponseCitee, ResultatCite } from '@/lib/bio-parcours/constats/aRelire';
import { VALIDITES_RETENUES } from '@/lib/bio-parcours/constats/aRelire';
import {
  raisonsARelireBesoin,
  regrouperParBesoin,
  type ActeConstatBesoinLu,
  type EtatPourBesoins,
  type PieceLue,
} from './aRelire';
import type { RaisonARelire } from './liste';

type Client = Prisma.TransactionClient | typeof prisma;

export type PieceDecrite =
  | { type: 'resultat'; id: string; analyteCode: string; analyteLibelle: string | null; preleveLe: string }
  | { type: 'reponse'; id: string; titre: string; dateReponse: string };

export type ActeConstatBesoinDecrit = Omit<ActeConstatBesoinLu, 'pieces'> & { pieces: PieceDecrite[] };

export type BesoinDuDossier = {
  besoin: number;
  tete: ActeConstatBesoinDecrit | null;
  /** Vide si la tête tient, ou s'il n'y a pas de tête. */
  aRelire: RaisonARelire[];
  historique: ActeConstatBesoinDecrit[];
};

export type ConstatsBesoinDuDossier = {
  besoins: BesoinDuDossier[];
  /** Les pièces que l'écran peut citer : têtes de fil non annulées (étage ouvert), passations retenues. */
  citables: PieceDecrite[];
};

export type ContexteLecture = {
  besoinsAvecScore: ReadonlySet<number>;
  aujourdhui: string;
  /** L'étage des résultats est ouvert : les lignes de biologie s'offrent en pièces. */
  biologieCitable: boolean;
};

const iso = (d: Date) => d.toISOString();

export async function lireConstatsBesoinDuDossier(
  client: Client,
  idPatient: string,
  contexte: ContexteLecture,
): Promise<ConstatsBesoinDuDossier> {
  const actes = await client.constatBesoinPraticien.findMany({
    where: { idPatient },
    orderBy: { ordre: 'asc' },
    select: {
      id: true,
      ordre: true,
      acte: true,
      besoin: true,
      verdict: true,
      motif: true,
      note: true,
      aRevoirLe: true,
      idConstatRemplace: true,
      praticienEmail: true,
      acteLe: true,
      pieces: { select: { idResultat: true, idQuestionnaireReponse: true } },
    },
  });

  // Les lignes de biologie : lues si l'écran peut en citer, ou si un constat
  // en cite une — étage fermé et aucune pièce de biologie, la table n'est pas lue.
  const lireBiologie = contexte.biologieCitable || actes.some(a => a.pieces.some(p => p.idResultat !== null));
  const lignes = lireBiologie
    ? await client.resultatBiologique.findMany({
      where: { idPatient },
      select: { id: true, analyteCode: true, preleveLe: true, supersedesResultatId: true, saisiLe: true },
    })
    : [];
  const maillons = lignes.map(l => ({ id: l.id, supersedesResultatId: l.supersedesResultatId, saisiLe: l.saisiLe.toISOString() }));
  const corrigees = correctionsParLigne(maillons);
  const annulees = annulationParLigne(maillons, await annulationsActives(client, idPatient, lignes.map(l => l.id)));
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

  const dernierPrelevement = new Map<string, string>();
  for (const l of lignes) {
    if (annulees.has(l.id)) continue;
    const deja = dernierPrelevement.get(l.analyteCode);
    if (deja === undefined || l.preleveLe.getTime() > Date.parse(deja)) dernierPrelevement.set(l.analyteCode, iso(l.preleveLe));
  }
  // « Repassé » : une passation plus récente qui alimente le raisonnement —
  // une passation invalidée n'est pas une pièce neuve.
  const derniereReponse = new Map<string, string>();
  for (const r of reponses) {
    if (!VALIDITES_RETENUES.includes(r.statutValidite)) continue;
    const deja = derniereReponse.get(r.idQuestionnaire);
    if (deja === undefined || r.dateReponse.getTime() > Date.parse(deja)) derniereReponse.set(r.idQuestionnaire, iso(r.dateReponse));
  }

  const etat: EtatPourBesoins = {
    resultats: new Map<string, ResultatCite>(
      lignes.map(l => [l.id, {
        analyteCode: l.analyteCode,
        preleveLe: iso(l.preleveLe),
        corrigee: corrigees.has(l.id),
        annulee: annulees.has(l.id),
      }]),
    ),
    dernierPrelevement,
    reponses: new Map<string, ReponseCitee>(
      reponses.map(r => [r.id, { idQuestionnaire: r.idQuestionnaire, dateReponse: iso(r.dateReponse), statutValidite: r.statutValidite }]),
    ),
    derniereReponse,
    besoinsAvecScore: contexte.besoinsAvecScore,
    aujourdhui: contexte.aujourdhui,
  };

  // Deux clés, une seule renseignée par pièce (CHECK `une_piece`) : chacune
  // se décode à son type.
  type PieceBrute = { idResultat: string | null; idQuestionnaireReponse: string | null };
  const decrire = (piece: PieceBrute): PieceDecrite | null => {
    if (piece.idResultat !== null) {
      const l = lignes.find(x => x.id === piece.idResultat);
      return l
        ? { type: 'resultat', id: l.id, analyteCode: l.analyteCode, analyteLibelle: libelles.get(l.analyteCode) ?? null, preleveLe: iso(l.preleveLe) }
        : null;
    }
    const r = reponses.find(x => x.id === piece.idQuestionnaireReponse);
    return r ? { type: 'reponse', id: r.id, titre: r.titre, dateReponse: iso(r.dateReponse) } : null;
  };
  const pieceLue = (p: PieceBrute): PieceLue | null => {
    if (p.idResultat !== null) return { type: 'resultat', idResultat: p.idResultat };
    if (p.idQuestionnaireReponse !== null) return { type: 'reponse', idReponse: p.idQuestionnaireReponse };
    return null;
  };

  const lus: ActeConstatBesoinLu[] = actes.map(a => ({
    id: a.id,
    ordre: a.ordre.toString(),
    acte: a.acte === 'retrait' ? 'retrait' : 'pose',
    besoin: a.besoin,
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
  const decrireActe = (a: ActeConstatBesoinLu): ActeConstatBesoinDecrit => ({
    ...a,
    pieces: (piecesBrutes.get(a.id) ?? []).map(decrire).filter((p): p is PieceDecrite => p !== null),
  });

  const besoins = regrouperParBesoin(lus).map(b => ({
    besoin: b.besoin,
    tete: b.tete ? decrireActe(b.tete) : null,
    aRelire: b.tete ? raisonsARelireBesoin(b.tete, etat) : [],
    historique: b.historique.map(decrireActe),
  }));

  const citables: PieceDecrite[] = [
    ...(contexte.biologieCitable
      ? lignes
        .filter(l => !corrigees.has(l.id) && !annulees.has(l.id))
        .sort((a, b) => b.preleveLe.getTime() - a.preleveLe.getTime() || (a.analyteCode < b.analyteCode ? -1 : 1))
        .map(l => ({ type: 'resultat' as const, id: l.id, analyteCode: l.analyteCode, analyteLibelle: libelles.get(l.analyteCode) ?? null, preleveLe: iso(l.preleveLe) }))
      : []),
    ...reponses
      .filter(r => VALIDITES_RETENUES.includes(r.statutValidite))
      .sort((a, b) => b.dateReponse.getTime() - a.dateReponse.getTime())
      .map(r => ({ type: 'reponse' as const, id: r.id, titre: r.titre, dateReponse: iso(r.dateReponse) })),
  ];

  return { besoins, citables };
}
