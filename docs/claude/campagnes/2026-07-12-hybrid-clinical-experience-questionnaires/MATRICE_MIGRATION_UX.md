# Matrice de migration UX — HC-F

Écarts constatés entre les sources de spécification (`sources/`,
`CONTRATS_UX_P1.md`, briefs de lot) et l'implémentation réelle, consolidés
lot par lot à partir des sections « Résultats »/« Corrections » de chaque
fichier `lots/LOT-0X-*.md`. Ne reprend que les écarts réels constatés
pendant l'exécution — pas une réénumération du périmètre.

| Lot | Écart constaté | Résolution |
|---|---|---|
| LOT-00 | Audit initial affirmait à tort `SynthesePanel.tsx` non migré vers les tokens sémantiques (encore sur `--primary`/`--accent` legacy). | Corrigé en LOT-01 par vérification `grep` : aucun consommateur des variables legacy ne subsiste ; `AUDIT_UI_REEL.md`/`MATRICE_ECRANS_MIGRATION.md` mis à jour. |
| LOT-01 | Badge d'icône inactif du rail (`SidebarRail.tsx`, `MobileBottomNav.tsx`) utilisait le même token que son conteneur (`bg-rail-surface` des deux côtés) → invisible. | `--rail-muted`/`bg-rail-muted` ajouté, distinct de `--rail-surface` ; états `hover` corrigés. |
| LOT-02 | Tiroir tablette (Radix `Dialog.Portal`) rendait hors du conteneur `[data-theme="praticien"]` → tokens `--rail-*` non résolus, fond transparent. | `data-theme="praticien"` posé directement sur `Dialog.Overlay`/`Dialog.Content` ; documenté comme piège obligatoire pour toute primitive Radix portée future (`design-system-d1.md` §4). |
| LOT-02 | Le tiroir tablette (cœur du lot) n'était exercé par aucun test à un viewport tablette réel (768–1023px) — la branche de code n'était jamais parcourue en CI. | Nouveau test dédié (« tablet drawer navigation », viewport 900×1024) ajouté en revue, vérifie aussi l'absence de fond transparent. |
| LOT-03 | Blocage initial de `.click()` Playwright en Chromium headless : `requestAnimationFrame` ne se déclenche jamais dans ce sandbox, bloquant la vérification de stabilité avant clic. | Contournement `Xvfb` + `--headed` (aucune modification de code) — **réappliqué avec succès en LOT-05** pour la revalidation e2e finale. |
| LOT-03 | 3 sélecteurs Playwright ambigus découverts après le contournement ci-dessus (lien « Patients » du rail vs. carte, email dupliqué menu/page, placeholder « Nom * » sous-chaîne de « Prénom * »). | Scoping par section/`main`, `exact: true`. |
| LOT-04 | Interdit du brief (« ne jamais afficher `Enregistré` si conservation locale seule ») initialement à risque de contournement implicite via un futur « Synchronisé » sans backend réel. | `SaveStatusIndicator.tsx` documente explicitement que « Synchronisé » n'existe pas tant qu'aucune persistance serveur de brouillon n'existe — voir `LEXIQUE_UX_WELLNEURO.md`. |
| LOT-04 | Badge d'en-tête du dispatcher de questionnaire affichait toujours « Transmis au praticien », y compris en correction demandée. | Badge dynamique selon `statutReponses` (`modification_demandee` → « Correction demandée »). |
| LOT-04 | Garde-fou d'annulation (`annuleRef`) perdu lors du passage du hub questionnaires à `useCallback` — une réponse tardive après démontage pouvait écraser l'état. | Restauré en revue. |
| LOT-05 | 4 échecs Desktop Chromium au premier run e2e (`locator.click` timeout 120s). | Diagnostiqués comme le même problème d'environnement que LOT-03 (synthèse d'événements CDP bloquante en headless) — contournement Xvfb+headed réappliqué, 13/13 verts. Aucun écart applicatif. |
| LOT-05 | Branche `lot-05` initialement recréée par erreur depuis l'ancienne base commune (avant LOT-04) au lieu de la pointe de LOT-04 — 23 fichiers/~900 lignes de LOT-04 absents. | Rebasée sur la pointe réelle de LOT-04 avant toute validation ; type-check/lint/tests rejoués après correction. |

## Écarts non résolus (reportés en dette)

Voir `DETTE_UX_RESIDUELLE.md` pour la liste consolidée des éléments non
corrigés dans cette campagne.
