### Refonte Lien, COM-3 : fond de la connexion praticien calé en haut à droite en portrait (2026-11-26)

Micro-lot commun issu du prototype PRA-2 décor. Le responsable a retenu la variante B
le 2026-11-26 (« B, avec COM-3 »).

- **Constat** : `login-calm.svg` est en 16:9, avec ses boucles dans deux coins et un
  centre vide. Posé en `cover` centré, il ne garde en portrait que sa bande centrale.
  Au téléphone et à la tablette portrait, le décor de la connexion était donc
  invisible.
- **Correctif** : dans `LienDecor`, un fond peut nommer un calage en orientation
  portrait. La connexion praticien prend `haut-droite` (`portrait:bg-right-top`) :
  les boucles restent en périphérie, au-dessus de la carte. Le paysage ne change pas.
  L'entrée patient n'a pas de calage : ses fonds ont déjà un fichier par largeur.
- **Banc** (`LienDecor.test.tsx`) : le calage est servi aux deux couches de la
  connexion, et il est absent de l'entrée patient.

Aucun écran ne pose encore ce fond : la pose revient au lot PRA-2 décor, après ce
micro-lot. Ce lot n'ajoute ni texte, ni route, ni garde, ni drapeau, ni schéma, ni
règle clinique.
