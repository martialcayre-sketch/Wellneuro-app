# Handoff — 2026-09-15 — LOT-00 : la frontière patient du protocole, et ce qu'elle ne tranche pas

Deuxième lot de la campagne « 5. Actions — le protocole assisté ». Documentaire :
une décision, son cadrage, son fragment. Aucun code.

## Branche et état Git

- Branche `lot00-frontiere-patient`, partie d'`origin/main` à `c5903dc3`.
- Déjà sur `main` cette nuit : `512f631b` (#1103, clôture de `D-179`), `392e0370`
  (#1104, ouverture de la campagne), `c5903dc3` (#1106, LOT-01 / `D-188`).

## Ce qui est tranché

`D-189` — quatre points sur cinq :

1. **Liste FERMÉE de sources citables dans `purpose`, à deux entrées** : le libellé
   d'axe signé — que le serveur re-dérive seul depuis `selected_priority_id` par
   `resoudreRegleSignee`, sans que l'écran ait rien à désigner — et la tête de
   l'objectif négocié actif, citée par identifiant et recopiée au serveur. La
   provenance se **constate** par comparaison de textes et tombe au premier
   caractère réécrit.
2. **Jamais citables** : le motif praticien de sélection et le rationale du moteur
   (« Déclencheur atteint — score 8 ≥ 7 »). Le schéma annonçait de `rationale`
   qu'« une version de protocole le citera » — tranché dans l'autre sens, et écrit.
3. **Aucune source pour le critère J21.**
4. **Garde de registre anxiogène** sur tout champ servi au patient, en **refus
   confirmable** à jeton — et **la commande d'écran part dans le même lot que la
   garde**, parce que celle du booklet était confirmable depuis toujours sans
   qu'aucun écran ne l'envoie.
5. Clause de fermeture reconduite.

## Ce qui n'est PAS tranché, et pourquoi c'est un fait nouveau

**Le point 1 du cadrage — la forme de la vue patient — tombe.** Le 2026-09-14,
j'avais présenté « brancher le contrat `PatientProtocolView` » comme un geste
disponible : « écrit, testé, et simplement jamais appelé ». **C'est faux sur le seul
point qui compte** : `buildPatientProtocolView` exige une `DecisionCard`, et il
n'existe **aucune table `decision_cards`**. La carte n'est reconstruite que sur la
route du cockpit praticien, par `construireChaineC1Tolerante`. La route du portail
le disait déjà — c'est la raison écrite de son `priorityLabel` « différé » : « issu
de la DecisionCard NON persistée ».

L'arbitrage rendu sur cette question repose donc sur une prémisse fausse et ne vaut
pas. Trois voies, décrites au cadrage :

1. **Recomposer la carte sur le chemin patient** — `buildPatientProtocolView` vérifie
   `protocolDraft.decisionCardInputHash === decisionCard.inputHash`, qui dérive dès
   que le dossier bouge. Sur 21 jours c'est le cas normal : la vue lèverait au lieu
   de servir.
2. **Persister la carte** — une migration, que la campagne s'est interdite (`D-087`).
3. **Ne pas brancher le contrat** — étendre la projection existante aux trois actions
   et y ajouter le libellé d'axe re-dérivé au serveur, qui ne demande aucune carte.

**Le LOT-03 attend cet arbitrage. Le LOT-04 n'attend rien** : il dépend des points 2
à 5, tous rendus.

## Fichiers

- `docs/DECISIONS.md` — `D-189` en tête.
- `docs/claude/campagnes/2026-09-14-protocole-assiste/CADRAGE_FRONTIERE_PATIENT_2026-09-15.md`
- `changelog.d/2026-09-15-frontiere-patient-du-protocole.md`
- Le fichier du lot, clos avec ses résultats.

## Validations exécutées

- T1 vert, après `npx prisma generate` — obligatoire dans un worktree neuf, et c'est
  la deuxième fois cette nuit.
- Diff documentaire seul : aucun T2 requis.

## Numérotation — deux collisions dans la même soirée

`D-187` a été pris trois fois de suite : par un sujet de commit qui ne l'écrivait pas
au registre, puis par cette session, puis par l'autre — qui l'a écrit. Le garde
`scripts/lib/decisions-numerotation.mjs` refuse toute lacune (« un numéro ne se
libère jamais ») : il interdit donc de céder poliment un numéro, et le registre
tranche contre le journal Git. Cette session s'est arrêtée à `D-188` puis `D-189`.

## Prochaine action exacte

**LOT-02** — restituer la décision à côté du formulaire, refuser le type et la charge
posés en silence, écrire l'E2E qui traverse le constructeur à l'écran. Aucune
décision requise. Une contrainte repérée : `DecisionSummaryCard` code en dur son
titre « Priorité et limites » et l'`id` `decision-summary-title` **à deux endroits** ;
un second montage demande donc une prop de titre et un `useId()`.

## Interdits encore actifs

Inchangés : aucune identité patient réelle dans le dépôt ; production en lecture par
`scalingo run -d`, écriture par migration relue puis `release-db` approuvée ; pas de
`schema.prisma` ni de clinique/scoring sans demande explicite.
