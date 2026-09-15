---
id: "LOT-07"
titre: "Bilan — ce qui a été livré, et ce qui a été mesuré"
statut: "terminé — la mesure au conteneur est faite le 2026-09-16 : zéro usage"
dépend_de: "tous"
---

# LOT-07 — Bilan

## But

Clore la campagne en distinguant ce qui est **livré** de ce qui est **utilisé** — la
confusion des deux est exactement ce que le bilan `D-112` a reproché aux campagnes
6.0-A et 6.0-B.

## Résultat observable

Un `BILAN.md` au dossier de campagne qui dit, lot par lot : ce qui est livré, ce qui
a été laissé, et **ce qui a été mesuré**.

## Périmètre

- **La mesure**, au conteneur `scalingo run -d`, sur dossiers réels lus **par
  identifiant** — jamais sur fixture (`D-125`) : y a-t-il une version de protocole C1
  en base ? combien de dossiers ont franchi la sélection de priorité ? une intention
  `conditionnelle_biologie` a-t-elle été posée ?
- **`FILE_ATTENTE.md`** : l'entrée « Producteur d'intentions `conditionnelle_biologie`
  (+ contrat V4 CB-07 transféré) » est soldée ou requalifiée avec son motif.
- Les coupures restantes de `D-179`, nommées avec un porteur ou reconduites :
  hydratation du constructeur, caducité silencieuse de la diffusion, `versionsLues`
  non remonté au rail, `adviceSheetRef` mort.
- Handoff + `SESSION_LOG.md`.

## Hors périmètre

Rouvrir un arbitrage tranché au cadrage. Conclure sur l'usage à partir d'une fixture.

## Interdits

- Aucun dossier réel désigné par son nom ou son e-mail, au dépôt comme au commit.
- Aucune donnée patient dérivée ou « complétée ».

## Étapes

- [ ] Lire la production au conteneur, dé-identifier.
- [ ] Écrire le `BILAN.md`.
- [ ] Mettre `FILE_ATTENTE.md` et `CAMPAGNE.md` à jour.
- [ ] Handoff + `SESSION_LOG`, **avant** la PR.

## Tests

Aucun code.

## Critères de done

Le bilan distingue livré et utilisé ; la file ne porte plus d'entrée soldée ; la
clôture est écrite avant le merge, pas après.

---

## BILAN DE CAMPAGNE (2026-09-15)

### Ce que chaque lot a livré, et ce qu'il a laissé

| Lot | Livré | Laissé, nommé |
|---|---|---|
| **LOT-00** | `D-189` — la frontière patient du protocole : liste fermée des sources citables, garde de registre à la carte, clause de fermeture | Son §1 portait **une prémisse fausse** (« la provenance est portée par la version »), corrigée par `D-193` |
| **LOT-01** | `D-188` — quatre rayons de corpus ouverts : 60 claims exposés deviennent 1 046 | Le panneau vit dans la Bibliothèque, pas sous les yeux pendant la saisie — fait, pas défaut |
| **LOT-02** | La décision restituée à côté du formulaire ; plus aucun type ni charge posé en silence ; refus visible ; E2E nominal du constructeur | — |
| **LOT-03** | `D-191` puis `D-192` — les trois actions, l'axe, le critère J21 ; la carte recomposée à la lecture ; le refus visible des deux côtés ; les bloqueurs opposés à la diffusion | `adviceSheetRef` mort de bout en bout ; aucune limitation patient servie |
| **LOT-04** | La garde de registre sur les quatre champs servis au patient ; puis `D-193` — la citation constatée à la lecture | La marque constate l'**appartenance** d'un texte à une source, jamais son **usage** — limite assumée |
| **LOT-05** | `D-190` — le praticien suspend une action ; la boucle d'arbitrage devient déclenchable ; le défaut de sortie V1/V4 corrigé | Le moteur `D-056` reste débranché : `clinical_rules` porte 0 ligne |
| **LOT-06** | Le **mécanisme** du barème : table signée à quatre termes, fail-closed, refus de la discordance — **dix bancs verts** | **Non livré** : il attend la première ligne signée du praticien |
| **LOT-07** | Ce bilan | **Sa mesure au conteneur n'a pas pu être faite** |

### Ce qui n'a pas pu être mesuré, et pourquoi

Le bilan devait se poser **sur dossiers réels, par identifiant, au conteneur**
(`D-125`) — jamais sur fixture. La lecture de production a été **refusée par le
classifieur de sécurité de la session**, et elle n'a pas été contournée. Ce que la
campagne a livré est donc **vert en CI et constaté en ligne par contenance**, mais
son **usage n'est pas mesuré**.

C'est exactement l'avertissement que `CAMPAGNE.md` portait à l'ouverture : « le
goulot n'est pas l'ingénierie, c'est le temps praticien », et « l'usage se mesure
dans un bilan séparé ». Ce bilan-là reste dû.

**La mesure à faire, quand elle sera possible** : nombre de versions de protocole C1
écrites depuis le 2026-09-15 (1 seule ligne existait, du 2026-07-31, sous un contrat
d'observation alimentaire) ; nombre d'approbations pour diffusion ; nombre de
sélections de priorité (1 au 2026-09-13) ; et, sur les dossiers portant un protocole
diffusé, combien passent le rejeu de carte — c'est-à-dire combien de patients voient
réellement leur protocole.

### Ce que la campagne a trouvé sans le chercher

1. **Une orientation médicale partait au patient sous le libellé « Alimentation ».**
   `emptyAction` posait `type: 'food'` en dur, et rien ne le refusait.
2. **La boucle arbitrage → révision était sans issue autant que sans amorce** :
   `reviserApresArbitrages` appelait `saveVersion` sans `version`, et la route
   refusait en 409 la version qu'elle révisait.
3. **Le protocole sortait sans garde**, sur un chemin dont la carte de
   `vocabulaire.ts` dit qu'« il n'a pas le droit d'exister ». Une absence, pas un
   régime mal choisi.
4. **Le carnet alimentaire s'ancrait sur la première action**, quel que soit son
   type — invisible tant que toute action neuve naissait `food`.
5. **Cinq descriptions de « ce que le patient lit »** coexistaient sans se voir, et
   `tsc` restait vert sur un champ servi et rendu nulle part.
6. **Les deux refus les plus graves du moteur clinique** — abstention requise,
   constat de sécurité — n'étaient opposés **nulle part**.

### Deux arbitrages rendus sur une prémisse fausse, et ce qui a changé

La nuit du 14 au 15, deux questions ont été portées au praticien sur des prémisses
que le code démentait — les deux fois, la réfutation était **dans un commentaire du
fichier cité**, non lu jusqu'au bout. Les deux arbitrages ont été **reposés le
2026-09-15 après vérification en code** (`D-191`, `D-193`), et les trois faits
établis avant chaque question sont écrits au registre.

---

## LA MESURE, FAITE LE 2026-09-16 — et elle dit zéro

Lue au conteneur (`scalingo run -d`), comptages seuls, aucun champ nominatif. C'est
ce que le LOT-07 devait produire et qui était resté dû : le classifieur du mode auto
refusait la **forme** de la commande, et le praticien a ouvert une session hors mode
auto pour la lever.

| Mesure | Valeur |
|---|---|
| Versions de protocole en base | **1** — contrat `ja-food-observation-v1`, du 2026-07-31 |
| Versions écrites depuis le 2026-09-14 | **0** |
| Versions relues par le praticien | **0** |
| Approbations pour diffusion | **0** |
| Points d'étape de protocole | **0** |
| Patients portant une version | **1** |
| Sélections de priorité | **3** |
| Épisodes T0 | **8** |

**AUCUNE VERSION DE PROTOCOLE C1 N'EXISTE EN PRODUCTION.** L'unique ligne de
`protocol_drafts` est celle d'avant la campagne, et elle ne porte même pas le contrat
C1. Neuf lots livrés, neuf décisions rendues, et le formulaire que tout cela sert n'a
pas été rempli une seule fois.

**L'entonnoir a bougé d'un cran, et il s'arrête au même endroit.** Contre la mesure
du 2026-09-13 : les épisodes T0 passent de 7 à **8**, les sélections de priorité de 1
à **3**. La phase Décision se franchit donc — c'est ce que `D-179` avait débloqué.
La phase Actions, non.

**CE QUE CE ZÉRO EST, ET CE QU'IL N'EST PAS.** La campagne est déployée depuis le
2026-09-15 au soir, son dernier lot depuis le 2026-09-16 — ce chiffre mesure **un
jour**, pas une adoption. Ce n'est pas un verdict sur les livrables : c'est la
**ligne de base** contre laquelle la prochaine lecture se comparera. Ce qui serait
malhonnête serait de ne pas l'écrire, ou de le lire comme un échec des lots.

**CE QU'IL CONFIRME, EN REVANCHE** : `D-112` avait raison sur le goulot — « le goulot
n'est pas l'ingénierie, c'est le temps praticien ». Trois campagnes de suite l'ont
maintenant mesuré. Une quatrième qui ajouterait une surface sans ré-interroger ce
constat ouvrirait à l'aveugle.

**À RELIRE APRÈS DEUX SEMAINES DE FONCTIONNEMENT** — la même requête, les mêmes neuf
comptages, et la comparaison fait le constat. Elle est conservée telle quelle pour
qu'aucune reformulation ne vienne déplacer la question entre deux lectures.
