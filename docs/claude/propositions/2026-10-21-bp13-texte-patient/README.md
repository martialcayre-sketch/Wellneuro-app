# BP-13 — le texte patient des données physiologiques et des traitements (2026-10-21)

Lot BP-13 (LOT-13, fiche F07), décision [[D-335]]. Ce document porte les
textes soumis au responsable le 2026-10-21, **avant toute table** : le
paragraphe neuf de « Vos données personnelles » (v20) et les libellés du
portail. Rien n'est publié par cette PR. Statut : **à valider**.

## Ce qui ne change pas

- **« L'intelligence artificielle dans Wellneuro »** : la synthèse du bilan
  part déjà « de vos réponses aux questionnaires et des éléments transmis à
  votre praticien » ; les traitements en font partie aujourd'hui. Les lignes
  structurées prennent leur place sous la même forme ; le sexe déclaré et le
  statut menstruel n'y partent pas ([[D-335]] §8). Aucune nouvelle version.
- **Grossesse, allaitement, taille, poids** : questions de la fiche de
  renseignements, inchangées au portail (arbitrage du 2026-10-21, pas de
  doublon).
- **L'automédication régulière** : cases à cocher inchangées.

## A. « Vos données personnelles » v20

### A1. Le paragraphe neuf

Dans la section « Quelles données sont recueillies ? », après le paragraphe
des documents déposés (v19) :

> Votre fiche de renseignements vous demande aussi votre sexe et, s’il y a
> lieu, où en sont vos cycles (réguliers, irréguliers, absents, ménopause) ;
> vous pouvez toujours répondre que vous ne savez pas ou préférez ne pas
> répondre. Vos médicaments et vos compléments alimentaires en cours y sont
> notés un par un : leur nom, leur dose, le moment de la prise, depuis quand,
> et s’ils vous ont été prescrits par un autre soignant. Votre praticien peut
> confirmer ou corriger chacune de ces informations, ainsi que votre taille,
> votre poids, une grossesse ou un allaitement : rien n’est effacé, chaque
> information garde sa date et dit si elle vient de vous ou de votre
> praticien. Seul votre praticien les voit, et vous voyez les vôtres. Pour
> préparer la synthèse de votre bilan, la liste de vos traitements en cours
> est transmise à l’outil d’intelligence artificielle, comme elle l’est déjà
> aujourd’hui ; votre sexe et vos cycles ne le sont jamais. Ces informations
> sont conservées et effacées avec votre dossier.

### A2. Le résumé du changement (`changeSummary`)

> Votre fiche de renseignements vous demande désormais votre sexe et, s’il y
> a lieu, où en sont vos cycles ; vos médicaments et compléments s’y notent
> un par un, et votre praticien peut les confirmer ou les corriger. Cette
> version dit ce qui en est gardé et qui le voit. Le reste ne change pas.

### A3. Conséquences de la publication

- Niveau `information_substantielle`, accusé exigé (motif de la v16 à la
  v19 : seule la version courante en réclame un).
- Les conditions d'utilisation étant servies (`WN_PORTAIL_CONDITIONS`), leur
  partie 3 change : la v20 entraîne des **conditions v3** et leur e-mail aux
  patients suivis ([[D-292]] §5), comme la v19 a entraîné la v2.
- **Publiée à l'allumage** de `WN_PHYSIO_TRAITEMENTS`, pas avant : elle
  décrit une saisie qui n'existe pas drapeau éteint (patron d'ACT-4).

## B. Les libellés du portail

Section « Traitements et compléments » de la fiche de renseignements, et une
question neuve dans « Repères corporels ».

| Élément | Libellé proposé | Code |
|---|---|---|
| Question | « Quel est votre sexe ? » | `sexe_declare` |
| Réponses | « Féminin » · « Masculin » · « Autre » · « Je préfère ne pas répondre » | `feminin`, `masculin`, `autre`, `inconnu` |
| Question (si féminin ou autre) | « Où en sont vos cycles ? » | `statut_menstruel` |
| Réponses | « Réguliers » · « Irréguliers » · « Pas de cycles en ce moment » · « Ménopause » · « Je ne sais pas » | `cycles_reguliers`, `cycles_irreguliers`, `absence_de_cycles`, `menopause`, `inconnu` |
| Bloc | « Médicaments en cours » · bouton « Ajouter un médicament » | `medicament` |
| Bloc | « Compléments alimentaires en cours » · bouton « Ajouter un complément » | `complement` |
| Champs d'une ligne | « Nom » · « Dose » · « Moment de prise » · « Depuis quand » (jour, mois ou année, ou « Je ne sais pas ») · « Motif » (médicament) ou « Objectif » (complément) · « Prescrit par un autre soignant ? » (« Oui » · « Non » · « Je ne sais pas ») | — |
| Arrêt | bouton « Je ne le prends plus » · « Depuis quand ? » (même forme) | remplacement portant une fin |
| Erreur | bouton « Supprimer cette ligne » (sur une ligne que vous avez ajoutée) | retrait |
| Mention de ligne | « Ajouté par vous le … » · « Confirmé par votre praticien le … » | source |

« Pas de cycles en ce moment » plutôt que « Absence de cycles » : le
patient ne pose pas de mot médical sur lui-même. Aucun libellé ne nomme une
cause (grossesse, traitement, maladie).

## Réponses du responsable

À compléter.
