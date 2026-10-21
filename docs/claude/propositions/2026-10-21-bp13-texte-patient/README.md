# BP-13 — le texte patient des données physiologiques et des traitements (2026-10-21)

Lot BP-13 (LOT-13, fiche F07), décision [[D-335]]. Ce document porte les
textes soumis au responsable le 2026-10-21, **avant toute table** : le
paragraphe neuf de « Vos données personnelles » (v20) et les libellés du
portail. Rien n'est publié par cette PR. Statut : validé le 2026-10-21,
puis **corrigé et revalidé** le même jour (voir « Réponses du
responsable »).

## Ce qui ne change pas

- **« L'intelligence artificielle dans Wellneuro »** : aucune ligne de ce lot
  ne part à l'IA ([[D-335]] §8). Les traitements ne lui sont pas transmis
  aujourd'hui (seule la ligne de vigilance, écrite par le code après sa
  réponse, les lit), et ne le seront pas. Aucune nouvelle version.
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
> s’ils vous ont été prescrits par un autre soignant et, si vous l’indiquez,
> le motif d’un médicament ou l’objectif d’un complément ; quand vous en
> arrêtez un, l’arrêt y est noté, avec sa date si vous la connaissez (au
> jour, au mois ou à l’année). Votre praticien peut confirmer
> ou corriger chacune de ces informations, ainsi que votre taille, votre
> poids, une grossesse ou un allaitement : rien n’est effacé, chaque
> information garde sa date et dit si elle vient de vous ou de votre
> praticien. Dans votre dossier, seul votre praticien les voit, et vous
> voyez les vôtres. Aucun outil d’intelligence artificielle ne les reçoit, et
> elles ne sont transmises à personne. Ces informations sont conservées et
> effacées avec votre dossier.

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

Le 2026-10-21, sur question à options : les parties A (paragraphe de la v20,
résumé, conséquences) et B (libellés du portail) sont **validées telles
quelles**, avec le paragraphe du dossier RGPD. La publication de la v20 et des
conditions v3 reste un geste de l'allumage de `WN_PHYSIO_TRAITEMENTS`.

**Correction du même jour.** Le paragraphe validé disait que la liste des
traitements part à l'IA « comme elle l'est déjà aujourd'hui » : c'était faux.
Le texte transmis à l'IA de la synthèse ne contient aucun traitement ; seule
la ligne de vigilance, écrite par le code après la réponse de l'IA, les lit.
Reposée sur ce fait, la question de la synthèse a été tranchée « la ligne de
vigilance seule, sans IA » ([[D-335]] §8). A1 est corrigé en conséquence, avec
deux retouches de la revue CodeRabbit de #1614 : le motif ou l'objectif quand
il est indiqué, la date d'un arrêt ; et « dans votre dossier » borne la phrase
sur qui voit ces informations. **Revalidé tel quel par le responsable le même jour.**

**Seconde retouche, même jour** (revue CodeRabbit de 607286fa, corrigée sur
accord du responsable) : la date d'un arrêt peut être inconnue ([[D-335]] §4) ;
A1 dit « l'arrêt y est noté, avec sa date si vous la connaissez (au jour, au
mois ou à l'année) », sans promettre une date.
