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

## Cinq arbitrages tranchés

Tranchés par le responsable le 2026-08-23, **conformes aux recommandations**.
Chacun s'adosse à un patron déjà en place plutôt qu'à une invention ; le motif
est conservé ci-dessous parce que c'est lui, et non la conclusion, qui se
relit quand un cas limite se présentera.

1. **La garde de forme des fragments** (dette héritée du LOT-01 — aucune
   contrainte de base ne peut la tenir, `fragments` est un JSONB libre).
   *Tranché* : un invariant de **constructeur**, pas un validateur. Le
   module n'expose que trois fabriques nommées — `depuisAnamnese(champ,
   dateConsultation)`, `depuisInstrument(id, bande)`, `depuisRegleSignee(id,
   sha)` — si bien qu'un fragment nu est inconstructible **au sens du type**.
   S'y ajoute un balayage de la valeur sérialisée avant écriture : aucune clé
   du blob, à quelque profondeur que ce soit, ne peut valoir
   `score|seuil|bande|rang|position|ordre|niveau`. C'est le pendant, pour le
   JSONB, de ce que la liste blanche fait pour les colonnes.

2. **`hash_sources` — algorithme et longueur.** *Tranché* : SHA-256 hex
   (64 caractères) sur sérialisation canonique, à l'identique de
   `canonicalSha256` (`lib/clinical-engine/canonical.ts`) dont le
   `proposalHash` du cockpit est déjà l'usager — la caducité de 6.0-B en est
   la copie conceptuelle, et un second schéma de hash créerait deux vérités.
   **Mais G7 interdit d'importer `clinical-engine/`** : *tranché* pour la
   **duplication** du helper (une quinzaine de lignes, sans dépendance) plutôt
   que pour l'assouplissement de la garde — une garde qui gagne une exception les perd
   toutes. Contenu haché : identifiants et valeurs des sources citées + SHA du
   périmètre signé, **jamais le texte des fragments** (sinon une reformulation
   praticien rendrait caduque une proposition dont les sources n'ont pas
   bougé).

3. **Un `motif` vide sur une reprise.** *Tranché* : **refuser** par un
   motif nommé (`motif_sur_reprise`), ne pas normaliser `''` → `NULL` en
   silence. Le dépôt a tranché ce genre de cas dans le même sens (« par refus,
   jamais troncature », leçon du `maxLength` retiré au LOT-02 de 6.0-A) : un
   écran qu'on contrôle et qui envoie un motif sur une reprise est un bug à
   voir, pas à absorber.

4. **Plusieurs dispositions sur une même proposition.** *Tranché* : **le
   dernier geste gagne**, exactement comme la ratification — tri `creeLe`
   décroissant, départage par `id` (`praticien/objectifNegocie.ts`,
   `etatRatification`). Deux règles de résolution différentes dans un même
   dossier seraient un piège. Nuance à porter dans l'UI et non dans la donnée :
   une proposition **reprise puis écartée** reste reprise EN FAIT — l'objectif
   existe et le patient a pu le voir ; l'écran affiche la trajectoire, pas le
   seul dernier état.

5. **Le plafond de trois propositions** ([[D-094]] §3), qu'aucun index ne peut
   tenir. *Tranché* : borner la **production**, pas le stock — le moteur
   n'assemble jamais plus de trois propositions par exécution et la route n'en
   sert jamais plus de trois non caduques et non disposées, propriété garantie
   par un banc. L'accumulation historique reste normale sur une table
   append-only.

Les cinq se consignent ici et nulle part ailleurs : [[D-094]] n'est pas
rouverte. Les points 1 et 2 touchent la doctrine de garde, mais ils n'ont pas
besoin d'une ligne de décision pour mordre — **G7 en porte l'exécution**, et
une garde vue rouge par mutation tient mieux qu'une phrase.

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
