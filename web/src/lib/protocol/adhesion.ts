import {
  optionLibelle,
  POINTS_ETAPE,
  resolveActiveCheckin,
  type CheckinRow,
  type PointEtape,
} from './checkinDomain';

// Météo d'adhésion (SP-MET) — domaine PUR, aucune dépendance Prisma.
//
// Signal de PILOTAGE praticien à trois états, dérivé À LA LECTURE des points
// d'étape J7/J14/J21 déjà collectés. Rien n'est persisté : le schéma interdit
// doctrinalement d'en faire un score ou un jalon (`schema.prisma:733-734`,
// arbitrage A1), et aucune migration n'est nécessaire.
//
// Frontière A8-4 : les constats déterministes PAR point d'étape appartiennent à
// C2B ; l'agrégat trois états appartient entièrement à SP-MET. Aucun pré-agrégat
// en C2B, aucun constat par point d'étape ici.
//
// Trois interdits structurants :
//   1. jamais un score, jamais un pourcentage d'observance, jamais un classement ;
//   2. jamais exposé côté patient (praticien seul) ;
//   3. jamais d'interprétation : on rapporte la réponse du patient, on n'en
//      infère pas un motif. Le praticien tire les conclusions.
//
// Abstention honnête : sans point d'étape exploitable, l'état est « indéterminée ».
// Une absence de réponse n'est PAS une preuve d'abandon — elle ne devient jamais
// « interrompue » par défaut.

export type EtatMeteoAdhesion = 'reguliere' | 'fragile' | 'interrompue' | 'indeterminee';

export type MeteoAdhesion = {
  etat: EtatMeteoAdhesion;
  // Faits rapportés verbatim par le patient, jamais une interprétation.
  faitsObserves: string[];
  // Point d'étape et date du check-in cité — toute affirmation est sourcée.
  pointEtapeSource: PointEtape | null;
  dateSource: string | null; // ISO
  // Couverture brute, sans interprétation : 0 à 3 points d'étape renseignés.
  pointsEtapeRenseignes: number;
};

// Table de correspondance EXPLICITE et exhaustive. Une valeur d'adhésion
// inconnue (contrat futur, donnée corrompue) ne devine rien : elle abstient.
const ETAT_PAR_ADHESION: Readonly<Record<string, EtatMeteoAdhesion>> = {
  tous_les_jours: 'reguliere',
  plupart_des_jours: 'reguliere',
  quelques_jours: 'fragile',
  pas_encore: 'interrompue',
};

// Ordre de récence à égalité de `soumisLe` : J21 est plus tardif que J14, etc.
const RANG_POINT_ETAPE: Record<PointEtape, number> = { J7: 0, J14: 1, J21: 2 };

const INDETERMINEE = (pointsEtapeRenseignes: number): MeteoAdhesion => ({
  etat: 'indeterminee',
  faitsObserves: [],
  pointEtapeSource: null,
  dateSource: null,
  pointsEtapeRenseignes,
});

export function deriverMeteoAdhesion(checkins: CheckinRow[]): MeteoAdhesion {
  // Un seul check-in courant par point d'étape (tête de chaîne append-only) :
  // une correction du patient remplace sa réponse, elle ne s'y ajoute pas.
  const actifs = POINTS_ETAPE.map((pointEtape) => resolveActiveCheckin(checkins, pointEtape)).filter(
    (row): row is CheckinRow => row !== null,
  );

  if (actifs.length === 0) return INDETERMINEE(0);

  const plusRecent = [...actifs].sort((gauche, droite) => {
    const ecart = new Date(droite.soumisLe).getTime() - new Date(gauche.soumisLe).getTime();
    if (Number.isFinite(ecart) && ecart !== 0) return ecart;
    return RANG_POINT_ETAPE[droite.pointEtape] - RANG_POINT_ETAPE[gauche.pointEtape];
  })[0];

  const etat = ETAT_PAR_ADHESION[plusRecent.reponses.adhesion];
  if (!etat) return INDETERMINEE(actifs.length);

  const faitsObserves: string[] = [];
  const libelleAdhesion = optionLibelle('adhesion', plusRecent.reponses.adhesion);
  if (libelleAdhesion) faitsObserves.push(`Action principale : « ${libelleAdhesion} »`);

  // La tolérance est rapportée telle quelle quand elle n'est pas « Bien » : elle
  // éclaire la conversation sans modifier l'état — aucune règle ne la pondère.
  if (plusRecent.reponses.tolerance !== 'bien') {
    const libelleTolerance = optionLibelle('tolerance', plusRecent.reponses.tolerance);
    if (libelleTolerance) faitsObserves.push(`Tolérance rapportée : « ${libelleTolerance} »`);
  }

  return {
    etat,
    faitsObserves,
    pointEtapeSource: plusRecent.pointEtape,
    dateSource: plusRecent.soumisLe,
    pointsEtapeRenseignes: actifs.length,
  };
}
