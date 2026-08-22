### Garde-fous — les fichiers cliniques s'écrivent au niveau « demande », et l'en-tête d'`orientationRulesV1` cesse de mentir (Socle LOT-02)

- **Huit fichiers cliniques au niveau « demande »** du hook d'écriture
  (`protect-wellneuro-files.mjs`) : six tables signées (`orientationRulesV1`,
  `stopRulesV1`, `priorityRulesV1`, `contradictionsV1`, `corpusSyntheseV1`,
  `indicationsBiologieV1`) et deux fichiers de constantes cliniques
  (`equilibre/constants.ts`, `questions.ts`). Jamais « refus » : autoriser
  vaut confirmation `DC-17`/`DC-18` — la décision `D-xxx` se matérialise en
  un clic, tracée dans la session. Les listes refus et demande Prisma sont
  inchangées au caractère près.
- **Le hook de fichiers a enfin un banc** (il n'en avait aucun) : 36 cas — un
  par motif de chaque liste, silences prouvés, disjonction des deux demandes
  testée dans les deux sens, verdict lu au protocole JSON, entrées hostiles.
  Ramassé par le glob CI existant.
- **Relecture adversariale intégrée** (verdict final ACCEPTER) : l'évitement
  par segments (`/./`, `//`, `..`) est refermé par `path.posix.normalize` —
  le trou était hérité et touchait déjà le niveau Prisma ; la portée
  Edit/Write est dite sans sur-promesse (hook + `hooks-garde-fous.md`), la
  couverture Bash devient un suivi nommé. Mutants vus rouges des deux côtés.
- **`D-083`** : l'en-tête d'`orientationRulesV1.ts` n'annonce plus le
  compilateur `tools/corpus/orientation/` qui n'a jamais existé — la table
  est écrite à la main, ses claims validés restent gardés par le banc de
  `D-042`. Mesuré au geste : le sha épinglé couvre les données, pas le texte —
  61/61 vert sans ré-épinglage, contrairement à ce que le cadrage annonçait.
  Première confirmation en conditions réelles du hook posé par ce même lot.
- Candidats consignés, à trancher : `stopRulesLibelles.ts`,
  `questionnaires/alimentaire.ts` (pilote `VERSION_SCORE_EQUILIBRE` sans être
  protégé), fixture `chaineC1Fixture` (mute `validationExterne` en runtime),
  et le vestige `WN_ALLOW_RISKY_COMMAND` du garde des commandes.
