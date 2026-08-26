---
id: "LOT-06"
titre: "Bilan et gate de consolidation — fabriquer la provenance, fermer D-093"
statut: "en_cours"
dépend_de: "LOT-01, LOT-02, LOT-03, LOT-04, LOT-05"
---

# LOT-06 — Bilan et gate de consolidation

## But

Transformer l'usage réel en **provenance** : les écarts motivés du praticien
et les amendements des patients deviennent le matériau qui permet de signer
le classement des candidats — et de fermer la boucle [[D-093]].

## Résultat observable

- Un **bilan écrit** (document de campagne, pas un écran) qui constate :
  quelles propositions ont été reprises telles quelles, amendées (et sur
  quoi), écartées (et pourquoi) ; quels amendements patients sont arrivés ;
  ce que cela dit du classement des candidats C1.
- Les conditions de sortie de [[D-093]] constatées ou non, honnêtement :
  (a) au moins une réponse patient réelle sur un objectif, (b) le bilan sur
  le comportement du classement. **L'absence de constat n'est pas un feu
  vert** (`DC-24`) : si la fenêtre (2026-10-04) se ferme sans les deux
  conditions, le périmètre D-093 se referme et le bilan le dit.
- Si le matériau le justifie : la **proposition de signature du classement**
  (extension du périmètre haché de `priorityRulesV1` au classement, ou table
  dédiée) est rédigée pour arbitrage du praticien — ce lot **prépare la
  signature, il ne signe rien** (`DC-19` : la provenance précède la règle).
- La constitution clinique et `CAMPAGNE.md` mis à l'état atteint ; handoff
  et fragments de clôture posés **avant** la PR de clôture.

## Périmètre

- Ce dossier de campagne (bilan, statuts de lots).
- `docs/DECISIONS.md` : décision de clôture de campagne, et — si le
  praticien l'arbitre — la décision qui lève ou reconduit [[D-093]].
- `docs/claude/handoffs/`, `changelog.d/`.
- Lecture de production par conteneur one-off (identifiants seuls, jamais de
  nom dans les commandes) pour les constats chiffrés.

## Hors périmètre

- **Signer le classement** : c'est une décision clinique du praticien, avec
  sa `D-xxx` — ce lot en prépare le dossier.
- Toute modification de `priorityRulesV1` ou des textes `LIMITATION_*`.
- La généralisation d'un drapeau en production (geste du responsable).

## Fichiers probables

- `docs/claude/campagnes/2026-08-23-alliance-objectif-trois-voix/BILAN.md`
- `docs/DECISIONS.md`, `changelog.d/`, `docs/claude/handoffs/`

## Interdits

- Aucun agrégat qui noterait la parole des patients : le bilan compte des
  événements techniques (propositions, reprises, écarts), jamais la qualité
  d'une parole.
- Aucune identité réelle : constats par identifiants.
- Pas de clôture sans les trois preuves quand une règle est touchée
  (décision, banc qui mord, statut basculé — patron doctrine-executable).

## Étapes

- [x] Constats de production par conteneur (volumes d'événements par table,
      zéro identité) — **neuf tables à zéro**, 21 dossiers, 15 consultations
      validées, **zéro `T0` confirmé**, `WN_OBJECTIF_PROPOSE` absent.
- [x] Rédiger le bilan — `BILAN.md`. Les sections « reprises / amendements /
      écarts » et « comportement du classement » sont **vides pour une raison
      structurelle**, et le bilan le dit plutôt que de les combler.
- [x] Dossier de signature du classement : **NON préparé, et motivé** — signer
      un classement certifie la provenance d'un ORDRE ; zéro présentation, donc
      rien à certifier. Le rédiger supposerait le comportement qu'il devait
      documenter (`DC-19`).
- [x] Décision `D-112` ; statuts de lots et `CAMPAGNE.md` à l'état atteint ;
      handoff + fragments **avant** la PR.
- [ ] **La campagne n'est PAS déclarée close par ce lot** : passe Codex du
      LOT-05 (P0) et contre-revue adverse de campagne restent à jouer — la
      contre-revue **avant** la clôture.

## Tests

Documentaire : chaque affirmation du bilan est adossée à un constat
(conteneur, PR, ou document) — aucune conclusion sans sa preuve.

## Critères de done

- Bilan écrit et versionné ; sort de [[D-093]] constaté dans un sens ou dans
  l'autre ; dossier de signature prêt si le matériau existe ; campagne à
  l'état atteint.

## Résultats

*Bilan rendu le 2026-08-26 (`D-112`). Le lot reste ouvert : la campagne n'est
pas close.*

**Le lot a trouvé l'inverse de ce qu'il cherchait, et c'est son résultat.** Il
devait transformer l'usage réel en provenance. Il a constaté qu'**il n'y a aucun
usage** : les neuf tables de la campagne portent zéro ligne, trois jours après
`D-093`. L'appareil est complet, déployé, appliqué — et n'a jamais servi.

**Ce constat rend la condition (b) de `D-093` non pas « non atteinte » mais NON
PRODUCTIBLE.** Un bilan sur le comportement du classement suppose un
comportement. Le moteur de proposition est éteint (`WN_OBJECTIF_PROPOSE`
absent), aucun candidat n'a été présenté par les surfaces de la campagne. La
distinction compte : « pas encore constaté » invite à attendre, « impossible à
produire en l'état » désigne un geste manquant.

**Le refus de préparer le dossier de signature est la décision la plus
importante du lot.** La fiche l'autorisait « si le matériau le justifie ». Il
n'existe pas. Rédiger quand même aurait produit un document qui **suppose** un
comportement au lieu de le documenter — c'est-à-dire exactement la fabrication
de provenance que la campagne entière s'interdit (`DC-19`).

**Un fait dépasse la campagne** : **zéro épisode `T0` confirmé** sur 21 dossiers
et 15 consultations validées. Aucun cycle n'est ancré en production. Ni la
trajectoire, ni le momentum, ni les jalons du LOT-05 n'ont de point de départ —
et aucun ne peut en avoir tant que ce geste n'est pas posé.

**Dette de lecture nommée** : `scalingo env-get` rend `An error occurred:` aussi
bien pour une variable absente que pour un incident d'API. Les deux sont
indiscernables, et c'est ce qui a fait accuser à tort le drapeau
`WN_MIGRATIONS_PAR_RELEASE_DB` au premier run `release-db` du LOT-05.
