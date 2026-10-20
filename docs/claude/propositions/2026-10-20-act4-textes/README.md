# ACT-4 — les textes du dépôt de documents (2026-10-20)

Place 4 de la file C (H77), dépôt de documents par le patient ([[D-330]]).
Ce document consigne les textes soumis au responsable le 2026-10-20, et ses
réponses. Les textes de la partie A sont **validés** ; ceux de la partie B
restent **à valider** avant la PR qui publiera « Vos données personnelles » v19
et les conditions v2.

Ce qui était déjà validé n'est pas repris ici :

- le texte de collecte de G-11, servi tel quel à côté du dépôt
  (`docs/claude/propositions/2026-10-14-g11-textes-patient/README.md`) ;
- l'encart d'urgence et sa phrase du dépôt ([[D-293]] §3) ;
- les refus du fichier lui-même (taille, format, image), déjà en service pour
  le compte rendu biologique.

## Arbitrages du responsable (2026-10-20)

Quatre questions à options, les quatre réponses sur la proposition :

1. **Écran de dépôt** : libellés validés tels quels, sauf le refus du plafond
   des documents non consultés, rendu neutre. L'ancien texte (« Trois documents
   attendent déjà que votre praticien les ouvre… ») apprenait au patient que le
   praticien n'avait pas ouvert trois documents, alors que l'écran ne montre
   jamais la consultation.
2. **« Mes échanges »** : le bloc « Ce que vous trouvez ici » nomme les
   documents déposés et finit par « qui le concerne ». Il n'est servi que dépôt
   ouvert. La ligne « Transmis · Document déposé » est validée.
3. **« Vos données personnelles » v19** : le paragraphe de la collecte et la
   phrase sur la lecture datée ([[D-297]]), dans une seule version, pour un seul
   e-mail aux patients suivis. La v19 et les conditions v2 se publient à
   l'ouverture d'ACT-4, pas avant : elles décrivent un dépôt qui n'est pas
   encore ouvert.
4. **Constat d'ACT-3** : sans code. Le responsable ouvre « Mes échanges » sur
   un dossier de test ; l'assistant compare ce qu'affiche l'écran à une lecture
   en conteneur de ce dossier. Aucune trace n'est ajoutée à la route.

## A. Textes validés

### A1. Écran « Déposer un document »

| Où | Texte |
|---|---|
| Titre de la page, lien de « Autres espaces » | Déposer un document |
| Lien de retour | ← Mon parcours |
| Légende du choix | Ce que contient le document |
| Choix | Courrier · Compte rendu de consultation · Liste de traitements ou de compléments · Autre |
| Champ du fichier | Le document : un PDF de 10 Mo au plus, ou une photo (JPEG, PNG ou WebP) |
| Bouton (pendant l'envoi) | Déposer le document (Envoi…) |
| Succès | Votre document est déposé dans votre dossier. |
| Titre de la liste | Mes documents déposés |
| Liste vide | Vous n'avez encore déposé aucun document. |
| Ligne de la liste | Déposé le 20 octobre 2026 — Courrier · retiré le 22 octobre 2026 |

Refus :

- Indiquez ce que contient le document.
- Joignez le document : PDF, ou photo JPEG, PNG ou WebP.
- Ce document est déjà déposé dans votre dossier.
- Vous avez déposé dix documents en 24 heures. Réessayez plus tard.
- **Vous ne pouvez pas déposer d'autre document pour le moment. Réessayez plus
  tard.** (plafond des documents non consultés, rendu neutre)
- Votre suivi est clôturé : vous ne pouvez plus déposer de document.

### A2. « Mes échanges »

Bloc « Ce que vous trouvez ici », dépôt ouvert :

> La liste datée de ce que votre praticien vous a remis — votre bilan et sa
> note, vos fiches, le courrier pour votre médecin, votre protocole — et de ce
> que vous lui avez transmis — vos questionnaires, vos comptes rendus
> d'analyses, les documents que vous avez déposés, vos signalements, avec leur
> statut. Chaque ligne ouvre la page de votre espace qui le concerne.

Dépôt fermé, le bloc validé le 2026-10-14 reste servi tel quel.

Ligne du journal : **Transmis** · Document déposé (datée, sans nom de fichier
ni catégorie).

### A3. « Vos données personnelles » v19

Section « Quelles données sont recueillies ? », premier paragraphe :

> …les comptes rendus d'analyses **et les autres documents** que vous déposez
> dans votre espace, vos signalements et vos choix.

Paragraphe neuf, après ceux du compte rendu biologique :

> Vous pouvez aussi déposer dans votre espace d'autres documents utiles à votre
> accompagnement : un courrier, le compte rendu d'une consultation, la liste de
> vos traitements ou de vos compléments. Chaque document est gardé dans votre
> dossier avec la date de son dépôt et le type que vous lui avez donné, que
> votre praticien peut corriger. Le nom de votre fichier n'est jamais gardé ;
> une photo est enregistrée sans les informations que votre appareil y ajoute,
> comme le lieu ou la date de la prise de vue ; un PDF est gardé tel que vous
> l'avez envoyé. Nous conservons aussi une empreinte du document, qui ne permet
> pas de le reconstituer, pour refuser un second dépôt du même fichier. Seul
> votre praticien peut l'ouvrir, et la date de sa première ouverture est notée.
> Aucun outil d'intelligence artificielle ne le lit et il n'est transmis à
> personne. Il est conservé avec votre dossier. S'il est retiré — déposé par
> erreur, ou à votre demande —, son contenu est effacé : restent la date du
> dépôt, celle du retrait, son motif, le type du document et son empreinte. Des
> copies peuvent en subsister jusqu'à 12 mois dans les sauvegardes de notre
> hébergeur, qui s'effacent ensuite d'elles-mêmes.

Section « Signaler un incident de confidentialité », à la suite de « …jamais
le contenu de ce que vous y faites. » :

> Seule exception : le jour où vous ouvrez pour la première fois un document
> que votre praticien vous a remis — bilan, fiche, courrier, protocole — est
> noté, sans l'heure, et votre praticien le voit.

## B. Textes à valider avant la PR de publication

La v19 entraîne les conditions v2 ([[D-292]] §5 : après ACT-1, toute
modification d'une partie est une nouvelle version des conditions). Les
conditions v2 demandent un accusé ; les patients suivis le posent par le lien
d'un e-mail envoyé en une fois par le responsable ([[D-292]] §3), et le dépôt
d'un compte rendu biologique l'exige au filet ([[D-292]] §4).

### B1. Correction de la phrase sur la lecture datée (A3)

Vérification faite après la validation : la lecture se date aussi sur la page
« Ce que j'ai compris de vous » (espèce `synthese`, [[D-297]]). L'énumération
« bilan, fiche, courrier, protocole » est donc incomplète. Proposé : retirer
l'énumération.

> Seule exception : le jour où vous ouvrez pour la première fois un document
> que votre praticien vous a remis est noté, sans l'heure, et votre praticien
> le voit.

### B2. Résumé de la v19 (historique des versions)

> Vous pouvez désormais déposer dans votre espace des documents utiles à votre
> accompagnement : cette version dit ce qui en est gardé, qui peut les ouvrir
> et comment ils sont retirés. Elle précise aussi que le jour où vous ouvrez
> pour la première fois un document remis par votre praticien est noté. Le
> reste ne change pas.

### B3. Résumé des conditions v2

> La partie « Vos données personnelles » décrit désormais le dépôt de documents
> dans votre espace, et précise que le jour de votre première ouverture d'un
> document remis par votre praticien est noté. Le reste ne change pas.

### B4. E-mail aux patients suivis (gabarit `conditions_utilisation`, version 2)

Sujet : **Wellneuro — les conditions d'utilisation de votre espace évoluent**

> Bonjour,
>
> Les conditions d'utilisation de votre espace Wellneuro évoluent : vous pouvez
> désormais y déposer des documents pour votre praticien, et la partie « Vos
> données personnelles » dit ce qui en est gardé et qui peut les ouvrir. Elle
> précise aussi que le jour où vous ouvrez pour la première fois un document
> remis par votre praticien est noté.
>
> Rien d'autre ne change dans votre accompagnement.
>
> Pour lire cette nouvelle version et la valider, ouvrez ce lien : {{lien}}
>
> Ce lien est valable 24 heures et ne s'ouvre qu'une fois. Passé ce délai,
> connectez-vous à votre espace comme d'habitude : le document vous attend dans
> « Informations, confidentialité et droits ».
>
> Le lien ouvre le texte. Rien n'est validé tant que vous n'avez pas cliqué sur
> « J'en ai pris connaissance ».
>
> Pour toute question, répondez simplement à ce message.
>
> Wellneuro

Les quatre derniers paragraphes sont ceux de la version 1, au caractère près.
Ni nom, ni donnée de santé.

## Ce qui n'est pas touché

- Le même refus « Trois documents attendent déjà… » existe pour le compte
  rendu biologique (`lib/biology-library/import/transmissionStatut.ts`), en
  service et validé avec lui. L'arbitrage 1 ne vise que le dépôt de documents.
- Aucune fenêtre, aucun seuil, aucune règle clinique ; ni migration ni schéma.
