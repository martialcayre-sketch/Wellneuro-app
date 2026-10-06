### Faits du laboratoire : l'intervalle imprimé exempté de la sentinelle, comme la marque — BIO-INGEST LOT-07, lot de suite (2026-10-06)

- **Pourquoi.** Un intervalle imprimé porte les mots du laboratoire
  (« anormal au-delà de … », « risque élevé si … »). Sans exemption, la
  sentinelle BP-01 l'aurait refusé sur la première surface patient, ou poussé
  à le réécrire. Arbitrage du responsable du 2026-10-06, précision datée de
  `D-267` §6.
- **Restitution.** L'intervalle est rendu dans son propre élément
  `data-fait-laboratoire="intervalle"`, qui ne contient que le champ brut.
  Le texte affiché et la mise en forme ne changent pas.
- **Sentinelle.** `assertSentinelleBiologie` exempte ces deux éléments, et eux
  seuls, à condition qu'ils ne portent ni enfant ni attribut autre que le
  marqueur. Tout autre `data-fait-laboratoire` reste lu.
- Bancs : `sentinelle-marquage.spec.ts` (intervalle exempté et rendu intact ;
  enfant, classe ou style sur l'intervalle ⇒ rouge ; marqueur inconnu non
  exempté) ; `EstimeMesurePanel.test.tsx` (un seul élément d'intervalle, sans
  attribut ni enfant, sélecteurs égaux au helper e2e) ;
  `ImportCompteRenduPanel.test.tsx`.
