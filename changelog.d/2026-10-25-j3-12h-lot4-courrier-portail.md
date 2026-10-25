### J3-12h, lot 4 : le courrier complément au portail, sous drapeau éteint (D-362, 2026-10-25)

- Le patient lit le courrier qui lui est remis au clic « Valider pour
  diffusion » : écran « Courrier à remettre à votre médecin »
  (`/portail/[token]/courrier-complement`), texte recopié tel que remis,
  destinataire saisi par le praticien, version à imprimer rendue par le
  chokepoint `medecin` (`/api/portail/courrier-complement/impression`), lien
  dans « Autres espaces ».
- Titre et phrase d'accompagnement acceptés par le responsable ; la phrase
  dit au patient de remettre le courrier avant de commencer les compléments
  qu'il cite. Ni l'un ni l'autre ne nomme la population ou la situation.
- Espèce de lecture `courrier_complement` : le courrier servi entre au fil du
  jour, son ouverture s'acquitte (`POST /api/portail/lectures`, identifiant
  servi vérifié, lecture datée), il paraît dans « Mes échanges », et le
  praticien voit la remise et sa lecture dans « Documents remis ».
- Une remise de ce clic compte pour l'e-mail neutre « document remis » (un
  seul par clic) ; le panneau de diffusion le dit avant le geste.
- Reprise de la revue CodeRabbit de #1691 : la préparation du courrier exige
  la carte de décision et refuse une version supplantée ou non relue.
- Banc Postgres : la fenêtre de fraîcheur de la garde est éprouvée par ses
  vrais lecteurs (aucune expiration, levée par le seul « non » postérieur du
  praticien, « oui » non daté jamais levé, déclaration tardive vue par
  l'aperçu suivant).
- `WN_COURRIER_COMPLEMENT` reste éteint : une condition d'ouverture sur
  quatre est levée. Aucune migration.
