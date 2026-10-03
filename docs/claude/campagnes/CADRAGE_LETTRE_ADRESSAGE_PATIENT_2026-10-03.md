# Cadrage — La lettre d'adressage remise au patient par son portail (2026-10-03)

> Campagne née de la mise en service de la levée par adressage ([[D-257]],
> drapeau `WN_LEVEE_ADRESSAGE` posé le 2026-10-03). Décision : [[D-262]].

## 1. Le constat

La lettre d'adressage ([[D-218]]) est générée et consignée au dossier
(`correspondances_medecin`, sens `sortant`, ancrage `safety-signals-…`), mais
**l'application ne la remet à personne** : le praticien l'imprime et la remet
en main propre, ou la transcrit. Depuis [[D-257]], le protocole d'un dossier
adressé s'ouvre sur l'action signée « Consulter votre médecin », dont le plan
idéal dit « lui remettre le courrier que je vous ai préparé » : le patient
reçoit l'action par son portail, pas le courrier qu'elle nomme.

Ce qui existe déjà (relevé du 2026-10-03) :

- **Onglet Correspondance praticien** : la lettre consignée y figure déjà
  (`CorrespondanceMedecinPanel`, libellé « Courrier préparé », texte intégral) —
  la demande (c) est satisfaite, aucune surface à ajouter.
- **Portail patient** : pas d'« inbox » nommée ; le fil du jour
  (`lib/portail/lecturesAttendues.ts`, espèces `bilan | synthese |
  fiche_assiette`) en tient lieu. Aucune surface patient ne lit
  `correspondances_medecin`.
- **Patron de remise à copier** : les fiches d'assiette ([[D-251]]) — table de
  remises en ajout seul liée à l'approbation, remise DANS la transaction de
  « Valider pour diffusion », écran `portail/[token]/fiches/…`, annonce par
  l'e-mail neutre `document_remis` réservée dans la transaction et envoyée après
  le commit.

## 2. Arbitrages rendus le 2026-10-03 (responsable, en session)

| # | Question | Arbitrage |
|---|---|---|
| B1 | Moment de la mise à disposition | **À la diffusion du protocole** : dans la transaction de « Valider pour diffusion », comme les fiches d'assiette. Le patient reçoit ensemble l'action « Consulter votre médecin » et le courrier qu'elle nomme. |
| B2 | Texte lu par le patient | **La lettre telle quelle**, sous une phrase d'accompagnement signée côté patient. C'est le document à remettre au médecin : en produire une version patient distincte obligerait encore à imprimer l'original. |
| B3 | Annonce | **E-mail neutre existant** (`document_remis`, « Un document de votre praticien vous attend »), sans nom de document ni contenu de santé, mutualisé avec l'annonce de la diffusion. |
| B4 | Onglet Correspondance | **Déjà satisfait** ; seul un libellé plus parlant (« Lettre d'adressage ») est envisageable, hors périmètre clinique. |

## 3. Ce que cela veut dire dans le code

**3.1 Quelle lettre est remise.** La lettre ACTIVE la plus récente du dossier :
une couverture `adressage` non révoquée, sur la consultation porteuse courante
(`lireCouverturesAdressage`), dont la lettre est relue. Plusieurs lettres
actives (le cas existe déjà en production : trois consignations successives sur
un même dossier) ⇒ une seule est remise, la plus récente. Aucune lettre active ⇒
rien n'est remis, et la diffusion n'en est pas bloquée (le moteur exige déjà
l'orientation en tête quand un constat est adressé).

**3.2 Ce qui est servi est figé.** Le texte remis est un **instantané** pris à la
remise (texte consigné + empreinte), jamais une régénération au moment de la
lecture : une révision du gabarit ne doit pas changer ce que le patient a reçu.
Le HTML n'étant pas consigné aujourd'hui (`adressage/courrier/route.ts`), le
rendu imprimable se recompose depuis le texte figé, par le même rendu
`medecin` que la lettre imprimée.

**3.3 Une table de remises, donc une migration.** Table dédiée en ajout seul
(remise : dossier, lettre, approbation de diffusion, empreinte du texte, date),
RLS en refus total, contrat SQL négatif, effacement nommé du dossier ([[D-087]] :
migration seule dans sa PR, `release-db` approuvée, constat par conteneur, puis
seulement le code consommateur).

**3.4 Le registre côté patient.** La lettre nomme des « signaux d'alerte » et
liste les signaux déclarés : la garde de registre anxiogène ([[D-189]] §4) la
refuserait. Elle est **exemptée par décision** (le document est adressé au
médecin, et le patient le lit déjà en remise papier), et inscrite à la carte des
chemins sortants de `lib/documents/vocabulaire.ts` comme telle. La **phrase
d'accompagnement**, elle, passe la garde, et c'est la seule prose patient de la
surface.

**3.5 Révocation après remise.** Révoquer une lettre déjà remise ne l'efface pas
du portail (ajout seul) mais la marque « retirée » à la lecture, sans motif
servi au patient — même mécanique que le retrait d'une fiche d'assiette.

**3.6 Drapeau.** Un drapeau neuf, éteint à la livraison, garde l'émission, la
lecture et l'annonce (le code se déploie avant la migration). Pose : migration
constatée, phrase signée, constat sur un dossier de test.

## 4. Phrase d'accompagnement — signée le 2026-10-03

> **Courrier pour votre médecin**
>
> Voici le courrier que je vous ai préparé pour votre médecin traitant.
> Remettez-le lui lors de votre rendez-vous : vous pouvez l'imprimer ou le
> montrer depuis ce portail.

Ni « alerte », ni signal nommé, ni délai chiffré (même contrainte que [[D-257]]
§9). **Signée par le responsable le 2026-10-03, en session** ; le LOT-02 la
recopie au caractère près et la passe au banc `termeAnxiogene`.

## 5. Découpage proposé

| Lot | Contenu | Porte |
|---|---|---|
| LOT-00 | Ce cadrage ; [[D-262]] (précise [[D-218]] : la lettre reste remise au médecin par le patient ou le praticien, et devient aussi mise à disposition du patient lui-même) ; `DOSSIER_RGPD` déclaré avant activation | arbitrages B1-B4 |
| LOT-01 | Migration seule : table des remises de lettre, contrat SQL, effacement nommé | `release-db` approuvée, constat par conteneur |
| LOT-02 | Émission dans la transaction de diffusion + réservation de l'annonce, derrière le drapeau éteint | LOT-01 constaté ; phrase signée |
| LOT-03 | Portail : espèce de lecture `lettre_adressage`, route `api/portail`, écran (phrase + lettre + impression), retrait après révocation | LOT-02 |

Chaque lot : `wn-reviewer` avant PR ; T2 pour l'écran (E2E par le CI).

## 6. Hors périmètre

Envoi au médecin (la lettre reste remise par le patient ou par le praticien,
[[D-218]] §8) ; pièce jointe par e-mail ; tout contenu de santé dans un e-mail ;
lettres consignées avant la table de remises reprises automatiquement (elles
partent à la prochaine diffusion si elles sont actives).
