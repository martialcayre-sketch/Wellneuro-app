### Registre des instruments — dix références deviennent vérifiables, et les vingt règles disent enfin quel besoin elles explorent (2026-09-14)

**DEUX ENTRÉES SUR SOIXANTE-CINQ PORTAIENT UN IDENTIFIANT VÉRIFIABLE.** Le
registre classait 43 instruments en `reference_identifiee`, mais cette étiquette
n'exige qu'**un** champ non vide — un nom d'auteur suffit. La référence était
désignable ; rien ne disait qu'elle avait été retrouvée. Elles sont douze
désormais.

**LE LOT N'EST PAS ARBITRAIRE, ET C'EST TOUT SON INTÉRÊT.** Ce sont les
instruments dont les grilles venaient d'entrer dans un périmètre de signature
([[D-182]]) et d'être relues à ce titre. Vérifier la bibliographie de ce qu'on
vient de signer est le seul ordre qui se défende — l'inverse aurait été de
certifier des bandes dont la source reste à retrouver.

Les identifiants ont été relevés par **interrogation directe de PubMed**
(E-utilities : `esearch` puis `esummary`), concordance auteur + année + titre
vérifiée article par article, puis validés par le praticien. `references.verifiePar`
porte la MÉTHODE, comme les sept notices antérieures — pas une étiquette, et pas
un nom seul.

**DEUX CAS MÉRITENT D'ÊTRE LUS AVANT D'ÊTRE CRUS.**

`Q_SOM_06` portait **déjà** le PMID que la recherche a rendu, sous une notice
« non contre-vérifiée par le praticien ». Un garde d'écriture a refusé de
l'écraser et a demandé l'arbitrage : une valeur identique n'est pas un conflit,
c'est une corroboration indépendante. Elle est donc conservée et sa notice
relevée, jamais remplacée.

`Q_STR_02` est le cas que le document de gouvernance existe pour décrire.
**Aucun identifiant ne désigne la forme servie.** Le PMID `6668417` désigne le
PSS à 14 items (Cohen, Kamarck & Mermelstein, 1983) ; la forme servie est le
PSS-10 de Cohen & Williamson (1988), chapitre d'ouvrage — Spacapan & Oskamp
(dir.), *The Social Psychology of Health*, Sage, p. 31-67 — non indexé sur
PubMed et sans DOI (recherché : seul un numéro d'accession PsycNET existe, et un
numéro d'accession n'est pas un identifiant pérenne de document). Le PMID désigne
donc la SOURCE DIRECTE, et `verifiePar` l'écrit en toutes lettres plutôt que de
laisser l'identifiant faire croire le contraire.

**AUCUN RECLASSEMENT SUR TROIS, ET C'EST LE PLUS INSTRUCTIF DU LOT.** Trois
instruments paraissaient mal classés en `reference_identifiee` : `Q_PED_02`,
`Q_TAB_04` et `Q_NEU_06` n'ont ni auteur ni année. **Les trois ont pourtant une
source externe identifiée**, et le raisonnement qui les condamnait était le même
à chaque fois — conclure de ce qu'un champ ne dit pas.

`Q_TAB_04` vient du *Know cannabis test* (Kerssemakers, clinique Jellinek,
Amsterdam, 2000), repris par l'OFDT — c'est écrit dans son propre `verifiePar`,
à côté du champ vide. `Q_PED_02` est relu contre le support Conners, également
écrit là. **Un champ vide ne dit pas qu'il n'y a rien ; il dit que ce n'est pas
écrit là.**

`Q_NEU_06` a bien été reclassé, puis **rendu à son statut** : un garde dédié
(`mmtReconstruit.guard.test.ts`) interdit explicitement
`referentiel_interne_siin` sur cet instrument, et son commentaire nomme le motif
— « ce serait conclure de ce qu'un support ne dit pas : **la faute commise sur le
VQ11 le 2026-07-30** ». L'identité du MMT est établie par un exemplaire
INDÉPENDANT et public (`WN-SRC-0445`), pas par le silence du support SIIN. Le
dépôt avait déjà commis cette erreur, avait écrit le garde qui la referme, et
c'est ce garde qui a arrêté la répétition.

**LES CHIFFRES DU DOCUMENT DE GOUVERNANCE SUIVENT, ET UN BANC L'A EXIGÉ.**
`verifier_registre_instruments.test.mjs` compare la LISTE des entrées à
identifiant vérifiable, pas seulement le compte — « deux erreurs qui se
compensent passeraient sur un compte ». Les douze sont donc nommées.

---

### Orientation — les vingt règles disent quel besoin elles explorent

**LE CHAMP `needIds` ÉTAIT DÉCLARÉ DEPUIS L'ORIGINE ET VIDE PARTOUT.** Il
promettait un rattachement qui n'existait nulle part, et `orientationEngine`
agrégeait donc toujours une liste vide — un champ optionnel jamais rempli est une
capacité affichée qui n'existe pas.

**QUATORZE VALEURS SONT DÉRIVÉES, SIX SONT ARBITRÉES, ET LA PROVENANCE EST
ÉCRITE RÈGLE PAR RÈGLE** — parce que les deux ne s'auditent pas de la même façon.
La dérivation lit `BESOIN_SOURCES`, qui rattache chaque instrument au besoin
qu'il source, avec sa justification clinique au guide et un garde d'alignement
sur le registre.

**POURQUOI SIX N'ONT PAS PU ÊTRE DÉRIVÉES.** `BESOIN_SOURCES` répond à « quels
instruments SOURCENT le score Mon Équilibre », pas à « que cette règle EXPLORE ».
Les deux questions ont la même forme et pas la même réponse : le questionnaire de
Pichot a été retiré du besoin 2 délibérément — « la fatigue ne mesure pas la
couverture micronutritionnelle » — ce qui ne dit rien de ce que `R2-SOM-06`
explore. Dériver ces six-là aurait produit une liste VIDE sur des règles qui
explorent manifestement le sommeil ou le stress. Elles ont été demandées au
praticien, pas déduites.

La carte est épinglée par un banc qui la compare entière, et non par un compte :
« vingt règles ont un `needIds` » resterait vert sur un rattachement changé.

**LA TABLE D'ORIENTATION N'EST DONC PLUS SIGNÉE**, et les deux bancs de
concordance rouges sont le verrou. `needIds` vit dans le périmètre : le contenu
clinique a changé, la signature se refait. Empreinte du nouveau périmètre :
`4b4af9f60ada122a90c22e9c97e9b2ec09270cc9357850cbeb316d67f7305d6f`.

**Rien ici ne pose ce sha.** Cette relecture-ci porte sur vingt rattachements —
dont six que le praticien a nommés lui-même, et quatorze qu'il n'a pas encore
relus.
