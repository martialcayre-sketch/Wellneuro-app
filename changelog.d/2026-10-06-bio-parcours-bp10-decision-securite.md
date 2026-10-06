### Sécurité biologique, étage 1 : la décision `D-268` grave les arbitrages de BP-10 (2026-10-06)

- **Quoi.** Tout import biologique validé appelle un acte de lecture clinique
  tracé, posé par import et distinct de la validation. L'acte est révocable
  avec un motif obligatoire. Il est signalé au Fil par une carte neuve, que la
  simple lecture n'acquitte pas. Il ne bloque aucun geste. La notification
  passe par le Fil seul, et un échec se voit à l'écran. La lettre et
  `medical_referral` restent un geste du praticien. Les imports antérieurs
  sont inclus.
- **Deux points précisés après la revue Copilot.**
  - Le destinataire avait été arbitré « tout praticien du domaine ». Ce serait
    une portée d'accès nouvelle, car le Fil filtre aujourd'hui par
    appartenance. L'exécution est suspendue jusqu'à une reconfirmation du
    responsable ; d'ici là, la carte va au praticien du dossier.
  - Aucune lettre d'adressage ne repose sur un constat biologique seul (la
    route exige un constat d'anamnèse). Ce cas relève d'un lot distinct.
- **Pourquoi le déclencheur n'est pas le marquage.** Les lignes v1 n'ont pas
  de marquage. Il reste `NULL` au-delà de sa borne (`D-267` §10), et son
  absence ne prouve rien. Wellneuro ne juge pas de ce qui est préoccupant.
- **Ce que la décision ne fait pas.** Elle ne pose ni migration ni code. Elle
  autorise la migration du LOT-10, seule dans sa PR : confirmation distincte,
  passe Codex, `release-db`. Le registre RGPD passe avant la table. BP-10
  précède BIO-INGEST LOT-04.
- Fiche `LOT-10` : arbitrages consignés, étapes mises à jour.
