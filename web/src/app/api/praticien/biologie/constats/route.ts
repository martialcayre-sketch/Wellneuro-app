import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { dateJourParis } from '@/lib/dateParis';
import {
  accepteNouvelEnvoi,
  MESSAGE_DOSSIER_CLOS,
  RAISON_DOSSIER_CLOS,
} from '@/lib/patient/cycleDeVie';
import { garderResultats } from '@/lib/biology-library/gardeResultats';
import { signature } from '@/lib/biology-library/saisieMessages';
import { lireRayonFichesUsage } from '@/lib/fiches-usage/lecture';
import { isBioConstatEnabled } from '@/lib/bio-parcours/constats/drapeau';
import { lireDemandeConstat } from '@/lib/bio-parcours/constats/demande';
import { ecrireConstat, RefusConstat } from '@/lib/bio-parcours/constats/ecriture';
import { estConflitConcurrent, estRefusDeLaBase } from '@/lib/bio-parcours/constats/erreurs';
import { lireConstatsDuDossier, type ConstatsDuDossier } from '@/lib/bio-parcours/constats/lecture';
import { MESSAGES_REFUS_CONSTAT } from '@/lib/bio-parcours/constats/messages';
import { structureDuParcours } from '@/lib/bio-parcours/constats/structure';

// LES CONSTATS DU PRATICIEN SUR UNE HYPOTHÈSE DU PARCOURS ([[D-331]], BP-11).
//
// GET : les constats du dossier par hypothèse, la tête de chacune et ce qui
// la rend « à relire » (dérivé, jamais écrit), les hypothèses de la
// structure signée avec leur libellé de référence, et les pièces citables.
// Lecture de données de santé nommées : l'accès se journalise (GD-1).
//
// POST : poser un constat (premier, ou en remplacement de la tête), ou retirer
// la tête. La base fait foi (`ecriture.ts`) ; la route dit le refus avant,
// nommé. Les refus que la base rend malgré tout — une course perdue entre la
// lecture et l'écriture — sont reconnus à leur CODE, jamais à leur message.
//
// DRAPEAU `WN_BIO_CONSTAT`, éteint, fail-closed ([[D-081]]) : il passe avant
// la session, comme celui des résultats. Aucun constat ne se pose avant la
// signature de la structure de BP-12a ([[D-314]] §10).
//
// PAS de journal d'accès à l'écriture : dispense `GD-1` ([[D-118]]), comme les
// autres gestes de biologie — l'acte porte son auteur et sa date.

const ROUTE_JOURNAL = '/api/praticien/biologie/constats';

export type HypotheseOfferte = { hypotheseCode: string; libelle: string | null };

export type ConstatsGetResponse =
  | ({ ok: true; structureSignee: boolean; offertes: HypotheseOfferte[]; aujourdhui: string } & ConstatsDuDossier)
  | { ok: false; reason: string; error: string };

export type ConstatsPostResponse = { ok: true; id: string } | { ok: false; reason: string; error: string };

function echec(reason: string, status: number, error = MESSAGES_REFUS_CONSTAT[reason] ?? 'Erreur technique.') {
  return NextResponse.json({ ok: false as const, reason, error }, { status });
}

function desactive() {
  return echec('constats_desactives', 503);
}

/** Les libellés de référence des hypothèses — `null` tant que la structure n'est pas signée. */
async function libellesDesHypotheses(): Promise<Map<string, string>> {
  const rayon = await lireRayonFichesUsage();
  const rendu = new Map<string, string>();
  for (const terme of rayon.termes) {
    if (terme.nature !== 'hypothese' || terme.reference === null) continue;
    const libelle = terme.libelles.find(l => l.id === terme.reference)?.libelle;
    if (libelle) rendu.set(terme.termeId, libelle);
  }
  return rendu;
}

export async function GET(req: Request) {
  try {
    if (!isBioConstatEnabled()) return desactive();
    const idPatient = new URL(req.url).searchParams.get('idPatient')?.trim() ?? '';
    const garde = await garderResultats(idPatient, { route: ROUTE_JOURNAL, methode: 'GET' });
    if (!garde.ok) return echec(garde.reason, garde.status, garde.error);

    const structure = structureDuParcours();
    const aujourdhui = dateJourParis();
    // Une structure retouchée et non re-signée n'est pas « la structure signée
    // en vigueur » (D-331 §5.7) : aucune hypothèse n'y figure, et chaque
    // constat se dit « à relire » plutôt que de tenir contre une table que
    // personne n'a signée (revue `wn-reviewer` de la PR 2).
    const enVigueur = new Set(structure.signee ? structure.hypotheses : []);
    const [constats, libelles] = await Promise.all([
      lireConstatsDuDossier(prisma, idPatient, { hypothesesEnVigueur: enVigueur, aujourdhui }),
      structure.signee ? libellesDesHypotheses() : Promise.resolve(new Map<string, string>()),
    ]);
    const offertes = structure.signee
      ? structure.hypotheses.map(h => ({ hypotheseCode: h, libelle: libelles.get(h) ?? null }))
      : [];
    return NextResponse.json<ConstatsGetResponse>({
      ok: true,
      structureSignee: structure.signee,
      offertes,
      aujourdhui,
      ...constats,
    });
  } catch (err) {
    // JAMAIS `err.message` : il porterait des identifiants du dossier.
    console.error('[praticien/biologie/constats GET] échec :', signature(err));
    return echec('server_error', 500, 'Erreur technique.');
  }
}

export async function POST(req: Request) {
  try {
    if (!isBioConstatEnabled()) return desactive();
    let corps: unknown;
    try {
      corps = await req.json();
    } catch {
      return echec('acte_invalide', 400);
    }
    if (corps === null || typeof corps !== 'object' || Array.isArray(corps)) return echec('acte_invalide', 400);
    const brut = corps as Record<string, unknown>;

    const idPatient = typeof brut.idPatient === 'string' ? brut.idPatient.trim() : '';
    const garde = await garderResultats(idPatient);
    if (!garde.ok) return echec(garde.reason, garde.status, garde.error);

    // Même règle que les autres gestes de biologie : un dossier clos ne
    // reçoit plus d'écriture.
    const patient = await prisma.patient.findUnique({
      where: { idPatient },
      select: { actif: true, suiviClotureLe: true },
    });
    if (!patient || !accepteNouvelEnvoi(patient)) return echec(RAISON_DOSSIER_CLOS, 409, MESSAGE_DOSSIER_CLOS);

    const structure = structureDuParcours();
    const lu = lireDemandeConstat(brut, structure, dateJourParis());
    if (!lu.ok) {
      const conflit = lu.raison === 'structure_non_signee' || lu.raison === 'hypothese_hors_structure';
      return echec(lu.raison, conflit ? 409 : 400);
    }

    const ecrit = await prisma.$transaction(tx => ecrireConstat(tx, idPatient, lu.demande, structure, garde.email));
    return NextResponse.json<ConstatsPostResponse>({ ok: true, id: ecrit.id }, { status: 201 });
  } catch (err) {
    if (err instanceof RefusConstat) return echec(err.raison, 409);
    if (estConflitConcurrent(err)) return echec('conflit_concurrent', 409);
    if (estRefusDeLaBase(err)) {
      console.error('[praticien/biologie/constats POST] refus de la base :', signature(err));
      return echec('refus_base', 409);
    }
    console.error('[praticien/biologie/constats POST] échec :', signature(err));
    return echec('server_error', 500, 'Erreur technique.');
  }
}
