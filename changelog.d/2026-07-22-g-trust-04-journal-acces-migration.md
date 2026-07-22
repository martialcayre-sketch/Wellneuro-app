### Sécurité

- **Journal des accès praticien — table seule** (G-TRUST-04, exigence 5) :
  nouvelle table `journal_acces_dossiers` (« qui a lu quel dossier, quand »,
  versant praticien), additive, RLS deny-all, sans FK ; effacée nommément par
  `effacerDossier` (garde structurelle testée). Rien n'y écrit encore :
  l'écriture arrive par une PR ultérieure. Rétention 12 mois glissants
  (décision GD-2), constante applicative.
