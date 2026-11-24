# Handoff — orchestrateur cloud : plus de plafond quotidien (2026-11-24)

## 1. Branche et état Git

- Branche `chore/orchestrateur-sans-plafond`, tirée d'`origin/main` à 4ca99cfd (après #2319), dans le worktree
  `.claude/worktrees/orch-ci`. La branche de la partie 14 (`chore/autonomie-pieges-partie14`) est périmée :
  #2314 est mergée.
- Commit tardif, juste avant le push (D-518).

## 2. Objectif

Retirer le plafond de 4 lots par jour du script de passe de l'orchestrateur cloud, sur la parole du responsable
du 2026-11-24 : « le plafond de 4 lots par jour est trop peu, pas de limite ».

## 3. Décisions prises

- **Retrait pur, pas de nouvelle valeur** : `PLAFOND_JOUR` et le code `plafond` disparaissent. Le compteur
  `prises_du_jour` reste au journal.
- **Rien d'autre ne bouge** : plage horaire, un lot par passe, garde de tête (aucun lot `cloud` pris sans PR,
  aucune intention en vol), arrêt de soi, interrupteur, plafond cloud d'une session vivante par file.
- **D-540 amendée** (section finale datée, ligne d'en-tête) : plafond retiré ; point 4 de l'amendement du
  2026-11-21 constaté (push et PR depuis une passe : #2318, #2319) ; lots 98 et 99 laissés à la voie Mac
  (`deja_tente`), aucune ligne de registre effacée.
- **Risque** : P1 (orchestration). Revue : `/code-review medium`, puis PR-Agent → 0.
- **Verdicts de la revue `/code-review medium`** :
  - la consigne `ORCHESTRATEUR_PASSE.md` disait encore « au plus 4 lots pris par jour » : corrigé (elle prime
    pour une session de passe, l'oubli aurait annulé le retrait) ;
  - D-540 §7, motif « plafond » du journal, en-tête : nommés caducs dans l'amendement, corps non réécrit
    (convention des amendements de D-540) ;
  - « plus aucune borne écrite dans le script, proposer un délai entre deux prises » : écarté, le responsable a
    demandé « pas de limite » ; la cadence horaire, un lot par passe et la garde de tête restent ;
  - assertion `notEqual(code, 'plafond')` sans portée : retirée ;
  - ligne de `ROLES_MACHINES.md` ambiguë : réécrite.

## 4. Fichiers modifiés

- `scripts/wn-orchestrateur-passe.mjs` (constante, garde, en-tête des codes)
- `scripts/wn-orchestrateur-passe.test.mjs` (cas « aucun plafond »)
- `docs/decisions/D-540.md` (en-tête, amendement du 2026-11-24)
- `docs/ROLES_MACHINES.md` (ligne du plafond)
- `docs/claude/templates/ORCHESTRATEUR_PASSE.md` (valeurs de départ)
- `changelog.d/2026-11-24-orchestrateur-sans-plafond.md`, ce handoff

## 5. Validations exécutées

- Banc `wn-orchestrateur-passe` : 21 sur 21.
- Mutation inverse : la garde `prises.length >= 4` remise, le cas neuf rougit (vérifié puis rétabli).
- T1 complet (`npm run check`) : code 0 ; `check:rapide` rejoué après les correctifs de revue : code 0.

## 6. Problèmes ouverts

- Pilote cloud en marche depuis le 2026-11-24, 12 h 36 (heure de Paris). Deux lots menés jusqu'au merge
  (`wn-cycle-libelle-gh` #2318, `masquage-test-seuil-50ms` #2319).
- Lots `registres-reponses-controle` et `superviseur-protection-fusion` : `pret`, signalés pour le Mac
  (`deja_tente`). À prendre par une session du Mac, ou à relancer en cloud sur décision du responsable.
- Un verdict « demande » d'un crochet, en cloud, passe par le classifieur du mode Auto : délai constaté
  (12 h 59 → 13 h 27), pas de blocage. À surveiller.
- Lot `autonomie-pieges-restes` : piège suivant « SESSION_LOG réordonné » (handoff p14 §6).

## 7. Prochaine action exacte

1. T1 complet, commit, push, PR (`--body-file`), `wn-attendre-ci` en fond.
2. PR-Agent → 0, verdict cité pour chaque focus area (garde 26).
3. « prête @<sha> » sur la PR et au registre (boîte `integrateur`), puis plus aucune écriture sur la PR.

## 8. Interdits encore actifs

- Ni migration, ni schéma, ni clinique, ni donnée patient. Pas de `prisma format`.
- Rien d'édité dans `web/src/lib/clinical/`. Aucune écriture en production ; aucun `workflow_dispatch` de
  `release-db`.
- Ne jamais supprimer une ligne des registres.
- `orchestrateur/arret` : seule la parole du responsable le change.
- Aucune adresse de page privée dans le dépôt. Horodater en lisant l'heure système.
