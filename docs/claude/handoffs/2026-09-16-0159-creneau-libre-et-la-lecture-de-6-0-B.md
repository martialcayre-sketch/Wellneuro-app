# Handoff — 2026-09-16 — Créneau libre : la clôture mergée, et ce que vaut 6.0-B

**Branche** : `handoff-creneau-libre`, ouverte depuis `origin/main`. Aucun code.
**État machine** : `status: idle`, `active_campaign: null` — le créneau primaire est
LIBRE et son attribution reste un geste du responsable.

## Ce qui a été fait depuis le handoff de 01 h 30

**La clôture est mergée** : PR #1131, squash `b368677a`. Documentation et état
machine seulement.

**Le CI avait d'abord refusé la clôture**, et la leçon vaut d'être retenue :
`scripts/wn-campaign-audit.mjs` est **bloquant en CI et absent de `npm run check`**
— il n'entre qu'à T2. Code rendu : `closed_campaign_with_open_lots`, sur le
`LOT-01` d'IDP2 dont le statut disait « **clos** », mot que `isClosedStatus` ne
connaît pas (`termine*`, `livre*`, `abandon*`, `fait*` seulement). Corrigé en
alignant **le fichier** — « livré », comme ses deux frères de la même campagne —,
délibérément **pas** en élargissant le garde : une occurrence unique dans tout le
dépôt est une incohérence isolée, pas un trou de vocabulaire.

**Vérifié après le merge, pas avant** : l'audit rejoué sur le `main` fusionné,
commits des sessions voisines compris → `AUDIT-EXIT=0`, un seul avertissement non
bloquant (`duplicate_lot_ordinal`, connu). `wn-campaign status` : 9/9 lots,
inactive.

**Deux campagnes restent `en_cours` à dessein**, et ne sont pas des statuts
périmés : `2026-08-18-echeance-hds-g-trust-04` (parallèle, ne consomme pas le
créneau) et `2026-08-10-chaine-alimentaire` (bloquée sur le recueil 21 j du
pilote — « elle reprend, elle ne se recrée pas »).

## 6.0-B *charge et capacité* — lu, non ouvert

Le dossier `2026-08-21-charge-et-capacite/` est **init-only** : ni `CAMPAGNE.md`,
ni `lots/` ; `CAMPAIGN_DRAFT.md` est le squelette généré, R0→R6 tous « à
compléter ». Tout le contenu réel tient dans
`sources/brief-charge-et-capacite.md`.

**Intention** : distinguer « n'a pas suivi » de « le protocole dépassait sa
capacité d'exécution ». La charge adaptée est la **présentation** — volume,
ordre, séquencement —, jamais le fond clinique.

**Quatre lots esquissés** : budget d'effort 1-5 en début de cycle ; « trop lourd »
→ « simplifier mon protocole » par `ProtocolDraft` chaîné (`supersedesDraftId`) ;
mode « cette semaine est compliquée » ; check-in v3 additif.
**Invariant intangible** : arbitrage A1 — le check-in est un instrument de
pilotage, jamais un score agrégé d'alliance.

**Vérifié contre le dépôt d'aujourd'hui**, le brief ayant quatre semaines :

- **Le gate d'entrée est levé** — « 6.0-A livrée » l'est depuis le 2026-08-22. Ce
  n'est plus ce qui retient la campagne.
- **Les ancrages existent** : `supersedesDraftId` (`schema.prisma:1253`),
  `supersedesCheckinId` (`:1283`). Les lots 2 et 3 n'appellent aucune migration.
  Aucune des quatre fonctionnalités n'existe encore.
- **La prémisse du lot 4 a vieilli** : le catalogue est **déjà en v2**
  (`checkin-catalogue-v2-observance-complements`, C4 LOT-05) et les quatre
  questions gelées portent déjà la forme mieux / stable / moins bien. Une v3
  devra dire ce qu'elle ajoute que la v2 n'a pas.
- **Coût que le brief ne nomme pas** : `TherapeuticLoad.source` est le **littéral**
  `'practitioner'` (`clinical-engine/types.ts:465`). Un budget déclaré par le
  patient est un changement de contrat versionné, avec la machinerie
  `409 version_contrat_incompatible` derrière.

## Recommandation — de l'outil, pas un arbitrage

**Ne pas ouvrir de campagne.** Les quatre lots de 6.0-B sont en aval du protocole
diffusé, mesuré à zéro la veille ; son lot 4 étendrait un appareil de check-in
construit, déployé, jamais utilisé une fois.

**Faire passer un dossier réel dans le constructeur, une fois.** Vingt minutes :
sélection de priorité → trois actions avec type et charge → enregistrer →
diffuser. Soit il existe le premier protocole C1 en production, soit il en sort
une liste de défauts du **chemin réel** — celui que ni T1, ni T3, ni les quatre
agents de la contre-revue ne parcourent.

**Le corollaire qui compte** : la relecture d'usage à deux semaines ne dira rien
si rien n'est tenté d'ici là. On re-mesurerait l'inaction, pas l'outil.

**Si de l'ingénierie doit se faire**, une seule pièce est sur ce chemin : la
**dette (1) de `D-200`** — `ProtocolConsultationPanel` reconstruit une seconde vue
patient à la main, hors contrat, **ignore `interventionStatus`** (une action
suspendue s'y lit comme un conseil ferme) et reste inerte en production
(`protocolDraft` forcé à `null`) : **le praticien n'a aucun aperçu de ce que son
patient lira**, sur aucun dossier réel.

**Écartés, avec leur motif** : curation des exclusions — bon chantier, mauvais
moment, son coût écrit est « une cadence praticien, intervention par
intervention » sur 95, soit exactement la ressource que la mesure désigne comme
le goulot ; les dix règles orphelines — légitimes, mais elles ne déplacent pas
l'entonnoir ; 6.0-B — ci-dessus.

## Validations exécutées

`node --test scripts/wn-coherence-etat.test.mjs` et l'audit de campagnes dans sa
commande exacte du CI. Aucun code touché, donc aucune suite applicative rejouée.

## Interdits encore actifs

Aucune migration Prisma ni modification de `schema.prisma` sans demande explicite.
Aucune identité réelle au dépôt. Lecture de production **uniquement** par
`scalingo run -d`, commande aplatie, comptages dé-identifiés. Une signature
clinique ne se pose jamais par l'outil : `shaPerimetre` et `dateValidation`
échappent à toute autorisation d'outillage. Le numéro de décision se prend **au
merge** — `D-201` et `D-202` ont été pris par des sessions voisines pendant
celle-ci.

## Prochaine action exacte

**Attendre le geste du responsable sur le créneau primaire.** Ne pas l'ouvrir de
sa propre initiative. Si la réponse est « le dossier », accompagner le parcours
réel pas à pas et corriger à chaud ; si elle est « la dette », ouvrir la dette (1)
de `D-200`.
