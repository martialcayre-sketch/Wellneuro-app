# 2026-08-22 19:50 — Alliance 6.0-A LOT-03 : « ce qui compte », une parole déposée et conservée

## Ce qui a changé

- **Le patient dépose au portail un texte libre horodaté**, conservé tel quel ;
  le praticien le lit chronologiquement dans l'onglet « Trajectoire ». La
  surface patient vit derrière le drapeau **neuf et éteint
  `WN_CE_QUI_COMPTE`** ; l'allumer est un geste du responsable, et il faut un
  build qui porte la variable.
- **Aucune migration, aucune colonne, aucune surface de correction ni de
  suppression.** La table n'a pas de colonne `supersedes` — une entrée ne peut
  structurellement pas en corriger une autre — et il n'existe volontairement
  aucun verbe pour écraser. Proposer d'ajouter la colonne serait changer la
  nature de l'objet, pas le compléter.
- **Contrat d'accès** : drapeau fail-closed (503) d'abord, puis le cookie signé
  du portail, puis seulement le corps. `authentifierPatientPortail` et non
  `authorizePortail` — le second exige une assignation et refuserait un patient
  qui n'en a plus. **L'`idPatient` vient de la session, jamais du corps** : un
  `idPatient` reçu est *ignoré*, pas comparé, parce que le comparer laisserait
  croire qu'il compte.
- **Dossier clos : le dépôt reste autorisé**, délibérément. La clôture est un
  état du suivi praticien, pas un ordre de silence fait au patient.
- **Deux dates jamais confondues** ; une saisie non déclarée reste absente,
  jamais comblée par la date d'enregistrement.

## Ce que la revue indépendante a trouvé

- **L'écran réintroduisait au navigateur la troncature que la route interdit** :
  `maxLength` coupait silencieusement un collage trop long, et le banc censé le
  couvrir ne pouvait pas mordre (3 999 caractères, et `fireEvent.change`
  contourne l'attribut en jsdom). Retiré, remplacé par un compteur visible.
- **Le corps était bufferisé sans borne** sur une route d'écriture sans cadence,
  colonne `TEXT` sans contrainte de longueur en base. Refus 400 au-delà de
  64 Kio **avant lecture** ; `req.text()` + `JSON.parse` pour que le cas
  `content-length` absent subisse la même borne.
- **La garde anti-agrégat balayait moins large que son intitulé** (ni
  `synthese-praticien`, ni `documents/`, ni `correspondance/`, ni `equilibre/`)
  et **ratait les imports multi-lignes**, qui sont la forme la plus courante du
  dépôt. Les deux corrigées, et vues rouges.
- **`DC-27` était cité pour ce qu'il ne dit pas.** Voir ci-dessous.

## La correction doctrinale, et sa portée

`DC-27` dit « association ≠ causalité ; score ≠ diagnostic ». Il **ne porte pas**
l'interdit d'agréger une parole de patient. Sept occurrences du code et une du
fichier de lot le citaient ainsi, et `DC-30` (les discordances) était cité pour
« rien ne s'écrase ». Ce qui porte réellement ces interdits : **les invariants
de campagne** — « jamais un score », adossé à `DC-19`/`DC-20`, et « append-only
par référence ».

La mésattribution **n'a pas été introduite par le lot** : elle vient de la
charte de campagne, qui la faisait déjà. `CAMPAGNE.md` porte désormais la
correction et son motif. **Les fichiers de lot écrits avant elle (LOT-02
§ Périmètre, LOT-04, LOT-06) portent encore l'ancienne citation** — à corriger
à l'ouverture de chacun, pas rétroactivement.

## Ce qui reste ouvert

- **Aucune cadence sur les routes portail authentifiées.** La borne de 64 Kio
  limite la **taille** d'un appel, pas leur **nombre** : elle retire le cas du
  corps aberrant, elle ne referme pas la dette.
- **La lecture praticien n'est pas gardée par le drapeau**, et c'est motivé
  (drapeau éteint ⇒ liste vide, qui est un silence honnête ; un 503 ferait
  croire à une panne). Son effet de bord ne l'est pas : le panneau charge à
  chaque activation de l'onglet « Trajectoire », et l'appartenance
  **journalise un accès au dossier à chaque fois**, drapeau éteint compris.
- **Aucun E2E du trajet dépôt → lecture.** Tout est prouvé par bancs unitaires,
  route par route. L'E2E devra allumer le drapeau explicitement — **à écrire
  avant l'allumage en production, pas après**.
- **La session portail dure 12 h.** Le champ n'est pas vidé sur erreur, mais
  rien n'est persisté : un rechargement perd une saisie longue.

## Deux pièges d'outillage, à ne pas redécouvrir

- **Le hook de fraîcheur juge le répertoire courant de la session, pas le
  worktree du fichier édité.** Une écriture dans un worktree à jour est refusée
  si le répertoire courant est resté sur une copie en retard — et le message
  affiche le `HEAD` de *cette* copie, ce qui égare complètement.
- **`commande > log 2>&1; echo "code=$?"` fait rapporter le code de l'`echo`**,
  toujours `0`. Un T2 rouge s'est présenté comme vert. Le verdict se lit dans
  le log.

## Note sur le blocage WebKit

Le segment E2E local rougit sur une navigation expirée **sans qu'aucune requête
HTTP ne parte**, et **sur un banc différent à chaque rejeu** — ce qu'une
régression du code ne ferait pas. Le harnais le classe lui-même. Constaté
aujourd'hui sur une page **praticien**, alors que la note connue le décrivait
comme propre au portail : le mécanisme est plus large.
