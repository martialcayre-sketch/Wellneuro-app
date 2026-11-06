# Handoff — 2026-11-06 — BP-12b, PR 3 : l'atelier des positions d'expert, sous drapeau éteint

## Branche et état du dépôt

- Branche `b-bp12b-atelier-positions`, partie de `origin/main` (avancée par
  `--ff-only` jusqu'à f1943140) ; worktree
  `.claude/worktrees/b-bp12b-positions-expert`.
- PR ordinaire, sans migration ni authentification : essai `D-373`,
  déclarée « prête @sha » par la file, mergée par l'intégrateur.

## Objectif

Livrer l'atelier de D-439 §5 et §6 (3), sous `WN_POSITIONS_EXPERT` éteint :
verser une version de position, la signer (relecture intégrale) ou la retirer
(motif), poser ou révoquer l'arbitrage d'un conflit pour une fiche de sa liste
curée. Patron : l'atelier des fiches d'usage (D-251 §5, D-314).

## Décisions prises

Quatre arbitrages du responsable, le 2026-11-06, chacun sur l'option
recommandée (mémoire `bp12b-arbitrages-2026-11-04`) :

1. Les actes alternent : un `signee` répété et un `retiree` sur une version
   jamais signée sont refusés à la route, alors que la base les accepte.
2. La position retenue par un arbitrage fonde la même fiche. Une position
   sans fiche ne se retient pas.
3. Une fiche n'est fondée que par une position non retirée. La route le
   vérifie sous le verrou `fu|FU_…` (espace 439), faute d'index en base.
4. Le registre `conflitsSourcesV1` ne porte ni la liste curée des fiches par
   conflit (A2) ni d'empreinte par entrée (A3). La PR 3 ne touche pas ce
   fichier clinique : `registreConflits.ts` lit un champ `fichesUsage`, absent,
   donc toute pose est refusée « fiche hors de la liste curée ». L'empreinte
   d'une entrée vaut sha256(JSON de l'entrée). Pas de release-db.

Choix d'écriture, dans le cadre de D-439 :

- Une écriture par transaction (P2-3 de #1871), en READ COMMITTED nommé. Les
  verrous suivent l'ordre des triggers : `fu|` puis `pe|` pour une version ou
  un acte, `cs|` puis `pe|` pour un arbitrage.
- Un claim d'appui ou retenu qui n'est pas frais est refusé à l'écriture
  (absent, non valide ou supplanté au corpus). À la lecture, il rend la
  position, ou la tête, « à relire ». Le retrait et la révocation ne lisent
  ni la fraîcheur ni le registre : ce sont des coupe-circuits.
- Lecture : tout praticien. Écriture : `peutDeciderFichesUsage`, la même
  garde que les fiches d'usage. Drapeau éteint : 404 avant la session.
- Aucun lien de navigation : l'adresse `/dashboard/bibliotheque/positions-expert`
  se donne au responsable à l'allumage.

## Fichiers modifiés

- `web/src/lib/positions-expert/` (neuf) :
  - `vocabulaire.ts`, `drapeau.ts`, `empreinte.ts`, `registreConflits.ts`,
    `etat.ts`, `fraicheur.ts`, `lecture.ts`, `http.ts` ;
  - `ecriture.ts`, seul écrivain des trois tables ;
  - leurs tests, `ecritures.guard.test.ts` et `positionsExpert.pg.test.ts`.
- Routes `web/src/app/api/praticien/positions-expert/` : `route.ts` (GET),
  `versions/`, `actes/`, `arbitrages/` et `routes.test.ts`.
- `web/src/components/positions-expert/AtelierPositionsPanel.tsx` et
  `web/src/app/dashboard/bibliotheque/positions-expert/page.tsx`.
- `.github/workflows/ci.yml` : étape « Positions expert real-database bench ».
- `docs/FEATURE_FLAGS.md` : `WN_POSITIONS_EXPERT`.
- `docs/claude/MATRICE_CONSOMMATION.md`, régénérée. La structure des fiches
  passe de 7 à 11 surfaces indirectes. Le corpus de synthèse passe de 45 à 48
  par transitivité, `conflitsSourcesV1` important `sha256` : aucun texte du
  corpus n'est lu.
- `changelog.d/2026-11-06-positions-expert-atelier.md`,
  `docs/claude/plan-journal/F09/2026-11-06-01-atelier-positions-expert.md`,
  ce handoff.

## Validations exécutées

- Vitest `src/lib/positions-expert` et les routes : vert.
- Banc sur base réelle, en local sur `wellneuro_banc_pe_1871` : 8 cas sur 8.
  - Il a d'abord trouvé un vrai défaut : un texte en UTF-16 mal formé (une
    demi-paire de substitution) faisait rejeter l'écriture par `jsonb`, en 500.
    Ce texte est désormais refusé à la route, en 400.
  - Contre-épreuve de la question 3, jouée à la main : quand l'occupation de
    la fiche se lit avant le verrou, deux positions passent, et le cas 4
    rougit.
- T1 complet (`npm run check`) : vert sur l'arbre final. Le premier passage
  avait rougi sur deux points, depuis corrigés :
  - des littéraux BigInt dans les tests ;
  - la dérive de la matrice de consommation, qui a été régénérée.
- T2 (`npm run test:worktree -- --fast`) : vert en 7 min 43 s sur l'arbre
  d'avant les corrections de la revue, puis en 7 min 34 s sur l'arbre final.
- `wn-reviewer` (P1) : GO, ni P0 ni P1. Verdicts des cinq P2 :
  1. Matrice non indexée : corrigé, elle est indexée.
  2. NUL (`\u0000`) en 500 : corrigé. Le NUL est refusé à la route, avec un
     test unitaire et un test de route.
  3. Case « J'ai relu » restée cochée d'une version à la suivante : corrigé.
     La carte est désormais indexée par l'identifiant de la version courante.
  4. Aucune garde sur les lecteurs : corrigé. `ecritures.guard.test.ts` limite
     les lectures Prisma, le SQL et les imports de valeur au module et aux
     routes de l'atelier.
  5. Quatre affirmations inexactes du changelog : corrigées (contre-épreuve
     jouée à la main ; « ne peuvent pas s'interbloquer » ; plus d'« avant » ;
     « en vigueur »).
- Tests manquants signalés par la revue, ajoutés :
  - 403 sur un corps illisible ;
  - révision qui change de fiche, verrou et contrôle sur la fiche neuve ;
  - question 3 à la signature sur base réelle (cas 8).
  - Le banc 6 est requalifié en banc de fumée. L'ordre des verrous est
    prouvé en unitaire.
- PR #1893, CI vert sur efe1a0eb. Aucun bot n'a fait une revue qui compte :
  - CodeRabbit a sauté la PR (« fewer than 10 stars ») ;
  - PR-Agent n'a fait qu'une revue partielle : « Review coverage », 20
    fichiers exclus, donc la condition (c) de D-393 §2 n'est pas remplie.
  - Son unique remarque est corrigée. Un échec réseau affirmait « rien n'a
    été écrit » ; le message dit désormais que le résultat est inconnu et
    renvoie à l'état rechargé.
- Fusion de `main` (d2f95e5b, #1890), après vérification par `merge-tree`
  (aucun conflit) et au titre de la délégation du 2026-10-16. Le banc de
  parité CI est vert : l'étape neuve est dans `controles`, après
  `setup-node`.
- Revue CodeRabbit sur 00e4b9f0, demandée par « @coderabbitai review » :
  cinq remarques en ligne et un nitpick.
  - Corrigé : l'entrée `WN_POSITIONS_EXPERT` est déplacée dans la section A
    des drapeaux produit. Après la revue PR-Agent de 9da16140, la valeur
    d'allumage s'aligne sur la convention de cette section : `true`, et non
    plus `1`.
  - Corrigé : seule la dernière lecture s'applique (génération) ; une
    lecture plus ancienne arrivée après ne remplace plus l'état.
  - Corrigé : une lecture en échec ne démonte plus le brouillon. Un bouton
    « Recharger » s'affiche, et aucun geste ne part tant que l'état n'est pas
    relu.
  - Corrigé : après un versement réussi, le formulaire ne vide que ce qui a
    été envoyé.
  - Écarté : revalider la fraîcheur des claims sous le verrou. Les verrous
    sérialisent les écritures de l'atelier, pas le corpus ; une relecture sous
    verrou ne fermerait pas la fenêtre, puisqu'un claim peut changer juste
    après le commit. D-439 §2 traite ce cas à la lecture (« à relire, dérivé à
    la lecture, jamais réécrit »).
  - Corrigé (nitpick) : l'accent du cas « combinant » était précomposé. Il
    est maintenant décomposé, écrit en échappement.
- T2 après ces corrections : un premier passage rouge, puis un second vert.
  - Le rouge venait du banc de la file des lectures (« l'import périmé est
    compté »), sans lien avec le lot. Rejoué seul sur la base locale, il est
    vert.
  - Constat démontré sur ces deux passages, sans cause instruite : le banc
    est intermittent.
  - Le second passage est vert en 7 min 32 s.
- CodeRabbit a répondu dans les cinq fils. Quatre sont clos, et il retire
  lui-même le constat sur la fraîcheur après lecture du motif d'écart.
- Le cinquième fil reste ouvert. Après un geste, `envoi` repassait à faux
  avant la fin de la relecture, si bien qu'un second geste pouvait partir
  sur l'état d'avant. Corrigé : les gestes restent suspendus jusqu'au
  résultat de la relecture.

## Problèmes ouverts

- Question au responsable, soulevée par la revue : un brouillon occupe sa
  fiche (question 3, lue « non retirée »). Comme il ne se retire pas
  (question 1), il ne libère la fiche que si on le révise sans fiche, ou si
  on le signe puis le retire. Cette lecture littérale est livrée. Si le
  responsable veut que seules les positions signées occupent une fiche, le
  correctif tient à `ficheFondeeParUneAutre`.
- Délai des transactions Prisma : 5 s par défaut, comme dans le patron des
  fiches d'usage. Une attente de verrou plus longue rendrait une 500 au lieu
  d'un 409. La concurrence attendue est faible.

- La PR 4 (D-439 §4, A1, A2) : re-signature de `conflitsSourcesV1`, liste
  curée `fichesUsage` par conflit, affichage des arbitrages au cockpit. C'est
  un chemin clinique, retenu jusqu'à release-db. À sa livraison, réécrire le
  cas « aucune entrée ne porte de liste curée » de `registreConflits.test.ts`,
  qui rougira.
- Le banc d'A2 (deux arbitrages d'un même conflit sur deux fiches, listés au
  cockpit sans qu'aucun ne soit retenu) relève de la PR 4.
- Allumage de `WN_POSITIONS_EXPERT` puis versement des positions des cinq
  dossiers clos : gestes du responsable (D-439 §5, §6 (5)).
- Toujours hors lot, déjà signalé : la garde « REPEATABLE READ seul » de
  quatre migrations en production.

## Prochaine action exacte

État au 2026-11-06 à 16 h (UTC+1). La PR #1893 a vu passer les têtes
efe1a0eb, 00e4b9f0, 551717fe (fusion de `main`), 825b8836 et df287cd2. Le CI
est vert sur chacune, et CodeRabbit a revu 00e4b9f0 puis df287cd2. Ses cinq
premiers fils sont clos par lui.

Sa revue de df287cd2 a laissé deux remarques en ligne et un nitpick, tous
corrigés dans le commit qui porte ce paragraphe :
- le banc compte les attentes sur la clé tenue seulement (`pg_locks`) ;
- ce paragraphe, qui était périmé ;
- l'insécable fine du cas « espaces ».

Puis, sur 3ba7a180 et 9da16140 :
- CodeRabbit a d'abord été « rate limited ». Redemandé après la réouverture
  de son quota, il a revu df287cd2..9da16140 : « No actionable comments ».
- Il avait relevé que les échappements du banc étaient littéraux dans le
  fichier. Ils ont été réécrits en vrais `\uXXXX`.
- PR-Agent ne peut pas le remplacer : diff compressé, 19 fichiers exclus.
  Ses deux constats neufs sont corrigés dans le commit qui suit ce paragraphe.
  - Le drapeau s'allume par `true`, la convention de la section A, et non
    plus par `1`.
  - La carte d'un couple est indexée par sa tête. Un clic ne peut plus
    remplacer ou révoquer une tête que l'écran n'a pas montrée.

Reste : le CI et la revue de la tête neuve, un verdict par remarque, puis
« prête @sha » avec ce handoff. Ne pas merger : c'est l'essai D-373.

## Interdits encore actifs

- Ni migration ni `schema.prisma` ; ne pas toucher `conflitsSourcesV1.ts` dans
  ce lot.
- Production en lecture seule ; aucun texte de position au dépôt, ni dans un
  banc, ni dans un journal ; aucune sélection de fiche d'après un dossier
  patient.
- Une seule PR structurelle à la fois en file B ; essai D-373 : ne pas merger.
