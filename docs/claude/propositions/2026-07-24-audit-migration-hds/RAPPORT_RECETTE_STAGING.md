# Rapport de recette — staging `wellneuro-staging`

Preuve des trois items fonctionnels de `CHECKLIST_FINALISATION.md` §A, sur
données fictives (Sophie Nicola, Jennifer Martin, Michel Dogné). Exécuté le
**2026-08-21**, après pose des drapeaux produit et des secrets sur
`wellneuro-staging` (LOT-02 de la campagne
`2026-08-18-echeance-hds-g-trust-04`).

**Méthode** : connexion Google OAuth réelle faite une fois, à la main, par le
responsable (identifiants jamais vus par l'assistant) dans un navigateur
Playwright dédié ; la session (cookies) a été réutilisée pour dérouler les
parcours en automatisé. Le fichier de session a été supprimé après chaque
usage — il portait aussi les cookies du compte Google réel, pas seulement
ceux de l'app.

## 1. Login praticien réel (OAuth Google)

**✅ Passé**, après correction d'un incident de configuration :

- 1ʳᵉ tentative : `Erreur 401 invalid_client` de Google. Cause : l'URI de
  callback staging (`/api/auth/callback/google`) venait d'être ajoutée côté
  Google Cloud Console, mais `GOOGLE_CLIENT_ID` posé sur Scalingo ne
  correspondait pas au client portant cette URI.
- Correction : `GOOGLE_CLIENT_ID` reposé à l'identique de la production.
- 2ᵉ tentative : toujours `invalid_client` — **aucun redémarrage de conteneur
  depuis 21:46 CEST** ne s'était produit malgré le `env-set` (`scalingo ps`
  affichait des conteneurs plus anciens que la correction). `env-set` ne
  garantit donc pas, ou pas toujours, un redémarrage immédiat visible dans les
  temps observés.
- `scalingo --app wellneuro-staging restart` exécuté explicitement, confirmé
  par les logs (conteneurs relancés à 23:30:04 CEST).
- 3ᵉ tentative : connexion réussie, redirection vers `/dashboard`.

**Leçon pour le runbook** : après toute correction de secret/flag OAuth,
vérifier le redémarrage effectif des conteneurs (logs ou `scalingo ps`) avant
de retester — ne pas supposer que `env-set` l'a déclenché.

## 2. Parcours Fil / fiche patient

**✅ Passé.**

- `GET /api/praticien/patients-pg` → `200`, 3 patients renvoyés : Michel
  Dogné, Jennifer Martin, Sophie Nicola.
- `GET /dashboard/patients/PAT_SEED_01` (Sophie Nicola) → `200`.

## 3. RAG santé

**✅ Passé.**

- `GET /api/internal/rag/health` sans jeton → `401` (`{"error":"Non
  autorisé."}`), pas `503 configured:false` — signal documenté par le runbook
  comme confirmant que `RAG_INTERNAL_SECRET` est posé et de longueur
  suffisante.

## 4. Synthèse IA en SSE sous le routeur 30 s

**⚠️ Partiellement passé** — le critère qui protège du routeur Scalingo est
largement tenu, celui sur la durée totale ne l'est pas.

Trois générations mesurées sur `PAT_SEED_01`, chronométrées de la requête
`POST /api/praticien/synthese` à l'événement SSE terminal (`done`) :

| Essai | Premier octet | Durée totale | Terminal |
|---|---|---|---|
| 1 | 344 ms | 50,6 s | `done` |
| 2 | 77 ms | 53,6 s | `done` |
| 3 | 113 ms | 54,4 s | `done` |

- **Premier octet < 30 s** (le critère qui évite la coupure par le routeur
  30 s de Scalingo) : ✅ tenu très largement, sur les trois essais (77–344 ms).
- **Génération totale 15–40 s** : ❌ non tenu, de façon reproductible (50,6 à
  54,4 s sur 3 essais indépendants — pas un aléa isolé).
- Les trois générations **aboutissent** (`done` reçu, pas d'erreur ni de
  coupure).

**Hypothèse non confirmée** : `CLAUDE_MODEL` / `WN_CLAIMS_CLAUDE_MODEL` sur le
staging ne serait pas aligné sur le modèle épinglé en production (cf.
`RUNBOOK_MIGRATION_SCALINGO.md` §3). Non vérifiable par l'assistant —
`scalingo env` ne sert pas à la vérification de configuration (règle du
runbook). **À vérifier par le responsable.**

## Ce que ce rapport ne couvre pas

- `prisma migrate status` sur conteneur **staging** — non joué ici. La raison
  invoquée à l'époque (« exige un TTY, ni l'assistant ni un script non
  interactif ne peuvent le lancer ») s'est révélée **fausse** le 2026-08-22 :
  `scalingo run -d` lance le one-off en détaché et sa sortie se lit dans
  `logs --filter one-off-N`. Le contrôle formel a été joué ce jour-là sur la
  **prod** (one-off-602 : 56 migrations trouvées, « Database schema is up to
  date! ») ; les logs de postdeploy du 2026-08-21 restent la seule trace côté
  staging.
- `NEXTAUTH_URL` et les variables de modèle n'ont pas été lues (mêmes raisons
  que ci-dessus) ; leur effet a été observé indirectement par le comportement
  (login abouti, génération aboutie).

## Suite

- Si l'écart de durée est confirmé lié au modèle : aligner
  `CLAUDE_MODEL`/`WN_CLAIMS_CLAUDE_MODEL` et remesurer.
- Si l'écart est jugé acceptable en l'état : le documenter comme tel avant de
  cocher le critère de done du LOT-02 — ce rapport ne tranche pas, il
  constate.

**Décision du responsable — 2026-08-22** : l'écart de durée (50,6–54,4 s
contre 15–40 s attendus) est jugé **acceptable en l'état**. Pas d'alignement
de modèle demandé à ce stade. Les quatre items de la recette sont donc tenus
pour passés ; répercuté sur les cases de `CHECKLIST_FINALISATION.md` §A.
