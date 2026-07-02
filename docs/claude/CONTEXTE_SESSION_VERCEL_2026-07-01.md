# Contexte session Vercel - 2026-07-01

## Situation

Le probleme principal concernait le domaine de production `app.wellneuro.fr` sur Vercel.
Le site renvoyait `404` avec `x-vercel-error: NOT_FOUND` alors que:

- le deploiement Vercel etait marque `Ready`,
- le domaine `app.wellneuro.fr` etait attache et `verified:true`,
- la configuration domaine Vercel indiquait `misconfigured:false`,
- la DNS Squarespace pointait correctement vers le CNAME Vercel attendu,
- la resolution DNS publique etait correcte.

## Hypothese retenue

Le probleme etait tres probablement un souci de routage ou d'alias Vercel sur le domaine de production, et non un bug applicatif ou un probleme DNS.

> ⚠️ Hypothèse affinée le 2026-07-01 (voir « RÉSOLUTION FINALE » plus bas). Le blocage réel était double : `framework: null` sur le projet Vercel (cause du 404) + domaine ajouté en méthode « nameservers » incompatible avec le DNS Squarespace. Ce n'était ni un bug applicatif, ni un simple incident d'alias.

## Intervention effectuee

1. Verification du code de l'application Next.js dans `web/`.
2. Verification du build de production et du type-check.
3. Audit rapide des fichiers sensibles au flux prod:
   - `web/src/lib/prisma.ts`
   - `web/src/lib/auth.ts`
   - `web/src/app/dashboard/layout.tsx`
   - `web/src/app/api/praticien/assignations/route.ts`
   - `web/src/app/api/patient/questionnaire/route.ts`
   - `web/src/app/api/patient/submit/route.ts`
   - `web/src/app/api/praticien/synthese/route.ts`
4. Conclusion de l'audit: pas de blocage code evident pour expliquer le `404` public.
5. Tentative de passage par le support Vercel via l'assistant Vercel.

## Resultats importants

- Le support Vercel a identifie que le compte est sur le plan `Hobby`.
- Le flux de support a indique qu'un cas dedie n'etait pas accessible pour ce sujet sur ce plan.
- Pour `Routing` et `DNS Configuration`, Vercel renvoyait vers la communaute ou un compte payant.

## Point de vigilance code

Un point de durcissement identifie pendant l'audit:

- `web/src/app/api/praticien/assignations/route.ts` utilise un fallback `http://localhost:3000` si `NEXTAUTH_URL` est absent, ce qui peut generer un lien incorrect en production.

## Etat intermediaire (sequence initiale, avant resolution)

- Le depot n'a pas ete modifie fonctionnellement durant cette sequence.
- Le diagnostic penchait alors vers un incident Vercel de routage/alias plutot qu'un probleme applicatif (hypothèse ensuite affinée, voir RÉSOLUTION FINALE).
- La demande support a ete tentee mais bloquee par les limites du plan actuel.

## RÉSOLUTION FINALE (2026-07-01)

### Cause racine (double)

1. **`framework: null`** sur le projet Vercel `wellneuro-app` — **cause principale du 404**. Sans preset de framework, Vercel ne servait pas la sortie Next.js avec son routage : toutes les routes du domaine renvoyaient `NOT_FOUND` alors que le build réussissait (11 routes générées). Les URLs `*.vercel.app` renvoyaient `302` vers `vercel.com/sso-api` (Deployment Protection), ce qui masquait le vrai comportement du contenu.
2. **Domaine ajouté en méthode « nameservers »** : `wellneuro.fr` attendait `ns1/ns2.vercel-dns.com` alors que les nameservers restent chez Squarespace → zone « not configured properly ». Le CNAME `app` pointait vers une cible interne périmée `67dc2d3745f72a3c.vercel-dns-017.com`.

### Interventions (CLI + API Vercel — aucun fichier applicatif du dépôt modifié)

1. Installé Vercel CLI `54.18.6`, authentifié (compte `martialcayre-5210`), lié le projet `wellneuro-app`.
2. Retiré le domaine en mode nameservers : `vercel domains rm wellneuro.fr`.
3. Réajouté en méthode CNAME : `vercel domains add app.wellneuro.fr wellneuro-app`.
4. **CNAME Squarespace corrigé** : `app CNAME cname.vercel-dns.com` (TTL 300 s) — propagation confirmée via DoH Google + Cloudflare.
5. **Correctif principal** : `framework` du projet passé de `null` à `nextjs` (`PATCH https://api.vercel.com/v9/projects/wellneuro-app`).
6. Redéploiement production → `app.wellneuro.fr` sert enfin l'application (HTTP 200).
7. Détecté un **déploiement obsolète** : scope OAuth `spreadsheets.readonly` en prod alors que `main` (commit `4258bf9`, Lot C3) déclare `…/auth/spreadsheets` (lecture/écriture). Déployé `main` en production (`vercel --prod` depuis la racine, `rootDirectory=web/`) ; secrets protégés par le `.gitignore` racine (`.env`, `.env.*`, `.clasp.json`, données patients).
8. Nettoyage : lien Vercel racine temporaire supprimé, modification `.gitignore` induite par `vercel link` annulée. `git status` revenu à l'état pré-session (aucun changement introduit par l'intervention).

### État final vérifié (prod)

- `https://app.wellneuro.fr/login` → **200** ; `/` → redirige vers `/login` (200).
- Scope OAuth Sheets : **`…/auth/spreadsheets`** (lecture/écriture, Lot C3 opérationnel).
- `redirect_uri` : `https://app.wellneuro.fr/api/auth/callback/google`.
- Gardes non authentifié : `/dashboard` → 307 `/login`, `/api/praticien/*` → 401, `/api/auth/session` → `{}`.
- `ssoProtection: all_except_custom_domains` → domaine public (patients), URLs `*.vercel.app` protégées par SSO.

### Configuration projet Vercel (référence)

- `projectId` : `prj_9sg8HgiCvxQfZiULTnmXIaU5c12k`
- `rootDirectory` : `web/` — `framework` : `nextjs` — `outputDirectory` : `.next`
- Variables d'env prod présentes : `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SHEET_ID`, `ANTHROPIC_API_KEY`, `CLAUDE_MODEL`, `SMTP_URL`.

### Actions manuelles restantes

1. **Google Cloud Console** (voir section dédiée ci-dessous) : vérifier l'URI de redirection et l'origine JavaScript.
2. **Test de connexion navigateur** avec `martialcayre@wellneuro.fr` : re-consentement Google attendu (scope passé de `readonly` à lecture/écriture).

## Action manuelle bloquante - Google Cloud Console

Pour le client OAuth Google du projet `385215216634-...`, verifier dans Google Cloud Console:

- `Authorized redirect URIs` doit contenir exactement:
   - `https://app.wellneuro.fr/api/auth/callback/google`
- `Authorized JavaScript origins` doit contenir exactement:
   - `https://app.wellneuro.fr`

Si ces deux entrees ne sont pas presentes, la connexion Google echouera avec `redirect_uri_mismatch`.
Cette verification ne peut pas etre faite automatiquement depuis le depot: elle doit etre realisee dans la console GCP avec un compte autorise.

## Verification technique effectuee (prod)

Le flux NextAuth en production a ete simule via `/api/auth/csrf` puis `POST /api/auth/signin/google`.
Resultat observe:

- `client_id` envoye: `385215216634-tanfoejfr3anmvccnf4q0u30fp8hjpg6.apps.googleusercontent.com`
- `redirect_uri` envoye: `https://app.wellneuro.fr/api/auth/callback/google`

Conclusion: l'application envoie la bonne URI de callback. L'erreur `redirect_uri_mismatch` indique tres probablement que ce callback n'est pas enregistre (ou pas sur le bon client OAuth) dans Google Cloud Console.
