### Synthèse praticien : la génération et la rédaction refusent un dossier fermé (t63, 2026-11-08)

Symétrie de #1873, côté praticien (arbitrage d61 du responsable du 2026-11-06, question
`20261105-0938-d`). Aucune règle clinique, aucune migration, aucune synthèse existante modifiée.

- `api/praticien/synthese` : `POST` (génération IA) et `PUT` (brouillon rédigé) refusent en 409, après
  le contrôle d'appartenance et avant l'appel au modèle comme avant toute écriture, sur les deux
  transports.
- Dossier clos (`dossier_cloture`), texte validé mot pour mot : « Le suivi de ce dossier est clôturé :
  aucune synthèse ne peut être générée ni rédigée. Rouvrez le suivi pour reprendre. »
- Dossier désactivé non clos (`dossier_desactive`), extension arbitrée le 2026-11-08, avec le message
  existant : « Ce dossier est désactivé : rien de nouveau ne peut y être enregistré. Réactivez le
  dossier pour reprendre. »
- `PATCH` reste ouvert sur ses cinq actions, arbitrage du 2026-11-08, y compris vider puis réécrire une
  synthèse jamais remise : aucune ligne n'est créée, et le livret comme l'impression refusent la remise
  d'un dossier clos ou désactivé. Le banc structurel de la garde de clôture classe chaque méthode de la
  route, avec ce motif.
- Limite connue : une clôture ou une désactivation survenue après le contrôle, pendant une génération ou
  juste avant la création d'un brouillon, n'empêche pas l'écriture de cette ligne.
