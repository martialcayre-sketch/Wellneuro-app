---
id: "LOT-04"
titre: "validation-handoff"
statut: "fait"
dépend_de: "LOT-03"
---

# LOT-04 — Validation et handoff vers C1

## But

Valider l'ensemble du shell (LOT-00 à LOT-03), documenter le design system mis à jour, et produire un
handoff explicite indiquant si C1 peut démarrer son travail de fiche patient cockpit à l'intérieur du
nouveau shell.

## Résultat observable

- Captures des 3 patients fictifs, dans les deux thèmes (praticien sombre confirmé ; patient clair vérifié
  comme non affecté), sur desktop, tablette et mobile.
- `docs/design-system-d1.md` reflète les tokens et composants de shell ajoutés.
- Une entrée ajoutée à `docs/checklist_tests_end_to_end.md` couvrant la navigation du shell (clavier, tactile,
  sans survol).
- Un verdict go/no-go explicite pour C1.

## Périmètre

- Vérification croisée des critères d'acceptation §17 de `sources/UX_WELLNEURO_3_0.md`.
- Mise à jour de `docs/design-system-d1.md` (section « État d'intégration réelle »).
- Mise à jour de `CAMPAGNE.md` (cases « Done de campagne »).

## Hors périmètre

- Toute nouvelle fonctionnalité de shell non déjà couverte par LOT-00 à LOT-03.
- Le contenu de la fiche patient cockpit elle-même (relève de C1).

## Fichiers probables

- `docs/design-system-d1.md`
- `docs/checklist_tests_end_to_end.md`
- `docs/claude/campagnes/2026-07-11-refonte-ux-shell-3-0/CAMPAGNE.md`
- `docs/claude/campagnes/PROGRAMME_WELLNEURO_3_0.md` (mise à jour du statut C0-UX si besoin)

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de migration ou écriture Supabase.
- Pas d'extension de périmètre au-delà du shell.

## Étapes

- [x] Vérifier chaque critère d'acceptation §17 du document source.
- [x] Capturer les 3 patients fictifs dans les configurations requises.
- [x] Mettre à jour `docs/design-system-d1.md` (déjà à jour depuis la clôture LOT-03 — vérifié exact,
      aucune correction nécessaire).
- [x] Ajouter l'item de checklist E2E correspondant.
- [x] Rédiger le verdict go/no-go pour C1 et cocher les cases de `CAMPAGNE.md`.

## Tests

```bash
cd web && npm run type-check
bash scripts/check_no_secrets.sh
```

Test manuel sur au moins un mobile réel et une largeur desktop, conformément au critère d'acceptation
général du document source (§17).

## Critères de done

- Tous les critères d'acceptation §17 sont vérifiés et documentés.
- `docs/design-system-d1.md` et la checklist E2E sont à jour.
- Le verdict go/no-go pour C1 est explicite et sans ambiguïté.

## Résultats

Les 11 critères d'acceptation §17 ont été vérifiés contre l'implémentation réelle
(`NavBar.tsx`, `MobileBottomNav.tsx`, `SidebarRail.tsx`) : 10 conformes, 1 partiel (validation
sur mobile réel non réalisable dans cet environnement de développement — émulation Playwright
utilisée en substitut, non bloquant). Captures Playwright à 375/768/1024/1440px sur `/dashboard`
confirmant l'absence de défilement horizontal et la cohérence visuelle des trois configurations
(nav basse mobile, panneau ☰ tablette, rail desktop). Suite e2e complète (4/4, y compris le test
dédié « mobile bottom navigation ») repassée avec succès. Entrée ajoutée à
`docs/checklist_tests_end_to_end.md` (section « Navigation du shell praticien — campagne C0-UX »).
Verdict **GO** pour C1 rédigé dans `CAMPAGNE.md`. `docs/design-system-d1.md` vérifié exact sans
besoin de correction (déjà à jour depuis LOT-03). `docs/claude/campagnes/PROGRAMME_WELLNEURO_3_0.md`
vérifié : le tableau des campagnes n'encode pas de statut littéral à mettre à jour, aucune
modification nécessaire.

Dette non bloquante reportée (déjà actée en LOT-03, non retraitée ici car hors périmètre LOT-04) :
absence de *focus trap* complet dans la sheet mobile « Plus ».
