### Plan unique WellNeuro 6.0, PR 5 : la file d'attente est supprimée, le plan est la seule adresse de routage (D-285 §7, 2026-10-14)

- **Documentation seule, aucun code** : la production ne change pas ; aucune
  migration, aucun drapeau, aucune règle clinique.
- `docs/claude/campagnes/FILE_ATTENTE.md` (629 lignes, hiérarchie du
  2026-08-21) est supprimé : ses dettes vivantes sont au plan §8 depuis la
  PR 1, ses campagnes et ses gels au §6 et au §9 ; le texte reste lisible dans
  l'historique Git. Aucun script, crochet ni lien Markdown ne le lisait.
- Les deux adresses de routage d'un commentaire de revue
  (`.claude/rules/pr-revue-et-release-db.md`, `.claude/skills/wn-merge/SKILL.md`)
  sont réécrites : « routé » veut dire « vers le plan unique
  `docs/claude/PLAN_WELLNEURO.md`, avec son adresse » ; la dette nommée de
  `docs/ROADMAP_TECHNIQUE.md` cesse d'être une adresse (son historique est
  archivé depuis la PR 4).
- Trois dettes vivantes que la file portait seule (`patientLimitations` servi
  vide, constat de la proposition de bilan sur dossier réel, identifiant brut
  de la priorité dans la minute d'après) sont ajoutées au plan §8 en lignes
  datées ; le plan privé qui génère le fichier doit les absorber (revue
  Copilot #1422, puis vérification des seize entrées non citées par le plan).
- Les mentions de la file dans les handoffs, fragments, fiches de campagnes,
  le registre et `.wn/state.json` restent comme traces datées (plan §11).
