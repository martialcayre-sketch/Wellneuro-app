# Brief — Socle de restitution sûre : la garde avant le récit

## Objectif

Toute campagne d'alliance thérapeutique à venir produira du texte adressé au
patient — booklet, portail, courriers, messages. L'architecture cible (§8 de
l'audit du 2026-08-21) pose trois verrous transverses qui conditionnent ce
texte AVANT qu'il n'existe : une garde de vocabulaire qui couvre tous les
chemins sortants, des tables cliniques protégées à l'écriture, un registre de
gabarits de messages versionné et signé. Cette campagne pose ces trois verrous.
Elle ne produit aucun récit : elle rend le récit possible sans qu'il puisse
franchir la frontière diagnostique (DC-27, DC-31, DC-32).

## État réel au cadrage (2026-08-21)

- La garde de vocabulaire/orientation existe (`verifierRestitutionOrientation`
  + `documents/vocabulaire.ts`) mais ne tient qu'UN point de passage : la
  génération de synthèse. Le contre-audit du 2026-08-21 constate que le
  booklet HTML, le courrier médecin et le bilan du portail sortent sans
  passer par elle.
- Les tables cliniques signées (`orientationRulesV1`, `stopRulesV1`,
  `priorityRulesV1`, `equilibre/constants`, `questions.ts`) ne sont pas au
  niveau « demande » de `.claude/hooks/protect-wellneuro-files.mjs` : une
  ligne s'y modifie en silence alors que DC-17/DC-18 exigent décision D-xxx
  et fragment changelog.
- L'en-tête d'`orientationRulesV1.ts` décrit un pipeline
  `tools/corpus/orientation/` qui n'existe pas ; DECISIONS.md:2832 acte la
  correction — provenance décrite ≠ provenance réelle (DC-01, DC-02).
- Les gabarits de messages patient sont des modules ad hoc, un par usage —
  aucune version, aucune signature, aucune date : DC-26 (les règles vivent
  dans le registre, jamais seulement dans le code) n'est pas tenu pour eux.
- Le patron cible existe déjà dans le dépôt : `trust/contenus/registre.ts` —
  versions hash-verrouillées, chaîne append-only, deux dates (rédaction et
  validation), garde structurelle par test. Le banc de `relanceEmail.ts` sert
  de référence de contrainte : aucune donnée de santé dans un email.

## Lots pressentis (3)

1. **Garde de vocabulaire sur TOUS les chemins sortants** : étendre
   `verifierRestitutionOrientation` + `documents/vocabulaire.ts` du point
   unique (génération de synthèse) au booklet HTML, au courrier médecin et au
   bilan du portail. Un chemin sortant sans garde est un chemin où « score »
   peut devenir « diagnostic » (DC-27, DC-31, DC-32) ; la garde doit refuser,
   pas avertir. Banc : chaque chemin sortant prouvé couvert par un test qui
   échoue si la garde est débranchée (DC-34, DC-35 — l'abstention aussi
   s'explique).
2. **Tables cliniques au niveau « demande » du hook** : ajouter
   `orientationRulesV1`, `stopRulesV1`, `priorityRulesV1`,
   `equilibre/constants` et `questions.ts` à
   `.claude/hooks/protect-wellneuro-files.mjs` (verdict « demande », jamais
   « refus » — l'autorisation en un clic matérialise la confirmation DC-17/
   DC-18). Corriger dans le même lot l'en-tête d'`orientationRulesV1.ts`
   (pipeline `tools/corpus/orientation/` inexistant, DECISIONS.md:2832) :
   une provenance fausse est pire qu'une provenance absente (DC-01, DC-02).
3. **Registre de gabarits de messages patient** : créer le registre au patron
   `trust/contenus/registre.ts` — chaque gabarit versionné, hash-verrouillé,
   chaîné en append-only, portant deux dates (rédaction, validation) et gardé
   par un test structurel (DC-26). Contrainte de référence héritée du banc de
   `relanceEmail.ts` : aucune donnée de santé dans un email — le registre la
   rend opposable à tout gabarit futur, pas seulement à la relance. Aucun
   seuil ni contenu clinique inventé au passage (DC-19, DC-20) : le registre
   accueille des gabarits existants, il n'en écrit pas.

## Gates

Aucun. Cette campagne EST le gate des suivantes : aucune campagne d'alliance
n'ouvre un chemin de texte patient avant que les trois verrous tiennent.

## Invariants

- Les hooks de sécurité ne s'affaiblissent jamais : ajouter au niveau
  « demande » n'abaisse aucun verdict existant, ne retire aucun motif.
- Toute modification de `.claude/hooks/protect-wellneuro-files.mjs` passe une
  relecture adversariale avant merge (`.claude/rules/hooks-garde-fous.md`).
- Toute modification d'une table clinique signée = décision D-xxx + fragment
  `changelog.d/` (DC-17, DC-18) — y compris la correction d'en-tête du lot 2,
  déjà actée (DECISIONS.md:2832).
- Identités de fixture uniquement (Sophie Nicola, Jennifer Martin,
  Michel Dogné) ; aucune donnée patient réelle dans bancs et exemples.
- Une garde qui passerait au vert en permanence sans sujet ne se pose pas :
  chaque banc du lot 1 doit rougir quand la garde est débranchée.

## Dépendances

- Le lot 1 et le lot 2 sont indépendants ; le lot 3 peut suivre l'un ou
  l'autre. Aucune migration Prisma pressentie.
- Les campagnes d'alliance thérapeutique dépendent des trois lots — c'est le
  sens de cette campagne.
