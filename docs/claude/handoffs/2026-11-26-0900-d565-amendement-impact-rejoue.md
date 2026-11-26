# Handoff — J3-12f, amendement daté de D-565 : chiffres du moteur au §7, DNSM au §2.1 (documentation seule) (2026-11-26)

## 1. Branche et état Git

- Branche `docs/d565-amendement-2026-11-26`, tirée d'`origin/main` après le merge du lot de code (#2367), dans le worktree
  `.claude/worktrees/agent-a81c34a8d1130b0ce`. Commit tardif avant le push (`D-518`).

## 2. Objectif

Porter dans `D-565` l'amendement daté demandé par le responsable (liste commune `20261126-0005-b`), validé mot pour mot (`20261126-0030-b`).

## 3. Décisions prises

- Paragraphe « Amendée le 2026-11-26 » en fin de `D-565`, Statut inchangé, texte commité tel que validé, sans retouche.
- §2.1 : `Q_INF_03` est le questionnaire DNSM ; le questionnaire de mode de vie est `Q_MOD_01`.
- §7 : chiffres du rejeu par le moteur à la place de l'approximation (+23 et -5, `D-548` §2.8) ; comptes d'approbations rendus lisibles (9, 5 en tête de chaîne, 2 ancrées sur la version active, seules à réapprouver) ; réponses `20261125-1710-b` et `20261125-1711-b` citées.

## 4. Fichiers modifiés

- `docs/decisions/D-565.md` (paragraphe d'amendement en fin de fichier) ; `changelog.d/2026-11-26-d565-amendement-impact-rejoue.md` ; journal H15 `2026-11-26-01` ; ce handoff.

## 5. Validations exécutées

- Documentation seule : `npm run check` vert. CI, preuve PR-Agent et sonde consignées à la déclaration « prête » sur la PR.
- Comptage des approbations de diffusion relu en lecture seule et en agrégats (conteneur de production) : 9 approbations sur 3 dossiers, 5 en tête de chaîne, 2 ancrées sur la version active avec la même empreinte, 3 sur un brouillon remplacé.

## 6. Problèmes ouverts

- Déploiement du lot de code (#2367) : constat de la version servie (v20/v21).
- Réapprobation des 2 protocoles diffusés par le praticien (`D-548` §5.4, `D-329` §4) ; liste préparée en lecture seule, jamais exécutée.
- P25 du besoin 8 : amendement de `D-567` à sa signature, hors de ce lot.

## 7. Prochaine action exacte

Intégrateur : merge de la PR déclarée « prête @sha ». Ensuite, après le déploiement, constat de la version servie, puis réapprobation par le praticien.

## 8. Interdits encore actifs

Aucune signature ni rejet ; aucune écriture en production ; aucune identité ni texte de claim au dépôt ; un merge à la fois et la session ne merge pas ; la réapprobation des protocoles est un geste du praticien.
