---
id: "LOT-13"
titre: "BP-13 — Données physiologiques, traitements et compléments en cours"
statut: "en_cours (2026-10-21) — D-335 acceptée (#1614), déclaration RGPD et texte patient validés le 2026-10-21 ; PR 1, migration seule, ouverte le 2026-10-21 ; release-db à la suite du merge, puis le code"
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
  banc `banc-physio-traitements-deux-sessions.test.mjs` (sept courses, dont
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
