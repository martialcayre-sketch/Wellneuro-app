### Refonte Lien, PRA-2 décor : germe sur les états vides réels du portail praticien (2026-11-28)

Lot issu du prototype PRA-2 décor, états vides. Réponse écrite du responsable
le 2026-11-28 (liste commune `20261128-0838-d`) : Q1 A, Q2 « les six du corps ».

- **Pose** : `<LienDecor emplacement="etat-vide" element="nutrition-sprout" />`,
  160 px au plus (`max-w-full`), centré au-dessus de la phrase du vide, sur six
  écrans : le Fil du jour (vide sans alerte de calcul), Patients (tableau vide,
  recherche vide), l'Agenda, les fiches-trajectoires, les Comptes du cabinet,
  Confiance & droits.
- **Sans germe** : les échecs de lecture et les chargements, la recherche sans
  résultat (même phrase), le Fil sous une alerte de calcul ou avec une trace
  lue, les rails du Fil (repliés), les listes pleines. Absent à l'impression.
- **Inchangé** : les phrases des vides, les routes, les gardes. Aucun texte
  neuf, aucun drapeau.
- **Bancs** : Vitest des six composants (pose sur le vide, absence sur l'échec
  et sur la liste pleine) et `e2e/praticien-etats-vides-decor.spec.ts` (un
  germe hors de l'accessibilité, absent à l'impression, sans débordement à
  195 px ; aucun germe sur l'échec ni sur la liste pleine).
