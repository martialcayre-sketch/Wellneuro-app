### Le recueil alimentaire dit son état — bannière, tiroir, modale (2026-08-05)

Trois endroits où le dossier de contrôle de l'agenda alimentaire (`Q_ALI_09`)
taisait ce qu'il savait déjà.

**Le panneau dit quand le recueil est fermé.** Drapeau `WN_AGENDA_ALI` éteint,
le praticien relisait un agenda que le patient ne peut plus alimenter, sans que
rien ne l'indique — réserve nommée de `D-027`, fermée ici par une bannière. La
position du drapeau atteint l'écran par un **provider de page**
(`AgendaAliFeatureProvider`), sur le motif déjà présent deux lignes plus haut
pour `WN_C5_ENABLED`. Écarté : un champ `recueilOuvert` dans la réponse de
`GET /api/praticien/agenda-alimentaire`, qui aurait obligé à appeler
`isAgendaAlimentaireEnabled` dans la route même dont le commentaire l'interdit
sans rouvrir `D-027`. Décision consignée en `D-028`. Le contexte est à **trois
états**, défaut `null` : le réflexe fail-closed vaut pour une garde, pas pour un
énoncé — le drapeau étant allumé en production, un défaut `false` aurait affirmé
« recueil fermé » sur un recueil ouvert cent pour cent du temps si le fil venait
à se débrancher. Le câblage réel est épinglé par un test, vérifié par mutation.

**Le tiroir dit d'où vient chaque journée.** `canal`, `soumisLe` et
`supersedesJourId` étaient au schéma, sélectionnés par `SELECT_JOUR` et rendus
par la route praticien depuis le début — `JourneeCard` en jetait deux sur trois.
Elle reçoit désormais la ligne entière et affiche l'horodatage de saisie (heure
de Paris), la mention « journée corrigée » quand la tête de chaîne en porte une,
et le canal **seulement s'il sort du portail** — branche dormante par
construction, `CANAUX` étant fermée à `['portail']`, et délibérée : le champ
existe pour un second canal à venir. C'est `supersedesJourId` qui portera le taux
de correction dont le barème (`LOT-06`) aura besoin.

**La modale d'annulation dit ce qu'elle emporte.** Un praticien retirait un
recueil de 21 jours sans que l'écran lui dise combien de journées il contenait.
`GET /api/praticien/patients` transporte `nbJourneesAgenda`, en **tri-état** —
`null` = ce n'est pas un agenda, `0` = un agenda sans journée enregistrée, et les
deux ne se disent pas pareil — compté sur les **dates distinctes** et non sur les
lignes, la table étant append-only (une journée corrigée en porte deux). Une
seule requête groupée par page, dans les **deux** branches de pagination, et
parallélisée avec le comptage de passations existant. Fait d'affichage seul :
l'annulabilité reste décidée par `estAnnulable`.

La modale dit « journée**s de saisie** » et non « journées notées » : ce dernier
libellé est déjà celui du panneau de la fiche, qui sert `fenetre.nbRenseignees`
— lequel exclut les lignes en quarantaine quand ce comptage-ci les inclut. Deux
nombres derrière le même mot se seraient contredits à deux clics d'écart, et
seulement pendant un incident d'intégrité. La phrase s'accorde aussi sur son
verbe et son pronom : le recueil pilote est à **une** journée, donc le singulier
est le premier cas servi en production, pas un cas de bord.
