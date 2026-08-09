### Ajouté

- **La décision HDS est tranchée, et le dépôt cesse de la contredire (D-037).**
  Deux pièces se contredisaient depuis le 2026-08-05 : `docs/DECISIONS.md` D-006
  (2026-07-28, registre, responsable de traitement) posait la cible « Scalingo
  seul », tandis que le runbook réécrit le **2026-08-05** — donc après —
  réaffirmait au présent « l'orientation arrêtée le 2026-07-22 est de rester sur
  l'hébergement actuel », et citait D-006 comme autorité vingt-quatre lignes plus
  bas. `REGISTRE_FRONTIERES.md` portait encore « migration à instruire ».

  **D-037 confirme D-006** et avance la revue de la dette HDS du 2026-10-21 à la
  **réponse de Scalingo** au ticket ouvert le 2026-08-09. L'échéance de la
  dérogation G-TRUST-04, elle, ne bouge pas : elle reste au 2026-10-21, échéance
  que porte la majorité des trous du dossier RGPD — pas tous. L'ordre imposé de
  D-006 tient intégralement — aucune donnée réelle sur Scalingo avant que
  l'accord de sous-traitance soit archivé et le périmètre HDS de la région
  confirmé par écrit.

- **Le certificat HDS de Scalingo est lu, et non plus seulement cité.** Son
  numéro figurait déjà dans D-006, dans l'audit du 2026-07-24 et dans la
  checklist du gate ; le document lui-même, déposé sur Drive le 2026-07-28,
  n'avait pas été ouvert. Le dossier RGPD porte désormais la pièce : LNE
  **n° 38436-2**,
  référentiel HDS **version 2.0**, titulaire SCALINGO (Strasbourg), valable du
  **2025-09-12 au 2028-09-11**, **six activités couvertes** — dont la 5
  (administration et exploitation) et la 6 (sauvegardes externalisées), ce qui
  place le PostgreSQL managé **et ses sauvegardes** dans le périmètre.

  Trois points que la seule mention d'un numéro aurait perdus : la validité est
  **subordonnée** à celle du certificat ISO/IEC 27001 **n° 38435** à
  isopérimètre (avec le seul 38436-2, la pièce est incomplète) ; les six
  activités sont le motif exact pour lequel l'audit avait écarté un autre
  fournisseur ; et **le certificat ne nomme aucune région**, ses sites couverts
  étant Strasbourg et « sites virtuels / bureaux distants ».

### Corrigé

- **Deux prémisses non établies sortent du chemin critique HDS.**

  L'audit du 2026-07-24 déduisait de l'annexe HDS un accès aux données de santé
  réservé à un **professionnel de santé porteur de carte CPS**, et en tirait que
  la pratique d'exploitation (SQL depuis le poste, MCP, Prisma Studio)
  deviendrait « une non-conformité contractuelle immédiate » au jour de la
  bascule. Le responsable de traitement a qualifié le point : l'activité de
  Wellneuro **n'est pas une activité réglementée** — précédent invoqué :
  Pronutriconsult, plateforme équivalente exploitée par des praticiens non
  médecins, sans CPS. Ce qui subsiste est une **politique d'accès écrite**
  (traçabilité, minimisation), due sous la dérogation actuelle comme après la
  bascule, et qui n'engendre aucun lot d'ingénierie.

  Le correctif est écrit **aux deux endroits** où l'audit posait l'exigence —
  la grille comparative et le § « Ce qu'il reste à décider » —, plutôt que la
  phrase simplement supprimée : ce faux bloqueur est ressorti deux fois comme
  s'il était établi. Il est requalifié **sous réserve de confirmation du
  fournisseur ou d'un conseil** : la démonstration repose sur le statut de
  l'activité et un précédent de place, pas sur une lecture contradictoire de
  l'annexe, et le ticket du 2026-08-09 ne posait pas la question.

  Le dossier présentait par ailleurs le DPA Scalingo comme **à e-signer** — une
  démarche qui n'existe pas chez ce fournisseur : l'accord vit dans les
  documents généraux, acceptés à la souscription, laquelle existe déjà. Ce qui
  reste dû est une **copie horodatée à archiver**. La réserve est donc
  **requalifiée dans sa nature, pas levée** : la pièce n'est pas au dossier au
  2026-08-09, et une souscription inférée n'est pas une preuve produite.

- **Le runbook cesse d'annoncer un compteur de migrations écrit à la main.** Il
  portait « elles sont 49 au 2026-08-05 » : le chiffre était **exact à sa date**
  et a **périmé en quatre jours**. Ce n'est
  donc pas sa valeur qui était en cause mais le procédé — un compteur figé sert
  de contrôle à la bascule et dérive en silence. Le contrôle est désormais nommé
  pour ce qu'il doit être : `prisma migrate status` rendant « up to date ».

- **L'état de schéma du staging est déclaré non mesuré, au lieu d'être
  supposé.** Une première rédaction affirmait un retard (35 appliquées contre
  50) : c'était une inférence, pas une mesure — l'intégration GitHub déploie
  automatiquement sur `main`, donc le `postdeploy` a rejoué `db:deploy` à chaque
  merge. Les revérifications se sont faites par `apps-info`, `addons` et `ps`,
  dont aucun ne lit les migrations. Le contrôle exige un conteneur
  `scalingo run` avec TTY.

- **« Validé de bout en bout » devient « validé au boot ».** La formule a été
  lue comme une validation fonctionnelle ; elle ne l'est pas, et la ligne
  « reste à poser » du même document le disait déjà. Les trois items
  fonctionnels de `CHECKLIST_FINALISATION.md` §A — login praticien réel,
  synthèse IA en SSE, parcours Fil/fiche/RAG — ne sont pas cochés, et aucun
  rapport de recette sur staging n'existe.

- **L'arbitrage de région n'était pas un choix ouvert.** L'audit recommandait
  `osc-secnum-fr1` ; `scalingo regions` ne rend qu'`osc-fr1` sur ce compte
  (relevé le 2026-08-09). Y basculer suppose une demande d'accès préalable, pas
  un choix de commande — le runbook le dit désormais, et la question est partie
  au fournisseur.
