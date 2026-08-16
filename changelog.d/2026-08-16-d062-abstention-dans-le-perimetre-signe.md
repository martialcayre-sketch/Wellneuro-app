### D-062 — la procédure d'abstention entre dans le périmètre signé, et la re-signature devient due (2026-08-16)

`D-061` avait signé la table des priorités en franchissant une dette écrite :
le SHA ne couvrait pas la procédure d'abstention, si bien que la signature
ouvrait un verdict servi au praticien qu'aucune ligne signée ne décrivait
(`DC-17`, `DC-26`). Les priorités étant la seule table sans drapeau
d'exploitation, le merge a rendu cette dette échue.

- **La procédure devient des données signées.** `ABSTENTION_PROCEDURE_V1` vit
  dans `priorityRulesV1.ts` — cadre, deux motifs de `required`, verdict par
  défaut, textes français compris. `PRIORITY_RULES_SHA256` porte désormais sur
  `{ regles, abstention }`. `evaluerAbstention` applique au lieu d'énoncer.
  Comportement servi inchangé, textes identiques au caractère près.
- **Provenance doctrinale, dite comme telle.** Les motifs dérivent de la
  constitution (`DC-12`/`DC-23`, `DC-24`/`DC-25`), non du corpus. Chaque motif
  cite sa doctrine et un banc l'exige non vide. Reste ouvert : faut-il en plus
  des claims `VALIDE` ? Ils seraient à écrire.
- **La re-signature est due.** Le SHA change (`4b51c649…` → `cfd9b876…`) et la
  métadonnée porte encore la date du 2026-08-15, posée sur l'ancien périmètre.
  Mettre le littéral du banc à jour ne vaut pas signature.
- **Durcissement proposé, non fait** : épingler le SHA du périmètre dans la
  métadonnée rendrait la péremption détectable au lieu d'être un commentaire —
  mais cela éteindrait les priorités que le praticien vient d'allumer. Sa
  décision, pas la nôtre.

`npm run check` vert ; les trois bancs couvrant l'abstention joués
explicitement (65 tests). T2/T3 injouables dans le conteneur distant.
