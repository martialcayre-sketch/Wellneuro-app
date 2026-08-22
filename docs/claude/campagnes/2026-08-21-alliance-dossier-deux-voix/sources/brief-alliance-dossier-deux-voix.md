# Brief — Alliance 6.0-A : le dossier à deux voix

## Objectif

Donner au dossier les objets qui rendent la négociation clinique **visible** :
ce que le patient demande, ce que le praticien en comprend, ce qui est
priorisé, ce qui est assumé « non traité pour l'instant ». C'est la réponse
produit au trou Éducation thérapeutique de l'audit du 2026-08-21 (§8) —
aucune occurrence ETP dans `web/src`, greps confirmés au moment de l'audit.

Cette campagne se livre **AVANT** l'activation élargie du chemin
protocole→produits : `priorityRulesV1` est signée depuis le 2026-08-16, et la
ratification patient (l'objectif négocié) doit précéder toute recommandation
élargie qui s'en réclamerait. L'ordre est un gate, pas une préférence.

## État réel au dépôt (2026-08-21)

- Les champs attentes/motif de l'anamnèse existent
  (`web/src/lib/consultation/anamnese.ts`) mais sont **figés en JSON à la
  validation** : aucune trajectoire, aucune reformulation, aucun désaccord
  possible après coup.
- Le seul canal de contestation patient existant est le **déverrouillage de
  questionnaire** — il rejoue une saisie, il n'exprime pas un désaccord sur
  une compréhension.
- Aucun objet EVA, aucun objet « objectif négocié », aucun écran de synthèse
  de compréhension. À REVÉRIFIER À L'OUVERTURE : ces greps peuvent avoir
  bougé.
- Patrons du dépôt à réutiliser, pas à réinventer : journal **append-only
  chaîné** (chaque entrée référence la précédente, rien ne s'écrase),
  versions **hash-verrouillées** façon `trust/contenus/registre.ts`,
  **deux dates** (date de l'événement ≠ date d'enregistrement), **garde
  structurelle par test** (un test qui refuse le champ interdit, patron du
  banc D-042/D-046).

## Lots esquissés (4)

1. **Objectif négocié v1** — modèle append-only : énoncé patient,
   reformulation praticien, priorité clinique, « non traité pour l'instant »
   assumé et daté. Ancré sur les champs attentes/motif de l'anamnèse
   existante. Un objectif n'est **jamais un score** (DC-27) ; la
   reformulation praticien n'est **jamais diagnostique** (DC-31, DC-32) —
   c'est une compréhension, pas une conclusion.
2. **« Ce qui compte pour moi aujourd'hui »** — champ libre patient,
   horodaté, saisi avant check-in/RDV, **conservé** : la trajectoire de sens
   à côté des scores, jamais résumée dans un score. Deux dates (saisie ≠
   enregistrement).
3. **« Ce que j'ai compris de vous »** — synthèse de compréhension rédigée
   par le praticien, présentée au patient avec un bouton « Ce n'est pas
   exactement ça » qui crée un **objet désaccord structuré**. Un désaccord
   est une discordance : il se **signale**, reste visible, ne s'écrase et ne
   se moyenne jamais (DC-30). Il remplace le détournement actuel du
   déverrouillage questionnaire comme canal de contestation.
4. **EVA — voie instrument cabinet** — cycle brouillon → grille_a_relire →
   valide, comme les instruments existants. **Aucun seuil inventé**
   (DC-19, DC-20) : l'EVA pilote la conversation, elle ne classe pas ; un
   pilotage n'est jamais un diagnostic (DC-27, DC-28).

## Gates

- **Lot 3 derrière le Socle** : tout texte praticien→patient passe par le
  circuit de textes gardés du Socle avant d'être montré. Pas de synthèse
  affichée au patient hors circuit.
- **Campagne entière avant l'activation élargie protocole→produits** : la
  ratification patient précède la recommandation.
- Toute décision clinique de la campagne = décision `D-xxx` + fragment
  `changelog.d/` (DC-17, DC-18).

## Invariants (opposables aux quatre lots)

- Append-only chaîné : rien ne s'écrase, un correctif est une nouvelle
  entrée qui référence l'ancienne (patron DC-30 : la discordance reste
  visible).
- Deux dates partout : événement ≠ enregistrement.
- Versions de texte hash-verrouillées façon `trust/contenus/registre.ts`
  pour tout contenu montré au patient.
- Garde structurelle par test pour chaque interdit de forme (ex. : aucun
  champ de score sur un objectif négocié, aucun seuil sur une EVA) — patron
  du banc de fraîcheur D-042/D-046.
- Une donnée absente n'est jamais zéro ni normale (DC-24) : un champ
  « ce qui compte » vide est un silence, pas une réponse.
- Provenance certifiée pour toute règle affichée comme clinique (DC-01,
  DC-02) ; les règles vivent dans le registre, jamais seulement dans le code
  (DC-26).

## Contraintes et interdits

- Classe clinique : Opus, T3, revue `wn-reviewer` avant de passer la main.
- Tout nouveau modèle = migration Prisma : CONFIRMATION OBLIGATOIRE,
  migration seule dans sa PR, release-db entre elle et le code qui en dépend.
- Identités de fixtures uniquement : Sophie Nicola, Jennifer Martin,
  Michel Dogné. Aucune donnée patient réelle, aucun seed visant un dossier
  réel (D-075).
- UI en français ; changements minimaux.

## Absorptions et dépendances

- **Absorbe** : l'anamnèse v2 et l'EVA du P3 de l'audit du 2026-08-21 ; les
  premiers écrans du « dashboard patient » E4 (différé, réconcilié ici).
- Dépend du Socle (textes gardés) pour le lot 3 uniquement ; les lots 1, 2
  et 4 n'en dépendent pas.
- Le cadrage complet (CAMPAGNE.md, lots/) s'écrit à l'OUVERTURE de la
  campagne, jamais avant.
