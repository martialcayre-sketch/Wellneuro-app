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
bouge pas**. Le contrat SQL éprouve désormais les deux faces — un fil de
correction à trois maillons accepté, un doublon de saisie neuve toujours
refusé **alors que des corrections existent** —, si bien qu'une future
migration qui rendrait l'index total ferait rougir le cas positif, et qu'une
qui le rendrait non unique ferait rougir le négatif.

Deux formes ont été écartées et le registre dit pourquoi (`D-124`) : rendre
l'index simplement non unique aurait supprimé **en silence** la garde
anti-doublon ; un marqueur `remplace_le` sur la ligne d'origine aurait coûté
un `UPDATE` et la fin de l'append-only strict pour rien de plus.

Un `CHECK` interdit qu'une ligne se supplante elle-même : elle ne serait
jamais tête de fil, et la mesure disparaîtrait de la série sans que rien ne le
signale.

**Cette migration n'ouvre aucun geste** : elle prépare le terrain, le geste de
correction vient au lot suivant. `WN_CB_RESULTS_ENABLED` n'est pas posé en
production et la table comptait 0 ligne — l'échange d'index est gratuit
aujourd'hui, il ne l'aurait pas été une fois des mesures saisies.
