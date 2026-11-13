### CI : la documentation lue par le code joue ses tests ; l'outillage seul ne construit plus (2026-11-13)

Consigne du responsable du 2026-11-13 : alléger le CI au maximum, sans rien
retirer de sûr. La mesure faite pour cela a d'abord trouvé un trou.

- **Trou fermé.** Une PR qui ne touchait que `docs/decisions/`,
  `docs/claude/propositions/`, `docs/claude/corpus/` ou les supports d'une
  campagne était classée « documentaire » et ne jouait aucun test. Or une
  route praticien et une dizaine de gardes de textes patients lisent ces
  fichiers : 57 PR sur les 300 dernières étaient dans ce cas. Elles jouent
  désormais type-check, Vitest et lint (`unitaires`), sans build ni E2E.
- **Allègement.** Une PR qui ne touche que `scripts/`, `.claude/`,
  `changelog.d/` et de la documentation non lue saute type-check, Vitest,
  build et E2E. `controles`, qui joue les bancs de cet outillage et des
  crochets, est inchangé. Exception : `scripts/wn-playwright-apt.mjs`, que le
  job `e2e` exécute.
- **Plafonds de durée** par job (`controles` et `typage-tests` 25 min, `e2e`
  40 min, `verify` 5 min) : un run bloqué ne tourne plus six heures.
- Banc : `scripts/ci-invariants.test.mjs` exécute le bloc du périmètre, tel
  qu'écrit dans `ci.yml`, sur quinze diffs fabriqués, et vérifie que chaque
  job suit sa sortie et porte un plafond.

Bilan honnête : en minutes, l'effet net est proche de zéro, voire légèrement
positif (plus de tests sur les PR de décisions). Aucun allègement sûr ne
change l'ordre de grandeur de la consommation ; le dépôt reste public.
`verify`, sa protection de branche et `controles` ne changent pas.
