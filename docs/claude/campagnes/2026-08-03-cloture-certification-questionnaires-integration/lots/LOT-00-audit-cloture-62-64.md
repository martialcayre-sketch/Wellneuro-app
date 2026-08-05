---
id: "LOT-00"
titre: "Audit de clôture 62/64 et source de vérité unique"
statut: "livré"
dépend_de: "—"
---

# LOT-00 - Audit de clôture 62/64 et source de vérité unique

Statut : livré. Le lot est resté documentaire et n'a modifié ni le scoring,
ni les seuils, ni les surfaces runtime cliniques.

## Livré

- Audit de référence : `AUDIT_64_64.md`.
- Source de vérité arrêtée pour le `64/64` : `docs/claude/corpus/instrument_registry.json`.
- Table de pilotage 64/64 produite, avec statut registre, statut matrice,
  statut runtime, et affectation des suites `LOT-01` / `LOT-02`.
- Écart central nommé : la matrice Drive n'est plus la bonne surface pour lire
  l'avancement final de montée en certification.
- Cible documentaire du chantier explicitée : `64/64 clôturés`, pas
  `64/64 certifiés`.

## Constats majeurs

- `Q_PED_03` reste `suspendu` au registre, `actif: false` au catalogue, et sort
  donc de ce lot pour `LOT-02`.
- `Q_GEO_04` reste `contenu_verrouille` au registre, mais déjà visible en
  `PASSATION_PRATICIEN` tout en restant `actif: false` ; l'assignation est donc
  fermée et l'usage praticien borné. Il sort de ce lot pour `LOT-01`.
- `Q_FIB_03` et `Q_SOM_09` ne sont pas réinterprétés comme des « restants » de
  la campagne : ils sont explicitement exclus du cœur du débat.

## Tests et validations

- `node scripts/wn-campaign-audit.mjs --no-fail`
- `git diff --check -- docs/claude/campagnes/2026-08-03-cloture-certification-questionnaires-integration`

## Validation différée si un lot suivant touche le runtime

- `cd web && npm run scoring-check`
- `cd web && npm run check`
- `cd web && npm run test:worktree` si un lot modifie `questions.ts`,
  `questionnaires-catalog.ts`, `bibliotheque.ts` ou le garde registre.

## Done

- [x] Une table `64/64` existe et supprime toute ambiguïté sur les deux cas restants.
- [x] Les surfaces runtime à modifier sont listées et priorisées.
- [x] Le lot conclut explicitement que la cible doit être `64/64 clôturés`.

## Points de vigilance

- Ne pas relire la matrice Drive comme si elle portait à elle seule l'état final
  du registre v2.
- Ne pas corriger `Q_PED_03` ou `Q_GEO_04` dans ce lot : ils ont maintenant une
  file d'attente explicite.
