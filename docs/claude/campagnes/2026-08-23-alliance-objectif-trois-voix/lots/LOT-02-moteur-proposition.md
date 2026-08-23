---
id: "LOT-02"
titre: "Le moteur de proposition — déterministe, sourcé, caduc par hash"
statut: "à_faire"
dépend_de: "LOT-01"
---

# LOT-02 — Le moteur de proposition

## But

Construire le module **distinct** qui assemble des propositions d'objectif à
partir de fragments sourcés, et la route praticien qui les sert et
enregistre reprise/écart. Déterministe (pas de LLM — arbitrage LOT-00).

## Résultat observable

- Module `web/src/lib/praticien/propositionObjectif.ts` : assemble jusqu'à N
  propositions (N fixé au LOT-00) depuis (1) l'anamnèse verbatim (mêmes
  champs que l'ancrage existant : `motif_principal`, `objectif_prioritaire`,
  `attentes`), (2) la plainte dominante `Q_MOD_03` **reçue en entrée**
  (produite par le POST cockpit — jamais recalculée ici), (3) les candidats
  de la DecisionCard **reçus en entrée**. Un fragment sans source est
  inconstructible (invariant de type).
- Caducité par hash des données sources — même mécanique que le
  `proposalHash` du cockpit : données bougées ⇒ proposition `caduque`,
  jamais servie.
- Route `GET/POST /api/praticien/propositions-objectif` : session + drapeau
  `WN_OBJECTIF_PROPOSE` + interrupteur de repli ; le POST n'enregistre que
  des **événements** (`écartée` avec motif obligatoire) — la reprise passe
  par la route objectifs (LOT-03).
- **Gardes G7**, vues rouges par mutation :
  - le module et la route n'écrivent jamais `objectifNegocie` ni
    `ratificationObjectif` ;
  - aucun import de `clinical-engine/` ni `clinical/` (même régime de
    préfixes que G6 élargie) ;
  - aucun tri par `priorite`, aucun score, aucun rang persisté ;
  - clés exposées épinglées (patron G1).

## Périmètre

- `web/src/lib/praticien/propositionObjectif.ts` (+ `.test.ts`,
  `.guard.test.ts`)
- `web/src/app/api/praticien/propositions-objectif/route.ts` (+ test)
- `web/src/lib/patient/featureFlag.ts` (deux lectures de drapeaux neuves)

## Hors périmètre

- Toute écriture dans `clinical-engine/` (doctrine-executable en est
  propriétaire) ; toute modification de `chaineC1.ts`, du classement ou des
  textes `LIMITATION_*`.
- L'UI (LOT-03) ; le portail (LOT-04).
- Tout LLM.

## Fichiers probables

Ceux du périmètre ; en lecture de référence :
`web/src/lib/praticien/objectifNegocie.ts`,
`web/src/app/api/praticien/cockpit/route.ts` (forme des sorties),
`web/src/lib/clinical-engine/decisionCard.ts` (types consommés en import de
**types seuls** si le LOT-00 l'admet, sinon duplication de contrat).

## Interdits

- Pas de secret ; pas de donnée patient réelle ; pas de refactor hors lot.
- Le moteur ne paraphrase jamais : chaque fragment est un verbatim ou une
  restitution, avec sa source.
- Aucune écriture sur les tables de 6.0-A.
- Jamais journaliser un texte clinique (patron `messageJournalisable`).

## Étapes

- [ ] Types et assembleur pur (fragments sourcés, hash de caducité).
- [ ] Gardes G7 — chacune vue **rouge** par mutation réelle.
- [ ] Route GET/POST (auth, drapeaux, événements, bornes de longueur sur le
      motif d'écart, refus par motif nommé — patron `enonce_absent`).
- [ ] T1 après chaque édition ; T2 avant commit.
- [ ] Revue `wn-reviewer` (module neuf consommant des sorties cliniques).

## Tests

- Unitaires : assemblage, caducité (hash bougé ⇒ caduque), fragment sans
  source ⇒ inconstructible, N maximal.
- Gardes G7 (mutation réelle).
- Route : 401 sans session, 503 drapeau éteint, repli par liste, 422 écart
  sans motif.

## Critères de done

- T2 vert ; gardes vues rouges puis vertes ; drapeau éteint par défaut ;
  aucune ligne écrite dans les tables 6.0-A par ce lot.

## Résultats

À compléter à la clôture.
