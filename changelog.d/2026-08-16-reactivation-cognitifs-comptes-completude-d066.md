### Modifié

- **Cinq instruments cognitifs sont réactivés** (`D-066`, déclaration du
  praticien-propriétaire que l'usage est couvert — patron EORTC) : `Q_GEO_03`
  (AQ), `Q_GEO_04` (MMSE), `Q_GEO_05` (QDRS), `Q_GEO_06` (5 mots) et `Q_NEU_06`
  (MMT) redeviennent assignables. Les réserves de droits **restent au
  registre** (« © PAR » pour le MMSE, identité IEDM pour le MMT) — la
  déclaration lève la suspension, jamais la réserve. Ces instruments demeurent
  **de consultation** : leur assignation est un geste praticien, jamais un
  envoi de routine, et le bandeau « à faire passer en consultation » reste
  affiché. Motif : ils sont les déclencheurs des panels mémoire et
  neurodégénératif du catalogue biologie niveau 1 — suspendus, aucune passation
  ne pouvait naître et les deux panels étaient inertes. Les sentinelles qui
  épinglaient la fermeture sont inversées, jamais supprimées : la prochaine
  ligne de `PASSATION_PRATICIEN` reste fermée tant qu'aucune décision ne la
  nomme, et le risque de mesure du MMT (auto-correction en remontant la page)
  reste tracé dans son banc.

- **Les moteurs `had`, `sum_two_phases` et `francis` publient leurs comptes de
  complétude** (`missing`/`repondus` — par axe pour le HAD, à la racine pour le
  test des 5 mots et l'IBS-SSS), extension de la campagne du 2026-08-04. Sans
  eux, aucune branche de disjonction (`D-060`) ne pouvait viser ces
  instruments : la branche restait inerte à vie, en silence. Aucun score, aucun
  seuil, aucune bande ne change. Effet assumé : sur un recueil partiel, la
  garde générale de complétude annule désormais la mesure de ces porteurs, là
  où elle ne lisait rien — le comportement que les autres moteurs ont déjà.

- **La consigne de synthèse passe en v26** : `missing` rejoint `items` et
  `repondus` dans la phrase qui sépare les comptes de questions des points de
  score — le champ arrive au modèle sous `subScores`, la garde de couplage
  consigne/charge exige qu'il soit décrit avant d'être livré.

- `listeBibliotheque()` fusionne les deux sources d'entrées : un instrument
  peut être de passation praticien **et** assignable — sans la jointure, les
  cinq réactivés sortaient en double au sélecteur d'assignation.

- **L'invariant « geste praticien, jamais envoi de routine » devient
  structurel** (revue de la première implémentation — elle le confiait à la
  vigilance d'écran) : les **packs refusent** tout instrument de consultation
  (409 dédié, POST et PATCH, et l'assignation du pack de base à l'onboarding
  l'écarte en ceinture) ; le **sélecteur d'assignation** marque « passation en
  consultation » ; le **portail patient** affiche au patient « se remplit en
  consultation, avec votre praticien » ; l'AQ et le QDRS reçoivent
  `administrationMode: 'clinicien'` qui leur manquait (informant-based —
  auto-remplis, ils répondraient à la place du proche, `DC-14`/`DC-28`) ; et le
  bandeau de la bibliothèque cesse d'affirmer « jamais envoyé au portail » à
  côté d'un bouton d'envoi actif.

- **L'alerte Alzheimer du test des 5 mots exige un rappel différé complet** :
  deux items sur cinq cotés 0 rendaient « évocateur de maladie d'Alzheimer »
  sur un test aux trois cinquièmes non administré. Un rappel amputé ne peut
  qu'abaisser le total — c'est le biais même qui fabriquait l'alerte. `null`
  (« non mesuré »), jamais un verdict, tant que la phase n'est pas complète.
