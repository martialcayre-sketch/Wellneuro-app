---
id: "LOT-01"
titre: "Validation ciblée des claims d'intervention"
statut: "à_faire"
dépend_de: "LOT-00"
palier: "T3"
---

# LOT-01 — Validation ciblée des claims d'intervention

## But

Faire signer les 755 claims en attente **des seules sources du registre LOT-00**,
pour que la couche intervention devienne servable sans toucher à la porte D-003.

## Pourquoi ce ciblage plutôt que l'Atelier v2

La demande initiale visait à « utiliser les claims même s'ils ne sont pas
validés ». Mesure faite, ce n'est pas nécessaire : le déficit sur la couche
intervention est de **755 claims**, pas de 2982. À 1-2 min pièce
(`docs/claude/corpus/VALIDATION_CLAIMS_DEUX_VITESSES.md`), c'est de l'ordre de la
journée de travail praticien — la revue individuelle passe l'échelle, ce qu'elle
ne fait pas sur le corpus entier.

Et la voie rapide ne s'appliquerait pas de toute façon : elle est réservée aux
claims déclarés/observés **non prescriptifs**, or **54 % de ces claims sont
prescriptifs**. Ils relèvent de la revue pièce à pièce quelle que soit la
procédure retenue.

## Résultat observable

En base de production, sur les sources du registre LOT-00 :

```sql
SELECT count(*) FILTER (WHERE statut = 'VALIDE')  AS valide,
       count(*) FILTER (WHERE statut <> 'VALIDE') AS attente
FROM rag_corpus_claims WHERE active AND source_id IN (<registre LOT-00>);
-- attendu : 2002 / 0   (état au cadrage : 1247 / 755)
```

## Périmètre

Les 755 claims en attente, répartis :

| Notebook | Claims en attente |
|---|---:|
| 11 — Cas complexes | 242 |
| 05 — Cognition et mémoire | 235 |
| 06 — Douleurs chroniques | 168 |
| 12 — Audit des contradictions | 60 |
| 07 — Axe intestin-cerveau | 50 |

La porte D-003 ne bouge pas : `validateur` et `valide_at` posés sur **chaque**
claim, modalité de revue tracée et distinguable en audit.

⚠ **Ne pas prioriser sur `prescriptiveDeclaree`.** Le champ `prescriptive` de
`source_registry.json` est faux sur 52 des 95 sources du registre — déclarées non
prescriptives alors qu'elles portent 640 claims prescriptifs (64 % du total).
L'erreur va toujours dans le même sens, jamais l'inverse. Seul le `prescriptif`
au niveau du **claim** fait foi pour décider d'une voie de revue.

## Hors périmètre

- L'Atelier v2 et les ~2225 claims restants du corpus — chantier distinct.
- Toute modification de `match_wellneuro_rag_claims`.
- Toute exposition d'un claim non signé, praticien compris.

## Fichiers probables

- `web/src/lib/rag/claims/validation.ts`, `revue.ts`, `verification.ts`
- surface Atelier praticien existante
- `docs/claude/corpus/VALIDATION_CLAIMS_DEUX_VITESSES.md` (trace de la modalité)

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas d'assouplissement du fail-closed.
- Pas de signature de lot masquant l'absence de signature par claim.
- Pas de refactor hors lot.

## Étapes

- [ ] Extraire la liste exacte des 755 claims depuis le registre LOT-00 (95 `sourceId`).
- [ ] Vérifier que la surface de revue les présente avec leur verbatim source.
- [ ] Mener la revue (geste praticien).
- [ ] Relire la base : compteur `2002 / 0` sur le périmètre.
- [ ] Consigner la modalité de revue employée.

## Tests

- `npm run test:worktree` (T3 — le lot touche au corpus).
- Test de non-régression : un claim `EN_ATTENTE_VALIDATION` reste invisible de
  toute surface, y compris après extension du registre.

## Critères de done

- [ ] `2002 / 0` vérifié en base après merge, pas supposé.
- [ ] Chaque claim signé porte `validateur` et `valide_at`.
- [ ] La modalité de revue est tracée et auditable.
- [ ] Revue adversariale `wn-reviewer` passée.

## Résultats

À compléter à la clôture.
