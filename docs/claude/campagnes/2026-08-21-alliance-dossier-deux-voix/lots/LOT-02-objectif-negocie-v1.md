---
id: "LOT-02"
statut: "livré à la PR (2026-08-22) — service, routes praticien et surface cockpit sur les tables du LOT-01 ; six gardes structurelles vues rouges par mutation réelle puis vertes ; ratification LUE, jamais écrite (le geste patient reste au LOT-06) ; aucune migration, aucune colonne"
dépend_de: "LOT-01 (migration appliquée, constatée par conteneur le 2026-08-22 : 58 migrations up to date, contrat alli_ vert)"
---

# LOT-02 — L'objectif négocié v1

## But

À la fin de ce lot, le praticien peut poser dans le dossier un **objectif
négocié** : l'énoncé du patient, sa reformulation, la priorité clinique, et ce
qui est assumé « non traité pour l'instant » — daté, motivé, append-only. La
ratification patient (le geste au portail) appartient au LOT-06 ; ce lot en
pose l'état et l'API.

## Ancrage mesuré (2026-08-22)

**Trois** sources d'énoncé existent déjà — elles s'affichent comme **matériau
de départ**, elles ne se réécrivent pas, et elles ne pré-remplissent jamais la
saisie (une phrase dite à l'anamnèse n'est pas une phrase dite en
négociation) :

- l'anamnèse : `motif_principal` (seul requis — `consultation/anamnese.ts:44`),
  `objectif_prioritaire` (`anamnese.ts:64`) et `attentes` (`anamnese.ts:66`),
  figées dans la colonne `anamnese Json?` (`schema.prisma:102`) ;
- la plainte dominante Q_MOD_03 lue par la chaîne C1
  (`clinical-engine/chaineC1.ts:172`) et déjà affichée en tête du cockpit
  (`D-054`).

> **Corrigé à l'exécution (2026-08-22)** : le cadrage citait `schema.prisma:96`
> — cette ligne est `consentementHorodatage`, la colonne `anamnese` est en
> `:102` ; et il ne nommait que deux sources, alors qu'`objectif_prioritaire`
> est littéralement le matériau d'un objectif négocié, déjà lu par
> `runtimeFromPrisma.ts` et affiché au cockpit.
>
> **La plainte dominante n'est pas reprise par ce lot** : elle n'est produite
> que par le POST de confirmation d'épisode (`api/praticien/cockpit/route.ts`),
> jamais par une route de lecture. La recalculer aurait été toucher au moteur.
> Le panneau renvoie au bloc `D-054` du cockpit, qui l'affiche déjà.

## Périmètre

- Service + routes praticien (création, reformulation, priorisation,
  « non traité pour l'instant ») sur les tables du LOT-01.
- Surface cockpit : saisie et lecture de l'objectif courant et de sa
  trajectoire (chaque révision visible, rien d'écrasé).
- Garde structurelle par test : **aucun champ de score n'entre dans un
  objectif** (`DC-27`) ; la reformulation est libre mais l'objet ne porte ni
  code diagnostique ni référence de classification (`DC-31`, `DC-32`).

## Fichiers probables

- `web/src/lib/` (nouveau module objectif négocié + bancs).
- `web/src/app/api/praticien/` (routes + bancs de route).
- `web/src/components/patient-cockpit/` (surface praticien).

## Interdits

- Ne pas modifier `anamnese.ts`, la chaîne C1 ni aucun moteur de scoring.
- Aucun calcul, agrégat ou score dérivé d'un objectif.
- Aucune suppression ni mise à jour en place d'une entrée — correctif =
  nouvelle entrée référençant l'ancienne.
- Aucun texte adressé au patient dans ce lot (c'est LOT-04/LOT-06, derrière
  le circuit du Socle).

## Dépendances

LOT-01 releasé et vérifié.

## Étapes

1. Contrat du module (états, transitions, invariants) + bancs rouges.
2. Service et routes ; surface cockpit.
3. Gardes structurelles vues rouges (mutation) puis vertes.
4. T2 ; fragment `changelog.d/` ; revue proportionnelle au risque.

## Tests

- Bancs de route (droits praticien, append-only prouvé : une « modification »
  crée une entrée, l'historique reste lisible).
- Garde anti-score et anti-diagnostic vues rouges quand débranchées.
- Deux dates asserties (événement ≠ enregistrement).
- T2 avant commit.

## Critères de done

- [x] Objectif négocié créable, reformulable, priorisable, avec « non traité
      pour l'instant » daté — trajectoire complète visible au cockpit (rail,
      phase « Compréhension », hors runtime clinique : le panneau reste
      visible sans épisode confirmé).
- [x] Append-only prouvé par banc ; gardes de forme **vues rouges par mutation
      réelle** — G1 clés épinglées (type-check), G2 aucune propriété de mesure
      ordonnée, G3 la priorité ne s'ordonne pas, G4 `creeLe` jamais transmis,
      G5 aucun `update`/`delete` hors l'effacement nommé, G6 aucun moteur
      clinique importé.
- [x] Aucun moteur ni fichier clinique touché ; aucune colonne, aucune
      migration ; T2 vert ; fragment `changelog.d/` écrit.

## Corrections issues de la revue (2026-08-22, `wn-reviewer` — GO sous réserves)

- **Un 500 atteignable sans session.** `null`, `42`, `"texte"` et `[]` sont du
  JSON valide : le `catch` du parse ne les voyait pas, et `body.idPatient`
  levait **avant** la garde d'authentification. Corrigé, et quatre bancs le
  prouvent — ils rendent `500` et `401` quand on retire le correctif.
- **Deux gardes plus étroites que leur intitulé.** G6 n'énumérait que quatre
  noms feuilles : `clinical-engine` ne couvre pas `clinical/`, si bien qu'un
  `import { orienter } from '@/lib/clinical/orientationService'` passait
  vert. Remplacé par des **préfixes de répertoire**, et vu rouge sur ce cas
  précis. G2 et G6 ne balayaient que le module et la route : le **panneau**
  entre sous garde — c'est au rendu qu'un tri de `priorite` serait le plus
  naturel à introduire, et G3 n'assertionne que `objectifsCourants`, que l'UI
  n'est pas obligée d'employer pour ordonner.
- **La ratification n'était tenue que par un mock.** L'invariant « lue, jamais
  écrite » repose désormais sur une garde structurelle : aucune écriture de
  `ratificationObjectif` sous `web/src/app/api/**` ni `web/src/lib/**`, hors
  l'effacement RGPD nommé.
- **La troncature au clavier.** Les `maxLength` coupaient silencieusement un
  collage trop long — la seule troncature qui restait sur le chemin, après que
  la route l'a bannie. Retirés au profit d'un **compteur visible** : le
  dépassement se voit, la saisie reste intacte, et c'est le 400 qui refuse.
- **Reformuler perdait la priorité en silence.** Les champs praticien de la
  version révisée sont maintenant repris ; l'énoncé du patient, lui, reste
  recopié côté serveur depuis la ligne visée.
- **Deux durcissements mineurs** : `MESSAGES_REFUS` est exhaustif par le type
  (un motif neuf sans message ne compile plus), et la recherche de la version
  supplantée est scopée au dossier — sans quoi elle ne pouvait pas emprunter
  l'unique index de la table et parcourait une table qui ne fait que croître.

## Dettes nommées, sans lot d'accueil

- **Deux têtes de chaîne restent possibles.** La cible d'une révision est
  vérifiée puis refusée en 409 si elle est déjà supplantée — une lecture
  suivie d'une écriture n'est pas étanche à une course. Le parti pris est de
  ne jamais départager en silence : `objectifsCourants` rend **toutes** les
  têtes et l'écran les affiche toutes (`DC-30`). Poser un verrou en base
  serait une décision propre.
- **Aucune cadence** sur les routes praticien, comme partout ailleurs dans le
  dépôt — risque assumé, nommé ici pour ne pas être redécouvert. Sur une table
  append-only qu'aucune purge ne raccourcit, un POST répété allonge une chaîne
  indéfiniment.
- **Le journal d'accès grossit d'une ligne par passage sur l'onglet
  « Compréhension »** : le panneau est démonté puis remonté à chaque bascule et
  retire le GET. La purge de `journal_acces_dossiers` reste opportuniste.
- **Un dossier désactivé (`actif: false`) reçoit le message « clôturé »**, qui
  décrit un autre état — comportement hérité de `patient/cycleDeVie`, partagé
  par les autres routes praticien. Corriger le message est un geste transverse,
  hors périmètre de ce lot.
- **La route reste un oracle d'existence de dossier** (404 `patient_not_found`
  ≠ 403 `forbidden`), alors qu'elle refuse de l'être pour un objectif.
  Arbitrage du dépôt sous hypothèse mono-praticien, pas une décision de ce lot.
- **Les `attentes` recopiées de l'anamnèse ne sont pas bornées en nombre** :
  la colonne `anamnese Json?` est écrite en amont par le portail, et ce lot ne
  fait que la relire.
