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
| `WN_RECHERCHE_CORPUS_ENABLED` | `true` | recherche corpus clinique (rayons cognition, douleur, intestin — `dashboard/bibliotheque`) | fermé |
| `WN_AGENDA_RELANCE` | `true` | relance praticien de l'agenda du sommeil (**envoi e-mail au clic**, jamais de cron) | fermé |
| `WN_SYNTHESE_STREAM` | `true` | synthèse IA en SSE (routeur 30 s Scalingo) | réponse JSON |
| `WN_CLAIMS_QUESTIONNAIRE_STREAM` | `true` | claims questionnaire en SSE | réponse JSON |
| `RAG_PGVECTOR_ENABLED` | `true` | RAG de production — exige aussi `RAG_INTERNAL_SECRET` + clés OpenAI | throw / fermé |
| `WN_ENABLE_VALIDITE_PASSATIONS` | `1` | filtre de validité des passations (LOT-00 chaîne T0) : `INVALID`/`SUPERSEDED`/`HISTORICAL_ONLY` sortent du raisonnement, et la route d'invalidation praticien répond (sinon **503**) | filtre **inerte** — la colonne `statut_validite` existe et vaut `VALID` par défaut de migration sur **toutes** les lignes ; ce `VALID` n'est donc pas un jugement clinique ([[D-052]]) |

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

| Flag | Valeur ON | 2ᵉ condition | État (daté) |
|---|---|---|---|
| `WN_ENABLE_CORPUS_CLINIQUE_V1` | `1` | `CORPUS_CLINIQUE_METADATA.validationExterne` | `false` → **fermé quoi qu'on pose** |
| `WN_ENABLE_ORIENTATION_NNPP2` | `1` | `tableSignee()` (validation + date + claims) | **20 règles**, `validationExterne: true` depuis le 2026-08-04 → **la 2ᵉ condition est REMPLIE ; seul le drapeau tient encore le verrou** |
| `WN_ENABLE_CONTRADICTIONS_NNPP2` | `1` | `tableSignee()` de `contradictionsService.ts` (validation + date + claims) | **1 règle publiée (C-STR)**, table **signée le 2026-08-15** ([[D-061]]) et **drapeau posé en Production le 2026-08-16** ([[D-064]]) → **les deux conditions sont remplies ; les constats sortent au prochain déploiement de production**. L'affichage est câblé depuis [[D-050]] (route cockpit → panneau) |

**Les règles d'arrêt n'ont PAS de drapeau à elles** ([[D-053]], LOT-03 du
2026-08-12). `stopRulesV1.ts` est **signée depuis le 2026-08-15** ([[D-061]]),
et le verrou `tableArretSignee()` d'`orientationService.ts` commande à lui seul
les deux effets de la table — l'extinction des recommandations et l'exclusion
des instruments déjà renseignés de façon exploitable. Un second drapeau aurait
donné l'illusion d'un second verrou : les règles d'arrêt ne s'exercent qu'à
l'intérieur d'une orientation déjà servie, donc déjà gardée par
`WN_ENABLE_ORIENTATION_NNPP2`. La conséquence annoncée ici avant signature
s'est réalisée : l'orientation étant allumée en production, **l'extinction est
effective depuis le 2026-08-15**. Elle a même tourné trois jours sans le frein
de [[D-053]] §5 — le frein ne mord que sur des constats effectivement
produits, et le drapeau des contradictions manquait ([[D-064]], qui l'a posé).
**Leçon pour la prochaine signature** : vérifier non seulement ce que la
signature allume, mais ce dont le comportement allumé dépend pour rester
borné.

**⚠ L'orientation a changé d'état le 2026-08-04.** Jusque-là, la valeur du
drapeau était sans effet : `tableSignee()` était faux, donc le ET aussi, dans
tous les environnements. Depuis la signature, **poser `WN_ENABLE_ORIENTATION_NNPP2=1`
suffit à ouvrir la route** — y compris là où la variable vaudrait déjà `1` sans
que personne s'en souvienne. Vérifier les trois scopes Vercel (Production,
Preview, Development) et les `.env.local` de poste avant de considérer la route
comme fermée. **Depuis le 2026-08-07 (LOT-01, `orientation-file-envoi.spec.ts`),
Playwright la pose** — `webServer.env` dans `web/playwright.config.ts` arme
`WN_ENABLE_ORIENTATION_NNPP2=1`, délibérément, pour aligner le test sur l'état
réel de production plutôt que de le simuler. Le risque de désalignement entre
scopes Vercel (Production, Preview, Development) et `.env.local` de poste reste
entier, lui, et rien côté CI ne le couvre.

Débloquer ces deux-là = **valider le contenu clinique** (décision clinique,
documentée au `CHANGELOG`), pas flipper un flag.

**Et signer ne suffit pas non plus** : le verrou est un ET. Sur l'orientation,
signer la table sans poser `WN_ENABLE_ORIENTATION_NNPP2=1` en production laisse
l'écran praticien du LOT-06 sur « en cours de constitution ». Les deux gestes
vont ensemble, dans cet ordre : validation clinique d'abord, flag ensuite.

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
