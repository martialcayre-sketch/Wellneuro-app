### Ajouté — jalons J21/J42/J90 confirmables et momentum par besoin (LOT-07, `D-058`)

- **Le jalon n'est plus codé en dur.** Le cockpit demandait `milestone=T0`
  quoi qu'il arrive : J21, J42 et J90 étaient inatteignables depuis
  l'interface alors que le back les acceptait déjà. Le jalon dû se dérive
  désormais de la trajectoire (`resoudreJalonDu`) — fenêtres de
  `JOURS_JALON` ± `TOLERANCE_JOURS_JALON`, aucun nombre nouveau. **Hors
  fenêtre, rien n'est proposé** : ni le message seul (première rédaction,
  prise en défaut par la revue — le panneau de confirmation restait actif
  dessous), le panneau et son bouton disparaissent avec. Le panneau de
  confirmation **nomme le jalon** qu'il confirme — il écrivait « T0 » en six
  endroits quel que soit l'épisode visé.
- **Une seule ancre pour un jalon, et c'est la revue qui l'a imposée.** Le
  jalon dû se fenêtrait sur le `confirmedAt` du T0 confirmé (l'ancre de la
  trajectoire, LOT-08 A8-1) pendant que le serveur bâtissait l'épisode depuis
  la **première réponse du dossier** : dès 16 jours d'écart entre première
  réponse et confirmation, un « J21 » confirmé depuis l'UI était construit
  sur les réponses du T0. Le serveur reçoit désormais l'ancre du cycle
  courant (`ancreCycleCourant`) pour tout jalon post-T0 ; un **banc de
  contrat inter-couches** vérifie l'égalité des bornes à la milliseconde. Le
  T0 initial garde son ancre historique (première réponse) — aucun cycle ne
  le précède.
- **Momentum PAR BESOIN, fail-closed sur la bande de bruit.** Le praticien ne
  disposait que du delta d'un scalaire agrégé, qui mélange ce qui a bougé et
  ce qui n'a pas été regardé. Chaque besoin rend désormais son delta de
  couverture entre deux jalons **réellement re-mesurés** — règle de nouveauté
  au grain du besoin : sans elle, une passation unique au T0 rendait
  « mesure : vrai, delta : 0 » à chaque jalon, le défaut F1 recréé un cran
  plus bas. **Aucun delta n'est qualifié** (« stable » comme « en
  mouvement ») tant qu'aucune bande de bruit n'est publiée pour le besoin :
  `BANDES_DE_BRUIT` est livrée **vide et non publiée** (`publiee: false`),
  sur le patron des tables non signées — publier une bande est un acte
  séparé (`D-058`, `DC-19`/`DC-20`). Un besoin non re-mesuré est nommé tel
  quel — ni zéro, ni « stable », ni silence (`DC-24`).
- **Pas de garde de version intra-cycle — retirée en revue (B1).** Les deux
  lectures d'une série sont toujours recalculées par le moteur courant ;
  comparer l'étiquette `versionScore` figée sur l'épisode à la constante
  courante aurait affiché « non re-mesuré » sur des besoins re-mesurés deux
  fois, pour **tout** cycle antérieur au bump v14/v15 — l'inverse de `DC-24`,
  avec un motif faux. La garde A8-3 reste inter-cycles (`resoudreComparaison`,
  inchangée). Le delta est la soustraction **brute** : l'arrondi au centième
  était un nombre technique non déclaré qui écrasait tout mouvement < 0,005
  sur une échelle 0–1.
- **La restitution est explicable, et les unités sont nommées.** Chaque ligne
  rend les deux jalons comparés, les deux couvertures, l'écart **avec son
  échelle** (couverture 0–1 — le scalaire voisin est sur l'indice 0–100, deux
  « écart » nus se seraient lus comme comparables) et son **motif**, toujours
  (`DC-34`/`DC-35`). Le motif d'une série à lecture unique nomme le jalon
  réellement lu — plus jamais « depuis le T0 » quand le départ est un J21.
- **Re-passation ciblée au jalon — proposition, jamais envoi.** Dérivée des
  besoins qui **fondent** la priorité visée (`provenance.needIds` →
  `BESOIN_SOURCES`, table signée), jamais du pack entier ; filtrée par le
  prédicat de la file d'envoi destinataire (`IDS_ASSIGNABLES`). La priorité
  visée est la sélection praticien quand elle existe, à défaut la priorité
  **proposée** par la carte — aucun producteur de sélection n'existe en
  production (revue B3), et sans ce repli le bloc était structurellement
  inatteignable. Il reste **inerte tant que la table des priorités n'est pas
  signée** (`proposedMainPriorityId` nul) : même famille de verrous que le
  reste de la chaîne. Le POST lit le **vrai** contrat de la route
  (`success`, pas `ok` — tout ajout réussi s'affichait en échec) et restitue
  le motif d'un refus (« Dossier clos. », …).
- **Concurrence maîtrisée au cockpit** : le GET T0 de plancher et le GET du
  jalon dû partent en parallèle — un jeton d'obsolescence garantit que seule
  la dernière demande écrit l'écran, le POST porte le jalon de la proposition
  **affichée**, et une décision `ready` n'est jamais écrasée par un
  rechargement de proposition après relecture de trajectoire.
- **Coût borné** : le momentum par besoin rejoue le moteur d'équilibre par
  jalon ; il est **opt-in** (`avecMomentumParBesoin`) et seule la route de la
  fiche-trajectoire le paie — pas le chargement cabinet (tous les patients du
  praticien), pas la carte de Fil.
- **Rattachement unique des lignes héritées** : le jalon dû compte les
  épisodes à `cycleId` nul via `rattacherReperesAuxCycles` — la règle de la
  Spirale, repli par date — au lieu d'une règle propre qui re-proposait la
  fenêtre d'un jalon déjà confirmé.
- **Effet en production : jalons et momentum immédiats, re-passation gatée.**
  `assessment_episodes` est vide en production (relu le 2026-08-14) : aucun
  stock hérité à re-fenêtrer. Aucune bande publiée ⇒ aucun besoin qualifié.
  Aucune migration, aucun seuil neuf, `versionScore` intact, momentum
  scalaire strictement inchangé (ses deux routes ne touchent pas ce lot).
- **Dettes nommées** (`D-058` amendée le 2026-08-14) : `DC-41` (axe tolérance
  réservé) non livré ; producteur de `selectedMainPriority` inexistant ;
  Q_SOM_09 (21 nuits) proposable à J21 alors que sa mesure se rend vers J42 ;
  E2E du parcours nominal T0 (peuplement des fixtures) ; tautologie du zéro
  sur le scalaire ; normalisation CRLF→LF de `depuisPrisma.ts` embarquée dans
  le diff (`.gitattributes` la rend inévitable à la première écriture).
