---
id: "LOT-04"
titre: "Portail — « le dire autrement » : la contre-proposition du patient"
statut: "terminé"
dépend_de: "LOT-01"
---

# LOT-04 — Portail : « le dire autrement »

## But

Ajouter au portail le troisième verbe patient : à côté de « c'est bien ça »
et « ce n'est pas exactement ça », le patient peut **écrire sa propre
version** de l'objectif — un événement d'amendement, dans ses mots,
append-only, qui entre dans la chaîne de versions.

**Classe P0 (portail/patient) : revue `wn-reviewer` + passe Codex avant PR.**

## Résultat observable

- L'arbitrage de forme est rendu (`D-094` : **table d'événement propre**,
  créée au LOT-01) ; une `D-xxx` supplémentaire ne se réserve ici que si un
  point de forme dépasse `D-094`.
- Au portail, sur un objectif proposé : le patient saisit un texte libre ;
  l'événement référence la **version exacte** de l'objectif ; rien ne
  s'efface, se compte ou se note.
- Au cockpit, l'amendement s'affiche dans la trajectoire ; le praticien peut
  l'intégrer par une nouvelle version (`supersedesObjectifId`) dont
  l'énoncé peut **citer l'amendement** (source : parole patient portail,
  datée) — la boucle de négociation se referme.
- L'état dérivé distingue : proposé / ratifié / contesté / **dit autrement** ;
  libellés non-jugeants (`DC-24` — jamais « refusé », jamais « en retard »).

## Périmètre

- `web/src/app/api/portail/dossier/route.ts` (le POST s'élargit au nouveau
  geste) + tests
- `web/src/components/patient-companion/DossierDeuxVoixView.tsx`
- `web/src/lib/praticien/objectifNegocie.ts` (`etatRatification` apprend le
  nouvel état ; sources admissibles de citation côté reprise)
- `web/src/components/patient-cockpit/ObjectifNegociePanel.tsx` (affichage
  de l'amendement dans la trajectoire)

## Hors périmètre

- Toute notification au praticien (le portail reste en pull — surface non
  cadrée, comme au LOT-06 de 6.0-A).
- Toute analyse, comptage ou agrégation du texte patient.
- Les jalons (LOT-05).

## Fichiers probables

Ceux du périmètre ; garde structurelle existante : « la ratification ne
s'écrit que depuis le portail » — l'amendement suit le même régime
d'écrivain unique.

## Interdits

- Le texte patient n'est jamais tronqué en silence (refus par motif, bornes
  affichées — patron 6.0-A).
- Jamais journaliser le texte (chemin sortant journalisant, [[D-090]] ;
  helper `messageJournalisable`).
- Drapeau `WN_DOSSIER_DEUX_VOIX` ou `WN_OBJECTIF_PROPOSE` selon l'arbitrage
  LOT-00 — mais le geste est gardé, et le stock ne déferle pas à l'allumage.
- Deux têtes d'objectif ⇒ même régime que la ratification (409, jamais de
  départage silencieux — `DC-30`).

## Étapes

- [x] Arbitrage de forme constaté (`D-094` §2) ; **aucune migration** — la
      table `amendements_objectif` est livrée et constatée depuis le LOT-01.
- [x] Étendre le POST portail (drapeau, puis auth, puis validation ; événement
      append-only, version exacte, geste NOMMÉ dans le corps).
- [x] UI portail : saisie, borne affichée, confirmation, relecture.
- [x] Cockpit : trajectoire enrichie ; reprise citant l'amendement.
- [x] Gardes vues rouges (écrivain unique, aucun update/delete).
- [x] T2 ; revue `wn-reviewer` (NO-GO, refermée). **Passe Codex** (P0) : reste
      au responsable. Pas de T3 : aucune migration.

## Tests

- Route : 503 drapeau éteint, 401 sans token, 422 texte vide/hors bornes,
  409 objectif d'un autre dossier ou introuvable, append-only prouvé.
- Dérivation d'état : dernier geste gagne ; « dit autrement » ≠ contesté.

## Critères de done

- Parcours patient complet derrière drapeau ; boucle refermée au cockpit ;
  revues P0 tracées ; T2/T3 verts.

## Résultats

Clos le 2026-08-25 — `D-110`, aucune migration.

**Trois points de forme dépassaient `D-094`, et une décision les porte.**

**Le drapeau, et sa conséquence.** `D-094` §2 dit « même régime que la
ratification » ; la ratification est gardée par `WN_DOSSIER_DEUX_VOIX`, **posé
en production depuis le 2026-08-23**. Le geste s'ouvre donc à tous les dossiers
courants **dès le merge** — ce que la section « Application immédiate » de la
campagne prévoit explicitement. L'adosser à `WN_OBJECTIF_PROPOSE` aurait fait
dépendre le droit du patient à répondre de l'activation de la machine qui
propose : la confusion exacte que `D-094` §5 sépare et que `D-070` a constatée
sur le rayon biologie. L'interdit « le stock ne déferle pas à l'allumage » est
satisfait sans réserve — **rien ne s'accumule** : un amendement est un geste que
seul le patient peut poser.

**Le quatrième état, et le piège de la table unique.** `dit_autrement` n'est ni
un accord ni un refus. Surtout, les deux tables se lisent **ensemble** : lire la
seule table des ratifications rendrait « ratifié » à un patient qui vient
d'écrire autre chose. C'est la mutation que trois bancs tuent — au domaine, à la
route portail et à la route praticien.

**La citation d'un amendement n'élargit pas la liste fermée de `D-094` §1.**
Cette liste ferme les sources d'un fragment de PROPOSITION, c'est-à-dire de ce
que la MACHINE assemble. Un amendement n'est pas assemblé : le patient l'a
écrit. Il relève de la règle inviolable elle-même. Trois bornes la rendent
opposable — l'écran désigne et le serveur recopie (le texte ne transite jamais
par le client, la citation ne s'édite pas) ; la citation est une **révision**,
sans quoi elle créerait une seconde tête de chaîne et un portail qui refuse
toute réponse ; l'amendement doit porter sur la **même chaîne**, et non sur la
seule version visée — le patient peut avoir écrit sur `v1` alors que le
praticien reformule `v2`.

**Deux écarts assumés avec la fiche, tous deux au profit de la route existante.**
Elle annonçait `422` pour un texte vide ou hors bornes, et `409` pour un objectif
d'un autre dossier ; le POST portail rend déjà `400` pour toute validation et
`404` — même message, même statut — pour un objectif inexistant **ou** d'un autre
dossier, précisément pour ne pas devenir un oracle d'existence. Deux gestes
frères qui refuseraient sous des codes différents dans une même route seraient
un défaut, pas une conformité.

**Ce que la garde de registre anxiogène NE couvre PAS, et pourquoi.** Elle vise
un texte que le praticien écrit et que le patient subit. L'étendre à la parole
du patient ferait dire au journal que sa façon de parler de lui-même pose
problème. Un banc tue la mutation qui l'y ajouterait.

**Dette nommée.** Rien ne marque un amendement comme « lu » : une colonne
mutable contredirait l'append-only — même arbitrage que pour
`desaccords_comprehension`. Le cockpit les affiche tous, indéfiniment.

**La revue `wn-reviewer` a rendu NO-GO, et les cinq points retenus sont
refermés.** Aucun n'a été corrigé sur la parole de la revue : chacun a été
revérifié dans l'arbre d'abord, et l'un des cinq l'a été **contre** elle (voir
plus bas).

- **B1 — T1 était rouge, et la fiche affirmait le contraire.** `.wn/state.json`
  passait à `LOT-04` sans que `ACTIVE_CAMPAIGN.md` suive : T1 avait été joué
  **avant** cette édition, et la phrase « T1 vert » était périmée au moment où je
  l'écrivais. Resynchronisé par `wn-cycle --appliquer`, T1 rejoué.
- **M1 — un raisonnement faux tenait lieu de garde.** Le commentaire justifiant
  l'absence de drapeau sur la citation d'amendement disait « drapeau éteint, la
  table reste vide » : vrai le jour de la livraison, faux le lendemain, puisque
  le geste s'ouvre dès le merge. Le motif réel est écrit à sa place (`D-110` §4)
  et **deux bancs épinglent le choix** — le drapeau garde la surface du patient,
  pas la faculté du praticien de lire son dossier et de reformuler.
- **M2 — la parole du patient disparaissait de son propre écran.** La route ne
  sert que les TÊTES de chaîne ; un amendement écrit sur `v1` n'avait plus de
  version à l'écran dès que le praticien posait `v2`. C'est exactement ce que le
  contrat de la route promet de ne pas faire. Un bloc dédié le rend au patient,
  **à part** — le rattacher à la tête courante lui ferait répondre à une
  formulation qu'il n'a jamais vue. Mon propre banc figeait le défaut ; il a été
  retourné.
- **M3 — le refactor avait rendu la dérivation fail-open.** Écarter un `sens`
  hors taxonomie **avant** le tri faisait remonter le geste précédent : le
  cockpit aurait affiché « Ratifié par le patient » à un praticien dont le
  patient venait de se rétracter. La sémantique d'avant le lot est rétablie — le
  dernier geste est choisi d'abord, et ne pas le comprendre se dit `en_attente`.
  Là encore, mon banc figeait la mauvaise réponse.
- **F1** — l'écran jugeait la longueur brute là où le serveur borne le texte
  trimé : il était plus strict que lui.

**Une garde a dû être refaite après sa propre mutation.** La revue demandait une
couverture du rendu au cockpit (F2). La première rédaction cherchait
`{...amendement....length}` — et la mutation `{siens.length}` est passée : le
panneau range les amendements d'une chaîne dans une variable locale, et la garde
tenait par le NOM que j'avais choisi, c'est-à-dire par rien. Refaite sur le
patron de la maison — interdire **tout** décompte rendu, nommer les quatre cas
licites un par un — puis vue rouge deux fois (le décompte fautif, et le motif
tué).

**Deux points de finition sont nommés plutôt que corrigés**, tous deux
antérieurs au lot : la garde d'écrivain unique ne balaie que `src/app/api` et
`src/lib` (une server action y échapperait — limitation héritée de la garde
ratification), et rien ne limite le débit de dépôt. `D-110` porte les trois
dettes.

**Validations.** T1 vert. T2 : 5 928 Vitest verts ; l'unique rouge E2E est la
signature WebKit/iPhone 13 locale, qui a changé de spec entre deux passes sur
des specs que le lot ne touche pas. Passe Codex : au responsable. Aucun T3 —
aucune migration.
