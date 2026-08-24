# LOT-03 — la mesure, rapportée avant le banc

> Étape 3 de la fiche : « Rapporter la mesure avant d'écrire le banc — c'est
> elle qui dit si le garde a un sujet. » Elle a dit non, et elle a dit pourquoi.
> Décision : `D-105`.

Date : 2026-08-24. Périmètre balayé : **476 fichiers de test**, **595 fichiers
source**, **283 fichiers de `src/lib`** non-test.

## 1. La formulation de la fiche — zéro orpheline

Provenance cherchée dans les sources de vérité déclarées : catalogue
(`questions.ts`, `questionnaires/**`), registres, tables signées de
`src/lib/clinical/` reconnues par leur `claimsSource`, et constantes
`export const NOM = <nombre>` du dépôt.

| Passe | Candidats | Sans provenance |
|---|---|---|
| Lexique large (`seuil`, `dose`, `poids`, `bande`, `total`, `min`, `max`…) | 1 175 | 58 |
| Lexique étroit (ce qui **décide** seulement) | 128 | 25 |

**Les 25, qualifiés un par un — aucun n'est une valeur orpheline :**

| Classe | Nombre | Pourquoi ce n'est pas une orpheline |
|---|---|---|
| Lignes de fixture d'une **colonne Prisma** — `doseCibleBasse/Haute`, `seuilDoseBasse/Haute`, `doseParDjr` (`IngredientFunctionalThreshold`) | 19 | Les vraies valeurs vivent **en base**, curées et signées ligne à ligne. Le test se forge son propre monde pour éprouver un mécanisme. |
| **Codes HTTP 400** attrapés dans des titres de test — `it('création avec une bande : 400, …')` | 4 | Faux positifs de l'instrument de mesure : le `400` est un statut, pas une bande. |
| Sorties **calculées** — `aggregateScore = 61.734453`, `AGD_TST_MOY = 472` | 2 | Valeurs attendues dérivées du moteur et de la fixture, pas des cut-offs. |

## 2. Le point qui compte — la méthode prescrite est vacue

Contrôler qu'une valeur de test « existe ailleurs » **ne prouve rien**. Avec
**633 valeurs distinctes** au dénominateur, presque tout entier court trouve un
répondant par hasard. Trois exemples relevés au balayage :

- `poids = 1` — « couvert » parce que le chiffre 1 figure dans
  `indicationsBiologieV1.ts` ;
- `doseCibleBasse = 4000` — adossé à `LONGUEUR_MAX_CE_QUI_COMPTE`, qui est une
  **longueur de texte** ;
- `plafond = 40` — adossé à un registre de gabarits de correspondance.

Une **seconde formulation** a été éprouvée : un test qui réécrit en littéral la
valeur d'une constante déclarée au lieu de l'importer. 24 constantes cliniques
déclarées, 63 remontées — **toutes vacues pour la même raison** : un `3`
n'importe où dans un test du même dossier suffit à déclencher.

Conclusion : un banc bâti sur l'égalité de valeurs serait **vert en permanence
et vert pour la mauvaise raison**, ce que les interdits de la fiche refusent
explicitement.

## 3. Le versant décidable — 61 comparaisons, 2 fautives

Ce que `DC-58` décrit — « un cut-off inventé puis recopié dans le moteur » —
devient décidable dès qu'on cesse de comparer des **valeurs** pour regarder des
**positions** : un littéral à droite d'un opérateur de comparaison **est** un
seuil, sans qu'on ait à deviner si le nombre est clinique.

Balayage de `src/lib` non-test, chaînes, commentaires et expressions régulières
neutralisés — **61 comparaisons** à littéral non trivial (`0`, `1`, `2`, `-1`
écartés comme gardes de structure) :

| Où | Nombre | Sort |
|---|---|---|
| `questions.ts` — les cut-offs publiés des instruments (PSQI, Horne-Östberg, Karasek…) | 33 | **Exemptés par forme** : un cut-off écrit dans le catalogue est chez lui. |
| Hors catalogue, techniques ou de couverture | 24 | **Exemptés nommément, avec motif écrit**, dans la liste du banc. |
| **Fautives** | **4 occurrences, 2 sites** | **Corrigées par `D-105`.** |

**Les deux sites fautifs, et ils le sont de la même façon** — un repère unique
écrit plusieurs fois, dont une seule écriture nommée :

1. **`equilibre/discordanceRythme.ts`** — le déclaré comparé à un `10` nu
   (`declare.SIIN54 >= 10`, plus le texte affiché) pendant que l'observé lisait
   `SEUIL_JEUNE_MIN`. C'est **un seul repère** : SIIN54 se répond en heures,
   l'agenda s'observe en minutes, et le barème n'en déclare qu'un
   (`{id:'SIIN54',points:2,seuil:{min:10}}`). Porter `SEUIL_JEUNE_MIN` à 11 h
   laissait le déclaré comparer à 10 — la discordance aurait alors confronté le
   déclaré à un repère et l'observé à un autre, **en silence**.
2. **« trois actions maximum »** — écrite **six fois dans trois fichiers** :
   `protocolDraft.ts` (le refus), `patientProtocolView.ts` (le second refus),
   `ProtocolMiniBuilder.tsx` (deux gardes de saisie, un bouton désactivé, un
   libellé « /3 »). Une borne portée à quatre côté moteur laissait l'écran en
   bloquer trois, et le praticien devant un bouton grisé sans message.

**Provenance des deux, établie et non inventée** : le repère de jeûne est
déclaré au catalogue ; « trois actions maximum » vient de
`docs/RELATION_PRATICIEN_PATIENT_SOURCE.md` — une borne de **charge** de la
relation, sans claim ni intervalle, et qui n'a pas à en avoir.

## 4. Ce que la mesure laisse ouvert — **porté par le LOT-11 depuis le 2026-08-24**

> Les trois points ci-dessous ont été **versés au LOT-11** (« les actes en
> attente ») : l'arbitrage du `3` et le sort de `DC-58` en section B, la portée
> du banc sur le catalogue en section C. Ils restent écrits ici parce que c'est
> la mesure qui les a produits ; le lot qui les porte est ailleurs.

- **`source.axes_prioritaires.length > 3`** (`synthese-praticien.ts`) —
  troisième borne « au maximum 3 » du dépôt, après les actions de protocole et
  les cartes de fil. Elle valide un brouillon de sortie LLM et **rien n'indique
  d'où vient le 3**. Exemptée dans le banc **en étant inscrite comme dette** :
  son arbitrage appartient au praticien.
- **Les 33 seuils du catalogue ne sont gardés par aucun banc de forme.** Ils le
  sont par la certification de scoring et par `DC-17`/`DC-18`. Limite nommée,
  pas oubli.
- **`DC-58` reste une proposition** — instruite, sans contre-exemple, et sans
  méthode fondée par égalité de valeurs.
