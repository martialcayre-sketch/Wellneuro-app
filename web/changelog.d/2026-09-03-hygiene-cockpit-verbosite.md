## 2026-09-03 — chore(cockpit) : cinq dettes de lisibilité soldées (lot Hygiène)

Suites de l'audit du 2026-09-02, sans changement de comportement clinique :

- **« Résumé du score »** remplace « Synthèse » sur la ligne dérivée des scores
  d'une passation (`FichePatientPanel`). La Synthèse est un document distinct
  du dossier ; le même mot pour les deux faisait lire cette ligne comme un
  extrait de ce document.
- **La phrase « ce n'est pas une parole du patient » se dit une fois**, sous la
  liste des fragments d'une proposition, au lieu d'être répétée sous chacun.
- **« Déjà tranchées » et « Périmées » se replient** (`<details>` natif : le
  contenu reste dans le DOM). Ce sont des archives, elles n'attendent aucun
  geste. **Sans décompte au résumé** : `D-110` interdit de compter les
  amendements sur cette surface autant que de les résumer — la garde `G2-bis` a
  refusé une première rédaction qui affichait « Déjà tranchées (3) ».
- **Le mode d'emploi du matériau d'anamnèse disparaît quand il n'y a pas de
  matériau** : expliquer comment ne pas recopier des déclarations inexistantes
  ajoutait deux lignes sous une absence déjà énoncée. L'absence, elle, reste
  dite (`DC-24`).
- **La pédagogie du bouton « ouvrir un nouveau cycle » est resserrée** — ce que
  l'ouverture ferme reste ÉCRIT au-dessus du bouton (`D-113` §8), en une phrase
  au lieu de trois.
- **« Priorité et limites »** remplace « Décision clinique » au titre de la
  carte de décision, choix du praticien. Le titre répétait celui de sa phase
  (« Décision 21 j ») entre deux voisins qui nomment leur contenu, et il tient
  désormais aussi quand la carte s'abstient : il annonce une rubrique, pas un
  résultat. La phrase d'état « Décision clinique non préparée » ne change pas.

Une duplication réelle disparaît au passage : le **numéro d'épisode** se
calculait par la même formule à deux endroits (le bandeau d'épisode et l'index
de la fiche-trajectoire) ; `numeroEpisodeDeCycle` la porte désormais seule
(`lib/protocol/cycles.ts`). Et `SpiraleTrajectoire` dit enfin ce qui la sépare
de `SpiraleEpisodes` — le renvoi n'existait que dans un sens.
