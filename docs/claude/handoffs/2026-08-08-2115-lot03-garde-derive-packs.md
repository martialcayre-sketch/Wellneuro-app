# 2026-08-08 21:15 — LOT-03 : la dérive registre/packs, re-mesurée puis fermée

Campagne `2026-08-08-dettes-ouvertes-5-0`. Branche `lot-03-garde-derive-packs`,
base `9176d367` (`origin/main` après le squash de #626). Clôture écrite avant la
PR : le merge est un squash.

## Ce qui est fait

Le **LOT-03** en entier — dette 4, « double source de vérité des packs » — plus
la correction mineure rattachée, et l'ouverture du **LOT-04**.

- **Re-mesure de production du 2026-08-08** (`execute_sql`, MCP) : **0 divergence
  sur 8 packs**, 0 miroir orphelin, 0 qid hors `questionnaires`, 1 pack actif sur
  8, dernière écriture de pack `2026-08-07 15:46:34`. **La requête est consignée**
  dans le fichier de lot — celle du 2026-08-05 ne l'était pas.
- **Le garde d'écriture** : `syncPackToRegistry` lève `QidsSansDefinitionError`.
  Les trois `catch` de `api/praticien/packs/route.ts` rendent un
  `409 qid_sans_definition` nommant les qids, et journalisent.
- **Le contrat de production** `prisma/checks/packs_registre_coherence_v1.sql`,
  câblé trois fois (préflight `release-db.yml`, `ci.yml` avant seed, `ci.yml`
  après seed), son fichier négatif, et `packsRegistreCoherence.guard.test.ts`.
- `prisma/seed.ts` écrit désormais le miroir du pack de base.
- `changelog.d/2026-08-08-garde-derive-packs.md`, `LOT-04-garde-code-registre.md`,
  `CAMPAGNE.md`, `DOSSIER_RGPD.md`, et l'état machine (`.wn/state.json` puis
  `wn-campaign.mjs sync`, dans cet ordre).

## Ce qu'il faut savoir avant de reprendre

- **LA DÉRIVE AVAIT UN GÉNÉRATEUR, ET IL N'ÉTAIT ÉCRIT NULLE PART.**
  `syncPackToRegistry` jetait **silencieusement** tout qid sans
  `QuestionnaireDefinition`. La ligne de `Q_SOM_09` a été créée le **2026-08-06
  14:59** : le 2026-08-05 le miroir du pack de base ne *pouvait pas* le porter.
  `backfillQuestionnaireRegistry.ts:83-102` avait déjà le pré-contrôle et le
  nommait ; le chemin praticien n'en avait aucun.
- **L'ALTERNATIVE DU CADRAGE REPOSAIT SUR DEUX FAITS FAUX.** Le contrat en CI
  n'est pas « aveugle mais gratuit », il est **vacu** (base construite par
  `migrate deploy` seul). Et il ne manquait pas de mesureur —
  `checkPackRegistryConsistency.ts` existe, hors CI. Il manquait un
  **déclencheur**. Ne pas rouvrir ce débat sans relire ces deux mesures.
- **NE PAS RÉTABLIR LA JUSTIFICATION DE LA BORNE PAR LE SEED.** « Les trois
  assertions ne s'appliquent qu'aux packs miroités » se justifiait par « le seed
  n'écrit aucun miroir » — **le lot a rendu cette phrase fausse** en faisant
  écrire ce miroir au seed. La borne tient sur le **pack neuf**, entre sa création
  et sa première synchro. Cinq documents citaient l'ancien témoin ; tous corrigés,
  avec un ⚠ dans l'en-tête du contrat.
- **LE SENS D'UN REFUS COMPTE AUTANT QUE SON EXISTENCE.** Première rédaction :
  `DELETE` passait par la synchro et refusait donc de désactiver un pack en
  dérive — le garde interdisait de retirer le pack qu'il dénonce. `DELETE` ne
  propage plus que `actif`, par `updateMany`.
- **UN GESTE NOMMÉ DOIT ÊTRE POSSIBLE, ET DEUX CATALOGUES DIFFÈRENT.**
  `normaliserQids` filtre sur le catalogue de SCORING ; l'écran ne montre que le
  catalogue d'AFFICHAGE (`api/praticien/questionnaires` ne sert que
  `QUESTIONNAIRES_CATALOG`). `Q_NEU_12` est dans l'écart. « Retirez-le du pack »
  désignait une case inexistante — le message se scinde.
- **UN CORRECTIF A ROUVERT LA DÉRIVE QU'IL DEVAIT FERMER.** Le seed corrigé
  miroitait la **constante** `PACK_BASE.qids` au lieu de la ligne en base ;
  l'upsert du pack étant un `update: {}`, toute divergence (pack édité en dev,
  changement futur de la constante) refabriquait l'état du 2026-08-05. C'est ce
  qui a motivé la **troisième position du contrat, après le seed** — la seule qui
  porte sur des données en CI, et la seule qui l'aurait attrapé.
- **`BEGIN READ ONLY` N'EST PAS DÉCORATIF**, mesuré : à travers
  `prisma db execute`, un `CREATE TABLE` y est refusé par le serveur et la table
  n'existe pas ensuite. La question valait pour tous les préflights du dépôt.
- **UN MUTANT ÉQUIVALENT, DÉMONTRÉ.** Retirer l'`ORDER BY` du `array_agg(DISTINCT
  …)` ne change rien : le `DISTINCT` d'agrégat impose déjà le tri (`{Z,A,M,B}` →
  `{A,B,M,Z}`). Aucun cas de donnée ne peut le tuer — c'est le banc **textuel**
  qui l'épingle. Ne pas chercher à écrire ce cas-là.
- **DEUX FICHIERS ÉTAIENT COMMITTÉS EN CRLF CONTRE `.gitattributes:1`**
  (`route.ts`, `seed.ts`) : leurs diffs annoncent 470/376 et 434/341 pour 110/16
  et 97/4 réels. Relire avec `--ignore-cr-at-eol`. Indexer du CRLF exigerait de
  désarmer l'attribut ; ce n'est pas un correctif.
- **Trois passes de revue adversariale, deux NO-GO**, dont le second sur un
  correctif. Et **trois exhaustivités annoncées sans balayage** dans ce seul lot —
  la dernière affirmait « aucun autre fichier concerné » en en ratant un.

## Prochaine action

**LOT-04** — (1) faire comparer à `scripts/lib/verifier_registre_instruments.js`
le `def.scoring.certification.status` du catalogue au `statutCertification` du
registre (il ne compare aujourd'hui que les identifiants, `:205-210`) ; (2) poser
la clé `certification` dans les blocs `scoresJson` de `prisma/seed.ts` et **une**
assertion Playwright sur la colonne « Qualité ». **La sortie du garde est
l'instrument de mesure** de la troisième dette de `D-036`.

## Questions ouvertes

- **Le badge muet sur 18 instruments que le registre déclare `scoring_verifie`**
  n'est pas un lot : c'est une décision produit, à prendre **sur la liste que
  produit le LOT-04**, et à écrire en `D-037`. Faire parler l'écran suppose de
  choisir la source d'autorité d'une affirmation clinique, ce que `D-034` fige.
- **Une dérive de type « qid sans définition » bloquerait toutes les releases**,
  sans chemin de correction sanctionné : le geste praticien ne marche plus (le
  garde le refuse) et le backfill n'a aucune voie relue vers la production.
  Réserve nommée dans `release-db.yml`. Cet état ne peut plus naître de
  l'application ; il faudrait une écriture hors application.
- **La réserve `IDS_SUSPENDUS` reste ouverte** et délibérément hors périmètre :
  un contrat SQL lirait le drapeau dans la mauvaise position (`D-033`).

## Interdits encore actifs

- Ne pas conditionner une assertion du contrat à `p.actif` : sept des huit packs
  de production sont inactifs, et un pack inactif se réactive. Deux cas du négatif
  et un cas du banc textuel le refusent.
- Ne pas câbler le fichier **négatif** dans `release-db.yml` : il écrit.
- Ne pas « aligner » `checkPackRegistryConsistency.ts` et le contrat sur le miroir
  vide : un audit et une porte n'ont pas le même seuil, la divergence est écrite
  des deux côtés.
