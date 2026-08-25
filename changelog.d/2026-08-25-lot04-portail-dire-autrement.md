### Portail — « le dire autrement » : la contre-proposition du patient (`D-110`)

Le patient dispose d'un **troisième verbe** sur son objectif négocié. À côté de
« c'est bien ça » et « ce n'est pas exactement ça », il peut écrire **sa
version** dans ses mots : un événement append-only, référençant la version
exacte, déposé dans `amendements_objectif` (table livrée au LOT-01, restée sans
écrivain jusqu'ici).

- **Portail** — `POST /api/portail/dossier` s'élargit au geste `amendement` :
  drapeau d'abord, session ensuite, texte borné à 4 000 caractères **par refus
  et jamais par troncature**, mêmes trois vérifications de version que la
  ratification (404 pour un objectif inexistant ou d'un autre dossier, 409 sur
  une version supplantée ou deux têtes rivales). Un geste inconnu est refusé,
  jamais replié sur la ratification ; un corps sans `geste` reste une
  ratification. Le `GET` sert les amendements : le patient relit ce qu'il a
  écrit.
- **État dérivé** — quatrième valeur `dit_autrement`, qui n'est **ni un accord
  ni un refus**. Les deux tables se lisent ensemble, dernier geste gagnant.
- **Cockpit** — les mots du patient s'affichent dans la trajectoire, sous leur
  chaîne, tels quels ; le praticien peut en faire l'énoncé d'une **nouvelle
  version** (`amendementCiteId`) — l'écran désigne, le serveur recopie, et la
  citation exige une révision et la même chaîne.
- **Gardes vues rouges** — `amendementObjectif.create` épinglé à l'unique route
  portail (une seconde écriture rend rouge) ; aucun update/delete/upsert nulle
  part hors effacement du dossier ; forme exposée épinglée par le type ; la
  garde de registre anxiogène ne touche **pas** la parole du patient (mutation
  vue rouge).

Aucune migration, aucun schéma touché, aucune notification : le portail reste
en pull. **Le drapeau `WN_DOSSIER_DEUX_VOIX` étant posé en production, le geste
s'ouvre à tous les dossiers courants dès le merge** — application immédiate
prévue par la campagne, sur le fait que les patients actuels sont des
bêta-testeurs réels et informés.
