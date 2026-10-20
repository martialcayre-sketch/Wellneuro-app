# Handoff — 2026-10-20 — File B : BP-11, code des constats (D-331)

## Branche et état Git

- Branche `lot/bp11-constats-code`, partie d'`origin/main` (f03e4424), dans
  le worktree `bio-ingest-cloture` (session concurrente, cycle en git/gh
  direct) ; `origin/main` (f589fbc5, #1602) mergé sur arbitrage du
  responsable.
- Avant : #1600 (migration) mergée, release-db run 39415107189 approuvée,
  sentinelle `39415107189-1`, constat par conteneur (`one-off-305`) :
  appliquée, deux tables vides, RLS sans politique, neuf triggers.

## Objectif

BP-11 (fiche F06, LOT-11), PR 2 de deux ([[D-266]] §11) : le code
consommateur sous `WN_BIO_CONSTAT`, créé éteint. Clôt LOT-11.

## Décisions prises

- Route `api/praticien/biologie/constats` : GET (constats par hypothèse,
  tête, « à relire » dérivé, citables décrites par analyse et date, aucune
  valeur, accès journalisé) ; POST (pose, remplacement, retrait) dans une
  seule `$transaction`, verrous dans l'ordre du trigger (dossier, 331, clés
  BP-09 triées), refus nommés avant la base, refus de la base reconnus à
  leur code (`P0001`, `40001`, `40P01`, `P2034`, `P2028`).
- Panneau « Constats du parcours » dans l'onglet « Biologie », muet drapeau
  éteint ; aucune pose avant la signature de la structure de BP-12a.
- Q1 et Q2 de la relecture, arbitrées par le responsable (option
  recommandée) et consignées en D-331 §5 : date « à revoir le » atteinte (le
  jour même compte) ; seule une passation retenue plus récente compte.
- Structure retouchée sans re-signature : aucune hypothèse en vigueur ⇒
  chaque constat « à relire » (lecture de l'assistant, à infirmer).
- Banc des lecteurs des constats (`lecteursConstats.guard.test.ts`).

## Fichiers modifiés

`web/src/lib/bio-parcours/constats/*` (neuf modules + deux tests), route et
son test, `ConstatsParcoursPanel.tsx` et son test, `FichePatientPanel.tsx`,
`CbFeatureProvider.tsx`, page du dossier, trois gardes `bio-parcours`,
`docs/FEATURE_FLAGS.md`, `docs/DECISIONS.md` (D-331 §5, précisions),
`MATRICE_CONSOMMATION.md` (régénérée), fiche LOT-11, `CAMPAGNE.md`, plan
F06, fragment changelog, `SESSION_LOG.md`, ce handoff.

## Validations exécutées

- T1 complet vert (avant et après les correctifs de la relecture).
- T2 vert sur 02411a0d + bornes nommées : vitest 838 fichiers, E2E 282
  (6 min 32 s). Premier T2 rouge : banc des seuils littéraux (deux bornes de
  longueur en dur dans `demande.ts`), corrigé en constantes nommées.
- Tests des constats : 46 verts après les correctifs (demande, à relire,
  erreurs, route, écran) ; gardes vertes.
- Relecture `wn-reviewer` : go sous condition, aucun P0/P1 ; P2-2, P2-3,
  P2-5 corrigés ; P2-1 routé ; P2-4, P2-6 et le dossier clos écartés avec
  motif (fiche LOT-11).

## Problèmes ouverts

- Test d'intégration sur une vraie base : condition de l'allumage de
  `WN_BIO_CONSTAT` (ligne de `docs/FEATURE_FLAGS.md`).

## Prochaine action exacte

CI, revue CodeRabbit de la tête, merge, déploiement constaté ; puis BP-13 :
fiche LOT-13 et sa décision (arbitrages en mémoire
`bp13-bp15-axes-arbitrages-2026-10-20`).

## Interdits encore actifs

- Ne pas éteindre `WN_DOCUMENT_MEDECIN_PATIENT` ni refaire son constat.
- Aucune écriture en base de production hors migration et release-db
  approuvée ; une release-db à la fois ; lister les runs `waiting` avant
  chaque merge.
- Aucun libellé d'hypothèse, texte clinique ni identité réelle au dépôt.
- Ni pull, ni merge, ni rebase sans arbitrage humain.
- Jamais `err.message` au journal.
