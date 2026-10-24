### r3_11 : le compte des besoins mesurés sur l'instrument, et « Compléter la mesure » (Q6, Q8 ; D-352, 2026-10-24)

- Q6 ([[D-352]] §1) : « Calculé sur n besoins mesurés sur 12 »
  (`mentionBesoinsMesures`) en tête de l'onglet « Les 12 besoins », en tête du
  tiroir et en seconde ligne du bouton qui l'ouvre. La route
  `api/praticien/besoins` sert `besoinsMesures` et `besoinsTotal` par
  `compterBesoinsMesures(agregerEquilibre(couvertures))` ; le tiroir lit celui
  de la route `équilibre`. Aucun recompte d'écran ; ancien conteneur : rien.
- Q8 ([[D-352]] §2) : dans le motif déplié d'un besoin non mesuré, sous la
  seule ligne « aucune passation exploitable », « Compléter la mesure » liste
  les questionnaires de cette ligne (`questionnairesACompleter`), chacun avec
  le bouton d'ajout à la file d'envoi. Onglet et tiroir seulement ; les cercles
  gardent le motif sans geste. Rien n'est envoyé depuis l'écran.
- Partage avec la Trajectoire : `questionnairesProposables` (dédoublonnage et
  filtre `IDS_ASSIGNABLES`) sert la re-passation ciblée et le nouveau geste ;
  l'appel `POST /api/praticien/file-envoi`, le bouton et ses libellés vivent
  dans `patient-cockpit/AjoutFileEnvoi.tsx`, repris par `TrajectoirePanel` à
  rendu identique.
- Rien de clinique : aucune formule, table, version ni seuil ;
  `lib/equilibre` inchangé ; rien au portail ; aucune migration.
