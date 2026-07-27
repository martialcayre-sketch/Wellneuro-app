### Rayon biologie fonctionnelle — CB-02b : le notebook 08 entre au corpus (2026-07-27)

Les 27 sources du notebook « Biologie fonctionnelle » (891 pages) sont extraites,
découpées et ingérées en production sous le lot `LOT_007_2026-07-26` :
**135 chunks** et **758 claims**, ces derniers en `EN_ATTENTE_VALIDATION`.
Contrôle en base après coup (lecture `execute_sql`) : 135 chunks / 27 sources /
758 claims, dont **0 `VALIDE`** — la barrière D-003 tient, l'ingestion ne valide
rien. Rien n'est servi tant que le praticien n'a pas validé dans l'Atelier ; le
rayon reste un catalogue sans plages fonctionnelles, exactement comme avant.

**La décision G a été levée pour ce lot.** Le cadrage subordonnait CB-02b à la
stabilisation de la campagne certification, pour ne pas empiler deux files de
validation. Le praticien a levé ce gate le 2026-07-27. Conséquence assumée : la
file de revue compte désormais **2 375 claims en attente** tous lots confondus.

**Extraction contrôlée sur preuve.** Triple lecture croisée (pdftotext, Sonnet 5,
GPT-5.4) puis banc d'invariants : aucun dosage perdu par rapport aux deux
lectures indépendantes, sur les 27 sources. Les 135 chunks ont ensuite été
validés hors ligne par le parseur du serveur (`parseRagIngestPayload`) avant tout
appel réseau : 27 lots conformes, 0 rejeté.

**758 claims retenus sur 906 rédigés.** Les 148 écartés le sont par désaccord
entre le rédacteur et le contre-vérificateur, la règle de la chaîne étant que le
désaccord exclut. 121 chunks sur 135 ont produit au moins un claim retenu. Sur
les 14 restants, 12 sont stériles par nature (titres, sommaires, planches de
figures) mais **2 ne le sont pas** : `WN-CH-0049-002` et `WN-CH-0049-006`
(exploration dimensionnelle des neurotransmetteurs) ont produit 7 claims chacun,
tous exclus pour infidélité — le rédacteur transformait des intitulés de sections
de questionnaire en énoncés de causalité absents de la source. Du contenu
clinique réel n'est donc pas entré au corpus, et c'est le contre-vérificateur
qui l'a retenu. Les 135 chunks sont ingérés quoi qu'il en soit : le verbatim est
le corpus, les claims n'en sont que la dérivation.

**Deux affirmations du cadrage corrigées, et un défaut découvert au passage.**
Le tableau des lots annonçait des claims marqués `metadata.rayon:'biologie'` : la
chaîne ne produit pas ce champ, et aucun claim d'aucun lot n'en porte (0 sur
2 993 en production). Or `metadata.rayon` est la clé de filtrage du rayon corpus
C4 (`web/src/lib/supplement-library/rayonCorpus.ts`), qui filtre donc **à zéro en
permanence, pour tous les rayons** — chemin de code livré et inerte, à trancher
avant CB-08. Seconde correction : ce n'est pas l'ingestion qui ouvrira les plages
fonctionnelles mais la validation ; l'invariant « pas de plage fonctionnelle sans
claim validé » est inchangé. Le cadrage note aussi que la « voie lente »
présupposée par la décision G n'est outillée par aucun garde : 563 des 758 claims
sont aujourd'hui éligibles à la voie rapide.

Le lock de `tools/corpus/` est réparé au passage : `package.json` déclarait
`googleapis` sans que le lock committé le porte, ce qui faisait échouer `npm ci`
dans cet outillage. Ajout purement additif (583 insertions, 0 suppression,
aucune version de dépendance existante modifiée).

Aucun changement applicatif, aucune migration : documentation, ingestion de
corpus et réparation de lock.
