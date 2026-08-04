# Handoff — 2026-08-04 — Agenda alimentaire : l'accès portail serveur (L4a)

Écrit sur la branche vivante avant la PR, puis **rafraîchi depuis `main` après le
merge** : seules cette section et « Prochaine action exacte » ont changé — le
reste est le handoff d'origine, écrit avant de livrer.

## Git

- Worktree `.claude/worktrees/agenda-ali-l4a`, branche `worktree-agenda-ali-l4a`,
  partie de `main` à `4a8eebc5` (après #559). Commit `30f58938`. PR à ouvrir.
- Hors campagne, sans entrée `.wn/state.json` : troisième lot de la série agenda
  alimentaire, après L1-bis (#554) et L3 (#557), clôturés par #558.
- **Ce fichier a été écrasé une fois** : #556 a été mergée après #557 et a repris le
  créneau unique, si bien que le handoff de L3 n'a jamais atteint `main`. Il reste
  lisible au commit `61e4d928`, et sa substance est dans `SESSION_LOG` et D-009/D-010.

## Les écarts, tranchés

La table `agenda_alimentaire_jours` existait depuis L3 mais **aucune route n'y
menait** : rien ne pouvait être saisi. L4a ouvre l'accès serveur — `authorize` dédié,
route GET/POST, contrat SQL. La surface de saisie et l'aiguillage sont L4b.

## Ce qui est en place

- `web/src/lib/agenda-alimentaire/portail.ts` — `authorizeAgendaAlimentairePortail`,
  **neuf barrières**, `select` explicite (jamais `notes`), type déclaré à la main.
- `web/src/app/api/portail/agenda-alimentaire/route.ts` — GET (frise, journées brutes,
  compteur `illisibles`) et POST (borne de corps, doublon, pré-contrôle d'abstention).
- `web/prisma/checks/agenda_alimentaire_v1.sql` + son étape `ci.yml`.
- `web/src/lib/dateParis.ts` — `dateJourParis` extrait, réexporté par le sommeil.
- `docs/DECISIONS.md` **D-015** : trois arbitrages et **six réserves**.

## Les quatre choses à savoir avant de toucher à ce code

1. **`IDS_SUSPENDUS` se lit depuis le catalogue, jamais depuis `process.env`.** C'est
   la barrière 5, et la plus importante du module. Sans elle, éteindre `WN_AGENDA_ALI`
   referme le catalogue, la bibliothèque, la liste portail et `submit` — mais pas cette
   route : les assignations créées pendant que le drapeau était allumé gardent des URL
   vivantes. Le drapeau cesserait d'être un drapeau dès son premier allumage.
   **Corollaire opérationnel** : `IDS_SUSPENDUS` est un `const` de module calculé à
   l'import. Éteindre le drapeau exige **un redéploiement**, pas seulement un changement
   de variable Vercel.
2. **L'ordre des barrières est une décision.** Un refus qui *nomme un geste* vient après
   tout refus d'état terminal — sauf le retrait de production (barrière 5), qui prime.
   Sinon on envoie le patient vers une route de consentement qui refusera (annulée), ou
   qui **écrira** sur un dossier clos avant qu'on ne referme.
3. **`auth.idPatient`, jamais `body.idPatient`.** `saveJour` ne vérifie pas
   l'appartenance ; c'est la route qui la garantit. Un test l'épingle avec un
   `idPatient` intrus dans le corps.
4. **`boolean | null` ne se teste jamais par `if (x)`, `!x` ou `Boolean(x)`.** `null` et
   `false` y sont indiscernables, et `soirPlusCopieux` n'admet pas l'abstention alors que
   les quatre présences l'admettent. L'écran L4b est exactement le lieu où ce raccourci
   s'écrira.

## Ce que les revues ont corrigé — et ce que ça enseigne

**Trois revues adversariales, trois NO-GO.** Aucune n'était de complaisance :

1. La garde de consentement portait sur `consentementRetraitDate`, **qu'aucun chemin du
   dépôt n'écrit**. Le champ opérant est `Assignation.consentement`, défaut `non_donne`,
   gardé par un écran seul — donc contournable par appel direct. C'est mot pour mot la
   classe que la barrière 5 cite en exemple, manquée deux lignes plus bas.
2. **La passe de correctifs de la revue 1 a introduit deux régressions** : le nom de
   classe d'erreur sortait en `[id]` (règle d'anonymisation des identifiants ≥ 24
   caractères — les quatre classes Prisma y passent), et le refus sur `illisibles`
   verrouillait l'écriture de **tout** l'agenda, dans un état dont aucun geste applicatif
   ne permet de sortir. La justification écrite était fausse : `date_jour` est une
   colonne, la date est récupérable.
3. Deux de mes propres instructions étaient fausses, et le dépôt les a démenties.

**Ne jamais clore sur une passe de correctifs non re-revue.** Et : **quatre `test:worktree`
complets verts n'ont rien vu de tout cela** — ce sont des défauts d'absence ou de sens, il
n'y avait aucune ligne fautive à faire échouer.

## Problèmes ouverts

- **Aucune borne serveur aux 21 jours.** `estDateSaisissable` n'autorise qu'aujourd'hui
  ou la veille, mais rien ne refuse une date au-delà de `dateDebut + 20`. **Question
  produit à trancher avant L4b** : borner au POST (tronque) ou à la clôture (exige un
  geste) ?
- **`WN_AGENDA_ALI` sur les environnements Vercel** — éteint partout, preview compris ?
  Fait du panneau Vercel, invérifiable depuis le dépôt. À contrôler avant merge.
- **Impasse « date limite dépassée × consentement absent »** — inatteignable drapeau
  éteint (la barrière 5 mord avant). Le correctif est bon marché : un paramètre d'option
  porté par le seul POST. À reprendre en L4b, avec l'exemption `deverrouille` côté
  consentement, qui manque là-bas.
- **La frise se ré-ancre en silence** si la ligne en quarantaine est la plus ancienne.
  Sans écran, sans effet aujourd'hui.
- **Dette assumée et nommée** : `patient/submit` et l'agenda du sommeil ne vérifient ni
  le consentement ni la clôture de suivi. On ne recopie pas un défaut connu dans du code
  neuf ; on ne le corrige pas non plus hors périmètre.
- **Promotion examinée, non retenue** : `scripts/wn-campaign-audit.mjs` est bloquant en
  CI et absent de `npm run check` (constaté sur #559). Même classe que le lint avant le
  2026-07-21. Le rendre exécutable élargirait une PR d'authentification — à faire dans un
  lot d'outillage.

## La leçon de méthode

**Trois fois, un chiffre supposé a failli devenir un fait.** « 5 items sur 20 » et
« 13 sur 20 » venaient de comptes que je n'avais pas lus — les instruments en
comptaient exactement 5 et 13, tout était complet. Puis deux sous-agents se sont
contredits sur le nombre d'instruments `sum` (26/25 contre 25/24) ; seul le
catalogue **résolu à l'exécution** a tranché — 26 drapeau éteint, 25 allumé. Un
compte obtenu au grep n'est pas un compte : il attrape les `parts` d'un moteur
composite et ignore la résolution des drapeaux.

Et la revue adversariale a démoli trois affirmations que le code écrivait sur
lui-même, dont une **qui sous-estimait le lot**. Un commentaire faux dans un
fichier de logique clinique ne survit pas au premier lecteur qui vérifie.

## Prochaine action exacte

Ouvrir la PR, puis `node scripts/wn-attendre-ci.mjs <N>` — **code `0` exigé**, et vérifier
que `verify` a réellement tourné. Ensuite **L4b** : aiguillage dans
`portail/[token]/questionnaires/[idAssignation]/page.tsx` (le littéral `Q_SOM_09` y est
en dur, ligne 123), **hub patient** (`api/portail/assignations/route.ts:151` et
`lib/portail/hubQuestionnaires.ts` — sans quoi une assignation `Q_ALI_09` apparaît comme
un questionnaire ordinaire et mène à une impasse en 409), surface de saisie
(< 30 s/jour, rien de pré-coché) et E2E.

## Interdits encore actifs

- Aucune migration : la table est livrée. `prisma/checks/` n'en est pas une.
- Ne pas allumer `WN_AGENDA_ALI` : le hub et l'aiguillage manquent, l'assignation mène
  aujourd'hui à une impasse.
- Ne pas merger sur les seuls checks Vercel : `verify` absent **bloque**, et
  `enforce_admins` est actif.
- Ne pas corriger le consentement ni la clôture côté sommeil dans ce lot.

## Les handoffs déplacés par ces fusions

Ce fichier n’a qu’**un créneau**, et `main` a bougé **deux fois** pendant ce lot.
Les deux handoffs déplacés sont **conservés, pas effacés** :

- **#560 — LOT-07, « ce que “certifié” ne dit pas »** (dernier lot de la campagne
  packs/corpus). Lisible au commit `71818caa` ; sa décision est **D-013**. Sa mesure
  à retenir : *43 entrées du registre portent `reference_identifiee`, deux portent un
  identifiant* — l’écart est ce que l’étiquette ne dit pas.
- **#561 — « Les écarts du LOT-07 tranchés, et le défaut trouvé dessous »**. Lisible
  au commit `74f1ee49` ; sa décision est **D-014** — *une bande d’interprétation ne se
  lit que sur l’instrument complet*.

La substance des deux est dans `SESSION_LOG`, où les entrées ont été **fusionnées et
non arbitrées**, et dans leurs décisions respectives.

**C’est la quatrième collision sur ce fichier en deux jours** (#556 sur #557, puis ces
deux-ci). Le créneau unique en est la cause. `SESSION_LOG` et `changelog.d/` ne la
connaissent pas : le premier est append-only, le second a un fichier par lot. Un
handoff par lot — `docs/claude/handoffs/AAAA-MM-JJ-slug.md` plus un pointeur — coûterait
une PR et fermerait la classe. **Piste à instruire, pas encore décidée.**
