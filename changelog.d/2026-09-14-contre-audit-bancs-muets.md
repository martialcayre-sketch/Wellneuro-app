### Contre-audit — trois bancs qui gardaient moins qu'ils ne l'annonçaient, et une justification devenue fausse (2026-09-14)

Un contre-audit externe a été lancé sur le lot bibliographique, avec une
consigne unique : pour chaque assertion ajoutée, **quelle mutation la ferait
rougir ?** Six constats, tous vérifiés ici avant correction. Trois relèvent de
la mécanique et sont corrigés dans ce fragment ; trois demandent un arbitrage
praticien et sont consignés sans être touchés.

**DEUX BANCS DE MUTATION PASSAIENT SUR LA FORME, PAS SUR LA VALEUR.** Les bancs
« déplacer une borne de grille change le sha » et « renommer un libellé change
le sha » remplaçaient l'entrée `Q_SOM_01` du périmètre — qui est un **objet**
`{severiteCroissante, sansTotalGlobal, interpretation}` — par un **tableau** nu
de bandes. Ils mesuraient donc le changement de forme, et seraient passés à
bandes strictement identiques : la contre-épreuve `Q_SOM_01: BANDES_PSQI`,
aucune valeur touchée, faisait déjà bouger le sha.

C'est **exactement** le défaut relevé le même jour sur les deux bancs de
drapeaux du plancher, corrigé là-bas et laissé ici — le correctif n'avait pas
été porté à ses voisins immédiats. Les deux mutations préservent désormais la
structure et ne déplacent qu'une valeur.

**ET LA CONTRE-ÉPREUVE MANQUANTE EST ÉCRITE.** Un banc de mutation n'établit son
propos que si le NON-mutant passe : sans lui, « le sha a changé » reste
compatible avec « le sha change à tout coup ». Le banc « une grille recopiée à
l'identique, structure préservée, ne le change PAS » ferme le raisonnement dans
l'autre sens. Les deux ensemble prouvent ce qu'aucun des deux ne prouvait seul :
ce sont les VALEURS des bandes qui pèsent dans l'empreinte.

**LE NOMBRE BIBLIOGRAPHIQUE ÉCHAPPAIT AU BANC QUI PORTE SON NOM.** La capture de
`verifier_registre_instruments.test.mjs` commençait à « entrées seulement »,
c'est-à-dire APRÈS le nombre : porter « 12 » à « 999 » dans
`docs/gouvernance-questionnaires-scoring.md` laissait les 76 bancs verts. La
liste nommée était bien comparée — c'était le propos du banc, et il tenait —,
mais le nombre qui l'introduit ne l'était pas. Il l'est ; la mutation `12 → 999`
le fait rougir.

**UNE JUSTIFICATION EST DEVENUE FAUSSE LE JOUR MÊME OÙ ELLE A ÉTÉ CORROBORÉE.**
La réserve métrologique de `Q_GEO_06` (test des 5 mots de Dubois) affirmait que
« `doi`, `pmid` et `dateVerification` sont nuls ci-dessus » pour fonder son
doute sur les 85 % / 90 % servis. Le lot du 2026-09-14 a renseigné `pmid` et
`dateVerification` quelques lignes plus haut, dans cette même entrée, sans
toucher la phrase qui les déclare nuls.

**LA RÉSERVE N'EST PAS LEVÉE, ET C'EST TOUT L'OBJET DE LA CORRECTION.**
Retrouver l'identifiant d'un article prouve qu'il existe et qu'il est
désignable ; il ne prouve pas que les deux chiffres lui appartiennent, ni qu'ils
portent sur le critère servi. Le texte intégral n'a pas été lu. La condition de
levée est réécrite en conséquence : la LECTURE de la publication et le relevé
des deux valeurs dans son texte — renseigner `references` n'y suffit pas.

`Q_FIB_01` porte la même phrase et reste VRAIE : ses trois champs sont nuls. La
correction est bornée à l'entrée qui a changé.

**CE QUI EST CONSIGNÉ SANS ÊTRE TOUCHÉ**, et qui demande un arbitrage :

- le périmètre signé couvre la dernière étape du calcul (score → couleur) et pas
  celle d'avant (réponses → score) — `subScores[].items`, `threshold`,
  `subscalesA`/`subscalesD`, `phases`, `type` et les valeurs d'options restent
  dehors sur les dix-sept instruments cités ;
- le QDRS servi (`Q_GEO_05`) substitue un domaine « Déambulation » au domaine
  « Humeur » de Galvin 2015 ;
- l'AQ servi (`Q_GEO_03`) remplace le domaine Orientation de Sabbagh 2010 par un
  bloc comportemental de cinq items absent de la publication.

Aucun `shaPerimetre` n'est posé ni déposé par ce fragment.
