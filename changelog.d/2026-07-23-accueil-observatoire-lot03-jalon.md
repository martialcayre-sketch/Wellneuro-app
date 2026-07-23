### Accueil Observatoire LOT-03 — cartes jalon J21 / momentum (2026-07-23)

Le Fil du jour rappelle désormais les **momentums patients** (campagne
`2026-07-23-accueil-observatoire`, décision propriétaire 2026-07-23) :

- **Carte « Jalon J21 atteint — décision attendue »** pour les patients dont un
  check-in J21 a été soumis mais dont la décision de 21 jours n'est pas encore
  consignée. La détection lit la différence entre deux artefacts persistés
  (check-in J21 `ProtocolCheckin` moins épisode J21 `AssessmentEpisode`) — rien
  d'inventé, aucune décision « Continuer » supposée.
- Le « pourquoi maintenant » cite la date du check-in J21, l'action principale
  observée quand le check-in est lisible, et le **momentum** (T0 → dernier jalon
  mesuré) quand il existe réellement — jamais un 0 quand la re-mesure d'équilibre
  n'a pas eu lieu.
- La carte s'intercale entre les relectures et les retards, reste refusable
  (ancrée sur le check-in J21 le plus récent), et le résumé du panneau compte
  « N jalon(s) ».

Lecture seule, sans migration ; l'enrichissement momentum est borné aux
patients concernés (pas de requête par patient).
