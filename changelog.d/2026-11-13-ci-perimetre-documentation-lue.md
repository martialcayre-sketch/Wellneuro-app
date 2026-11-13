### CI : la documentation lue par le code joue ses tests ; une PR de crochets ou de changelog ne construit plus (2026-11-13)

Consigne du responsable du 2026-11-13 : alléger le CI au maximum, sans rien
retirer de sûr. La mesure faite pour cela a d'abord trouvé un trou.

- **Trou fermé.** Une PR qui ne touchait que des décisions, des propositions
  de textes, le corpus, des supports ou cadrages de campagne,
  `docs/FEATURE_FLAGS.md` ou `docs/DOSSIER_RGPD.md` était classée
  « documentaire » et ne jouait aucun test. Or une route praticien et des
  gardes (textes patients, drapeaux, sites d'appel IA) lisent ces fichiers :
  57 PR sur les 300 dernières étaient dans ce cas. Elles jouent désormais
  type-check, Vitest et lint (`unitaires`), sans build ni E2E.
- **Recensement automatique.** `scripts/ci-invariants.test.mjs` relève les
  documents que `web/` lit et rougit si l'un d'eux échappe à la règle.
- **Allègement, sur PR seulement.** Une PR qui ne touche que `.claude/`,
  `changelog.d/` et de la documentation non lue saute type-check, Vitest,
  build et E2E. Une PR d'outillage racine (`scripts/`) saute build et E2E
  mais joue Vitest, dont des gardes parcourent ce dossier. Sur `push` de
  `main`, dont le vert déploie la tête, l'outillage garde l'E2E.
  `controles` est inchangé ; `scripts/wn-playwright-apt.mjs`, exécuté par
  le job `e2e`, reste du code.
- **Plafonds de durée** par job (`controles` et `typage-tests` 25 min, `e2e`
  40 min, `verify` 5 min) : un run bloqué ne tourne plus six heures.
- Banc : le bloc du périmètre est exécuté tel qu'écrit dans `ci.yml` sur des
  diffs fabriqués, en PR comme en `push`, diff vide compris ; quatre
  mutations du bloc le font rougir.

Bilan : en minutes, l'effet net est proche de zéro, voire légèrement
positif, car les PR de décisions jouent désormais leurs tests. Aucun
allègement sûr ne change l'ordre de grandeur de la consommation ; le dépôt
reste public. `verify`, sa protection de branche et `controles` ne
changent pas.
