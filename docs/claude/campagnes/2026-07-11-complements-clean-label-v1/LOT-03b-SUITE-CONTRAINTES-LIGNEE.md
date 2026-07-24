# LOT-03b — Suite : contraintes de lignée `clinical_rules` (prérequis d'activation)

> **Origine** : revue adversariale de la PR #338 (atelier de règles cliniques),
> 2026-07-24. Verdict : **GO conditionnel**.
>
> - Merge de #338 en l'état : **acceptable** — fonctionnalité *dark*, flag
>   `WN_C4_ENABLED` fail-closed jamais posé en production. Append-only du
>   contenu, auth sur les 6 routes, fail-closed serveur, vocabulaire gouverné
>   (décision n°4) et étanchéité GRADE ↔ A/B/C/D : tous vérifiés et tenus.
> - **NO-GO pour passer `WN_C4_ENABLED` à `true` en production** tant que les
>   contraintes ci-dessous ne sont pas posées.
>
> Ce document spécifie la migration prérequise. Elle porte sur une **table
> existante** (`clinical_rules`) — acte plus sensible que les tables additives du
> catalogue (LOT-01) : revue adversariale + vérification de la base de production
> obligatoires, autorisation explicite en session pour toucher
> `prisma/migrations/`.

## Le défaut (B-1 de la revue)

Les invariants de **lignée** d'une règle clinique ne reposent aujourd'hui sur
**aucune contrainte base** — seulement des séquences lire-puis-écrire côté
application, non atomiques sous concurrence (Prisma est en READ COMMITTED par
défaut ; un `$transaction` sans contrainte unique ni `SELECT … FOR UPDATE` ne
sérialise rien). Conséquences atteignables par un simple double-clic ou deux
onglets :

- **Création** (`regles/route.ts:247-258`, hors transaction) : deux requêtes de
  même triplet (intention, ingrédient, type) lisent `count = 0` et créent
  chacune une v1 → deux lignées concurrentes.
- **Révision** (`regles/revision/route.ts:104-149`) : deux révisions lisent le
  même plafond `N` et créent chacune `N+1` → deux brouillons à la même version.
- **Validation** de ces deux brouillons : les deux passent `version_depassee` et
  signent → **deux versions validées actives** dans la lignée.

Amortisseurs existants (pourquoi ce n'est pas un NO-GO au merge dark) :
`resolution.ts` (`gagne`, tri version → date → id) ne sert jamais qu'une règle,
la plus récente, même en présence de doublons ; et `version_depassee` bloque
hors fenêtre de course. Le pire couramment atteignable est donc des **lignes
brouillon dupliquées** — non servies au patient, mais qui salissent l'audit et
démentent les garanties écrites dans le code. Surface de production actuelle :
nulle (flag éteint).

## Migration prérequise — `clinical_rules`

Additions à une table existante, **aucune donnée réécrite**, aucun DROP.

### Contraintes d'unicité de lignée (index partiels)

```sql
-- Une seule ligne par (lignée, version) : tue la collision de version.
CREATE UNIQUE INDEX "clinical_rules_lignee_version_key"
    ON "clinical_rules"("intent_tag_id", "ingredient_id", "type_regle", "version_regle");

-- Un seul brouillon actif par lignée (validePar NULL = brouillon).
CREATE UNIQUE INDEX "clinical_rules_un_brouillon_actif_par_lignee"
    ON "clinical_rules"("intent_tag_id", "ingredient_id", "type_regle")
    WHERE "actif" AND "valide_par" IS NULL;

-- Une seule version validée active par lignée.
CREATE UNIQUE INDEX "clinical_rules_une_validee_active_par_lignee"
    ON "clinical_rules"("intent_tag_id", "ingredient_id", "type_regle")
    WHERE "actif" AND "valide_par" IS NOT NULL;
```

Les routes traduisent alors `P2002` en `409 etat_divergent` — exactement comme
`vocabulaire/route.ts:160` le fait déjà. C'est la **seule barrière réellement
atomique** ; l'isolation `Serializable` (repli) imposerait une gestion de
retries applicatifs et reste moins sûre.

**Attention B-1 (drift) — même piège que la migration catalogue** : ces index
sont partiels et ne s'expriment pas dans `schema.prisma`. Le banc de dérive a
montré que Prisma **ignore les index partiels au diff** sur table native (pas de
faux positif) — donc pas de `tables.external` requis. À **re-confirmer par le
banc** au moment de la pose (les index partiels sur `clinical_rules` sont un cas
distinct de ceux du catalogue).

### Traçabilité durable de la désactivation (R-1 de la revue)

La raison de désactivation, exigée à l'écran, n'est aujourd'hui écrite que dans
`console.log` (`desactivation/route.ts:104-108`) — évaporée à la rotation des
logs Vercel, ce qui dément la décision n°3 (« override tracé, jamais
silencieux »). Colonnes à ajouter :

```sql
ALTER TABLE "clinical_rules" ADD COLUMN "raison_desactivation" TEXT;
ALTER TABLE "clinical_rules" ADD COLUMN "desactive_par" TEXT;
ALTER TABLE "clinical_rules" ADD COLUMN "desactive_le" TIMESTAMP(3);
-- Une règle désactivée porte sa raison et son signataire (jamais silencieux).
ALTER TABLE "clinical_rules" ADD CONSTRAINT "clinical_rules_desactivation_tracee_check"
    CHECK ("actif" OR ("raison_desactivation" IS NOT NULL AND "desactive_par" IS NOT NULL));
```

Écrire ces champs dans la ligne désactivée n'est **pas** une édition de contenu
interdite (décision n°5) : c'est le journal de la transition, pas une réécriture
de la règle. La route `desactivation` les renseigne alors dans son `updateMany`
conditionnel existant.

> Nuance : le CHECK `desactivation_tracee` s'applique à **toutes** les lignes
> existantes à la pose. `clinical_rules` étant **non seedée** (zéro ligne en
> prod aujourd'hui), le CHECK passe sans backfill. Si une ligne existait, il
> faudrait un backfill préalable — à revérifier par `execute_sql` avant la pose.

### Ajouts miroir au schéma Prisma

Sur `model ClinicalRule` : les trois `@@index`/`@@unique` exprimables (le
`clinical_rules_lignee_version_key` est un `@@unique` complet, exprimable ; les
deux partiels restent SQL-seul, non déclarés côté Prisma — vérifiés par le banc
et par le fichier de contrôle CI), et les trois colonnes
`raisonDesactivation`/`desactivePar`/`desactiveLe` (nullable).

## Suite côté code (PR de suivi, après la migration)

1. Traduire `P2002` en `409 etat_divergent` dans création et révision.
2. Envelopper la création dans un `$transaction` (R-2), pour la cohérence et une
   traduction P2002→409 locale.
3. Renseigner `raison_desactivation`/`desactive_par`/`desactive_le` dans la route
   de désactivation.
4. **Tests d'intégration base réelle** (les 52 tests actuels sont sur mocks
   Prisma et ne peuvent pas couvrir la course) : deux créations concurrentes ⇒
   au plus une v1 ; deux révisions ⇒ au plus un `N+1` ; deux validations ⇒ au
   plus une validée active ; « trou » de lignée assumé (désactivation de
   l'unique validée, puis relance) figé comme voulu ; non-régression
   `resolution.ts` en présence d'une fixture d'anomalie (deux validées) ⇒ une
   seule servie.

## Fichier de contrôle CI

`web/prisma/checks/clinical_rules_lignee_v1.sql` : vérifie la présence des trois
index d'unicité, du CHECK de désactivation, et des trois colonnes.

## Séquencement

Cette migration accompagne (ou précède) la migration catalogue LOT-01 dans le
même acte gaté d'autorisation. Le flag `WN_C4_ENABLED` reste **éteint** jusqu'à
ce que : (a) cette migration soit appliquée en prod et vérifiée, (b) la PR de
suivi code soit mergée. Ordre : migration → suivi code → seulement ensuite,
éventuellement, activation.
