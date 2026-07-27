# Addendum — RLS (exig. 3) : un arbitrage de périmètre, pas un chantier vierge

Date : 2026-07-27. Complète la section C de `CHECKLIST_FINALISATION.md`, dont
l'item « RLS exig. 3 » laissait entendre un socle à construire. Ce n'en est pas
un : un socle **deny-all** est déjà en place. Ce document sépare **ce qui existe**
de **ce qui reste à décider**, sans écrire de migration — la décision revient au
responsable.

## État constaté en production (lecture `execute_sql`, 2026-07-27)

Projet Supabase `ohnbmypinamzzfhqymlt` (`db.ohnbmypinamzzfhqymlt.supabase.co`,
PostgreSQL 17) :

| Mesure | Valeur |
|---|---|
| Tables `public` avec RLS **activée** | **71** |
| Tables avec `FORCE ROW LEVEL SECURITY` | **0** |
| Policies dans le schéma `public` | **0** |
| Propriétaire de `patients` (et des tables patient) | `postgres` |

Vérifié nommément sur `patients`, `assignations`, `questionnaire_reponses`,
`correspondances_patient` : `rls_enabled=true`, `rls_forced=false`,
`policies=0`. Conforme à la migration d'origine
`20260707123710_enable_rls_security`, dont le commentaire assume le choix :
« Aucune policy n'est créée volontairement : deny-all par défaut = posture
voulue. »

## Ce que cette posture protège — et ne protège pas

En PostgreSQL, **RLS activée sans policy = deny-all**, mais le **propriétaire de
la table** (et un superutilisateur) **contourne** la RLS tant que `FORCE` n'est
pas posé. Concrètement :

- **Protégé :** tout rôle **non-propriétaire** est bloqué en lecture comme en
  écriture. C'est ce qui neutralise l'**API de données auto-exposée par
  Supabase** (PostgREST / rôles `anon` et `authenticated`) : une clé anon qui
  fuite ne rend aucune ligne patient. C'est la vraie valeur du deny-all ici.
- **Non protégé :** l'application se connecte via Prisma **en tant que
  `postgres`** — donc propriétaire — et **voit tout**. Le deny-all n'apporte
  aucune **isolation ligne à ligne au sein de l'application** : rien au niveau
  base n'empêche une requête applicative de lire les lignes d'un autre patient
  si le code applicatif se trompe. Ce garde-là est aujourd'hui **applicatif**
  (résolution par `session.idPatient` côté portail, session Google restreinte
  `@wellneuro.fr` côté praticien), pas base.

## Les deux postures pour l'exig. 3

**A. Statu quo — deny-all documenté (aucun code).**
On acte que le deny-all + les gardes applicatifs couvrent l'exig. 3, et on
l'inscrit au registre comme décision motivée. Coût : nul en technique, une
justification écrite en conformité. Tenable si l'auditeur HDS retient que le
risque visé est l'exposition via l'API de données managée (anon/service),
neutralisée ; et que l'app est mono-domaine (praticiens `@wellneuro.fr`, accès
patient médié par le praticien), sans multi-tenant à cloisonner en base.

**B. Renforcement — `FORCE` + policies par principal.**
Isolation ligne à ligne y compris pour le rôle applicatif. Impose, en cascade :

1. une **connexion applicative sous un rôle non-propriétaire** (aujourd'hui
   `postgres`) — donc un nouveau rôle, ses `GRANT`, et le basculement de
   `DATABASE_URL` ;
2. un **contexte d'exécution par requête** (`SET LOCAL` d'une variable de
   session, ex. l'id praticien/patient) que **chaque** appel Prisma doit poser —
   Prisma ne le fait pas nativement, c'est un middleware à écrire et à ne jamais
   oublier ;
3. des **policies par table** cohérentes avec le modèle d'accès réel (portail
   patient vs dashboard praticien vs jobs de fond) ;
4. un risque de **régression large** : toute requête non couverte par une policy
   tombe en deny-all → panne silencieuse d'un pan de l'app.

C'est un chantier à part entière (migration + refonte de l'accès DB + E2E
complets), sous 🚪 go explicite et protocole renforcé (revue adversariale avant,
`execute_sql` après). Il ne tient pas dans la fenêtre de la dérogation sans le
décider tôt.

## Recommandation

**Poser la question à l'auditeur/DPO avant d'écrire une ligne.** L'exig. 3 ne
dit pas « FORCE + policies » ; elle demande un contrôle d'accès aux données au
niveau approprié. Ici, le vecteur que la RLS Supabase adresse réellement — l'API
de données managée — est **déjà neutralisé** par le deny-all. Si l'audit s'en
satisfait, **posture A** (documenter, inscrire au registre) est proportionnée et
sans risque de régression. Réserver la **posture B** au cas où l'audit exige une
isolation base indépendante du code applicatif — auquel cas la démarrer **tôt**,
c'est le seul item de code encore susceptible de peser sur le calendrier de la
dérogation (2026-10-21).

Décision attendue du responsable : **A** (documenter le deny-all comme suffisant)
ou **B** (lancer le renforcement, avec go et fenêtre dédiée).

## Décision prise — 2026-07-27 : posture A

Le responsable retient la **posture A** : le deny-all déjà en place, complété des
gardes applicatifs, est documenté comme suffisant pour l'exig. 3, **sans code
base**. La décision est inscrite au registre (`docs/DECISIONS.md`, **D-005**) et
**soumise pour confirmation** au DPO/auditeur HDS avant d'être figée — note prête
à envoyer : `NOTE_DPO_RLS_EXIG3.md`.

Réserve explicite : si l'audit exige une isolation **au niveau base** indépendante
du code applicatif, bascule vers la **posture B** (chantier sous 🚪 go explicite +
fenêtre dédiée, protocole renforcé), à démarrer tôt vu l'échéance 2026-10-21.
