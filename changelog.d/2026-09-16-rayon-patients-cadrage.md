### Le dossier du patient n'est lisible nulle part, et c'est mesuré avant d'être réparé (2026-09-16)

La campagne « Le rayon Patients » s'ouvre au créneau primaire sur **trois
manques constatés dans le code**, pas déduits d'une intention :

**LE DOSSIER NE SE MODIFIE PAS.** `PATCH /api/praticien/patients` n'accepte que
`telephone` et `actif`. Nom, prénom, date de naissance et e-mail sont saisis à
la création et ne se corrigent plus jamais — une faute de frappe sur un nom est
définitive.

**ADRESSE, NIR ET MÉDECIN TRAITANT N'EXISTENT NULLE PART.** Le seul médecin du
schéma est `CorrespondanceMedecin.medecinLibelle` : un texte libre **par
lettre**, jamais un médecin attaché au dossier.

**LA FICHE SIGNALÉTIQUE ET L'ANAMNÈSE SONT INVISIBLES AU PRATICIEN.** Le patient
les remplit à l'ouverture de son espace ; elles sont écrites en JSON sur
`consultations`. Recherche exhaustive dans `web/src` : **aucune surface
praticien ne les lit**. `lib/synthese/generation.ts` seul y touche, pour
fabriquer un texte. C'est le manque le plus net, et il commande l'ordre des
lots — sa réparation ne dépend d'aucune colonne neuve et part avant la porte
`release-db`.

**TROIS PIÈGES ÉTABLIS AU CADRAGE, ET C'EST LÀ QUE LE CADRAGE PAIE.**
(1) L'e-mail patient est recopié dans **cinq tables**, et
`/api/praticien/reponses` interroge **par e-mail** : le rendre modifiable sans
réécrire ces copies rendrait muettes toutes les réponses déjà reçues — la trace
masquée de `booklet_envois`, elle, ne se réécrit pas, elle atteste un envoi
réellement parti. (2) La migration ouvre une **fenêtre d'indisponibilité** :
Prisma sélectionne explicitement toutes les colonnes scalaires d'un modèle, donc
entre le merge et l'approbation `release-db`, toute requête patient échoue.
(3) Les libellés de `anamnese.ts` sont appariés **verbatim** par
`orientationRulesV1.ts` — la lecture praticien les lit, elle n'en change pas un
caractère.

**L'ENTRÉE EN FILE D'ATTENTE EST POSÉE À L'OUVERTURE**, et non à la clôture :
c'est l'écart que la réconciliation du 2026-08-27 a reproché à 6.0-B *objectif*,
puis une seconde fois à *protocole assisté*. Deux fois suffisent.

Six arbitrages rendus le même jour, au `CAMPAGNE.md`. Ce qui reste au
responsable est écrit : la qualification du NIR au titre de l'article 9 — le
dossier RGPD refuse explicitement de la poser dans le code — et le créneau de
merge de la migration.
