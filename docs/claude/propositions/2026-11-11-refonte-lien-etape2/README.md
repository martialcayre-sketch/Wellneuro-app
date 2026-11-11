# Refonte Lien / Empreinte — étape 2 : cadrage révisé et plans de réalisation

- Date : 2026-11-11. Lecture du code sur `origin/main` au commit `ac3f0ead`.
- Objet : l'étape 2 de la contre-lecture
  `Contre_lecture_Wellneuro_6_Refonte_Lien_Empreinte_v2` (§10). Elle traduit
  les réponses écrites du responsable à l'étape 1 en textes d'amendement, en
  cadrage et catalogue révisés et en registre des textes. Elle répond aussi à
  la demande du 2026-11-11 : « une fois que tous les cadrages seront fait,
  rédige deux plans de progression séparés avec artéfact de suivi pour le
  portail praticien et le portail patient que les deux puissent être codés
  par des sessions parallèles ».
- Revue PR-Agent de la PR : six remarques, toutes reprises (textes
  inscrits par DOC-0, X01, identifiants T-nn, U38, AM-7 et AM-8, Q-E2-5).
- Ce dossier ne crée aucun numéro D-xxx, ne signe aucun amendement, ne touche
  ni au code ni aux drapeaux. Rien n'est engagé avant les réponses écrites du
  §4.

## 1. Où en est la refonte

**Réponses de l'étape 1** (`../2026-11-11-refonte-lien-etape1-carte/` §5),
données le 2026-11-11 : `2a 3a 4b 5a 6a 7b 8a 9b`.

| Q | Réponse | Suite |
|---|---|---|
| 2 | (a) rail patient repliable, en mémoire de navigation seulement ; amender D-447 §4 | AM-1 |
| 3 | (a) dès 1 024 px, le rail seul ; « Menu » rend la liste complète quand il est escamoté | AM-2 |
| 4 | (b) vues rapides praticien retirées | AM-3 |
| 5 | (a) une source par rôle ; bancs des destinations, gardes et états actifs gardés | AM-4 |
| 6 | (a) les libellés passent au registre de l'étape 2 | `registre-textes.md` |
| 7 | (b) renvoi à l'entrée sur session absente ou expirée seulement ; « Réessayer » ailleurs | livré, #1978 |
| 8 | (a) trois cas et la reconnexion, à l'écran, patient fictif | fait ; un résidu corrigé par #1979 |
| 9 | (b) défauts d'accessibilité et icônes Lucide de l'artefact corrigés | artefact « Wellneuro Lien — Empreinte », version 4 |

**Lots livrés depuis l'étape 1** : #1973 (fiabilité du suivi et des fiches,
C1, C2, C4 ; mergée), #1978 (session expirée renvoyée à l'entrée), #1979
(« Mon accompagnement » ouvert sur un protocole illisible). Les trois sont
mergés.

## 2. Contenu du dossier

| Fichier | Rôle |
|---|---|
| `amendements.md` | AM-1 à AM-6, et AM-7, AM-8 selon Q-E2-1 et Q-E2-2 : textes d'amendement, « traduit » séparé de « proposé » |
| `cadrage-revise.md` | delta du cadrage v3, section par section |
| `catalogue-revise.md` | les 110 fiches du catalogue v2 : gabarit, navigation cible, lot |
| `registre-textes.md` | textes neufs ou changés (T-nn, numérotation par famille, discontinue), à accepter mot pour mot ; inscrits par DOC-0 une fois acceptés |
| `socle-commun.md` | DOC-0 et COM-0, seuls lots communs ; règles des deux sessions |
| `plan-praticien.md` | plan de l'Observatoire, PRA-1 à PRA-6 |
| `plan-patient.md` | plan du Jardin, PAT-1 à PAT-7 |

## 3. Les deux plans en parallèle

```
réponses §4 ─► DOC-0 ─► COM-0 ─┬─► PRA-1 ─► PRA-3a ─► PRA-2 ─► PRA-4 ─► PRA-3b ─► PRA-5 ─► PRA-6
                               └─► PAT-1 ─► PAT-3 ─► PAT-2 ─► PAT-4 ─► PAT-5 ─► PAT-6 ─► PAT-7
```

- Après COM-0, les deux plans ne partagent aucun fichier. La propriété de
  chaque fichier est listée au §2 de chaque plan. Les deux dossiers mixtes
  (`components/food-observation/`, `components/physio-traitements/`) sont
  partagés fichier par fichier ; leurs deux composants communs vont au socle.
- Un besoin commun après COM-0 passe par un micro-lot `COM-n`, un seul ouvert
  à la fois (`socle-commun.md`).
- Les numéros de décision sont tous pris par DOC-0 : aucune des deux
  sessions n'en prend, et elles ne peuvent donc pas se croiser au registre.
- Le découpage des fichiers vient des imports directs, relus au commit
  `ac3f0ead` ; une session vérifie les imports indirects avant de toucher un
  fichier hors de sa liste.

## 4. Questions au responsable

> **Réponses du 2026-11-11** (« Je valide ce bloc ») : Q-E2-1 à Q-E2-5 en
> option (a) ; AM-1 à AM-7 acceptés tels que rédigés, AM-8 sans objet ; tous
> les textes du registre mot pour mot sauf T-34, refusé. Inscrites par DOC-0
> dans [[D-481]] à [[D-488]] et A5-R3. Prochain lot : COM-0.

Recommandation en option (a). Une option qui contredit une décision le dit.

**Q-E2-1 — Groupes du menu praticien.**
(a) Travail, Bibliothèque, Ateliers, Cabinet (`catalogue-revise.md` §2 ;
textes T-01 à T-04) ; amende [[D-324]] §1, §3 et §4 (texte : AM-7).
(b) Garder La Spirale, Bibliothèque, Réglages ([[D-324]]) ; le catalogue v2
§5.2 (l.164) reste non appliqué.

**Q-E2-2 — Menu du téléphone praticien.**
(a) Garder la barre de trois raccourcis et la feuille « Plus », qui reçoit
les intertitres de groupe ; conforme à [[D-324]] §5.
(b) Remplacer la feuille par un menu complet ouvert depuis l'en-tête
(catalogue v2 l.166) ; amende [[D-324]] §5 (texte : AM-8).

**Q-E2-3 — Déploiement.**
(a) Sans drapeau : la refonte habille des surfaces existantes, elle n'en
crée pas ([[D-288]] §1 vise une surface neuve) ; chaque lot est réversible
par revert de sa PR.
(b) Un drapeau d'affichage pour COM-0 et les lots de shell ; à poser
seulement sur votre demande explicite.

**Q-E2-4 — Prototypes de l'étape 3.**
(a) Un prototype par famille d'écrans (contre-lecture §10, étape 3) avant le
lot qui la réalise ; PRA-1, PAT-1 et COM-0 n'en attendent pas.
(b) Pas de prototype : les lots suivent le catalogue révisé et l'artefact,
version 4 ; les écarts se voient au constat à l'écran de chaque lot.

**Q-E2-5 — « Réessayer » sous « Suivi non reconnu. ».**
Le serveur refuse la lecture du suivi (404, `lib/protocol/portailProtocol.ts:32`) ;
la page montre ce texte et « Réessayer », qui ne peut pas réussir.
(a) Retirer « Réessayer » dans ce seul cas ; le retour « ← Mon parcours »
de la page reste. Suit le motif de la réponse 7 (b) (« Réessayer » pour
les erreurs récupérables), mais va au-delà de sa lettre : à confirmer.
(b) Garder « Réessayer », comme aujourd'hui.

**Acceptations, une par ligne** (oui, non, ou texte corrigé) :

| Objet | Où |
|---|---|
| AM-1 rail patient en trois états | `amendements.md` |
| AM-2 patient dès 1 024 px, le rail seul | idem |
| AM-3 vues rapides praticien retirées | idem |
| AM-4 une déclaration des destinations | idem |
| AM-5 rail praticien escamotable | idem |
| AM-6 / A5-R3 adoption de Lien / Empreinte | idem |
| AM-7 quatre groupes praticien (si Q-E2-1 (a)) | idem |
| AM-8 menu complet au téléphone (si Q-E2-2 (b)) | idem |
| T-01 à T-07, T-10 à T-16, T-21 à T-23, T-30 (a à i), T-31 (a, b), T-32 à T-34 | `registre-textes.md` ; la numérotation saute volontairement entre les familles (praticien 01-16, rail patient 21-23, textes patient 30-34 ; T-16 ajouté par DOC-1) ; récapitulatif par lot au §3 |

## 5. Non vu

- Le cadrage v3, le catalogue v2 et le kit ne sont pas versés au dépôt :
  leurs lignes sont citées sur les fichiers reçus le 2026-11-10.
- Le partage des fichiers repose sur les imports directs ; les imports
  indirects n'ont pas été suivis au-delà des deux dossiers mixtes.
- Aucun prototype, aucun constat à l'écran à cette étape : rien n'a changé
  dans le code.
- WebKit et le confort 112,5 % n'ont pas été vus à l'étape 1 ; ils sont
  portés aux lots PRA-6 et PAT-7.
- T-33 : aucune décision fixant le titre de la page de compréhension n'a été
  trouvée ; à vérifier à l'acceptation.
- Relecture `ui-ux-pro-max` : seules les règles citées à l'étape 1 et dans
  AM-5 (`qr:39`, `qr:245`) ont été relues ; chaque lot fait la sienne.

## 6. Suivi

Deux pages de suivi, une par plan, tenues par la session qui mène le plan :

- praticien : https://claude.ai/artifact/7eak2jrm2wMLjAmYC7VZJz
- patient : https://claude.ai/artifact/V7AVAR7WiyU64pgJxLeG8S

Elles sont privées : seul leur propriétaire les ouvre, tant qu'il ne les
partage pas. Chaque page lit trois collections de sa base : `prealables`,
`lots` (un document par lot, identifiant `PRA-n` ou `PAT-n`) et `journal`.
La session met à jour son lot par l'outil `ArtifactData` (action `update`,
avec `if_version`) à chaque étape :

| Moment | Champs |
|---|---|
| début du lot | `statut: "en_cours"` |
| lot bloqué | `statut: "bloque"`, `note` |
| « prête » déclarée | `statut: "prete"`, `pr`, `sha` |
| merge constaté sur `origin/main` | `statut: "merge"`, `merge_le` (AAAA-MM-JJ) |
| préalable tranché ou mergé | `prealables/<id>` : `statut: "tranche"` ou `"merge"` |
| événement (COM-n, écart) | un document `journal/<AAAA-MM-JJ-nn>` : `date`, `texte` |

La page n'écrit rien : elle se lit en direct. Aucun identifiant de dossier
réel, aucune heure exacte n'y est écrit.
