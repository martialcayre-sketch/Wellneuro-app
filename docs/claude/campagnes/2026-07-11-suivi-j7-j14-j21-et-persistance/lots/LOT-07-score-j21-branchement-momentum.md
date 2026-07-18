---
id: "LOT-07"
titre: "Score du résumé J21 — branchement momentum"
statut: "livré"
dépend_de: "LOT-06"
volet: "C2B"
---

# LOT-07 — Score du résumé J21 (branchement momentum)

> Compilé le 2026-07-18 depuis l'arbitrage C2B
> (`docs/claude/propositions/2026-07-18-c2b-trajectoire-spirale/ARBITRAGES_C2B.md`,
> registre **A8-5**). Premier lot C2B, **migration-free**. Lève la dette LOT-04.

## But

Faire cesser le volet score du **résumé J21** d'être câblé à `null` : fournir le
momentum réel à `buildResumeJ21`, sans nouvelle table ni toucher au moteur. Le
moteur existe déjà et est branché en prod sur `api/praticien/equilibre`.

## Résultat observable

Sur un patient ayant un cycle réel (**T0 + J21 mesurés**), le résumé J21 du panneau
praticien affiche un score de momentum sourcé (tendance + `|delta|` + date +
`versionScore`) au lieu de « score indisponible ». Aucun changement côté patient.

## Périmètre

- Dans `web/src/app/api/praticien/protocoles/checkins/route.ts` : charger les
  `questionnaire_reponses` du patient (comme `api/praticien/equilibre/route.ts`),
  construire `dateT0 = resoudreDateT0(reponses)` et
  `historique = construireHistoriqueEquilibre(reponses)`, puis passer
  `{ dateT0, lectures: historique }` à `buildResumeJ21`.
- `resumeJ21.ts` accepte déjà `momentum?: { dateT0; lectures } | null` — aucun
  changement de signature nécessaire.
- Affichage praticien du score dans le résumé J21 : tendance + `|delta|` + date +
  `versionScore` (audience praticien, A8 « momentum explicable »).
- Cas « pas de cycle mesuré » : le volet score reste explicitement absent (« point
  de jonction honnête »), jamais un 0 inventé (A1 / A8-2).

## Hors périmètre

- Ancrage T0 **par épisode** (→ LOT-08).
- Comparateur multi-épisodes (→ LOT-09).
- Toute réimplémentation de `momentum.ts` / `depuisPrisma.ts` (propriété
  `lib/equilibre`).
- Affichage patient d'un score ou d'un pourcentage d'observance.
- Toute migration Prisma / écriture Supabase.

## Interdits

- Tous les textes d'interface utilisateur sont en français.
- Aucun secret, jeton ou identifiant sensible en dur.
- Aucune donnée patient réelle ; patients fictifs autorisés uniquement : Sophie
  Nicola, Jennifer Martin, Michel Dogné.
- Aucune migration Prisma/SQL ni écriture Supabase.
- Aucune modification des seuils, pondérations ou règles cliniques ; `versionScore`
  bumpé uniquement sur décision explicite documentée.
- Changements minimaux : pas de refactor hors périmètre du lot.

## Étapes

- [ ] Extraire/mutualiser le chargement des `questionnaire_reponses` patient (ne
      pas dupliquer la logique de `api/praticien/equilibre`).
- [ ] Construire `{ dateT0, lectures }` et l'injecter dans `buildResumeJ21`.
- [ ] Vérifier le rendu du score dans le panneau praticien du résumé J21.
- [ ] Cas sans cycle mesuré : score absent explicite, jamais 0.

## Tests

- `bash scripts/check_no_secrets.sh`
- `cd web && npm run type-check`
- `cd web && npm run scoring-check` (le lot touche l'affichage d'un score dérivé).
- Vitest : cas momentum présent (T0+J21) → score sourcé ; cas absent → volet score
  `null` conservé (non-régression du « point de jonction honnête »).
- Smoke praticien avec Sophie Nicola / Jennifer Martin / Michel Dogné.

## Critères de done

- [ ] Le résumé J21 affiche un score sourcé quand T0+J21 existent.
- [ ] Aucun 0 inventé pour un jalon non atteint.
- [ ] `git status web/prisma/` vide (aucune migration).
- [ ] `versionScore` inchangé.

## Risques / points de vigilance

- Couverture réelle des réponses portant `scoresJson.rawAnswers` (seed pré-agrégées
  ignorées) — traité pleinement en LOT-08/09 (A8-2).
- Ne pas confondre point d'étape (check-in) et jalon de mesure (score) : le résumé
  J21 est le seul point de jonction (A1).

## Résultats

**Livré le 2026-07-18** (branche `feat/c2b-lot-07-score-j21`, **sans migration**).

`api/praticien/protocoles/checkins/route.ts` charge désormais les
`questionnaire_reponses` du patient, résout le T0 global (`resoudreDateT0`) et
construit l'historique d'équilibre daté (`construireHistoriqueEquilibre`), puis passe
`{ dateT0, lectures }` à `buildResumeJ21`. Le volet score du résumé J21 cesse d'être
`null` dès qu'un cycle T0+J21 mesuré existe ; sans T0/couverture il reste `null`
(jamais un 0 inventé). Aucun changement du moteur (`momentum.ts` /
`depuisPrisma.ts`), aucun changement côté patient, `versionScore` inchangé.

**Validations** : type-check ✅, Vitest **423/423** (2 tests de route : cas sans
cycle → score null conservé ; cas cycle mesuré → score non-null), `scoring-check` ✅,
anti-secrets ✅, `git status web/prisma/` vide.

Ancrage T0 **global** (comme `api/praticien/equilibre`) ; l'ancrage **par épisode**
et le comparateur multi-épisodes relèvent de LOT-08 puis LOT-09.
