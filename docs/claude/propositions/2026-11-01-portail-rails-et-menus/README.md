# Audit — Faire évoluer l'interface patient comme l'espace praticien : rails et menus (2026-11-01)

Audit statique, lu sur `origin/main@6b5ea0f3`, en réponse à la demande
« faire évoluer l'interface patient comme l'espace praticien, avec la même
organisation (rails et menus) ». Il décrit ce que le praticien a (chapitre 3),
ce que le patient a (chapitres 4 et 5), les écarts (chapitre 6), ce que la
doctrine impose (chapitre 7), trois organisations possibles et une
recommandation (chapitres 8 à 10), un plan de lots (chapitre 11), les risques
(chapitre 12) et les questions à trancher (chapitre 13). Statut : **proposition,
rien n'est engagé** ; aucune ligne de code, aucune décision, aucun drapeau ne
change avec ce document. Les lots s'ouvrent après les réponses du chapitre 13.
Q1 à Q3 ont été tranchées le 2026-11-01 (chapitre 14) : A puis B, l'organisation
seule, et une frise des étapes navigable en plus du menu ; Q27 à Q30, ouvertes par
ce dernier choix, le sont aussi. Q4 à Q26 et Q31 à Q34 sont tranchées le 2026-11-02
dans L0 (chapitre 15) ; leur texte de décision, D-423 « Menu patient », est
rédigé à côté de ce document (`decision-D-423-menu-patient.md`) et entre au
registre avec L2.

Abréviations : LOT-05 et LOT-07 désignent
`docs/claude/campagnes/2026-09-12-vie-du-portail-patient/lots/LOT-05-les-deux-portes.md`
et `.../LOT-07-le-fil-du-jour.md` ; CAMPAGNE.md, sans chemin, désigne celui de
cette campagne ; PLAN désigne `docs/claude/PLAN_WELLNEURO.md` ; REGISTRE désigne
`docs/claude/REGISTRE_FRONTIERES.md`. Les chemins courts (`page.tsx`,
`layout.tsx`) désignent le hub `web/src/app/portail/[token]/questionnaires/page.tsx`
et `web/src/app/portail/layout.tsx`, sauf mention d'un autre dossier.

## 1. Périmètre et méthode

### Arbre lu
- Arbre lu : origin/main@6b5ea0f3, au 2026-11-01, worktree `audit-portail-rails`, en lecture seule. Rien n'a été modifié, créé ni commité ; aucun fichier `.env*` n'a été lu ; aucun patient réel n'est cité.
- Audit statique. Ni l'application, ni le build, ni les tests n'ont été lancés. Une seule commande hors lecture a été lancée (`node scripts/wn-ancres-doctrine.mjs --json`, sans écriture, qui ne voit aucun fichier du portail, scripts/wn-ancres-doctrine.mjs:40) ; tout le reste est lecture (`cat`, `sed`, `grep`, `find`, `ls`, `git rev-parse`).
- Les largeurs, hauteurs et contrastes sont des calculs sur les classes et les jetons lus, signalés « calcul ». Les seuils `md` = 768 px et `lg` = 1024 px sont une déduction : `web/tailwind.config.ts` ne contient aucune clé `screens`.
- Les paliers de validation (T1 = `check:rapide`, T1 complet = `check`, T2 = `test:worktree -- --fast`, T3 = `test:worktree`) viennent du CLAUDE.md de l'arbre (CLAUDE.md:152-155).
- L'état des drapeaux en production est celui que le dépôt documente (docs/FEATURE_FLAGS.md § A, « Relevé du 2026-10-28 », cellules annotées jusqu'au 2026-11-01). C'est une source écrite, pas une observation de la production.

### Sept lectures, cinq dimensions, deux angles de vérification
- Sept lectures parallèles : espace praticien ; shell et hub patient ; inventaire des pages du portail ; doctrine (décisions, registre, plan) ; jetons et accessibilité ; bancs et gardes ; historique du dépôt.
- Cinq dimensions : architecture, composants, doctrine, accessibilité, livraison.
- Vérification adverse de chaque constat, à deux angles : « preuves » (chemin, ligne et extrait rouverts) et « contradiction » (recherche d'une décision, d'un arbitrage daté ou d'un commentaire qui contredise).
- Une passe de critique du premier jet a relevé sept erreurs (EP-03, EP-10, EP-11, la colonne de l'organisation C, le chapitre doctrine, le plan de lots, l'inventaire) et douze manques ; les corrections sont intégrées et signalées « corrigé » dans les écarts. Deux manques restent partiels : l'état réel des drapeaux (source écrite, non constatée) et toute mesure à l'écran (aucun rendu). Chaque écart porte son statut.

### Statuts employés
- vérifié : confirmé par la vérification adverse ; vérifié (relu) : fichier rouvert en relecture finale, extrait recopié.
- corrigé : un premier constat était faux ou incomplet ; la correction est écrite. non vérifié : lu par une seule fiche, ou calculé sans rendu ; le fait n'est pas établi. réfuté : repris en fin du chapitre « Écarts ».

### Ce qui n'a pas été lu
- Aucun rendu, aucun CSS compilé, aucun lecteur d'écran : tout ce qui touche au rendu est calculé ou déduit. La production n'est pas constatée.
- Non lu : les fichiers `.env*` ; la pièce 17 du dossier privé ; le document de l'audit du cockpit du 2026-09-02 (absent de `docs/`, cité en commentaires de code)  ; D-268 §6 et D-385 (titre seul) ; D-251, D-269, D-330, D-335, D-345, D-175 lus en partie.
- Non lu ou lu en partie : les routes `api/portail` bilan (effet du mineur et du dossier clos), ce-qui-compte, lectures, protocole, `protocole/checkin` (GET et début du POST lus) ; la garde d'âge de `api/portail/ja/observations` ; `DossierDeuxVoixView` (titres seuls), `PatientFoodObservationPanel`, `DetailDuProtocole`, `AvantDeCommencer`, `GenericQuestionnaire`, `InboxQuestionnaires` ; les consommateurs de drapeaux de `lib/portail/filDuJour.ts`.
- La PR #1765 (lue avec `gh` : quatre lignes ajoutées à `MobileBottomNav.tsx`, un premier banc) n'est pas dans l'arbre lu.

## 2. Verdict
1. L'espace praticien a un shell unique, `NavBar`, qui sert trois largeurs par trois dispositifs : barre basse sous 768 px, tiroir de 768 à 1023 px, rail latéral dès 1024 px (web/src/components/NavBar.tsx:52-53, 93-96).
2. Il a deux rails distincts : le rail-menu (15 entrées, 3 groupes, D-324, docs/DECISIONS.md:6262-6275) et le rail des sept phases de la fiche, « colonne vertébrale » de A6-R1 (FichePatientPanel.tsx:2638, REGISTRE_FRONTIERES.md:321-323). Le patient n'a ni l'un ni l'autre ; sa frise de six étapes n'est pas une navigation (PatientJourneyProgress.tsx:56).
3. Le portail n'a aucune navigation dans son layout : en-tête (marque, confort de lecture, déconnexion), colonne, pied (web/src/app/portail/layout.tsx:43-64).
4. Toute la navigation patient tient dans la ligne « Autres espaces » du hub (13 emplacements, 12 visibles au plus, 7 à 12 en production pour un majeur selon le registre des drapeaux, calcul) et dans un lien « ← Mon parcours » par page (questionnaires/page.tsx:442-507).
5. Ce qui manque au patient : des groupes nommés, un état actif, un retour uniforme, un accès à la navigation depuis les sous-pages, une liste unique des espaces.
6. À copier : les groupes nommés, une entrée par page, un seul actif avec rattachement des sous-pages, une liste déclarée une fois, `aria-current`, les cibles de 44 px, les bancs d'ordre, la méthode D-324.
7. À ne pas copier : les compteurs et le « ! » (D-333), le rail nuit et les jetons `--rail-*`, la feuille « Plus » à plat, le bloc de marque, le repli mémorisé, les Dialog Radix posés sous `data-theme="praticien"`, le rail des phases comme menu.
8. La doctrine freine : A6-R1 pose côté patient un « principe inverse » (REGISTRE_FRONTIERES.md:334-336) et un avis non signé écrit « ne doivent surtout pas devenir la même interface » ; A5-R2 et « pas de rail » n'interdisent qu'un rail nuit et une bascule de thème, pas un rail clair. Deux antécédents non signés vont dans l'autre sens (UX-5, maquette 4.0). Aucune décision signée n'autorise un menu patient.
9. Le plan demande de regrouper ou hiérarchiser la ligne de liens sans retirer d'accès (PLAN_WELLNEURO.md:2684) : c'est le seul lot demandé.
10. Recommandation : organisation A (regroupement dans le hub, quatre groupes sans collision de nom) d'abord ; B (bouton « Menu » et tiroir) après constat et arbitrage ; C (rail) non engagée ; rail des phases écarté comme menu. Les arbitrages précèdent tout code ; la D-xxx s'écrit dans le lot, comme D-324. Arbitrage du 2026-11-01 (chapitre 14) : Q1 et Q2 suivent cette recommandation ; Q3 retient au contraire une frise des étapes navigable en plus du menu, qui devient le lot L2b.

## 3. L'espace praticien aujourd'hui

### Points de rupture et dispositifs
| Largeur | Dispositif | Source |
|---|---|---|
| moins de 768 px | barre basse fixe de 64 px (3 liens et un bouton « Plus »), masquée dès `md` ; le header ne garde que « Profil » | web/src/components/ui/MobileBottomNav.tsx:63-66 |
| 768 à 1023 px | bouton hamburger « Ouvrir la navigation », badge « WN », tiroir gauche Radix de 288 px qui rejoue `SidebarRail` déplié | NavBar.tsx:52-63, 125-148 |
| 1024 px et plus | `aside` sticky de 252 px (64 px replié), libellé de build et Vues rapides dans le header | NavBar.tsx:65-71, 93-96 ; VuesRapides.tsx:31 |
- Le shell est posé par `web/src/app/dashboard/layout.tsx:12-18` : composant serveur, redirection vers `/login` sans session, `<div data-theme="praticien">` autour de `NavBar`.
- Le `main` réserve `pb-24` sous `md` pour la barre basse : `<main className="min-w-0 flex-1 pb-24 md:pb-6 lg:pb-8">` (NavBar.tsx:122). Le conteneur est borné à 1600 px, avec `gap-6` et `px-4 sm:px-6` (NavBar.tsx:92).
- Les E2E forcent 390x844 (barre basse) et 900x1024 (tiroir) sur deux projets, Desktop Chromium et iPhone 13 (web/playwright.config.ts:123-125 ; web/e2e/dashboard-praticien.spec.ts:199-275).

### Le rail-menu (`SidebarRail`)
- Quinze entrées en trois groupes : La Spirale (8), Bibliothèque (6), Réglages (1) ; icône lucide de 19 px (web/src/components/ui/SidebarRail.tsx:65-117 ; banc `SidebarRail.test.tsx:107`).
- Activation : tout préfixe de `prefixesActifs` allume l'item, `exact` compare le chemin entier, sinon `startsWith` (SidebarRail.tsx:188-194). Seule la paire Patients (`exact`) et Fiche-trajectoire (`prefixesActifs: ['/dashboard/patients/']`) partage un préfixe (SidebarRail.tsx:55-57, 83).
- Style actif : `'bg-solar-500/[.12] font-semibold text-rail-foreground shadow-[inset_3px_0_0_var(--rail-accent)]'` (SidebarRail.tsx:244) ; l'état actif ne repose pas sur la couleur seule.
- Deux compteurs (Fil, Correspondance) lus par réseau au montage, avec un libellé parlé ; un « ! » signale un Fil incomplet, rail replié compris (SidebarRail.tsx:144-186, 260-271).
- Repli : clé `wn-rail-expanded` en localStorage, lue dans un effet, écrite sans `try/catch` (NavBar.tsx:13, 28-31, 37-43). Bouton de bascule de 44x44 px avec `aria-expanded` (NavBar.tsx:106-118).
- Bloc de marque (« Wellneuro », « Horizon 5.0 ») monté par le seul rail du bureau (SidebarRail.tsx:198-213 ; NavBar.tsx:105). Les libellés passent à la ligne (`break-words`, H43) (SidebarRail.tsx:256-259).

### Le rail des sept phases (colonne vertébrale de la fiche)
- Sept phases : Patient, Données fiables, Compréhension, Décision 21 j, Actions, Suivi, Réévaluation (web/src/components/FichePatientPanel.tsx:281-289). Elles forment un `role="tablist"` vertical nommé « Cycle clinique », dans une grille `lg:grid-cols-[13rem,1fr,15rem]` (FichePatientPanel.tsx:2637-2642).
- Chaque phase porte un rang (« 1. Patient »), une icône de statut et un libellé de statut ; quatre statuts, quatre icônes, « jamais la couleur seule » (FichePatientPanel.tsx:291, 338, 2651-2654). La phase due a un liseré solaire inset (l.2655-2660). Le correctif du 2026-09-02 numérote les sept étapes et ouvre la fiche sur « Patient » (changelog.d/2026-09-02-cockpit-ouverture-et-rail.md).
- Clavier : flèches, Début, Fin (`onClavierRail`, l.1291-1306) ; tabulation itinérante (`tabIndex={actif ? 0 : -1}`, l.2674) ; cible `min-h-11` (l.2677).
- Doctrine : A6-R1 fait du « cycle clinique 3.x » la « colonne vertébrale de navigation » : « on navigue par phase, jamais par scroll » (REGISTRE_FRONTIERES.md:315-323). Le même texte pose pour le patient le « principe inverse » (l.334-336).
- Autres navigations internes : le tablist « Vues de la fiche patient » (FichePatientPanel.tsx:2267) ; `<nav aria-label="Index de la Spirale">` (patient-cockpit/TrajectoirePanel.tsx:278) ; `InboxQuestionnaires`, rangé « navigation, pas densité » (.claude/rules/frontend-ui.md:40 ; contenu non relu).
- Les deux rails répondent à deux questions : « où vais-je ? » (rail-menu, quinze rayons) et « où en est ce dossier ? » (sept phases et leur statut). Le patient n'a que la seconde, sous forme de frise non cliquable.

### La feuille « Plus » et la barre basse
- La barre compte trois liens, Le Fil, Fiches, Synthèses, et un bouton « Plus » ; `<nav aria-label="Navigation principale">` (MobileBottomNav.tsx:9-19, 63-64).
- La feuille liste 12 destinations à plat, sans étiquette de groupe ni compteur ; « Comptes du cabinet » (rail) n'y figure pas alors que le commentaire dit « mêmes libellés » (MobileBottomNav.tsx:21-45).
- Aucun `prefixesActifs` côté mobile : sur une fiche patient ouverte, rien ne s'allume (déduction de lecture, non rendue) (MobileBottomNav.tsx:55-59).
- La feuille est un Dialog Radix propre au composant, avec `data-theme="praticien"` posé à la main ; libellés en `truncate`, contrairement au rail (MobileBottomNav.tsx:113-163).

### Vues rapides
- Quatre onglets (Fil du jour, Fiche-trajectoire, Consultation, Correspondance), dès `lg`, déclarés « raccourci, pas une navigation concurrente » ; hauteur `h-9`, soit 36 px (VuesRapides.tsx:6-21, 31, 39).

### Tiroir tablette et `PanneauSuperpose`
- `PanneauSuperpose` : trois variantes (tiroir, modale, feuille), trois largeurs de tiroir, `theme` `'praticien' | 'patient'` re-posé sur l'overlay et le contenu ; défaut `theme = 'praticien',` (web/src/components/ui/PanneauSuperpose.tsx:15-51, 77, 87, 132-134). Le tiroir de la primitive est ancré à droite (l.55) ; le tiroir tablette du praticien est à gauche (NavBar.tsx:133).
- Le shell praticien n'utilise pas la primitive : « `NavBar`, `MobileBottomNav`, `InboxQuestionnaires` — navigation, pas densité », tranché le 2026-09-03, « ne pas la rouvrir sans fait nouveau » (.claude/rules/frontend-ui.md:36-40). L'en-tête de la primitive annonce pourtant la peau « feuille » pour la nav mobile « Plus » (PanneauSuperpose.tsx:19) : deux sources se contredisent.
- La garde `PanneauSuperpose.guard.test.ts` balaie `components/patient`, `patient-companion` et `app/portail` ; aucune surface patient n'a migré (guard:24-26, 31-35).

### La méthode D-324
1. Constat daté : audit du cockpit du 2026-09-02 (absent de `docs/`), pièce 17 du dossier privé, fiche H43 du plan.
2. Questions à options avec recommandation, tranchées par le responsable ; texte rédigé par l'assistant (docs/DECISIONS.md:6237-6251). D-324 fixe trois groupes, une entrée par rayon, l'ordre, les libellés, la redirection de l'ancienne adresse (6262-6306).
3. Un lot, une PR : L4 et L5 réunis pour ne pas orpheliner un écran (DECISIONS.md:6302 ; docs/claude/handoffs/2026-10-18-1300-l4-menu-sans-heritage.md:25). La décision est écrite dans ce même lot : « D-324 (non clinique, écrite dans ce lot) » (handoff:15). Seuls les arbitrages ont précédé le code.
4. Bancs : aucun groupe Héritage, ordre des entrées, un seul item actif par rayon (DECISIONS.md:6303-6305) ; bases d'images Desktop régénérées parce que le rail y est capturé.
5. Clôture : handoff, fragment `changelog.d`, journal du plan, revue sur le sha de tête, merge avec `--match-head-commit` (handoff:72-79).
- Limites à ne pas reproduire : le rang de l'agenda a été choisi par l'assistant sans signature (handoff:27) ; le concept de Bibliothèque est « à revoir » (DECISIONS.md:6284) ; D-324 §7 dit « quatorze entrées », le banc en compte quinze.

### Filets de test et écarts d'accessibilité du praticien
- `SidebarRail.test.tsx` épingle l'ordre, les groupes, l'unicité de l'actif et les libellés ; `VuesRapides.test.tsx` quatre cas ; aucun banc unitaire pour `NavBar` ni `MobileBottomNav`.
- Écarts lus, non mesurés : Vues rapides en 36 px, bouton Déconnexion sans hauteur minimale (NavBar.tsx:84), nav du rail sans nom (SidebarRail.tsx:197), bouton « Plus » sans `aria-current`, aucun lien d'évitement, aucun `print:` dans les trois fichiers du shell.

## 4. Le portail patient aujourd'hui

### En-tête, colonne, pied
- Le layout est un composant serveur asynchrone qui ne reçoit que `children` : `export default async function PortailLayout({ children }: { children: ReactNode }) {` (web/src/app/portail/layout.tsx:20) ; rendu dynamique forcé (l.18). Aucun layout propre à `[token]`.
- En-tête : mot-symbole « Wellneuro » en `<span>`, donc sans lien d'accueil ; `ReadingComfortControl` ; « Se déconnecter » si le cookie est signé valide ; `flex-wrap` et `print:hidden` (layout.tsx:43-49). La signature seule décide du bouton : « SIGNATURE SEULE, AUCUNE LECTURE EN BASE. Ce booléen ne décide d'aucun accès » (l.21).
- Colonne : `<main className="flex-1 flex flex-col items-center px-4 py-8">`, sans rail ni largeur imposée ; chaque page pose son `max-w-md` ou `max-w-2xl` (layout.tsx:50-52).
- Pied, `print:hidden` : mention de non-diagnostic, numéros d'urgence cliquables (3114, 15 ou 112, 114), lien « Confidentialité et droits » (layout.tsx:53-64 ; web/src/lib/securite/urgenceSuicide.ts:66-73). Le lien lit le segment par `useParams` et rend `null` sans segment : `if (!params?.token) return null;` (web/src/components/patient/trust/PiedDePageInformations.tsx:9-10).
- « Confort de lecture » : `<details>` à trois cases (texte agrandi, espacement renforcé, animations réduites), stockage local, attributs `data-*` posés sur `<html>` et retirés au démontage (web/src/components/patient/ReadingComfortControl.tsx:52-81, 92-110). Il est monté sur les surfaces patient, « jamais côté praticien » (REGISTRE_FRONTIERES.md, A6-R1).
- Le commentaire du layout donne la contrainte de largeur : l'en-tête passe à la ligne pour tenir à 390 px, largeur de l'iPhone 13 des E2E (layout.tsx:34-42).

### Racine, jeton et session
- Il n'existe aucun `page.tsx` à `web/src/app/portail/` (`find -maxdepth 1` : `[token]`, `connexion`, `google`, `lien`, `layout.tsx`, `error.tsx`, `not-found.tsx`). `/portail` seul ne correspond à aucune route et retombe sur `web/src/app/not-found.tsx` (« une URL qui ne correspond à AUCUNE route ne remonte qu'ici », l.4-9). Le point d'entrée sans jeton est `/portail/connexion` (portail/not-found.tsx:29-30). Le middleware ne couvre que `/patient/:path*` (web/src/middleware.ts:42).
- Le segment `[token]` est l'idPatient, non secret ; le credential est le cookie `wn_portail`, signé HMAC-SHA256, httpOnly, 30 jours (web/src/app/portail/lien/[jeton]/route.ts:166-168 ; web/src/lib/patient-session.ts:13, 44, 61-73).
- Le client envoie quand même le segment (corps de `/api/portail/session`, `?token=` de `trust/etat`) ; la route lit le cookie seul (web/src/app/api/portail/session/route.ts:56-68).
- Le cookie n'est posé ou réémis qu'à quatre endroits : `lien/[jeton]`, `google/retour`, `api/portail/session` (session glissante, l.109-117) et `api/portail/deconnexion`. Le seul appelant de `/api/portail/session` est `[token]/page.tsx:718`.
- Tout lien est une chaîne absolue `/portail/${token}/…` ; le hub navigue en `<a href>` (rechargement complet), les pages secondaires en `<Link>`.

### L'écran d'étapes `[token]/page.tsx`
- Machine à étapes : loading, avant, date, mineur, consent, fiche, anamnese, done (web/src/app/portail/[token]/page.tsx:632-642). Son seul redirect va vers `/portail/connexion` (l.725-731).
- Un patient onboardé voit « Merci ! » et un bouton « Accéder à mon parcours » vers le hub (l.603-626) ; la page ne redirige jamais vers le hub (page.test.tsx:45-47). Les atterrissages lien magique et Google pointent sur cette page (lien/[jeton]/route.ts:174 ; google/retour/route.ts:238).

### Le hub `questionnaires/page.tsx`
- Le hub réel est `/portail/[token]/questionnaires`. Il n'appelle pas `/api/portail/session` mais `/api/portail/assignations` (statut d'âge, dossier ouvert, parcours, agendas).
- Ordre vertical : frise de 6 étapes (Consentement, Informations, Situation, Questionnaires, Analyse du praticien, Restitution) ; écran mineur ; carte « Mon parcours » ; proposition de réévaluation ; `<nav aria-label="Autres espaces">` ; `<details>` « Mon accompagnement » sans attribut `open` ; compteur de questionnaires ; groupes de liste (page.tsx:421-611 ; PatientJourneyProgress.tsx:19-26).
- Carte « Mon parcours » : H1 puis « Bonjour {prénom}. » ; la première tâche du fil est le seul bouton `primary` (`const [premiere, ...suivantes] = fil.taches;`, MonParcoursAccueil.tsx:72), les suivantes sont des liens sous « Ensuite » (l.123-150). L'ordre du fil est codé dans `lib/portail/filDuJour.ts:427`.
- Groupes de liste : « À compléter » ouvert ; correction, recueil terminé, transmis, expiré repliés (web/src/lib/portail/hubQuestionnaires.ts:41-51).

### « Autres espaces » et état des drapeaux en production
`<nav aria-label="Autres espaces" className="flex flex-wrap gap-3">` (page.tsx:442) ; aucun titre visible ; chaque entrée est un bouton `ghost` de `min-h-12` (PatientButton.tsx:9). Colonne « Posé » : docs/FEATURE_FLAGS.md, numéro de ligne entre parenthèses ; document écrit, non constaté.
| # | Libellé | Cible | Drapeau | Posé en production | Autre condition d'apparition |
|---|---|---|---|---|---|
| 1 | Consulter mon bilan | /bilan | aucun lu | sans objet | `bilanConsultable` (page.tsx:452-456 ; api/portail/assignations/route.ts:199-216) |
| 2 | Fiches remises par mon praticien | /fiches | `WN_FICHES_ASSIETTE_LECTURE` | 2026-09-29 (l.52) | fiches remises et bibliothèque non servie (LienFichesRemises.tsx:32) |
| 3 | Ma bibliothèque | /bibliotheque | `WN_PORTAIL_BIBLIOTHEQUE` | non à la base de l'audit : « NEUF ET ÉTEINT à la livraison (2026-10-25) », aucune pose consignée (l.59) ; mise à jour du 2026-11-02 : posé en production et constaté le 2026-11-01 (FEATURE_FLAGS.md:59 sur origin/main@29074ecb) | majeur, une fiche remise (LienBibliotheque.tsx:29) |
| 4 | Courrier pour votre médecin | /courrier-medecin | `WN_LETTRE_ADRESSAGE_PATIENT` | 2026-10-04 (l.46) | courrier remis (LienCourrierMedecin.tsx:24) |
| 5 | Courrier à remettre à votre médecin | /courrier-complement | `WN_COURRIER_COMPLEMENT` | allumé le 2026-10-30 (l.47), après le relevé du 2026-10-28 | courrier remis (LienCourrierComplement.tsx:25) |
| 6 | Pour votre médecin | /pour-votre-medecin | `WN_DOCUMENT_MEDECIN_PATIENT` | allumé le 2026-10-19 (l.48) | document disponible, partage accordé (LienPourVotreMedecin.tsx:24) |
| 7 | Transmettre un compte rendu d’analyses | /comptes-rendus | `WN_BIO_PORTAIL_ENABLED` ; exige `WN_BIO_INGEST_ENABLED`, `WN_CB_RESULTS_ENABLED`, `WN_CB_ENABLED` | 2026-10-07 (l.500) ; 2026-10-03 (l.498) ; 2026-09-09 (l.497) ; 2026-08-21 (l.29-30) | la route répond `ok` (LienTransmissionCompteRendu.tsx:23) |
| 8 | Déposer un document | /documents | `WN_PORTAIL_DEPOT_DOCUMENTS` | ouvert le 2026-10-20 (l.61) | majeur : sonde 409 sinon (api/portail/documents/route.ts:70-72) |
| 9 | Ma fiche de renseignements | /renseignements | `WN_PHYSIO_TRAITEMENTS` | allumé le 2026-10-28 (l.502) | aucune sur l'âge (api/portail/physio-traitements/route.ts:56-58) |
| 10 | Ouvrir Mon carnet alimentaire | /alimentation | aucun | sans objet | aucune (page.tsx:482-484) |
| 11 | Ouvrir mes rendez-vous de suivi | /suivi | aucun | sans objet | aucune (page.tsx:485-487) |
| 12 | Ouvrir mes échanges | /echanges | `WN_PORTAIL_MES_ECHANGES` | 2026-10-18 (l.62) | majeur : 409 sinon (api/portail/echanges/route.ts:36-38) |
| 13 | Ouvrir mon dossier à deux voix | /dossier | `WN_DOSSIER_DEUX_VOIX` | depuis le 2026-08-23 (l.143) | aucune (api/portail/dossier/route.ts:447-449) |
- Fiches (2) et bibliothèque (3) s'excluent par la même fonction `bibliothequeServie` : drapeau ouvert et majeur (web/src/lib/portail/bibliothequeDrapeau.ts:22-24 ; docs/DECISIONS.md:3133-3139). Treize emplacements, douze visibles au plus.
- Selon ce registre, neuf des dix drapeaux de lien sont posés ; seule la bibliothèque est éteinte, donc le lien des fiches paraît dès qu'une fiche est remise (état à la base de l'audit ; posée en production le 2026-11-01, la bibliothèque remplace ce lien sur un dossier majeur, FEATURE_FLAGS.md:59 sur origin/main@29074ecb). Pour un majeur en production, sept liens sont toujours présents (7, 8, 9, 10, 11, 12, 13) et cinq dépendent des données du patient (1, 2, 4, 5, 6) : de 7 à 12 (calcul sur le registre et le code, non constaté à l'écran). Un premier décompte donnait quatre drapeaux « éteints à la livraison » : trois sont posés (documents, courrier complément, document médecin), un seul ne l'est pas.
- Le plan écrit « jusqu'à quinze » et « treize servis sur un dossier de test le 2026-11-01 » (PLAN_WELLNEURO.md:2684) : le code ne donne que 13 emplacements et 12 visibles. L'écart n'est pas élucidé (hypothèse non vérifiée : 15 = 13 plus les deux portes retirées le 2026-09-12).

### Retours
- 17 pages affichent « ← Mon parcours » vers le hub ; `informations` affiche « ← Mon espace » vers le hub ; `conditions` affiche « ← Mon espace » vers `/portail/${token}`, c'est-à-dire l'écran d'étapes (informations/page.tsx:108 ; conditions/page.tsx:87-88). Cette cible est voulue : « Vers l'accueil de l'espace, qui choisit l'étape », parce que le patient venu par l'e-mail n'y est pas encore passé (conditions/page.tsx:83-86), et testée (conditions/page.test.tsx:70-73).
- `fiches/[idRemise]` revient à `/fiches` ; le questionnaire `[idAssignation]` a un `<a>` « ← Mon parcours » et des retours par callback ; la page 404 renvoie à `/portail/connexion` (not-found.tsx:29-30). Aucune page n'a de retour dans le shell.

### États et matrice entrées par états
- « Pause » désigne trois choses. (a) `recueilsEnPause` : mineur ou dossier clos (questionnaires/page.tsx:131-133, 275-281, 396-397). (b) La pause d'une action du protocole (D-281), qui déplie le détail du protocole d'office (PatientCompanionHome.tsx:70-72 ; DECISIONS.md:6920-6922). (c) `finDeCycle`, qui retire des blocs de l'accueil du protocole (PatientCompanionHome.tsx:152, 196, 216, 228-229).
- Date de naissance manquante : le hub ne rend que `DateNaissanceEcran` (page.tsx:351). « Avant de commencer » requis : le hub ne rend que cet écran (page.tsx:337) et la nav est absente du DOM (web/e2e/helpers/db.ts:222-223). Mineur : écran mineur, assignations et agendas vidés, la nav reste rendue (page.tsx:272-281, 427). Dossier clos : statut servi forcé à `majeur` (page.tsx:275).
| # | Majeur, dossier ouvert | Mineur | Dossier clos | Date manquante ou mur | Protocole non diffusé |
|---|---|---|---|---|---|
| 1 bilan | si consultable | idem (route `bilan` non lue) | idem | nav absente | sans effet lu |
| 2 fiches | si remises, bibliothèque non servie | oui si remises (sonde sans âge) | idem majeur | nav absente | sans effet lu |
| 3 bibliothèque | si drapeau et fiche remise | absente (409) | idem majeur | nav absente | sans effet lu |
| 4, 5, 6 courriers, pour votre médecin | si remis | idem majeur (sondes sans âge) | idem majeur | nav absente | sans effet lu |
| 7 compte rendu | présent | présent, POST 409 | présent, POST 409 | nav absente | sans effet lu |
| 8 dépôt | présent | absent (sonde 409) | présent, POST 409 | nav absente | sans effet lu |
| 9 renseignements | présent | présent, saisie refusée | présent, saisie refusée | nav absente | sans effet lu |
| 10 carnet | présent | présent, écriture 409 | présent ; écriture non lue | nav absente | présent |
| 11 suivi | présent | présent, recueils en pause | présent, recueils en pause | nav absente | présent, message d'attente |
| 12 échanges | présent | absent (409) | présent | nav absente | sans effet lu |
| 13 dossier à deux voix | présent | présent | présent | nav absente | sans effet lu |
- Sources de la matrice : bibliotheque/route.ts:40-41 ; documents/route.ts:70-72, 100-102 ; comptes-rendus/route.ts:56-76, 98-101 ; physio-traitements/route.ts:56-62, 84-86 ; echanges/route.ts:36-38 ; fiches-assiette/route.ts:57-63 ; lettre-adressage/route.ts:40-42 ; courrier-complement/route.ts:47-53 ; document-medecin/route.ts:39-41 ; dossier/route.ts:447-449 ; agenda-alimentaire/route.ts:646-647 (tous sous `web/src/app/api/portail/`) ; ProtocolCheckinForm.tsx:100-106 ; questionnaires/page.tsx:131-133.
- Le mineur voit donc de 5 à 10 liens, le majeur de 7 à 12 (calcul). Le « pause » du mineur et du dossier clos ne retire aucun lien du hub au-delà de 3, 8 et 12.
- Session fermée : un 401 du hub renvoie à `/portail/${token}`, qui renvoie à `/portail/connexion` (page.tsx:260-263).
- Décompte de lecture, non mesuré : 21 requêtes au montage du hub, dont 3 doublons relancés par `PatientCompanionHome`, monté même replié (page.tsx:152, 178, 206, 226, 258, 290 ; PatientCompanionHome.tsx:59-61, 86, 103, 111-115).

## 5. Inventaire des surfaces patient
Chemins relatifs à `web/src/app/portail/`. Vingt-quatre pages (24 fichiers `page.tsx`) : seize espaces permanents, trois tâches du fil (une seule périssable au sens de filDuJour.ts:219-227, le rendez-vous de suivi), deux étapes, deux utilitaires, un hub. Hors pages : trois route handlers (`lien/[jeton]`, `google`, `google/retour`), `layout.tsx`, `error.tsx`, `not-found.tsx`.
| Chemin | Titre | Nature | Entrée | Garde | Retour |
|---|---|---|---|---|---|
| `[token]/page.tsx` | un titre par étape (« Avant de commencer », « Merci ! », …) | étape | e-mail lien magique, retour Google, 401 des autres pages | cookie via `/api/portail/session`, sinon `/portail/connexion` | aucun ; sortie « Accéder à mon parcours » |
| `[token]/questionnaires/page.tsx` | « Mon parcours » | hub | gate, « ← Mon parcours » (17 pages), « ← Mon espace » (informations) | 401 vers `/portail/{token}` ; retours anticipés avant, date | aucun |
| `[token]/questionnaires/[idAssignation]/page.tsx` | titre de l'assignation | tâche du fil | hub, fil, Mes échanges | session ; consentement ; verrouillé en lecture seule | « ← Mon parcours » en `<a>` |
| `[token]/alimentation` | « Mon carnet alimentaire » | permanent | nav (inconditionnel) | aucune garde de page ; session facultative | « ← Mon parcours » |
| `[token]/bibliotheque` | « Ma bibliothèque » | permanent | nav | drapeau, majeur | « ← Mon parcours » |
| `[token]/bilan` | « Bilan neuronutritionnel » ou « Mon bilan » | permanent | nav, fil, Mes échanges | accès révoqué 403 | « ← Mon parcours » ; impression |
| `[token]/ce-qui-compte` | « Ce qui compte pour moi aujourd’hui » | tâche du fil | fil, Mon accompagnement, dossier ; pas la nav | `WN_CE_QUI_COMPTE`, fenêtre de dépôt | « ← Mon parcours » |
| `[token]/comprehension` | « Ce que votre praticien a compris de vous » | permanent | fil, Mon accompagnement, dossier ; pas la nav | `WN_COMPREHENSION` | « ← Mon parcours » |
| `[token]/comptes-rendus` | « Transmettre un compte rendu d’analyses » | permanent | nav, Mes échanges | `WN_BIO_PORTAIL_ENABLED` et trois drapeaux bio | « ← Mon parcours » |
| `[token]/conditions` | « Informations, confidentialité et droits » | étape (accusé) | e-mail `?vers=conditions`, informations | `WN_PORTAIL_CONDITIONS`, majeur, sinon redirection vers informations | « ← Mon espace » vers l'écran d'étapes |
| `[token]/courrier-complement` | « Courrier à remettre à votre médecin » | permanent | nav, fil, Mes échanges | `WN_COURRIER_COMPLEMENT` | « ← Mon parcours » ; feuille serveur |
| `[token]/courrier-medecin` | « Courrier pour votre médecin » | permanent | nav, fil, Mes échanges | `WN_LETTRE_ADRESSAGE_PATIENT` | « ← Mon parcours » ; feuille serveur |
| `[token]/documents` | « Déposer un document » | permanent | nav, Mes échanges | `WN_PORTAIL_DEPOT_DOCUMENTS`, majeur | « ← Mon parcours » |
| `[token]/dossier` | « Mon dossier, à deux voix » | permanent | nav | `WN_DOSSIER_DEUX_VOIX` | « ← Mon parcours » |
| `[token]/echanges` | « Mes échanges » | permanent | nav | `WN_PORTAIL_MES_ECHANGES`, majeur | « ← Mon parcours » |
| `[token]/fiches` | « Fiches remises par mon praticien » | permanent | nav (si bibliothèque non servie) | `WN_FICHES_ASSIETTE_LECTURE` | « ← Mon parcours » |
| `[token]/fiches/[idRemise]` | titre de la fiche | permanent | fil, cartes, Mes échanges | même drapeau | « ← Fiches remises par mon praticien » vers `/fiches` ; impression |
| `[token]/informations` | « Informations, confidentialité et droits » | permanent | pied de page (avec jeton), Mon accompagnement | aucun drapeau | « ← Mon espace » vers le hub |
| `[token]/pour-votre-medecin` | « Pour votre médecin » | permanent | nav | `WN_DOCUMENT_MEDECIN_PATIENT`, partage accordé | « ← Mon parcours » ; téléchargement .html |
| `[token]/protocole` | « Votre accompagnement » | permanent | Mon accompagnement seul | `WN_PORTAIL_PROTOCOLE_IMPRIMABLE`, majeur | « ← Mon parcours » ; impression |
| `[token]/renseignements` | « Ma fiche de renseignements » | permanent | nav | `WN_PHYSIO_TRAITEMENTS` | « ← Mon parcours » |
| `[token]/suivi` | « Rendez-vous de suivi » | tâche du fil (périssable) | nav, fil, Mon accompagnement | protocole diffusé exigé pour le contenu | « ← Mon parcours » |
| `connexion` | « Accéder à votre espace » | utilitaire | middleware `/patient`, gate sans session, 404 | jamais `notFound()` ; contenu selon drapeaux G4 et G5 | aucun |
| `lien/indisponible` | « Votre lien n’est plus valable » | utilitaire | refus de lien magique | `WN_G4_LIEN_MAGIQUE`, sinon `notFound()` | aucun |
- Garde de page, recompté en relecture : 15 pages appellent `notFound()` (14 sous `[token]` plus `lien/indisponible`, `grep` des appels réels) ; `conditions` redirige ; huit pages n'ont aucun garde de page : `[token]/page.tsx`, le hub, `[idAssignation]`, alimentation, bilan, suivi, informations, `connexion`. 15 + 1 + 8 = 24. Un premier décompte en annonçait « quatre » en oubliant `[idAssignation]` et `connexion`.
- Atteignables depuis le hub en au plus deux sauts : 20 pages ; jamais liées depuis le hub : `[token]`, `connexion`, `lien/indisponible`. Onze pages n'ont aucune porte dans la nav, dont ce-qui-compte, comprehension, protocole, conditions et informations (fiche d'inventaire).
- Cinq pages s'impriment (bilan, fiches/[idRemise], protocole, deux courriers) ; `pour-votre-medecin` télécharge un .html sans mise en page `print:`.

## 6. Écarts
Un écart implique un travail ; aucun n'est une correction demandée par l'audit. Chaque statut dit la vérification (vérification adverse, relecture finale, ou non vérifié).

### EP-01 — Le layout ne porte aucune navigation et ne voit pas le jeton
- Constat : le layout reçoit `children` seul ; tout menu persistant exige un composant client lisant `useParams` (patron du pied de page) ou un layout `[token]` à créer, non essayé.
- Preuve : web/src/app/portail/layout.tsx:20 `export default async function PortailLayout({ children }: { children: ReactNode }) {` ; PiedDePageInformations.tsx:9-10 `if (!params?.token) return null;`.
- Statut : vérifié (relu).
- Implique : le segment étant l'idPatient non secret, une URL de menu se construit sans jeton secret, mais chaque composant reçoit encore `token` en prop.

### EP-02 — La navigation n'existe qu'après les murs d'entrée
- Constat : « Avant de commencer » (D-292 §3) et la date de naissance (D-284 §3, « avant tout autre geste ») sont rendues par le hub avant sa nav ; un menu monté au layout s'afficherait aussi sur `/portail/connexion`, `lien/indisponible` et les étapes de `[token]/page.tsx`.
- Preuve : questionnaires/page.tsx:337 `if (avantRequis) {` et :351 `if (statut === 'date_manquante') {` ; web/e2e/helpers/db.ts:222 `* tant qu'elle n'est pas franchie, la navigation « Autres espaces » n'existe` ; layout.tsx:21.
- Statut : corrigé, relu pour les deux gardes. D-283 §5 ne vaut qu'« avant ce consentement » et laisse ouvertes les surfaces en service (DECISIONS.md:9108-9109) ; le mur vise le nouveau patient (8312-8318) ; `trust/etat` est « jamais bloquante en cas d'erreur réseau » (page.tsx:137-166), donc le mur se lève de façon asynchrone ; pour le dossier clos, le statut est servi « majeur » (page.tsx:275 ; D-341 §4, DECISIONS.md:4804).
- Implique : monter le menu par un composant client qui lit les mêmes états et ne rend rien tant que le mur est dressé ; dire par décision ce que voit un dossier clos (matrice du chapitre 4).

### EP-03 — « Autres espaces » : treize emplacements d'un seul poids, sans intertitre
- Constat : 3 liens écrits dans le JSX (bilan conditionnel, carnet, suivi) et 10 composants `Lien*` ; 13 emplacements, 12 visibles au plus. Seul un `aria-label` nomme la nav. En production, d'après le registre, un majeur en voit de 7 à 12 (calcul) ; l'ordre n'est pas chronologique (carnet et suivi datent de 2026-07-18, la bibliothèque du 2026-10-25 est en 3e position).
- Preuve : questionnaires/page.tsx:442 `<nav aria-label="Autres espaces" className="flex flex-wrap gap-3">` ; PatientButton.tsx:9 `ghost: 'min-h-12 inline-flex items-center justify-center py-3 px-[22px]…` ; PLAN_WELLNEURO.md:2684 « à regrouper ou hiérarchiser sans retirer d'accès (A6-R1, une étape à la fois) ».
- Statut : corrigé. Un premier calcul donnait « au moins 708 px » ; c'est un plafond (un bouton par ligne), pas un plancher : les boutons sont `inline-flex` de largeur automatique dans une nav `flex-wrap`, donc à 672 px (`max-w-2xl`, page.tsx:422) plusieurs tiennent sur une ligne ; à 390 px un libellé long (« Transmettre un compte rendu d’analyses ») peut passer sur deux lignes et dépasser le plafond. Hauteur réelle : mesurée en L1 (chapitre 11, « Constat à l'écran de L1 ») ; elle dépasse ce plafond, que Q37 recalcule (ligne suivante).
- Implique : plafonds calculés de 708 px pour 12 liens (12 x 48 + 11 x 12) et de 408 px pour 7 ; des intertitres ajoutent des lignes sans garantir une hauteur moindre ; la mesure se fait à l'écran sur dossier de test (Q23). Recalculés après L1 (Q37, chapitre 16) avec le lien mesuré de 50,8 px : 741,6 px pour 12 liens (12 x 50,8 + 11 x 12) et 427,6 px pour 7. Ce sont les hauteurs mesurées à 390 px pour 12 liens (maximum simulé) et 7 liens (majeur clos), un lien par ligne, aucun libellé sur deux lignes ; un libellé replié les dépasserait encore.

### EP-04 — Dix composants se masquent eux-mêmes ; le parent ne sait rien d'eux
- Constat : chaque `Lien*` rend un lien et `return null` tant que sa route n'a pas dit « ouvert » (les drapeaux `WN_*` ne sont pas `NEXT_PUBLIC`) ; le parent ne peut pas savoir si un groupe est vide.
- Preuve : web/src/components/patient-companion/LienMesEchanges.tsx:33 `if (!visible) return null;` ; questionnaires/page.tsx:91-100.
- Statut : vérifié pour le `return null` des dix ; relu pour les prédicats de sonde (tableau du chapitre 4). Le décompte de 21 requêtes reste non vérifié (lecture, non mesuré).
- Implique : retirer une étiquette de groupe vide exige de remonter l'état des sondes avant de regrouper.

### EP-05 — Carnet et rendez-vous de suivi : deux principes écrits, pas un oubli
- Constat : deux `<a>` sans condition. LOT-05 pose, dans le même document, « sans un oui franc, pas de lien » (:38-39) et, sous « Écart assumé », « une porte qui s'explique vaut mieux qu'une porte qui s'efface (DC-24) » (:41-46). La page `/suivi` s'explique : sans protocole diffusé, elle dit « Votre suivi commencera dès que votre praticien aura partagé votre accompagnement ». DC-24 dit ailleurs « une donnée absente n'est jamais zéro ni normale » (DECISIONS.md:7619-7620) : la formule de la « porte » est celle de LOT-05, hors DECISIONS. D-357 §2, « un rayon vide ne s'affiche pas » (DECISIONS.md:3333-3335), vise les rayons d'une page, non les liens.
- Preuve : questionnaires/page.tsx:485-487 `Ouvrir mes rendez-vous de suivi` ; ProtocolCheckinForm.tsx:100-106 `if (!state || !state.protocoleDiffuse) {` ; api/portail/protocole/checkin/route.ts:153 `protocoleDiffuse: false,`.
- Statut : corrigé. Une première lecture y voyait un écart à corriger par une sonde `protocoleDiffuse` ; relu, c'est un arbitrage entre deux principes de LOT-05. Le « Écart assumé » de LOT-05 visait les deux portes retirées le jour même (LOT-05:55-71) ; sa portée sur les liens restants n'est écrite nulle part. La garde d'âge du carnet est lue côté écriture seulement (agenda-alimentaire/route.ts:646-647).
- Implique : retirer le lien à un patient sans protocole diffusé serait retirer un accès (PLAN:2684 ; D-276 §1). Tant que ces deux entrées restent inconditionnelles, leur groupe n'est jamais absent (Q9).

### EP-06 — Retours et noms : « Mon parcours » contre « Mon espace », trois cibles
- Constat : 17 pages disent « ← Mon parcours » vers le hub ; `informations` dit « ← Mon espace » vers le hub ; `conditions` dit « ← Mon espace » vers l'écran d'étapes ; `fiches/[idRemise]` revient à `/fiches` même si la bibliothèque est servie ; le hub s'intitule « Mon parcours ».
- Preuve : informations/page.tsx:108 `← Mon espace` ; conditions/page.tsx:87-88 `<Link href={`/portail/${token}`} className="shrink-0 text-sm text-primary hover:underline">` ; conditions/page.test.tsx:70-73 « le retour mène à l’accueil de l’espace, qui choisit l’étape ».
- Statut : vérifié (décompte et deux « Mon espace » relus). Corrigé : la cible de `/conditions` est une décision de test et de page (conditions/page.tsx:83-86), pas un défaut. Ce qu'un patient venu de la bibliothèque voit sur `/fiches` : non vérifié.
- Implique : une ancre « Mon parcours » active exige un nom et une cible uniques ; unifier `/conditions` vers le hub contournerait le choix d'étape de l'écran d'accueil (conditions/page.tsx:84-86), que le patient venu par l'e-mail `?vers=conditions` n'a pas encore franchi dans la session, et l'effet sur la réémission du cookie reste à vérifier (EP-07) ; le mur « Avant de commencer » n'est pas en cause : le patient suivi n'en a aucun (D-292 §3, DECISIONS.md:8312-8318 ; avantDeCommencer.ts:103-106) et le hub le rend lui-même (questionnaires/page.tsx:337-345).

### EP-07 — L'écran « Merci ! » et la réémission du cookie
- Constat : un patient onboardé qui arrive par lien magique ou Google atterrit sur `[token]/page.tsx` et voit « Merci ! » ; le cookie n'est réémis (session glissante) que par cette page ; un hub atteint par son adresse ne fait pas glisser la session.
- Preuve : [token]/page.tsx:603-626 `Vos renseignements ont bien été transmis à votre praticien.` ; api/portail/session/route.ts:109 `// Rafraîchit le cookie (session glissante) : réémet l'identité déjà vérifiée`.
- Statut : non vérifié pour l'effet navigateur (non-réémission déduite de deux faits lus). Relu pour les dépendances ci-dessous.
- Implique : rendre l'écran d'étapes redirigeant oblige à déplacer la réémission, donc le périmètre auth (T3 et revue `wn-reviewer`, .claude/rules/auth-securite.md:19-22), et à réécrire : trois gabarits d'e-mail qui disent « Une fois connecté : choisissez « Accéder à mon parcours » » (web/src/lib/correspondance/registreGabarits.ts:483, 555, 762), donc de nouvelles versions de gabarit ; trois bancs de gabarit (registreGabarits.test.ts:112, 266, 622) ; deux bancs de page (page.test.tsx:69, 168) ; l'E2E `portail-parcours.spec.ts:251-260`, qui attend « Merci ! » puis clique « Accéder à mon parcours ». `portail-lien-magique.spec.ts:28` n'épingle que `/\/portail\/(?!lien\/)/` et `portail-google.spec.ts:20` le titre « Accéder à votre espace » : une redirection ne les casse pas (lus).

### EP-08 — Aucun état actif, aucune landmark persistante nommée, aucun lien d'évitement
- Constat : ni `aria-current` ni `usePathname` dans les arbres patient ; la seule landmark de navigation est « Autres espaces » (le layout porte `banner`, `main` sans id, `contentinfo`) ; aucun lien d'évitement ; un seul `metadata` pour 24 pages ; les dix `Lien*` apparaissent après leur sonde sans zone live.
- Preuve : web/src/app/portail/layout.tsx:11 `title: 'Wellneuro — Espace patient',` ; côté praticien SidebarRail.tsx:232 `aria-current={active ? 'page' : undefined}`.
- Statut : corrigé. La première commande de preuve (grep sans `-E`) était non probante ; avec `-E` le résultat est 0 ligne. Cinq pages sont `'use client'` et ne peuvent pas exporter `metadata` (connaissance de Next 15.5, non relue).
- Implique : un titre par route demande un layout serveur par segment pour ces cinq pages.

### EP-09 — Libellés hétérogènes
- Constat : première personne (« Ma bibliothèque », « Mes échanges ») et deuxième personne (« Courrier pour votre médecin ») ; verbe « Ouvrir » sur quatre liens ; « Ouvrir Mon carnet alimentaire » seul en Title Case ; le bilan a deux titres de page.
- Preuve : questionnaires/page.tsx:483 `Ouvrir Mon carnet alimentaire` ; web/src/components/patient/lettre-adressage/textesLettre.ts:12 `export const TITRE_LETTRE = 'Courrier pour votre médecin';`.
- Statut : non vérifié (constat sans vérification adverse). D-360 §1 fixe la première personne pour les titres de la bibliothèque (DECISIONS.md:3125-3131), pas pour tous les libellés ; des e-mails déjà envoyés citent « Ouvrir mon dossier à deux voix » et « Mon accompagnement » (registreGabarits.ts:483-484, 762-763).
- Implique : renommer une entrée citée dans un e-mail demande une nouvelle version du gabarit.

### EP-10 — Le compteur du hub et la règle « un seul bouton plein » reposent sur des conventions
- Constat : le hub affiche « N questionnaires à compléter · ≈ N min » sans décision retrouvée qui l'admette. D-333 §1 compte deux familles d'exceptions à la règle du portail ; une troisième vient de D-355, une quatrième de D-357 ; aucune n'admet un compte de ce qui reste. La règle « une seule action mise en avant » est de convention.
- Preuve : questionnaires/page.tsx:544 `{aCompleter === 1 ? 'Un questionnaire à compléter' : `${aCompleter} questionnaires à compléter`}` ; DECISIONS.md:5397-5398 `Deux familles d'exceptions, déjà au code, sont actées ici` ; :3459 « troisième famille d'exceptions » ; :3296 « quatrième famille d'exceptions » ; MonParcoursAccueil.tsx:36-39 « AUCUN COMPTE DE TÂCHES ».
- Statut : corrigé. Un premier constat écrivait « quatre familles dans D-333 §1 » et se contredisait dans le même bloc ; relu : deux dans D-333 §1, trois avec D-355, quatre avec D-357. Autres boutons `primary` : réévaluation (PropositionPackReevaluation.tsx:119-127), liste « À compléter » (page.tsx:575-581), « Voir le détail de mon protocole » (PatientCompanionHome.tsx:229-237). Aucun test ne compte les boutons pleins.
- Implique : un menu patient ne porte aucun chiffre ; le compteur du hub est à nommer en exception ou à retirer avant d'être repris (Q18).

### EP-11 — Les jetons du rail n'existent que sous le thème praticien
- Constat : les treize `--rail-*` sont déclarés dans le seul bloc `[data-theme='praticien']` ; le bloc patient n'en a aucun ; le portail ne pose aucun `data-theme` et retombe sur `:root`.
- Preuve : web/src/app/globals.css:163 `[data-theme='praticien'] {` et :218 `--rail-focus-ring: var(--solar-500);` ; docs/design-system-d1.md:457 `| --rail-background / --rail-surface | teal-950/900 | night … | — (pas de rail) |`.
- Statut : corrigé deux fois. (1) Une première lecture prenait « pas de rail » pour une interdiction ; c'est une cellule du tableau de correspondance des jetons : le thème patient n'a pas de jeton de rail. (2) A5-R2 pose « rail nuit structurel signature côté praticien, patient clair fixe, aucun toggle » (REGISTRE_FRONTIERES.md:209-210) : cela exclut un rail nuit et une bascule, pas un rail clair. Un rail ou un tiroir patient demande au plus deux jetons nouveaux (une largeur, une ombre d'état actif) : `min-h-11` (44 px), `min-h-12` (48 px) et `h-16` (64 px) existent.
- Implique : amender A5-R2 n'est pas nécessaire pour C ; copier `MobileBottomNav` repeindrait les couleurs en nuit et indigo. La doc design system est périmée aux lignes 116, 123, 136 et 20-21 et n'a aucune section sur cibles, impression ni confort de lecture.

### EP-12 — Les gardes ne voient pas un Dialog Radix brut
- Constat : `PanneauSuperpose.guard` compte les `<PanneauSuperpose` sans `theme="patient"` ; `design-system.guard` n'interdit que `bg-white` et `text-[…]` ; un Dialog brut recopié de `MobileBottomNav` avec `data-theme="praticien"` passe les deux.
- Preuve : web/src/components/ui/PanneauSuperpose.guard.test.ts:55 `const montages = propre.match(/<PanneauSuperpose[\s/>]/g)?.length ?? 0;` ; MobileBottomNav.tsx:118 `<Dialog.Overlay data-theme="praticien" className="fixed inset-0 z-50 bg-foreground/35 md:hidden" />`.
- Statut : corrigé. `PatientConfirmDialog.tsx:27` est un Dialog brut sans `data-theme`, correct parce que `:root` est le thème patient : la garde à écrire vise `data-theme="praticien"` et toute classe `rail-`, pas l'absence d'attribut.
- Implique : ajouter cette garde sous `components/patient`, `patient-companion` et `app/portail` avant tout composant de menu.

### EP-13 — Le focus du rail est solaire, celui du patient est forêt
- Constat : le rail et la barre basse posent `ring-rail-focus-ring` (solaire) ; calculé en WCAG 2.x, le solaire fait 1,65:1 sur le sable et 2,12:1 sur l'ivoire, mais 7,13 à 7,76:1 sur le fond nuit. Côté patient, la règle globale `:focus-visible` (3 px, décalage 2 px) applique la forêt (4,64:1 sur sable, 5,98:1 sur ivoire).
- Preuve : globals.css:148 `--color-focus-ring: var(--forest-600);` ; SidebarRail.tsx:240 `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rail-focus-ring` ; maquette-cible-ux-5-0.html:186 `.patient :focus-visible{ outline:3px solid var(--accent); outline-offset:2px; }`.
- Statut : vérifié (ratios recalculés en relecture). La maquette annonce le cuivre (3,52:1 sur sable) ; design-system-d1.md:626-628 documente la forêt pour le patient. Le rognage de l'anneau dans la liste défilante de la feuille est une déduction non rendue.
- Implique : ne jamais écrire `outline-none` avec `rail-focus-ring` côté patient ; laisser la règle globale.

### EP-14 — Une barre fixe masquerait le pied d'urgence
- Constat : le pied (numéros 3114, 15 ou 112, 114) est frère du `main` ; la barre praticien est fixe, `h-16` (64 px, 72 px à 112,5 %, calcul), et le praticien réserve `pb-24` ; le layout portail n'a pas cette réserve. Aucune occurrence de `safe-area` ni d'export `viewport` dans `web/src`.
- Preuve : NavBar.tsx:122 `<main className="min-w-0 flex-1 pb-24 md:pb-6 lg:pb-8">{children}</main>` ; MobileBottomNav.tsx:65 `fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-rail-border` ; DECISIONS.md:8255 `- au pied de toutes les pages de `/portail`, connexion comprise, les numéros,`.
- Statut : vérifié, avec nuances. Le praticien n'affiche pas son rail sous 1024 px (il utilise le tiroir). `env(safe-area-inset-bottom)` ne vaut quelque chose qu'avec `viewport-fit=cover`, absent. Un export `viewport` irait dans `app/portail/layout.tsx`, pas dans `app/layout.tsx`. Le projet iPhone 13 de Playwright est une émulation sans encoche.
- Implique : toute barre basse patient demande une réserve de bas appliquée au conteneur, pas au `main`.

### EP-15 — L'impression : le shell praticien n'a aucun `print:`
- Constat : le portail masque en-tête, pied et liens de retour à l'impression ; `NavBar`, `SidebarRail` et `MobileBottomNav` comptent 0 occurrence de `print:` ; `layout.test.tsx` ne contient pas le mot « print ».
- Preuve : layout.tsx:43 `flex flex-wrap items-center justify-between gap-3 print:hidden` ; D-392 §1 exclut les liens de navigation des imprimés (DECISIONS.md:1083, 1101).
- Statut : vérifié pour les comptages. Correction : le pied du portail n'est pas imprimé, mais la feuille du protocole imprime ses propres numéros (`hidden print:block`, MonProtocoleImprimable.tsx:107-108, D-392 §2).
- Implique : toute navigation neuve porte `print:hidden`, barre fixe comprise, et un banc le prouve.

### EP-16 — Cibles et confort de lecture à 112,5 %
- Constat : le registre exige des cibles de 44x44 px ; `PatientButton` `primary` et `ghost` font `min-h-12` (48 px) ; les liens « ← Mon parcours » n'ont aucun `min-h` (22,5 px, calcul : 15 x 1,5) ; à 112,5 %, `min-h-11` passe à 49,5 px, `min-h-12` à 54 px, `h-16` à 72 px, alors que `252px` et `min-h-[44px]` ne bougent pas.
- Preuve : docs/claude/REGISTRE_FRONTIERES.md:102-104 `Accessibilité : contraste AA, aucune fonction critique au seul survol, cibles ≥ 44×44 px` ; globals.css:243-245 `font-size: 112.5%;` ; PatientButton.tsx:9.
- Statut : non vérifié (calculs, aucun rendu).
- Implique : écrire les cibles en `rem`, jamais en `min-h-[44px]` ; libellés dans un `<span>` pour échapper à l'interligne de 1,75 posé sur `p`, `li`, `label` (globals.css:247-251).

### EP-17 — Couverture de test de la navigation patient
- Constat : aucun banc n'assère la nav comme ensemble ; `questionnaires/page.test.tsx` monte le hub avec toutes les sondes fermées. Sept `Lien*` ont un banc ; `LienPourVotreMedecin` et `LienFicheRenseignements` n'en ont aucun ; `LienDossierDeuxVoix` n'a qu'un E2E. Huit drapeaux de nav sur dix ne sont armés ni dans `playwright.config.ts`, ni dans `ci.yml`, ni dans `wn-test-worktree.sh`.
- Preuve : web/playwright.config.ts:221 `WN_DOSSIER_DEUX_VOIX: 'true',` ; web/e2e/portail-dossier-deux-voix.spec.ts:75 `const lien = page.getByRole('link', { name: 'Ouvrir mon dossier à deux voix' });`.
- Statut : corrigé. Le carnet n'est joint que par `page.goto` (portail-parcours.spec.ts:472) et `/suivi` par aucun spec ; aucun `axe` n'est passé sur le hub. Les huit drapeaux sont BIBLIOTHEQUE, DEPOT_DOCUMENTS, MES_ECHANGES, PHYSIO_TRAITEMENTS, FICHES_ASSIETTE_LECTURE, LETTRE_ADRESSAGE_PATIENT, COURRIER_COMPLEMENT et DOCUMENT_MEDECIN_PATIENT. Un `.env.local` éventuel n'a pas été lu.
- Implique : le filet L1 précède tout regroupement.

### EP-18 — Côté praticien, trois listes écrites à la main déjà divergentes
- Constat : `groupesNavigation` (15 entrées, 3 groupes), `plusItems` (12 entrées à plat) et `VUES` (4 onglets) sont trois listes distinctes ; « Comptes du cabinet » est absent de `plusItems` alors que le commentaire annonce « mêmes libellés ». Aucune garde ne compare les listes.
- Preuve : MobileBottomNav.tsx:32 `const plusItems: { href: string; label: string; icon: LucideIcon; matiere?: 'exact' }[] = [` ; SidebarRail.tsx:87 `{ href: '/dashboard/cabinet', label: 'Comptes du cabinet', icon: Tally5 },`.
- Statut : vérifié.
- Implique : côté patient, une seule déclaration de la liste pour tous les gabarits.

### EP-19 — L'arbitrage du 2026-09-12 n'est consigné dans aucune décision
- Constat : le responsable a retiré le jour même deux boutons vers « ce qui compte » et « ce que j'ai compris » ; leurs écrans sont déjà atteints par le dossier à deux voix, une tâche du fil et « Mon accompagnement ».
- Preuve : questionnaires/page.tsx:496-497 `PAS DE PORTE SÉPARÉE VERS « CE QUI COMPTE » NI VERS « CE QUE J'AI` ; LOT-05-les-deux-portes.md:64-65 `ils ajoutaient du bruit à une navigation qui en portait cinq.`
- Statut : corrigé. Absent de `DECISIONS.md` (D-172, l.20236-20239, liste encore les deux portes comme livrées). Consigné aussi dans LOT-05 (l.4, 55-71), CAMPAGNE.md (66-67, 187), LOT-07 (57-59), SESSION_LOG.md:5650, FEATURE_FLAGS.md:245-249, le handoff 2026-09-12-1630 (17-18, qui ne consigne que la fusion de #1052), filDuJour.ts:54-56 et page.tsx:103-106.
- Implique : le commentaire de `page.tsx:496-505` disparaît avec une refonte du JSX ; le verser à une D-xxx.

### EP-20 — Les sondes n'appliquent pas la même règle d'âge ni de dossier clos
- Constat : chaque sonde décide seule. Documents et échanges refusent le non-majeur (409), la bibliothèque aussi ; compte rendu, renseignements, dossier à deux voix, courriers et fiches répondent « ouvert » au mineur. Le mineur voit donc de 5 à 10 liens, dont des pages dont l'écriture lui est refusée.
- Preuve : api/portail/documents/route.ts:72 `if (age !== 'majeur') return echec('hors_majeur', 'Cette page n’est pas disponible pour votre dossier.', 409);` ; api/portail/physio-traitements/route.ts:56-58 `return NextResponse.json<PortailPhysioTraitementsResponse>({ ok: true, ouvert: true });`.
- Statut : vérifié (relu sur les routes citées au chapitre 4) ; l'effet du mineur sur `bilan` et `ce-qui-compte` : non lu.
- Implique : le banc d'ordre de L1 et L2 doit épingler la liste visible par état (majeur, mineur, dossier clos), pas seulement l'ordre ; Q9 et Q10 en dépendent.

### EP-21 — La frise des six étapes est le seul analogue du rail des phases, et n'est pas une navigation
- Constat : `PatientJourneyProgress` est un `<ol>` de six puces sans lien ni bouton ; les étapes 5 et 6 sont « côté praticien » ; l'étape courante vient de `journeyCurrentId`. Aucun rattachement entrée-étape n'est écrit dans les fichiers lus.
- Preuve : web/src/components/patient/PatientJourneyProgress.tsx:56 `<ol className="flex items-start overflow-x-auto pb-1 -mx-1 px-1" aria-label="Étapes de votre parcours">` ; questionnaires/page.tsx:425 `<PatientJourneyProgress steps={buildJourneySteps(etatParcours?.journeyCurrentId ?? 4)} />` ; trajectoire-partagee/contrat.ts:277 `journeyCurrentId: 5 | 6;`.
- Statut : vérifié (relu).
- Implique : une « organisation par étapes » du menu patient n'a pas de matière (voir « Écartée » au chapitre 8).

### EP-22 — Collisions de noms de groupes
- Constat : un premier découpage proposait un groupe « Mon dossier », qui contient « Ouvrir mon dossier à deux voix », dont le H1 est « Mon dossier, à deux voix ». « Mon suivi » côtoie « rendez-vous de suivi » (vocabulaire D-317 §6), « Mon parcours » et « Mon accompagnement ». « Mes documents » et « Mes informations » sont pris. Sans occurrence dans `web/src` et `web/e2e` : « Au jour le jour », « Ce que j'ai reçu », « Ce que je transmets », « Avec mon praticien ».
- Preuve : web/src/components/patient-companion/DossierDeuxVoixView.tsx:318 `<PatientPageHeader title="Mon dossier, à deux voix" />` ; web/e2e/portail-dossier-deux-voix.spec.ts:79 `getByRole('heading', { name: 'Mon dossier, à deux voix' })` ; informations/page.tsx:180 `titre="Mes documents d’information"` ; textesDepot.ts:66 `'Mes documents déposés'` ; PatientCompanionHome.tsx:269 `Mes informations et mes droits` ; DECISIONS.md:12605-12606 (D-251 §8) ; DECISIONS.md:6739-6741 (D-317 §6).
- Statut : vérifié (relu, `grep` sur `web/src` et `web/e2e`). Le principe de D-251 §8, qu'un nom ne se confonde pas avec un autre, s'applique aux noms de groupes.
- Implique : ces premiers noms de groupes sont remplacés au chapitre 9 ; le choix est la question Q5.

### EP-23 — Le mot-symbole n'est pas un lien et `/portail` n'a pas de page
- Constat : le mot-symbole « Wellneuro » est un `<span>` ; `web/src/app/portail/` n'a aucun `page.tsx` ; le layout, serveur, ne connaît pas le segment. Un lien « Accueil » en en-tête doit donc choisir sa cible : hub, écran d'étapes ou connexion.
- Preuve : layout.tsx:44 `<span className="font-display text-xl font-bold text-primary">Wellneuro</span>` ; web/src/app/not-found.tsx:4-9 (URL sans route) ; middleware.ts:42 `matcher: '/patient/:path*',`.
- Statut : vérifié (relu).
- Implique : Q24.

### EP-24 — « Mon accompagnement » fermé alors que deux décisions veulent la lecture sans clic
- Constat : le `<details>` « Mon accompagnement » n'a pas d'attribut `open`. D-315 veut la pause d'une action lue sans clic, D-349 §2 l'encart de conduite lu avant tout clic. Les deux dépendent de drapeaux posés en production : `WN_PORTAIL_LECTURE_PROTOCOLE` (2026-10-16, FEATURE_FLAGS.md:54) et `WN_PORTAIL_ENCART_CONDUITE` (2026-10-24, :55). `WN_PORTAIL_TROIS_PLANS` (2026-10-27, :57) et `WN_PORTAIL_APPUI_RENVOI` (2026-10-24, :56) conditionnent le contenu du fil et du détail.
- Preuve : questionnaires/page.tsx:514 `<details className="rounded-xl border border-border bg-surface p-4">` ; api/portail/protocole/route.ts:269-284 (`lectureDuDetail`, `encartConduite` servis si les drapeaux sont ouverts) ; lib/portail/lectureProtocole.ts:16 `return process.env.WN_PORTAIL_LECTURE_PROTOCOLE === 'true';` ; encartConduite.ts:15 ; troisPlans.ts:21 ; appuiRenvoi.ts:23 ; DECISIONS.md:6920-6922 et 3978-3981.
- Statut : corrigé. Un premier constat le laissait « non rouvert » ; le contradicteur ne tient que si les drapeaux sont ouverts, et le registre les donne posés. L'effet à l'écran reste non constaté.
- Implique : Q19 est posée sur un fait de production, pas sur un cas de laboratoire.

### Constats réfutés : ce que l'audit a d'abord cru, et ce qui est vrai
- Écran mineur « sans lien » : il porte trois liens `tel:` (15, 112, 119) ; seul le bouton « Accéder à mon parcours » est absent (DateNaissanceEcran.tsx:53-59 ; texteMineurs.ts:49 ; questionnaires/page.tsx:427).
- « D-333 n'admet aucun chiffre » : quatre familles d'exceptions existent en tout (D-333 §1 en compte deux, D-355 une, D-357 une) ; « tâche périssable » est réservé aux agendas prioritaires et au rendez-vous de suivi (filDuJour.ts:219-227).
- « D-172 fonde la liste de liens sous un geste » : D-175 « Renverse [[D-172]] » (DECISIONS.md:19880) ; D-175 §4 dit « replié sous « Ensuite » » (19907), alors que LOT-07 et MonParcoursAccueil.tsx:24-28 disent « Rien n'est replié » ; la formule « pas le masquage » n'est pas dans `DECISIONS.md`.
- « Le test de l'entrée de menu est l'existence d'une page propre » : toutes les pages exclues (ce-qui-compte, comprehension, protocole, informations) ont route et H1 ; le critère effectif est le doublon avec un écran déjà ouvert ; « Mon accompagnement » répète cinq portes dont quatre antérieures au 2026-09-12 (la porte « imprimer » date du 2026-10-28, PatientCompanionHome.tsx:256-260).
- « Précédents H35, D-288 §4, D-392 sortent un menu de la file C » : D-288 §4 vise une nouvelle version d'un texte accusé, H35 l'ajout d'une mention (rang [Hypothese]), D-392 traite page et lien comme surface neuve sans place ; le plan range la dette en « lot d'écran, file A » (PLAN:2319, 2684).
- « Le pied porte « Confidentialité et droits » sur toutes les pages » : le lien est absent sans jeton dans l'URL (PiedDePageInformations.tsx:10).
- « Cinq jetons de taille à créer » : trois existent nativement ; au plus deux sont à créer (EP-11).
- « La seule landmark » et « de 2 à 14 arrêts Tab » : seule landmark de navigation ; le nombre d'arrêts n'a aucune source.
- « D-324 : décision signée avant le code, une PR par lot » : la décision est écrite dans le lot, une PR réunit L4 et L5 (chapitre 3) ; « SESSION_LOG en append » n'est plus exigé (D-372 §1-§2, DECISIONS.md:2509-2515).
- « « Autres espaces » n'apparaît que dans des commentaires » : c'est l'`aria-label` de la nav ; `LienDossierDeuxVoix` a un E2E ; il y a trois liens écrits dans le JSX, pas deux.
- Réfuté en relecture : « un patient réel voit probablement bien moins de 12 liens, quatre drapeaux étant éteints à la livraison ». Trois de ces quatre sont posés en production (dépôt le 2026-10-20, courrier complément le 2026-10-30, document médecin le 2026-10-19) ; seule la bibliothèque ne l'était pas à la base de l'audit (FEATURE_FLAGS.md:61, 47, 48, 59) ; elle est posée en production depuis le 2026-11-01. Le nombre vu dépend ensuite des données du patient, non lues.

## 7. Ce que la doctrine impose
Statuts : décidé (décision signée), principe (registre, règle, campagne ou convention de code), dette (plan).
| Règle | Source | Statut |
|---|---|---|
| Praticien : le cycle clinique est la « colonne vertébrale de navigation », « on navigue par phase, jamais par scroll » | docs/claude/REGISTRE_FRONTIERES.md:315-323 (A6-R1) | principe |
| Patient : « une étape à la fois (séquentiel, pas de hub empilé) », principe inverse du praticien ; il ne dit pas si un menu persistant est exclu | REGISTRE_FRONTIERES.md:334-336 (A6-R1) | principe |
| Le fil du jour prend la place de l'étape : un geste mis en avant, le reste sous « Ensuite » ; non reporté dans le registre | DECISIONS.md:19880, 19906-19908 (D-175) ; 20116-20120 (D-172, amendement) | décidé |
| Rail nuit = signature praticien ; patient clair fixe, aucun toggle. Cela exclut un rail nuit et une bascule, non un rail clair | REGISTRE_FRONTIERES.md:209-210 (A5-R2) | principe |
| Le thème patient n'a pas de jeton de rail (cellule de table, non interdiction) | docs/design-system-d1.md:457 | principe |
| Avis non signé : Observatoire et Jardin « ne doivent surtout pas devenir la même interface », conservé « comme trace » | docs/ai/AUDIT_UX_CONVERGENCE_SPIRALE_5-0.md:254, 17 | principe (non signé) |
| Antécédents non signés : « ajouter une navigation tactile persistante » (UX-5) ; barre basse patient à 4 entrées (Accueil, Journal, Suivi, Documents), maquette du 2026-07-15 ; UX-2 à UX-5 renvoyées à C1, C3, C4, C5 | docs/claude/UX_WELLNEURO_3_0.md:995-1002 ; propositions/2026-07-15-wellneuro-4-0/maquette-wellneuro-4-0.html:1095-1099 ; campagnes/2026-07-11-refonte-ux-shell-3-0/CAMPAGNE.md:53, 161-162 | principe (aucune campagne ne les porte) |
| Aucun chiffre au portail, sauf familles nommées ; « aucune autre n'est admise sans décision » ; D-333 §1 en compte deux, D-355 une, D-357 une | DECISIONS.md:5392-5408, 3459, 3296 | décidé |
| Vocabulaire patient des états 5 et 6 : « Vos éléments ont été transmis » / « Votre praticien les prépare » / « Votre restitution est disponible » ; jamais de score, jamais de délai promis ; les quatre statuts sont montrables au patient | campagnes/2026-07-22-sp-conv-trajectoire-partagee/CAMPAGNE.md:94, 98 (D7, D11) ; lots/LOT-04-parcours-patient-synchronise.md:20-24 ; web/src/lib/trajectoire-partagee/formulations.ts:15-20 ; formulations.guard.test.ts:16-23 | décidé (campagne, garde de code) |
| Accessibilité : contraste AA, rien au seul survol, cibles ≥ 44x44 px, focus visible, pas de couleur seule | REGISTRE_FRONTIERES.md:102-104 | principe |
| Mots proscrits dans les libellés patient : « ordonnance », « diagnostic », « NeuroScore », « prescription », « posologie », « dosage » | REGISTRE_FRONTIERES.md:35-37, 48-49 | principe |
| L'accès permanent est un lien d'« Autres espaces » ; la tâche « à lire » est au fil | DECISIONS.md:12309 (D-251, amendement du 2026-09-29) | décidé |
| Pas de porte séparée vers ce qui vit dans un autre écran ; une invitation appartient au fil | LOT-05-les-deux-portes.md:55-71 ; questionnaires/page.tsx:496-505 | décidé (arbitrage du responsable, hors D-xxx) |
| Un lien n'existe que si la route dit « ouvert » : « sans un oui franc, pas de lien » | LOT-05:38-39 ; LienMesEchanges.tsx:12 | principe (campagne et code) |
| Contre-principe : « une porte qui s'explique vaut mieux qu'une porte qui s'efface (DC-24) », « écart assumé » ; la page `/suivi` s'explique | LOT-05:41-46 ; ProtocolCheckinForm.tsx:100-106 | principe (campagne ; DC-24 y est étendu) |
| Un rayon vide ne s'affiche pas ; mineur ou date manquante : ni page ni lien pour la bibliothèque | DECISIONS.md:3333-3335, 3361-3363 (D-357 §2, §5) | décidé |
| Fiches et bibliothèque ne paraissent jamais ensemble ; la page des fiches reste servie | DECISIONS.md:3133-3139 (D-360 §2) | décidé |
| Numéros d'urgence au pied de toutes les pages de `/portail`, connexion comprise ; lien repliable et page dédiée écartés | DECISIONS.md:8255, 8268 (D-293, amendement du 2026-10-21) | décidé |
| « Avant de commencer » avant l'espace ; date de naissance « avant tout autre geste » ; aucune surface neuve au mineur avant le consentement | DECISIONS.md:8312-8318 (D-292 §3), 8971-8972 (D-284 §3), 9108-9109 (D-283 §5) | décidé |
| La visibilité d'une entrée n'est jamais une autorisation ; refus portés par les routes | layout.tsx:21-22 ; REGISTRE_FRONTIERES.md:883-884 ; cycleDeVie.ts:52 | principe |
| Sans retirer d'accès : D-276 §1 (portée littérale : le praticien), que D-365 §2 traite comme couvrant le portail (il y nomme une exception) ; précédent D-360 §2 | DECISIONS.md:9896, 2837-2839, 3135-3136 | décidé |
| Libellés patient : textes acceptés par le responsable avant le merge ; analogie pour les noms de groupes ; un nom ne se confond pas avec un autre | DECISIONS.md:3111-3112, 3125-3131 (D-360 §1, D-357 §6) ; 12605-12606 (D-251 §8) | décidé (portée : titres de la bibliothèque et des fiches) |
| Une surface patient neuve s'ouvre seule : texte accepté, puis registre, puis drapeau | DECISIONS.md:8644-8647 (D-288 §1) | décidé |
| Vocabulaire « rendez-vous de suivi », jamais « point d'étape » | DECISIONS.md:6739-6741 (D-317 §6) | décidé |
| Toute clé `wellneuro:` écrite sous le portail est déclarée ; `wn-rail-expanded` n'a pas ce préfixe | web/src/lib/portail/stockageAppareil.ts:16-17 ; NavBar.tsx:13 | principe (garde de code) |
| La navigation reste hors de la primitive de superposition | .claude/rules/frontend-ui.md:36-40 | principe (tranché le 2026-09-03) |
| Une décision d'écran s'écrit dans son lot (D-324) ; une fiche Fnn ou Hnn ne se met plus à jour en ligne, mais par fragment `docs/claude/plan-journal/<id>/AAAA-MM-JJ-nn-slug.md` | handoff 2026-10-18-1300:15 ; .claude/rules/docs-changelog.md (D-371) ; scripts/lib/plan-journal.test.mjs ; DECISIONS.md:2537 (D-371) ; 2509-2515 (D-372, handoff) | décidé |
| Regrouper ou hiérarchiser la ligne « Autres espaces » sans retirer d'accès | PLAN_WELLNEURO.md:2684, 2319 (D/30) | dette |
| D/49 : gel (2026-10-21) des questions du shell 3.0 sur le rail et la recherche ; la ligne §6 ne nomme pas le rail | PLAN_WELLNEURO.md:2338, 2445 | dette (gel) |

### Contradictions entre sources
- Le registre n'a reçu ni D-172 ni D-175 (0 occurrence) : A6-R1 « une étape à la fois » et le fil de gestes se contredisent sur la portée de E11.
- Le plan écrit « jusqu'à quinze » et « treize servis » ; le code compte 13 emplacements, 12 au plus (chapitre 4).
- D-333 et le compteur du hub (EP-10) ; le registre dit d'un indicateur qu'il « dit ce qu'il reste à faire » (REGISTRE:302), D-333 parle de ce que le patient « a fait ».
- LOT-05 écrit deux principes opposés sur l'absence d'un lien : « sans un oui franc, pas de lien » et « une porte qui s'explique » (EP-05).
- Aucun texte lu ne dit si regrouper est « retirer ou réduire » (D-276 §1), ni si un regroupement est une « surface neuve » (D-288 §1) ; le plan le range en file A.
- A6-R1 vise-t-il un menu persistant côté patient ? Le texte dit « une étape à la fois, pas de hub empilé » ; il ne dit rien d'un menu. Un avis non signé s'y oppose, deux antécédents non signés vont dans l'autre sens.

## 8. Trois organisations possibles
Les trois sont nommées A, B, C. Elles répondent à « la même organisation » avec des degrés croissants de reprise du shell praticien. Une quatrième lecture, par étapes du parcours, est évaluée et écartée en fin de chapitre.

### A — Accueil regroupé
- Largeurs servies : toutes, sans nouveau seuil. Colonne unique `max-w-2xl` (672 px, 756 px à 112,5 %), 358 px utiles à 390 px (calcul : 390 − 2 x 16).
- Composants : aucun obligatoire ; une liste typée unique, des intertitres natifs, les composants `Lien*` existants.
- Respecte : le plan (2684), A6-R1 (accès secondaires, pas de rail), l'arbitrage du 2026-09-12, l'E2E qui exige le lien « visible sans rien déplier » (portail-dossier-deux-voix.spec.ts:71-76), le pied d'urgence, l'impression, le layout, la session, les jetons.
- Coûte : le moins. Le bloc `page.tsx:442-507`, un banc d'ordre et de groupes, des E2E adaptés ; si l'état des sondes remonte, les dix `Lien*` et leurs sept bancs.
- Limites : aucun groupe replié (E2E, et `visual.spec.ts:443` clique tous les `details > summary`) ; des intertitres n'abaissent pas à coup sûr la hauteur (EP-03) ; les sous-pages gardent leur seul « ← Mon parcours » ; les noms de groupes sont des textes à faire accepter et à garder hors des collisions d'EP-22.

### B — Bouton « Menu » en en-tête, tiroir patient, barre basse facultative
- Largeurs servies : le bouton à toutes les largeurs ; le panneau pleine largeur à 390 px et plafonné à `max-w-xl` avec `largeur="standard"` (576 px, 648 px à 112,5 %, calcul ; PanneauSuperpose.tsx:49 ; le défaut `focale` donne 440 px dès 1024 px et `max-w-2xl` en dessous, :48, :86) ; une barre basse de 64 px (72 px à 112,5 %) seulement si elle est arbitrée.
- Composants : `PanneauSuperpose` avec `theme="patient"` (existant), un composant client de liste de groupes, un bouton d'en-tête ; une barre basse neuve en jetons sémantiques si elle est retenue.
- Respecte : un accès à la navigation depuis les sous-pages, aucun rail, aucun jeton `--rail-*` ; la garde de thème devient non vide dès le premier montage. Il rejoint l'idée d'une « navigation tactile persistante » d'UX-5, sans l'imposer.
- Coûte : un composant client avec `useParams`, un masque explicite sur les murs d'entrée (EP-02), le passage des liens de `<a>` à `<Link>` (le menu serait sinon remonté à chaque page), un état de sondes partagé pour ne pas doubler les dix requêtes, des E2E 390 px et Desktop, la mise en conformité de `frontend-ui.md:36-40`.
- Risques : le panneau ne doit pas devenir l'unique accès (arbitrage du 2026-09-12, E2E) ; le tiroir de la primitive est à droite ; `ReadingComfortControl` reste dans l'en-tête ; l'en-tête compte déjà trois éléments à 390 px et le bouton est un quatrième ; une barre basse masque le pied d'urgence (EP-14). Les quatre entrées de la maquette 4.0 sont à reprendre avec prudence : « Journal » y désigne le journal alimentaire, c'est-à-dire « Mon carnet alimentaire » (maquette-wellneuro-4-0.html:1063-1066) ; la collision est de mot, avec le journal du dossier retiré le 2026-09-12 (questionnaires/page.tsx:524-533) et avec « Mes échanges (le journal) », « Documents » touche D-251 §8.

### C — Rail latéral clair dès `lg`, barre basse sous `md`
- Largeurs servies : rail de 252 px (64 px replié) dès 1024 px, barre basse sous 768 px, un trou de 768 à 1023 px à combler par un tiroir. Sur l'hypothèse d'une mise en page copiée du shell praticien (`gap-6`, `px-6` de chaque côté, NavBar.tsx:92) avec le `px-4` du `main` du portail conservé (layout.tsx:50), la colonne à 1024 px vaut 668 px rail ouvert (1024 − 252 − 24 − 48 − 32) et 856 px rail replié (1024 − 64 − 24 − 48 − 32), contre 672 px pour `max-w-2xl`. Un premier calcul donnait 888 px, en omettant les 32 px du `main`. Les largeurs à 112,5 % ne sont pas recalculées.
- Composants : un rail neuf aux jetons patient (fond clair, teinte d'item actif, à créer), une bascule, un tiroir, une barre basse, un layout à deux colonnes.
- Respecte : la lecture la plus littérale de « mêmes rails et menus » ; A5-R2, qui n'exclut qu'un rail nuit et une bascule.
- Coûte : le plus. Une clé de stockage à déclarer à l'inventaire si le repli est mémorisé, des E2E trois largeurs, des bases d'images, la reprise du layout et du pied.
- Contredit : A6-R1 côté patient, lu littéralement (« une étape à la fois »), et l'avis non signé sur « la même interface ». Une première lecture y ajoutait « pas de rail » du design system et A5-R2 : ces deux textes ne l'interdisent pas (EP-11). Les risques de B s'y ajoutent sans gain de lecture.

### Écartée : l'organisation par étapes du parcours (analogue du rail des sept phases)
- Arbitrage du 2026-11-01 (Q3, chapitre 14) : le responsable retient « menu + étapes ». Cette section reste comme évaluation : ses coûts deviennent ceux du lot L2b, et ses manques les questions Q27 à Q30.
- Ce que ce serait : une frise ou un rail cliquable des six étapes (Consentement, Informations, Situation, Questionnaires, Analyse du praticien, Restitution), chaque étape ouvrant sa zone, comme le rail des phases ouvre la sienne (FichePatientPanel.tsx:2638-2700).
- Ce qui existe : la frise du hub, non cliquable (EP-21), et le fil du jour, qui porte déjà « l'étape du moment » (MonParcoursAccueil.tsx:72) ; cela respecte A6-R1 côté patient.
- Pourquoi elle ne répond pas à la demande : les treize entrées sont des documents et des outils permanents, pas des étapes ; les étapes 5 et 6 n'ont aucune page propre ; aucun rattachement entrée-étape n'est écrit. Rendre la frise navigable demande des rôles, `aria-current="step"`, des cibles de 44 px (la frise est en `text-2xs`, `overflow-x-auto`), une cible pour 5 et 6, et ne réduit pas la ligne de liens.
- Conclusion (avant l'arbitrage Q3) : écartée comme menu ; la frise restait un repère. Depuis Q3, elle devient navigable (L2b) sans devenir un menu. B peut afficher l'étape courante en tête de son panneau (idée, non chiffrée).

### Recommandation
- Engager A comme lot L2, après les arbitrages (L0) et le filet L1. Raisons : c'est le seul lot que demande le plan (2684) ; il ne touche ni le layout, ni la session, ni les jetons ; il reste dans A6-R1 ; il préserve l'E2E et l'arbitrage du 2026-09-12 ; il se défait par un revert.
- Le diagnostic « treize liens de même poids » vient d'un dossier de test. En production, le registre donne de 7 à 12 liens pour un majeur ; la ligne dépasse « Mon parcours » surtout chez un patient qui a reçu bilan, fiches et courriers. Cela ne change pas le choix de A, seul lot demandé ; cela ôte l'urgence de B et de C, que seul un constat à l'écran peut rétablir (Q23).
- Ouvrir B ensuite seulement si Q1 le demande, après constat de l'écran de L2 (D-288 §1 par analogie : une surface à la fois). B se livre sans barre basse au premier jet.
- Ne pas engager C. Le rouvrir demande une décision qui lève « une étape à la fois » pour le patient, des jetons patient du rail et une colonne validée à 1024 px en confort 112,5 %.
- « Même rail » se traduit en même ordre de groupes, même primitive de superposition, même règle d'activation et mêmes bancs, pas en même composant. Cette traduction ne satisfait pas la demande à la lettre : elle doit être confirmée par le responsable (Q2, Q3).

## 9. Proposition d'architecture

### Groupes, entrées, libellés, ordre
Ordre et libellés de groupes proposés, non décidés, à faire accepter avant merge (D-360 §1). Critère de l'ordre : le quotidien du suivi d'abord, puis ce que j'ai reçu, puis ce que je transmets, puis le dossier partagé ; aucun usage mesuré ne l'appuie. Les quatre noms n'ont aucune occurrence dans `web/src` ni `web/e2e` (EP-22).
| Groupe (libellé proposé) | Entrée, libellé actuel conservé en L2 | Condition |
|---|---|---|
| ancre « Mon parcours » | accueil (frise, fil du jour, « Mon accompagnement » replié) | toujours ; étape du parcours |
| « Au jour le jour » | Ouvrir mes rendez-vous de suivi | inconditionnelle en L2 (Q9) |
| | Ouvrir Mon carnet alimentaire | inconditionnelle en L2 (Q9) |
| « Ce que j'ai reçu » | Consulter mon bilan | `bilanConsultable` |
| | Ma bibliothèque, ou à défaut Fiches remises par mon praticien (jamais les deux) | `bibliothequeServie` (D-360 §2) |
| | Courrier pour votre médecin | `WN_LETTRE_ADRESSAGE_PATIENT`, courrier remis |
| | Courrier à remettre à votre médecin | `WN_COURRIER_COMPLEMENT`, courrier remis |
| | Pour votre médecin | `WN_DOCUMENT_MEDECIN_PATIENT`, partage accordé |
| « Ce que je transmets » | Ma fiche de renseignements | `WN_PHYSIO_TRAITEMENTS` |
| | Transmettre un compte rendu d’analyses | `WN_BIO_PORTAIL_ENABLED` |
| | Déposer un document | `WN_PORTAIL_DEPOT_DOCUMENTS`, majeur |
| « Avec mon praticien » | Ouvrir mon dossier à deux voix | `WN_DOSSIER_DEUX_VOIX` |
| | Ouvrir mes échanges (le journal, en dernier) | `WN_PORTAIL_MES_ECHANGES`, majeur |
- Variante à trois groupes (« Mon suivi », « Ce que j'ai reçu », « Mon dossier ») : écartée par défaut à cause des collisions d'EP-22 ; elle reste disponible si le responsable la préfère (Q5).
- Chaque emplacement actuel retrouve une place ; douze entrées visibles au plus, comme aujourd'hui : aucun accès retiré. Le mineur voit « Au jour le jour », « Ce que j'ai reçu » (selon les remises), « Ce que je transmets » (deux entrées) et « Avec mon praticien » (une entrée).
- Libellés d'entrée inchangés en L2 : des E2E les épinglent (« Consulter mon bilan », « Ouvrir mon dossier à deux voix ») et un gabarit d'e-mail cite « Ouvrir mon dossier à deux voix » (registreGabarits.ts:483-484 ; banc registreGabarits.test.ts:267) ; deux autres passages citent « Accéder à mon parcours » et « Mon accompagnement », hors nav « Autres espaces » (762-763). Retirer le verbe « Ouvrir » est la question Q6.
- Les noms de groupes sont à la première personne, sans chiffre, sans « ordonnance », « diagnostic », « prescription », « posologie », « dosage ». Ne pas nommer un groupe « Mes documents » ni « Mes informations » (EP-22).

### Règle d'activation
- Un seul élément porte `aria-current="page"` par chemin ; la correspondance se fait sur le segment après `/portail/{token}/`.
- `/questionnaires`, `/questionnaires/[idAssignation]` et `/protocole` allument « Mon parcours » (le protocole a sa porte dans « Mon accompagnement »).
- `/fiches` et `/fiches/[idRemise]` allument l'entrée servie, bibliothèque ou fiches ; l'ambiguïté de préfixe liste/fiche est à épingler comme le fait `SidebarRail.test.tsx:176-185`.
- `/ce-qui-compte` et `/comprehension` allument « Ouvrir mon dossier à deux voix » (Q8). `/informations` et `/conditions` n'allument rien : ce sont des portes du pied de page et de la page informations.
- `connexion`, `lien/indisponible` et les étapes de `[token]/page.tsx` n'ont pas de menu.

### Ce qui reste au fil, hors menu, conditionnel
- Au fil du jour (tâches du fil) : agendas prioritaires, rendez-vous de suivi dû, lectures (bilan, fiches, courriers, compréhension), invitation « Dire ce qui compte pour moi », questionnaires, agendas à commencer (filDuJour.ts:427). La page d'une tâche reste ; la tâche périt.
- Hors menu : ce-qui-compte, comprehension, protocole, informations, conditions, et « Signaler un problème » (carte de la page informations, dette PLAN_WELLNEURO.md:2668). Aucune porte nouvelle.
- Conditionnel : chaque entrée garde sa sonde fail-closed ; un groupe sans entrée ouverte n'a pas d'étiquette ; le menu est absent tant que « Avant de commencer » ou la date de naissance ne sont pas franchis ; les entrées vues par un mineur ou un dossier clos suivent la matrice du chapitre 4, que L1 épingle.

### Schéma textuel
```
Organisation A (L2), hub /portail/{token}/questionnaires
┌ En-tête : Wellneuro · Confort de lecture · Se déconnecter ┐   (print:hidden)
│ Frise « Étapes de votre parcours » (repère, non cliquable) │
│ Mon parcours : un seul bouton plein, « Ensuite » en liens  │
│ Proposition de réévaluation (si reprise)                   │
│ Autres espaces  (nav, aria-label conservé)                 │
│   Au jour le jour       : rendez-vous · carnet             │
│   Ce que j'ai reçu      : bilan · bibliothèque/fiches ·    │
│                           3 courriers                      │
│   Ce que je transmets   : renseignements · compte rendu ·  │
│                           dépôt                            │
│   Avec mon praticien    : dossier à deux voix · échanges   │
│ Mon accompagnement (replié) · Questionnaires · groupes     │
└ Pied : urgences · Confidentialité et droits ┘              (print:hidden)

Organisation B (L3), sur toutes les pages hors murs d'entrée
[Wellneuro] [Menu] [Confort de lecture] [Se déconnecter]
Menu → PanneauSuperpose theme="patient", tiroir : même liste, même ordre,
       un seul aria-current ; fermeture au changement de chemin
```

### Maquette (2026-11-02)
- Quatre artboards sur le design system Wellneuro (jetons patient), patiente fictive Sophie Nicola : https://claude.ai/artifact/Ctd39xWczp37kd7SKDnvHw (lien privé tant qu'il n'est pas partagé).
- 1 : hub à 390 px, organisation A et frise navigable (L2b) ; 2 : bouton « Menu » et tiroir (B), ouvert depuis le carnet alimentaire, un seul `aria-current="page"` ; 3 : états de la frise et texte d'attente de Q27 ; 4 : hub au bureau, colonne de 672 px, les quatre groupes sur deux colonnes (Q17).
- Balisage aux valeurs des jetons, sans composant du bundle (la liste à groupes et la frise cliquable n'existent pas encore) ; aucun rendu constaté. Les libellés du fil et du pied de page sont ceux de l'application, « Lire mon bilan » compris (lecturesAttendues.ts:151) ; le texte d'attente est une proposition à faire accepter mot pour mot, à rapprocher de « Votre praticien les prépare. » (formulations.ts:17). La maquette numérote les étapes de la frise (« 1. Consentement » à « 6. Restitution »), ce que la frise actuelle ne fait pas et que L2b ne prévoit pas (« libellés inchangés ») : rang visible à trancher en L0 (Q33).

## 10. Composants, tokens, accessibilité

### Réutiliser, adapter, créer
| Action | Élément | Condition |
|---|---|---|
| réutiliser | `PanneauSuperpose` (`theme="patient"`, tiroir ou feuille) | piloté par `open` et `onOpenChange` ; fermé au changement de chemin (pas de `onNavigate`) ; sans `surtitre` (teinte solaire) ; ancré à droite |
| réutiliser | `patientButtonClassName`, `Lien*`, `ReadingComfortControl`, `PiedDePageUrgence`, `PiedDePageInformations`, `PatientJourneyProgress` | `ReadingComfortControl` reste dans l'en-tête, jamais dans un contenu démonté |
| adapter | les dix `Lien*` | prop de rappel optionnelle (rétrocompatible, garde leurs bancs) ou contexte partagé |
| adapter | le bloc nav du hub | groupes à étiquette visible, liste typée unique |
| créer | un composant de liste à groupes | sous `components/patient/` ou `patient-companion/` ; entrées en prop ; sans icône obligatoire, sans compteur, sans repli mémorisé |
| créer | une garde fs | aucun `rail-`, aucun `data-theme="praticien"` sous `app/portail`, `components/patient*` ; chaque segment de la liste a un `page.tsx` |
| écarter | `SidebarRail`, `VuesRapides`, `MobileBottomNav`, tiroir de `NavBar`, rail des phases | contenu praticien en dur, compteurs, jetons `--rail-*` |
- Placement du module de liste : pas sous `web/src/lib/portail/**`, qui relève de `.claude/rules/auth-securite.md` (revue `wn-reviewer` et T3) ; pas de copie d'URL de sonde dans un module neuf, car `lecteursPhysioTraitements.guard.test.ts:63` refuse tout lecteur non inscrit.
- Une route agrégée des espaces ouverts serait une surface portail neuve : hors L1. Elle règlerait le prédicat d'âge d'EP-20, mais elle touche l'authentification des routes `api/portail`.

### Tokens à nommer
- Réutilisables (thème patient, `globals.css:116-154`) : `bg-background`, `bg-surface`, `border-border`, `text-foreground`, `text-muted-foreground` sans suffixe d'opacité, `text-primary`, `bg-primary/10`, `ring-focus-ring`, `shadow-card`, `shadow-pop`, `rounded-lg`, `font-sans`, `font-display`.
- Natifs, pas de jeton à créer : `min-h-11` (44 px), `min-h-12` (48 px), `h-16` (64 px).
- À créer seulement pour B ou C : une largeur de rail (15,75 rem pour 252 px à 100 %, en rem pour suivre le confort 112,5 %), nom proposé `nav-rail` ; une ombre d'état actif `nav-active` = `inset 3px 0 0 var(--color-primary)`. Pour A : aucun jeton.
- Interdits côté patient : `--rail-*`, `rail-focus-ring`, `bg-solar-500/[.12]`, `data-theme="praticien"`. Le panneau se pose en `bg-surface` (ivoire) plutôt qu'en sable.
- Contrastes calculés (WCAG 2.x, non mesurés ; recalculés en relecture) : bordure #dccfb6 à 1,18:1 sur sable donc inutilisable seule pour l'état actif ; texte forêt sur `bg-primary/10` posé sur sable à 4,09:1, sous 4,5:1 ; blanc sur forêt 6,07:1 ; `copper-ink` 5,26:1 sur sable pour le texte d'accent. État actif proposé : `aria-current`, graisse, `text-foreground`, filet de forêt, fond `bg-primary/10`.
- La production par Tailwind des classes `text-muted-foreground/70` (au moins 15 sites patient) n'est pas vérifiée dans un CSS compilé.

### Cibles, focus, aria
- Cibles : 44 px plancher pour tout rail, menu ou feuille ; 48 px pour les boutons patient `primary` et `ghost` ; en `rem`.
- Focus : règle globale de 3 px, décalage 2 px, forêt ; dans une liste défilante, prévoir au moins 5 px de marge intérieure (déduction).
- Un seul `<nav>` nommé par fonction, aux noms distincts (Q30) ; garder `aria-label="Autres espaces"` en A (continuité du nom accessible pour les lecteurs d'écran ; aucun E2E ne cible ce nom, le banc d'`aria-label` de L1 est un ajout), arbitrer le nom en B (Q15) ; aucune entrée réduite à une icône sans `aria-label` portant le libellé, jamais l'URL.
- Ajouter un lien d'évitement « Aller au contenu » et un `id` sur `<main>` (aucun n'existe) ; un titre de page par route.
- Pour les sondes asynchrones : un état agrégé ou un contexte, pour que le nombre d'entrées et l'ordre de tabulation ne changent pas après le premier rendu. Aucun emplacement réservé cliquable (règle « pas de lien sans un oui franc »).
- Bancs : un seul `aria-current="page"` et au plus un `aria-current="step"` par chemin testé, noms de landmarks uniques, ordre de tabulation, `axe` sur le hub.

### Confort de lecture, 390 px, impression
- À 112,5 %, `html` passe en `font-size: 112.5%` : tout ce qui est en `rem` grossit. Libellés dans un `<span>`, jamais dans `p`, `li` ou `label` (interligne 1,75 en `!important`, globals.css:247-251).
- À 390 px : 358 px utiles ; « Transmettre un compte rendu d’analyses » (38 caractères) passe à la ligne comme dans le rail (`break-words`), pas de `truncate` (celui de la feuille praticien est à écarter). L'en-tête passe déjà à la ligne.
- Une barre basse, si elle est arbitrée : `min-h` en `rem`, au plus quatre entrées dont « Plus », libellés d'une ligne (hypothèse à mesurer), réserve de bas appliquée au conteneur (barre + zone sûre), `viewport` dans `app/portail/layout.tsx` seulement.
- Impression : toute navigation neuve, barre fixe et overlay Radix compris, porte `print:hidden` ; ajouter à `layout.test.tsx` une assertion de présence de `print:hidden`, et un E2E `emulateMedia print`. Les numéros restent imprimés par la seule feuille du protocole.
- Les captures `fullPage` laissent un élément `position: fixed` flotter (visual.spec.ts:182-185) ; le hub est en `pixel: false` (visual.spec.ts:438, 455) et la seule base portail est `portail-connexion` (chrome compris).

## 11. Plan de lots
Aucun lot ne promet de délai. Chaque lot s'arrête au constat du responsable avant le suivant. Ordre : L0, L1, L2, L2b (frise navigable, arbitrage Q3 du 2026-11-01), puis L3 sur constat de l'écran, L4 facultatif, L5 non engagé.

### L0 — Arbitrages et texte de la décision
- Périmètre : réponses aux questions du chapitre 13 et texte de la D-xxx « Menu patient », sans code, sans drapeau, sans route. Le texte voyage avec L2, comme D-324 (« écrite dans ce lot », handoff 2026-10-18-1300:15) ; PLAN:705 (« D-xxx et fragment avec le lot ») est un précédent voisin, pour un autre objet, non pour D-324.
- Contenu de la décision : §1 périmètre retenu (Q1) ; §2 groupes, ordre, rang, groupe vide sans étiquette, exclusion fiches/bibliothèque ; §3 libellés acceptés mot pour mot, groupes compris ; §4 règle d'activation ; §5 ce qui reste au fil et hors menu, en versant l'arbitrage du 2026-09-12 ; §6 ce qui ne change pas (aucun accès retiré, aucune route, aucun chiffre) ; §7 exécution ; classement du regroupement au regard de D-288 §1 ; pour L2b, le tableau étape → cible (Q28), le texte d'attente de l'étape 5 (Q27), la règle de Q29, le rang visible des étapes (Q33), les portes des étapes 1 et 2 (Q34) et le classement de la frise au regard de D-288 §1 ; amendement ou précision d'A6-R1 si B, C ou L2b.
- Numéro : à réserver par `scripts/wn-reserver-decision.mjs` (D-370 §1) ; D-405 est le dernier numéro du registre (DECISIONS.md:9), des références de réservation au-delà n'ont pas été relues. Validation : T1 puis T1 complet. Drapeau : non.
- Fin : questions Q4 à Q24 et Q31 à Q34 répondues par écrit (Q25 relève de L4, Q26 est hors périmètre ; Q1 à Q3 et Q27 à Q30 sont consignées au chapitre 14) ; texte de la décision relu et accepté mot pour mot par le responsable avant tout code.

### L1 — Filet sans changement visible
- Périmètre : liste typée unique (libellé, segment, groupe, condition) ; état des sondes remonté par une prop de rappel optionnelle ou un contexte ; hub rendant la même ligne plate. Fichiers : le bloc nav de `questionnaires/page.tsx`, les dix `Lien*`, un module hors `lib/portail`. Pas de route agrégée.
- Bancs : liste exacte (libellé, href, ordre) sondes ouvertes, puis fermées ; exclusion fiches/bibliothèque ; matrice majeur, mineur, dossier clos (EP-20) ; table fail-closed (404, 409, 200 partiel, 500, réseau) sur le patron de `LienDepotDocuments.test.tsx:30-35` ; bancs des deux `Lien*` sans test et du `LienDossierDeuxVoix` ; trois liens écrits dans le JSX ; garde fs « chaque segment a un `page.tsx` » ; `aria-label` de la nav asserté.
- E2E : aucun à adapter, rendu identique. Armer les huit drapeaux est facultatif et ajouterait des liens que des sélecteurs en sous-chaîne captent (`portail-parcours.spec.ts:336`, `'Consulter'` avec `.first()`).
- Drapeau : non. Décision : L0. Validation : T1, T1 complet, T2.
- Fin : rendu identique avant et après sur un dossier de test majeur, mineur et clos ; matrice épinglée par des bancs.

#### Constat à l'écran de L1 (2026-11-03, Q23)
Dev local sur le Mac, navigateur intégré. Base éphémère de `test:worktree --keep-db` (après un T2 vert), patients fictifs du seed : Sophie Nicola majeure avec un bilan consultable (`provisionBilanTransmis`), Jennifer Martin mineure (date de naissance passée à 2012), Michel Dogné majeur et clos (`suiviClotureLe` posé). Les drapeaux des dix liens, et les trois que le compte rendu exige, sont armés côté serveur, comme le registre les dit posés en production (bibliothèque comprise). « Avant » = `origin/main@8ae6c496`, « après » = la branche du lot, servis sur la même base. Mesures prises sur la `<nav aria-label="Autres espaces">` (`getBoundingClientRect`), à 1 024 px (colonne de 672 px) et à 390 px (colonne de 358 px).

| Dossier | Liens servis | Lignes à 1 024 px | Hauteur à 1 024 px | Lignes à 390 px | Hauteur à 390 px | Avant / après |
|---|---|---|---|---|---|---|
| majeur ouvert | 8 : bilan, compte rendu, dépôt, renseignements, carnet, suivi, échanges, dossier | 4 | 239,2 px | 8 | 490,4 px | identiques |
| mineur ouvert | 5 : compte rendu, renseignements, carnet, suivi, dossier ; écran des mineurs affiché | 3 | 176,4 px | 5 | 302,0 px | identiques |
| majeur clos | 7 : compte rendu, dépôt, renseignements, carnet, suivi, échanges, dossier ; pas d'écran des mineurs | 4 | 239,2 px | 7 | 427,6 px | identiques |
| majeur, maximum simulé | 12 : les treize emplacements moins les fiches, remplacées par la bibliothèque | 6 | 364,8 px | 12 | 741,6 px | identiques |

- Rendu identique : même ordre, même nombre de liens, une seule classe sur tous les liens, `flex flex-wrap gap-3` sur la nav, avant comme après, dans chaque cas.
- Le maximum est **simulé** pour cinq sondes de données seulement (fiches, bibliothèque, deux courriers, « Pour votre médecin ») : leurs réponses sont substituées dans le navigateur avant de remonter le hub par navigation client ; drapeaux, routes et autres sondes sont réels. Aucune remise de fiche ni de courrier n'a été écrite en base.
- Hauteur : un lien mesure 50,8 px, non 48 (`min-h-12` plus l'interligne du libellé). Le plafond calculé d'EP-03 (708 px pour 12 liens) est donc dépassé à 390 px : 741,6 px mesurés, un lien par ligne, aucun libellé sur deux lignes (« Transmettre un compte rendu d’analyses » tient sur une ligne à 358 px). À 1 024 px, deux ou trois liens par ligne. Plafond recalculé sur 50,8 px (Q37, chapitre 16) ; c'est l'allègement des liens de L2 (Q17, D-423 §2) qui réduit le bloc.
- Écart 13 / 12 / 15 : 13 emplacements au code, 12 servis au plus, constaté (fiches et bibliothèque ne paraissent jamais ensemble). Quinze n'est atteint dans aucun état ; « treize servis le 2026-11-01 » (PLAN:2684) n'est pas reproduit. L'hypothèse « 13 plus les deux portes retirées le 2026-09-12 » reste non vérifiée.
- Matrice d'EP-20 confirmée à l'écran : le mineur perd dépôt, échanges et bibliothèque (409) ; le dossier clos garde les liens de son âge, aucune sonde ne lit la clôture. Un mineur clos garderait donc les liens d'un mineur sans l'écran des mineurs (épinglé au banc, non constaté à l'écran). Retenu tel quel (Q36, chapitre 16).
- Constat incident, hors périmètre : le dossier clos de test affiche encore au fil « Commencer « Questionnaire… » » (assignations laissées par les E2E sur ce dossier) ; le hub ne vide les assignations que pour un non-majeur (questionnaires/page.tsx:275-281). Confié à un lot séparé, hors de ce chantier (Q38, chapitre 16).

### L2 — Regroupement dans le hub
- Périmètre : le bloc `page.tsx:442-507` devient une ancre et des groupes à étiquette visible, dans l'ordre de L0 ; groupe sans lien ouvert sans étiquette ; aucun repli ; libellés d'entrée inchangés ; aucune route ni donnée.
- Bancs : ordre exact des groupes et des entrées (modèle `SidebarRail.test.tsx:107`) ; groupe vide sans étiquette ; chaque lien une seule fois ; aucun `bg-rail` ni `data-theme="praticien"` ; « Mon parcours » reste un seul heading.
- E2E à adapter : `portail-dossier-deux-voix.spec.ts:68-79` ; `portail-bilan.spec.ts` (sélecteurs et `toHaveCount(0)` aux l.54, 102, 171) ; `portail-transmission-compte-rendu.spec.ts` (budget de 80 Tab) ; `portail-parcours.spec.ts` (« ← Mon parcours », « Consulter ») ; `visual.spec.ts:443`. À ajouter : un clic par groupe vers une page que la nav n'atteint par clic dans aucun E2E (suivi, carnet), sur Desktop Chromium et iPhone 13.
- Drapeau : non (retour arrière : revert). Décision : la D-xxx de L0, écrite dans ce lot. Validation : T1, T1 complet, T2 sur le Mac seul (docs/ROLES_MACHINES.md:147).
- Clôture (D-371, D-372, docs-changelog.md) : handoff, fragment `changelog.d`, ligne §8 du plan (PLAN:2684, ligne de dette que le plan solde en ligne, comme PLAN:2680) ; aucune édition en ligne d'une fiche Fnn ou Hnn : une fiche neuve (plus haut Hnn lu : H93, PLAN:1089 ; numéro à relire sur origin/main juste avant d'écrire) avec sa ligne « Journal », puis les mises à jour par fragments `docs/claude/plan-journal/<id>/AAAA-MM-JJ-nn-slug.md` (le banc `scripts/lib/plan-journal.test.mjs` rougit sinon). L'historique ne retrouve aucune fiche dédiée à un menu patient.
- Fin : bancs verts ; constat à l'écran sur un dossier de test majeur, mineur et clos ; ligne 2684 solde ou renvoi à la fiche. Arrêt : le responsable constate l'écran avant L3.

#### Constat à l'écran de L2 (2026-11-04, Q37)
Même protocole que L1 : dev local sur le Mac, navigateur intégré, base éphémère de `test:worktree --fast --keep-db` (après un T2 où seul `visual.spec.ts:441` était rouge, sur l'adaptation du lot, corrigée depuis). Patients fictifs du seed : Sophie Nicola majeure avec un bilan consultable (`provisionBilanTransmis`), Jennifer Martin mineure (date de naissance passée à 2012), Michel Dogné majeur et clos (`suiviClotureLe` posé). Les drapeaux des dix liens, et les trois que le compte rendu exige, sont armés côté serveur. « Avant » = `origin/main@02279f1a`, « après » = la branche du lot, servis en même temps sur la même base. Mesures sur la `<nav aria-label="Autres espaces">` (`getBoundingClientRect`), colonne de 672 px à 1 024 px et de 358 px à 390 px.

| Dossier | Liens avant | Liens après (ancre comprise) | Groupes après | 1 024 px avant / après | 390 px avant / après |
|---|---|---|---|---|---|
| majeur ouvert | 8 | 9 | 4 | 239,2 / 349,0 px | 490,4 / 566,0 px |
| mineur ouvert | 5 | 6 | 3 (« Ce que j’ai reçu » vide, sans étiquette) | 176,4 / 261,0 px | 302,0 / 391,5 px |
| majeur clos | 7 | 8 | 3 (« Ce que j’ai reçu » vide, sans étiquette) | 239,2 / 349,0 px | 427,6 / 479,5 px |

- « Avant » reproduit au dixième les mesures de L1 sur les mêmes dossiers.
- **Le bloc est plus haut après L2, à toutes les largeurs.** Un lien mesure 44 px (au lieu de 50,8), sans espace entre liens d'un même groupe ; mais l'ancre « Mon parcours » ajoute une ligne, chaque étiquette de groupe une autre, et l'écart entre groupes remplace l'écart entre liens. À 1 024 px, les groupes se rangent sur deux colonnes ; l'ancien bloc tenait deux ou trois boutons par ligne. La prévision de Q37 (« la hauteur se réduit par l'allègement des liens ») n'est pas vérifiée ; l'implication d'EP-03 (« des intertitres ajoutent des lignes sans garantir une hauteur moindre ») l'est.
- Ordre, étiquettes et liens conformes à D-423 §2 sur les trois dossiers ; aucun libellé sur deux lignes à 358 px ; compteur absent ; écran des mineurs présent pour le seul mineur. Dépli de « Mon accompagnement » non constaté à l'écran (aucun des trois dossiers n'a de protocole diffusé) : épinglé au banc, avec et sans protocole.
- Mineur clos (Q36) : non constaté à l'écran, comme en L1 ; épinglé au banc.
- Constat incident, hors périmètre de L2 (frise, L2b) : sur le dossier clos, étape 5 courante, la page déborde à droite à 390 px, avant comme après (largeur de mise en page 494 px). Le texte `sr-only` « (étape actuelle) » de `PatientJourneyProgress` sort du conteneur `overflow-x-auto` de la frise. La colonne de la nav reste à 358 px : les mesures ci-dessus valent.

### L2b — Frise des étapes navigable (arbitrage Q3 du 2026-11-01)
- **État (2026-11-04)** : livré éteint sous `WN_PORTAIL_FRISE_NAVIGABLE` après la réponse à Q39 (chapitre 17) ; servi au seul dossier majeur ([[D-283]] §5). Le débordement à 390 px relevé au constat de L2 (le `sr-only` de la frise hors de son défilement) est corrigé dans la frise d'avant comme dans la navigable, sans drapeau. Constat à l'écran consigné ci-dessous.
- Périmètre : `PatientJourneyProgress` devient une navigation : les six étapes (Consentement, Informations, Situation, Questionnaires, Analyse du praticien, Restitution) deviennent des liens ou des boutons, `aria-current="step"` sur l'étape courante, cibles de 44 px en `rem` (la frise est aujourd'hui en `text-2xs`, `overflow-x-auto`, PatientJourneyProgress.tsx:56, 66), libellés inchangés. Rien n'est écrit dans le code sur ce qu'ouvre une étape ; Q27 et Q28 (chapitre 14) fixent : aucune route neuve, une étape sans cible existante n'est pas cliquable, l'étape 5 courante ouvre un texte d'attente court ; le détail état par état est ci-dessous.
- Ce lot ne réduit pas la ligne de liens : le menu des espaces reste L2. Les deux navigations coexistent comme rail-menu et rail des phases côté praticien, et répondent à deux questions distinctes (« où vais-je ? », « où en suis-je ? »).
- Bancs : ordre des six étapes ; un seul `aria-current="step"` ; cible, ou absence de cible, de chaque étape selon l'état (étapes 5 et 6 comprises) ; étape passée, courante, à venir ; état mineur et dossier clos. E2E : 390 px (défilement horizontal de la frise, cibles ≥ 44 px) et Desktop ; `axe` sur le hub.
- Drapeau : serveur, livré éteint (surface patient modifiée visiblement, D-288 §1 par analogie), entrée dans `docs/FEATURE_FLAGS.md`.
- Décision : la D-xxx de L0 écrit le tableau étape → cible (Q28), le texte d'attente de l'étape 5 courante (Q27, libellé patient accepté mot pour mot, sous la garde D7), et la règle de Q29 : étape passée en relecture, étape à venir fermée, ce qui reste dans A6-R1 « une étape à la fois » (revenir à une étape passée n'est pas « empiler »). Forme : `<nav aria-label="Étapes de votre parcours">` distincte de « Autres espaces » (Q30).
- Étapes 5 et 6, état par état (`journeyCurrentId` 5 ou 6, dérivé seulement une fois les questionnaires transmis, contrat.ts:277, 302-312) : étape 5 courante (`analyse_en_cours`) → texte d'attente, à écrire dans `FORMULATIONS_PATIENT` ou à côté, dans le même module (formulations.ts:15-20), pour passer sous la garde D7 (formulations.guard.test.ts:16-23), « Votre praticien les prépare. » étant la phrase déjà servie ; étape 6 à venir → fermée (Q29). Étape 6 courante (`restitution_disponible`, `prochaine_etape_prete`) → aucun texte d'attente, la phrase serait fausse ; sa seule cible existante est le bilan quand `bilanConsultable` le sert (contrat.ts:293-298), sinon non cliquable : Q31. Étape 5 passée → cible existante à nommer, sinon non cliquable, comme « Situation » : Q32. Q27 est ainsi une exception assumée à Q28 pour la seule étape 5 courante : sans cible, elle s'ouvre quand même, sur un texte. Les étapes 1 et 2 en relecture visent `/conditions` et `/informations`, que le chapitre 9 laisse hors menu (« Aucune porte nouvelle ») : Q34 dit si une relecture est une porte au sens de l'arbitrage du 2026-09-12.
- Validation : T1, T1 complet, T2. Fin : constat à l'écran sur un dossier de test majeur, mineur et clos, à 390 px et en confort 112,5 %.

#### Constat à l'écran de L2b (2026-11-04)
Même protocole que L1 et L2 : dev local sur le Mac, navigateur intégré, base éphémère de `test:worktree --fast --keep-db` (après un T2 vert). `WN_PORTAIL_FRISE_NAVIGABLE` armé côté serveur, puis éteint pour le dernier relevé. Patients fictifs du seed, états posés en base de test : Sophie Nicola majeure sans questionnaire ; Michel Dogné majeur, ses questionnaires passés de « En attente » à transmis, sa consultation à `en_cours`, puis un bilan transmis (`provisionBilanTransmis`), puis `suiviClotureLe` posé ; Jennifer Martin mineure (date de naissance passée à 2012), puis close. Mesures par `getBoundingClientRect` ; « page » = `scrollWidth` / `clientWidth` du document.

| Dossier, état | Largeur | Frise | Cibles | Page |
|---|---|---|---|---|
| Sophie, majeure, étape 4 courante, liste non rendue | 390 px | nav ; « Questionnaires » seul lien, vers `#mon-parcours`, `aria-current="step"` | 44 px | 390 / 390 |
| Michel, majeur, étape 4 courante, liste rendue | 390 px | « Questionnaires » vers `#mes-questionnaires` ; le clic amène « Transmis au praticien » à l'écran | 44 px | 390 / 390 |
| Michel, étape 5 courante, `elements_transmis` | 390 px | bouton « Analyse du praticien », `aria-expanded` ; ouvre « Vos éléments ont été transmis. » | 44 px | 390 / 390 |
| Michel, étape 5 courante, `analyse_en_cours` | 390 px | ouvre le texte accepté mot pour mot ; étape courante dans le champ de la frise (défilement 121 px) | 44 px | 390 / 390 |
| Michel, étape 6 courante, bilan consultable | 390 px | « Restitution » vers `/portail/PAT_SEED_03/bilan`, le clic ouvre le bilan ; étape 5 passée non cliquable ; aucun texte | 44 px | 390 / 390 |
| Michel, étape 6, dossier clos | 390 px | inchangée : majeur, la frise reste navigable | 44 px | 390 / 390 |
| Michel, étape 6, confort 112,5 % | 390 px | étape courante dans le champ ; frise 642 / 363 | 49,5 px | 390 / 390 |
| Michel, étape 6 | 1 024 px | frise entière, 680 / 680, nav de 48 px | 44 px | 1 024 / 1 024 |
| Jennifer, mineure, ouverte puis close | 390 px | frise d'avant, sans nav, aucun lien ni bouton ([[D-283]] §5) | — | 390 / 390 |
| Michel, étape 5 courante, **drapeau éteint** | 390 px | frise d'avant | — | 390 / 390 ; 494 / 390 en retirant `relative` à la main |

- **Défaut trouvé et corrigé pendant le constat** : à 390 px, l'étape courante 5 ou 6 restait hors champ, à droite de la frise qui défile ; le texte de l'étape 5 paraissait sous un bouton invisible. La frise navigable amène désormais l'étape courante dans son champ à l'affichage, sans toucher au défilement vertical (banc dédié, mutation rouge).
- Le débordement incident de L2 (494 px à l'étape 5 courante) est reproduit à l'identique en retirant le correctif, et disparaît avec lui.
- Non constaté à l'écran : l'étape 6 courante sans bilan consultable et le bilan rejeté après coup (épinglés au banc de câblage) ; `prochaine_etape_prete` (même cible que `restitution_disponible`, épinglée au banc de la table).

### L3 — Bouton « Menu » et tiroir patient (sur arbitrage de Q1)
- **État (2026-11-05)** : livré éteint sous `WN_PORTAIL_MENU` après les réponses à Q40–Q43 (chapitre 18), sous [[D-442]] ; servi au seul dossier majeur ([[D-283]] §5). Le même drapeau pose le lien d'accueil du mot-symbole (Q24) et le lien d'évitement (Q43). Les dix sondes sont montées une fois au layout et partagées avec « Autres espaces ». Constat à l'écran consigné ci-dessous.
- Périmètre : composant client sous `components/patient/` lisant `useParams`, monté dans `portail/layout.tsx`, rendu seulement session ouverte et murs franchis ; `PanneauSuperpose theme="patient"` ; liens en `<Link>` ; sondes en contexte ; `print:hidden` ; `aria-current`.
- Bancs : parité hub/menu sur une même source ; un `aria-current` sur au moins huit chemins dont `/fiches` contre `/fiches/<id>` ; aucune nav hors session ni pendant un mur ; garde de thème ; cibles.
- E2E : 390x844 et Desktop (ouverture, Échap, focus rendu, cible ≥ 44 px, pas de recouvrement du pied), `axe` sur le hub, confort 112,5 %.
- Drapeau : serveur, lu dans `layout.tsx`, livré éteint, entrée dans `docs/FEATURE_FLAGS.md`, armé dans `playwright.config.ts` et la commande de build (Q16).
- Décision : une D-xxx qui précise A6-R1 côté patient et `frontend-ui.md:36-40`. Bases d'images : `portail-connexion` inclut le chrome ; régénération par `visual-baselines` au premier CI rouge. Validation : T2 ; T3 et `wn-reviewer` si la session est touchée.
- Fin : bancs et T2 verts sur les deux projets, constat à 390 px et à 112,5 %, impression d'une page vérifiée.

#### Constat à l'écran de L3 (2026-11-05)
Même protocole que L1 à L2b : dev local sur le Mac, navigateur intégré, base éphémère de `test:worktree --fast --keep-db` (après un T2 vert, 331 E2E passés sur les deux projets). `WN_PORTAIL_MENU` armé côté serveur. Patients fictifs du seed, états posés en base de test : Sophie Nicola majeure ; Jennifer Martin mineure (date de naissance passée à 2012) ; Michel Dogné majeur et clos (`suiviClotureLe` posé), puis ses accusés « Avant de commencer » retirés. Mesures par `getBoundingClientRect` ; « page » = `scrollWidth` / `clientWidth` du document.

| Dossier, page | Largeur | Bouton « Menu » | Mot-symbole | Panneau | Page |
|---|---|---|---|---|---|
| Connexion | 390 px | absent | texte | — | 390 / 390 |
| Sophie, majeure, `/suivi` | 390 px | 44 px de haut, après « Wellneuro » | lien vers le hub | 390 x 844, `data-theme="patient"` ; « Mon parcours », puis rendez-vous de suivi (`aria-current="page"`), carnet, dossier à deux voix ; liens de 44 px | 390 / 390 |
| Sophie, `/suivi`, confort 112,5 % | 390 px | 50 px | lien vers le hub | liens de 49,5 px | 390 / 390 |
| Sophie, `/suivi` | 1 024 px | présent | lien vers le hub | 576 x 800, à droite | 1 024 / 1 024 |
| Sophie, hub | 390 px | présent | lien vers le hub | « Mon parcours » actif | 390 / 390 |
| Jennifer, mineure | 390 px | absent ([[D-283]] §5) | lien vers le hub | — | 390 / 390 |
| Michel, majeur clos | 390 px | présent (la garde suit l'âge, Q36) | lien vers le hub | — | 390 / 390 |
| Michel, « Avant de commencer » requis | 390 px | absent | texte | — | 390 / 390 |

- Ordre de l'en-tête à 390 px : « Wellneuro », « Menu », « Confort de lecture », « Se déconnecter ». **L'en-tête garde sa hauteur** : 133 px avec ou sans le bouton, qui tient sur la ligne du mot-symbole ; 77 px à 1 024 px ; 150 px en confort 112,5 % à 390 px.
- Échap ferme le panneau et rend le focus au bouton ; un lien suivi le ferme ; « Fermer Mon espace » et la description « Les pages de votre espace. » sont posés par la primitive.
- Sondes : sur le hub, chacune des dix sondes est appelée une fois ; `assignations` et `trust/etat` deux fois chacune (la lecture du hub, et celle du menu que nomme [[D-442]] §1). Sur une sous-page de la mineure, aucune sonde.
- Impression : vérifiée par l'émulation `print` de l'E2E (le bouton disparaît), non imprimée sur papier.
- Non constaté à l'écran : le mineur clos (épinglé au banc, comme en L1 et L2) ; le lien d'évitement au premier Tab et son arrivée sur `main#contenu` (épinglés à l'E2E, sur les deux projets).

### L4 — Barre basse (facultatif)
- **État (2026-11-05)** : livré éteint sous `WN_PORTAIL_BARRE_BASSE`, sans effet tant que `WN_PORTAIL_MENU` est fermé, après les réponses à Q44–Q51 (chapitre 19), sous [[D-444]] ; servi au seul dossier majeur ([[D-283]] §5), sous 768 px. Cases « Accueil », « Carnet », « Suivi », puis « Bibliothèque » ou « Fiches » ; pas de case « Menu » ; réserve de bas sur le conteneur. Constat à l'écran consigné ci-dessous.
- Seulement après arbitrage nommé de ses entrées (seules les entrées sans drapeau sont stables : accueil, rendez-vous de suivi, carnet ; la maquette 4.0 propose Accueil, Journal, Suivi, Documents, où « Journal » est le carnet alimentaire, entrée stable ; Q25) et du sort du pied d'urgence. Réserve de bas appliquée au conteneur, `viewport` posé dans `portail/layout.tsx`, `print:hidden`, absente sur les murs d'entrée et les écrans de saisie. Mêmes bancs et E2E que L3, plus la hauteur sous confort agrandi.

#### Constat à l'écran de L4 (2026-11-05)
Même protocole que L1 à L3 : dev local sur le Mac, navigateur intégré, base éphémère de `test:worktree --fast --keep-db` (après un T2 vert, 337 E2E passés sur les deux projets). `WN_PORTAIL_MENU` et `WN_PORTAIL_BARRE_BASSE` armés côté serveur. Patients fictifs du seed, états posés en base de test : Sophie Nicola majeure ; Jennifer Martin mineure (date de naissance passée à 2012) ; Michel Dogné majeur et clos (`suiviClotureLe` posé), puis ses accusés « Avant de commencer » retirés. Mesures par `getBoundingClientRect` ; « page » = `scrollWidth` / `clientWidth` du document.

| Dossier, page | Largeur | Bouton « Menu » | Barre « Accès rapides » | Pied en fin de défilement | Page |
|---|---|---|---|---|---|
| Connexion | 390 px | absent | absente | — | 390 / 390 |
| Sophie, majeure, `/suivi` | 390 px | présent | « Accueil », « Carnet », « Suivi » (`aria-current="page"`) ; cases de 64 px, barre de 65 px bordure comprise | bas du pied à 779 px, haut de la barre à 779 px ; « 3114 » reçoit le clic | 390 / 390 |
| Sophie, `/alimentation`, confort 112,5 % et espacement renforcé | 390 px | présent | « Carnet » actif ; cases de 72 px, une ligne chacune | contact au quart de pixel près (771,2 / 771) | 390 / 390 |
| Sophie, hub | 390 px | présent | « Accueil » actif | — | 390 / 390 |
| Sophie, `/questionnaires/<id>` | 390 px | présent | absente, sans réserve | — | — |
| Sophie, `/suivi` | 1 024 px | présent | rendue, `display: none` ; réserve `display: none` | — | 1 024 / 1 024 |
| Jennifer, mineure | 390 px | absent ([[D-283]] §5) | absente, sans réserve | — | — |
| Michel, majeur clos | 390 px | présent (la garde suit l'âge, Q36) | « Suivi » actif | — | — |
| Michel, « Avant de commencer » requis | 390 px | absent | absente, sans réserve | — | — |

- Écart trouvé et corrigé pendant le constat : la réserve valait 4 rem, la barre 4 rem plus sa bordure haute d'un pixel ; le pied passait d'un pixel sous la barre. La réserve compte désormais la bordure, et l'E2E ne tolère plus qu'un demi-pixel d'arrondi.
- Le viewport porte `viewport-fit=cover` sur les pages du portail, connexion comprise, drapeaux ouverts. Après la revue de la PR (#1875), la zone sûre basse passe de la réserve de la barre au conteneur, présente barre ou non : une page sans barre ne laisse pas le pied sous l'indicateur d'accueil ; en émulation (zone sûre nulle) les mesures ci-dessus sont inchangées.
- Impression : vérifiée par l'émulation `print` de l'E2E (la barre disparaît), non imprimée sur papier.
- Non constaté à l'écran : la quatrième case, « Bibliothèque » ou « Fiches » (aucune fiche remise dans le seed : une remise demande la chaîne d'approbation et de versions ; épinglée au banc dans ses deux formes, et absente quand rien n'est remis, comme ici) ; le mineur clos (épinglé au banc) ; un appareil à encoche réel (zone sûre nulle en émulation).

### L5 — Rail latéral (non engagé)
- **État (2026-11-05)** : engagé par Q52 (chapitre 20), avant le constat du menu et de la barre ; les quatre conditions de réouverture sont tranchées par Q53, Q56, Q57 et Q58. Livré éteint sous `WN_PORTAIL_RAIL_LATERAL`, sans effet tant que `WN_PORTAIL_MENU` est fermé, sous [[D-447]] (brouillon `decision-D-447-rail-lateral.md`, accepté mot pour mot le 2026-11-05) ; servi au seul dossier majeur ([[D-283]] §5), dès 1 024 px, à la place du bouton « Menu », hors questionnaire en cours. Constat à l'écran consigné ci-dessous.

#### Constat à l'écran de L5 (2026-11-05)
Même protocole que L1 à L4 : dev local sur le Mac, navigateur intégré, base éphémère de `test:worktree --fast --keep-db` (après un T2 vert, 345 E2E passés sur les deux projets). `WN_PORTAIL_MENU`, `WN_PORTAIL_BARRE_BASSE` et `WN_PORTAIL_RAIL_LATERAL` armés côté serveur ; session ouverte par un lien magique émis par la route praticien. Patient fictif du seed Sophie Nicola, états posés puis retirés en base de test : majeure ; mineure (date de naissance passée à 2012) ; majeure et close (`suiviClotureLe` posé) ; accusés « Avant de commencer » retirés. Mesures par `getBoundingClientRect` ; « colonne » = largeur du `main` moins son `px-4` ; « page » = `scrollWidth` / `clientWidth` du document.

| Dossier, page | Largeur, confort | Rail | Bouton « Menu » | Colonne | Page |
|---|---|---|---|---|---|
| Sophie, majeure, `/suivi` | 1 280 px, 100 % | 252 px, collant (`sticky`) ; « Mon parcours », rendez-vous de suivi (`aria-current="page"`), carnet, dossier à deux voix ; liens de 44 px | masqué | 924 px (contenu à 672 px) | 1 280 / 1 280 |
| Sophie, `/suivi` | 1 024 px, 100 % | 252 px | masqué | **668 px** | 1 024 / 1 024 |
| Sophie, `/suivi` | 1 024 px, 112,5 % | 283,5 px ; liens de 49,5 px | masqué | **623,5 px** | 1 024 / 1 024 |
| Sophie, `/suivi` | 1 023 px | rendu, `display: none` | visible | 991 px (contenu à 672 px) | — |
| Sophie, hub | 1 024 px | « Mon parcours » actif ; « Autres espaces » visible à côté, mêmes entrées | masqué | — | — |
| Sophie, questionnaire en cours (identifiant inexistant : la règle se lit sur le chemin) | 1 024 px | absent ; cadre sans colonne | visible | 992 px | — |
| Sophie, mineure, `/suivi` | 1 280 px | absent ; cadre sans colonne | absent ([[D-283]] §5) | 1 248 px | — |
| Sophie, majeure close, hub | 1 280 px | présent (la garde suit l'âge, Q36) | masqué | — | — |
| Sophie, « Avant de commencer » requis | 1 280 px | absent | absent | — | — |
| Connexion | 1 280 px | absent | absent | — | 1 280 / 1 280 |

- Les largeurs de colonne mesurées sont celles que le chapitre 20 calculait (668 et 623,5 px).
- Pied d'urgence : sur le hub à 1 024 px, en fin de défilement, le bas du rail est à 356 px, le haut du pied à 703 px ; « 3114 » reçoit le clic.
- Premier passage sous `next dev` : le hub a rendu un temps ni rail ni bouton, le temps que la lecture des murs revienne (fail-closed, [[D-442]] §1) ; au rechargement, rail et bouton masqué. Le cadre, rendu dès le premier rendu, ne remonte pas la page (banc Vitest).
- Fermeture du panneau au seuil de 1 024 px et impression : vérifiées par l'E2E (`portail-rail-lateral.spec.ts`), non constatées à l'écran ; impression en émulation `print`, non imprimée sur papier.
- Non constaté à l'écran : un vrai questionnaire en cours (aucune assignation sur ce dossier de test ; épinglé au banc et sur chemin) ; le mineur clos (épinglé au banc) ; le rail à 112,5 % sur une liste de plus de quatre entrées (la base n'en servait que quatre).
- Conditions de réouverture : décision qui lève « une étape à la fois » pour le patient, jetons patient du rail définis, colonne validée à 1024 px en confort 112,5 %, clé de repli déclarée dans `stockageAppareil.ts` ou rail toujours déplié.

### Dépendances
- PR #1765 : ouverte, modifie `MobileBottomNav.tsx` (+4 −1) et y ajoute son premier banc (lue avec `gh`, hors de l'arbre lu). Aucun lot patient ne touche `MobileBottomNav`, `SidebarRail` ni `NavBar` : L0 à L3 en sont indépendants si le composant patient est séparé.
- Plan §8 ligne 2684 et D/30 (ligne 2319, « fait le 2026-11-01 ») : dette à mettre à jour à chaque lot.
- D/49 (ligne 2338, gel du 2026-10-21 écrit en §6 ligne 2445) : le gel vise la palette de commandes et les questions du shell 3.0 côté praticien ; il ne bloque pas un composant patient séparé. Un composant commun demanderait d'attendre le merge de #1765 et de rouvrir D/49.
- Séquence de la file C : l'activation de « Ma bibliothèque » est la place 10, libérée par la porte 18 ; le constat de la place 7 est fait le 2026-11-01, et D-360 §4 étend le constat au lien des fiches (docs/FEATURE_FLAGS.md:59). Fusionner L2 pendant cette fenêtre brouille le constat des liens. Aucune règle écrite ne l'interdit : prudence.
- Session : ne pas toucher `[token]/page.tsx` ni `/api/portail/session` en L0 à L3 ; sinon `wn-reviewer` et T3 (EP-07).
- Travail : partir d'`origin/main` fraîchement récupéré dans un worktree (le `main` local est souvent en retard) ; clôture de chaque lot par fragment `changelog.d`, handoff et mise à jour du plan telle que décrite en L2.

## 12. Risques
- Doctrine : « même organisation » heurte A6-R1 côté patient ; sans D-xxx, B et C contredisent un texte opposable (EP-11, chapitre 7). A5-R2 et « pas de rail » ne sont pas en cause.
- Principes écrits opposés : « sans un oui franc, pas de lien » contre « une porte qui s'explique » ; retirer carnet et suivi du hub pour un patient sans protocole serait retirer un accès (EP-05).
- Murs d'entrée : un menu au layout contourne « Avant de commencer » et la date de naissance, et s'affiche sur connexion et pages d'erreur (EP-02).
- Pied d'urgence : une barre fixe le recouvre sans réserve de bas ; D-293 l'impose sur toutes les pages (EP-14).
- Sondes asynchrones : décalage de mise en page, groupe orphelin, clic perdu déjà constaté (`portail-parcours.spec.ts:267-269`), dix requêtes à ne pas doubler ; règles d'âge divergentes (EP-20).
- E2E épinglés : libellés « Consulter mon bilan » et « Ouvrir mon dossier à deux voix », budget de 80 Tab, `visual.spec.ts:443`, 14 attentes du heading « Mon parcours » en mode strict, `portail-deconnexion.spec.ts:34` (`exact: true`).
- Hauteur : la ligne de liens reste « plus haute que Mon parcours » pour un patient qui a reçu bilan, fiches et courriers ; des intertitres ne garantissent pas un gain (EP-03). Non mesuré.
- Gardes aveugles : un Dialog Radix brut copié du praticien passe toutes les gardes (EP-12).
- « Mon accompagnement » replié face à D-315 et D-349, dont les drapeaux sont posés en production (EP-24).
- Arbitrage du 2026-09-12 : sa seule trace vivante attachée au code est un commentaire JSX qui disparaît avec la refonte (EP-19).
- Noms de groupes : un nom pris (« Mon dossier », « Mes documents ») crée une confusion que D-251 §8 a déjà écartée (EP-22).
- E-mails : un gabarit envoyé cite un libellé d'entrée (« Ouvrir mon dossier à deux voix ») et deux citent « Accéder à mon parcours » ; les renommer demande une nouvelle version par gabarit et la réécriture de leurs bancs (un pour le libellé d'entrée, trois pour « Accéder à mon parcours » ; EP-07, EP-09).
- Confort de lecture : un `ReadingComfortControl` placé dans un contenu Radix démonté perdrait les préférences (déduction du code, non testée) ; un premier rendu à 100 % puis 112,5 % ferait sauter une barre fixe.
- Session : rendre l'écran d'étapes redirigeant oblige à déplacer la réémission du cookie (EP-07).
- Documentation : `design-system-d1.md` périmé (lignes 116, 123, 136, 20-21) ; critères A6-R1 et D-175 non alignés dans le registre.
- Source des drapeaux : le registre est une trace écrite ; une extinction non consignée y échapperait (non constaté).
- Non mesuré : tout rendu, tout contraste en production, toute largeur à 390 px est calculé ; aucun CSS compilé n'a été lu.

## 13. Questions au responsable
Chaque question appelle une réponse fermée, avec la recommandation de l'audit. Q1 à Q3 fixent la direction (tranchées le 2026-11-01, chapitre 14) ; les autres sont tranchées dans L0, le 2026-11-02, avant tout code (chapitre 15).
1. Q1 Périmètre : retenez-vous, en premier lot, le regroupement dans le hub seul (A), le menu en tiroir (B) restant ouvert après constat de l'écran ? Recommandation : oui.
2. Q2 Sens de « même organisation » : confirmez-vous que la reprise porte sur l'organisation (groupes nommés, ordre, un seul actif, liste unique, primitive de superposition) et non sur l'apparence ni les compteurs ? Recommandation : oui.
3. Q3 « Rails » : confirmez-vous que le rail des sept phases de la fiche n'est pas repris comme menu patient, la frise des six étapes restant un repère non cliquable ? Recommandation : oui.
4. Q4 Si B ou C est retenu : acceptez-vous d'amender A6-R1 côté patient par une D-xxx, et `frontend-ui.md:36-40` pour la navigation ? A5-R2 n'a pas à l'être. Recommandation : amender seulement si B est retenu ; ne pas amender pour C.
5. Q5 Groupes : validez-vous quatre groupes (« Au jour le jour », « Ce que j'ai reçu », « Ce que je transmets », « Avec mon praticien »), ou préférez-vous la variante à trois groupes, dont « Mon dossier » entre en collision avec le titre de la page du dossier à deux voix ? Recommandation : quatre.
6. Q6 Libellés d'entrée : les gardez-vous tels quels en L2 (recommandation), ou retirez-vous le verbe « Ouvrir » des quatre liens, ce qui demande une nouvelle version d'un seul gabarit d'e-mail (`objectif_propose`, registreGabarits.ts:483-484) et l'ajustement de son banc (registreGabarits.test.ts:267), pour un seul des quatre liens ?
7. Q7 Ordre : acceptez-vous l'ordre proposé (suivi, reçu, transmis, dossier partagé, journal en dernier) ?
8. Q8 Règle d'activation : ce-qui-compte et comprehension allument-ils « Ouvrir mon dossier à deux voix » ? informations et conditions n'allument-elles rien ?
9. Q9 Suivi et carnet : restent-ils inconditionnels en L2, la page s'expliquant (« une porte qui s'explique », LOT-05:41-46), ou reçoivent-ils une sonde, au nom de « sans un oui franc, pas de lien » (LOT-05:38-39) ? Recommandation : inconditionnels en L2, puisque retirer le lien serait retirer un accès.
10. Q10 Groupe vide : confirmez-vous qu'un groupe sans entrée ouverte n'affiche pas d'étiquette ?
11. Q11 D-288 §1 : un regroupement de liens existants est-il une « surface neuve » ? Recommandation : non pour L2, oui pour L3 et pour L2b (la frise change visiblement).
12. Q12 Arbitrage du 2026-09-12 : le versez-vous en D-xxx, avec ce-qui-compte, comprehension et protocole sans porte propre ? Recommandation : oui, avant de toucher au JSX.
13. Q13 « Signaler un problème » (PLAN:2668) : dans le lot ou hors du lot ? Recommandation : hors du lot.
14. Q14 D/49 : un menu patient rouvre-t-il les questions du shell 3.0 ? Recommandation : non, composant séparé.
15. Q15 Nom de la landmark : gardez-vous « Autres espaces » en A et le renommez-vous en B ?
16. Q16 Drapeau de L3 : livrez-vous L3 derrière un drapeau serveur éteint ? Recommandation : oui.
17. Q17 Hauteur : acceptez-vous des intertitres sans gain de hauteur garanti, ou voulez-vous alléger les liens (plancher de 44 px) ?
18. Q18 Compteur « N questionnaires à compléter · ≈ N min » : le nommez-vous en exception de D-333 ou le retirez-vous ?
19. Q19 « Mon accompagnement » : le dépliez-vous d'office lorsqu'un protocole est servi, sachant que les drapeaux de D-315 et D-349 sont posés en production ?
20. Q20 Nom et cible des retours : « Mon parcours » et le hub pour « ← Mon espace » de `informations`, le retour de `/conditions` restant vers l'accueil de l'espace, cible voulue et testée (conditions/page.test.tsx:70-73) ?
21. Q21 Écran « Merci ! » : un patient déjà accueilli est-il redirigé vers le hub, au prix du déplacement de la réémission du cookie, de trois gabarits d'e-mail, de trois bancs de gabarit, de deux bancs de page et d'un E2E (EP-07) ? Recommandation : non dans ce chantier.
22. Q22 Réévaluation : devient-elle une espèce de tâche du fil plutôt qu'un second bouton plein ? L'E2E `portail-pack-reevaluation.spec.ts` exige deux réponses au même niveau.
23. Q23 Constat à l'écran : autorisez-vous un constat sur dossier de test (majeur, mineur, clos) de la hauteur réelle et de l'écart 13 / 12 / 15 avant L2 ? Recommandation : oui.
24. Q24 Mot-symbole : devient-il un lien d'accueil, et vers où (hub quand le segment est connu, connexion sinon) ? `/portail` seul n'a pas de page.
25. Q25 Barre basse (L4) : reprenez-vous les quatre entrées de la maquette 4.0 (Accueil, Journal, Suivi, Documents), dont trois (Accueil, Journal, c'est-à-dire le carnet alimentaire, Suivi) ont un équivalent stable et dont « Journal » et « Documents » posent des collisions de mot, ou laissez-vous L4 sans entrées nommées ? Recommandation : sans entrées nommées tant que B n'est pas livré.
26. Q26 Côté praticien, hors périmètre : l'absence de « Comptes du cabinet » dans la feuille « Plus » est-elle un oubli ou un choix ? Écart tracé au plan par cette PR (§8, dettes techniques vivantes) ; D-324 §5 veut la parité feuille/rail.

### Questions ouvertes par la relecture du 2026-11-02 (tranchées, chapitre 15)
31. Q31 Étape 6 courante : quand la restitution est disponible (`restitution_disponible`, `prochaine_etape_prete`, contrat.ts:305-310), « Restitution » ouvre-t-elle le bilan, cible existante gouvernée par `bilanConsultable` (contrat.ts:293-298), ou reste-t-elle non cliquable ? Recommandation : le bilan quand il est consultable, sinon non cliquable.
32. Q32 Étape 5 passée : quelle surface existante relit « Analyse du praticien » une fois la restitution disponible ? Sans cible, l'étape reste non cliquable (Q28). Recommandation : non cliquable.
33. Q33 Rang visible des étapes : la maquette numérote les étapes (« 1. Consentement »), la frise actuelle non (PatientJourneyProgress.tsx:56-58). Un rang ordinal est-il un chiffre au sens de D-333 §1 (DECISIONS.md:5392-5408) ? Deux précédents affichent un rang : « Étape N sur 4 » (AvantDeCommencer.tsx:81) et « Jour N sur 7 » (AgendaAlimentaireJournal.tsx:330). Recommandation : libellés inchangés, sans rang, tant que D-333 n'est pas précisée.
34. Q34 Étapes 1 et 2 en relecture : « Consentement » et « Informations » n'ont pour cibles existantes que `/conditions` et `/informations` (chapitre 5), que le chapitre 9 laisse hors menu, « portes du pied de page » (« Aucune porte nouvelle » ; arbitrage du 2026-09-12, LOT-05:55-71). Une étape passée ouverte en relecture (Q29) est-elle une porte au sens de cet arbitrage, ou une relecture distincte du menu ? Recommandation : une relecture, hors menu, qui ne crée ni route ni lien dans « Autres espaces » ; sinon ces deux étapes restent non cliquables.

## 14. Réponses du responsable (2026-11-01)

Q1 à Q3 ont été tranchées le 2026-11-01, à options fermées, sur la seule lecture de ce document ; aucun écran n'a été constaté.

| Question | Réponse | Effet sur le plan |
|---|---|---|
| Q1 Périmètre | **A d'abord, B ensuite** : le regroupement dans le hub (L2) en premier ; le bouton « Menu » et le tiroir (L3) restent ouverts, décidés après constat de l'écran de L2 | L2 engagé après L0 et L1 ; L3 conditionné au constat ; C non engagée |
| Q2 Sens de « même organisation » | **L'organisation seule** : groupes nommés, ordre, un seul élément actif (`aria-current`), liste déclarée une fois, primitive de superposition ; ni l'apparence (rail nuit, jetons `--rail-*`), ni les compteurs (D-333) | confirme le chapitre 10 : aucun jeton de rail côté patient, `PanneauSuperpose theme="patient"` pour B |
| Q3 « Rails » | **Menu + étapes** : un menu des espaces permanents *et* une frise des étapes navigable, sur le modèle du couple rail-menu / rail des sept phases du praticien | nouveau lot L2b entre L2 et L3 (chapitre 11) ; la section « Écartée » du chapitre 8 reste comme évaluation des coûts |

### Questions ouvertes par Q3, tranchées le 2026-11-01
27. Q27 Étapes 5 et 6 : « Analyse du praticien » et « Restitution » n'ont aucune page propre (elles sont « côté praticien », `journeyCurrentId: 5 | 6`, trajectoire-partagee/contrat.ts:277). Que fait un clic : rien (étape non cliquable, mais annoncée), un texte d'attente, ou le bilan quand il est consultable ? Recommandation : un texte d'attente court, jamais un chiffre ni une date promise.
28. Q28 Rattachement : quelle zone ouvre chaque étape ? Aucun rattachement entrée-étape n'existe dans le code lu. À écrire étape par étape dans la D-xxx, en nommant la cible existante (page, section du hub) sans créer de route.
29. Q29 Étapes passées et à venir : une étape franchie s'ouvre-t-elle en relecture (consentement, renseignements) ? Une étape à venir reste-t-elle fermée ? Recommandation : passée ouverte en lecture, à venir fermée, pour rester dans A6-R1 « une étape à la fois ».
30. Q30 Accessibilité et bancs : `aria-current="step"`, cibles 44 px en `rem`, rôle de la liste (`nav` nommée distincte de « Autres espaces ») ; un seul `<nav>` nommé par fonction. Recommandation : `nav aria-label="Étapes de votre parcours"` (libellé déjà porté par la liste, PatientJourneyProgress.tsx:56).

| Question | Réponse | Effet sur L2b |
|---|---|---|
| Q27 Étapes 5 et 6 | **Texte d'attente court** : un clic sur « Analyse du praticien » ou « Restitution » ouvre une phrase d'attente, sans chiffre (D-333) ni délai promis (D7, CAMPAGNE.md:94) | le texte est un libellé patient, accepté mot pour mot avant le merge (D-360 §1 par analogie), sous la garde D7 ; aucune route ; précision de la relecture du 2026-11-02 : l'attente ne vaut que pour l'étape courante réellement en attente (étape 5) ; l'étape 6 courante, restitution disponible, n'a pas de texte d'attente et sa cible est Q31 (L2b) |
| Q28 Rattachement | **Cibles existantes seulement** : la D-xxx nomme pour chaque étape une page ou une section existante ; une étape sans cible existante n'est pas cliquable ; aucune route neuve | le tableau étape → cible s'écrit dans L0 ; à vérifier alors pour « Situation », saisie à l'accueil (`[token]/page.tsx`) : si aucune surface existante ne la relit, l'étape reste non cliquable ; de même pour l'étape 5 passée (Q32) ; l'étape 5 courante est l'exception voulue par Q27 |
| Q29 Passées et à venir | **Passée en relecture, à venir fermée** | bancs : étape passée → lien, courante → `aria-current="step"`, à venir → annoncée, non cliquable ; reste dans A6-R1 |
| Q30 Forme | **`<nav aria-label="Étapes de votre parcours">`**, distincte de « Autres espaces » | un seul `aria-current="step"`, cibles 44 px en `rem`, bancs d'ordre des six étapes, E2E 390 px et Desktop, `axe` sur le hub ; l'`aria-label` actuel de l'`<ol>` (PatientJourneyProgress.tsx:56) monte sur la `nav` |

## 15. Réponses du responsable (L0, 2026-11-02)

Q4 à Q26 et Q31 à Q34 ont été tranchées le 2026-11-02, à options fermées (recommandation de l'audit en première option quand elle existe), sur la lecture de ce document et des seules sources citées par chaque question ; aucun écran n'a été constaté. Les réponses se rangent dans l'ordre où elles ont été posées. Le texte de décision qui en découle est `decision-D-423-menu-patient.md`, à côté de ce document ; le responsable l'a relu et accepté mot pour mot le 2026-11-03, avec ce chapitre ; il entre au registre avec L2 (chapitre 11).

| Question | Réponse | Effet sur le lot |
|---|---|---|
| Q5 Groupes | **Quatre groupes** : « Au jour le jour », « Ce que j'ai reçu », « Ce que je transmets », « Avec mon praticien » | noms acceptés mot pour mot, D-423 §2 et §3 ; la variante à trois groupes est écartée |
| Q7 Ordre | **Ordre proposé** : au jour le jour, reçu, transmis, avec mon praticien ; « Ouvrir mes échanges » en dernier | D-423 §2 ; banc d'ordre exact en L2 |
| Q10 Groupe vide | **Pas d'étiquette** : un groupe sans entrée ouverte disparaît entièrement | D-423 §2 ; banc « groupe vide sans étiquette » en L2 |
| Q15 Landmark | **« Autres espaces » gardé en A** ; le nom du menu de B se tranche à l'ouverture de L3 | D-423 §2 ; L3 porte la question du nom |
| Q8 Activation | **Tel que proposé** : `/ce-qui-compte` et `/comprehension` allument « Ouvrir mon dossier à deux voix » ; `/informations` et `/conditions` n'allument rien | D-423 §4 |
| Q9 Suivi et carnet | **Inconditionnels en L2** : la page s'explique (LOT-05, « une porte qui s'explique ») | D-423 §2 ; retirer le lien serait retirer un accès |
| Q12 Arbitrage du 2026-09-12 | **Versé dans la décision** | D-423 §5 : ce-qui-compte, comprehension et protocole sans porte propre ; une invitation appartient au fil |
| Q20 Retours | **`/informations` seule** : « ← Mon espace » devient « ← Mon parcours », même cible (le hub, informations/page.tsx:104-108) ; `/conditions` garde « ← Mon espace » vers l'accueil de l'espace (conditions/page.test.tsx:70-73) | L2 ; D-423 §3. L'audit ne marquait pas de recommandation pour Q20 : l'option retenue était déduite du chapitre 9 |
| Q4 A6-R1 | **Amender seulement si B est retenu** ; ne pas amender pour C | D-423 n'amende ni A6-R1 ni `frontend-ui.md:36-40` : A et L2b restent dans A6-R1 (relire une étape passée n'est pas « empiler ») ; L3 portera sa propre décision |
| Q11 D-288 §1 | **Non pour L2, oui pour L2b et L3** | D-423 §7 : L2 sans drapeau (retour par revert) ; L2b et L3 derrière un drapeau serveur éteint, une place en file C chacun |
| Q14 D/49 | **Non** : composant patient séparé | le gel de D/49 reste intact ; aucun lot ne touche `SidebarRail`, `NavBar` ni `MobileBottomNav` |
| Q16 Drapeau de L3 | **Oui, drapeau serveur éteint** | L3 ; entrée dans `docs/FEATURE_FLAGS.md` à la livraison |
| Q6 Libellés d'entrée | **Tels quels en L2** | D-423 §3 ; aucun gabarit d'e-mail ne change |
| Q17 Hauteur | **Alléger les liens** : les entrées des groupes deviennent des liens de liste, plancher de 44 px en `rem`, au lieu de boutons `ghost` de 48 px | L2 ; bancs de cible ≥ 44 px ; l'audit ne recommandait rien |
| Q18 Compteur du hub | **Retiré**, dans L2 : « N questionnaires à compléter · ≈ N min » (questionnaires/page.tsx:544-545) disparaît ; la liste « À compléter » reste | D-423 §6 ; aucune exception nouvelle à D-333 ; l'audit ne recommandait rien |
| Q19 « Mon accompagnement » | **Déplié d'office quand un protocole est servi**, replié sinon ; le repli interne de D-315 (« Voir le détail de mon protocole ») fait seul son travail ; ni icône, ni texte lu, ni changement de couleur | L2 ; D-423 §3. Réponse revue le 2026-11-02 (ci-dessous) : la première réponse (replié, avec une icône et le texte lu « Votre protocole est disponible ») gardait cachés derrière un clic l'encart de conduite (D-349 §2, « lu avant tout clic ») et le dépli d'office sur pause (D-315) ; elle est retirée |
| Q13 « Signaler un problème » | **Hors du lot** | la dette PLAN §8 garde son lot UI à part |
| Q21 Écran « Merci ! » | **Non dans ce chantier** | `[token]/page.tsx` et `/api/portail/session` restent hors de L0 à L3 |
| Q22 Réévaluation | **Tâche du fil**, dans un lot à part, après L2 | D-423 §5 ; l'E2E `portail-pack-reevaluation.spec.ts` (deux réponses au même niveau) et la règle « un seul bouton plein » se reprennent dans ce lot ; son texte patient s'accepte alors ; l'audit ne recommandait rien |
| Q23 Constat à l'écran | **Oui, avant L2** | L1 consigne la hauteur réelle et l'écart 13 / 12 / 15 sur dossier de test majeur, mineur et clos |
| Q31 Étape 6 courante | **Le bilan quand il est consultable**, sinon non cliquable ; jamais de texte d'attente | D-423 §8 |
| Q32 Étape 5 passée | **Non cliquable** | D-423 §8 |
| Q33 Rang visible | **Sans rang** : libellés inchangés, sans numéro, tant que D-333 n'est pas précisée | D-423 §8 ; la maquette du chapitre 9, qui numérote, est à corriger si elle est reprise |
| Q34 Étapes 1 et 2 | **Non cliquables** (règle de Q28) : aucune page existante ne relit ce qui a été saisi à ces étapes | D-423 §8. Réponse revue le 2026-11-02 (ci-dessous) : la première réponse (relecture hors menu vers `/conditions` et `/informations`) reposait sur des cibles qui ne relisent pas l'étape ; elle est retirée, et la question de la porte devient sans objet |
| Q24 Mot-symbole | **Lien d'accueil, avec L3** : vers le hub quand le segment est connu, vers la connexion sinon, absent sur les murs d'entrée | L3 (composant client, `useParams`) ; l'audit ne recommandait rien |
| Q25 Barre basse | **Report en L4 confirmé**, sans entrées nommées tant que B n'est pas livré | hors D-423 |
| Q26 « Comptes du cabinet » (praticien) | **Oubli** | hors D-423 ; la ligne du PLAN §8 (l. 2696) est soldée sur l'arbitrage ; l'ajout de `/dashboard/cabinet` à la feuille « Plus » reste à faire dans un lot praticien à part |

### Textes patient acceptés mot pour mot le 2026-11-02
- Noms de groupes (Q5) : « Au jour le jour », « Ce que j'ai reçu », « Ce que je transmets », « Avec mon praticien ».
- Texte d'attente de l'étape 5 courante (Q27), **en `analyse_en_cours` seulement** : « Votre praticien prépare votre restitution à partir des éléments transmis. Vous la retrouverez ici dès qu’elle sera prête. » Il passe la garde D7 telle qu'écrite (`formulations.guard.test.ts:16-23` : aucun chiffre, aucun pourcentage, aucun mot de jeu, aucun mot de récompense, aucun mot de dégradation, aucune tournure de délai). En `elements_transmis`, l'étape 5 courante ouvre la phrase déjà servie « Vos éléments ont été transmis. » (formulations.ts:16) : aucun texte neuf.
- Retour de `/informations` (Q20) : « ← Mon parcours », libellé déjà servi par les sous-pages.

L'apostrophe de « Ce que j’ai reçu » devient typographique le 2026-11-04 (Q35, chapitre 16) ; le libellé ne change pas autrement.

Le texte lu de « Mon accompagnement » (« Votre protocole est disponible »), accepté avec la première réponse à Q19, est retiré avec elle.

### Réponses revues le 2026-11-02 après relecture de la PR
Une relecture de la PR du lot L0 a relevé quatre points qui touchaient des réponses ou un texte accepté. Le responsable les a tranchés le même jour, à options fermées, recommandation en première option :
- **Q19** : la première réponse gardait l'encart de conduite et le dépli sur pause derrière un clic, contre D-315 (`docs/DECISIONS.md:7746-7749`, pause « se lise sans clic ») et D-349 §2 (`:4802-4805`, « lu avant tout clic »). Ce repli englobant existe déjà en production (questionnaires/page.tsx:514-520, autour de `PatientCompanionHome`, qui rend l'encart à PatientCompanionHome.tsx:300). Réponse revue : déplié d'office quand un protocole est servi.
- **Étape 5 courante** : elle couvre aussi `elements_transmis`, sans analyse commencée (contrat.ts:311-314) ; « Votre praticien prépare… » y serait faux (D7, D11). Réponse : deux textes selon l'état, le texte accepté en `analyse_en_cours`, la phrase déjà servie en `elements_transmis`.
- **Étapes 1 et 2 (Q34)** : `/conditions` présente les conditions d'utilisation (conditions/page.tsx:72), pas le consentement au suivi saisi à l'étape 1 (`[token]/page.tsx:174-180`) ; `/informations` est le centre de confidentialité et de droits (informations/page.tsx:95, 103), pas la fiche signalétique de l'étape 2. Réponse : non cliquables.
- **Étape 4** : la liste « À compléter » n'est pas rendue quand tous les questionnaires restants sont remontés dans le fil (filDuJour.ts:407-409 ; questionnaires/page.tsx:549-557). Réponse : l'étape vise alors « Mon parcours », le fil où ils sont remontés.

### Constats faits en rédigeant le tableau étape → cible (à relire)
- « Situation » (étape 3, l'anamnèse saisie à `[token]/page.tsx:815-826`) : aucune surface patient lue ne la relit. « Ma fiche de renseignements » montre les déclarations de D-335 (`DeclarationsPatient`), pas l'anamnèse ; c'est le panneau praticien qui rapproche les deux. Par la règle de Q28, l'étape reste non cliquable.
- « Questionnaires » (étape 4) : sa cible existante est la liste des questionnaires du hub (« À compléter » et les sections suivantes, questionnaires/page.tsx:536-612), une section de la page, sans route ; quand cette liste n'est pas rendue, « Mon parcours » (réponse revue ci-dessus).
- Les étapes 5 et 6 ne sont dérivées qu'une fois les questionnaires transmis (contrat.ts:284-312) ; sur le hub, les étapes 1 à 3 sont toujours passées. La frise des écrans d'entrée (`[token]/page.tsx:783-832`) reste un repère : L2b ne touche pas cette page (Q21, EP-07).

## 16. Réponses du responsable après L1 (2026-11-04)

Quatre points relevés par L1 (PR #1840, chapitre 11, « Constat à l'écran de L1 ») ont été tranchés le 2026-11-04, à options fermées, recommandation en première option. Aucun ne change le périmètre de L2 ni le texte de D-423 au-delà de Q35.

| Question | Réponse | Effet |
|---|---|---|
| Q35 Apostrophe de « Ce que j'ai reçu » | **Typographique** : « Ce que j’ai reçu », comme les autres libellés patient (« Transmettre un compte rendu d’analyses ») | D-423 §2 et §3 l'écrivent ainsi ; L2 la porte dans `GROUPES_AUTRES_ESPACES` (`entreesAutresEspaces.ts`) et dans son banc, où L1 avait recopié l'apostrophe droite du texte accepté. Aucun autre mot ne change |
| Q36 Mineur au dossier clos | **Les liens d'un mineur** : les entrées suivent l'âge seul, aucune sonde ne lit la clôture (EP-20) | rien à changer en L2 ; D-423 §2 (« Chaque entrée garde sa condition et sa sonde ») le couvre ; le banc de L1 (`questionnaires/autresEspaces.test.tsx`, cas « clos mineur ») l'épingle |
| Q37 Plafond de hauteur d'EP-03 | **Recalculé** sur le lien mesuré de 50,8 px : 741,6 px pour 12 liens, 427,6 px pour 7 | aucun changement de taille hors L2 ; la hauteur se réduit par l'allègement des liens que L2 porte déjà (Q17, D-423 §2) ; le constat à l'écran de L2 la remesure sur les mêmes dossiers |
| Q38 Dossier clos majeur : questionnaires encore « à commencer » | **Lot séparé**, hors de ce chantier | constat incident de L1 (questionnaires/page.tsx:275-281) ; diagnostic et correction dans une session et une PR à part, sans toucher au menu « Autres espaces » |

## 17. Réponse du responsable après L2 (2026-11-04)

Le constat à l'écran de L2 (chapitre 11) lui a été présenté le 2026-11-04 : ordre, étiquettes et liens conformes sur les trois dossiers, bloc plus haut qu'avant à 1 024 comme à 390 px. Question posée à options fermées, sans recommandation imposée (l'assistant recommandait de garder).

| Question | Réponse | Effet |
|---|---|---|
| Q39 La hauteur du bloc après L2 appelle-t-elle une reprise avant L2b ? | **Garder, lancer L2b** : L2 reste tel que livré (#1856) | aucune reprise de hauteur ; L2b s'ouvre ; un allègement éventuel (étiquettes, ancre) relèverait d'un lot à part, non demandé |

Appliqué en L2b, sans question nouvelle : la frise navigable est une surface neuve (D-423 §7) ; [[D-283]] §5 n'ouvre aucune surface neuve à un mineur et traite un âge inconnu comme celui d'un mineur. Elle est donc servie au seul dossier majeur, selon l'âge et non la clôture, comme les entrées du menu (Q36) ; un mineur, clos ou non, garde la frise d'avant.


## 18. Réponses du responsable à l'ouverture de L3 (2026-11-04)

Après la livraison de L2b (#1865), le responsable a ouvert L3 (« Ouvrir L3 »). Quatre questions ont été posées à options fermées, recommandation en première option ; les quatre recommandations sont retenues. Le texte de décision qui en découle est `decision-D-442-menu-mon-espace.md`, à côté de ce document.

| Question | Réponse | Effet |
|---|---|---|
| Q40 (Q15) Noms du bouton et du menu | **« Menu » / « Mon espace »** : bouton « Menu » dans l'en-tête ; panneau et navigation nommés « Mon espace », distincts de « Autres espaces » | D-442 §2 et §4 ; même sens que le retour « ← Mon espace » de `/conditions` |
| Q41 Pages | **Toutes les pages de session**, hub et écrans de saisie compris ; jamais sur la connexion, `lien/indisponible`, les écrans de `[token]/page.tsx`, ni avant les murs d'entrée | D-442 §1 ; conforme à D-423 §4, qui allume « Mon parcours » sur `/questionnaires/[idAssignation]` |
| Q42 Mineurs | **Majeurs seuls** ([[D-283]] §5), selon l'âge et non la clôture (Q36) | D-442 §1 ; même règle que la frise navigable de L2b |
| Q43 Lien d'évitement | **Oui, dans L3** : « Aller au contenu », visible au focus, vers `<main id="contenu">` | D-442 §6 ; texte patient à accepter |

## 19. Réponses du responsable à l'ouverture de L4 (2026-11-05)

Après la livraison de L3 (#1870, [[D-442]]), le responsable a ouvert L4, barre basse facultative, pour arbitrage seul, sans code. Huit questions ont été posées à options fermées, recommandation en première option, sur la lecture d'`origin/main@3550e6db` (EP-14, chapitre 8, chapitre 11 L4, chapitre 12, Q25 et sa réponse au chapitre 15, chapitre 18 et [[D-442]] §1 et §4, [[D-293]], [[D-283]] §5, [[D-288]] §1). Q44 a été posée seule, parce que sa réponse décidait des suivantes. Deux réponses s'écartent de la recommandation : Q44, où l'assistant recommandait d'attendre le constat du menu, et Q45, où il recommandait les trois entrées stables. Les deux questions dont la réponse est déjà écrite n'ont pas été posées : la barre est servie au seul dossier majeur ([[D-283]] §5) et derrière un drapeau serveur éteint ([[D-288]] §1). Aucun écran n'a été constaté. Le texte de décision qui en découle est `decision-D-444-barre-basse.md`, à côté de ce document : numéro réservé le 2026-11-05 (`refs/tags/reserve/D-444`), texte à accepter mot pour mot avant tout code.

| Question | Réponse | Effet |
|---|---|---|
| Q44 (Q25) Quand « B est livré » | **Le merge éteint suffit** : B est livré par #1870, `WN_PORTAIL_MENU` restant éteint ; l'assistant recommandait d'attendre que le menu soit posé et constaté | les entrées de la barre se nomment dès maintenant ; L4 sortira derrière son propre drapeau éteint, à une place de la file C après celle du menu (D-444 §8) |
| Q45 Entrées | **Les quatre emplacements de la maquette 4.0** : accueil, journal (le carnet alimentaire), suivi, documents ; l'assistant recommandait les trois entrées stables | D-444 §2 ; la cible de « Documents » et les libellés se tranchent en Q49 et Q50 |
| Q46 Pied d'urgence | **Réserve de bas sur le conteneur**, égale à la barre plus la zone sûre (EP-14) ; le pied ne change pas | D-444 §4 ; export `viewport` dans `portail/layout.tsx` ; E2E de non-recouvrement à 390 px et en confort 112,5 % |
| Q47 Largeur | **Sous 768 px seulement**, au seuil de la barre praticien ; au-delà, le bouton « Menu » seul | D-444 §1 ; constat à 390 px, bureau vérifié sans barre |
| Q48 Face au bouton « Menu » | **« Menu » reste dans l'en-tête, la barre n'a pas de case « Plus »** : un seul déclencheur du panneau | D-444 §2 ; [[D-442]] n'est pas amendée |
| Q49 Cible de « Documents » | **L'entrée servie de « Ce que j’ai reçu »** : Ma bibliothèque, ou à défaut Fiches remises par mon praticien, jamais les deux ([[D-360]] §2), sonde fermée par défaut ; rien de remis, pas de case | D-444 §2 ; aucune route neuve ; `/documents` reste le dépôt |
| Q50 Libellés | **Lever les deux collisions** : « Accueil » et « Suivi » restent ; « Journal » prend un mot du carnet alimentaire, « Documents » un mot de l'entrée servie, sans « document » ([[D-293]] §1, [[D-251]] §8, EP-22) | D-444 §3 : « Accueil », « Carnet », « Suivi », « Bibliothèque » ou « Fiches », à accepter mot pour mot |
| Q51 Pages | **Les pages du menu, sauf le questionnaire en cours** (`/questionnaires/[idAssignation]`) : règle de chemin, aucun état de page lu | D-444 §1 ; le suivi et le carnet, cibles de la barre, la gardent |

## 20. Réponses du responsable à l'ouverture de L5 (2026-11-05)

Après la livraison de L4 (#1875, [[D-444]]), le responsable a ouvert L5, rail latéral « non engagé », pour arbitrage seul, sans code. Neuf questions ont été posées à options fermées, recommandation en première option, sur la lecture d'`origin/main@536d00b6` (EP-11, EP-13, chapitre 8 C et « Ne pas engager C », chapitre 11 L5 et ses conditions, chapitre 12, Q2 et Q4 avec leurs réponses, chapitre 19 ; A6-R1 côté patient et ses deux précisions, A5-R2 ; [[D-442]], [[D-444]] §2 ; `web/src/lib/portail/stockageAppareil.ts`). Q52 a été posée seule, parce que sa réponse décidait des suivantes. Trois réponses s'écartent de la recommandation : Q52, où l'assistant recommandait d'attendre que le menu et la barre soient posés et constatés ; Q57, où il recommandait les jetons existants seuls ; Q58, où il recommandait un rail collé au bord. Q59 et Q60 n'étaient pas dans la liste d'ouverture : elles sont nées de la réponse à Q54 et de la lecture de [[D-444]] §1 et [[D-442]] §2.

Questions non posées, parce que leur réponse est déjà écrite : majeurs seuls ([[D-283]] §5) ; drapeau serveur éteint ([[D-288]] §1) ; l'organisation et non l'apparence (Q2) ; ni rail nuit ni bascule (A5-R2) ; focus forêt de la règle globale, jamais `outline-none` (EP-13) ; même garde et mêmes sondes que le menu ([[D-442]]) ; pied d'urgence jamais recouvert ([[D-293]]) ; impression masquée ([[D-392]] §1).

État de la file C au jour de l'arbitrage : `WN_PORTAIL_FRISE_NAVIGABLE`, `WN_PORTAIL_MENU` et `WN_PORTAIL_BARRE_BASSE` sont livrés éteints ; la porte 18 attend le constat de `WN_PORTAIL_CAPTURE_REPAS` (place 11), toujours « neuf et éteint à la livraison » (`docs/FEATURE_FLAGS.md:63`). Ni le menu ni la barre n'ont été constatés en production. Aucun écran n'a été constaté pour cet arbitrage.

Largeurs de colonne (calcul, aucun rendu ; 1 rem = 16 px à 100 %, 18 px à 112,5 %), à 1 024 px, colonne `max-w-2xl` de 42 rem (672 px, 756 px à 112,5 %) :

| Mise en page | Rail | 100 % | 112,5 % |
|---|---|---|---|
| Shell praticien : `gap-6`, `px-6` de chaque côté, `px-4` du `main` (NavBar.tsx:92, layout.tsx:103) | 15,75 rem | 668 px (1 024 − 252 − 24 − 48 − 32) | 623,5 px (1 024 − 283,5 − 27 − 54 − 36) |
| Rail collé au bord : `gap-6`, `px-4` du `main` | 16 rem | 712 px | 673 px |

Le texte de décision qui en découle est `decision-D-447-rail-lateral.md`, à côté de ce document : numéro réservé le 2026-11-05 (`refs/tags/reserve/D-447`), texte à accepter mot pour mot avant tout code.

| Question | Réponse | Effet |
|---|---|---|
| Q52 Engager L5 | **Engager maintenant** : le merge éteint suffit, comme Q44 pour L4 ; l'assistant recommandait d'attendre que le menu et la barre soient posés et constatés, aucun écran n'ayant montré un manque au bureau | L5 sortira derrière son propre drapeau éteint, à une place de la file C après celle de la barre (D-447 §8) |
| Q53 Doctrine | **Troisième précision d'A6-R1 par la D-xxx**, de même forme que [[D-442]] §7 et [[D-444]] §7 ; la réponse à Q4 (« ne pas amender pour C ») est tenue | D-447 §7 : une liste des espaces visible en permanence, de même poids, sans bouton plein ni compteur, où seul `aria-current` distingue la page, ne met rien en avant et ne fait avancer aucune étape |
| Q54 Face au bouton « Menu » | **Le rail remplace « Menu » dès 1 024 px** ; sous 1 024 px, rien ne change (bouton « Menu », barre sous 768 px) | D-447 §1 ; amende [[D-442]] §1 sur la largeur ; [[D-444]] §2 (un seul déclencheur du panneau) n'est pas amendée : là où paraît le rail, il n'y a pas de panneau |
| Q55 Contenu | **La liste « Mon espace »** : même source et même ordre que le menu et le hub ([[D-423]] §2, [[D-442]] §2), même activation ([[D-423]] §4, [[D-442]] §3) | D-447 §2 et §3 ; `<nav aria-label="Mon espace">`, nom déjà accepté ; aucun texte neuf |
| Q56 Repli | **Toujours déplié, sans clé** | D-447 §5 ; `stockageAppareil.ts` inchangé ; une seule largeur de rail à tester |
| Q57 Jetons | **Deux jetons patient neufs** : `nav-rail` (15,75 rem) et `nav-active` (`inset 3px 0 0 var(--color-primary)`), dans le thème patient de `globals.css` ; l'assistant recommandait les jetons existants seuls (`w-64`, filet du menu) | D-447 §5 ; le menu garde son filet (`MenuMonEspace.tsx:165`) : [[D-442]] n'est pas amendée sur ce point |
| Q58 Colonne | **Mise en page du shell praticien** : `gap-6`, `px-6` de chaque côté, `px-4` du `main` ; colonne de 668 px à 100 % et de 623,5 px à 112,5 % (calcul) ; l'assistant recommandait un rail collé au bord (712 et 673 px) | D-447 §6 ; le constat mesure la largeur réelle à 1 024 px, à 100 % et à 112,5 % |
| Q59 Pages | **Pas sur le questionnaire en cours** (`/questionnaires/[idAssignation]`) : règle de chemin, comme [[D-444]] §1 (Q51) ; le bouton « Menu » y reste à toute largeur | D-447 §1 ; une seule navigation « Mon espace » par page, un seul déclencheur |
| Q60 Hub | **Garder les deux** : « Autres espaces » reste sur le hub à toute largeur ([[D-442]] §2) ; le doublon visible dès 1 024 px est assumé | D-447 §2 ; aucune décision antérieure amendée sur ce point ; l'E2E du lien « visible sans rien déplier » (portail-dossier-deux-voix.spec.ts:71-76) reste intact ; le constat montre le hub à 1 024 px |
