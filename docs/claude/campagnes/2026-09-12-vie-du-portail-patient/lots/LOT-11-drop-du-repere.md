---
id: "LOT-11"
titre: "drop-du-repere"
statut: "terminé — #1066 fusionnée, release-db verte, DROP constaté par conteneur (one-off-729)"
dépend_de: "LOT-10 (le code qui touchait la table a quitté la production)"
---

# LOT-11 — `portail_journal_reperes` est supprimée

## L'ordre est INVERSE de celui d'un ajout, et ce n'est pas un détail

Pour une table qu'on **crée**, le code vient après la migration. Pour une table
qu'on **supprime**, l'inverse : le code qui la touche doit avoir quitté la
production **avant** le `DROP`, sinon l'application casse entre les deux
déploiements. Le LOT-10 a donc été fusionné et déployé d'abord.

« Migration seule » emporte le schéma **et** l'effacement (`D-087`) : le modèle
Prisma, la ligne de `patient/effacement.ts` et l'entrée du mock de son banc
partent ici, faute de quoi T3 rougirait sur la dérive schéma ↔ migrations.

## Ce qui est détruit, COMPTÉ avant de l'être

**Une ligne**, sur **un dossier**, `vu_jusqua = 2026-09-12 12:34:33` — lue en
production (one-off-4288) avant d'écrire la migration. Un patient avait bien
ouvert son journal pendant les treize minutes où le drapeau fut allumé.

**Aucune clé étrangère entrante, aucune vue** ne s'appuyait sur cette table : sa
suppression n'emporte rien d'autre.

Ce compte contredit ce que la § B.4 avait d'abord affirmé — « aucun repère
n'avait encore été posé ». C'était une supposition, pas une lecture ; corrigé au
LOT-10, et redit dans la migration elle-même.

## Pourquoi elle n'avait plus de raison d'être

Elle répondait à « jusqu'où ce patient a vu son journal ». Le journal est parti
(LOT-10). Elle devait ensuite faire disparaître une LECTURE du fil une fois
faite — elle ne le pouvait pas : **un seul instant par dossier ne dit pas quel
document a été ouvert**. `portail_lectures_patient` porte cet accusé par
version (LOT-08). Sans consommateur, le repère était orphelin.

## CE QUI EST GARDÉ, ET QUI N'EST PAS DU CODE

Son contrat SQL disparaît avec elle : sept promesses éprouvées. L'une vaut
au-delà de ce cas, et elle est recopiée **dans la migration de suppression** —
le dernier endroit où quelqu'un la lira :

> `id_patient` ÉTAIT la clé primaire, et ce n'était pas une commodité : c'est ce
> qui rendait un DÉCOMPTE D'ASSIDUITÉ **impossible**, et non pas seulement
> interdit. Ce qui n'est pas conservé ne se compte pas (`DC-19`/`DC-20`).

La table suivante qui voudra dire « où en est ce patient » doit se poser la même
question avant de choisir sa clé primaire. `portail_lectures_patient` se l'est
posée et a répondu **autrement** — plusieurs lignes par dossier, donc un compte
POSSIBLE — et dit franchement, dans sa propre migration, ce qui borne alors le
risque. Deux réponses opposées, toutes deux motivées : c'est ce qu'il faut
pouvoir relire.

## Preuve

- T1 vert, `prisma validate` vert.
- T3 complet : **« No difference detected »** sur la dérive schéma ↔ migrations
  — le contrôle qui compte pour un `DROP` —, et **41 contrats SQL** joués contre
  42 avant, T3 mourant si le compte ne correspond pas.
- T3 laisse **un rouge, et c'est `D-049`** : `portail-dossier-deux-voix`,
  iPhone 13/WebKit, `page.goto` expiré à **120 s exactement**, **aucune requête
  serveur** vers cette route, surface qu'aucun fichier du diff ne touche. Non
  présenté comme vert.

## Après le merge

`release-db` à approuver — **c'est le dernier point où la suppression peut être
arrêtée** —, puis disparition **constatée par conteneur**, et non par la couleur
du workflow.

## Constaté par conteneur après `release-db` — one-off-729, 2026-09-12

`release-db` a rendu ses onze étapes vertes. **Ce n'est pas la constatation.**
La couleur d'un workflow dit qu'une commande n'a pas échoué ; elle ne dit pas ce
que la base contient. Lu depuis un conteneur `scalingo run -d` :

| Lecture | Valeur |
| --- | --- |
| `portail_journal_reperes` dans `information_schema.tables` | **0** |
| `portail_journal_reperes` dans `pg_class` | **0** |
| `portail_lectures_patient` dans `information_schema.tables` | **1** |
| `portail_lectures_patient`, lignes | **0** |
| `20260912190000_portail_journal_repere_drop` | fini `2026-09-12 17:39:52 UTC`, `rolled_back_at = NULL` |
| `20260912170000_portail_lectures_patient_v1` | fini `2026-09-12 16:00:51 UTC`, `rolled_back_at = NULL` |

Les deux vues — catalogue logique et catalogue physique — sont interrogées parce
qu'une seule ne prouverait qu'une moitié : une table peut disparaître d'une vue
et survivre dans l'autre si la suppression a été partielle.

**CE QUE LA DERNIÈRE LIGNE DIT, ET QU'IL NE FAUT PAS TAIRE.**
`portail_lectures_patient` est vide. Elle est en service depuis 16:00 UTC, et
**aucun patient n'a ouvert un bilan ni une synthèse depuis**. Le chemin
d'écriture des accusés n'a donc **jamais été emprunté en production** : il n'est
tenu que par ses bancs et par un E2E. Une absence se constate — celle-ci est
constatée, et elle est jeune.

**LE POINT D'ARRÊT ANNONCÉ N'EN ÉTAIT PAS UN.** J'avais dit au responsable que
`release-db` demanderait son approbation et que ce serait le dernier moment pour
dire non. C'est faux : l'environnement `release-db` ne porte qu'une **minuterie
de cinq minutes**, aucune porte de relecture. À 17:34:49 le run est passé seul en
`in_progress`. Les trois minutes pendant lesquelles l'API a répondu « no pending
deployment requests to approve or reject » n'étaient pas un refus de permission —
c'était l'API disant qu'il n'y avait **rien à approuver**. Le dernier point
d'arrêt réel était le merge de la PR.
