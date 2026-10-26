import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BESOIN_SOURCES, BESOINS } from '@/lib/equilibre/constants';
import {
  construireHistoriqueEquilibre,
  construireReponsesParQuestionnaire,
  datesDesReponsesRetenues,
  questionnairesEcartesParValidite,
  resoudreDateT0,
} from '@/lib/equilibre/depuisPrisma';
import { calculerNiveauxPreuveTousLesBesoins } from '@/lib/equilibre/evidence';
import { calculerDeltaMomentum, resoudreLectureJalon } from '@/lib/equilibre/momentum';
import { ecartsDecisionBesoin, motifsNonMesureBesoin } from '@/lib/equilibre/motifsBesoins';
import {
  BESOIN_CLARTE,
  BESOIN_RESERVE_ADAPTATION,
  calculerObjetsCliniques,
  SOURCES_STABILITE_METABOLIQUE,
} from '@/lib/equilibre/objetsCliniques';
import { calculerCouvertureSource, compterBesoinsMesures } from '@/lib/equilibre/score';
import { emailPraticien, filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import { journaliserAccesDossier } from '@/lib/praticien/journalAcces';
import { provenanceDesSources } from '@/lib/praticien/provenanceSources';
import type { PresenceSourceStabilite } from '@/lib/praticien/mentionStabiliteMetabolique';
import type { EcartDecisionServi, MotifNonMesureServi } from '@/lib/praticien/motifNonMesure';
import type { ProvenanceChiffre, ProvenanceMomentum } from '@/lib/praticien/provenanceChiffre';
import type {
  JalonMomentum,
  NiveauPreuveBesoin,
  ResultatMomentum,
  SourceQuestionnaire,
  StrateCode,
} from '@/lib/equilibre/types';

// Gabarit littéral pour le journal des accès (G-TRUST-04) — jamais l'URL reçue.
const ROUTE_JOURNAL = '/api/praticien/equilibre';

export type PrioriteBesoin = {
  besoin: number;
  libellePraticien: string;
  strate: StrateCode; // CORPS | ANCRAGE | ESPRIT — pour la viz cercles concentriques
  couverture: number | null; // 0-100, plus haut = mieux
  niveauPreuve: NiveauPreuveBesoin;
  /** Pourquoi le besoin n'est pas mesuré (r3_08, Q4) ; `null` s'il l'est. */
  motifNonMesure: MotifNonMesureServi[] | null;
  /** Écart avec la décision d'un besoin mesuré (r3_10, Q5) ; `null` sans écart. */
  ecartDecision: EcartDecisionServi[] | null;
  /** Provenance datée de la couverture ([[D-333]] §2 règle 1) ; `null` quand
   *  elle est absente. */
  provenance: ProvenanceChiffre | null;
  /** La carte du cockpit qui sert la même valeur sous un autre nom (B9, B10). */
  carteLiee: 'reserveAdaptation' | 'clarte' | null;
};

export type ObjetsCliniquesReponse = {
  indiceGlobal: number | null; // 0-100
  /** Besoins qui ont nourri `indiceGlobal`, sur `besoinsTotal` ([[D-329]] §3). */
  besoinsMesures: number;
  besoinsTotal: number;
  stabiliteMetabolique: number | null; // 0-100
  /** Sources de la stabilité présentes ou manquantes ([[D-333]] §3) : la
   *  présence seule, aucun chiffre par source. */
  stabiliteMetaboliqueSources: PresenceSourceStabilite[];
  reserveAdaptation: number | null; // 0-100
  clarte: number | null; // 0-100
  momentum: ResultatMomentum | null;
  /** Le total a été ramené au plafond des fondations critiques ([[D-106]]) :
   *  le fait seul — ni le besoin, ni la valeur avant plafond (Q9). */
  plafondApplique: boolean;
  /** Version du moteur courant (`VERSION_SCORE_EQUILIBRE`), servie même sans
   *  indice : le chip « Au tour précédent » la lit, ses deux lectures étant
   *  recalculées par ce moteur (r3_08). */
  versionCalcul: string;
  /** Provenance datée de chaque chiffre ([[D-333]] §2 règle 1) ; `null` quand
   *  le chiffre lui-même est absent. */
  provenance: {
    indiceGlobal: ProvenanceChiffre | null;
    stabiliteMetabolique: ProvenanceChiffre | null;
    reserveAdaptation: ProvenanceChiffre | null;
    clarte: ProvenanceChiffre | null;
    momentum: ProvenanceMomentum | null;
  };
};

export type EquilibreApiResponse =
  | {
      patient: { idPatient: string; prenom: string; nom: string; email: string };
      objetsCliniques: ObjetsCliniquesReponse;
      priorites: PrioriteBesoin[];
    }
  | { unavailable: true; reason: 'unauthenticated' | 'invalid_payload' | 'patient_not_found' | 'exception' };

// 0-1 (couverture) -> 0-100 arrondi, en préservant null (jamais 0 par défaut).
function versCent(ratio: number | null): number | null {
  return ratio === null ? null : Math.round(ratio * 100);
}

// GET /api/praticien/equilibre?idPatient=PAT001
export async function GET(req: Request): Promise<NextResponse<EquilibreApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ unavailable: true, reason: 'unauthenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const idPatient = (searchParams.get('idPatient') ?? '').trim();
  if (!idPatient) {
    return NextResponse.json({ unavailable: true, reason: 'invalid_payload' }, { status: 400 });
  }

  const email = emailPraticien(session);
  if (!email) {
    return NextResponse.json({ unavailable: true, reason: 'unauthenticated' }, { status: 401 });
  }

  try {
    // Garde d'appartenance : le patient d'un autre praticien est traité comme
    // introuvable, pas comme interdit — un 403 confirmerait son existence.
    const patient = await prisma.patient.findFirst({
      where: { idPatient, ...filtrePatientsDuPraticien(email) },
    });
    if (!patient) {
      return NextResponse.json({ unavailable: true, reason: 'patient_not_found' }, { status: 404 });
    }

    // Requête scopée réussie = appartenance prouvée : journaliser la lecture.
    await journaliserAccesDossier({ idPatient, praticienEmail: email, route: ROUTE_JOURNAL, methode: 'GET' });

    const reponsesDb = await prisma.questionnaireReponse.findMany({
      where: { idPatient },
      select: { idQuestionnaire: true, dateReponse: true, scoresJson: true, statutValidite: true },
      orderBy: { dateReponse: 'asc' },
    });

    const reponses = construireReponsesParQuestionnaire(reponsesDb);
    const objets = calculerObjetsCliniques(reponses);
    const niveauxPreuve = calculerNiveauxPreuveTousLesBesoins(reponses);

    // Momentum : delta entre la première mesure et le jalon le plus avancé
    // déjà atteint. « T0 » DÉSIGNE ICI LA TOUTE PREMIÈRE MESURE, pas l'ancre
    // d'un cycle (`D-113` §2, site relu) : cette route ne lit aucun épisode,
    // sa référence est `resoudreDateT0`. Même limite reconduite que la route
    // patient — sur un dossier rouvert, le compte part de l'historique, pas du
    // cycle courant.
    const dateT0 = resoudreDateT0(reponsesDb);
    let momentum: ResultatMomentum | null = null;
    let provenanceMomentum: ProvenanceMomentum | null = null;
    if (dateT0) {
      const historique = construireHistoriqueEquilibre(reponsesDb);
      const lectureT0 = resoudreLectureJalon(dateT0, 'T0', historique);
      const jalonsDecroissants: JalonMomentum[] = ['J90', 'J42', 'J21'];
      const dernierJalonAtteint = jalonsDecroissants.find(
        jalon => resoudreLectureJalon(dateT0, jalon, historique) !== null
      );
      const lectureRecente = dernierJalonAtteint
        ? resoudreLectureJalon(dateT0, dernierJalonAtteint, historique)
        : null;
      momentum = calculerDeltaMomentum(lectureT0, lectureRecente);
      // Les deux lectures que le delta a soustraites, à la date de leur jalon,
      // recalculées à la version courante (A8-3 : jamais deux versions).
      if (momentum && lectureT0 && lectureRecente && dernierJalonAtteint) {
        provenanceMomentum = {
          depart: { jalon: 'T0', date: lectureT0.date.toISOString() },
          arrivee: { jalon: dernierJalonAtteint, date: lectureRecente.date.toISOString() },
          versionCalcul: objets.indiceGlobal.versionScore,
        };
      }
    }

    // PROVENANCE DATÉE ([[D-333]] §2 règle 1) : `provenanceDesSources`, la
    // même règle que la route de l'onglet (r3_09).
    const datesRetenues = datesDesReponsesRetenues(reponsesDb);
    const provenanceDe = (
      valeur: number | null,
      sources: SourceQuestionnaire[],
      versionCalcul: string | null
    ): ProvenanceChiffre | null => provenanceDesSources(valeur, sources, reponses, datesRetenues, versionCalcul);
    const versionScore = objets.indiceGlobal.versionScore;

    const couverturesParBesoin = new Map(
      objets.indiceGlobal.strates.flatMap(s => s.besoins).map(b => [b.besoin, b.couverture])
    );

    const contexteMotifs = { ecartes: questionnairesEcartesParValidite(reponsesDb), datesRetenues };

    // Ordre fixe, B1 à B12 par strate — celui de `BESOINS` (Q1, r3_09). Aucun
    // tri sur la valeur : un rang qui juge un chiffre exige un seuil signé
    // ([[D-333]] §2 règle 4), et le tiroir dit qu'aucune priorité n'est déduite.
    const priorites: PrioriteBesoin[] = BESOINS.map(b => ({
      besoin: b.id,
      libellePraticien: b.libellePraticien,
      strate: b.strate,
      couverture: versCent(couverturesParBesoin.get(b.id) ?? null),
      niveauPreuve: niveauxPreuve[b.id],
      motifNonMesure: motifsNonMesureBesoin(b.id, reponses, contexteMotifs),
      ecartDecision: ecartsDecisionBesoin(b.id, reponses, contexteMotifs),
      provenance: provenanceDe(couverturesParBesoin.get(b.id) ?? null, BESOIN_SOURCES[b.id] ?? [], versionScore),
      carteLiee:
        b.id === BESOIN_RESERVE_ADAPTATION ? ('reserveAdaptation' as const) : b.id === BESOIN_CLARTE ? ('clarte' as const) : null,
    }));

    return NextResponse.json({
      patient: { idPatient: patient.idPatient, prenom: patient.prenom, nom: patient.nom, email: patient.email },
      objetsCliniques: {
        indiceGlobal: objets.indiceGlobal.scoreGlobal,
        besoinsMesures: compterBesoinsMesures(objets.indiceGlobal),
        besoinsTotal: BESOINS.length,
        stabiliteMetabolique: versCent(objets.stabiliteMetabolique),
        // Même liste et même fonction que la formule : la présence dite ne
        // peut pas s'écarter de ce que la moyenne a réellement lu.
        stabiliteMetaboliqueSources: SOURCES_STABILITE_METABOLIQUE.map(source => ({
          idQuestionnaire: source.idQuestionnaire,
          presente: calculerCouvertureSource(source, reponses) !== null,
        })),
        reserveAdaptation: versCent(objets.reserveAdaptation),
        clarte: versCent(objets.clarte),
        momentum,
        plafondApplique: objets.indiceGlobal.plafondApplique,
        versionCalcul: versionScore,
        provenance: {
          indiceGlobal: provenanceDe(
            objets.indiceGlobal.scoreGlobal,
            BESOINS.flatMap(b => BESOIN_SOURCES[b.id] ?? []),
            versionScore
          ),
          // La stabilité ne relève pas de `VERSION_SCORE_EQUILIBRE` : sa liste
          // vit dans `objetsCliniques.ts`, hors du registre des versions. Elle
          // ne porte donc aucune version — le dire, plutôt qu'en emprunter une.
          stabiliteMetabolique: provenanceDe(objets.stabiliteMetabolique, SOURCES_STABILITE_METABOLIQUE, null),
          reserveAdaptation: provenanceDe(
            objets.reserveAdaptation,
            BESOIN_SOURCES[BESOIN_RESERVE_ADAPTATION] ?? [],
            versionScore
          ),
          clarte: provenanceDe(objets.clarte, BESOIN_SOURCES[BESOIN_CLARTE] ?? [], versionScore),
          momentum: provenanceMomentum,
        },
      },
      priorites,
    });
  } catch (err) {
    console.error('[equilibre GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ unavailable: true, reason: 'exception' }, { status: 500 });
  }
}
