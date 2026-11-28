# Handoff — 2026-11-28 — Recherche G-10 : bloquée par le réseau de la passe cloud (lot besoins-recherche-g10, file D)

## Branche et état Git

- Branche `claude/clever-mayer-2opyuv`, à `origin/main` (`dc626fe3`) au départ.
- Un seul commit : ce handoff. Aucune PR (lot rangé `bloque`, précédent
  `kit-doctor-docs-prompt-vert`, journal `20261127-1108-orch`).
- Passe de l'orchestrateur cloud, journal `20261128-0809-orch`, intention
  `besoins-recherche-g10--v1`.

## Objectif

Écrire `docs/claude/besoins/candidats/G10.md` : par instrument servi, les
sources de fidélité (G-10) en identifiants seuls, une source n'étant gardée
que si son DOI ou son PMID se résout et que l'emplacement de la valeur est
lu (réponse à `20261127-2046-b` : « la passe cloud cherche et vérifie
elle-même »).

## Décisions prises

- Revérification du lot (`D-540` §3, `D-510` §9) : documentation opaque,
  P2, aucune catégorie fermée au cloud ; le lot reste `cloud`.
- Le lot est rangé `bloque`, sans fichier `G10.md` : la méthode exige une
  résolution que ce conteneur ne peut pas faire. Écrire « non trouvé » pour
  chaque instrument serait faux — rien n'a été cherché faute d'accès, ce
  n'est pas une recherche sans résultat.

## Constat (2026-11-28, vers 07:10Z)

- `curl` vers `pubmed.ncbi.nlm.nih.gov`, `eutils.ncbi.nlm.nih.gov`,
  `doi.org`, `api.crossref.org` : refus du proxy de la session (403,
  hôte non autorisé par la politique réseau de l'environnement).
- `WebFetch` vers `pubmed.ncbi.nlm.nih.gov` et `doi.org` : hôte non
  résolu (hors domaines autorisés de la session).
- `WebSearch` répond, mais ne rend que des titres et adresses : ni
  résolution d'un DOI ni lecture d'un tableau. Il ne satisfait pas la
  méthode du lot.

## Fichiers modifiés

- ce handoff

## Validations exécutées

- Aucune validation de code : aucun fichier hors handoff n'est touché.

## Problèmes ouverts — geste du responsable

Choisir l'une des voies :

1. Autoriser, dans la politique réseau de l'environnement cloud de la
   routine, au moins `pubmed.ncbi.nlm.nih.gov`, `eutils.ncbi.nlm.nih.gov`,
   `doi.org` et `api.crossref.org` (et les éditeurs et
   `pmc.ncbi.nlm.nih.gov` pour lire l'emplacement), puis remettre le lot à
   `pret`.
2. Ou passer le lot `lieu: mac`, où le réseau n'est pas filtré.

## Prochaine action exacte

Responsable : l'une des deux voies ci-dessus, puis remettre le lot à `pret`
(vider `pris_par`, `pris_le`, `branche`). La passe suivante le reprendra
depuis `origin/main` ; ce handoff n'a pas à être mergé pour cela.

## Interdits encore actifs

- Aucune référence de mémoire, aucune valeur chiffrée recopiée, aucun item
  d'instrument reproduit ; aucune ingestion, ni modification du registre ou
  de `measurement_evidence.json`.
