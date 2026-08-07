### Clôture — les dettes résiduelles des packs, sur pièce relue (2026-08-07)

La campagne `2026-08-07-dettes-packs-residuelles` se ferme sur ses deux lots :
un instrument suspendu redevenu retirable d'un pack (LOT-00, code et donnée) et
la première preuve E2E du parcours d'envoi (LOT-01). C'était le périmètre
déclaré ; rien d'autre n'est fermé.

**La pièce du LOT-00 a été relue à la clôture, pas reprise.** La campagne
précédente s'était close en bénissant une preuve antérieure à la dérive qu'elle
avait elle-même produite — un chemin qu'on ne refait pas pour le prix d'une
requête. Lecture de production en fin de journée : « Base de consultation » est
toujours actif à cinq questionnaires, son `updated_at` est **inchangé** depuis le
geste praticien de 15:46, et **aucun pack de la base ne référence `Q_ALI_09`**.
Le prérequis d'allumage du runbook agenda tient donc toujours.

**Ce que la clôture laisse ouvert, et le dit.** Les cinq dettes de packs nommées
sans lot d'accueil. La réserve qui les dépasse : **un prérequis de runbook
vérifié à l'allumage n'est re-vérifié par rien ensuite** — celui de
`WN_AGENDA_ALI`, satisfait le 2026-08-05, a été cassé le lendemain à 18:02 par
une écriture sur le pack de base, sans alerte, sur un pilote déjà lancé. Et la
question clinique de `R2-SOM-05`, qui est une décision praticien.

Les deux questions ouvertes de la campagne sont tranchées : le retrait d'un
instrument suspendu est une case décochable dans un bloc distinct, et l'E2E
**s'arrête à l'assignation créée** — l'envoi du mail n'est pas asséré.

L'activité primaire passe à `2026-08-05-cloture-des-dettes-wellneuro-5-0`
(LOT-06).
