### Reprise des bornes signées sans avoir été lues (2026-07-28)

Le garde de contenu du 2026-07-27 ferme la voie rapide en amont ; il ne revient
pas sur une signature acquise. Cette migration s'occupe de ce qui était déjà
passé.

Sur les 148 claims couverts par une signature de lot, **95 ne figuraient dans
aucun échantillon tiré** — donc validés sans qu'aucun œil ne les lise — et **28
portent une borne** au sens du garde. Ce ne sont pas des plages de laboratoire :
apports EFSA et OMS, ANC lipides et fer, ratio linoléique/alpha-linolénique,
seuil « moins de 800 kcal », cotations DietScore. L'enjeu clinique est moindre
qu'une grille ferritine ; le mécanisme est identique, et la surface qui les
servira n'est pas encore ouverte — c'est maintenant qu'il est le moins coûteux de
les relire.

Ils repassent en `EN_ATTENTE_VALIDATION`, **signature effacée**, chacun
journalisé en `decision_individuelle` sous une identité qui se nomme
(`migration:20260728090000_…`) et jamais sous une adresse de praticien : une
écriture automatique ne doit pas ressembler à un geste humain.

**Le critère est le garde, pas un jugement.** La cible n'est pas une liste
d'identifiants triée à la main mais le prédicat `rag_claim_porte_seuil`
lui-même — « ce que le garde aurait écarté s'il avait existé ». Le prix est
connu : le garde sur-capture d'un tiers, quelques-uns des 28 sont des moyennes
d'étude qui se revalideront d'un coup d'œil.

**Aucune assertion d'égalité, une borne haute.** Le garde étant en production, cet
ensemble ne peut plus croître — aucun nouveau lot ne peut embarquer un claim à
borne. Il peut en revanche décroître si le praticien en reprend un d'ici au
déploiement. Épingler « exactement 28 » ferait échouer le build parce que le
praticien aurait fait son travail ; on borne donc par le haut.

Éprouvée sur PostgreSQL 15 avec une fixture qui **reproduit l'histoire** — signer
d'abord, poser les bornes ensuite, puisque le garde interdit désormais de créer
cette situation par le chemin normal. Trois cas, trois comportements distincts :
le claim à borne **non tiré** repart en attente ; celui **sans borne** ne bouge
pas ; celui **à borne mais tiré** — donc réellement lu — garde sa signature. Un
second passage ne rejournalise rien.
