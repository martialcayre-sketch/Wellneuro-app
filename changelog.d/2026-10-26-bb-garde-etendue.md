### bb, lot 1 : la garde du registre lit aussi les plans idéal et de secours à l'enregistrement d'une version de protocole (D-384 §5, D-386, H49)

- La route d'enregistrement d'une version de protocole
  (`api/praticien/protocoles/versions`) passe désormais le plan idéal et le
  plan de secours de chaque action sous `termeAnxiogene`, au même régime que
  le plan minimal : refus confirmable `REGISTRE_ANXIOGENE`, champ nommé, jeton
  lié au texte. Carte des gardes de `lib/documents/vocabulaire.ts` mise à jour.
- Rien de neuf n'est servi au patient : la lecture des trois plans viendra au
  lot 2, sous drapeau éteint. D-386 tranche la question laissée ouverte par
  D-384 : une version sert ses trois plans si elle a été créée après la mise
  en service constatée de cette garde (date de création de la ligne), sans
  migration ni champ de contrat.
