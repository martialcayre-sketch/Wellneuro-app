### Plan et registre : trois arbitrages de la séquence « Quatre files en parallèle » (D-374 ; H85, H88, H89 ; 2026-10-26)

- Retenue clinique du déployeur : le responsable confirme qu'un commit
  clinique non approuvé retient aussi le code mergé au-dessus de lui
  ([[D-374]] §1, fiche H85). La restreindre aux migrations laisserait partir
  ce commit dès le merge suivant. Exposition : sept runs déclenchés par le
  seul chemin clinique du 16 au 26 octobre, environ dix-huit minutes par
  jour.
- `release-db.yml` : un run approuvé déploie une tête plus récente dès
  qu'elle n'apporte pas de migration nouvelle, sans regarder le chemin
  clinique. La comparaison couvrira aussi `web/src/lib/clinical/**`, au lot
  de la sonde (fiche H88), en défense derrière le gel ; arbitrage écrit au
  statut de [[D-374]].
- Liste commune de questions de l'intégrateur : une collection
  « questions » de la page privée de suivi de la file D (fiche H89, part d).
- Arbitrages pris sur un contre-avis Codex, vérifié dans le code et sur les
  runs. Documentation seule ; aucune décision nouvelle.
