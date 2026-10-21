# Handoff — t06 : brouillon local de « Ce qui compte »

## Branche et état du dépôt

- Branche `lot/t06-brouillon-ce-qui-compte`, worktree `d281-lot3-portail`,
  partie de `origin/main`, main fusionnée après #1618 (41d89caa). Sans
  migration, sans drapeau nouveau (la page reste sous `isCeQuiCompteEnabled`).

## Objectif

Dette t06 (file A) : ce qui est rédigé dans « Ce qui compte pour moi
aujourd'hui » était perdu au rechargement ou à la fermeture de l'onglet.

## Décisions prises

- Arbitrage du responsable, 2026-10-21 : brouillon LOCAL, pas de persistance
  serveur, multi-appareil hors périmètre (prémisse « session de 12 h »
  corrigée : 30 jours depuis D-241). Aucune décision `D-xxx` neuve.
- Clé nommée par l'`idPatient` de la session lue dans le cookie signé par la
  page serveur (patron de `alimentation/page.tsx`), jamais le jeton de l'URL ;
  le corps envoyé ne change pas.
- Écriture à la frappe, pas par effet (un effet au premier rendu effacerait le
  brouillon avant sa reprise). Effacé après dépôt confirmé, conservé sur
  erreur (revue CodeRabbit de #1617).
- Famille inscrite à `FAMILLES_DONNEES_PATIENT` : « Se déconnecter » annonce et
  emporte le brouillon ; la garde de l'inventaire balaie désormais aussi
  `lib/patient/ceQuiCompteBrouillon.ts` (mutation vérifiée : elle rougit sans
  la déclaration).

## Fichiers modifiés

- `web/src/lib/patient/ceQuiCompteBrouillon.ts` (+ test), neuf.
- `web/src/components/patient-companion/CeQuiCompteForm.tsx` (+ test).
- `web/src/app/portail/[token]/ce-qui-compte/page.tsx`.
- `web/src/lib/portail/stockageAppareil.ts`, `stockageAppareil.guard.test.ts`.
- `changelog.d/2026-10-21-t06-brouillon-ce-qui-compte.md`, SESSION_LOG.

## Validations exécutées

- T1 rapide vert ; T2 `--fast` vert avant la fusion de main (842 fichiers
  Vitest, 14 216 tests ; 282 E2E) ; T1 complet après la fusion.

## Problèmes ouverts

- Le texte reste en clair sur l'appareil jusqu'à 30 jours ou la déconnexion
  (dette connue « contenu en clair au stockage local », §8, constat au S-1).

## Prochaine action exacte

CI, CodeRabbit, merge, déploiement constaté ; t06 → « fait » au suivi ; puis
banc des seuils du catalogue.

## Interdits encore actifs

- Un merge à la fois ; aucune image antérieure à 257807e3 redéployée ; rien
  de clinique sans D-xxx.
