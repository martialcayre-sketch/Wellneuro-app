# Brief — 6.0-B : Charge et capacité d'exécution

## Objectif

Optimiser ce que le patient peut réellement faire maintenant, pas seulement
ce qu'il faudrait idéalement faire. La campagne adapte la **charge** proposée
au patient — présentation, volume, séquencement du protocole — et **jamais le
fond clinique** : aucun seuil, aucune indication, aucune règle de scoring ne
bouge (DC-17, DC-18). Référence d'architecture : §8 de l'audit du 2026-08-21.

Le système sait aujourd'hui dire quoi faire ; il ne sait pas distinguer un
patient qui « n'a pas suivi » d'un patient dont le protocole « dépassait sa
capacité d'exécution ». Cette distinction est la matière première de la
campagne : elle se capte, se trace, s'affiche au praticien — elle ne
s'interprète jamais automatiquement.

## État réel au cadrage (2026-08-21)

- L'ancrage parfait existe déjà : `ProtocolDraft` est append-only chaîné
  (`supersedesDraftId`), sur le patron du dépôt (chaînage append-only, deux
  dates, versions hash-verrouillées façon `trust/contenus/registre.ts`,
  garde structurelle par test).
- 6.0-A n'est pas livrée : les objets d'objectif n'existent pas encore.
  C'est le gate d'entrée de la campagne (voir Gates).
- Le check-in existe en v2 ; la v3 est strictement additive (voir lot 4).

## Lots esquissés (4) — esquisse init-only, le cadrage tranchera

1. **Budget d'effort du cycle** : le patient déclare un budget 1-5 en début
   de cycle ; ce budget module la **présentation** du protocole (ordre,
   regroupement, volume affiché), jamais son contenu clinique. Une donnée
   absente n'est jamais zéro ni normale (DC-24) : pas de budget déclaré ⇒
   présentation par défaut, pas « budget minimal ».
2. **« Trop lourd » → « Simplifier mon protocole »** : le patient signale la
   surcharge ; le système propose une version minimale **issue du plan déjà
   prévu** par le praticien — sélection dans l'existant certifié, jamais
   génération de contenu clinique nouveau (DC-01, DC-02). Véhicule :
   `ProtocolDraft` append-only chaîné via `supersedesDraftId` — chaque
   simplification est un nouveau draft qui supersède l'ancien, rien ne
   s'écrase. C'est ce chaînage qui matérialise la distinction « n'a pas
   suivi » vs « dépassait sa capacité d'exécution ».
3. **Mode « cette semaine est compliquée »** : bascule vers le minimum
   viable, SANS interprétation clinique automatique — la bascule n'est ni un
   signal, ni un score, ni une conclusion (DC-27, DC-31) ; le praticien est
   informé par une carte du fil et reste seul à interpréter.
4. **Check-in v3 additif** : porte d'entrée mieux / pareil / moins bien,
   puis progressive disclosure. Catalogue **gelé longueur 4**, extension
   strictement additive et versionnée, contrat `c2a-checkin-v1`
   hash-verrouillé façon `trust/contenus/registre.ts`, garde structurelle
   par test. Une discordance entre check-in et reste du dossier se signale,
   jamais ne se moyenne (DC-30).

## Invariants durs

- **Arbitrage A1, gravé au schéma** : le check-in est un instrument de
  **pilotage**, jamais un score ni un indicateur agrégé d'alliance (DC-27 —
  association ≠ causalité, score ≠ diagnostic). Aucun champ, aucune vue,
  aucun export ne doit permettre de l'agréger en indicateur.
- **Toute évolution de catalogue** (check-in, versions de présentation) =
  décision `D-xxx` + fragment `changelog.d/` (DC-17, DC-18).
- La simplification réduit la conclusion présentée, jamais ne l'invente
  (DC-25) ; l'orientation clinique reste un objet distinct et intouché
  (DC-31, DC-32).
- Un signal de sécurité prime sur toute logique de charge (DC-12, DC-23) :
  aucune simplification ne peut masquer ou différer un signal de sécurité.
- Identités de démonstration limitées aux fixtures : Sophie Nicola,
  Jennifer Martin, Michel Dogné. Aucune donnée patient réelle.

## Gates

- **Entrée : 6.0-A livrée** — les objets d'objectif existent. Tant que ce
  gate n'est pas levé, la campagne ne s'ouvre pas ; ce dossier reste
  init-only.
- Le cadrage complet (CAMPAGNE.md, lots/) s'écrit à l'ouverture, jamais
  avant.

## Contraintes et interdits

- Aucune modification de la logique clinique ni des seuils ; classe
  scoring/clinique si un lot venait à la frôler : Opus, T3, revue
  `wn-reviewer`.
- Migration Prisma éventuelle (budget d'effort, chaînage) : confirmation
  obligatoire, migration seule dans sa PR, release-db entre elle et le code.
- Patrons imposés : append-only chaîné, deux dates, versions
  hash-verrouillées, garde structurelle par test.
