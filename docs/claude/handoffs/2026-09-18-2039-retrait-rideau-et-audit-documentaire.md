# Handoff — 2026-09-18 — Retrait de la génération automatique (D-226) et audit de la chaîne documentaire

## État Git

Branche `wn-cloture-rideau-2026-09-18`, partie de `origin/main` à `7496842e`,
vivante, sans PR. Elle ne porte que la clôture : l'entrée `SESSION_LOG` et ce
fragment. **Le lot lui-même est déjà sur `main`** — PR #1185, squash `08dbd586`,
mergée le 2026-09-17 à 21:54:47 UTC. La fenêtre de clôture de cette PR-là a été
ratée ; d'où cette PR de doc séparée, conformément à `wn-finish` et
`wn-handoff`.

Worktree `rideau-retrait`. La branche `main` locale diverge d'`origin`
(behind 12) : ne pas s'en servir comme base, comparer à `origin/main`.

## Objectif en cours

Consigner la séance avant un `/clear`. Le travail de fond est terminé et en
ligne ; il ne reste que la trace.

## Décisions prises

**D-226 — la génération automatique d'un brouillon de synthèse est retirée.**
Six sections au registre. Le motif n'est pas le coût des appels au modèle : la
carte « Synthèse à générer » du Fil se tait dès qu'une synthèse est plus récente
que la dernière lecture du praticien (`lib/fil/cartes.ts:291`), or le brouillon
automatique naissait à la soumission du patient, donc **avant** toute lecture.
L'automatisme éteignait l'invitation qu'il prétendait devancer.

**L'ordre des gestes est l'inverse d'une pose.** Drapeau retiré de la production
d'abord — `env-unset` puis conteneurs recréés à 18:49:15 UTC le 2026-09-17 —,
code ensuite. Pour une extinction c'est le sens sûr.

**Ce qui n'est pas décidé.** Un déclenchement adossé à la lecture confirmée
plutôt qu'à la réception serait une décision distincte : elle n'est pas prise.
Les 8 brouillons déjà produits restent au dossier avec leur marqueur — rien
n'est effacé ni requalifié.

**Audit de la chaîne documentaire.** 28 constats, tous passés en contre-épreuve
adverse : 21 tenus, 7 réfutés — dont deux des miens. Constat central :
`/dashboard/documents` affiche un rendu C3 et envoie le booklet ; le praticien
atteste une relecture sur un document qui n'est pas celui qui part.

## Fichiers modifiés

Sur cette branche, deux fichiers de doc seulement :
`docs/claude/SESSION_LOG.md`, et ce fragment.

Le lot, déjà sur `main` (`08dbd586`) : suppression de
`web/src/lib/synthese/declencheurRideau.ts` et de son banc ; retrait de l'appel
`after()` dans `web/src/app/api/patient/submit/route.ts` et de
`isSyntheseParRideauEnabled` dans `web/src/lib/patient/featureFlag.ts` ; garde
réécrite dans `submit/route.test.ts` ; `docs/DECISIONS.md` (D-226),
`docs/FEATURE_FLAGS.md`, `docs/DOSSIER_RGPD.md`,
`docs/claude/MATRICE_CONSOMMATION.md` (régénérée par script) ;
`changelog.d/2026-09-17-retrait-generation-automatique.md`.

## Validations exécutées

Sur le lot : T1 `npm run check` vert, T2 `npm run test:worktree -- --fast` vert
— **lancé depuis `web/`**, le script n'existe pas ailleurs et la racine rend
254. Deux mutations distinctes ont prouvé que la garde mord sur ses deux
assertions : une réintroduction différée (`after()`) et une écriture synchrone
(`prisma.syntheseIA.create`) la font rougir chacune. Revue Copilot lue avant le
merge ; elle a trouvé quatre constats réels, dont une garde insuffisante.

Sur cette branche de doc : **T1 pas encore lancé.** C'est la prochaine action.

## Problèmes ouverts

**Le plan des dix lots de l'audit ne vit dans aucun fichier du dépôt.** Il
n'existe que dans deux artefacts publiés, dont les URL sont dans la mémoire
persistante de la session (`audit-chaine-documentaire-artefacts`). Sans elles,
« le lot H » ne désigne rien.

**Hors dépôt, de la main du responsable seul :** la rubrique 5 du registre des
traitements porte encore la finalité « l'outil en prépare une quand la matière
est complète », qui n'a plus d'objet.

**Aucune sonde ne constate l'extinction.** Le constat comportemental se lit
après la prochaine réponse de questionnaire ; la requête est dans le fragment de
changelog, attendu `0`.

**Quatre des huit générations automatiques n'ont pas été rejetées** et leur état
n'a pas été relevé dossier par dossier. Tant qu'aucune file de relecture
n'existe (lot G), un brouillon validé mais jamais envoyé reste invisible.

**Deux mécanismes hors de portée quand le répertoire courant quitte le dépôt :**
les skills `/wn-finish` et `/wn-handoff` ne résolvent plus, et l'agent
`wn-reviewer` non plus. Leurs instructions ont été exécutées à la main, et la
relecture de l'entrée faite sans l'agent — dit ici plutôt que passé sous
silence.

**Proposition non écrite, en attente d'accord :** rendre exécutable la règle
« T2 se lance depuis `web/` ». Il n'y a aucun `package.json` à la racine ; les
deux mécanismes possibles sont d'en créer un qui réexpédie, ou un hook. C'est un
choix de structure.

## Prochaine action exacte

1. `npm run check` depuis la racine du worktree, sortie redirigée puis relue.
2. Commit, push, PR `--base main`, attendre le CI, **lire la revue Copilot**,
   merger en squash avec `--subject` explicite.
3. Ensuite seulement : lot H de l'audit — retirer `selectedPatient` des
   dépendances de l'effet de continuité de l'écran Synthèse. ~5 lignes plus un
   banc ; bug déterministe à 100 % sur les trois portes d'entrée qui posent le
   paramètre.

## Interdits actifs

Aucune modification de production sans permission explicite : la levée accordée
le 2026-09-17 ne couvrait que l'`env-unset` et le redémarrage, elle est
consommée. Force-push exclu de l'autorisation git. Aucun nom ni e-mail de
patient réel dans le dépôt. Aucun seed ni E2E contre un dossier réel. Aucun
`schema.prisma` ni migration sans demande explicite. Aucune donnée clinique
patient publiée en artefact.
