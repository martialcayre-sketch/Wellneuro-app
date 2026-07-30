### Corrigé

- **Le panneau praticien affirmait une observation qui n'existait pas.** Le bloc
  « Bilan de calibrage restitué » servait trois phrases **écrites en dur** —
  « Structure observée : 3 prises principales, variabilité surtout le soir »,
  « Charge supportable déclarée : 3 traces par semaine », « Marqueurs saillants :
  petit-déjeuner sauté, dîner tardif, collation de fatigue » — **identiques pour
  tout patient**, qu'il ait transmis vingt journées ou aucune.

  C'est la même espèce que la quantité fabriquée retirée le 2026-07-27 (#408),
  à ceci près que celle-ci s'adressait au praticien au moment où il décide. Le
  bloc ne rend plus que ce que le patient a effectivement décrit ; sans journée
  transmise, il écrit « Aucune journée décrite à ce jour » et s'arrête là.

- **Un bouton disait « Valider la revue locale » et ne validait rien.** Il
  produisait un résumé d'état local, sans appeler aucune route ; la décision
  n'était transmise qu'au clic sur « Activer la décision », séparément. Il
  s'appelle désormais **« Préparer la décision »**, et son résumé le dit :
  « Préparée, non transmise ». Aucune route n'a été ajoutée — le geste
  n'écrivait rien, il cesse simplement de prétendre le contraire.

### Ajouté

- **Le praticien lit ce que le patient a transmis**, et non plus seulement des
  compteurs (arbitrage du 2026-07-30). Chaque transmission de la liste s'ouvre
  et rend son contenu : les journées repères en tableau (date, type, prises,
  moments), les traces avec leur issue, leur friction et **leur mot libre**, les
  pauses déclarées et les solutions.

  Ces textes sont en base depuis le lot 2 (#429) : ce lot n'écrit aucune donnée
  nouvelle, il ouvre une surface de lecture. À noter tant que l'hébergement
  n'est pas HDS — dérogation courant jusqu'au 2026-10-21.

  Le contenu n'est chargé qu'à l'ouverture. `listJaObservationSnapshots` rend
  jusqu'à cinquante lignes ; y joindre les payloads ferait payer à chaque
  ouverture de fiche un contenu que le praticien n'a pas demandé.

- **La troncature est dite.** La liste des transmissions est plafonnée à dix.
  Une fenêtre saturée l'annonce désormais — « Les 10 transmissions les plus
  récentes. Il peut en exister d'autres, plus anciennes. » Sans cette phrase,
  une liste pleine se lit comme une liste complète (précédent #449).

### Gardes

- `readJaObservationSnapshot` filtre sur `idPatient` **autant que** sur
  `draftId` : un identifiant seul laisserait lire l'instantané d'un autre
  patient à qui saurait le deviner. Absent ou hors périmètre ⇒ **404**, jamais
  un 200 vide — « introuvable » et « ce patient n'a rien écrit » ne se lisent
  pas de la même façon en consultation.
- Les éléments illisibles d'une liste sont **écartés** plutôt que de faire
  échouer la lecture entière : une ligne écrite par un client antérieur ne doit
  pas rendre muette une transmission par ailleurs lisible. Le décompte reste
  celui du payload, donc l'écart se voit.

### Tests

Le test qui compte est une assertion **négative** : le bloc de calibrage ne doit
pas contenir « Structure observée » tant qu'aucune journée n'est ouverte. Sans
elle, réintroduire la phrase passerait au vert — c'est vérifié par mutation.
S'y ajoutent le cloisonnement par patient (404 sur un `draftId` étranger, 403
avant toute lecture hors périmètre), la restitution du mot libre, et les deux
états de la troncature.

### Ce que ce lot ne fait pas

Pas de `DietaryObservationProfile` — l'arbitrage « six domaines ou seulement ce
que les journées portent » reste ouvert. Pas de marqueurs vedettes cochés par le
praticien (arbitré le 2026-07-30, lot ultérieur). Pas de clôture d'épisode.
Aucune migration, aucun changement de `BESOIN_SOURCES`, aucun bump de
`VERSION_SCORE_EQUILIBRE`.
