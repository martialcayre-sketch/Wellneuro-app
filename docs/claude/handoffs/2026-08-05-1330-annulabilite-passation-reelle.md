# Handoff — LOT-07, l'annulabilité se décide sur une passation réelle

**Date** : 2026-08-05, 13:30
**Campagne** : `2026-08-04-agenda-alimentaire`
**Lot** : `LOT-07` — Déverrouiller ne doit pas coûter l'annulation
**Branche** : `worktree-agenda-ali-l5b`

## Pourquoi ce lot, et pas LOT-06

`LOT-06` est le **barème**, et il attend un recueil suffisant pour calibrer :
`MIN_JOURS_AGREGATS = 7` (`web/src/lib/agenda-alimentaire/types.ts:66`),
`calculerAgregatsAli` rend `null` en dessous, et le recueil pilote en est à une
journée sur vingt et une. Il n'y a rien à calibrer avant J+7 au plus tôt, la
clôture à J+21 pour un barème honnête. Ce lot prend l'un des trois reliquats
nommés à la clôture de `LOT-05`.

**Numérotation.** Le reliquat a d'abord été écrit `LOT-05b` ;
`scripts/wn-campaign-audit.mjs` refuse cette forme — il lit l'ordinal en tête du
nom de fichier et compte `LOT-05b` comme un doublon de `LOT-05`
(`duplicate_lot_ordinal`, code de sortie 1). Plutôt qu'assouplir un garde ou
renuméroter le barème une seconde fois en deux jours, les reliquats prennent les
premiers ordinaux libres **après** `LOT-06` : `LOT-07` (celui-ci) et `LOT-08` (à
écrire). Le numéro ordonne les fichiers, il ne date rien.

## Ce que le lot a changé

Un seul prédicat, `estAnnulable` (`web/src/lib/praticien/annulabilite.ts`),
importé par `POST /api/praticien/assignations/annulation` **et** par
`PatientsPanel.tsx` — c'est leur divergence qui avait produit le défaut. Forme
positive, donc fail-closed : `statutReponses` est un `String` libre sans enum.

`GET /api/praticien/patients` expose `aPassation` — un **fait**, jamais un
verdict `annulable` : un DTO de liste qui transporte une décision d'autorisation
diverge au premier changement du prédicat serveur. Deux branches de construction
de réponse dans ce handler, paginée et non paginée ; **les deux** le portent.

## Ce que le lot a appris

**Le gain revendiqué n'était pas le bon.** Le chemin `non_rempli → deverrouille`
n'a aucun appelant d'écran, et la production ne compte **aucune** ligne dans cet
état : la population débloquée est vide. Ce qui se répare vraiment n'exige aucun
appel direct — `submit` crée la `QuestionnaireReponse` puis marque l'assignation
**hors transaction**, et une annulation tombant entre les deux écrivait `Annulée`
que `submit` réécrasait aussitôt. L'annulation disparaissait en silence. Dire
« latent, population vide » et livrer quand même est plus honnête que de vendre
un incident qui n'a pas eu lieu.

**Une écriture sans effet n'est pas un succès — et le premier jet le disait.**
La revue adversariale a trouvé le bloquant : l'`updateMany` avait sa garde
répétée dans le `where` *précisément* pour pouvoir ne rien matcher, et son
résultat était jeté. La route rendait `ok: true` sur zéro ligne écrite. C'est le
défaut que le lot supprime, **requalifié en succès silencieux** deux fonctions
plus bas. Aucun test ne le couvrait : `updateMany.mockResolvedValue({ count: 1 })`
était armé dans le `beforeEach` et aucun test ne le remplaçait — une fixture qui
ne peut pas bouger, motif déjà payé ici.

**Un commentaire d'un fichier tiers décrivait toujours le défaut comme actuel.**
`web/src/app/api/praticien/agenda-alimentaire/route.ts:38-47` affirmait encore que
`deverrouille` « retire silencieusement l'annulabilité ». Le fichier de lot le
citait comme preuve du défaut sans le corriger. Un lot suivant l'aurait lu comme
un trou ouvert et aurait rouvert un chantier sans objet, ou ajouté une garde
divergente — exactement ce que le prédicat partagé existe pour empêcher.

**Deux tests « négatifs » ne discriminaient rien.** `deverrouille` +
`aPassation: true` → refusé rend le même verdict avant et après le lot (l'ancien
code refusait déjà tout `!== 'non_rempli'`). Le test qui porte la preuve est
`non_rempli` + une réponse → 409, ajouté après la revue, côté route **et** côté
écran.

## Vérifié en base, pas supposé

Lecture seule le 2026-08-05, `execute_sql` :

| `statut` / `statut_reponses` | lignes | avec réponse | sans réponse |
|---|---|---|---|
| `Complété` / `verrouille` | 84 | 84 | 0 |
| `En attente` / `non_rempli` | 69 | 0 | 69 |
| `Annulée` / `non_rempli` | 4 | 0 | 4 |

Aucune ligne `deverrouille`. Aucune assignation dans l'état incohérent que le
comptage attrape. Les 15 `questionnaire_reponses` à `id_assignation` nul (sur 99)
n'appartiennent à aucune assignation — les 84 passations réelles sont toutes
liées, donc `aPassation` ne peut pas rendre `false` sur une passation existante.
C'était une hypothèse implicite du prédicat ; elle est maintenant vérifiée.

## Ce qui reste ouvert

- **`@@index([idAssignation])` sur `QuestionnaireReponse`.** Seul lien souple du
  schéma sans index, et ce lot **ajoute** une lecture sur cette colonne à la
  route praticien la plus appelée. Sans gravité au volume actuel (99 lignes,
  mesuré) ; à porter par une PR de migration distincte avant que la table ne
  grossisse.
- **`POST /api/praticien/agenda-sommeil/relance`, même racine.** La ligne 127
  refuse sur `!== 'non_rempli'` en disant « déjà clôturé » (faux sur
  `deverrouille`), et la ligne 135 applique `isDeadlineExpired` **sans**
  l'exemption `deverrouille` que portent quatre autres routes. Deux refus, deux
  motifs faux. Série distincte.
- **La course `submit` reste ouverte d'un côté.** Une annulation entrée *avant*
  la création de la réponse est toujours écrasée par `submit`. Fermer ce côté
  exige de transactionner `submit`.
- **Le plafond de 40 lignes** (`MAX_ASSIGNATIONS`) : le geste réparé n'est
  proposé que sur les lignes affichées. Classe déjà payée sur `Q_ALI_01`.
- **`LOT-08`, les deux reliquats de lecture** : aucune bannière ne dit au
  praticien que le recueil est fermé quand `WN_AGENDA_ALI` est éteint, et le
  tiroir tait `canal`, `soumisLe`, `supersedesJourId` — donc le taux de
  correction dont `LOT-06` aura besoin. Les trois champs sont **déjà** au schéma,
  déjà sélectionnés par `SELECT_JOUR` et déjà rendus par l'API : c'est
  `JourneeCard` qui ne les reçoit pas. Lot d'affichage, pas d'API.
- **La modale de confirmation d'annulation ne dit pas combien de journées
  d'agenda existent** — le praticien retire un recueil qui contient des données
  sans que l'écran le lui dise. Préexistant, à `LOT-08`.

## Note d'outillage

`node scripts/wn-cycle.mjs` **écrit** `.wn/state.json` (`git.last_commit`,
`updated_at`) même sans `--appliquer`, alors que les deux verbes sont censés être
disjoints — « rapporte » contre « répare ». Constaté sur le checkout principal,
restauré. À vérifier avant de se fier au fait qu'une lecture d'état soit inerte.

## Prochaine action

Ouvrir la PR, lire son CI (`node scripts/wn-attendre-ci.mjs <N>`, code `0` seul),
merger. Puis, depuis `main`, écrire `LOT-08` — ou attendre J+7 pour `LOT-06`.
