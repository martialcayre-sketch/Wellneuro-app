# Handoff — 2026-11-27 — Pièces attendues par les 12 besoins (lot besoins-pieces-attendues, file D)

## Branche et état Git

- Branche `claude/clever-mayer-8u8u6h`, tirée d'`origin/main` (`4abe2383`).
- Un commit de documentation, poussé ; PR ouverte par la passe de
  l'orchestrateur cloud (journal `20261127-2208-orch`).

## Objectif

Écrire `docs/claude/besoins/PIECES_ATTENDUES.md` : une ligne par pièce
manquante nommée par les décisions des dossiers des 12 besoins, avec
décision et paragraphe, type, `WN-SRC` éventuel et geste attendu du
responsable ; comptes par besoin en tête. Deuxième des six lots inscrits sur
la réponse à `20261127-2046-b`.

## Décisions prises

- Périmètre lu : `D-516` §7, `D-526` §7, `D-529` §7, `D-541` §7, `D-542` §1
  et §3, `D-564` à `D-570` (§6 points ouverts et §8 Suites) ; registre des
  sources en lecture seule.
- Une ligne par pièce : un groupe sans identité (« droits de trois
  sources ») a une ligne par pièce (1/3, 2/3, 3/3) ; un envoi du dossier
  privé est désigné par son numéro. Deux restes au nombre non donné
  (repères du besoin 3, échelles du besoin 11) ont une ligne chacun.
- `WN-SRC` rapproché seulement quand registre et décision désignent la même
  pièce (`D-541` §7 ↔ 0679, 0681, 0692, 0696 ; `D-542` §1 ↔ 0609 ; `D-566`
  §8 ↔ 0756 à 0759 ; `D-569` §6.2 ↔ 0784, 0802, 0804 ; `D-567` §6.2 ↔ 0720 ;
  `D-529` §7 ↔ 0671, 0701, 0702).
- Deux pièces nommées par `D-529` sont fournies depuis (0701, 0702, le
  2026-11-17, d'après le registre) : gardées, marquées « aucun geste ».
- Partie 2 à part : 6 notices que le registre attend avec un PDF du
  responsable sans qu'une décision les nomme (0668 ; 0825, 0827, 0838, 0842,
  0844).

## Fichiers modifiés

- `docs/claude/besoins/PIECES_ATTENDUES.md` (nouveau)
- `changelog.d/2026-11-27-besoins-pieces-attendues.md` (nouveau)
- ce handoff

## Validations exécutées

- Comptes de l'en-tête recalculés par script sur le tableau (64 lignes ;
  42 / 15 / 4 / 1 / 2).
- `npm run check:rapide` et `npm run check` : codes de sortie rapportés
  dans le commentaire de la PR.
- Pas de T2 ni de T3 (passe cloud, `D-540`).

## Problèmes ouverts

- Les pièces non rapprochées (« — ») vivent au dossier privé : leur
  identité n'est pas au dépôt.
- `WN-SRC-0698` dit encore dans son commentaire que le texte de la
  publication fondatrice de 1995 « reste à obtenir », alors que 0701 est
  fourni le 2026-11-17 : écart de registre possible, non corrigé (hors
  périmètre : le registre ne change pas ici).
- Lignes « recherche » (A-14, A-31, A-51, A-52) : à prendre par les lots de
  recherche de la séquence, selon la réponse `20261127-2046-b`.

## Prochaine action exacte

Intégrateur : servir la PR après « prête @<sha> » (documentation seule, P2).
File D : les lots suivants de la réconciliation, quand le carnet les sert.

## Interdits encore actifs

- Aucune décision, aucun code, ni guide ni registre des sources touchés par
  ce lot ou ses suites sans lot propre.
- Aucune identité réelle, aucun compte de production au dépôt.
- La passe cloud ne merge pas, ne répond à aucune question, ne prend pas de
  second lot.
