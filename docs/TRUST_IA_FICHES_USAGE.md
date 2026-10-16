# L'intelligence artificielle dans les fiches d'usage

> Document de transparence sur l'usage de l'IA, exigé par `D-314` §4 sur le
> patron de `docs/TRUST_IA_FICHES_ASSIETTE.md`. Il dit comment l'IA intervient
> dans les fiches d'usage des examens biologiques, ce qu'elle ne fait jamais,
> et qui en répond. **État au 2026-10-16 : projet, à valider par le
> responsable avant le merge de la PR qui le porte.** Aucun texte n'a encore
> été rédigé ni envoyé à un fournisseur : la structure signée ne déclare
> encore aucune fiche.

## En bref

- Une **fiche d'usage** dit au praticien à quoi sert un examen biologique
  pour une question donnée : population, préanalytique, lecture des
  résultats, précautions, limites. **Elle est lue par le praticien seul** :
  aucune surface patient, aucun envoi, aucune remise (`D-314` §7).
- Le **texte** de chaque fiche, et le **libellé** de chaque terme de son
  vocabulaire (hypothèses, populations d'usage), sont **rédigés avec l'aide
  d'une intelligence artificielle**, puis **validés par le praticien,
  rubrique par rubrique**, avant de pouvoir être lus comme validés.
- **L'IA n'a jamais accès à une donnée de patient.** Elle travaille sur des
  identifiants et des énoncés sourcés du corpus, une fois par version, en
  dehors de l'application.

## D'où vient le texte

- **La structure** : les fiches, leurs rubriques, leurs termes et les claims
  qu'elles épinglent sont des **identifiants signés** par le responsable,
  dans le dépôt (`web/src/lib/fiches-usage/ficheUsageBesoin2V1.ts`).
- **Le savoir** : les claims épinglés, seuls admis comme base. Leur statut
  validé est gardé par le contrat de fraîcheur des tables signées.
- **Le texte n'est pas dans ce dépôt**, qui est public (`D-251` §4). Il est
  conservé dans la base de l'application, chez un hébergeur de données de
  santé (HDS).

## Qui fait quoi

| Étape | Qui | Ce qui est fait |
| --- | --- | --- |
| Rédaction | Claude, d'**Anthropic** | Rédige toutes les rubriques d'une fiche, ou un libellé, sous une consigne écrite et versionnée. |
| Contre-lecture | GPT, d'**OpenAI** | Relit chaque rubrique dans le contexte des autres, et chaque libellé, contre les claims. Un désaccord ou un doute écarte la fiche entière. |
| Vérificateur DC-03 | L'outil, sans IA | Refuse tout identifiant ou nombre absent de ce que le rédacteur a reçu (`D-266` §7). |
| Contrat et structure | L'outil puis l'application, sans IA | Rubriques exactement attendues, structure du jour, aucun champ de validation. |
| Validation | Le praticien | Relecture déclarée de chaque rubrique et de chaque libellé, puis acte daté. |

Le nom des deux modèles et la version de la consigne sont enregistrés avec
chaque version de fiche et chaque libellé : l'origine de chaque texte se
retrace. Par défaut : `claude-sonnet-5` et `gpt-5.4`, sous la consigne
`fiche-usage-v1`.

## Ce qui est envoyé aux fournisseurs d'IA

- **Envoyé** : les identifiants de la structure (fiche, population,
  hypothèses, codes d'analyte, rubriques) et le texte des claims épinglés ;
  au contre-lecteur, en plus, le texte rédigé.
- **Jamais envoyé** : aucune donnée d'un patient, ni nom, ni réponse, ni
  résultat, ni élément de dossier. L'outil s'exécute en dehors de
  l'application, depuis le poste du responsable (`tools/corpus/fiches-usage/`).

## Les règles imposées à l'IA

La consigne de rédaction (`tools/corpus/fiches-usage/consignes/redaction.md`)
impose notamment :

- **rien que les claims** : aucun savoir extérieur, même certain ; une
  rubrique que les claims ne documentent pas le dit en une phrase fixe ;
- **aucun nombre, seuil, dose, durée ou unité** absent du message reçu ;
- **ni diagnostic, ni médicament, ni prescription** ;
- **les conditions, populations et limites** des claims gardées telles
  quelles.

## Les garde-fous

1. **Contre-lecture de chaque texte**, dans son contexte. Tout ou rien : une
   rubrique refusée écarte la fiche, car une version privée d'une rubrique ne
   serait jamais valide.
2. **Vérificateur DC-03**, bloquant.
3. **Dépôt comme brouillon seulement**, sous secret interne. La voie de dépôt
   refuse tout champ de validation : une machine ne valide jamais (`DC-16`).
4. **Validation humaine, distincte et datée, rubrique par rubrique**, après
   une relecture déclarée au moment de valider ; refusée tant que la
   structure n'est pas signée.
5. **Le texte est lié à la structure qu'il rédige** : une structure re-signée
   le rend « à relire » jusqu'à un nouveau dépôt (`D-314` §5).
6. **Retrait possible à tout moment**, avec un motif. Rien ne s'efface : la
   base n'admet que l'ajout.

## Ce que l'IA ne fait jamais ici

- Voir une donnée de patient.
- Choisir une fiche pour un dossier : aucune sélection d'après le dossier
  n'existe dans ce lot (`D-314` §7).
- Valider un texte ou un libellé.
- Ajouter un nombre, une dose ou un identifiant absents de ses sources.

## Limites connues

- **Le contrôle automatique ne lit pas le sens.** Un sens déplacé, une
  population élargie ou un nombre écrit en lettres lui échappent. La
  contre-lecture les cherche, et la relecture du praticien reste la
  dernière porte (`D-195` §1).
- **La base enregistre la déclaration de relecture, pas la preuve d'un geste
  humain.** Cette garantie tient par l'application, qui n'accepte un acte que
  d'un praticien connecté.

## Références

- Décision : `D-314` (§3 validation rubrique par rubrique, §4 rédaction hors
  ligne, §5 fraîcheur, §7 hors périmètre) ; `D-251` §4 (texte hors dépôt) ;
  `D-266` §7 (DC-03). Principes : `DC-16`, `D-195` §1.
- Outil : `tools/corpus/fiches-usage/README.md` et ses consignes.
