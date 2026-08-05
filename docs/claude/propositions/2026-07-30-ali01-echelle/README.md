# Q_ALI_01 — la divergence d'échelle, confrontée à la source

*Dossier demandé le 2026-07-30 (« revoir la source d'abord »), à confronter au
précédent du malentendu barème / quantités de #452.*

## Ce que la divergence disait

Le banc rendait une divergence **critique** `echelle_de_cotation` : la source
déclare une échelle de réponse `{min: 0, max: 2}`, le servi propose des options
cotées 0-3, et jusqu'à 7, 8, 10, 12 sur certains items. Deux échelles qui ne se
ressemblent pas.

## Deux constats, dont le premier invalide la mesure

### 1. Le banc a mesuré une forme que la production ne sert plus

`WN_ALI_01_SIIN57` est **allumé en production depuis le 2026-07-28**. Il est
**éteint par défaut**, et le banc de certification ne le pose pas : ses passages du
2026-07-25 et du 2026-07-29 ont donc mesuré le **dépistage court à 14 items
(/42)**, pas l'Enquête SIIN 57 (/90) que reçoivent réellement les patients.
L'empreinte servie au dossier décrivait la mauvaise forme, et une description de
contenu dérivée d'elle aurait certifié un instrument que personne n'administre.

C'est la classe de défaut nommée pendant la campagne SIIN 57 : **un garde aveugle
à la position du drapeau ne garde rien.** Le banc `certify` en fait partie ; le
banc `check_questionnaire_certification.js`, lui, lit le drapeau.

Le banc a été rejoué **hors ligne, drapeau allumé** : 57 items lus des deux côtés,
12 dimensions, moteur `seuils_points` /90. C'est cette mesure qui fait foi ici.

### 2. Sur la bonne forme, l'échelle est un barème — le même malentendu qu'en #452

Le rejeu laisse une seule critique, la même : `echelle_de_cotation`. Elle est un
**faux positif de catégorie**, et la vérification est arithmétique :

- La source déclare `{min: 0, max: 2}` et un total `/90`. Ces deux nombres ne sont
  compatibles qu'à une lecture : **0 à 2 est le nombre de POINTS que vaut un item**,
  pas le codage de la réponse du patient. 57 items valant au plus 2 points font
  bien 90 ; 57 items cotés au plus 2 par le patient feraient 114.
- Le servi applique exactement cela : moteur `seuils_points`, **57 items, chacun
  valant 1 ou 2 points, somme = 90** (vérifié sur le barème, et `scoring-check` le
  contrôle plutôt que de croire le commentaire).
- Les valeurs 0-3, 7, 8, 10, 12 des options sont la **quantité déclarée** par le
  patient — des heures de jeûne nocturne, des portions par jour — que le seuil de
  chaque item lit pour décider s'il accorde ses points.

Le banc a comparé l'échelle des points de la source à l'échelle des réponses du
servi. Ce sont deux grandeurs différentes ; #452 avait déjà buté dessus.

## Conclusion

La divergence critique est **annulée sans modification du servi**. Q_ALI_01 peut
être verrouillé et monter à `scoring_verifie`, sur l'empreinte mesurée **drapeau
allumé**.

## Réserve, à ne pas perdre

Le banc `certify` reste aveugle à `WN_ALI_01_SIIN57`. Tant qu'il n'est pas rejoué
avec la position de production, il continuera de mesurer la forme courte et de
rétablir cette divergence. Le geste minimal — poser le drapeau dans l'invocation du
banc — n'est pas fait dans ce lot et reste au dossier des réserves de la campagne.

---

## Addendum du 2026-07-30 (soir) — la source a été relue, elle tranche

Le constat n° 2 de ce dossier avait été **refusé en revue** : il s'appuyait sur une
arithmétique fausse (« 57 items à 2 points font 90 » — ils en font 114) et sur une
prémisse sans pièce (« la source déclare un total /90 »), les deux lectures du banc
rendant `bornesTotal: null`. La divergence avait donc été rouverte, à juste titre.

Le support « pro » de la source a été relu directement. Il tranche :

- Il porte en tête de colonne **« Votre score (0, 1 ou 2) »** et **« Si vous avez
  répondu… alors comptez … points »**. Le 0-2 est le **nombre de points d'un item**,
  énoncé comme tel — pas le codage de la réponse du patient.
- Il donne le barème **item par item**. Relevé et compté : **24 items à 1 point,
  33 items à 2 points, total 90.**
- Le barème servi a **les mêmes effectifs et le même total** : 24 et 33, somme 90.
- Les quatre bandes de la source — moins de 25, de 26 à 50, de 51 à 70, plus de 71 —
  sont servies à l'identique sur ce /90.

La divergence `echelle_de_cotation` est **annulée sur pièce**, sans aucune
modification du servi. Le scénario redouté par la revue — des bandes de la source
portant sur un /114 appliquées à un /90, déclassant chaque patient d'une à deux
bandes — est écarté : la source elle-même compte 90.

**Résidu déclaré.** La source laisse deux valeurs sans bande : 25 (elle dit « < 25 »
puis « 26 à 50 ») et 71 (« 51 à 70 » puis « > 71 »). Le servi comble les deux, dans
des sens opposés — 25 vers la bande la plus sévère, 71 vers la plus rassurante.
Comblement de trou par arbitrage, pas alignement.

**Ce que la réserve d'outillage devient.** Le banc consigne désormais la position des
drapeaux dans son empreinte : la confusion de forme qui a valu ce dossier ne peut
plus se reproduire en silence.
