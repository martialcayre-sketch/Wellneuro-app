# Handoff — 2026-10-23 — J1-cockpit-a : nature des trois objets, tolérance de la stabilité

## Branche et état Git

- Branche `j1-cockpit-a-stabilite`, partie d'`origin/main` (1ca4b897),
  worktree `j3-12e-ingestion` (session concurrente, cycle en git/gh direct).
- Code, une PR (F59, rang 3, file A).

## Objectif

Mettre le panneau « Mon équilibre » du cockpit en règle avec D-333 §3 :
mention de nature sur la stabilité métabolique, la réserve d'adaptation et la
clarté ; tolérance nommée de la stabilité (poids égal non motivé, sources
nommées) ; garde de nature étendu (§6).

## Décisions prises

Arbitrages du responsable, 2026-10-23, sur question à options :
- Nature : « repère de suivi » pour les trois, mention « Repère de suivi,
  pas un score clinique » (constante de l'indice global réutilisée).
- Tolérance : « Non motivé, décision due », puis « Moyenne à poids égal :
  Hyperexcitabilité SIIN (Q_INF_01) et Magnésium / spasmophilie SIIN
  (Q_INF_02) » (deux sources) ou « Sur X seule ; manque Y » (une source).
  Sans source : « Non mesuré », inchangé.
- Route : `stabiliteMetaboliqueSources` en booléens, calculés par
  `calculerCouvertureSource` sur `SOURCES_STABILITE_METABOLIQUE`.
- Garde : extension du fichier `natureIndiceGlobal.guard.test.ts` lui-même,
  seul fichier touché sous `lib/equilibre`.

## Fichiers modifiés

- `web/src/lib/praticien/mentionStabiliteMetabolique.ts` (neuf, feuille sans
  import) et son test
- `web/src/app/api/praticien/equilibre/route.ts` et son test
- `web/src/components/FichePatientPanel.tsx` (`ObjetGauge` : prop
  `tolerance` ; trois jauges) et son test
- `web/src/lib/equilibre/natureIndiceGlobal.guard.test.ts`
- `changelog.d/2026-10-23-j1-cockpit-a-stabilite.md`,
  `docs/claude/SESSION_LOG.md`

## Validations exécutées

- Bancs ciblés verts (route, module, garde, composant : 126 cas pour ce
  dernier).
- Garde rouge sous deux mutations (mention retirée de la clarté ; tolérance
  retirée de la stabilité), fichier restauré.
- Revue `wn-reviewer` : go, aucun P0 ni P1. P2 corrigés : appel tolérant à
  un champ absent (chevauchement de déploiement), `tolerance` comptée dans la
  condition d'`ObjetGauge`, bancs de route ajoutés (Q_INF_02 seule, Q_INF_02
  invalidée sous drapeau de validité : valeur égale à Q_INF_01 seule,
  Q_INF_01 incomplète : nulle et manquante), rendu de la clarté chiffrée.
  Écarté : garde de frontière (J1-cockpit-b).
- CodeRabbit (sha db8deb10, P2) : champ des sources absent affiché « Sources
  indisponibles » au lieu d'une liste vide — corrigé, banc de rendu ajouté.
- T1 complet et T2 (`--fast`, E2E Chromium + WebKit) verts avant et après
  les correctifs de revue.

## Problèmes ouverts

- Porte 4 (source du poids égal) : la tolérance reste jusqu'au texte motivé
  du responsable, puis se retire (garde à amender dans le même lot).
- Les besoins 9 et 10 portent deux noms dans le tiroir (jauge « repère de
  suivi », tableau « couverture ») jusqu'aux lots Q2 à Q4.

## Prochaine action exacte

Après le merge : page de suivi de la file A, r3_07 « en_cours » (reste
J1-cockpit-b) ; mémoire audit-instruments ; puis J1-cockpit-b en session
neuve (provenance datée, garde de frontière, Q9, Q10).

## Interdits encore actifs

- Rien sous `lib/equilibre` hors garde ; aucune formule, table, version,
  seuil ; aucune couleur ni mot qui juge la valeur (§2 règle 4) ; rien au
  portail.
- La tolérance de la stabilité ne se retire qu'à la levée de la porte 4.
