---
id: "LOT-02"
titre: "Fiche signalétique et anamnèse, relisibles"
statut: "à faire"
dépend_de: "—"
---

# LOT-02 — Fiche signalétique et anamnèse, relisibles

## But

Le patient remplit une fiche signalétique et une anamnèse à l'ouverture de son
espace. **Aucune surface praticien ne les lit.** Ce lot les rend relisibles,
telles que déposées.

Aucune migration, aucune dépendance : il part avant la porte `release-db`.

## Résultat observable

1. Le cockpit porte un instrument « Renseignements du patient » qui ouvre les
   trois sections de la fiche signalétique et les sept de l'anamnèse, libellé
   par libellé, valeur par valeur.
2. Une ligne d'état **permanente** dans la zone focale de la phase Patient dit
   ce qui existe et depuis quand — ou qu'il n'y a rien. Une absence ne passe
   jamais pour un silence.
3. Une erreur de lecture n'est **jamais** rendue comme une absence.

## Périmètre

- `api/praticien/consultations/route.ts` — étendre le DTO `Consultation` avec
  `ficheSignaletique`, `anamnese`, `consentement`, `consentementHorodatage`,
  `consentementVersion`, `finaliteConsentement`. La route charge **déjà** les
  lignes entières (`findMany` sans `select`, l. 84) et journalise déjà l'accès :
  quelques lignes de mapping. Normaliser en sortie par `normaliserFiche` /
  `normaliserAnamnese` — jamais servir le JSON brut.
- `components/patient/RenseignementsPatientPanel.tsx` — rendu lecture seule,
  piloté par `FICHE_SECTIONS` et `ANAMNESE_SECTIONS`. Les trois formes de valeur
  sont gérées : texte, choix multiples, groupes répétables. Helpers défensifs
  déjà écrits : `asRecord` / `texte` / `liste` de
  `lib/consultation/contexteClinique.ts`.
- `FichePatientPanel.tsx` — `InstrumentTiroir` avec `onOpenChange` paresseux
  (patron `TiroirSyntheseInline`, l. 374-491), plus la ligne d'état dans la
  branche `phaseActive === 'patient'`.

## Contraintes dites

- **Aucun libellé de `anamnese.ts` ni `fiche.ts` n'est touché.**
  `orientationRulesV1.ts` les apparie **verbatim**, et deux bancs l'exigent
  (`orientationRulesV1.test.ts:603`, `safetyFindings.guard.test.ts:35`).
- **Rien n'est agrégé, noté ni interprété.** L'écran rend ce qui a été écrit.
- La consultation qui fait foi n'est **pas** la même pour les deux pièces :
  `whereConsultationPorteuse` exige `statut: 'validee'` ET une anamnèse non
  nulle, quand la fiche signalétique est écrite avant, à `statut: 'en_cours'`.
  L'écran affiche donc l'historique servi par la route, chaque entrée nommant
  son statut et sa date.

## Done

- Banc de composant sur le patron `CeQuiComptePanel.test.tsx` : erreur de
  lecture ⇒ `role="alert"` et **jamais** le libellé d'absence ; chargement ⇒
  `role="status"` ; anamnèse absente ⇒ absence explicite. Interroger par
  `within(container)`.
- Banc de route sur le DTO étendu.
- T2 vert ; baseline `fiche-cockpit` régénérée.
