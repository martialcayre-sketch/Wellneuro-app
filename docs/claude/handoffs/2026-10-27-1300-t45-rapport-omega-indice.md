# Handoff — t45, quatrième lot : le rapport oméga 6 / oméga 3 et l'indice oméga 3 calculés de leurs acides (D-389)

## Branche et état du dépôt

- Branche `lot/t45-rapport-omega-indice`, worktree `d281-lot3-portail`,
  partie d'`origin/main` (1fd2a4b9 fusionné). Aucune migration, aucun schéma.

## Objectif

Donner au rapport oméga 6 / oméga 3 et à l'indice oméga 3 leurs opérandes,
pour que leur mention de remboursement se lise sur leurs acides et qu'ils
s'affichent avec eux, sans plage ni seuil.

## Décisions prises

- Arbitrage du responsable du 2026-10-27 : le rapport est indispensable,
  l'indice se calcule aussi, les claims sont au corpus SIIN ; « go » sur la
  proposition. Consigné dans `D-389`, qui amende D-376 §6.
- Rapport : quatre oméga 6 sur trois oméga 3, comme le compte rendu les
  range sous ses titres de section ; l'arithmétique redonne la valeur
  imprimée au centième (valeurs non versées). Indice : EPA + DHA
  (WN-CL-0045-008). Sens du rapport : claims des voies de l'inflammation.

## Fichiers modifiés

- `web/src/lib/biology-library/compositionsPreparees.ts` (deux calculs ; le
  rapport sort des « opérandes absents ») et son banc.
- `web/src/lib/biology-library/candidatsNabm.ts` (l'indice en « valeur
  calculée ») et son banc (38 « aucun acte », 10 valeurs calculées).
- `docs/DECISIONS.md` (D-389), `docs/claude/PLAN_WELLNEURO.md` (ligne t45),
  `changelog.d/2026-10-27-t45-rapport-omega-indice.md`, SESSION_LOG.

## Validations exécutées

- Lectures par conteneur, en lecture seule : corpus (claims validés sur
  l'indice, le rapport et les voies de l'inflammation) ; constat « aucun
  acte » de l'indice signé sur V105 ; aucune composition sur ces deux
  analytes.
- Vitest ciblé, T1 complet, T2 et revue : résultat dans la PR.

## Problèmes ouverts

- D-389 se revérifie juste avant le merge : renuméroté depuis D-388, pris
  par #1727 mergée avant nous.
- Au praticien, après le déploiement : les constats des acides, puis les
  compositions (profil, rapport, indice), puis le contrôle des rendus.
- Écart à instruire avant toute plage : seuil AA/EPA du corpus contre
  référence imprimée par le laboratoire.
- Demande du responsable du 2026-10-27, à cadrer en lot séparé : la
  représentation visuelle du bilan des acides gras érythrocytaires, au
  minimum les indicateurs principaux et les rapports majeurs.

## Prochaine action exacte

CI, CodeRabbit sur la tête, merge (aucune migration ; le chemin n'est pas
déclencheur de release-db), constat du déploiement.

## Interdits encore actifs

- Un merge à la fois, aucun auto-merge ; jamais d'image antérieure à
  257807e3 ; les PR et release-db des autres sessions ne sont pas à nous ;
  hors périmètre : m38, WN_CONSTAT_BESOIN, signature NABM de TP/INR.
- Aucune identité ni valeur du compte rendu présenté dans un fichier durable.
- Aucune plage, borne, seuil ni conversion inventés.
