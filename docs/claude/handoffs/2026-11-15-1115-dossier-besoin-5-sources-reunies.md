# Handoff — 2026-11-15 — dossier de preuve du besoin 5, étape 3 : sources réunies (D-312, H15), lot de la file B

## Branche et état Git

- Branche `docs/besoin5-dossier-etape3`, créée sur `origin/main` 71efdcb3 (#2142), puis avancée sans commit propre
  par `--ff-only` sur 7353ef1b (#2145). Worktree `.claude/worktrees/b-bp17-cadre`.
- Session concurrente (file B) : `git` et `gh` en direct, pas de `/wn-*`.

## Objectif

Lot `besoin5-dossier-etape3` du carnet (file B), inscrit puis pris : aucun lot `pret` n'était en file. Réunir les
sources selon M1 A, M2 B, M3 A, M4 B et M5 B (`20261114-2305-b` à `2309-b`). Chaque ingestion se fait sur accord
explicite du responsable. Documentation et corpus seulement, sans code.

## Décisions prises

- Boîte B (`D-503`) lue et accusée. #2140 était mergée : branche neuve tirée d'`origin/main`.
- Les numéros WN-SRC ont été relus sur `main` et dans les PR ouvertes avant chaque inscription : `0666` à `0671`.
- Cinq envois, chacun sur un accord distinct, `LOT_062` à `LOT_066` (détail au journal H15, `2026-11-15-01`).
  Relectures demandées par le responsable avant `LOT_062`, `LOT_063` et `LOT_064`, et compléments avant `LOT_065`,
  toutes appliquées avant l'envoi :
  - écart interne de `0397` consigné, verbatim gardé ;
  - précision d'un claim de `0668` ;
  - discordance 1997/2004 laissée non résolue ;
  - pagination et appui des claims de `0669` ;
  - intertitre rétabli dans `0670`.
- Questions versées et tranchées (liste commune, file B, avis de Codex à l'aveugle, code 0) :
  - `20261115-0949-b` : B ;
  - `20261115-1050-b` : A, avec la formulation du responsable, reprise au dossier privé.

  Statut `repondue` ; elles passent à `close` au merge.
- `0575` : la recommandation attend le PDF du responsable, car PMC refuse le téléchargement automatique (refus non
  contourné). D'ici là, ses deux points restent « à vérifier sur le texte », sans claim ni ingestion.

## Fichiers modifiés

- `docs/claude/corpus/source_registry.json` : six notices externes, `WN-SRC-0666` à `0671`.
- `docs/claude/corpus/README.md` : décompte (643, dont 136 externes), plage du besoin 5, état des droits.
- `docs/claude/plan-journal/H15/2026-11-15-01-dossier-besoin-5-sources-reunies.md` (nouveau) : rang 01, aucun autre
  au 2026-11-15 sur `main` ni dans les PR ouvertes.
- `docs/claude/PLAN_WELLNEURO.md` : ligne « dossiers des autres besoins », dernière colonne.
- `changelog.d/2026-11-15-dossier-besoin-5-sources-reunies.md` (nouveau) ; ce handoff.
- Hors dépôt :
  - le dossier privé du besoin 5 : section « Étape 3 », M1 à M5 ;
  - la liste commune, le registre et le carnet (page de la file D) ;
  - le bloc-notes de la session, `b5e3/` : charges `m1` à `m5`, requêtes, sorties, paquets et avis Codex.

## Validations exécutées

- Avant chaque envoi :
  - fidélité des passages au texte source, par une vérification mot pour mot ou par un sac de mots, et contrôle des
    nombres ;
  - validation de la charge par `parseRagIngestPayload` et `parseRagClaimsIngestPayload` ;
  - pré-lecture en lecture seule, qui confirme que rien n'avait été pris : one-off-4136, 8998, 4513, 2344 et 8884.
- Envois et relectures :

  | Lot | Envoi (one-off) | Relecture (one-off) |
  |---|---|---|
  | `LOT_062` | 1717 | 4774 |
  | `LOT_063` | 6676 et 559 | 3279 |
  | `LOT_064` | 9607 et 3646 | 2860 |
  | `LOT_065` | 7550 et 6042 | 3223 |
  | `LOT_066` | 5343 et 8026 | 6405 |

  Chaque relecture a confirmé les passages actifs et les claims en attente annoncés, avec des empreintes identiques.
- Registre : aller-retour JSON identique vérifié à chaque ajout.
- Anti-secrets et T1 complet : résultats donnés dans la PR. Pas de T2 : documentation seule.

## Problèmes ouverts

- `0575` : vérifier, sur le PDF du responsable, le passage sur l'hygiène du sommeil (seule ou associée, niveau de
  consensus) et le seuil du PSQI dans le tableau. Tout envoi demandera son propre accord. Même confirmée, la mention du
  PSQI ne fonde pas la branche thérapeutique de M4.
- Textes intégraux des publications primaires du PSQI et de l'Epworth (dont la grille de référence de l'Epworth,
  E1 B), à joindre aux mêmes notices quand le responsable les fournit. La finalité d'origine de l'Epworth reste à
  vérifier.
- Instrument de mobilité : licence du détenteur à obtenir. Le responsable demandera au détenteur le statut de la
  version française, ses publications de validation et les conditions logicielles. Mobilité « non évaluée » ;
  PRIO-MOB reste écartée.
- Droits « à vérifier » de `0666` à `0670`.
- Carnet : `pris_le` et `tenu_le` du lot ont été écrits à 08:00Z ; l'heure réelle est voisine de 08:32Z.
- Hors de ce dossier, pour J3-12f : rattachement de `R-SOM-01`, alignement de la convergence et des grilles servies.

## Prochaine action exacte

1. CI de la tête (`wn-attendre-ci.mjs`, seul `0` vaut). Revue PR-Agent prouvée, sinon `wn-reviewer` (`D-448`) ; un
   verdict par remarque. Relire la boîte B, puis déclarer « prête @<sha> » sur la PR et au registre.
2. Au merge : `0949-b` et `1050-b` passent à `close`, le lot à `fait`.
3. Suite du besoin 5 : `0575` dès réception du PDF, puis l'étiquetage et les positions.

## Interdits encore actifs

- Aucun texte de claim, aucune valeur, aucune borne, aucun seuil, aucun nom de rubrique au dépôt, ni dans les tests,
  ni dans les messages de commit (`D-251` §4, `D-325` §5).
- Aucune règle, aucun seuil, aucun poids inventés ; aucun seuil tiré de la mémoire de l'assistant.
- Aucun code clinique : `BESOIN_SOURCES`, convergence, grilles servies et nouvel instrument relèvent de décisions
  distinctes, appliquées par J3-12f.
- Aucune ingestion sans accord pour chaque envoi. Étiquetage délégué sur les claims `VALIDE` seulement ; la
  signature ne se délègue pas (`DC-16`).
- Aucune pièce privée dans un paquet de `wn-codex-avis.mjs`. Aucune migration ; pas de `prisma format`. Production lue
  seulement par `scalingo run -d`. L'URL du dossier privé reste hors dépôt. Le refus de PMC ne se contourne pas.
