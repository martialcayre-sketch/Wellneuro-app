# Mesure du rayon Correspondance — protocole prêt, exécution due

> **LOT-06 de la campagne « ouverture du rayon Correspondance ». Ce document est le
> protocole, pas le résultat.** Les requêtes ci-dessous n'ont **pas** été exécutées :
> la lecture de production depuis une session autonome a été refusée par le
> classifieur de sécurité — le même refus que la session du 2026-09-15 a rencontré
> sur la campagne « 5. Actions », et il n'a pas été contourné.
>
> **Étiquetage `D-125` de tout ce qui suit : *inconnu faute de preuve*.** Aucun
> chiffre n'est avancé ici. Ce qui est écrit est ce qu'il faut demander à la base,
> et pourquoi.

## Pourquoi cette mesure, et pourquoi maintenant

La campagne a livré cinq lots sans jamais mesurer l'usage réel du rayon. Le cadrage
du 2026-09-16 disait déjà que **la seule mesure existante est fausse** : un « 0 »
relevé le 2026-08-14, quatre jours **avant** l'ouverture du courrier de biologie —
donc avant qu'un second écrivain n'existe.

**L'échéance est dure et elle est proche.** Le journal d'accès aux dossiers est
purgé à **12 mois glissants**, par purge opportuniste à l'écriture
(`JournalAccesDossier`, règle GD-2). La série ne se reconstitue pas : ce qui sort de
la fenêtre est perdu. La revue RGPD du **2026-10-21** est le repère naturel.

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
