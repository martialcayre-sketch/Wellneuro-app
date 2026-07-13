---
id: "LOT-05-gouvernance-handoff"
titre: "Gouvernance et handoff"
statut: "livré — verdict GO avec dettes, campagne à marquer terminée sur validation explicite"
dépend_de: ["LOT-02", "LOT-03", "LOT-04"]
---

# LOT-05 — Gouvernance et handoff

## But

Valider la cohérence globale du périmètre HC-F réel (shell praticien, mécanismes livrés vides et testés, portail patient clair), fermer la campagne proprement et rendre Hybrid Clinical opposable aux modules futurs.

## Périmètre

- tests transverses (shell, mécanismes, portail patient) ;
- captures comparatives ;
- audit accessibilité ;
- documentation canonique (`design-system-d1.md` ou successeur) ;
- lexique UX praticien/patient ;
- checklist de conformité Hybrid Clinical opposable aux campagnes futures ;
- handoff vers C1 (contrats d'instanciation des mécanismes, cockpit/carte de décision/timeline/comparateur/constructeur 21 jours restent des intrants C1/C2) et vers QX (moteur de rendu questionnaires).

## Hors périmètre

- validation des questionnaires, pilotes ou politiques psychométriques (→ QX) ;
- matrice de maturité pour timeline, carte de décision, comparateur avant/maintenant ou constructeur 21 jours : ces éléments ne sont pas dans HC-F, leur handoff relève de C1/C2.

## Fichiers probables

- `docs/design-system-d1.md` ou successeur canonique
- `docs/checklist_tests_end_to_end.md`
- `docs/claude/PROJET_CONTEXTE.md` si l'état courant change réellement
- `CHANGELOG.md` si le mode d'administration visible évolue
- `docs/claude/SESSION_LOG.md`
- documents de campagne et matrices produites
- tests Playwright/Vitest

## Interdits

- ne pas maquiller un test non exécuté comme réussi ;
- ne pas fermer avec des divergences documentaires connues non signalées ;
- ne pas lancer une migration de données ;
- ne pas étendre le périmètre à un nouveau module ;
- ne pas déclarer un mécanisme `livré` si son contrat d'instanciation n'est pas testé ;
- ne pas fermer la campagne sans arbitrer les capacités différées.

## Matrice de validation

### Visuel

- praticien clair (rail sombre structurel + espace de travail clair) ;
- patient clair fixe ;
- desktop/tablette/mobile ;
- alignements du rail ;
- icônes ;
- densité contextuelle ;
- états vides/chargement/erreur ;
- mode consultation (coquille vide, contrat d'instanciation) ;
- prévisualisation patient (coquille vide, contrat d'instanciation).

### Interaction

- souris ;
- tactile ;
- clavier ;
- lecteur d'écran ;
- zoom 200 % ;
- reduced motion ;
- session expirée ;
- réseau instable ;
- reprise brouillon ;
- fermeture palette/dialog/drawer et retour du focus.

### Confiance patient

- résumé de session fondé sur des faits ;
- distinction conservation locale / synchronisation / transmission ;
- messages réseau et erreurs compréhensibles ;
- confort de lecture ;
- prochaine action explicite ;
- thème clair fixe.

## Étapes

1. Exécuter les validations techniques standard.
2. Exécuter l'ensemble des tests E2E concernés (shell, portail patient — hors parcours questionnaires, propriété QX).
3. Produire les captures aux largeurs de référence.
4. Réaliser un audit visuel avec mesures d'alignement.
5. Vérifier les trois patients fictifs uniquement.
6. Vérifier que chaque mécanisme (mode consultation, double niveau de lecture, prévisualisation patient) est livré vide, testé, avec un contrat d'instanciation documenté.
7. Documenter les écarts entre prototype, spécification et implémentation.
8. Mettre à jour le design system canonique.
9. Produire le lexique UX praticien/patient.
10. Mettre à jour la checklist E2E.
11. Produire la checklist de conformité Hybrid Clinical opposable aux modules futurs.
12. Documenter le handoff vers C1 (contrats d'instanciation des mécanismes) et vers QX (aucune dépendance technique bloquante restante).
13. Émettre un verdict GO / GO avec dettes / NO-GO borné au périmètre HC-F réel.
14. Mettre à jour le journal de session.

## Commandes minimales

```bash
bash scripts/check_no_secrets.sh
cd web
npm run type-check
npm run lint
npm run test
npm run test:e2e
```

## Livrables

- `VALIDATION_FINALE.md` ;
- `MATRICE_MIGRATION_UX.md` ;
- `LEXIQUE_UX_WELLNEURO.md` ;
- `DETTE_UX_RESIDUELLE.md` ;
- `HANDOFF_FUTURES_IMPLANTATIONS.md` ;
- captures et résultats de tests.

## Contenu minimal du lexique

- termes praticien autorisés ;
- termes patient autorisés ;
- traductions des statuts techniques ;
- vocabulaire sauvegarde/synchronisation/transmission ;
- brouillon/validation/envoi ;
- messages d'erreur ;
- confirmations ;
- formulations à éviter.

## Handoff futur

Le handoff doit indiquer :

- composants obligatoires ;
- contrats d'instanciation des 3 mécanismes ;
- capacités réellement livrées ;
- capacités différées et prérequis ;
- dépendances avec C1 (cockpit, carte de décision, timeline, comparateur, constructeur 21 jours restent à concevoir côté C1/C2) et avec QX (moteur de rendu questionnaires) ;
- campagne suivante recommandée.

## Done

- [x] Toutes les validations réellement exécutées sont consignées
      (`checklist_tests_end_to_end.md` § Campagne HC-F, `VALIDATION_FINALE.md`).
- [x] Les écarts non testables sont explicitement signalés
      (`DETTE_UX_RESIDUELLE.md`, `VALIDATION_FINALE.md`).
- [x] Documentation canonique à jour (`design-system-d1.md` §4bis + §5 + §7).
- [x] Checklist de conformité livrée et opposable aux campagnes futures
      (`HANDOFF_FUTURES_IMPLANTATIONS.md`).
- [x] Lexique UX livré (`LEXIQUE_UX_WELLNEURO.md`).
- [x] Contrats d'instanciation des 3 mécanismes correctement qualifiés
      (`design-system-d1.md` §4bis).
- [x] Handoff C1/QX documenté (`HANDOFF_FUTURES_IMPLANTATIONS.md` § Dépendances).
- [x] Verdict final émis : **GO avec dettes** (`VALIDATION_FINALE.md`).
- [ ] Campagne marquée terminée uniquement après validation explicite —
      **en attente**, ne pas cocher sans confirmation de l'utilisateur.

## Résultats

**Fichiers créés** : `LEXIQUE_UX_WELLNEURO.md`, `HANDOFF_FUTURES_IMPLANTATIONS.md`,
`MATRICE_MIGRATION_UX.md`, `DETTE_UX_RESIDUELLE.md`, `VALIDATION_FINALE.md`
(tous dans ce dossier de campagne).

**Fichiers amendés** : `docs/design-system-d1.md` (nouvelle section 4bis
« Mécanismes transverses », traçabilité LOT-00 à LOT-05) ;
`docs/checklist_tests_end_to_end.md` (nouvelle section « Campagne HC-F »,
LOT-00 à LOT-05) ; `AUDIT_UI_REEL.md` (1 occurrence « Dogné » → « Dogne »,
pour satisfaire le DoD `CAMPAGNE.md`).

**Correction de branche préalable aux validations** : la branche
`campaign/hc-f-hybrid-clinical-foundation/lot-05` avait été recréée par
erreur depuis l'ancienne base commune avec `lot-04` (avant les commits
LOT-04) plutôt que depuis sa pointe réelle — 23 fichiers/~900 lignes de
LOT-04 (portail patient clair) absents. Détecté avant toute validation,
corrigé par rebase sur `campaign/hc-f-hybrid-clinical-foundation/lot-04`
(commit `9218d07`), poussé en force (`--force-with-lease`, autorisation
utilisateur explicite requise par le hook `block-risky-commands.mjs`).

**Revalidation e2e (porte laissée ouverte par LOT-04)** : menée à son
terme, pas seulement tentée. Premier run complet : 10/26. Diagnostic
délégué à l'agent `wn-debugger` pour les 4 échecs Desktop Chromium :
synthèse d'événements souris via CDP anormalement lente en headless dans ce
sandbox — même classe de problème que celui déjà rencontré et contourné en
LOT-03 (`requestAnimationFrame` jamais déclenché en headless). Contournement
LOT-03 réappliqué (`xvfb-run -a … --headed`, après installation du paquet
système `xauth` manquant) : **13/13 Desktop Chromium verts**. WebKit/iPhone
13 reste non exécutable (librairies système manquantes, cause distincte et
confirmée, limitation pré-existante déjà acceptée depuis C0-UX LOT-03).

**Validations exécutées et vertes** : `check_no_secrets.sh`, `type-check`,
`lint`, Vitest (14/14, 77/77), e2e Desktop Chromium (13/13).

**Verdict** : GO avec dettes (détail complet dans `VALIDATION_FINALE.md`).
Dettes non bloquantes listées dans `DETTE_UX_RESIDUELLE.md`, dont une
divergence documentaire signalée mais non corrigée (orthographe
« Dogne »/« Dogné » incohérente entre `CLAUDE.md`/code de test et la
décision HC-F du 2026-07-12 — hors périmètre de ce lot, risqué à corriger
à l'aveugle dans du code de test sans vérifier les seeds DB).
