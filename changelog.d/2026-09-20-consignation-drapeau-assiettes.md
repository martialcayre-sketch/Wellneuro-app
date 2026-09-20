### Le drapeau des assiettes indiquées est consigné : posé le 2026-09-20 à 08:11 UTC, et NON constaté faute de témoin (2026-09-20)

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

**POSÉ, NON CONSTATÉ — et non constatable pour l'instant.** La quatrième preuve
manque, et la raison n'est pas une panne : la route teste la **session avant le
verrou**, donc un appel anonyme rend `401` dans les deux états. C'est l'inverse
de `WN_ADRESSAGE_COURRIER`, dont la garde de drapeau est la première instruction
et qui se sonde donc de l'extérieur. Le seul témoin ici est la ligne que
`verifierAppartenancePatient` écrit au journal d'accès quand un praticien ouvre
la sous-vue Protocole.

**Et ce témoin n'a pas pu se produire.** Relevé le 2026-09-20 à 11:18 UTC, par
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

**Une correction de compte, portée ici plutôt que dans le handoff mergé.** Son
§ 6 annonce « 57 » cas pour les trois bancs neufs ; le recompte sur `main` en
donne **59** (26 + 12 + 21), deux cas ayant été ajoutés au banc du panneau au
troisième tour de revue et racontés au § 8 sexies sans que le total soit refait.
Quatrième compte faux de ce lot, tous de la même forme : **un total recopié
depuis un résumé au lieu d'être recalculé depuis la source**. Un handoff mergé ne
se réécrit pas ; la correction se consigne.
