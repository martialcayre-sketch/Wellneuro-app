# C5 — Validation finale (LOT-07)

> 2026-07-18. Arbre de preuve : commit de base `81fad26`. Verdict borné : ce qui
> a été validé l'est avec sa preuve ; ce qui ne l'a pas été est dit explicitement
> et renvoyé en dette (`DETTE_C5.md`). **Aucun verdict ne masque un volet en échec.**
> Les trois verdicts sont **indépendants** : C5B patient ne peut être GO sans C5A
> intègre **et** C5B praticien validé.

## Autorisation d'activation

Le responsable de la gouvernance clinique WellNeuro, **Martial CAYRE**
(`martialcayre@wellneuro.fr`), a donné dans la session du 2026-07-18 l'instruction
explicite de clôturer le LOT-07 et d'activer C5 en production, en connaissance des
dettes du volet patient (`DETTE_C5.md`). Cette instruction tient lieu d'acte
d'activation au sens de `PREPARATION_PRODUCTION_C5.md` (points 8-9). La signature
clinique du contrat des vecteurs (LOT-01, `C5-LOT01-VECTEURS-2026-07-18-v1`) reste
distincte et déjà acquise.

---

## Verdict C5A — référentiel et moteurs

**GO.** Le référentiel Ciqual est importé, intègre et non modifié par C5B ; les
moteurs sont déterministes et testés ; la clinique et la provenance sont sourcées
et versionnées.

| Domaine | Preuve |
|---|---|
| Vecteurs cliniques signés | `C5-LOT01-VECTEURS-2026-07-18-v1`, signature Martial CAYRE 2026-07-18 (`REVUE_PRATICIEN_LOT-01.md`) |
| Migration + import Ciqual | `RAPPORT_MIGRATION_LOT-02.md`, `RAPPORT_IMPORT_LOT-02.md` (55 744 lignes, intègre, non activé) |
| Déterminisme des moteurs / profil intrinsèque | tests food-compass verts dans `npm run test` (573/573) |
| Profil chiffré, versionné, sans donnée patient | `food-compass/manifest.ts` (hash scellé) |
| RLS active sur les tables C5A | advisors sécurité : `rls_enabled_no_policy` INFO sur `ciqual_nutrient_values`, `clinical_criteria`, `functional_categories`, `ingredient_functional_thresholds`, `nutrient_axis_weight`, `neuro_axis`, `clinical_rules`, `supplement_*` (deny-by-default, accès service role) |

**NON exécuté** : aucune limite bloquante. Advisors performance INFO (FK non
indexées sur tables C5A) → dette non bloquante D-C5-05.

---

## Verdict C5B praticien — Observatoire et insertion

**GO.** Ownership vérifié, insertion manuelle et doublement explicite, workflow de
validation existant, aucune diffusion automatique, aucune substitution automatique.

| Domaine | Preuve |
|---|---|
| Garde flag (désactivé ⇒ 404) | `api/praticien/boussole/route.ts:48` |
| Ownership praticien ⇒ 403 | `api/praticien/boussole/route.ts:69-70` |
| Insertion manuelle, référence reconstruite serveur | route `protocoles/versions` (`:186,:233`), Observatoire LOT-04 |
| Aucune substitution automatique | `food-compass/plates.ts` (`substitutionFamily: null`, `decidePlateSubstitution` exige famille validée + justification) |
| Pont faisabilité JA en lecture seule, factuel, n'altère pas le profil | `food-observation/feasibility.ts` (comptes seuls ; test : sortie sans `score`/`percentage`) |
| Rejet des références C5 quand désactivé | `api/praticien/protocoles/versions/route.ts:167-168` (`C5 est désactivée.`) |

**NON exécuté** : revue visuelle praticien de l'Observatoire en conditions réelles
→ dette D-C5-04.

---

## Verdict C5B patient — Jardin et diffusion

**GO conditionnel.** Les garanties techniques d'isolation et de non-divulgation
numérique sont en place et testées ; les contrôles **humains** d'accessibilité et de
vocabulaire ne sont pas exécutables dans cet environnement et restent des dettes
ouvertes. Le volet est activé **sur l'autorisation explicite du responsable** avec
ces dettes nommées — il n'est **pas** déclaré vert sur les points non exécutés.

Dépendance respectée : C5A = GO et C5B praticien = GO, condition nécessaire à ce
verdict.

| Domaine (exécuté) | Preuve |
|---|---|
| Garde flag (désactivé ⇒ 404) portail + page | `api/portail/boussole/[foodRef]/route.ts:27`, `…/page.tsx:11` |
| Isolation patient ⇒ 404 (regex, diffusion, `inputHash`, `actionRef`) | `api/portail/boussole/[foodRef]/route.ts:29,37,40,46,52` |
| Restitution sûre, sans score numérique | `PatientFoodCompassSafeView` ; `api/portail/protocole/route.ts:84` (boussoles seulement si flag) ; exclut scores/percentiles/PRAL/hash/versions |
| Diffusion manuelle uniquement | workflow Relu → Validé → Envoyé (aucune diffusion auto) |

| Domaine (NON exécuté) | Renvoi |
|---|---|
| Accessibilité automatisée (axe), lecteur d'écran (NVDA/VoiceOver), zoom 200 %, contraste | dette **D-C5-01** |
| Parcours E2E « boussole » des 3 fixtures (Sophie, Jennifer, Michel) | dette **D-C5-02** |
| Test de vocabulaire non-culpabilisant dédié C5 | dette **D-C5-03** |
| Revue visuelle patient en conditions réelles | dette **D-C5-04** |

---

## DoD de campagne — état

- [x] Frontières 5.0 respectées (C5A possède, C5B lit, patient qualitatif).
- [x] Trois verdicts indépendants émis, sans verdict global masquant.
- [x] Migration et import Ciqual intègres et non activés jusqu'à instruction.
- [x] Flag `WN_C5_ENABLED` fail-closed ; aucune surface C5 diffusée quand false.
- [x] Sécurité routes : flag→404, ownership→403, isolation patient→404 testées.
- [x] Advisors RLS/sécurité sans alerte bloquante.
- [x] Matrice CI (type-check, lint, 573 tests, scoring, prisma) verte.
- [ ] Accessibilité humaine, E2E boussole des 3 fixtures, vocabulaire → dettes ouvertes.
- [x] Handoff produit (`HANDOFF_C5.md`) ; runbook d'activation + rollback par flag.
- [x] Instruction d'activation explicite du responsable consignée.
