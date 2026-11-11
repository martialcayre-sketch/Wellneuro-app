# Refonte Lien / Empreinte — étape 2 : registre des textes

> **Accepté le 2026-11-11** : tous les textes mot pour mot sauf T-34, refusé
> (« ← Mon espace » et sa destination actuelle maintenus). Inscrits par
> DOC-0 dans [[D-488]], qui fait foi ; Q-E2-5 (a) y est aussi (§7).

Chaque texte neuf ou changé par la refonte passe ici avant tout lot (réponse
6 (a) du 2026-11-11). Aucun n'est accepté : chaque ligne attend l'acceptation
**mot pour mot** du responsable. Un texte accepté est inscrit sous une
décision par DOC-0 (`socle-commun.md`) avant le lot qui l'applique. Un texte
refusé laisse l'existant en place ; le lot qui le portait livre sans lui.

Numérotation par famille, avec des trous voulus : praticien T-01 à T-16
(T-16, « Aller au contenu », ajouté par DOC-1 dans [[D-488]]),
rail patient T-21 à T-23, textes patient T-30 à T-34. Aucun identifiant
absent n'est un texte manquant.

Colonnes : **Proposé** (texte exact, sans guillemets de l'interface) ;
**Où** (couche, composant) ; **Sens** (ce que le texte doit dire, pour juger
une autre formulation) ; **Existant** (texte affiché au commit `ac3f0ead`,
fichier:ligne sous `web/src/`) ; **Lot** (plan qui l'applique).

Sources : inventaire des libellés du 2026-11-11 (lecture du dépôt) ; cadrage
v3 §4 (l.80-97), §10 (l.279) ; catalogue v2 (fiches citées).

Rien ici ne touche un texte de pause, de conduite à tenir, de consentement ni
de droits (cadrage v3 l.91) : les lignes qui en approchent sont marquées
« non proposé ».

## 1. Praticien

### 1.1 Groupes du menu (Q-E2-1, option a)

| Id | Proposé | Où | Sens | Existant | Lot |
|---|---|---|---|---|---|
| T-01 | Travail | intertitre du rail, du tiroir et de la feuille « Plus » | le travail du jour et des dossiers | « La Spirale » `components/ui/SidebarRail.tsx:67` | PRA-1 |
| T-02 | Bibliothèque | idem | inchangé | `SidebarRail.tsx:104` | PRA-1 |
| T-03 | Ateliers | idem | outils de fabrication du savoir, hors consultation | aucun (entrées sous Bibliothèque) | PRA-1 |
| T-04 | Cabinet | idem | comptes et réglages du cabinet | « Réglages » `SidebarRail.tsx:115` | PRA-1 |

La feuille « Plus » n'a aujourd'hui aucun intertitre
(`components/ui/MobileBottomNav.tsx:34`) ; elle prend T-01 à T-04.

### 1.2 Libellés de destination

| Id | Proposé | Où | Sens | Existant | Lot |
|---|---|---|---|---|---|
| T-05 | Le Fil du jour (rail, feuille) ; Le Fil (barre basse, inchangé) | `/dashboard` | une seule forme longue ; la forme courte reste celle de la barre, faute de place | rail `SidebarRail.tsx:69` ; barre « Le Fil » `MobileBottomNav.tsx:10` ; vues rapides « Fil du jour » `components/ui/VuesRapides.tsx:13` (retirées, AM-3) | PRA-1 |
| T-06 | Fiche-trajectoire (rail, feuille) ; Fiches (barre basse, inchangé) | `/dashboard/trajectoires` et fiches patient | inchangé ; la barre garde sa forme courte | `SidebarRail.tsx:81` ; `MobileBottomNav.tsx:16` | — |
| T-07 | Consultation copilote | toutes couches | une seule forme | rail `SidebarRail.tsx:88` ; vues rapides « Consultation » `VuesRapides.tsx:19` (retirées, AM-3) | PRA-1 |

Aucun autre libellé de destination praticien ne change. « Synthèses »
(barre, `MobileBottomNav.tsx:20`) et « Synthèse IA & Booklet » (titre,
`app/dashboard/synthese/page.tsx:12`) diffèrent : relevé, non proposé.

### 1.3 Commandes des panneaux

| Id | Proposé | Où | Sens | Existant | Lot |
|---|---|---|---|---|---|
| T-10 | Navigation principale | nom accessible du `<nav>` du rail | nommer le rail pour les lecteurs d'écran | aucun (`SidebarRail.tsx:197`) ; la barre basse porte déjà ce nom (`MobileBottomNav.tsx:71`), affichée à d'autres largeurs | PRA-1 |
| T-11 | Réduire la navigation / Étendre la navigation | bouton du rail | inchangé | `components/NavBar.tsx:110` | — |
| T-12 | Masquer la navigation | pied du rail | escamoter le rail | aucun | PRA-1 |
| T-13 | Afficher la navigation | en-tête, rail escamoté | rouvrir le rail déplié | aucun ; cadrage v2 §5.2 l.166 proposait « Ouvrir le menu » | PRA-1 |
| T-14 | Masquer les phases / Afficher les phases | fiche, rail des sept phases | le cadrage dit « étapes » (l.279) ; la fiche les nomme « phases » | aucun | PRA-3 |
| T-15 | Masquer le contexte / Afficher le contexte | fiche, panneau droit | cadrage v3 l.279 | aucun | PRA-3 |

## 2. Patient

### 2.1 Commandes du rail (AM-1, §4 bis)

| Id | Proposé | Où | Sens | Existant | Lot |
|---|---|---|---|---|---|
| T-21 | Réduire le menu | pied du rail « Mon espace » | passer au rail réduit, libellés gardés | aucun | PAT-1 |
| T-22 | Agrandir le menu | idem, rail réduit | revenir au rail déplié | aucun | PAT-1 |
| T-23 | Masquer le menu | idem | escamoter le rail ; le bouton « Menu » reparaît | aucun | PAT-1 |
| — | Menu | en-tête, rail escamoté | inchangé : rouvre le rail déplié | `components/patient/menu/textesMenu.ts:5` | PAT-1 |

« Menu » plutôt que « navigation » : c'est déjà le mot du bouton côté
patient ([[D-442]]).

### 2.2 Point de suivi (cadrage v3 l.95)

Le cadrage pose « Mon point de suivi » pour le formulaire et réserve
« rendez-vous » à une rencontre. Les lignes T-30 s'acceptent ensemble ou pas
du tout : le cadrage exige la cohérence entre entrée, titre, bouton et
confirmation.

| Id | Proposé | Où | Existant |
|---|---|---|---|
| T-30a | Ouvrir mon point de suivi | entrée de la table (menu, rail, hub) | « Ouvrir mes rendez-vous de suivi » `components/patient/autres-espaces/entreesAutresEspaces.ts:71` |
| T-30b | Mon point de suivi | titre de page | « Rendez-vous de suivi » `components/patient-companion/ProtocolCheckinForm.tsx:129, :140, :155` |
| T-30c | Mon point de suivi — semaine N | titre, point ouvert | « Rendez-vous de suivi — Semaine N » `ProtocolCheckinForm.tsx:170` |
| T-30d | Mes points de suivi | intertitre de l'historique | « Vos rendez-vous de suivi » `components/patient-companion/ProtocolCheckinTrend.tsx:39` |
| T-30e | Mon point de suivi | lien de l'accompagnement | « Mes rendez-vous de suivi » / « Mon rendez-vous de suivi » `components/patient-companion/PatientCompanionHome.tsx:303` |
| T-30f | Le noter dans mon point de suivi | lien de Jour difficile | `PatientCompanionHome.tsx:382` |
| T-30g | Répondre à mon point de suivi | action du Fil patient | `lib/portail/filDuJour.ts:174` |
| T-30h | Votre suivi est clôturé : vous ne pouvez plus répondre à ce point de suivi. | message, dossier clos | `lib/patient/cycleDeVie.ts:108` |
| T-30i | Aucun point de suivi ouvert actuellement. / Ce point de suivi n’est pas ouvert. | erreurs du serveur affichées | `app/api/portail/protocole/checkin/route.ts:99, :108` |

« Suivi » (barre basse, `components/patient/barre-basse/textesBarreBasse.ts:9`)
ne change pas. T-30h et T-30i touchent `lib/` et une route : texte seul, sans
changer la règle ni le statut. Les tests qui citent l'ancien texte suivent.

### 2.3 Entrée du parcours (cadrage v3 l.97, fiche U08)

| Id | Proposé | Où | Sens | Existant | Lot |
|---|---|---|---|---|---|
| T-31a | Parler de votre situation | titre de l'étape d'entrée | nommer l'étape sans le mot « anamnèse » ; les questions ne changent pas | « Anamnèse » `app/portail/[token]/page.tsx:511` | PAT-2 |
| T-31b | Continuer vers votre situation | bouton qui y mène | idem | « Continuer vers l’anamnèse » `page.tsx:312` | PAT-2 |

Non proposé : le gabarit d'e-mail au patient
(`lib/correspondance/registreGabarits.ts:113`) et le texte de
`lib/portail/stockageAppareil.ts:81` gardent « anamnèse » ; un gabarit de
correspondance a son propre circuit de validation. Côté praticien,
« anamnèse » reste partout (cadrage v3 l.97).

### 2.4 Écarts relevés dans l'existant

| Id | Proposé | Où | Sens | Existant | Lot |
|---|---|---|---|---|---|
| T-32 | Ouvrir mon carnet alimentaire | entrée de la table | casse : « mon » en minuscule, comme les autres entrées | « Ouvrir Mon carnet alimentaire » `entreesAutresEspaces.ts:72` | PAT-1 |
| T-33 | Ce que mon praticien a compris de moi | titre de page | première personne, comme le lien qui y mène (cadrage v3 l.82) | « Ce que votre praticien a compris de vous » `components/patient-companion/ComprehensionView.tsx:117, :126, :143` | PAT-5 |
| T-34 | ← Mon parcours | retour de la page Conditions, vers `/questionnaires` | même retour que toutes les autres pages | « ← Mon espace », vers `/portail/[token]` `app/portail/[token]/conditions/page.tsx:88` | PAT-5 |

Le « Réessayer » affiché sous « Suivi non reconnu. »
(`lib/protocol/portailProtocol.ts:32`, rendu par `ProtocolCheckinForm.tsx`)
n'est pas un texte mais un comportement : il passe en question (Q-E2-5,
`README.md` §4).

T-33 : si une décision fixe ce titre, elle est à amender (non trouvée à la
lecture du registre ; à vérifier à l'acceptation).

Non proposés, relevés :

- « Mon parcours » (menu, rail, hub) et « Accueil » (barre basse) : le
  cadrage v3 l.309 garde « Accueil » à la barre.
- Titre de Conditions identique à celui d'Informations
  (`conditions/page.tsx:83`, `informations/page.tsx:103`) : page de droits,
  hors refonte (cadrage v3 l.91).
- « Mes informations et mes droits », « Confidentialité et droits »,
  « Consulter les informations détaillées » : quatre formes pour une page ;
  textes de droits, hors refonte.
- « Votre accompagnement » (encart et page imprimable) sous le titre
  « Mon accompagnement » du hub ; « Mon dossier, à deux voix » sous l'entrée
  « Ouvrir mon dossier à deux voix » ; « votre médecin » dans les titres et
  « mon médecin » dans les actions du Fil. À reprendre dans un registre de
  textes patient séparé si le responsable le demande.
- Hub : `aria-label` « Autres espaces » sans titre visible
  (`components/patient/autres-espaces/NavAutresEspaces.tsx:40`) ; dès
  1 024 px avec rail, le bloc n'est plus rendu (AM-2).
- Deux `<nav>` « Accès rapides » (barre basse et `VuesRapidesPortail`) :
  le second disparaît avec AM-2.
- Libellés morts des dix composants `Lien*` montés en `sondeSeule`
  (`SondesAutresEspaces.tsx:34-43`) : jamais affichés ; ils ne changent pas.

## 3. Récapitulatif

| Plan | Textes à accepter avant le lot |
|---|---|
| Praticien | T-01 à T-05, T-07, T-10, T-12, T-13 (PRA-1) ; T-14, T-15 (PRA-3) ; T-16 (PRA-2, inscrit par DOC-1) |
| Patient | T-21 à T-23, T-32 (PAT-1) ; T-31 (PAT-2) ; T-30 (PAT-3) ; T-33, T-34 (PAT-5) |
