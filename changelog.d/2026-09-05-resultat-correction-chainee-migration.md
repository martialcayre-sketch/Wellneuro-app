### La base ouvre la porte à la correction d'une mesure : unicité rendue partielle (2026-09-05)

Corriger une saisie de résultat biologique était **structurellement
impossible**, et pas faute de code : `cb_resultat_bio_patient_analyte_idx`
était UNIQUE sur `(patient, analyte, date de prélèvement)`, or une correction
porte par définition la clé de ce qu'elle corrige. Le régime maison — corriger
crée une LIGNE qui référence l'ancienne, jamais un `update` (au moins dix
chaînes `supersedes_*` au schéma, esprit `DC-30`) — se heurtait à un index.

**L'unicité devient partielle** : elle ne vise plus que les lignes dont
`supersedes_resultat_id IS NULL`, c'est-à-dire les saisies **neuves**. Une
correction porte un `supersedes` non nul et sort de l'index ; une saisie neuve
en doublon continue de le violer. Cette seconde moitié est tenue exprès : le
409 `doublon_mesure` de la route est un rattrapage de `P2002`, et il **ne
bouge pas**. **La garde conserve son nom** — il désigne l'unicité depuis la
création de la table, et un audit qui la cherche par son nom doit continuer de
la trouver ; c'est l'index de LECTURE, nouveau, qui prend un nom neuf
(`cb_resultat_bio_serie_idx`). Il manquait à la forme littérale de la
décision : la garde partielle ne couvre que les têtes, alors que la série se
lit entière — une correction doit rester lisible avec ce qu'elle corrige.

Le contrat SQL éprouve désormais **trois** faces, parce que deux ne
suffisaient pas : un index rendu non unique laisserait passer le doublon, un
index rendu total sur les trois colonnes refuserait la correction — mais un
index total sur **quatre** colonnes (les trois plus `supersedes_resultat_id`)
passerait ces deux cas sans broncher. Seule **la fourche** le débusque : une
seconde correction de la même ligne d'origine, qui porte le même quadruplet.
Le contrat éprouve en outre la **forme** de l'index et non seulement son
comportement — un `@@unique` redéclaré au schéma rendrait l'index total sans
que la dérive schéma ↔ migrations rougisse, puisque l'état serait cohérent.

Deux formes ont été écartées et le registre dit pourquoi (`D-124`) : rendre
l'index simplement non unique aurait supprimé **en silence** la garde
anti-doublon ; un marqueur `remplace_le` sur la ligne d'origine aurait coûté
un `UPDATE` et la fin de l'append-only strict pour rien de plus.

Un `CHECK` interdit qu'une ligne se supplante elle-même : elle ne serait
jamais tête de fil, et la mesure disparaîtrait de la série sans que rien ne le
signale. C'est un **écart assumé au patron maison** — aucune des dix autres
chaînes `supersedes_*` ne le porte, et il est en pratique inatteignable. Il
est strictement resserrant, donc conservé, et l'asymétrie est nommée au
registre plutôt que passée sous silence.

Ce que la base **ne** ferme **pas**, et qui revient au geste : la référence
est souple, sans clé étrangère (patron maison), si bien qu'une cible
inexistante est acceptée — le contrat le dit désormais explicitement, plutôt
que de laisser croire à une contrainte oubliée. Conséquence à porter au code :
une ligne au `supersedes` non nul étant hors index, un `supersedes` accepté
sans contrôle contournerait la garde anti-doublon sans limite.

**Cette migration n'ouvre aucun geste** : elle prépare le terrain, le geste de
correction vient au lot suivant. `WN_CB_RESULTS_ENABLED` n'est pas posé en
production et la table comptait 0 ligne — l'échange d'index est gratuit
aujourd'hui, il ne l'aurait pas été une fois des mesures saisies.
