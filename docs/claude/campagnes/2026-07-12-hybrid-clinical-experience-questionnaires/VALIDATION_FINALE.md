# Validation finale — HC-F (Hybrid Clinical Foundation)

Périmètre : HC-F réel (LOT-00 à LOT-05) uniquement. Ne se prononce pas sur
C1, QX, ni sur le contenu clinique — hors périmètre par construction
(`CAMPAGNE.md` § Hors périmètre).

## Validations techniques standard (LOT-05, sur branche rebasée sur la pointe de LOT-04)

| Commande | Résultat |
|---|---|
| `bash scripts/check_no_secrets.sh` | ✅ OK |
| `npm run type-check` | ✅ 0 erreur |
| `npm run lint` | ✅ 0 avertissement/erreur |
| `npm run test` (Vitest) | ✅ 14/14 fichiers, 77/77 tests |
| `npm run test:e2e` — Desktop Chromium | ✅ 13/13 (via `xvfb-run -a … --headed`, contournement identique à LOT-03 — voir `checklist_tests_end_to_end.md`) |
| `npm run test:e2e` — iPhone 13 (WebKit) | ❌ 0/12 — librairies système manquantes, limitation d'environnement pré-existante et déjà acceptée (C0-UX LOT-03, HC-F LOT-02/03), sans rapport avec le code livré |

## Matrice de validation

### Visuel

- [x] Praticien clair (rail sombre structurel + espace de travail clair) —
  vérifié par le design system (`design-system-d1.md`) et les assertions
  e2e (aucun débordement horizontal 375/768/1024/1440px).
- [x] Patient clair fixe — vérifié par la suite e2e (`portail-parcours`,
  thème forcé clair).
- [x] Desktop/tablette/mobile — largeurs de référence couvertes par les
  assertions e2e existantes.
- [ ] Contrôle visuel humain / captures d'écran de référence — **non
  produit dans cette session** (outil de capture indisponible, même
  limitation que LOT-00). Voir `DETTE_UX_RESIDUELLE.md`.
- [x] Alignements du rail, icônes, densité contextuelle — vérifiés en
  LOT-01/LOT-02 (contrastes AA/AAA calculés, `design-system-d1.md` §2).
- [x] États vides/chargement/erreur — vérifiés par `PatientErrorState.tsx`
  et les tests dédiés.
- [x] Mode consultation / prévisualisation patient : coquilles vides,
  contrats d'instanciation documentés (`design-system-d1.md` §4bis).

### Interaction

- [x] Souris, tactile (zones ≥44px, vérifié e2e).
- [x] Clavier — Escape ferme sheet/drawer, focus rendu au déclencheur
  (assertions e2e dédiées, toutes vertes sous Xvfb+headed).
- [ ] Lecteur d'écran réel — non testé humainement dans cette session (pas
  d'accès à un lecteur d'écran interactif dans ce sandbox). Dette actée,
  non bloquante (récurrente depuis C0-UX).
- [ ] Zoom 200 % — non testé humainement ; non couvert par la suite e2e
  actuelle.
- [x] Reduced motion — respecté par construction (Motion limité aux
  transitions d'état, cf. interdits D1 §5).
- [x] Session expirée, réseau instable — couverts par
  `SaveStatusIndicator.tsx` et les tests associés.
- [x] Reprise brouillon — testée (`portail-visite.test.ts`, e2e).
- [x] Fermeture palette/dialog/drawer et retour du focus — testée
  (Radix Dialog, assertions e2e dédiées).

### Confiance patient

- [x] Résumé de session fondé sur des faits — `SaveStatusIndicator.tsx`,
  hub questionnaires.
- [x] Distinction conservation locale / synchronisation / transmission —
  documentée explicitement, y compris l'absence réelle de
  « Synchronisé » (`LEXIQUE_UX_WELLNEURO.md`).
- [x] Messages réseau et erreurs compréhensibles — `PatientErrorState.tsx`.
- [x] Prochaine action explicite — hub orienté action (LOT-04).
- [x] Thème clair fixe — pas de dépendance au thème système.

## Vérification patients fictifs

Seuls Sophie Nicola, Jennifer Martin et Michel Dogné apparaissent dans les
livrables produits par ce lot. L'arbitrage initial sans accent a été
supersédé le 2026-07-14 : `AGENTS.md`, le seed fictif et les tests retiennent
désormais la forme normative **Michel Dogné**.

## Mécanismes transverses — qualification

Les 3 mécanismes (`ModeConsultation`, `TwoLevelReading`, `PatientPreview`)
sont livrés **vides**, sans contenu clinique, avec un contrat
d'instanciation d'une page chacun, désormais canonisé dans
`design-system-d1.md` §4bis (au lieu de rester uniquement dans
`CONTRATS_UX_P1.md`, document de cadrage LOT-00). Chacun est référencé par
au moins un test e2e vert (`mode-consultation.spec.ts`,
`patient-preview.spec.ts`) ou par les assertions du parcours portail
(`TwoLevelReading` : testé isolément en unitaire, `TwoLevelReading.test.tsx`,
LOT-03).

## Verdict

**GO avec dettes**, borné au périmètre HC-F réel.

Justification : toutes les validations techniques automatisables sont
vertes (type-check, lint, tests unitaires, e2e Desktop Chromium 13/13). La
porte laissée ouverte par LOT-04 (revalidation e2e/manuelle hors sandbox) a
été levée pour Chromium par une revalidation réelle et documentée dans ce
sandbox — au prix d'un contournement d'environnement déjà établi en LOT-03,
pas d'une simple hypothèse. WebKit reste une limitation d'environnement
non résolue, pré-existante à HC-F, sans lien démontré avec le code livré.

Ce n'est pas un GO plein car : (1) aucune vérification humaine directe
(lecteur d'écran réel, zoom 200 %, device mobile physique, captures
visuelles) n'a été faite dans cette session — les équivalents automatisés
existent mais ne remplacent pas un contrôle humain ; (2) plusieurs dettes
de code mineures listées dans `DETTE_UX_RESIDUELLE.md` restent ouvertes
(persistance serveur du brouillon, `email` en query string legacy, WebKit
non exécutable localement). La divergence orthographique, arbitrée de nouveau
le 2026-07-14 en faveur de **Michel Dogné**, n'entre plus dans ce compte.

Aucune de ces réserves ne bloque le handoff vers C1/QX (aucune dépendance
technique bloquante identifiée, cf. `HANDOFF_FUTURES_IMPLANTATIONS.md`).
