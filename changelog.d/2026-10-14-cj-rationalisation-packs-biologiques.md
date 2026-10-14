### D-296 : l'analyte devient l'unité canonique de la biologie, les quinze panels sont classés, plus aucun pack clinique ne se crée (lettre cj, 2026-10-14)

- **Documentation seule, aucun code** : la production ne change pas ; aucune
  migration, aucun drapeau, aucune règle d'indication ni seuil, aucun panel
  désactivé ; courrier au médecin et document patient inchangés.
- `docs/DECISIONS.md` : D-296, lettre cj du plan unique (fiche F49, rang 0,
  file A, geste du responsable, PR propre), PR 1 de l'audit des panels du
  2026-10-05. Constat par conteneur du 2026-10-14 identique à l'audit
  (15 panels actifs, 78 items sur 35 analytes, 0 correspondance NABM, 0 lien
  analyte, 0 panel documenté, 0 arbitrage, 0 action d'exploration). L'analyte
  est l'unité canonique ; les quinze panels sont classés (neuf axes cliniques
  à convertir, un gabarit optionnel à déprécier, trois indications ou
  populations à convertir, deux motifs « non indiqué » conservés) ; un panel
  converti passe inactif à la signature des indications v2 (F53), jamais
  supprimé. Le gel du 2026-10-05 devient permanent.
- `docs/architecture/bioflow/BIOFLOW_ROADMAP.md` et
  `docs/claude/PLAN_WELLNEURO.md` (§5 « Règles de BioFlow », fiche F49) :
  la règle du gel renvoie à D-296 §3.
- Ouvre, par le plan, la vue dédoublonnée par analyte (F50) et la décision
  des axes biologiques (lettre cm, F51).
