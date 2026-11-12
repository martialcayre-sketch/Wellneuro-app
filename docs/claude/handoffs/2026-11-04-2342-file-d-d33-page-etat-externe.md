# Handoff — file D, d33 : sonde externe et page d'état hors de l'hébergeur

## Branche et état Git

- Branche `feat/file-d-d33-page-etat-externe`, worktree `file-d1-suite`,
  partie de `origin/main` (un commit rejoué sur la tête du 2026-11-04 soir).
- #1854 (D-441, d44) est mergée.

## Objectif

Lever d33 : une sonde de disponibilité et une page d'état hébergées hors de
Scalingo, dont l'adresse est chez le patient avant la panne.

## Décisions prises

Arbitrages du responsable du 2026-11-04 :

- la sonde interroge `/login`, sans route de santé à coder : elle ne voit pas
  une base en panne derrière une page qui s'affiche ;
- la page d'état est sur un sous-domaine Better Stack
  (`wellneuro.betteruptime.com`), indexable, sans abonnement ;
- l'adresse entre dans trois e-mails : `lien_magique@2`, `acces_portail@3`,
  `acces_portail_lien@2`, par un paragraphe qui nomme le tiers. Le texte a été
  validé deux fois, la seconde contre une version courte proposée ailleurs ;
- « Vos données personnelles » reste en l'état : l'application n'envoie rien
  à Better Stack, qui n'est pas un sous-traitant de données patient ;
- délai de la sonde : 30 s, l'API n'admettant pas les 25 s prévus.

Faits vérifiés :

- l'unité de `p95_response_time` est la milliseconde (`"suffix": "ms"`,
  API Scalingo) : le seuil vaut 5 s ;
- d47 était déjà soldée avant la signature du 2026-08-15 (D-061) : la page de
  suivi est corrigée, aucun commit.

## Fichiers modifiés

- `web/src/lib/correspondance/registreGabarits.ts` : trois versions ajoutées
  en fin de registre, nées validées le 2026-11-04.
- `web/src/lib/correspondance/registreGabarits.test.ts` : listes figées,
  validations, fidélité des anciennes versions épinglée, banc « seul ajout =
  le paragraphe validé, à l'endroit validé ».
- `docs/claude/OBSERVABILITE_PRODUCTION.md` : sonde, page, unité p95.
- `changelog.d/2026-11-04-d33-page-etat-externe.md`, ce handoff.

## Validations exécutées

- Vitest `src/lib/correspondance`, `consultation`, `portail`, `fil` :
  791 verts, 25 ignorés.
- T1 rapide : code 0. Anti-secrets indexé : OK.
- Better Stack, par connecteur : sonde 5185405 verte (`/login`, 180 s,
  30 s, UE) ; page 270413 publiée, sonde liée, réponse HTTP 200.

## Problèmes ouverts

- L'interface de la page d'état est en anglais : aucun réglage de langue par
  l'API.
- La sonde ne détecte pas une base en panne (choix assumé).
- d58, d56, d59, d53 : inchangés (voir handoff d44).

## Prochaine action exacte

1. Ouvrir la PR, attendre le CI en fond, revue (CodeRabbit ou PR-Agent),
   puis déclarer « prête @<sha> ».
2. Passer d33 en « fait » sur la page « Suivi de la file D ».
3. Lignes restantes en file D : d37, d25, d31 (gestes du responsable).

## Interdits encore actifs

- Rien sous `web/src/lib/clinical/` ni dans `indicationsBiologieV1.ts` ;
  ni migration ni `schema.prisma` ; aucune écriture en production.
- Aucune valeur, aucun seuil ni aucune source clinique proposés par la
  session (DC-20). Aucune D-xxx sans arbitrage du responsable.
- Un assistant externe n'est jamais la source d'une valeur. Aucun
  identifiant Drive dans le dépôt. Jamais de jeton dans le dépôt ni la
  conversation (`~/.betterstack-token` reste sur le poste).
- Aucun UPDATE du contenu d'une passation (LOT-00).
- Essai de D-373 : déclarer « prête », ne pas merger.
