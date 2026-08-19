### Campagne HDS cadrée — et trois documents cessent d'attendre une réponse déjà reçue

- **Cadrage de `2026-08-18-echeance-hds-g-trust-04`**, campagne de rang 1 de la
  file : `CAMPAGNE.md` et ses quatre lots, écrits sur l'état réel du
  2026-08-19. Le dossier n'existait qu'en `--init-only`. Aucune décision n'y est
  prise : l'arbitrage des lots 1 et 4 appartient au responsable de traitement.
- **Le brief de cadrage était périmé d'une semaine.** Il portait « réponse au
  ticket Scalingo attendue » ; cette réponse est arrivée le **2026-08-11** et a
  été tranchée le jour même par `D-047`. Deux conséquences que le cadrage
  intègre et que le brief ignorait : **(b)** le périmètre HDS de `osc-fr1` est
  **levé** par écrit (certificat LNE 38436-2, activités 5 et 6 incluses) ;
  **(a)** l'accord de sous-traitance reste **ouvert et recaractérisé** — la
  requalification de `D-037` était fausse, il ne s'agit pas d'archiver une pièce
  déjà acceptée mais d'**obtenir et signer une annexe HDS distincte du DPA**.
- **Le LOT-01 se construit donc autour de l'annexe, pas d'une relance** — la
  démarche est matérielle, elle ne dépend pas de l'arbitrage, et elle reste due
  même si la dérogation est reconduite. Son texte de demande à Scalingo est
  versé comme pièce du lot ; il ne transite pas par l'assistant et ne porte
  aucune valeur d'environnement.
- **Le LOT-04 visait le mauvais fichier.** Le gate n'est pas porté par
  `REGISTRE_FRONTIERES.md`, qui ne fait que renvoyer vers sa source — la
  checklist d'activation, où la décision du 2026-07-21 exige que toute
  reconduction soit « datée et signée ici ».
- **Trois porteurs d'état redressés**, qui répétaient la prémisse morte :
  - `.wn/state.json` — le `blocking_issue` de G-TRUST-04 déclarait le ticket en
    attente ; il porte désormais `D-047` et l'état réel des deux conditions.
  - `.wn/state.json` encore, `next_action` FIL 2 — il annonçait « recette
    staging le mardi 2026-08-12 » et « réponse Scalingo attendue ». La recette
    n'a pas eu lieu et appartient au LOT-02, conditionné ; la réponse était
    arrivée la veille de la date annoncée.
  - `RUNBOOK_MIGRATION_SCALINGO.md`, prérequis DPA — « le DPA ne s'e-signe pas
    chez ce fournisseur » est **démenti sur place**, pas supprimé : la lecture
    du 2026-08-09 était une déduction marquée non confirmée, la question a été
    posée depuis et le fournisseur répond l'inverse.
  - Le même runbook, en-tête — la revue que `D-037` attendait a eu lieu.
- **Deux dérives d'état réparées au passage, par le script et non à la main**
  (`node scripts/wn-cycle.mjs --appliquer`, chemin imposé par le banc de
  cohérence) : la vue générée `ACTIVE_CAMPAIGN.md` a suivi l'horodatage de sa
  source, et `recent_decision_ids` s'est réaligné sur `docs/DECISIONS.md` — il
  s'était arrêté à `D-073` alors que `D-074` à `D-076` existent.
- Non touché, délibérément : `docs/DOSSIER_RGPD.md` (§6 et tableau §14 étaient
  déjà à jour), `docs/DECISIONS.md` (aucune `D-xxx` à prendre ici), et
  l'activation de la campagne — cadrer n'est pas ouvrir.
