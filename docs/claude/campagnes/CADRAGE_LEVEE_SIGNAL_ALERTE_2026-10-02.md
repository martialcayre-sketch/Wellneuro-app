# Cadrage — la sortie du blocage par signal d'alerte : l'adressage devient la première action du protocole

> Posé le 2026-10-02. Ouvert par la réserve de [[D-218]] §12 (« si l'abstention
> doit pouvoir se lever sur preuve d'adressage, c'est un arbitrage clinique
> distinct, qui touche la chaîne C1 — il n'est pas rendu »). Ce document est le
> LOT-00 : il ne livre aucun code, aucune migration, aucune décision `D-xxx`.
> Les arbitrages du §2 et du §5 sont tous rendus : la décision s'écrit au
> registre au LOT-01.

## 1. Le constat

Un signal d'anamnèse de rang `adressage` ([[D-099]]) fait passer l'abstention en
`required` (`ABST-SEC-01`) : la table des priorités se tait, la carte est bloquée
(`isDecisionBloquee`, `clinical-engine/decisionGuards.ts`), aucun protocole n'est
diffusable (`contenuPatientProtocole.ts`). Le geste d'adressage existe depuis
[[D-218]] (lettre consignée, drapeau `WN_ADRESSAGE_COURRIER` posé le 2026-09-17),
mais **il ne lève rien** : aucun chemin ne fait sortir un dossier de cet état.
Le seul second producteur de constats, l'effet indésirable ([[D-101]]), a, lui, une
sortie : le signalement cesse de bloquer quand il quitte `recu`/`en_cours`
(`STATUTS_EI_NON_TRAITES`).

Mesure de production disponible : **6 dossiers sur 25** portaient un signal de rang
`adressage` au 2026-08-23. Aucune mesure plus récente — à refaire par conteneur
détaché, en agrégats, avant la décision (§6).

## 2. L'arbitrage rendu le 2026-10-02 (responsable, en session)

**A1 — LA LEVÉE EST DE TYPE « DÉCLASSEMENT », PAS UN EFFACEMENT.** Le signal ne
disparaît jamais de l'écran praticien ; il cesse d'inhiber.

**A2 — L'ADRESSAGE DEVIENT LA PREMIÈRE ACTION DU PROTOCOLE.** La sortie du blocage
passe par le geste d'adressage (lettre au médecin), et le protocole porte, en tête,
l'action d'orientation vers le médecin. Ensuite la décision (priorité, protocole
21 jours) et le T0 fonctionnent **comme pour un dossier sans alerte**.

**A3 — GRANULARITÉ PAR SIGNAL.** Seuls les signaux couverts par l'adressage sont
déclassés ; un signal non couvert — nouveau, ou déclaré après la lettre — rebloque.

## 3. Ce que cela veut dire dans le code

**3.1 Le déclencheur : la lettre d'adressage consignée, et non une case à cocher.**
La lettre existe, elle est ancrée (`ancrageSha256 = SAFETY_SIGNALS_SHA256`,
[[D-073]]), elle part vers un tiers et elle est relue avant envoi. Une attestation
libre « avis obtenu » serait un geste plus léger que celui qu'il lève.
*Conséquence* : [[D-218]] §12 (« la lettre trace, elle ne vaut pas ») est
**amendé** ; [[D-099]] décision 3 l'est aussi (l'inhibition ne vaut plus jusqu'à
nouvel ordre, mais jusqu'à l'adressage).

**3.2 La granularité exige une colonne — donc une migration.**
`correspondances_medecin` ne garde les signaux que **dans le texte** de la lettre.
Rien de structuré ne dit quels constats elle couvre. Il faut persister, à la
consignation, la liste des `findingId` couverts (identifiant = empreinte du libellé
verbatim, déjà stable par construction dans `safetyFindings.ts`) et l'identifiant
de la consultation porteuse. Forme retenue (A8) : une table dédiée en ajout
seul, qui porte aussi les révocations (A12).
**Migration seule dans sa PR, `release-db` approuvée, constat par conteneur, puis
seulement le code consommateur** ([[D-087]]). Les lettres déjà consignées (avant
la colonne) **ne lèvent rien** : leur couverture ne se reconstitue pas en relisant
la prose — il faudra re-consigner.

**3.3 La chaîne C1 sépare les constats ouverts des constats adressés.**
`construireSafetyFindings` continue de produire **tous** les constats. Un constat
dont le `findingId` est couvert par une lettre consignée passe dans une liste
distincte (`safetyFindingsAdresses`, nom à fixer) : il ne nourrit plus
`evaluerAbstention` ni `decisionCard.safetyFindingIds`, mais il est porté par la
carte, il entre dans son empreinte, et il reste affiché au bloc « Ce qui suspend
la décision », sous un intitulé du genre « Adressage engagé le … ». Aucun point
dans aucun sens (`DC-23`) : la partition ne lit aucun score. Fail-closed : couverture
illisible ou absente ⇒ le constat reste ouvert.

**3.4 L'action d'orientation en tête du protocole.**
Le type `medical_referral` (« Orientation vers le médecin traitant — jamais une
prescription ») **existe déjà** (`clinical-engine/types.ts`) ; il est rendu au
constructeur et au contrat patient. Ce qui manque :
- pré-remplir cette action en première position quand au moins un constat est
  adressé, et **l'empêcher d'être retirée** tant que la levée tient ;
- son texte patient ne peut **pas** nommer une « alerte médicale »
  (`REGISTRE_FRONTIERES.md`, rappelé par le LOT-04 de « Doctrine exécutable ») ni
  recopier les signaux déclarés : il dit le geste (« prendre rendez-vous avec votre
  médecin et lui remettre le courrier »), passe la garde de registre anxiogène
  ([[D-189]] §4) et relève d'une source citable fermée — un texte de conduite signé,
  à écrire, jamais saisi librement.

**3.5 Le T0 et le suivi.** Rien de propre à prévoir si 3.3 tient : le T0 lit la
carte, et une carte sans constat ouvert est une carte non bloquée. À vérifier au
lot qui touche `preconditionsT0.ts` et `rideauT0.ts`, pas à supposer.

## 4. Ce qui ne change pas

- La cotation signée des douze signaux ([[D-099]]) : ni relue, ni re-cotée.
- Le rang `vigilance` : toujours sans effet.
- L'effet indésirable ([[D-101]]) : sa sortie reste la sienne ; une lettre
  d'adressage ne lève **pas** un constat d'effet indésirable (préfixe
  `safetyFindingSource`, [[D-218]] §10).
- La lettre elle-même ([[D-218]] §3-§9) : texte, provenance, filtrage.

## 5. Arbitrages complémentaires rendus le 2026-10-02 (responsable, en session)

Les questions ouvertes à la première version de ce cadrage sont toutes tranchées.

| # | Question | Arbitrage |
|---|---|---|
| A4 | L'orientation compte-t-elle dans `MAX_ACTIONS_PROTOCOLE_21J = 3` ? | **Hors borne** : le protocole garde trois actions d'intervention en plus de l'orientation, qui ne pèse pas dans la charge. |
| A5 | Les six signaux `adressage` se lèvent-ils de la même façon ? | **Même règle pour les six**, « idées noires ou suicidaires » compris. Aucune cotation nouvelle. |
| A6 | Une anamnèse validée APRÈS la lettre redéclare le même signal | **Rebloque** : la couverture vaut pour la consultation porteuse de la lettre, pas pour le libellé en général. |
| A7 | Ce qui lève | **La lettre d'adressage consignée suffit.** La réponse du médecin reste un suivi, pas une condition. |
| A8 | Forme de la couverture | **Table dédiée, en ajout seul** (lettre, consultation porteuse, `findingId` couverts), et non une colonne sur `correspondances_medecin`. |
| A9 | Lettres consignées avant la migration | **Elles ne lèvent rien** : le praticien re-consigne. Aucune reprise de données depuis le texte libre. |
| A10 | Texte patient de l'action d'orientation | **Rédigé par l'équipe, signé par le responsable**, comme les autres tables cliniques : neutre, sans « alerte », sans les signaux, sous la garde de registre anxiogène. |
| A11 | L'action d'orientation est-elle retirable ? | **Non** tant que la levée tient. |
| A12 | Une lettre consignée par erreur | **Révocation tracée** : une ligne de révocation (ajout seul, motif obligatoire) ; le dossier rebloque. Rien n'est effacé. |

Précision de lecture : « le protocole et le T0 fonctionnent comme un dossier sans
alerte » désigne la suite normale du parcours — sélection de priorité, protocole
21 jours, T0 — confirmé le 2026-10-02.

## 6. Découpage proposé

| Lot | Contenu | Porte |
|---|---|---|
| LOT-00 | Ce cadrage ; mesure de production (agrégats : dossiers porteurs, lettres déjà consignées) | — |
| LOT-01 | **Livré le 2026-10-02 : [[D-257]]** (amende [[D-099]] décision 3 et [[D-218]] §12) ; texte patient de l'action d'orientation signé le même jour, recopié au §9 de la décision | arbitrages rendus (§2, §5) |
| LOT-02 | Migration seule : table des adressages (couverture + révocation) | `release-db` approuvée, constat par conteneur |
| LOT-03 | Écriture de la couverture à la consignation de la lettre ; route de révocation (le bouton de révocation se pose au LOT-04, avec l'affichage de la couverture) | LOT-02 constaté le 2026-10-03 (run `release-db` n° 131) |
| LOT-04 | Chaîne C1 : partition ouverts/adressés, carte, empreintes, cockpit | LOT-03 ; derrière un drapeau neuf, éteint à la livraison |
| LOT-05 | Action d'orientation en tête du protocole, hors borne des trois, non retirable, texte signé | LOT-04 |

Chaque lot touche un chemin clinique : T3 (`npm run test:worktree`) et revue
`wn-reviewer` avant PR. Bancs à poser : un signal adressé ne réduit jamais
l'empreinte de sécurité à zéro (il reste porté) ; un signal non couvert rebloque ;
une lettre sans couverture structurée ne lève rien ; une révocation rebloque ;
une redéclaration sur une consultation postérieure rebloque ; un effet
indésirable n'est jamais levé par une lettre.

## 7. Consignes pour les lots suivants (revue `wn-reviewer` du LOT-02, 2026-10-03)

La migration du LOT-02 (#1288) tient en base la lettre **de la même transaction** et
la consultation **porteuse au moment de l'insertion**. Ce qu'elle ne peut pas tenir
revient aux écrivains et aux lecteurs :

- **LOT-03 (écrivain).** La route d'adressage lit la porteuse avec son `id` ET son
  `anamnese` dans la même requête (aujourd'hui `select: { anamnese: true }`) ;
  `finding_ids` dérive du même `signauxDeclares(...)`, restreint au rang
  `adressage`, libellés hors cotation compris — exactement les signaux imprimés
  dans la lettre. Lettre et couverture s'insèrent dans **une seule `$transaction`
  interactive, au même niveau** (pas de point de sauvegarde entre les deux : la
  base refuserait la couverture). Une révocation s'écrit avec `findingIds` absent,
  jamais `[]` (Prisma relit le NULL d'une révocation comme `[]`, et `[]` serait
  refusé par le CHECK).
- **LOT-03 (gardes et E2E).** La garde « qui écrit » ne scanne que `src/` : l'étendre
  aux scripts et à `web/e2e/helpers/db.ts`, dont les nettoyages par dossier
  échoueront en RESTRICT dès qu'un E2E créera une couverture.
- **LOT-04 (lecteur).** La levée ne vaut que si `id_consultation` est la porteuse
  **courante** (banc d'égalité) ; la lettre est relue à la lecture (sortante,
  ancrage `safety-signals-`, même dossier) — `correspondances_medecin` n'a pas de
  gel, le trigger ne la vérifie qu'à l'insertion.
- **LOT-04 (lecteur), revue du LOT-03.** Une révocation vise UNE lettre : deux
  lettres consignées sur la même porteuse donnent deux couvertures, et en révoquer
  une ne rebloque pas si l'autre couvre le même constat. L'écran du LOT-04 affiche
  donc TOUTES les couvertures actives d'un constat, et le bouton de révocation
  s'y pose par couverture. Les transactions interactives gardent les délais par
  défaut de Prisma (attente 2 s, durée 5 s) : à surveiller sous `DB_POOL_MAX=1`.
- **Texte de l'écran, arbitré le 2026-10-03.** Depuis le LOT-03, la mention avant
  consignation dit que la lettre « ne lève pas encore l'abstention » et qu'« à
  l'ouverture de la levée, elle vaudra adressage pour les signaux qu'elle nomme ».
  Les couvertures écrites sous cette mention sont donc signées en connaissance de
  cause ; le LOT-04 la remplacera par l'état réel.
- **Choix assumé.** Une lettre dont la couverture a été révoquée ne couvre plus
  jamais : le praticien re-consigne une lettre neuve (index unique sans exception
  pour les lettres révoquées).
