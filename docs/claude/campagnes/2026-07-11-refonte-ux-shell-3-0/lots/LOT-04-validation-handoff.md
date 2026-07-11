---
id: "LOT-04"
titre: "validation-handoff"
statut: "à_faire"
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

- [ ] Vérifier chaque critère d'acceptation §17 du document source.
- [ ] Capturer les 3 patients fictifs dans les configurations requises.
- [ ] Mettre à jour `docs/design-system-d1.md`.
- [ ] Ajouter l'item de checklist E2E correspondant.
- [ ] Rédiger le verdict go/no-go pour C1 et cocher les cases de `CAMPAGNE.md`.

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

À compléter à la clôture.
