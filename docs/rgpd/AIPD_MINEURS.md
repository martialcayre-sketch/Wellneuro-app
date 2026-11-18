# AIPD du volet mineurs — admission des 15-17 ans (projet)

> **Statut : PROJET, non validé.** Rédigé par l'assistant le 2026-11-18
> (file C, lot `aipd-mineurs`), sur la trame B de `docs/DOSSIER_RGPD.md`,
> rubrique 13, à la suite de la revue de nécessité du même jour
> ([[D-537]] §6, questions `20261118-2120-c` à `-c-5`).
>
> **Ce projet ne conclut sur aucun risque.** La vraisemblance, la gravité et
> le risque résiduel sont jugés par le responsable du traitement (§3, §4), qui
> valide ensuite l'AIPD en la datant (§5). Tant que ce n'est pas fait, aucune
> admission d'un mineur ne s'appuie sur ce document.
>
> — 2026-11-18 : risques et risque résiduel jugés par le responsable en
> session (§6). La validation datée attend le cadrage de J3-mineurs.
>
> **Alerte, pas avis juridique** — même réserve que le dossier RGPD :
> l'assistant n'est pas juriste. Les références aux textes sont celles du
> dossier et de [[D-537]], vérifiées par les sessions qui les y ont portées.
>
> **Pourquoi dans le dépôt.** La trame B place l'AIPD hors dépôt si elle
> décrit des failles exploitables. Ce projet n'en décrit aucune : les
> sources de risque y sont nommées par catégories, et les limites citées
> sont déjà publiques au dossier RGPD (rubriques 6, 7 et 10). Si une
> analyse plus fine en fait apparaître une, elle va hors dépôt et ce
> document n'en garde que la conclusion, la date et l'emplacement.

## 0. Périmètre

- **Ce qui est analysé** : l'admission d'un jeune de 15 à 17 ans aux fonctions
  de santé du service, et tout ce qu'elle déclenche jusqu'à la fin de
  l'accompagnement ou à la majorité ([[D-537]] §4 et §5).
- **Hors périmètre** :
  - les moins de 15 ans, qui restent en pause sans circuit d'admission
    ([[D-537]] §4, R1) ;
  - les adultes : « non requise » est maintenue en l'état, écart porté à la
    rubrique 14 du dossier ;
  - le mineur **non admis**, dont la situation est celle d'aujourd'hui :
    pause fail-closed, aucune donnée de santé collectée (rubrique 4, R3).
- **Dépendance à J3-mineurs (file A, non cadré)**. La forme de l'accord
  parental, la vérification de l'autorité parentale, le consentement du jeune
  fonction par fonction et l'admission de l'émancipé se décident au cadrage
  de J3-mineurs ([[D-537]] §9). Ce projet décrit ce qui est arrêté ; les
  passages marqués **[J3]** se complètent quand le cadrage le sera. Une AIPD
  décrit le traitement tel qu'il sera mis en œuvre : ces passages doivent
  être remplis avant la validation (§5).

## 1. Description du traitement

### 1.1 Finalités

Les mêmes que pour un adulte (dossier, rubrique 2) : préparer et suivre
l'accompagnement en neuronutrition — comprendre la situation, préparer les
consultations, suivre l'évolution, remettre des documents validés par le
praticien. Limite opposable : l'accompagnement relève du bien-être et
n'établit pas de diagnostic médical. Le responsable n'est pas professionnel
de santé (rubrique 4, « Périmètre »).

S'y ajoutent, pour le seul mineur :
- vérifier l'âge et la tranche (garde d'âge, `web/src/lib/patient/gardeAge.ts`) ;
- recueillir l'accord à la prestation d'un ou des titulaires de l'autorité
  parentale, et vérifier cette autorité ([[D-537]] §1) **[J3]** ;
- recueillir le consentement du jeune lui-même aux opérations qu'il couvre
  (H1) **[J3]** ;
- instruire les demandes des parents et du jeune (rubrique 9, étape 7).

### 1.2 Personnes concernées

- Le jeune de 15 à 17 ans, non émancipé (l'émancipé est admis comme un
  majeur, sur justificatif, rubrique 4, R2).
- Les titulaires de l'autorité parentale : l'un ou les deux, tant que
  l'« acte usuel » n'est pas qualifié ([[D-537]] §1 et §5).
- Le praticien.

### 1.3 Données

Celles d'un adulte (dossier, rubrique 5) une fois l'admission faite :
- identité et contact du jeune, dont la date de naissance ;
- données de santé (art. 9) : réponses aux questionnaires et à l'anamnèse,
  agendas, synthèses, protocoles, documents remis, correspondances ;
- biologie : comptes rendus déposés, lignes relevées, résultats validés ;
- documents déposés par le patient, sexe déclaré, statut menstruel,
  traitements en cours ;
- traces : journal d'accès, authentification.

**Informations intrusives** (critère 1 de la revue) : une question sur le
suicide dans quatre questionnaires et dans la section « alertes » de
l'anamnèse ; d'autres sur le tabac, l'alcool et le cancer.

**Données propres au mineur** **[J3]** : identité et coordonnées du ou des
titulaires, preuve de l'autorité parentale, accord à la prestation et sa
date, consentement du jeune et sa portée, justificatif d'émancipation le cas
échéant, demandes parentales et leur instruction. Ces catégories ne sont pas
encore déclarées à la rubrique 5 : elles le seront avec J3-mineurs.

### 1.4 Destinataires et sous-traitants

Ceux du dossier, rubrique 6 :

| Destinataire | Ce qui lui parvient | Localisation |
|---|---|---|
| Praticien | le dossier entier | — |
| Scalingo (OUTSCALE en sous-traitant ultérieur) | hébergement de l'application et de la base | France, HDS |
| Anthropic | synthèse (réponses et contexte clinique, sans identité), priorité d'un objectif, « Ce que j'ai compris de vous », relevé des comptes rendus biologiques (pages masquées par le praticien) | hors UE (rubrique 7) |
| OpenAI | recherche du praticien dans sa bibliothèque : seulement ce qu'il saisit | hors UE |
| Google Workspace | e-mails, documents adressés au patient compris | rubrique 7 |
| Google | connexion, si le patient la choisit (adresse e-mail seule) | rubrique 7 |
| Sentry | erreurs techniques, sans réponses, documents ni identité | UE |

Pour le mineur, s'ajoutent :
- **les titulaires de l'autorité parentale**, comme destinataires
  possibles d'une communication, examinée demande par demande, sans accès
  automatique ni permanent au portail ([[D-537]] §2) ;
- **l'export « Pour une IA externe »** (rubrique 6) : ses envois sont
  suspendus depuis le 2026-11-05 par un geste du responsable, qu'aucun code
  ne tient. Son sort pour un dossier mineur est à décider (§4.2).

### 1.5 Durées

Celles du dossier, rubrique 8 : base active pendant l'accompagnement, puis à
la clôture, à la demande ou cinq ans après le dernier contact (pas encore en
œuvre) ; archive non mise en service ; compte rendu biologique purgé dès ses
lignes décidées, trente jours au plus ; sauvegardes de l'hébergeur douze mois
au plus.

Propres au mineur : la durée de l'accompagnement, l'engagement et l'arrêt ne
sont pas documentés ([[D-537]] §9, question `20261117-2200-c-4`). La durée de
conservation de l'accord parental et de ses preuves, et le sort des pouvoirs
parentaux à 18 ans (H4), sont **[J3]**.

### 1.6 Supports et cycle de vie

Portail patient (lien magique), cockpit praticien (connexion Google
restreinte au domaine), base PostgreSQL chez l'hébergeur, e-mail.

1. Le jeune reçoit l'accès au portail, lit « Avant de commencer » et donne
   sa date de naissance, à confirmer.
2. La garde d'âge le classe en `15_17` : le texte 2B de sa tranche est servi,
   la pause tient (questionnaires, anamnèse, agendas, biologie, documents,
   déclarations physiologiques), tenue par les routes.
3. **[J3]** L'accord à la prestation est recueilli auprès d'un ou des
   titulaires ; l'autorité parentale est vérifiée ; le jeune consent
   lui-même. L'admission lève la pause.
4. Le jeune remplit questionnaires et agendas ; le praticien dépose la
   biologie ; les synthèses et propositions d'IA se préparent sur demande du
   praticien ; rien ne part vers le jeune sans validation et envoi par le
   praticien.
5. Une réponse suicidaire produit un constat et un courriel au praticien,
   sans rien du dossier ; l'encart d'urgence (15, 112, 119) reste accessible
   en tout état.
6. Demandes de droits : le jeune, le titulaire qui a donné l'accord et
   l'autre titulaire sont reçus ; l'instruction est manuelle (rubrique 9).
7. À 18 ans ou à l'émancipation, les pouvoirs fondés sur l'autorité
   parentale prennent fin et le jeune en est informé (H4) **[J3]**.

## 2. Nécessité et proportionnalité

| Principe | Ce qui est établi | Ce qui reste ouvert |
|---|---|---|
| Base légale | Consentement (art. 6 §1 a) et consentement explicite (art. 9 §2 a)), déclarés par le responsable le 2026-10-04 (rubrique 3). Pour le mineur : le jeune consent lui-même aux opérations de l'art. 45 LIL, fonction par fonction ; l'accord parental porte sur la prestation et ne vaut pas consentement (H1, [[D-537]] §1). | La qualification fonction par fonction **[J3]** ; la réserve de [[D-449]] §2 sur la voie d'exception (6.1.d et 9.2.h) ; la relecture par l'avocat à la commercialisation. |
| Règles d'âge | Plancher à 15 ans, accord jusqu'à 18 ans, pause : justifiés et arbitrés (rubrique 4, R1 à R3). | Toute restriction gardée après l'admission se motive avant d'être servie (R3). |
| Minimisation | Identité exclue de la synthèse ; pages masquées pour le relevé ; NIR retiré ; Sentry sans contenu ; courriel d'alerte sans contenu. | Les questions intrusives sont posées au mineur comme à l'adulte : leur nécessité pour un mineur n'a pas été examinée à part. Le masquage vaut ce que vaut le geste du praticien. |
| Exactitude | Date de naissance confirmée, corrigée ensuite par le praticien seul ; relevé biologique validé ligne à ligne. | L'âge repose sur la déclaration du jeune. |
| Information | Texte 2B neuf, en deux variantes, validé mot pour mot et servi ([[D-537]] §7) : il nomme l'IA, dit que masquer ne rend pas anonyme, ne promet ni secret absolu ni accès intégral. | La notice adaptée à l'âge (lot `notice-mineurs-15-17`, bloqué sur J3-mineurs). |
| Droits | Trois demandeurs reçus ; examen une à une ; retrait du jeune non retardé ; délais non suspendus (rubrique 9, H3). | Circuit en ligne **[J3]** ; portée de l'effacement, du retrait et de l'opposition à l'information des parents, à l'avocat. |
| Sous-traitants | Rubrique 6. | DPA Google Workspace et OpenAI non archivés ; copie datée des conditions d'Anthropic à archiver. |
| Transferts | Rubrique 7 : CCT pour Anthropic ; DPF ou CCT pour Google et Sentry. | TIA Anthropic ; localisation de l'inférence et rétention chez Anthropic non établies ; preuves à archiver. |
| Durées | Rubrique 8. | Durée, engagement et arrêt de l'accompagnement ([[D-537]] §9) ; texte patient des durées ; clôture à cinq ans non mise en œuvre. |

## 3. Risques pour le jeune

Les trois événements redoutés de la trame. Pour chacun : sources, menaces,
impacts propres au mineur. **La vraisemblance et la gravité sont laissées
au responsable**, sur l'échelle de la CNIL : négligeable, limitée,
importante, maximale.

### 3.1 Accès illégitime aux données

- **Sources** : une personne de l'entourage (parent, fratrie, camarade) qui
  accède à la messagerie ou à l'appareil du jeune ; un parent qui obtient une
  communication sans l'examen prévu ; une erreur d'envoi du cabinet ; un
  attaquant externe ; un sous-traitant ou sa propre chaîne (IA hors UE).
- **Menaces** : lecture d'un lien d'accès ou d'un document reçu par e-mail ;
  adresse e-mail familiale ou partagée déclarée pour le jeune **[J3]** ;
  communication d'un document à un titulaire sans instruction ; compromission
  d'un compte ou de l'hébergement.
- **Impacts sur le jeune** : révélation à ses parents ou à son entourage de
  réponses sur le suicide, l'alcool, le tabac, le statut menstruel ou ses
  traitements ; conflit familial ; stigmatisation ; perte de confiance qui
  le détourne de l'accompagnement ou d'une aide.
- Jugé par le responsable le 2026-11-18 (`20261118-2227-c`) : **gravité
  importante, vraisemblance limitée**. Une révélation à l'entourage a des
  effets sérieux mais surmontables ; le cabinet est unique, l'accès à usage
  unique, et aucun parent n'a d'accès automatique.

### 3.2 Modification non désirée des données

- **Sources** : erreur de saisie du jeune ou du praticien ; erreur du relevé
  par IA ; date de naissance inexacte ; modification par une personne qui a
  pris la main sur l'accès du jeune.
- **Menaces** : score, orientation ou document remis faussés ; âge erroné qui
  applique au jeune le régime d'un majeur, sans accord parental ni texte
  adapté, ou à l'inverse le maintient en pause.
- **Impacts sur le jeune** : un document inexact sur sa santé, remis à lui ou
  transmis à son médecin ; une protection prévue pour lui qui ne s'applique
  pas.
- Jugé par le responsable le 2026-11-18 (`20261118-2227-c-2`) : **gravité
  limitée, vraisemblance limitée**. Aucun document ne part sans relecture du
  praticien, et le praticien connaît le jeune.

### 3.3 Disparition des données

- **Sources** : panne ou incident chez l'hébergeur ; suppression ou purge par
  erreur ; effacement demandé par un parent contre l'avis du jeune ; échec
  d'un envoi.
- **Menaces** : perte de l'historique d'accompagnement ; courriel d'alerte
  au praticien qui n'arrive pas.
- **Impacts sur le jeune** : accompagnement à reprendre ; un signal de
  sécurité vu en retard.
- Jugé par le responsable le 2026-11-18 (`20261118-2227-c-3`) : **gravité
  limitée, vraisemblance négligeable**. L'accompagnement reprend sur
  sauvegarde, et le Fil du jour montre l'alerte même si le courriel échoue.

## 4. Mesures

### 4.1 Mesures existantes

Communes (dossier, rubrique 10) :
- cloisonnement : RLS `deny-all` et gardes applicatives ;
- accès patient par lien magique haché, à usage unique, expirant en 24 h, et
  coupe-circuit de session ;
- piste d'audit des lectures de dossier (`journal_acces_dossiers`) ;
- procédure de violation écrite et exercée ;
- hébergement HDS en France ;
- pseudonymisation des envois à l'IA : identité exclue de la synthèse, pages
  masquées pour le relevé ;
- aucun envoi automatique au patient : le praticien valide puis envoie ;
- courriel d'alerte sans contenu, carte du Fil du jour en filet ;
- journal des correspondances, échec d'envoi tracé.

Propres au mineur :
- garde d'âge fail-closed tenue par les routes ; date illisible traitée
  comme manquante ;
- plancher à 15 ans ; pause jusqu'à l'admission ;
- aucun accès parental automatique ni permanent ; chaque demande examinée ;
- texte 2B de la tranche, servi ; encart d'urgence toujours accessible ;
- retrait du consentement du jeune non retardé par un conflit parental.

### 4.2 Mesures prévues ou à décider

Déjà conditions d'admission ([[D-537]] §5) :
- J3-mineurs : circuit de l'accord parental, vérification de l'autorité
  parentale, consentement du jeune **[J3]** ;
- la notice adaptée à l'âge ;
- la durée, l'engagement et l'arrêt de l'accompagnement, documentés ;
- l'accord des deux titulaires tant que l'« acte usuel » n'est pas qualifié.

Mesures que l'analyse fait apparaître, arbitrées par le responsable le
2026-11-18 (`20261118-2227-c-4`) :
- **retenue, condition de la première admission** : le jeune donne sa
  propre adresse e-mail, et pas une adresse familiale ou partagée. La règle
  est transmise au cadrage de J3-mineurs (file A), qui en fixe la forme
  **[J3]** ;
- **écartées**, sans motif exprimé :
  - fermer par le code l'export « Pour une IA externe » pour un dossier
    mineur — la suspension manuelle du 2026-11-05 reste la seule tenue ;
  - examiner la nécessité des questions intrusives pour un mineur (décision
    clinique, qui aurait suivi sa propre voie) ;
  - faire précéder la première admission du test d'intrusion, qui reste
    exigé avant toute offre commerciale (dossier, rubrique 14, ligne 10).

Obligation qui ne se discute pas, rappelée ici : les catégories propres au
mineur (§1.3) seront déclarées à la rubrique 5 avec J3-mineurs, et leur durée
de conservation fixée.

### 4.3 Risque résiduel

Jugé par le responsable le 2026-11-18 (`20261118-2227-c-5`) : **acceptable
pour les trois événements**, une fois en place les préalables de [[D-537]]
§5 et l'adresse e-mail propre. **L'accès illégitime reste le risque
principal.** Il se réexamine au cadrage de J3-mineurs, avec la forme de
l'accord parental et la règle de l'adresse e-mail.

## 5. Avis et validation

- **DPO** : aucun désigné ; pas d'obligation à cette échelle selon l'avis
  reçu ([[D-284]] §6). Pas d'avis de DPO.
- **Avis des personnes concernées** (art. 35 §9) : non recueilli, décision
  du responsable du 2026-11-18 (`20261118-2227-c-7`). Motif : la bêta ne
  compte qu'un cabinet et aucun mineur admis. Le point se reconsidère à la
  commercialisation, avec la relecture de l'avocat.
- **Avis GPT** ([[D-536]], [[D-537]]) : il est cité comme tel. Ce n'est ni un
  avis de juriste ni un avis d'avocat, et il ne vaut pas avis au sens de
  l'art. 35.
- **Validation datée du responsable** : *non faite.* Décision du 2026-11-18
  (`20261118-2227-c-6`) : elle vient **après le cadrage de J3-mineurs**. Une
  session complète alors les passages marqués **[J3]** et réexamine l'accès
  illégitime (§4.3). Le responsable valide ensuite en datant, avant la
  première admission.

## 6. Jugements du responsable

Rendus en session le 2026-11-18, questions `20261118-2227-c` à `-c-7` de la
liste commune, toutes selon l'option recommandée sauf les mesures (`-c-4`),
où une seule des quatre est retenue.

| Question | Objet | Réponse |
|---|---|---|
| `-c` | Accès illégitime | gravité importante, vraisemblance limitée |
| `-c-2` | Modification non désirée | gravité limitée, vraisemblance limitée |
| `-c-3` | Disparition | gravité limitée, vraisemblance négligeable |
| `-c-4` | Mesures nouvelles | adresse e-mail propre retenue ; trois écartées |
| `-c-5` | Risque résiduel | acceptable, accès illégitime à suivre |
| `-c-6` | Validation | après le cadrage de J3-mineurs |
| `-c-7` | Avis des personnes concernées | non recueilli, motif écrit |
