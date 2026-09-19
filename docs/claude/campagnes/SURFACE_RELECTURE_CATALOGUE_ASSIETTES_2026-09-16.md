# Surface de relecture — l'extension du catalogue d'assiettes

*Écrite le 2026-09-16 en exécution de `D-213` §10, **réécrite le même jour**.
**Ce document ne signe rien.** Il présente au praticien ce qu'il aurait à
attester, et ce qui a été écarté.*

> ## ÉTAT AU 2026-09-19 — les cinq chantiers sont clos, il ne reste que du clinique
>
> **Ce document n'attend plus rien de mécanique.** Les cinq chantiers que
> `D-216` posait devant l'attestation sont livrés : le champ `statut` et le
> filtre de service (`D-225`), le validateur partagé de dérive des libellés et la
> lecture des 131 claims sur pièce (`D-229`), les douze entrées au catalogue C5B
> avec ce qui protège la liste d'observation (`D-230`), la borne d'âge
> (`D-231`), et la porte du régime alimentaire (`D-232`).
>
> **CE QUI RESTE EST CLINIQUE, ET UNE PART N'APPARTIENT PAS À L'OUTIL** : écrire
> les lignes d'indication — en relisant chaque claim sur pièce, source entière,
> comme `D-227` l'impose —, puis les faire **attester**. Une signature clinique
> ne se pose jamais par l'outil.
>
> **La table reste VIDE et son verrou ÉTEINT** ; `TABLE_EXIGE_PRESCRIPTIF` n'a
> toujours pas d'entrée et `shaPerimetreLitteral` n'est pas enrôlé — les deux se
> règlent le JOUR de la première signature, comme `D-198`, `D-223` et `D-224`
> l'ont fait.
>
> **LES BLOCS DATÉS CI-DESSOUS NE SONT PAS RÉÉCRITS.** Ils disent l'état d'un
> jour, et ce qu'on a compris ce jour-là ; les relire au présent serait
> réinterpréter ce qu'un lot passé a relu. Ce bloc-ci les supplante, et le
> tableau des prérequis, lui, est tenu à jour.

> ## ÉTAT AU 2026-09-18 — les douze sources lues en entier, et la colonne « déclencheur disponible » qui ne tient pas
>
> Chantier 2 de S3. Les **131 claims** des douze protocoles ont été lus en
> production (one-off détaché, lecture seule, 2026-09-18) — **sources entières**,
> pas aux seuls identifiants proposés, comme `D-227` l'a imposé. Tous sont
> `VALIDE`, `active`, non remplacés, en `v1.0`.
>
> **Les vingt-six désignations de claim du tableau ci-dessous sont EXACTES** —
> 24 en colonne « Claims d'indication », 2 pour les brouillons de la
> psychobiotique. Aucune
> n'est réfutée : chaque claim cité dit bien ce que la ligne « Claims
> d'indication » lui fait dire, et les trois refus (`0284`, `0294`, `0295`) sont
> confirmés mot pour mot — `WN-SRC-0295` porte bien quatorze claims de contenu et
> aucune indication, et les claims d'indication de `WN-SRC-0294` sont bien tous
> `prescriptif = false`.
>
> **CE QUI NE TIENT PAS EST LA COLONNE VOISINE**, celle du déclencheur, et elle
> n'a jamais été lue sur pièce — quatre constats, détaillés plus bas :
> `etat_alimentation` n'est pas un drapeau ; `R2-GAS-01`/`R2-GAS-02` ne LISENT pas
> `Q_GAS_01` ; aucun claim de `WN-SRC-0290` ne fonde une porte par score ; et
> `WN-CL-0289-004` lit son échelle dans le sens inverse de la grille du dépôt.
>
> **ET UN BLOCAGE STRUCTUREL, ANTÉRIEUR À TOUS LES AUTRES** : aucune des douze
> assiettes n'a de `plateCode` au catalogue C5B. Voir « LE MUR DU `plateCode` ».
>
> **TROIS ARBITRAGES RENDUS LE 2026-09-18, ET AUCUNE LIGNE N'EST ÉCRITE CE
> JOUR.** Le responsable a tranché : le catalogue C5B fait l'objet d'un **lot
> propre** — douze entrées ET ce qui protège la liste d'observation du praticien
> —, et la table des indications reste **vide** jusque-là. La sérotoninergique
> change de porte ; la dopaminergique s'élargit à son second axe. Les deux
> nouvelles portes sont écrites au tableau ci-dessous, prêtes pour le lot qui
> pourra les recevoir.
>
> **CE DOCUMENT CORRIGE UNE VERSION FAUTIVE, ET IL FAUT LE DIRE.** La première
> rédaction concluait que **dix des douze assiettes n'avaient pas d'indication
> fondée**. C'était faux. Elle n'avait lu que les **fiches patient**
> `WN-SRC-0296` → `WN-SRC-0307`, l'intervalle que `D-213` §10 cite — sans
> chercher si d'autres sources parlaient d'assiettes. Il en existe **douze
> autres**, prescriptives, et c'est là que vivent les indications. Le défaut a
> été trouvé par la revue automatique de la PR #1160, après merge. Un intervalle
> cité dans une décision est un exemple, jamais un inventaire.

## LE FAIT CENTRAL : CHAQUE ASSIETTE A DEUX SOURCES, ET UNE SEULE FAIT RÈGLE

| Série | Identifiants | Type | `prescriptive` | Vigilance | Au registre des interventions | Claims validés |
| --- | --- | --- | --- | --- | --- | ---: |
| **Protocoles** | `WN-SRC-0284` → `0295` | `Protocole / outil décisionnel` | **`true`** | **Élevée** | **Oui, tous, `complet`** | **131** |
| **Fiches patient** | `WN-SRC-0296` → `0307` | `Support patient` | `false` | Faible | **Non, aucune** | 81 |

Les deux séries se correspondent **une à une**, dans le même ordre : `0284`
végétale ↔ `0296`, `0285` épargne digestive ↔ `0297`, et ainsi jusqu'à `0295`
chronobiologique ↔ `0307`. Une treizième fiche existe sans protocole —
`WN-SRC-0354`, anti-douleur — et reste donc hors de ce lot.

**Le registre interdit lui-même de fonder une règle sur une fiche.** Le champ
`comment` de `WN-SRC-0297` le dit mot pour mot : *utiliser comme couche
d'éducation thérapeutique, **pas comme source de règle clinique***. Un claim de
fiche peut être `VALIDE` et rester **irrecevable** comme fondement d'indication.
C'est exactement l'erreur que la première rédaction a commise.

Les 212 claims des deux séries sont `VALIDE`, `active`, compartiment `ACTIF`
(lus en production le 2026-09-16) : **la validité n'a jamais été le blocage.**

## LES DOUZE, UNE PAR UNE

Deux colonnes décident : l'indication est-elle **fondée** par un claim
prescriptif du protocole, et est-elle **lisible** par un champ ou un score que le
dépôt sait déjà lire (`D-003` — pas de champ, pas de règle) ?

| Assiette | Protocole | Claims d'indication | Déclencheur disponible | Verdict |
| --- | --- | --- | --- | --- |
| **Dopaminergique** | `0289` | `-004` (score bas à l'échelle fonctionnelle dopaminergique), `-003` (syndromes d'insuffisance dopaminergique) | **`Q_INF_03`, `DA` OU `NA`** (arbitrage 2026-09-18) — pack de base, même grille `*` sur les deux axes, déjà lue par `R2-NEU-03`/`-04` | **publiée — la mieux placée** |
| **Sérotoninergique** | `0290` | `-005` (états inflammatoires d'origine intestinale, troubles du transit), `-006` (niveau de preuve élevé), `-007` (marqueurs biologiques) | **`Q_GAS_01`** (arbitrage 2026-09-18, corrige `Q_INF_03`/`SE`) — second tour | **publiée** |
| **Épargne digestive** | `0285` | `-005` (tout patient ayant un trouble fonctionnel intestinal), `-006`, `-001` (intolérances, durée bornée) | `Q_GAS_01` (second tour) **et** `intolerances_alimentaires`, énuméré à l'anamnèse | **publiée** |
| **Détoxication** | `0287` | `-009` (score TFI élevé), `-008` (populations exposées), `-007` (cure préventive) | `Q_GAS_01` — lu par `R-GAS-01`, **second tour** (corrigé 2026-09-18 : `R2-GAS-01`/`R2-GAS-02` le PROPOSENT, ils ne le lisent pas) | **publiée** |
| **Psychobiotique** | `0291` | `-011` (tout patient ayant un trouble fonctionnel ou une maladie intestinale) | `Q_GAS_01` | **publiée** sur la porte étroite ; `-009`/`-010` en **brouillon** |
| **Anti-inflammatoire** | `0293` | `-011` (atteinte des deux voies monoaminergiques, ET l'entrée par score de questionnaire fonctionnel), `-009` (dès 50 ans, plus fréquemment au-delà de 70) | `Q_INF_03` — fondé par `-011`, l'un des trois claims des 131 à nommer un questionnaire ; **âge** pour `-009` | **publiée** |
| **Méthylation** | `0286` | `-006` (végétaliens, végans, végétariens ; plus de 50 ans), `-005` (niveau de preuve élevé) | **AUCUN** (corrigé 2026-09-18) : `etat_alimentation` existe à l'anamnèse mais n'est pas un drapeau, donc hors de portée d'un déclencheur ; **âge** également absent | **publiée** |
| **Protéinée** | `0288` | `-013` (les tableaux engageant la voie dopaminergique, hors exception parkinsonienne), `-011` et `-001` (au-delà de 60 ans) | `Q_INF_03` `DA` ; **âge** — et `Q_GEO_02` (SARC-F), porte sans âge ouverte par `-012`, trouvée le 2026-09-18 | **publiée** |
| **Antioxydante** | `0292` | `-004` (maladie évolutive chronique ou inflammatoire de bas grade), `-003` (neurodégénératif) | `antecedentsDomaines` — couvre partiellement | réserve |
| **Oméga 3** | `0294` | `-002`, `-003` — **déclarés NON prescriptifs** | — | refusée |
| **Végétale** | `0284` | aucune ; `-006` nuance l'assiette chez le côlon irritable | — | refusée |
| **Chronobiologique** | `0295` | aucune — quatorze claims de contenu | — | refusée |

**Huit publiées, une en réserve, trois refusées.** Les écarter est le travail ;
chacune l'est pour un motif nommé.

## CE QUE LA LECTURE DES SOURCES ENTIÈRES A AJOUTÉ — 2026-09-18

`D-227` a montré que la classe d'erreur dangereuse n'est plus la désignation
FAUSSE mais la désignation **incomplète** : ni le sha, ni le contrat SQL, ni le
CI ne voient ce qui manque à un périmètre relu. Les douze sources ont donc été
lues entières. **Cinq constats, six claims neufs** — le décompte porte sur les
claims, non sur les paragraphes qui les portent.

**1. `WN-CL-0288-012` — LA SARCOPÉNIE, ET ELLE OUVRE UNE PORTE QUE L'ÂGE NE
COMMANDE PAS.** Ce claim déclare la sarcopénie indication majeure de l'assiette
protéinée. Il n'était pas proposé. Sa conséquence est pratique : le dépôt porte
le **SARC-F** (`Q_GEO_02`), instrument coté, au catalogue et actif. La protéinée
cesse donc d'être suspendue au seul déclencheur d'âge du chantier 3. **Une
réserve va avec** : `prescriptif = false` — la table n'exige pas le prescriptif
(`D-046`), mais il faut le savoir avant de signer.

**2. `WN-CL-0288-013` NE SE DÉSIGNE PAS SEUL.** Il porte l'indication de la
protéinée **et son exception**, qui vise le parkinsonien sous L-dopa. Et
`WN-CL-0288-014` prolonge cette exception en disant que la répartition y change.
Même classe que `WN-CL-0316-006` / `-029` en `D-227` §3 : une règle de sécurité
tronquée est pire qu'absente. **Les deux entrent ensemble ou aucun.**

**3. `WN-CL-0291-013` EST PLUS LARGE QUE LA PORTE PUBLIÉE, et c'est pour cela
qu'il compte.** Il indique la psychobiotique dès qu'existe un trouble
fonctionnel, **que l'intestin soit ou non en cause** — donc au-delà de
`WN-CL-0291-011`, qui exige l'atteinte intestinale. Le désigner sur la ligne
publiée l'élargirait en silence : il appartient au **brouillon**, avec `-009` et
`-010`.

**4. `WN-CL-0285-002`, `-010` ET `-012` BORNENT L'ÉPARGNE DIGESTIVE.** La surface
citait `-001` pour « durée bornée » ; `-001` dit une période déterminée sans la
chiffrer. C'est `-002` qui porte la borne, `-010` qui impose de compenser
au-delà, et `-012` qui refuse l'éviction durable. Une assiette d'éviction servie
sans ses bornes est le cas où **désigner l'indication sans ses gardes** produit
exactement ce que `D-227` §3 décrit.

**5. `WN-CL-0293-011` FONDE UNE ENTRÉE PAR SCORE, ET LA SURFACE NE LE CITAIT
QUE POUR SON CONTENU.** Lu entier, il fonde en outre explicitement l'entrée par
**score** de questionnaire fonctionnel : c'est lui, et non `-009` qui porte
l'âge, qui rend l'anti-inflammatoire constructible aujourd'hui.

**Trois claims des 131 nomment un questionnaire**, et pas un de plus :
`WN-CL-0287-009` (le questionnaire des troubles fonctionnels intestinaux),
`WN-CL-0289-004` (le questionnaire fonctionnel des neurotransmetteurs) et
`-011`, seul des trois à les nommer au pluriel sans en désigner un. C'est cette
rareté qui donne son poids au constat C ci-dessous : les quinze claims de la
sérotoninergique n'en nomment aucun.

## LES QUATRE CONSTATS SUR LA COLONNE « DÉCLENCHEUR DISPONIBLE »

Cette colonne n'avait jamais été confrontée au dépôt. Aucun des quatre ne réfute
un claim : tous réfutent une **disponibilité annoncée**.

**A. `etat_alimentation` N'EST PAS UN DRAPEAU — la méthylation n'est pas bloquée
par l'âge seul.** Le champ existe bien dans `ANAMNESE_SECTIONS`, avec ses options
végétarienne et végétalienne/végane. Mais `DrapeauxAnamnese` porte **dix** clés
et celle-ci n'en fait pas partie : `extraireDrapeauxAnamnese` ne la produit
jamais, et `OrientationDeclencheur.champ` est typé `keyof DrapeauxAnamnese` — un
déclencheur sur ce champ **ne compile pas**. `WN-CL-0286-006` reste donc
inaccessible par ses deux bouts, le régime comme l'âge. La ligne d'assiette de
méthylation n'était pas « en attente du chantier 3 » : elle en attendait **deux**.

> **RÉSOLU LE 2026-09-19.** Les deux sont livrés — la borne d'âge par `D-231`,
> la porte du régime par `D-232`, qui lit l'`EtatPopulation` et **ne fait pas**
> du champ un drapeau. `WN-CL-0286-006` est donc accessible par ses deux bouts.
> Le correctif que ce constat laissait entendre — une clé de plus dans
> `DrapeauxAnamnese` — a été **écarté** : il aurait donné au champ deux lecteurs
> de formes différentes.

**B. `R2-GAS-01` ET `R2-GAS-02` NE LISENT PAS `Q_GAS_01` — ILS LE PROPOSENT.**
Les deux se déclenchent sur `Q_MOD_03`, sous-score `digestion`, et **suggèrent**
le TFD SIIN. La seule règle qui LIT `Q_GAS_01` est `R-GAS-01`, au **second
tour**. La conséquence porte sur trois lignes — épargne digestive, détoxication,
psychobiotique : leur porte ne s'ouvrirait que chez un patient déjà passé au
second tour, jamais sur le pack de base. Ce n'est pas un défaut, c'est un fait à
connaître avant de signer : une indication qu'on croit large se révélerait rare.

**C. AUCUN CLAIM DE `WN-SRC-0290` NE FONDE UNE PORTE PAR SCORE.** L'asymétrie est
nette avec la dopaminergique : `WN-CL-0289-004` nomme expressément le
questionnaire fonctionnel des neurotransmetteurs ; les quinze claims de la
sérotoninergique n'en nomment aucun. Ils fondent l'indication sur des **états** —
inflammatoire d'origine intestinale, transit, dysbiose, stress chronique — et sur
des tableaux à niveau de preuve élevé. Le déclencheur `Q_INF_03`/`SE` que la
surface proposait **n'est fondé par rien de sa source**. Le garder serait
inventer la porte, ce que `DC-01` interdit.

> **ARBITRAGE DU RESPONSABLE, 2026-09-18 : la porte devient `Q_GAS_01`**, fondée
> par `WN-CL-0290-005` — qui nomme les états d'origine intestinale et le
> transit, ce que le TFD SIIN mesure. La ligne reste **publiée**, avec sa
> conséquence assumée et écrite : `Q_GAS_01` n'est lu qu'au **second tour**
> (`R-GAS-01`), donc une indication réputée large se déclenchera rarement.
> **Écarté** : retirer la ligne, et la garder en brouillon sur une porte que rien
> ne fonde.

**D. `WN-CL-0289-004` LIT SON ÉCHELLE À L'ENVERS DE LA GRILLE DU DÉPÔT.** Le
claim indique l'assiette dopaminergique sur un score **faible**. La grille
certifiée de `Q_INF_03` va dans l'autre sens : `0-9` peu perturbé, `10-19`
perturbations probables, `20-40` fortement perturbé — c'est ce que lisent
`R2-NEU-03` et `R2-NEU-04` avec `>= 10`. Les deux se concilient si « score
faible » désigne une **fonction** basse et non un score bas d'instrument, ce que
le reste de `WN-SRC-0289` rend très probable. Mais c'est une **lecture**, et elle
doit être déclarée en `raccourciAssume` plutôt que supposée.

> **ARBITRAGE DU RESPONSABLE, 2026-09-18 : la lecture est retenue, ET la porte
> s'élargit au second axe.** Le claim nomme l'axe dopaminergique **ou**
> noradrénergique ; la surface n'avait retenu que `DA`, sans dire pourquoi —
> l'arbitrage pris par omission que `R2-NEU-04` a déjà eu à réparer une fois. La
> ligne lira donc une disjonction `DA` **ou** `NA`, à la même bande d'entrée
> `>= 10`.
>
> **La condition posée à l'arbitrage a été vérifiée avant d'être écrite** :
> `Q_INF_03` expose bien un sous-score `NA` (Noradrénaline, /40), et son
> interprétation est déclarée en `subscale: '*'` — c'est donc littéralement la
> **même grille** sur `NA` que sur `DA`, pas une grille voisine. Le
> `raccourciAssume` de la ligne portera le pas de sens, qu'aucune garde
> automatique n'atteint.

## LE MUR DU `plateCode` — LEVÉ LE 2026-09-18 ([[D-230]])

> **CE MUR EST TOMBÉ.** Le catalogue C5B porte désormais **quinze** entrées : les
> trois repères de moment de repas, inchangés, et les **douze assiettes du
> corpus**, chacune adossée à son protocole. Le septième terme du verrou peut
> donc être satisfait, et les lignes d'indication sont écrivables dès que leurs
> portes le sont. **Ce que le praticien voit n'a pas changé** : la liste
> d'observation passe par un point de service qui ne rend que les trois repères,
> et un banc la compte option par option. Aucune référence d'assiette déjà
> consignée n'est devenue caduque. Ce qui suit reste écrit parce qu'il dit
> pourquoi le lot a eu la forme qu'il a.

Le septième terme du verrou (`D-225` §5) exige que le `plateCode` d'une ligne
existe au catalogue C5B. Or `C5B_RECOMMENDED_PLATES` ne portait alors que
**trois** entrées, les repères de moment de repas. **Aucune des douze assiettes
n'y avait de code.**
Une ligne écrite aujourd'hui serait donc relue, hachée, attestée — et le verrou
la refuserait, pour toujours, sans que rien ne le dise au signataire.

**Et l'ajout n'est pas neutre, parce que ce catalogue a un consommateur.**
`PractitionerFoodObservationPanel` rend **toutes** ses entrées dans sa liste
déroulante, sans condition. Le filtre livré au chantier 1
(`lignesIndicationAssietteServables`) filtre des **lignes** ; il ne protège pas
cette liste, qui lit le catalogue. Douze codes ajoutés font donc passer la liste
du praticien de trois à quinze entrées, en production, immédiatement.

**Ce qui rend l'arbitrage nécessaire plutôt que mécanique** : ce document a déjà
écarté de **fondre les trois historiques dans les douze**, au motif que les unes
se départagent par le moment du repas et les autres par l'indication, et que les
mélanger ferait croire à une provenance qu'elles n'ont pas. Or le catalogue est
une liste **plate**, avec un seul consommateur qui la rend entière : l'arbitrage
est écrit, et rien dans le code ne le porte. Les ajouter au même tableau, c'est
exactement le mélange écarté — à l'endroit précis où le praticien les voit.

S'y ajoutent, pour mémoire : `catalogVersion`, le `contentHash` de chaque entrée
et `C5B_PLATE_CATALOG_HASH` se périment à l'extension, et `/api/praticien/boussole`
publie ce dernier.

> **ARBITRAGE DU RESPONSABLE, 2026-09-18 : un lot propre, et la table reste vide
> jusque-là.** Le catalogue C5B ne s'étend pas au passage d'un chantier dont ce
> n'est pas la finalité. Le lot à venir porte les **deux** gestes ensemble — les
> douze entrées **et** ce qui protège la liste d'observation : un axe sur
> l'entrée, ou un filtre au point de rendu. **Écarté** : écrire les lignes dès
> maintenant en laissant le verrou les refuser — le septième terme cesserait de
> distinguer l'assiette RETIRÉE, qui est le danger qu'il garde, de l'assiette pas
> encore créée, qui serait devenue l'état normal. **Écarté aussi** : étendre sans
> filtre, qui met le mélange des deux axes sous les yeux du praticien.

## LES QUATRE ARBITRAGES QUI ONT FIXÉ CE TABLEAU — 2026-09-16

**1. L'ÂGE DEVIENT UN DÉCLENCHEUR, et c'est une décision de doctrine.** Le dépôt
refusait l'âge pour un motif écrit : *aucune borne d'âge n'a de provenance au
dépôt ; poser un pivot ici serait inventer un seuil clinique* (`DC-19`, et
`DC-43` qui écarte l'âge comme critère de population). **Ce motif ne tient
plus** : `WN-CL-0286-006`, `WN-CL-0288-011` et `WN-CL-0293-009` portent des
bornes — 50, 60, 70 ans — dans des claims prescriptifs validés. Le pivot ne
serait plus inventé, il serait **cité**.

Trois assiettes sortent de réserve. **Ce que cela coûte, et qui n'est pas
gratuit** : un type de déclencheur neuf, `Patient.dateNaissance` cesse d'être un
fait purement administratif, et `DC-43` se revisite. Ce n'est pas un correctif
au fil du lot — c'est une décision, elle s'écrit au registre, et le commentaire
d'`anamnese.ts` qui porte l'ancien motif doit être corrigé dans le même geste,
sans quoi le dépôt se contredirait lui-même.

**2. L'ENQUÊTE ALIMENTAIRE NE DÉCLENCHE JAMAIS SEULE.** Le dépôt déclare
`Q_ALI_01` *« non validé comme instrument de mesure — les résultats orientent
l'entretien, ils ne concluent pas »*. Elle reste admise, mais **en seconde
condition uniquement** : une ligne qui la cite exige aussi une porte propre
(trouble fonctionnel avéré, score d'échelle fonctionnelle). C'est le patron exact
de `R2-GAS-02`, où un second déclencheur **paie** l'abaissement d'un seuil et où
« l'un ne vaut jamais sans l'autre ».

**Conséquence sur le tableau** : `WN-CL-0285-007`, `WN-CL-0287-009` (sa branche
enquête), `WN-CL-0291-014` et `WN-CL-0293-012` ne fondent aucune ligne
**d'assiette** à eux seuls. Ils restent cités là où une porte propre existe
déjà — jamais ailleurs.

**LA PORTÉE EST CELLE DES LIGNES D'ASSIETTE.** `R2-ALI-01` est une règle
**publiée** dont `Q_ALI_01` est l'unique déclencheur, et elle cite
`WN-CL-0287-009`. Elle n'est **pas** réarbitrée, et elle ne contredit pas cet
arbitrage : ce qu'elle propose sont **deux questionnaires**, pas une assiette —
son commentaire l'écrit depuis `D-030`, l'assiette de détoxication « relève de la
prise en charge, et l'objectif ne la promet donc plus ». Proposer un
questionnaire et prescrire une assiette n'engagent pas la même chose.

**3. LA PSYCHOBIOTIQUE PUBLIE SA PORTE ÉTROITE ET GARDE LA LARGE EN BROUILLON.**
`-011` — le trouble fonctionnel ou la maladie intestinale avérée — est servi.
`-009` et `-010`, qui proposent l'assiette très régulièrement et pour toute la
population en prévention, sont **écrits en brouillon** : les deux lectures sont
consignées, une seule sert.

> **RÉSERVE À CONNAÎTRE AVANT DE SIGNER, et elle n'est pas de forme.** Une ligne
> `brouillon` **reste dans le périmètre haché**. Vous attestez donc aussi son
> texte : le hachage porte sur la table entière, jamais sur les seules lignes
> publiées. Une ligne brouillon n'est pas hors du périmètre — elle est hors du
> **service**. Reformuler la ligne large plus tard périmera l'attestation
> acquise sur les huit lignes publiées, et c'est voulu.

**4. La ligne cite les claims du PROTOCOLE, jamais ceux de la fiche.** Ce n'est
pas un arbitrage : le registre l'impose. La fiche garde son rôle propre — le
support remis au patient — et n'entre dans aucune ligne.

### Ce qui tient encore l'antioxydante en réserve

`antecedentsDomaines` porte douze domaines larges (« Neurologique (migraine,
TDAH…) », « Auto-immun / rhumatologique »…) là où `WN-CL-0292-003` nomme des
tableaux précis — maladies neurodégénératives, maladie de Parkinson, troubles
démentiels. Adosser l'indication au domaine élargirait franchement ce que le
claim fonde. Il n'y manque pas une donnée mais une **granularité**.

## LE FAIT TECHNIQUE QUI COMMANDE LA FORME

> **ÉTAT AU 2026-09-19** : ce qui suit décrit le catalogue **avant** `D-230`.
> Il porte désormais **quinze** entrées sur **deux axes** — les trois repères de
> moment de repas, inchangés, et les douze assiettes du corpus, chacune adossée à
> son protocole —, plus deux points de service qui l'empêchent d'être rendu en
> entier. Le paragraphe reste écrit parce qu'il dit pourquoi la forme est celle-là.

**Le catalogue d'alors ne portait aucun contenu d'assiette et aucun statut.**
`C5B_RECOMMENDED_PLATES` tenait trois entrées — `plateCode`, `label`,
`substitutionFamily` à `null`, des empreintes. Rien d'autre. Les trois étaient
organisées par **moment du repas** et n'avaient **aucune source** : des repères
repris de `JA5-03`.

**Et il n'existe aucun filtre de service.** `PractitionerFoodObservationPanel`
rend **toutes** les entrées de `C5B_RECOMMENDED_PLATES` dans sa liste
déroulante, sans condition. Ajouter des assiettes « en brouillon » les
**exposerait au praticien exactement comme les publiées** : la promesse
« présentes, jamais servies » n'est portée par rien aujourd'hui. Elle exige
**deux** ajouts, pas un — un champ `statut` sur l'entrée, **et** un filtre au
point de service, sur le patron de `lignesConduitesServables`.

Étendre par indication demande en outre un champ d'indication et ses claims :
changement de contrat, donc `catalogVersion`, `contentHash` de chaque assiette
et `C5B_PLATE_CATALOG_HASH` se périment tous, et
`assertCurrentRecommendedPlateRef` refuse toute référence devenue caduque.

**Ce changement est gratuit aujourd'hui, et il ne le restera pas.** Production
du 2026-09-16 : **zéro** brouillon portant une référence d'assiette, zéro
check-in, zéro approbation de diffusion. La première assiette prescrite ferme
cette fenêtre.

## CE QUI EST PROPOSÉ

**Huit lignes d'indication publiées, cinq en brouillon** — les quatre assiettes
sans indication retenue, plus la porte large de la psychobiotique. Le brouillon
n'a de sens qu'avec le filtre de service décrit ci-dessus : sans lui, les treize
s'affichent et le statut ne protège rien.

**LE STATUT VIT SUR LA LIGNE D'INDICATION, PAS SUR L'ASSIETTE**, et c'est la
psychobiotique qui l'impose : elle porte une porte publiée **et** une porte en
brouillon. Avec un seul `statut` par entrée de catalogue, le filtre exposerait
les deux ou les masquerait toutes deux. Le catalogue porte donc des **lignes** —
une assiette, une indication, ses claims, son statut — et une assiette en
regroupe une ou plusieurs, exactement comme `CATALOGUE_CONDUITES_V1` fait de la
ligne son unité signée. L'entrée d'assiette garde `plateCode`, `label` et ses
empreintes, et **cesse d'être l'unité de publication**.

**Les trois assiettes historiques sont conservées telles quelles**, sans
indication et sans claim. Elles sont en service et ne prétendent rien.
**Écarté : les fondre dans les douze** — elles se départagent par le moment du
repas, les douze par l'indication ; les mélanger sur un seul axe ferait croire à
une provenance qu'elles n'ont pas.

## CE QUE L'ATTESTATION DEMANDERA, exactement

Les quatre arbitrages ci-dessus sont rendus. Ce qui reste est le geste
attestant lui-même :

1. **Confirmer les huit indications**, claim par claim : ce que **chacun fonde**,
   et non qu'il existe. Les identifiants et leur version ont été lus en
   production le 2026-09-16 ; leur validité est établie, leur **rôle** est ce que
   vous attestez.
2. **Relire les cinq lignes en brouillon**, dont la porte large de la
   psychobiotique — elles sont **dans le périmètre haché**, donc dans ce que la
   signature couvre.
3. **Confirmer la réserve de l'antioxydante et les trois refus**, ou en relever
   un.
4. **Relire chaque ligne citant l'enquête alimentaire** et vérifier qu'aucune ne
   l'emploie seule.
5. `validationExterne`, `dateValidation` en ISO canonique, et le `shaPerimetre`
   **recopié à la main** — jamais la constante recalculée (`D-063`).
6. La déclaration de conformité se rend **en séance, après lecture** ; la recopie
   du SHA est mécanique et ne vaut que portée par elle (`D-195` §1).

**Ce qui doit être livré AVANT que cette signature ait un sens** — liste tenue à
jour, et elle a GRANDI au 2026-09-18 :

| # | À livrer | État |
| --- | --- | --- |
| 1 | Le champ `statut` sur la ligne, et le filtre de service | **fait** — `D-225` |
| 2 | Le validateur partagé de dérive des libellés d'anamnèse | **fait** — chantier 2 |
| 3 | Les **douze entrées au catalogue C5B**, et ce qui protège la liste d'observation du praticien | **fait** — `D-230` |
| 4 | Le champ d'indication et ses claims, c'est-à-dire les lignes | à faire, après 3 |
| 5 | Le déclencheur d'âge et la revisite de `DC-43` | **fait** — `D-231` |
| 6 | Le régime alimentaire comme porte | **fait** — `D-232`, en lisant l'`EtatPopulation` et NON un drapeau |
| 7 | Le mécanisme orienté des familles d'équivalence | à faire |

Les lignes **3** et **6** sont tombées, la première le 2026-09-18, la seconde le
2026-09-19. Ni l'une ni l'autre ne figurait dans la version du 2026-09-16 : elles
sont apparues en confrontant au dépôt la colonne « déclencheur disponible », qui
n'avait jamais été lue sur pièce. **Il ne reste donc que les lignes 4 et 7** — et
la 4 est l'écriture des lignes elles-mêmes, c'est-à-dire du clinique. Signer une table que rien ne
filtre exposerait les brouillons comme les publiées ; signer des lignes dont
aucune assiette n'existe au catalogue produirait un périmètre attesté que le
verrou refuse.

## CE QUE CE LOT NE PRÉTEND PAS

- **Le CI ne peut pas vérifier qu'un claim cité fonde l'indication.** Il
  n'atteint que le format. Le registre est dense de `WN-SRC-0001` à
  `WN-SRC-0507` sans trou : une vérification d'existence n'attraperait qu'une
  faute de frappe hors bornes.
- **Aucun contenu d'assiette n'entre au dépôt.** Les deux séries sont
  `rightsStatus: to_verify` et `clinicalReviewStatus: not_reviewed`. Une ligne
  **désigne** son claim, elle ne le recopie pas — et le contenu de l'assiette
  reste écrit par le praticien.
- **Les déclencheurs nommés ici sont disponibles, pas câblés.** Aucune règle
  d'assiette n'existe aujourd'hui : dire qu'un score est lisible n'est pas dire
  qu'une ligne le lit.
- **Rien ici ne concerne les familles d'équivalence** — elles ont leur propre
  surface, et le renversement de ce document en change les prémisses.
