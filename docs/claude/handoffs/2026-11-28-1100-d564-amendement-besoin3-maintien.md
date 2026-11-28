# Handoff — J3-12f, amendement daté de D-564 : besoin 3, `PRIO-PON-01` et lecture « discordance » de D-040 maintenues (documentation seule) (2026-11-28)

## 1. Branche et état Git

- Branche `docs/d564-amendement-besoin3-maintien`, tirée d'`origin/main` (8390f5ea8) après le merge de #2409 (squash), dans le worktree `.claude/worktrees/agent-a81c34a8d1130b0ce`. Commit tardif avant le push (`D-518`).

## 2. Objectif

Porter dans `D-564` l'amendement daté qui clôt par maintien les deux points laissés ouverts au §6.2 (listes communes `20261128-0910-b` et `0911-b`), texte validé mot pour mot avec une correction (`20261128-0930-b`).

## 3. Décisions prises

- `PRIO-PON-01` : option A, `needIds` gardé tel quel ; l'écart de support (aucun claim ne nomme un rythme alimentaire) reste connu et documenté. Codex à l'aveugle : option B, confiance forte, non suivie.
- Lecture « discordance » de `D-040` : option A, seuils gardés et marqués « non évalués », revus à la première clôture réelle de 21 jours. Codex à l'aveugle : option C, confiance forte, non suivie.
- Aucun changement de calcul ni de version (`D-548` §4, amendée le 2026-11-25) ; aucun total ne bouge, aucun protocole diffusé n'est éteint.
- Guide des 12 besoins : la ligne « Ouverts, en l'état » devient « Maintenus, plus ouverts ».

## 4. Fichiers modifiés

- `docs/decisions/D-564.md` (paragraphe d'amendement en fin de fichier) ; `docs/claude/GUIDE_12_BESOINS_NEURONUTRITION.md` (ligne du besoin 3) ; `changelog.d/2026-11-28-d564-amendement-besoin3-maintien.md` ; journal H15 `2026-11-28-02` ; ce handoff.

## 5. Validations exécutées

- Documentation seule : `npm run check` (résultat consigné à la déclaration « prête » sur la PR). CI, preuve PR-Agent (ou `wn-reviewer`) et sonde consignées sur la PR.
- Constat en lecture seule du 2026-11-28 : la lecture « discordance » ne s'affiche que sur un épisode clôturé ; aucune mention « non évalués » ni à l'écran ni dans le code, hors un commentaire sur la révision à la clôture des 21 jours. Production, en agrégats : 0 épisode clôturé, 11 jours saisis sur 3 dossiers ; sur 22 dossiers portant une plainte, 9 déclenchent `PRIO-PON-01`.

## 6. Problèmes ouverts

- **Pour le prochain lot de code du §5.3** (sans version, aucun calcul) : écrire sous la lecture « discordance » de `AgendaAlimentairePraticienPanel.tsx` la phrase d'interface validée mot pour mot par le responsable (`20261128-0931-b`), sans aucune retouche :
  « Seuils de cette lecture non évalués ; à réviser à la première clôture réelle de 21 jours. »
  Elle n'est PAS codée dans ce lot.
- Recherche du §1.4 de `D-555` : rapport à recevoir du responsable. `WN_CONSTAT_BESOIN` éteint, constat au signal du coordinateur.
- P25 du besoin 8 (amendement de `D-567` à sa signature) ; code des sous-scores du besoin 10 ; issue du besoin 11.

## 7. Prochaine action exacte

Intégrateur : merge de la PR déclarée « prête @sha ». Ensuite, au prochain lot de code du §5.3, la phrase d'interface du §6 ci-dessus.

## 8. Interdits encore actifs

Aucune signature ni rejet ; aucune écriture en production ; aucune identité, aucun texte de claim ni seuil au dépôt ; un merge à la fois et la session ne merge pas ; le drapeau `WN_CONSTAT_BESOIN` n'est jamais allumé par la session.
