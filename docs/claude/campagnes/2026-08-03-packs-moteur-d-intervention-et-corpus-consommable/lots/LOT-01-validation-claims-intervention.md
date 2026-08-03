---
id: "LOT-01"
titre: "Validation ciblée des claims d'intervention"
statut: "livré — clos sur preuve en base le 2026-08-03 ; garde D-003 ajouté"
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
- [x] La modalité de revue est tracée et auditable — consignée dans
  `docs/claude/corpus/VALIDATION_CLAIMS_DEUX_VITESSES.md` : validateur unique,
  fenêtre 2026-07-23 → 2026-08-03, répartition par jour. La clôture du 2026-08-03
  au soir laissait ce critère décoché ; c'est ce lot qui le ferme.
- [x] Revue adversariale `wn-reviewer` passée — GO sous deux correctifs,
  appliqués. Elle avait un objet : ce lot ajoute un contrat SQL.

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

**Ce que la clôture du soir ne prouvait pas, et que ce lot ajoute** : la
modalité de revue. Elle est désormais tracée dans
`docs/claude/corpus/VALIDATION_CLAIMS_DEUX_VITESSES.md` — validateur unique
`martialcayre@wellneuro.fr`, fenêtre du 2026-07-23 au 2026-08-03, répartition
par jour (15 / 457 / 317 / 398 / 60 / **755**), et les surfaces qui voient
légitimement un claim en attente.

**Conséquence de cadrage pour la suite de la campagne** : la première porte
(D-003, validation praticien) est franchie **pour tout le corpus**. Le seul
déficit restant est la **seconde porte, le consommateur** — cf. LOT-02, et
`stress`/`humeur`/`sommeil` toujours mappés sans appelant.

---

## Le garde de la barrière D-003, livré par ce lot

**Ce qui restait, et qui a été livré** : le test de non-régression que le lot
demandait. Énoncé du lot : « invisible de toute surface » — à lire **surface de
restitution**, la nuance compte et la revue l'a exigée : l'établi de validation
voit légitimement les claims en attente, c'est son objet. Aucun banc ne couvrait
la fermeture. Il est d'autant plus nécessaire que le
compteur est à zéro : sans claim en attente en production, rien ne signalerait
une régression de la barrière avant la prochaine ingestion, qui en recréera —
`store.ts` insère toujours en `EN_ATTENTE_VALIDATION`.

`web/prisma/checks/rag_claim_barriere_d003_v1.sql` éprouve
`match_wellneuro_rag_claims`, seule voie de restitution, par sept fixtures sur
une base CI construite vide (d'où fixtures + `ROLLBACK` : un contrat purement
observateur y passerait par vacuité).

**Trois constats du lot, à ne pas redécouvrir :**

1. **Deux des cinq conditions ne sont pas falsifiables par FIXTURE** —
   `patient_identifiable = false` et `compartment = 'ACTIF'` sont tenues par des
   `CHECK` de table : l'`INSERT` échouerait avant l'assertion. Ce n'est pas une
   impossibilité (le DDL est transactionnel, on pourrait lever le `CHECK` dans
   la transaction) mais un **choix** : tant que le `CHECK` tient, le prédicat de
   la fonction est redondant, et la disparition du `CHECK` est attrapée
   structurellement. Une des deux couches tient toujours. Formulation corrigée
   à la revue, qui la trouvait trop absolue.
2. **Un embedding de fixture nul rendrait le contrat vert quoi qu'il arrive.**
   Le patron copié ailleurs (`repeat('0,', 1535)`) donne un vecteur nul, dont la
   distance cosinus est indéfinie : `1 - (embedding <=> query)` vaut `NaN`, le
   seuil de similarité est faux, et le contrôle positif ne remonte jamais.
   Vecteur `[1,0,…,0]`, requête identique.
3. **L'ordre des assertions décide de ce qu'un échec raconte — et je m'y suis
   repris à deux fois.** Écrites compte-d'abord, les quatre assertions par cas
   étaient **inatteignables** : un compte de 1 valant la fixture A implique
   l'absence de B, C, D et E. Mesuré en falsifiant B — l'échec rendait une
   disjonction au lieu de nommer le coupable. Réordonné… ce qui a déplacé le
   point mort sur le **contrôle positif** : après les quatre `EXISTS` et le
   compte, la ligne unique ne pouvait plus être qu'A, donc son assertion
   d'identité ne pouvait plus tirer. C'est la revue adversariale qui l'a vu,
   et ma propre table de preuve enregistrait le symptôme sans le nommer.
   Le contrôle positif passe désormais **en premier**.

**Preuve que le garde mord** — **sept** falsifications jouées contre la base
éphémère, une par assertion nommée, le témoin restant vert à chaque fois.
Chacune a rendu SON message, et aucune n'en a rendu un autre : c'est la preuve
qu'il ne reste plus d'assertion muette.

| Falsification | Assertion qui a tiré |
|---|---|
| A privée de sa jonction | CONTRÔLE POSITIF en échec — A ne remonte pas |
| B passée en `VALIDE` | B (EN_ATTENTE_VALIDATION) remonte |
| C passée en `VALIDE` | C (REJETE) remonte |
| D passée en `active=true` | D (VALIDE, active=false) remonte |
| E dotée d'une jonction | E (orphelin de source) remonte |
| filtre élargi à `WN-SRC-9997` | F (hors périmètre) remonte |
| vecteur de G rendu colinéaire | G (hors seuil de similarité) remonte |

Nuance à ne pas gommer : pour A→E la falsification porte sur la **fixture**,
donc sur la condition gardée elle-même ; pour F et G elle porte sur la
**requête d'assertion**, ce qui prouve l'atteignabilité de l'assertion, non le
retrait du prédicat de la fonction.

**Câblage vérifié par exécution, pas par lecture** : `wn-test-worktree.sh`
extrait la liste des contrats depuis `ci.yml` par `sed`. `ci.yml` en déclarait
**11** avant ce lot et **12** après ; les **12 ont été joués** au palier T3, le
nouveau nommément présent dans le journal. Un fichier posé
dans `prisma/checks/` sans étape dans `ci.yml` ne tournerait nulle part —
précédent dans le dépôt : `c4_referentiel_provenance_v1.sql`.

**Deux correctifs ajoutés à la revue.** Le contrat n'assérait rien sur ce qui
empêche de **contourner** la fonction : il prouvait que la porte ferme pendant
qu'on pouvait entrer par la fenêtre. Un `DROP FUNCTION` + `CREATE` (le
`CREATE OR REPLACE`, lui, conserve les grants) ou un `DISABLE ROW LEVEL
SECURITY` rendrait les claims en attente lisibles par PostgREST sans jamais
appeler la barrière. Sont désormais assérés : `EXECUTE` refusé à `anon` et
`authenticated` (conditionné à l'existence du rôle — vide en CI, mordant en
production, c'est le piège « REVOKE FROM PUBLIC ne révoque rien »), et la RLS
active sur les deux tables. Second correctif : deux fixtures de plus, F hors
périmètre et G hors seuil, pour que `filter_source_ids` et `min_similarity`
cessent d'être les deux seuls prédicats sans témoin — le premier est ce qui
enferme un rayon dans son notebook.

**Plage de sentinelles déplacée** en `WN-*-9998` : `rag_claim_decisions_journal_v1.sql`
occupe déjà `WN-CL-9999-001..004`, et la table porte `UNIQUE (claim_id,
version_claim)`. Sans conséquence aujourd'hui — transactions séparées — mais un
rejeu dans une transaction commune les ferait entrer en collision.

**Arbitrage pris en session** : quatre modules lisent les claims sans filtrer
`statut` (`revue.ts`, `recherche.ts`, `questionnaire.ts`, `evaluation.ts`). Ce
sont l'établi de validation, pas une restitution clinique. Ils sont **documentés
comme légitimes** dans `VALIDATION_CLAIMS_DEUX_VITESSES.md` plutôt que gardés
par du code — un garde par `grep` sur le dépôt serait fragile.
