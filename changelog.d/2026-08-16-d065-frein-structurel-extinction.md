### D-065 — le frein de `D-053` §5 devient structurel : pas d'extinction sans contradictions actives (2026-08-16)

`D-064` avait fermé la fenêtre par l'environnement ; la configuration piège
restait constructible — retirer le drapeau des contradictions, ou l'oublier
dans un nouvel environnement, réarmait silencieusement l'extinction sans
frein. Arbitrage praticien explicite : le frein entre dans le code.

- **`tableArretExploitable()`** (`orientationService.ts`) : les règles d'arrêt
  n'atteignent le moteur que si la table est signée ET
  `contradictionsActives()`. « Aucun constat » et « système de constats
  éteint » cessent d'être indiscernables (`DC-24`) ; une discordance déclarée
  ne peut plus être supprimée sans que le système capable de la constater
  tourne (`DC-30`). Les DEUX effets (extinction, exclusion déjà-répondu) et le
  tampon d'audit `arret` suivent le même prédicat — les scinder recréerait
  l'asymétrie de verrous payée par `D-064`.
- **Le banc qui gravait le piège est inversé.** « Système de contradictions
  éteint : le même dossier éteint — hiérarchie des verrous » affirmait le
  comportement exact qui a tourné trois jours en production. La dette de banc
  de `D-064` est soldée : « arrêt signé + contradictions inactives ⇒ rien ne
  s'éteint » est éprouvé sous ses deux visages (drapeau absent ; table non
  signée), plus le couplage de l'exclusion.
- **Playwright s'aligne sur la production** : `webServer.env` arme désormais
  `WN_ENABLE_CONTRADICTIONS_NNPP2=1`, comme il armait déjà l'orientation —
  même doctrine, l'état réel plutôt que la simulation.
- `docs/FEATURE_FLAGS.md` : le paragraphe des règles d'arrêt dit le nouveau
  couplage — elles n'ont toujours pas de drapeau à elles, elles héritent de
  celui des contradictions.

Aucun changement observable en production, où signature et drapeau sont tous
deux en place : c'est la configuration piège qui devient impossible, pas le
comportement courant qui change.
