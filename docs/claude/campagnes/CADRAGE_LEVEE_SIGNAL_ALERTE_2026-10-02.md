# Cadrage — la sortie du blocage par signal d'alerte : l'adressage devient la première action du protocole

> Posé le 2026-10-02. Ouvert par la réserve de [[D-218]] §12 (« si l'abstention
> doit pouvoir se lever sur preuve d'adressage, c'est un arbitrage clinique
> distinct, qui touche la chaîne C1 — il n'est pas rendu »). Ce document est le
> LOT-00 : il ne livre aucun code, aucune migration, aucune décision `D-xxx`.
> La décision s'écrit au registre quand les questions du §5 sont tranchées.

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

## 3. Ce que cela veut dire dans le code (proposition, à valider au §5)

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
de la consultation porteuse. Deux formes possibles : une colonne nullable sur
`correspondances_medecin`, ou une table dédiée `adressages_signal` (append-only).
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

## 5. Questions à trancher avant la décision

1. **Le compte des actions.** L'orientation compte-t-elle dans la borne de trois
   actions (`MAX_ACTIONS_PROTOCOLE_21J = 3`) ? Proposition : **non** — ce n'est pas
   une intervention et elle ne pèse pas dans la charge ; la compter amputerait le
   protocole du seul fait de l'alerte.
2. **Les six signaux, même règle ?** « Idées noires ou suicidaires » se lève-t-il
   sur la même pièce que « sang dans les selles » ? La table ne le distingue pas
   aujourd'hui ; une distinction serait un arbitrage clinique neuf, que le dépôt ne
   peut pas inventer.
3. **La re-déclaration.** Une anamnèse validée APRÈS la lettre et qui redéclare le
   même signal : couvert (même `findingId`) ou rebloquant (nouvel épisode) ?
   Proposition : **rebloquant** — la couverture vaut pour la consultation porteuse
   de la lettre, pas pour le libellé en général.
4. **Le retour du médecin.** La lettre suffit-elle, ou faut-il une réponse
   consignée au fil médecin (`sens = entrant`) avant de lever ? Proposition : la
   lettre suffit pour lever ; la réponse reste un suivi, pas une condition.
5. **La forme de la couverture** : colonne sur `correspondances_medecin` ou table
   dédiée (3.2).

## 6. Découpage proposé

| Lot | Contenu | Porte |
|---|---|---|
| LOT-00 | Ce cadrage ; mesure de production (agrégats : dossiers porteurs, lettres déjà consignées) | — |
| LOT-01 | Décision `D-xxx` (amende [[D-099]] décision 3 et [[D-218]] §12) + texte de conduite signé de l'action patient | arbitrages du §5 |
| LOT-02 | Migration seule : couverture structurée des signaux | `release-db` approuvée, constat par conteneur |
| LOT-03 | Écriture de la couverture à la consignation de la lettre | LOT-02 constaté |
| LOT-04 | Chaîne C1 : partition ouverts/adressés, carte, empreintes, cockpit | LOT-03 ; derrière un drapeau neuf, éteint à la livraison |
| LOT-05 | Action d'orientation en tête du protocole, non retirable, texte signé | LOT-04 |

Chaque lot touche un chemin clinique : T3 (`npm run test:worktree`) et revue
`wn-reviewer` avant PR. Bancs à poser : un signal adressé ne réduit jamais
l'empreinte de sécurité à zéro (il reste porté) ; un signal non couvert rebloque ;
une lettre sans couverture structurée ne lève rien ; un effet indésirable n'est
jamais levé par une lettre.
