# Demande d'un DPA article 28 — Anthropic

**Statut : brouillon rédigé le 2026-09-11, à relire puis à envoyer par le
responsable de traitement. Rien n'a été envoyé.**

## Pourquoi cette demande, et pourquoi maintenant

`DOSSIER_RGPD` §6, trou 1 : **aucun DPA n'est signé, avec aucun sous-traitant.**
Le constat est antérieur au cutover HDS et il vaut toujours.

Anthropic est le cas le plus exposé des cinq, pour trois raisons cumulées :

1. il **reçoit des données de santé** au titre de l'article 9 — le contenu des
   synthèses, et depuis `D-167` le dépôt patient **verbatim**, c'est-à-dire une
   parole brute que la rédaction d'aucun professionnel n'a médiée ;
2. le transfert est qualifié **hors Union européenne** (§7) ;
3. il est **nommé au patient** dans le document de confidentialité qu'il lit —
   la v7 du 2026-09-10 élargit son rôle. Nous lui disons qui reçoit ses données
   sans pouvoir produire le contrat qui encadre cette réception.

## Ce que la demande couvre, et ce qu'elle ne couvre pas

**Elle porte sur le DPA signé, et sur lui seul.** C'est un objet unique,
vérifiable, dont la réception se constate : on l'a, ou on ne l'a pas. La demande
qui a obtenu l'annexe HDS de Scalingo tenait dans cette forme.

**Trois trous du §7 NE SONT PAS repliés dedans**, et ils restent ouverts :

- le **mécanisme de transfert invoqué** — clauses contractuelles types, annexe,
  décision d'adéquation — écrit nulle part, pour aucun flux ;
- la **localisation réelle de l'inférence**, établie ni dans un sens ni dans
  l'autre, et l'existence éventuelle d'une inférence UE ;
- la **rétention des entrées** et ce que le prompt caching, activé dans ce
  dépôt, implique pour des données de santé.

Les replier ici diluerait une demande précise en questionnaire, et c'est
précisément ce qui a fait traîner d'autres fils. Ils feront l'objet d'une
demande distincte, ou d'un avenant, une fois le DPA obtenu.

---

## Corps de la demande

> **Objet : accord de sous-traitance (art. 28 RGPD) — compte Wellneuro**
>
> Bonjour,
>
> Nous exploitons une application de suivi en nutrition clinique dont les
> traitements portent des données de santé au sens de l'article 9 du RGPD. Votre
> API est utilisée comme sous-traitant pour une assistance à la rédaction :
> préparation de brouillons de synthèse, et proposition d'une formulation courte
> à partir de textes du dossier. Les données transmises comprennent des éléments
> rédigés par un professionnel de santé et des textes écrits par le patient
> lui-même.
>
> Nous vous demandons de nous communiquer **l'accord de sous-traitance au sens
> de l'article 28 du RGPD applicable à notre compte**, ainsi que :
>
> 1. **le document lui-même**, dans la version applicable à notre compte à la
>    date de ce message ;
> 2. **sa procédure de signature** — signature en ligne, contresignature, ou
>    acceptation réputée acquise par les conditions générales : dans ce dernier
>    cas, la référence exacte de la clause et la date à laquelle elle nous est
>    devenue opposable ;
> 3. **une copie horodatée** une fois l'accord conclu, pour archivage à notre
>    registre des traitements ;
> 4. **la couverture des traitements déjà réalisés** : notre usage est antérieur
>    à cette demande, et nous avons besoin de savoir si l'accord les couvre
>    rétroactivement ou à compter de sa conclusion seulement.
>
> Si la délivrance de ce document ne relève pas du support, nous vous
> remercions de nous indiquer l'interlocuteur compétent.
>
> Cette demande est le point bloquant d'une mise en conformité en cours : elle
> conditionne la complétude de notre registre des traitements.
>
> Cordialement,

---

## Trace à tenir

Sur le modèle de ce qui a été fait pour Scalingo — et qui a servi : **la date
d'une demande ne se déclare pas, elle s'établit par lecture du fil.** À
consigner ici au fur et à mesure, et à reporter au §6 du dossier :

| date (UTC) | événement | trace |
|---|---|---|
| — | demande envoyée | à compléter |
| — | réponse / relance | à compléter |

**État au 2026-09-11 : non envoyée.** La ligne correspondante du tableau §14
reste ouverte, et ce brouillon ne la referme pas.
