# Claims d'orientation — drafting et ingestion (lot 8)

Rédige les claims à partir des chunks (deux IA, jamais fusionnées : Sonnet 5
rédige, GPT-5.4 contre-vérifie la fidélité), les marque `metadata.usage:
'orientation'`, applique le filtre par construction (quarantaine + perfusion),
et les pousse `EN_ATTENTE_VALIDATION` en production. La validation praticien
claim par claim (voie lente, barrière D-003) reste l'ultime porte — voir
`docs/claude/corpus/VALIDATION_CLAIMS_DEUX_VITESSES.md`.

## Usage — run sommeil (premier lot, décision du 2026-08-01)

Sur le Mac uniquement : `web/.env.local` doit porter `ANTHROPIC_API_KEY`,
`OPENAI_API_KEY` et `RAG_INTERNAL_SECRET` ; les PDF vivent sous
`~/.wellneuro/corpus/` (snapshot déjà apparié, cf. `../snapshot/README.md`).

```bash
# Les 12 PDF sommeil ingérables (notebook 02) :
SOMMEIL=WN-SRC-0312,WN-SRC-0313,WN-SRC-0314,WN-SRC-0315,WN-SRC-0316,WN-SRC-0317,WN-SRC-0319,WN-SRC-0320,WN-SRC-0321,WN-SRC-0323,WN-SRC-0324,WN-SRC-0325

# 1. Extraction (triple lecture, si canonical.md pas déjà produits) :
node --env-file=web/.env.local tools/corpus/extract/extract.mjs --pilote "$SOMMEIL"

# 2. Drafting marqué orientation (filtre par construction actif) :
node --env-file=web/.env.local --import ./tools/corpus/lib/register-alias.mjs \
  tools/corpus/claims/draft.mjs --pilote "$SOMMEIL" --usage orientation --batch 001

# 3. Contrôle hors-ligne contre le vrai contrat serveur :
node --import ./tools/corpus/lib/register-alias.mjs \
  tools/corpus/ingest/ingest.mjs --draft ~/.wellneuro/corpus/claims/draft-LOT_001_*.json --validate

# 4. POST en production (claims EN_ATTENTE_VALIDATION) :
node --env-file=web/.env.local --import ./tools/corpus/lib/register-alias.mjs \
  tools/corpus/ingest/ingest.mjs --draft ~/.wellneuro/corpus/claims/draft-LOT_001_*.json
```

Sortie : `~/.wellneuro/corpus/claims/draft-LOT_<batch>_<date>.json` (+
`revue-…json`, les exclus de fidélité), puis table `rag_corpus_claims` en
`EN_ATTENTE_VALIDATION`. La suite se joue dans l'Atelier corpus
(`dashboard/corpus/`) : tirage seedé, décisions append-only.

## Garde-fous

- **Filtre par construction** (`lib/filtre-orientation.mjs`, banc branché dans
  `scripts/run-certify-bancs.sh`) : la **quarantaine sanitaire** exclut quelle
  que soit la thématique — la décision f n'est pas une levée de quarantaine
  (WN-SRC-0318 « premières ordonnances », WN-SRC-0322 sevrage benzos,
  WN-SRC-0389 Alzheimer restent dehors tant que leur relecture n'est pas
  faite) ; la **perfusion** (WN-SRC-0244) est la seule exclusion A-009
  restante après l'amendement du 2026-08-01 (décision f — sevrages,
  psychotropes et Alzheimer réintégrés, cf.
  `docs/claude/propositions/2026-07-25-certification-corpus-questionnaires/README.md`, §5).
- **4 sources sommeil sont des MP4** (WN-SRC-0270/0272/0276/0279, « Transcrire
  et structurer ») : hors lot tant qu'elles ne sont pas transcrites — le
  pipeline d'extraction ne lit que du PDF.
- **`metadata` est hors du contrôle d'immuabilité** (`store.ts` compare les
  attributs cliniques, pas `metadata`) : ré-ingérer une même version de claim
  avec un `usage` différent est un no-op silencieux. Poser `--usage` dès le
  premier envoi ; ne jamais compter sur une ré-ingestion pour requalifier.
- Sorties **hors dépôt** (`~/.wellneuro/corpus/`), aucune écriture base depuis
  `draft.mjs` ; l'ingestion passe par la route interne authentifiée
  (`RAG_INTERNAL_SECRET`), plafond 64 claims par requête.
