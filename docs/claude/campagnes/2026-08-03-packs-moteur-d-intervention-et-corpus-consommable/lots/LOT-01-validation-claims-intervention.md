---
id: "LOT-01"
titre: "Validation ciblée des claims d'intervention"
statut: "livré — clos sur preuve en base le 2026-08-03, pas par exécution"
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

- [x] `2002 / 0` vérifié en base — a fortiori : **0 claim en attente dans tout le
  corpus**, donc 0 sur ce périmètre.
- [x] Chaque claim signé porte un `validateur` (0 `VALIDE` sans signature).
- [ ] La modalité de revue est tracée et auditable. — non vérifié par ce lot ; la
  revue a eu lieu hors campagne, dans l'Atelier.
- [ ] Revue adversariale `wn-reviewer` — sans objet : aucune ligne de code.

## Résultats

**Clos le 2026-08-03 sur preuve en base, sans avoir été exécuté comme lot.** La
revue praticien a été menée dans l'Atelier, en dehors de cette campagne, et est
allée bien au-delà du périmètre visé : ce ne sont pas les 755 claims des sources
du registre LOT-00 qui ont été signés, mais **le corpus entier**.

Relevé `execute_sql` du 2026-08-03 (soir), sur `rag_corpus_claims WHERE active` :

| claims actifs | VALIDE | en attente | VALIDE sans signature |
|--------------:|-------:|-----------:|----------------------:|
|         8 224 |  8 224 |      **0** |                 **0** |

Les douze notebooks 01→12 sont à 100 % : 01=415, 02=671, 03=486, 04=621,
05=1114, 06=651, 07=370, 08=758, 09=1145, 10=796, 11=781, 12=416. (Le 13
« Instruments » reste à 0 claim **par conception** : un instrument de mesure
n'est pas une assertion à certifier, il passe par le banc `certify`.)

Le tableau du périmètre ci-dessus — 242 en attente sur le notebook 11, 235 sur
le 05, 168 sur le 06, 60 sur le 12, 50 sur le 07 — est donc **périmé** ; il
décrit l'état au cadrage, conservé comme trace.

**Ce que ce lot ne prouve pas** : la modalité de revue employée n'a pas été
reconstituée ici (voie individuelle, voie rapide par source, revue en lot). Le
critère correspondant reste décoché — l'information est dans les journaux de
décision, pas dans ce document.

**Conséquence de cadrage pour la suite de la campagne** : la première porte
(D-003, validation praticien) est franchie **pour tout le corpus**. Le seul
déficit restant est la **seconde porte, le consommateur** — cf. LOT-02, et
`stress`/`humeur`/`sommeil` toujours mappés sans appelant.
