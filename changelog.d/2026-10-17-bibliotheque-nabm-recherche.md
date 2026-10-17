### Bibliothèque biologie : l'acte NABM se cherche par son libellé, les bilans quittent le rayon (D-320, F54, F80, 2026-10-17)

Retour du responsable sur captures du cockpit, sans migration ni règle
clinique modifiée.

- **Recherche par libellé** (`correspondancesNabm.ts`,
  `api/praticien/biologie/nabm/recherche`, `CorrespondancesNabmSection.tsx`) :
  dans « Ajouter une correspondance », le praticien cherche les actes du
  millésime courant par leur libellé — tous les mots, accents, casse et
  ponctuation ignorés (`rechercheTexte.ts`), ou le début du code. Au plus 25
  actes, actifs d'abord, avec le total. Il choisit un résultat, qui se lit par
  son code comme avant, puis signe par le même geste : rien n'est rapproché ni
  présélectionné. Le champ « Code de l'acte » reste.
- **Bilans retirés de la Bibliothèque** (`catalogue.ts`,
  `RayonBiologiePanel.tsx`, `FicheAnalytePanel.tsx`) : plus de section
  « Bilans » ni de « Présent dans les bilans » ; le catalogue ne sert plus leur
  composition. Le moteur de proposition, le courrier et le document patient
  les lisent comme avant (D-296 §5).
- **Explorations non indiquées** (`nonIndiquesBibliotheque.ts`) : « Magnésium
  plasmatique » et « Cortisol matinal isolé », bilans sans analyte, s'affichent
  sur la fiche du magnésium érythrocytaire et du cortisol awakening response —
  l'exploration que leur motif nomme pertinente —, motif verbatim de la table
  signée et claim ; rien si la signature de la table ne tient plus.
- **Analyses groupées** : cadrées en F80 (inventaire, options de modèle,
  questions) ; livraison après arbitrage, par migration.
- **Bancs** : recherche (jetons, accents, code, millésime, borne, saisie
  invalide), route, écran (chercher, lire, signer ; remise à zéro au changement
  d'analyte), rattachement des règles non indiquées et analytes semés, catalogue
  sans bilans ; contre-épreuve, huit mutations rougissent.
