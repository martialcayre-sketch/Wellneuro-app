### Dossier d'arbitrage — les 29 instruments dont le scoring diverge de sa source

Aucune ligne de code, aucun statut de registre modifié. Ce dossier instruit le seul
verrou qui reste entre 10 instruments `scoring_verifie` et les 64 visés : **43
divergences, hors libellés d'items, entre ce que la source publie et ce que
l'application sert**. Les 78 divergences de libellé sont écartées — les instruire
exigerait de reproduire le verbatim des sources, et aucune ne bloque un barreau.

**Le fait qui change la nature du problème : sept des dix-sept divergences
« critiques » ne sont pas dans l'application, elles sont dans la lecture du banc.**

- **Six échelles de cotation que le banc n'a pas lues.** `Q_FIB_01`, `Q_GEO_03`,
  `Q_NEU_04`, `Q_STR_03`, `Q_TAB_05` portent `source: "null–null"` — pas une échelle,
  une **absence de lecture**. Le banc conclut « l'échelle servie ne couvre pas celle
  de la source » en comparant une valeur lue à une valeur qu'il n'a pas. Cinq des six
  sont des questionnaires oui/non, dont l'échelle servie 0–1 est celle qu'on attend.
  `Q_NEU_08` (`null–1`) est le même cas sur une seule borne.
- **Un barème cherché là où il n'est pas.** `Q_NEU_11` (HAD) se voit reprocher
  « 2 bandes undefined–undefined ». Vérifié dans le catalogue servi : les bandes sont
  correctes — 0–7 / 8–10 / 11–21, **par sous-échelle A et D**, soit le barème publié.
  Le HAD n'a pas de total global ; le banc en a cherché un et a mal lu la structure.
  Troisième point sur lequel l'application a raison et le corpus a tort.

**Quatre autres artefacts, vérifiés dans le catalogue servi et non supposés** :
`Q_STR_06` (le seuil `> 21` du Karasek est bien servi, `seuil: 21, seuilDir: 'gt'` —
le banc ne l'a pas reconnu sous cette forme), `Q_STR_04` (`>= 0` est une borne, pas
un seuil), `Q_GEO_06` (5 mots servis en **deux phases** de 5 items — le protocole, pas
un ajout), et `Q_URO_01`, où l'application est **plus fidèle que le banc ne le
crédite** : elle sert les 7 items de symptômes et marque le huitième — la question de
qualité de vie — `horsTotal`, exactement comme la source le rapporte à part.

**Ce qui reste et vous revient : 36 divergences sur 22 instruments**, en cinq
familles, avec les valeurs instrument par instrument pour que la décision porte sur
le contenu et jamais sur l'étiquette :

- **11 seuils de la source sans contrepartie servie** — dont l'IPSS, le QIF, le HAD.
  Ajouter le seuil aligne l'application sur sa source **mais change des valeurs
  servies** ; le documenter en écart assumé laisse l'instrument utilisable sans le
  faire mentir sur sa conformité.
- **6 conduites ajoutées** (Tinetti, SARC-F, AQ, MADRS, MMT SIIN, IRLS) : la source
  publie des bandes **seules**, l'application y attache une conduite clinique. Ce
  n'est pas une erreur de scoring, c'est la contribution du cabinet — mais elle est
  servie au même rang que la bande publiée, sans distinction d'origine.
- **6 découpages en sous-échelles** qui diffèrent, dans les deux sens : quatre
  instruments **agrègent** ce que la source distingue, deux **détaillent** ce qu'elle
  ne distingue pas.
- **4 écarts réels de nombre d'items** — `Q_ALI_03` sert **10 items sur 39**, le plus
  grave du catalogue ; le PSQI 18 sur 24 ; l'IDTAS-AE 48 pour 36 ; Tinetti 20 pour 16.
- **1 total numérique absent** (`Q_INF_05`, source 0–11, moteur de comptage).

**Trois divergences que ni le banc ni moi ne pouvons trancher, et je le dis plutôt
que de conclure.** Les bornes de score prétendument inatteignables du PSQI (0–21,
balayage 6→15), du QIF (0–100, 10→89,9) et de l'ECAB (0–10, 1→9) reposent des deux
côtés sur une **saturation des réponses** — or ces moteurs ne sont pas monotones :
la composante « efficacité » du PSQI vaut 0 quand l'efficacité est *bonne*, si bien
que saturer les horaires ne la maximise pas. Mon balayage a exactement la faiblesse
de celui du banc. La question n'est pas rhétorique : si le maximum réel du PSQI servi
était 15, sa bande « troubles sévères » (17–21) serait inatteignable et le patient le
plus atteint ne la recevrait jamais. Trancher demande une recherche ciblée par
composante — un lot de code, et le seul de ce dossier qui n'est pas un arbitrage.

Seule exception établie sans balayage : le plancher 0 de l'**ECAB** est bien
inatteignable, son item 10 étant inversé (« Faux » vaut 1 point).

**Ordre proposé** : annuler les sept fausses critiques et écarter les quatre
artefacts — gestes de dossier, aucune valeur servie ne change ; déclarer les six
conduites ajoutées ; puis les vingt décisions qui restent, chacune sur une valeur
servie à des patients.
