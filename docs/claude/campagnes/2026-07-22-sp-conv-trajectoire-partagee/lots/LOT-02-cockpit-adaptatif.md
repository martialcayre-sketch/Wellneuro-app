---
id: "LOT-02"
titre: "Cockpit adaptatif — la fiche s'ouvre là où le travail attend"
statut: "livré — 2026-07-23, PR de lot : phase initiale D5, bandeau épisode, plein écran D10, tiroir 44 px ; T1/T2 verts"
dépend_de: "LOT-01"
---

# LOT-02 — Cockpit adaptatif — la fiche s'ouvre là où le travail attend

## But

La fiche ne s'ouvre plus systématiquement sur « Décision »
(`FichePatientPanel.tsx:251`, `useState<IdPhase>('decision')`) : elle
atterrit sur la phase réellement exigible, et son bandeau dit la position
d'épisode au lieu de la seule identité.

## Résultat observable

- À l'ouverture, la phase focale est choisie par la règle D5 : premier
  bloqueur de sécurité > première action exigible > première phase en
  attente > dernière phase consultée par ce praticien (mémoire locale). Un
  test le prouve pour chacun des quatre cas.
- Pendant le chargement d'`etatRuntime`, aucune phase n'est affirmée
  (état neutre, jamais « Décision » par défaut).
- Le bandeau porte, nourri par le contrat LOT-01 : « Épisode N en cours »,
  position mono « T0 + X j · vous êtes ici », chip delta inter-tours
  (« Au tour précédent : … — tenue, tolérance ») quand un tour antérieur
  comparable existe (même `versionScore`, garde A8-3), eyebrow « Phase
  due » sur la zone focale.
- La fermeture du tiroir d'instrument passe de 40 px à ≥ 44 px
  (`FichePatientPanel.tsx:220-226`).
- **Plein écran réel (D10, tranché au cadrage)** : la page fiche devient
  une colonne pleine hauteur, l'en-tête de fiche et la barre d'onglets sont
  condensés sur une ligne, et le cockpit prend l'espace restant à la place
  de `lg:h-[min(80vh,700px)]` (`FichePatientPanel.tsx:884`) — zéro scroll
  de page sur laptop, garde `min-h` pour les petits écrans, comportement
  mobile inchangé (empilement).

## Périmètre

`web/src/components/FichePatientPanel.tsx` (phase initiale, bandeau,
tiroir) ; consommation du contrat LOT-01 ; mémoire « dernière phase
consultée » en stockage local praticien (jamais en base) ; E2E cockpit mis
à jour dans le même commit.

## Hors périmètre

Le contenu des phases et des instruments ; le moteur de statuts
`statutPhase` (réutilisé tel quel) ; la Spirale de l'onglet Trajectoire
(LOT-03) ; le repère cabinet (SP-CAB) ; la Météo d'adhésion (SP-MET).

## Fichiers probables

- `web/src/components/FichePatientPanel.tsx`
- `web/src/lib/trajectoire-partagee/` (import)
- `web/e2e/` (spec cockpit)

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de migration ou écriture Supabase sans confirmation distincte.
- Pas de refactor hors lot.

## Étapes

- [ ] Vérifier les hypothèses (sauts événementiels existants : bannière
      correction → Patient, protocole bloqué → Actions — la règle D5 doit
      les respecter, pas les doubler).
- [ ] Implémenter la sélection initiale, tests d'abord.
- [ ] Bandeau d'épisode + chip delta ; tiroir 44 px.
- [ ] Appliquer le plein écran réel (D10) : colonne pleine hauteur, chrome
      condensé, cockpit en espace restant.
- [ ] T1, T2, E2E ; relire le diff.

## Tests

Vitest sur la règle de sélection (4 cas + chargement) ; E2E : ouverture de
la fiche de Sophie Nicola atterrit sur la phase attendue selon l'état
seedé ; axe « abstention honnête » de la grille SP-RUN (phase indéterminée
affichée comme telle).

## Critères de done

Les cinq résultats observables constatés ; grille de conformité 5.0 tenue ;
`verify` vert.

## Résultats

À compléter à la clôture.
