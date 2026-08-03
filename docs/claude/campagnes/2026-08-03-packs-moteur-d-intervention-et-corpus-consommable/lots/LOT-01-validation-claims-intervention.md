---
id: "LOT-01"
titre: "Validation ciblée des claims d'intervention"
statut: "livré"
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

- [x] `2002 / 0` vérifié en base — **lu, pas supposé** (2026-08-03).
- [x] Chaque claim signé porte `validateur` et `valide_at` — 2002 / 2002.
- [x] La modalité de revue est tracée et auditable.
- [ ] Revue adversariale `wn-reviewer` passée. — à cocher **après** la revue,
      pas avant.

## Résultats

**Ce lot n'a pas été exécuté : il a été rattrapé par le geste praticien.** La
revue des 755 claims a eu lieu **le 2026-08-03**, hors de la machinerie de
campagne. Constaté au cadrage par lecture de la base de production, non par
lecture du fichier de lot.

| Mesure | Valeur |
|---|---|
| Périmètre des 95 sources du registre LOT-00 | **2002 VALIDE / 0 en attente** |
| Corpus actif entier | **8224 / 0** |
| `validateur` et `valide_at` renseignés | 2002 / 2002 |
| Validateurs distincts | 1 — `martialcayre@wellneuro.fr` |
| Fenêtre de signature | 2026-07-23 → 2026-08-03 |
| Signés le 2026-08-03 | **755**, dont 367 prescriptifs |

Le résultat observable du lot (`2002 / 0`) était donc **déjà atteint avant
l'ouverture du lot**, et trois de ses quatre critères de done avec lui.

**Ce qui restait, et qui a été livré** : le test de non-régression que le lot
demandait — « un claim `EN_ATTENTE_VALIDATION` reste invisible de toute
surface ». Aucun banc ne le couvrait. Il est d'autant plus nécessaire que le
compteur est à zéro : sans claim en attente en production, rien ne signalerait
une régression de la barrière avant la prochaine ingestion, qui en recréera —
`store.ts` insère toujours en `EN_ATTENTE_VALIDATION`.

`web/prisma/checks/rag_claim_barriere_d003_v1.sql` éprouve
`match_wellneuro_rag_claims`, seule voie de restitution, par cinq fixtures sur
une base CI construite vide (d'où fixtures + `ROLLBACK` : un contrat purement
observateur y passerait par vacuité).

**Trois constats du lot, à ne pas redécouvrir :**

1. **Deux des cinq conditions de la barrière ne sont pas falsifiables par
   fixture** — `patient_identifiable = false` et `compartment = 'ACTIF'` sont
   tenues par des `CHECK` de table. Un `INSERT` qui les viole échoue à
   l'`INSERT`, pas à l'assertion : le test ne dirait pas ce qu'il croit dire.
   Elles sont donc assérées **structurellement** dans `pg_constraint`.
2. **Un embedding de fixture nul rendrait le contrat vert quoi qu'il arrive.**
   Le patron copié ailleurs (`repeat('0,', 1535)`) donne un vecteur nul, dont la
   distance cosinus est indéfinie : `1 - (embedding <=> query)` vaut `NaN`, le
   seuil de similarité est faux, et le contrôle positif ne remonte jamais.
   Vecteur `[1,0,…,0]`, requête identique.
3. **L'ordre des assertions décide de ce qu'un échec raconte.** Écrites
   compte-d'abord, les quatre assertions par cas étaient **inatteignables** —
   un compte de 1 valant la fixture A implique l'absence de B, C, D et E.
   Mesuré en falsifiant B : l'échec rendait une disjonction (« non signé,
   désactivé ou orphelin ») au lieu de nommer le coupable. Réordonné.

**Preuve que le garde mord** — quatre falsifications jouées contre la base
éphémère, chacune produisant le message attendu, le témoin restant vert :

| Falsification | Message obtenu |
|---|---|
| B passée en `VALIDE` | « B (EN_ATTENTE_VALIDATION) remonte — statut <> VALIDE n'est plus filtré. » |
| D passée en `active=true` | « D (VALIDE, active=false) remonte — active=false n'est plus filtré. » |
| E dotée d'une jonction | « E (VALIDE, active=true, sans jonction) remonte — orphelin de source. » |
| A privée de sa jonction | « 0 ligne(s) remontée(s) […] une condition de la barrière a changé. » |

La dernière prouve que le **contrôle positif n'est pas stérile** : une fonction
cassée rendant zéro ligne est détectée, et non déclarée conforme.

**Câblage vérifié par exécution, pas par lecture** : `wn-test-worktree.sh`
extrait la liste des contrats depuis `ci.yml` par `sed`. `ci.yml` en déclarait
**11** avant ce lot et **12** après ; les **12 ont été joués** au palier T3, le
nouveau nommément présent dans le journal. Un fichier posé
dans `prisma/checks/` sans étape dans `ci.yml` ne tournerait nulle part —
précédent dans le dépôt : `c4_referentiel_provenance_v1.sql`.

**Arbitrage pris en session** : quatre modules lisent les claims sans filtrer
`statut` (`revue.ts`, `recherche.ts`, `questionnaire.ts`, `evaluation.ts`). Ce
sont l'établi de validation, pas une restitution clinique. Ils sont **documentés
comme légitimes** dans `VALIDATION_CLAIMS_DEUX_VITESSES.md` plutôt que gardés
par du code — un garde par `grep` sur le dépôt serait fragile.
