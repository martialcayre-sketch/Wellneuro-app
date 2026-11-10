# Refonte Lien / Empreinte — étape 1 : état des constats et carte de la navigation

- Date : 2026-11-11. Lecture du code sur `origin/main` au commit `6570378a`.
- Objet : première étape de la refonte du webdesign et de la navigation demandée
  par le responsable : « je ne souhaite pas un simple changement de palette mais
  un nouveau web design », « les bandeaux de menus latéraux doivent être aussi
  repliables ou escamotables », « je souhaiterais qu'il n'y ait plus de longues
  fenêtres à défiler ». Ces phrases viennent de la conversation du 2026-11-10 ;
  elles n'ont pas de ligne dans le dépôt.
- Sources de la cible : cadrage `Cadrage_interfaces_Wellneuro_Lien_Empreinte_v3`,
  catalogue `Catalogue_ecrans_Wellneuro_Lien_v2`, kit d'assets v2.0.0, et la
  contre-lecture `Contre_lecture_Wellneuro_6_Refonte_Lien_Empreinte_v2` (§3 et
  §10, étape 1). Ces fichiers ne sont pas versés au dépôt ; ils sont cités par
  section.
- Ce dossier ne crée aucun numéro D-xxx, ne signe aucun amendement et ne touche
  ni au code, ni aux drapeaux. Il prépare les arbitrages de l'étape 2.
- Relecture `ui-ux-pro-max` en lecture seule ([[D-456]]), domaine `ux` :
  `ux:N` renvoie à `.claude/skills/ui-ux-pro-max/data/ux-guidelines.csv` et
  `qr:N` à `references/quick-reference.md`, numéros de ligne du fichier. Ses
  règles ne priment sur aucune décision du dépôt.

## 1. Les cinq constats du premier audit, sur le code actuel

| # | Constat | État au `6570378a` | Preuve |
|---|---|---|---|
| C1 | Une erreur de chargement du suivi fait disparaître un protocole lisible | **Reproduit au code** | `PatientCompanionHome.tsx:59-62` lit protocole et suivi par un seul `Promise.all` ; si le suivi échoue sur le réseau ou rend un corps non JSON, le `catch` efface aussi le protocole (`:74-76`). La page tombe alors sur « Votre accompagnement arrivera bientôt. Votre praticien prépare votre suivi. » (`:141-146`). Une pause sur effet indésirable ([[D-281]]), qui se lit sans clic, disparaît avec le reste. Un refus serveur en JSON (`ok: false`) n'efface que le suivi (`:65`, `:73`). |
| C2 | Une erreur réseau du formulaire de suivi est présentée comme une attente normale | **Reproduit au code** | Au chargement, `ProtocolCheckinForm.tsx:51-52` pose « Erreur réseau. Réessayez. » mais laisse l'état vide ; la page rend alors le texte d'attente « Votre suivi commencera dès que votre praticien aura partagé votre accompagnement. » (`:100-108`). Le message d'erreur n'est rendu que dans la branche du formulaire (`:163`) ; aucune action « Réessayer ». Un refus serveur (`ok: false`, `:48-49`) mène au même texte d'attente. |
| C3 | « Comptes du cabinet » manque dans le menu téléphone | **Corrigé** le 2026-11-10 (#1960) | `MobileBottomNav.tsx:36` ; parité rail ↔ barre et feuille tenue par `MobileBottomNav.test.tsx:54-78`. Acquis à préserver. |
| C4 | « Fiches » perd son état actif quand un dossier est ouvert sur téléphone | **Reproduit au code** | La barre compare `pathname.startsWith(href)` (`MobileBottomNav.tsx:58-59`) ; « Fiches » vise `/dashboard/trajectoires` (`:14`), une fiche est sous `/dashboard/patients/<id>` : aucune case n'est active, et « Plus » non plus (« Patients » est en correspondance exacte, `:33`, `:61-62`). Le commentaire `:29-31` annonce l'inverse. Le rail et les vues rapides, eux, allument « Fiche-trajectoire » par `prefixesActifs` (`SidebarRail.tsx:83`, `VuesRapides.tsx:18`). Aucun test de la barre sur une fiche. |
| C5 | Menu global, vues rapides, onglets de fiche et phases s'accumulent | **Reproduit au code** | Voir §3 : jusqu'à cinq niveaux de navigation sur une fiche praticien au bureau ; trois navigations et trois `aria-current="page"` sur le hub patient à 1 024 px. |

Règles du skill : C1 et C2 relèvent de `ux:45` et `ux:81` (erreur annoncée, reprise possible) et du cadrage §4 (« une lecture en échec n'est ni un zéro ni une liste vide ») ; C4 de `qr:205` (`nav-state-active`).

Statut : établi par lecture du code, **non reproduit à l'écran**. C1 et C2 se rejouent en coupant la seule route `/api/portail/protocole/checkin` ; C4 à 390 px sur une fiche de dossier de test.

## 2. Carte des destinations

### 2.1 Praticien (`app/dashboard`)

Garde commune : session NextAuth, sinon `/login` (`app/dashboard/layout.tsx:9-14`). Aucune entrée de menu n'est conditionnée par un drapeau ; les drapeaux agissent dans les pages.

| Destination (libellés par couche) | Route | Rail ≥ 1 024 (et tiroir 768–1 023) | Barre < 768 | Feuille « Plus » < 768 | Vues rapides ≥ 1 024 | État actif |
|---|---|---|---|---|---|---|
| « Le Fil du jour » / « Le Fil » / « Fil du jour » | `/dashboard` | La Spirale | oui | — | oui | exact partout |
| Patients | `/dashboard/patients` | La Spirale | — | oui | — | exact |
| « Fiche-trajectoire » / « Fiches » | `/dashboard/trajectoires` | La Spirale | oui | — | oui | rail et vues : préfixe + `/dashboard/patients/` ; barre : préfixe seul (C4) |
| Comptes du cabinet | `/dashboard/cabinet` | La Spirale | — | oui | — | préfixe |
| « Consultation copilote » / « Consultation » | `/dashboard/copilote` | La Spirale | — | oui | oui | préfixe |
| Agenda & consultations | `/dashboard/agenda` | La Spirale | — | oui | — | préfixe |
| Correspondance | `/dashboard/correspondance` | La Spirale | — | oui | oui | préfixe |
| Confiance & droits | `/dashboard/droits` | La Spirale | — | oui | — | préfixe |
| Questionnaires, Fiches conseils, Compléments alimentaires, Analyses biologiques, Connaissances, Atelier corpus | `/dashboard/bibliotheque/…`, `/dashboard/corpus` | Bibliothèque | — | oui | — | préfixe |
| Paramètres | `/dashboard/parametres` | Réglages | — | oui | — | préfixe |
| Synthèses | `/dashboard/synthese` | — (tiroir de fiche, cartes du Fil) | oui | — | — | préfixe ; rien d'actif au rail |
| Documents, Règles, Positions d'expert | `/dashboard/documents`, `/regles`, `/bibliotheque/positions-expert` | — (volontairement sans lien) | — | — | — | — |

Sources : `SidebarRail.tsx:65-118`, `MobileBottomNav.tsx:9-48`, `VuesRapides.tsx:12-21`, `NavBar.tsx:53-148`. Trois listes distinctes et trois fonctions de correspondance ; la parité rail ↔ barre et feuille n'est tenue que par un test, les vues rapides par aucun.

Navigation locale d'une fiche (`FichePatientPanel.tsx`) : lien retour selon l'entrée (`:2303-2316`), six onglets (`:260-267`, mémorisés sur l'appareil `:696-716`), rail des sept phases dans « Poste de pilotage » (`:284-292`, `:2693-2740`, mémorisé `:1264-1276`), sous-vues de phase (`:2198-2216` ; `ClinicalRuntimeSection.tsx:2317-2338`), raccourcis « Y aller » et « Ouvrir la phase … », colonne « Instruments ».

Repli : le rail praticien est **déjà repliable** (252 px ↔ 64 px) et mémorisé sur l'appareil (`NavBar.tsx:13`, `:29-31`, `:40`, clé `wn-rail-expanded`). Il n'est pas escamotable au bureau.

Écarts relevés en passant :
- [[D-324]] §7 compte quatorze entrées ; le rail en a quinze depuis [[D-385]] (« Comptes du cabinet »), et son test le dit (`SidebarRail.test.tsx:107`). Aucun amendement de D-324 ne le trace.
- Les vues rapides praticien n'ont pas de D-xxx : elles viennent de la maquette Spirale (`VuesRapides.tsx:6-11`).

### 2.2 Patient (`app/portail`)

Garde du chrome : `WN_PORTAIL_MENU`, page de session, murs franchis, dossier **majeur** ; lecture en échec = fermé (`MenuMonEspace.tsx:60-134`). Un mineur n'a ni menu, ni rail, ni barre, ni onglets ([[D-283]] §5).

| Destination (libellés par couche) | Route | Groupe ([[D-423]] §2) | Condition | < 768 | 768–1 023 | ≥ 1 024 |
|---|---|---|---|---|---|---|
| « Mon parcours » / « Accueil » | `/questionnaires` | ancre | aucune | menu, barre, hub | menu, hub | rail, onglets, hub |
| « Ouvrir mes rendez-vous de suivi » / « Suivi » | `/suivi` | Au jour le jour | aucune | menu, barre | menu | rail, onglets |
| « Ouvrir Mon carnet alimentaire » / « Carnet » | `/alimentation` | Au jour le jour | aucune | menu, barre | menu | rail, onglets |
| « Consulter mon bilan » | `/bilan` | Ce que j'ai reçu | bilan consultable | menu | menu | rail |
| « Ma bibliothèque » / « Bibliothèque » | `/bibliotheque` | Ce que j'ai reçu | sonde | menu, barre | menu | rail, onglets |
| « Fiches remises par mon praticien » / « Fiches » | `/fiches` | Ce que j'ai reçu | sonde, sans bibliothèque | menu, barre | menu | rail, onglets |
| Courrier pour votre médecin ; Courrier à remettre ; Pour votre médecin | `/courrier-medecin`, `/courrier-complement`, `/pour-votre-medecin` | Ce que j'ai reçu | sondes | menu | menu | rail |
| Ma fiche de renseignements ; Transmettre un compte rendu d'analyses ; Déposer un document | `/renseignements`, `/comptes-rendus`, `/documents` | Ce que je transmets | sondes | menu | menu | rail |
| Ouvrir mon dossier à deux voix ; Ouvrir mes échanges | `/dossier`, `/echanges` | Avec mon praticien | sondes | menu | menu | rail |
| Sans entrée permanente : protocole imprimable, « Ce qui compte pour moi aujourd'hui », « Ce que mon praticien a compris de moi », informations et droits, conditions, détail d'une fiche, questionnaire en cours | `/protocole`, `/ce-qui-compte`, `/comprehension`, `/informations`, `/conditions`, `/fiches/[id]`, `/questionnaires/[id]` | — | contextuelles | liens de page | idem | idem |

Sources : `entreesAutresEspaces.ts:70-84` (une seule table pour menu, rail et hub), `BarreBasse.tsx:48-65` (la barre et les onglets partagent `casesServies` ; « Accueil », « Carnet », « Suivi » écrits en dur), `activationMenu.ts:19-27` (une règle d'activation commune), `cheminRail.ts:1-6` et `BarreBasse.tsx:43-46` (exception du questionnaire en cours, écrite deux fois). Chaque page porte « ← Mon parcours », sauf `/conditions` (« ← Mon espace », vers `/portail/{t}`) et le détail d'une fiche (vers `/fiches`).

Repli : le rail patient est toujours déplié et n'écrit rien sur l'appareil, comme l'exige [[D-447]] §4 (`RailMonEspace.tsx:22`, test `RailMonEspace.test.tsx:327-334`).

## 3. Couches visibles en même temps

| Situation | Navigations visibles | Lecture `ui-ux-pro-max` |
|---|---|---|
| Praticien, fiche patient, ≥ 1 024 px, « Poste de pilotage » | rail global ; vues rapides de l'en-tête ; six onglets ; rail des sept phases ; sous-vues de phase ; plus le retour, les raccourcis de phase et la colonne « Instruments ». Rail et vues rapides allument la même entrée. | `qr:218` (`avoid-mixed-patterns`) et `qr:206` (`nav-hierarchy`) : niveaux de même poids, hiérarchie à recomposer (C5). |
| Praticien, fiche, < 768 px | barre basse sans case active (C4) ; onglets ; bande horizontale des phases. | `qr:205` ; `ux:70` et `qr:100` à vérifier à l'écran pour la bande des phases. |
| Patient, hub, ≥ 1 024 px | rail « Mon espace » ; onglets « Accès rapides » ; « Autres espaces » (la même liste que le rail) ; frise ; trois `aria-current="page"` (rail, onglets, ancre du hub, `NavAutresEspaces.tsx:43`). | `qr:218` ; trois navigations désignent la même page. |
| Patient, page du rail, ≥ 1 024 px | rail ; onglets (quatre des entrées du rail, une seconde fois). | `qr:218`. |
| Patient, < 768 px | bouton « Menu » ; barre basse ; sur le hub, frise et « Autres espaces ». | conforme à `qr:198` et `qr:215`. |
| Patient, 768–1 023 px | bouton « Menu » seul. | conforme. |

## 4. Matrice avant / après (proposition)

« Après » traduit la cible du cadrage §10 (« Navigation patient ») et du catalogue §5.2 et §5.3, corrigée par la contre-lecture §4.1. C'est une proposition à arbitrer, pas une décision.

| Élément | Avant (`6570378a`) | Après proposé | Décision touchée |
|---|---|---|---|
| Rail patient | toujours déplié, sur `surface`, sans mémoire | déplié, réduit avec libellés, ou escamoté avec un bouton « Menu » ; état en mémoire du layout | [[D-447]] §4 et §5, [[D-460]] §4, A5-R2 ; fond : D-447 §5 |
| Rail praticien | déplié ou réduit (icônes), mémorisé sur l'appareil ; libellé du mode réduit au survol | déplié, réduit ou escamoté ; libellé du mode réduit joignable au toucher et au clavier (`qr:39`, `qr:204`, `qr:245`) ; nuit pétrole | A5-R1, A5-R2 ; aucune D-xxx sur le repli praticien |
| Onglets patient ≥ 1 024 | quatre cases « Accès rapides » au-dessus du rail | retirés quand le rail est servi (Q3) | [[D-460]] §3 |
| « Autres espaces » sur le hub ≥ 1 024 | répète la liste du rail | masqué quand le rail est servi ; gardé sous 1 024 px (Q3) | [[D-447]] §2 (Q60) |
| Vues rapides praticien | quatre entrées du rail, dans l'en-tête | réservées au rail réduit ou escamoté, ou retirées (Q4) | aucune D-xxx ; `VuesRapides.tsx` |
| Feuille « Plus » praticien | douze entrées à plat, `max-h-[60vh]` | menu complet par groupes (La Spirale, Bibliothèque, Réglages), sans longue feuille (catalogue §5.2) | [[D-324]] §5 |
| Listes de navigation praticien | trois listes, trois règles d'activation | une déclaration par rôle, dont dérivent rail, tiroir, barre, feuille et vues (Q5) | [[D-324]] §5 et §7 |
| Activation sur une fiche, téléphone | aucune case active (C4) | « Fiches » active sur `/dashboard/patients/<id>` (catalogue §5.2 : « L'entrée "Fiches" reste courante dans une fiche de patient ») | [[D-324]] §5 |
| Groupes praticien | La Spirale, Bibliothèque, Réglages | à comparer par tâche à « Travail, Bibliothèque, Ateliers, Cabinet » (catalogue §5.2) ; étape 2 | [[D-324]] §1, et §3 à §6 selon les déplacements |
| Navigation de fiche | onglets + phases + sous-vues, tous visibles | phases réservées à la fiche, indépendantes du menu global (catalogue §5.2) ; hiérarchie à dessiner à l'étape 3 | aucune D-xxx relevée |
| Protocole et suivi au hub | chargés ensemble, un échec efface les deux (C1) | lectures indépendantes ; un échec du suivi laisse le protocole et ses pauses | correctif, sans décision d'interface ; texte d'erreur à accepter si neuf |
| Formulaire de suivi | erreur réseau rendue comme une attente (C2) | erreur distincte de l'attente, avec reprise | idem |
| Libellés d'une même route | « Le Fil du jour » / « Le Fil » / « Fil du jour » ; « Fiche-trajectoire » / « Fiches » ; « Mon parcours » / « Accueil » | au registre des textes de l'étape 2 (Q6) | [[D-324]], [[D-444]] §3 |

Ce qui ne change pas, quelle que soit la réponse : gardes d'âge et de session, sondes fermées par défaut, une entrée visible n'accorde aucun droit ; aucun compteur ni pastille côté patient ([[D-333]] §1) ; pas de rail, de barre ni d'onglets sur le questionnaire en cours ([[D-447]] §1) ; lien « Aller au contenu » premier élément ; textes de pause et de conduite à tenir inchangés.

Suggestion du skill écartée : `qr:223` (`empty-nav-state`, expliquer une destination absente) contredit les sondes fermées et le groupe vide sans étiquette de [[D-447]] §2.

## 5. Questions au responsable

La première option est la recommandation.

1. **Constats C1, C2 et C4.**
   - (a) Un lot de correctifs de fiabilité, indépendant de la refonte, ouvert maintenant : lectures séparées au hub, erreur distincte de l'attente avec reprise, « Fiches » active sur une fiche au téléphone. Tout texte patient neuf (le bouton de reprise, par exemple) est soumis mot pour mot avant le code.
   - (b) Les intégrer aux lots de la refonte.
2. **Mémoire du repli du rail patient.**
   - (a) En mémoire du layout seulement : l'état survit aux navigations internes, pas au rechargement ; rien n'est écrit sur l'appareil ([[D-447]], « Ne touche pas », intact).
   - (b) Mémorisé sur l'appareil par `stockageAppareil`, comme le rail praticien : amende [[D-447]] (Q56 et la liste « Ne touche pas »).
3. **Navigations patient en double dès 1 024 px.**
   - (a) Le rail seul : onglets retirés et « Autres espaces » masqué quand le rail est servi ; amende [[D-460]] §3 et [[D-447]] §2 (Q60). Le catalogue §5.3 garde les onglets : écart assumé.
   - (b) Garder les onglets, masquer seulement « Autres espaces » : amende [[D-447]] §2.
   - (c) Tout garder.
4. **Vues rapides praticien.**
   - (a) Les afficher seulement quand le rail est réduit ou escamoté.
   - (b) Les retirer ; l'en-tête porte le contexte du dossier.
   - (c) Les garder telles quelles.
5. **Listes de navigation praticien.**
   - (a) Une déclaration par rôle, avec ses gardes, dont dérivent toutes les couches ; le test de parité devient inutile. Amende [[D-324]] §5 et §7 (et corrige le compte de quinze entrées).
   - (b) Garder trois listes et ajouter un test de parité pour les vues rapides.
6. **Libellés différents pour une même route.**
   - (a) Les reprendre dans le registre des textes de l'étape 2, avec les textes neufs du cadrage (« Mon point de suivi », « Parler de votre situation ») ; rien ne change d'ici là.
   - (b) Les aligner tout de suite.

## 6. Non vu

- Aucun constat à l'écran : C1, C2 et C4 sont établis par lecture du code ; aucun serveur, aucun E2E lancé pour ce dossier.
- Drapeaux réellement ouverts en production : non lus (le plan les dit posés pour le menu, la barre, le rail et la frise).
- Le premier audit lui-même n'est pas au dépôt ; ses constats sont repris de la contre-lecture §3.
- Rendu de la bande des phases au téléphone, retour à la ligne de l'en-tête patient à 1 024 px avec les onglets, largeurs réelles.
- Contrôle de rôle hors du layout praticien et des routes d'API : non parcouru.
- Les 110 fiches du catalogue : seules les sections §5.1 à §5.4 et la navigation du cadrage ont été relues pour cette étape.
