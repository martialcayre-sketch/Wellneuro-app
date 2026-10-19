import { prisma } from '@/lib/prisma';
import { BESOINS } from '@/lib/equilibre/constants';
import {
  construireHistoriqueEquilibre,
  construireReponsesParQuestionnaire,
  resoudreDateT0,
} from '@/lib/equilibre/depuisPrisma';
import { calculerDeltaMomentum, resoudreLectureJalon } from '@/lib/equilibre/momentum';
import { calculerObjetsCliniques } from '@/lib/equilibre/objetsCliniques';
import type { JalonMomentum, LectureDatee, ResultatMomentum, StrateCode } from '@/lib/equilibre/types';

// « Mon équilibre » tel que le PATIENT le lit — une seule composition pour les
// deux lecteurs : la route du portail (session patient) et l'aperçu praticien
// (`apercu-patient/equilibre`, dette t07b). Deux copies dériveraient, et
// l'aperçu cesserait de montrer ce que le patient voit.
//
// Données patient-safe uniquement : jamais les niveaux de preuve A/B/C/D
// (réservés praticien, cf. docs/claude/MON_EQUILIBRE_CONTEXTE.md §3). Ne rien
// ajouter ici qui ne soit destiné au patient.
export type BesoinPatient = { id: number; libellePatient: string; strate: StrateCode; couverture: number | null };

export type EquilibrePatient = {
  indiceGlobal: number | null; // 0-100
  momentum: ResultatMomentum | null;
  trajectoire: { date: string; valeur: number }[]; // T0 -> J90
  besoins: BesoinPatient[];
};

function versCent(ratio: number | null): number | null {
  return ratio === null ? null : Math.round(ratio * 100);
}

export async function lireEquilibrePatient(idPatient: string): Promise<EquilibrePatient> {
  const reponsesDb = await prisma.questionnaireReponse.findMany({
    where: { idPatient },
    select: { idQuestionnaire: true, dateReponse: true, scoresJson: true, statutValidite: true },
    orderBy: { dateReponse: 'asc' },
  });

  const reponses = construireReponsesParQuestionnaire(reponsesDb);
  const objets = calculerObjetsCliniques(reponses);

  // « T0 » DÉSIGNE ICI LA TOUTE PREMIÈRE MESURE, pas l'ancre d'un cycle
  // (`D-113` §2, site relu). Cette route ne lit AUCUN épisode : sa référence
  // est la première réponse exploitable du dossier (`resoudreDateT0`), et
  // l'offset d'une ancre étant nul, le littéral y nomme le décalage zéro.
  // Limite reconduite telle quelle : sur un dossier rouvert en `T1`, ce
  // momentum reste compté depuis la première mesure de l'historique et non
  // depuis le cycle courant. Le brancher sur les cycles est un changement de
  // lecture patient, pas une conséquence du renommage.
  const dateT0 = resoudreDateT0(reponsesDb);
  let momentum: ResultatMomentum | null = null;
  let historique: LectureDatee[] = [];
  if (dateT0) {
    historique = construireHistoriqueEquilibre(reponsesDb);
    const lectureT0 = resoudreLectureJalon(dateT0, 'T0', historique);
    const jalonsDecroissants: JalonMomentum[] = ['J90', 'J42', 'J21'];
    const dernierJalonAtteint = jalonsDecroissants.find(
      jalon => resoudreLectureJalon(dateT0, jalon, historique) !== null
    );
    const lectureRecente = dernierJalonAtteint
      ? resoudreLectureJalon(dateT0, dernierJalonAtteint, historique)
      : null;
    momentum = calculerDeltaMomentum(lectureT0, lectureRecente);
  }

  const couverturesParBesoin = new Map(
    objets.indiceGlobal.strates.flatMap(s => s.besoins).map(b => [b.besoin, b.couverture])
  );

  const besoins: BesoinPatient[] = BESOINS.map(b => ({
    id: b.id,
    libellePatient: b.libellePatient,
    strate: b.strate,
    couverture: versCent(couverturesParBesoin.get(b.id) ?? null),
  }));

  return {
    indiceGlobal: objets.indiceGlobal.scoreGlobal,
    momentum,
    trajectoire: historique.map(l => ({ date: l.date.toISOString(), valeur: l.valeur })),
    besoins,
  };
}
