# PAT-7 — forme transverse : décision et inventaire (2026-11-21)

Suite de [`pat7-constat-prototypes.md`](pat7-constat-prototypes.md) §3.2.

- **Décision du responsable, 2026-11-21** : « F1a à F7a ». Elle est donnée en session et inscrite dans
  la liste commune, question `20261121-1633-d` (ordinaire). Toutes les familles s'alignent sur les
  planches validées :
  - fantôme aux seuls emplacements montrés ;
  - succès en vert ;
  - consigne de U17 en consigne ;
  - formulaire gelé de U35 et champ fichier natif gardés ;
  - « Réinitialiser » gardé en rouge.
- L'avis de Codex, demandé à l'aveugle (D-505), retenait les mêmes options.
- **Aucun texte d'interface, aucun prototype neuf** (D-481 §4), aucun fichier de COM-0 ni composant
  praticien.
- **Planche de décision** (artefact privé du responsable) : code livré face aux planches, une fiche
  par famille.
- **Lots**, une PR chacun :
  - PAT-7i : boutons et rayons (F1, F2) ;
  - PAT-7j : messages et champs (F3, F4) ;
  - PAT-7k : contrôles natifs (F5) ;
  - PAT-7l : largeurs et frise (F6) ;
  - PAT-7m : écarts locaux (F7).


## Inventaire

Écarts relevés par le constat de PAT-7 (#2249, mergée 57082a59 :
`docs/claude/propositions/2026-11-11-refonte-lien-etape2/pat7-constat-prototypes.md`, §2 et §3.2),
relus dans le code de `main@288e1b24` le 2026-11-21. Chaque ligne donne l'écran, ce que montre la
planche validée et ce que fait le code.

**Sources des colonnes.**
- *Planche* : feuilles de style des prototypes PAT-4 (itération 2), PAT-5 et PAT-6
  (`project/components/bundle.css`). Leurs classes sont identiques ; celle de PAT-4 déclare reprendre
  les classes du prototype PAT-2.
- *Code* : fichier:ligne relu à `main@288e1b24`.
- *Étiquettes* : *observé* = vu sur capture par le constat (#2249) ; *code* = démontré dans le code.

Contrastes calculés par la session (WCAG 2.x, sur `surface` #FFFCF7, sauf mention).

### F1 — Boutons (`PatientButton`)

| Écran | Planche | Code | Étiq. |
|---|---|---|---|
| Tout le portail | secondaire : 48 px, bord `control-border` (3,35:1), fond surface, texte pétrole | `ghost` : bord `primary/30` (≈1,5:1), fond transparent (`patient/ui/PatientButton.tsx:12`) | code |
| Tout le portail | neutre : 44 px, bord `control-border`, rayon 8 px | `neutral` : bord `border` (1,37:1), rayon 18 px (`PatientButton.tsx:13`) | code |
| U40 « Annuler » | fantôme : sans bord, souligné | `ghost` bordé (`patient/trust/SignalerProbleme.tsx:409, :453, :494`) | observé |
| U11, U12 « Sauvegarder le brouillon » | fantôme (planche PAT-4) | `ghost` bordé (`patient/GenericQuestionnaire.tsx:444`, `patient/PlaintesForm.tsx:178`) | code |
| U27, U28 « Lire la fiche » ; courriers « Ouvrir la version à imprimer » | secondaire | `ghost` (`fiches-assiette/CarteFicheRemise.tsx:40-42`, `lettre-adressage/CourrierMedecinLecture.tsx:134-136`, `courrier-complement/CourrierComplementLecture.tsx:76-78`) | code |
| U01–U09 « Précédent » | — (non tranché par la planche) | `neutral` à côté de l'action (`app/portail/[token]/page.tsx:355-358, :659-662`) | code |

Volume : 110 balises `<PatientButton>`, dont 49 `ghost`, 33 `neutral`, 2 `danger-text`, 50 primaires.
Aucun import côté praticien.

### F2 — Rayons

Jetons existants, non touchés (fondation COM-0 gelée) : `rounded-sm` 10 px, `rounded` 14 px,
`rounded-lg` 18 px (`tailwind.config.ts:186-190`, `app/globals.css:7-9`) ; `rounded-xl` = 12 px (valeur
Tailwind). La cible Lien nomme 18 px « carte patient, champ, bouton » (jeton `radius-lg`).

| Élément | Planche | Code |
|---|---|---|
| Carte | 18 px | 18 px (`patient/ui/PatientCard.tsx:18`) — conforme |
| Bouton principal, secondaire | 18 px | 12 px (`PatientButton.tsx:11-12`) ; le commentaire l.6 cite une maquette à 12 px |
| Bouton neutre | 8 px | 18 px (`PatientButton.tsx:13`) |
| Champ | 14 px | 18 px (`patient/ui/PatientField.tsx:6`) |
| Message, état | 14 px | 18 px (`patient/ui/PatientInlineMessage.tsx:20`) |
| Cartes intérieures du protocole (U21) | 14 px | 12 px (`patient-companion/DetailDuProtocole.tsx:87, :94, :131, :148`) |
| Avis « lecture datée » (U23–U25) | 14 px | 12 px (`patient/AvisLectureDatee.tsx:18`) |
| Accordéon | 14 px | 18 px (`patient/trust/DocumentTrust.tsx:34-38`) |

### F3 — Messages et états

| Écran | Planche | Code | Étiq. |
|---|---|---|---|
| Message en ligne, erreur | bloc 14 px de rayon, bord 2 px rouge, titre rouge | texte 14 px rouge sur fond rouge 10 %, sans bord (`PatientInlineMessage.tsx:6, :20`) | code |
| Message en ligne, information | fond sauge #E3EDEB, texte pétrole | fond pétrole 10 %, texte pétrole (`:7`) | code |
| Message en ligne, succès | fond vert pâle, texte vert #166534 gras | texte courant sur fond vert 10 % (`:8-11`) ; motif écrit : 4,39:1 avec l'ancien vert #15803d (arbitrage du 2026-10-10). Le jeton vaut aujourd'hui #166534 (`globals.css:211`) : 5,99:1 sur ce fond | code |
| Échec de lecture (≈20 écrans) | bloc encadré, bord rouge, « Réessayer » secondaire | `PatientErrorState` forme simple, sans cadre (`patient/PatientErrorState.tsx`) ; formes encadrées seulement sur `ProtocolCheckinForm.tsx:140, :142, :218` et `PatientCompanionHome.tsx:185, :187` | code |
| U41, erreur d'enregistrement | état cadré | `<p role="alert">` orange isolé (`patient/PropositionPackReevaluation.tsx:117-121`) | code |
| U33, U34, U40, erreurs | bloc encadré | `PatientInlineMessage` sans bord (`collecte/DepotDocuments.tsx:197, :236, :239`, `TransmissionCompteRendu.tsx:212, :254, :257`, `SignalerProbleme.tsx:153, :403, :447, :488`) | observé |
| U17, consigne « journée incomplète » | consigne : bord `control-border`, fond sauge, `role="status"` | erreur rouge `role="alert"` (`patient/agenda-alimentaire/SaisieJourneeForm.tsx:286-288`). Q12 a de PAT-4 (`20261113-1442-d`) a rendu le bouton actif sans fixer le ton | code |
| U20, aide sous l'envoi échoué | absente | « Si le problème persiste, contactez votre praticien. » (aide par défaut, `PatientErrorState.tsx:26`) | code — **texte, hors de cette question** |

Contrastes : rouge #b91c1c 6,3:1 sur surface (jeton) ; vert #166534 5,99:1 sur sa teinte.

### F4 — Champs (`PatientField`)

| Élément | Planche | Code |
|---|---|---|
| Hauteur | 48 px | 44 px (`PatientField.tsx:6`, `min-h-11`) |
| Texte | 16 px | 14 px (`text-sm`) |
| Bord | `control-border` (3,35:1) | `border` #DFD9CD (1,37:1). La cible Lien : `border` « ne délimite jamais un contrôle » |
| Rayon | 14 px | 18 px |
| Libellé | 15 px, 500 | 14 px, `muted-foreground` (`PatientField.tsx:60`) |

Volume : 35 `<PatientField>` et 48 références à `patientInputClassName`, toutes côté patient.
**Exception** : le formulaire de traitements de U35 vient de
`physio-traitements/FormulaireTraitement.tsx:150` (même forme 14/44), fichier COM-0 gelé et partagé
avec le panneau praticien. Il ne change que par un micro-lot COM-n.

### F5 — Contrôles natifs

| Écran | Planche | Code | Étiq. |
|---|---|---|---|
| U33 catégories | options en cartes 48 px, bord `control-border`, choisie en bord 2 px pétrole | radios natifs 20 px dans un libellé de 44 px (`collecte/DepotDocuments.tsx:211`) | observé |
| U07 choix | tuiles 48 px, 15 px, rayon 14 | `<button aria-pressed>` 44 px, 14 px, rayon 18 (`app/portail/[token]/page.tsx:381-398`) | code |
| U33, U34 champ fichier | zone pointillée et bouton secondaire | `<input type="file">` natif (`DepotDocuments.tsx:226`, `TransmissionCompteRendu.tsx:244`). L'habiller impose des textes visibles neufs | observé |
| Conditions (entrée et U38), U37, U34 | volets bordés, en-tête 48 px, chevron | `<details>` natif sans chevron, en-tête 14 px (`trust/DocumentTrust.tsx:34-38`) | code |
| U39 (choix) | volets à chevron | `<details>` natif (`trust/MesChoix.tsx:101-102`) | code |
| U10 « Transmis au praticien » | volet à chevron, comme « Mon accompagnement » | `<summary>` natif en capitales 14 px, triangle à gauche (`questionnaires/page.tsx:598-599`) ; le volet à chevron existe déjà l.517-521 | observé |

Questionnaires (`patient/QuestionField.tsx:50`) : déjà en cartes, hors écart.

### F6 — Largeurs et frise de U09

| Écran | Planche | Code | Étiq. |
|---|---|---|---|
| U01–U08 (entrée) | colonne 560 px (constat §2.1) | 448 px (`max-w-md`, `page.tsx:840, :854`) | observé |
| U09 (fin) | 672 px | 448 px (`page.tsx:910-914` ; `DoneScreen`, `:678-680`) | observé |
| U09 frise | six étapes visibles ; 3 × 2 au téléphone | une ligne qui défile dans 448 px : « Analyse du praticien » coupé, « Restitution » hors champ (`patient/PatientJourneyProgress.tsx:67-74`) | observé |
| Autres pages (PAT-4 à PAT-6) | 672 px | 672 px (`PatientCard` par défaut `max-w-2xl`) — conforme | code |

La frise sert aussi l'entrée (`page.tsx:863`) et le hub (`questionnaires/page.tsx`).

### F7 — Écarts locaux

| Écran | Planche | Code | Étiq. |
|---|---|---|---|
| Repères (18 lieux : étapes, suffixes, frise) | `muted-foreground` plein (5,84:1) | `text-muted-foreground/70` : **3,08:1**, sous le seuil AA de 4,5:1 pour un texte de 12-13 px (`GenericQuestionnaire.tsx:253, :339, :366, :451`, `PlaintesForm.tsx:125, :147, :185`, `QuestionField.tsx:90`, `PatientField.tsx:57`, `PatientJourneyProgress.tsx:55`, `questionnaires/page.tsx:586`, `page.tsx:598, :620, :627`, `layout.tsx:120`, …) | code |
| Pages de questionnaire, titre | 24 px Lora | 18 px (`questionnaires/[idAssignation]/page.tsx:37`) | code |
| U09 titre « Merci ! » | 24 px | `h1` 20 px (`page.tsx:687`, posé par PAT-7h) | code |
| Pages de questionnaire, badge d'état | pastille bordée `control-border` | texte simple 12 px (`[idAssignation]/page.tsx:38`) | code |
| U23–U25 avis « lecture datée » | fond sauge | fond surface (`AvisLectureDatee.tsx:18`) | code |
| U21, U27, U29 « En pause » | encart sable | capitales sans encart (`CarteFicheRemise.tsx:33`, `FicheRemiseLecture.tsx:74`) ; encart pétrole pâle sur U21 (`DetailDuProtocole.tsx:94`) | code |
| U21 cartes d'action | fond plein | bordées et teintées (`DetailDuProtocole.tsx:87, :131, :148`) | observé |
| U24 synthèse | fond de voix | carte simple (`ComprehensionView.tsx`, vers l.185) | code |
| U34, U35 titre | au-dessus de la carte | dans la carte (`TransmissionCompteRendu.tsx:192`, `DepotDocuments.tsx:172`) | observé |
| U22 | « Réinitialiser le brouillon local » discret, une carte, titres en casse normale, bandeau sable | rouge `danger-text` en haut (`food-observation/PatientFoodObservationPanel.tsx:629-632`), deux cartes, capitales, bandeau gris | observé |
| U11, U12 Précédent / Suivant | — | côte à côte au téléphone (`PlaintesForm.tsx:154`, `GenericQuestionnaire.tsx:420`) | observé (constat §2.3) |
| U01–U08 | — | « Étape n sur 4 » sous le titre ; indicateur de brouillon sans `role="status"` ; ligne de version dans le bloc sable du consentement | code (constat §2.1) |

### Déjà tranché ou hors de cette question

- **Q5a de PAT-5** (`20261113-1834-d`, close) : **appliquée**. PAT-7g (#2259, 25350346) a posé
  `print:hidden` sur « Lire la fiche » (`CarteFicheRemise.tsx:40`) et « J'en ai pris connaissance »
  (`trust/ConditionsUtilisation.tsx:70`). Plus rien en suspens.
- **Titres en Lora** (U26, U29–U34, U36) et **`h1` de U09** : livrés par PAT-7h (#2276, 97d1e4f4).
- **Succès en texte courant** : arbitrage du 2026-10-10, motivé par l'ancien vert ; repris en F3.
- **Consigne de U17** : Q12 a de PAT-4 a tranché le geste, pas le ton ; repris en F3.
- **Textes** (hors de cette question, aucun texte n'est touché) : aide de U20, « Imprimer ou
  enregistrer en PDF » de U21, « (N questionnaires) » de U41 (Q2 de PAT-3, non tranchée par écrit),
  encart d'urgence de U08 et fond de U36 (textes gelés).
- **Décor** : aucun avant COM-1 (reporté).
- **En-tête de U10** : après PAT-3b.
- **Liste commune** : aucune question ouverte ou répondue sur les boutons, les rayons, les champs,
  les messages, les contrôles natifs ni les largeurs du portail patient (relu le 2026-11-21, 559 lignes).
- **DOC-n** : aucun ouvert (dernier mergé : DOC-18, #2280) ; aucune PR de la refonte ouverte.
