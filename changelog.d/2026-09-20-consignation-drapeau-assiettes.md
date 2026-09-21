### Le drapeau des assiettes indiquées est posé ET constaté : 21 heures ont séparé la pose de son premier témoin (2026-09-21)

`WN_ASSIETTES_INDIQUEES` a été posé en production ce matin, sur autorisation du
responsable rendue la veille. Sa ligne de `docs/FEATURE_FLAGS.md` disait encore
« fermé — neuf et éteint à la livraison » : c'est ce que ce lot corrige, avec la
convention que les autres drapeaux portent — date de pose, preuves, et ce qui
manque.

**La séquence, dans l'ordre que `D-237` §9 impose et qui ne se raccourcit pas.**
Code en ligne vérifié AVANT par **contenance** (`f4512705` déployé deux fois,
`success` — 02:02:42 puis 02:08:24 UTC) ; `env-set` posé après avoir relu que la
variable était **absente** ; **les deux conteneurs web recréés à 08:11:48 UTC**,
lus six secondes après — un `env-set` seul ne change rien tant que les conteneurs
tournent ; sonde d'environnement dans un one-off démarré APRÈS la pose, `true`.

**CONSTATÉ le 2026-09-21 à 05:31 UTC**, et par le comportement. Le journal
d'accès porte `/api/praticien/assiettes-indiquees` : **5 lectures servies sur 2
dossiers**, la première à 05:31:27.925 et la dernière à 05:38:12.129 UTC. C'est
la sonde qui avait été posée — verrou fermé, la route répond **avant**
`verifierAppartenancePatient` et n'écrit rien ; verrou ouvert, chaque lecture
écrit sa ligne.

**CE QUI A PRÉCÉDÉ, ET QUI EST LA LEÇON DU LOT.** Pendant **21 heures**, le
verdict a été « posé, non constaté » — et il fallait écrire *pourquoi*, sans quoi
il se serait lu comme une panne. La raison n'en était pas une : la route teste la
**session avant le verrou**, donc un appel anonyme rend `401` dans les deux
états. C'est l'inverse
de `WN_ADRESSAGE_COURRIER`, dont la garde de drapeau est la première instruction
et qui se sonde donc de l'extérieur. Le seul témoin ici est la ligne que
`verifierAppartenancePatient` écrit au journal d'accès quand un praticien ouvre
la sous-vue Protocole.

**Et ce témoin n'avait PAS ENCORE pu se produire — c'est tout ce que l'absence
disait.** Relevé le 2026-09-20 à 11:18 UTC, par
conteneur détaché — l'ancre est l'horodatage et la requête, **pas l'identifiant
du one-off** : Scalingo les réattribue, et `one-off-746` a rendu ce jour-là deux
conteneurs distincts sous un même filtre de logs, l'un du 2026-09-11.
`journal_acces_dossiers` porte 4 450 lignes, **zéro** pour
`/api/praticien/assiettes-indiquees` — mais le **dernier geste praticien du
journal entier date du 2026-09-19 à 11:21**, soit AVANT la pose. L'absence ne dit
donc rien du drapeau : elle dit que personne n'a ouvert de dossier depuis. Une
sonde sans témoin ne prouve rien, et c'est précisément la leçon que
`WN_SYNTHESE_PAR_RIDEAU` a coûtée — variable relue et conteneurs recréés y
avaient été pris pour un constat, démenti 1 h 50 plus tard (amendement du
2026-09-19 à `D-226`).

**Deux faits d'exploitation qui n'étaient écrits nulle part.** Le `release-db` de
cette nuit (run 35474830301) a joué quatre préflights en lecture seule — dont la
fraîcheur des claims épinglés, celui qui épingle les vingt paires
`indications_assiettes` — puis `86 migrations found` et **« No pending migrations
to apply »** : zéro écriture de schéma, ce lot n'en portait aucune. Et **rien ne
s'est déployé pendant ~3 h après le merge**, jusqu'à l'approbation de la porte
`release-db` ce matin ; les deux déploiements ont suivi. C'est une **corrélation
datée, pas un mécanisme** — l'inférence « le déploiement attend derrière
`release-db` » a déjà été affirmée puis corrigée, un handoff du 2026-09-12
documentant une autre cause pour un cas semblable.

**Ce que la carte pourra réellement servir — mesuré, et ça ferme une
contradiction.** Le handoff de `D-236` dit `Q_GAS_01` hors du pack de base ;
`QUESTIONNAIRE_OVERRIDES` le liste au socle. **Les deux disaient vrai sur deux
objets différents** : la base porte **8 packs et un seul `actif`** — celui par
défaut, 5 qids, sans `Q_GAS_01` —, tandis que `PACK_SOCLE_INIT` le porte bien
mais est inactif, comme les sept packs thématiques. `Q_GAS_01` n'est donc dans
**aucun pack actif**. Mesuré ici par conteneur détaché le 2026-09-21. La borne
d'âge de la ligne protéinée touche **1 dossier sur 29**, et 15 n'ont aucune date
de naissance — ce qui **réfute une phrase de `D-237` §12**, corrigée en place par
une note datée : l'ampleur y avait été supposée, jamais mesurée.

Rapportés par la session d'origine et **non relus ici**, donc attribués :
`Q_INF_03` 18 patients, `Q_GAS_01` 5, `Q_GEO_02` **zéro passation**, et 20 claims
demandés pour 20 valides — donc `retireesFauteDeClaim = 0`.

**Une correction de compte, portée ici plutôt que dans le handoff mergé.** Son
§ 6 annonce « 57 » cas pour les trois bancs neufs ; le recompte sur `main` en
donne **59** (26 + 12 + 21), deux cas ayant été ajoutés au banc du panneau au
troisième tour de revue et racontés au § 8 sexies sans que le total soit refait.
Quatrième compte faux de ce lot, tous de la même forme : **un total recopié
depuis un résumé au lieu d'être recalculé depuis la source**. Un handoff mergé ne
se réécrit pas ; la correction se consigne.
