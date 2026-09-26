# Handoff — 2026-09-26 — Fiche d'assiette, lot 5 : l'outil d'adaptation hors ligne

## 1. Branche et état Git

`wn-fiche-assiette-outil`, worktree `.claude/worktrees/deploy-anti-recul-lot1`,
partie de `origin/main` à `1ab1610b`. Le lot 4 (#1234) est en service,
constaté par le suivi du déploiement (déploiement `a4af5147`).

## 2. Objectif

Lot 5 sur 11 de `D-251` : `tools/corpus/fiches/`. Sonnet rédige l'adaptation
patient d'une Fiche MY, GPT contre-lit chaque élément, les contrôles serveur
sont rejoués, puis le brouillon est déposé par la route du lot 4.

## 3. Décisions prises

- **Deux gestes**, sur le patron de `claims/` : `augmenter.mjs` rédige et
  contre-lit, `deposer.mjs` rejoue les contrôles puis envoie.
  - `--cible` est **obligatoire** et n'est jamais lue dans l'environnement.
  - `https` est exigé hors de la machine locale.
- **Le vrai contrat et les vrais contrôles**, importés de `web/src` par le hook
  d'alias, jamais recopiés.
  - Le hook résout désormais les imports relatifs sans extension d'un `.ts`.
    Ces imports échouaient tous jusqu'ici, donc aucune cible existante ne
    change.
  - Une mutation (l'ancien hook) fait rougir le banc de chargement.
- **La règle d'exclusion** (`lib/assemblage.mjs`) :
  - bloc refusé : exclu ;
  - titre de section refusé : section exclue ;
  - précaution ou titre de fiche refusé : **la fiche échoue** (`D-227` §3) ;
  - verdict absent : refus (`DC-24`).
- **Les entrées sont vérifiées** :
  - l'empreinte du PDF est recalculée contre le manifeste ;
  - le nombre de pages doit égaler le nombre de marqueurs ;
  - chaque claim local doit redonner son empreinte.
  - Le statut VALIDE n'est connu que du serveur, qui refuse au dépôt.
- **La consigne est versionnée** : `fiche-assiette-v1+<empreinte>`, épinglée par
  un banc. Aucune fiche n'a encore été déposée : la v1 a été réépinglée pendant
  sa mise au point, et tout changement après le merge imposera une version.
- **Les essais réels** (sans dépôt) ont fait trouver et corriger trois défauts :
  1. **Les deux consignes se contredisaient.** La contre-lecture tenait le
     renvoi au praticien, exigé par §6, pour une conduite ajoutée. Elle le sait
     désormais exigé ; seule une conduite que le patient appliquerait seul est
     refusée.
  2. **`controlerFiche` (lot 2) déclarait « introuvable »** une phrase reprise
     d'une ligne contenant du gras Markdown. La comparaison verbatim se fait
     désormais balisage retiré **des deux côtés** : gras, titres, puces,
     tableaux et marqueurs de page. Les nombres restent contrôlés sur le texte
     entier. C'est un changement serveur, borné et prouvé par mutation.
  3. **Le rédacteur tronquait les clés** (sans `::v1.0`). La consigne l'interdit
     désormais nommément, et les clés lui sont données entre guillemets. Aucune
     réparation automatique n'est faite.
  - Précision sur les conditions de réserve (règle 7 bis) : elles se reprennent
    dans les termes mêmes du claim.
  - Le renvoi au praticien **s'ajoute** à une exception, il ne la remplace
    jamais. Une précaution peut nommer la situation que désigne sa réserve.
    L'adaptation doit couvrir toute la fiche.
- **Revue adverse** : 4 angles et une réfutation par angle, soit 11 constats
  confirmés, aucun P0, tous corrigés sauf un, remonté au responsable.
  - **Contrôles du lot 2** :
    - le balisage est retiré aussi pour les **nombres** : « **3 semaines** »
      était lu « semaines** » ;
    - un verbatim se cherche dans **une seule** ligne ou cellule, et ne joint
      plus deux cellules ;
    - un nom à chiffre (« oméga-3 », « B12 ») n'est plus une quantité, mais doit
      exister dans une source ;
    - le texte patient ne peut plus porter de balisage ni de marqueur ;
    - « diagnostiqué », « posologie » et « dosage » rejoignent le lexique
      proscrit.
  - **Outil** :
    - chaque élément est contre-lu dans son contexte ;
    - une section amputée est relue entière ;
    - une contre-lecture incomplète fait **échouer** la fiche au lieu de
      l'amputer ;
    - au plus 4 appels partent à la fois ;
    - les journaux des SDK sont coupés ;
    - aucune erreur n'est imprimée par son message ;
    - un rapport n'écrase plus le brouillon ;
    - le dépôt refuse les redirections.
  - **CI** : les consignes (`.md`) sont classées comme du code.
- **Revue Copilot (#1235)**, trois constats :
  - **corrigé** : le texte patient refuse aussi l'astérisque seul, la puce et
    le numéro de liste ;
  - **corrigé** : les nombres se lisent segment par segment et ne s'apparient
    plus d'une cellule à l'autre ;
  - **écarté, avec motif** : l'expression signalée comme invalide est valide,
    le module se charge et ses bancs passent.
  - Mutations jouées pour les deux corrections.
  - **Bancs** : les deux sens de la comparaison pages / marqueurs sont couverts.

## 4. Fichiers modifiés

- `tools/corpus/fiches/` : `augmenter.mjs`, `deposer.mjs`, `README.md`,
  `consignes/{redaction,contre-lecture}.md`,
  `lib/{assemblage,consigne,controles,entrees}.mjs` et leurs bancs,
  `lib/chargement-web.test.mjs`
- `tools/corpus/lib/alias-hooks.mjs`
- `scripts/run-certify-bancs.sh` (dossier des bancs ajouté)
- `.github/workflows/ci.yml` (consignes classées comme du code)
- `web/src/lib/fiches-assiette/invariants.ts` (+ `invariants.test.ts`)
- `changelog.d/2026-09-26-fiches-assiette-outil-adaptation.md`
- `docs/claude/SESSION_LOG.md`
- ce handoff

## 5. Validations exécutées

- Bancs du corpus : 102 verts, dont 5 nouveaux fichiers.
- Vitest `fiches-assiette` : 66 verts.
- Mutations jouées, chacune attrapée par un banc :
  - le hook ancien ;
  - l'absence de retrait du balisage ;
  - l'absence de garde des noms à chiffre ;
  - les segments aplatis ;
  - `marqueurs < pages`.
- T1 vert. T2 vert : 604 fichiers et 10 121 tests Vitest, le build, 213 E2E.
- **Essais réels, sans dépôt** : neuf passes sur 0299, 0300 et 0305.
  - Sous la consigne finale `d4d81bb3…`, deux brouillons sont produits :
    - 0300 : 2 précautions retenues, 6 sections, 33 blocs ;
    - 0305 : 4 sections, 13 blocs, aucune exclusion.
  - 0299 a été produit sous une version antérieure de la consigne : il est à
    régénérer avant tout dépôt.
  - Les trois passent `deposer.mjs --validate` contre le contrôle serveur
    final.
  - Chaque échec intermédiaire a été expliqué et a mené à un correctif (§3).
    Le dernier en date était un faux refus de « oméga 3 » écrit avec une
    espace ; ces écritures sont désormais unifiées en un seul nom.

## 6. Problèmes ouverts

- **Aucun dépôt en production n'a été fait.** C'est un geste à confirmer par le
  responsable (`deposer.mjs --cible https://app.wellneuro.fr`).
- **La tension sur les bornes d'âge (§6).** La borne d'âge de la protéinée est
  un claim d'**indication**, et non de sécurité. Une précaution qui la citerait
  est refusée (`precaution_hors_perimetre`). C'est une décision clinique à
  remonter au responsable, pas un défaut de l'outil.
- **La prémisse de §3** (« fragment amendé par un modèle, donc pas le
  verbatim ») est peut-être inexacte. Le fragment et `canonical.md` viennent
  tous deux de la lecture B. Le choix de `canonical.md` reste juste ; la
  justification est à corriger dans un lot de documentation.
- **La bascule `rightsStatus: verified`** se fait notice par notice, au dépôt
  réel de chaque fiche.

## 7. Prochaine action exacte

Merge, puis lot 6 : la relecture et la validation dans la Bibliothèque. Les
dépôts des sept fiches attendent l'accord du responsable.

## 8. Interdits encore actifs

- Aucun texte de Fiche MY au dépôt, dans une PR ou au terminal. Les bancs sont
  synthétiques, et les essais n'impriment que des comptes et des codes.
- « Un merge à la fois » (D-248).
- Aucun dépôt en production sans l'accord du responsable.
