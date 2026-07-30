### Scoring — les trois bornes « inatteignables » l'étaient toutes, par artefact de méthode

Campagne du 2026-07-30, lot bornes — la seule question du dossier #469 qui restait
un travail de code. Verdict, établi par **construction ciblée composante par
composante** et non par saturation : les trois divergences étaient des artefacts.

- **PSQI : 0–21 atteignable en entier.** Le 21 s'obtient par un pire-dormeur réel
  — coucher 20 h, deux heures d'endormissement, lever 11 h, trois heures dormies
  (efficacité 20 %), toutes perturbations au maximum. Le balayage rendait 15 parce
  qu'il saturait les réponses, or l'efficacité vaut 0 quand elle est *bonne* :
  saturer les horaires ne la maximise pas.
- **QIF : maximum réel 99,9, minimum 0.** Le 100 exact manque de 0,1 — le moteur
  multiplie par 3,3 là où la source divise par 3, écart d'arrondi et non bande
  morte : 99,9 relève bien de la bande « maximum théorique ». La saturation
  rendait 89,9 en mettant Q12 à 7 — sept bons jours *déclarés*, zéro point.
- **ECAB : 0 et 10 atteignables.** Le vrai extremum inverse l'item 10 par rapport
  aux autres. Et la note de la veille qui déclarait le plancher « inatteignable,
  établi sans balayage » refaisait l'erreur de saturation en sens inverse — elle
  est retirée, preuve à l'appui.

**Troisième leçon de méthode du même jour** : mon premier essai rendait un QIF à
123/100 — j'injectais 10 sur des items Likert 0–3, hors barème, par l'API qui ne
borne pas. Un extremum construit ne vaut que dans l'échelle des items.

Les constructions sont épinglées dans `bornesAtteignables.guard.test.ts` : si un
remaniement du moteur rendait une borne réellement inatteignable, la bande extrême
de l'instrument deviendrait morte sans que personne ne le voie — c'est le scénario
que le dossier redoutait pour la bande « troubles sévères » du PSQI.

Aucune valeur servie ne change. Critiques : 10 instruments → **8, dont 5
suspendus**. Sur l'échelle ne restent que `Q_ALI_01` (à confronter à #452),
`Q_INF_05` (bloqué à la demande du praticien) et `Q_NEU_06` (suspendre ou
reconstruire — décision praticien).
