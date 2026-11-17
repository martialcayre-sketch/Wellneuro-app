# PRA-6 — constat à l'écran des écrans praticien livrés (2026-11-17)

PRA-6 vérifie l'ensemble des fiches livrées par PRA-1 à PRA-5
(`plan-praticien.md`, PRA-6 ; cadrage v3 l.540-553 côté praticien). Ce
document ne décide rien. Il mesure, compare aux prototypes validés de
l'étape 3, et propose des lots nommés. Une seule correction entre dans le lot,
parce qu'elle est minime, sans texte et sans décor : PRA-6a (§5), en PR de
code séparée.

Étiquettes (`D-125`) :
- *observé sur fixture* : vu à l'écran, en local, sur un dossier fictif ;
- *démontré dans le code* : lu dans le code, sans occurrence observée ;
- *non vu* : rien ne permet de conclure.

Aucun constat ne dit ce que vit le praticien sur un dossier réel.

## 1. Méthode

- **Connexion.** L'OAuth Google n'est pas automatisable. Le dépôt fournit un
  cookie de session praticien fabriqué (`web/e2e/helpers/auth.ts`,
  `praticienSessionCookie`), celui des E2E : le contrôle à l'écran a donc été
  possible, en local, sans compte réel.
- **Base E2E (T2).** Le CI de `main` à `c5f99846` (Chromium et WebKit, build
  de production, 39 specs praticien) était vert au départ. Celui de
  `f18545d2` est rouge sur un seul test, patient :
  `portail-rail-lateral.spec.ts:128`, 1 échec sur 423. Il est jugé étranger
  au lot sur trois faits. Entre `e9d1bd04` (merge de #2224, CI vert) et
  `f18545d2`, seuls trois fichiers de garde du cockpit changent, aucun du
  portail. Le même test est vert dans le T2 local de PRA-6a (423 sur 423).
  Le CI de `58993aac`, tête suivante, est vert. Ce rouge reste à instruire
  s'il revient : un rouge ne se relance pas.
- **Code servi.** Build de production local (`next start`) :
  - `c5f99846` pour la passe principale (35 écrans) ;
  - `f18545d2` pour P51, P52 et la fiche, après le merge de la PR 3 de PRA-5
    (#2224), avec les trois fichiers de PRA-6a.

  Les numéros de ligne cités sont ceux de `58993aac`, tête de `main` à la
  rédaction et base de PRA-6a. Aucun des fichiers cités ne change entre
  `f18545d2` et `58993aac`. Entre `c5f99846` et `f18545d2`, seuls
  `FichePatientPanel.tsx` et `SynthesePanel.tsx` changent (#2224) : leurs
  constats ont été revus sur `f18545d2`.
- **Base.** Base PostgreSQL locale du worktree (`scripts/wn-dev-db.sh --seed
  --demo`). La fiche est vue sur `PAT_DEMO_01` (Sophie Nicola,
  démonstration) : anamnèse et passations y sont renseignées.
- **Drapeaux.** Ceux de `playwright.config.ts`, plus `WN_PHYSIO_TRAITEMENTS`,
  `WN_BIO_LECTURE_ENABLED`, `WN_BIO_CONSTAT`, `WN_C5_ENABLED`,
  `WN_CONSTAT_BESOIN`, `WN_DECISIONS_PARCOURS` et `WN_AGENDA_ALI`, pour voir
  ces surfaces. Ce constat ne dit rien de leur position en production.
- **Outil.** Un spec Playwright de constat, local, non versé (adapté de
  l'outillage de PAT-7). Il est joué sur trois projets : Desktop Chromium,
  Desktop WebKit (projet local ajouté) et iPhone 13 (WebKit).
- **Réglages.**
  - Chromium : 1 440, 1 280, 834 et 390 px ; zoom 200 % (1 280 px rendus à
    640 px CSS).
  - WebKit bureau : 1 440, 1 280 et 834 px, et zoom 200 %.
  - iPhone 13 : 390 px ; zoom 200 % à 195 px CSS (convention du dépôt, comme
    PAT-7) ; puis 320 px pour les écrans qui débordaient à 195 px.
- **Mesures.**
  - débordement horizontal ;
  - cibles de moins de 44 px, libellé compris, hors liens dans une phrase et
    hors contenu d'un `<details>` fermé ;
  - `h1` et sauts de niveau de titre ;
  - axe (WCAG 2.0, 2.1 et 2.2 AA) à 1 280 et à 390 px ;
  - parcours au clavier jusqu'à 60 tabulations (Chromium) : premier arrêt,
    anneau, élément hors vue ou caché ;
  - animations et transitions sous `prefers-reduced-motion` ;
  - impression émulée ;
  - lectures `GET /api/**` forcées en échec, sous deux formes : 500 en JSON
    hors contrat (`{error}`) et 502 en HTML (corps illisible) ;
  - focus après un « Réessayer » réussi (P51, P52).

**Écrans vus** (fiches du catalogue révisé) : X01, P01, P02, P04 et les sept
phases de la fiche (P05, P08, P11, P12, P15, P20, P21), ses cinq onglets
(P22 à P25, P30), P33 à P37, P40, P44 à P47, P49, P51 à P54, P57. Deux
écrans répondent 404, gardes fermées comme attendu : P50 (positions
d'expert, `WN_POSITIONS_EXPERT`) et `bibliotheque/options`, hors
catalogue. `bibliotheque` et `biologie` renvoient à leur rayon.

## 2. Ce qui tient

- **Quatre largeurs, Chromium et WebKit** : aucun débordement horizontal à
  1 440, 1 280, 834 et 390 px, ni au zoom 200 % du bureau (640 px CSS), sur
  aucun écran vu. *Observé sur fixture.*
- **axe** : 0 violation sur X01, P01, P33 à P36, P40, P44 à P46, P49, P51 à
  P54, P57, dans les trois projets. Les autres sont au §3.
- **Clavier.** « Aller au contenu » est le premier arrêt de tabulation sur
  tous les écrans servis (T-16). Aucun focus hors vue, de taille nulle ou dans
  une zone cachée. Le rail se parcourt dans l'ordre de PRA-1. *Observé sur
  fixture* (Chromium).
- **Mouvement réduit** : sous `prefers-reduced-motion`, aucune animation en
  cours ni transition déclarée, sur tous les écrans vus.
- **Impression** (X06) : ni navigation ni rail à l'impression, sur tous les
  écrans vus.
- **Titres** : un seul `h1` et aucun saut sur tous les écrans hors de la
  fiche, P51 (« Synthèse IA & Booklet ») et P52 (« Documents contextuels »)
  compris.
- **États dégradés** sous un 502 HTML : chaque lecture en échec le dit, sans
  vide maquillé. « Réessayer » est présent là où D-488 l'a placé (T-17 :
  Patients, Agenda, fiche, Bibliothèque ; T-74 à T-76 : P51, P52). Sur
  P35, P36 et P54, l'échec est dit sans « Réessayer », comme validé à PRA-2.
- **PRA-5 PR 3 (#2224)**, vue sur `f18545d2` : P51 et P52 tiennent aux quatre
  largeurs (h1, axe 0, échecs dits, « Réessayer » ciblé). Q10, aucun lien qui
  quitte la fiche en mode consultation, est couverte par
  `e2e/mode-consultation-liens.spec.ts` (clic et clavier), vert au CI de
  `e9d1bd04`.
- **Prototypes validés** (§4) : PRA-2 Q1 à Q11, PRA-3a, l'échantillon de
  PRA-3b, PRA-4 Q1 à Q13 et PRA-5 (P34, X06) sont tenus dans le code, à
  quelques écarts près (§4).

## 3. Écarts

Règles citées : catalogue `ui-ux-pro-max` (`scripts/search.py`, domaine
`ux`, et `references/quick-reference.md`). Le seuil du dépôt est 44 px pour
tout contrôle praticien (prototypes PRA-3b à PRA-5) ; le minimum WCAG 2.2 est
24 px.

### 3.1 Champs sans nom accessible — *observé sur fixture* (axe, critique)

| Écran | Champ | Code |
|---|---|---|
| P02 Patients | liste « Tri : nom / Tri : email » | `dossier/RayonPatientsPanel.tsx:478` |
| P37 Questionnaires | « Pack * » et « Patient * » (le premier choix sert de libellé) | `PacksPanel.tsx:560`, `:570` |
| P37 Questionnaires | date limite (aucun libellé) | `PacksPanel.tsx:576` |
| P37 Questionnaires | filtre des assignations par statut | `bibliotheque/AssignationsPacksPanel.tsx:398` |

Règles : `form-labels` et Input Labels (élevée). Un nom accessible est un
texte : il faut l'inscrire dans D-488 avant de le poser.

S'y ajoute, routé par la session PRA-5 : sur P52, les deux listes ont le même
nom accessible (revue `wn-reviewer` de #2224, constat 5). *Non vu* par cette
passe.

### 3.2 Robustesse des lectures

- **Une réponse hors contrat fait tomber toute la page.** *Observé sur
  fixture*, sous un 500 JSON `{error}` : P01, la fiche (P04 à P30) et P53
  basculent sur l'erreur globale (« Une erreur est survenue ») au lieu de dire
  l'échec dans le panneau concerné. *Démontré dans le code* pour la fiche :
  `FichePatientPanel.tsx:959` lit `data.patient.email` dès que la réponse ne
  porte pas `unavailable`, sans tester `r.ok`. Les routes du dépôt rendent
  leur contrat (`unavailable: true`) même en 500 : le cas suppose une réponse
  d'un autre émetteur. Sous un 502 HTML, ces écrans disent bien l'échec.
  Règle : `error-recovery` (moyenne).
- **Focus après un « Réessayer » réussi** : il tombe sur `body` (P51, P52).
  *Observé sur fixture* (Chromium). Même cas au copilote, selon le handoff
  de PRA-5 PR 2. Règle : `focus-management` (moyenne). Où rendre le focus est
  un choix de conception.
- **Aperçu d'un questionnaire (P37)** : la zone d'aperçu est `aria-hidden`,
  mais ses champs restent atteignables au clavier (axe `aria-hidden-focus`,
  sérieux). *Démontré dans le code* : `BibliothequePanel.tsx:624`.
- **Atelier corpus (P47)** : une `<dl>` mal formée (axe `definition-list`,
  sérieux). *Observé sur fixture.*

### 3.3 Deux courses dans `SynthesePanel` (P51) — *démontré dans le code*

Elles ont été routées par la revue `wn-reviewer` de #2224, qui ne les a pas
introduites. Elles sont antérieures à cette PR et relues ici :

- `onLoadBooklet` (`SynthesePanel.tsx:446-470`) n'attache pas sa réponse à
  la synthèse demandée. On prévisualise le booklet de A, puis on ouvre B
  avant la réponse : le HTML de A s'affiche alors dans l'aperçu de B. On peut
  cocher « J'ai relu… » et envoyer B après avoir relu A. **Cela touche la
  garde de relecture avant envoi.**
- Après une génération, une action ou un envoi, `loadSyntheses(selectedPatient)`
  lit le patient de la closure (`:188`, puis `:283` à `:512`). Si le patient a
  changé pendant la requête, la liste de l'ancien patient s'affiche sous le
  titre du nouveau.

Aucune occurrence observée : la fréquence ne se déduit pas.

### 3.4 Cibles sous 44 px — *observé sur fixture*

| Écran | Contrôle | Taille |
|---|---|---|
| Fiche, toutes vues | « ← Retour aux patients », « ← Retour aux fiches-trajectoires » | 23 px de haut |
| Fiche, la plupart des vues | « Y aller » | 62×36 |
| P11, P22 | replis « Motif — B1 » à « B8 » | 22 px |
| P23 Alimentation | « Réinitialiser le brouillon local » | 18 px |
| P23 Alimentation | « ← Retour fiche patient » ; radios « accepter », « modifier » (libellé compris) | 23 px |
| P01 Fil | six liens de nom de patient du rail ; repli « File d'envoi » | 23 px |
| P01 Fil | liens d'action des cartes, « Rappeler », « Débloquer » | 36 px → **corrigé par PRA-6a** |
| P53 | repli « Correspondance récente » | 23 px |
| P02, P25, P37, P44, P47, P51, P52 | listes déroulantes natives, **sous WebKit seulement** | 20 à 24 px |

La dernière ligne est la plus large. Sous WebKit (bureau et iPhone), une
`<select>` native ignore `min-height` : la classe de 44 px posée par PRA-4 et
PRA-5 (`CLASSE_SELECT`, `className` des écrans) ne tient qu'en Chromium.
Règles : `touch-target-size` et `web-target-size` (élevées).

### 3.5 Titres de la fiche — *observé sur fixture*

La fiche (P04 à P30) n'a aucun `h1` : le nom du dossier est un `h2`
(`FichePatientPanel.tsx:2448`). C'est conforme à la planche de PRA-3a, mais
tous les autres écrans praticien ont désormais un `h1` (PRA-2 Q2, PRA-4 Q1,
PRA-5). Règle : `heading-hierarchy` (moyenne). Le changer contredirait une
planche validée : il faut un arbitrage.

### 3.6 Contraste du statut des phases — *observé sur fixture* (axe, sérieux)

Dans le rail des phases, le statut d'une phase « en attente » (`text-2xs
text-muted-foreground`, sur le fond `bg-accent/10`) n'atteint pas 4,5:1
(`FichePatientPanel.tsx:2941`). On le voit sur toutes les vues de la fiche,
en Chromium et en WebKit. Règle : `color-contrast` (élevée).

### 3.7 Zoom 200 % au téléphone

- **À 320 px** (critère WCAG 1.4.10) : l'import d'un compte rendu, dans
  l'onglet Biologie (P25), déborde de 62 px. En cause, le libellé et le champ
  fichier (« Compte rendu (PDF de 10 Mo, … ») : ils ne se replient pas. P46
  déborde de 5 px, élément non identifié. *Observé sur fixture*, Chromium et
  WebKit. Règle : `horizontal-scroll` (élevée).
- **À 195 px** (convention du dépôt, plus stricte que WCAG) : seize écrans
  débordent, de 7 à 187 px. Ce sont P01 (91), P25 (187), P33 (75), P34
  (17), P35 (33), P36 (57), P37 (73), P40 (99), P44 (77), P46 (130), P47
  (40), P49 (94), P51 et P52 (7), P53 (74) et P57 (73). À 320 px, tous
  tiennent sauf P25 et P46. Leur sévérité est celle d'une convention, pas d'un
  critère normatif : moyenne. Sur P49, à 320 px, la liste « Intention
  clinique » est rognée par son conteneur, sans défilement de la page.

### 3.8 Jetons et icônes — *démontré dans le code*

- **Icônes.** Une vingtaine d'icônes ont un trait de 2 px au lieu de
  `TRAIT_ICONE` (1,75, PRA-2) : `FichePatientPanel.tsx` (onze), puis
  `PatientPreview`, `ExportDossierPanel`, `ui/ModeConsultation`,
  `ui/BanniereDiffere` et `ui/TwoLevelReading`. Quatre autres n'ont pas de
  trait explicite (`fil/InboxQuestionnaires`, `PhysioTraitementsPanel`,
  `DecisionsParcoursPanel`).
- **Classes sans jeton.** `bg-card` n'existe pas dans les jetons et reste
  sans effet (`patient-cockpit/ComprehensionPanel.tsx:269`). Il en allait de
  même de `text-destructive` sur cinq messages d'erreur
  (`besoins/ConstatsBesoinPanel.tsx`, `PractitionerFoodObservationPanel.tsx`),
  qui s'affichaient sans couleur : **corrigé par PRA-6a**.
- La fiche a des captures de référence (`e2e/visual.spec.ts-snapshots/`) :
  toute retouche visuelle de la fiche les régénère.

### 3.9 Clavier : champs date natifs — non concluant

Sur P05, P11, P25 et P33, le troisième arrêt d'un champ date natif
(Chromium) est mesuré sans anneau. C'est probablement un segment interne du
champ, que la mesure lit mal. *Non vu* à l'œil : à confirmer avant tout lot.

## 4. Comparaison aux prototypes de l'étape 3

Lecture des cinq prototypes validés (PRA-2, PRA-3a, PRA-3b, PRA-4 et
PRA-5), questions et invariants, rapportés au code de `main`. *Démontré dans
le code* sauf mention.

- **Tenu** : PRA-2 Q1 à Q11 (T-16 à T-19 mot pour mot, h1, une action pleine,
  « Réessayer » sur Patients et Agenda, liste avant formulaire, file et détail
  de Confiance & droits) ; PRA-3a (T-14, T-15, replis de session, escamotage
  de 1 024 à 1 279 px, focus sur la commande opposée, information critique
  gardée) ; PRA-3b (T-60 à T-66 et emplacements de T-17, Q8, Q13, Q14, Q18) ;
  PRA-4 Q1 à Q13 (T-67 à T-73, confirmations, aucun « tout valider », aucune
  entrée Règles ni Positions, voie rapide en `PanneauSuperpose`) ; PRA-5 P34
  et X06.
- **Écart 1 — « Voir ce que recevra le patient » en mode consultation.**
  Selon la comparaison, la planche de PRA-3a masque cet aperçu en mode
  consultation, comme l'export. Le code le rend sans garde
  (`FichePatientPanel.tsx:2452-2453`), alors que l'export et « Mode
  consultation » sont gardés. L'aperçu est un panneau superposé : il ne
  quitte pas la fiche, et Q10 de PRA-5 ne le vise donc pas. Mais il montre au
  patient, en partage d'écran, ce qui lui sera envoyé. À arbitrer au regard
  de D-354.
- **Écart 2** : icônes et `bg-card` (§3.8).
- **Écart 3** : cibles hors du seuil de 44 px exigé par les prototypes de
  PRA-3b à PRA-5 (§3.4).
- **Non vérifié** : Q5 « modifiée » de PRA-3a (son texte n'est dans aucun
  fichier lu ; le code suit la version proposée, que le handoff du
  2026-11-12 donne pour validée) ; l'intitulé « Activation protocole
  JA5-05 », qui subsiste dans `PractitionerFoodObservationPanel.tsx:1102`
  et que Q9 de PRA-3b ne citait pas.

## 5. Lots nommés proposés

Seul PRA-6a est ouvert (#2227). Les autres attendent le choix du responsable, posé dans la liste commune (collection `questions` de la page de suivi de la file D, `docs/ROLES_MACHINES.md`, « La liste commune de questions et le guichet ») : `20261117-1421-d` (quels lots, dans quel ordre), `20261117-1422-d` (PRA-6j, clinique) et `20261117-1423-d` (PRA-6e).

| Lot | Objet | Texte neuf ? | Préalable |
|---|---|---|---|
| **PRA-6a — Classes mortes et cibles du Fil** (#2227, ouverte) | `text-destructive` → `text-status-danger` (cinq messages d'erreur sans couleur, §3.8) ; liens d'action et « Rappeler »/« Débloquer » du Fil à 44 px (§3.4) | non | — |
| PRA-6b — Noms accessibles | §3.1 : noms des champs de P02 et P37, et listes de P52 | oui | DOC-n : inscrire les noms dans D-488 |
| PRA-6c — Courses de la synthèse | §3.3 : réponse du booklet attachée à la synthèse demandée ; liste relue pour le patient courant | non | revue `wn-reviewer` (garde de relecture avant envoi) ; prioritaire |
| PRA-6d — Cibles restantes | §3.4 : fiche, Alimentation, Fil, P53 ; listes déroulantes à 44 px sous WebKit (`ui/Select` et `CLASSE_SELECT`) | non | captures de référence de la fiche à régénérer |
| PRA-6e — Titre de la fiche | §3.5 : le nom du dossier en `h1`, la cascade en dessous | non | arbitrage : la planche de PRA-3a met le nom en h2 |
| PRA-6f — Contraste des phases | §3.6 : statut « en attente » à 4,5:1 | non | — |
| PRA-6g — Reflow au téléphone | §3.7 : d'abord P25 à 320 px, puis P46 ; ensuite, au choix, la convention de 195 px | non | — |
| PRA-6h — Lectures et focus | §3.2 : un échec hors contrat reste dans son panneau ; focus après « Réessayer » ; aperçu P37 hors du clavier ; `<dl>` de P47 | non | arbitrage : où rendre le focus |
| PRA-6i — Icônes et jetons | §3.8 : `TRAIT_ICONE` partout, `bg-card` | non | captures de référence de la fiche |
| PRA-6j — Aperçu patient en mode consultation | §4, écart 1 | non | arbitrage au regard de D-354 (clinique : partage d'écran) |

## 6. Non couvert par cette passe

- **Lecteur d'écran réel** (VoiceOver, NVDA) : *non vu*. axe et la
  structure ne le remplacent pas.
- **Téléphone et tablette réels** : *non vu* ; WebKit simulé seulement.
- **États remplis** : la fiche est vue sur un dossier de démonstration ; le
  Fil, les rayons et les ateliers à l'état que laisse le seed. Les écrans
  d'une action (P03, P09, P10, P16 à P19, P26 à P29, P31, P32, P38, P39, P41
  à P43, P48, P55, P56, P58 à P60) ne sont vus que par leurs E2E.
- **Mode consultation à l'écran** : couvert par les E2E
  (`mode-consultation*.spec.ts`), pas par cette passe.
- **WebKit au clavier** : le parcours de tabulation n'a été joué qu'en
  Chromium.
