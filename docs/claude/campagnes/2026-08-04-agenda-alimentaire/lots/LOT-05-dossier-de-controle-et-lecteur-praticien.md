---
id: "LOT-05"
titre: "Dossier de contrôle et lecteur praticien de l'agenda alimentaire"
statut: "fait"
dépend_de: "LOT-04"
---

# LOT-05 — Dossier de contrôle et lecteur praticien

Lot en deux temps.

- **Temps A** (celui-ci) : constater le recueil pilote démarré le 2026-08-05,
  rejouer les trois assertions de données prescrites par
  `RUNBOOK-allumage-drapeau.md`, remettre `CAMPAGNE.md` et le runbook d'accord
  avec la base.
- **Temps B** (à écrire) : le lecteur praticien de l'agenda alimentaire.

## But

Le pilote a démarré sur le dossier de contrôle sans qu'aucun document ne le
constate, et le seul chemin de lecture du recueil reste `execute_sql`
(`RUNBOOK-allumage-drapeau.md`, section « Lire le recueil »). Ce lot ferme les
deux : il consigne le premier recueil réel, et donne au praticien un écran pour
lire ce qu'il a produit.

## Constat — temps A

- 1 assignation `Q_ALI_09` : `ASS_Ip45TpzqWujWgkOdEex-wxRj`, dossier `PAT006`,
  créée le 2026-08-05 à 07:03:30 UTC, `statut = "En attente"`,
  `statut_reponses = "non_rempli"`, `date_limite = null`,
  `consentement = "donne"`.
- 1 journée saisie : `date_jour = 2026-08-05`, `canal = portail`,
  `soumis_le = 2026-08-05 07:05:55 UTC`, `supersedes_jour_id` nul (ce n'est
  pas une correction).
- Contenu structurel de cette journée : `contractVersion = agenda-alimentaire-v1`,
  clés présentes = `contractVersion`, `prises`, `premierePriseProteines`,
  `soirPlusCopieux`, `legumesDeuxPrises`, `fruitsOuOleagineux`,
  `ultraTransformes` ; `prises` contient 3 entrées.
- Total base au 2026-08-05 : 19 patients, 114 assignations, dont celle du
  pilote — les 113 citées par `D-025` sont l'état d'avant.

### Rejeu des trois assertions du contrat

Les trois assertions transcrites par le runbook (étape 7) ont été rejouées
contre la production le 2026-08-05, avec la requête que le runbook porte déjà.

| assertion | résultat | portée réelle |
|---|---|---|
| `perimetre_jsonb` | 0 | mordante **au premier niveau** — 7 clés de premier niveau effectivement scannées ; les objets de `prises` ne sont pas traversés par la requête, la frontière n'y tient que par le code de saisie ; aucune des clés scannées ne matche gramme/kcal/score/indice/quantite |
| `version_non_lue` | 0 | mordante — `contractVersion` est présent et vaut la seule version lue |
| `chainage_fautif` | 0 | encore vacue — aucune ligne ne porte de `supersedes_jour_id`, donc zéro ligne éligible |

Le troisième chiffre ne prouve rien à ce stade : c'est exactement la vacuité
que `D-015` avait déjà payée, et que le runbook nomme lui-même à son étape 7.
Il redevient mordant à la première correction notée, ou à la clôture des
21 jours — moment où les assertions sont de toute façon à rejouer.

## Périmètre — temps B

- Une route `GET /api/praticien/agenda-alimentaire`, décalquée de
  `web/src/app/api/praticien/agenda-sommeil/route.ts` : garde d'appartenance,
  journal d'accès, lecture par `idPatient`, agrégats des journées actives.
- Un panneau `AgendaAlimentairePraticienPanel`, monté dans
  `web/src/components/FichePatientPanel.tsx` près de la ligne 1383, dans le
  même patron que `AgendaSommeilPraticienPanel` (tiroir `InstrumentTiroir`).
- Sous sept journées, `calculerAgregatsAli` rend `null`
  (`MIN_JOURS_AGREGATS = 7`, `types.ts:66`, `agregats.ts:246`) — le cas du
  pilote. Le panneau doit le dire (« couverture insuffisante — n/7 journées »),
  jamais laisser une zone vide non expliquée.
- Une décision distincte, amendant le point de `D-025` sur l'extinction qui
  referme toutes les surfaces, posée **avant** la PR du temps B (voir « Deux
  points de conception » ci-dessous).

## Deux points de conception

- **Le lecteur n'est pas gardé par `WN_AGENDA_ALI`.** L'arbitrage est acquis
  (rendu en session) : le modèle de persistance est append-only (`D-015`), les
  journées survivent à l'extinction du drapeau, et fermer le lecteur avec lui
  rendrait illisible une donnée déjà recueillie — exactement le défaut que ce
  lot ferme. Le drapeau continue de gouverner la bibliothèque praticien, le hub
  patient et l'écriture ; il ne gouverne pas la lecture praticien. Mais `D-025`
  affirme que l'extinction referme toutes les surfaces, et un fichier de lot
  n'a pas le pouvoir d'amender une décision — seule une décision le peut, comme
  `D-025` l'a fait pour le point 2 de `D-022`. **Le temps B devra donc poser une
  décision distincte, amendant ce point de `D-025`, avant sa PR** ; ce n'est pas
  fait par ce temps A et ne crée aucune entrée dans `docs/DECISIONS.md` ici.
- **La réponse porte un champ `illisibles`.** Seul écart délibéré au patron du
  sommeil, qui n'a pas de quarantaine. Un dossier de contrôle qui tait ses
  lignes en quarantaine ment par omission : le compte de journées illisibles
  doit être visible du praticien, pas seulement du journal d'intégrité.

## Hors périmètre

- Le barème et l'indice de l'agenda — reportés à `LOT-06`.
- La clôture patient, la relance, l'aside de cabinet.
- Les six manques du recueil déjà nommés et non corrigés par `LOT-04`
  (`docs/claude/handoffs/2026-08-05-0638-agenda-alimentaire-lot-04.md`) :
  correction bornée à J et J-1 ; `soumisLe` qui estime là où
  `supersedesJourId` trancherait ; aucune clôture patient ni vue praticien
  (avant ce lot) ; la borne des 21 jours qui ne ferme rien d'observable ; le
  hit-test tactile de `LigneDePrises` non prouvé.
- L'écart `nbRenseignees` entre le hub et la route agenda.
- L'absence de `sections` et de bloc `certification` sur l'instrument.
- La validation des `qids` d'un pack contre `IDS_SUSPENDUS`.
- La graine qui ment sur le pack par défaut.

## Fichiers probables — temps B

- `web/src/app/api/praticien/agenda-alimentaire/route.ts`
- `web/src/components/FichePatientPanel.tsx`
- `web/src/lib/agenda-alimentaire/persistence.ts` (fonctions de lecture déjà
  existantes, à réutiliser plutôt qu'à dupliquer)

## Tests — temps B

- **T1** `npm run check` après chaque édition.
- **T2** `npm run test:worktree -- --fast` avant tout commit UI ou API.
- Unitaires ciblés : garde d'appartenance (patient d'un autre praticien
  refusé) ; réponse portant `illisibles` même à 0 ; absence de toute clé de
  gramme/kcal/score/indice/quantite dans la réponse rendue.

## Critères de done — temps B

- Un praticien authentifié voit l'agenda alimentaire d'un patient qui lui
  appartient depuis sa fiche, sans passer par `execute_sql`.
- La réponse porte un compte `illisibles`, distinct des journées actives.
- Sous sept journées, le panneau affiche la couverture insuffisante plutôt
  qu'une zone vide.
- La lecture reste possible drapeau éteint.
- La décision amendant `D-025` sur ce point est posée dans
  `docs/DECISIONS.md` avant la PR.
- T2 vert au minimum, `/wn-review` passé.

## Résultats

Les deux temps sont livrés le 2026-08-05.

**Temps A.** Les trois assertions rejouées, chacune avec sa portée bornée — dont
la découverte que `perimetre_jsonb` ne scanne que le **premier niveau** du JSONB
et laisse les objets de `prises` hors du filtre. `CAMPAGNE.md`, le runbook et le
handoff du 11:30 remis d'accord avec la base.

**Temps B.** Route `GET /api/praticien/agenda-alimentaire` et panneau au dossier,
`D-026` posée. Deux passes adversariales : dix constats à la première, cinq à la
seconde, tous traités.

**Ce que le lot a appris.** Trois des dix constats initiaux étaient des *gardes
vertes pour une mauvaise raison* — un test de drapeau sur un dossier vide, un
test d'ancrage dont la fixture ne pouvait pas bouger, un scan de frontière sur
une charge utile sans agrégats. Et le correctif du test de correspondance a
d'abord reproduit le défaut : deux champs `false` adjacents rendaient toute
permutation indétectable.

**Le constat qui ne se voyait dans aucune ligne.** `statut` était décalqué du
sommeil : la branche `cloture` est **morte** pour `Q_ALI_09`, quand l'état
réellement atteignable — `'Annulée'` — n'était ni lu ni affiché. Un praticien
ayant annulé lisait « En cours · jour 12/21 » pendant que le portail répondait
déjà 410 au patient.

**Validation.** T1 vert ; T3 complet vert — 3 882 tests Vitest sur deux
positions de drapeau, **112 E2E passés, aucun échec**. Deux passes T2
antérieures avaient échoué sur deux tests **différents** du portail patient, sans
recouvrement et sans chemin causal depuis ce lot : instabilité locale, confirmée
par le T3 vert.

**Ce qui reste ouvert.** Aucune bannière ne dit au praticien que le recueil est
fermé quand le drapeau est éteint. Le déverrouillage praticien d'un `Q_ALI_09`
reste possible par appel direct et retire silencieusement l'annulabilité. Le
tiroir tait `canal`, `soumisLe` et `supersedesJourId` : le taux de correction,
dont `LOT-06` aura besoin, se lit encore par `execute_sql`.
