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
| 3 | Isolation multi-praticien | ⚠️ **Partiel — 30 routes sur 33** | cf. tableau ci-dessous |
| 4 | Gestion des sessions et révocations | ⚠️ **Partiel — amélioré le 2026-07-21** | Cookie portail signé, durée bornée. **G4 activé en production** : lien haché en base, 24 h, usage unique, rejeu refusé et tracé. Mais le **jeton permanent subsiste et ne se périme toujours pas** — la coexistence des deux chemins est voulue pendant la bascule. L'exigence reste donc partielle : elle le sera jusqu'à la péremption des liens permanents, décision non prise |
| 5 | Journalisation | ⚠️ **Partiel** | `web/src/lib/observability/` : logger structuré, codes d'événement, assainissement des données (`sanitizeLogData.ts`), corrélation de requête. Couvre les **erreurs et refus d'accès**, pas les **accès légitimes** : il n'existe pas de piste d'audit « qui a lu quel dossier, quand » |
| 6 | Réponse aux incidents | ⚠️ **Partiel** | `docs/RUNBOOK.md` couvre Vercel/DNS, OAuth, Supabase/Prisma, fuite de secret, révocation d'un accès patient. **Aucune procédure de violation de données** (qualification, délai de notification CNIL, information des personnes) |
| 7 | Tests de sécurité documentés | ⚠️ **Partiel** | Tests d'autorisation par route (`web/src/app/api/**/route.test.ts`), garde structurelle SP-MET, refus d'écriture en lecture passée (SP-TT). **Aucun test d'intrusion, aucune revue de sécurité externe** |

Aucune ligne n'est ✅. Le gate ne peut donc pas être levé par un arbitrage
partiel : c'est un ET, pas un OU.

## Mise à jour du 2026-07-21 — état constaté, et ce qu'il ne change pas

### Ce qui est désormais établi de la base de production

Relevé en lecture seule (MCP Supabase, agrégats sans donnée nominative) :
**17 patients, dont 3 graines fictives**, et **13 accès portail ouverts**.
Interrogé sur la qualification des 14 dossiers restants, le responsable a
répondu qu'ils correspondent **au moins en partie à de vraies personnes**, et
que celles-ci **ont donné leur consentement pour une phase de test**.

La question posée en Vague 2 — « peut-on faire tester par de vraies
personnes ? » — n'était donc pas prospective : **c'est déjà le cas**.

### Le consentement recueilli, et sa portée exacte

Le consentement est une **pièce réelle du dossier RGPD** : il documente la base
légale du traitement et l'information des participants, tous deux listés comme
manquants au point 7 de « Ce qu'il resterait à faire ». **À consigner
formellement** ici par le responsable : date, forme, contenu de l'information
délivrée, modalité de retrait.

**Il ne satisfait pas l'exigence 1**, et ce point mérite d'être écrit
explicitement parce que l'intuition inverse est naturelle :

- le **consentement** (RGPD) porte sur la **licéité du traitement** — la
  personne peut y consentir, c'est son droit ;
- la **certification HDS** (CSP, art. L1111-8) porte sur **qui héberge** les
  données et sous quelles garanties. C'est une obligation qui pèse sur le
  responsable et sur l'hébergeur, **pas un droit dont la personne dispose** :
  elle ne peut donc pas y renoncer pour eux.

Nuance qui explique probablement l'intuition : **l'ancienne rédaction de
L1111-8 exigeait effectivement le consentement exprès de la personne pour
l'hébergement par un tiers.** Cette mention a été supprimée lors de la réforme
de 2018 — précisément parce que le consentement n'était pas le bon instrument.

> Ce paragraphe est une **alerte, pas un avis juridique**. Il est rédigé par
> l'assistant, dont la connaissance a une date de coupure et qui n'est pas
> juriste. **À faire confirmer par un conseil qualifié** avant toute décision
> qui s'en réclamerait.

### Exigence 1 : maintenue ouverte

Elle reste ❌. Le consentement n'y change rien, et rien d'autre n'a bougé : la
réponse écrite de Supabase et de Vercel sur leur certification HDS **n'a pas
été demandée**. C'est toujours le premier point à instruire, et il reste
préalable aux six autres.

### Ce que l'activation de G4 fait, et ne fait pas

**G4 a été activé en production le 2026-07-21** (`WN_G4_LIEN_MAGIQUE=true`,
Production seule ; runbook et contrôles dans
`campagnes/2026-07-19-idp-identite-patient-durable/ACTIVATION_RUNBOOK_G4.md`).

- **Ce qu'il fait** : il substitue, pour les personnes déjà en base, un lien
  haché expirant en 24 h et à usage unique au lien permanent stocké en clair.
  C'est une amélioration de l'exigence 4, et elle profite immédiatement aux
  13 accès ouverts.
- **Ce qu'il ne fait pas** : il ne déplace pas une donnée, ne change pas
  l'hébergeur, et **ne régularise rien**. Présenter son activation comme une
  mise en conformité serait faux.
- **Ce qui reste fermé** : le canal public de redemande
  (`WN_G4_REDEMANDE_PATIENT`, non posé), tant que deux résidus de la revue de
  sécurité ne sont pas traités — temps de réponse non égalisé, absence de
  limitation par IP. Sur des adresses de personnes réelles, ces résidus ne sont
  plus théoriques.

### Correction de fait : il n'existe pas de préproduction

Le registre porte pour G4 la mention « livrable en préproduction ». **Aucune
préproduction n'existe** : il n'y a qu'un projet Supabase, et
`web/scripts/vercel-build.sh` ne migre qu'en production. Les déploiements
Preview lisent donc la base de production.

Conséquence pratique, constatée le 2026-07-21 : `WN_G4_LIEN_MAGIQUE` avait été
posée sur **Preview et Production**, ce qui aurait permis d'émettre des liens
vers de vrais dossiers depuis n'importe quelle URL de prévisualisation. Corrigé
le jour même. À garder en tête pour tout drapeau ultérieur.

> Cette section constate, elle ne décide pas. **La levée du gate reste une
> décision du responsable du traitement**, à écrire plus bas avec sa date, ses
> pièces et son périmètre.

### Détail de l'exigence 3 — isolation multi-praticien

État au 2026-07-21, sur les **33** routes de `web/src/app/api/praticien/`.
*Correction* : le compte « 13 sur 31 » ci-dessus datait du 2026-07-20 avant
`main`, était déjà dépassé par #167 (12 routes fermées le jour même) et
comptait deux routes en trop peu — l'audit de conformité 5.0 du 2026-07-20
(E9) avait relevé que `consultations` et `patients` y figuraient à tort parmi
les gardées, et `besoins` à tort en « sans objet ». Les trois ont depuis été
fermées pour de bon (2026-07-21) ; le tableau ci-dessous reflète l'état réel.

**Gardées (30)** — la totalité des routes portant de la donnée patient. Via la
garde factorisée `web/src/lib/praticien/appartenance.ts`
(`filtrePatientsDuPraticien`, `verifierAppartenancePatient`) : `apercu-patient/reponses`,
`assignations`, `besoins`, `booklet`, `cockpit`, `consultations`,
`copilote/cloture`, `copilote/prevol`, `documents`, `equilibre`, `fil`,
`fil/refus`, `metrics`, `packs/assign`, `patients`, `patients-pg`,
`protocoles`, `protocoles/checkins`, `relecture-notes`, `reperes`, `reponses`,
`synthese`, `token`, `trajectoire`, `trust`. Via une vérification inline
équivalente, antérieure à l'extraction de la garde commune : `boussole`,
`ja/activation`, `ja/observations`, `protocoles/diffusion`,
`protocoles/versions`.

**Sans objet (3)** — `packs`, `questionnaires`, `questionnaires/registry` :
catalogues et référentiels globaux, sans `idPatient` ni donnée patient.

Le filtrage reste aujourd'hui un **no-op fonctionnel** : les patients de
production appartiennent tous au même praticien. La fermeture des 33 routes ne
lève pas à elle seule l'exigence 3 : elle n'a pas été éprouvée par un test
d'isolation multi-praticien réel (deux comptes, deux portefeuilles de
patients), et rien ne remplace encore l'absence de contrainte au niveau de la
base (RLS ou équivalent) si la garde applicative était un jour contournée.

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
2. ~~Fermer les routes restantes.~~ Fait le 2026-07-21 (`besoins`,
   `consultations`, `patients`) : les 30 routes portant de la donnée patient
   sont désormais gardées. Reste, pour que l'exigence 3 soit tenue pour
   satisfaite : un test d'isolation multi-praticien réel, et une décision sur
   une contrainte au niveau base.
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
