---
id: "LOT-06"
titre: "Bilan et gate de consolidation — fabriquer la provenance, fermer D-093"
statut: "à_faire"
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

- [ ] Constats de production par conteneur (volumes d'événements par table,
      zéro identité).
- [ ] Rédiger le bilan (reprises/amendements/écarts, comportement du
      classement, conditions D-093).
- [ ] Si justifié : préparer le dossier de signature du classement pour
      arbitrage.
- [ ] Décision de clôture ; statuts de lots et CAMPAGNE.md à l'état
      atteint ; handoff + fragments **avant** la PR.

## Tests

Documentaire : chaque affirmation du bilan est adossée à un constat
(conteneur, PR, ou document) — aucune conclusion sans sa preuve.

## Critères de done

- Bilan écrit et versionné ; sort de [[D-093]] constaté dans un sens ou dans
  l'autre ; dossier de signature prêt si le matériau existe ; campagne à
  l'état atteint.

## Résultats

À compléter à la clôture.
