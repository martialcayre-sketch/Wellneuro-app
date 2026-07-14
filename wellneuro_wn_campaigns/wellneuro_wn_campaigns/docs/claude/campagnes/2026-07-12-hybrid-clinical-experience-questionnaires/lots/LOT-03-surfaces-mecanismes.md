---
id: "LOT-03-surfaces-mecanismes"
titre: "Surfaces praticien génériques et mécanismes transverses"
statut: "terminé"
dépend_de: ["LOT-02"]
---

# LOT-03 — Surfaces praticien génériques et mécanismes transverses

> Rédigé par LOT-00 à partir de `ARBITRAGES_LOT_00.md` et
> `CONTRATS_UX_P1.md` (ce fichier n'existait pas avant l'amendement de
> `CAMPAGNE.md` — contenu supprimé, jamais réécrit). **Validé par
> l'utilisateur le 2026-07-12** comme base de travail ; l'exécution reste
> conditionnée à l'autorisation explicite de LOT-01 puis LOT-02 au préalable.

## But

Livrer les coquilles des surfaces praticien génériques restantes (dashboard,
annuaire patients) dans le shell premium de LOT-02, et livrer les 3
mécanismes transverses HC-F (`ModeConsultation`, double niveau de lecture,
`PrévisualisationPatient`) **vides et testés**, chacun avec son contrat
d'instanciation documenté dans `CONTRATS_UX_P1.md`.

## Prérequis

- `feat/e0-patients-pagination` doit être mergée avant tout restylage de
  l'annuaire patients (`/dashboard/patients`) — séquencement E0 déjà acté
  dans `PROGRAMME_WELLNEURO_3_0.md`.
- LOT-02 (shell premium) terminé.

## Périmètre proposé

- Coquilles restylées : `/dashboard` (accueil), `/dashboard/patients`
  (annuaire, sous réserve du prérequis E0), `/dashboard/parametres`.
- Mécanisme `ModeConsultation` : enveloppe de bascule de mise en page sur
  `dashboard/patients/[idPatient]`, sans logique clinique (contrat §1 de
  `CONTRATS_UX_P1.md`).
- Mécanisme double niveau de lecture : composant générique résumé/détail,
  testé avec un contenu factice neutre (contrat §2).
- Mécanisme `PrévisualisationPatient` : réutilisation des composants du
  portail réel en lecture seule (contrat §3) — **dépend de la correction du
  point de risque de frontière de données signalé en `AUDIT_UI_REEL.md` §4**
  si la prévisualisation doit s'appuyer sur les mêmes routes API.

## Hors périmètre

- Restylage de `FichePatientPanel.tsx` en tant que futur cockpit (différé,
  cf. `ARBITRAGES_LOT_00.md` §1 — attend le contrat de données C1).
- Tout contenu clinique instancié dans les mécanismes (→ C1).
- Palette de commandes (différée, cf. `ARBITRAGES_LOT_00.md` §4).

## Interdits

- Aucune migration Prisma/SQL.
- Aucune modification de la logique de scoring ou des routes API patient
  (le point de risque `api/patient/reponses` est un correctif séparé, pas
  ce lot).
- Aucun contenu clinique inventé dans les mécanismes livrés.

## Done

- [x] Contenu de ce lot validé explicitement par l'utilisateur (2026-07-13) :
      refactor complet de `PatientsPanel.tsx` (extraction `Input`/`Button`/
      `Select`), résolution du point d'authentification `PrévisualisationPatient`
      (nouvelle route `api/praticien/apercu-patient/reponses` + props additifs
      sur `ConsultationScreen.tsx`), bouton d'aperçu ajouté dans
      `FichePatientPanel.tsx`, test `TwoLevelReading` via nouvelle dépendance
      dev `@testing-library/react`/`jsdom`/`@vitejs/plugin-react`.
- [x] Coquilles restylées sans régression fonctionnelle : `/dashboard`,
      `/dashboard/parametres`, `/dashboard/patients` (icônes Lucide,
      composants `Input`/`Button`/`Select` partagés). Prérequis E0
      (`feat/e0-patients-pagination`) confirmé mergé (PR #13) avant le
      restylage de l'annuaire.
- [x] 3 mécanismes livrés vides, testés, avec contrat d'instanciation
      documenté dans `CONTRATS_UX_P1.md` (§1/§2/§3, section) :
      `ModeConsultation` (`web/src/components/ui/ModeConsultation.tsx`),
      `TwoLevelReading` (`web/src/components/ui/TwoLevelReading.tsx`),
      `PatientPreview`/`PrévisualisationPatient`
      (`web/src/components/PatientPreview.tsx` + nouvelle route
      `api/praticien/apercu-patient/reponses`).
- [x] Prérequis E0 vérifié avant restylage de l'annuaire (voir ci-dessus).
- [ ] LOT-04 et LOT-05 autorisés — à faire sur instruction explicite de
      l'utilisateur après revue de ce lot.

### Validations exécutées

- `npm run type-check`, `npm run lint`, `bash scripts/check_no_secrets.sh` :
  verts.
- `npm run test` (Vitest, 10 fichiers/63 tests dont le nouveau
  `TwoLevelReading.test.tsx`) : vert.
- Playwright — suite complète exécutée localement contre la base de dev
  distante, **13/13 verts** (projet Desktop Chromium) : `dashboard-praticien.spec.ts`
  (8, dont les 3 nouvelles assertions de non-régression), `mode-consultation.spec.ts`,
  `patient-preview.spec.ts` (401/400/404), `portail-parcours.spec.ts` (parcours
  complet Michel Dogné, y compris la nouvelle étape « Aperçu praticien de la
  vue patient » — dialog, texte patient-safe, masquage correction/équilibre,
  forme JSON de la nouvelle route). Projet iPhone 13 (WebKit) non exécutable
  dans cet environnement (limitation préexistante déjà documentée, OK en CI).
  Root cause d'un blocage initial de `.click()` identifiée et contournée :
  `requestAnimationFrame` ne se déclenche jamais dans le Chromium headless de
  ce sandbox (vérifié isolément), ce qui bloque indéfiniment la vérification
  de stabilité de Playwright avant tout clic — reproductible sur un bouton
  préexistant non lié à ce lot (`SidebarRail.tsx`, « Étendre la navigation »),
  donc pas une régression du lot. Contournement : `Xvfb` + navigateur non
  headless (`--headed`), qui restaure `requestAnimationFrame` et fait
  fonctionner `.click()` normalement — aucune modification de code nécessaire.
  Ce contournement a aussi révélé 3 vrais bugs de sélecteurs ambigus dans les
  nouvelles assertions (`dashboard-praticien.spec.ts` : lien « Patients » du
  rail vs. carte, email dupliqué menu/page, placeholder « Nom * » sous-chaîne
  de « Prénom * ») — corrigés (scoping par section/`main`, `exact: true`).
- Vérification manuelle du refactor `PatientsPanel.tsx` : couverte par le
  test Playwright dédié (formulaire de création patient rendu et visible
  après refactor) ; les flux d'assignation et d'édition inline n'ont pas été
  exercés manuellement au-delà des tests automatisés existants.

### Clôture

Mergé sur `main` via PR [#40](https://github.com/martialcayre-sketch/Wellneuro-app/pull/40)
(merge commit `28f9fe5`), CI GitHub Actions verte (`verify`, `devcontainer-smoke`,
Vercel preview). Revue indépendante (`/wn-review`) : go, 3 constats non
bloquants corrigés avant merge (sélecteurs Playwright ambigus, `.vercel/`
absent du `.gitignore` racine).
