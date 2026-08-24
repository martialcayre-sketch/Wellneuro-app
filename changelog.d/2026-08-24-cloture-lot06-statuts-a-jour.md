### Clôture du LOT-06 : les statuts rattrapent la signature (2026-08-24)

Aucun code. La signature `D-104` avait basculé `DC-54` et `DC-55`, mais trois
écrits disaient encore l'état d'avant — et c'est précisément ce qu'une clôture
existe pour rattraper.

- **`DC-55` portait encore l'étiquette « Proposition »** alors que sa propre note
  finale conclut « la règle bascule donc avec `DC-54` ». Une règle dont le
  libellé contredit son corps se lit au libellé : l'étiquette passe à **Acté
  `D-103`, `D-104`**, et le paragraphe antérieur est conservé, marqué comme
  l'état d'avant le LOT-06 — il dit « manque le déclencheur », ce qui n'est plus
  vrai depuis `conflitsSourcesEngine.ts`.
- **`.claude/rules/clinique-scoring.md`** annonçait `DC-54`/`DC-55` comme
  « proposition, pas encore opposable, `D-041` la réserve jusqu'au banc ». Ce
  fichier est rechargé à chaque session sur les chemins cliniques : le laisser
  faux revenait à rappeler l'inverse de la doctrine en vigueur à chaque tour. Il
  dit maintenant **acté et opposable**, avec les deux limites signées.
- **La fiche de campagne** portait « Registre livré NON SIGNÉ : `DC-54`/`DC-55`
  ne basculent pas ». Corrigée, et augmentée du fait de production : déployé le
  2026-08-24 à 05:19 (`a7ed2c7e`), release-db vérifiée verte à 05:40.

Le pointeur de campagne passe de `LOT-06` à `LOT-07` (`CAMPAGNE.md` et
`.wn/state.json`) : ce n'est pas un arbitrage, c'est le seul lot restant avant
le LOT-08 de clôture.

**Non fait, et volontairement** : la matrice à quatre colonnes de
`AUDIT_DOCTRINE_CHAINE_T0.md` (`DC-54` « absent », `DC-55` « partiel ») n'est
pas recomputée ici — « matrice reconduite » est le périmètre explicite du
LOT-08.
