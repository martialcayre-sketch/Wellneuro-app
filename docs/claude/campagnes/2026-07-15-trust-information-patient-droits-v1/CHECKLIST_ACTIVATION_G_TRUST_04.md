# Checklist d'activation — Gate G-TRUST-04 (sécurité et hébergement)

> Rédigée le 2026-07-20, en clôture de la Vague 2. **Ce document ne lève rien.**
> Il dit, pour chacune des sept exigences du gate, ce qui existe aujourd'hui,
> ce qui manque, et où le vérifier. Le gate reste **non levé**
> (`GATES_GO_NO_GO.md:11`).

## Pourquoi ce document existe

La question posée en Vague 2 était : peut-on faire tester l'application par de
**vraies personnes**, en qualifiant leurs dossiers de « patients de test » ?

La réponse tient en une phrase : **un patient « réel de test » reste une
personne réelle**, et ses réponses à un questionnaire de santé sont des données
de santé dès la première soumission. Le caractère expérimental de l'essai ne
change ni la qualification juridique de la donnée, ni le risque pour la
personne. Les deux invariants du dépôt s'appliquent donc pleinement :

- `REGISTRE_FRONTIERES.md:31` — « **HDS obligatoire avant tout stockage de
  données de santé réelles.** »
- `REGISTRE_FRONTIERES.md:19-20` — « Patients fictifs exclusifs : Sophie Nicola,
  Jennifer Martin, Michel Dogné. **Aucune donnée patient réelle, jamais.** »

Ces deux lignes ne sont pas des précautions d'ingénierie : elles recopient le
droit applicable. En France, héberger des données de santé à caractère personnel
pour le compte d'un tiers impose de recourir à un **hébergeur certifié HDS**.

Le premier point à instruire n'est donc pas applicatif.

## Le point bloquant, à instruire avant tout travail de code

**L'hébergement.** Les données patient vivent aujourd'hui sur **Supabase**
(projet `ohnbmypinamzzfhqymlt`, région `eu-central-1`), l'application sur
**Vercel**. À notre connaissance, **aucun des deux n'est hébergeur certifié
HDS** — cette affirmation doit être **vérifiée auprès des fournisseurs**, pas
supposée, et la réponse consignée ici avec sa date.

Tant que ce point n'est pas tranché, les six autres exigences sont sans effet :
elles peuvent toutes être satisfaites sans que le stockage devienne licite.

Localisation de l'affirmation en production : `web/scripts/vercel-build.sh`
applique `prisma migrate deploy` sur la base Supabase de production au build de
`main` — c'est bien cette base qui reçoit les données.

## Les sept exigences, une par une

| # | Exigence | État | Preuve |
|---|---|---|---|
| 1 | Architecture d'hébergement adaptée | ❌ **Non** | Supabase + Vercel, certification HDS non établie (cf. ci-dessus) |
| 2 | Contrôle d'accès centralisé | ⚠️ **Partiel** | Praticien : NextAuth + OAuth Google restreint à `@wellneuro.fr` (`web/src/lib/auth.ts`). Patient : jeton d'accès **permanent**, pas de compte, pas de révocation en libre-service |
| 3 | Isolation multi-praticien | ⚠️ **Partiel — 13 routes sur 31** | cf. tableau ci-dessous |
| 4 | Gestion des sessions et révocations | ⚠️ **Partiel** | Cookie portail signé, durée bornée ; **le jeton patient ne se périme pas** et sa révocation est une manipulation manuelle en base (`docs/RUNBOOK.md`, « Révocation accès patient »). C'est précisément l'objet du gate **G4 / IDP** |
| 5 | Journalisation | ⚠️ **Partiel** | `web/src/lib/observability/` : logger structuré, codes d'événement, assainissement des données (`sanitizeLogData.ts`), corrélation de requête. Couvre les **erreurs et refus d'accès**, pas les **accès légitimes** : il n'existe pas de piste d'audit « qui a lu quel dossier, quand » |
| 6 | Réponse aux incidents | ⚠️ **Partiel** | `docs/RUNBOOK.md` couvre Vercel/DNS, OAuth, Supabase/Prisma, fuite de secret, révocation d'un accès patient. **Aucune procédure de violation de données** (qualification, délai de notification CNIL, information des personnes) |
| 7 | Tests de sécurité documentés | ⚠️ **Partiel** | Tests d'autorisation par route (`web/src/app/api/**/route.test.ts`), garde structurelle SP-MET, refus d'écriture en lecture passée (SP-TT). **Aucun test d'intrusion, aucune revue de sécurité externe** |

Aucune ligne n'est ✅. Le gate ne peut donc pas être levé par un arbitrage
partiel : c'est un ET, pas un OU.

### Détail de l'exigence 3 — isolation multi-praticien

État au 2026-07-20, sur les 31 routes de `web/src/app/api/praticien/` :

**Gardées** (13) — `boussole`, `cockpit`, `consultations`, `copilote/cloture`,
`copilote/prevol`, `fil`, `ja/activation`, `ja/observations`, `metrics`,
`patients`, `protocoles/diffusion`, `protocoles/versions`, `reperes`,
`trajectoire`.

**Non gardées portant de la donnée patient** (13) — `apercu-patient/reponses`,
`assignations`, `booklet`, `documents`, `equilibre`, `packs/assign`,
`patients-pg`, `protocoles`, `protocoles/checkins`, `reponses`, `synthese`,
`token`, `trust`.

**Non gardées sans objet** (5) — `besoins`, `packs`, `questionnaires`,
`questionnaires/registry` : catalogues et référentiels, sans donnée patient.

Le filtrage est aujourd'hui un **no-op fonctionnel** : les 17 patients de
production appartiennent au même praticien. Il n'en reste pas moins que
l'exigence n'est **pas** satisfaite, et qu'elle le sera d'autant moins vite
qu'un deuxième praticien serait ouvert avant que les 13 routes restantes soient
fermées. L'outillage existe déjà et rend chaque fermeture mécanique :
`web/src/lib/praticien/appartenance.ts` (`filtrePatientsDuPraticien`,
`verifierAppartenancePatient`).

## Ce qui a été livré en Vague 2 et compte pour ce gate

- **Isolation multi-praticien, premières routes** (#156) — le mécanisme et
  13 routes.
- **Refus d'écriture en lecture passée** (#158) — `POST /api/praticien/cockpit`
  refuse tout `asOf` **avant toute lecture** ; la garantie est portée par le
  serveur, pas par l'écran.
- **Journalisation assainie** — `sanitizeLogData.ts` empêche qu'une donnée
  patient parte dans un log.

## Ce qu'il resterait à faire, dans l'ordre

1. **Instruire l'hébergement.** Obtenir des fournisseurs une réponse écrite sur
   la certification HDS. Si négative — l'hypothèse la plus probable —, aucune
   suite applicative n'a de sens sans migration vers un hébergeur certifié.
2. **Fermer les 13 routes restantes.** Mécanique, sans migration, avec
   l'outillage existant.
3. **Livrer G4 / IDP.** Jeton haché, expirant, à consommation unique, rejeu
   refusé et tracé — c'est l'exigence 4, et la campagne IDP porte déjà la
   décision « **livrable en préproduction ; activation avec données réelles =
   décision distincte, aujourd'hui NO-GO** » (`REGISTRE_FRONTIERES.md:619-621`).
4. **Ajouter une piste d'audit des accès légitimes** (exigence 5).
5. **Écrire la procédure de violation de données** (exigence 6) : qualification,
   délai CNIL, information des personnes concernées.
6. **Faire réaliser une revue de sécurité externe** (exigence 7).
7. **Constituer le dossier RGPD de l'expérimentation** : base légale,
   information des participants, DPA signés avec chaque sous-traitant réel
   (Vercel, Supabase, Anthropic, SMTP, Google) — la liste est déjà établie en
   `GATES_GO_NO_GO.md:9`.

## Qui lève ce gate

**Pas l'assistant.** La levée est une décision du responsable du traitement
(`G-TRUST-02` : le praticien), consignée ici avec sa date, ses pièces
justificatives et le périmètre exact de ce qu'elle autorise.

Tant que cette ligne n'est pas écrite, la règle applicable reste celle du
dépôt : **patients fictifs exclusivement**.

## Raccordement

- Gate : `GATES_GO_NO_GO.md:11` (G-TRUST-04, non levé).
- Dette : `DETTE_TRUST.md`, D-TRUST-03.
- Invariants : `docs/claude/REGISTRE_FRONTIERES.md:19-20`, `:31`.
- Campagne dépendante : `2026-07-19-idp-identite-patient-durable` (G4).
