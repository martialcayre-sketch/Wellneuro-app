# Handoff — 2026-11-28 — Candidats pour les instruments manquants (lot besoins-recherche-instruments-manquants, file D)

## 1. Branche et état Git

- Branche `claude/clever-mayer-dcwf1d` (passe cloud de l'orchestrateur
  `20261128-1309-orch`), partie d'`origin/main` (`1940fdb6`).
- Un commit de documentation, poussé avec la PR du lot.

## 2. Objectif

Écrire `docs/claude/besoins/candidats/INSTRUMENTS_MANQUANTS.md`. Le
document couvre les besoins 6, 7 et 11, le relevé des troubles
fonctionnels intestinaux et l'intéroception au besoin 4, et la mobilité au
besoin 5. Pour chacun, il liste les candidats en identifiants, ou un « non
trouvé » documenté. Réponse `20261127-2046-b` : « la passe cloud cherche
et vérifie elle-même ».

## 3. Décisions prises

- Lot pris par la passe `20261128-1309-orch` : intention
  `besoins-recherche-instruments-manquants--v3`, prise à 12:09Z.
  Revérifié à la prise : document seul, P2, aucune catégorie fermée au
  cloud par `D-540` §3.
- « TFI » est lu comme le nom que des documents du dépôt donnent au relevé
  des troubles fonctionnels intestinaux (`INSTRUMENTS_12_BESOINS.md`,
  partie 3). Les candidats sont des relevés publiés de ces troubles. La
  douleur, nommée par `D-526` §2.2, est couverte dans une partie courte
  (4c).
- Droits : seule une phrase publiée sur l'usage de l'échelle est
  reportée. La licence d'un article n'est jamais lue comme un droit d'usage
  de l'échelle.
- L'écart avec `G10.md` sur le GPAQ français est signalé, pas corrigé : la
  correction est hors du périmètre du lot.

## 4. Fichiers modifiés

- `docs/claude/besoins/candidats/INSTRUMENTS_MANQUANTS.md` (nouveau)
- `changelog.d/2026-11-28-besoins-recherche-instruments-manquants.md`, ce
  handoff

## 5. Validations exécutées

- Les 48 PMID cités se résolvent par esummary, avec 0 échec. Pour chaque
  ligne de tableau, le couple PMID-DOI et l'année concordent avec PubMed
  (0 écart). Les 42 DOI cités se résolvent par doi.org (0 échec).
- Chaque population et chaque objet de mesure a été relu au résumé.
  Quatre populations ont été corrigées après relecture : PASS, revue du
  BPAT, MAIA-2 d'origine, H-LEA.
- Les phrases sur les droits ont été relues à leur section, dans le texte
  intégral PMC : Nijmegen, MAIA-2, PERMA-Profiler, MSK-HQ.
- Une correspondance DOI-PMID fausse, celle de LET-F, a été écartée après
  lecture du résumé.
- `npm run check` (T1 complet) : code 0. Le premier `check:rapide` avait
  échoué faute de dépendances dans le clone frais ; il a été rejoué après
  `npm ci` et `npx prisma generate`.

## 6. Problèmes ouverts

- Deux sources sont à lire en texte intégral avant tout usage : PMID
  41206253 (MLQ français, patients en crise) et PMID 15733628 (DN4). Les
  sept notices déjà au registre et nommées par leur seul DOI (WN-SRC-0548,
  0550, 0551, 0560, 0756, 0827 et 0828, parties 1 et 3) n'ont pas été
  relues ici.
- Les pages d'auteurs et d'éditeurs sont fermées au réseau cloud : Open
  Science Framework, page de la MAIA, licence du MSK-HQ. Elles se lisent au
  Mac.
- `G10.md` affirme qu'il n'existe aucune validation française du GPAQ ; il
  en existe une (PMID 30356654). C'est à corriger par un lot distinct, si le
  responsable le veut.
- La question `20261119-1310-b` (droits des échelles) reste ouverte.
- Le recouvrement du Nijmegen avec les items des besoins 4 et 9
  (`D-566` §6.1) se confirme au code ; ce n'est pas fait ici.

## 7. Prochaine action exacte

1. CI et PR-Agent de la PR de ce lot à 0, PR hors brouillon, puis
   « prête @<sha> » et ligne `prete` à la boîte `integrateur`.
2. Au merge, l'intégrateur passe le lot
   `besoins-recherche-instruments-manquants` à `fait`, avec son champ `pr`.

## 8. Interdits encore actifs

- Aucune référence de mémoire. Aucune valeur chiffrée recopiée, aucun item
  ni titre reproduit. Aucune ingestion, aucun ajout au catalogue des
  questionnaires, aucune modification des registres.
- Servir un instrument, rapprocher un construit ou trancher un droit
  relève d'une décision du responsable, au Mac.
- Ne pas merger : l'intégrateur merge. Ne pas sortir une PR du brouillon
  après « prête ». Aucune adresse de page privée dans le dépôt ; ne
  jamais supprimer une ligne des registres.
