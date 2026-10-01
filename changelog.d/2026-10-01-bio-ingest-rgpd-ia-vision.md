### TRUST et RGPD : le relevé des comptes rendus biologiques par IA est déclaré avant toute activation — BIO-INGEST, préalable du LOT-02 (2026-10-01)

- **Pourquoi.** `D-256` A4 conditionne l'extraction par IA vision (Anthropic)
  à une déclaration préalable, dans le registre RGPD et dans le document
  patient sur l'IA. Le préalable est posé ici, sans aucun code d'extraction, et
  aucun drapeau n'existe encore.
- **« L'intelligence artificielle dans Wellneuro » v4.** Un quatrième usage est
  décrit : lorsque le praticien dépose un compte rendu, l'outil en relève les
  valeurs et les lui propose, et rien n'entre au dossier sans sa validation. Le
  document est transmis **en entier**, identité comprise. La formulation reste
  vraie après l'activation, sans phrase « avant sa mise en service ». Pas
  d'accusé.
- **« Vos données personnelles » v11, avec accusé.** La phrase de la v6, « Ces
  résultats sont saisis par votre praticien », devenait fausse : elle est
  remplacée. La ligne Anthropic nomme le relevé. L'accusé est exigé parce que
  seule la version courante en réclame un : sans lui, celui de la v10 encore dû
  s'effaçait. Les dossiers qui ont accusé la v10 revoient la séquence une fois.
- **Dossier RGPD.** Un nouveau §2 ter porte la finalité, le déclencheur, ce qui
  part (le document entier) et les conditions de pose du drapeau. La rubrique 5
  reçoit une ligne sur les comptes rendus et les lignes candidates. La rubrique
  6 aligne Anthropic. La rubrique 7 déclare un quatrième flux, le plus
  identifiant. Les rubriques 8 et 14 portent les trous de conservation et de
  DPA.
- **Condition ajoutée par le responsable** : la demande de DPA à Anthropic doit
  être **envoyée** avant la pose du drapeau d'extraction. L'envoi est exigé,
  pas la signature. **Information par le document, pas par la personne** :
  aucun garde n'exige l'accusé de la v11 avant une extraction, et c'est écrit
  au §2 ter.
- Bancs : `registre.test.ts` garde les vingt versions et prouve la
  transmission entière dans les deux documents servis. Les bancs v3 et v10
  lisent désormais leur propre version.
