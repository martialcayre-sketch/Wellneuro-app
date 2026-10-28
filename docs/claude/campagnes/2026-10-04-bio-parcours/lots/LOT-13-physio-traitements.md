---
id: "LOT-13"
titre: "BP-13 — Données physiologiques, traitements et compléments en cours"
statut: "terminé (2026-10-21) — D-335 acceptée (#1614) ; PR 1, migration seule, mergée (#1622), release-db constatée par conteneur ; PR 2, code consommateur sous `WN_PHYSIO_TRAITEMENTS` éteint, dans la PR de clôture"
dépend_de: "LOT-00, LOT-11"
---

# LOT-13 (BP-13) — Données physiologiques, traitements et compléments en cours

> **Fiche proposée le 2026-10-21.** Les arbitrages du responsable sont
> rendus (2026-10-20, puis deux le 2026-10-21) et consignés par D-335, qui
> amende D-331 §2 et §5. Dépôt public : cette fiche ne porte aucune
> identité, aucun texte clinique, aucun nom de médicament.

## But

Donner au parcours, en lignes datées et confirmables, ce que le cadrage v3
exige pour juxtaposer la population d'une fiche d'usage aux données du
patient : sexe et statut physiologique **déclarés**, mesures datées, et
traitements et compléments en cours **structurés**. BP-27 et BP-19 les
liront ; BP-11 peut désormais citer un traitement comme pièce de constat.

## Résultat observable

Après le lot, drapeau allumé : au portail, le patient déclare son sexe, son
statut menstruel s'il y a lieu, et ses traitements ligne par ligne ; au
cockpit, le praticien du dossier confirme ou corrige chaque ligne et pose
grossesse, allaitement, poids et taille datés ; chaque ligne dit qui l'a
posée ; « inconnu » est écrit ; l'historique reste lisible. Un écart avec
l'anamnèse s'affiche en discordance. La ligne de vigilance de la synthèse du
premier bilan, écrite par le code, lit les traitements en vigueur comme elle
lit aujourd'hui ceux de l'anamnèse ; rien ne part à l'IA. Drapeau éteint,
rien ne change.

## Socle établi (ne se rediscute pas)

- **Une migration, deux PR** (D-266 §11), précédées de la PR de décision et
  de déclaration RGPD (patron de BP-11 : #1589, #1600, #1603).
- **Release-db au rang 4**, après BP-11 (constatée le 2026-10-20) ; une à la
  fois (D-248).
- **Déclaré, jamais déduit** ; « inconnu » explicite, mineur hors périmètre
  (cadrage v3, lignes « données physiologiques » et « traitements »).
- **Pas un référentiel médicamenteux normalisé** ; aucun médicament
  prescrit, ajusté ou arrêté (CAMPAGNE, hors périmètre).
- **Ajout seul, remplacement de la tête + retrait** (patron D-331 §2).
- **Registre RGPD et texte patient avant la table** ; drapeau né avec le
  code (D-081).

## Ce que le code fait aujourd'hui (lu le 2026-10-21)

- **Sexe et statut menstruel** : recueillis nulle part (`schema.prisma`,
  `anamnese.ts`). « Ménopause / périménopause » n'existe que comme facteur
  déclenchant de l'histoire des troubles.
- **Grossesse, allaitement** : réponses `etat_grossesse`,
  `etat_allaitement` de la section « État actuel » de l'anamnèse
  (`anamnese.ts:251-252`), lues par `lireEtatPopulation`
  (`etatPopulation.ts:97`) pour la garde de population (D-101), elle-même lue
  par `orientationService.ts:539`, `indicationsAssiettesService.ts:384` et
  `runtimeFromPrisma.ts:162`.
- **Taille, poids** : texte libre des « Repères corporels »
  (`anamnese.ts:62-64`), repris par `contexteClinique.ts:144`.
- **Traitements** : groupes répétables `medicaments` et `complements`
  (`anamnese.ts:316-340`, texte libre : nom, dose, moment, depuis,
  motif/objectif), plus `automedication` en classes fermées. Lus par la
  seule `extraireVigilanceDeterministe` (nom et dose ; ligne de vigilance
  écrite par le code, `contexteClinique.ts:188-213`), ajoutée à la synthèse
  après la réponse de l'IA (`synthese/generation.ts:1043`, `:719`) ;
  `buildContexteClinique`, le texte transmis à l'IA, ne les lit pas. Aucune
  date, aucun auteur, réécrits à chaque validation de l'anamnèse (JSON sur
  `Patient` et sur la consultation).
- **Pièces de constat** : `pieces_constats_praticien` porte deux clés
  (`id_resultat`, `id_questionnaire_reponse`) et un CHECK « une pièce
  exactement » (migration `20261020100000_constats_praticien_v1`).
- **Garde d'âge du portail** : `gardeAge.ts` (`accepteSaisieSante`,
  D-284 §3-4), appliquée aux questionnaires et à la biologie.
- **Effacement** (`patient/effacement.ts`) : pièces, puis constats, avant les
  réponses et les résultats ; le banc de complétude compte tout modèle à
  `id_patient`.

## Arbitrages (rendus par le responsable)

Le 2026-10-20, sur questions à options :

1. **Saisie à deux mains** : le patient au portail, le praticien au cockpit
   (confirme ou corrige) ; chaque ligne dit « déclaré par le patient » ou
   « confirmé par le praticien ». Aucune conversion automatique du texte
   libre existant.
2. **Portail** : les groupes « Médicaments en cours » et « Compléments en
   cours » de l'anamnèse sont **remplacés** par les lignes structurées ; les
   anciennes anamnèses restent lisibles telles quelles.
3. **Pas de classe de traitement** dans ce lot (liste sourcée plus tard,
   avec BP-18a et BP-27).
4. **Critères** : sexe ou statut déclaré, statut menstruel ou ménopause,
   grossesse, allaitement, « inconnu » ; **poids et taille** en mesures
   datées (contre la recommandation) ; **pas d'IMC**.
5. La migration ajoute la clé « traitement » aux pièces de constat
   (D-331 §2) ; le contexte de prélèvement vient avec BP-05.
9. **Correction** : ajout seul, remplacement de la tête + retrait (patron
   D-331), commun à BP-13 et BP-15.

Listes validées le 2026-10-20 (2e série) : sexe déclaré {`feminin`,
`masculin`, `autre`, `inconnu`} ; statut menstruel, posé si féminin ou
autre {`cycles_reguliers`, `cycles_irreguliers`, `absence_de_cycles`,
`menopause`, `inconnu`} ; bornes techniques : poids 1–500 kg (au dixième),
taille 30–260 cm (à l'unité), sans aucun sens clinique.

Le 2026-10-21, deux points que les arbitrages ne couvraient pas, posés en
scénario :

- **Doublon avec l'anamnèse.** Grossesse, allaitement, taille et poids
  existent déjà dans l'anamnèse, et la garde D-101 lit grossesse et
  allaitement.
  - **A.** Pas de doublon, garde intacte : ces quatre questions restent dans
    l'anamnèse au portail ; le praticien les confirme ou corrige en ligne au
    cockpit ; l'écart s'affiche en discordance ; faire lire les lignes à la
    garde est une décision à part, condition de l'allumage.
  - **B.** Les lignes remplacent ces questions et la garde les lit
    (chemin de sécurité modifié dans ce lot).
  - **C.** Doublon assumé : le patient répond deux fois.
  - **Rendu : A.**
- **La synthèse du premier bilan.** Ses traitements viennent de l'anamnèse ;
  remplacés au portail, la ligne de vigilance déterministe disparaîtrait.
  Posée d'abord sur un fait faux (« l'IA reçoit déjà les traitements ») et
  tranchée « vigilance et IA » ; le fait vérifié (seule la ligne de
  vigilance les lit, l'IA jamais), la question a été reposée le même jour :
  - **A.** La ligne de vigilance seule lit les lignes en vigueur (nom,
    dose) ; rien ne part à l'IA.
  - **B.** Vigilance et IA : un flux nouveau (registre de l'IA, texte
    « L'intelligence artificielle dans Wellneuro », banc des sites IA).
  - **Rendu : A.** Le premier rendu est annulé.

**Précisions de l’assistant, retenues telles quelles par le responsable le 2026-10-21** (D-335) : qui pose
quoi (le patient pose sexe, statut menstruel et traitements ; le praticien
tout) ; le patient remplace toute tête de son dossier mais ne retire que ce
qu'il a déclaré (§5) ; les dates de traitement au jour, au mois ou à
l'année, ou `inconnu`, et l'arrêt comme remplacement portant une fin (§4) ;
la garde d'âge du portail appliquée, le dossier mineur refusé aussi au
cockpit (§6) ; une ligne de traitement citée puis remplacée ou retirée rend
le constat « à relire » (§7).

## Périmètre

- **PR 0 (cette PR)** : D-335, fiche, fragment, paragraphe du dossier RGPD,
  proposition du texte patient (« Vos données personnelles » v20). Aucun
  code.
- **PR 1 (migration seule)** : `donnees_physiologiques` et
  `traitements_en_cours` (CHECK de forme par critère et par acte, bornes
  techniques, accord date-précision, source et auteur ; triggers : ajout
  seul, praticien du dossier pour une ligne du praticien, tête unique par
  fil sous verrou du dossier, retrait du patient limité à ses lignes,
  suppression réservée à l'effacement du dossier ; RLS sans politique) ;
  `pieces_constats_praticien.id_traitement` (FK `RESTRICT`, CHECK « une
  pièce exactement » sur trois clés, trigger : même dossier, tête, pas un
  retrait) ; contrat SQL négatif propre et banc au CI ; effacement nommé et
  son banc. Livrée : migration
  `20261021100000_donnees_physiologiques_traitements_v1`, contrat
  `donnees_physiologiques_traitements_v1_negatif.sql` (quatorze promesses),
  banc `banc-physio-traitements-deux-sessions.test.mjs` (huit courses, dont
  deux remplacements concurrents d'un même traitement) ; la liste blanche
  des pièces du contrat de BP-11 reçoit `id_traitement`.
- **PR 2 (code)** : routes du portail et du cockpit ; formulaire du portail
  (groupes remplacés, lecture des anciennes anamnèses intacte) ; panneau du
  cockpit (lignes, source, « déclaré à l'anamnèse du … », discordance) ;
  `extraireVigilanceDeterministe` (lignes en vigueur, sources nommées ; le
  texte transmis à l'IA inchangé) ; « à relire » de la
  pièce de traitement (`bio-parcours/constats/`) ; drapeau
  `WN_PHYSIO_TRAITEMENTS` créé éteint, `docs/FEATURE_FLAGS.md`.
  Routés de la revue `wn-reviewer` de la PR 1 (P2), à tenir par le code :
  la lecture des pièces (`constats/lecture.ts`, `aRelire.ts`) décode la
  troisième clé — aujourd'hui, toute pièce qui n'est pas un résultat y
  devient une réponse ; normaliser nom, dose, moment et motif (espaces
  insécables et blancs Unicode), que `~ '\S'` de la base ne garantit pas ;
  écrire les pièces dans l'ordre canonique de `constats/ecriture.ts`
  (résultats triés, réponses, puis traitements) et les critères
  physiologiques dans un ordre fixe, faute de quoi deux écritures croisées
  s'interbloquent (PostgreSQL annule l'une, rien n'est corrompu) ; rester en
  READ COMMITTED — une transaction SERIALIZABLE face à une READ COMMITTED
  peut laisser deux têtes sur un critère (trou commun à BP-09 et BP-11).

**PR 2 livrée (2026-10-21)** : release-db run 39654198602 approuvée et
constatée (sentinelle liée au run ; production sur la tête de `main` ;
conteneur : migration appliquée, deux tables vides, RLS sans politique,
`id_traitement` présente, « une pièce » sur trois clés). Routes
`api/portail/physio-traitements` et `api/praticien/physio-traitements` ;
module `lib/physio-traitements/` (listes, dates, demande, fils, lecture,
écriture, garde, anamnèse) ; écrans `components/physio-traitements/`. Les
quatre P2 routés sont tenus : la lecture des pièces décode la troisième clé
(`constats/lecture.ts`, `aRelire.ts`, huitième condition
`traitement_remplace`) ; les textes sont normalisés (`normaliserTexte`) ;
les pièces s'écrivent résultats, réponses puis traitements, et le statut
menstruel prend le verrou du sexe déclaré avant le sien ; l'écriture reste
en READ COMMITTED. Choix d'exécution, à relire avant l'allumage :

- **Le portail** montre au patient la tête du sexe déclaré, du statut
  menstruel et de chaque traitement (en cours ou arrêté), sans l'e-mail du
  praticien ; il n'y voit ni grossesse, ni allaitement, ni mesures posées
  au cockpit. Il note un arrêt et supprime une ligne qu'il a ajoutée ; il
  ne « modifie » pas une ligne (aucun libellé validé ne le dit).
- **Une page « Ma fiche de renseignements »** (`portail/[token]/renseignements`)
  et son lien au hub rouvrent ces lignes pour un dossier dont l'anamnèse est
  déjà validée — sans elle, un patient existant ne déclarerait jamais rien.
  Le titre de la page et du lien, « Ma fiche de renseignements », reprend
  le nom de la v20 ; il n'a pas été soumis comme libellé.
- **La date** se saisit en année, mois facultatif, jour facultatif, ou
  « Je ne sais pas » : la précision se lit de ce qui est rempli, jamais
  choisie à part.
- **Au cockpit**, un dossier MINEUR est refusé à l'écriture ; une date de
  naissance manquante ne l'est pas ([[D-335]] §6 ne vise que le mineur).
- **La vigilance** nomme ses sources quand l'anamnèse et les lignes portent
  une même nature (« déclarés à l'anamnèse », « lignes datées du dossier ») ;
  sinon l'item de l'anamnèse garde sa forme exacte d'avant.
- **Les journaux** des deux routes rendent la classe et le code de l'erreur
  (`classeEtCode`), jamais son message — `signature` vit dans
  `biology-library`, dont la frontière refuse un importeur neuf (D-306).

Relecture `wn-reviewer` de la PR 2 : go sous condition ; un P1 et trois P2
corrigés dans la PR (Entrée et ligne ouverte dans l'assistant, lecture des
lignes hors du `try` de l'anamnèse, retrait d'un statut menstruel périmé,
U+0000 et an 0000). **Ajoutés aux conditions de l'allumage** : la longueur
d'un point de vigilance (borne de 500 du brouillon praticien) ; l'export du
dossier, qui ne porte pas ces lignes ; la confirmation que le courrier au
médecin peut reprendre la ligne de vigilance qui les nomme ; une procédure
d'extinction qui dise que les traitements déclarés en lignes deviennent
invisibles à la vigilance.

## Allumage — conditions tranchées ([[D-391]], 2026-10-28)

Six arbitrages du responsable du 2026-10-27, sur l'inventaire des
conditions de [[D-335]] §9 et des quatre points ajoutés par la revue de la
PR 2 :

- **Garde de population** : elle reste sur l'anamnèse jusqu'à la première
  exclusion curée (table de [[D-101]] vide) — condition levée.
- **Export du dossier** : il porte les lignes, dans les deux versions,
  masquage compris.
- **Document destiné au médecin** : il reprend la vigilance qui nomme les
  traitements, comme pour l'anamnèse ; aucun code.
- **Extinction** : la vigilance lit les lignes quel que soit le drapeau.
- **Plafond de 500** : un point de vigilance par traitement ; un point encore
  trop long (547 caractères aux bornes) passe par `scinderSousPlafond`.
- **Texte patient** : « Vos données personnelles » v22 (les durées de
  [[D-378]] passent en v23), conditions v5 ; la phrase « aucun outil d'IA
  ne les reçoit, transmises à personne » est corrigée et revalidée.

Suite : trois PR sans migration (vigilance et banc sur vraie base ; export ;
texte v22 mergé le jour de l'allumage), puis l'allumage, geste du
responsable.

- **PR 1 livrée (2026-10-28)** : la synthèse lit les traitements en vigueur
  hors drapeau, dans son propre `try` (§4) ; chaque ligne de traitement fait
  son point, scindé par `scinderSousPlafond` au-delà de 500 caractères, les
  groupes de l'anamnèse inchangés (§5) ; banc `physioTraitements.pg.test.ts`
  sur `ecriture.ts` — pose, remplacement, retrait, deux remplacements
  concurrents d'un fil, deux premières poses concurrentes d'un critère — et
  son étape CI (§7). Condition (2) remplie. Reste : PR 2 (export), PR 3
  (v22).
- **PR 2 livrée (2026-10-28)** : la section 2 de l'export du dossier
  ([[D-252]]) s'ouvre sur les lignes datées — les six critères et les
  traitements en cours et arrêtés, la tête de chaque fil, avec date, source
  et précision —, dans les deux versions ; un retrait ramène à « Non
  renseigné » ; dans la version « IA externe », nom, dose, moment et motif
  d'un traitement passent par le masqueur. Une seule lecture
  (`lireDonneesDuDossier`, dans l'assembleur, inscrit au banc des lecteurs).
  Lecture de mise en œuvre : lignes lues quel que soit le drapeau, comme
  §4 ; un dossier sans ligne s'exporte à l'identique (préambule compris),
  épinglé par un banc. Condition (3) remplie. Reste : PR 3 (v22).

## Hors périmètre

D-335 §12 : classe de traitement ; IMC et toute dérivée ; garde de
population sur les lignes (décision à part, condition de l'allumage) ;
contexte de prélèvement (BP-05) ; données physiologiques comme pièces de
constat ; conversion du texte libre ; interaction médicamenteuse calculée.

## Interdits

- Aucune déduction d'un critère (prénom, civilité, questionnaire, texte
  libre).
- Aucun nom de médicament réel ni texte clinique au dépôt ; fixtures Sophie
  Nicola, Jennifer Martin, Michel Dogné, traitements synthétiques en test.
- Aucune modification de la garde de population ni de ses bancs.
- Aucun médicament prescrit, ajusté ou arrêté par l'application.

## Critères de done

- Release-db constatée par conteneur (deux tables vides, RLS active, clé de
  pièce présente).
- « Inconnu » explicite, distinct de « non renseigné » (tests).
- Contrat négatif propre joué au CI.
- Effacement testé.
- Synthèse : ligne de vigilance identique à aujourd'hui pour une anamnèse
  ancienne ; lignes en vigueur lues sous le drapeau ; texte transmis à l'IA
  inchangé, sans aucune ligne de ce lot (tests).

## Dépendances

LOT-00 (BP-00, fait), LOT-11 (BP-11, fait : la clé de pièce s'ajoute à sa
table). Aval : BP-24, BP-27, BP-19.
