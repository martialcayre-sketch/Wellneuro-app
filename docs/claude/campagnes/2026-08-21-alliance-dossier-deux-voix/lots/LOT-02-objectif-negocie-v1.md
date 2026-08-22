---
id: "LOT-02"
statut: "livré à la PR (2026-08-22) — service, routes praticien et surface cockpit sur les tables du LOT-01 ; six gardes structurelles vues rouges par mutation réelle puis vertes ; ratification LUE, jamais écrite (le geste patient reste au LOT-06) ; aucune migration, aucune colonne"
dépend_de: "LOT-01 (migration appliquée, constatée par conteneur le 2026-08-22 : 58 migrations up to date, contrat alli_ vert)"
---

# LOT-02 — L'objectif négocié v1

## But

À la fin de ce lot, le praticien peut poser dans le dossier un **objectif
négocié** : l'énoncé du patient, sa reformulation, la priorité clinique, et ce
qui est assumé « non traité pour l'instant » — daté, motivé, append-only. La
ratification patient (le geste au portail) appartient au LOT-06 ; ce lot en
pose l'état et l'API.

## Ancrage mesuré (2026-08-22)

**Trois** sources d'énoncé existent déjà — elles s'affichent comme **matériau
de départ**, elles ne se réécrivent pas, et elles ne pré-remplissent jamais la
saisie (une phrase dite à l'anamnèse n'est pas une phrase dite en
négociation) :

- l'anamnèse : `motif_principal` (seul requis — `consultation/anamnese.ts:44`),
  `objectif_prioritaire` (`anamnese.ts:64`) et `attentes` (`anamnese.ts:66`),
  figées dans la colonne `anamnese Json?` (`schema.prisma:102`) ;
- la plainte dominante Q_MOD_03 lue par la chaîne C1
  (`clinical-engine/chaineC1.ts:172`) et déjà affichée en tête du cockpit
  (`D-054`).

> **Corrigé à l'exécution (2026-08-22)** : le cadrage citait `schema.prisma:96`
> — cette ligne est `consentementHorodatage`, la colonne `anamnese` est en
> `:102` ; et il ne nommait que deux sources, alors qu'`objectif_prioritaire`
> est littéralement le matériau d'un objectif négocié, déjà lu par
> `runtimeFromPrisma.ts` et affiché au cockpit.
>
> **La plainte dominante n'est pas reprise par ce lot** : elle n'est produite
> que par le POST de confirmation d'épisode (`api/praticien/cockpit/route.ts`),
> jamais par une route de lecture. La recalculer aurait été toucher au moteur.
> Le panneau renvoie au bloc `D-054` du cockpit, qui l'affiche déjà.

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

- [x] Objectif négocié créable, reformulable, priorisable, avec « non traité
      pour l'instant » daté — trajectoire complète visible au cockpit (rail,
      phase « Compréhension », hors runtime clinique : le panneau reste
      visible sans épisode confirmé).
- [x] Append-only prouvé par banc ; gardes de forme **vues rouges par mutation
      réelle** — G1 clés épinglées (type-check), G2 aucune propriété de mesure
      ordonnée, G3 la priorité ne s'ordonne pas, G4 `creeLe` jamais transmis,
      G5 aucun `update`/`delete` hors l'effacement nommé, G6 aucun moteur
      clinique importé.
- [x] Aucun moteur ni fichier clinique touché ; aucune colonne, aucune
      migration ; T2 vert ; fragment `changelog.d/` écrit.

## Dettes nommées, sans lot d'accueil

- **Deux têtes de chaîne restent possibles.** La cible d'une révision est
  vérifiée puis refusée en 409 si elle est déjà supplantée — une lecture
  suivie d'une écriture n'est pas étanche à une course. Le parti pris est de
  ne jamais départager en silence : `objectifsCourants` rend **toutes** les
  têtes et l'écran les affiche toutes (`DC-30`). Poser un verrou en base
  serait une décision propre.
- **Aucune cadence** sur les routes praticien, comme partout ailleurs dans le
  dépôt — risque assumé, nommé ici pour ne pas être redécouvert.
