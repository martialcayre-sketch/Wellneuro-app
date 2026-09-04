# Handoff — 2026-09-04 — Incident mémoire, décommissionnement D-080, écrans d'échec

## État Git

`origin/main` à jour, aucune branche de cette session en attente. Sept PR
mergées et déployées : #820 (timeout login), #821 (D-120/D-121), #822 (trust
v3), #823 (nettoyage Vercel/Supabase), #824 (build), #826 (engines.node), #827
(endpoints Google) + #829 (verrou), #839 (journal), #844 (login non muet), #849
(issue patient), #853 (404 racine). La #838 (migration biologie D-122) reste
**ouverte et verte** : elle appartient à son chantier, décision de l'utilisateur
confirmée deux fois.

## Objectif

Sortir de l'incident de production du 2026-08-31 (login praticien impossible),
exécuter le décommissionnement `D-080` arrivé à terme, puis fermer les écrans
qui laissaient un utilisateur sans issue.

## Décisions prises

- **Cause de l'incident** : famine mémoire sur conteneurs S, pas le réseau —
  établi par le dépassement du minuteur local (×6,7) et la comparaison staging.
  Remédiation : 2×M, `NODE_OPTIONS=--max-old-space-size=384`, alerte mémoire
  85 %, staging en veille.
- **`NODE_OPTIONS` est hérité par le conteneur de build** : quatre déploiements
  en `build-error` OOM. `web/scripts/build.sh` fait `unset NODE_OPTIONS` — le
  plafond ne vaut qu'au runtime. Le déploiement du commit portant le correctif
  se répare lui-même.
- **Décommissionnement exécuté** avec preuves au registre RGPD (rubrique 12),
  annexe HDS signée le 2026-08-30 (`D-121`), `G-TRUST-04` clos.
- **Endpoints Google épinglés**, découverte OIDC supprimée : deux appels réseau
  de moins par connexion. PKCE était déjà actif — constaté, pas ajouté.
- **`jwks_uri` n'est PAS le nom de l'option next-auth** : une revue automatique
  a « standardisé » `jwks_endpoint` en `jwks_uri` sur la #827, ce qui prive
  l'Issuer de son JWKS. Reverté, puis verrouillé par banc lisant la source
  installée (#829).
- **Aucun sous-traitant n'est nommé dans un écran d'erreur** : inutile au
  patient, et renseignant pour qui sonde le service. La transparence a son lieu,
  le document de confidentialité du registre TRUST.
- **Le recours de redemande de lien est servi à tout le monde à l'identique** —
  c'est ce qui le rend compatible avec l'indifférenciation anti-énumération au
  lieu de la trouer.
- **Le 404 racine offre deux entrées nommées**, jamais un bouton « accueil » :
  `/` redirige selon la session et enverrait un patient vers la connexion
  praticien.

## Validations exécutées

T3 sur les lots sensibles (auth, portail), T2 ailleurs, `verify` vert sur chaque
PR avant merge, et vérification en production après déploiement (login,
`/portail/…` erroné, `/adresse-inexistante` → 404 français).

Deux revues adversariales `wn-reviewer` : lot endpoints Google (GO avec
réserves, trois pins ajoutés) et lot portail (GO avec réserves, quatre
corrections dont le `not-found.tsx` manquant et `reset()` sans effet).

## Problèmes ouverts

1. **Rapporteur d'erreurs non câblé.** `@sentry/nextjs` est en dépendance et
   ses trois fichiers de configuration existent, mais `next.config.mjs`
   n'appelle pas `withSentryConfig` et aucun `instrumentation.ts` n'existe.
   Conséquence directe : l'écran d'échec du portail s'affiche pour un patient
   sans que personne ne soit prévenu, et une erreur **client** ne porte pas de
   `digest` — la ligne « Référence » n'apparaît pas et aucune trace n'existe.
2. **Faux succès symétrique côté praticien.** Sur panne SMTP,
   `api/praticien/token` renvoie `success:true` et `PatientsPanel` affiche
   « lien envoyé » **en jetant `json.lien`** que la route retourne pourtant. Le
   patient est renvoyé vers son praticien, qui refait le geste et reçoit le même
   faux succès. Correctif à portée : afficher ou copier ce lien.
3. **`web/changelog.d/` est un cimetière.** Dix fragments, dont trois du
   2026-09-03, que `scripts/changelog-collate.mjs` ne lira jamais — il ne lit
   que la racine. À rapatrier ou supprimer, après vérification de leur contenu.
4. **Surveillance externe absente.** Les alertes Scalingo (mémoire 85 %,
   `p95_response_time` ≥ 5000 pour 5 min) sont armées, mais internes : si
   l'hébergeur tombe, elles tombent avec. Le monitor externe et la page d'état
   restent à créer — geste utilisateur, un jeton API dans `~/.betterstack-token`
   suffit à me laisser faire le reste. Vérifier au passage l'unité affichée du
   seuil p95 (posé en millisecondes).
5. **Pas d'écran d'échec praticien.** Aucun `app/dashboard/error.tsx` : une
   panne de rendu du cockpit tombe encore sur `global-error.tsx`, hors charte.
6. **Node 22 (CI, postes) contre 24 (production).** `engines.node` est épinglé
   à `"22.x || 24.x"`, ce qui stoppe la dérive mais ne tranche pas l'écart.
7. **Lexique interdit E2E vs buildId aléatoire** : `textContent()` inclut les
   scripts RSC, un mot interdit peut sortir du buildId. Correctif durable
   (`innerText()`) toujours non posé.

## Prochaine action exacte

Créer le monitor Better Stack sur `https://app.wellneuro.fr/login` (200 attendu,
25 s de délai, alerte après deux échecs), activer sa page d'état, puis placer son
adresse dans l'e-mail du lien magique — c'est ce qui la rend atteignable le jour
où l'application ne répond plus.

## Interdits encore actifs

Aucune identité patient réelle dans le dépôt ; lecture de la base de production
par conteneur `scalingo run -d` uniquement ; écriture par migration relue puis
`release-db` approuvée ; jamais de valeur de variable d'environnement affichée ;
la #838 appartient au chantier D-122.
