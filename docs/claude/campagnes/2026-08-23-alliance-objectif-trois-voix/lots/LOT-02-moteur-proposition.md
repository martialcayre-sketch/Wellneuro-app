---
id: "LOT-02"
titre: "Le moteur de proposition — déterministe, sourcé, caduc par hash"
statut: "terminé"
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

- [x] Types et assembleur pur (fragments sourcés, hash de caducité).
- [x] Gardes G7 — chacune vue **rouge** par mutation réelle.
- [x] Route GET/POST (auth, drapeaux, événements, bornes de longueur sur le
      motif d'écart, refus par motif nommé — patron `enonce_absent`).
- [x] T1 après chaque édition ; T2 avant commit.
- [x] Revue `wn-reviewer` (module neuf consommant des sorties cliniques).

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

Clos le 2026-08-23. Les cinq arbitrages ont tenu tels quels ; deux points de
conception ont dû être tranchés en cours de route, et ils sont écrits ici
parce qu'ils ne se déduisent pas de la fiche.

**Qui écrit `propositions_objectif`.** La fiche disait « le POST n'enregistre
que des événements », et aucun autre lot ne portait cette écriture. Or la
`DecisionCard` n'est **pas persistée** (`protocol_drafts` n'en garde que les
empreintes d'ancrage) et G7 interdit de la recalculer : un GET ne peut donc
pas assembler. Arbitré : **un POST à deux gestes** — `assembler` (le cockpit
envoie plainte dominante, candidats et SHA ; la route lit l'anamnèse EN BASE)
et `ecarter` (l'événement motivé). Idempotent par empreinte : mêmes sources ⇒
aucune ligne neuve, ce qui permet au cockpit d'appeler le geste à chaque
ouverture de panneau.

**L'anamnèse ne vient jamais du client**, et c'est la frontière de confiance
de la route : l'accepter du corps de requête permettrait de faire dire au
patient ce qu'il n'a pas écrit, avec la mention « verbatim » quand même
apposée. Plainte et candidats, eux, arrivent du client — la route vérifie ce
qu'elle peut (forme, longueurs, SHA hexadécimal) et **ne feint pas** de
vérifier le reste : elle ne peut pas confronter le SHA à la table signée, qui
vit sous `lib/clinical/`. Prix assumé de G7, écrit dans le fichier.

**`assembleeLe` devient la clé d'assemblée.** La caducité se dérive : les
lignes du dernier assemblage sont vivantes, les précédentes caduques. La
colonne n'est pas une duplication de `creeLe` — un seul `createMany` la pose
à l'identique pour toute l'assemblée, là où les `creeLe` par défaut peuvent
différer.

**Ce que les bancs ont trouvé.** Un défaut réel dans la route : `return
promesse` dans un `try` rend la promesse **sans l'attendre**, si bien qu'un
rejet Prisma échappait au `catch` — la route aurait propagé l'erreur brute,
laquelle recopie le `data:` du `createMany`, c'est-à-dire les mots du
patient. Corrigé en `return await`, et le banc qui l'a vu rouge est nommé
dans le commentaire.

**Quatre gardes vues rouges par mutation réelle** avant d'être déclarées
vertes : import de `clinical-engine/` dans le module (G7-1), propriété
`rangCandidat` (G7-2), `objectifNegocie.create` dans la route (G7-3),
balayage du blob désarmé (G7-5). La cinquième (G7-4, clés exposées épinglées)
est tenue par `tsc` et a été vue rouge en ajoutant `rangAffichage` au type.

**Ce que la revue a trouvé, et c'était le défaut du LOT-09.** Les deux listes
de mots interdits étaient **entièrement en français** — `rang`, `score`,
`seuil`… — alors que la donnée amont nomme ses champs `rank` et `confidence`
(`clinical-engine/decisionCard.ts`). Mes quatre mutations vues rouges étaient
toutes francisées ; la mutation la plus PROBABLE, recopier le champ tel qu'il
arrive, serait passée : le classement se serait persisté dans le blob (exposé
en `unknown`, donc hors du pin de type), se serait trié, se serait affiché, et
les 94 cas seraient restés verts. Le banc épinglait le vocabulaire de
l'interdit, pas l'interdit.

Deux autres bloquants du même registre. **G7-1 se contournait par un chemin
relatif** — la garde ne lisait que les préfixes d'alias `@/lib/…`, et
`from '../clinical-engine/…'` la traversait ; ce n'est pas une contorsion,
c'est l'idiome local (`clinical/contradictionFinding.ts` importe
`'../clinical-engine/types'`). La garde lit désormais les spécificateurs
d'import et refuse le répertoire comme SEGMENT, quelle que soit la forme du
chemin. Et le **POST `assembler` rendait le dossier — verbatim compris — sans
journaliser l'accès** : le patron « une écriture laisse sa propre trace » ne
s'appliquait pas, puisque son cas nominal n'écrit rien (idempotence) et que
la table ne porte aucun `praticien_email`. Le chemin d'usage normal de la
fonctionnalité était celui qui ne laissait pas de trace.

Quatre corrections de rang élevé dans le même passage : l'ordre servi était
**indéterminé** (deux clés égales sur toute une assemblée — départage par `id`
ajouté, et `NULLS LAST` sur une colonne nullable) ; `disposees` était filtrée
sur « ce qui n'est pas vivant », si bien que le surplus au-delà du plafond y
tombait avec `disposition: null` — **l'écran aurait lu un geste qui n'a pas eu
lieu** ; l'identifiant de règle était du **texte libre** de 200 caractères, ce
qui laissait persister `regle: "Recommandation Wellneuro validée"` comme une
provenance (contrôle de forme ajouté — pas une confrontation, donc sans
toucher à G7) ; et deux candidats de **même règle** produisaient deux
propositions au hachage identique, ce qui empêchait la route de voir
l'assemblée rétrécir.

**Deux dettes nommées, écrites dans le code.** Une assemblée qui deviendrait
**vide** (table dépubliée, abstention devenue requise, plus aucun candidat) ne
retire pas la précédente : il n'existe aucune ligne à écrire pour dire
« désormais, rien ». Et **lire-puis-écrire n'est pas étanche à la course** :
deux `assembler` concurrents écrivent deux assemblées identiques — le service
reste juste, l'idempotence re-stabilise au troisième appel, il reste du bruit
dans le matériau du bilan LOT-06. Fermer la première demande une migration ;
la seconde se fermerait par une transaction sérialisable, arbitrage renvoyé au
LOT-03 quand on saura à quelle cadence le panneau appelle.

**Validation.** T1 vert. T2 : 155 passés, 1 échec — `portail-parcours` sur
iPhone 13, `page.goto` en timeout de chargement. **Reproduit à l'identique sur
un arbre d'où le lot avait été retiré** : blocage WebKit connu de ce Mac,
étranger au lot. Bancs du lot : 104 verts (53 unitaires, 17 gardes, 34 route).

**Après revue.** 104 bancs verts (53 unitaires, 17 gardes, 34 route), T1 vert.
Les trois trous signalés — import relatif, `rank` recopié, propriété écrite
dans un type en ligne — ont été vus **rouges par mutation** une fois les
gardes corrigées.
