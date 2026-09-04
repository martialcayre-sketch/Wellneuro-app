### Squelette du barème d'agenda alimentaire, sans aucun seuil chiffré (LOT-02)

Le scorer `agenda_alimentaire` gagne sa **structure**, sur le gabarit exact du
jumeau sommeil (`agenda_sommeil`) : refus sous couverture minimale avec motif,
plancher **par axe** (axe non couvert = `null` renormalisé, **jamais 0**),
moyenne pondérée renormalisée sur les seuls axes couverts, et drapeaux cliniques
qui **alertent sans coter**.

**Aucun seuil clinique n'est câblé.** Les axes, leurs bornes, leurs poids, le
plancher de couverture et les drapeaux sont la **décision clinique gatée** de
LOT-02 — « axes, poids, bornes, après observation de la distribution réelle »,
derrière la porte des 21 jours. Ils vivent dans la config de scoring
(`sc.axes`, `sc.drapeaux`, `sc.minJours`…), **vide** tant que la calibration n'a
pas eu lieu : sans axe déclaré, le scorer **refuse de coter** (« barème non
calibré »). Le lot ne fabrique ni borne, ni axe, ni poids — la relecture de
production du 2026-08-10 confirme qu'aucune distribution réelle n'existe encore
à observer (recueil arrêté au premier jour).

**Zéro changement de comportement en production.** `Q_ALI_09` reste
`type:'journal'` — le nouveau type n'est branché sur aucun instrument. La
plomberie et ses invariants sont éprouvés sur définitions **forgées**
(`agendaAlimentaireBareme.test.ts`) ; le lot de calibration ne fera qu'ajouter
la config, basculer `Q_ALI_09` à la clôture, et — si du code en dépend — le
faire voyager dans une migration séparée.
