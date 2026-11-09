### Organisation : une séance de questions par jour, non bloquante (D-466, 2026-11-09)

- `docs/decisions/D-466.md` amende la consigne « La liste commune de questions
  et le guichet » (arbitrage du responsable du 2026-11-09, « Oui, non
  bloquante ») : le guichet prépare une séance par jour, d'au plus huit
  questions, avant la journée en autonomie. L'heure n'est pas fixée.
- Non bloquante : un lot dont une question reste sans réponse est mis de
  côté (handoff, `/clear`, pas d'autre lot ouvert par sa session en
  attendant) ; les lots des autres sessions avancent.
- `docs/ROLES_MACHINES.md` : la puce « Le guichet » passe à une séance par
  jour, toujours sans heure fixe ; la puce « Une session qui attend » nomme
  D-466. Texte seul ; ni code, ni migration.
