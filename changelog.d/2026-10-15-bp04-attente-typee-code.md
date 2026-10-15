### BP-04 : l'attente biologique nomme ses analytes, et le serveur les borne (D-305, LOT-04, 2026-10-15)

- Contrat V4 : l'attente d'une action suspendue gagne `analyteCodes`, liste
  exigée non vide à l'écriture, dédupliquée et triée ; la cible reste libre.
  Une attente sans codes se relit sans refus et se dit « Attente non typée :
  aucun résultat ne la réveille » au panneau d'arbitrage biologique.
- Route des versions de protocole : chaque code d'une attente posée par la
  soumission doit être connu du catalogue biologique, puis analyte d'une ligne
  `recommande`, `a_repeter` ou `conditionnel` à déclencheur rempli de la
  proposition de bilan re-dérivée à l'instant ; une proposition qui ne se
  dérive pas est un refus (422 `analyte_inconnu`, `attente_hors_proposition`,
  `proposition_indisponible`). Une attente déjà portée, inchangée, par la
  version active n'est pas rejugée : la borne juge le geste de suspendre.
- Attente C4 (règle de compléments) : même champ facultatif, même lecteur
  tolérant ; une liste présente mais malformée rend la condition illisible.
  L'atelier des règles refuse une condition qui porte des codes : l'attente
  née d'une règle reste non typée.
- Constructeur de protocole : en suspendant une action, le praticien coche les
  analytes offerts par la proposition de bilan du dossier, et eux seuls.
- Bancs d'empreinte V4 et C4 (ce dernier créé) : valeurs mesurées sur le code
  d'avant, inchangées. Aucune migration, aucun drapeau, aucune règle clinique.
