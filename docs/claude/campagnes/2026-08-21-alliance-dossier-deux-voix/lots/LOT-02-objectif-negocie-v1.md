---
id: "LOT-02"
statut: "à faire"
dépend_de: "LOT-01 (release-db faite et vérifiée)"
---

# LOT-02 — L'objectif négocié v1

## But

À la fin de ce lot, le praticien peut poser dans le dossier un **objectif
négocié** : l'énoncé du patient, sa reformulation, la priorité clinique, et ce
qui est assumé « non traité pour l'instant » — daté, motivé, append-only. La
ratification patient (le geste au portail) appartient au LOT-06 ; ce lot en
pose l'état et l'API.

## Ancrage mesuré (2026-08-22)

Deux sources d'énoncé existent déjà — elles s'affichent comme **matériau de
départ**, elles ne se réécrivent pas :

- l'anamnèse : `motif_principal` (seul requis — `consultation/anamnese.ts:44`)
  et `attentes` (`anamnese.ts:66`), figées dans la colonne `anamnese Json?`
  (`schema.prisma:96`) ;
- la plainte dominante Q_MOD_03 lue par la chaîne C1
  (`clinical-engine/chaineC1.ts:172`) et déjà affichée en tête du cockpit
  (`D-054`).

## Périmètre

- Service + routes praticien (création, reformulation, priorisation,
  « non traité pour l'instant ») sur les tables du LOT-01.
- Surface cockpit : saisie et lecture de l'objectif courant et de sa
  trajectoire (chaque révision visible, rien d'écrasé).
- Garde structurelle par test : **aucun champ de score n'entre dans un
  objectif** (`DC-27`) ; la reformulation est libre mais l'objet ne porte ni
  code diagnostique ni référence de classification (`DC-31`, `DC-32`).

## Fichiers probables

- `web/src/lib/` (nouveau module objectif négocié + bancs).
- `web/src/app/api/praticien/` (routes + bancs de route).
- `web/src/components/patient-cockpit/` (surface praticien).

## Interdits

- Ne pas modifier `anamnese.ts`, la chaîne C1 ni aucun moteur de scoring.
- Aucun calcul, agrégat ou score dérivé d'un objectif.
- Aucune suppression ni mise à jour en place d'une entrée — correctif =
  nouvelle entrée référençant l'ancienne.
- Aucun texte adressé au patient dans ce lot (c'est LOT-04/LOT-06, derrière
  le circuit du Socle).

## Dépendances

LOT-01 releasé et vérifié.

## Étapes

1. Contrat du module (états, transitions, invariants) + bancs rouges.
2. Service et routes ; surface cockpit.
3. Gardes structurelles vues rouges (mutation) puis vertes.
4. T2 ; fragment `changelog.d/` ; revue proportionnelle au risque.

## Tests

- Bancs de route (droits praticien, append-only prouvé : une « modification »
  crée une entrée, l'historique reste lisible).
- Garde anti-score et anti-diagnostic vues rouges quand débranchées.
- Deux dates asserties (événement ≠ enregistrement).
- T2 avant commit.

## Critères de done

- [ ] Objectif négocié créable, reformulable, priorisable, avec « non traité
      pour l'instant » daté — trajectoire complète visible au cockpit.
- [ ] Append-only prouvé par banc ; gardes de forme vues rouges.
- [ ] Aucun moteur ni fichier clinique touché ; T2 vert ; fragment écrit.
