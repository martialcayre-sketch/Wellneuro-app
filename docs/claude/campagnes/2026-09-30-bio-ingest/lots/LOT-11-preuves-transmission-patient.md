---
id: "LOT-11"
titre: "Preuves de la transmission patient : E2E portail, accessibilité, plafond concurrent"
statut: "à_faire"
dépend_de: "LOT-04"
---

# LOT-11 — Preuves de la transmission patient

## But

Prouver par des tests rejouables ce que le LOT-04 a livré sans le prouver de
bout en bout. C'est la réserve de clôture du LOT-04 (2026-10-10).

## Résultat observable

- Un E2E portail où un patient de fixture dépose un compte rendu, depuis le
  lien magique jusqu'au statut « reçu ». Il est joué en CI.
- Un contrôle d'accessibilité de l'écran de transmission. Relecture manuelle
  tracée : clavier seul, libellés lus par un lecteur d'écran, erreurs
  annoncées. Contrôle `@axe-core/playwright` limité à cette page, joué en CI.
- Un banc sur base réelle (Postgres local) qui prouve que deux dépôts
  simultanés ne franchissent pas le plafond de 3 documents non purgés
  (`D-269`).

## Périmètre

Tests seuls, plus les corrections que ces tests révèlent sur la surface du
LOT-04. Une dépendance de dev neuve, `@axe-core/playwright`, est acceptée par
le responsable le 2026-10-10. C'est la première dans le dépôt.

## Hors périmètre

- L'E2E de l'écran d'import praticien.
- Le passage d'axe-core sur d'autres pages.
- Tout changement de règle du LOT-04 : plafonds, types, rétention.

## Interdits

- Fixtures seules (Sophie Nicola, Jennifer Martin, Michel Dogné). Aucun
  dossier réel visé par un seed ou un E2E (`D-075`).
- Aucune écriture dans `resultats_biologiques`.
- Pas de `retries` Playwright (`D-049`).
- Aucune migration.

## Tests

Le lot est lui-même des tests. Il passe par le palier T3 (E2E Chromium et
WebKit), et par les contrats SQL pour le banc de concurrence.

## Critères de done

Les trois preuves sont vertes en CI, ou le défaut qu'elles révèlent est
corrigé dans le lot ; la relecture manuelle est tracée dans la fiche.

## Résultats

À compléter à la clôture.
