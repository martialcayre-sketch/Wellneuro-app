# Audit d'état réel — 2026-08-03

Mesures prises au cadrage, avant écriture de tout lot. Elles sont reportées ici
pour qu'un lot ultérieur puisse les **rejouer** plutôt que les croire.

## 1. Certification des questionnaires — close

```
git log --oneline -1        → 22766e67  Campagne 2026-08-03 : clôture certification (#528)
node scripts/check_questionnaire_certification.js
  → registre instruments v2 : 64 entrées, 11 à compléter,
    11 sources Mon Équilibre, 0 preuves psychométriques.
  → OK — 64 questionnaires documentés, fixtures scoring certifiées validées.
```

Répartition de `statutCertification` sur les 64 entrées de
`docs/claude/corpus/instrument_registry.json` :

| Statut | Nombre |
|---|---:|
| `scoring_verifie` | 60 |
| `suspendu` | 2 |
| `droits_verifies` | 1 |
| `contenu_verrouille` | 1 |

**Reliquat réel** — il n'est pas dans le scoring :

| Champ | État |
|---|---|
| `statutBibliographique: a_completer` | 11 entrées |
| `cosmin` | `inconnu` sur les 64 |
| `measurement_evidence.json` | 0 étude |

`scoring_verifie` atteste que **le calcul** a passé le banc `certify`. Il
n'atteste **pas** de la validité psychométrique de l'instrument. La nuance n'est
écrite nulle part dans la gouvernance — c'est l'objet du LOT-07.

## 2. Moteur d'intervention — présent, vide, non appelé

| Pièce | Fichier | État |
|---|---|---|
| Moteur | `web/src/lib/clinical/orientationEngine.ts` | 303 lignes, testé |
| Table de règles | `web/src/lib/clinical/orientationRulesV1.ts` | `ORIENTATION_RULES_V1 = []` — **vide** |
| Signature | idem, `ORIENTATION_METADATA` | `validationExterne: false`, `dateValidation: null`, `claimsSource: []` |
| Route | `web/src/app/api/praticien/orientation/route.ts` | 156 lignes, double verrou fail-closed |
| Registre packs (code) | `web/src/lib/questionnaires-functional.ts` | 15 catégories, 16 packs |
| Règles déclaratives (base) | `QuestionnairePackTrigger` / `pack_triggers` | modèle présent, **aucun appelant** |
| Propositions (base) | `PackProposition` | utilisé par `api/portail/pack-reevaluation` |

```
grep -rln "praticien/orientation" web/src
  → web/src/app/api/praticien/orientation/route.ts
  → web/src/app/api/praticien/orientation/route.test.ts
  → web/src/lib/clinical/orientationRulesV1.ts
```

Aucun composant, aucune page. La route existe et personne ne l'appelle.

Le double verrou est intact et n'est pas à contourner :

```ts
function orientationActive(): boolean {
  return process.env.WN_ENABLE_ORIENTATION_NNPP2 === '1' && tableSignee();
}
```

`tableSignee()` exige `validationExterne` **et** `dateValidation` **et** au moins
un `claimsSource`. Remplir la table sans la signer ne l'ouvre pas ; c'est le
comportement voulu.

## 3. Packs — deux sources de vérité

| Source | Contenu | Portée |
|---|---|---|
| Base : `QuestionnairePack`, `pack_questionnaires`, `pack_triggers` | composition réelle, ordre, obligatoire, conditions | résolue par `web/src/lib/consultation/packRegistry.ts` |
| Code : `PACKS_REGISTRY` | id, titre, niveau, phase — **pas la composition** | `web/src/lib/questionnaires-functional.ts` |
| Code : `QUESTIONNAIRE_OVERRIDES` | `packsRecommandes` tenu à la main | **10 questionnaires sur 64** |
| Code : `LEGACY_CATEGORY_MAP` | repli par catégorie legacy | les 54 autres |

`resolvePackQuestionnaireIds` rend déjà `source: 'registry' | 'legacy'` — le
signal de divergence existe et **n'est surveillé par aucun test**.

## 4. Intake — non structuré

`web/prisma/schema.prisma`, modèle `Consultation` :

```prisma
motif             String? @map("motif")
ficheSignaletique Json?   @map("fiche_signaletique")
anamnese          Json?   @map("anamnese")
```

Texte libre et JSON sans schéma. Un moteur déterministe ne peut pas s'indexer
là-dessus sans perdre sa reproductibilité.

## 5. Corpus — le blocage n'est pas là où il semblait

Base de production, `rag_corpus_claims`, `active = true` :

| Statut | Claims |
|---|---:|
| `VALIDE` | 5242 |
| `EN_ATTENTE_VALIDATION` | 2982 |

Les 2982 en attente se répartissent sur cinq notebooks, **aucun claim signé sur
aucun des cinq** :

| Notebook | Sources en attente |
|---|---:|
| 05 — Cognition et mémoire | 24 |
| 06 — Douleurs chroniques | 16 |
| 07 — Axe intestin-cerveau | 19 |
| 11 — Cas complexes | 30 |
| 12 — Audit des contradictions | 11 |

Le mapping, lui, n'est pas le blocage —
`web/src/lib/supplement-library/rayonCorpus.ts` couvre déjà six notebooks :

```ts
export const RAYON_VERS_NOTEBOOK = {
  micronutrition: '10 — Micronutrition et compléments',
  biologie:       '08 — Biologie fonctionnelle',
  nutrition:      '09 — Nutrition et aliments vedettes',
  stress:         '03 — Stress et burnout',
  humeur:         '04 — Humeur',
  sommeil:        '02 — Sommeil et chronobiologie',
}
```

Seul `micronutrition` a un consommateur (C4). Les cinq autres sont déclarés et
inertes — le commentaire du fichier le dit lui-même.

## 6. Les fiches de synthèse — présentes, thématisées, majoritairement signées

48 sources d'intervention identifiées dans `source_registry.json` (titres en
*fiche synthèse*, *ordonnance commentée*, *fiche protocole*, *prise en charge*),
réparties sur 11 notebooks :

| Notebook | Sources | Validés | En attente |
|---|---:|---:|---:|
| 02 — Sommeil et chronobiologie | 8 | 175 | 0 |
| 03 — Stress et burnout | 3 | 73 | 0 |
| 04 — Humeur | 10 | 202 | 0 |
| 05 — Cognition et mémoire | 5 | 27 | 109 |
| 06 — Douleurs chroniques | 2 | 0 | 100 |
| 07 — Axe intestin-cerveau | 1 | 0 | 29 |
| 09 — Nutrition et aliments vedettes | 12 | 131 | 0 |
| 10 — Micronutrition et compléments | 1 | 44 | 0 |
| 11 — Cas complexes | 3 | 0 | 59 |
| 12 — Audit des contradictions | 2 | 0 | 30 |
| 13 — Instruments du cabinet | 1 | 0 | 0 |
| **Total** | **48** | **652** | **327** |

Détail source par source : `INVENTAIRE_SOURCES_INTERVENTION.md`.

**527 claims sur 979 sont prescriptifs (54 %)** — jusqu'à 25 sur 33 pour « Fiche
synthèse insomnie et stress chronique et épuisement », 23 sur 29 pour « insomnie
et troubles anxieux ». C'est la matière d'un moteur d'orientation : des conduites
conditionnées à un tableau clinique.

Deux conséquences pour le cadrage :

1. **Le déblocage coûte 327 claims de revue, pas 2982.** À 1-2 min pièce
   (`docs/claude/corpus/VALIDATION_CLAIMS_DEUX_VITESSES.md`), c'est quelques
   heures. L'Atelier v2 reste utile pour le corpus entier mais n'est pas un
   prérequis ici.
2. **La voie rapide ne s'applique pas.** Elle est réservée aux claims
   déclarés/observés **non prescriptifs** ; à 54 % de prescriptifs, ces 327
   relèvent de la revue pièce à pièce de toute façon.

`WN-SRC-0485` (NB13) n'a aucun claim : NB13 est en chunks seuls par conception.

## Requêtes à rejouer

```sql
-- répartition globale
SELECT statut, count(*) FROM rag_corpus_claims WHERE active GROUP BY 1;

-- couche intervention (48 sources du registre LOT-00)
SELECT source_id,
       count(*) FILTER (WHERE statut = 'VALIDE')  AS valide,
       count(*) FILTER (WHERE statut <> 'VALIDE') AS attente,
       count(*) FILTER (WHERE prescriptif)        AS prescriptifs
FROM rag_corpus_claims WHERE active AND source_id IN (...)
GROUP BY 1 ORDER BY 1;
```

Lecture via l'outil MCP Supabase `execute_sql` uniquement — jamais `psql`.
