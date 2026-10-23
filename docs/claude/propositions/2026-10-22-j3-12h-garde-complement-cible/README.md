# J3-12h — cadrage de la garde sur le complément ciblé (2026-10-22)

Lot J3-12h (file A, `docs/claude/PLAN_WELLNEURO.md`, table des lots des 12
besoins). **Cadrage seulement** : aucun code, aucune migration. Les
arbitrages du responsable (section 7) sont consignés par [[D-345]].

**Forme opaque** (plan unique, [[D-285]]) : mécanismes, identifiants et
agrégats seulement. Aucun seuil, aucune dose, aucune durée, aucun claim
rattaché à une situation, aucun libellé de situation propre à un nutriment :
ils vivent dans les dossiers de preuve privés et leurs positions d'expert
signées.

## 1. Ce que la garde doit tenir

Règle du responsable du 2026-10-17 (fiche H15), étendue par deux positions
d'expert signées :

| Source | Version, date | Ce qu'elle apporte à la garde |
|---|---|---|
| Règle du responsable | 2026-10-17 | mineur, grossesse, allaitement : un complément **ciblé** (correction d'un besoin, tous nutriments) n'entre au programme qu'après la **remise tracée** d'un courrier au médecin, **sans attendre sa réponse** ; l'option « accord du médecin noté » est écartée |
| Dossier du fer (BP-07), position P5 | v0.3, signée le 2026-10-21 (arbitrage du 2026-10-20 sur le destinataire) | destinataire : le professionnel qui suit la grossesse, à défaut le médecin traitant ; une situation obstétricale spécifique reste **adressée sans complément** (case à construire) |
| Dossier du magnésium érythrocytaire, positions P4 et P6 | v0.3, signée le 2026-10-22 | deux situations propres au magnésium s'ajoutent : `S-MG-1`, adossée à un claim du dossier privé, et `S-MG-2`, position d'expert sans claim ; libellés au dossier privé |

Trois éléments : un **déclencheur** (population ou situation), un **objet
gardé** (le complément), une **condition** (courrier remis et tracé, au bon
destinataire). Hors garde selon la règle : l'accompagnement alimentaire et le
complexe multivitaminé en vente libre.

Les **adressages sans complément** des positions (situation obstétricale
spécifique, autres exclusions des dossiers) refusent le complément : ce n'est
pas une garde de courrier. Ils sont nommés ici comme frontière, pas cadrés.

## 2. Ce qui existe, ce qui manque (code relu le 2026-10-22)

Chemins relatifs à `web/`.

### 2.1 L'objet gardé existe déjà, sans dose

- `supplement_exploration` est **le** type d'action qui porte un complément
  au programme (`src/lib/trust/pauseEffetIndesirable.ts:30-31`) : le
  praticien le compose, avec un intitulé libre qui peut nommer le nutriment
  (`src/components/patient-cockpit/ProtocolMiniBuilder.tsx:86`), la route de
  version l'accepte, le patient le lit (`src/lib/clinical-engine/contenuPatientProtocole.ts:51-55`).
- C'est une **intention** : le moteur refuse produit, forme, dose et marque
  (`src/lib/clinical-engine/protocolDraft.ts:38-49`, `:518-537`). Elle ne
  distingue pas un complément ciblé d'un complexe multivitaminé.
- Le seul producteur est le praticien : aucun moteur (chaîne C1, BioFlow,
  check-ins, portail) n'en génère.
- La référence catalogue (`supplementCatalogRef`) est acceptée par le moteur
  en V3 et V4, **refusée** par la route de version
  (`src/app/api/praticien/protocoles/versions/route.ts:288-307`).
- Aucun chemin « résultat biologique → complément proposé » ; les fiches
  d'usage du besoin 2 n'ont pas de consommateur patient.

**Conséquence** : la garde peut viser `supplement_exploration` dès
maintenant (Q0), ou attendre un véhicule qui porte dose, durée et la nature
« ciblé ». Le plan place déjà J3-12h **avant le premier levier de complément
indexé par besoin** (H84).

### 2.2 L'entrée au programme : le clic « Valider pour diffusion »

`src/app/api/praticien/protocoles/diffusion/route.ts` :

- avant tout embranchement, des refus `409` à motif en clair
  (`carte_non_rejouable`, `abstention_requise`, `constat_securite`,
  `effet_indesirable_en_attente`, `:295-360`) — **c'est là que se place la
  garde** ;
- ensuite, **sous `WN_FICHES_ASSIETTE` seulement** (`:372`), une transaction
  (`:395-465`) qui crée l'approbation et remet fiches et lettre d'adressage
  ([[D-262]]) sous un jeton d'aperçu ; drapeau fermé, l'approbation est créée
  **sans aucune remise** (`:490-520`) ;
- la remise de la lettre d'adressage peut être sautée alors que le clic
  aboutit (dossier bloqué, point de sauvegarde refusé :
  `src/lib/correspondance/lettreAdressageRemise.ts`).

Le prédicat de la garde doit donc valoir « courrier remis dans ce clic **ou
déjà tracé** », et être fail-closed sur le chemin à drapeau fermé et sur une
remise sautée.

### 2.3 Les déclencheurs

| Information | Source | Fiabilité | Fichier |
|---|---|---|---|
| âge, mineur | `Patient.dateNaissance` (texte, nullable) ; `statutAge` rend `date_manquante`, `mineur` ou `majeur` ; illisible vaut manquante | structurée, déclarative, fail-closed | `src/lib/patient/gardeAge.ts:25-48` ; [[D-284]] §4, [[D-302]] |
| grossesse, allaitement (1) | lignes `DonneePhysiologique`, critères `grossesse`, `allaitement`, réponses `oui`, `non`, `inconnu` ; ajout seul, datées ; posées par le praticien (au portail, ce formulaire ne pose que le sexe et le statut menstruel) | structurée, datée, sans terme ni fin | `src/lib/physio-traitements/liste.ts:12-28` ; [[D-335]] |
| grossesse, allaitement (2) | anamnèse, formulaire **patient** du portail, section « État actuel » ; `lireEtatPopulation` rend `oui`, `non` ou `inconnu` | déclarative, datée par l'envoi du patient, peut être ancienne | `src/lib/consultation/anamnese.ts:251-252` ; `src/lib/consultation/etatPopulation.ts:82-86` |
| discordance (1) ↔ (2) | `estDiscordant` signale « oui » contre « non » ; **aucune règle ne dit laquelle prime** | — | `src/lib/physio-traitements/anamnese.ts:62-68` |
| `S-MG-1`, `S-MG-2` | **aucune case structurée** ; aucun questionnaire ne les établit | absente | — |
| situation obstétricale spécifique | **absente** du code et des docs | absente | — |

La garde de population existante (`src/lib/clinical/gatePopulationV1.ts`)
filtre des **axes** candidats sur une table d'exclusions vide et non signée ;
ce n'est pas le bon support.

### 2.4 Le courrier, sa remise, son consentement

- `CorrespondanceMedecin` (`prisma/schema.prisma:1635`) : une lettre
  **consignée** (`consigneLe`), destinataire en texte libre
  (`medecinLibelle`), ancrage de provenance optionnel ; **aucun état
  « remis », aucune colonne de type**. Préparateur commun aux trois routes
  (biologie, adressage, saisie manuelle) : `preparerCorrespondance`
  (`src/lib/praticien/correspondanceMedecin.ts:157`). La lettre d'adressage
  se distingue aussi par sa couverture révocable (`AdressageSignalAlerte`).
- Deux modèles de courrier : `courrier_biologie`, `courrier_adressage`
  (`src/lib/documents/modele.ts`). Un courrier « complément » serait un
  troisième modèle et un troisième générateur.
- Tout rendu pour le médecin passe la garde non prescriptive
  (`src/lib/documents/vocabulaire.ts:103-123`) : racines refusées en
  sous-chaîne, dont « ordonnance », « posologie » et « dosage ». Le courrier
  devra dire le complément (et, si le véhicule les porte, la dose et la durée
  **proposées**) sans aucune de ces racines.
- Deux traces de remise existent, en ajout seul, avec instantané et
  empreinte : `LettreAdressageRemise` (`schema.prisma:4074`, remise **au
  patient** dans le clic, [[D-262]]) et `DocumentMedecinImprime`
  (`schema.prisma:4104`, impression confirmée, le patient remet lui-même,
  [[D-307]]). Rien ne part vers un tiers ([[D-307]] §4, [[D-286]] §2).
- **Consentement « partage médecin traitant »** : deux régimes coexistent.
  Fermé (refus, retrait **et silence** ferment) pour le courrier de biologie,
  la saisie manuelle et « Pour votre médecin » (`src/lib/trust/consentementPartage.ts`,
  [[D-219]] §3 amendé) ; **ouvert**, par arbitrage nommé au patient, pour le
  courrier d'adressage (`src/app/api/praticien/adressage/courrier/route.ts:205-220`),
  au motif notamment que cette finalité vise le médecin traitant et non un
  autre médecin. Le courrier complément doit choisir (Q2).
- Destinataire : `Patient.medecinTraitantNom` et
  `medecinTraitantCoordonnees` (`schema.prisma:31-32`, texte libre) ; le
  « professionnel qui suit la grossesse » n'a ni champ ni modèle.

## 3. Constat de production (2026-10-22)

Lecture seule, conteneur `one-off-6093`, transaction `READ ONLY`, agrégats.

| Mesure | Valeur |
|---|---|
| dossiers | 34 |
| dossiers sans date de naissance lisible | 13 |
| dossiers mineurs | 0 |
| lignes `DonneePhysiologique` sur sexe, grossesse ou allaitement | 0 |
| brouillons de protocole (dossiers) | 5 (4) |
| brouillons portant une action `supplement_exploration` | 0 |
| brouillons portant une `supplementCatalogRef` | 0 |
| courriers au médecin consignés (sortants) | 8 |
| dossiers avec un médecin traitant renseigné | 0 |

La garde est **latente** : aucun complément au programme, aucune version
diffusée à reprendre, aucun dossier visé déclaré.

## 4. Fiches d'usage du besoin 2 : aucun contact

L'autre session écrit la structure des fiches d'usage
(`src/lib/fiches-usage/ficheUsageBesoin2V1.ts`, son banc, et au besoin
`src/lib/fiches-usage/vocabulaire.ts`). Ce lot n'y touche pas :

- la structure porte une population `POP_…` obligatoire et dix rubriques
  fermées, dont `limites` et `precautions`, sans rubrique « courrier » ;
- tout champ ajouté change `FICHES_USAGE_BESOIN2_SHA256` et renvoie textes et
  libellés « à relire » : la garde **ne s'écrit pas dans la structure** ;
- la garde lit l'état du dossier et l'action de complément, jamais une
  fiche ; une fiche peut **dire** la garde dans ses rubriques, en lot de
  contenu, sans la porter.

## 5. Architecture retenue (après les arbitrages de la section 7)

| Pièce | Mécanisme | Migration |
|---|---|---|
| G0 — nature du complément | sur chaque action `supplement_exploration`, une case du praticien « ciblé » ou « multivitaminé en vente libre » (Q0) ; champ additif du payload du protocole, sans valeur par défaut sur une ligne neuve ; liste fermée aux deux choix : une valeur absente ou hors liste est refusée avant la diffusion (fail-closed) ; seule « ciblé » est gardée | non (payload) |
| G1 — table des déclencheurs | table en code, signée : une ligne par déclencheur, avec nature (population ou situation), portée (tous nutriments ou un analyte) et provenance (règle datée, position signée) ; aucune ligne sans provenance | non |
| G2 — prédicat pur | `courrierRequis(etat, complements)` : rend « requis », « non requis », « état à établir », « date requise » ou « mineur » (Q4, Q5), motif obligatoire ; lit `statutAge`, grossesse et allaitement, situations déclarées et l'accord de partage courant (Q2), relu à chaque clic indépendamment de la trace de remise | non |
| G3 — déclaration des situations | case du praticien sur l'action de complément ciblé, prise dans la liste fermée de G1 (Q7) ; tracée par la chaîne de versions du protocole | non (payload) |
| G4 — courrier | modèle `courrier_complement`, générateur au patron de `src/lib/biology-library/courrier.ts`, sous la garde non prescriptive, régime de consentement de Q2 ; textes validés par le responsable | non |
| G5 — trace de remise | selon Q1 ; ajout seul, instantané du texte, empreinte sha-256, **empreinte de l'ensemble des compléments couverts** (Q3) ; trigger, RLS, contrat SQL négatif sous `prisma/checks/` et sa ligne de CI | **oui** |
| G6 — refus | `409` `courrier_complement_requis` parmi les refus d'avant l'embranchement (`:295-360`), motif en clair, aperçu praticien ; fail-closed drapeau des fiches fermé ; drapeau propre, éteint par défaut | non |

Découpage proposé, un lot par ligne :

1. **Préalable, geste du responsable** : amendement v0.4 de la position P6
   du magnésium, qui fait de `S-MG-2` une situation « courrier, puis
   complément » (Q6) ; tant qu'il n'est pas signé, `S-MG-2` n'entre pas dans
   G1.
2. **G0 à G3**, sans migration : contrat du protocole (chemin du moteur
   clinique, revue `wn-reviewer`, palier T3), table signée, prédicat et banc.
3. **G5**, migration seule : table, trigger, RLS, contrat SQL négatif,
   release-db, constat par conteneur.
4. **G4 et G6** : textes du courrier validés par le responsable, remise au
   clic, refus sous drapeau éteint ; premier passage de bout en bout sur un
   dossier de test avant d'ouvrir le drapeau.

Points tranchés par défaut, à contester :

- **la garde joue au clic** : une grossesse déclarée après la diffusion ne
  retire pas un complément déjà servi ; le cockpit le signale (lot suivant) ;
- **courrier révoqué ou remplacé après la remise** : la remise reste tracée
  (patron [[D-262]], « servie jusqu'à révocation ») ; la version suivante
  rejoue la garde ;
- **retrait de l'accord de partage** : il ferme les clics suivants, même si
  une remise antérieure couvre déjà ces compléments — la trace prouve la
  remise, pas l'accord, que la garde relit à chaque clic ([[D-345]] §6) ; il
  ne retire pas une version déjà servie (la garde joue au clic) ;
- **lecture de Q4 dans le temps** : aucune ligne n'expire (une durée de
  validité serait une borne clinique sans provenance) ; un « oui » déclenche
  tant qu'aucune ligne « non » du praticien ne lui est postérieure ; un
  « non » du praticien antérieur à un « oui » ne lève rien ; une ligne non
  datée vaut ancienne pour un « non », et déclenche pour un « oui » ;
- **annonce** : la remise du courrier entre dans l'annonce unique du clic
  (`gabaritAnnonceDuClic`), sans e-mail de plus ;
- **destinataire** : saisi dans le courrier, prérempli du médecin traitant
  s'il est renseigné ; libellé « le professionnel qui suit la grossesse, à
  défaut le médecin traitant » (P5 v0.3) ; aucun champ neuf au dossier.

## 6. Contre-revue

`wn-reviewer`, 2026-10-22, sur la première version : **NO-GO**, un P0 et
cinq P1, tous vérifiés contre le code puis corrigés ici.

| Constat | Verdict |
|---|---|
| P0-1 — un identifiant de claim rattaché à `S-MG-1` : le dépôt décrit déjà ce claim en clair ailleurs, le lien publiait une conduite | corrigé : identifiant retiré |
| P1-1 — « l'objet gardé n'existe pas » : `supplement_exploration` est déjà le complément du programme | corrigé : §2.1 réécrit, Q0 ajoutée |
| P1-2 — « le consentement ferme tout courrier » : le courrier d'adressage est ouvert par arbitrage | corrigé : §2.4, Q2 ajoutée |
| P1-3 — anamnèse : formulaire patient, `oui` lu | corrigé : §2.3, Q4 précisée |
| P1-4 — la remise dans le clic dépend de `WN_FICHES_ASSIETTE` et peut être sautée | corrigé : §2.2, G6 avant l'embranchement, fail-closed |
| P1-5 — aucun lien entre le courrier et les compléments couverts | corrigé : G5, Q3 ajoutée |
| P2 — questions manquantes (après diffusion, révocation, annonce, contrat SQL, versions antérieures) | tranchés par défaut en §5 ou portés par G5 ; zéro version antérieure (§3) |
| P2 — refus du mineur = extension de [[D-284]] | dit comme tel en Q5 |
| P2 — exclusion par le sexe déclaré | non inférée : Q4 |
| P2 — plan : « médecin traitant », h2 encore ouvert, « le courrier ne sert que la biologie » | corrigé au plan dans cette PR |

## 7. Arbitrages du responsable (2026-10-22)

Questions à options, posées après la contre-revue ; consignés par la
décision prise au merge de cette PR.

| Id | Question | Recommandation | Réponse |
|---|---|---|---|
| Q0 | Une intention `supplement_exploration` est-elle gardée ? | oui, toute intention de complément | **seulement si le praticien la marque « ciblé »** (case « ciblé » ou « multivitaminé ») |
| Q1 | Qu'est-ce qui vaut « remise tracée » ? | remise au patient dans le clic de diffusion, courrier consigné avant (patron [[D-262]]) | recommandation suivie |
| Q2 | Régime de consentement du courrier complément | fermé, comme la biologie | recommandation suivie : refus, retrait et silence ferment ; sans accord, pas de complément ciblé chez une personne visée |
| Q3 | Un courrier couvre quoi ? | la liste des compléments de la version ; un complément ajouté exige un courrier neuf | recommandation suivie |
| Q4 | Grossesse et allaitement : qui déclenche, qui lève ? | « oui » dans l'une des deux sources déclenche ; seule une ligne « non » écrite par le praticien lève, pour tout dossier, sans déduction par le sexe | recommandation suivie |
| Q5 | Mineur, date manquante | date manquante ⇒ « date requise » ; mineur ⇒ refus jusqu'à J3-mineurs, extension de la pause de [[D-284]] | recommandation suivie |
| Q6 | `S-MG-2` : courrier puis complément, ou adressage sans complément ? | suivre le texte signé (adressage) | **courrier, puis complément** : la P6 v0.4 doit le dire avant le code |
| Q7 | Déclaration de `S-MG-1`, `S-MG-2` | case du praticien, liste fermée à provenance, tracée | recommandation suivie |
