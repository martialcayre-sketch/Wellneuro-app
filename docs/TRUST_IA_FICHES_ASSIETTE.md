# L'intelligence artificielle dans les fiches d'assiette

> Document de transparence sur l'usage de l'IA, exigé par `D-251` §5. Il dit
> comment l'IA intervient dans les fiches d'assiette que le praticien remet au
> patient, ce qu'elle ne fait jamais, et qui en répond. **État au 2026-09-30.**
> Il est validé par le responsable avant d'être versé au dépôt.

## En bref

- Une **fiche d'assiette** est une fiche pratique d'alimentation. Votre
  praticien vous la remet quand il retient une assiette dans votre protocole.
- Chaque fiche a été **adaptée pour les patients avec l'aide d'une
  intelligence artificielle**. Le praticien responsable l'a ensuite **relue en
  entier et validée** avant qu'elle puisse être remise à qui que ce soit.
- **L'IA n'a jamais accès à vos données.** Elle ne travaille que sur le texte de
  la fiche, une fois pour toutes, avant qu'aucun patient ne la reçoive.
- **Aucune IA n'intervient quand la fiche vous est remise.** C'est l'assiette
  choisie par votre praticien qui désigne la fiche, et c'est la dernière
  version validée qui part.

## D'où vient le texte

- **La source** : les Fiches MY `WN-SRC-0296` à `WN-SRC-0307`, une par
  assiette. Le responsable en est propriétaire : il les a acquises au cours de
  sa formation, et il en détient le droit d'adaptation et de remise
  (`D-251` §2).
- **Le texte de départ** est la transcription du document d'origine. Cette
  transcription a elle-même été faite avec l'aide de l'IA : une lecture par
  Claude (Anthropic), retenue, et contrôlée contre deux autres lectures, l'une
  extraite directement du PDF, l'autre faite par GPT (OpenAI).
- **Le texte des fiches n'est pas dans ce dépôt**, qui est public. Il est
  conservé dans la base de l'application, chez un hébergeur de données de santé
  (HDS).

## Qui fait quoi

| Étape | Qui | Ce qui est fait |
| --- | --- | --- |
| Rédaction | Claude, d'**Anthropic** | Réécrit la fiche pour un lecteur patient, sous une consigne écrite et versionnée. |
| Contre-lecture | GPT, d'**OpenAI** | Relit chaque élément contre la source. Un désaccord ou un doute exclut l'élément. |
| Contrôles automatiques | L'application, sans IA | Vérifie les extraits, les nombres, le vocabulaire (voir « Les garde-fous »). |
| Validation | Le praticien responsable | Relecture intégrale, source et adaptation côte à côte, puis acte daté. |
| Remise | Votre praticien, par le clic « Valider pour diffusion » | Sans IA. |

**Constaté en production le 2026-09-30**, par lecture de la base en agrégats :

- les 7 fiches en service ont été rédigées par le modèle `claude-sonnet-5` et
  contre-lues par le modèle `gpt-5.4`, sous la consigne
  `fiche-assiette-v1+d4d81bb3a8ae9fa5`, le 2026-09-27 ;
- toutes les 7 ont été validées après relecture intégrale, entre le 2026-09-27
  et le 2026-09-29.

Le nom des deux modèles et la version de la consigne sont enregistrés avec
chaque version de fiche : l'origine de chaque texte se retrace.

## Ce qui est envoyé aux fournisseurs d'IA

- **Envoyé** : le texte de la fiche, les énoncés sourcés qu'elle cite, et les
  réserves de sécurité de l'assiette.
- **Jamais envoyé** : aucune donnée d'un patient, ni nom, ni réponse, ni
  élément de dossier. L'adaptation se fait hors ligne, depuis le poste du
  responsable, et non depuis l'application.

C'est pourquoi OpenAI ne figure pas parmi les prestataires qui traitent vos
données personnelles : il n'en reçoit aucune.

## Les règles imposées à l'IA

La consigne de rédaction (`tools/corpus/fiches/consignes/redaction.md`)
impose notamment :

- **aucun nombre** absent de la source ou d'un énoncé cité — ni arrondi, ni
  conversion, ni nombre écrit en lettres pour contourner la règle ;
- **aucune dose de complément alimentaire** : elle devient un renvoi vers le
  praticien ;
- **aucun aliment, aucune composition, aucune recette** absents de la source ;
- **toutes les réserves de sécurité** de l'assiette, en précautions formulées
  comme un renvoi vers le praticien. Une éviction ne part jamais sans ses
  bornes (`D-227` §3) ;
- **ni diagnostic, ni prescription** : le vocabulaire médical engageant est
  proscrit.

## Les garde-fous

1. **Contrôles automatiques**, avant la contre-lecture. Chaque extrait repris
   mot pour mot se retrouve dans la source. Chaque nombre existe dans la source
   ou dans un énoncé cité. Le texte ne porte ni balisage ni mot proscrit.
2. **Contre-lecture élément par élément.** Un élément refusé est exclu, sans
   repêchage. Si c'est une précaution ou le titre qui est refusé, la fiche
   entière est écartée. Une contre-lecture incomplète écarte aussi la fiche.
3. **Dépôt comme brouillon seulement.** La voie de dépôt refuse tout champ de
   validation : une machine ne valide jamais (`DC-16`).
4. **Validation humaine, distincte et datée**, par le responsable, après une
   relecture intégrale qu'il déclare au moment de valider.
5. **Contrôles rejoués au moment de servir.** Une version qui ne les passe plus
   n'est pas servie au patient.
6. **Retrait possible à tout moment, version par version.** Le texte cesse
   d'être servi, mais la fiche reste mentionnée : rien ne disparaît en silence.

## Ce que l'IA ne fait jamais ici

- Choisir quelle fiche vous est remise, ni décider qu'elle vous l'est.
- Voir vos données.
- Valider une fiche, ou l'envoyer.
- Ajouter un nombre, une dose ou une recette absents de la source.
- Intervenir après la validation : le texte que vous lisez est celui que le
  praticien a validé, à l'identique (une empreinte le vérifie).

## Ce que vous voyez

- La page de lecture de chaque fiche porte la mention : « Fiche adaptée avec
  l'aide d'une intelligence artificielle, relue et validée par votre
  praticien. »
- L'e-mail qui annonce une fiche est neutre : il ne nomme ni l'assiette, ni la
  fiche.

## Limites connues

- **Le contrôle automatique ne lit pas le sens.** Un sens déplacé, une
  population élargie ou un nombre écrit en lettres lui échappent. La
  contre-lecture les cherche, et la relecture intégrale du responsable reste
  la dernière porte (`D-195` §1).
- **La base enregistre la déclaration de relecture, pas la preuve d'un geste
  humain.** Cette garantie tient par l'application, qui n'accepte la
  validation que d'un praticien connecté (contre-revue adverse du 2026-09-29,
  amendement de `D-251`).
- **Une contre-revue adverse** a examiné la chaîne le 2026-09-29 : aucun
  défaut bloquant, et ses quatre constats de second rang ont été corrigés ou
  bornés (`docs/claude/REVUE_CODEX_ADVERSE_FICHES_ASSIETTE_2026-09-29.md`).
  Une seconde passe, le 2026-09-30, a éprouvé les tests par mutation : chaque
  garantie a au moins un test qui échoue quand on la casse
  (`docs/claude/REVUE_CODEX_MUTATIONS_FICHES_ASSIETTE_2026-09-30.md`).

## Signaler une erreur

Depuis le portail, la carte « Signaler un problème », choix « Une information
est incorrecte ». Le praticien examine la demande. Il peut retirer la version
en cause, qui cesse alors d'être servie.

## Références

- Décision : `D-251` (§2 droits, §4 texte hors dépôt, §5 régime « adaptée par
  IA → validée », §6 précautions, et ses amendements). Principes : `DC-16`,
  `D-094`, `D-195` §1, `D-227` §3.
- Outil d'adaptation : `tools/corpus/fiches/README.md` et ses consignes,
  `tools/corpus/fiches/consignes/`.
- Mention au patient : `web/src/components/patient/fiches-assiette/textesFiches.ts`.
