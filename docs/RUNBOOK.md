# Runbook Wellneuro

> Procédures réutilisables d'exploitation et d'incident.

## Vérification rapide production

1. Accéder à `https://app.wellneuro.fr`
2. Signin praticien avec compte Google `@wellneuro.fr`
3. Vérifier tableau de bord (≥1 patient visible ou message vierge cohérent)
4. Créer ou consulter une assignation de questionnaire
5. Status OK = navigable sans erreur 500

## Déploiement

1. Commits sur branche de feature → PR vers `main`
2. Merge sur `main` → Vercel déclenche auto-build
3. Variables d'environnement production : synchro manuelle via Vercel dashboard
4. Migrations DB : lancer `cd web && npx prisma migrate deploy` avant si schéma modifié
5. Attendre ~5-10 min pour le déploiement

## Contrôle post-déploiement

1. Accéder à `https://app.wellneuro.fr` (freshen cache navigateur)
2. Vérifier logs Vercel : pas d'erreur 500 récente
3. Tester assignation simple sur patient de test fictif
4. Dashboard metrics chargent (pas de 502 temps limité)

## Rollback

1. Identifier commit défaillant
2. `git revert [hash]` ou `git reset --hard [preceding hash]`
3. Push sur `main` → Vercel redéploie
4. Attendre ~5-10 min
5. Exécuter contrôle post-déploiement

## Incident : Vercel / DNS / Configuration

- Voir détail runbook : `docs/claude/CONTEXTE_SESSION_VERCEL_2026-07-01.md`
- Vérifier `vercel.json` (rootDirectory, framework, env vars)
- Vérifier domaine DNS registrar vs Vercel

## Incident : OAuth Google

1. Vérifier `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` dans variables Vercel
2. Vérifier application OAuth Google Console : domaine autorisé `app.wellneuro.fr`
3. Révoquer session test et retester signin frais

## Incident : Supabase ou Prisma

1. Vérifier `DATABASE_URL` valide et accès Supabase
2. `cd web && npx prisma studio` (lecture seule, lancer localement pour vérifier schéma)
3. `cd web && npx prisma generate` (si suspect : régénérer client après modification schéma)
4. Vérifier pas d'erreur `PrismaClientInitializationError` dans logs Vercel

## Suspicion fuite secret

1. Lancer `bash scripts/check_no_secrets.sh` immédiatement
2. Vérifier logs Vercel (pas d'affichage accidentel API key)
3. Si confiré : révoquer tokens/clés compromis dans les services
4. Committer un fix sans changer le secret lui-même

## Révocation accès patient

1. Localiser `Patient.id` dans base Supabase
2. Invalider ou supprimer `Patient.portailToken`
3. Vérifier cookie `wn_portail` expiré côté patient (session terminée)

## Contrôles avant commit

```bash
bash scripts/check_no_secrets.sh
cd web && npm run type-check
```
