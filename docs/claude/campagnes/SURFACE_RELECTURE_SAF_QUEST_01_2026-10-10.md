# Surface de relecture — `SAF-QUEST-01` (D-275 §2, LOT-3)

Produite le 2026-10-10, **avant** la demande d'attestation ([[D-195]] §2).
Table : `web/src/lib/clinical/safetyQuestionnaireV1.ts`, version
`safety-questionnaire-nnpp2-v1`, livrée **non signée**.

SHA du périmètre à la production de cette surface :
`eb3504852852183d3f41f2564de1c966c2650750c099c30f2d4a358e1ce21a3e`.
Il couvre les quatre questions avec leurs options, la conduite recopiée et les
trois textes de limitation (sections 1 à 3). Les textes de la lettre (section 4)
sont relus ici mais hors du SHA, comme ceux de la lettre d'anamnèse.

**Forme du fichier, précisée après la déclaration (même jour).** La garde BP-01
([[D-251]]) interdit toute phrase dans une structure signée neuve. Le fichier
signé ne porte donc que des codes. Les options sont lues dans le catalogue, et
les textes vivent dans `safetyQuestionnaireTextes.ts`. Les deux entrent dans le
SHA, dont le contenu est **identique au bit près** : le SHA reste
`eb350485…`, et la déclaration porte sur ce contenu.

## 1. La table — quatre questions, ce que chaque réponse produit

Règle unique : la première option dit « non » et ne produit rien. Toute autre
option produit un constat de rang `adressage`. Les réponses positives ne sont
pas graduées entre elles. Une valeur présente hors des options produit aussi un
constat. Une réponse absente, nulle ou vide produit une limitation, sans constat.

| Instrument | Question | Valeur | Option (verbatim du catalogue) | Produit |
|---|---|---|---|---|
| BDI (`Q_NEU_01`) | B7 | 0 | Je ne pense pas à me faire du mal. | rien |
| | | 1 | Je pense que la mort me libérerait. | constat |
| | | 2 | J'ai des plans précis pour me suicider. | constat |
| | | 3 | Si je le pouvais, je me tuerais. | constat |
| MADRS (`Q_NEU_02`) | Q010 | 0 | Jouit de la vie ou la prend comme elle vient. | rien |
| | | 2 | Fatigué de la vie, idées de suicide seulement passagères. | constat |
| | | 4 | Il vaudrait mieux être mort. Les idées de suicide sont courantes et le suicide est considéré comme une solution possible, mais sans projet ou intention précis. | constat |
| | | 6 | Projets explicites de suicide si l'occasion se présente. Préparatifs de suicide. | constat |
| SIGH-SAD-SA (`Q_NEU_03`) | SIGH_Q019 | 0 | Je n'ai pas pensé à mourir, à me faire du mal ou à me tuer, ou que la vie ne vaut pas la peine d'être vécue. | rien |
| | | 1 | J'ai pensé que la vie ne valait pas la peine d'être vécue ou qu'il vaudrait mieux être mort. | constat |
| | | 2 | J'ai pensé à mourir ou j'ai souhaité être mort. | constat |
| | | 3 | J'ai pensé à me suicider ou j'ai fait quelque chose afin de me blesser. | constat |
| | | 4 | J'ai essayé de me suicider. | constat |
| IDTAS-AE (`Q_NEU_12`) | IA9 | 0 | Non | rien |
| | | 1 | Oui | constat |

## 2. Ce que le praticien lit sur un constat (cockpit, phase Décision)

Conduite : **recopiée** du rang `adressage` de la table d'anamnèse, signée le
2026-08-23. Aucun texte de conduite neuf.

Exemple de `rationale` :

> Signal d'alerte signalé par le patient : avis médical à évaluer en priorité,
> avant toute proposition de priorité ou de protocole. Réponse au BDI du
> 2026-10-01 : « J'ai des plans précis pour me suicider. ». Passation : REP-A.

Valeur hors options : « … Réponse au MADRS du 2026-10-01 : valeur hors des
options de la question. Passation : REP-B. » La valeur brute n'est jamais
recopiée.

## 3. Les trois textes de limitation (dans le SHA)

- **Sur chaque constat** : « Ce constat provient d'une réponse de questionnaire.
  Toute passation non invalidée compte, même hors de l'épisode confirmé : une
  réponse « non » ultérieure ne le lève pas, seule une lettre d'adressage qui le
  couvre, ou l'invalidation de la passation, le fait. »
- **Valeur hors options**, ajouté au constat : « La valeur enregistrée ne
  correspond à aucune option de la question : faute de savoir ce qu'elle dit,
  elle est traitée comme une réponse autre que « non » plutôt qu'ignorée. »
- **Réponse illisible (A2)**, une par instrument, sans constat : « 1
  passation(s) de SIGH-SAD-SA ne portent aucune réponse lisible à la question sur
  le suicide : rien n'est conclu, et la question reste à poser au patient. »

## 4. La lettre d'adressage (textes neufs, hors SHA)

Une lettre **d'anamnèse seule** est inchangée, au caractère près, avec la même
version d'ancrage. Une lettre qui cite au moins une réponse de questionnaire
porte la version `safety-signals-questionnaire-v1`, ancrée sur le SHA des deux
tables.

Phrases neuves :

- Ouverture, questionnaires seuls : « … je vous adresse ce patient : ses réponses
  à un ou plusieurs questionnaires portent un ou plusieurs signaux d'alerte pour
  lesquels … ».
- Ouverture, les deux : « … son anamnèse et ses réponses à un ou plusieurs
  questionnaires portent des signaux d'alerte pour lesquels … ».
- Liste : « Réponses du patient à la question sur les idées de mort ou de
  suicide : — BDI, passation du 2026-10-01 : « J'ai des plans précis pour me
  suicider. » ».
- Questionnaires seuls : « Ces réponses proviennent de questionnaires que le
  patient a remplis lui-même. Elles n'ont fait l'objet d'aucun examen de ma
  part, et ne constituent ni un diagnostic ni une hypothèse diagnostique. »
- Les deux : « Les signaux d'alerte ci-dessus sont DÉCLARÉS par le patient lors
  de son anamnèse ; les réponses citées proviennent de questionnaires qu'il a
  remplis lui-même. Aucun de ces éléments n'a fait l'objet d'un examen de ma
  part, et ils ne constituent ni un diagnostic ni une hypothèse diagnostique. »
- Hors options : « Pour une ou plusieurs des réponses ci-dessus (‡), la valeur
  enregistrée ne correspond à aucune option de la question : faute de savoir ce
  qu'elle dit, elle est traitée comme un adressage plutôt qu'ignorée. »

Les autres paragraphes (conduite, abstention, remerciements, signature) sont ceux
de la lettre actuelle. Toutes les options positives des quatre questions passent
la garde non prescriptive (banc).

## 5. À lire avant de signer

1. **Pas de gradation.** « Je pense que la mort me libérerait » et « J'ai essayé
   de me suicider » produisent le même constat. Le praticien lit la réponse
   citée ; la machine ne la cote pas.
2. **A1.** Toute passation non invalidée compte, quelle que soit sa date. Un
   « non » ultérieur ne lève rien. Chaque nouvelle réponse positive est un
   nouveau constat et appelle une nouvelle lettre. Invalider la passation la
   retire.
3. **A2.** Une réponse illisible ne bloque pas : elle est dite au praticien.
4. **L'inhibition est totale** : priorité et protocole suspendus jusqu'à une
   lettre qui couvre le constat. Un dossier sans consultation porteuse n'a pas
   de lettre possible tant qu'elle n'existe pas (il n'a pas non plus de T0).
5. **Effet sur un protocole déjà diffusé.** Une réponse positive, ou une réponse
   illisible, ajoutée après la diffusion change l'empreinte de la carte de
   décision. Le rejeu patient la dit alors dérivée, et l'écran protocole du
   patient s'interrompt jusqu'à une nouvelle décision. Le praticien en est
   averti. C'est voulu pour une réponse positive. Pour une réponse illisible,
   c'est une conséquence de A2 (la limitation entre dans la revue).
6. **Une nouvelle anamnèse validée rouvre les constats couverts** (A6 de
   [[D-257]], conséquence acceptée au LOT-2 de [[D-275]]) : la couverture tient
   à la consultation porteuse. Il faut alors une nouvelle lettre, qui recite les
   réponses positives encore comptées. *Ajouté après la déclaration, sur la
   revue `wn-reviewer` : rappel d'un arbitrage déjà rendu, rien de neuf.*
7. **Limite héritée du §1** : les instruments du cabinet (`CAB_`), hors
   catalogue, ne sont pas couverts.
8. **Sens inverse du verrou** : tant que la table n'est pas signée, aucun
   constat n'est produit, et aucune lettre ne cite de réponse.

## 6. Constat de production (lecture seule, agrégats, 2026-10-10)

Sur les quatre questionnaires : **une passation**, BDI, statut `VALID`, réponse
« non ». À la signature, **aucun dossier existant ne change d'empreinte** et
aucun n'est bloqué.
