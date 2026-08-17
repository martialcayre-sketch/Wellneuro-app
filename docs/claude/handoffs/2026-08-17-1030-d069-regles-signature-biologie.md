# Handoff — 2026-08-17 — D-069 : la table d'indications est peuplée et réellement signée

- **État** : `feat/indications-biologie-signature` (empilée sur #700 — merger
  dans l'ordre). 4 941 tests verts ; T3 vert hors la signature WebKit `D-049`.
  `wn-reviewer` : **GO conditionnel, conditions soldées** — transcription
  vérifiée 17/17 zones contre les grilles réelles (`calculateScore`, pas le
  document), signature recalculée indépendamment.
- **Décision** : `D-069` — quinze règles (12 conditionnelles dont 6 `ou`
  D-060, 1 optionnelle, 2 non indiquées verbatim), signature à cinq termes
  (2026-08-17, **29** claims, `shaPerimetre` `a2f28c0b…`).

## Ce que la revue a imposé

- **Le 365 entre dans le périmètre signé** (finding majeur) : les claims
  `0312-018`/`0389-004` rejoignent les neuf règles à répétition → 29 claims,
  SHA recalculé, re-signature posée. Le seul chiffre paramétrique de la table
  ne vit plus en prose (`DC-19`, `DC-34`).
- **Banc zone↔grille** (« le plus important ») : couleurs citées ⊆ couleurs
  publiées ∪ inerties DÉCLARÉES (`dark` des trois reprises d'orientation) —
  une couleur non publiée serait inerte à vie sans lui.
- **RV-1 durci** : saturation exigeant `manquants === 0`, comptes exacts
  (17 instruments / 18 feuilles, plus de plancher lâche).
- **Contre-épreuves de signature** : date non canonique ×3 et claims vides
  ferment, chaque terme séparément.

## Limites NOMMÉES (sur les règles, dans D-069, au changelog)

1. **Branche IBS-SSS** : le moteur Francis compte les items écartés par ses
   questions filtres comme manquants — patient « non » à un filtre ⇒ branche
   fail-closed jamais parcourue. La jambe TFD sert le panel. Corriger =
   lot de scoring sur instrument certifié, décision distincte.
2. **Plancher sous `ou`** : les reprises PSS-10/TFD perdent le déclenchement
   par plancher garanti sur recueil partiel (D-060 §2/§6) que la feuille PSQI
   conserve — asymétrie interne à la table, assumée et documentée.
3. `0106-028`/`0106-029` (bandes hautes BMS-10) hors périmètre signé —
   `0106-027` fonde le départ, les bandes supérieures couvertes a fortiori.

## Ce qui reste au praticien — les deux derniers gestes du programme

1. **Approbation `release-db`** au merge de #700, puis vérification
   post-release (sept lectures MCP du bloc « risques » de #700 + la ligne
   `NOTICE D-068 : 2 plage(s)`).
2. **`WN_CB_ENABLED`** — le drapeau d'exploitation : signer n'allume pas.
   À l'allumage, le premier appelant réel de `deriverStatutsBiologie` devra
   respecter le contrat M-B (table canonique verbatim — bordé dans le type).
