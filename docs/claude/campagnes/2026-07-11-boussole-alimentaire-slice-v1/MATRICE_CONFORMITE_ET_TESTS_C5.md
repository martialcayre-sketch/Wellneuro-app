# C5 — Matrice de conformité et de tests (LOT-07)

> Date : 2026-07-18. Arbre de preuve : commit de base `81fad26` (merge LOT-06).
> Preuve technique = sortie verte des commandes ci-dessous + CI de la PR LOT-07.
> Preuve documentaire/clinique = hash Git + validations praticien antérieures.

## 1. Matrice fonctionnelle (frontières 5.0)

| Exigence | C5A (référentiel) | C5B praticien | C5B patient | Preuve |
|---|---|---|---|---|
| Profil intrinsèque chiffré, sourcé, versionné, sans donnée patient | possède | lit | ne voit pas les internes | `food-compass/manifest.ts`, vues séparées |
| Lecture contextuelle (priorité C1 + protocole C2), ne modifie jamais le profil | — | oui | — | `api/praticien/boussole/route.ts` |
| Restitution patient qualitative seulement (aucun score/percentile/PRAL/hash) | — | — | oui | `PatientFoodCompassSafeView`, `api/portail/protocole/route.ts:84` |
| Assiettes versionnées appartiennent à C5B ; substitution jamais automatique | — | oui | — | `food-compass/plates.ts` (`substitutionFamily: null`) |
| Faisabilité JA factuelle, praticien-validée, n'altère pas le profil | — | oui (lecture seule) | — | `food-observation/feasibility.ts` (aucun score, test dédié) |
| Diffusion manuelle Relu → Validé → Envoyé, aucune diffusion automatique | — | oui | reçoit si diffusé | workflow protocole existant |

## 2. Matrice des gates

| Gate | Condition | Preuve | Verdict |
|---|---|---|---|
| Migration LOT-02 | migration relue, PostgreSQL éphémère, dérive nulle | `RAPPORT_MIGRATION_LOT-02.md`, CI rejoue toutes les migrations | **Levé** |
| Import LOT-02 | confirmation distincte, dry-run, cible vide | `RAPPORT_IMPORT_LOT-02.md` (`C5-LOT02-IMPORT-MC-2026-07-18-v1`, 55 744 lignes, intègre) | **Levé** |
| C5A | référentiel intègre, moteurs déterministes, clinique et provenance | vecteurs signés `C5-LOT01-VECTEURS-2026-07-18-v1` ; tests food-compass ; advisors sans alerte bloquante | **GO** (`VALIDATION_FINALE_C5.md`) |
| C5B praticien | ownership, insertion manuelle, workflow validation, aucune diffusion auto | `boussole/route.ts:69-70` (403), `plates.ts` (pas de substitution auto) | **GO** |
| C5B patient | protocole diffusé, isolation 404, aucun score numérique, accessibilité | `portail/boussole/[foodRef]/route.ts:27,29-52` ; vue sûre ; accessibilité = dette | **GO conditionnel** (dettes D-C5-01→04) |
| Activation production | CI/PR vertes, trois GO, flag encore false, instruction explicite | `ACTIVATION_RUNBOOK_C5.md` ; instruction du responsable (session 2026-07-18) | **Ouvert** |

## 3. Tests et contrôles exécutés (commit `81fad26`)

| Contrôle | Commande | Résultat |
|---|---|---|
| Anti-secrets | `bash scripts/check_no_secrets.sh` | OK — aucun secret |
| Audit campagnes | `node scripts/wn-campaign-audit.mjs --fail-on-warning-codes …` | exit 0 |
| Type-check | `npm run prisma:generate && npm run type-check` | 0 erreur |
| Lint | `npm run lint` | 0 erreur (2 warnings préexistants `GenericQuestionnaire.tsx`, hors C5) |
| Tests unitaires + intégration | `npm run test` | **573 tests / 102 fichiers, tous verts** |
| Certification scoring | `npm run scoring-check` | OK — 63 questionnaires certifiés |
| Schéma Prisma | `npx prisma validate` | valide |
| Advisors sécurité | `mcp Supabase get_advisors security` | uniquement `rls_enabled_no_policy` (INFO) sur toutes les tables (incl. C5A) ; **0 ERROR/WARN** |
| Advisors performance | `mcp Supabase get_advisors performance` | `unindexed_foreign_keys` + `unused_index` (INFO) ; **0 bloquant** |
| Migrations rejouées / dérive / E2E | CI (`verify`, Postgres 15) sur la PR LOT-07 | à confirmer vert sur la PR |

## 4. Couverture sécurité (routes C5)

| Contrôle | Emplacement | État |
|---|---|---|
| Flag off ⇒ 404 (praticien) | `api/praticien/boussole/route.ts:48` | testé |
| Ownership praticien ⇒ 403 | `api/praticien/boussole/route.ts:69-70` | testé |
| Flag off ⇒ 404 (portail + page patient) | `api/portail/boussole/[foodRef]/route.ts:27`, `…/page.tsx:11` | testé |
| Isolation patient ⇒ 404 (regex, diffusion, `inputHash`, `actionRef`) | `api/portail/boussole/[foodRef]/route.ts:29,37,40,46,52` | testé |
| Rejet des références C5 quand désactivé | `api/praticien/protocoles/versions/route.ts:167-168` | testé |
| Intégrité de la référence C5 (manifeste, protocole) | `…/versions/route.ts:186,233` | testé |

## 5. Renvois

Verdicts : `VALIDATION_FINALE_C5.md`. Dettes : `DETTE_C5.md`. Handoff :
`HANDOFF_C5.md`. Activation : `ACTIVATION_RUNBOOK_C5.md`.
