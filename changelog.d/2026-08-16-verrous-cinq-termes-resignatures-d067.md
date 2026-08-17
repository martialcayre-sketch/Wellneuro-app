### Modifié

- **Les quatre tables cliniques signées passent au verrou à cinq termes**
  (`D-067`, patron du verrou biologie `D-063`) : booléen, date, forme ISO
  canonique, claims, et concordance d'un `shaPerimetre` littéral avec le SHA
  recalculé du contenu. La **péremption devient détectable** : une règle
  retouchée après signature ferme son verrou seule, au lieu d'entrer sous une
  signature acquise. Sur la table d'arrêt, c'est le terme qui compte le plus —
  une règle d'extinction retouchée aurait éteint des recommandations sous une
  signature qui ne l'a jamais couverte.

- **La table des priorités est re-signée au 2026-08-16** (arbitrage praticien
  explicite) sur le périmètre agrandi par `D-062` — procédure d'abstention
  comprise. La dette de re-signature est soldée. Conséquence connue (constat
  M5) : `validatedAt` change, la fenêtre 409 `chaine_c1_divergente` se rouvre
  pour toute carte de décision préparée avant le déploiement et soumise après.

- **La date de signature d'orientation est portée à l'ISO canonique**
  (`2026-08-06` → `2026-08-06T00:00:00.000Z`, réserve F5) : le jour attesté ne
  change pas, seule la forme rejoint le standard que le verrou contrôle
  désormais.

- Les sentinelles ont fait leur travail : le banc de dates de la revue M/F a
  rougi à la re-signature et désigné les deux copies à aligner ; la date
  simulée désalignée de `priorityRulesV1.test.ts` est alignée (dette n° 4 du
  handoff du 2026-08-16) ; `FEATURE_FLAGS.md` suit, tenu par son garde.

- Aucun contenu de règle ne change : les SHA de contenu des quatre tables sont
  identiques avant/après — seules les métadonnées de signature et les
  fonctions de validation bougent.
