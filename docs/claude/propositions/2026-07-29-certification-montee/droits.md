# Droits des instruments — ce que la déclaration du 2026-07-29 règle, et ce qu'elle ne règle pas

Dossier d'arbitrage. Aucune décision n'est prise ici : le registre porte l'état, ce
document porte les questions.

## La déclaration

Le praticien-propriétaire a déclaré le 2026-07-29 que les questionnaires issus de sa
formation — supports de cours du SIIN, dont les documents à l'origine des extractions
du corpus — sont d'usage libre pour son exercice, tant que leur diffusion ne dépasse
pas le cadre de la consultation et de WellNeuro.

Elle est transcrite dans `droits.detail` **sans être élargie ni adoucie**, avec son
périmètre (administration, scoring, restitution, indexation RAG derrière la barrière
D-003) et ses exclusions (rediffusion hors cabinet, publication du verbatim, cession à
un tiers).

**Ce qu'elle est** : l'engagement du praticien sur l'usage qu'il fait de ses supports
de formation. **Ce qu'elle n'est pas** : une licence. Elle ne peut pas éteindre le
droit d'un tiers sur l'échelle que le support reproduit.

## Le résultat, à énoncer d'emblée : elle ne dégage aucun instrument de plus

C'est contre-intuitif, et c'est mesuré.

La déclaration porte sur **les supports de cours du SIIN**. Les instruments qu'elle
couvre sont donc ceux du **référentiel SIIN** — `statutBibliographique:
referentiel_interne_siin`. Or ces treize instruments **avaient déjà été tranchés le
2026-07-25**, sur la déclaration précédente. Les 43 restant à `a_verifier` sont
**tous** des échelles tierces (32 `reference_identifiee`, 11 `a_completer`) :
**zéro** relève du référentiel SIIN.

Une échelle tierce qu'un support de cours reproduit ne devient pas libre parce que le
praticien a le droit d'utiliser le support. La déclaration est donc enregistrée dans
chacune de ces 43 entrées, avec la réserve qui dit qu'elle ne les dégage pas.

### Pourquoi le premier jet était faux

La première passe de ce lot avait dégagé 35 de ces instruments. Son critère était :
« le registre portait-il déjà une ligne © ? » — de la **typologie de dossier**. Il
donnait `permission_obtenue` au Zarit, à l'Internet Addiction Test, à l'IRLS et au
Karasek JCQ (rien de noté), et `licence_requise` à l'Epworth, au HIT-6 et au HAD (une
ligne notée) — alors que ces sept-là sont exactement de la même classe.

**Les instruments les moins instruits recevaient le statut le plus permissif**, et
l'absence de trace devenait une preuve de liberté. La revue adversariale l'a rendu en
NO-GO. C'est la classe de défaut déjà consignée en CB-04 : décider sur le **contenu**,
jamais sur la typologie.

## Quatre sorts

| Sort | Nombre | Fondement |
|---|---|---|
| `a_verifier` maintenu, déclaration enregistrée | 35 | Échelle tierce hors référentiel SIIN : la déclaration ne la dégage pas. |
| `licence_requise` | 8 | Le registre nommait déjà un ayant droit exigeant une licence. |
| **Rétrogradés à `a_verifier`** | **7** | Portaient `permission_obtenue` alors que leur propre `detail` constate qu'aucune autorisation n'a été sollicitée. |
| Inchangés | 14 | 13 du référentiel SIIN, tranchés le 2026-07-25, plus `Q_SOM_09` (`libre`). |

État final : 42 `a_verifier`, 13 `permission_obtenue`, 8 `licence_requise`, 1 `libre`.

Les mentions de droits antérieures sont **toutes préservées en tête** de
`droits.detail` : aucune n'a été effacée.

Le sort `licence_requise` est posé, lui aussi, sur une mention portant « à vérifier ».
L'asymétrie est assumée : **une affirmation qui bloque demande moins de preuve qu'une
affirmation qui dégage.**

### Les sept rétrogradés — une étiquette que son propre texte dément

`Q_NEU_01` (BDI-13), `Q_FIB_01` (FiRST), `Q_FIB_02` (QIF), `Q_ALI_03` (Monnier),
`Q_GEO_01` (Tinetti/POMA), `Q_GEO_03` (Alzheimer's Questionnaire), `Q_GEO_06` (5 mots
de Dubois).

Toutes datées du 2026-07-26, toutes des échelles tierces, et toutes portant dans leur
`droits.detail` : « **aucune autorisation n'a été sollicitée ni obtenue** auprès des
ayants droit ». Le statut disait `permission_obtenue` ; le texte disait le contraire.
Le garde neuf lit l'étiquette, pas le texte — et c'est sur cette étiquette que BDI-13
montait à `scoring_verifie`.

La contre-revue adversariale l'a relevé : la règle du contenu, appliquée aux 43, ne
l'était pas à celles-ci. Le fait était patent — `Q_GEO_03` et `Q_GEO_05` sont du **même
auteur** (Galvin) et recevaient deux sorts opposés, sur la seule foi d'un label.

Ces sept redescendent donc à `a_verifier`, leur `detail` préservé et augmenté de la
correction. C'est une donnée posée par un lot antérieur : la corriger sortait du
périmètre annoncé, mais la laisser aurait fait porter à ce lot une montée que les
pièces ne soutiennent pas.

## 1. Les huit sous licence tierce — à arbitrer

Ils s'arrêtent à `source_obtenue` : la source est au dossier, les droits ne sont pas
dégagés.

| Instrument | Échelle | Mention au dossier |
|---|---|---|
| `Q_NEU_11` | Hospital Anxiety and Depression Scale (HAD) | GL Assessment — copyright déclaré |
| `Q_SOM_02` | Epworth Sleepiness Scale | © M. W. Johns — licence requise pour certains usages |
| `Q_INF_04` | Headache Impact Test (HIT-6) | © QualityMetric — licence requise |
| `Q_PED_02` | Conners Teacher Rating Scale (CTRS-R:S) | © MHS — licence requise |
| `Q_PED_03` | Conners 3, version parent | © MHS — licence requise |
| `Q_GEO_04` | MMSE, version consensuelle GRECO | © PAR — licence requise |
| `Q_CAN_01` | EORTC QLQ-C30 | © EORTC — enregistrement/autorisation requis |
| `Q_CAN_02` | EORTC QLQ-BR23 | © EORTC — enregistrement/autorisation requis |

**Deux issues, instrument par instrument** : obtenir la licence, ou retirer
l'instrument du catalogue. Une troisième — le laisser servi sans licence — n'est pas
proposée.

**Ils restent assignables aujourd'hui.** `licence_requise` n'est consommé nulle part
dans le code : le statut documente l'exigence sans lui attacher de chemin
d'application. Seul `actif: false` retire réellement un instrument des trois chemins
d'assignation. C'est une décision produit, pas un défaut de ce lot — mais elle est à
prendre.

Trois remarques de fond :

- `Q_PED_02` et `Q_PED_03` sont les **deux seuls instruments jamais passés au banc**
  (62 rapports sur 64) : leur comparaison coûterait des appels d'API. Si le sort retenu
  est le retrait, cette dépense n'a pas lieu d'être engagée.
- `Q_PED_02` porte la réserve déjà consignée sur l'échelle de Conners, désavouée par
  ses auteurs depuis 1985.
- `Q_CAN_01` et `Q_CAN_02` sont actifs au catalogue.

## 2. Les quarante-deux échelles tierces non instruites

Les 35 laissées à `a_verifier` plus les 7 rétrogradées. Elles montent à
`source_obtenue` et s'y arrêtent.

Chacune porte sa réserve **dans le registre**, pas seulement ici — une lacune rangée
dans un dossier annexe se lit, dans le registre, comme un feu vert. Pour les 35, c'est
la déclaration suivie de « cet instrument n'est pas un questionnaire du référentiel
SIIN […] les droits de l'échelle d'origine restent entiers et NON INSTRUITS à ce
jour » ; pour les 7, la mention antérieure suivie de la correction du 2026-07-29.

Plusieurs sont des instruments **diffusés internationalement**, dont les droits sont
couramment détenus par un éditeur — le Zarit Burden Interview (`Q_NEU_09`), l'Internet
Addiction Test (`Q_NEU_10`), l'IRLS (`Q_SOM_04`), le Job Content Questionnaire de
Karasek (`Q_STR_06`), le MFI-20 (`Q_SOM_07`, déjà suspendu), l'IPSS (`Q_URO_01`).
Le registre n'en dit rien, et cette absence n'est pas une preuve de liberté d'usage.

Priorité proposée : ces six-là d'abord.

**Si vous voulez aller plus loin**, il y a un chemin, mais il vous appartient : une
déclaration explicite portant sur ces échelles tierces nommément, et non sur les
supports qui les reproduisent. Ce lot ne l'a pas supposée.

## 3. Les deux hors échelle, et le seul resté au premier barreau

| Instrument | État | Motif |
|---|---|---|
| `Q_SOM_07` (MFI-20) | `suspendu` | `actif: false` en production depuis #418. |
| `Q_FIB_03` (ELFE) | `suspendu` | `actif: false` en production. |
| `Q_NEU_06` | `repere` | Aucune source, ni structurée ni citée, et contenu non créé localement. |
| `Q_ALI_01` | `droits_verifies` | Droits dégagés, contenu non verrouillé — voir `scoring-et-contenu.md` §2. |

`Q_SOM_09` (agenda de sommeil, créé par WellNeuro) n'a **aucune source externe** — et
c'est normal. Le premier jet du garde le bloquait pour toujours à `repere` ; l'exigence
de source exempte désormais les instruments `cree_localement`.

## Ce que le CI vérifie désormais

Le vérificateur contrôlait les **valeurs** d'énumération — `droits.statut` et
`statutCertification` devaient appartenir aux ensembles autorisés. Il ne contrôlait
**pas la cohérence entre les deux** : il aurait accepté `publie` sur un instrument
resté `a_verifier`.

Chaque barreau exige maintenant ses pièces :

| Barreau | Pièce exigée |
|---|---|
| `source_obtenue` | une source au dossier — sauf contenu `cree_localement` |
| `droits_verifies` | `droits.statut ∈ {libre, permission_obtenue}` **et** une `dateVerification` au format `AAAA-MM-JJ` |
| `contenu_verrouille` | `versionServie.statutContenu` hors `a_auditer` |
| `scoring_verifie` | `verdictScoring` inscrit au registre, daté, **à zéro divergence critique** |
| `psychometrie_revue` | au moins une étude dans `measurement_evidence.json` |

`licence_requise` et `restreint` sont traités comme des verdicts **vérifiés mais
négatifs** : ils constatent qu'un droit manque, et ne dégagent rien. `suspendu` et
`remplace` restent hors échelle. Un instrument `actif: false` au catalogue **doit**
être dans l'un de ces deux états terminaux.

Un instrument `actif: false` au catalogue **doit** être `suspendu` ou `remplace` — et
l'inverse est vrai aussi : un état terminal sur un instrument **actif** est refusé,
pour qu'une réactivation reprenne l'échelle à `repere` au lieu de rester dispensée de
toute pièce. `questionnaires-catalog.ts` annonce par écrit la réactivation de
`Q_SOM_07` : sans ce second sens, elle serait passée sans un bruit.

Les deux barreaux du haut — `mapping_clinique_approuve` et `publie` — n'ont **aucune
pièce propre** ; ils héritent seulement de celles d'en dessous. C'est une lacune
connue, et personne n'y est aujourd'hui.

**Réserves suivies, hors périmètre de ce lot** : `verdictScoring` n'est lié à aucune
empreinte du catalogue — un scoring modifié demain laisserait les dix `scoring_verifie`
intacts avec un verdict daté du 2026-07-29, et le CI muet. Et `cree_localement` a
dérivé : le recensement l'a posé sur 8 instruments du référentiel SIIN, créés par le
SIIN et non par WellNeuro.

Trente-deux tests et **vingt-trois mutations** — chacune rouge sur le test exactement
visé, et non « rouge quelque part ». Dont celle qui fait passer `licence_requise` pour
dégageant, celle qui ramène les états terminaux dans l'échelle, celle qui retire le
second sens du garde des suspendus, et celle qui cesse de neutraliser commentaires et
chaînes du catalogue avant d'y chercher les suspendus.

Cette dernière n'est pas décorative : **l'extraction des suspendus a été fausse trois
fois** au cours de ce lot. Un découpage par accolades qui ratait les entrées fermées en
fin de ligne ; puis un rattachement qui comptait les `actif: false` cités en prose dans
un commentaire, et déclarait suspendus deux instruments actifs ; puis une neutralisation
qui effaçait aussi les identifiants qu'il fallait lire. Un test la confronte désormais
au **vrai** `questionnaires-catalog.ts`, avec une vérité terrain calculée autrement que
par la fonction testée.
