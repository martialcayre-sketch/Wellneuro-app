# Les huit instruments sous licence tierce — une fiche par instrument

Aide à la décision. Rien n'est décidé ici, et **rien n'est affirmé qui ne soit au
dossier** : ce document ne dit pas d'un instrument qu'il est libre ou sous licence, il
rapporte ce que le registre en dit et ce que la production en montre.

Ces huit instruments sont à `source_obtenue` : la source est au dossier, les droits ne
sont pas dégagés. **Ils restent assignables aujourd'hui** — `licence_requise` n'est
consommé nulle part dans le code, seul `actif: false` ferme les trois chemins
d'assignation.

## Ce que la mesure change à la discussion

| Instrument | Assignations | Ouvertes | Passations |
|---|---|---|---|
| `Q_SOM_02` Epworth | 1 | **0** | 1 |
| `Q_NEU_11` HAD | 0 | 0 | 1 |
| `Q_INF_04` HIT-6 | 0 | 0 | 1 |
| `Q_PED_02` Conners enseignant | 0 | 0 | 0 |
| `Q_PED_03` Conners parent | 0 | 0 | 0 |
| `Q_GEO_04` MMSE/GRECO | 0 | 0 | 0 |
| `Q_CAN_01` QLQ-C30 | 0 | 0 | 0 |
| `Q_CAN_02` QLQ-BR23 | 0 | 0 | 0 |

**Aucune assignation ouverte, six instruments jamais utilisés, trois passations en
tout.** Bloquer les huit ne coûterait donc presque rien opérationnellement. C'est le
fait le plus important de ce document : la décision est moins lourde qu'elle n'en a
l'air.

## Le piège du remplacement

Les candidats du même domaine clinique sont **eux-mêmes `a_verifier`** — ce sont des
échelles tierces dont les droits n'ont fait l'objet d'aucune recherche, exactement comme
les huit. Remplacer un instrument dont on sait qu'une licence est exigée par un
instrument dont on ne sait rien **n'améliore pas la position, elle la rend seulement
moins visible.**

Les deux seuls candidats aux droits dégagés — `Q_INF_01` et `Q_INF_02` — sont des
questionnaires du référentiel SIIN, et ils **mesurent autre chose**
(hyperexcitabilité neurosensorielle, dépistage magnésium). Ce ne sont pas des
substituts.

## Fiche par instrument

### `Q_NEU_11` — Hospital Anxiety and Depression Scale (HAD)

- **Ayant droit au dossier** : « GL Assessment (copyright déclaré, à vérifier) ».
  Auteurs Zigmond & Snaith, 1983. Aucun DOI, aucun PMID vérifié.
- **Ce que la licence couvre** : rien n'est documenté au-delà de la mention de
  copyright. Il n'y a pas de périmètre écrit à opposer.
- **Banc** : 1 divergence critique. Contenu jamais audité.
- **Usage** : 1 passation, aucune assignation.
- **Candidats du même domaine** : `Q_NEU_01` (BDI-13), `Q_NEU_02` (MADRS),
  `Q_STR_04` (DASS-21) — **tous les trois `a_verifier`**. `Q_NEU_01` porte en outre une
  dérive de barème déjà consignée (aucune convention publiée retrouvée).
- **À savoir** : la 4ᵉ bande servie n'est pas dans Zigmond & Snaith 1983 — Snaith
  l'écrit lui-même en 2003, elle vient du manuel éditeur. Sur ce point précis, **l'app a
  raison et le corpus a tort** ; c'est déjà arbitré.

### `Q_SOM_02` — Epworth Sleepiness Scale

- **Ayant droit au dossier** : « © M. W. Johns (licence requise **pour certains
  usages**, à vérifier) », 1991. La mention distingue donc des usages — mais lesquels
  n'est pas écrit.
- **Banc** : **0 divergence critique**. C'est l'un des instruments les plus propres du
  catalogue.
- **Usage** : 1 assignation (close), 1 passation.
- **Candidats** : `Q_SOM_01` (PSQI), `Q_SOM_03` (Berlin), `Q_SOM_06` (Pichot) — tous
  `a_verifier`, et **aucun ne mesure la somnolence diurne** : qualité du sommeil, risque
  d'apnée, fatigue. Il n'y a pas de substitut dans le catalogue.
- **Remarque** : c'est l'instrument où la question « quels usages ? » mérite le plus
  d'être posée à l'ayant droit, parce que la réponse pourrait être « l'usage clinique
  individuel est libre ». Sa grille porte par ailleurs deux trous corrigés en #450
  (6 et 15).

### `Q_INF_04` — Headache Impact Test (HIT-6)

- **Ayant droit au dossier** : « © QualityMetric (licence requise, à vérifier) »,
  Kosinski et al. 2003.
- **Banc** : 0 divergence critique.
- **Usage** : 1 passation, aucune assignation.
- **Candidats** : aucun. `Q_INF_01` et `Q_INF_02` sont SIIN et mesurent autre chose.
- **Remarque** : QualityMetric est un éditeur dont le modèle repose sur la licence
  d'instruments (famille SF-36). C'est probablement le dossier le plus net des huit —
  et aussi celui où le retrait coûte le moins, l'instrument n'ayant jamais été assigné.

### `Q_PED_02` — Conners Teacher Rating Scale, forme courte

### `Q_PED_03` — Conners 3, version parent

- **Ayant droit au dossier** : « © MHS (licence requise, à vérifier) », 1997 et 2008.
- **Banc** : **jamais passés**. Ce sont les deux seuls instruments du catalogue dans ce
  cas (62 rapports sur 64) — leur comparaison coûterait des appels d'API, et elle n'a
  pas été engagée.
- **Usage** : **aucun**. Ni assignation, ni passation.
- **Candidats** : `Q_PED_01` seul en pédiatrie, et il mesure le chronotype de l'enfant —
  aucun rapport avec le TDAH.
- **À savoir, et c'est décisif** : le seuil de 15 de l'échelle de Conners vient d'un
  rapport non publié et a été **désavoué en 1985 par le laboratoire de son propre
  auteur**, qui recommandait d'abandonner l'instrument. C'est déjà consigné dans
  l'arbitrage des bandes.
- **Recommandation** : ce sont les deux cas les plus simples. Jamais utilisés, jamais
  mesurés, sous licence d'un éditeur, et scientifiquement contestés par leur propre
  laboratoire. **Le retrait ne coûte rien et ferme trois questions d'un coup** — dont
  la dépense du banc, qui n'a alors plus lieu d'être engagée.

### `Q_GEO_04` — Mini Mental State Examination, version consensuelle GRECO

- **Ayant droit au dossier** : « © PAR (Psychological Assessment Resources) — licence
  requise, à vérifier ». Folstein, Folstein & McHugh 1975 ; version GRECO Derouesné
  et al.
- **Banc** : 0 divergence critique.
- **Usage** : aucun.
- **Candidats** : `Q_GEO_03` (Alzheimer's Questionnaire), `Q_GEO_05` (QDRS),
  `Q_GEO_06` (Test des 5 mots de Dubois) — **trois instruments de dépistage cognitif
  déjà au catalogue**, tous `a_verifier`. C'est le seul des huit où le catalogue offre
  réellement des alternatives fonctionnelles.
- **Remarque** : le MMSE est un test administré par un clinicien, pas un
  auto-questionnaire. Sa place dans un portail patient mérite d'être interrogée
  indépendamment de la licence.

### `Q_CAN_01` — EORTC QLQ-C30

### `Q_CAN_02` — EORTC QLQ-BR23 (module sein)

- **Ayant droit au dossier** : « © EORTC — enregistrement/autorisation requis, à
  vérifier ». Aaronson et al. 1993, Sprangers et al. 1996.
- **Banc** : 1 divergence critique chacun. Leurs bandes portent des libellés
  explicitement douteux — « Aucun problème signalé (seuil source < 28 **incohérent**) »
  pour l'un, « < 14 incohérent » pour l'autre : la contradiction est déjà écrite dans le
  catalogue.
- **Usage** : aucun, ni l'un ni l'autre.
- **Candidats** : **aucun**. Ce sont les deux seuls instruments de cancérologie du
  catalogue ; les retirer retire le domaine.
- **Remarque** : l'EORTC pratique un **enregistrement** plutôt qu'une licence payante
  pour l'usage académique et clinique — la mention au dossier dit
  « enregistrement/autorisation », pas « licence ». C'est la démarche la plus légère des
  huit, si le domaine doit être conservé.

## Trois blocs, si vous voulez trancher vite

1. **Retirer sans regret** — `Q_PED_02`, `Q_PED_03`. Jamais utilisés, jamais mesurés,
   scientifiquement désavoués. Aucune contrepartie.
2. **Instruire l'ayant droit** — `Q_SOM_02` (« pour certains usages » : lesquels ?),
   `Q_CAN_01`/`Q_CAN_02` (un enregistrement, pas une licence). Ces trois-là ont une
   chance réelle d'être régularisés sans coût, et deux d'entre eux n'ont pas de
   substitut.
3. **À arbitrer sur l'usage, pas sur la licence** — `Q_INF_04` (jamais assigné, éditeur
   dont c'est le métier), `Q_NEU_11` (1 passation, trois candidats existants),
   `Q_GEO_04` (test de clinicien dans un portail patient, trois alternatives au
   catalogue).

## Ce que ce document ne fait pas

- Il n'affirme d'aucun instrument qu'il est libre : les quarante-deux entrées
  `a_verifier` du registre incluent tous les candidats cités.
- Il ne donne pas d'avis juridique. « Reformuler les items » n'est pas une option : une
  paraphrase reste une œuvre dérivée, et surtout **elle détruit l'instrument** — sa
  validité, ses normes et ses seuils appartiennent à la version validée. Ce dépôt en a
  déjà payé le prix deux fois, avec `Q_SOM_07` (« ce n'est pas un défaut de scoring,
  c'est un autre instrument ») et avec la forme courte de `Q_ALI_01` (similarités de
  libellés 0,00 à 0,33 avec sa propre source).
- Il ne modifie ni le registre, ni le catalogue, ni une seule ligne de code.
