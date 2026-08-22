# Alliance 6.0-A LOT-06 — le dossier à deux voix au portail

Date : 2026-08-22 · Branche : `alliance-6a/lot-06` · Aucune migration.
**Dernier lot de la campagne.**

## Ce qui est livré

Un écran portail qui assemble les trois objets de la campagne, et le geste de
**ratification** de l'objectif par le patient : append-only, jamais retiré, un
changement d'avis est une ligne de plus. Plus la correction d'une fuite de log
nommée par la revue du LOT-04, et l'outillage E2E que les trois surfaces
patient n'avaient pas.

## Le cadrage a corrigé trois affirmations du fichier de lot

1. **« Assembler les objets (lecture) » supposait trois lectures patient ; il en
   existait UNE.** L'objectif négocié n'était servi qu'au cockpit praticien, et
   le GET d'`api/portail/ce-qui-compte` n'est qu'un interrupteur — le patient ne
   pouvait pas relire ce qu'il avait déposé. Le lot ouvre, il n'assemble pas.
2. **« Visibilité praticien de l'état de ratification au cockpit » était DÉJÀ
   LIVRÉE** au LOT-02 (`ObjectifNegociePanel`). Il n'en restait qu'un libellé.
3. **« Le chemin est déjà inscrit par le LOT-04 — vérifier, pas dupliquer » est
   FAUX.** Servir la reformulation du praticien au patient est un chemin sortant
   NEUF : une garde vit dans un appelant, pas dans un objet.

## Les arbitrages, et pourquoi

**Un drapeau NEUF, pas la composition des deux existants.** `WN_DOSSIER_DEUX_VOIX`
garde la route (503), l'écran (404) et la ratification (503). Réutiliser
`WN_CE_QUI_COMPTE || WN_COMPREHENSION` aurait ouvert la seule écriture patient
irréversible de la campagne du même geste qui ouvre une lecture — et l'objectif
négocié, lui, n'a aucun drapeau du tout. Chaque bloc reste soumis au sien ; un
bloc fermé est **absent**, pas vide (une phrase d'attente parlerait au patient
d'un déploiement, un bloc vide lui ferait lire un silence de son praticien).

**La garde de ratification s'est DÉPLACÉE, elle ne s'est pas ouverte.** Le
LOT-02 interdisait toute écriture, `create` compris. Ajouter une exception
`EXCEPTION_*` de plus aurait fait dire à l'interdit « sauf là où quelqu'un a
écrit » ; l'épinglage sur l'écrivain unique dit l'inverse, et fait rougir tout
second. Vu rouge par mutation, dans ses deux cas.

**Deux têtes d'objectif ⇒ aucune ratification proposée.** 409 même quand le
patient vise la plus récente : ratifier « la plus récente » trancherait en
silence une discordance que `DC-30` demande de signaler.

**`geste_le` reste NULLE** — c'est une colonne de DÉCLARATION, et le patient ne
déclare pas de date, il clique. La remplir depuis l'horloge du serveur en ferait
une déclaration qu'il n'a pas faite, et elle ne pourrait jamais différer de
`cree_le` (cette route est le seul écrivain). Décidé APRÈS la revue, qui a posé
la bonne question : quel usage a `gesteLe` que `creeLe` ne couvre pas ?

**Le lien vit dans la nav du hub**, pas dans `PatientCompanionHome` — celui-ci
est replié dans un `<details>` fermé ET placé après un retour anticipé qui exige
un protocole diffusé. Les LOT-03 et LOT-04 y ont posé les leurs : leurs écrans
sont livrés et difficilement trouvables.

## Preuves de mutation — TROIS, toutes vues rouges puis rebranchées vertes

| Mutation | Banc | Verdict |
|---|---|---|
| `if (textesPraticienServis.some(termeAnxiogene))` → `if (false)` | `api/portail/dossier/route.test.ts` — garde de registre | **rouge** (3 échecs) |
| `ratificationObjectif.create` → `.upsert` dans la route portail | `objectifNegocie.guard.test.ts` — écrivain unique | **rouge** (2 échecs) |
| `{ceQuiCompte.length}` ajouté à l'écran d'assemblage | `ceQuiCompteAntiAgregat.guard.test.ts` — décompte affiché | **rouge** (1 échec) |

La troisième mérite son motif : le motif d'origine était lié au NOM `entrees` et
laissait donc passer `{ceQuiCompte.length}`. La garde tenait par le nom que
l'auteur avait choisi, c'est-à-dire par rien. Généralisé, avec **une exception
nommée** — `{texte.length}`, le compteur de caractères d'un champ de saisie.

## Ce que la revue a trouvé, et que je n'avais pas vu

`wn-reviewer` a rendu **NO-GO**. Deux bloquants.

**B1 — le premier cas E2E échouait de façon déterministe**, et je l'avais trouvé
seul par T2 avant de lire la revue : le hub rend la séquence « Avant de
commencer » avant tout le reste ; tant qu'elle n'est pas franchie, la nav
n'existe pas dans le DOM. Le banc mesurait l'absence du gate, pas celle du lien.
Refermé en provisionnant l'accusé de lecture en base — `portail-parcours`
couvre déjà cette séquence, et la recopier ferait rougir ce spec le jour où elle
change, pour une raison étrangère à son sujet.

**B2 — l'écran comblait une date que le patient n'avait jamais déclarée.**
`saisiLe ?? creeLe` sur sa propre parole, et « Écrit le » sur une date de
publication. La route déclare pourtant, six lignes plus haut, « jamais comblée »,
et le LOT-03 l'avait écrit noir sur blanc : « ici **ni à l'affichage** ». Le
cockpit praticien respectait la règle ; l'écran patient faisait l'inverse. Deux
absences rendues comme des réponses (`DC-24`), sur la surface la plus exposée.
Chaque date est désormais dite sous son propre libellé, ou tue — avec ses bancs.

**Majeurs refermés** : `priorite`, libellé libre du praticien servi au patient,
était hors de la garde de registre alors que la carte promettait le contraire
(M1) ; les désaccords étaient lus, transportés au navigateur et **jamais
affichés** — un patient ayant contesté au LOT-04 ne le voyait nulle part, et
l'invitation « Répondre à ce texte » lui parlait comme s'il n'avait rien dit
(M2) ; le nouveau libellé du cockpit affirmait « le patient ne s'est pas encore
prononcé » alors que le drapeau éteint l'empêche de se prononcer — les deux
formulations évidentes étaient fausses, chacune dans une position du drapeau, et
la troisième ne dit que ce qu'on sait (M3) ; la garde anti-agrégat ne couvrait
pas l'écran (M4).

## Ce qui reste ouvert

- **`WN_DOSSIER_DEUX_VOIX` n'est pas posé en production** — geste du responsable,
  avec le piège `D-071` : poser la variable ne suffit pas, il faut un build qui
  la porte. Trois drapeaux de la campagne sont désormais en attente.
- **Le constat du gate (`D-092`) n'est PAS FAIT.** Le CLI Scalingo ne
  s'authentifie pas par l'environnement : la lecture de production exige un
  `scalingo login` du responsable. Les deux autres points du critère sont
  constatables sans elle. La clôture de campagne doit porter ce reste comme tel.
- **Aucune cadence sur la ratification** : `create` sans plafond de fréquence,
  sur une table append-only que rien ne purge. Même régime qu'au LOT-03, mais
  c'est la première écriture *irréversible* de la campagne.
- **Rien ne prévient le praticien qu'une ratification est arrivée** — le modèle
  « pull » assumé côté patient s'applique ici au praticien. Surface non cadrée,
  pas un oubli.
- **`messageJournalisable` est désormais dupliqué dans trois routes.** Ne pas
  factoriser dans ce lot ; c'est nommé.
- **E2E** : le drapeau éteint n'est pas couvert (les drapeaux sont armés au
  build, la position de production n'est donc pas jouable dans le même run).

## Piège à ne pas rejouer

`origin/main` a avancé **deux fois** pendant le lot, et la première a pris
`D-091` — le numéro que ce lot visait. Un numéro de décision se réserve dans
`main`, jamais dans une branche : le vérifier au moment d'écrire, pas au moment
de planifier. Ce lot porte donc `D-092`.
