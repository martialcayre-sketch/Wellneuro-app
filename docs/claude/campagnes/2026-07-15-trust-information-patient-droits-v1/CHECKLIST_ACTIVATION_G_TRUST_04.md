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
| 1 | Architecture d'hébergement adaptée | ❌ **Non — établi le 2026-07-21** | Supabase et Vercel **absents de l'annuaire ANS des hébergeurs certifiés HDS**. Écart assumé par décision datée du responsable (voir plus bas) |
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

> **Dépassé le 2026-07-21** par la section « Instruction de l'hébergement »
> ci-dessous. Le paragraphe est conservé tel quel : il date l'état de la
> connaissance au moment où il a été écrit.

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

## Instruction de l'hébergement — établie le 2026-07-21

Le point 1 de la liste ci-dessus est **instruit**. Il ne dit plus « non
vérifié » : il dit « vérifié, et négatif ».

### Ce qui est établi

- **Ni Supabase ni Vercel ne figurent à l'annuaire des hébergeurs certifiés
  HDS** publié par l'Agence du Numérique en Santé, qui recense 404 hébergeurs.
  L'absence de deux acteurs de cette taille n'est pas une lacune documentaire.
- **Supabase n'a jamais répondu.** La question — prévoyez-vous une
  certification HDS pour la France ? — lui a été posée publiquement le
  2024-11-29 (discussion GitHub 30734), relancée par cinq utilisateurs
  jusqu'en février 2026, dont un demandant « une réponse claire sur ce point
  crucial ». La discussion est toujours marquée **non répondue**. La
  documentation santé de Supabase ne traite que du HIPAA américain.
- **Vercel est certifié SOC 2 Type II, ISO 27001:2022, HIPAA et PCI DSS** — et
  pas HDS. Ce sont des cadres réels ; aucun ne se substitue à une certification
  exigée par le code de la santé publique français.
- **Le référentiel HDS v2.0 est pleinement en vigueur depuis le 2026-05-16**,
  avec une exigence de souveraineté restreignant le stockage au territoire de
  l'EEE. Le projet Supabase est en `eu-central-1` (Francfort), donc dans l'EEE :
  cela règle la localisation, **pas** la certification, qui est distincte.
- **Il existe des équivalents certifiés.** Scalingo (certificat 38436, LNE,
  valable jusqu'au 2028-09-11) et Clever Cloud sont certifiés **sur les six
  activités** en référentiel v2.0, avec PaaS *et* PostgreSQL managé sous le même
  certificat, datacenters en France. Une migration réunirait donc chez un seul
  hébergeur certifié ce qui est aujourd'hui réparti entre deux qui ne le sont
  pas.

### Coût technique d'un déplacement, mesuré le 2026-07-21

Inventaire du dépôt : **aucune dépendance bloquante à Vercel**. Pas de
`vercel.json`, pas de `@vercel/*`, pas d'Edge Runtime, pas de middleware, pas de
Cron, pas d'ISR, pas de `next/image`. Les variables `VERCEL_*` lues dans le code
ont toutes un repli déjà écrit. Aucun SDK `@supabase/*` au runtime : Supabase ne
sert que de PostgreSQL managé, et Prisma parle à n'importe quel PostgreSQL.

Restent : le script de build à renommer et sa condition `VERCEL_ENV` à remplacer,
`prisma migrate deploy` à déplacer du build vers un hook de post-déploiement, une
dizaine de variables à reporter, l'URI de redirection OAuth à ajouter, et
`max: 1` dans `web/src/lib/prisma.ts` à relever (dimensionné pour le serverless).
**Le poste lourd n'est pas le code : c'est le transfert de la base et la fenêtre
de bascule**, sur des dossiers de personnes réelles.

À traiter au passage : `web/src/lib/postgres.ts` renvoie
`rejectUnauthorized: false` pour tout hôte non local — contournement du
certificat Supabase qui annulerait une partie du bénéfice s'il était conservé.

> Ces constats sont **factuels et sourcés**, mais rédigés par l'assistant, qui
> n'est pas juriste. La qualification de la situation et les suites à donner
> relèvent d'un conseil qualifié ou d'un DPO.

## Décision du responsable du traitement — 2026-07-21

**Décision rendue** par le responsable du traitement (`G-TRUST-02` : le
praticien, `martialcayre@wellneuro.fr`), en connaissance des constats ci-dessus,
qui lui ont été présentés le jour même.

### Ce qui est autorisé

Une **phase de test avec des personnes réelles**, incluant l'**enregistrement de
nouveaux dossiers**. Motifs invoqués par le responsable : le caractère
pré-opérationnel de la phase, l'**information des participants** — qui savent que
l'hébergement n'est pas certifié HDS — et la **gratuité** du service.

**Date de revue : 2026-10-21.** À cette échéance, soit l'hébergement a été
déplacé, soit la décision est **reconduite explicitement**, datée et signée ici.
Sans reconduction écrite, la règle du dépôt reprend : patients fictifs seuls.

### Ce que cette décision n'est pas

Elle est un **écart assumé, borné et daté** — pas une mise en conformité. La
distinction n'est pas rhétorique, elle est ce qui la rend défendable : elle
établit que le responsable savait, qu'il a borné, et depuis quand.

En particulier, et il faut l'écrire parce que les deux arguments avancés sont
naturels :

- **La gratuité n'exonère pas.** L'article L1111-8 s'attache à l'hébergement de
  données de santé pour une finalité de soin ou de suivi. Il ne comporte pas de
  seuil de chiffre d'affaires ni d'exception pour service gratuit.
- **L'information des participants ne décharge pas.** Elle est nécessaire au
  RGPD — transparence, loyauté — et elle est à son crédit. Mais l'obligation de
  recourir à un hébergeur certifié pèse sur le responsable et l'hébergeur ; ce
  n'est pas un droit dont la personne dispose, donc pas un droit auquel elle
  puisse renoncer pour eux. C'est le même raisonnement que pour le consentement,
  développé plus haut.

Cette décision **ne lève pas** les exigences 2 à 7, qui restent partielles et
suivies dans ce document. Elle ne vaut pas non plus validation juridique : la
dette « revue juridique / DPO externe » (`DETTE_TRUST.md`) reste ouverte, et son
règlement est le premier point qui pourrait invalider ou confirmer ce qui
précède.

### Ce que l'assistant recommande d'y attacher — à confirmer par le responsable

Ces points ne sont **pas** des décisions rendues : ils sont proposés, et
n'engagent rien tant que le responsable ne les a pas écrits ici.

1. **Tracer l'information délivrée** : date, forme et contenu exact de ce qui a
   été dit aux participants sur l'hébergement, ainsi que la modalité de retrait.
   Aujourd'hui cette information existe, mais n'est **consignée nulle part** —
   or c'est elle qui porte la moitié de l'argumentaire de la décision.
2. **Minimiser tant que dure l'écart** : ne pas collecter ce dont la phase de
   test n'a pas besoin. Chaque donnée non collectée est une donnée qui n'est pas
   hébergée hors cadre.
3. **Effacement à la demande, sans condition ni délai d'instruction.**
4. **Rester hors résultats biologiques réels** (Phase C du programme 5.0), déjà
   la règle, et qui le devient d'autant plus ici.
5. **Instruire la migration sans attendre la date de revue** : le coût technique
   est faible, le délai réel est celui du transfert de base et du contrat.

## Qui lève ce gate

**Pas l'assistant.** La levée est une décision du responsable du traitement
(`G-TRUST-02` : le praticien), consignée ici avec sa date, ses pièces
justificatives et le périmètre exact de ce qu'elle autorise.

**Statut au 2026-07-21** : le gate n'est **pas levé** — les sept exigences ne
sont pas satisfaites, et l'exigence 1 est désormais négative de façon établie.
Ce qui est écrit ci-dessus est autre chose : une **dérogation datée et bornée**
par laquelle le responsable autorise la phase de test malgré l'écart. La règle
du dépôt — patients fictifs exclusivement — est suspendue dans ce périmètre et
jusqu'au **2026-10-21**, pas abrogée.

## Raccordement

- Gate : `GATES_GO_NO_GO.md:11` (G-TRUST-04, non levé).
- Dette : `DETTE_TRUST.md`, D-TRUST-03.
- Invariants : `docs/claude/REGISTRE_FRONTIERES.md:19-20`, `:31`.
- Campagne dépendante : `2026-07-19-idp-identite-patient-durable` (G4).
