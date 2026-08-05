### Corrigé

- **`/wn-route` peut enfin s'exécuter.** `CLAUDE.md` demande depuis son écriture
  d'invoquer ce skill silencieusement au tout premier passage d'une session
  (démarrage ou juste après `/clear`) ; son `disable-model-invocation: true`
  l'interdisait structurellement. La consigne n'a donc **jamais** pu s'appliquer
  une seule fois — le routage de début de session n'existait que sur le papier,
  et rien ne le signalait : un skill qui ne se déclenche pas ne produit aucune
  erreur, seulement une absence.

  Le drapeau est retiré sur ce seul fichier. Les 27 autres skills `wn` le
  conservent : eux se tapent à la main, et n'ont rien à faire dans la liste des
  skills que le modèle relit à chaque session. **L'exception est commentée dans
  le frontmatter même**, parce que la pente naturelle d'une relecture est
  d'uniformiser la suite — ce qui remettrait la consigne en panne, silencieusement
  et de la même façon.

  **La borne de fréquence descend dans la description**, et pas seulement dans le
  corps. Une fois le drapeau retiré, c'est la description — et elle seule — qui
  décide de l'invocation ; le corps du skill, qui portait déjà « une fois par
  session, pas à chaque message », n'est lu qu'*après*. La consigne arrivait donc
  trop tard pour empêcher un routeur de se rejouer à chaque tour.

  Ce que cela coûte, mesuré et non estimé : le fichier fait 5,8 ko, soit de
  l'ordre de 1,5 k tokens ajoutés au contexte d'une session dont la mesure du
  2026-08-01 établit qu'elle en relit ~202 000 par requête — moins de 1 %. Ce
  que cela peut rendre : une décision de délégation prise au premier message, et
  la délégation est le seul levier d'économie que cette même mesure ait confirmé
  (facteur 28 par appel, dû à l'isolement du contexte, pas au tarif du modèle).
