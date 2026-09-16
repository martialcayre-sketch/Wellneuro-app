# Handoff — 2026-09-14 — Clôture de la campagne « dossier de travail clinique »

## Branche et état Git

`objectif-priorite-source`, partie d'`origin/main` à `42691bf2`. PR #1100 ouverte,
CI vert sur `1292a0f8`, revue Copilot traitée et branche reprise depuis.

Cinq lots de la campagne sont DÉJÀ mergés et en ligne : `592ec211` (#1086),
`d38dc834` (#1087), `f920c916` (#1089), `86a21536` (#1092) et `42691bf2` (#1098,
`D-183`). Le déploiement de `42691bf2` est constaté par contenance, statut
`success`.

## Objectif

Clore tout ce qui restait en suspens de la campagne ouverte par la note sur le
brouillon de synthèse PAT024 : donner identité et cycle de vie aux éléments du
brouillon, et arbitrer ce qui restait ouvert.

## Ce qui a été livré

- **#1086** — la trace nomme ses passations (`idReponse` dans `donneesEntree`,
  hors prompt).
- **#1087** — `points_a_confirmer` et `questions_entretien` reviennent au
  praticien.
- **#1089** — la priorité d'un axe se choisit, elle ne se présume plus.
- **#1092** — les passations qui fondent un candidat atteignent l'écran.
- **#1098 / `D-183`** — la fenêtre de rappel d'un instrument ne s'énonce plus,
  `synthese-v29` → `synthese-v30`.
- **#1100 / `D-184`** — la phrase de reprise n'affirme que ce qui est constaté.

## Deux mesures de production, et ce qu'elles ont changé

**La fenêtre de rappel.** 55 synthèses, 32 en v29. Sept périodes chiffrables, dont
SIX légitimes : ma requête de départ attrapait six faux positifs pour un vrai. Le
défaut réel était d'une autre nature que celui cherché — une assertion sur la
PORTÉE d'un instrument (« le DASS-21 mesure des états des deux dernières
semaines, le HAD une semaine »), fausse et inversée par rapport à la consigne lue
par le patient, employée pour motiver un refus clinique.

**Le balayage `DC-19`.** Neuf familles de valeurs cliniques. Aucun second défaut
vivant : les doses sont des restitutions du déclaratif patient, les seuils des
restitutions de `interpretation.min/max` (vérifié : `{min:31,max:55}` rendu
« seuil ≥31 », `BANDES_PSQI {min:6}` rendu « seuil > 5 »), et les deux « dans les
normes » sont en `v4` et `v17`, antérieurs au durcissement.

**La règle que ces deux mesures dégagent** : un défaut de ce type naît là où une
propriété clinique EXISTE dans le dépôt mais n'entre pas dans `buildUserMessage`.
La fenêtre de rappel était la seule dans ce cas. C'est cette liste qu'il faudrait
tenir, pas un détecteur de sortie — `DC-09` a déjà montré (`verifierRestitutionOrientation`)
qu'un garde de sortie demande un vocabulaire fermé qui n'existe pas.

## Ce qui reste ouvert, et qui est arbitré mais non livré

- **Signer le classement** (`D-162` §5). Arbitrage rendu le 2026-09-14 : signer,
  périmètre ET ancrage livrés ensemble. `D-182` a signé `orientationRulesV1` et
  `indicationsBiologieV1` ; le classement vit dans `chaineC1.ts` et reste hors
  SHA, comme le commentaire de `priorityRulesV1` le déclare.
- **Le compteur d'ouverture** de « Voir les sources et limites ». Migration
  autorisée d'avance (patron `D-087`, code lecteur en PR distincte).
- **L'entrée rétroactive pour #1089**, mergée sans numéro de décision.
- **L'artefact publié**, à mettre à jour : sa cartographie de l'étape 2 décrit un
  manque que `D-178` a fermé.

## Fenêtre ratée, et elle est dite

**#1098 a été mergée SANS ses artefacts de clôture** — ni `SESSION_LOG`, ni
handoff dans son diff. C'est la « fenêtre ratée » que `/wn-pr` décrit : le squash
l'a fermée. Le présent fragment et l'entrée de journal qui l'accompagne portent
donc la clôture de `D-183` EN PLUS de la leur, ce qui est le rattrapage prévu par
la règle. Le contrôle n'a rien laissé passer : c'est moi qui ne l'avais pas lu.

## Risques

- `D-184` étend un contrat exposé (`ObjectifExpose`, deux clés). Le banc
  `objectifNegocie.guard.test.ts` a rougi à la compilation et exige cette
  décision ; `priorite_source_rang` reste dehors, tenu par une assertion
  négative sur les deux chemins.
- `constaterProvenance` avale ses erreurs de lecture (`catch { return {} }`).
  Le commentaire du schéma affirme « NULL veut dire ses mots, pas on ne sait
  pas » : **c'est faux**, et `D-184` le dit. Aucun écran ne doit déduire une
  paternité d'une absence de marque. Cette inconsistance de commentaire reste à
  corriger dans `schema.prisma`, ce qui demandera une demande explicite.
