# Handoff — 2026-08-16 — Reliquats de la revue clinique soldés, dettes bornées

- **État** : lot des findings `M1`-`M4`/`F1`-`F4` implémenté (agent opus),
  relu par `wn-reviewer` (GO, réserve M-A corrigée, trois bancs prescrits
  ajoutés), T3 joué — étapes exigées vertes, un rouge WebKit classé `D-049`.
  PR en cours à la rédaction de ce fragment.
- **Contexte amont** : quatrième volet de la journée après `D-064` (drapeau
  contradictions posé en production), le garde documentaire (#692), `D-065`
  (frein structurel, #693) et `E2` (#694).

## Dettes bornées par la relecture — à reprendre, aucune urgente

1. **Contrat d'appelant de `deriverStatutsBiologie` (M-B).** Depuis `M4`, la
   fonction exige la table signée VERBATIM (ordre du tableau et des clés
   compris) : un premier appelant de production qui filtrerait
   (`statut === 'publiee'`), trierait ou reconstruirait les règles depuis la
   base fermerait le verrou en permanence sous un motif trompeur. Fail-closed,
   donc sans danger patient, mais **à border avant le premier appelant** : soit
   documenter le contrat dans le type, soit hacher la table canonique importée
   plutôt que l'argument. La concordance de sérialisation est désormais tenue
   par un banc (`statuts.test.ts`).
2. **`evaluerAbstention` exportée sans garde banc (L-A).** Un appelant peut
   obtenir un verdict aux textes signés sans passer par
   `reglesPrioritesValidees()`, donc hors verrou. Zéro appelant hors banc
   aujourd'hui. Options relevées par la revue : garde type `assertBanc`, ou
   banc-sentinelle épinglant la liste des importeurs (ne pollue pas le
   moteur).
3. **Copie non gelée d'`ETAT_LIVRE` dans `chaineC1.test.ts` (L-C)** — le
   raisonnement de F3 s'y applique mot pour mot ; et l'import dynamique de la
   fixture en milieu de fichier (L-D) n'est sûr que parce que l'`afterEach`
   restaure avant.
4. **`DATE_SIGNATURE_SIMULEE` de `priorityRulesV1.test.ts`** reste à
   `2026-08-12` — sans effet (aucune empreinte n'en dépend), non alignée.
5. **Message d'erreur de `motifRequis` interpolé vers le praticien**
   (`verifierChaineC1.ts:154`) : le refus motivé contient « le moteur et la
   procédure signée ont divergé ». Assumé dans ce lot ; à neutraliser si le
   ton doit rester strictement clinique.

## Constats documentés, pas codés

- **M5** : `PRIORITY_RULES_SHA256` entre dans `inputHash` des cartes de
  décision ; deux changements de SHA en 24 h (D-061 puis D-062) ont ouvert une
  fenêtre où toute carte préparée avant déploiement et soumise après part en
  409 `chaine_c1_divergente`. Pas de casse rétroactive. À savoir pour chaque
  future re-signature : la fenêtre se rouvre à chaque changement de SHA.
- **F5** : `ORIENTATION_METADATA.dateValidation` (`'2026-08-06'`) n'est pas
  ISO canonique et `tableSignee()` ne contrôle pas la forme. La rendre
  canonique toucherait une métadonnée signée ET son verrou en production —
  geste praticien, jamais d'initiative assistant.

## Reprises praticien inchangées (mémoire de session)

Re-signature des priorités (périmètre agrandi par `D-062`, date du
`2026-08-15` posée sur l'ancien — la sentinelle de date ajoutée ici rougira au
moment du geste et désignera les deux copies à aligner), signature biologie à
compléter (littéral figé, instruction corrigée par #694), extension de
`shaPerimetre` aux quatre autres tables, lot disjonction `D-060`.
