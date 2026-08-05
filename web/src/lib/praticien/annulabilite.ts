// Prédicat d'annulabilité d'une assignation (LOT-07, agenda alimentaire).
//
// Partagé entre la route `assignations/annulation` et l'écran `PatientsPanel`
// — c'est justement leur DIVERGENCE qui a produit ce lot : la route refusait
// sur `statutReponses !== 'non_rempli' || statut === 'Complété'`, l'écran sur
// un prédicat en dur légèrement différent, et aucun des deux ne visait ce que
// le commentaire de la route annonçait (une passation CLINIQUE, pas un
// statut). Vivre dans `lib/` empêche qu'un troisième site réinvente une
// troisième version.
//
// Forme POSITIVE (liste blanche des valeurs qui autorisent), pas négative :
// `statutReponses` est un `String` Prisma libre, sans enum ni contrainte en
// base. Une cinquième valeur qu'un futur écrivain introduirait tomberait donc
// hors de la liste blanche et FERMERAIT l'annulation — fail-closed. Un
// prédicat négatif (« sauf ces valeurs-là ») aurait l'effet inverse : une
// valeur inconnue l'ouvrirait par défaut.
//
// `deverrouille` est annulable : c'est un geste de RÉOUVERTURE posé par le
// praticien lui-même (`PATCH /api/praticien/assignations`), qui n'atteste
// aucune passation — au contraire, il existe précisément pour permettre de
// revenir sur une assignation déjà traitée. Rien ne distingue alors une
// assignation déverrouillée d'une assignation neuve du point de vue de ce
// qu'elle contient.
//
// `aPassation` est le fait qui tranche réellement : au moins une
// `QuestionnaireReponse` existe pour cette assignation (lien souple, seule
// attestation fiable d'une soumission — cf. `submit/route.ts`). Asymétrie
// ASSUMÉE : les journées d'`AgendaAlimentaireJour` / `AgendaSommeilNuit` ne
// comptent PAS comme passation. Un agenda de recueil (Q_ALI_09 et proches)
// peut porter vingt journées notées sans qu'aucune `QuestionnaireReponse` ne
// soit créée — noter une journée n'écrit que la table de journées, jamais
// `statutReponses`. Arrêter un recueil en cours est le geste voulu ; la
// persistance des journées est append-only et n'est pas défaite par
// l'annulation — elles restent en base, et le lecteur praticien continue de
// les lister. L'annulation ferme l'assignation, elle n'efface rien.
export function estAnnulable(a: { statut: string; statutReponses: string; aPassation: boolean }): boolean {
  return (
    a.statut !== 'Complété' &&
    (a.statutReponses === 'non_rempli' || a.statutReponses === 'deverrouille') &&
    !a.aPassation
  );
}
