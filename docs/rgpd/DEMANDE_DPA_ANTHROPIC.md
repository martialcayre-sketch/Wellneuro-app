# Demande d'un DPA article 28 — Anthropic

**Statut : ENVOYÉE le 2026-10-01 à 17:34 UTC** par le responsable de
traitement, dans une version mise à jour du corps ci-dessous (voir « Trace à
tenir »). Brouillon d'origine rédigé le 2026-09-11.

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
d'une demande ne se déclare pas, elle s'établit par une trace du fil** : sa
lecture directe, ou à défaut une capture du message qui montre en-têtes et
corps (c'est la preuve retenue le 2026-10-01, la messagerie `wellneuro.fr`
n'étant pas lisible en session). À consigner ici au fur et à mesure, et à
reporter aux rubriques 7 et 14 du dossier :

| date (UTC) | événement | trace |
|---|---|---|
| 2026-10-01 17:34 | demande envoyée par e-mail de `martialcayre@wellneuro.fr` à **`privacy@anthropic.com`**, objet du message « Rgpd » | deux captures du dossier « Messages envoyés », fournies par le responsable et lues en session le 2026-10-01. Elles montrent l'expéditeur, le destinataire, la date (« 1 oct. 2026 19:34 », heure de Paris), l'envoi par `wellneuro.fr` et le corps |
| 2026-10-01 17:35 | **accusé de transfert**, de « Fin AI Agent from Anthropic » `<support@mail.anthropic.com>`, dans le même fil : « We're transitioning your question to a human member of our Privacy Team for further assistance […] we'll email you when an agent has responded. » **Identifiant de conversation : 215476193483547** | troisième capture, message lu en session (19:35, heure de Paris). Agent automatisé, **pas une réponse sur le fond** : la demande est remise à l'équipe Privacy |
| — | réponse sur le fond / relance | à compléter |

**Le corps envoyé n'est pas celui du brouillon ci-dessus.** Son second
paragraphe a été réécrit le 2026-10-01 pour couvrir les usages ouverts depuis
le brouillon ([[D-168]] et l'extraction des comptes rendus biologiques,
[[D-256]] A4) :

> Nous exploitons une application de suivi en nutrition clinique dont les
> traitements portent des données de santé au sens de l'article 9 du RGPD.
> Votre API est utilisée comme sous-traitant pour une assistance à la
> rédaction : préparation de brouillons de synthèse, proposition d'une
> formulation courte et d'un premier jet de résumé à partir de textes du
> dossier. Elle servira aussi à extraire les valeurs de comptes rendus
> d'analyses biologiques transmis en image ou en PDF. Les données transmises
> comprennent des éléments rédigés par un professionnel de santé, des textes
> écrits par le patient lui-même et, pour l'extraction, des documents de
> laboratoire complets, mentions d'identité comprises (nom, date de
> naissance).

Le reste (les quatre points demandés, la phrase sur l'interlocuteur et celle
sur le registre) est celui du brouillon, mot pour mot.

**État au 2026-10-01 : envoyée, sans réponse.** L'envoi lève la condition de
pose du drapeau d'extraction du LOT-02 de BIO-INGEST ([[D-256]], amendement du
2026-10-01), qui exigeait l'envoi et non la signature. Il ne referme pas le
trou de la rubrique 7 : le DPA reste à obtenir, signer et archiver.
