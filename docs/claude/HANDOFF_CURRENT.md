# Handoff — 2026-08-03

## Git

- `main` = `2aa0a9ab`, arbre propre, aucun worktree de lot ouvert.
- Quatre PR livrées cette session : **#531** (cadrage de campagne), **#534**
  (LOT-00, registre des interventions), **#536** (LOT-03, correspondance des
  identifiants de packs), plus **#535** / **#537** (journal).
- Aucune PR ouverte, aucun suivi CI en cours.

## Objectif de la campagne

`2026-08-03-packs-moteur-d-intervention-et-corpus-consommable` — rendre le moteur
d'intervention réellement utilisable : une recommandation de pack ou de
questionnaires, reproductible, signée, sourcée sur les fiches NNPP2, et affichée
sur une surface praticien qui l'appelle vraiment.

Chemin critique `LOT-00 → LOT-03 → LOT-05 → LOT-06`. Les deux premiers sont
livrés. LOT-04 et LOT-07 sont parallélisables ; LOT-01 n'attend qu'un geste
praticien.

## Décisions prises, et pourquoi

- **Le cadrage a corrigé trois points de la demande initiale.** La certification
  des questionnaires était close depuis #528 ; le moteur d'orientation existait
  déjà mais avec une table vide et **aucun appelant** ; et l'assouplissement du
  fail-closed visait un blocage mal situé.
- **Le critère de sélection des sources d'intervention est le `documentType`
  déclaré, pas le motif de titre.** Le titre ratait 51 sources sur 99 — dont
  toute la doctrine d'exploration (`WN-SRC-0046/0047/0049/0050/0051/0052`).
  Périmètre retenu : 95 sources, 2002 claims.
- **Option C sur les packs** : `packs.qids` fait foi pour la **composition**, le
  code ne gouverne que l'**identité** (slug canonique, `id_pack`, axe). Le
  praticien reste libre d'éditer un pack de doctrine — assumé, pas subi. Un pack
  qu'il compose n'est jamais une cible d'orientation.
- **La synthèse IA restituera la recommandation, ne la produira jamais.** Une
  recommandation générée par un modèle n'a ni table signée ni `sha256` : six mois
  plus tard, rien ne dirait pourquoi tel pack a été proposé.
- **La porte D-003 ne bouge pas.** Valider 755 claims coûte moins cher
  qu'assouplir le fail-closed, et la voie rapide ne s'appliquerait pas de toute
  façon (50 % de prescriptifs).
- **Retiré à la revue** : le correctif du `niveau` dans `syncPackToRegistry`. Il
  n'atteignait pas les packs existants et aucun code ne lit
  `questionnaire_packs.niveau`.

## Fichiers modifiés

- `docs/claude/corpus/nnpp2_interventions_registry.json` — **créé**, 95 sources
- `scripts/lib/verifier_registre_interventions.{js,test.mjs}` — **créés**, 26 cas
- `web/src/lib/questionnaires-functional.ts` — `idPackBase`, `axeId`, traduction
  bidirectionnelle (`packIdDepuisIdBase`, `idBaseDepuisPackId`)
- `web/src/app/api/praticien/orientation/route.ts` — traduction avant comparaison
- `web/src/lib/consultation/packRegistry.ts` — repli qualifié par cause
- `web/src/app/api/{portail/valider,praticien/packs/assign}/route.ts` —
  journalisation de la dérive réelle seule
- `web/prisma/checkPackRegistryConsistency.ts` — correspondances orphelines
- `web/package.json` — `interventions-check` dans `npm run check`

## Validations exécutées

- T1 `npm run check` : vert — 330 fichiers, 3283 tests.
- T3 `npm run test:worktree` : vert, E2E inclus — 1 min 54.
- **Falsification** : en remettant la comparaison directe, 3 tests rougissent ;
  en mutant le registre (dérive, statut menteur, entrée retirée), les 3 rougissent.
- Revue `wn-reviewer` sur LOT-03 : GO SOUS RÉSERVE, 3 majeurs + 5 mineurs traités.
- CI `verify` lu et vert sur les quatre PR.
- Relecture base après merge : les 8 `packs` intacts, `updated_at` inchangés.

## Problèmes ouverts

- **`.wn/state.json` est faux** : `status: idle`, `active_campaign: null`,
  `last_completed_lot` pointant sur la certification de juillet — alors que
  `CAMPAGNE.md` déclare trois lots livrés et `lot_courant: LOT-04`. La campagne
  n'a jamais été activée (`--activate`). Décision en attente.
- **`prescriptive` de `source_registry.json` est faux sur 52 des 95 sources** :
  640 claims prescriptifs déclarés non prescriptifs, erreur toujours dans le même
  sens. Aucun code ne le lit — piège de triage, pas bug vivant. Ne pas prioriser
  la revue LOT-01 dessus.
- **`estAdministrableParLaRoute` ne vérifie pas `actif`**, contrairement à
  `IDS_ASSIGNABLES` : les instruments à passation praticien sont « administrables »
  au sens de l'orientation. Vérifié en base — aucun ne figure dans les 6 packs de
  doctrine, donc théorique. Arbitrage clinique à rendre.
- **10 des 16 packs de doctrine n'existent pas en base** (`idPackBase: null`). Un
  banc empêche une règle de les citer ; les créer est une décision produit.
- **La validation praticien de la pré-classification des 95 sources reste due** —
  le critère de done du LOT-00 est décoché.
- **Deux promotions proposées, en attente d'accord** : ajouter
  `npm run prisma:generate` en tête de `npm run check` (T1 échoue sur un worktree
  neuf avec des erreurs TypeScript qui ne nomment pas la cause) ; et consigner
  l'option C en **D-009** dans `docs/DECISIONS.md`.

## Prochaine action exacte

**LOT-04 — structuration de l'intake.** Sans dépendance. Poser un schéma
applicatif dans les colonnes `Json` existantes de `Consultation` : motif en
énuméré, anamnèse en drapeaux nommés, parsing tolérant sur les consultations
historiques. **Aucune migration Prisma** — si le besoin apparaît, le lot s'arrête
et le geste fait l'objet d'un lot marqué « confirmation obligatoire ».

Alternative si le praticien est disponible : **LOT-01**, revue des 755 claims en
attente sur les 95 sources du registre (NB11 242, NB05 235, NB06 168, NB12 60,
NB07 50) — de l'ordre de la journée de travail, geste humain dans l'Atelier.

## Interdits encore actifs

- **Ne pas rouvrir le `64/64`** gelé par #528 : le refactor porte sur les packs,
  jamais sur les instruments, leur contenu ou leur scoring.
- **Ne pas assouplir le fail-closed** : un claim non signé, un pack à composition
  inconnue, un instrument suspendu ou verrouillé ne remontent pas.
- **Ne pas laisser un modèle produire une recommandation de pack** — il restitue.
- **Ne pas déclarer un rayon sans appelant dans le même lot** : cinq le sont déjà.
- **Ne pas écrire en base hors migration relue** ; toute migration passe par la
  revue adversariale **et** la vérification production après merge.
- **Ne pas merger sans avoir lu `verify`** — les seuls checks Vercel ne prouvent
  rien.
