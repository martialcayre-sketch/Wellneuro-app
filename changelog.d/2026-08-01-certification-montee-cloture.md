### Interne

- **Montée en certification close à 62/64 (campagne 2026-07-25, lots 1–4).**
  Sur les 64 instruments du registre : **60 en `scoring_verifie`**, **2 en état
  terminal `suspendu`** — Q_FIB_03 (ELFE) fermé définitivement, à ne rouvrir que
  sur usage ; Q_PED_03 (Conners 3) en arbitrage clinique ouvert (les 4 dimensions
  et 2 échelles de validité de la source ne sont pas servies). Restent **en
  vol** : Q_SOM_09 (`droits_verifies`, recueil de données en cours — décision
  praticien avant tout scoring) et Q_GEO_04 (`contenu_verrouille`, plafonné par
  la réserve adversariale du 2026-08-01 : les quatre bandes attribuées à la
  HAS 2011 n'ont jamais été comparées à une source, escalade SIIN ouverte).

  Ce que cette clôture **ne fait pas** : aucune promotion de statut — celle de
  Q_GEO_04 est explicitement interdite par le plafond posé au registre. L'état
  machine (`.wn/state.json`), figé au 2026-07-23, est réaligné sur cet état
  réel.

- **Arbitrages praticien du 2026-08-01, rendus en session et transcrits.**
  Q_PED_03 (Conners 3 parent) **reste `suspendu`** : sur trois options
  instruites (statu quo, reconstruction dimensionnelle complète, recueil non
  scoré), le praticien retient le statu quo — à rouvrir sur usage, et alors
  avec le scoring dimensionnel complet, jamais la somme brute. L'axe
  orientation adaptative est **lancé** — et le cadrage a montré que le lot 7
  était déjà livré depuis le 2026-07-25 (#361), dormant en fail-closed (table
  vide, flag absent) : la prochaine étape réelle est le lot 8 (ingestion des
  fiches NNPP2, gates coût API / écriture prod / validation claim par claim),
  puis la signature de la table au lot 9. Transcrit au registre
  (`verdictScoring` de Q_PED_03), dans l'arbitrage du 2026-07-31 et dans
  `.wn/state.json`.

- **Décision f close — périmètre A-009 amendé pour l'orientation.** Sur
  confirmation expresse du praticien (2026-08-01) : seule la **perfusion**
  reste exclue du moteur d'orientation ; sevrages médicamenteux, psychotropes
  et Alzheimer sont **réintégrés** dans le drafting des claims. Ce qui ne
  change pas : la voie lente — chaque claim passe individuellement par la
  validation praticien de l'Atelier corpus avant d'exister pour le moteur
  (barrière D-003). Gates du lot 8 confirmés dans la foulée : coût accepté,
  premier lot d'ingestion = sommeil complet (17 fiches), exécution sur le
  poste local (les secrets du pipeline n'existent que là).
