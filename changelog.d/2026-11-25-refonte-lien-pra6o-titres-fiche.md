### Refonte Lien, PRA-6o : le nom du dossier redevient le plus grand titre, et la fiche garde un titre quand elle n'est pas affichée (2026-11-25)

Lot ouvert par le responsable le 2026-11-25 (« Lancer les deux »), sur deux
restes de PRA-6n. Prototype et réponses écrites : questions `20261125-1757-d`
(A), `20261125-1758-d` (A, texte accepté mot pour mot) et `20261125-1759-d`
(lot non élargi). Ni route, ni garde, ni drapeau, ni schéma, ni règle
clinique.

- **« Trajectoire alimentaire »** (onglet Alimentation) passe de 30 px à
  20 px : il ne dépasse plus le nom du dossier, et prend le corps du titre de
  phase du poste.
- **Un titre, « Fiche patient »**, s'affiche pendant le chargement de la
  fiche, et quand le patient est introuvable, la session expirée ou la lecture
  en échec. Le message en dessous ne change pas. Texte T-95, inscrit dans
  D-488 par DOC-22.
- Un banc (`FichePatientPanel.test.tsx`) vérifie un seul `h1`,
  « Fiche patient », avant le message dans chacun des quatre états, et le
  retour au nom après « Réessayer ».
