# PAT-7 partiel — constat à l'écran des écrans patient livrés (2026-11-16)

PAT-7 est ouvert en partie, sur les écrans déjà livrés. C'est la réponse du
responsable du 2026-11-16 (« PAT-7 en partie », liste commune
`20261116-0826-d`). L'en-tête de U10 sera revérifié après PAT-3b, qui attend
COM-1. Ce document ne décide rien et ne change aucun code. Il mesure, puis
propose des lots nommés (`plan-patient.md`, PAT-7 : « Les écarts restants
deviennent des lots nommés »).

Étiquettes (`D-125`) :
- *observé sur fixture* : vu à l'écran, en local, sur un patient fictif ;
- *démontré dans le code* : lu dans le code, sans occurrence observée ;
- *non vu* : rien ne permet de conclure.

Aucun constat ne dit ce que vit un patient réel.

## 1. Méthode

- **Code servi.** Build de production local (`next start`) de `origin/main`,
  en trois passes :
  - première passe sur `cbe52d14`, interrompue après U10 par un défaut du
    spec de mesure ;
  - passe principale sur `3934c3a2` ;
  - passe ciblée sur `2552ce3b`.

  Entre `cbe52d14` et `2552ce3b`, `git diff` est vide sur
  `web/src/app/portail`, `web/src/components/patient`,
  `web/src/components/patient-companion` et `globals.css`.
- **Base.** Base PostgreSQL locale du worktree (`scripts/wn-dev-db.sh`),
  avec les trois fixtures. Sophie Nicola (`PAT_SEED_01`) porte les écrans
  après l'entrée ; Jennifer Martin (`PAT_SEED_02`) porte l'entrée.
- **États posés par les helpers E2E.** Accusé d'entrée, dossier à deux voix,
  bilan transmis, une assignation BDI et une assignation de plaintes.
- **Drapeaux.** Ceux de `playwright.config.ts`, plus ceux qu'aucun E2E
  n'arme : `WN_PORTAIL_DEPOT_DOCUMENTS`, `WN_PHYSIO_TRAITEMENTS`,
  `WN_PORTAIL_PROTOCOLE_IMPRIMABLE`, `WN_PORTAIL_BIBLIOTHEQUE`,
  `WN_FICHES_ASSIETTE_LECTURE`, `WN_DOCUMENT_MEDECIN_PATIENT`,
  `WN_LETTRE_ADRESSAGE_PATIENT`, `WN_COURRIER_COMPLEMENT` et
  `WN_PORTAIL_MES_ECHANGES`. Ce constat ne dit rien de leur position en
  production.
- **Outil.** Un spec Playwright de constat, local, non versé, joué sur les
  deux projets du dépôt.
- **Réglages par écran.**
  - Desktop Chromium : 1 440, 1 024, 768 et 390 px ; zoom 200 % (1 280 px
    rendus à 640 px CSS) ; confort 112,5 % à 1 024 et à 390 px.
  - iPhone 13 (WebKit) : 390 px ; zoom 200 % (195 px CSS, la convention de
    `portail-message-securite.spec.ts`) ; confort 112,5 %. Puis 320 px, avec
    et sans confort, pour les six écrans qui débordaient (§3.5).
- **Mesures.**
  - débordement horizontal ;
  - cibles de moins de 44 px, hors liens dans une phrase et contenus d'un
    `<details>` fermé ;
  - titres `h1` et repères ;
  - axe WCAG 2.1 AA, à 1 024 px et sur iPhone ;
  - parcours au clavier jusqu'à 60 tabulations (anneau visible, élément
    hors vue ou de taille nulle) ;
  - animations et transitions sous mouvement réduit, système puis réglage
    patient ;
  - impression ;
  - lectures `GET /api/portail/**` forcées en 500.

**Écrans vus** : U01, U02, U03-U09 (l'entrée, à l'état où la fixture la
laisse), U10 sans l'en-tête, U11 et U12 (« Avant de commencer » d'un
questionnaire), U20 à U28, U30 à U38. Deux écrans se sont réorientés :
- U21 renvoie au hub : aucun protocole n'est diffusé à la fixture ;
- U38 renvoie à U37 (`/conditions` vers `/informations`).

## 2. Ce qui tient

- **axe WCAG 2.1 AA** : 0 violation sur tous les écrans vus, Chromium et
  WebKit.
- **Clavier** (Chromium) : aucun focus sans anneau, hors vue ou de taille
  nulle. « Aller au contenu » vient en premier partout.
- **Mouvement réduit.** Avec la préférence système comme avec le réglage
  patient (`data-reading-motion="reduced"`), il ne reste ni animation en
  cours ni transition déclarée. Sans réglage, seules des transitions de 0,15
  à 0,24 s restent, sur boutons et chevrons.
- **Bureau, de 1 440 à 390 px**, confort 112,5 % compris : aucun débordement
  horizontal. Au zoom 200 % du bureau (640 px CSS) non plus.
- **Navigation.**
  - Dès 1 024 px, la seule navigation est « Mon espace ».
  - Sous 1 024 px, « Accès rapides » apparaît selon la page.
  - Le hub garde la frise à toute largeur et « Autres espaces » sous
    1 024 px (AM-2).
  - Aucune navigation sur l'entrée ni sur « Avant de commencer » d'un
    questionnaire.
- **Impression.** Ni rail ni menu à l'impression, sur aucun écran. La frise
  du hub s'imprime ; « Autres espaces » s'imprime aussi sur iPhone.
- **États dégradés.** Une lecture en 500 affiche le message servi. Sauf sur
  U24 et U25 (§3.4), elle propose « Réessayer » et le renvoi au praticien.
  Rien ne simule un succès. Le second point du §3.4 porte sur un refus 404,
  pas sur une lecture en 500.

## 3. Écarts

Règles citées : catalogue `ui-ux-pro-max`, relu avec `scripts/search.py`
(domaine `ux`) et `references/quick-reference.md`. Le seuil du dépôt est
44 px (`plan-patient.md`, réception de PAT-1). Le minimum WCAG 2.2 est 24 px,
avec ses exceptions (`web-target-size`).

### 3.1 Contrôles natifs sous 44 px — *observé sur fixture*

Mesure : la taille du contrôle seul. La zone cliquable de son libellé n'est
pas mesurée, ce qui peut ramener certains cas dans l'exception de
`web-target-size`.

| Écran | Contrôle | Bureau | WebKit 390 |
|---|---|---|---|
| U11, U12 « Avant de commencer » | case de consentement | 13×13 | 12×12 |
| U22 carnet alimentaire | cases à cocher | 13×13 | 12×12 |
| U22 carnet alimentaire | sept listes déroulantes | 606×43 | 292×**24** |
| U33 dépôt | quatre boutons radio de catégorie | 20×20 | 20×20 |
| U33 dépôt | champ fichier | 606×31 | 292×30 |
| U35 renseignements | quatre boutons radio (sexe) | 13×13 | 12×12 |

Sous WebKit, la liste déroulante native fait 24 px de haut : c'est le seul
cas où un contrôle tombe au minimum WCAG, au téléphone. Règles :
`touch-target-size` (élevée) et `web-target-size` (élevée).

### 3.2 Liens isolés de 20 à 23 px — *observé sur fixture*

Ce sont des liens qui ne sont pas dans une phrase :
- « Lire ce que mon praticien a compris » (hub, 259×20) ;
- « Commencer « BDI » » et « Commencer « Plaintes » » (hub, 20 px) ;
- « Répondre à ce texte » (U25, 23 px) ;
- « Déposer ce qui compte pour moi aujourd'hui » (U25, 23 px) ;
- « ← Mon parcours » (U37, 23 px).

Règle : `touch-target-size`.

Les numéros d'urgence du pied de page (3114, 15, 112, 114 : 18 à 20 px) et
« Confidentialité et droits » (15 px) sont dans une phrase : c'est
l'exception « inline » de WCAG. Ce document ne propose rien sur le pied
d'urgence (texte de sécurité, hors périmètre).

### 3.3 Titres de page

- U30, U31, U32, état vide (« Aucun document n'est à remettre à votre
  médecin pour l'instant. ») : aucun `h1`. *Observé sur fixture* et
  *démontré dans le code* : `PourVotreMedecinLecture.tsx:140` ne rend le
  titre que lorsqu'un document existe. Règle : `heading-hierarchy`
  (moyenne).
- Deux `h1` sur une page.
  - U11 et U12 (titre du questionnaire, puis « Avant de commencer ») :
    *observé sur fixture* aux trois passes.
  - Hub, quand la lecture du suivi échoue (« Mon parcours », puis « Votre
    accompagnement ») : *démontré dans le code*.
    `PatientCompanionHome.tsx:166-172` rend `PatientPageHeader`, en `h1` par
    défaut, dans sa branche d'erreur. Observé à la première passe
    seulement : aux deux suivantes, la fixture portait une assignation
    lisible, et la branche d'erreur n'était plus atteinte.

  Règle : `heading-hierarchy` (moyenne).

### 3.4 Reprise après une erreur de lecture

- **U24 et U25 : le message d'erreur seul, sans « Réessayer ».** *Observé
  sur fixture* et *démontré dans le code* : `ComprehensionView.tsx:128` et
  `DossierDeuxVoixView.tsx:336`. Les autres lectures gardent « Réessayer »
  (réponse 7 (b) de l'étape 1). Règle : `error-recovery` (moyenne).
- **Hub, « Mon accompagnement » : « Réessayer » sous « Suivi non
  reconnu. ».**
  - [[D-488]] §7 (Q-E2-5 (a)) le retire « dans ce seul cas » sur le point
    de suivi (U20, `ProtocolCheckinForm.tsx:50`).
  - *Démontré dans le code* : `PatientCompanionHome.tsx:166-172` rend
    « Réessayer » pour tout refus autre que 401, donc aussi pour ce 404.
  - Observé à la première passe seulement (`cbe52d14`), quand la dernière
    assignation de la fixture était refusée par
    `isSessionAuthorizedForAssignment`. Il n'a pas été revu aux deux passes
    suivantes : la fixture portait alors une assignation lisible. Le code
    du portail ne change pas entre les passes (§1).
  - Il faudrait une décision pour étendre §7 au hub ; ce document ne la
    prend pas.

### 3.5 Zoom 200 % au téléphone (195 px CSS) — *observé sur fixture, WebKit*

| Écran | 195 px | 320 px | 320 px, confort 112,5 % | Éléments |
|---|---|---|---|---|
| U37, U38 informations | 114 px | 0 | **28 px** | « ← Mon parcours », pastilles « Non autorisé », « Non proposée » |
| U10 hub, suivi refusé (première passe seulement, §3.4) | 73 px | non vu | non vu | titre « Votre accompagnement », « Réessayer » |
| U26 bilan | 54 px | 0 | 0 | non identifié (élément rogné) |
| U35 renseignements | 39 px | 0 | 0 | `h1` « Ma fiche de renseignements » |
| U10 hub, U21 | 6 px | 0 | 0 | icône de la frise |
| U34 comptes rendus | 1 px | 0 | 0 | « J'en ai pris connaissance » |

**Lecture.**
- À 320 px, la largeur du critère WCAG 1.4.10, il ne reste qu'un
  débordement : U37 et U38 en confort 112,5 % (28 px, le lien « ← Mon
  parcours »). Règle : `horizontal-scroll` (élevée).
- Les autres débordements n'existent qu'à 195 px, plus strict que WCAG. Le
  dépôt prend pourtant ce réglage comme référence de zoom 200 % au
  téléphone ([[D-506]], `portail-message-securite.spec.ts`). Leur
  sévérité est donc celle d'une convention du dépôt, pas d'un critère
  normatif : moyenne.
- La mesure à 320 px a été jouée sur WebKit, sur `2552ce3b`, pour les six
  écrans du tableau.

### 3.6 Rail « Mon espace » : entrées de deux lignes collées — *observé sur fixture*

À 1 024 et à 1 440 px, deux entrées de deux lignes à la suite se touchent,
sans espace visible : « Ma fiche de renseignements » puis « Transmettre un
compte rendu d'analyses ». Une entrée d'une ligne est centrée dans sa
hauteur minimale de 44 px ; une entrée de deux lignes la dépasse (48 px) et
perd l'écart. Règle : `touch-spacing` (moyenne).

### 3.7 Observations hors interface

- À chaque chargement d'une page du portail, une douzaine de réponses 503 et
  six ou sept 404 paraissent dans la console. Ce sont les lectures des
  surfaces dont le drapeau est éteint dans ce banc. Rien n'est cassé à
  l'écran, mais chaque page fait une vingtaine de requêtes. Signalé
  seulement.
- `WN_PORTAIL_PROTOCOLE_IMPRIMABLE`, `WN_PORTAIL_BIBLIOTHEQUE`,
  `WN_FICHES_ASSIETTE_LECTURE`, `WN_DOCUMENT_MEDECIN_PATIENT`,
  `WN_LETTRE_ADRESSAGE_PATIENT`, `WN_COURRIER_COMPLEMENT` et
  `WN_PORTAIL_MES_ECHANGES` ne sont armés par aucun E2E : U21 imprimable,
  U27, U28, U30 à U32 et U36 n'ont pas d'E2E qui ouvre l'écran. Signalé
  seulement.

## 4. Lots nommés proposés

Aucun n'est ouvert ; chacun attend le choix du responsable.

| Lot | Objet | Texte neuf ? | Préalable |
|---|---|---|---|
| PAT-7a — Cibles des contrôles | §3.1, §3.2, §3.6 : zone cliquable de 44 px des contrôles natifs (libellé compris), des liens isolés et des entrées du rail | non | mesurer d'abord la zone du libellé |
| PAT-7b — Titres de page | §3.3 : un `h1` dans l'état vide de U30 à U32 (titre existant de la page), un seul `h1` par page | non, si le titre existant suffit | — |
| PAT-7c — Zoom 200 % au téléphone | §3.5 : d'abord le seul débordement à 320 px (U37, U38 en confort 112,5 %) ; ensuite, au choix du responsable, ceux de la convention à 195 px | non | — |
| PAT-7d — Reprise sur erreur | §3.4 : « Réessayer » sur U24 et U25 ; hub sous « Suivi non reconnu. » | emplacement neuf d'un texte existant | décision : étendre [[D-488]] §7 au hub, inscrire l'emplacement par un DOC-n |

## 5. Non couvert par cette passe

- **Lecteur d'écran réel** (VoiceOver, NVDA) : *non vu*. axe et la
  structure ne le remplacent pas.
- **Téléphone réel** : *non vu*. WebKit simulé seulement ; la mesure sur
  iPhone réel de `20261113-1302-d` reste due.
- **Comparaison aux prototypes** (PAT-2 à PAT-6) : non faite dans cette
  passe.
- **Écrans non vus.**
  - U13 à U17 (réponses, transmises, agendas) et U29 (une fiche remise).
  - U39 à U41 (choix, signalement, réévaluation) : leur état demande une
    préparation de fixture.
  - U21 imprimable avec un protocole diffusé.
  - Les étapes de l'entrée (U03 à U09) une par une.
- **M1, l'état du rail à la traversée d'un questionnaire.** L'arbitrage
  reste dû à PAT-7 : amender [[D-482]] §1 par un DOC-n, ou chercher un
  porteur d'état. Il n'est pas tranché ici.
- **L'en-tête de U10** : après PAT-3b.
