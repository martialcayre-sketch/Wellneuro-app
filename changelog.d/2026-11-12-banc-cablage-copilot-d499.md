### Outillage : banc de câblage du lecteur Copilot accordé à D-499 (2026-11-12)

- Depuis `D-499` (#2017), le skill `wn-merge` et la règle de revue §1.6 ne
  prescrivent plus `scripts/wn-revue-copilot.mjs` : Copilot n'est plus
  demandé ni un recours. Le banc `scripts/wn-revue-copilot.test.mjs`
  attendait encore ce câblage et rougissait T1 complet en local (`npm run
  check`) ; il vérifie désormais que `D-468` nomme toujours le lecteur, et que
  `wn-merge` et la règle §1.6 citent `D-499` et `wn-revue-pr-agent.mjs` sans
  prescrire le lecteur Copilot. Le lecteur lui-même est inchangé.
