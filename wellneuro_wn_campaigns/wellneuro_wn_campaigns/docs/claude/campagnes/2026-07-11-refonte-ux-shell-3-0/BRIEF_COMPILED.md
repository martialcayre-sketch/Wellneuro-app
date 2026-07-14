# Brief compilé — Refonte UX shell praticien 3.0

Synthèse manuelle de `sources/UX_WELLNEURO_3_0.md`, restreinte au périmètre retenu pour cette campagne
(shell + tokens). Le reste du document (dashboard léger, annuaire, fiche patient, portail patient,
préparation 4.0) est renvoyé aux campagnes qui le couvrent déjà — voir « Hors périmètre » dans `CAMPAGNE.md`.

## 1. Diagnostic retenu (§2 du document source)

- Navigation praticien actuelle horizontale (`NavBar.tsx`) : convient à peu de modules, se tassera à mesure
  que de nouveaux modules (Mon équilibre, biologie, protocoles, compléments, documents) s'ajoutent.
- Dépendance partielle au survol (`hover`, `title`) : non fiable sur tablette/mobile.
- Aucune navigation mobile dédiée aujourd'hui.

## 2. Principes directeurs retenus (§3)

- Praticien : voir immédiatement ce qui nécessite une action, sans avoir à le chercher.
- Mobile : aucune action importante ne doit dépendre du survol, d'une icône minuscule, d'un tableau
  horizontal ou d'un geste caché.

## 3. Architecture cible retenue (§4, restreint au shell)

- Desktop/tablette large : rail de navigation gauche compact (icône + libellé à l'expansion), barre de
  commande supérieure (recherche globale, action rapide, notifications, profil).
- Tablette portrait : rail rétractable, accès par bouton menu explicite.
- Mobile : navigation basse limitée (Accueil / Patients / Synthèses / Plus), le menu « Plus » ouvre une
  bottom sheet (Packs / Équilibre / Biologie / Paramètres).
- Navigation praticien recommandée (icônes + libellés accessibles) : Accueil, Patients, Équilibre, Packs,
  Synthèses IA, Biologie, Paramètres — les routes existantes ne changent pas, seul le conteneur de
  navigation change.

## 4. Règles souris/tactile/clavier retenues (§9)

- Toute fonction critique doit être utilisable à la souris, au doigt, au clavier, avec un lecteur d'écran.
- Remplacer les tooltips/`title`/actions au survol par des boutons, popovers ou menus `⋯` cliquables.
- Zones tactiles ≥ 44×44 px.
- Le focus clavier ne doit jamais être supprimé sans alternative visible.

## 5. Tokens sémantiques proposés (§11.1) — à réconcilier, pas dupliquer

Le document propose : `surface-app`, `surface-panel`, `surface-elevated`, `surface-patient`, `text-primary`,
`text-secondary`, `text-muted`, `accent-primary`, `accent-secondary`, `status-success/warning/danger/info`,
`border-subtle`, `focus-ring`.

`docs/design-system-d1.md` documente déjà : `background`, `foreground`, `surface`/`surface-foreground`,
`muted`/`muted-foreground`, `border`, `primary`/`primary-foreground`, `accent`/`accent-foreground`, avec un
garde-fou explicite (`--primary`/`--accent` historiques non migrés dans `SynthesePanel.tsx`, à ne jamais
fusionner sans audit des consommateurs). LOT-01 doit trancher entre extension additive de ces tokens ou
adoption de la nomenclature du document — pas les deux en parallèle.

## 6. Feuille de route retenue (§16) — phases UX-0 et UX-1 seulement

- **Phase UX-0 — Validation conceptuelle** : choix du shell, validation du rail, validation de la navigation
  mobile, sélection d'un template graphique, validation de la hiérarchie du dashboard. Aucun changement
  métier.
- **Phase UX-1 — Shell praticien 3.0** : remplacer la navigation horizontale, conserver les routes actuelles,
  ne pas toucher la logique métier, ajouter la navigation mobile, harmoniser états actifs et focus clavier.

Phases UX-2 à UX-5 (dashboard léger, annuaire, fiche patient, portail patient) : déjà couvertes en germe par
C1 (`06_SPEC_UX_COCKPIT_PRATICIEN.md`, `LOT-01-contrat-ux-e2e.md`), C3, C4, C5 — non reprises ici. Phase UX-6
(préparation WellNeuro 4.0) : différée, cf. « Modules différés » de `PROGRAMME_WELLNEURO_3_0.md`.

## 7. Questions ouvertes retenues (§20, à trancher en LOT-00)

- Le rail gauche doit-il être toujours compact ou mémoriser son état ouvert ?
- La recherche globale doit-elle inclure uniquement les patients ou aussi questionnaires/packs/documents ?
- Le dashboard doit-il être personnalisable par le praticien ?
- Faut-il conserver le tableau patients comme mode expert ?
- Quelles sont les quatre entrées prioritaires de la navigation mobile praticien ?
- La fiche patient doit-elle ouvrir par défaut sur la vue clinique ou la dernière section consultée ?

## 8. Critères d'acceptation retenus (§17)

Une évolution est acceptable si : elle fonctionne sans survol, est utilisable au clavier, conserve des zones
tactiles suffisantes, n'introduit pas de défilement horizontal non justifié, ne masque pas d'action clinique
importante, respecte les thèmes praticien/patient, n'utilise que les patients fictifs autorisés, ne modifie
pas la logique métier hors périmètre, est testée sur au moins un mobile réel et une largeur desktop.
