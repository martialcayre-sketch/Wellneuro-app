# CONTEXTE SESSION — Refonte UX praticien & fonctionnalités manquantes

> Document de contexte/handoff pour une session Claude Code ultérieure.
> Rédigé le 2026-07-07. Priorité produit : ce fichier prime sur la mémoire d'agent.

## 1. État courant (acquis — ne pas replanifier)

- **Prod OK** : `app.wellneuro.fr` sur Vercel (projet `prj_9sg8HgiCvxQfZiULTnmXIaU5c12k`),
  base Supabase `ohnbmypinamzzfhqymlt` (eu-central-1, Postgres 17).
- **Incident TLS résolu (05→07/07)** : Prisma ne se connectait pas à Supabase en runtime Vercel
  (Node 24) — `self-signed certificate in certificate chain`. Corrigé par `stripSslParams()` dans
  `web/src/lib/postgres.ts` + option `ssl:{rejectUnauthorized:false}` dans `web/src/lib/prisma.ts`
  (PR #25). Un log diag `[prisma] connexion db host=… tlsNoVerify=… sslmodeDansUrl=…` a été laissé
  (non sensible ; à retirer un jour). Sonde de validation :
  `GET /api/patient/questionnaire?id=X&email=a@b.c` → 404 = DB OK.
- **RLS actif** sur les 19 tables (PR #22) ; rôle `postgres` = bypassrls, app non impactée.
- **Données** : 3 patients fictifs seedés (`PAT_SEED_01/02/03` = Sophie/Jennifer/Michel) + 15 réponses.
- **Écrans qui fonctionnent** : synthèse IA, booklet, fiche patient `dashboard/patients/[idPatient]`
  (5 jauges), détail 12 besoins `.../besoins` (radar), écran patient « Mon équilibre » (cercles).

## 2. Audit du décalage codé ↔ exposé (constaté par l'utilisateur)

| Sujet | Réalité code | Nature |
|---|---|---|
| Dashboard pas à jour | `web/src/app/dashboard/page.tsx` : « Feuille de route migration » statique Lot 0→C5, rien vers les nouveaux écrans | À refondre |
| Pas de packs de questionnaires | Existait en GAS (`archive/gas-legacy/Code.gs` : `getPacks`, `assignPack`, feuille « Packs ») ; **jamais porté** en Next.js | À construire |
| Assignation sans filtre catégorie | Menu à plat `web/src/components/PatientsPanel.tsx` (~L311) ; `categorie` dispo par questionnaire (API) | À construire |
| Pas de graphe équilibre praticien | Fiche = 5 `ScoreGauge` ; radar sur `/besoins` ; cercles concentriques seulement côté patient | Câblage viz |
| Ciqual & compléments absents | Schéma seul déployé (`NeuroAxis`, `Supplement*`, `Clinical*`… tables vides), aucune UI/donnée | Épic différé (R1/R2) |
| Synthèse IA + booklet | Fonctionnent | OK |

## 3. Décisions produit prises (2026-07-07)

- **Packs = éditables en base** (modèle Prisma + CRUD praticien), pas un simple catalogue en code.
  → implique une **migration Prisma** (confirmation explicite obligatoire avant `migrate`).
- **Ciqual + compléments = épic séparé, différé** (pas dans ce cadrage).
- **Flux de livraison** : une **PR par lot**, branche → PR → Go/No-Go → merge sur confirmation dédiée.
- Invariants `CLAUDE.md` : UI FR, changements minimaux, patients fictifs autorisés seulement,
  pas de migration/SQL destructif ni de logique clinique modifiée sans accord + `CHANGELOG`,
  vérif visuelle (Playwright/capture) avant livraison, dépôt Git partagé (ne pas toucher au hors-scope).

## 4. Lots (livrables séparément, ordre recommandé)

### Lot A — Refonte dashboard praticien (petit, fort impact) — P1
- Fichier : `web/src/app/dashboard/page.tsx`.
- Retirer le bloc « Feuille de route migration ». Garder `MetricsSection`.
- Ajouter : accès rapides (cartes) vers Patients, Synthèse, Paramètres + **liste courte des
  patients à traiter** (demandes de modification, questionnaires en attente) → lien vers
  `dashboard/patients/[idPatient]`. Réutiliser `MetricCard`, `Badge`, thème sombre D1.
- Données : API `praticien/patients` (déjà consommée par `PatientsPanel`). Pas de nouvelle route.

### Lot B — Filtre catégorie dans l'assignation (petit) — P2
- Fichier : `web/src/components/PatientsPanel.tsx` (form « Nouvelle assignation », ~L305-314).
- `<select>` « Catégorie » (valeurs distinctes de `questionnaires[].categorie`) filtrant **côté
  client** la liste des questionnaires ; « Toutes » par défaut. Aucune route/migration.

### Lot C — Viz équilibre sur la fiche patient praticien (petit) — P3
- Fichier : `web/src/components/FichePatientPanel.tsx`.
- Ajouter `CerclesConcentriques` (`web/src/components/ui/CerclesConcentriques.tsx`) ou `ScoreRadar`
  à côté des jauges. Données 12 besoins : appeler aussi l'API `praticien/besoins` depuis la fiche,
  ou enrichir `praticien/equilibre`. Réutiliser le mapping radar de `DetailBesoinsPanel`.

### Lot D — Packs de questionnaires éditables (moyen/gros) — P4
⚠️ **Migration Prisma → STOP + confirmation explicite avant exécution.**
- Schéma : modèle `Pack` dans `web/prisma/schema.prisma` (`idPack`, `nom`, `thematique`,
  `description`, `questionnaireIds`, `actif`, timestamps). Migration `add_pack_model`.
- API : `web/src/app/api/praticien/packs/route.ts` (CRUD) + assignation groupée (étendre
  `api/praticien/assignations` ou route `packs/assign` : N assignations depuis `idPack` +
  `emailPatient` + `dateLimite` + `notes`, réutiliser la création d'assignation existante).
- UI : section « Packs » dans `PatientsPanel` (liste/CRUD + « Assigner un pack »). Réutiliser
  `inputCls`, `btnPrimary`, feedback. Portage : `archive/gas-legacy/Code.gs` (`getPacks`/`assignPack`).

### Lot E — Ciqual + compléments (R1/R2) — ÉPIC DIFFÉRÉ (non construit ici)
- Réf : `docs/claude/ROADMAP_AGENT_PLAN.md` (R1/R2), `BOUSSOLE_ALIMENTAIRE_CONTEXTE.md`,
  `MOTEUR_INTENTION_CLINIQUE_CONTEXTE.md`. Ingestion Ciqual ANSES (~3 200 aliments × ~60
  constituants) + mapping neuronutriments + bibliothèque compléments « clean » + écrans.
  Schéma déjà déployé (tables vides). **Fera l'objet de son propre plan.**

## 5. Vérification (par lot)

- `cd web && npm run type-check` + `bash scripts/release_go_no_go.sh --url https://app.wellneuro.fr`.
- Vérif visuelle Playwright/capture sur `/dashboard`, `/dashboard/patients`,
  `dashboard/patients/[idPatient]` avec un patient fictif seedé.
- Lot A : plus de feuille de route ; accès rapides + liste d'actions mènent aux bons écrans.
- Lot B : filtrer par catégorie restreint la liste ; « Toutes » remet tout ; assignation correcte.
- Lot C : viz d'ensemble cohérente avec les 12 besoins de `/besoins`.
- Lot D : créer/éditer/assigner un pack → N assignations créées et visibles ; RLS inchangé.

## 6. Fichiers/refs clés

- UI praticien : `web/src/components/PatientsPanel.tsx`, `FichePatientPanel.tsx`,
  `DetailBesoinsPanel.tsx`, `MetricsSection.tsx`, `NavBar.tsx`, `web/src/components/ui/*`.
- Écrans : `web/src/app/dashboard/*`. API : `web/src/app/api/praticien/*`.
- Moteur équilibre : `web/src/lib/equilibre/*`. Catalogue questionnaires : `web/src/lib/questions.ts`.
- Legacy (référence packs) : `archive/gas-legacy/Code.gs`. Roadmap : `docs/claude/ROADMAP_AGENT_PLAN.md`.
