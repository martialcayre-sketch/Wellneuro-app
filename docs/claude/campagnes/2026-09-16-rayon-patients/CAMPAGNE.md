---
id: "2026-09-16-rayon-patients"
titre: "Le rayon Patients — le dossier rendu au praticien"
statut: "terminée (2026-09-17 — huit lots livrés, D-220 et D-221 ; contre-revue adverse faite AVANT la clôture, deux affirmations du cadrage réfutées. Le constat d'usage sur dossiers réels reste à faire après déploiement, D-112.)"
créée_le: "2026-09-16"
mise_à_jour: "2026-09-17"
lot_courant: "LOT-07"
branche_campagne: "aucune"
branche_lot_courant: "wn-rayon-patients-lot07-2026-09-17"
cible_pr_lot: "main"
cible_pr_campagne: "main"
---

# Le rayon Patients — le dossier rendu au praticien

*Le cockpit ouvre sur une phase « Patient » qui affiche deux lignes.*

## Objectif

Rendre au praticien **le dossier de son patient** : l'identité complète et
corrigeable, les gestes qui pèsent sur l'accès et sur la fin de parcours, et ce
que le patient a écrit lui-même à l'ouverture de son espace.

Trois manques, constatés dans le code le 2026-09-16, et non déduits :

1. **Le dossier ne se modifie pas.** `PATCH /api/praticien/patients` n'accepte
   que `telephone` et `actif`. Nom, prénom, date de naissance et e-mail sont
   saisis à la création et ne se corrigent plus jamais.
2. **Quatre renseignements n'existent nulle part** — adresse, NIR, nom et
   coordonnées du médecin traitant. Le seul médecin du schéma est
   `CorrespondanceMedecin.medecinLibelle` : un texte libre **par lettre**,
   jamais un médecin attaché au dossier.
3. **La fiche signalétique et l'anamnèse sont invisibles au praticien.** Le
   patient les remplit à l'ouverture de son espace ; elles sont écrites en JSON
   sur `consultations.fiche_signaletique` et `consultations.anamnese`.
   Recherche exhaustive dans `web/src` : **aucune surface praticien ne les
   lit**. `lib/synthese/generation.ts` seul y touche, pour fabriquer un texte.

## Ce qui a causé cette campagne

Une demande du responsable, le 2026-09-16, captures à l'appui : la phase
« 1. Patient » du poste de pilotage n'affiche qu'un nom et un e-mail, tandis que
la gestion des dossiers vit sur une page d'héritage 4.0 — « Questionnaires &
packs » — où elle cohabite avec l'assignation de questionnaires et les packs.
Deux métiers sans rapport sur un même écran, et le métier du dossier n'est
présent nulle part ailleurs.

## Résultat observable

1. Un rayon **Patients** dans le rail, sous « Le Fil du jour » — la gestion des
   dossiers quitte l'héritage 4.0, qui disparaît de la navigation ; assignations
   et packs rejoignent la Bibliothèque, déjà 5.0.
2. Le praticien **corrige** un nom, une date de naissance, un e-mail — et
   changer l'e-mail ne rend muette aucune réponse déjà reçue.
3. Le dossier porte **l'adresse, le NIR et le médecin traitant**, et ces trois
   ajouts sont déclarés au dossier RGPD comme au document servi au patient.
4. La fiche signalétique et l'anamnèse se **relisent** depuis le cockpit, telles
   que déposées, sans agrégat ni interprétation — et leur absence se dit.
5. La phase « Patient » du poste de pilotage porte le dossier ET ses gestes, au
   lieu de deux lignes.

## Les six arbitrages du 2026-09-16

| # | Question | Tranché |
|---|---|---|
| 1 | URL et rail | `/dashboard/patients` devient le rayon Patients ; « Questionnaires & packs » disparaît du rail |
| 2 | Où vont assignations et packs | Dans la Bibliothèque, en rayon |
| 3 | Périmètre du rayon | Liste, Nouveau patient, Nouvelle consultation, « Gérer le dossier » |
| 4 | Fiche signalétique et anamnèse | Instrument à tiroir **plus** une ligne d'état permanente |
| 5 | Document patient | v8, **accusé exigé** (`requiresAcknowledgement: true`) |
| 6 | NIR | Stocké **en clair**, comme toute donnée patient |

## Ce que le cadrage a établi, et qui n'était pas attendu

1. **L'e-mail est recopié dans cinq tables.** `Consultation`, `Assignation`,
   `QuestionnaireReponse`, `SyntheseIA` portent `email_patient` ; `BookletEnvoi`
   porte `email_patient_masque`. Et `GET /api/praticien/reponses` interroge
   **par e-mail**, comme trois autres routes. Rendre l'e-mail modifiable sans
   réécrire ces copies rendrait muettes toutes les réponses déjà reçues. La
   trace masquée du booklet, elle, ne se réécrit pas : elle atteste un envoi
   réellement parti à cette adresse-là.
2. **La migration ouvre une fenêtre d'indisponibilité.** Prisma sélectionne
   explicitement toutes les colonnes scalaires d'un modèle : dès que
   `schema.prisma` déclare `adresse`, la moindre requête `patient` échoue tant
   que la colonne n'existe pas. Or `D-087` impose **code déployé d'abord,
   migration approuvée ensuite**. La fenêtre existe, elle se choisit.
3. **Aucune garde mécanique ne tient « migration seule ».** Ni hook, ni banc, ni
   CI ne refusent une PR mixte. La discipline repose sur le hook de
   confirmation, la revue et le fragment changelog. T3 et la CI ne vérifient que
   la **parité schéma ↔ migrations**.
4. **Le rail a un jumeau mobile** — `MobileBottomNav.tsx` — et **ni lui ni
   `SidebarRail` n'ont de test unitaire**. Leur seul filet est
   `e2e/trajectoires.spec.ts:38`, qui ne tourne que sur Desktop Chromium.
5. **Un texte visible renverra vers un écran disparu** :
   `TrajectoiresPanel.tsx:91`, état vide — « Créez un patient depuis
   "Questionnaires & packs" ». Aucun test ne le couvre : il se corrige à la main
   ou il ment.
6. **Trois baselines visuelles vont rougir, et trois seulement** :
   `fiche-cockpit`, `fiche-tiroir-besoins`, `fiche-trajectoire-onglet`, en
   `Desktop-Chromium-linux` — les jumelles iPhone 13 ne portent pas le rail.
   `scripts/seuil-visuel.test.mjs` interdit de desserrer le seuil : la seule
   voie est la régénération par workflow.
7. **`GET /api/praticien/consultations` existe et n'a aucun appelant.** Il
   charge déjà les lignes entières et journalise déjà l'accès : servir la fiche
   signalétique et l'anamnèse y tient en quelques lignes de mapping, sans route
   neuve.

## Ce qui rend la campagne plus petite qu'attendu

- La route des patients sert **déjà** les deux formes dont la scission a besoin
  (`page` absent = liste complète pour les sélecteurs ; `page` présent = tableau
  paginé) : la scission ne touche aucune route.
- `FICHE_SECTIONS` et `ANAMNESE_SECTIONS` portent déjà libellés, types et
  options ; `normaliserFiche` et `normaliserAnamnese` bornent déjà le JSON
  stocké. La lecture praticien **consomme** ces descripteurs, elle n'en écrit
  aucun.
- `MenuActions`, `DossierConfirmDialog`, `PanneauSuperpose` et `InstrumentTiroir`
  couvrent toute la mécanique d'écran : aucune primitive neuve.
- La migration est **additive** : quatre colonnes nullables, sans défaut, sans
  index — rien à rétro-remplir, rien à reconstruire au retour arrière.

## Ce qui est mesuré, et ce qui ne l'est pas

La campagne se clôt sur ses livrables verts en CI. L'usage se constate ensuite,
sur dossiers réels lus par identifiant au conteneur — combien de dossiers
portent une fiche signalétique et une anamnèse réellement lisibles. Même
séparation que `2026-09-14-protocole-assiste`, et pour la raison que `D-112` a
établie : confondre « livré » et « utilisé » ment.

## Les lots

| Lot | Titre | Migration | Dépend de |
|---|---|---|---|
| LOT-00 | Cadrage | non | — |
| LOT-01 | Le rayon Patients dans le rail | non | — |
| LOT-02 | Fiche signalétique et anamnèse, relisibles | non | — |
| LOT-03 | Migration seule — quatre colonnes | **oui** | — |
| LOT-04 | Le document servi au patient | non | LOT-03 |
| LOT-05 | La fiche administrative s'écrit | non | LOT-03 appliqué |
| LOT-06 | Le cockpit porte la gestion du dossier | non | LOT-02, LOT-05 |
| LOT-07 | Clôture | non | tous |

**L'ordre place le LOT-02 avant la migration**, et ce n'est pas un détail de
séquence : c'est le manque le plus net de la demande, il ne dépend d'aucune
colonne neuve, et il part sans attendre la porte `release-db`.

## Hors périmètre, nommé

- **La qualification du NIR au titre de l'article 9.** Elle appartient au
  responsable de traitement, et le dossier RGPD refuse explicitement de la poser
  dans le code.
- **Le raccord du médecin traitant au rayon Correspondance** (pré-remplissage de
  `CorrespondanceMedecin.medecinLibelle`). Le champ le rend possible ; le
  chantier est distinct et se nomme à la clôture.
- **Tout libellé de `anamnese.ts` et `fiche.ts`** — des règles cliniques les
  apparient verbatim, et deux bancs l'exigent.

## Clôture — 2026-09-17

Sept lots, sept PR sur `main`. Décisions **D-220** (architecture et dossier) et
**D-221** (le NIR déclaré).

### Ce que le cadrage annonçait, et qui s'est révélé faux

- **« Trois baselines visuelles vont rougir, et trois seulement. »** Exact pour
  le LOT-01. Les LOT-05 et LOT-06 ont remplacé une carte à deux lignes par un
  formulaire entier dans la phase Patient, et **aucune baseline n'a bougé** : la
  capture du cockpit n'atterrit pas sur cette phase. L'affirmation était juste
  par accident, pas par analyse — elle n'avait pas envisagé les lots suivants.
- **« Le LOT-04 dépend du LOT-03. »** Insuffisant. La v8 dit que le praticien
  *saisit lui-même* ces renseignements : après la seule migration, les colonnes
  existent mais rien ne les écrit. Elle est partie au **LOT-05**, et un banc de
  dépendance de release tient désormais cette porte.

### Ce que la campagne a découvert et qui n'était pas au cadrage

- **`requiresAcknowledgement` était un champ mort** — déclaré, posé sur treize
  documents, asséré par un banc, lu par aucun code. L'arbitrage « accusé exigé »
  n'aurait interrompu personne.
- **Vingt tests E2E tombés d'un coup** au câblage de la porte : trois fixtures
  recopiaient la règle au lieu de la lire. Le défaut corrigé en code vivait dans
  les bancs censés le surveiller.
- **`idPatient` ne filtrait que les assignations.** Demander un dossier
  descendait la fiche de toute la patientèle — devenu une exposition d'adresses
  et de NIR dès le LOT-05.
- **Le panneau d'édition n'avait pas de `key`** : ouvrir un second dossier
  gardait le formulaire du premier, et enregistrer écrivait l'identité de l'un
  sur le dossier de l'autre. Sans erreur, sans message.

### La fenêtre d'indisponibilité, telle qu'elle s'est réellement passée

Le cadrage l'annonçait « à choisir ». Elle a été prise sans arbitrage explicite :
PR #1156 mergée à 20 h 33 le 2026-09-16, `release-db` approuvée et exécutée à
20 h 41 — **huit minutes**, constatées par le run 35147224827 (« Schéma à jour,
constaté depuis la base »).

### Ce qui reste ouvert, et se nomme ici

1. **Le raccord du médecin traitant au rayon Correspondance** — pré-remplissage
   de `CorrespondanceMedecin.medecinLibelle`. Le champ le rend possible ; le
   chantier est distinct.
2. **La qualification du NIR au titre de l'article 9** — écrite comme **due** au
   dossier RGPD, elle appartient au responsable de traitement.
3. **Le constat d'usage après déploiement.** La LIGNE DE BASE, elle, est prise —
   voir ci-dessous. Ce qui reste est de la rejouer à l'identique une fois le code
   en ligne et le praticien passé dessus : la reformuler déplacerait la question
   ([[D-112]]).
4. **`D-049`** — la signature WebKit/iPhone 13 a rougi T2 trois fois de suite sur
   `portail-dossier-deux-voix`, toujours « navigation expirée, aucune requête de
   page émise », jamais en CI. Rien de neuf : la cause racine reste ouverte.

### Ligne de base, lue en production le 2026-09-17

One-off Scalingo détaché, **comptages seuls**, aucune donnée nominative lue :

| Mesure | Valeur |
|---|---|
| Dossiers | 29 |
| Consultations | 36 |
| Consultations portant une **fiche signalétique** | **22** |
| Consultations portant une **anamnèse** | **21** |
| Dossiers avec une adresse | 0 |
| Dossiers avec un NIR | 0 |
| Dossiers avec un médecin traitant | 0 |

**CE QUE CE TABLEAU ÉTABLIT, ET QUI N'ÉTAIT JUSQU'ICI QU'UNE HYPOTHÈSE DE
CADRAGE.** Vingt-deux fiches signalétiques et vingt et une anamnèses **existent
en production** — écrites par des patients, conservées depuis des mois — et
**aucune surface praticien ne les lisait**. Le manque n'était pas théorique : il
portait sur 21 dossiers sur 29.

**LES TROIS ZÉROS SONT LA LIGNE DE BASE, PAS UN ÉCHEC.** Les colonnes sont en
service depuis huit heures et le code qui les écrit n'est pas encore déployé. Ce
zéro mesure l'instant d'avant, et il n'a de valeur que rejoué plus tard : c'est
ce qui permettra de dire si la fiche administrative sert, ou si elle rejoint les
trois tables dont [[D-112]] a mesuré le remplissage à zéro.

**LA REQUÊTE EST CONSERVÉE TELLE QUELLE** au dossier de la campagne. La rejouer à
l'identique est la seule façon d'en tirer un constat.
