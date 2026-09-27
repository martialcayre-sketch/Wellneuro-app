### Fiche d'assiette : le rayon « Fiches conseils » de la Bibliothèque (2026-09-27)

- **Lot 6b de `D-251`.** Le rayon « Fiches conseils » ouvre dans la
  Bibliothèque, sans drapeau : il remplace la bannière « à venir ».
  - Les douze assiettes d'indication, chacune avec l'état de sa dernière
    version et sa version de référence : la plus récente validée. L’écran ne
    dit pas « servie », car les contrôles seront rejoués au moment de remettre
    (§6).
  - « Aucune version », « à valider », « validée », « retirée » et « statut
    illisible » (avec sa raison) sont nommés pour ce qu'ils sont (`DC-24`).
- **La relecture côte à côte précède l'attestation (D-195 §2).**
  - D'un côté, le texte source, rendu en texte brut, avec ses marqueurs de page
    nommés.
  - De l'autre, l'adaptation, avec la provenance de chaque bloc et le texte de
    chaque claim cité. Un claim qui n'est plus VALIDE est nommé comme tel.
  - Les réserves de sécurité attendues, même non citées, et si une précaution
    les porte.
  - Les anomalies des contrôles rejoués à l'ouverture, la provenance de
    l'adaptation (modèles, consigne, empreintes) et l'historique des actes.
- **La déclaration de relecture intégrale est un geste.** Elle n'apparaît
  qu'une fois la surface chargée, retombe à chaque rechargement, et c'est elle
  qui porte `relectureIntegrale` jusqu'à la route.
- **Les deux gestes en deux temps.**
  - Valider : déclaration, puis armer, puis confirmer. Le bouton reste fermé
    s'il y a des anomalies, un contenu illisible, ou une version plus récente
    déjà validée.
  - Retirer : motif obligatoire. L'écran annonce avant la confirmation ce que
    le retrait change à la version de référence (« la vN redeviendra la
    version de référence », ou aucune). Le message de succès nomme la référence
    d’après la version relue.
  - Un refus pour état ou texte qui a bougé recharge la relecture.
- **Garde d'écran** (`actes/confirmations.guard.test.ts`), sur le patron du
  booklet. Chaque clé que la route lit doit être envoyée par un écran, et la
  déclaration doit dériver de l'état d'une case cochée, jamais d'une constante.
- **E2E synthétique** (`bibliotheque-fiches-conseils.spec.ts`) : relire,
  déclarer, valider, retirer ; les deux actes sont constatés en base.
- `MOTIF_MAX` passe dans `etat.ts` (module pur), pour que l'écran borne sa
  saisie à la même valeur que la décision.
- Valider une fiche ne l'envoie encore à aucun patient : la remise viendra au
  lot 8.
