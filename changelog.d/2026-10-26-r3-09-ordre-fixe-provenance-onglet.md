### r3_09 : les 12 besoins en ordre fixe, B1 à B12 groupé par strate ; la provenance de l'onglet (Q1, 2026-10-26)

- Q1 de l'audit des instruments (arbitrage du 2026-10-22, détaché de J3-12b
  le 2026-10-25) : le tableau du tiroir « Les 12 besoins » et celui de
  l'onglet « Les 12 besoins » rangent les besoins de B1 à B12, sous une ligne
  d'en-tête par strate (« Corps », « Ancrage », « Esprit », les noms des
  anneaux des cercles) ; la colonne Besoin porte la clé « Bn · libellé », et
  les replis « Motif », « Source » et « Écart avec la décision » la reprennent
  dans leur nom accessible. Textes relus et validés par le responsable avant
  le code.
- Le tri « creux d'abord » de la route `api/praticien/equilibre` est retiré :
  un rang qui juge un chiffre exige un seuil signé ([[D-333]] §2 règle 4), et
  le sous-titre du tiroir (« Aucune priorité clinique n’est déduite ici »)
  devient vrai. L'écran ne croit pas l'ordre reçu (`lib/praticien/
  ordreBesoins.ts`, module pur) : pendant le déploiement, un ancien conteneur
  sert encore le tri. Les cercles étaient déjà en ordre fixe (r3_08) :
  inchangés.
- Provenance de l'onglet ([[D-333]] §2 règle 1 ; P1 de CodeRabbit sur #1674,
  routé ici) : la route `api/praticien/besoins` sert `provenance` par besoin,
  établie par la même règle que le tiroir (`provenanceDesSources`, extraite
  de la route d'équilibre, comportement inchangé). Chaque valeur de l'onglet
  ouvre sa source d'un geste ; sans provenance établie, « Source non
  enregistrée », sans chiffre ; en mode consultation, ni chiffre ni source,
  comme au tiroir.
- Radar de l'onglet : une valeur sans provenance établie n'est pas tracée, et
  son axe porte « source non enregistrée » (jamais « non mesuré », qui serait
  faux) ; un repli « Source » sous la figure liste les questionnaires des
  valeurs tracées, une fois chacun, et la version du calcul (deux versions
  seraient dites toutes deux, jamais résumées).
- Rien d'autre : aucun calcul, aucune valeur, aucune version
  (`VERSION_SCORE_EQUILIBRE` inchangée), aucune migration, aucun drapeau,
  portail inchangé, aucune décision nouvelle (Q1 tranchée le 2026-10-22,
  M-2 signée).
