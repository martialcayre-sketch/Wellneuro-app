### `portail_journal_reperes` est supprimée, et ce qu'elle prouvait est consigné (2026-09-12)

SQL destructif, demandé et confirmé en propre par le responsable.

**L'ordre est inverse de celui d'un ajout.** Le code qui touchait la table a dû
quitter la production AVANT le `DROP` (LOT-10 fusionné et déployé d'abord),
sinon l'application casse entre les deux déploiements. « Migration seule »
emporte le schéma et l'effacement : modèle Prisma, ligne de
`patient/effacement.ts` et entrée du mock partent ici.

**Ce qui est détruit, compté avant de l'être** : une ligne, un dossier,
`vu_jusqua = 2026-09-12 12:34:33`, lue en production avant d'écrire la
migration. Aucune clé étrangère entrante, aucune vue. Ce compte contredit ce que
la § B.4 avait d'abord affirmé — « aucun repère n'avait encore été posé » —, ce
qui était une supposition et non une lecture.

**Pourquoi elle n'avait plus de raison d'être** : le journal qu'elle servait est
parti, et elle ne pouvait pas faire disparaître une LECTURE du fil — un seul
instant par dossier ne dit pas quel document a été ouvert.
`portail_lectures_patient` porte cet accusé par version.

**Ce qui est gardé, et qui n'est pas du code.** Son contrat SQL disparaît avec
elle ; sa leçon centrale est recopiée dans la migration de suppression, dernier
endroit où quelqu'un la lira : `id_patient` en clé primaire rendait un décompte
d'assiduité **impossible**, et non pas seulement interdit — ce qui n'est pas
conservé ne se compte pas. `portail_lectures_patient` a répondu **autrement** à
la même question, et le dit franchement dans sa propre migration. Deux réponses
opposées, toutes deux motivées : c'est ce qu'il faut pouvoir relire.

Les contrats SQL de CI passent de 42 à 41.

**Constaté par conteneur, pas par la couleur du workflow** (one-off-729,
2026-09-12) : `portail_journal_reperes` rend **0** dans `information_schema` ET
dans `pg_class` — les deux catalogues, parce qu'une seule vue ne prouverait
qu'une moitié. Migration `20260912190000_portail_journal_repere_drop` finie à
`17:39:52 UTC`, `rolled_back_at = NULL`.

**Et un point d'arrêt annoncé à tort.** Il avait été dit que `release-db`
demanderait une approbation, dernier moment pour dire non. L'environnement ne
porte qu'une **minuterie de cinq minutes**, aucune porte de relecture : le run
est parti seul. Le dernier point d'arrêt réel était le merge de la PR.
