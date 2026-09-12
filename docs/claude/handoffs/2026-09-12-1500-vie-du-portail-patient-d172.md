# Handoff — 2026-09-12 — La vie du portail patient (D-172)

## Branche et état Git

Cinq PR de code fusionnées : **#1042** (dérivation + route de lecture),
**#1045** (repère de fraîcheur — **migration seule**), **#1046** (route du
repère), **#1048** (l'écran), **#1049** (les deux portes).

Plus tôt le même jour, hors campagne : le chantier « lecture des cartes du Fil
praticien » (#1030, #1032, #1034, #1036, #1038, #1040 — `D-171`).

**Une PR ouverte** : la doctrine (`D-172`, fragment de changelog, SESSION_LOG,
ce handoff).

`main` **local** reste détenu par le worktree `courrier-corps-null` : `gh pr
merge --delete-branch` affiche une erreur de checkout après chaque fusion —
**cosmétique**, le merge passe et la branche distante est supprimée.

## Migration

`20260912140000_portail_journal_repere_v1`, partie **seule** ([[D-087]]),
`release-db` approuvée (run 34692111803) et **CONSTATÉE PAR CONTENEUR**
(one-off-5630) : deux colonnes exactes (`id_patient`, `vu_jusqua`), PK
`id_patient`, FK `confdeltype = 'r'`, RLS active, **0 policy, 0 ligne**.

La migration a emporté le schéma, l'effacement de dossier et la déclaration au
registre des traitements — la garde structurelle de `effacement.test.ts` a
attrapé l'oubli avant le commit.

## Le drapeau est ÉTEINT, et c'est le geste qui reste

`WN_PORTAIL_JOURNAL` — **absent en production au 2026-09-12**. Tant qu'il l'est,
la route rend 503 et l'écran rend « Depuis votre dernière visite », le bloc
d'avant. **Rien n'a changé pour aucun patient.**

Deux choses vont ensemble le jour de l'allumage :

1. poser `WN_PORTAIL_JOURNAL=true` sur l'app Scalingo ;
2. **retirer `portail-visite.ts`** et son bloc de repli — il n'a plus de raison
   d'être une fois le journal servi.

## Ce que j'ai tranché sans demander

- **Le repère avance quand le journal a été montré déplié**, pas à chaque
  ouverture du portail. Le déplacer à chaque chargement le viderait de son sens
  au premier rafraîchissement.
- **Le POST ignore son corps** (`D-164`) : un horodatage du client posé loin dans
  le futur ferait taire ce journal pour toujours, sans que rien ne le dise.
- **Le journal ne lève aucun drapeau de surface** — l'invariant du chantier.
- **L'ancien bloc reste le filet du nouveau** jusqu'à la mise en service.
- **Les deux portes ne disent pas s'il y a quelque chose derrière** : le savoir
  demanderait de servir le contenu.

## Ce que la vérification a corrigé dans le cadrage

**Le LOT-04 était sans objet.** Le cadrage annonçait l'agenda alimentaire sans
état ni rappel ; `lib/agenda-alimentaire/rappelPortail.ts` existe, jumeau déclaré
du sommeil avec ses bancs, et `hubQuestionnaires.ts` le fait remonter jusqu'à
l'étape du moment. **Une absence se constate, elle ne se suppose pas** — même
leçon que « sans drapeau propre = en service au déploiement », en sens inverse.

## Preuves, et leur compte exact

**55 mutations jouées, 49 tuées** (LOT-01 20/19, LOT-02 10/10, LOT-03 17/12,
LOT-05 8/8). Les six survivantes sont instructives :

- **Une** a désigné un banc manquant (une clé de journal sans son espèce) ;
  ajouté, puis deux rejeux tués.
- **Quatre** ont désigné du **code mort**, retiré plutôt que couvert : un effet
  de montage qui doublait `onToggle` — la spécification HTML fait naître un
  `toggle` chaque fois que `open` est posé, y compris par React au premier
  rendu — et une garde `if (open)` dont le premier `toggle` est nécessairement
  une ouverture.
- **Une** était équivalente : deux gardes défensives se couvrant l'une l'autre.

**Deux messages de commit ont arrondi ces comptes** (« 20 tuées » pour 19, « 15 »
pour 12). Corrigé dans `D-172` plutôt que réécrit dans l'historique. Un compte de
mutations arrondi devient l'argument d'autorité que la méthode existe pour
remplacer.

Sept promesses tenues par contrat SQL négatif, dont la centrale : **un second
repère sur le même dossier est refusé (23505)**, et l'avancée écrase sans laisser
d'historique.

## Pièges rencontrés

- **T1 arrête sur des gardes qu'on n'anticipe pas** : la matrice de consommation
  dérive au moindre import neuf (`node scripts/wn-matrice-consommation.mjs
  --markdown`), et le cadre de campagne exige un **fichier de lot** dès qu'un
  `lot_courant` est nommé.
- **Une autre session a fusionné pendant le chantier** (#1039), laissant son
  entrée de journal APRÈS la mienne dans `SESSION_LOG.md`. Une session qui suit
  la consigne « lire la dernière entrée » lit donc la sienne.
- **La notification de tâche de fond annonce `exit code 0`** pour le `echo` final
  d'une commande, pas pour le script. Lire le code dans le TEXTE du fichier.

## Ce qui reste ouvert

- **La mise en service** (ci-dessus) — le seul geste gaté de ce chantier.
- **La clôture alimentaire** n'existe pas : l'état `a_transmettre` de l'agenda
  alimentaire ne propose donc aucun geste, et le code l'explique (`D-015`). Hors
  campagne.
- **L'arbitrage du second `T0`**, hérité de la session voisine.
- Inchangé : la lettre DPA à Anthropic et les trois trous du §7 RGPD.
