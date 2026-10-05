# BIOFLOW — roadmap maîtresse

BioFlow est le nom produit de l'ensemble biology-library, BIO-INGEST et
BIO-PARCOURS. Ce n'est **ni une campagne, ni un moteur parallèle**. Ce fichier
coordonne deux campagnes sans déplacer ni dupliquer leurs lots : le détail
reste dans leurs fiches, et les décisions vont au registre central `D-xxx`.

## Pistes

| Piste | Campagne | Responsabilité | Lot courant |
|---|---|---|---|
| A | [BIO-INGEST](../../claude/campagnes/2026-09-30-bio-ingest/CAMPAGNE.md) | Produire une donnée biologique fiable : acquisition, extraction, provenance, validation, worker, qualité | voir `lot_courant` de la campagne |
| B | [BIO-PARCOURS](../../claude/campagnes/2026-10-04-bio-parcours/CAMPAGNE.md) | Faire de la donnée validée une information clinique longitudinale : séries, constats, exploration, suivi | voir `lot_courant` de la campagne |

Le lot courant se lit dans chaque campagne, jamais ici : une seule source.

## Ordre arbitré (2026-10-05)

- **Piste A** : borne d'extraction (LOT-08, terminé le 2026-10-05) → clôture LOT-03 → `D-267` → LOT-07
  → décision sur le traitement asynchrone durable → BioJob et worker → gold
  dataset multi-laboratoires et métriques → E2E d'import.
- **Piste B** : BP-02 → autres lots factuels et longitudinaux. BP-26 avance en
  parallèle.

## Gates entre pistes

| Gate | Condition | Débloque |
|---|---|---|
| G1 | BP-01 mergé (#1314, levé le 2026-10-04) et `D-267` mergée | BIO-INGEST LOT-07 |
| G2 | LOT-07 livré (faits imprimés conservés avant purge) | accélérer la purge, réconcilier les imports fantômes |
| G3 | Traitement asynchrone durable livré | montée en charge de l'ingestion |
| G4 | Ligne BP-26 statuée pour la fonction concernée | toute fonction d'assistance ou de recommandation |
| — | BIO-INGEST LOT-07 et BP-02 | BP-10 (BIO-PARCOURS) |

## Règles de parallélisme

- Au plus une PR structurelle par campagne à la fois.
- Jamais deux PR simultanées sur les mêmes modèles Prisma ou la même frontière
  biologique.
- Un merge à la fois (`D-248`). Une migration à la fois (`D-087`), dans l'ordre
  des `release-db` fixé par BIO-PARCOURS.

## Hors champ aujourd'hui

**BIOFLOW PLATFORM** (API, SaaS, multi-tenant, connecteurs) : campagne future,
non ouverte. Elle s'ouvrira au début réel de l'externalisation. D'ici là :
- ni LOINC ;
- ni billing, SDK ou OAuth ;
- ni microservice ou Python.

## Références

- État des lieux du 2026-10-04 : à verser à côté de ce fichier
  (`AUDIT_BIOFLOW_2026-10-04.md`), comme photographie datée et non comme
  backlog.
