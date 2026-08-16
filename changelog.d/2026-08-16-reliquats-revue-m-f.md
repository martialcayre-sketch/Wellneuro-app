### Les reliquats moyens et faibles de la revue clinique sont soldés (2026-08-16)

Findings `M1`-`M4` et `F1`-`F4` de la revue `wn-reviewer` des PR
`D-061`/`D-062`/`D-063`, restés ouverts après les correctifs critiques. Deux
verrous liaient leur objet par une voie que rien ne tenait ; deux en-têtes
décrivaient un état que le fichier ne portait plus.

- **`M1` — le moteur d'abstention lie ses motifs par identité**
  (`chaineC1.ts`). Il déstructurait `ABSTENTION_PROCEDURE_V1.motifsRequired`
  dans l'ordre du tableau : permuter les deux motifs de la table signée aurait
  servi le texte **sécurité** sur la branche canal et réciproquement, et un
  troisième motif inséré en tête aurait été ignoré en silence. La sélection se
  fait désormais par `id` (`ABST-SEC-01`, `ABST-CAN-01`) et un motif
  introuvable **jette** — erreur de construction, jamais une limitation vide
  sous un verdict d'abstention. Comportement servi inchangé : seul le mode de
  liaison change.
- **`M4` — le verrou biologie hache les règles réellement évaluées**
  (`statuts.ts`). Le SHA attendu était **injecté** par l'appelant
  (`shaPerimetreAttendu`) à côté des `regles` : un couple signature/sha
  cohérent entre eux mais étranger aux règles passées franchissait le verrou,
  et les statuts dérivés n'étaient alors couverts par aucune relecture. Le
  champ est supprimé, l'attendu se calcule depuis `entree.regles` — le
  contournement devient inconstructible. Aucun appelant de production
  (`D-063` est inerte tant que la table est vide).
- **`M2` / `M3` — les en-têtes disent l'état réel.** Commentaires seuls.
  `priorityRulesV1.ts` : le SHA couvre `{ regles, abstention }` depuis
  `D-062`, la dette bloquante de `D-054` est close (l'historique du passage en
  force de `D-061` est conservé tel quel, ainsi que la re-signature due) ; ce
  qui reste hors du SHA est nommé comme dette résiduelle — producteur de
  candidats, classement, textes `LIMITATION_*` de `chaineC1.ts`.
  `indicationsBiologieV1.ts` : l'en-tête annonçait `validationExterne: false`
  à la livraison, que la métadonnée contredit depuis `D-061` ; il renvoie
  désormais au commentaire détaillé de la métadonnée, verrou fermé par
  `D-063`.
- **`F1`-`F4` — la machinerie de banc éprouvée et cohérente.**
  `designerTablePriorites()` n'avait aucun appelant : la position « verrou
  fermé » servie par la fixture partagée est désormais éprouvée (`F1`) ;
  `retablirTablePriorites()` porte le même `assertBanc()` que ses deux
  voisines (`F2`) ; l'état livré de référence est une copie **gelée** — nul
  banc ne peut plus y graver un faux état que chaque restauration
  propagerait (`F3`) ; la date de signature simulée est alignée sur la date
  livrée `2026-08-15` (`F4`), des deux côtés. Cet alignement a mis au jour un
  cas de déterminisme qui nommait « fermé » l'état livré, donc signé : il
  ferme maintenant le verrou explicitement.

**Bancs ajoutés, mutations jouées.** `motifsRequired` porte exactement les deux
`id` que le moteur cite ; table **permutée** en mémoire, le motif sécurité est
toujours servi (mutation rouge avant `M1`) ; un motif retiré fait jeter. Côté
biologie, un sha de périmètre cohérent mais **étranger** aux règles passées
ferme le verrou (mutation rouge avant `M4`).

**Aucun contenu signé n'est modifié** : ni règle, ni texte de motif ou de
limitation, ni valeur de métadonnée (`validationExterne`, `dateValidation`,
`claimsSource`, `shaPerimetre`). `PRIORITY_RULES_SHA256` et
`INDICATIONS_BIOLOGIE_SHA256` sont **inchangés**, les gardes existants les
épinglant en littéral. Pas de décision `D-xxx` nouvelle : les `id` cités par le
moteur sont du câblage, même statut que l'ordre d'évaluation resté hors SHA
selon `D-062`.

**Relu par `wn-reviewer` (GO), et complété sur sa réserve.** Le bloc
historique de la métadonnée biologie se lisait encore au présent (« le verrou
ne teste que ce booléen ») : marqué comme histoire du passage en force, l'état
courant vivant dans le paragraphe suivant. Trois bancs prescrits par la revue
ajoutés : la **sentinelle de date** (les deux copies en dur de la date simulée
tenues contre la métadonnée — rougira à la re-signature due), la **concordance
de sérialisation** (le sha calculé par `deriverStatutsBiologie` retombe sur
`INDICATIONS_BIOLOGIE_SHA256` pour la table canonique — l'invariant dont
dépend tout le verrou), et les motifs affirmés sur deux cas qui n'assertaient
que `ok: false`.

**Hors périmètre, et pourquoi.** `M5` (fenêtre 409 des cartes en vol) est un
constat documenté au handoff, pas un correctif. `F5` toucherait une métadonnée
signée et son verrou en production : arbitrage praticien distinct, écarté ici.
Les findings faibles résiduels de la relecture (export d'`evaluerAbstention`
sans garde banc, copies d'`ETAT_LIVRE`) sont consignés au handoff.
