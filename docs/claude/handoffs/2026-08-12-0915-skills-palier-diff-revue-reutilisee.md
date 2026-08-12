# Handoff — 2026-08-12 — Chaîne de skills : palier au diff, revue réutilisée

## Branche et état Git

- Branche : `claude/wn-sequences-redundancy-a3h1tu` (session distante), basée
  sur `origin/main` = `a83adfac` (freshness vérifiée au démarrage).
- Diff purement documentaire : deux `SKILL.md`, un fragment `changelog.d/`,
  `SESSION_LOG.md`, ce fragment.

## Objectif

Appliquer les trois retouches issues de l'audit de redondance de la chaîne
(routage → lot → clôture → PR → merge), rejoué sur le déroulé réel du LOT-01
chaîne T0 (PR #656, #659).

## Décisions prises

- **Palier au diff, pas au lot** (`wn-lot`, étape 4) : un diff purement
  documentaire reste à T1 même dans un lot classé T2/T3 — la suite ne lit pas
  un `.md` et le CI rejoue tout. Cas fondateur cité : T3 complet de 3 min 47
  joué pour la PR #656, purement documentaire.
- **Bloc « risques » réutilisable** (`wn-lot`, étape 5) : la revue l'émet, la
  description de PR le distille.
- **Revue non relancée** (`wn-pr`) : des constats `wn-reviewer` du diff
  courant présents dans la conversation se distillent ; un agent ne se lance
  que si aucune revue du diff n'existe — l'idiome « si elle n'a pas déjà eu
  lieu » déjà appliqué au merge. Codifie la pratique observée sur la PR #659.
- **Tests rappelés, pas rejoués** (`wn-pr`) : seule une modification du diff
  depuis le dernier run justifie une nouvelle exécution.

## Validations exécutées

- `skill-cross-invocation` : 27 skills, aucune référence non marquée
  (52 mentions déclarées).
- `check_no_secrets.sh` : OK.

## Problèmes ouverts

Aucun. Le verdict d'audit complet (recharges CLI non redondantes, passes de
revue toutes rentables) est dans l'entrée `SESSION_LOG` du même jour.

## Prochaine action exacte

PR de doc de cette branche, CI, merge selon le régime courant.

## Interdits encore actifs

- Aucun skill ne peut en invoquer un autre : toute nouvelle mention `/wn-x`
  dans un `SKILL.md` porte son marqueur `mention-seule` nommant sa cible.
- `SESSION_LOG.md` append-only ; les fragments de handoff ne s'écrasent pas.
