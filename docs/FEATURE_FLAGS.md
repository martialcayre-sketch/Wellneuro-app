# Feature flags — référence

Inventaire des drapeaux d'environnement qui **gâtent** des fonctionnalités, et
comment les ouvrir. Source de vérité : les modules `web/src/lib/*/featureFlag.ts`
et les lectures `process.env.*` dans les routes.

**Principe.** Les gâtes vivent dans le code pour que la **prod** reste
conservatrice pendant que le **dev** tourne à plein. On ne les retire **pas** du
code : on les **allume par environnement** (`web/.env.local` en local, variables
Scalingo/Vercel en déployé). Tous sont **fail-closed** : absents, ils laissent
fermé.

> ⚠️ **La convention d'activation n'est pas uniforme** — lire la colonne
> « Valeur ON ». La plupart exigent la chaîne exacte `'true'` ; deux exigent
> `'1'` **et** une validation en code.

## A. Flags produit — `'true'`, défaut OFF

Ouvrables par l'environnement seul. **ON en dev/staging** ; en prod, activation
datée **par feature**.

| Flag | Valeur ON | Ouvre | Si absent |
|---|---|---|---|
| `WN_C4_ENABLED` | `true` | rayon compléments | fermé |
| `WN_C5_ENABLED` | `true` | alimentation / CIQUAL | fermé |
| `WN_CB_ENABLED` | `true` | rayon biologie — **étage documentaire** | fermé |
| `WN_SYNTHESE_STREAM` | `true` | synthèse IA en SSE (routeur 30 s Scalingo) | réponse JSON |
| `WN_CLAIMS_QUESTIONNAIRE_STREAM` | `true` | claims questionnaire en SSE | réponse JSON |
| `RAG_PGVECTOR_ENABLED` | `true` | RAG de production — exige aussi `RAG_INTERNAL_SECRET` + clés OpenAI | throw / fermé |

## B. Chemins d'accès patient — `'true'`, défaut OFF

ON en dev (données **fictives**). En prod, chaque activation est une décision
datée, avec ses dépendances.

| Flag | Valeur ON | Ouvre | Dépendance / note |
|---|---|---|---|
| `WN_G4_LIEN_MAGIQUE` | `true` | entrée portail par lien magique | — |
| `WN_G4_REDEMANDE_PATIENT` | `true` | canal public de redemande de lien | **surface publique non authentifiée** |
| `WN_G5_GOOGLE_PATIENT` | `true` | entrée patient par Google | exige `WN_GOOGLE_PATIENT_CLIENT_ID` / `_SECRET` (client OAuth dédié) |

## C. Double verrou clinique — `'1'` **ET** validation en code

**L'environnement seul ne les ouvre pas.** Il faut `= '1'` **et** que le contenu
clinique soit validé/signé dans le code (`validationExterne`, date, claims). Ce
n'est pas une gâte « juridique » ni un confort de dev : c'est la **validation
clinique**. Ne pas forcer la métadonnée de validation pour « voir » la feature.

| Flag | Valeur ON | 2ᵉ condition | État au 2026-07-28 |
|---|---|---|---|
| `WN_ENABLE_CORPUS_CLINIQUE_V1` | `1` | `CORPUS_CLINIQUE_METADATA.validationExterne` | `false` → **fermé quoi qu'on pose** |
| `WN_ENABLE_ORIENTATION_NNPP2` | `1` | `tableSignee()` (validation + date + claims) | table vide, `validationExterne: false` → **fermé** |

Débloquer ces deux-là = **valider le contenu clinique** (décision clinique,
documentée au `CHANGELOG`), pas flipper un flag.

## D. Gate dur HDS — ne jamais ouvrir avant l'attestation HDS

| Flag | Valeur ON | Ouvre | Garde |
|---|---|---|---|
| `WN_CB_RESULTS_ENABLED` | `true` | stockage de **résultats biologiques réels** (donnée de santé) | exige AUSSI `WN_CB_ENABLED` ; **aucun appelant à ce jour** ; commentaire du code : « ne doit jamais passer à true avant l'attestation HDS » |

## E. Configuration / secrets — **pas** des gâtes

À ne pas confondre avec les flags : ces variables portent une valeur, elles
n'ouvrent rien.

`WN_CLAIMS_CLAUDE_MODEL` · `WN_DEPLOY_ENV` · `WN_RELEASE_SHA` ·
`NEXT_PUBLIC_WN_DEPLOY_ENV` · `NEXT_PUBLIC_WN_RELEASE_SHA` ·
`WN_PORTAIL_TOKEN_TTL_JOURS` (TTL, entier) · `RAG_INTERNAL_SECRET` ·
`RAG_EMBEDDING_MODEL` · `RAG_EMBEDDING_DIMENSIONS` ·
`WN_GOOGLE_PATIENT_CLIENT_ID` / `_SECRET`.

## Tout allumer pour le dev local

À coller dans `web/.env.local` (gitignoré, jamais committé) :

```bash
WN_C4_ENABLED=true
WN_C5_ENABLED=true
WN_CB_ENABLED=true
WN_SYNTHESE_STREAM=true
WN_CLAIMS_QUESTIONNAIRE_STREAM=true
RAG_PGVECTOR_ENABLED=true            # + RAG_INTERNAL_SECRET et clés OpenAI
WN_G4_LIEN_MAGIQUE=true
WN_G4_REDEMANDE_PATIENT=true
WN_G5_GOOGLE_PATIENT=true            # + WN_GOOGLE_PATIENT_CLIENT_ID / _SECRET
```

Les flags **C** (double verrou clinique) et **D** (gate dur HDS) n'y figurent pas
volontairement : les premiers ne s'ouvrent pas par l'environnement, le second ne
doit pas s'ouvrir hors HDS. Pour le staging Scalingo, mêmes lignes en
`scalingo --app <app> env-set <FLAG>=true >/dev/null 2>&1` (rediriger : `env-set`
réaffiche la valeur).
