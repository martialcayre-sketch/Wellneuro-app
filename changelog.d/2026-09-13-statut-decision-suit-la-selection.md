### Fiche-trajectoire — « Décision 21 j » cesse d'être verte quand elle attend son geste

Le rail marquait la phase 4 **« renseignée » dès qu'un épisode T0 était
confirmé**. Or l'ancre confirmée est un acte de la phase PRÉCÉDENTE ; le geste
que la phase 4 porte, elle, est la **sélection d'une priorité par le praticien**
(`SelectionPrioritePanel`, monté sous la phase Décision depuis [[D-127]]). Un
dossier ancré sans priorité retenue portait donc la pastille verte, pendant que
la phase Actions refusait le protocole — « Protocole indisponible — priorité
praticien non sélectionnée » — faute de cette même priorité.

**Et le rail n'envoyait pas là où il fallait.** Le statut alimente `phaseDue` au
troisième rang : une phase 4 « faite » était sautée, `actions` gagnait, et la
fiche s'ouvrait sur l'écran du refus. Le praticien lisait la cause dans une
phase, et le geste qui la lève vivait dans une autre, marquée verte — sans rien
qui l'y ramène. Le fragment de `D-127` l'avait pressenti : le constructeur
« refusait jusqu'ici sans dire où aller », et la réparation avait consisté à
poser le geste ailleurs, pas à tracer le chemin.

**Origine : lecture de production du 2026-09-13** (one-off Scalingo, lecture
seule, dé-identifiée). 28 patients, **7 épisodes T0 confirmés**, **1 seule
sélection de priorité** — posée la veille, six jours après la mise en service du
geste — et **aucune version de protocole C1 jamais enregistrée**. Six dossiers
réels sur sept étaient exactement dans cet état : ancrés, verts, et sans issue.

C'est la troisième application de la même règle, après « Compréhension »
([[D-161]] §10, le 2026-09-10) et « Données fiables » (le 2026-09-13) : **le
statut lit ce que la phase CONTIENT, et non ce qui l'entoure.** Le rail sert de
feu pour passer à la prise de décision ; un feu vert sur une phase qui attend un
acte n'est pas une imprécision d'affichage, c'est un feu faux.

**Le verdict est REMONTÉ, jamais recalculé**, et par une garde partagée —
`isSelectionPrioriteDue`, posée dans `decisionGuards.ts` à côté de
`isDecisionBloquee`. Le panneau qui porte le geste et le statut qui y conduit
doivent répondre à la même question ; deux copies divergeraient le jour où l'une
bouge. `EtatRuntimeClinique` porte donc `selectionPrioriteDue`, comme il porte
déjà `episodeConfirme`, `decisionBloquee` et `rideauT0Satisfait`.

Quatre états, et aucun n'est affirmé sans donnée :

- **priorité retenue** → « renseignée » ;
- **aucune priorité, geste offert** → **« à traiter »** — et non « en attente du
  patient » : c'est un acte du praticien, personne n'attend une matière du
  dossier ;
- **aucune priorité, geste NON offert** (décision bloquée, ou table des
  priorités non signée : `SelectionPrioritePanel` se retire dans les deux cas) →
  « renseignée ». Réclamer un geste que l'écran n'offre pas déplacerait le
  cul-de-sac d'un cran au lieu de le refermer ; le bandeau bloqueur porte déjà
  ce cas-là ;
- **carte de décision non lisible sur un épisode pourtant confirmé** — le rejeu
  d'un jalon suivant ([[D-118]]) — → « indéterminée ». La sélection n'y est pas
  absente, elle est inconnue (`DC-24`).

**Une sortie, en plus du chemin.** Le statut corrigé suffit presque : `phaseDue`
fait pointer « Prochaine étape » sur Décision, et la fiche s'y ouvre. Presque —
la mémoire de phase et un lien direct peuvent encore déposer le praticien sur
Actions, là où il lit le refus. Un quatrième bandeau de fiche, calqué sur les
trois existants, annonce « Priorité non retenue — le protocole reste
indisponible » et offre **« Choisir la priorité »**. Le bouton nomme le geste et
non la destination : « Ouvrir la phase Décision 21 j » existe déjà ailleurs, et
deux nœuds de même nom accessible cassent le mode strict des E2E.

**Point de synchronisation E2E déplacé.** `confirmerEpisodeT0` attendait le
libellé « Décision 21 j renseignée » pour savoir qu'une confirmation était
persistée. Ces fixtures ne sélectionnent aucune priorité : le libellé ne viendra
plus. L'attente porte désormais sur **« Actions à traiter »**, qui passe de « à
ouvrir » à « à traiter » exactement à la confirmation — même dérivation depuis
`episodeConfirme`, même garantie contre la course de CI du 2026-09-07.

Baselines visuelles inchangées : le seed ne crée aucun épisode confirmé, donc la
fixture des captures reste sur la branche « épisode non confirmé », que ce lot ne
touche pas.
