# BP-13 — « Vos données personnelles » v22, conditions v5 et leur e-mail (2026-10-28)

Lot BP-13 (LOT-13, fiche F07), décision [[D-391]] §6, PR 3 de §8. Ce document
porte les textes soumis au responsable **avant le merge** : la v22, le résumé
des conditions v5, la phrase de tête de l'e-mail `conditions_utilisation@5`.
Les bancs de `registre.test.ts` et `registreGabarits.test.ts` relisent les
citations ci-dessous mot pour mot. Statut : **validé tel quel le
2026-10-28** (voir « Réponse du responsable »).

## Ce qui change par rapport au texte validé le 2026-10-21

Le paragraphe de [[D-335]] (proposition
`docs/claude/propositions/2026-10-21-bp13-texte-patient/README.md`, A1,
validé sous le numéro v20, depuis pris par [[D-318]] ; la v21 par [[D-364]])
est repris tel quel, sauf une phrase. « Aucun outil d'intelligence
artificielle ne les reçoit, et elles ne sont transmises à personne » est
fausse au regard de [[D-391]] §2 et §3 et de la v21 :

- l'export du dossier ([[D-252]]) porte les lignes dans ses deux versions,
  dont celle que le praticien peut soumettre à ChatGPT (livré #1768) ; le
  masquage n'y retire que les identifiants dans les textes libres ;
- le document destiné au médecin reprend la ligne de vigilance de la
  synthèse, qui nomme les traitements en vigueur (nom et dose) — pas les
  données physiologiques ([[D-391]] §3).

Elle est remplacée par deux phrases : l'application ne les envoie à aucun
outil d'IA ; elles figurent dans la version du dossier que le praticien peut
soumettre à ChatGPT, et les traitements peuvent figurer dans un document
destiné à un médecin.

## A. « Vos données personnelles » v22

### A1. Le paragraphe neuf

Dans « Quelles données sont recueillies ? », juste après le paragraphe des
documents déposés (v19) :

> Votre fiche de renseignements vous demande aussi votre sexe et, s’il y a
> lieu, où en sont vos cycles (réguliers, irréguliers, absents, ménopause) ;
> vous pouvez toujours répondre que vous ne savez pas ou préférez ne pas
> répondre. Vos médicaments et vos compléments alimentaires en cours y sont
> notés un par un : leur nom, leur dose, le moment de la prise, depuis quand,
> s’ils vous ont été prescrits par un autre soignant et, si vous l’indiquez,
> le motif d’un médicament ou l’objectif d’un complément ; quand vous en
> arrêtez un, l’arrêt y est noté, avec sa date si vous la connaissez (au
> jour, au mois ou à l’année). Votre praticien peut confirmer ou corriger
> chacune de ces informations, ainsi que votre taille, votre poids, une
> grossesse ou un allaitement : rien n’est effacé, chaque information garde
> sa date et dit si elle vient de vous ou de votre praticien. Dans votre
> dossier, seul votre praticien les voit, et vous voyez les vôtres.
> L’application ne les envoie à aucun outil d’intelligence artificielle.
> Elles figurent toutefois dans la version de votre dossier que votre
> praticien peut soumettre à ChatGPT (voir « Qui peut accéder à vos
> données ? »), et vos médicaments et compléments en cours peuvent figurer
> dans un document que votre praticien destine à un médecin. Ces
> informations sont conservées et effacées avec votre dossier.

### A2. Le résumé du changement (`changeSummary`)

Celui de la proposition du 2026-10-21 (A2), inchangé :

> Votre fiche de renseignements vous demande désormais votre sexe et, s’il y
> a lieu, où en sont vos cycles ; vos médicaments et compléments s’y notent
> un par un, et votre praticien peut les confirmer ou les corriger. Cette
> version dit ce qui en est gardé et qui le voit. Le reste ne change pas.

### A3. Ce qui ne change pas

- Un paragraphe ajouté, rien d'autre : la conservation reste « en cours de
  formalisation » ; les durées de [[D-378]] passent en v23.
- Niveau `information_substantielle`, accusé exigé (motif de [[D-299]] §3).
- « L'intelligence artificielle dans Wellneuro » (`usage_ia` v8) : aucune
  nouvelle version ; le texte transmis à l'IA ne change pas.

## B. Les conditions d'utilisation v5 ([[D-292]] §5)

La partie 3 reprend la v22 ; les autres parties sont celles de la v4.

### B1. Le résumé des conditions v5

> La partie « Vos données personnelles » dit que votre fiche de
> renseignements vous demande désormais votre sexe et, s’il y a lieu, où en
> sont vos cycles, et que vos médicaments et compléments s’y notent un par
> un. Le reste ne change pas.

### B2. L'e-mail `conditions_utilisation@5`, phrase de tête

Le reste du corps est celui de la @4 au caractère près. L'e-mail @4 est
parti le 2026-10-27 : la @5 ne remplace rien, elle annonce la v5.

> Les conditions d’utilisation de votre espace Wellneuro évoluent : la
> partie « Vos données personnelles » dit que votre fiche de renseignements
> vous demande désormais votre sexe et, s’il y a lieu, où en sont vos
> cycles, et que vos médicaments et compléments s’y notent un par un.

## C. La déclaration du dossier RGPD

`docs/DOSSIER_RGPD.md`, section [[D-335]] et ligne du tableau des
catégories : « aucun flux nouveau » et « lu par eux seuls » sont corrigés.
Les lignes partent dans l'export du dossier, dont la version pseudonymisée
que le praticien peut soumettre à ChatGPT (destinataire déclaré par
[[D-364]] §3, rubrique 6), et la ligne de vigilance qui nomme les
traitements peut entrer dans un document que le praticien adresse à un
médecin. L'information du patient passe de la v20 à la v22. La rubrique 6
dit que l'export porte ces lignes.

## Publication

La v22 et les conditions v5 sont publiées **le jour de l'allumage** de
`WN_PHYSIO_TRAITEMENTS`, pas avant ([[D-391]] §6, [[D-335]] §9) : la PR se
merge ce jour-là, et `publieLe` porte cette date.

## Réponse du responsable

Le 2026-10-28, sur question à options : la v22 (A1, A2), le résumé des
conditions v5 (B1), la phrase de tête de l'e-mail @5 (B2) et la déclaration
du dossier RGPD (C) sont **validés tels quels**. Allumage fixé au
**2026-10-29** : la PR se merge ce jour-là, `publieLe` porte cette date.

**Retouche de la déclaration RGPD, même jour** (revue `wn-reviewer`) : l'export
porte aussi les traitements arrêtés ; le document destiné au médecin est
imprimé par le praticien, téléchargé par le patient dans son portail et remis
par lui ([[D-307]]) ; le masquage ne retire que les identifiants connus.
**Revalidée corrigée par le responsable.** Deux remarques de la revue sur le
texte patient sont **gardées telles quelles**, choix assumé : les résumés et
l'e-mail ne disent que la saisie (le paragraphe complet dit les sorties) ;
« vous voyez les vôtres » vise ce que le patient déclare.
