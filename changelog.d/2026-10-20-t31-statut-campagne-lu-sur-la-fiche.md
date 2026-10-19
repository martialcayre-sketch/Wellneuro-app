### Outillage : la vue des campagnes actives lit le statut de la fiche (t31)

- `ACTIVE_CAMPAIGN.md` n'écrit plus « active » en dur pour la campagne
  primaire : elle reprend le premier mot du `statut:` de sa fiche
  (`en_pause`, `en_cours`…), « inconnu » sans fiche lisible. Une campagne
  parallèle garde le statut de `.wn/state.json` quand il en porte un. Vue
  régénérée : la campagne primaire y passe à `en_pause`.
