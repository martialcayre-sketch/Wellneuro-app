# BP-05 — « Vos données personnelles », version suivante : le contexte du prélèvement (2026-11-12)

Lot BP-05 (LOT-05, fiche F20), décision [[D-497]] §7. Ce document porte le
texte soumis au responsable **avant la PR de la décision**. Il ne se publie
pas ici : la version du registre (`web/src/lib/trust/contenus/registre.ts`)
s'écrit dans la PR du code qui écrit la table (PR 3 de [[D-497]] §8), avec
ses bancs, et part dans le même déploiement. Son numéro est celui qui suit la
dernière version publiée à ce moment-là (v22 le 2026-11-12). Statut :
**validé tel quel par le responsable le 2026-11-12**, sur question à
options, avec [[D-497]] et le paragraphe du dossier RGPD.

## A1. Le paragraphe neuf

Dans « Quelles données sont recueillies ? », juste après « Ces résultats
sont saisis par votre praticien à partir du compte rendu… » :

> Avec ces résultats, votre praticien peut noter les circonstances du
> prélèvement : si vous étiez à jeun, si vous aviez interrompu un
> complément, si un traitement pouvait modifier le résultat, si vous aviez
> un épisode inflammatoire, si vous étiez enceinte, le jour de votre cycle
> et le délai depuis la dernière prise d’un médicament ou d’un complément.
> Chacune de ces informations peut rester « inconnue ». Rien n’est effacé :
> une correction s’ajoute, avec sa date. Seul votre praticien les voit ;
> l’application ne les envoie à aucun outil d’intelligence artificielle.
> Elles sont conservées et effacées avec votre dossier.

## A2. Le résumé du changement (`changeSummary`)

> Votre praticien peut désormais noter les circonstances du prélèvement de
> vos analyses (jeûne, traitement, grossesse, jour du cycle…). Le reste ne
> change pas.

## Ce qui ne change pas

Aucun destinataire, aucun sous-traitant, aucune sortie de l’application. Le
patient n’a aucune surface : il ne saisit ni ne lit ce contexte au portail
([[D-294]] §5). Le laboratoire et l’heure du prélèvement restent ceux que
l’import lit déjà.
