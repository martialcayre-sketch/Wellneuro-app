import { prisma } from '@/lib/prisma';
import { BESOINS } from '@/lib/equilibre/constants';
import { construireHistoriqueEquilibre, construireReponsesParQuestionnaire } from '@/lib/equilibre/depuisPrisma';
import { calculerMomentumDuCycle, type MotifAbsenceMomentum } from '@/lib/equilibre/momentumDuCycle';
import { calculerObjetsCliniques } from '@/lib/equilibre/objetsCliniques';
import type { AncreCycle, ResultatMomentum, StrateCode } from '@/lib/equilibre/types';
import { ancreCourante, lireAncresPersistees } from '@/lib/protocol/ancresPersistees';
import { jourZeroDuCycleCourant } from '@/lib/protocol/calendriersPersistes';

// « Mon équilibre » tel que le PATIENT le lit — une seule composition pour les
// deux lecteurs : la route du portail (session patient) et l'aperçu praticien
// (`apercu-patient/equilibre`, dette t07b). Deux copies dériveraient, et
// l'aperçu cesserait de montrer ce que le patient voit.
//
// Données patient-safe uniquement : jamais les niveaux de preuve A/B/C/D
// (réservés praticien, cf. docs/claude/MON_EQUILIBRE_CONTEXTE.md §3). Ne rien
// ajouter ici qui ne soit destiné au patient.
//
// AUCUN CHIFFRE NE TRAVERSE AU PORTAIL ([[D-333]] §2 règle 5, Q10) : ni la
// valeur de chaque point de la trajectoire, ni l'écart du momentum. Le portail
// n'en dessinait rien — la frise ne compte que des points, la tendance se dit
// en mots — mais la réponse les portait. Seuls restent deux nombres, ceux des
// représentations sans valeur du §1 (famille 2) : `indiceGlobal` pour la jauge
// sans chiffre, `couverture` pour les cercles et les paliers dits en mots.
// `frontierePortail.guard.test.ts` tient la liste fermée.
export type BesoinPatient = { id: number; libellePatient: string; strate: StrateCode; couverture: number | null };

export type EquilibrePatient = {
  indiceGlobal: number | null; // 0-100
  momentum: Pick<ResultatMomentum, 'tendance'> | null;
  /** Pourquoi `momentum` est absent ([[D-397]] §2, §4) — un énuméré, aucun nombre. */
  motifMomentum: MotifAbsenceMomentum | null;
  trajectoire: { date: string }[]; // T0 -> J90
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

  // [[D-397]] : LE MÊME MOMENTUM QU'AU COCKPIT ET AU FIL. La référence était
  // la toute première réponse du dossier, comptée sans épisode ni cycle (la
  // limite de `D-113` §2) ; c'est désormais la lecture d'ancre du cycle
  // courant, l'arrivée la dernière remesure, et rien sans jour 0.
  const ancres = await lireAncresPersistees(idPatient);
  const ancre = ancreCourante(ancres);
  const jourZero = ancre ? await jourZeroDuCycleCourant(idPatient, ancres) : null;
  const momentum = calculerMomentumDuCycle({
    reponses: reponsesDb,
    ancre: ancre ? { ancre: ancre.milestone as AncreCycle, date: ancre.confirmedAt } : null,
    jourZero,
  });
  // La frise ne compte que des points (aucune valeur ne traverse) : elle reste
  // l'historique du dossier, que §2 laisse consultable.
  const historique = construireHistoriqueEquilibre(reponsesDb);

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
    momentum: momentum.statut === 'disponible' ? { tendance: momentum.tendance } : null,
    motifMomentum: momentum.statut === 'absent' ? momentum.motif : null,
    trajectoire: historique.map(l => ({ date: l.date.toISOString() })),
    besoins,
  };
}
