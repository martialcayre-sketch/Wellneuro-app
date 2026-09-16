import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emailPraticien } from '@/lib/praticien/appartenance';

export type CorrespondanceCompteurApiResponse = {
  ok: boolean;
  /**
   * Dossiers où le DERNIER échange consigné est sortant et remonte à plus de
   * `DELAI_ATTENTE_JOURS` — c'est-à-dire : on a écrit, rien n'est revenu.
   */
  nbEnAttente: number;
  /** Le délai appliqué, servi au client pour qu'il puisse le dire à l'écran. */
  delaiJours: number;
  unavailable?: boolean;
  error?: string;
};

/**
 * DÉLAI PRODUIT, PAS CLINIQUE. Sept jours reprend la fenêtre du compteur
 * précédent — le seul repère dont on dispose. Aucun fait ne l'appuie : il se
 * révisera au premier constat d'usage, et n'a aucune valeur de recommandation.
 */
const DELAI_ATTENTE_JOURS = 7;

const INDISPONIBLE: Omit<CorrespondanceCompteurApiResponse, 'error'> = {
  ok: false,
  nbEnAttente: 0,
  delaiJours: DELAI_ATTENTE_JOURS,
  unavailable: true,
};

const JOUR_MS = 24 * 60 * 60 * 1000;

// GET /api/praticien/correspondance-medecin/recentes/compteur — le nombre, et
// RIEN d'autre.
//
// CE QUE LE BADGE COMPTAIT, ET POURQUOI C'ÉTAIT UN MIROIR. Il recensait toutes
// les consignations du praticien sur 7 jours glissants, sans filtre de sens.
// Or les deux sens sont des gestes du praticien : l'application n'envoie rien
// et ne reçoit rien. La pastille comptait donc ce que son lecteur venait
// lui-même de taper, et retombait à zéro toute seule au huitième jour, sans
// qu'aucune action n'ait été faite. Une pastille chiffrée à côté d'une entrée
// de navigation se lit « il est arrivé quelque chose » : celle-ci ne désignait
// aucune tâche.
//
// CE QU'IL COMPTE MAINTENANT : les dossiers où un envoi a été consigné et où
// aucune réponse n'a été transcrite depuis. C'est la seule attente que cette
// table sache exprimer — et elle, au moins, se résout par un geste.
//
// RÉSERVE, à connaître avant de s'y fier. L'appariement se fait par DOSSIER et
// jamais par médecin : `medecinLibelle` est du texte libre dont la seule garde
// est le refus du caractère « @ ». Deux courriers au même dossier, adressés à
// deux médecins différents, ne se distinguent pas ici.
//
// Aucune identité ne traverse cette route : elle ne lit que `idPatient`, `sens`
// et `consigneLe`, et ne rend qu'un entier. C'est une garantie de forme, pas
// une discipline de rendu.
//
// Le filtre `praticienEmail` reste, bien qu'il ne restreigne rien aujourd'hui
// (cabinet mono-praticien) : il est la condition de réouverture écrite d'un
// second compte, et le retirer ferait du compteur un total de cabinet le jour
// où ce compte existerait.
export async function GET(): Promise<NextResponse<CorrespondanceCompteurApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ ...INDISPONIBLE, error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const email = emailPraticien(session) ?? '';
    const seuil = new Date(Date.now() - DELAI_ATTENTE_JOURS * JOUR_MS);

    // LA DÉDUPLICATION SE FAIT EN BASE, ET SEUL UN ENTIER REMONTE.
    //
    // La première écriture de ce compteur ramenait TOUTES les lignes du
    // praticien (`findMany` + `distinct`), puis triait et filtrait en Node. La
    // requête n'était bornée par rien : elle croissait avec chaque ligne
    // d'historique, et le rail la déclenche à chaque montage — deux instances
    // par page. Constat de revue de la PR #1148, retenu.
    //
    // `DISTINCT ON (id_patient)` avec `ORDER BY id_patient, consigne_le DESC`
    // retient la dernière ligne de chaque dossier ; le filtre extérieur ne garde
    // que celles qui sont un envoi antérieur au seuil. Une seule ligne traverse
    // le réseau.
    //
    // `sens` est comparé au littéral `'sortant'` : une valeur hors vocabulaire
    // n'est donc jamais comptée — une attente ne s'invente pas sur une donnée
    // illisible ([[DC-24]]). La colonne n'a aucun CHECK.
    //
    // RÉSERVE : `praticien_email` ne porte AUCUN index (le seul index de la
    // table est `(id_patient, consigne_le)`). Le balayage reste donc séquentiel.
    // Sur un cabinet mono-praticien la colonne ne discrimine rien et l'index ne
    // servirait à rien ; il deviendra utile le jour d'un second compte, et c'est
    // une migration — donc un arbitrage distinct, pas un effet de bord.
    const [ligne] = await prisma.$queryRaw<{ nb: number }[]>`
      SELECT count(*)::int AS nb
      FROM (
        SELECT DISTINCT ON (id_patient) id_patient, sens, consigne_le
        FROM correspondances_medecin
        WHERE praticien_email = ${email}
        ORDER BY id_patient, consigne_le DESC
      ) AS dernieres
      WHERE sens = 'sortant' AND consigne_le < ${seuil}
    `;

    return NextResponse.json({
      ok: true,
      nbEnAttente: ligne?.nb ?? 0,
      delaiJours: DELAI_ATTENTE_JOURS,
    });
  } catch (err) {
    console.error(
      '[correspondance recentes compteur GET]',
      err instanceof Error ? err.message : String(err),
    );
    return NextResponse.json({ ...INDISPONIBLE, error: 'Erreur technique.' }, { status: 500 });
  }
}
