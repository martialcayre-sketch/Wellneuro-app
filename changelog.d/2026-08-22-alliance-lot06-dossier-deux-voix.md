### Le dossier à deux voix au portail : le patient répond, et sa réponse ne s'efface pas (2026-08-22)

Alliance 6.0-A, LOT-06 — dernier lot de la campagne. Le patient voit enfin son
dossier d'ensemble et peut répondre à l'objectif négocié avec son praticien.
Aucune migration : les cinq tables sont en production depuis le LOT-01.

- **La ratification existe, et c'est un geste du patient.** `ratifications_objectif`
  attendait ce lot depuis le LOT-01 sans qu'aucune ligne de code ne l'écrive —
  une garde structurelle l'interdisait à tout le dépôt, pour qu'aucune route
  praticien ne fabrique un acte que le patient n'a pas posé. Cette garde ne
  s'est pas ouverte : elle s'est **déplacée**, épinglée sur l'unique route
  portail écrivante. Tout second écrivain la fait rougir.
- **Répondre ne se retire pas.** Se raviser, c'est répondre à nouveau : une
  ligne de plus, en sens inverse, et c'est le **dernier geste** qui vaut —
  jamais une majorité, jamais un décompte (`DC-30`). Aucun verbe n'existe pour
  effacer un accord donné, ni dans la route ni à l'écran.
- **Aucune date n'est écrite par l'application.** `cree_le` est posée par la
  base, et `geste_le` reste **nulle** : c'est une colonne de DÉCLARATION, or le
  patient ne déclare rien — il clique. La renseigner depuis l'horloge du serveur
  en ferait une déclaration qu'il n'a pas faite, et elle ne pourrait de toute
  façon jamais différer de `cree_le`. Une ratification est ainsi inantidatable
  des deux côtés.
- **Deux versions d'objectif qui coexistent ⇒ aucune réponse n'est proposée.**
  L'écran montre les deux et le dit ; il ne ratifie pas « la plus récente », ce
  qui trancherait en silence une discordance que `DC-30` demande de signaler.
  La route refuse en 409 même quand le patient vise la plus récente.
- **L'écran assemble trois objets, et deux de ces lectures n'existaient pas.**
  L'objectif négocié n'était servi qu'au cockpit praticien ; « ce qui compte »
  n'avait aucune relecture patient (son GET n'était qu'un interrupteur). Le
  fichier de lot parlait d'« assembler » : il fallait d'abord ouvrir.
- **Sixième chemin de la carte des chemins sortants du Socle** — servir au
  patient la reformulation du praticien est un chemin NEUF, contrairement à ce
  que le fichier de lot affirmait : une garde vit dans un appelant, pas dans un
  objet. Régime journalisant, par application de `D-090` (le geste est un
  service). La garde couvre **trois** textes et non deux : la revue a trouvé que
  `priorite`, libellé libre du praticien servi au patient, en était absente —
  une garde qui n'énumère pas tous les champs d'un objet laisse le champ oublié
  hors du chemin qu'elle prétend couvrir. **Banc de débranchement vu rouge**
  avant d'être déclaré vert.
- **Drapeau neuf et éteint `WN_DOSSIER_DEUX_VOIX`**, quatrième de la campagne,
  fail-closed. Il garde la route (503), l'écran (404) et la ratification (503).
  Il ne se compose pas des deux précédents : les réutiliser aurait ouvert la
  seule écriture patient irréversible du même geste qui ouvre une lecture.
  Chaque bloc reste par ailleurs soumis à son drapeau propre, et **un bloc
  fermé est ABSENT** — pas vide, pas « pas encore ouvert » : l'un parlerait au
  patient d'un déploiement, l'autre lui ferait lire un silence de son praticien
  (`DC-24`).
- **L'écran est atteignable.** Le lien vit dans la navigation du hub, pas dans
  le panneau replié où les deux lots précédents ont posé les leurs — celui-ci
  est fermé par défaut et placé après un retour anticipé qui exige un protocole
  diffusé. Un patient sans protocole n'aurait jamais vu la page.
- **Les E2E portail des trois surfaces, enfin.** Ni le LOT-03 ni le LOT-04
  n'en avaient : les drapeaux sont armés aux **trois** endroits qui comptent
  (serveur sous test, et la commande `npm run build` du CI comme du script de
  worktree — les pages lisent leur drapeau au rendu serveur), les fixtures des
  cinq tables existent, et `resetPortailState` cesse de les ignorer.
- **Une fuite de log soldée** : `api/praticien/objectifs` journalisait
  `err.message` brut sous un commentaire promettant « jamais le payload ».
  `PrismaClientValidationError` recopie le `data:` du `create` — énoncé du
  patient, reformulation, e-mail du praticien. Dette nommée par la revue du
  LOT-04, corrigée ici sur les deux chemins d'exception.
- **Deux dates qui ne se comblent jamais l'une l'autre, à l'écran aussi.** La
  revue a trouvé que la vue patient affichait `saisiLe ?? creeLe` sur sa propre
  parole et « Écrit le » sur une date de publication : deux absences rendues
  comme des réponses (`DC-24`), exactement ce que le LOT-03 s'interdisait
  « ici ni à l'affichage ». Chaque date est désormais dite sous son propre
  libellé, ou tue.
- **`D-092` : le gate de campagne se constate sur la STRUCTURE**, par conteneur
  Scalingo et non par MCP (qui lit la base gelée depuis le cutover). **Constat
  effectué le 2026-08-22**, en lecture seule et sans lire aucune ligne patient :
  `ratifications_objectif` contient **zéro ligne** en production, et les quatre
  autres tables de l'alliance sont vides elles aussi. Le gate structurel est
  constaté ; il ne vaut ni constat d'usage réel, ni activation élargie
  protocole→produits. Détail au paragraphe « Constat de clôture » de
  `CAMPAGNE.md`.
