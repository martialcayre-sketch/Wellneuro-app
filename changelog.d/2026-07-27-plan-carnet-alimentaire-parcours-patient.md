### Confrontation d'un audit externe et plan révisé — carnet alimentaire et parcours patient (2026-07-27)

Documentaire seul. Un troisième document d'audit, apporté après les merges #398
et #408, est confronté au dépôt puis converti en plan de développement.
`docs/claude/propositions/2026-07-27-plan-carnet-alimentaire-parcours-patient/`.

**Ce qu'il établit justement, et qui est repris** : `Q_ALI_01` est le risque
clinique résiduel n° 1. Vérifié — il alimente seul le besoin 1
(`constants.ts:89`), le besoin 1 est une fondation critique (`constants.ts:71`)
dont l'effondrement plafonne le score global à 50 (`score.ts:142-152`), et ses
quatre bandes concluent toujours en portant un `protocol:`
(`alimentaire.ts:63-66`) alors que le code déclare lui-même ses seuils
« PROVISOIRES, SOURCE NON CERTIFIÉE ». Un commentaire d'avertissement ne protège
ni le calcul ni la restitution.

**Ce qu'il affirme à tort** :

- La couverture du carnet ne rend **aucun** verdict de suffisance :
  `describeCoverage` (`restitution.ts:41-49`) rend un comptage nu, « sans
  pourcentage-seuil, sans code couleur, sans qualificatif », protégé par un garde
  `assertNeutre`. **Mais le verdict existe ailleurs et il est pire** :
  `PatientFoodObservationPanel.tsx:193` teste `traces.length >= budget` et dit au
  **patient** « Rien à noter aujourd'hui, nous en savons assez » — trois traces
  du même lundi suffisent.
- Sa recommandation de figer des instantanés « à la clôture d'un épisode » vise
  un mécanisme qui n'a jamais tourné : `assessment_episodes` et les quatre tables
  `protocol_*` sont **vides** en production.
- Son horizon mélange apports estimables (fibres, protéines) et dosages
  biologiques (HOMA-IR, homocystéine, statut inflammatoire) — la confusion que le
  prompt v5 vient précisément d'interdire (`anthropic.ts:42`).

**Ce qu'il manque** : le seul défaut vivant du parcours patient — « 4 bilans
jalonnent votre parcours » et « Stable depuis votre dernier bilan » pour un
patient qui en a fait un seul. Et sa piste pour le besoin 3 (brancher l'item
`AL12`, nombre de repas) rejouerait exactement le défaut retiré du besoin 2 : un
item vaguement apparenté pris pour la mesure d'une chronobiologie, doublement
compté puisque `AL12` alimente déjà le besoin 1.

**Désaccord de méthode maintenu** : 14 domaines proposés, dont 8 seraient vides
à la livraison de son propre aveu. Le plan retient la structure proposée
(`statut / confiance / sources / limites / action possible / confirmation
requise`) et la restreint à 6 domaines réellement instrumentés.

**Plan révisé en cinq lots**, ordonnés par dépendances : (1) arrêter trois
affirmations fausses — aucun instrument nouveau requis ; (2) rendre le carnet
réellement partagé ; (3) structurer l'observation par type de journée, seule voie
vers un besoin 3 mesurable ; (4) le profil à six domaines ; (5) calibrage et
validation terrain. Quatre nouvelles questions au praticien.
