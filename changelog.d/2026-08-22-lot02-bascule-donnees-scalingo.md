### LOT-02 HDS : les données réelles résident sur Scalingo — la fenêtre de `D-078` est ouverte et datée (2026-08-22)

La bascule des données de production s'est faite dans la nuit : dump de la
source à 02:13 CEST, restore achevé sur l'app `wellneuro` (`osc-fr1`,
`--hds-resource`) à **03:24:09 CEST** — date consignée au dossier RGPD
(rubrique 12) comme ouverture de la fenêtre de moindre couverture. Le cutover
DNS n'est pas fait : le service aux personnes reste rendu par Vercel/Supabase,
et le décommissionnement reste gaté par l'annexe HDS, toujours pendante.

- **Recette staging écrite la veille** (`RAPPORT_RECETTE_STAGING.md`) : login
  OAuth réel, Fil/fiche, RAG passés ; synthèse SSE partielle — premier octet
  77–344 ms, durée totale 50–54 s hors fenêtre documentaire, **écart accepté
  par le responsable le 2026-08-22**.
- **Prod provisionnée et vérifiée par le comportement, jamais par
  `scalingo env`** : drapeaux alignés sur la prod Vercel constatée (dont
  l'absence voulue de `WN_RECHERCHE_CORPUS_ENABLED` et de tout `SENTRY_*` —
  la parité, c'est aussi ne pas poser), gate dur `WN_CB_RESULTS_ENABLED`
  laissé absent.
- **Restore complet aux comptes près** (19 patients, 118 réponses, ~360 k
  lignes) après deux obstacles instructifs, tous deux au runbook : la FK
  auto-référente de `rag_corpus_claim_decisions` (drop/re-add autour du
  `COPY`), et le **déclencheur clinique qui refuse le `COPY` comme un lot de
  signatures** — désactivé le temps d'une table sur feu vert explicite du
  responsable, réactivé et vérifié dans la même main ; l'alternative ligne à
  ligne aurait rejugé l'histoire avec la règle du jour et perdu ≥ 72 claims.
- **Deux trous du dossier RGPD bougent** : le fournisseur SMTP est identifié
  (Google Workspace, par SPF/MX/DKIM + expéditeur du code — localisation et
  DPA restent dus) ; l'échéance « renouvellement d'information avant la
  bascule » est **dépassée et le dossier le dit** — relevée le jour même, à
  rattraper au plus tôt.
- Aucun code touché, aucune migration Prisma : consignation documentaire
  d'un lot ops.
