---
id: "LOT-05"
titre: "Validation transverse et handoff"
statut: "livré"
dépend_de: "LOT-04"
---

# LOT-05 - Validation transverse et handoff

## Périmètre

- Rejouer les validations adaptées au périmètre réel des lots exécutés.
- Finaliser la documentation de clôture : statut `64/64`, limites résiduelles, impacts runtime, consignes de reprise.
- Préparer la revue indépendante si un lot a touché certification clinique, assignation ou orientation.

## Interdits

- Aucun ajout fonctionnel opportuniste.
- Aucune déclaration de test non exécuté.
- Aucun mélange avec un autre chantier questionnaires.

## Tests et validations

- `cd web && npm run check`
- `cd web && npm run test:worktree -- --fast` pour tout lot UI/API.
- `cd web && npm run test:worktree` si un lot touche scoring clinique ou logique de certification profonde.
- `node scripts/wn-campaign-audit.mjs --no-fail` pour relire la conformité documentaire de la campagne.

## Réalisation

- Corrections d'hygiène markdown appliquées sur les livrables de campagne
  (style de tableaux compact + heading H1 du fragment LOT-03).
- Revue stricte du diff LOT-04 effectuée sur le périmètre code/tests/docs ;
  aucun risque P0/P1 identifié dans les gardes fail-closed ajoutées.
- Validation transverse rejouée de bout en bout sur l'état courant du worktree.

## Résultat

- `cd web && npm run check` : vert.
- `cd web && npm run test:worktree -- --fast` : vert (108 passés, 2 skip).
- `node scripts/wn-campaign-audit.mjs --no-fail` : vert, 1 warning legacy
  hors campagne (duplicate lot ordinal dans une campagne 2026-07-11).
- Le lot est clôturé avec handoff documenté et campagne relisible sans contexte oral.

## Done

- La campagne peut être relue sans contexte externe.
- Les validations exécutées sont consignées précisément.
- Les prochaines actions sont nulles ou explicitement listées.

## Points de vigilance

- Une clôture documentaire `64/64` ne vaut pas autorisation clinique universelle ; cette limite doit rester lisible dans les livrables finaux.
