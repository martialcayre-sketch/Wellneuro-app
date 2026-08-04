# Handoff — 2026-08-04 — Agenda alimentaire : l'accès portail serveur (L4a)

Écrit sur la branche vivante, avant la PR.

## Git

- Worktree `.claude/worktrees/agenda-ali-l4a`, branche `worktree-agenda-ali-l4a`,
  partie de `main` à `4a8eebc5` (après #559). Commit `30f58938`. PR à ouvrir.
- Hors campagne, sans entrée `.wn/state.json` : troisième lot de la série agenda
  alimentaire, après L1-bis (#554) et L3 (#557), clôturés par #558.
- **Ce fichier a été écrasé une fois** : #556 a été mergée après #557 et a repris le
  créneau unique, si bien que le handoff de L3 n'a jamais atteint `main`. Il reste
  lisible au commit `61e4d928`, et sa substance est dans `SESSION_LOG` et D-009/D-010.

## Objectif atteint

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
- `docs/DECISIONS.md` **D-014** : trois arbitrages et **six réserves**.

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

## La leçon de méthode, revenue une troisième fois

Mes mutations testaient le **retrait** du contrôle, pas son **déplacement**. La
mutation « hors de la boucle » a survécu au premier passage : un banc dont chaque
cas n'instancie qu'**une** entrée ne distingue pas « dans la boucle » de « hors de
la boucle ». Refermée, la variante « **dernière** entrée » a survécu à son tour —
le cas correctif plaçait la faute en seconde et dernière position. Il a fallu un
cas à **trois** entrées, faute au milieu. Un banc vert ne prouve que ce qu'il sait
instancier.

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

## Le handoff déplacé par cette fusion

Ce fichier n’a qu’un créneau. **#560 (LOT-07 — « ce que “certifié” ne dit pas »,
dernier lot de la campagne packs/corpus) a été mergée pendant ce lot**, et son
handoff occupait la place. Il est **conservé, pas effacé** : lisible au commit
`71818caa`, et sa substance est dans `SESSION_LOG` et la décision **D-014**.

Sa mesure à retenir : **43 entrées du registre portent `reference_identifiee`,
deux portent un identifiant.** L’écart est ce que l’étiquette ne dit pas.

C’est la troisième collision sur ce fichier en deux jours (#556 sur #557, puis
celle-ci). Le créneau unique est la cause ; la nommer ici évite de la rejouer.
