- **Mise à jour (2026-11-12, cadrage du lot à part D-277, sans code)** : la question `20261111-2148-a` est répondue par le responsable (option 1). Le lot devient une ligne de la fiche : à cadrer, hors NF-7, sans date, à servir AVANT l'allumage de `WN_ENABLE_DECLARATION_SUICIDE_CAB`. Le banc des verrous (#2035) est mergé (`7b322374`).
  - **Ce que le lot doit tenir.** Sur un `CAB_` déclaré « oui », une réponse autre que l'option « non » désignée fait apparaître le message signé de D-277 §1 et fait partir le courriel signé de D-277 §2. Les deux textes ne changent pas. Le patient ne doit pas lire « votre praticien sera prévenu » sans que le courriel soit appelé : le message ne se sert donc pas sans le constat.
  - **Constats.**
    - Le constat `SAF-QUEST-01` ne lit que les quatre questions de la table signée. Les options de ces questions sont lues dans le catalogue et entrent dans le SHA.
    - Le courriel part exactement quand ce constat naît (`alerteSecuritePraticien.ts:59-69`).
    - La carte du Fil, le moteur et la lettre d'adressage ne chargent que ces quatre questionnaires.
    - La copie prise à l'envoi est booléenne seulement. La question et la valeur « non » ne vivent que sur l'instrument, et une modification de son contenu les efface : la désignation en vigueur pour une passation n'est donc pas retrouvable.
    - Production : 0 instrument du cabinet.
  - **Trois questions, posées dans la liste commune :**
    - `20261112-2023-a` (clinique) : la règle du constat sur un `CAB_`. Recommandée : une règle neuve, `SAF-QUEST-02`, sous sa propre D-xxx et sa propre signature, qui laisse la table de `SAF-QUEST-01` intacte.
    - `20261112-2024-a` (clinique) : les effets de ce constat. Recommandés : les mêmes que pour le catalogue (inhibition totale, carte, lettre).
    - `20261112-2025-a` (migration) : où figer la désignation. Recommandée : la copier sur l'assignation à l'envoi, par deux colonnes nullables et un CHECK.
  - **Par défaut, sauf arbitrage contraire.** Le lot passe derrière le même drapeau, puisqu'il est préalable à son allumage. Aucun numéro D-xxx n'est réservé, aucun texte n'est écrit : la décision clinique se rédige après les réponses.
- **Ordre attendu** :
  1. les réponses ;
  2. la D-xxx clinique, validée par le responsable ;
  3. la migration de la copie, si l'option 1 de `2025-a` est retenue, avec sa release-db ;
  4. le code (producteur, Fil, lettre, courriel, message dans le navigateur, banc client↔serveur de D-277 §1) et sa release-db, puisqu'il passe par le chemin clinique.

  Ensuite, le compte des copies NULL est refait, puis vient l'allumage (geste du responsable), puis la troisième migration de H59.
