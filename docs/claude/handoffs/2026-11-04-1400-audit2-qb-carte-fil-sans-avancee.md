# Handoff — 2026-11-04 — Audit 2, QB : cadrage de la carte du Fil « Sans avancée » (D-440, H07)

## Branche et état Git
- Branche `docs/carte-fil-sans-avancee`, partie d'`origin/main@96601848`, worktree `.claude/worktrees/audit2-parcours` (session concurrente, cycle en git/gh direct).
- Une PR de documentation, squash. **La session ne merge pas** : déclaration « prête @<sha> » à l'intégrateur (essai D-373), avec `question 20261104-1340-d`.

## Objectif
Cadrer, avant tout code, la carte du Fil des dossiers qui n'avancent plus. Périmètre arbitré par le responsable le 2026-11-04 (audit 2, QB, `20261104-1302-g`) : dossiers arrêtés avant le T0, T0 sans diffusion, assignations échues sans réponse.

## Décisions prises
- D-440 (numéro réservé par `wn-reserver-decision.mjs`, après la réponse). Arbitrages du responsable du 2026-11-04, en session :
  - seuil de 30 jours (options 21, 30 et 52 jours, comptes lus pour chacune) ;
  - ligne « Ce qui retient le T0 » ajoutée, par `preconditionsT0PourPatient`, pour les cartes affichées seulement ;
  - règle et textes acceptés tels quels.
- Ancre : le dernier pas du parcours. Une connexion, un agenda, un e-mail ou une lecture ne comptent pas.
- Exclusions : dossier clos ou désactivé, rendez-vous à venir, dossier qui porte déjà une carte de geste présente dans le Fil servi.
- Deux précisions apportées sur la revue PR-Agent (#1852) :
  - la carte du retard compte parmi les cartes de geste, par application du principe accepté « pas deux cartes pour un même dossier », car la page ne la nommait pas ;
  - la clé de la carte est donnée par situation (D-440 §5).
  - Le responsable peut revenir sur la première.
- Écartée : l'ancre « date de l'étape seule », qui signalait 3 dossiers au T0 de plus à 30 jours, alors qu'un pas avait eu lieu depuis. Écartée aussi l'ancre « activité du patient » : un agenda remettait le compteur à zéro, alors que le dossier attend le cabinet.
- Page de cadrage, privée : https://claude.ai/artifact/91MVD917VUdmffGN15dmuw. La liste commune porte `20261104-1340-d`, au statut `repondue`.

## Fichiers modifiés
- `docs/DECISIONS.md` (D-440).
- `docs/claude/plan-journal/H07/2026-11-04-01-delai-decide.md`.
- `changelog.d/2026-11-04-d440-carte-fil-sans-avancee.md`.
- Ce handoff.

## Validations exécutées
- Lecture de production en conteneur détaché (one-off-8081), transaction `READ ONLY`, `REPEATABLE READ`, terminée par `ROLLBACK`. Requête jouée d'abord à blanc sur la base locale. Les résultats sont versés en agrégats, masqués sous cinq dossiers (D-298).
- T1 `npm run check` vert, après `npx prisma generate` : le client n'était pas généré dans le worktree. T2 non joué : ni écran, ni route, ni code touchés.

## Problèmes ouverts
- Le lot de code de la carte (D-440 §8). Il doit proposer la place de la carte dans l'ordre du Fil, et le comportement si l'évaluation des préconditions échoue.
- Le compte « après exclusions » est un maximum : la carte « T0 à consigner », la carte « à générer » et le signal de sécurité n'ont pas été recalculés en SQL.
- D-439 est réservée par une autre session : le trou est toléré par le garde.

## Prochaine action exacte
CI vert, revue de la tête, puis déclaration « prête @<sha> » avec `question 20261104-1340-d`. L'intégrateur merge, puis il passe la ligne à `close`.

## Interdits encore actifs
- Production en lecture seule, par conteneur `scalingo run -d`.
- Aucun identifiant de dossier couplé à des mesures dans le dépôt. Agrégats masqués sous cinq dossiers (D-298).
- Pas de code de la carte avant le lot dédié. Aucun seuil hors D-440.
- Patients fictifs seulement : Sophie Nicola, Jennifer Martin, Michel Dogné.
