# Brainstorm — Certification questionnaires, consolidation 62/64

## Intention métier

- Réunir sur une branche unique l'état réel du développement et de la
  certification des questionnaires.
- Distinguer les apports déjà intégrés à `main`, les surcouches documentaires à
  relire et les branches devenues obsolètes.

## État de départ

- Le registre canonique compte 64 questionnaires.
- Le dossier de montée en certification couvre 62 entrées sur 64.
- `Q_PED_02` et `Q_PED_03` sont les deux exceptions documentées.
- Trente-six branches non mergées touchent le développement, le scoring, le
  banc ou la certification des questionnaires selon le prédicat de LOT-00.

## Contraintes

- Aucune modification de scoring ou de logique clinique sans demande explicite.
- Aucune migration ni écriture Supabase.
- Aucun cherry-pick global d'une branche historique.
- Aucune suppression de branche sans confirmation distincte.
- La source de vérité reste `origin/main`.

## Questions ouvertes

- Les 21 branches divergentes contiennent-elles encore un apport absent de
  `main`, ou seulement une forme antérieure d'un changement déjà intégré ?
- Les outils de banc historiques doivent-ils être conservés comme infrastructure
  générique ou archivés ?
