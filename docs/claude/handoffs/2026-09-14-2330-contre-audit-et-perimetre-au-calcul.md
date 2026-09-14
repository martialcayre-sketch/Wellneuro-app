# Contre-audit, et le périmètre signé descendu jusqu'au calcul — 2026-09-14 23:30

## Ce que le lot livre

Trois chantiers dans une PR, et le troisième n'était pas prévu.

**Registre bibliographique** — de 2 à 12 entrées portant un identifiant
vérifiable sur 65. Le lot n'est pas arbitraire : ce sont les instruments dont les
grilles venaient d'entrer dans un périmètre de signature et d'être relues à ce
titre. Trois reclassements ont été instruits et **aucun retenu** : les trois
avaient une source externe nommée dans leur propre `verifiePar`, à côté du champ
vide. `Q_NEU_06` a même été reclassé puis rendu à son statut par un garde dont le
commentaire nomme la faute — « conclure de ce qu'un support ne dit pas ».

**`needIds` sur les vingt règles d'orientation**, provenance écrite règle par
règle : quatorze dérivées de `BESOIN_SOURCES`, six arbitrées.

**Le périmètre signé étendu au calcul entier**, qui est le vrai sujet.

## Le défaut, et où il était

Le périmètre posé le 2026-09-13 hachait les GRILLES des instruments cités —
c'est-à-dire la dernière étape du calcul, `score → couleur`. Celle d'avant,
`réponses → score`, restait dehors.

Un contre-audit externe l'a démontré sur la table biologique réelle, signature
inchangée : retirer `C1_8` de `Q_GAS_01.scoring.subScores[0].items` fait tomber
le total de l'axe de 24 à 21, la couleur globale de `warning` à `success`, et
`BIO-DIG-01` cesse de proposer `PANEL_DIGESTIF_1`. Sha identique, signature
valide, aucun banc rouge. **C'est le défaut de `D-180` reproduit dans sa propre
réparation.**

L'énumération a montré que `items` n'était qu'une porte sur douze : `type`,
`maxTotal`, `note`, `dimensions`, `subscalesA`/`subscalesD`, `phases`,
`minTotal`, `bareme`, `sousScoresBesoins`, `subScores[].max` — et **`threshold`
sur `Q_INF_05`**, un champ qui s'appelle *seuil*, hors d'un périmètre bâti pour
couvrir les seuils cliniques. En dessous encore, les valeurs d'options :
`O_PSS_INVERSE` porte l'inversion d'items du PSS dans ses nombres mêmes.

**La correction n'est pas d'ajouter les champs manquants.** Le périmètre hache
désormais le bloc `scoring` ENTIER et la cotation des items. Choisir les champs
à couvrir était le piège lui-même : une sélection se périme en silence le jour
où le catalogue gagne un champ, et personne ne le voit — c'est arrivé deux fois
en deux jours. Hacher le bloc entier est auto-maintenu ; le `Q_ALI_01` en SIIN 57
a d'ailleurs rendu `bareme` et `sousScoresBesoins`, que l'énumération manuelle
n'avait pas vus.

## Le contre-audit : six constats, six confirmés

Aucun réfuté, ce qui n'était jamais arrivé ici. La consigne du prompt tenait en
une phrase : *pour chaque assertion ajoutée, quelle mutation la ferait rougir ?*

Deux bancs de mutation **mesuraient la forme** — ils remplaçaient un objet par
un tableau nu, et seraient passés à bandes identiques. Le banc du registre
capturait **après** le nombre : `12 → 999` laissait 76 bancs verts. Et la
réserve métrologique de `Q_GEO_06` affirmait `pmid` nul pour fonder son doute,
alors que le lot du jour venait de le renseigner dix lignes plus haut — réserve
**non levée**, phrase corrigée, correction bornée à cette entrée (`Q_FIB_01`
porte la même et reste vraie).

La contre-épreuve manquante a été écrite partout : « recopié à l'identique → sha
inchangé ». Sans elle, « le sha a changé » reste compatible avec « le sha change
à tout coup ».

## Ce qui reste ouvert, et c'est du clinique

Deux instruments servis divergent de la publication qu'ils nomment, et les deux
alimentent `BIO-NEU-01`, règle `publiee`.

- **QDRS (`Q_GEO_05`)** — Galvin 2015 publie « Mood » en domaine 9 et
  « Attention and concentration » en 10. Nous servons Attention en 9 et
  **Déambulation** en 10. L'humeur a disparu, la marche l'a remplacée.
- **AQ (`Q_GEO_03`)** — vingt-et-un items publiés, vingt-et-un servis, mais
  **huit publiés ne sont pas servis et huit servis ne sont pas publiés**. Le
  domaine Orientation de Sabbagh manque en entier ; cinq items comportementaux
  sont ajoutés. La pondération (six items à 2 points, maximum 27) est abandonnée
  pour une cotation plate sur 21.

**Arbitrage praticien du 2026-09-14 : aligner les deux instruments sur leurs
publications.** C'est un lot à part entière — re-certification, `D-xxx`, et
rupture de comparabilité avec les passations déjà en base. Il n'est pas commencé.

Deux contradictions à résoudre dans ce lot :

- le code dit « cotation 0/1 (vs pondérée originale) — GAP documenté », le
  registre dit « Bandes et cotation conformes à la source pour le reste ». L'un
  des deux ment depuis le 2026-07-25 ;
- le registre affirme que l'AQ est « servi avec ses bandes publiées », alors que
  l'article de 2010 **ne publie aucun seuil** — moyennes de groupe et courbes
  ROC seulement. Le praticien indique que les bandes 0-4 / 5-14 / 15-21 viennent
  de la littérature AQ postérieure, sur l'échelle **pondérée à 27 points** : la
  transposition sur une échelle plate à 21 est à retrouver et à documenter, et
  elle rend la forme servie moins sensible.

## Et une campagne ouverte

**Trente-deux instruments** classés `reference_identifiee` n'ont ni DOI ni PMID
vérifié. Arbitrage du 2026-09-14 : les faire dans la foulée, même méthode
(PubMed E-utilities, concordance auteur + année + titre). Ce que le QDRS et l'AQ
viennent de montrer dit à quoi s'attendre — ce n'est pas une formalité, et
chaque identifiant retrouvé peut ouvrir un écart publication / forme servie.

## Risques

- Le périmètre sur-couvre délibérément : réordonner `subScores` dans le
  catalogue referme les deux verrous sans qu'aucune valeur ait bougé. Assumé,
  documenté, et dans le sens sûr.
- Les `note` de scoring sont dans le périmètre **parce qu'elles portent des
  décisions de calcul** — `Q_GAS_02` y écrit que FR_Q003 est multiplié par 10,
  `Q_STR_02` y rattache le score 27 au niveau élevé. Corriger une coquille dans
  l'une d'elles referme les deux verrous. C'était le prix à payer pour ne pas
  rouvrir un allowlist.
- Six des quatorze `needIds` dérivés déclarent un besoin différent de celui que
  `BESOIN_SOURCES` rattache à leur DÉCLENCHEUR — la dérivation porte sur les
  questionnaires SUGGÉRÉS. Relu et attesté, mais c'est une position clinique et
  non un fait mécanique : `R-SOM-01` se déclenche sur le PSQI et déclare
  explorer l'humeur et le stress.
