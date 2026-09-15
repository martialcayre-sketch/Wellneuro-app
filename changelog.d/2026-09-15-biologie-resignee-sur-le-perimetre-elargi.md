### La table biologique est re-signée — et c'est le périmètre qui a demandé la signature, pas l'inverse (2026-09-15)

Troisième attestation de `INDICATIONS_BIOLOGIE_METADATA`, et la première dont
**aucune règle n'est la cause**. Les quinze règles n'ont pas bougé, les
vingt-neuf claims non plus. Ce qui a bougé est en dehors de la table : deux des
seize instruments qu'elle cite ont été réalignés sur leurs publications — l'AQ
(`Q_GEO_03`) et le QDRS (`Q_GEO_05`).

**CINQ BANCS ONT ROUGI SEULS**, à la seconde où la cotation de l'AQ a changé.
C'est la démonstration en vraie grandeur de [[D-187]] : `BIO-NEU-01` lit
`Q_GEO_03`, dont le bloc `scoring` entier et la cotation des items entrent dans
le périmètre depuis la veille. **Sous le périmètre d'avant — les grilles
d'interprétation seules — un réalignement des items ET de la pondération serait
passé en silence** tant que les bandes n'auraient pas bougé. C'est exactement le
mode de défaillance que [[D-180]] avait constaté après coup sur la borne du
PSQI, et que le périmètre élargi devait rendre impossible.

**ET LA PREUVE TIENT AUSSI PAR CE QUI N'A PAS BOUGÉ.** La table d'orientation ne
cite ni l'AQ ni le QDRS : son `shaPerimetre` du 2026-09-14
(`2a1f4840…`) est resté identique au bit près, et n'a pas été reposé. Un
périmètre qui éteindrait les deux tables à chaque retouche d'instrument ne
prouverait rien ; celui-ci n'éteint que ce qui lit.

| | avant | après |
|---|---|---|
| `dateValidation` | `2026-09-14T00:00:00.000Z` | `2026-09-15T00:00:00.000Z` |
| `shaPerimetre` | `82ef86f0…bd0e42` | `d2499f42…142049` |
| règles / claims | 15 / 29 | **inchangés** |
| orientation | `2a1f4840…` | **inchangé, non reposé** |

Les deux anciens sha restent écrits dans le fichier, comme les précédents : une
signature remplacée se range, elle ne s'efface pas.

**LA RECOPIE ATTESTE UNE RELECTURE.** La surface de relecture a été produite
AVANT la demande — champs de scoring, bandes et cotation des deux instruments —
et la déclaration de conformité du praticien a précédé la frappe. L'outil n'a
posé ni date ni empreinte de sa propre initiative : il a écrit ce qui lui a été
attesté. C'est la seule façon dont ce verrou garde quelque chose, puisque c'est
le même outil qui avait écrit le changement à relire.

**UN GARDE A RATTRAPÉ UN OUBLI**, et il vaut d'être nommé :
`verrousSignatureDocumentes.guard.test.ts` confronte chaque `dateValidation` du
code à celle annoncée par `docs/FEATURE_FLAGS.md`. La date documentée était
restée au 14. Une signature n'est pas finie quand le code est juste — elle l'est
quand ce que le dépôt en dit l'est aussi.
