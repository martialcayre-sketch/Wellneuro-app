### IDP2 LOT-03e — la trace des connexions Google se purge après 12 mois (2026-07-22)

Le LOT-03c-trace avait ajouté la table `portail_connexions_google` sans
mécanisme de purge, la durée de conservation restant une décision à prendre.
Fixée à **12 mois glissants** par le responsable le jour même de l'activation
du gate G5 (motif détaillé dans `ACTIVATION_RUNBOOK_G5.md`) : ce lot implémente
la purge correspondante.

- **`deleteMany` opportuniste**, à chaque tentative de connexion (succès ou
  refus) — même patron que `portail_demande_tentatives` dans
  `POST /api/portail/lien/demande`. Aucune tâche planifiée n'existe dans ce
  dépôt ; l'index `g5_google_scan_idx` sur `cree_le`, déjà posé par la
  migration du LOT-03c-trace, rend le filtre peu coûteux.
- **Purge conditionnée à un aller authentifié.** Elle ne s'exécute qu'après la
  vérification du `state` — un retour forgé n'écrit ni ne purge rien.
- **Fail-open, mais journalisé.** Une purge en échec n'empêche jamais la
  session de s'ouvrir. Elle n'est plus non plus silencieuse : un `.catch()`
  local avait été écrit puis retiré après falsification — il avalait un échec
  que le code venait pourtant de rendre alertable (`PORTAIL_GOOGLE_TRACE_ECHEC`).
  Le `try/catch` englobant de `tracer()` couvre l'écriture et la purge, et
  journalise l'une comme l'autre.

Revue adversariale : GO. Aucune migration dans ce lot.
