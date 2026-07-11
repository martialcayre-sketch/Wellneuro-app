---
id: "2026-07-11-refonte-ux-shell-3-0"
titre: "Refonte UX shell praticien 3.0"
statut: "en_cours"
créée_le: "2026-07-11"
mise_à_jour: "2026-07-11"
lot_courant: "LOT-04"
---

# Refonte UX shell praticien 3.0

## Objectif

Faire évoluer le shell praticien (navigation, barre de commande, adaptation mobile/tablette) depuis la
navigation horizontale actuelle (`NavBar.tsx`) vers l'architecture cible décrite dans
`sources/UX_WELLNEURO_3_0.md` : rail de navigation gauche sur desktop/tablette, navigation basse sur mobile,
sans changer les routes ni la logique métier. Réconcilier au passage les tokens sémantiques proposés avec
ceux déjà livrés par la série D1 (`docs/design-system-d1.md`).

## Résultat observable

- Une maquette texte/wireframe validée (rail gauche, barre de commande, navigation mobile) et les questions
  ouvertes du document source tranchées, avant tout code.
- Le shell praticien implémenté (`NavBar.tsx` + `web/src/app/dashboard/layout.tsx`), visible dans les deux
  thèmes, sur desktop/tablette/mobile, avec les 3 patients fictifs (Sophie Nicola, Jennifer Martin,
  Michel Dogne) comme données de démonstration.
- `docs/design-system-d1.md` mis à jour pour refléter les tokens et composants de shell ajoutés.
- Un handoff explicite indiquant si C1 (Décision clinique 21 jours V1) peut démarrer son travail sur la fiche
  patient cockpit à l'intérieur du nouveau shell.

## Contraintes non négociables

- Tous les textes d'interface utilisateur sont en français.
- Aucun secret, jeton, mot de passe ou identifiant sensible en dur.
- Aucune donnée patient réelle dans le code, les exemples, les maquettes, les seeds ou les tests.
- Patients fictifs autorisés uniquement : Sophie Nicola, Jennifer Martin et Michel Dogne.
- Aucune migration Prisma/SQL et aucune écriture Supabase sans demande explicite et confirmation distincte.
- Changements minimaux : pas de refactor global hors périmètre du lot ; routes, `signOut` et logique
  métier existante inchangés.
- Aucune fonction critique ne dépend uniquement du survol ; zones tactiles ≥ 44×44 px ; focus clavier jamais
  supprimé sans alternative visible.
- Aucun état clinique signalé par la seule couleur (garde-fou D1 déjà en vigueur, à respecter dans tout
  nouveau composant de shell).

## Hors périmètre global

- Dashboard léger, annuaire patients, fiche patient, portail patient (phases UX-2 à UX-5 du document
  source) — déjà couverts, au moins partiellement, par les campagnes C1 (`06_SPEC_UX_COCKPIT_PRATICIEN.md`,
  `LOT-01-contrat-ux-e2e.md`), C3, C4 et C5. Cette campagne ne les modifie pas.
- Préparation WellNeuro 4.0 (phase UX-6) — différée, cf. « Modules différés » de
  `PROGRAMME_WELLNEURO_3_0.md`.
- Modification de routes API, du scoring, de l'authentification/session, de `PatientsPanel.tsx` (logique),
  d'`archive/gas-legacy/`.
- Introduction d'un theme-provider JS, de `next-themes`, d'un toggle utilisateur de thème, de Storybook, ou
  d'une abstraction Radix massive (interdits D1, toujours en vigueur).

## Décisions prises

- Le document `sources/UX_WELLNEURO_3_0.md` est un document de cadrage/brainstorming ; il ne constitue pas
  en lui-même une autorisation d'implémenter — chaque lot de code (LOT-02, LOT-03) reste soumis au mode Plan
  avant toute modification, comme le reste du programme.
- Les tokens sémantiques proposés en §11.1 du document source ne remplacent pas automatiquement ceux de
  `docs/design-system-d1.md` : LOT-01 tranche entre extension additive et renommage, avec audit des
  consommateurs existants (leçon du garde-fou `--primary`/`--color-primary` déjà documenté).

## Questions ouvertes

- Le rail gauche doit-il être toujours compact ou mémoriser son état ouvert ?
- La recherche globale doit-elle inclure uniquement les patients ou aussi questionnaires/packs/documents ?
- Le dashboard doit-il être personnalisable par le praticien ?
- Faut-il conserver le tableau patients comme mode expert (question posée ici pour le shell, tranchée
  fonctionnellement par C3/annuaire) ?
- Quelles sont les quatre entrées prioritaires de la navigation mobile praticien ?

## Dépendances

- C0 (alignement documentaire et état réel du dépôt) doit être validé avant de démarrer LOT-02/LOT-03.
- C1 dépend en retour de cette campagne : son travail sur la fiche patient cockpit doit s'insérer dans le
  nouveau shell plutôt que dans l'ancienne navigation horizontale.

## Artefacts de préparation

- `BRIEF_COMPILED.md` : synthèse structurée et restreinte au périmètre shell + tokens.
- `sources/UX_WELLNEURO_3_0.md` : document de cadrage UX complet d'origine (copie, traçabilité).

## Lots

| Lot | Objet | Statut | Dépend de |
|---|---|---|---|
| LOT-00 | Cadrage et arbitrage des questions ouvertes (maquette validée, zéro code) | fait | aucun |
| LOT-01 | Audit et réconciliation des tokens sémantiques | fait | LOT-00 |
| LOT-02 | Shell desktop/tablette (rail gauche + barre de commande) | fait | LOT-01 |
| LOT-03 | Navigation mobile (bottom nav + bottom sheet) | fait | LOT-02 |
| LOT-04 | Validation et handoff vers C1 | à_faire | LOT-03 |

## Commande `/wn` de reproduction

```text
/wn-campaign creer "Refonte UX shell praticien 3.0" --source docs/claude/campagnes/2026-07-11-refonte-ux-shell-3-0/sources --lots 5 --slug refonte-ux-shell-3-0 --auto-final
```

Note : cette `CAMPAGNE.md` a été rédigée à la main (comme celle de C0), pas générée automatiquement par le
script — la commande ci-dessus reproduirait le squelette et les sources importées, pas ce contenu détaillé.

## Done de campagne

- [x] La maquette du shell (desktop/tablette/mobile) est validée et les questions ouvertes tranchées.
- [x] Les tokens sémantiques sont réconciliés et documentés dans `docs/design-system-d1.md`.
- [x] Le shell est implémenté sans changement de route ni de logique métier (LOT-02, desktop/tablette ;
      LOT-03, navigation basse mobile dédiée `<768px`, conforme aux zones tactiles et sans dépendance
      au survol).
- [x] La navigation mobile respecte les zones tactiles et l'absence de dépendance au survol.
- [x] Les 3 patients fictifs sont visibles dans les deux thèmes et les trois largeurs (desktop/tablette/mobile) —
      thème praticien sombre vérifié (seul thème concerné pour le shell praticien, cf. LOT-00-arbitrage §2.7) ;
      thème patient (portail) hors périmètre de cette campagne.
- [ ] Le handoff indique clairement si C1 peut démarrer son travail de fiche patient dans le nouveau shell.

## Backlog ultérieur

- Phases UX-2 à UX-5 du document source (dashboard léger, annuaire, fiche patient, portail patient) : à
  suivre dans C1/C3/C4/C5, pas dans une nouvelle campagne dédiée.
- Phase UX-6 (préparation WellNeuro 4.0 — timeline longitudinale, affichage des sources IA) : campagne WN
  distincte, après stabilisation de C1→C5.
