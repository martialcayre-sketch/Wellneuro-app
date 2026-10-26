### r3_15 (F9a, H64) : le radar des 12 besoins devient décoratif ; la table porte tout (2026-10-26)

- Arbitrages du responsable du 2026-10-25 (F9a détaché de J3-12b, #1706) :
  le radar de l'onglet « Les 12 besoins » est masqué au lecteur d'écran
  (`aria-hidden`) et sort de la tabulation (couche d'accessibilité de
  recharts coupée, qui en faisait un arrêt `role="application"`). Ses
  graduations gardent leurs anneaux et perdent leurs nombres, dans les deux
  modes, comme en mode consultation. Aucune phrase de résumé, aucune phrase
  d'état au-dessus de la figure.
- La table dit ce que disaient les axes. Elle reçoit une légende lue par le
  lecteur d'écran (« Couverture des 12 besoins, de B1 à B12, par strate »).
  Le tiret d'un non mesuré reste à l'écran ([[D-301]] §1) et se lit « non
  mesuré ». « Source non enregistrée » y était déjà.
- Le repli « Source » sous la figure reste joignable et se nomme sans elle :
  « Source — ensemble des valeurs du tableau ». Le chargement de l'onglet
  s'annonce (`role="status"`), texte inchangé. Textes relus et validés par
  le responsable avant le code (2026-10-26).
- Rien d'autre : aucun calcul, aucune valeur tracée ni seuil, aucune
  migration, aucun drapeau ; tiroir et portail inchangés ; aucune décision
  nouvelle (H64 et les arbitrages du 2026-10-25 suffisent).
