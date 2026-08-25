# Handoff — 2026-08-25 — Alliance 6.0-B, LOT-04 : « le dire autrement »

## Branche et état Git

`feat/lot04-portail-dire-autrement`, worktree `alliance-6b-lot04`, depuis
`origin/main` `3f3d3260`. **Aucune migration, `schema.prisma` intouché** — la
table `amendements_objectif` est livrée et constatée en production depuis le
LOT-01 ; elle attendait son écrivain.

## Objectif

Donner au patient son troisième verbe, et refermer la boucle de négociation au
cockpit.

## Décisions prises — `D-110`, trois points de forme au-delà de `D-094`

**Le drapeau, et il ouvre au merge.** `D-094` §2 dit « même régime que la
ratification » ; celle-ci est gardée par `WN_DOSSIER_DEUX_VOIX`, **posé en
production depuis le 2026-08-23**. Le geste s'ouvre donc à tous les dossiers
courants dès le merge — c'est ce que la section « Application immédiate » de la
campagne prévoit. L'adosser à `WN_OBJECTIF_PROPOSE` aurait fait dépendre le
droit du patient à répondre de l'activation de la MACHINE qui propose : la
confusion que `D-094` §5 sépare et que `D-070` a constatée sur la biologie.
L'interdit « le stock ne déferle pas à l'allumage » est satisfait sans réserve —
un amendement est un geste que seul le patient peut poser, rien ne s'accumule.

**Le quatrième état, et le piège de la table unique.** `dit_autrement` n'est ni
un accord ni un refus. Surtout : **les deux tables se lisent ensemble**. Lire la
seule table des ratifications rendrait « ratifié » à un patient qui vient
d'écrire autre chose — trois bancs tuent cette mutation (domaine, route portail,
route praticien).

**Citer un amendement n'élargit pas la liste fermée de `D-094` §1.** Cette liste
ferme les sources d'un fragment de PROPOSITION, c'est-à-dire ce que la MACHINE
assemble. Un amendement n'est pas assemblé : le patient l'a écrit. Trois bornes
rendent la citation opposable — l'écran désigne et le serveur recopie (le texte
ne transite jamais par le client, la citation ne s'édite pas) ; la citation est
une RÉVISION, sans quoi elle créerait une seconde tête de chaîne, donc un
portail qui refuse toute réponse ; l'amendement doit porter sur la MÊME CHAÎNE,
pas sur la seule version visée — le patient peut avoir écrit sur `v1` alors que
le praticien reformule `v2`.

**Deux écarts assumés avec la fiche**, tous deux au profit de la cohérence de la
route existante : elle annonçait `422` (texte vide/hors bornes) et `409`
(objectif d'un autre dossier). Le POST portail rend `400` pour toute validation
et `404` — même message, même statut — pour un objectif inexistant OU d'un autre
dossier, précisément pour ne pas devenir un oracle d'existence. Deux gestes
frères refusant sous des codes différents dans une même route seraient un
défaut, pas une conformité.

## Fichiers modifiés

- `objectifNegocie.ts` : `preparerAmendement`, `LONGUEUR_MAX_AMENDEMENT`,
  `EtatRatification` à quatre valeurs, `etatRatification` lisant les deux
  tables, `CibleObjectif.origine` gagne `amendement` (la garde de longueur est
  écrite « tout sauf `revision` », pour qu'une quatrième origine soit bornée par
  défaut)
- `api/portail/dossier/route.ts` : geste NOMMÉ dans le corps, trois
  vérifications extraites et partagées, écriture de l'amendement, GET qui le
  sert
- `DossierDeuxVoixView.tsx` : le troisième verbe, la saisie bornée, la relecture
- `api/praticien/objectifs/route.ts` : lecture des amendements, `amendementCiteId`
- `ObjectifNegociePanel.tsx` : les mots du patient dans la trajectoire, « en
  faire l'énoncé », nettoyage symétrique des trois origines
- `objectifNegocie.guard.test.ts` : G1 élargie, deux gardes G5 neuves

## Validations exécutées

- **T1 vert** (`npm run check`, code 0).
- Bancs du lot : domaine 49, route portail 65, route praticien 56, panneau 34,
  vue portail 26, gardes 18.
- **Trois mutations vues rouges** : un second écrivain de `amendementObjectif`
  dans la route praticien ; l'ajout des amendements à la garde de registre
  anxiogène ; la lecture de la seule table des ratifications.

## Revue `wn-reviewer` (P0) : NO-GO, cinq points refermés

Aucun correctif sur la parole de la revue — chaque point revérifié dans l'arbre
d'abord.

- **B1 — T1 rouge, et la fiche disait le contraire.** `.wn/state.json` passait à
  `LOT-04` sans que `ACTIVE_CAMPAIGN.md` suive. T1 avait été joué **avant** cette
  édition ; « T1 vert » était périmé au moment où je l'écrivais.
  `wn-cycle --appliquer`, T1 rejoué.
- **M1 — un raisonnement faux tenait lieu de garde.** « Drapeau éteint, la table
  reste vide » : vrai le jour de la livraison, faux le lendemain. Motif réel
  écrit à sa place, **choix épinglé par deux bancs** (`D-110` §4) — le drapeau
  garde la surface du patient, pas la faculté du praticien de lire son dossier.
- **M2 — la parole du patient disparaissait de son propre écran** dès la
  première reformulation, la route ne servant que les têtes. Bloc dédié, rendu
  **à part** de la tête courante. Mon banc figeait le défaut.
- **M3 — le refactor avait rendu la dérivation fail-open** : un `sens` hors
  taxonomie écarté avant le tri faisait remonter le geste précédent. Sémantique
  d'avant le lot rétablie. Mon banc figeait la mauvaise réponse.
- **F1** — l'écran jugeait la longueur brute, le serveur borne le texte trimé.

**Une garde refaite après sa propre mutation** : la première rédaction de G2-bis
cherchait `{...amendement....length}` et laissait passer `{siens.length}` — elle
tenait par le nom de la variable. Refaite sur le patron de la maison (interdire
tout décompte rendu, nommer les cas licites), vue rouge deux fois.

## Problèmes ouverts

- **Rien ne marque un amendement comme « lu »** : une colonne mutable
  contredirait l'append-only (même arbitrage que `desaccords_comprehension`). Le
  cockpit les affiche tous, indéfiniment. Un accusé de lecture appelle sa propre
  décision.
- **Aucun E2E** du parcours « le dire autrement » — comme au LOT-03, les bancs
  de route et de rendu couvrent seuls le geste.
- Les dettes du LOT-03 restent : contrôle « proposition déjà disposée » hors
  transaction, SHA du périmètre non confrontable, aucun déplacement de focus
  quand une sélection bascule le formulaire situé plus bas — l'ouverture de la
  saisie d'amendement hérite du même défaut.
- **La garde d'écrivain unique ne balaie que `src/app/api` et `src/lib`** : une
  server action sous `src/app/(cockpit)` créerait un amendement sans rougir.
  Limitation **héritée** de la garde ratification, nommée ici, non corrigée dans
  ce lot — l'élargir toucherait les deux gardes et sort du périmètre.
- **Aucune limitation de débit** sur le dépôt d'amendements (`D-110`, dette 3) :
  préexistant sur la ratification, plus coûteux ici (4 Ko par dépôt). Sans
  porteur.
- **Le dossier clos n'arrête pas le geste** (`D-110`, dette 2) — hérité de la
  ratification, désormais écrit pour qu'on ne le « corrige » pas comme un oubli.
- Le portail reste en **pull** : rien ne prévient le praticien qu'un amendement
  est arrivé.

## Prochaine action exacte

**Passe Codex** (classe P0) — geste du responsable, `$wellneuro-pr-review`.
Ensuite la PR, puis LOT-05 — les jalons.

## Interdits encore actifs

- Le texte du patient n'est jamais tronqué, journalisé, compté ni gradué.
- `enoncePatient` ne se pré-remplit que par citation verbatim ; l'écran désigne,
  le serveur recopie.
- `amendements_objectif` n'a qu'un écrivain : la route portail.
