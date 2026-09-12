# Feature flags — référence

Inventaire des drapeaux d'environnement qui **gâtent** des fonctionnalités, et
comment les ouvrir. Source de vérité : les modules `web/src/lib/*/featureFlag.ts`
et les lectures `process.env.*` dans les routes.

**Principe.** Les gâtes vivent dans le code pour que la **prod** reste
conservatrice pendant que le **dev** tourne à plein. On ne les retire **pas** du
code : on les **allume par environnement** (`web/.env.local` en local, variables
Scalingo/Vercel en déployé). Tous sont **fail-closed** : absents, ils laissent
fermé.

> ⚠️ **La convention d'activation n'est pas uniforme** — lire la colonne
> « Valeur ON ». La plupart exigent la chaîne exacte `'true'` ; deux exigent
> `'1'` **et** une validation en code.

## A. Flags produit — `'true'`, défaut OFF

Ouvrables par l'environnement seul. **ON en dev/staging** ; en prod, activation
datée **par feature**.

| Flag | Valeur ON | Ouvre | Si absent |
|---|---|---|---|
| `WN_C4_ENABLED` | `true` | rayon compléments | fermé |
| `WN_C5_ENABLED` | `true` | alimentation / CIQUAL | fermé |
| `WN_CB_ENABLED` | `true` | rayon biologie — **étage documentaire** | fermé |
| `WN_CB_PROPOSITION` | `true` | **proposition de bilan** servie au cockpit praticien (`GET/POST /api/praticien/biologie/proposition`) | fermé — exige AUSSI `WN_CB_ENABLED`. **POSÉE en Production le 2026-08-18** ([[D-072]]) |
| `WN_RECHERCHE_CORPUS_ENABLED` | `true` | recherche corpus clinique (rayons cognition, douleur, intestin — `dashboard/bibliotheque`) | fermé — **POSÉE en Production (Scalingo) le 2026-08-22** ([[D-081]]) |
| `WN_EI_INTERRUPTION` | `1` | **association d'un effet indésirable à un protocole** (`DC-42`, [[D-101]]) — capture au portail, puis interruption de la préparation automatique quand la règle `SAF-EI-01` est signée | fermé — **NEUF ET ÉTEINT à la livraison**. Ne se pose qu'APRÈS que la migration `20260823210000_association_effet_indesirable_intervention` est appliquée **et constatée** ([[D-087]]) : le code lit trois colonnes que la base n'a pas encore. Deux gestes dans cet ordre — le drapeau ouvre la CAPTURE, la signature ouvre l'INTERRUPTION |
| `WN_AGENDA_ALI` | `true` | agenda alimentaire 21 j — la **surface d'écriture** du patient au portail | fermé. Il ferme ce qui s'écrit, **pas ce qui se relit** : la route `GET /api/praticien/agenda-alimentaire` et son panneau ne sont pas gardés ([[D-027]]), et le catalogue ne se lit jamais depuis `process.env` ([[D-025]]). **ALLUMÉ en Production depuis le 2026-08-05**. **RELU SUR SCALINGO LE 2026-09-11** (`env`) : `true`. |
| `WN_ALI_01_SIIN57` | `true` | **rien** — il SUBSTITUE : `Q_ALI_01` est servi en forme longue SIIN 57 items au lieu de la forme courte 14 items (`lib/questionnaires/alimentaire.ts:406`) | absent ⇒ forme courte. **Seul drapeau de FORME du dépôt** : `DRAPEAUX_DE_FORME` (`tools/corpus/certify/lib/servi.mjs:85`) le nomme, et `scoring-check` joue les deux positions. **RELU SUR SCALINGO LE 2026-09-11** (`env`) : `true` — c'est donc la forme longue qui est servie en production. |
| `WN_AGENDA_RELANCE` | `true` | relance praticien de l'agenda du sommeil (**envoi e-mail au clic**, jamais de cron) | fermé |
| `WN_SYNTHESE_STREAM` | `true` | synthèse IA en SSE (routeur 30 s Scalingo) | réponse JSON |
| `WN_CLAIMS_QUESTIONNAIRE_STREAM` | `true` | claims questionnaire en SSE | réponse JSON |
| `RAG_PGVECTOR_ENABLED` | `true` | RAG de production — exige aussi `RAG_INTERNAL_SECRET` + clés OpenAI | throw / fermé |
| `WN_ENABLE_VALIDITE_PASSATIONS` | `1` | filtre de validité des passations (LOT-00 chaîne T0) : `INVALID`/`SUPERSEDED`/`HISTORICAL_ONLY` sortent du raisonnement, et la route d'invalidation praticien répond (sinon **503**) | filtre **inerte** — la colonne `statut_validite` existe et vaut `VALID` par défaut de migration sur **toutes** les lignes ; ce `VALID` n'est donc pas un jugement clinique ([[D-052]]) — état **antérieur** au 2026-08-19. **POSÉ (`1`) en Production le 2026-08-19** ([[D-077]], arbitrage praticien en session, redéploiement porteur) : la route d'invalidation s'ouvre, aucun calcul ne change (111 passations, toutes `VALID`). ⚠️ [[D-050]] et [[D-052]] disent encore « éteint » : elles décrivent la vérification du 2026-08-12 et n'ont pas été révisées. **RELU SUR SCALINGO LE 2026-09-07** (`env-get`) : la variable y est bien posée. |

## B. Chemins d'accès patient — `'true'`, défaut OFF

ON en dev (données **fictives**). En prod, chaque activation est une décision
datée, avec ses dépendances.

> ⚠️ **Ces drapeaux commandent toute la voie patient** — les trois premiers
> décident si un patient **entre**, les quatre suivants ce qu'il **trouve** une
> fois entré. Leur état de production se lit **ici**, daté, comme au § A : une
> activation non consignée dans ce tableau rend illisible tout classement de
> constat portant sur le portail (un défaut derrière un drapeau éteint et un
> défaut servi à des patients ne se traitent pas au même rang). Les dates des
> portes d'entrée datent d'AVANT la migration Scalingo ; elles ont été **relues
> sur Scalingo le 2026-09-07** (`env-get`), puis avec toute la section le
> 2026-09-11.
>
> **LES QUATRE SURFACES DU § B.2 ONT MANQUÉ À CE TABLEAU JUSQU'AU 2026-09-11**,
> alors qu'elles étaient posées en production. Leur état était pourtant écrit —
> dans [[D-092]], [[D-110]], [[D-112]] et [[D-154]], à quatre dates
> différentes, c'est-à-dire partout sauf à l'endroit dont ce § dit qu'il fait
> foi. Lire ce document, en septembre, c'était croire que la voie patient tenait
> en trois portes. `drapeauxDocumentes.guard.test.ts` refuse désormais qu'une
> variable lue par `web/src` ne soit nommée nulle part ici — deuxième
> application de [[D-064]], qui gardait déjà la justesse des lignes mais jamais
> leur existence.
>
> **RELECTURE INTÉGRALE SUR SCALINGO LE 2026-09-11** (`scalingo --app wellneuro
> env`, `WN_DEPLOY_ENV=production`) : **les sept drapeaux de cette section sont
> posés à `true`** — la voie patient est entièrement ouverte —, et
> `WN_OBJECTIF_PROPOSE_PATIENTS` étant **absent**, le périmètre de la machine
> qui propose est **tous les dossiers**. Toute extinction ou activation
> ultérieure se consigne ici, datée, comme au § A.

### B.1 — Les portes d'entrée

| Flag | Valeur ON | Ouvre | Dépendance / note |
|---|---|---|---|
| `WN_G4_LIEN_MAGIQUE` | `true` | entrée portail par lien magique | **POSÉ en Production le 2026-07-21** (`campagnes/2026-07-19-idp-identite-patient-durable/ACTIVATION_RUNBOOK_G4.md`, constaté à `CHECKLIST_ACTIVATION_G_TRUST_04.md:167`) — plateforme Vercel d'alors ; valeur reprise au dossier de migration le 2026-08-21 (`CHECKLIST_FINALISATION.md:25`, recopie prod → staging). **RELU SUR SCALINGO LE 2026-09-07** (`env-get`) : la variable y est bien posée. |
| `WN_G4_REDEMANDE_PATIENT` | `true` | canal public de redemande de lien | **surface publique non authentifiée**. **POSÉ en Production**, constaté actif le 2026-08-05 (`handoffs/2026-08-05-1634-parcours-patient-unique-revocation-fermee.md:18`, lecture des logs runtime) ; valeur reprise au dossier de migration le 2026-08-21 (`CHECKLIST_FINALISATION.md:25`). **RELU SUR SCALINGO LE 2026-09-07** (`env-get`) : la variable y est bien posée. |
| `WN_G5_GOOGLE_PATIENT` | `true` | entrée patient par Google | exige `WN_GOOGLE_PATIENT_CLIENT_ID` / `_SECRET` (client OAuth dédié). **POSÉ en Production le 2026-07-22** (`propositions/2026-07-25-audit-identites-google/AUDIT_IDENTITES_GOOGLE.md:50`) — une connexion patient réelle tracée le jour même (`SESSION_LOG.md:122`), donc une porte qui a effectivement servi. **RELU SUR SCALINGO LE 2026-09-07** (`env-get`) : la variable y est bien posée. |

### B.2 — Les surfaces de la voie Alliance

Chacune a **son** drapeau, et aucune ne se compose des autres : ouvrir une
surface d'écriture n'ouvre pas une publication, et ouvrir une publication
n'ouvre pas la ratification. Se greffer sur un drapeau déjà allumé rendrait un
écran visible à tous les dossiers du cabinet dès le déploiement, sans qu'aucune
décision ne l'ait ouvert — le défaut exact que [[D-070]] a constaté sur le rayon
biologie.

| Flag | Valeur ON | Ouvre | Dépendance / note |
|---|---|---|---|
| `WN_CE_QUI_COMPTE` | `true` | « Ce qui compte pour moi aujourd'hui » — la **route de dépôt** (503) **et** l'**écran du portail** (404) | Alliance 6.0-A, LOT-03. Ne garde **pas** la lecture praticien : une liste vide côté dossier est un silence honnête, un 503 ferait croire à une panne. **Absent le 2026-08-22** ([[D-092]]) ; **posé** au constat du 2026-08-26 ([[D-112]]). **RELU SUR SCALINGO LE 2026-09-11** (`env`) : `true`. |
| `WN_COMPREHENSION` | `true` | « Ce que j'ai compris de vous » — route (503) et écran (404) du portail, **et la PUBLICATION côté praticien** (503) | Alliance 6.0-A, LOT-04. Le troisième geste est le moins évident et le plus important : laisser publier dans une surface fermée produirait un stock de synthèses que le praticien croit remises, et qui atteindraient le patient **d'un seul coup** le jour de l'allumage. Ne garde pas le **brouillon** — préparer avant d'ouvrir est l'usage attendu. **POSÉ en Production le 2026-08-22** ([[D-092]]). **RELU SUR SCALINGO LE 2026-09-11** (`env`) : `true`. |
| `WN_DOSSIER_DEUX_VOIX` | `true` | l'écran « dossier à deux voix » (404), sa route d'assemblage (503) et **les quatre gestes du patient** (503) : **RATIFICATION**, amendement, réponse d'étape, et **demande de correction de l'objectif** | Alliance 6.0-A, LOT-06. **Ne se compose pas** des deux précédents : la ratification est la seule écriture patient **irréversible** de la campagne. Il ne remplace pas les autres, il **s'y ajoute** — chaque bloc de l'écran reste soumis à son propre drapeau, et un bloc éteint est **absent** de la réponse, ni « vide » ni « pas encore ouvert » (`DC-24`). Garde aussi l'amendement, et non `WN_OBJECTIF_PROPOSE` ([[D-110]] §1). Le quatrième geste n'a **délibérément pas** de drapeau propre ([[D-170]]) : l'en doter aurait rendu possible un écran où le bloc se ferme sur « c'est bien ça » sans que la porte de la demande s'ouvre — le patient sans recours. **POSÉ en Production depuis le 2026-08-23** ([[D-110]]). **RELU SUR SCALINGO LE 2026-09-11** (`env`) : `true`. **MISE EN SERVICE DU QUATRIÈME GESTE CONSTATÉE LE 2026-09-12** — § B.3. |
| `WN_OBJECTIF_PROPOSE` | `true` | la **machine qui propose** un objectif — l'assemblage (503) **et la lecture** (503) | Alliance 6.0-B, LOT-02, gouvernance du périmètre ([[D-094]]). Ce qu'il ouvre n'est pas une surface mais une force de proposition, d'où un drapeau distinct de `WN_DOSSIER_DEUX_VOIX`. Gâter la **lecture** est une exception assumée à la règle « une liste vide est un silence honnête » : ici, elle se lirait « la machine n'a rien trouvé à proposer sur ce dossier », soit un **constat sur le patient**, là où la vérité est que personne n'a ouvert la fonctionnalité. **Absent au 2026-08-26** ([[D-112]]) ; **posé** à la lecture du 2026-09-08 ([[D-154]] §1 — « ce n'est pas un drapeau qui manquait »). **RELU SUR SCALINGO LE 2026-09-11** (`env`) : `true`. |
| `WN_OBJECTIF_PROPOSE_PATIENTS` | liste d'identifiants séparés par des virgules, **vide = tous** | **rien** — il RESTREINT : mécanisme de réversibilité, pour limiter après coup et sans redéploiement | N'est pas une gâte : le fail-closed est tenu par `WN_OBJECTIF_PROPOSE`, qui précède toujours. En faire un périmètre par défaut inverserait son rôle, un oubli passant pour une fermeture voulue. **ABSENT en production au 2026-09-11** ⇒ périmètre = **tous les dossiers**, ce que [[D-094]] fonde sur un fait et non sur une commodité : les patients actuels sont des bêta-testeurs réels et informés. |
| `WN_PORTAIL_JOURNAL` | `true` | le **journal du portail patient** — « ce qui s'est passé dans votre dossier » : sa route de lecture (503), et l'écran du LOT-03 quand il existera | Campagne « la vie du portail patient », LOT-01. **SIXIÈME drapeau neuf et éteint**, et il ne se compose d'aucun des cinq précédents : ce qu'il ouvre n'est ni une surface d'écriture ni une machine, mais une **restitution transverse**. Se greffer sur l'un d'eux ferait qu'ouvrir « ce qui compte » publierait du même geste l'histoire entière du dossier, gestes du praticien compris. **IL NE LÈVE AUCUN DES AUTRES, ET C'EST L'INVARIANT** : une surface fermée par son propre drapeau ne produit **aucune** ligne de journal, même celui-ci allumé — le journal ne peut pas devenir la porte dérobée par laquelle une synthèse de compréhension atteint un patient dont l'écran est clos. Le drapeau est relu **après** l'identité : un 503 servi à un visiteur non identifié dirait ce que le cabinet a déployé. **POSÉ en Production le 2026-09-12 à 13:24 UTC, puis RETIRÉ à 13:37:57 UTC** ([[D-172]]) — treize minutes de service, les deux gestes sur demande explicite du responsable. **L'état courant du drapeau est ABSENT, donc fermé** : l'écran « ce qui s'est passé dans votre dossier » n'est servi à personne. Il a été retiré parce que le responsable, le voyant sur son propre écran, a jugé qu'un récapitulatif rétrospectif **ajoute du bruit** là où il attendait une liste de ce qu'il y a à faire. Les deux bascules sont constatées par conteneur, jamais par la route : **le 401 ne prouve PAS le drapeau** et ne doit pas être lu ainsi — la route relit le drapeau APRÈS l'identité, si bien qu'un appel anonyme rend 401 dans les deux états. § B.4. |
| `WN_RELANCE_QUESTIONNAIRE` | `true` | le **rappel patient d'un questionnaire resté sans réponse** — la route de relance (503) | Campagne « le second rideau borné et relancé », 2026-09-12. **SEPTIÈME drapeau neuf et éteint.** Ce qu'il ouvre est un **courrier de plus vers le patient**, et un courrier de plus ne se décide pas au déploiement : le cabinet choisit le jour où ses patients commencent à recevoir des rappels. Même ligne que `WN_AGENDA_RELANCE`. **Il ne garde PAS la borne** (`WN_ECHEANCE_OBLIGATOIRE`) : on peut vouloir rappeler sans contraindre, et l'inverse. La route n'écrit **rien** dans le dossier — ni assignation, ni réponse, ni statut : elle renvoie un courrier et le trace. **POSÉ en Production le 2026-09-12 à 16:32:45 UTC**, sur arbitrage du responsable rendu en session. Effectivité constatée comme l'exige le § B.4 : `env` relu (`true`), et **les deux conteneurs web recréés à 16:32:45** — un `env-set` seul ne change rien tant que les conteneurs tournent. Code en ligne vérifié AVANT la pose par contenance (`merge-base --is-ancestor` : #1056 contenu dans le déploiement courant), jamais par égalité de SHA. |
| `WN_ECHEANCE_OBLIGATOIRE` | `true` | **refuse (422) une assignation sans échéance** sur un dossier qui porte déjà une synthèse validée | Même campagne. **HUITIÈME drapeau neuf et éteint, et le seul du lot qui arrête un geste du PRATICIEN** — d'où un drapeau distinct du précédent. Motif : une assignation postérieure à la première synthèse validée compose le **second rideau**, qui garde le `T0` ([[D-158]]) ; sans échéance, ce blocage n'a ni terme ni rappel — la relance elle-même refuse de partir (`sans_echeance`), parce qu'un rappel sans date ne dit rien de plus que l'invitation. **Il ne porte que le second rideau** : avant toute synthèse validée, le dossier se remplit au rythme de l'entrée, et lui imposer un terme au premier jour serait une borne administrative sur un parcours qui commence. **POSÉ en Production le 2026-09-12 à 16:32:45 UTC**, sur arbitrage du responsable rendu en session. Effectivité constatée comme l'exige le § B.4 : `env` relu (`true`), et **les deux conteneurs web recréés à 16:32:45** — un `env-set` seul ne change rien tant que les conteneurs tournent. Code en ligne vérifié AVANT la pose par contenance (`merge-base --is-ancestor` : #1056 contenu dans le déploiement courant), jamais par égalité de SHA. |
| `WN_SYNTHESE_PAR_RIDEAU` | `true` | la **génération automatique d'un brouillon de synthèse** à la fermeture du premier puis du second rideau de questionnaires | [[D-174]]. **NEUVIÈME drapeau neuf et éteint, et le seul de la série qui déclenche un APPEL AU MODÈLE que personne n'a demandé** : ce n'est pas une surface qui s'ouvre, c'est une machine qui se met à produire sur des dossiers réels sans geste humain en amont. **CE QU'IL N'OUVRE PAS, ET C'EST L'INVARIANT** : rien n'atteint le patient — ce qui est produit est un `Brouillon_IA`, la validation et l'envoi restent deux gestes du praticien. Idempotent par marqueur (`donneesEntree.source`) : deux générations par dossier au maximum, et un brouillon rejeté ne se régénère pas. **ABSENT en production au 2026-09-12**, donc fermé — et il le reste tant que le responsable n'a pas validé la mise à jour du registre : `DOSSIER_RGPD.md` § 2 bis est **rédigé et en attente de validation**. L'ordre est cette fois l'inverse de l'épisode `WN_CB_RESULTS_ENABLED` du 2026-09-09, où le drapeau avait été posé avant. |

### B.4 — Le journal du portail patient : allumé 13:24, éteint 13:37 (2026-09-12)

`WN_PORTAIL_JOURNAL` **posé à `true` le 2026-09-12 à 13:24 UTC**, puis **retiré à
13:37:57 UTC**. Treize minutes de service. Les deux gestes sur demande explicite
du responsable, et le second n'est pas un incident : c'est un verdict d'usage.

**Ce qui a été vérifié AVANT de poser le drapeau** : que le code était en ligne.
Un drapeau posé avant son code ouvre une porte sur rien. Preuve directe plutôt
qu'une égalité de SHA — `src/app/api/portail/journal/route.ts` **présent dans le
conteneur** (one-off-252), et les cinq commits de squash des lots de code
contenus dans le déploiement courant (`merge-base --is-ancestor`).

**Ce qui a été vérifié APRÈS LA POSE** — trois preuves, et une quatrième écartée :

1. `scalingo env` relu : `WN_PORTAIL_JOURNAL=true`.
2. `scalingo ps` : les deux conteneurs web **recréés à 13:24:54 UTC**, donc
   après la pose. Un `env-set` seul ne change rien tant que les conteneurs
   tournent : ils lisent leur environnement au démarrage.
3. La route répond **401 et non 404** : elle est déployée et servie.

**LA QUATRIÈME PREUVE N'EN EST PAS UNE, ET IL FAUT LE DIRE.** Un 401 sur un appel
anonyme ne prouve **rien** du drapeau : la route le relit **après** l'identité —
délibérément, pour qu'un visiteur non identifié n'apprenne pas ce que le cabinet
a déployé. Les deux états rendent donc 401. Seule une session patient réelle
verrait la différence. Cette phrase a été écrite ici **parce que je m'étais moi-même
trompé en la lisant à l'envers** : j'avais présenté le 401 comme la preuve que le
drapeau était pris.

**CE QUE L'ALLUMAGE A CHANGÉ POUR LES PATIENTS.** Aucun dossier ne portait de
repère de fraîcheur : `duNeuf` valait **vrai partout**, et le journal s'ouvrait
**déplié** à la première visite de chacun, sur l'histoire entière de son dossier.
C'est l'écart nommé dans [[D-172]] — « le jour où une surface s'ouvrira, le
journal fera apparaître d'un coup des faits anciens » — et il s'est réalisé en une
fois, pour tout le monde. Les lignes étaient vraies et datées de leur jour ; aucune
ne disait « ceci vous est révélé aujourd'hui ».

---

**L'EXTINCTION, 13:37:57 UTC — ET SON MOTIF.**

Le responsable a ouvert son propre écran de patient et a rendu ce verdict : le
bloc « ce qui s'est passé dans votre dossier » **ajoute trop de bruit**, et ce
qu'il attendait du portail n'était pas un récapitulatif rétrospectif mais **un fil
du jour de ce qu'il y a à faire** — noter la nuit, noter la journée, remplir les
questionnaires en attente, **être invité à dire ce qui compte pour lui** (il ne
l'est jamais), lire un nouveau bilan. Une liste de tâches, pas un calendrier à
rebours.

`scalingo env-unset WN_PORTAIL_JOURNAL` puis `restart`. **Extinction constatée par
deux preuves, et par conteneur** :

1. `scalingo env | grep -c WN_PORTAIL_JOURNAL` = **0** — la variable est absente,
   ce qui est l'état fermé (`isJournalPortailEnabled` n'ouvre que sur la chaîne
   exacte `'true'`).
2. `scalingo ps` : les deux conteneurs web **recréés à 13:37:57 UTC**. Sans ce
   redémarrage, les conteneurs auraient continué de servir la valeur lue à leur
   démarrage de 13:24:54 — l'`env-unset` seul n'éteint rien.

**CE QUE LE DRAPEAU A PROUVÉ EN S'ÉTEIGNANT.** Une surface mise devant un patient
et retirée treize minutes plus tard, sans déploiement, sans migration, sans
qu'aucune donnée ne soit perdue : c'est exactement ce pour quoi un drapeau
existe, et c'est la première fois qu'il sert dans ce sens ici. La table
`portail_journal_reperes` reste en place et n'a rien perdu — aucun repère n'avait
encore été posé en treize minutes, et la route qui les pose est fermée avec le
reste.

**CE QUI RESTE EN PLACE, ET CE QUI VA PARTIR.** `portail-visite.ts` et son bloc de
repli (« Depuis votre dernière visite ») n'ont jamais été retirés : ils étaient le
filet du nouvel écran, et ils sont redevenus l'écran. Le code du journal
rétrospectif — sa dérivation et son composant — est **destiné au retrait** ; le
**repère de fraîcheur survit**, car c'est lui qui fera disparaître une lecture du
fil du jour une fois faite. Cet arbitrage est du responsable, pris le jour même.

**LES DEUX BOUTONS N'ÉTAIENT PAS GARDÉS PAR CE DRAPEAU.** « Dire ce qui compte pour
moi » et « ce que votre praticien a compris », posés sur le hub par le LOT-05,
vivaient sans drapeau propre. Le même verdict les visait — ils font doublon avec
« mon dossier à deux voix » — et ils ont donc été retirés **par code**, non par
bascule (PR #1052). Un drapeau n'est un recours que là où on en a posé un.

### B.3 — Mise en service du quatrième geste patient (2026-09-12)

[[D-170]] a ajouté un **quatrième geste** au « dossier à deux voix » : après
« c'est bien ça », le bloc de réponse se ferme, et une **demande de correction
de l'objectif** prend sa place. Ce geste **n'a pas de drapeau propre** — choix
commenté à la route (`web/src/app/api/portail/dossier/route.ts`) : l'en doter
aurait rendu possible un écran où le bloc se ferme sans que la porte de la
demande s'ouvre.

**Conséquence, et c'est le fait à retenir : il n'y a eu aucun geste
d'exploitation à poser.** `WN_DOSSIER_DEUX_VOIX` valant `true` depuis le
2026-08-23, la fonctionnalité est entrée en service **au déploiement de son
code**, sans décision distincte et sans que rien ne la signale. Le handoff du
chantier (`docs/claude/handoffs/2026-09-12-0040-…`) annonce « la mise en service
côté patient reste à demander » : c'était **inexact**, elle était déjà faite.
Cette ligne-ci corrige ce point, et c'est ici qu'elle fait foi.

**Constatée le 2026-09-12**, par quatre preuves dont aucune ne se déduit d'une
autre :

1. **Contenance** — le déploiement qui sert est `e01d844a` (Scalingo,
   2026-09-11 23:05:18 ; conteneurs `web-1`/`web-2` créés à 23:08:29). Il
   **contient** les six lots du chantier (`492e55b2` → `e01d844a`), et
   `git diff e01d844a d607c002 -- web/` est **vide** : la tête de `main`
   n'ajoute que de la documentation. Constaté par contenance, jamais par
   égalité de SHA.
2. **Conteneur** — dans l'image qui tourne, `demande_correction` est présent
   dans `.next/server/app/api/portail/dossier/route.js` **et** dans
   `.next/server/app/portail/[token]/dossier/page.js` : la route **et** l'écran,
   pas seulement l'une des deux.
3. **Comportement** — sonde non authentifiée sur `POST /api/portail/dossier`,
   corps `{"geste":"demande_correction"}` : **401, et non 503**. Le drapeau
   (étape 1 de la route) laisse passer ; c'est l'authentification (étape 2) qui
   refuse. Le GET rend 401 de même.
4. **Base** — `demandes_correction_objectif` existe et compte **0 ligne**
   (lecture par conteneur, `one-off-959`).

**Périmètre réel au 2026-09-12, mesuré et non supposé.** Deux dossiers portent
une tête d'objectif active. **Un seul** — `PAT006` — a `ratifie` pour dernier
geste : c'est le seul patient à qui l'écran présente aujourd'hui le bloc fermé
et le quatrième verbe. L'autre (`PAT017`) n'a posé aucun geste, et voit les
trois verbes, inchangés. La demande n'a donc encore **jamais** été éprouvée
contre un dossier vécu — limite déjà écrite en `D-170`, que cette mise en
service ne lève pas.

**Aucune version nouvelle du document patient n'est due.**
`donnees_confidentialite` reste en **v7**. La condition d'ouverture écrite au
§2 de `docs/DOSSIER_RGPD.md` — mise à jour **préalable** du registre des
traitements et du document d'information patient — est examinée et **remplie** :
la demande de correction entre dans une catégorie **déjà déclarée**, « Alliance
— la parole des deux voix (art. 9) », où `DemandeCorrectionObjectif` a été
inscrite en rubrique 5 **avec sa migration** ; et le document couvre déjà « les
éléments de votre situation que vous décrivez, vos signalements et vos choix ».
Aucune donnée d'une nature nouvelle n'est recueillie, aucun prestataire ne
s'ajoute. C'est un examen, pas une dispense : la question s'est posée parce que
le §2 l'exige, et elle se repose à chaque surface d'écriture patient nouvelle.

## C. Double verrou clinique — `'1'` **ET** validation en code

**L'environnement seul ne les ouvre pas.** Il faut `= '1'` **et** que le contenu
clinique soit validé/signé dans le code (`validationExterne`, date, claims). Ce
n'est pas une gâte « juridique » ni un confort de dev : c'est la **validation
clinique**. Ne pas forcer la métadonnée de validation pour « voir » la feature.

| Flag | Valeur ON | 2ᵉ condition | État (daté) |
|---|---|---|---|
| `WN_ENABLE_CORPUS_CLINIQUE_V1` | `1` | `CORPUS_CLINIQUE_SIGNE` (4 termes depuis [[D-084]] : validation + date non nulle + forme ISO canonique + concordance `shaPerimetre` — pas de terme claims, le corpus n'en cite aucun) | **signée le 2026-08-22** ([[D-082]] — validation clinique du responsable, contenu inchangé ; ancrage `shaPerimetre` posé le même jour, [[D-084]]), **drapeau POSÉ en Production (Scalingo) le 2026-08-22 et CONSTATÉ par le comportement le jour même** ([[D-074]]) : pose dans l'ordre exigé (build signé déployé 09:21 UTC → `env-set` → conteneurs recréés 09:36 UTC), puis synthèse réelle de 10:22 UTC dont la trace d'audit porte `corpusActif: true`, `synthese-v27`, `corpus-clinique-v1`, le SHA signé `19a55478…`, et une mention de limites « avec référentiel clinique SIIN Snapshot V1 » → **les deux conditions sont remplies ; le corpus SERT** |
| `WN_ENABLE_ORIENTATION_NNPP2` | `1` | `tableSignee()` (5 termes depuis `D-067` : validation + date non nulle + forme ISO canonique + claims + concordance `shaPerimetre`) | **20 règles**, `validationExterne: true` depuis le 2026-08-04, et **drapeau POSÉ en Production** — constaté le 2026-08-18 par le comportement ([[D-074]]) → **les deux conditions sont remplies ; l'orientation SERT** |
| `WN_ENABLE_CONTRADICTIONS_NNPP2` | `1` | `tableSignee()` de `contradictionsService.ts` (5 termes depuis `D-067` : validation + date non nulle + forme ISO canonique + claims + concordance `shaPerimetre`) | **1 règle publiée (C-STR)**, table **signée le 2026-08-15** ([[D-061]]) et **drapeau posé en Production le 2026-08-16** ([[D-064]]) → **les deux conditions sont remplies ; les constats sortent au prochain déploiement de production**. L'affichage est câblé depuis [[D-050]] (route cockpit → panneau) |

**Les règles d'arrêt n'ont PAS de drapeau à elles** ([[D-053]], LOT-03 du
2026-08-12) — mais depuis [[D-065]], **elles héritent de celui des
contradictions**. `stopRulesV1.ts` est **signée depuis le 2026-08-15**
([[D-061]]), et le verrou `tableArretExploitable()` d'`orientationService.ts`
exige la signature ET `contradictionsActives()` avant de livrer les deux
effets de la table — l'extinction des recommandations et l'exclusion des
instruments déjà renseignés de façon exploitable. L'histoire qui a imposé ce
couplage : l'orientation étant allumée en production, la signature seule a
rendu **l'extinction effective dès le 2026-08-15** — et elle a tourné trois
jours sans le frein de [[D-053]] §5, le frein ne mordant que sur des constats
effectivement produits quand le drapeau des contradictions manquait
([[D-064]], qui l'a posé). [[D-065]] a rendu ce frein structurel : retirer
`WN_ENABLE_CONTRADICTIONS_NNPP2` ré-éteint désormais l'arrêt tout entier au
lieu de le laisser tourner sans frein. **Leçon pour la prochaine signature** :
vérifier non seulement ce que la signature allume, mais ce dont le
comportement allumé dépend pour rester borné.

**⚠ L'orientation a changé d'état le 2026-08-04.** Jusque-là, la valeur du
drapeau était sans effet : `tableSignee()` était faux, donc le ET aussi, dans
tous les environnements. Depuis la signature, **poser `WN_ENABLE_ORIENTATION_NNPP2=1`
suffit à ouvrir la route** — y compris là où la variable vaudrait déjà `1` sans
que personne s'en souvienne. Vérifier les trois scopes Vercel (Production,
Preview, Development) et les `.env.local` de poste avant de considérer la route
comme fermée. **Depuis le 2026-08-07 (LOT-01, `orientation-file-envoi.spec.ts`),
Playwright la pose** — `webServer.env` dans `web/playwright.config.ts` arme
`WN_ENABLE_ORIENTATION_NNPP2=1`, délibérément, pour aligner le test sur l'état
réel de production plutôt que de le simuler. Le risque de désalignement entre
scopes Vercel (Production, Preview, Development) et `.env.local` de poste reste
entier, lui, et rien côté CI ne le couvre.

Débloquer ces deux-là = **valider le contenu clinique** (décision clinique,
documentée au `CHANGELOG`), pas flipper un flag.

**Et signer ne suffit pas non plus** : le verrou est un ET. Sur l'orientation,
signer la table sans poser `WN_ENABLE_ORIENTATION_NNPP2=1` en production laisse
l'écran praticien du LOT-06 sur « Orientation non activée ». Les deux gestes
vont ensemble, dans cet ordre : validation clinique d'abord, flag ensuite.

### État des signatures — **gardé, ne pas éditer à la main sans le code**

Ce tableau a menti trois jours ([[D-064]]) : il annonçait « fermé quoi qu'on
pose » sur une table déjà signée. Il est désormais **épinglé par un banc**
(`web/src/lib/verrousSignatureDocumentes.guard.test.ts`) qui le compare aux
métadonnées réelles. Signer une table sans corriger ce tableau fait rougir le
CI ; une table signée neuve absente du tableau aussi.

<!-- >>> ETAT_VERROUS_SIGNATURE -->

| Table (fichier sous `web/src/lib/`) | `validationExterne` | `dateValidation` |
|---|---|---|
| `clinical/orientationRulesV1.ts` | `true` | `2026-08-06T00:00:00.000Z` |
| `clinical/contradictionsV1.ts` | `true` | `2026-08-15T00:00:00.000Z` |
| `clinical/stopRulesV1.ts` | `true` | `2026-08-15T00:00:00.000Z` |
| `biology-library/indicationsBiologieV1.ts` | `true` | `2026-08-17T00:00:00.000Z` |
| `clinical/corpusSyntheseV1.ts` | `true` | `2026-08-22T00:00:00.000Z` |
| `clinical/priorityRulesV1.ts` | `true` | `2026-08-28T00:00:00.000Z` |
| `clinical/safetySignalsV1.ts` | `true` | `2026-08-23T00:00:00.000Z` |
| `clinical/safetyEffetIndesirableV1.ts` | `false` | `null` |
| `clinical/gatePopulationV1.ts` | `false` | `null` |
| `clinical/conflitsSourcesV1.ts` | `true` | `2026-08-24T00:00:00.000Z` |

<!-- <<< ETAT_VERROUS_SIGNATURE -->

Trois lectures attentives sur ce tableau :

- **`indicationsBiologieV1.ts` est SIGNÉE aux cinq termes depuis `D-069`**
  (2026-08-17) : quinze règles, 29 claims, `shaPerimetre` figé. Le verrou de
  signature est OUVERT — et `WN_CB_ENABLED` est POSÉ à `true` en production,
  constaté le 2026-08-17 ([[D-070]] ; la date de pose n'est enregistrée nulle
  part et reste inconnue). Les deux termes du ET sont donc vrais. Ce qu'ils
  ouvrent est la surface d'**arbitrage** biologique, **pas** les indications.
  `deriverStatutsBiologie` a désormais un appelant de production —
  `propositionService.ts`, servi par `/api/praticien/biologie/proposition`
  ([[D-071]]) — mais il est gardé par un **troisième** terme :
  `WN_CB_PROPOSITION`. Il a été livré NEUF et ÉTEINT — délibérément :
  `WN_CB_ENABLED` valant déjà `true`, s'y adosser aurait exposé la proposition
  sur tous les dossiers dès le déploiement, sans geste d'exploitation. **Il est
  POSÉ en Production depuis le 2026-08-18**, et le déploiement qui le porte est
  `dpl_A8y6TawV` (build du 2026-08-18 12:31 UTC, aliasé `app.wellneuro.fr`).
  Les trois termes sont donc vrais et la table signée n'est plus dormante.

**POSER LA VARIABLE NE SUFFIT PAS : IL FAUT UN BUILD QUI LA PORTE.** Vercel fige
les variables dans le déploiement. Or `web/vercel.json` porte
`"ignoreCommand": "git diff --quiet HEAD^ HEAD -- ."` — la construction est
SAUTÉE quand le dernier commit ne touche rien sous `web/`. Le 2026-08-18, le
drapeau a été posé après un merge purement outillage (#707, `scripts/` et
`docs/` seulement) : les deux déploiements suivants ont été **annulés en trois
secondes** par cette règle, et la production a continué de servir un build
ANTÉRIEUR à la variable. Le drapeau existait dans le panneau et n'était porté
par rien — même classe que [[D-064]] et [[D-070]], sous une forme neuve.
Remède appliqué : redéployer un déploiement dont le commit touche `web/`
(ici celui de #706). **Vérifier la date du build, pas seulement celle de la
variable.**
- **Les quatre tables cliniques portent un `shaPerimetre` depuis `D-067`**
  (2026-08-16) : le verrou est passé à cinq termes — booléen, date, forme ISO
  canonique, claims, concordance du SHA de périmètre. Une règle retouchée
  après signature ferme désormais son verrou seule. `priorityRulesV1.ts` a été
  **re-signée le 2026-08-16** sur le périmètre agrandi par `D-062` — la dette
  de re-signature était soldée —, une **deuxième fois le 2026-08-23**
  ([[D-099]]) : le producteur de constats de sécurité du LOT-04 a rendu faux le
  texte signé d'`ABST-NR-01` (« aucun producteur n'existe à ce jour »), et le
  corriger a refermé le verrou. Le diff signé se limite à cette phrase. Enfin
  **deux fois le 2026-08-28** ([[D-116]] puis [[D-117]]) : la table porte
  désormais QUATRE règles — `PRIO-SOM-01` (axe sommeil et rythme circadien) et
  `PRIO-DOU-01` (axe douleur et perception). Ce sont les premières
  re-signatures dont le périmètre s'agrandit d'une RÈGLE et non d'un texte :
  `PRIO-SOM` et `PRIO-DOU` étaient écartées depuis le 2026-08-12, et leurs
  conditions de retour ont été levées par arbitrage praticien. `PRIO-DOU`
  couvrait `douleurs` ET `mobilite` ; seule la première revient, la seconde
  reste écartée sous `PRIO-MOB`.
- **`safetySignalsV1.ts` est la table neuve du 2026-08-23** ([[D-099]]) : la
  cotation des douze signaux d'alerte d'anamnèse en deux rangs. **Son verrou
  a un sens INVERSE des autres** — le refermer ne fait pas taire un moteur, il
  retire une **inhibition**. Une cotation retouchée sans re-signature laisse
  donc le dispositif moins prudent, et le seul contrepoids est la règle
  `SAF-ANAM-01` passée en `candidate`, dont la revue clinique publie
  l'inactivité. À lire avant d'y toucher.
- **`conflitsSourcesV1.ts` est le registre neuf du 2026-08-24** ([[D-103]]) :
  les conflits DÉCLARÉS entre deux claims du corpus. **Son verrou est le seul
  geste d'exploitation** — il n'a pas de drapeau propre, et les deux termes qui
  l'accompagnent sont DÉJÀ vrais en production
  (`WN_ENABLE_CONTRADICTIONS_NNPP2=1`, `WN_CB_PROPOSITION=true`).
  **SIGNÉ le 2026-08-24 ([[D-104]])**, après la revue : les trois termes sont
  donc vrais, et le constat `CS-BIO-01` atteint le cockpit sur tout dossier dont
  la proposition de bilan cite `WN-CL-0312-018` — la plupart. C'est le seul
  registre du dépôt dont la signature soit à elle seule la mise en service ;
  les autres ont un drapeau devant eux.
  **Deuxième effet de la signature, moins visible** : la route cockpit dérive
  désormais la proposition de bilan à chaque POST pour collecter les claims
  cités (cinq requêtes de plus, isolées par un `catch` — une panne n'emporte pas
  la confirmation d'épisode). Verrou refermé, ce coût disparaît.
- **`orientationRulesV1.ts` garde son jour de signature du 2026-08-06** : seule
  la FORME de la date a été portée à l'ISO canonique par `D-067` (réserve F5) —
  le fait attesté ne change pas.

## D. Gate dur HDS — requalifié par [[D-081]]

| Flag | Valeur ON | Ouvre | Garde |
|---|---|---|---|
| `WN_CB_RESULTS_ENABLED` | `true` | stockage de **résultats biologiques réels** (donnée de santé) | exige AUSSI `WN_CB_ENABLED` ; ~~« ne doit jamais passer à true avant l'attestation HDS »~~ — **requalifié le 2026-08-22 ([[D-081]])** : la condition est un **hébergement HDS effectif et exclusif**, satisfaite au décommissionnement de Vercel/Supabase ([[D-080]], 2026-09-01). **Posé le 2026-09-03 avec le code qui le lit** (étage 2, [[D-122]] §2, geste daté D-081) : appelants `gardeResultats.ts` (routes GET/POST `api/praticien/biologie/resultats`), `EstimeMesurePanel` (via `CbFeatureProvider`), et les générateurs courrier/document patient (phrase « aucun résultat conservé » conditionnée). Absent en production = éteint (fail-closed). **QUATRIÈME CONDITION, RGPD, et elle ne s'écrivait pas ici** : `docs/DOSSIER_RGPD.md` §2 exige la mise à jour **préalable** du registre des traitements (rubrique 5) et du document d'information patient (`donnees_confidentialite` dans `registre.ts`) — nouvelle catégorie « résultats biologiques ». Elle n'était mentionnée ni sur cette ligne ni dans `D-122` §2, et a donc été manquée. **Posé en production le 2026-09-09** (conteneurs redémarrés 06:34:55 ; effectivité constatée par sonde non authentifiée — `401` et non `503`), **avant** ces deux mises à jour, faites le jour même après constat (0 ligne en base, `one-off-8343`) : l'écart est daté au dossier RGPD §2 |

## E. Configuration / secrets — **pas** des gâtes

À ne pas confondre avec les flags : ces variables portent une valeur, elles
n'ouvrent rien.

`WN_CLAIMS_CLAUDE_MODEL` · `WN_DEPLOY_ENV` · `WN_RELEASE_SHA` ·
`NEXT_PUBLIC_WN_DEPLOY_ENV` · `NEXT_PUBLIC_WN_RELEASE_SHA` ·
`RAG_INTERNAL_SECRET` · `RAG_EMBEDDING_MODEL` · `RAG_EMBEDDING_DIMENSIONS` ·
`WN_GOOGLE_PATIENT_CLIENT_ID` / `WN_GOOGLE_PATIENT_CLIENT_SECRET`.

**Modèle des deux appels de proposition**, défaut `CLAUDE_MODEL` si absent :
`WN_MODELE_PROPOSITION_PRIORITE` (`lib/objectif/propositionPriorite.ts:58`) et
`WN_MODELE_PROPOSITION_COMPREHENSION`
(`lib/objectif/propositionComprehension.ts:68`). Ils ne décident **pas** qu'un
appel a lieu — cela, c'est l'affaire des drapeaux du § B.2 — seulement à qui il
est adressé.

**Entrée morte, gardée pour mémoire** : `WN_PORTAIL_TOKEN_TTL_JOURS` (TTL,
entier) n'est plus lue par aucune ligne du dépôt depuis que #397 a retiré le
jeton du portail ; rien à poser nulle part
(`propositions/2026-07-24-audit-migration-hds/CHECKLIST_FINALISATION.md:25`).

**Hors `web/src`** : `WN_MIGRATIONS_PAR_RELEASE_DB` (`web/scripts/db-deploy.sh`)
sort les migrations du postdeploy pour les confier au workflow `release-db` —
posée en production seule, décrite dans `docs/DEPLOIEMENT_RELEASE_DB.md`.

## Tout allumer pour le dev local

À coller dans `web/.env.local` (gitignoré, jamais committé) :

```bash
WN_C4_ENABLED=true
WN_C5_ENABLED=true
WN_CB_ENABLED=true
WN_SYNTHESE_STREAM=true
WN_CLAIMS_QUESTIONNAIRE_STREAM=true
RAG_PGVECTOR_ENABLED=true            # + RAG_INTERNAL_SECRET et clés OpenAI
WN_G4_LIEN_MAGIQUE=true
WN_G4_REDEMANDE_PATIENT=true
WN_G5_GOOGLE_PATIENT=true            # + WN_GOOGLE_PATIENT_CLIENT_ID / _SECRET
WN_AGENDA_ALI=true
WN_AGENDA_RELANCE=true
WN_CE_QUI_COMPTE=true                # les quatre surfaces du § B.2 : sans
WN_COMPREHENSION=true                # elles, le portail local ne montre RIEN
WN_DOSSIER_DEUX_VOIX=true            # de la voie Alliance — et c'est un 404,
WN_OBJECTIF_PROPOSE=true             # pas un écran vide
```

Les flags **C** (double verrou clinique) et **D** (gate dur HDS) n'y figurent pas
volontairement : les premiers ne s'ouvrent pas par l'environnement, le second ne
doit pas s'ouvrir hors HDS. Pour le staging Scalingo, mêmes lignes en
`scalingo --app <app> env-set <FLAG>=true >/dev/null 2>&1` (rediriger : `env-set`
réaffiche la valeur).
