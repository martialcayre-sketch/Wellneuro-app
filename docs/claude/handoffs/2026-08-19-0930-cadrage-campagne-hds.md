# Handoff — 2026-08-19 — Cadrage de la campagne HDS (G-TRUST-04)

## Branche et état

- Branche `docs/campagne-hds-cadrage`, basée sur `origin/main` `652e9313`.
- Diff **documentaire pur** — aucun fichier de `web/src`, aucune migration,
  aucune écriture en base. `.wn/state.json` et une vue générée sont touchés.
- Hors campagne active : `.wn/state.json` reste `idle`. **Cadrer n'est pas
  activer** — l'activation (`--activate`) est un geste à part, non fait.

## Le fait qui a changé le travail

Le brief de cadrage (2026-08-18) portait « réponse au ticket Scalingo
attendue ». **Elle était arrivée le 2026-08-11**, et `D-047` l'avait tranchée le
jour même. Trois porteurs d'état répétaient encore l'attente ; le dossier RGPD,
lui, était à jour — c'est ce décalage qui a permis de le voir.

- **(b) périmètre HDS de `osc-fr1` — LEVÉE.** Certificat LNE n° 38436-2, six
  activités du référentiel dont la 5 et la 6.
- **(a) accord de sous-traitance — OUVERTE, et recaractérisée.** `D-037` avait
  posé qu'il n'y avait rien à signer, les pièces vivant dans les documents
  généraux acceptés à la souscription — déduction explicitement marquée « non
  confirmée ». Scalingo répond l'inverse : **DPA + annexe HDS distincte**,
  signature séparée, « l'acceptation des conditions générales seule ne
  suffit pas ».

## Ce que le lot livre

- `CAMPAGNE.md` et ses **quatre lots**, sur l'état réel du 2026-08-19.
- `sources/demande-annexe-hds-scalingo.md` — texte de demande prêt à envoyer,
  six questions dont deux qui n'avaient jamais été posées (couverture
  rétroactive des ressources déjà provisionnées ; obligations d'exploitation).
- Trois redressements : `blocking_issue` et `next_action` FIL 2 de
  `.wn/state.json`, prérequis DPA du runbook (**démenti sur place**, pas
  supprimé — la trace de la déduction fautive reste lisible).

## Quatre choses à savoir avant de reprendre ce dossier

1. **Le LOT-01 porte deux objets à ne pas confondre.** L'annexe HDS est une
   *démarche matérielle* qui ne dépend d'aucun arbitrage et reste due même si la
   dérogation est reconduite. L'arbitrage migrer/reconduire est *une décision du
   responsable de traitement* — le lot la pose, ne la tranche pas.
2. **Le gate n'est pas porté par `REGISTRE_FRONTIERES.md`**, qui ne fait qu'y
   renvoyer. Sa source est
   `campagnes/2026-07-15-trust-information-patient-droits-v1/CHECKLIST_ACTIVATION_G_TRUST_04.md`,
   où la décision du 2026-07-21 exige que toute reconduction soit « datée et
   signée ici ». Le brief visait le mauvais fichier ; le LOT-04 est corrigé.
3. **Migrer ne lève pas le gate.** Sept exigences, une ❌ et six partielles,
   « c'est un ET, pas un OU ». La migration lève la première, rien d'autre.
4. **Un statut de lot doit être lisible par l'audit.** `statut: "fermé"` n'est
   reconnu ni comme clos ni comme en vol par `isClosedStatus`/`isInFlightStatus`
   (`scripts/wn-campaign-audit.mjs`) — au moment de clore la campagne, il aurait
   levé `closed_campaign_with_open_lots` et rougi le CI. Le LOT-02 porte donc
   « à faire — conditionné », sa porte restant écrite dans le corps du lot.

## Piège rencontré

**Bumper `updated_at` dans `.wn/state.json` fait rougir T1** : le banc de
cohérence compare `ACTIVE_CAMPAIGN.md` à ce que la source produit, et la vue
porte la date. Réparation par `node scripts/wn-cycle.mjs --appliquer`, **jamais
à la main** — le script en profite pour réaligner `recent_decision_ids`, qui
s'était arrêté à `D-073` alors que `D-074` à `D-076` existent.

Le piège `web/next-env.d.ts` (régénéré par `npm run check`) **ne s'est pas
manifesté** sur ce lot, malgré trois passes de T1.

## Validation

- **T1 vert** (`cd web && npm run check`) après réparation de la vue.
- `bash scripts/check_no_secrets.sh` vert sur le dépôt entier.
- `node scripts/wn-campaign-audit.mjs` — sortie 0, campagne vue 0/4 lots.
- Revue `/code-review` passée : cinq trouvailles, toutes vérifiées et corrigées.

## Reste ouvert

- **Le geste de trente secondes déjà en file** : désarmer
  `WN_CB_RESULTS_ENABLED` au panneau Vercel — il vaut `true` contre son propre
  verrou (« GATE DUR HDS : ne doit jamais passer à true avant l'attestation »),
  sans appelant aujourd'hui, donc armé pour CB-09. Directement dans l'axe HDS.
- L'**activation** de la campagne, si elle doit devenir primaire.
- `D-TRUST-02`, registre EX-3, AIPD, pentest — humains, aucun lot ne les ferme.
