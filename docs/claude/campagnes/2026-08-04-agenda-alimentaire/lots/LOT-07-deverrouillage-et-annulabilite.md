---
id: "LOT-07"
titre: "Déverrouiller ne doit pas coûter l'annulation"
statut: "fait"
dépend_de: "LOT-05"
---

# LOT-07 — Déverrouiller ne doit pas coûter l'annulation

Reliquat nommé à la clôture de `LOT-05` (« Ce qui reste ouvert »).

**Pourquoi `LOT-07` et pas `LOT-06`.** `LOT-06` reste réservé au **barème**, qui
attend un recueil suffisant pour calibrer — sept journées au minimum
(`MIN_JOURS_AGREGATS`, `web/src/lib/agenda-alimentaire/types.ts:66`), la clôture
des 21 jours en pratique ; le recueil pilote en est à une journée. Ce lot a
d'abord été numéroté `LOT-05b`, forme que `scripts/wn-campaign-audit.mjs`
refuse : il lit l'ordinal en tête du nom de fichier et compte `LOT-05b` comme un
doublon de `LOT-05` (erreur `duplicate_lot_ordinal`). Plutôt que d'assouplir un
garde ou de renuméroter le barème une seconde fois en deux jours, le reliquat
prend le premier ordinal libre. **Le numéro ordonne les fichiers, il ne date
rien** — la campagne le dit déjà de sa propre renumérotation, « positionnelle,
pas chronologique ».

## But

Un agenda alimentaire vivant, jamais soumis, doit rester annulable. Il ne l'est
plus dès qu'un praticien appelle le déverrouillage : le statut posé n'a pas de
retour, et la garde d'annulation le lit comme la preuve d'une passation qui n'a
jamais eu lieu.

Une fois le lot fait, aucun chemin ne rend inannulable une assignation qui n'a
rien reçu — et le refus, s'il tombe, tombe pour une raison vraie.

## Constat

Deux routes, une hypothèse qui ne tient pas entre elles.

- `PATCH /api/praticien/assignations`
  (`web/src/app/api/praticien/assignations/route.ts:271-274`) écrit
  `statutReponses: 'deverrouille'` **sans regarder l'état précédent**. La route
  garde l'appartenance et refuse les instruments suspendus (`IDS_SUSPENDUS`) ;
  elle ne demande jamais s'il y a quelque chose à rouvrir.
- `POST /api/praticien/assignations/annulation`
  (`web/src/app/api/praticien/assignations/annulation/route.ts:61`) refuse dès
  que `statutReponses !== 'non_rempli'`. Son commentaire dit l'intention :
  « une assignation déjà remplie porte une passation clinique ; l'annuler la
  masquerait ». L'intention porte sur la **passation**, la garde porte sur le
  **statut**.

Les deux se croisent exactement sur le cas où le déverrouillage a été appliqué à
une assignation jamais remplie : le statut n'est plus `non_rempli`, aucune
passation n'existe, l'annulation est refusée — et **aucun chemin ne ramène à
`non_rempli`**. Le refus est définitif, et sa raison est fausse.

C'est la classe déjà payée sur la clôture d'agenda : *un statut ne vaut que si
tous les chemins qui l'écrivent en connaissent la charge*.

### Le gain concret n'est pas celui-là — et il est réel

Le chemin `non_rempli → deverrouille` **n'a aucun appelant d'écran**. Le seul
déclencheur du `PATCH` est `onDebloquer`
(`web/src/components/FichePatientPanel.tsx:604-618`), rendu sur une liste chargée
en `?statutReponses=modification_demandee` : le geste part toujours d'une
assignation déjà soumise. Le dépôt le note déjà mot pour mot en
`web/src/app/api/praticien/agenda-alimentaire/route.ts:43-47`. La population
débloquée par ce lot est donc, à ce jour, vraisemblablement **vide en
production** — c'est un durcissement de cohérence, pas la réparation d'un
incident constaté.

Ce qui se répare vraiment n'exige aucun appel direct. `submit` crée la
`QuestionnaireReponse` (`web/src/app/api/patient/submit/route.ts:301`) puis
marque l'assignation `Complété`/`verrouille` (`:317`) — **hors transaction**. Une
annulation qui tombe entre les deux lit `non_rempli`, accepte, écrit `Annulée`…
que `submit:317` réécrit aussitôt. **L'annulation disparaît en silence.** Une
garde qui exige l'absence de passation ferme ce trou-là.

### Ce que ce constat n'est pas

- **Ce n'est pas propre à `Q_ALI_09`.** Les deux routes sont générales ; l'agenda
  alimentaire est seulement l'instrument où le coût se voit — 21 jours de recueil
  vivant qu'on ne peut plus arrêter, et le seul instrument pour lequel
  `deverrouille` est le **seul** état non-`non_rempli` atteignable (`verrouille`
  lui est fermé : `submit` refuse l'instrument, aucune route de clôture
  alimentaire n'existe).
- **Ce n'est pas l'annulation d'un agenda qui a des journées.** Une assignation
  `Q_ALI_09` reste `non_rempli` alors même que des journées sont notées
  (`LOT-05`, temps A : une journée saisie, `statut_reponses = "non_rempli"`).
  Annuler un agenda déjà commencé est le geste **voulu** — `LOT-05` a montré que
  `'Annulée'` est l'état réellement atteignable. Rien de ce lot ne doit le
  refermer.

### Vérifié en base, le 2026-08-05

Trois affirmations de ce lot se lisent en une requête plutôt que de rester des
suppositions. Lecture seule (`execute_sql`), sur `assignations` jointe au
comptage de `questionnaire_reponses` :

| `statut` / `statut_reponses` | lignes | avec réponse | sans réponse |
|---|---|---|---|
| `Complété` / `verrouille` | 84 | 84 | 0 |
| `En attente` / `non_rempli` | 69 | 0 | 69 |
| `Annulée` / `non_rempli` | 4 | 0 | 4 |

Ce que ça établit :

- **Aucune ligne `deverrouille` n'existe en production.** La population que ce
  lot débloque est bien vide aujourd'hui — c'est un durcissement, et le dire
  autrement rendrait la revue suspecte.
- **Aucune assignation n'est dans l'état incohérent** que le nouveau comptage
  attrape (`non_rempli` portant une réponse) : le correctif ne change l'issue
  d'aucune ligne existante. Il ferme une fenêtre, il ne répare pas un stock.
- **Les 15 `questionnaire_reponses` à `id_assignation` nul** (héritage GAS, sur
  99 lignes au total) n'appartiennent à aucune assignation : les 84 passations
  réelles sont toutes correctement liées. `aPassation` ne peut donc pas rendre
  `false` sur une passation existante — l'hypothèse implicite du prédicat tient,
  et elle a été vérifiée plutôt que supposée.

## Périmètre

Le prédicat vit **à un seul endroit**, et les deux portes qui décident du geste
l'importent — c'est leur divergence qui a produit ce lot.

- `web/src/lib/praticien/annulabilite.ts` (nouveau) — `estAnnulable({ statut,
  statutReponses, aPassation })`, en forme **positive** (liste blanche des
  statuts annulables) : `statutReponses` est un `String` libre sans enum, une
  cinquième valeur future doit **fermer** l'annulation, pas l'ouvrir.
- `web/src/app/api/praticien/assignations/annulation/route.ts` — la garde teste
  ce que son commentaire annonce (une passation : au moins une
  `QuestionnaireReponse` portant cette assignation), pas un statut qui en tient
  lieu. Écriture par `updateMany` avec la garde d'état répétée dans le `where`,
  plutôt qu'un `update` à l'aveugle après lecture.
- `web/src/app/api/praticien/patients/route.ts` — un champ **`aPassation`**
  (un fait), jamais `annulable` (un verdict) : un DTO de liste qui transporte une
  décision d'autorisation diverge au premier changement du prédicat serveur. Une
  seule requête par page, et **les deux branches** de construction de réponse,
  paginée et non paginée.
- `web/src/components/PatientsPanel.tsx` — le miroir client appelle le même
  prédicat. Sans lui, le geste réparé reste inatteignable par l'interface.
- Les tests des quatre fichiers ci-dessus.

**Le `PATCH` n'est pas touché.** Refuser de déverrouiller un `non_rempli` serait
un changement de comportement sur un chemin sans appelant d'écran, et
supprimerait une exemption de date limite que quatre routes portent déjà. Le
défaut n'est pas d'écrire `deverrouille` : il est de le **lire** comme une
passation.

## Interdits

- **Aucune migration, aucun changement de `schema.prisma`.** `statutReponses`
  est un champ existant ; le défaut est dans la transition, pas dans la forme.
  Si le plan conclut le contraire, il s'arrête et demande.
- Aucune écriture en base de production, aucun backfill.
- Ne pas affaiblir le refus `IDS_SUSPENDUS` du `PATCH` (lot #406, garde
  délibérée), ni la garde d'appartenance de l'une ou l'autre route.
- Ne pas rendre annulable une assignation qui porte une passation réelle : la
  portée de `POST .../annulation` ne s'élargit pas, elle se corrige.
- Ne pas toucher au portail patient, au barème, ni au panneau praticien de
  l'agenda — deux autres reliquats (bannière drapeau éteint, tiroir muet sur
  `canal` / `soumisLe` / `supersedesJourId`) partent en `LOT-08`.

## Fichiers probables

- `web/src/lib/praticien/annulabilite.ts` + son test (nouveaux)
- `web/src/app/api/praticien/assignations/annulation/route.ts` + son test
- `web/src/app/api/praticien/patients/route.ts` + son test
- `web/src/components/PatientsPanel.tsx` + son test

## Ce que ce lot ne fait pas — nommé, pas fait

Une classe de défaut qu'on ne nomme pas se redécouvre au lot suivant.

- **L'index `@@index([idAssignation])` sur `QuestionnaireReponse`.** C'est le
  seul lien souple du schéma sans index, et il est lu par cette colonne en au
  moins quatre endroits — dont l'intérieur du `SELECT … FOR UPDATE` de
  `web/src/lib/agenda-sommeil/cloture.ts:100`, là où un balayage séquentiel coûte
  le plus. **Ce lot ajoute une lecture sur cette colonne à la route praticien la
  plus appelée** (`GET /api/praticien/patients`, chargée au montage et à chaque
  changement de filtre) : la dette n'est plus seulement préexistante, elle est
  sollicitée davantage. Mesuré en production le 2026-08-05 : `questionnaire_reponses`
  compte **99 lignes**. Un balayage séquentiel de 99 lignes par chargement ne se
  mesure pas — l'index est un **report avec suite nommée**, pas « pas besoin » :
  une PR de migration distincte, avec confirmation explicite, avant que la table
  ne grossisse.
- **`POST /api/praticien/agenda-sommeil/relance`, même racine.** La ligne 127
  refuse sur `statutReponses !== 'non_rempli'` en disant « Ce recueil est déjà
  clôturé » — faux sur un `deverrouille` — et la ligne 135 applique
  `isDeadlineExpired` **sans** l'exemption `deverrouille` que portent les quatre
  autres routes. Deux refus, deux motifs faux. Série distincte.
- **La modale de confirmation ne dit pas combien de journées d'agenda existent.**
  Le praticien retire un recueil qui contient des données sans que l'écran le lui
  dise. Défaut préexistant, à `LOT-08`.
- **La course `submit` n'est fermée qu'à moitié, et il faut dire laquelle.** Ce
  qui est fermé : une soumission arrivée **après** le comptage ne peut plus être
  écrasée — l'`updateMany` ne matche plus rien, et la route rend 409 au lieu
  d'un faux succès. Ce qui ne l'est pas : une annulation entrée **avant** que
  `submit` ne crée la réponse est toujours écrasée par `submit:317`, exactement
  comme avant ce lot. Fermer ce côté-là exigerait de transactionner `submit` —
  hors périmètre, et à ne pas prétendre fait.
- **Le plafond de 40 lignes de la liste des assignations**
  (`MAX_ASSIGNATIONS`, `web/src/app/api/praticien/patients/route.ts:7`). Le geste
  redevenu possible n'est proposé que sur les lignes affichées : au-delà du
  plafond, la route l'accepte et l'écran ne le montre pas. Défaut préexistant, et
  classe déjà payée sur `Q_ALI_01` — *une action par ligne ne vaut que ce que
  vaut la pagination de la liste qui la porte*. Non traité ici.

## Tests

- **T1** `npm run check` après chaque édition.
- **T2** `npm run test:worktree -- --fast` avant commit — palier de la classe API.
- Unitaires ciblés, chacun devant **échouer sur le code d'avant** — le vérifier,
  ne pas le supposer :
  - table de vérité de `estAnnulable` : les quatre valeurs de `statutReponses`
    × `aPassation` × `statut` ;
  - annuler une assignation posée à `deverrouille` **sans** passation → accepté ;
  - annuler une assignation `deverrouille` **avec** passation → refusé (409) ;
  - le comptage **n'est pas émis** quand la clause d'état refuse déjà (preuve du
    court-circuit) ;
  - `aPassation` correct dans **les deux** branches de `GET /api/praticien/patients`,
    paginée et non paginée ;
  - le bouton « annuler » présent sur `deverrouille`/`aPassation: false`, absent
    sur `deverrouille`/`aPassation: true` ;
  - annuler un agenda `Q_ALI_09` `non_rempli` portant des journées → toujours
    accepté (non-régression de `LOT-05`) ;
  - appartenance et idempotence (`statut === 'Annulée'` non ré-écrit) inchangées.

## Critères de done

- Aucune séquence d'appels des routes existantes ne laisse une assignation sans
  passation définitivement inannulable.
- Le refus d'annulation, quand il tombe, se justifie par une passation
  existante — pas par un statut qui en tient lieu.
- Un seul prédicat porte la décision, importé par la route **et** par l'écran.
- Les tests ci-dessus existent et échouent sur le code d'avant ; T2 vert.
- Revue adversariale passée (`Agent(wn-reviewer)`), constats traités ou nommés.
- `CAMPAGNE.md`, une entrée `SESSION_LOG.md`, un fragment
  `docs/claude/handoffs/` et un fragment `changelog.d/` écrits **sur la branche
  vivante**, avant la PR.

## Résultats

Livré le 2026-08-05.

**Ce qui a changé.** Un prédicat unique (`estAnnulable`), la garde d'annulation
réécrite sur la passation, `aPassation` exposé par `GET /api/praticien/patients`
dans ses deux branches, et le miroir de `PatientsPanel` aligné sur le même
prédicat.

**Le bloquant de la revue adversariale.** L'`updateMany` portait sa garde d'état
répétée dans le `where` *précisément* pour pouvoir ne rien matcher — et son
résultat était jeté. La route rendait `ok: true` sur zéro ligne écrite : le
défaut que ce lot supprime, **requalifié en succès silencieux** deux fonctions
plus bas. Aucun test ne le couvrait, `updateMany.mockResolvedValue({ count: 1 })`
étant armé dans le `beforeEach` et jamais remplacé — une fixture qui ne peut pas
bouger, motif déjà payé ici. Corrigé : zéro ligne touchée rend 409.

**Deux constats de plus, de la même famille.** Un commentaire de
`web/src/app/api/praticien/agenda-alimentaire/route.ts:38-47` décrivait toujours
le défaut comme actuel — le fichier de lot le citait comme preuve sans le
corriger, et un lot suivant l'aurait lu comme un trou ouvert. Et deux tests
« négatifs » ajoutés (`deverrouille` + `aPassation: true` → refusé) rendaient le
même verdict avant et après : c'est `non_rempli` + une réponse → 409, ajouté
après la revue, qui porte la preuve.

**Validation.** T1 vert. T2 (`test:worktree --fast`) vert : 3 971 tests unitaires
sur 362 fichiers, **120 E2E passés, aucun échec**. Une passe intermédiaire avait
échoué sur `portail-lien-magique.spec.ts:48` — une assertion de gigue
(`|Δdurée| < 800 ms`, mesuré 1109 ms) dans le test anti-énumération, sans chemin
causal depuis ce lot : deux passes vertes sur trois, et le test mesure des durées
d'horloge sur une machine chargée par Playwright. Anti-secrets vert, audit de
campagnes vert (0 erreur).
