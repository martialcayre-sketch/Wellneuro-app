### Base : la colonne du numéro de sécurité sociale est retirée (dette t03, D-284 (g))

- La colonne `nir` de `patients` et sa contrainte de forme sont retirées
  (migration `20261019190000_patients_retrait_nir_v1`). Plus aucun écran ne
  la saisissait, l'export avait cessé de la lire, et aucun dossier de
  production ne la portait. Il n'y a plus de numéro de sécurité sociale gardé
  dans le dossier patient.
- Contrat neuf `patients_retrait_nir_v1_negatif.sql` (colonne et contrainte
  absentes, trois autres colonnes et RLS présentes) ; le contrat du dossier
  administratif est ramené à ses trois colonnes.
