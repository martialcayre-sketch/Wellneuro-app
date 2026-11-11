# Refonte Lien / Empreinte — étape 2 : cadrage révisé

Delta du cadrage `Cadrage_interfaces_Wellneuro_Lien_Empreinte_v3` (580
lignes, non versé au dépôt), section par section. Une section absente de ce
fichier est inchangée. Chaque révision cite la réponse écrite du 2026-11-11
qui la fonde, ou l'amendement proposé (`amendements.md`) qu'elle suppose.
Tant qu'un amendement n'est pas accepté, la révision qui en dépend ne
s'applique pas.

## §1 — Objet et statut

Ajout : le cadrage, ce delta, le catalogue révisé et le registre des textes
forment ensemble la référence de l'étape 3 (prototypes) et des deux plans de
réalisation (`plan-praticien.md`, `plan-patient.md`). En cas d'écart, une
décision `D-xxx` du dépôt prime ; viennent ensuite ce delta, puis le cadrage
v3.

## §3 — Deux rôles, une identité commune

| Ligne | v3 | Révisé | Fondement |
|---|---|---|---|
| l.54 | rail nuit pétrole « réductible et escamotable » | inchangé ; la mémoire praticien reste sur l'appareil (`wn-rail-expanded`) | AM-5 |
| l.55 | rail patient « réductible ou escamotable selon le contexte » | trois états, dès 1 024 px seulement ; mémoire de page, rien écrit sur l'appareil | réponses 2 (a) et 3 (a), AM-1 |
| l.76 | « La palette chaude et Empreinte sont les choix visuels validés » | validés en conversation le 2026-11-10 ; à inscrire au registre des frontières (A5-R3) avant le lot de fondation | AM-6 |

## §4 — Fondamentaux de contenu

| Ligne | v3 | Révisé | Fondement |
|---|---|---|---|
| l.82, l.95 | « Mon point de suivi » | proposé au registre (T-30, neuf lignes) ; aucun écran ne change avant acceptation | réponse 6 (a) |
| l.97 | « Parler de votre situation » à l'entrée | proposé au registre (T-31) | réponse 6 (a) |
| l.84 | « Les libellés existants ne sont pas renommés au hasard d'une maquette » | renforcé : tout texte neuf ou changé passe au registre | réponse 6 (a) |

## §10 — Navigation générale et menus latéraux

### Trois états (l.271-283)

| Point | v3 | Révisé | Fondement |
|---|---|---|---|
| État réduit | « Rail d'icônes » | praticien : rail d'icônes ; **patient : rail plus étroit qui garde ses libellés** (`rail-patient-compact`, 13 rem) | AM-1, [[D-447]] §5 |
| Mémoire (l.281) | « peut être mémorisé sur l'appareil et par rôle » | praticien : sur l'appareil ; **patient : mémoire de page seulement**, Q56 tenue | réponse 2 (a) |
| Réouverture (l.277) | « bouton de réouverture visible hors du menu » | praticien : « Afficher la navigation » dans l'en-tête (T-13) ; patient : le bouton « Menu » existant reparaît | AM-1, AM-5 |
| Masquage (l.283) | retiré du clavier et de l'arbre d'accessibilité, focus rendu | inchangé, et opposable aux deux rôles | — |

### Navigation praticien (l.285-295)

| Ligne | v3 | Révisé | Fondement |
|---|---|---|---|
| l.287 | familles de travail | quatre groupes proposés : Travail, Bibliothèque, Ateliers, Cabinet (`catalogue-revise.md` §2) | Q-E2-1 |
| l.289 | « Les vues rapides sont des raccourcis vers les mêmes destinations » | **retirées à toute largeur** ; l'en-tête porte le contexte du dossier et ses actions utiles | réponse 4 (b), AM-3 |
| l.289 | « Une fiche patient ouverte reste identifiée comme appartenant aux fiches-trajectoires, y compris sur téléphone » | livré (#1973, correctif C4) ; devient une propriété de la déclaration unique | AM-4 |
| — | (absent) | une déclaration des destinations ; rail, tiroir, barre et feuille en dérivent ; bancs par couche gardés | réponse 5 (a), AM-4 |
| l.291-293 | rail des phases et contexte repliables | inchangé ; textes T-14, T-15 ; forme dessinée à l'étape 3 | — |

### Navigation patient (l.297-309)

| Ligne | v3 | Révisé | Fondement |
|---|---|---|---|
| l.305 | « À partir de 1 024 px : `RailMonEspace` … ; accès rapides `VuesRapidesPortail` » | `RailMonEspace` seul ; **pas de `VuesRapidesPortail`**, pas d'onglets dans l'en-tête | réponse 3 (a), AM-2 |
| l.307 | « En mode rail escamoté ou réduit, une commande permet de retrouver la liste complète » | escamoté : le bouton « Menu » reparaît et rouvre le rail déplié ; réduit : la liste complète est déjà là, libellés compris | AM-1 |
| — | (absent) | hub dès 1 024 px avec rail : « Autres espaces » n'est pas rendu ; la frise reste | AM-2 |

### Gardes (l.311-318)

Inchangées. Précision : la ligne l.318 (« `NavAutresEspaces` garde son rôle »)
vaut sous 1 024 px, ou quand la garde du rail refuse (AM-2).

## §12 — Écrans cibles

| Section | Révisé | Fondement |
|---|---|---|
| §12.4 Mon accompagnement | lectures indépendantes, erreur avec reprise, groupe ouvert sur échec : **livrés** (#1973, #1979) | lot de fiabilité |
| §12.6 Mon point de suivi | titre au registre (T-30) ; erreur de chargement distincte et session expirée renvoyée à l'entrée : **livrés** (#1973, #1978) ; « Réessayer » sur une lecture refusée (404) : Q-E2-5 | réponse 7 (b) |

## §15 — Accessibilité

Ajout : les défauts relevés à l'étape 1 et les icônes Lucide de l'artefact
sont corrigés dans l'artefact « Wellneuro Lien — Empreinte », version 4
(réponse 9 (b)). Côté code, le rail praticien reçoit un nom accessible
(T-10).

## §18 — Mise en œuvre

Les quatre lots du cadrage deviennent deux plans menés en parallèle, sur des
fichiers disjoints, après une fondation commune :

| Cadrage v3 | Révisé |
|---|---|
| Lot 1 — Fondations et assets | `COM-0`, seul lot commun : jetons, polices, marque, icônes ; préalable des deux plans |
| Lot 2 — Shell et navigation | `PRA-1` et `PAT-1`, en parallèle |
| Lot 3 — Écrans et interactions | `PRA-2` à `PRA-5`, `PAT-2` à `PAT-6` |
| Lot 4 — Vérification | critère de réception de chaque lot, plus un lot final par plan (`PRA-6`, `PAT-7`) |

Les critères de réception de la v3 (l.522, l.528, l.534, l.540-553) restent
opposables ; chaque plan les répartit entre ses lots.

## §20 — Récapitulatif (complément)

- Praticien : rail en trois états mémorisés sur l'appareil ; vues rapides
  retirées ; quatre groupes (à trancher) ; une déclaration des destinations.
- Patient : rail en trois états, en mémoire de page, dès 1 024 px seulement ;
  le rail réduit garde ses libellés ; plus d'onglets ni de vues rapides dès
  1 024 px.
- Textes : tout texte neuf ou changé passe au registre, mot pour mot.
