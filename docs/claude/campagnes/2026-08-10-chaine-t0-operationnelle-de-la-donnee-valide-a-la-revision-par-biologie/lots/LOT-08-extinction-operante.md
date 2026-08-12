---
id: "LOT-08"
titre: "Extinction opérante — comptes de recueil, contradiction bloquante, garde de restitution"
statut: "à_faire"
dépend_de: "LOT-03"
---

# LOT-08 — Extinction opérante

## But

Faire mordre ce que le LOT-03 a livré inerte. STOP-STR est écrite, testée et
non signée ; même signée, elle ne peut rien éteindre, parce que son déclencheur
porteur `Q_STR_01` passe par un moteur de scoring qui ne publie aucun compte de
recueil et que la garde de complétude du moteur d'arrêt refuse — à raison —
d'éteindre sur un instrument dont la complétude n'est pas lisible
(`stopRulesV1.ts:33-48`). Le lot lève ce verrou, écrit la borne inverse que
`D-053 §5` laisse en dette, et rend l'extinction distinguable d'une
recommandation dans le garde de restitution.

## Résultat observable

Sur la fixture : un `Q_STR_01` à trois items sur vingt et un **n'éteint rien**
(le moteur publie `repondus`/`missing`, la garde de complétude mord et le dit) ;
un `Q_STR_01` complet et rassurant, DASS-21 et Cungi rassurants, éteint
`R2-STR-01/02/03` avec motif visible ; une contradiction ouverte sur l'axe
**empêche** l'extinction, sans jamais la déclencher ; le garde de restitution
refuse au modèle de présenter une cible éteinte comme une exploration
recommandée, et l'inverse.

## Décision préalable — obligatoire

`D-054` avant la première ligne de code (`DC-17`, `DC-18`) : publier les comptes
de recueil de `group_majority` est une modification du moteur de scoring, et
`D-053 §1` fait de la lisibilité de la complétude un critère d'admission à
l'extinction. La décision tranche au minimum :

- ce que `group_majority` publie (`repondus`, `missing`, `items`) et à quelle
  granularité — global, par sous-score, ou les deux ;
- ce que devient `total` quand le recueil est incomplet : `totalSousScore` rend
  un total dès **un** item par groupe, et cette valeur alimente aujourd'hui la
  bande servie au praticien. Toucher à `total` déplace une interprétation
  clinique déjà en production — un fait à trancher explicitement, pas un effet
  de bord ;
- la définition opérante de « contradiction ouverte » pour `D-053 §5` : quelles
  contradictions (C-STR seule, aujourd'hui la seule publiée), sur quel périmètre
  (l'axe de la règle éteinte, ou le dossier), et l'écart `D-050` non refermé —
  le moteur de contradictions évalue le dossier entier là où `review` porte sur
  l'épisode T0.

Aucun seuil, dose ou borne clinique nouveau n'entre par ce lot. Si la décision
conclut que `D-053 §5` doit s'écrire autrement qu'énoncé, elle amende `D-053`
plutôt que de la contourner.

## Périmètre

- **Comptes de recueil de `group_majority`** — le moteur
  (`questions.ts:2762-2783`) publie sa complétude comme le fait déjà `psqi`,
  sur le patron `sumItems`/`{total, missing, repondus}` déjà en place dans le
  fichier. Type de sortie étendu côté `questionnaire-types.ts`.
- **STOP-STR mord** — la garde de complétude du moteur d'arrêt lit ces comptes ;
  un recueil incomplet ou muet n'éteint pas (fail-closed conservé, jamais
  desserré). Aucune modification de la table d'arrêt elle-même, hors ce que la
  signature exige.
- **`D-053 §5` reçoit son code** — une contradiction ouverte **interdit**
  l'extinction ; elle ne la déclenche jamais. Écrit dans le moteur, après
  l'absorption pack/membre et avant le tri, jamais dans une route ni dans un
  composant (`D-053`, conséquences).
- **Garde de restitution** — `verifierRestitutionOrientation` (171 lignes,
  aucune notion d'extinction aujourd'hui) distingue une cible éteinte d'une
  cible recommandée. La consigne du prompt est ce qui protège aujourd'hui ;
  une consigne n'est pas une garde.
- Signature de `stopRulesV1.ts` : la table est livrée **non signée**, verrou
  unique `tableArretSignee()` commandant extinction et exclusion `dejaRepondu`.
  La signer est le geste qui met le lot en production — il se confirme
  séparément, une fois les trois points ci-dessus verts.

## Hors périmètre

- **Borne d'ancienneté de l'exclusion `dejaRepondu`** — aucun chiffre fondé au
  dépôt, la fenêtre de fraîcheur a déjà été écartée pour ce motif (`DC-19`,
  `DC-20`). Question ouverte de campagne, arbitrage praticien.
- SCOFF, STOP-SOM, STOP-APN : restent dehors avec leurs motifs dans la table
  (`D-053 §4`). Rouvrir STOP-APN suppose de refermer d'abord le même défaut de
  complétude sur le moteur Berlin (`Q_SOM_03`) — même classe de problème que
  celui traité ici, pas le même instrument.
- Régénération des synthèses historiques (`D-053 §6`, hors campagne).
- Toute trace persistée d'extinction : rien n'est persisté, aucune migration.

## Fichiers probables

`web/src/lib/questions.ts:2114-2193` (`totalSousScore`) et `:2762-2783`
(moteur `group_majority`), `web/src/lib/questionnaire-types.ts`,
`web/src/lib/clinical/orientationEngine.ts` (boucle d'extinction),
`web/src/lib/clinical/stopRulesV1.ts` (signature),
`web/src/lib/clinical/verifierRestitutionOrientation.ts`,
`web/src/lib/clinical/orientationService.ts`.

## Interdits

- Ne pas desserrer la garde de complétude pour faire mordre la règle : c'est
  l'instrument qui doit devenir lisible, jamais la garde qui doit se taire.
- Une donnée absente n'est ni zéro ni normale (`DC-24`) — un compte manquant
  vaut « illisible », pas « complet ».
- Une contradiction ne déclenche jamais une extinction (`DC-30`).
- Aucun seuil, aucune bande, aucune valeur clinique nouvelle.
- Aucune migration ; aucune écriture en production hors release-db.
- La certification scoring doit rester verte : le moteur touché sert des
  instruments certifiés, toute dérive de verdict est un bloquant, pas un
  ajustement.

## Dépendances

LOT-03 (table d'arrêt, moteur d'extinction, `dejaRepondu` excluant).
**À exécuter avant le LOT-05** : ce dernier étend le même
`verifierRestitutionOrientation` pour les intentions de complément — deux
extensions concurrentes du même garde se croiseraient.

## Étapes

1. `D-054` rédigée, soumise, acceptée.
2. Comptes de recueil publiés par `group_majority` + bancs (dont le cas « trois
   items sur vingt et un »).
3. Garde de complétude du moteur d'arrêt branchée sur ces comptes ; STOP-STR
   démontrée mordante et démontrée muette sur recueil partiel.
4. Contradiction ouverte bloquante (`D-053 §5`) + bancs des deux sens.
5. Garde de restitution : éteinte ≠ recommandée, dans les deux directions.
6. Signature de la table d'arrêt — confirmation distincte.

## Tests

- `Q_STR_01` incomplet ⇒ aucune extinction, motif de complétude lisible.
- `Q_STR_01` complet + rassurant, DASS-21 et Cungi rassurants ⇒ extinction
  motivée de `R2-STR-01/02/03` ; `R-STR-01`/`R-STR-02` intactes (`D-053 §2`).
- Contradiction ouverte ⇒ extinction refusée ; aucune contradiction ne produit
  jamais d'extinction.
- Restitution : une cible éteinte présentée comme recommandée est rejetée.
- Certification scoring rejouée dans les deux positions du drapeau.
- **T3** (segment E2E lu au CI, `D-049`).

## Done

- `D-054` au registre ; `D-053 §5` refermée ou amendée explicitement.
- Fragment `changelog.d/` (changement de comportement d'orientation et de
  moteur de scoring).
- Revue `wn-reviewer` refermée avant de passer la main.
