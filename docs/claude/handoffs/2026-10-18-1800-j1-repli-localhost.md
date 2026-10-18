# Handoff — J1-base : plus de repli localhost possible en production

## Branche et état Git

- Branche `j1-repli-localhost`, partie de `origin/main` e6464ae5 (après
  #1553). Worktree `d281-lot3-portail`. Un commit, PR à ouvrir. Deux PR
  avant elle : #1555 (menu), #1556 (minute d'après) ; un merge à la fois.

## Objectif

Dette « repli localhost » (plan, dettes ; source
`HISTORIQUE_CHANTIERS_TECHNIQUES.md:38`) rattachée à J1-base (H43) :
s'assurer qu'aucun lien de courriel ne peut viser `localhost` en production.

## Décisions prises

- Constat Scalingo (noms de variables seuls, aucune valeur lue) :
  `NEXTAUTH_URL` et `WN_DEPLOY_ENV` sont posées en production ; le repli y
  est donc inatteignable aujourd'hui.
- Première version (levée à la fabrication du lien) écartée sur la revue
  `wn-reviewer` : la levée tombait après des écritures validées
  (`file-envoi/envoyer`, `packs/assign`, `assignations`, `token`) et avant la
  trace d'envoi dans `email.ts`.
- Retenu : refus AU DÉMARRAGE, dans `instrumentation.ts`, quand
  `WN_DEPLOY_ENV === 'production'` et `NEXTAUTH_URL` vide : `logger.fatal`
  puis `process.exit(1)` au tour de boucle suivant (patron du handler
  `uncaughtException`). Aucun chemin d'exécution ne change.
- `WN_DEPLOY_ENV` explicite, pas `deploymentEnv()` : celui-ci infère la
  production de `NODE_ENV`, et les E2E tournent sur un build de production.
- Base unique `baseLiensCourriel()` (`lib/portail/urlPublique.ts`) pour les
  trois constructeurs.

## Fichiers modifiés

- `web/src/lib/portail/urlPublique.ts` : `baseLiensCourriel`,
  `baseLiensAbsenteEnProduction`.
- `web/src/instrumentation.ts` : refus au démarrage.
- `web/src/lib/consultation/email.ts`, `web/src/lib/securite/alerteSecuritePraticien.ts` :
  la base unique.
- Bancs : `urlPublique.test.ts` (quatre cas), `instrumentation.test.ts`
  (refus : trace, sortie différée, aucun handler posé ; base posée : rien).
- Plan (H43, ligne de dette), changelog, SESSION_LOG.

## Validations exécutées

- Vitest des suites touchées et des appelants (lien/demande, token,
  emissionLienMagique, email, alerte) : 93/93.
- `wn-reviewer` sur la première version : GO sous réserve (P2-a/b/c), d'où
  la refonte. Seconde passe : GO sous réserve ; P2-1 traité (l'affirmation
  « Scalingo garde la version en service » retirée : `next start` ouvre le
  port avant `register()`, non constaté) ; cas edge ajouté au banc. T3 : voir
  la PR.

## Problèmes ouverts

- Un environnement `staging` sans `NEXTAUTH_URL` écrirait encore des liens
  `localhost` (résidu nommé par la revue ; aucun staging n'existe).
- Si `WN_DEPLOY_ENV` disparaissait de la production, la garde s'éteindrait
  sans bruit (état d'avant ce lot) ; et retirer `NEXTAUTH_URL` y provoque une
  panne franche dont le comportement de bascule Scalingo n'est pas constaté.
- t09 : drapeaux allumés en production, option retenue sans effet — à
  reprendre avec le responsable.

## Prochaine action exacte

Seconde relecture `wn-reviewer`, T3, PR, CI ; merge après #1555 et #1556,
déploiement constaté (le démarrage de production passe par ce code : vérifier
que l'application répond après le déploiement).

## Interdits encore actifs

- Aucune migration ni modification de `schema.prisma` sans accord explicite.
- Aucune décision clinique sans D-xxx et fragment `changelog.d/`.
- Aucune identité réelle dans le dépôt ; production en lecture seule par
  conteneur ; ne jamais lire la valeur d'une variable d'environnement de
  production.
