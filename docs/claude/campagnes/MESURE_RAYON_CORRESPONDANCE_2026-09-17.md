# Mesure du rayon Correspondance — protocole prêt, exécution due

> **LOT-06 de la campagne « ouverture du rayon Correspondance ».**
> **MESURE LUE LE 2026-09-17** (`one-off-9328`, lecture seule, agrégats seuls).
> Étiquetage [[D-125]] : ***observé sur un parcours réel***, production, agrégats —
> avec **une réserve d'interprétation** nommée plus bas et qu'aucun agrégat ne lève.

## Pourquoi cette mesure, et pourquoi maintenant

La campagne a livré cinq lots sans jamais mesurer l'usage réel du rayon. Le cadrage
du 2026-09-16 disait déjà que **la seule mesure existante est fausse** : un « 0 »
relevé le 2026-08-14, quatre jours **avant** l'ouverture du courrier de biologie —
donc avant qu'un second écrivain n'existe.

**L'échéance est dure et elle est proche.** Le journal d'accès aux dossiers est
purgé à **12 mois glissants**, par purge opportuniste à l'écriture
(`JournalAccesDossier`, règle GD-2). La série ne se reconstitue pas : ce qui sort de
la fenêtre est perdu. La revue RGPD du **2026-10-21** est le repère naturel.

## Ce que la base a répondu — 2026-09-17

### Le fil est LU, il n'est presque pas ÉCRIT

| | Lignes | Dossiers | Première | Dernière |
|---|---|---|---|---|
| `correspondances_medecin`, sens `sortant` | **1** | **1** | 2026-09-15 | 2026-09-15 |
| dont **générées** (`ancrage_sha256` non nul) | **1** | | | |
| `GET /api/praticien/correspondance-medecin` | **41** | **11** | 2026-07-23 | **2026-09-16** |
| `POST …/biologie/proposition/courrier` | **1** | 1 | 2026-09-15 | 2026-09-15 |
| `POST …/adressage/courrier` | **0** | — | — | — |

**Trois faits, et ils ne disent pas la même chose.**

**1. La transcription praticien n'a jamais servi.** La table ne contient **aucune
ligne sans ancre**. En deux mois d'ouverture, le geste que `FM-1` a choisi comme V1 —
le praticien recopie ce qu'il a envoyé ou reçu — n'a **pas été posé une seule fois**.

**2. Mais le fil est ouvert, régulièrement, sur onze dossiers.** 41 lectures, la
dernière **la veille de cette mesure**. On regarde, on n'écrit pas. Deux lectures
sont possibles — il n'y a rien à consigner, ou le geste ne convient pas — et
**aucun agrégat ne les départage**. C'est une question à poser au praticien, pas à
la base.

**3. L'unique ligne est un courrier de biologie**, `indications-biologie-v1`, généré
le 2026-09-15. Le « 0 » du 2026-08-14 n'était donc pas faux : il était **antérieur**.

### Ce que cela tranche, et ce que cela ne tranche pas

**TRANCHÉ — la V2 n'a aucun déclencheur.** [[D-219]] §1 (`FM-1`) fait de la bascule
C → A — du texte libre vers le lien signé — un **constat d'usage**, jamais une
échéance : « quand le volume le justifiera ». Le volume est **1**. La question est
close jusqu'à nouvel ordre, et elle se rouvrira sur un chiffre, pas sur une intuition.

**TRANCHÉ LE 2026-09-17, ET PAS PAR LA BASE — c'était un essai.** La réserve était
réelle ; elle est levée par une **déclaration du responsable**, interrogé sur cette
ligne précise : la consignation du **2026-09-15 à 23 h 11** est **un essai de sa
part**, pas un acte de consultation. Aucune lecture par identifiant n'a donc été
faite, et aucune n'est nécessaire.

**CE QUE CELA DURCIT.** Le geste de courrier de biologie n'a **jamais servi en
consultation** : le « 1 » de la table est un test, pas un usage. Les deux écrivains du
fil affichent donc le même chiffre réel — **zéro usage clinique** — et le constat du
LOT-06 se lit sans nuance : en deux mois d'ouverture, le rayon Correspondance est **lu
41 fois sur 11 dossiers et n'a jamais été écrit pour un patient**.

**LA RÉSERVE TELLE QU'ELLE ÉTAIT POSÉE, gardée au dossier parce que le raisonnement se
rejouera.** Un agrégat ne distingue pas un essai d'un acte, et les dossiers de test
**sont réels et vivent en production** ([[D-075]]) : conclure d'un compte que le
courrier a servi en consultation aurait été exactement l'inférence que [[D-125]]
interdit. Ce qui a tranché n'est pas la base, c'est le souvenir du praticien — et la
prochaine mesure n'aura pas cette chance. **Marquer les essais, ou accepter de ne pas
savoir.**

**RIEN À DIRE ENCORE DE LA LETTRE D'ADRESSAGE.** Zéro appel, et c'est attendu :
`WN_ADRESSAGE_COURRIER` n'a été posé qu'**au matin du 2026-09-17**, après cette
lecture. Le premier chiffre qui vaudra quelque chose se lira **après** un délai
d'usage.

## Ce qu'il faut demander, et ce que chaque colonne sépare

### 1. Les deux écrivains, séparés

```sql
select sens,
       count(*)                                              as lignes,
       count(distinct id_patient)                            as dossiers,
       min(consigne_le)                                      as premiere,
       max(consigne_le)                                      as derniere,
       count(*) filter (where ancrage_sha256 is not null)    as generees
from correspondances_medecin
group by sens;
```

**La dernière colonne est celle qui compte.** `correspondances_medecin` a **deux
écrivains** : la transcription par le praticien (aucune ancre) et les documents
générés côté serveur (ancre posée) — le courrier de biologie depuis le 2026-08-18,
la lettre d'adressage depuis [[D-218]]. **Une mesure qui ne ventile pas sur
`ancrage_sha256 is not null` additionne un geste humain et une génération machine**,
et rend un chiffre qui ne veut rien dire.

### 2. Les deux écrivains ancrés, séparés l'un de l'autre

```sql
select ancrage_version, count(*), count(distinct id_patient),
       min(consigne_le), max(consigne_le)
from correspondances_medecin
where ancrage_sha256 is not null
group by ancrage_version;
```

Depuis [[D-218]], `ancrage_version` distingue `indications-biologie-v1` (courrier
biologie) de `safety-signals-nnpp2-v1` (lettre d'adressage). **C'est la seule mesure
qui dira si le geste d'adressage a servi.**

### 3. Les lectures du rayon — TROIS gabarits, pas deux

```sql
select route, methode, count(*), count(distinct id_patient),
       min(cree_le), max(cree_le)
from journal_acces_dossiers
where route in ('/api/praticien/correspondance-medecin',
                '/api/praticien/biologie/proposition/courrier',
                '/api/praticien/adressage/courrier')
group by route, methode;
```

Le cadrage n'en nommait que **deux** ; [[D-218]] en a ajouté un troisième. Filtrer
sur le premier seul **sous-compte le rayon** — c'est le piège que le cadrage avait
nommé, et il s'est aggravé depuis.

## État d'exécution

**Lu le 2026-09-17 par `one-off-9328`.** Les trois requêtes ont tourné dans un seul
conteneur détaché, en lecture seule, agrégats seuls — aucun `texte`, aucun
`medecin_libelle`, aucun identifiant en clair.

**Deux tentatives ont échoué avant, et le motif vaut d'être gardé** : `prisma db
execute` **n'imprime pas** les lignes d'un `select` — il exécute et rend « Script
executed successfully » (`one-off-8811`). Et le client Prisma généré **exige son
adaptateur** (`PrismaPg` + `pg`) : un `new PrismaClient()` nu échoue
(`one-off-8838`). Le chemin qui marche est un `node -e` qui reconstruit le client
comme le fait le banc E2E, et imprime en JSON — en convertissant les `BigInt`, que
`JSON.stringify` refuse.

## Comment l'exécuter, et ce qu'il ne faut pas faire

- **Conteneur détaché obligatoire** : `scalingo --app wellneuro run -d "…"`, sortie
  relue par `scalingo logs --filter one-off-N`. Le mode détaché lève l'exigence de
  TTY.
- **Un seul argument, tout sur une ligne, en apostrophes simples** : le CLI aplatit
  `argv` sans re-quoter. Aucun heredoc.
- **Agrégats seuls.** Aucun `texte`, aucun `medecin_libelle`, aucun `id_patient` en
  clair — les `count(distinct …)` suffisent, et ils ne nomment personne.
- **Lecture seule.** Aucun `update`, aucun `insert` : la production ne s'écrit que
  par migration relue puis `release-db` approuvée ([[D-087]]).

## Ce qu'on en fait ensuite

Un fragment `changelog.d/`, étiqueté `D-125` — *observé sur un parcours réel* — et
une décision numérotée **seulement si un chiffre tranche quelque chose**. Un chiffre
qui confirme ce qu'on croyait n'est pas une décision ; il est une ligne de fragment.

**Trois questions que la mesure peut trancher, et qu'elle seule peut trancher :**

1. le geste de transcription praticien **sert-il** ? (`ancrage_sha256 is null`) ;
2. le courrier de biologie a-t-il servi **au-delà** de la fenêtre où il a été
   ouvert ? ;
3. la lettre d'adressage, une fois son drapeau posé, atteint-elle les **6 dossiers
   sur 25** que la cotation de sécurité inhibe ?

La troisième ne pourra rien dire tant que `WN_ADRESSAGE_COURRIER` n'est pas posée en
production : **le drapeau est neuf et éteint à la livraison**. Mesurer avant de
l'allumer rendrait un zéro qui ne mesure rien — exactement l'erreur du « 0 » du
2026-08-14.
