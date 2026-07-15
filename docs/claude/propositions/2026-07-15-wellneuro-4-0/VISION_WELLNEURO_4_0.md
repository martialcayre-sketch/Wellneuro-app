# WellNeuro 4.0 — La Boucle

> Proposition de design du 2026-07-15. Fait suite à la proposition « Cockpit
> praticien 4.0 » du 2026-07-14 (`../2026-07-14-cockpit-praticien/`), qu'elle
> prolonge sans la refaire. Aucun code applicatif modifié — vision + maquette
> interactive, à réviser visuellement avant tout cadrage de campagne.

## 1. Le problème à résoudre

Le programme WellNeuro possède déjà sa logique : chaque campagne future a été
cadrée séparément (C2A/B, C3, C4A/B, C5A/B, JA, Hybrid Patient…), avec ses
propres frontières, précisément pour éviter qu'une campagne n'en absorbe une
autre (registre §A2). C'est une discipline saine — mais elle a un effet de
bord : **prise séparément, aucune de ces campagnes ne raconte le système**.
Le praticien qui ouvrirait successivement le futur écran Suivi, le futur
catalogue de compléments et le futur composeur de documents ne verrait pas
qu'il s'agit du même patient, dans le même épisode, au même moment de sa
prise en charge.

Le programme a pourtant déjà son fil conducteur, littéralement dessiné dans
`PROGRAMME_WELLNEURO_3_0.md` :

```text
Patient → Données fiables → Compréhension → Décision 21 jours
→ Actions patient → Suivi → Réévaluation
```

**Ce document propose de rendre ce cycle visible et navigable dans
l'interface elle-même**, au lieu qu'il ne reste qu'un diagramme de cadrage.
C'est le concept fédérateur de la version 4.0 : **la Boucle**.

## 2. La Boucle — concept

Un repère visuel discret et récurrent (un petit anneau segmenté, jamais un
gadget plein écran) indique, sur chaque écran qui appartient à une campagne à
venir, **quelle étape du cycle il sert** :

```
 ◔ Données  →  ◑ Compréhension  →  ◕ Décision  →  ● Actions  →  ◕ Suivi  →  ◑ Réévaluation
 └───────────────────────────────────────────────────────────────────────────┘
```

- Sur la **Fiche patient** (C1, déjà livrée) : position « Décision ».
- Sur la future **Bibliothèque d'interventions** (C4/C5) : position « Actions
  patient » — composer une recommandation, ce n'est pas consulter un
  catalogue, c'est choisir une action de la Boucle.
- Sur le futur **Suivi & trajectoire** (C2) : position « Suivi » puis
  « Réévaluation » au jalon J21.
- Sur les futurs **Documents** (C3) : la Boucle affiche un **pont** entre
  Décision et Actions — C3 ne possède aucun contenu clinique propre (registre
  A2), il donne juste une forme transmissible à ce qui existe déjà ailleurs.
- Côté patient (Hybrid Patient), la même idée existe déjà dans la spec sous
  une autre forme : la frise T0→J90 de l'écran `/patient/accueil`. La 4.0 ne
  la remplace pas, elle la relie visuellement au même langage que le côté
  praticien — sans jamais dupliquer les jalons de mesure momentum
  (`lib/equilibre/momentum.ts`) ni les points d'étape J7/J14/J21 (propriété
  de C2A, cf. arbitrage A1).

**Ce que la Boucle n'est pas** : ni un moteur, ni une nouvelle source de
vérité, ni un objet stocké. C'est une lecture, un habillage d'écrans qui
appartiennent déjà chacun à leur campagne (A2 reste respecté à la lettre :
aucun écran de cette maquette ne récupère la propriété d'un objet qui n'est
pas le sien).

## 3. Ce que chaque outil à venir devient à l'écran

| Campagne | Ce qu'elle prépare | Écran proposé | Étape de la Boucle |
|---|---|---|---|
| **C2A/C2B** — points d'étape et trajectoire | Check-ins J7/J14/J21, momentum, comparateur | **Suivi & trajectoire** (praticien) | Suivi → Réévaluation |
| **C2A** côté patient | Rendez-vous de suivi (vocabulaire patient, jamais « jalon de mesure ») | **Mon suivi** (patient) | Suivi |
| **C4A/C4B** — compléments clean label | Catalogue intrinsèque + compatibilité protocole | **Bibliothèque › Compléments** | Actions patient |
| **C5A/C5B** — boussole alimentaire | Aliments vedettes + action alimentaire hebdomadaire | **Bibliothèque › Alimentation** | Actions patient |
| **C3** — documents multi-destinataires | Composition patient/médecin/praticien, chaîne d'états | **Documents** (praticien) + **Mes documents** (patient) | Pont Décision → Actions |
| **JA** — journal alimentaire 21 j | Observations manuelles, sans score | **Mon journal** (patient) | Actions patient (auto-observation) |
| **Hybrid Patient** — dashboard patient | Orb « Mon équilibre », frise T0→J90, priorités en langage patient | **Mon équilibre** (patient, `/patient/accueil`) | Compréhension (lecture patient) |

Volontairement absents de cette maquette (aucun écran à leur nom) : biologie
réelle stockée (attend HDS), messagerie, workflow RDV, OCR papier — tous
« différés » au registre, sans déclencheur actif. Un écran maquetté pour un
module sans déclencheur produirait une fausse promesse de calendrier.

## 4. Nouveaux composants transverses (réutilisables par de vraies futures campagnes)

- **Repère de Boucle** (`.loop-badge`) — anneau segmenté + étiquette
  textuelle de l'étape ; jamais color-only (texte toujours présent).
- **Carte de bibliothèque** (`.lib-card`) — pattern commun compléments/
  aliments : provenance, date de vérification, statut, badge de
  compatibilité avec le protocole actif — jamais de score global unique
  (décision déjà actée en C4 : « le clean label score unique est écarté »).
- **Composeur deux colonnes** (`.doc-composer`) — source praticien à gauche,
  rendu par destinataire à droite (patient/médecin/praticien), reprenant la
  décision déjà actée en C3 (« vue de composition deux colonnes »).
- **Orb Mon équilibre** (`.orb`) — indicateur circulaire teal 0-100 + delta,
  fidèle à `MON_EQUILIBRE_CONTEXTE.md` §6 : construction jamais dégradation,
  aucun rouge alarme.
- **Carte de journal rapide** (`.ja-entry`) — saisie < 15 s, favoris/copie,
  sans score visible (JA ne possède aucun score, décision actée).
- **Carte de check-in** (`.checkin-card`) — effet ressenti / tolérance /
  adhésion, vocabulaire patient « rendez-vous de suivi » (jamais « jalon »).

## 5. Ce qui ne change pas

- Tokens et thèmes verrouillés (A5) : praticien clair + rail sombre
  signature ; patient clair fixe. Aucun nouveau mode.
- Vocabulaire réglementaire inchangé : « recommandation », « protocole
  personnalisé », jamais « prescription »/« diagnostic »/« NeuroScore ».
- Aucune campagne ne change de propriétaire de données (A2) : cette maquette
  est un habillage, pas une réorganisation des contrats déjà actés.
- Gate migration inchangé : aucun écran de suivi/persistance n'implique de
  lancer une migration Prisma.
- Patients fictifs exclusifs : Sophie Nicola, Jennifer Martin, Michel Dogné.

## 6. Le pari assumé

Le risque pris ici est **de rendre visible, avant leur existence technique,
la cohérence de campagnes aujourd'hui cadrées séparément** — pour que le
praticien qui verra ces écrans un à un, au fil des mois, en 2026-2027,
reconnaisse le même système plutôt qu'une collection d'ajouts. C'est un pari
de continuité, pas un pari graphique : la Boucle ne consomme presque aucune
place à l'écran (un simple repère dans l'en-tête), pour ne jamais concurrencer
l'information clinique elle-même.

## 7. Révision 2026-07-15 — carte d'intégration complète des outils

Suite à la revue utilisateur de la v1 (« il manque encore beaucoup d'outils »),
la maquette v2 intègre chaque outil manquant à son étape de la Boucle :

| Outil | Écran 4.0 (v2) | Étape Boucle | Origine |
|---|---|---|---|
| Bibliothèque de questionnaires + packs + assignations | Vue « Questionnaires & packs » (packs assignables, 63 instruments certifiés, assignations en cours avec relance et lien portail) | **1 — Données fiables** | Existant (`PatientsPanel`/`PacksPanel` refondus) ; gate QX : profils de rendu bornés aux familles auditées |
| Indicateur + graphe Mon équilibre (praticien) | Bloc « Mon équilibre — lecture praticien » dans la fiche : jauge 61/100, cercles concentriques 12 besoins (6/3/3, intensité = couverture), strates Corps/Ancrage/Esprit, lien 12 besoins | **2 — Compréhension** | Livré (`lib/equilibre/`, `CerclesConcentriques.tsx`) ; A4 : intrant de la fiche, pas un module |
| Boussole alimentaire | Bibliothèque › onglet « Boussole alimentaire » : profil intrinsèque (aliment) vs lecture contextuelle (action hebdomadaire, plan minimal, critère observable) | **4 — Actions patient** | C5A/C5B |
| Journal alimentaire (lecture praticien) | Panneau « Observations partagées » dans Suivi & trajectoire — sans score, publication à la main du patient | **4 → 5** | JA (C5 lit les observations publiées, ne possède pas le journal) |
| Messagerie | Vue « Échanges » : bannière **module différé** (auth patient inter-assignations + HDS recommandé) + fil conceptuel non contractuel, composer désactivé | **Transverse** | Registre « Différés » — l'emplacement est réservé, pas le calendrier |
| Envoi de documents au patient | Chaîne C3 jusqu'à « Envoyé » + réception patient dans « Mes documents » (badge « Validé par votre praticien ») ; email booklet existant en parallèle | **Pont Décision → Actions** | C3 + envoi SMTP déjà livré |

Le rail praticien est réorganisé selon la Boucle : *Cycle patient* (Accueil,
Fiche, Suivi) → *Données & instruments* (Questionnaires & packs) →
*Interventions & restitution* (Bibliothèque, Documents) → *À venir* (Échanges,
étiqueté « différé »).

## 8. Révision 2026-07-15 (2) — lectures par instrument, agenda, biologie fonctionnelle

Seconde revue utilisateur (v3) : représenter les scores par instrument dans la
fiche, et intégrer agenda/consultations, fiches conseils et biologie
fonctionnelle (bibliothèque d'analyses, packs, demandes, courriers médecins).

### Lectures par instrument (fiche patient, sous le bloc Mon équilibre)

| Lecture | Instrument réel | Représentation choisie |
|---|---|---|
| Plaintes actuelles & troubles ressentis | `Q_MOD_03` (7 domaines /10, total /70, moyenne descriptive, sans seuil diagnostique) | Barres horizontales triées par intensité décroissante, valeur directe, badge « Élevée » seulement ≥ 7 ; repère T0 en tiret dès la première réévaluation |
| Mode de vie SIIN — 7 domaines | `Q_MOD_01` (7 sous-scores, seuils réels satisfaisant / insuffisant / non satisfaisant) | Barres normalisées par max de domaine + statut textuel du référentiel, tri du plus dégradé au plus favorable ; note de convergence avec la priorité sommeil de la décision |
| Synthèse alimentaire — couvertures & dérives | `Q_ALI_01` (/42) + `Q_ALI_02` méditerranéen (/14) + `Q_ALI_03` Monnier | Deux volets : **couvertures estimées** (fibres & végétaux, assiette antioxydante, micronutriments clés par proxys, protéines g/kg, hydratation « à recueillir ») et **dérives & signaux présumés** (axes divergents défavorable↔favorable pour assiette inflammatoire et PRAL, ratio ω6/ω3 vs objectif avec tiret-cible, indice ω-3 estimé, signal métabolique « à confirmer en biologie ») |

Règles tenues : jamais de couleur seule (statuts textuels systématiques), fills
séquentiels teal, marqueurs divergents neutres avec étiquette de versant.
Honnêteté clinique : « présumé » / « à recueillir » / « à confirmer en
biologie » explicites — l'indice HOMA se mesure, il ne se présume pas. Les
règles de dérivation (ω6/ω3 prédictif, PRAL présumé, signal métabolique,
indice ω-3) **restent à cadrer cliniquement** avant tout branchement ; aucun
scoring certifié n'est modifié. Gap réel identifié : **l'hydratation n'est
couverte par aucun item actuel** des questionnaires alimentaires — recueil à
ajouter (décision produit).

### Nouveaux écrans et extensions

| Outil | Écran 4.0 (v3) | Étape Boucle | Statut gouvernance |
|---|---|---|---|
| Agenda & consultations | Vue « Agenda » : semaine typée (première consultation / suivi J14 / restitution & décision), état de préparation par créneau, « prochaine consultation » → suivi ou mode consultation | Transverse — donne le tempo | **Différé** (workflow RDV au registre) — bannière explicite |
| Biologie fonctionnelle | Vue « Biologie » : packs thématiques (Neuro-inflammation, Statut métabolique — suggéré par le signal de la fiche, Statut micronutritionnel), bibliothèque d'analyses, demandes & courriers | 1 — Données fiables (versant mesuré) | **Différé** (HDS requis pour stocker des résultats) — seule la préparation documentaire est montrée |
| Fiches conseils | Bibliothèque › onglet « Fiches conseils » : statut Validée/Brouillon, relecture datée, envoi via la chaîne Documents (une fiche en brouillon ne s'envoie pas) → « Mes documents » patient | 4 — Actions patient | Extension naturelle C3/C4 |
| Demandes d'analyses & courriers médecins | Réutilisent le composeur C3 (destinataire « Médecin traitant ») ; vocabulaire : « demande d'analyses », conformément au lexique réglementaire du projet | Pont Décision → Actions | C3 |

Le concept **« du présumé au mesuré »** relie fiche et biologie : les signaux
estimés du questionnaire pré-remplissent la demande d'analyses correspondante ;
au retour du résultat, la fiche affichera « estimé » à côté de « mesuré »,
jamais l'un à la place de l'autre. C'est aussi la première marche de la
vision 5.0 (`PISTES_WELLNEURO_5_0.md`).

**Note de revue v3 (retour utilisateur, 2026-07-15)** : lectures validées sur
le fond (« presque parfait ») ; à explorer en itération — compacité (les trois
cartes sont denses) et impact visuel. Pistes : bande-heatmap 7 domaines à
étiquettes directes, lecture « delta d'abord » dès que T0/J21 existent, petits
multiples par volet alimentaire. Le radar est écarté d'office (anti-pattern
dataviz : aires trompeuses, axes non comparables).

## 9. Raccordement aux campagnes

Cette proposition ne compile aucun lot. Chaque écran maquetté reste à
cadrer par sa propre campagne (C2A/B, C3, C4, C5, JA, Hybrid Patient) au
moment où le programme l'active (`PROGRAMME_WELLNEURO_3_0.md`, colonne
Statut). Si le repère de Boucle est retenu à la revue visuelle, il doit être
ajouté à `HANDOFF_FUTURES_IMPLANTATIONS.md` (checklist de conformité) pour
devenir opposable aux lots qui suivront.
