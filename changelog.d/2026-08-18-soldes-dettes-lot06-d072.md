### LOT-06 — les dettes nommées sont soldées (D-072)

- **Deux replis fail-open SUPPRIMÉS du moteur de statuts biologie**, pas rendus
  inatteignables : une date de bilan illisible comme une date postérieure à la
  référence concluaient `deja_documente` — donc RETIRAIENT le panel des
  propositions. Une donnée aberrante produisait la conclusion rassurante
  (`DC-24`, `DC-25`). La fermeture vit désormais dans le moteur, pour tout
  appelant présent ou futur, et la garde jumelle du service est retirée : une
  règle clinique écrite deux fois est une règle qu'on peut oublier de corriger
  dans l'une des deux.
- **Une déclaration écartée n'est jamais silencieuse** : la ligne du panel porte
  son motif (`DC-30`). Une date de référence illisible écarte *toutes* les
  déclarations — ne pouvant juger aucune ancienneté, le moteur ne conclut sur
  aucune.
- **Les rapports calculés entrent dans la composition** des panels. Ils étaient
  écartés : la composition affichée était amputée de ce que le bilan contient.
  Exposés à part — ce sont des calculs sur des analytes, sans remboursement
  propre ni validation médicale.
- **La matrice de consommation cesse de compter les imports de TYPE.** Un
  `import type` est effacé à la compilation : aucun code ne s'exécute, aucune
  donnée ne transite. Les jetons d'une source incluant le chemin de son module
  et la correspondance étant textuelle, un simple `import type { Remboursement }`
  faisait passer la bibliothèque NABM (987 actes) de « dormante » à
  « consommée » sans qu'un seul remboursement soit dérivé. **Le correctif porte
  au-delà du cas signalé, délibérément** : c'est la même erreur corrigée
  partout — 6 sources dormantes au lieu de 5, et plusieurs lignes perdent des
  surfaces qui n'étaient atteintes que par un type.
- **Le cockpit est remonté au changement de dossier** (`key={idPatient}`) : en
  App Router, un changement de segment peut réconcilier un composant client sans
  le démonter, et l'état clinique du patient précédent restait affiché tant que
  les GET du nouveau dossier n'avaient pas répondu.
- **Une consignation réussie le dit** — un geste muet ne prouve rien au
  praticien, et la ligne ne change pas toujours de statut.
- **Correction d'état** : « les tables NABM sont vides » est imprécis.
  `biology_nabm_actes` porte **987 actes** ; c'est `biology_analyte_nabm`
  — l'appariement analyte ↔ acte, manuel et signé — qui est vide. La conclusion
  (ne pas construire de carte de remboursement) ne change pas ; sa raison, si.
- **Le courrier médecin nomme les rapports calculés** : l'amputation de
  composition survivait sur le seul artefact qui quitte le cabinet.
- **Le moteur adopte la même tolérance de fuseau que la route** : sans elle, une
  déclaration du jour saisie la nuit à Paris était acceptée par la route puis
  systématiquement écartée par le moteur — le praticien lisait « traité comme
  non exploré » sur ce qu'il venait de consigner. Deux bornes qui ne s'accordent
  pas ne gardent rien.
- **Le motif distingue la cause** : une date de déclaration illisible et une
  date de RÉFÉRENCE illisible ne se disent plus pareil — accuser la mauvaise
  donnée est un défaut de `DC-34`.
- **L'en-tête de la table signée revient à l'état réel** : il affirmait encore
  que `deriverStatutsBiologie` n'a aucun appelant. Le SHA du périmètre n'est pas
  touché (il porte sur les règles, pas sur les commentaires).
