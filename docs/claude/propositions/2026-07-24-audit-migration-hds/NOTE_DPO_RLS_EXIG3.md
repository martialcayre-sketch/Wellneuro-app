# Note au DPO / auditeur HDS — RLS (exig. 3), position proposée

Date : 2026-07-27. Émetteur : responsable Wellneuro. Destinataire : DPO /
auditeur HDS. Objet : faire **confirmer** que la posture de sécurité au niveau
base (Row Level Security) satisfait l'exigence 3 avant de la figer au registre.

Compagnon technique : `ADDENDUM_RLS_EXIG3.md` (état prod vérifié le 2026-07-27).
Décision d'entreprise correspondante : `docs/DECISIONS.md` (D-005, statut
« accepté sous réserve de votre confirmation »).

## Contexte en une phrase

L'application (Next.js + Prisma) est **mono-domaine** : les praticiens
s'authentifient par Google restreint à `@wellneuro.fr`, et l'accès patient est
**médié par le praticien** (aucun compte patient auto-servi, aucun multi-tenant à
cloisonner en base). Il n'y a pas d'API de données ouverte à des tiers.

## État technique constaté en production (lecture seule, 2026-07-27)

Projet PostgreSQL 17 (Supabase, `ohnbmypinamzzfhqymlt`) :

| Mesure | Valeur |
|---|---|
| Tables `public` avec RLS **activée** | 71 |
| Tables avec `FORCE ROW LEVEL SECURITY` | 0 |
| Policies dans le schéma `public` | 0 |
| Propriétaire des tables patient (`patients`, `assignations`, …) | `postgres` |
| Rôle de connexion de l'application (Prisma) | `postgres` (= propriétaire) |

Origine : migration `20260707123710_enable_rls_security`, dont le commentaire
assume le choix (« deny-all par défaut = posture voulue »).

## Ce que cette posture protège — et ce qu'elle ne protège pas

En PostgreSQL, **RLS activée sans policy = deny-all**, mais le **propriétaire de
la table** contourne la RLS tant que `FORCE` n'est pas posé.

- **Neutralisé :** l'**API de données auto-exposée par Supabase** (PostgREST,
  rôles `anon` / `authenticated` / `service`). Une clé anon qui fuiterait ne rend
  **aucune ligne patient**. C'est le vecteur que la RLS Supabase adresse
  réellement, et il est fermé.
- **Non couvert au niveau base :** l'isolation ligne à ligne *au sein de
  l'application*, puisque Prisma se connecte en tant que propriétaire et voit
  tout. Ce cloisonnement est aujourd'hui **applicatif** : résolution du portail
  par l'identité de session (`session.idPatient`, cookie signé — le jeton
  permanent a été retiré, #397), et session praticien restreinte au domaine.

## Position que nous proposons d'inscrire au registre (posture A)

Le deny-all (base) **plus** les gardes applicatifs couvrent l'exigence 3 :

1. le risque « exposition via l'API de données managée » est neutralisé au
   niveau base ;
2. le contexte est mono-domaine, sans multi-tenant à cloisonner en base ;
3. le contrôle d'accès patient est déterministe et testé côté application.

Coût : nul en technique, une justification écrite en conformité. Aucune
régression introduite.

## Question précise que nous vous adressons

> **L'exigence 3 est-elle satisfaite par ce deny-all base + gardes applicatifs,
> pour une application mono-domaine sans API de données ouverte — ou exigez-vous
> une isolation *au niveau base* indépendante du code applicatif (`FORCE ROW
> LEVEL SECURITY` + policies par principal) ?**

## Si votre réponse impose l'isolation base (posture B)

Nous savons la démarrer, mais c'est un **chantier à part entière** — pas un
réglage : rôle applicatif non-propriétaire + `GRANT`, bascule de `DATABASE_URL`,
middleware Prisma posant un `SET LOCAL` d'identité **à chaque requête**, policies
par table cohérentes avec le modèle d'accès réel, et E2E complets. Le risque
principal est la **régression silencieuse** (toute requête non couverte tombe en
deny-all). C'est le seul item de code encore susceptible de peser sur le
calendrier de la dérogation (échéance **2026-10-21**) : si vous l'exigez, il faut
le **décider tôt** pour ouvrir une fenêtre dédiée.

Merci de nous retourner votre lecture. Nous figeons le registre sur cette base.
