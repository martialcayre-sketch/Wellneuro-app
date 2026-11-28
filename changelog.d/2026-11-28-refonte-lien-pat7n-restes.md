### Refonte Lien, PAT-7n : restes de PAT-7 au portail patient (2026-11-28)

Le responsable a tranché par écrit, dans la session, le 2026-11-28 : « Q1 B, Q2 B,
Q3 A » (questions `20261127-2225-d` à `-2227-d` de la liste commune).

- **Marge des cartes à 195 px** (zoom 200 % au téléphone, [[D-506]]) : la grande
  marge `p-8` passe à `p-5` sous 320 px CSS (`max-[319px]:p-5`), dans `PatientCard`
  et dans les cartes écrites en ligne de « Mon équilibre ». À 195 px, la colonne de
  texte passe de 97 à 121 px. Rien ne change à partir de 320 px.
- **Vide de « Mon équilibre » (U15)** : le décor passe par `LienDecor`
  (`etat-vide`, `nutrition-sprout`), comme les autres vides du portail
  ([[D-481]] §1 quater). L'ancienne illustration n'est plus posée par le portail.
  Le texte est inchangé.
- **Fiche remise (U29)** : un helper E2E, `provisionFicheRemiseE2E`, remet la fiche
  du banc à un patient de fixture, et à lui seul. `cleanupFicheRemiseE2E` défait la
  remise, puis retire la version validée. Aucun E2E de réception n'est versé et
  aucun drapeau ne change ; l'écran a été vu en local, drapeau allumé pour ce seul
  constat.
- **Mots longs de la fiche remise (U29)** : ce constat a montré que la page
  débordait de 371 px au téléphone et de 554 px à 195 px sur le mot sans espace
  de la fixture. Les précautions et les paragraphes portent désormais
  `[overflow-wrap:anywhere]`, la convention du portail. Le responsable a demandé
  la correction dans ce lot le 2026-11-28.
- Aucun texte d'interface neuf, aucun chiffre côté patient.
