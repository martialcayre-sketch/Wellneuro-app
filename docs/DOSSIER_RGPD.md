# Dossier RGPD de l'expérimentation Wellneuro

**Restes versés au plan le 2026-10-14** : les restes à faire nommés dans ce document sont tenus au plan (docs/claude/PLAN_WELLNEURO.md, §8 et file D au §4), qui en porte l'ordre et le sort ; ce document reste tenu à jour.

> Écrit le 2026-08-07 pour l'item 7 de « Ce qu'il resterait à faire » de
> `docs/archive/cadrages/CHECKLIST_ACTIVATION_G_TRUST_04.md`.
>
> **Alerte, pas avis juridique.** Ce document est rédigé par l'assistant, dont la
> connaissance a une date de coupure et qui n'est pas juriste. Il doit être
> **confirmé par un conseil qualifié** avant d'être opposé à qui que ce soit —
> la revue juridique externe est une dette nommée
> (`docs/claude/campagnes/2026-07-15-trust-information-patient-droits-v1/DETTE_TRUST.md`,
> gate G-TRUST-03).
>
> **Ce document recense, il ne qualifie pas.** Chaque rubrique porte soit une
> **source** dans le dépôt, soit la mention **TROU** — parce que la valeur ne se
> déduit d'aucun fichier et qu'une valeur plausible serait pire que son absence.
> Le tableau de la section 14 récapitule les trous, leur porteur et leur
> échéance.

**Ce dossier ne lève rien.** Le gate G-TRUST-04 reste non levé ; il est couvert
par une dérogation datée du 2026-07-21, bornée au **2026-10-21**.

> **Mise à jour du 2026-10-04 ([[D-265]]).** G-TRUST-04 est clos depuis
> [[D-121]] (annexe HDS signée le 2026-08-30), et la phase avec des personnes
> réelles est reconduite sans terme. La base légale (rubrique 3) et l'AIPD
> (rubrique 13) sont écrites par le responsable lui-même, sur une trame ; le
> reste de ce dossier, écrit par l'assistant, garde l'alerte ci-dessus.

> **Deux dates, deux évènements — ne pas les confondre ni les « aligner ».** Le
> **2026-07-21** est celui de l'instruction de l'hébergement (Supabase et Vercel
> absents de l'annuaire ANS) et de la dérogation ci-dessus. Le **2026-07-22** est
> celui de l'**arbitrage** qui en a tiré la conséquence — rester sur
> l'hébergement actuel, borner la phase de test, n'instruire aucune migration
> HDS (`docs/claude/campagnes/2026-08-05-cloture-des-dettes-wellneuro-5-0/CAMPAGNE.md`,
> point 8). L'échéance, elle, est la même partout : **2026-10-21**.
>
> **Cet arbitrage n'est plus l'orientation courante.** `docs/DECISIONS.md`
> D-006 (2026-07-28, six jours plus tard) décide la migration vers Scalingo, et
> D-037 (2026-08-09) la confirme. Les deux dates ci-dessus restent vraies comme
> évènements ; la conséquence « n'instruire aucune migration HDS » ne l'est
> plus. **La dérogation, elle, court inchangée jusqu'au 2026-10-21.**
> 2026-10-14 : borne levée par [[D-265]] (reconduction sans terme, §1) ; G-TRUST-04 clos par [[D-121]] ; échéance des trous ouverts 2027-06-30 ([[D-265]] §4, [[D-283]] §9).

---

## 1. Responsable du traitement

**Source.** Le praticien Wellneuro, contact `martialcayre@wellneuro.fr` —
qualification G-TRUST-02, décision du 2026-07-16
(`docs/claude/campagnes/2026-07-15-trust-information-patient-droits-v1/GATES_GO_NO_GO.md`).
Le même contact est affiché au patient — par le document
`DONNEES_CONFIDENTIALITE_V1` (`web/src/lib/trust/contenus/registre.ts`), seul
chemin servi ; voir la note de la rubrique 6 sur `gouvernance.ts` — et repris
comme point d'entrée de la procédure d'incident
(`docs/PROCEDURE_VIOLATION_DONNEES.md` §Rôles).

**TROU.** L'identité juridique exacte du responsable — personne physique ou
morale, dénomination, SIRET, adresse postale — n'apparaît nulle part dans le
dépôt. Un dossier RGPD opposable la porte.

> ⚠ **Contradiction relevée, non tranchée ici.** G-TRUST-02 et
> `PROCEDURE_VIOLATION_DONNEES.md` écrivent « **pas de DPO désigné** : le point
> de contact est le responsable lui-même ». `docs/DECISIONS.md` D-005 écrit
> « **confirmé par le DPO le 2026-07-27** ». Les deux ne peuvent pas être vrais
> en même temps. Trancher relève du responsable, pas de ce document ; la
> réponse conditionne la rubrique 9 (qui reçoit les demandes de droits) et la
> valeur de D-005 comme pièce d'audit.

## 2. Finalité du traitement

**Source.** `web/src/lib/trust/contenus/registre.ts`, section « Pourquoi ? » du
document `DONNEES_CONFIDENTIALITE_V1` : préparer et suivre l'accompagnement en
neuronutrition — comprendre la situation, préparer les consultations, suivre
l'évolution, remettre des documents validés par le praticien.

Le même document écrit, et c'est une limite de finalité opposable :
« cet accompagnement relève du bien-être et du suivi ; **il n'établit pas de
diagnostic médical** ». L'étage des résultats biologiques réels est
construit (table `resultats_biologiques`, `D-122` §2, 2026-09-03) et
**ouvert en production depuis le 2026-09-09** : `WN_CB_RESULTS_ENABLED` a été
posé ce jour-là, conteneurs redémarrés à 06:34:55, effectivité constatée par
sonde non authentifiée sur `/api/praticien/biologie/resultats` — `401` et non
`503`, la garde testant le drapeau avant la session.

> **Écart assumé et daté — la condition préalable n'a pas été tenue.** Ce
> paragraphe posait l'ouverture comme « conditionnée à la mise à jour
> **préalable** du registre des traitements et du document d'information
> patient ». Le drapeau a été posé **avant** ces deux mises à jour, sur une
> vérification qui n'avait retenu que les conditions techniques de `D-081` et
> `D-122` §2 — hébergement HDS exclusif, `WN_CB_ENABLED`, code déployé qui lit
> le drapeau. La condition RGPD n'était écrite **qu'ici** : ni
> `FEATURE_FLAGS.md`, ni `D-122` §2 qui décrit pourtant le geste, ne la
> mentionnaient. Elle a donc été manquée.
>
> **Portée réelle de l'écart** : nulle sur les données. `resultats_biologiques`
> comptait **0 ligne** au moment du constat (lecture par conteneur,
> `one-off-8343`, 2026-09-09 08:38) — la capacité a été ouverte, aucune donnée
> de santé n'a été traitée hors registre. L'arbitrage du responsable, rendu le
> même jour, a été de **laisser le drapeau posé et de combler immédiatement**
> plutôt que de refermer : les deux mises à jour sont faites ci-dessus
> (rubrique 5) et dans la **v6** du document `donnees_confidentialite`
> (`registre.ts`, publiée le 2026-09-09).
>
> Ce que l'épisode laisse au dossier : une condition d'ouverture qui ne vit que
> dans une pièce de conformité, et pas dans la documentation du drapeau qu'elle
> conditionne, est une condition qu'on manque. `FEATURE_FLAGS.md` la porte
> désormais aussi.

### 2 bis. La synthèse préparée SANS geste du praticien (2026-09-12)

**Ce qui change, et ce qui ne change pas.** [[D-174]] fait préparer le brouillon
de synthèse **à la fermeture d'un rideau de questionnaires**, sans qu'un
praticien l'ait demandé. Le traitement lui-même est inchangé — mêmes données
d'entrée (les réponses aux questionnaires, le contexte clinique du dossier),
même sous-traitant (Anthropic), même sortie (`SyntheseIA`, déjà déclarée en
catégorie particulière à la rubrique 5), même finalité (préparer la
consultation). **C'est le DÉCLENCHEUR qui change, et lui seul** : un geste du
praticien devient un événement du dossier.

**Pourquoi cela se déclare quand même.** Une finalité se décrit aussi par la
façon dont le traitement s'active. « Le praticien demande une synthèse » et
« l'outil en prépare une quand la matière est complète » ne décrivent pas la
même maîtrise, même quand ils produisent le même objet à partir des mêmes
données. Le registre doit porter la seconde formulation.

**Ce qui n'est PAS une décision automatisée (art. 22).** Ce qui est produit est
un `Brouillon_IA`. Deux gestes du praticien restent nécessaires pour qu'un texte
atteigne le patient — la **validation** de la synthèse, puis son **envoi** — et
aucun des deux n'est automatisé. Rien ne parvient au patient sans qu'un humain
l'ait relu et décidé de le transmettre.

**Volume borné par construction** : deux générations par dossier au maximum
(marqueur `donneesEntree.source`), et un brouillon rejeté ne se régénère pas.

> **CE TRAITEMENT A CESSÉ LE 2026-09-17 ([[D-226]]).** La génération automatique
> a été retirée — variable `env-unset` en production (conteneurs recréés à
> 18:49:15 UTC, soit 20:49:15 heure locale), puis code supprimé du dépôt et
> déployé à **22:08:04 UTC**. C'est ce second geste qui a effectivement arrêté
> le traitement : une génération a encore eu lieu à 20:39:52 UTC, drapeau
> pourtant retiré (amendement du 2026-09-19 à [[D-226]]). **Une synthèse ne se produit plus que
> sur demande du praticien.** Le paragraphe ci-dessous reste au dossier parce
> qu'il décrit un traitement qui A EU LIEU, du 2026-09-12 au 2026-09-17, par
> **9 générations sur 5 dossiers — 6 au premier rideau sur 5 dossiers, 3 au
> second sur 3 dossiers** : ce qui a été traité l'a été, et l'effacer réécrirait l'histoire
> du registre. (La lecture du 2026-09-18 tranche ce que celle de la veille laissait
> ouvert : le total de dossiers distincts touchés est de **5**, donc les
> dossiers du second rideau sont bien un sous-ensemble de ceux du premier. Ce
> n'est plus une inférence, c'est une mesure.) La **rubrique 5** du
> registre des traitements est à mettre à jour en conséquence — la finalité
> « l'outil en prépare une quand la matière est complète » n'a plus d'objet, et
> seule subsiste « le praticien demande une synthèse ». Rien à notifier au
> patient : le retrait **réduit** le traitement, ne l'étend pas, et
> `DONNEES_CONFIDENTIALITE_V7` reste vrai au mot près (voir plus bas — la phrase
> qu'il porte ne promettait aucun déclenchement automatique).

**LA CONDITION A ÉTÉ TENUE, ET DANS LE BON ORDRE.** Ce paragraphe a été rédigé
**avant** toute pose, soumis au responsable, puis **validé par lui le 2026-09-12**.
`WN_SYNTHESE_PAR_RIDEAU` a été posé **après** cette validation, à **18:08:24 UTC**
— conteneurs web recréés au même instant, `env` relu, code vérifié en ligne par
contenance avant la pose. C'est exactement l'inverse de l'épisode du 2026-09-09
rapporté ci-dessus, où le drapeau avait précédé la mise à jour.
`FEATURE_FLAGS.md` porte la condition sur la ligne du drapeau, et non seulement
ici.

**Le document d'information patient n'a PAS besoin d'une version nouvelle — et
il faut dire pourquoi.** `DONNEES_CONFIDENTIALITE_V7` écrit deux choses qui
restent vraies au mot près : « Le premier usage est la préparation du brouillon
de la synthèse de votre bilan, à partir de vos réponses aux questionnaires » —
inchangé — et « l'outil peut aider à organiser ou reformuler des informations,
mais **il ne publie jamais seul** une décision ou une recommandation qui vous
est destinée » — la promesse même que le brouillon automatique ne touche pas.
Aucun prestataire ne s'ajoute, aucune donnée nouvelle n'est recueillie, aucune
sortie nouvelle n'atteint le patient. Publier une v8 pour annoncer un changement
de déclencheur interne au cabinet apprendrait au patient à survoler des versions
qui ne le concernent pas. **ARBITRAGE DU RESPONSABLE, RENDU LE 2026-09-12 : PAS DE v8.** Le point lui avait
été posé comme un désaccord possible ; il l'a tranché sur le fond, et son motif
est plus net que celui du paragraphe ci-dessus : « **l'envoi du booklet est
toujours la main du praticien ; la machine n'envoie jamais rien
automatiquement** ». Ce que le document promet au patient porte sur ce qui lui
PARVIENT, et rien de ce qui lui parvient ne change. Le moment où un brouillon
commence à se préparer est un fait interne au cabinet.

### 2 ter. Le relevé des comptes rendus biologiques par IA vision ([[D-256]] A4) — déclaré AVANT activation (2026-10-01)

**Ce qui est déclaré, et pourquoi maintenant.** Le LOT-02 de BIO-INGEST fera
déposer par le praticien le compte rendu d'analyses que le patient lui remet
(PDF, puis photo ou scan au LOT-03). Le document est conservé en base Postgres,
chez l'hébergeur HDS (A2), **le temps de sa relecture** : purgé dès que chacune
des lignes de sa dernière lecture est décidée, au plus tard 30 jours après le
dépôt ([[D-258]],
rubrique 8). Un modèle d'Anthropic, en lecture d'image, en
relèvera les valeurs. [[D-256]] A4 fait de cette déclaration une **condition de
sortie non négociable**, posée avant toute ligne de code d'extraction et avant
toute activation. C'est l'inverse de l'épisode du 2026-09-09 rapporté au §2 :
cette fois, la déclaration vient d'abord. **Au 2026-10-01, rien de ce
traitement n'existe** : ni code d'extraction, ni table, ni drapeau.

- **Finalité** : alléger l'enregistrement des résultats biologiques chiffrés
  dans `resultats_biologiques`. Aucune qualification de valeur (normale,
  anormale) et aucune conclusion ; le moteur clinique ne lit pas ces résultats
  ([[D-122]]).
- **Déclencheur** : un geste du praticien, le dépôt d'un document. Rien ne
  s'extrait sans lui.
- **Ce qui part chez Anthropic : le compte rendu ENTIER.** Cela comprend
  l'en-tête d'identité (nom, date de naissance, laboratoire, références), et
  **toutes** les valeurs du document, y compris celles qui ne seront pas
  retenues. Aucun masquage n'est promis. Le LOT-02 ne peut pas le garantir sur
  des documents hétérogènes, et le patient lit le document entier déclaré
  (arbitrage du 2026-10-01). C'est le flux le plus identifiant des quatre qui
  partent vers ce sous-traitant (rubrique 7).
  **Mise à jour (2026-10-14, [[D-284]] §5, lot (j))** : depuis le déploiement
  du lot 2 du masquage, **le document ne part plus**. Le praticien noircit
  l'identité du patient à l'écran sur chaque page (ou déclare qu'il n'y en a
  aucune, déclaration tracée) ; seules ces pages, en JPEG réencodées sans
  métadonnées, partent chez Anthropic. Sans masquage, aucune lecture ne part.
  Le masquage est manuel : il vaut ce que vaut le geste du praticien.
  Les valeurs du document, elles, partent toujours toutes. **Information du
  patient (lot 3, textes validés par le responsable le 2026-10-14)** :
  `usage_ia` v8 et `donnees_confidentialite` v15, publiées après le
  déploiement constaté de l'écran de masquage. Dans chacune, la phrase « le
  compte rendu est transmis en entier, y compris votre nom… » devient celle
  du masquage à l'écran : seules les pages masquées partent, jamais le
  compte rendu d'origine. L'accusé suit le régime des versions précédentes :
  il est recueilli au dépôt pour la v8, et exigé pour la v15.
- **Une photo ou un scan (LOT-03)** part entier lui aussi, mais **sans ses
  métadonnées** : l'image est réencodée au dépôt, avant d'être consignée, et ses
  données EXIF — dont la position GPS d'une photo de téléphone — ne sont ni
  gardées en base ni transmises (arbitrage du 2026-10-04).
- **Ce qui en sort** : des lignes **candidates**, dans des tables de staging
  (lot d'import et lignes candidates, A5). Une ligne n'atteint
  `resultats_biologiques` que par la validation explicite du praticien dans
  l'écran prévu. Le choix de l'analyte reste une table d'alias signée, jamais un
  choix du modèle. Aucune unité n'est convertie ([[D-157]]).
- **Ce qui n'est pas une décision automatisée (art. 22)** : rien n'est écrit au
  dossier sans geste humain, et rien de ce qui est extrait n'atteint le patient
  sans passer par le praticien.
- **Faits du laboratoire ([[D-267]], LOT-07) — déclarés le 2026-10-05, avant
  `bio-extraction-v2`.** L'extraction relève aussi, pour chaque ligne,
  l'intervalle de référence et la marque d'anomalie **tels qu'imprimés**,
  recopiés verbatim sur la ligne lue (`intervalle_lu`, `marquage_lu` de
  `LigneBiologiqueCandidate`), jamais sur `ResultatBiologique`. Rien n'est
  déduit : ni borne, ni marque calculée en comparant la valeur à l'intervalle.
  **Aucun flux nouveau** : le document part déjà entier chez Anthropic. Ce qui
  change est ce qui est **conservé** : ces deux faits suivent la ligne et
  **survivent à la purge** du document ([[D-258]]). Information du patient :
  « L'intelligence artificielle dans Wellneuro » **v5**, sans accusé, comme la
  v4. « Vos données personnelles » reste en **v12** : « l'outil en relève les
  valeurs » demeure vrai. La v5 est servie et constatée ([[D-248]]) **avant**
  le déploiement de `bio-extraction-v2` ([[D-267]] §8-§9).
- **Commentaires du laboratoire ([[D-278]] §3, lot de sécurité 11A) —
  déclarés le 2026-10-10, avant leur migration.** L'extraction relèvera aussi
  les commentaires que le laboratoire imprime — sur un résultat
  (`commentaire_lu` de `LigneBiologiqueCandidate`) ou sur le compte rendu
  entier (`commentaires_lus` d'`ImportBiologique`) —, recopiés **tels
  qu'imprimés**, jamais sur `ResultatBiologique`, et un indicateur d'omission
  sans contenu quand l'un dépasse sa borne technique. **Aucun flux nouveau** :
  le document part déjà entier chez Anthropic. Ce qui change est ce qui est
  **conservé** : ce **texte libre** survit à la purge du document ([[D-258]]),
  et il peut contenir l'identité d'un **tiers** (« résultat téléphoné au
  Dr … ») ou du patient. D'où trois limites, à tenir par le code qui les
  relèvera : jamais journalisés, jamais transmis à un modèle d'IA hors de
  l'extraction elle-même, jamais servis au portail patient ni repris dans un
  courriel ; masqués si la biologie entre un jour dans l'export « ia-externe ».
  Une extraction en échec n'en conserve aucun (contrainte en base).
  Information du patient : une **nouvelle version** de « L'intelligence
  artificielle dans Wellneuro », servie et constatée **avant** le déploiement
  du procédé qui les relève (`bio-extraction-v4`), sur le patron de
  [[D-267]] §8-§9. Migration **appliquée** en production le 2026-10-11
  (constat par conteneur). **`usage_ia` v7, texte validé par le responsable
  le 2026-10-11** : dans le paragraphe du relevé, « l'intervalle de
  référence et la marque d'anomalie tels que le laboratoire les a
  imprimés » devient « l'intervalle de référence, la marque d'anomalie et
  les commentaires tels que le laboratoire les a imprimés », et « Ces deux
  mentions du laboratoire sont recopiées sans être complétées ni
  reformulées. » devient « Ces mentions du laboratoire sont recopiées sans
  être complétées ni reformulées ; les commentaires restent dans votre
  dossier, même après la suppression du compte rendu. » Sans accusé dans la
  séquence ; l'accusé de la version courante reste exigé à l'écran de dépôt
  ([[D-269]] §6).
- **Acte de lecture clinique d'un import validé ([[D-268]], BIO-PARCOURS
  BP-10) — déclaré le 2026-10-06, avant la table.** Une table neuve,
  `LectureImportBiologique` (`lectures_imports_biologiques`, créée par la
  migration `lectures_imports_biologiques_v1`, **appliquée** en production le
  2026-10-06 à 18:37 UTC par `release-db`, constatée par conteneur ; le code
  qui l'écrit et la lit est livré derrière `WN_BIO_LECTURE_ENABLED`, éteint),
  trace qu'un praticien **a lu** un import validé.
  Une ligne porte : le dossier, l'import, la nature de l'acte (`lecture` ou
  `revocation`), le code de révocation, l'e-mail du praticien et la date.
  Le code de révocation est pris dans une **liste fermée**, sans texte libre
  (arbitrage du 2026-10-06), donc sans texte libre saisi. Les codes sont
  fixés par la migration, dans un vocabulaire de procédure qui décrit le
  geste et jamais le patient ([[D-268]] §5, précision) : `acte_pose_par_erreur`,
  `mauvais_import`, `lecture_a_refaire`. La base refuse aussi l'acte d'un
  autre praticien que celui du dossier. La table reste classée en catégorie particulière. Elle ne
  recopie **aucune valeur**, aucun libellé, aucun marquage (contrat SQL
  négatif). Elle est en **ajout seul** (une révocation est une ligne de plus),
  avec RLS activée sans politique. Elle est **effacée nommément avec le
  dossier**.
  - **Ce qui est nouveau.** Il n'y a aucun flux nouveau, aucun destinataire
    nouveau, aucun sous-traitant : rien ne part hors de la base HDS. Seul le
    **praticien du dossier** la lit et l'écrit, selon l'appartenance
    existante (`filtrePatientsDuPraticien`). L'élargissement à tout le
    domaine, d'abord arbitré, a été écarté le 2026-10-06 ([[D-268]] §5).
  - **Information du patient : inchangée.** « Vos données personnelles »
    v12 déclare déjà le relevé et la validation des résultats. La trace du
    geste de lecture du praticien sur ces résultats n'ajoute ni catégorie, ni
    destinataire, ni finalité vue du patient. **Ce paragraphe a été validé par
    le responsable le 2026-10-06**, note patient inchangée comprise, après sa
    rédaction (PR #1344).
- **Annulation d'un résultat de biologie saisi par erreur ([[D-294]],
  BIO-PARCOURS BP-09) — déclarée le 2026-10-14, avant la table.** Une table
  neuve, `AnnulationResultatBiologique` (`annulations_resultats_biologiques`,
  créée par la migration `annulations_resultats_biologiques_v1`, **non encore
  appliquée** : release-db à approuver, puis constat par conteneur ; aucun
  code ne l'écrit ni ne la lit avant ce constat, hors l'effacement nommé du
  dossier, livré avec la migration), trace qu'un praticien a
  retiré des séries un résultat saisi par erreur, ou qu'il a révoqué ce
  retrait.
  Une ligne porte : le dossier, le résultat visé, la nature de l'acte
  (`annulation` ou `revocation`), le motif, l'annulation révoquée, l'e-mail du
  praticien et la date. Les deux motifs sont pris dans des **listes
  fermées**, sans texte libre, dans un vocabulaire de procédure qui décrit le
  geste et jamais le patient : `mauvais_dossier`,
  `mauvaise_date_prelevement`, `mauvais_analyte` pour l'annulation ;
  `mauvais_resultat_annule`, `resultat_verifie_exact`,
  `motif_annulation_errone` pour la révocation. La base refuse l'acte d'un
  autre praticien que celui du dossier. La table est classée en catégorie
  particulière. Elle ne recopie **aucune valeur**, aucun analyte, aucune date
  (contrat SQL négatif). Elle est en **ajout seul** (une révocation est une
  ligne de plus), avec RLS activée sans politique. Elle sera **effacée
  nommément avec le dossier**, avant les résultats qu'elle désigne.
  - **Ce qui est nouveau.** Aucun flux nouveau, aucun destinataire nouveau,
    aucun sous-traitant : rien ne part hors de la base HDS. Rien ne
    s'efface : le résultat annulé reste dans `ResultatBiologique`, sorti des
    calculs et des séries, lisible du seul praticien du dossier, marqué
    « annulé » avec son motif, son auteur et sa date.
  - **Résultat saisi dans le mauvais dossier.** La valeur reste dans le
    dossier qui l'a reçue, côté praticien seul, marquée annulée ; elle n'est
    **jamais** montrée côté patient ([[D-294]] §5). Elle ne porte aucune
    identité de la personne à qui elle appartient, et suit le sort du
    dossier qui l'a reçue (effacée avec lui).
  - **Information du patient : inchangée.** La note patient déclare déjà le
    relevé, la saisie et la correction des résultats. Le retrait d'un
    résultat erroné n'ajoute ni catégorie, ni destinataire, ni finalité vue
    du patient. **Ce paragraphe a été validé par le responsable le
    2026-10-14**, note patient inchangée comprise, dans la PR de la
    migration (#1448), avant le merge.
- **Statut posé par le praticien près d'une valeur biologique ([[D-322]],
  F58) — déclaré le 2026-10-18, avant la table.** Une table neuve,
  `StatutPoseResultatBiologique` (`statuts_poses_resultats_biologiques`,
  créée par la migration `statuts_poses_resultats_biologiques_v1`, **non
  encore appliquée** : release-db à approuver, puis constat par conteneur ;
  aucun code ne l'écrit ni ne la lit avant ce constat, hors l'effacement
  nommé du dossier, livré avec la migration), trace le geste que le
  praticien retient près d'une valeur de la série, ou le retrait de ce
  geste.
  Une ligne porte : le dossier, la ligne de résultat visée, la nature de
  l'acte (`pose` ou `retrait`), le statut, l'e-mail du praticien et la date.
  Le statut est pris dans une **liste fermée** de six codes, sans texte
  libre, qui décrivent le geste du praticien et jamais la valeur ni le
  patient : `aucune_action_retenue`, `a_suivre`, `contexte_a_preciser`,
  `donnee_a_verifier`, `avis_medical_a_envisager`, `relie_au_protocole`. La
  base refuse l'acte d'un autre praticien que celui du dossier. La table
  est classée en catégorie particulière. Elle ne recopie **aucune valeur**,
  aucun analyte, aucune date de prélèvement (contrat SQL négatif). Elle est en **ajout
  seul** (un retrait est une ligne de plus), avec RLS activée sans
  politique. Elle sera **effacée nommément avec le dossier**, avant les
  résultats qu'elle désigne.
  - **Ce qui est nouveau.** Aucun flux nouveau, aucun destinataire nouveau,
    aucun sous-traitant : rien ne part hors de la base HDS. Le statut est
    lu par le seul praticien du dossier, à l'écran de la série : ni le
    portail, ni le courrier au médecin, ni le scoring, ni l'IA ne le lisent
    ([[D-122]], [[D-322]]).
  - **Information du patient : inchangée.** La note patient déclare déjà le
    relevé et la saisie des résultats, lus par le praticien. Le geste que
    celui-ci note près d'une valeur n'ajoute ni catégorie, ni destinataire,
    ni finalité vue du patient. **Ce paragraphe a été validé par le
    responsable le 2026-10-18**, note patient inchangée comprise, dans la PR
    de la migration (#1537), avant le merge.
- **Document pour le médecin imprimé, puis remis par le patient ([[D-307]],
  F38) — déclaré le 2026-10-18, avant les tables.** Deux tables neuves,
  créées par la migration `documents_medecin_imprimes_v1`, **non encore
  appliquée** : release-db à approuver, puis constat par conteneur. Aucun code
  ne les écrit ni ne les lit avant ce constat, hors l'effacement nommé du
  dossier, livré avec la migration.
  - `DocumentMedecinImprime` (`documents_medecin_imprimes`) trace chaque
    impression **confirmée** du document pour le médecin. Une ligne porte : le
    dossier, la synthèse validée dont le document est composé, l'e-mail du
    praticien, **le HTML imprimé recopié tel quel** (nom du patient, date, et
    le contenu de la synthèse rendu pour le médecin sous la garde non
    prescriptive), son empreinte SHA-256 et la date. Le document se recompose
    à chaque ouverture : seul cet instantané dit ce qui a été imprimé et
    remis. La base refuse une synthèse d'un autre dossier, une synthèse non
    validée, et l'impression par un autre praticien que celui du dossier.
  - `TelechargementDocumentMedecin` (`telechargements_documents_medecin`)
    journalise **chaque téléchargement** par le patient, dans son portail, de
    « Pour votre médecin ». Une ligne porte : le dossier, l'impression
    téléchargée et la date, sans autre contenu. La base refuse le
    téléchargement d'une impression remplacée : le patient reçoit toujours la
    dernière.
  - Les deux tables sont classées en catégorie particulière. Elles sont en
    **ajout seul** (une nouvelle impression remplace la précédente pour le
    patient, sans l'effacer), avec RLS activée sans politique (contrat SQL
    négatif). Elles seront **effacées nommément avec le dossier**, les
    téléchargements puis les impressions, avant les synthèses qu'elles
    désignent. Conservation : la vie du dossier, comme la lettre d'adressage
    remise ([[D-262]]).
  - **Ce qui est nouveau.** Aucun sous-traitant nouveau : rien ne part hors
    de la base HDS. Le destinataire est **le patient lui-même**, dans son
    portail ; il remet le document à son médecin, hors de l'application.
    Wellneuro n'envoie rien à un tiers ([[D-307]] §3 et §4). L'impression
    sera **bloquée**, sans trace, quand le patient a refusé ou retiré le
    partage avec son médecin traitant, ou ne s'est pas prononcé : c'est la
    règle de la correspondance médecin : rien n'est alors imprimé. Le portail
    ne montre rien tant qu'aucune impression n'existe. La base ne relit pas
    le consentement : ce que devient, au portail, une impression faite avant
    un retrait se tranchera avec le code, avant le drapeau.
  - **Information du patient : inchangée pour la migration.** Les tables
    restent vides jusqu'au code, livré derrière un drapeau éteint. La note
    patient dit déjà que l'application ne transmet rien elle-même et que le
    choix du patient engage son praticien. Le texte qui annoncera « Pour votre
    médecin » au portail se relira dans la PR du code, avant que le drapeau
    s'allume. **Ce paragraphe a été validé par le responsable le
    2026-10-18**, note patient inchangée comprise, dans la PR de la
    migration, avant le merge.
  - **Mise à jour du 2026-10-18 (code, F38).** La migration est
    **appliquée** : run release-db 39144243510, sentinelle
    `WN_RELEASE_DB_OK`, puis `migrate status` par conteneur (121 migrations,
    schéma à jour). Le code est livré.
    - **L'impression tracée est servie dès le déploiement**, sur arbitrage du
      responsable du 2026-10-18. Cela corrige la phrase ci-dessus « livré
      derrière un drapeau éteint », qui ne vaut que pour le portail.
      « Imprimer » sur l'aperçu médecin demande une confirmation. La route
      recompose le document au serveur, relit le partage sous verrou, puis
      enregistre l'instantané. Le Fil de correspondance porte « Document pour
      le médecin imprimé le … », sans le document. Rien n'est visible du
      patient.
    - **Le portail « Pour votre médecin » est derrière
      `WN_DOCUMENT_MEDECIN_PATIENT`, éteint.** Ses textes sont à relire par le
      responsable avant l'allumage.
    - **Mise à jour (2026-10-19)** : les textes ont été validés tels quels
      par le responsable. Le drapeau a été **allumé le 2026-10-19**, après
      validation du parcours en production par le responsable.
    - **Après un refus, un retrait ou un silence**, le portail ne propose plus
      le document (arbitrage du 2026-10-18). Si le patient redonne son accord,
      la dernière impression redevient téléchargeable. Chaque téléchargement
      relit l'accord sous verrou avant de servir et de journaliser.
- **Collecte documentaire : documents déposés par le patient ([[D-330]],
  J3-collecte) — déclarée le 2026-10-18, avant les tables.** Deux tables
  neuves, créées par la migration `documents_deposes_patient_v1`, **non encore
  appliquée** : release-db à approuver, puis constat par conteneur. Aucun code
  ne les écrit ni ne les lit avant ce constat, hors l'effacement nommé du
  dossier, livré avec la migration. Le dépôt lui-même ne s'ouvre qu'à la place
  4 de la file C (ACT-4), derrière un drapeau.
  - `DocumentDeposePatient` (`documents_deposes_patient`) garde **chaque
    document que le patient dépose** dans son dossier : un courrier, le compte
    rendu d'une consultation, la liste de ses traitements ou de ses
    compléments, ou un autre document utile à son accompagnement (texte de
    collecte de G-11). Une ligne porte : le dossier, **le document déposé**
    (PDF ou image, 10 Mio au plus ; une image est gardée réencodée, sans ses
    métadonnées, et son empreinte est celle des octets gardés ; les
    métadonnées d'un PDF — auteur, titre — ne sont pas retirées), son type,
    son empreinte SHA-256, la catégorie proposée par
    le patient, la date du dépôt, la date et l'auteur de la première
    consultation par le praticien, et, s'il y a lieu, la date, l'auteur et le
    motif du retrait. **Aucun nom de fichier** n'est gardé : il porte souvent
    l'identité du patient. Un même fichier déjà présent et non retiré est
    refusé.
  - `ClassementDocumentDepose` (`classements_documents_deposes`) trace
    chaque correction de catégorie par le praticien du dossier : le
    document, la catégorie, l'e-mail du praticien et la date, sans autre
    contenu. En ajout seul.
  - Les deux tables sont classées en catégorie particulière. Le document est
    figé ; la base n'admet que deux gestes, tous deux du seul praticien du
    dossier : la première consultation, datée, et le **retrait**, qui
    **efface le document et garde la ligne** (dates, motif « déposé par
    erreur » ou « demande de droit »). Le patient ne supprime pas lui-même un
    document : il en demande le retrait (« Signaler un problème », ou « Je
    souhaite exercer un droit »). RLS activée sans politique (contrat SQL
    négatif). Les deux tables seront **effacées nommément avec le dossier**,
    les classements puis les documents.
  - **Ce qui est nouveau.** Une collecte neuve, sur une base légale et une
    finalité inchangées : le suivi du patient par son praticien. **Aucun
    destinataire nouveau, aucun sous-traitant, aucune IA** : seul le praticien
    du dossier consulte un document, rien ne part hors de la base HDS, aucun
    outil d'intelligence artificielle ne le lit. Le compte rendu biologique
    garde son circuit à part ([[D-258]], [[D-269]]). Fermée à un mineur et à
    un dossier sans date de naissance ([[D-283]] §5, [[D-284]] §3).
  - **Information du patient : inchangée pour la migration.** Les tables
    restent vides jusqu'au code, livré derrière un drapeau éteint. Le texte de
    collecte de G-11, accepté le 2026-10-14, se lira à côté du dépôt ; « Vos
    données personnelles » se met à jour, en version distincte à valider,
    avant l'ouverture (ACT-4). **Ce paragraphe a été validé par le
    responsable le 2026-10-19**, note patient inchangée comprise, dans la PR
    de la migration, avant le merge.
  - **Ouverture (2026-10-20, ACT-4).** Le dépôt s'ouvre en production
    (drapeau `WN_PORTAIL_DEPOT_DOCUMENTS`, 19:58 UTC) : les tables sont
    désormais écrites par le dépôt du patient et lues par le praticien du
    dossier. L'information du patient est publiée avant l'ouverture, par la
    PR qui précède le drapeau (#1599) : « Vos données personnelles » v19 (la
    collecte, la lecture datée par le praticien, le retrait, les sauvegardes)
    et les conditions d'utilisation v2, dont la partie 3 la reprend ; l'e-mail
    des conditions v2 est envoyé le même jour aux patients suivis depuis le
    cockpit ([[D-292]] §3). La garde d'âge du dépôt (majeur seulement) tient
    lieu de J2-conf pour cette surface ([[D-330]], amendement du 2026-10-20).
- **Constat du praticien sur une hypothèse du parcours ([[D-331]], BP-11) —
  déclaré le 2026-10-19, avant les tables.** Deux tables neuves, créées par
  la migration `20261020100000_constats_praticien_v1` : PR relue,
  release-db à approuver, puis constat par conteneur ; aucun code ne les écrit ni ne les
  lit avant ce constat, hors l'effacement nommé du dossier, livré avec la
  migration. Le code qui les écrit naît derrière `WN_BIO_CONSTAT`, éteint.
  - `ConstatPraticien` trace **le jugement que le praticien du dossier
    porte sur une hypothèse** du parcours d'exploration (« confirmée »,
    « non retenue », « non évaluable », « sans objet »), ou le retrait de ce
    jugement. Une ligne porte : le dossier, l'acte (`pose` ou `retrait`),
    l'identifiant de l'hypothèse (un code du vocabulaire signé, jamais un
    texte), le verdict, un motif pris dans une **liste fermée** de neuf
    codes, une **note libre facultative** (obligatoire avec le motif
    « autre », 2000 caractères au plus), une date « à revoir le »
    facultative, le constat qu'il remplace, l'empreinte de la structure
    signée, l'e-mail du praticien, la date et un identifiant technique de
    la transaction (il lie les pièces à leur constat ; il ne dit rien du
    patient).
  - `PieceConstatPraticien` relie un constat à ses pièces : **une ligne de
    résultat de biologie ou une réponse de questionnaire du même dossier**,
    par sa clé, sans rien en recopier.
  - Les deux tables sont classées en catégorie particulière. Elles ne
    recopient **aucune valeur**, aucune unité, aucun analyte, aucune date de
    prélèvement (contrat SQL négatif). **La note libre peut contenir une
    donnée de santé, ou nommer un tiers** : l'écran demande de n'y recopier
    aucune valeur, sans que la base puisse le vérifier. En **ajout seul**
    (un retrait ou un remplacement est une ligne de plus), RLS activée sans
    politique ; la base refuse l'acte d'un autre praticien que celui du
    dossier. Elles seront **effacées nommément avec le dossier**, avant les
    réponses et les résultats qu'elles désignent.
  - **Ce qui est nouveau.** Un jugement du praticien, consigné et motivé,
    sur une base légale et une finalité inchangées : le suivi du patient
    par son praticien. **Aucun flux nouveau, aucun destinataire, aucun
    sous-traitant, aucune IA** : rien ne part hors de la base HDS ; le
    constat est lu par le seul praticien du dossier ; ni le portail, ni le
    courrier au médecin, ni le scoring, ni l'orientation, ni l'IA ne le
    lisent ([[D-122]], [[D-331]] §6).
  - **Information du patient : inchangée pour la migration.** Les tables
    restent vides jusqu'au code, livré derrière un drapeau éteint, et le
    patient ne voit aucun constat. Un constat est une note du praticien sur
    son dossier, de même nature que les notes de consultation déjà
    déclarées. L'information se relit avant l'ouverture du parcours
    (BP-21a), qui exige le registre et TRUST des tables lues. **Ce
    paragraphe est validé par le responsable le 2026-10-20**, note patient
    inchangée comprise, avant le merge de la migration.
- **Données physiologiques déclarées, traitements et compléments en cours
  ([[D-335]], BP-13) — déclarés le 2026-10-21, avant les tables.** Deux
  tables neuves, et une clé ajoutée à `PieceConstatPraticien`, créées par
  la migration seule `20261021100000_donnees_physiologiques_traitements_v1` :
  PR relue, release-db à approuver, puis constat par conteneur ; aucun code ne les écrit ni ne les lit avant ce constat, hors
  l'effacement nommé du dossier, livré avec la migration. Le code qui les
  écrit naît derrière `WN_PHYSIO_TRAITEMENTS`, éteint.
  - `DonneePhysiologique` porte **une déclaration ou une mesure datée** sur
    l'un de six critères : le **sexe déclaré** (féminin, masculin, autre,
    inconnu), le **statut menstruel** (cycles réguliers, irréguliers,
    absence de cycles, ménopause, inconnu), la grossesse, l'allaitement
    (oui, non, inconnu), le **poids** et la **taille** (mesure et date).
    Une ligne porte : le dossier, l'acte (`pose` ou `retrait`), le critère,
    la réponse ou la mesure, la date de la mesure, la source (« déclaré par
    le patient » ou « confirmé par le praticien »), la ligne qu'elle
    remplace, l'e-mail du praticien quand c'est lui qui la pose, et la date.
  - `TraitementEnCours` porte **un médicament ou un complément en cours**,
    tel que le patient le déclare ou que le praticien le confirme : la
    nature, le nom, la dose et le moment de prise, le motif ou l'objectif
    (textes libres, facultatifs), le début et la fin (au jour, au mois, à
    l'année, ou inconnus), « prescrit par un autre soignant » (oui, non,
    inconnu), la source, la ligne remplacée, l'e-mail du praticien quand
    c'est lui, et la date. **Aucune classe, aucun code de référentiel.**
  - `PieceConstatPraticien` reçoit une clé vers une ligne de traitement du
    même dossier : un constat de BP-11 peut citer un traitement comme pièce,
    sans rien en recopier.
  - **Ce qui est nouveau.** Deux données qui n'étaient **pas recueillies** :
    le sexe déclaré et le statut menstruel (catégorie particulière, art. 9 ;
    déclarés par le patient, jamais déduits ; « inconnu » toujours
    possible). Les traitements, la grossesse, l'allaitement, le poids et la
    taille étaient déjà recueillis par la fiche de renseignements, en texte
    libre : ils deviennent des lignes **datées, attribuées, confirmables**.
    Au portail, les médicaments et compléments se saisissent désormais en
    lignes, à la place des groupes de texte libre ; grossesse, allaitement,
    poids et taille restent des questions de la fiche (pas de doublon) ;
    les anciennes fiches restent lisibles telles quelles, sans conversion.
  - **Ce qui ne change pas.** Base légale et finalité : le suivi du patient
    par son praticien. **Aucun destinataire, aucun sous-traitant, aucun flux
    nouveau.** **Aucune de ces lignes ne part à l'IA** : aujourd'hui, les
    traitements de la fiche ne nourrissent que la ligne de vigilance que le
    code ajoute à la synthèse du premier bilan, après la réponse de l'IA,
    sans jamais lui être transmis ; elle lira les lignes en vigueur à la
    place des groupes de texte libre, sous la même forme. Ni l'orientation,
    ni le scoring, ni le courrier au médecin ne lisent ces lignes ; la garde
    de population ([[D-101]]) continue de lire la fiche de renseignements.
  - En **ajout seul** (une correction, une confirmation, un arrêt ou un
    retrait est une ligne de plus), RLS activée sans politique ; la base
    refuse la ligne d'un autre praticien que celui du dossier. Lues par le
    praticien du dossier et, pour ses propres lignes, par le patient. Un
    dossier mineur est hors périmètre ([[D-284]], garde d'âge). Les textes
    libres (nom, dose, motif) peuvent porter une donnée de santé ou nommer un
    tiers (le prescripteur, par exemple) : l'écran ne demande que ce qui est
    utile. **Effacées nommément avec le dossier**, après les pièces et les
    constats qui les citent.
  - **Information du patient : à renouveler avant l'ouverture.** « Vos
    données personnelles » v20 dit le sexe, le statut menstruel et les
    lignes de traitement ; texte proposé :
    `docs/claude/propositions/2026-10-21-bp13-texte-patient/README.md`.
    La migration n'en dépend pas (tables vides jusqu'au code, drapeau
    éteint) ; l'allumage de `WN_PHYSIO_TRAITEMENTS` exige sa publication.
    **Paragraphe et texte validés par le responsable le 2026-10-21**, puis
    corrigés le même jour (l'IA ne reçoit aucun traitement : un fait
    vérifié après la validation) et revalidés le même jour, avant la
    migration.
- **Décisions de parcours ([[D-343]], BP-15) — déclarées le 2026-10-22,
  avant la table.** Une table neuve, créée par la migration seule
  `decisions_parcours_v1` : PR relue, release-db à approuver, puis constat
  par conteneur ; aucun code ne l'écrit ni ne la lit avant ce constat, hors
  l'effacement nommé du dossier, livré avec la migration. Le code qui
  l'écrit naît derrière `WN_DECISIONS_PARCOURS`, éteint.
  - `DecisionParcours` trace **ce que le patient fait d'une version de son
    protocole et ce que le praticien décide à sa revue** : un choix du
    patient (préférence, refus), un événement de mise en œuvre (début,
    interruption, reprise, arrêt, avec la date où il a eu lieu, ou
    « inconnue ») ou une révision (maintenir, ajuster, arrêter). Une ligne
    porte : le dossier, l'acte (`pose` ou `retrait`), la version du
    protocole, l'action visée (facultative, par son identifiant), la
    nature, l'issue d'une révision, un motif pris dans une **liste
    fermée** (dont `effet_indesirable_rapporte` et `avis_autre_soignant`),
    une **note libre** (obligatoire avec `autre` et pour une préférence,
    2000 caractères au plus), la source (« rapporté par le patient » ou
    « constaté par le praticien »), la version suivante d'une révision
    `ajuster`, la ligne qu'elle remplace, l'e-mail du praticien et la date.
  - **Ce qui est nouveau.** Des faits sur la mise en œuvre du protocole,
    rapportés par le patient au praticien ou constatés par lui, et la
    décision de révision du praticien, **consignés, datés et motivés** sur
    une base légale et une finalité inchangées : le suivi du patient par
    son praticien. Catégorie particulière (art. 9) : un motif ou une note
    peuvent dire un effet indésirable rapporté ; la note peut nommer un
    tiers (un autre soignant). Aucun motif d'efficacité, aucune colonne de
    score, de résultat ou d'attribution (contrat SQL négatif).
  - **Ce qui ne change pas.** **Aucun destinataire, aucun sous-traitant,
    aucun flux nouveau, aucune IA** : rien ne part hors de la base HDS. Le
    praticien du dossier seul écrit et lit, au cockpit ; le patient ne voit
    rien ; ni le portail, ni le courrier au médecin, ni le scoring, ni
    l'orientation, ni l'IA ne lisent ces lignes. Le jour 0 du suivi et le
    contenu des versions du protocole ne changent pas. Un effet indésirable
    noté ici ne remplace pas le signalement de sécurité. Dossier mineur
    exclu. En **ajout seul** (une correction ou un retrait est une ligne de
    plus), RLS activée sans politique ; la base refuse la ligne d'un autre
    praticien que celui du dossier. **Effacées nommément avec le
    dossier**, avant les versions du protocole qu'elles désignent.
  - **Information du patient : inchangée pour la migration.** La table
    reste vide jusqu'au code, livré derrière un drapeau éteint, et le
    patient n'a aucune surface. Une décision de parcours est une note
    datée du praticien sur son dossier, de même nature que les notes de
    consultation déjà déclarées. L'information se relit avant l'ouverture
    du suivi (BP-21a). **Ce paragraphe est validé par le responsable le
    2026-10-22**, note patient inchangée comprise, avant le merge de la
    migration.
- **Transmission du compte rendu par le patient depuis son portail
  ([[D-269]], BIO-INGEST LOT-04) — déclarée le 2026-10-07, avant la
  migration et avant tout code.** Le patient peut déposer lui-même son
  compte rendu (PDF, photo ou scan) dans son espace. Le document rejoint
  `CompteRenduBiologique` avec son **origine** (`patient`), sans e-mail de
  praticien. Mêmes types, même taille et même nettoyage d'image que le dépôt
  praticien. Au plus 3 documents « en attente » ou « reçus » par dossier, et 10 dépôts par
  24 heures.
  - **Ce qui ne change pas.** Le dépôt n'appelle pas l'IA. Le document ne
    part chez Anthropic que lorsque le **praticien** lance la lecture, après
    avoir vérifié que c'est bien le compte rendu de ce patient. Le
    déclencheur ci-dessus (« un geste du praticien ») reste vrai : le dépôt
    patient ne déclenche rien. Les sous-traitants, l'hébergement, la
    validation ligne à ligne et la purge à 30 jours ([[D-258]]) sont
    inchangés.
  - **Ce qui est nouveau.**
    - **Le patient est émetteur.** Son document lui reste visible sous la
      forme d'une date et d'un statut : en attente, reçu, validé, refusé ou
      illisible. Il ne voit jamais de valeur, de libellé ni de marquage.
    - **Un motif de purge s'ajoute, `ecarte`.** Le praticien peut écarter un
      document transmis, motif `illisible` ou `document_non_conforme`, sans
      texte libre : le contenu est purgé aussitôt, l'empreinte reste. Un
      document transmis ne se « retire » pas, il s'écarte.
    - **Un document qui n'est pas celui du patient** (celui d'un tiers)
      peut entrer en base HDS. Il n'en sort pas avant le regard du praticien.
      Il est purgé à l'écart, au plus tard à 30 jours. C'est le risque propre
      de ce flux, réduit par l'absence d'extraction automatique.
  - **Information du patient : accusé exigé avant le premier dépôt.** La
    route de dépôt refuse tout dépôt sans un accusé `pris_connaissance` de
    la version **courante** de « L'intelligence artificielle dans
    Wellneuro ». Textes **validés par le responsable le 2026-10-07**, avec ce
    paragraphe :
    - **`usage_ia` v6.** Dans le paragraphe du relevé, la phrase « lorsque
      votre praticien dépose dans votre dossier le compte rendu que vous lui
      avez remis » devient : « lorsque votre praticien dépose dans votre
      dossier le compte rendu que vous lui avez remis, ou que vous l'y
      déposez vous-même depuis votre espace ». Une phrase s'ajoute : « Si
      vous le déposez vous-même, rien n'en est relevé tant que votre
      praticien n'a pas lancé la lecture : il vérifie d'abord qu'il s'agit
      bien de votre compte rendu. »
    - **`donnees_confidentialite` v13.** « Les informations que vous
      transmettez » ajoute : « les comptes rendus d'analyses que vous déposez
      dans votre espace ». La phrase de la purge ajoute : « ou dès qu'il
      l'écarte, s'il est illisible ou s'il ne s'agit pas de votre compte
      rendu ». Accusé exigé, comme la v12.
  - **Conditions de pose de `WN_BIO_PORTAIL_ENABLED`**, toutes préalables :
    1. ce paragraphe validé par le responsable — **tenue le 2026-10-07** ;
    2. la migration appliquée et constatée par conteneur — **tenue le
       2026-10-07** (`one-off-4793`) ;
    3. la v6 et la v13 servies, et le déploiement constaté ([[D-248]]) —
       **tenue le 2026-10-07** (`one-off-810`).

    **Drapeau posé le 2026-10-07 à 17:53 UTC**, effet constaté (route du
    portail en `401` sans session au lieu de `503`). Le praticien voit le
    document avant d'en lancer la lecture (« Voir le document », §1).

    La DPA Anthropic est déjà demandée (2026-10-01) : aucun sous-traitant
    nouveau.
    2026-10-14 : réponse reçue le 2026-10-02, DPA et CCT intégrés aux Conditions commerciales (rubrique 7) ; restent copie datée, date d'acceptation, localisation de l'inférence et rétention, échéance 2027-06-30 ([[D-283]] §9).

**Information du patient, publiée par le même geste** : « L'intelligence
artificielle dans Wellneuro » **v4** et « Vos données personnelles » **v11**
(`registre.ts`). La v11 remplace la phrase venue de la v6, « Ces résultats sont
saisis par votre praticien », qui devenait fausse, et ajoute le relevé à la
ligne Anthropic. **Accusé exigé sur la v11** : seule la version courante en
réclame un, et sans lui l'accusé de la v10 encore dû s'effaçait. Pas d'accusé
sur la v4, que la séquence « Avant de commencer » ne présente pas. **Ce que
cet accusé ne prouve pas** : l'écran de la séquence qui le recueille ne montre
pas la transmission du compte rendu. Un accusé `pris_connaissance` de la v11
atteste que le document courant a été présenté et reconnu. Il ne prouve pas que
cette phrase a été lue, et ne doit pas être cité comme tel.

**L'information est faite par le document, pas par la personne — arbitrage du
responsable, 2026-10-01.** L'accusé de la v11 n'atteint un patient qu'à sa
prochaine visite au portail, et la production montre qu'on y entre le jour même
ou jamais (rubrique 14, ligne « Information »). Une fois le drapeau posé, un
compte rendu peut donc partir en entier chez Anthropic pour un patient qui n'a
lu que la v10, ou rien. **Ce cas est accepté** : aucun garde n'exige l'accusé de
la v11 avant une extraction, et la déclaration se lit « publiée avant
activation » pour le document servi, pas « reçue avant activation » par chaque
patient. Revue `wn-reviewer` du 2026-10-01 (P1), écartée avec ce motif.

**Conditions de pose du drapeau d'extraction (LOT-02)**, toutes **préalables** :

1. la v4 et la v11 publiées, c'est-à-dire mergées **et déployées**, le
   déploiement constaté ([[D-248]]) ;
2. le présent paragraphe validé par le responsable — **validé le 2026-10-01**,
   après sa rédaction (les textes patient l'avaient été par le plan, avant) ;
3. **la demande de DPA à Anthropic envoyée**
   (`docs/rgpd/DEMANDE_DPA_ANTHROPIC.md`), sa date établie par une trace du
   fil (lecture directe, ou capture du message montrant en-têtes et corps) et
   non déclarée. Arbitrage du 2026-10-01 : l'envoi est exigé, pas la signature.
   **Tenue le 2026-10-01 à 17:34 UTC (19:34 heure de Paris)**, établie par la capture du message
   envoyé (expéditeur, heure, corps), lue en session.

La condition s'écrira aussi **sur la ligne du drapeau** dans
`docs/FEATURE_FLAGS.md` quand le LOT-02 le créera. Une condition qui ne vit que
dans ce dossier est une condition qu'on manque (§2).

**Ce que ce paragraphe ne fait pas** : il ne qualifie ni la base légale
(rubrique 3) ni le transfert (rubrique 7). Ces deux actes reviennent au
responsable avec son conseil.

## 3. Base légale

**Qualifiée par le responsable du traitement le 2026-10-04** ([[D-265]] §3).
Ce dossier réservait la qualification à un conseil qualifié ; le responsable la
prend en charge. Les bases ci-dessous sont **ses déclarations**, rendues en
session sur la liste des bases du règlement, sans qu'aucune lui soit
recommandée, et consignées par l'assistant.

| Traitement | Où il est décrit | Article 6 (licéité) | Article 9 (condition, données de santé) | Justification | Écrit par | Date |
|---|---|---|---|---|---|---|
| Accompagnement en neuronutrition : questionnaires, anamnèse, consultations, résultats biologiques, documents remis | rubrique 2 | 6.1.a — consentement | 9.2.a — consentement explicite | Choix déclaré par le responsable le 2026-10-04 | Responsable (déclaration en session, consignée par l'assistant) | 2026-10-04 |
| Synthèse préparée sans geste du praticien | rubrique 2 bis | 6.1.a — consentement (même base que l'accompagnement) | 9.2.a — consentement explicite (même base) | Choix déclaré par le responsable le 2026-10-04 | Responsable (déclaration en session, consignée par l'assistant) | 2026-10-04 |
| Relevé des comptes rendus biologiques par IA vision | rubrique 2 ter | 6.1.a — consentement (même base que l'accompagnement) | 9.2.a — consentement explicite (même base) | Choix déclaré par le responsable le 2026-10-04 | Responsable (déclaration en session, consignée par l'assistant) | 2026-10-04 |
| Correspondance avec le médecin traitant — voie ordinaire, accord du patient exigé ([[D-219]] §3) | rubrique 6 | 6.1.a — consentement | 9.2.a — consentement explicite | Choix déclaré par le responsable le 2026-10-04 | Responsable (déclaration en session, consignée par l'assistant) | 2026-10-04 |
| Lettre d'adressage sur signal d'alerte — voie d'exception, maintenue malgré un refus ([[D-234]], [[D-265]] §2) | rubrique 6 | 6.1.d — sauvegarde des intérêts vitaux | 9.2.h — prise en charge sanitaire par un professionnel de santé soumis au secret (art. 9.3) | Choix déclaré par le responsable le 2026-10-04 | Responsable (déclaration en session, consignée par l'assistant) | 2026-10-04 |
| *Tout autre traitement que le responsable identifie* | | | | | | |

La ligne de la voie d'exception porte la base que [[D-234]] laissait ouverte :
cette voie transmet une donnée de santé à un tiers malgré un refus exprimé, et
ne peut pas reposer sur le consentement qui fonde la voie ordinaire
(rubrique 6).

Ce qui existe, et qui n'en tient pas lieu :

- des **consentements recueillis** en phase de test
  (`CHECKLIST_ACTIVATION_G_TRUST_04.md` §« Le consentement recueilli », et le
  document `CONSENTEMENT_SUIVI_V1` du registre trust) ;
- une **décision du responsable** invoquant ces consentements et l'information
  RGPD déjà délivrée pour autoriser des données réelles (`docs/DECISIONS.md`
  D-006, 2026-07-28).

Un consentement recueilli n'est pas la même chose qu'une base légale
qualifiée, et la qualification d'un traitement de données de santé ne se déduit
pas d'un fichier. **Seul le responsable écrit un article dans la trame
ci-dessus** ([[D-265]] §3) ; une session n'en propose aucun. La checklist du
gate porte déjà, sur un sujet voisin, la démonstration de ce qu'une intuition
juridique non vérifiée coûte (§ consentement ≠ HDS).

## 4. Catégories de personnes concernées

**Source.** Patients du cabinet, et le praticien lui-même (données de connexion
et journal d'accès). Relevé **daté du 2026-07-21**
(`CHECKLIST_ACTIVATION_G_TRUST_04.md`) : **17 patients, dont 3 graines
fictives**, et **13 accès portail ouverts**.

Ce chiffre est un relevé, pas un effectif courant : il n'est pas régénéré par
ce document.

**Tranché le 2026-10-13 ([[D-283]] §5).** Les mineurs sont **encadrés**, non
exclus : consentement du titulaire de l'autorité parentale, textes dédiés,
garde d'âge, circuit des droits adapté. Aucune surface neuve ne leur est
ouverte avant ce consentement ; les surfaces déjà en service restent ouvertes.
Un dossier sans âge connu est traité comme celui d'un mineur pour toute
fonction neuve, sauf la fiche signalétique. **Reste ouvert** : le seuil d'âge
(majorité civile ou seuil de la loi Informatique et Libertés), avec un conseil.

**Amendé le 2026-10-13 ([[D-284]] §3-4), sur l'avis reçu le même jour.**
- **Seuil : 18 ans.** Le seuil de 15 ans de la loi Informatique et Libertés
  (art. 45) ne fait basculer aucun dossier.
- **Entrée validée par un titulaire de l'autorité parentale.** Un seul suffit,
  l'autre étant présumé d'accord.
- **Désaccord connu entre les titulaires : traitement manuel.**
- **Âge inconnu.** Toutes les fonctions de santé sont concernées, pas les
  seules fonctions neuves. La date de naissance est demandée à la prochaine
  connexion, avant tout autre geste. Tant qu'elle manque, les questionnaires
  et la biologie sont en pause.
- **Dossiers concernés au constat du 2026-10-13** (agrégats) : 15 sans date de
  naissance sur 32, aucun de moins de 21 ans.
- **Reste à faire valider par un avocat** : les 15–17 ans (renvoi de l'avis).
  Préalable de J3-mineurs depuis le 2026-10-22 ([[D-342]] §5) ; la règle de
  18 ans reste en service d'ici là.

**Mise en œuvre du lot (h), 2026-10-14.** Au portail, la date se demande juste
après « Avant de commencer » et avant tout le reste. Elle se fait confirmer,
s'enregistre seulement si celle du dossier manque ou est illisible, et ne se
corrige ensuite que par le praticien. La pause est tenue par les **routes**,
pas par l'écran : soumission d'un questionnaire, anamnèse, agendas du sommeil
et alimentaire, dépôt d'un compte rendu biologique. Périmètre arbitré par le
responsable le 2026-10-14 : questionnaires (agendas compris) et biologie
seulement. Le suivi du protocole, l'alliance, le signalement d'un effet
indésirable et les demandes de droits restent ouverts. **Un mineur reste en
pause** tant que son circuit (lot (i)) n'existe pas : fail-closed. Il garde
l'accès à son parcours. Le praticien voit l'état sur la fiche administrative.
Information du patient : « Vos données personnelles » v17, accusé exigé.
Constat du 2026-10-14 (agrégats) : 15 dossiers actifs sans date de naissance
sur 31.

*Antérieurement :* le traitement de données de **mineurs** n'était ni exclu ni
encadré (point resté « à valider » dans
`docs/claude/campagnes/2026-07-15-trust-information-patient-droits-v1/SOURCES_ET_VALIDATIONS.md`).

## 5. Catégories de données

**Source.** `web/prisma/schema.prisma`, 67 modèles au 2026-08-07. La
qualification « données de santé, art. 9, catégorie particulière » n'est pas
tirée du schéma — qui ne la porte pas — mais reprise de
`docs/PROCEDURE_VIOLATION_DONNEES.md`, où elle est déjà écrite. Les données
personnelles se répartissent ainsi :

| Catégorie | Modèles | Nature |
|---|---|---|
| Identité et contact | `Patient` (email, prénom, nom, date de naissance, téléphone, **adresse postale** depuis le 2026-09-16) | Données ordinaires |
| **Identifiant de sécurité sociale (NIR)** | `Patient.nir` — recueilli du **2026-09-16** au **2026-10-13** (recueil cessé par [[D-284]] §2 ; champ retiré de la fiche, de l'écriture et de l'export le 2026-10-14, lot (g)), sur demande du responsable | **Recueil CESSÉ le 2026-10-13 ([[D-284]] §2)** : pour un responsable qui n'est pas professionnel de santé, et pour cette finalité, le NIR n'a pas de fondement (loi Informatique et Libertés, art. 30, et décret cadre NIR). **Aucun numéro n'était enregistré** au constat du 2026-10-13 (agrégats), il n'y a donc rien à purger. **Lot (g), 2026-10-14** : le champ a quitté la fiche du praticien, la route n'écrit ni ne sert plus la colonne (un ancien écran qui l'enverrait est ignoré), l'export PDF n'en porte plus la ligne ; le masquage des textes libres a cessé de la lire avec le retrait de la colonne. Le patient en est informé par « Vos données personnelles » **v16, accusé exigé** — non pour le retrait lui-même, mais parce que seule la version courante réclame un accusé et que celui de la v15, publiée le même jour, n'avait encore été posé par aucun dossier actif (arbitrage du responsable, 2026-10-14). **Colonne retirée de la base le 2026-10-20** (t03, lot (g) de [[D-284]]) : migration `20261019190000_patients_retrait_nir_v1`, appliquée par release-db (run 39340724658, sentinelle reçue), qui refusait de s'appliquer si une ligne portait encore un numéro ; constat par conteneur du même jour, colonne et contrainte de forme absentes, 0 numéro sur 34 dossiers au recomptage précédent. La colonne `Patient.nir` et ses usages dédiés (fiche, écriture, export, masquage) ont disparu. **Reste un risque** : un NIR saisi librement dans un texte (fiche, anamnèse, synthèse) n'est pas masqué dans l'export pseudonymisé — détection par forme à écrire (plan, dettes, revue CodeRabbit de #1567). *Antérieurement : le recueil avait été maintenu le 2026-10-13 ([[D-283]] §4), sous réserve d'un conseil.* CE N'EST PAS UNE DONNÉE ORDINAIRE, et sa qualification appartient au responsable de traitement — ce dossier la DÉCLARE et ne la pose pas, comme il ne la pose pas pour les deux tables de gestes praticien motivés ci-dessous. Trois faits qui bornent ce qu'elle est : c'est un **NIR déclaré**, saisi par le praticien et **jamais qualifié par téléservice** (ce n'est donc pas une INS au sens du référentiel national) ; il **ne sert d'identifiant à rien** — l'identité du dossier reste `id_patient`, l'unicité reste portée par `email` — et aucun appariement n'est fait sur lui ; il n'est **ni chiffré au repos ni masqué**, comme le reste du dossier (rubrique 10), ce qui est un choix daté du 2026-09-16 et non un oubli. Déclaré au patient par le document « Vos données personnelles » **v8, avec accusé de réception exigé** |
| Médecin traitant du dossier | `Patient.medecinTraitantNom`, `Patient.medecinTraitantCoordonnees` — recueillis depuis le **2026-09-16** | **Qualifié le 2026-10-13 ([[D-283]] §3) : le lien patient ↔ médecin est une donnée de santé du patient (art. 9) ; les coordonnées professionnelles du médecin sont ordinaires, et il est informé à la première lettre adressée.** Données d'un TIERS — un professionnel de santé qui n'est pas la personne concernée. *Avant le 2026-10-13, il n'était pas informé et la qualification n'était pas posée.* **Distinct de `CorrespondanceMedecin.medecinLibelle`**, texte libre saisi par courrier et non attaché au dossier : ces deux colonnes-ci disent « le médecin traitant de ce patient », l'autre disait « le destinataire de cette lettre » |
| **Santé (art. 9)** | `Consultation`, `QuestionnaireReponse`, `SyntheseIA`, `AssessmentEpisode`, `ProtocolDraft`, `ProtocolCheckin`, `AgendaSommeilNuit`, `AgendaAlimentaireJour`, `CorrespondanceMedecin`, `CorrespondancePatient`, `BookletEnvoi`, `RelectureNote`, `TrustAdverseEffectReport`, `TrustAdverseEffectVerdict` ; et depuis le 2026-10-13 ([[D-283]] §3) `Assignation`, `CritereDossierConstate`, `ProtocolDiffusionApproval`, `PackProposition`, `EnvoiBrouillon`, `RendezVous` — chacune associe un patient nommé à un geste de soin | **Catégorie particulière** |
| **Santé — exploration biologique (art. 9)** | `ArbitrageBiologique`, `PanelBiologieDocumente`, `DocumentPatientBiologie`, `ResultatBiologique` | **Catégorie particulière** — voir le paragraphe ci-dessous |
| **Santé — comptes rendus biologiques déposés et lignes candidates (art. 9)** ([[D-256]] A4, déclaré le 2026-10-01 **avant** leur création) | Tables du LOT-02 de BIO-INGEST, **nommées ici par la migration qui les crée** (`bio_ingest_staging_v1`, 2026-10-01) : `CompteRenduBiologique` (le document source), `ImportBiologique` (le lot d'import : une extraction, avec son modèle, sa version du procédé et le laboratoire tel que lu), `LigneBiologiqueCandidate` (les lignes candidates : libellé, valeur, unité et date du prélèvement tels que lus, l'intervalle de référence et la marque d'anomalie tels qu'imprimés — `intervalle_lu`, `marquage_lu`, migration `bio_ingest_faits_laboratoire_v1` du 2026-10-05, [[D-267]] ; deux indicateurs d'omission, sans contenu, quand l'un dépasse sa borne technique, §10 — ; les commentaires du laboratoire tels qu'imprimés, sur la ligne et sur l'import, et leurs indicateurs d'omission — `commentaire_lu`, `commentaires_lus`, migration `bio_ingest_commentaires_laboratoire_v1` du 2026-10-10, [[D-278]] §3, texte libre pouvant nommer un tiers —, puis la décision du praticien) ; et depuis [[D-282]] (G3, déclaré le 2026-10-13 avant sa migration `g3_travaux_extraction_biologique_v1`) `TravailExtractionBiologique` (file technique des lectures : dossier, compte rendu, import courant, praticien demandeur, statut, tentatives, réservation, motif d'échec, dates — aucune donnée lue ; purgé 30 jours après sa fin) ; et depuis [[D-284]] §5 (lot (j), déclaré le 2026-10-14 avant sa migration `bio_ingest_masquage_identite_v1`) `MasquageCompteRendu` (une image JPEG par page du compte rendu, l'identité du patient noircie par le praticien, ou sa déclaration « aucune identité sur ce document » ; nombre de zones, praticien, date — ce sont ces pages, et elles seules, qui partiront chez Anthropic une fois le code du lot livré) | Même nature que `ResultatBiologique`, dont elles sont l'amont. Elles ajoutent **le document lui-même**, conservé en base HDS (A2) avec son en-tête d'identité et toutes ses valeurs, y compris celles qui ne seront pas retenues. Envoyé en entier à Anthropic pour extraction (§2 ter, rubrique 7) jusqu'au lot 2 du masquage ([[D-284]] §5) ; depuis, seules les pages masquées partent. **Les pages masquées** (`MasquageCompteRendu`) sont des données de santé du même document, sans l'identité : elles sont **purgées par la base dans la même instruction que le document** (trigger, quel que soit le motif de la purge) et effacées avec le dossier (IDP2). Durée de conservation du **document** : jusqu'à la décision de toutes les lignes de son extraction courante, **30 jours au plus** ([[D-258]], rubrique 8) ; son empreinte, les extractions et les lignes lues restent (provenance, A5), faits du laboratoire compris ([[D-267]] §3), sans durée fixée — trou de la rubrique 8. **Émetteur ([[D-269]], déclaré le 2026-10-07 avant sa migration)** : le document porte son origine, `praticien` ou `patient` (dépôt depuis le portail, sans e-mail de praticien). Un document transmis par le patient peut être écarté par le praticien (`illisible` ou `document_non_conforme`, sans texte libre) : son contenu est alors purgé aussitôt |
| **Santé — acte de lecture clinique d'un import validé (art. 9)** ([[D-268]], déclaré le 2026-10-06 **avant** la création de la table) | `LectureImportBiologique` (dossier, import, acte `lecture` ou `revocation`, code de révocation pris dans une liste fermée — `acte_pose_par_erreur`, `mauvais_import`, `lecture_a_refaire` —, e-mail du praticien, date). Créée par la migration `lectures_imports_biologiques_v1` (2026-10-06), **appliquée** en production le 2026-10-06 (`release-db`, constat par conteneur) ; écrite et lue derrière `WN_BIO_LECTURE_ENABLED`, éteint à la livraison | **Même nature que `ResultatBiologique`, dont elle est l'aval.** Elle ne recopie aucune valeur, aucun libellé et aucun marquage. Elle dit seulement : « ce patient a un import biologique validé, et son praticien l'a lu ou a révoqué sa lecture ». Elle est écrite en ajout seul, par le praticien du dossier seul ([[D-268]] §5). Aucun texte libre n'y est saisi. Rien n'en part vers un tiers. Elle est effacée nommément avec le dossier (rubrique 8) |
| **Santé — annulation d'un résultat de biologie saisi par erreur (art. 9)** ([[D-294]], déclaré le 2026-10-14 **avant** la création de la table) | `AnnulationResultatBiologique` (dossier, résultat visé, acte `annulation` ou `revocation`, motif d'annulation pris dans une liste fermée — `mauvais_dossier`, `mauvaise_date_prelevement`, `mauvais_analyte` —, motif de révocation pris dans une liste fermée — `mauvais_resultat_annule`, `resultat_verifie_exact`, `motif_annulation_errone` —, e-mail du praticien, date). Créée par la migration `annulations_resultats_biologiques_v1` (2026-10-14), **non encore appliquée** (release-db à approuver) | **Même nature que `ResultatBiologique`, dont elle est l'aval.** Elle ne recopie aucune valeur, aucun analyte et aucune date. Elle dit seulement : « ce résultat de ce patient a été saisi par erreur, pour ce motif », ou que ce retrait est révoqué. Elle est écrite en ajout seul, par le praticien du dossier seul. Aucun texte libre n'y est saisi. Rien n'en part vers un tiers. Elle sera effacée nommément avec le dossier (rubrique 8) |
| **Santé — statut posé par le praticien près d'une valeur biologique (art. 9)** ([[D-322]], déclaré le 2026-10-18 **avant** la création de la table) | `StatutPoseResultatBiologique` (dossier, ligne de résultat visée, acte `pose` ou `retrait`, statut pris dans une liste fermée — `aucune_action_retenue`, `a_suivre`, `contexte_a_preciser`, `donnee_a_verifier`, `avis_medical_a_envisager`, `relie_au_protocole` —, e-mail du praticien, date). Créée par la migration `statuts_poses_resultats_biologiques_v1` (2026-10-18), **non encore appliquée** (release-db à approuver) | **Même nature que `ResultatBiologique`, dont elle est l'aval.** Elle ne recopie aucune valeur, aucun analyte et aucune date de prélèvement. Elle dit seulement : « pour cette valeur de ce patient, le praticien retient ce geste », ou qu'il le retire. Elle est écrite en ajout seul, par le praticien du dossier seul, et lue par lui seul. Aucun texte libre n'y est saisi. Rien n'en part vers un tiers. Elle sera effacée nommément avec le dossier (rubrique 8) |
| **Santé — document pour le médecin imprimé et remis par le patient (art. 9)** ([[D-307]], déclaré le 2026-10-18 **avant** la création des tables) | `DocumentMedecinImprime` (dossier, synthèse validée, e-mail du praticien, **HTML imprimé recopié tel quel** et son empreinte SHA-256, date) ; `TelechargementDocumentMedecin` (dossier, impression téléchargée, date). Créées par la migration `documents_medecin_imprimes_v1`, **appliquée le 2026-10-18** (run `release-db` 39144243510). **Écrites depuis F38 code** : l'impression confirmée est tracée dès le déploiement ; le téléchargement au portail est derrière `WN_DOCUMENT_MEDECIN_PATIENT`, **allumé le 2026-10-19** après constat sur un dossier de test | **Même nature que `SyntheseIA`, dont l'impression recopie le rendu médecin.** Instantané figé à l'impression ; chaque téléchargement du patient est une ligne datée ; le patient reçoit la dernière impression. Écrites en ajout seul ; l'impression est faite par le praticien du dossier seul, et elle sera bloquée si le patient a refusé ou retiré le partage avec son médecin traitant, ou ne s'est pas prononcé. Après un refus, un retrait ou un silence, le portail ne propose plus le document ; un accord redonné le rend (arbitrage du 2026-10-18). Destinataire : **le patient lui-même**, dans son portail — il remet le document à son médecin, hors de l'application ; aucun tiers. Conservées la vie du dossier et effacées nommément avec lui (rubrique 8) |
| **Santé — documents déposés par le patient (art. 9)** ([[D-330]], J3-collecte, déclaré le 2026-10-18 **avant** la création des tables) | `DocumentDeposePatient` (dossier, **document déposé tel quel**, type, empreinte SHA-256, catégorie proposée, date de dépôt, date et auteur de la première consultation, date, auteur et motif du retrait ; aucun nom de fichier) ; `ClassementDocumentDepose` (dossier, document, catégorie, e-mail du praticien, date). Créées par la migration `documents_deposes_patient_v1`, **appliquée le 2026-10-19** (run `release-db` 39290340495) ; écrites par le dépôt du patient depuis son ouverture le 2026-10-20 (ACT-4, drapeau `WN_PORTAIL_DEPOT_DOCUMENTS`), information du patient publiée le même jour (« Vos données personnelles » v19, conditions d'utilisation v2 et leur e-mail aux patients suivis) | **Document de santé remis par le patient lui-même**, sans IA. Figé, sauf la première consultation et le retrait, par le seul praticien du dossier ; le retrait efface le contenu et garde la ligne. Destinataire : le praticien du dossier seul ; aucun tiers, aucun sous-traitant. Conservées avec le dossier et effacées nommément avec lui (rubrique 8) |
| **Santé — constat du praticien sur une hypothèse du parcours (art. 9)** ([[D-331]], BP-11, déclaré le 2026-10-19 **avant** la création des tables) | `ConstatPraticien` (dossier, acte `pose` ou `retrait`, hypothèse par son code, verdict — `confirmee`, `non_retenue`, `non_evaluable`, `sans_objet` —, motif pris dans une liste fermée — `pieces_ne_soutiennent_pas`, `autre_hypothese_retenue`, `contexte_explique`, `piece_attendue_manquante`, `contexte_inconnu`, `donnee_a_verifier`, `hors_population`, `question_ne_se_pose_plus`, `autre` —, note libre facultative, date « à revoir le » facultative, constat remplacé, empreinte de la structure signée, e-mail du praticien, date, identifiant technique de la transaction) ; `PieceConstatPraticien` (constat, ligne de résultat de biologie **ou** réponse de questionnaire du même dossier). Migration `20261020100000_constats_praticien_v1` (PR de migration seule), à appliquer par release-db | **Jugement du praticien sur son dossier**, aval de `ResultatBiologique` et de `QuestionnaireReponse`. Aucune valeur, aucun analyte, aucune date de prélèvement recopiés. Une note libre facultative peut porter une donnée de santé ou nommer un tiers. En ajout seul, par le praticien du dossier seul, lu par lui seul. Rien n'en part vers un tiers. Effacées nommément avec le dossier (rubrique 8) |
| **Santé — données physiologiques déclarées, traitements et compléments en cours (art. 9)** ([[D-335]], BP-13, déclaré le 2026-10-21 **avant** la création des tables) | `DonneePhysiologique` (dossier, acte `pose` ou `retrait`, critère — `sexe_declare`, `statut_menstruel`, `grossesse`, `allaitement`, `poids`, `taille` —, réponse fermée ou mesure, date de la mesure, source « déclaré par le patient » ou « confirmé par le praticien », ligne remplacée, e-mail du praticien s'il la pose, date) ; `TraitementEnCours` (dossier, acte, nature `medicament` ou `complement`, nom, dose, moment de prise, motif ou objectif, début et fin avec leur précision, prescrit par un autre soignant, source, ligne remplacée, e-mail du praticien s'il la pose, date) ; clé `id_traitement` ajoutée à `PieceConstatPraticien`. Migration `20261021100000_donnees_physiologiques_traitements_v1` (PR de migration seule), à appliquer par release-db | **Déclarations du patient et confirmations du praticien**, datées. Nouveau : sexe déclaré et statut menstruel, jamais déduits, « inconnu » possible ; le reste était déjà recueilli en texte libre par la fiche de renseignements. Aucune classe ni code de référentiel, aucun IMC. Textes libres (nom, dose, motif) pouvant nommer un tiers. En ajout seul ; écrit par le patient (ses lignes) et le praticien du dossier ; lu par eux seuls ; rien ne part à l'IA (la ligne de vigilance de la synthèse, écrite par le code, lit les traitements en vigueur comme aujourd'hui ceux de la fiche). Dossier mineur exclu. Effacées nommément avec le dossier (rubrique 8) |
| **Santé — décisions de parcours sur une version du protocole (art. 9)** ([[D-343]], BP-15, déclaré le 2026-10-22 **avant** la création de la table) | `DecisionParcours` (dossier, acte `pose` ou `retrait`, version du protocole, action facultative, nature — `preference`, `refus`, `debut`, `interruption`, `reprise`, `arret`, `revision` —, issue d'une révision — `maintenir`, `ajuster`, `arreter` —, motif pris dans une liste fermée, note libre, date de l'événement ou « inconnue », source « rapporté par le patient » ou « constaté par le praticien », version suivante, ligne remplacée, e-mail du praticien, date). Migration `decisions_parcours_v1` (PR de migration seule), à appliquer par release-db | **Faits de mise en œuvre et décision de révision**, consignés par le praticien du dossier seul, datés et motivés. Aucun motif d'efficacité, aucune colonne de score, de résultat ou d'attribution. Un motif ou une note peuvent dire un effet indésirable rapporté ; la note peut nommer un tiers. En ajout seul ; lu par le praticien du dossier seul ; aucune surface patient ; rien ne part à l'IA. Dossier mineur exclu. Effacées nommément avec le dossier (rubrique 8) |
| **Santé — fiches d'assiette remises au patient (art. 9)** (`D-251`) | `FicheAssietteRemise` (dossier, clic « Valider pour diffusion » qui l'a remise, action du protocole, version de la fiche remise et son empreinte, date de remise) | **Catégorie particulière — qualification du responsable de traitement, rendue le 2026-09-28.** La table ne recopie aucun texte, mais la version désigne une assiette, et **le nom d'une assiette révèle une indication** (`D-251` §9). Elle est rangée en art. 9 comme le protocole qui la porte (`ProtocolDraft`). Elle a été créée par la migration M2 (lot 7, appliquée le 2026-09-28). Elle s'alimente au clic « Valider pour diffusion » depuis l'ouverture de `WN_FICHES_ASSIETTE` (2026-09-28) ; la lecture patient est ouverte depuis le 2026-09-29 (`WN_FICHES_ASSIETTE_LECTURE`). Elle était encore vide à cette seconde ouverture (constat par conteneur). Le patient en est averti par un e-mail neutre qui ne nomme ni l'assiette ni la fiche (type `document_remis` du registre des correspondances). Elle est effacée nommément avec le dossier. La lecture de la fiche par le patient s'accuse dans `PortailLecturePatient`, espèce `fiche_assiette`, sans horodatage ; [[D-297]] (déclaré le 2026-10-14, avant sa migration) y ajoute le seul jour de la première ouverture, vu du praticien, vide pour les lectures antérieures : colonne `lu_le` (type date, sans défaut), créée par la migration `20261018150000_portail_lectures_lu_le_v1` (2026-10-18, appliquée le même jour : release-db 39134432362, constat par conteneur), dont deux triggers imposent le jour de l'horloge de la base, refusent toute modification du jour et tout changement du document lu. Elle s'écrit depuis le code de ai (2026-10-18), avec la phrase « Votre lecture est datée » en tête de chaque page qui consigne une lecture — protocole compris — ; seul l'encart praticien « Documents remis » la lit, sans compte ni agrégat. Elle restait vide jusqu'au code de ai, qui l'écrit avec la phrase « Votre lecture est datée » |
| **Santé — adressage sur signal d'alerte (art. 9)** ([[D-257]], déclaré le 2026-10-02 **avant** toute écriture) | `AdressageSignalAlerte` (dossier, acte `adressage` ou `revocation`, lettre d'adressage consignée qui porte la couverture, consultation porteuse, identifiants des constats de sécurité couverts, motif de révocation, e-mail du praticien, date) | **Même nature que `CorrespondanceMedecin`, dont elle est le prolongement.** Elle ne recopie aucun libellé de signal, mais chaque identifiant de constat est l'empreinte d'un signal d'alerte **déclaré par le patient** dans son anamnèse : la ligne dit « ce patient a déclaré un signal qui appelle un avis médical, et il a été adressé ». Créée par la migration `adressages_signal_alerte_v1` (appliquée le 2026-10-03, run `release-db` n° 131). **Alimentée depuis le LOT-03** : une ligne `adressage` s'écrit à chaque lettre d'adressage consignée, dans la même transaction ; une ligne `revocation` au geste de révocation motivé. **Lue depuis le LOT-04** par la chaîne C1 (lecteur unique `lireCouverturesAdressage`), et seulement drapeau `WN_LEVEE_ADRESSAGE` allumé ; éteint à la livraison, la table n'est lue par aucune surface hors la route de révocation, qui vérifie sa cible. Rien n'en part vers un tiers : la lettre, elle, est déjà déclarée. Effacée nommément avec le dossier |
| **Santé — lettres d'adressage remises au patient (art. 9)** ([[D-262]], déclaré le 2026-10-03 **avant** toute écriture) | `LettreAdressageRemise` (dossier, clic « Valider pour diffusion » qui l'a remise, lettre d'adressage consignée, **texte de la lettre recopié tel qu'il est remis** et son empreinte SHA-256, date de remise) | **Même nature que `CorrespondanceMedecin`, dont elle recopie le texte** : la lettre nomme les signaux d'alerte déclarés par le patient. Instantané figé à la remise, pour qu'une révision du gabarit ne change pas ce que le patient a reçu. Créée par la migration `lettres_adressage_remises_v1` (LOT-01) ; Appliquée le 2026-10-04 (run `release-db` 37210794747). **Écrite depuis le LOT-02** au clic « Valider pour diffusion », derrière `WN_LETTRE_ADRESSAGE_PATIENT`, **éteint à la livraison** : aucune ligne tant qu'il l'est. **Lue depuis le LOT-03a** par le portail du patient (`api/portail/lettre-adressage`, son écran et son fil du jour), sous le même drapeau : le patient lit SA remise la plus récente ; une lettre révoquée après remise s'affiche « retirée », sans texte ni motif ; seule la révocation retire une lettre remise (une consultation porteuse dépassée, ou une lettre plus récente pas encore diffusée, la laissent servie — arbitrage Q-L1 du 2026-10-04). **Depuis le LOT-03b**, la version à imprimer (`api/portail/lettre-adressage/impression`) rend ce texte figé avec le prénom et le nom du patient et la date de la lettre, comme la lettre imprimée par le praticien ; le praticien voit, avant le clic de diffusion, la date de la lettre qui partira (jamais son texte, déjà dans l'onglet Correspondance). Destinataire : **le patient lui-même**, dans son portail — aucun tiers. Effacée nommément avec le dossier |
| **Santé — annonce de la diffusion du protocole (art. 9)** ([[D-317]], PA-2, déclaré le 2026-10-17 **avant** activation) | `CorrespondancePatient`, type `protocole_diffuse` (dossier, date, statut d'envoi, motif court d'un envoi retenu) — aucune table neuve | **Même nature que `CorrespondancePatient`** : la ligne dit « ce patient a reçu l'annonce d'un protocole ». **L'e-mail ne porte aucune donnée de santé** : gabarit `protocole_diffuse` du registre des gabarits, qui dit seulement que le protocole attend dans l'espace, sans action, sans axe, sans pièce jointe ; réponse adressée au praticien du dossier. Il part au clic « Valider pour diffusion » d'une version **jamais diffusée** que le portail servira, derrière `WN_ANNONCE_PROTOCOLE`, **éteint à la livraison** ; le texte du gabarit a été validé par le responsable le 2026-10-17, et le drapeau resterait fermé sans cette validation. Il remplace alors l'e-mail `document_remis` du même clic : un seul e-mail. **Plafond, posé aussi sur `document_remis`** : au plus un e-mail d'annonce de diffusion par dossier et par 24 heures, les deux gabarits confondus ; un envoi retenu est consigné « non envoyé ». Destinataire : **le patient lui-même** ; sous-traitant d'envoi : celui de la rubrique 6. Effacée avec le dossier |
| Gestes praticien MOTIVÉS sur un dossier nommé | `EcartementProposition` (identifiant de la cible écartée, règles d'orientation qui la motivaient, motif écrit, e-mail du praticien, date, chaînage de reprise) · `DecisionPrioritySelection` (identifiant de la carte de décision et son empreinte, identifiant du candidat retenu — dérivé d'une règle clinique —, motif écrit, e-mail du praticien, date, chaînage de correction) | **Catégorie particulière — qualification du responsable, 2026-10-13 ([[D-283]] §3).** Une seule question, deux tables — voir le paragraphe ci-dessous. Chacune porte un raisonnement clinique écrit par un praticien sur une personne identifiée : « cette exploration n'a pas lieu d'être pour ce patient, et voici pourquoi », « c'est cette priorité qui est retenue, et voici pourquoi ». *Jusqu'au 2026-10-13, leur qualification n'était pas posée (paragraphe ci-dessous, historique).* |
| Preuves de transparence | `TrustAcknowledgement`, `TrustChoiceEvent`, `TrustRightsRequest`, `TrustPrivacyIncident` | Traces d'information, de choix et de demandes |
| Authentification et accès | `Patient.accessTokenRevoked` (drapeau de révocation, non secret — les valeurs du jeton permanent ont été **purgées le 2026-08-22**, `D-085` §5), `PortailMagicLink`, `PortailConnexionGoogle`, `PortailDemandeTentative` | Drapeau, liens hachés expirants, traces de connexion, anti-abus |
| Alliance — accord attesté en consultation | `AccordAtteste` (version d'objectif visée, e-mail du praticien attestant, date de l'accord) | Attestation du praticien qu'un accord a été conclu de vive voix — un témoignage, distinct de la ratification que le patient pose lui-même (`D-161`) |
| Alliance — fin d'un objectif | `FinObjectif` (racine de la chaîne, motif, voix, consignataire, sens, motif écrit de renoncement, date d'expression) | Parole du patient et du praticien sur la fin d'un objectif de suivi — aucun score, seuil, bande, rang ni taux d'atteinte (`D-161`) |
| **Alliance — la parole des deux voix (art. 9)** | `ObjectifNegocie`, `EntreeCeQuiCompte`, `SyntheseComprehension`, `DesaccordComprehension`, `RatificationObjectif`, `AmendementObjectif`, `ReponseJalonObjectif`, `DemandeCorrectionObjectif` | **Catégorie particulière** — ce que le patient écrit sous « ce qui compte pour moi », l'objectif posé avec lui, sa reformulation, sa priorité, et ce que chacun en dit ensuite. `SyntheseComprehension` porte en outre, quand le texte publié est parti d'un résumé proposé, l'identifiant de ce tirage, le modèle et la version de la consigne. Aucun score, aucun rang, aucun taux d'atteinte (`D-161`) |
| Alliance — moteur déterministe de propositions | `PropositionObjectif`, `DispositionProposition` | Propositions assemblées à partir de sources signées, **sans IA** (`D-094` §4) — et les dispositions du praticien à leur égard |
| Alliance — proposition de priorité assistée par IA | `PropositionPrioriteIA` | Libellé de 200 caractères proposé par le modèle à partir du `resume_praticien` d'une synthèse validée et du dernier dépôt patient, avec l'identifiant de ses deux sources et la version de la consigne. **Objet distinct du moteur ci-dessus** (`D-167` §5) |
| Alliance — proposition de résumé global assistée par IA | `PropositionComprehensionIA` | Texte long proposé par le modèle pour pré-remplir « Ce que j'ai compris de vous », à partir des `narratif_patient` de plusieurs synthèses validées et des désaccords déjà signalés, avec la liste ordonnée de ses sources et la version de la consigne. Rien n'est publié depuis cette table : un tirage doit être repris et modifié par le praticien |
| Journalisation | `JournalAccesDossier` (`id_patient`, `praticien_email`, route, méthode, horodatage), `FilCardRejection` (`id_patient`, clé de carte, sens du refus, `refuse_par`, horodatage), `FilCardLecture` (`id_patient`, type de carte, sens de la lecture, `lue_par`, horodatage) | Piste d'audit des accès praticien, et traces des cartes du Fil du jour qu'un praticien a écartées ou lues — aucun contenu clinique : ces lignes nomment un dossier et un geste de lecture, jamais ce qui s'y trouve. `PortailJournalRepere` a été SUPPRIMÉE le 2026-09-12, sur demande explicite du responsable : le journal rétrospectif qu'elle servait a été retiré, et l'accusé de lecture par document est porté par `PortailLecturePatient`. Sa seule ligne — un dossier, un instant — est partie avec elle. La leçon de sa conception reste consignée dans sa migration de suppression : sa clé primaire rendait le décompte d'assiduité IMPOSSIBLE, et non seulement interdit (`DC-19`/`DC-20`) — ce qui n'est pas conservé ne se compte pas. **`PortailLecturePatient` (`id_patient`, espèce, identifiant de l'objet lu, jour de première lecture) n'en est pas une non plus, et elle se lit autrement** : **AUCUN horodatage** — « à quelle heure ce patient a-t-il ouvert son bilan » est structurellement sans réponse. Depuis [[D-297]] (lettre ai, 2026-10-18), le seul JOUR de la première ouverture s'y inscrit (`lu_le`, posé par la base, jamais modifié, vide pour les lectures antérieures). Contrairement à sa voisine, elle porte PLUSIEURS lignes par dossier : un `count(*)` répond, et il faut le dire. Ce qui borne le risque : ce compte ne peut pas dépasser ce que le cabinet a REMIS, et ne dit rien des connexions. Une seule surface praticien la lit, l'encart « Documents remis » du dossier ([[D-297]] §5 : « Lu le … », « Lu, date non enregistrée » ou rien, version par version, sans compte ni agrégat) ; que ce soit la seule est tenu par un banc du dépôt (`portailLecturesPatient.guard.test.ts`), pas par le schéma. **Espèce `protocole` ([[D-315]], déclarée le 2026-10-15 avant sa migration)** : la première ouverture, par le patient, du détail de la version diffusée de son protocole (identifiant de la diffusion approuvée en vigueur) ; mêmes colonnes, datée elle aussi depuis [[D-297]] (amendement du 2026-10-18) ; l'affichage de l'accueil et la connexion ne s'enregistrent pas. Le compte reste borné par ce que le cabinet a diffusé ; conservée avec le dossier ([[D-283]] §2) et effacée avec lui |
| **Mesure d'usage — aucun identifiant direct** | `CompteurOuvertureSources` (un JOUR, une espèce parmi deux, un compte entier) | **Déclarée ici pour que l'absence soit DITE, pas seulement tacite.** Le banc `rubrique5.modeles.test.ts` ne vérifie que les tables filles de `Patient` : celle-ci n'en est pas une, donc il se tait — et une ligne absente ne ment pas, elle se tait. Elle compte combien de fois le panneau « Voir les sources et limites » est affiché puis ouvert : ni `id_patient`, ni identité de praticien, ni instant, ni ligne par événement. Trois colonnes, un agrégat par jour, et un contrat négatif garde le triplet `nom:type` de chacune — le type autant que le nom, un `jour` promu en `timestamp` rendant la garantie fausse (`compteur_ouverture_sources_v1_negatif.sql`). **CE N'EST PAS UNE ANONYMISATION, et l'intitulé a été corrigé en ce sens après contre-expertise** : un jour où un seul praticien est actif, ses ouvertures lui sont attribuables par **croisement avec `JournalAccesDossier`**, qui conserve praticien, dossier et horodatage ; s'il n'y a ce jour-là qu'un seul dossier, ce dossier devient identifiable. Aucune colonne supplémentaire n'est nécessaire — l'anonymisation doit résister aux corrélations et aux inférences, pas seulement au retrait des identifiants. Le risque est **borné par le volume d'activité** et maximal aujourd'hui. Ce qui reste vrai : la table **n'ajoute aucun identifiant que le dossier ne détienne déjà**. **Sa qualification appartient au responsable de traitement et n'est pas posée ici** (`D-194`) |
| Résidu d'effacement | `DossierEfface` (année de naissance, initiales, date) | Preuve d'effacement, volontairement non ré-identifiante |

> **Ajouté le 2026-09-10 (`D-167`), et c'est un rattrapage.** Ce tableau ne
> portait de la campagne Alliance que `AccordAtteste` et `FinObjectif`. Les neuf
> autres modèles — dont l'objectif lui-même et le dépôt « ce qui compte pour
> moi », qui sont la parole brute du patient — n'y figuraient pas. L'écart a été
> vu en écrivant l'entrée de la proposition de priorité : on ne pouvait pas
> déclarer une table nouvelle en laissant ses deux sources absentes.

**Les deux tables de GESTES PRATICIEN MOTIVÉS — une seule question à trancher,
posée le 2026-09-13.** `DecisionPrioritySelection` (`D-127`, migration du
2026-09-06) et `EcartementProposition` (`D-178`, migration appliquée le
2026-09-13) ont la même anatomie, au champ près : un dossier nommé, un motif
écrit obligatoire, l'e-mail du praticien et l'horodatage posés **côté serveur**,
et un chaînage append-only où se corriger crée une ligne au lieu d'en réécrire
une. Ce qu'elles portent n'est ni une mesure ni un score : c'est une PHRASE
écrite par un soignant sur une personne identifiée, et qui dit un raisonnement
clinique — « cette exploration n'a pas lieu d'être pour ce patient, et voici
pourquoi », « c'est cette priorité qui est retenue, et voici pourquoi ».

*Historique — qualification posée par le responsable le 2026-10-13 ([[D-283]] §3).* **Ce dossier ne les qualifiait pas, et l'abstention était délibérée.** Classer une
table en catégorie particulière au sens de l'article 9 est un acte juridique,
qui appartient au responsable de traitement avec son conseil — c'est ce que la
rubrique 5 de la table des dettes énonce déjà pour les tables non déclarées,
échéance du 2026-10-21. Ce qui est fait ici est l'inverse d'une qualification :
les deux tables sont DÉCRITES, champ par champ, et rapprochées pour que la
question se pose UNE fois. Les traiter séparément aurait produit deux réponses
possiblement divergentes sur une même nature d'objet.

2026-10-14 : rubrique 5 soldée, les deux tables classées en catégorie particulière ([[D-283]] §3) ; l'échéance du 2026-10-21 est sans objet (borne levée par [[D-265]]).

**Ce qui ne dépend pas de cette qualification, et qui est déjà tenu** : les deux
tables entrent dans la transaction d'effacement IDP2, portent la RLS, et ne
sortent jamais vers le portail patient. `DecisionPrioritySelection` quitte par
là même la dette nommée du 2026-09-09 : elle n'était pas déclarée, elle l'est.
La dette ne devait que rétrécir — elle rétrécit.

**Hors périmètre personnel**, et à ne pas confondre : les référentiels
(`Biology*`, `Supplement*`, `Ciqual*`, catalogues de questionnaires) ne portent
aucune donnée personnelle.

## 6. Destinataires et sous-traitants

**Source.** La liste **montrée au patient** est celle du document courant
`donnees_confidentialite` (`web/src/lib/trust/contenus/registre.ts`), servi par
les pages du portail — **v5 depuis le 2026-09-07** (`D-141`).

> **Ce tableau a été faux du 2026-08-22 au 2026-09-07**, et personne ne l'a vu :
> il énumérait Vercel et Supabase comme sous-traitants **seize jours après le
> cutover du 2026-08-22 et six jours après leur fermeture définitive**, ne nommait pas
> Scalingo, et reprenait la négation « Google — connexion du praticien
> uniquement, jamais des patients » que `D-137` a établie fausse. Il est
> désormais **aligné sur le document servi**, et un banc les tient ensemble
> (`web/src/lib/trust/contenus/registre.dossier.test.ts`) : les modifier
> séparément rougit.

| Sous-traitant | Rôle tel qu'il est dit au patient |
|---|---|
| Scalingo | hébergement de l'application et de la base de données (HDS, France) |
| Anthropic | assistance d'IA pour la préparation des synthèses, **pour la proposition de formulation de la priorité d'un objectif** (`D-167`), **pour la proposition d'un premier jet de « Ce que j'ai compris de vous »** (`D-168`) **et pour le relevé des valeurs des comptes rendus d'analyses biologiques** (`D-256` A4, déclaré le 2026-10-01 avant activation — §2 ter) |
| OpenAI | aide à la recherche du praticien dans sa bibliothèque de références scientifiques : reçoit le texte de la recherche saisie et celui des références à indexer ; l'application ne lui envoie ni le dossier, ni les réponses, ni les documents ; tout ce que le praticien saisit ou colle dans sa recherche lui parvient, une donnée de patient comprise (D4, [[D-299]], déclaré le 2026-10-15) |
| Google Workspace | acheminement des e-mails Wellneuro, **y compris les documents adressés au patient** (bilan, comptes rendus) |
| Google | connexion du praticien, **et du patient s'il la choisit** (seule l'adresse e-mail est transmise) |
| Sentry | détection des erreurs techniques, région européenne — jamais les réponses, les documents ni l'identité |

**Déclaré le 2026-10-15 (D4, [[D-299]]) :** OpenAI figure au tableau ci-dessus et dans « Vos données personnelles » v18, accusé exigé ; le flux est inchangé. La contre-lecture des fiches d'assiette par OpenAI s'exécute hors de l'application, sur le seul texte des fiches, sans donnée personnelle : elle est déclarée par `docs/TRUST_IA_FICHES_ASSIETTE.md` et n'est pas un sous-traitant de données patient. Le constat d'origine suit, inchangé.

**Déclaré le 2026-10-16, avant le premier envoi (BP-12a, [[D-314]] §4) :** la rédaction des fiches d'usage du besoin 2 suit le même régime que celle des fiches d'assiette. L'outil `tools/corpus/fiches-usage/` s'exécute hors de l'application et envoie à Anthropic (rédaction) et à OpenAI (contre-lecture) les identifiants de la structure signée et le texte des claims qu'elle épingle : aucune donnée personnelle. Ni l'un ni l'autre n'est un sous-traitant de données patient pour ce flux, déclaré par `docs/TRUST_IA_FICHES_USAGE.md`. Aucun texte n'était encore rédigé à cette date.

**Liste fermée des sites d'appel IA (K-05a, 2026-10-15).** Chaque fichier de
`web/src` qui parle à un fournisseur d'IA (appel par SDK, appel direct, client,
adresse en dur) figure dans la liste de
`web/src/lib/sitesAppelIa.guard.test.ts`, rattaché à sa ligne au tableau
ci-dessus ou, sans donnée de patient envoyée par l'application, à sa
déclaration en rubrique 7. Un
fichier nouveau, ou un fournisseur nouveau, rougit la CI tant qu'il n'est pas
déclaré ici. Neuf fichiers au 2026-10-15 : Anthropic (client partagé,
synthèse, priorité d'un objectif, « Ce que j'ai compris de vous », relevé des
comptes rendus biologiques, atelier du corpus), OpenAI (recherche du corpus).
Le banc ne voit pas un appel dont l'adresse ne nomme aucun fournisseur ;
`tools/` et `scripts/` n'en relèvent pas.

*Historique — constat du 2026-09-07, soldé le 2026-10-15 par [[D-299]] : la
liste patient a été corrigée, OpenAI figure au tableau ci-dessus (D/35 du plan,
close le 2026-10-21).* **OpenAI, destinataire constaté le 2026-09-07.** Le chemin
d'embeddings du corpus (`web/src/lib/rag/embeddings.ts:20-34`) envoie à
`api.openai.com` le **texte libre saisi par le praticien** dans la recherche de
corpus, ainsi que le texte des chunks à indexer. Il est **armé en production** :
`WN_RECHERCHE_CORPUS_ENABLED` posée le 2026-08-22 (`D-081`) et
`RAG_PGVECTOR_ENABLED` relue `true` sur Scalingo le 2026-09-07 (`env-get`, valeur
non secrète). Aucune donnée patient ne transite par ces chemins **par
construction** — la requête est une recherche documentaire —, mais le champ est
libre et rien n'empêche un praticien d'y écrire une situation clinique.

OpenAI n'apparaissait, au 2026-09-07, **dans aucune pièce** : ni dans ce
dossier, ni dans `GATES_GO_NO_GO.md`, ni dans le module `trust/`, ni dans
aucune des 141 décisions du registre. C'est le même écart que celui de Sentry
(trou 3), à une différence près : **Sentry n'émettait rien, celui-ci émet**. La
question posée alors — soit ce flux ne porte aucune donnée personnelle et cela
s'écrit avec sa garde, soit la liste patient est incomplète et se corrige — est
tranchée par [[D-299]] : la liste patient est corrigée, le flux inchangé.

**Destinataire de build, sans donnée applicative.** `checkpoint.prisma.io` —
télémétrie de version de l'outil Prisma, déclenchée au `prisma generate` du
build (`web/scripts/build.sh:33`). Aucune donnée patient ni source ; aucun
`CHECKPOINT_DISABLE` n'est posé dans le dépôt. Mentionné pour l'exhaustivité de
l'inventaire, pas comme sous-traitant au sens de l'article 28.

**LE DESTINATAIRE TIERS QUI MANQUAIT — LE MÉDECIN DÉSIGNÉ ([[D-222]]).** Cette
rubrique concluait : « aucun partage à un tiers (médecin traitant compris) sans
choix explicite du patient ». La phrase décrivait une garde que **personne n'avait
décidé de poser**, et la présentait comme posée. L'arbitrage du 2026-07-22
([[D-219]] §3) pose que le choix `partage_medecin_traitant` est **exposé au
praticien, jamais opposé à lui** : rien, dans le logiciel, n'empêche de consigner
une lettre — ni, depuis [[D-218]], d'en produire une — pour un dossier dont le
patient a refusé le partage.

Ce qui est vrai, et qui s'écrit à sa place : **l'application n'envoie rien**. Elle
n'a aucun canal vers un médecin ; le document est remis ou transmis **par les
canaux propres du praticien**, hors de l'outil. Le garde-fou est **déontologique
et humain**, pas technique — et c'est la seule formulation qui survive à une
lecture du code.

**La correspondance médecin comme TRAITEMENT** — elle n'était inventoriée nulle
part, et elle est pourtant le seul chemin par lequel une donnée de santé quitte
Wellneuro vers un tiers qui n'est ni le patient ni un sous-traitant :

| Terme | Ce qui est écrit dans le code |
|---|---|
| **Finalité** | tracer au dossier ce qui a été transmis à un médecin et ce qu'il a répondu ; **produire la lettre d'adressage** quand un signal d'alerte déclaré suspend la décision ([[D-218]]) |
| **Données** | un **libellé libre** désignant le médecin — jamais son adresse e-mail, le refus du caractère `@` étant une garde structurelle —, le texte de l'échange (données de santé, c'est sa fonction), deux dates, et l'ancre du document généré |
| **Destinataire** | **le médecin désigné**, hors application, par les canaux du praticien. **Déclaré avant activation ([[D-262]], 2026-10-03)** : la lettre d'adressage sera aussi **mise à disposition du patient lui-même** dans son portail, à la diffusion du protocole — le patient n'est pas un tiers ; annonce par l'e-mail neutre `document_remis`, sans contenu de santé ni pièce jointe ; drapeau éteint tant que la table de remises n'est pas en service |
| **Durée** | **non fixée**, comme les autres données de santé du dossier (rubrique 8). La correspondance suit le dossier : clôture ⇒ lecture seule, effacement ⇒ effacement ([[D-219]] §2) |

**DEUX VOIES DEPUIS LE 2026-09-17, ET UNE SEULE EST GARDÉE — c'est le fait
central de ce traitement.** Trois routes écrivent dans `correspondances_medecin`.
Deux appellent `verdictPartageMedecin` ; la troisième, non, et c'est délibéré :

| Route | Garde de consentement | Effet d'un refus |
|---|---|---|
| `api/praticien/biologie/proposition/courrier` | **oui** (relue dans la transaction) | le courrier ne se prépare pas |
| `api/praticien/correspondance-medecin` (consignation à la main) | **oui** | l'échange ne se consigne pas |
| `api/praticien/adressage/courrier` (signal d'alerte) | **AUCUNE** | **la lettre part quand même** |

La garde est *fail-closed sur trois états* : refus, retrait **et silence**. Et
**le discriminant est LA ROUTE, jamais le destinataire** — `medecinLibelle` est
du texte libre sur tous les chemins d'écriture. L'étendue de l'exception tient
donc à la discipline de routage : une quatrième route qui n'appellerait pas la
garde en hériterait **en silence**.

**CE QUI SE DÉDUIT DE CE TABLEAU, ET QUI ÉTAIT LA QUESTION OUVERTE** (close par [[D-265]] le 2026-10-04) : la voie
ordinaire repose sur le choix explicite du patient, et ce choix est désormais
**techniquement tenu**. La voie d'exception, elle, transmet une donnée de santé à
un tiers **malgré un refus exprimé**. Ces deux voies ne peuvent pas reposer sur
la même justification, et la seconde n'en avait aucune d'écrite avant le 2026-10-04.

**LA VOIE D'EXCEPTION EST MAINTENUE** ([[D-265]] §2, 2026-10-04). La fermer
recréerait le blocage sans fin que [[D-257]] a levé : seule une lettre
consignée lève une abstention sur signal d'adressage. Sa base est déclarée par
le responsable dans la trame de la rubrique 3 (6.1.d + 9.2.h, 2026-10-04).

**AUCUN ARTICLE DU RGPD N'EST ÉCRIT ICI**, conformément à la rubrique 3 : la
qualification revient au **responsable**, dans la trame de la rubrique 3
([[D-265]] §3), jamais à une session. Ce qui est écrit est le **fait** — ce qui part, à qui, par quel chemin,
sous quelle garde, et ce que le produit ne garantit pas. Les deux items entrent
au récapitulatif de la rubrique 14 avec leur porteur.

**MESURE DE PRODUCTION AU 2026-09-19** (agrégats, aucun identifiant) :

| Grandeur | Valeur |
|---|---|
| Dossiers | 29 |
| `trust_choice_events`, **toutes finalités** | **0** |
| Lignes de `correspondances_medecin` | 2, sur **1** dossier |
| Accusés `donnees_confidentialite` v8 / v9 | 3 / 2 |
| Ayant accusé v8 **sans** v9 | **2** |

**Deux conséquences que ces chiffres établissent, et qui n'étaient pas
mesurées.** D'abord, **aucun patient ne s'est jamais prononcé** : la garde étant
fail-closed sur le silence, les deux routes gardées sont **fermées pour les 29
dossiers** depuis le 2026-09-17. Le coût réel est faible — la table ne porte que
2 lignes sur 1 dossier — et la contrepartie existe sur les deux écrans
(« Consentement jamais exprimé », avec le chemin pour le recueillir, tenu par des
bancs). Ensuite, la population qui a lu la promesse inexacte **sans avoir vu sa
correction** est de **deux personnes** : ce n'est pas un mécanisme d'information
à construire, c'est deux patients que leur praticien connaît.

> **CE QUI A ÉTÉ ACQUITTÉ LE 2026-09-17, ET CE BLOC LE DISAIT ENCORE DÛ.** La
> réserve écrite ici tenait que « le logiciel ne garantit pas cette phrase » et
> que rien n'avait été touché. **Les deux bouts ont été pris depuis** ([[D-222]]
> et [[D-219]] §3 amendés en place) : le texte est venu au logiciel — `v9` de
> `donnees_confidentialite`, **avec accusé de réception exigé**, qui corrige la
> promesse dans les deux sens et **nomme l'exception au patient** — et le
> logiciel est venu au texte, par la garde ci-dessus. Le coût est assumé par
> écrit : un partage hors application devient invisible au dossier et au registre.
>
> **CE QUI RESTE DE LA RÉSERVE D'ORIGINE**, et rien de plus : l'**effet du
> refus** annoncé dans « Mes choix » (« aucun document ne sera partagé ») reste
> plus absolu que la garde, puisque la voie d'exception lui échappe ; et la
> **formulation des finalités** de cet écran n'est couverte par aucune version —
> l'événement de choix n'enregistre que la version de `droits_patient`, si bien
> que deux consentements donnés sur deux formulations différentes restent
> indiscernables au registre. Ce second point est **sans portée mesurable à ce
> jour** : la table est vide.

Au sein de Wellneuro, en revanche, la phrase tient : « votre praticien, dans le
cadre de votre accompagnement ; personne d'autre n'y accède ».

> **Attribution corrigée le 2026-08-19 (LOT-03), et dette qui en résulte.**
> Cette rubrique et la rubrique 1 citaient `web/src/lib/trust/gouvernance.ts`
> comme la source « montrée au patient ». C'est faux : ses deux exports n'ont
> **aucun consommateur** dans `web/src` ni `web/e2e` — le module est une
> **copie morte**. Le contenu servi est celui de `contenus/registre.ts`.
> **Rien ne tient les deux copies synchrones** : une modification de
> `gouvernance.ts` — la liste des sous-traitants, le contact des droits —
> n'atteindrait aucun patient tout en paraissant l'avoir fait. Dette nommée,
> sans lot d'accueil ; à traiter avec le lot TRUST qui publiera la v2 du
> document d'information.

**TROUS.**

1. **Aucun DPA n'est signé**, avec aucun de ces sous-traitants
   (`CHECKLIST_ACTIVATION_G_TRUST_04.md` item 7 ;
   `docs/claude/propositions/2026-07-24-audit-migration-hds/CHECKLIST_FINALISATION.md:67`).
   ~~**Nuance posée le 2026-08-09 (D-037)** : pour Scalingo, il n'y a pas de
   signature à obtenir — l'accord de sous-traitance vit dans les documents
   généraux, acceptés à la souscription.~~ **Démentie par la réponse écrite du
   2026-08-11 (`D-047`, section ci-dessous) : une annexe HDS distincte est
   bien à signer.** Ce qui manque au dossier reste la **copie horodatée de la
   version acceptée**, demandée au fournisseur le 2026-08-09 — ~~**question de
   forme non posée à ce ticket**, à poser au prochain échange (D-037)~~ —
   **posée depuis** : la forme a reçu réponse le 2026-08-11, et la copie
   horodatée est redemandée au message du 2026-08-12 puis relancée le
   2026-08-19, sans réponse à ce jour (« Canal et trace de la demande
   d'annexe », ci-dessous). Ce point vaut pour Scalingo seul ; les autres
   sous-traitants de la liste ci-dessus restent sans DPA archivé.
2. ~~Le **fournisseur SMTP réel n'est pas identifié** — ni son nom, ni sa
   localisation (`CHECKLIST_FINALISATION.md:68`).~~ **Identifié le
   2026-08-22 : Google Workspace** — établi sans lire aucun secret, par
   concordance de trois traces publiques et d'une du code : le SPF de
   `wellneuro.fr` n'autorise que `_spf.google.com`, le MX est
   `smtp.google.com`, la clé DKIM active est celle de Google, et
   l'expéditeur du code est `"Wellneuro" <noreply@wellneuro.fr>`
   (`web/src/lib/consultation/email.ts`). La ligne « Fournisseur d'envoi
   d'e-mails » de la liste patient reste exacte ; Google y figure déjà, mais
   au titre de la seule connexion praticien — le cumul des deux rôles est un
   fait à porter au document d'information v2 (lot TRUST). **Restent dus** :
   la localisation du traitement et la couverture DPA
   (`CHECKLIST_FINALISATION.md` §F).
3. ~~**Sentry est un sous-traitant de fait non déclaré au patient.**~~
   **TRANCHÉ le 2026-09-07 (`D-141`), dans le second sens : la liste patient
   était incomplète, elle se corrige.** Sentry a été câblé sur demande du
   responsable et figure désormais dans `donnees_confidentialite@v5`, avec ce
   qu'il reçoit (type d'erreur, navigateur, adresse de page anonymisée) et ce
   qu'il ne reçoit jamais (réponses, documents, identité). **La résidence UE
   n'est plus une déclaration mais un invariant de code** :
   `web/src/lib/observability/sentryRegion.ts` refuse tout DSN hors
   `.ingest.de.sentry.io`, et l'observabilité reste éteinte plutôt que
   d'émettre ailleurs. Le volet client est tranché de la même façon
   (`NEXT_PUBLIC_SENTRY_DSN`, même garde, Session Replay à zéro).
   ~~**Reste dû : le DPA Sentry**, avec les autres (rubrique 6).~~ **DPA
   Sentry signé le 2026-10-21** par les deux parties (révision de mai 2024,
   DocuSign ; copie signée détenue par le responsable, hors dépôt). Son
   §2.2.2 interdit l'envoi de catégories particulières de données : ce que
   la liste ci-dessus exclut déjà (réponses, documents, identité).
   Historique : écart ouvert le 2026-08-07, `CHECKLIST_FINALISATION.md:42, 68`.
4. **Scalingo** est décidé (D-006, 2026-07-28 ; confirmé par D-037,
   2026-08-09) ~~mais **pas en service** : il n'entre dans cette liste qu'au
   basculement, et la décision subordonne toute donnée réelle à deux conditions
   préalables — l'accord de sous-traitance en vigueur et archivé, et le
   périmètre HDS de la région confirmé par écrit.~~ **Les données réelles y
   résident depuis le 2026-08-22, 03:24 CEST** (ordre des conditions suspendu
   par `D-078` §4 ; chronologie complète : rubrique 12). **Toujours pas en
   service** : l'application servie aux personnes reste sur Vercel/Supabase
   jusqu'au cutover DNS, et c'est au basculement de service que Scalingo entre
   dans la liste montrée au patient. Mais la résidence des données, elle, est
   un fait depuis cette date — c'est précisément ce que le renouvellement
   d'information (rubrique 11) doit dire.

### Certification HDS de Scalingo — pièce au dossier

Lue le 2026-08-09. Le document est conservé sur Drive (dossier « Scalingo »,
déposé le 2026-07-28) ; il est par ailleurs public.

| Élément | Valeur |
|---|---|
| Numéro de certificat | **LNE n° 38436-2** (renouvelle le 38436-1) |
| Titulaire | **SCALINGO**, 13 rue Jacques Peirotes, 67000 Strasbourg |
| Référentiel | Hébergeur de Données de Santé **version 2.0** |
| Validité | **2025-09-12 → 2028-09-11** |
| Activités couvertes | **les six**, dont la **5** (administration et exploitation du SI) et la **6** (sauvegardes externalisées) |
| Déclaration d'applicabilité | ISO/IEC 27001:2022 et HDS 2.0, v1.0.0 du 2025-04-14 |
| Organisme certificateur | LNE, accréditation Cofrac n° 4-0038 |
| Sites couverts | 9 rue de la Krutenau, 67000 Strasbourg ; sites virtuels / bureaux distants |

Trois points à ne pas perdre :

- **La validité est conditionnelle.** Le certificat n'est valide que sous
  réserve de la validité, **à isopérimètre**, du certificat **ISO/IEC 27001
  n° 38435**. Le dossier doit porter les deux numéros ; avec le seul 38436-2, la
  pièce est incomplète pour un auditeur.
- **Les activités 5 et 6 sont couvertes**, ce qui place le PostgreSQL managé
  **et ses sauvegardes** dans le périmètre — le motif exact pour lequel l'audit
  du 2026-07-24 avait écarté un autre fournisseur.
- **Le certificat ne nomme aucune région.** Il **ne suffit donc pas** à établir
  que les ressources créées `--hds-resource` en `osc-fr1` sont couvertes : cela
  relève des conditions de l'offre, demandées par écrit au fournisseur le
  2026-08-09. Élément à charge côté plateforme : `scalingo apps-info` rend
  `HDS: true` sur l'application. **TROU répondu par écrit le 2026-08-11**, voir
  ci-dessous.

### Réponse écrite du fournisseur (2026-08-11)

Reçue par courriel (Jennifer, Scalingo), en réponse aux questions posées le
2026-08-09.

- **Périmètre géographique — TROU fermé.** Les ressources créées avec
  `--hds-resource` en région `osc-fr1` (application, add-on PostgreSQL et ses
  sauvegardes) sont couvertes par le certificat **LNE n° 38436-2**, pour les
  six activités du référentiel dont la **5** (administration et exploitation)
  et la **6** (sauvegardes externalisées).
- **ISO/IEC 27001 n° 38435** — certificat public,
  <https://scalingo.com/fr/certification-iso-27001>.
- **Forme de l'accord de sous-traitance — précisée, encore non archivée.**
  L'accord se compose de deux pièces distinctes : le DPA
  (<https://scalingo.com/fr/contrat-gestion-traitements-donnees-personnelles>)
  et une **annexe HDS séparée**, à signer indépendamment — l'acceptation des
  CGU seule ne l'active pas. La forme posée en rubrique 14 (« forme non posée
  au ticket du 2026-08-09 ») est donc connue ; **la signature et l'archivage
  de l'annexe HDS restent à faire** ~~avant toute donnée réelle (condition
  D-037)~~ — **ordre suspendu par `D-078` (2026-08-19)** : la migration est
  engagée sans attendre l'annexe, par arbitrage du responsable informé de la
  fenêtre de moindre couverture qui en résulte. La signature et l'archivage
  restent **dus** ; ils conditionnent désormais le **décommissionnement** de
  Vercel/Supabase (seul geste irréversible) et constituent la sortie « par le
  haut » de la revue du 2026-10-21.
  2026-10-14 : annexe HDS signée le 2026-08-30 ([[D-121]]) ; décommissionnement exécuté le 2026-09-01 ([[D-080]], [[D-120]]) ; revue du 2026-10-21 sans objet, borne levée par [[D-265]] ; reste dû l'archivage du document signé, échéance 2027-06-30 ([[D-265]] §4, [[D-283]] §9).
- **Écart du 2026-10-14 (essai de restauration G-7, [[D-289]]).** L'application
  temporaire qui a reçu la copie restaurée a été créée sans `--hds-resource`,
  donc hors du périmètre ci-dessus ; la copie y a séjourné 13 minutes au plus
  (21:25 à 21:38 UTC), sur le seul compte du responsable, même fournisseur,
  même région, puis a été détruite. Qualifié par le responsable le 2026-10-15 :
  pas une violation au sens de l'art. 4.12 (ni accès, ni altération, ni
  perte), noté au registre hors dépôt ; le RUNBOOK impose désormais l'option.
- **Sous-traitant ultérieur.** OUTSCALE, opérateur d'infrastructure, France
  (région Paris), certifié HDS pour les six activités ; l'intégralité des
  données reste dans ses datacenters français.
- **Région `osc-secnum-fr1`** — non utilisée par ce projet. Réservée aux
  clients demandant, en plus de HDS, la Visa SecNumCloud (accès soumis à
  validation InfoSec Scalingo). Mentionnée ici pour mémoire, hors périmètre
  de la migration actuelle.
- **Journalisation Scalingo** — logs d'accès applicatifs conservés 90 jours à
  1 an, logs d'infrastructure 1 an, les deux inclus dans le périmètre HDS
  (activité 5). Distinct du TROU rubrique 8, qui porte sur la conservation
  des données de santé elles-mêmes, non sur les journaux de la plateforme.

### Canal et trace de la demande d'annexe — vérifié le 2026-08-20

Trace produite au titre du premier critère du LOT-01 (campagne
`2026-08-18-echeance-hds-g-trust-04`) : les dates de la demande et de la
relance ne reposaient jusqu'ici que sur l'affirmation de `D-078`. Elles sont
ici **établies par lecture du fil**, pas par déclaration.

- **Canal** : un fil de courriel unique avec le support du fournisseur
  (relayé par Intercom), objet « Périmètre HDS de la région `osc-fr1` et
  pièces contractuelles — compte wellneuro », ouvert le **2026-08-09
  09:42 UTC** depuis l'adresse du responsable. **Le fournisseur n'émet aucun
  numéro de ticket** : la référence du canal est l'objet du fil et ses dates.
- **2026-08-11 08:19 UTC** — réponse de fond, celle que `D-047` a tranchée
  (section ci-dessus).
- **2026-08-12 02:55 UTC** — **demande de l'annexe HDS** : le document et sa
  procédure de signature (point 1), la copie horodatée du DPA (point 2).
  Confirme la date affirmée par `D-078`.
- **2026-08-19 09:37 UTC** — **relance**, l'annexe posée comme le point
  bloquant (document, procédure et délai de signature, préalable éventuel
  côté compte), avec demande d'un interlocuteur direct si sa délivrance ne
  relève pas du support. Deux points repris comme non bloquants : la **copie
  horodatée du DPA** et la couverture rétroactive des ressources déjà
  provisionnées. Confirme la date affirmée par `D-078`.
- **État au 2026-08-20 : sans réponse.** Le dernier message du fil est la
  relance ; la demande initiale est pendante depuis huit jours.

Ce constat ne dit rien de l'annexe elle-même : elle n'est **ni reçue, ni
signée, ni archivée**, et la ligne correspondante du tableau §14 reste
ouverte.

## 7. Transferts hors Union européenne

**Source.**

- **Supabase** — projet `Wellneuro-app`, région `eu-central-1` (Francfort),
  lecture du 2026-08-07 via l'outil de lecture Supabase. Dans l'UE.
- **Vercel** — région `fra1` (`web/vercel.json`). Dans l'UE. Vercel Inc. reste
  une société de droit américain, ce qui est une question distincte de la
  localisation d'exécution.
- **Anthropic** — transfert qualifié **hors UE** par
  `docs/claude/propositions/2026-07-24-audit-migration-hds/AUDIT_MIGRATION_HDS.md:94`
  (« DPA art. 28, transfert hors UE, TIA »). C'est le transfert principal, et il
  porte des données de santé au titre des synthèses. **Réserve** : le même audit
  demande, sans y avoir répondu, de vérifier « l'existence contractuelle d'une
  inférence UE » et la rétention d'inférence (`:251-253`, le prompt caching
  étant activé). La localisation réelle de l'inférence n'est donc **pas
  établie** — ni dans un sens ni dans l'autre.
- **Anthropic — second flux, ouvert par `D-167` (2026-09-10).** La proposition
  de formulation de la priorité d'un objectif envoie au même destinataire deux
  pièces : le `resume_praticien` d'une synthèse **validée par le praticien**, et
  le dernier dépôt patient « ce qui compte pour moi » **verbatim**, c'est-à-dire
  la parole brute du patient et non un texte déjà rédigé par un professionnel.
  Ce sont des données de santé au titre de l'article 9.

  **Ce flux n'ouvre pas un canal nouveau et ne referme aucun trou.** Il emprunte
  le transfert Anthropic déjà qualifié hors UE ci-dessus, avec la même réserve
  non levée sur la localisation réelle de l'inférence et la même absence de
  mécanisme de transfert écrit. Ce qui s'ajoute est le VOLUME et la NATURE de ce
  qui part : jusqu'ici, la matière transmise était médiée par la rédaction d'un
  praticien ; ici, une partie ne l'est pas. À verser au même arbitrage
  contractuel que le flux de synthèse, sans attendre qu'il soit rendu pour
  l'avoir écrit.
- **Anthropic — troisième flux, ouvert par `D-168` (en service sous
  `WN_DOSSIER_DEUX_VOIX`), écrit ici le 2026-09-30.** La proposition d'un
  premier jet de « Ce que j'ai compris de vous » envoie au même destinataire
  les `narratif_patient` des synthèses **validées par le praticien**, la liste
  ordonnée de leurs axes, et les désaccords que le patient a déjà signalés,
  **verbatim**. Ce sont des données de santé au titre de l'article 9. Même
  canal, même réserve et même absence de mécanisme de transfert écrit que les
  deux flux ci-dessus. Le texte proposé n'atteint jamais le patient tel quel :
  le serveur refuse de publier un texte identique au tirage (`RESUME_NON_RELU`).
  **Ce flux était absent de cette rubrique jusqu'au 2026-09-30**, alors que la
  table `PropositionComprehensionIA` l'était déjà de la rubrique 5 : relevé par
  l'inventaire des appels de modèle mené pour le document TRUST des fiches
  d'assiette.
- **Fiches d'assiette (`D-251`) — aucun flux de donnée personnelle.**
  L'adaptation des fiches envoie à Anthropic (rédaction) et à OpenAI
  (contre-lecture) le texte d'une fiche, ses claims et les réserves de sécurité
  de l'assiette : aucune donnée d'un patient. Elle s'exécute en dehors de
  l'application (`docs/TRUST_IA_FICHES_ASSIETTE.md`).
- **Atelier de validation du corpus (`rag/claims`) — aucune donnée de patient envoyée par l'application.**
  Déclaré le 2026-10-15 (K-05a) ; dans le code depuis le 2026-07-23
  (questionnaire, #307) et le 2026-07-24 (évaluation, #349), sans l'avoir été
  jusque-là. Deux appels à Anthropic, sur geste du praticien dans
  l'atelier du corpus : `rag/claims/questionnaire.ts` envoie les claims d'une
  source pour en tirer une question de restitution ; `rag/claims/evaluation.ts`
  envoie la question, la réponse produite par l'outil externe et collée par le
  praticien, et les claims de référence, pour proposer un verdict que le
  praticien confirme. Ce sont des textes du corpus : aucune donnée d'un patient
  **par construction**. La réponse collée est un champ libre, envoyée telle
  quelle, sans aucun retrait : une situation clinique ou une donnée
  identifiante qu'un praticien y collerait partirait chez Anthropic, comme
  pour la recherche du corpus (rubrique 6).
- **Anthropic — quatrième flux, déclaré par `D-256` A4 le 2026-10-01, AVANT
  toute activation (§2 ter).** Le relevé des comptes rendus d'analyses
  biologiques envoie au même destinataire le **document entier** : l'en-tête
  d'identité (nom, date de naissance, laboratoire) et toutes les valeurs, y
  compris celles qui ne seront pas retenues. Ce sont des données de santé au
  titre de l'article 9, et **le flux le plus identifiant des quatre**. Les trois
  autres portent des textes du dossier, celui-ci des mentions d'identité (nom,
  date de naissance) et une biologie complète, qu'aucun praticien n'a rédigées. Même canal, même réserve
  non levée sur la localisation de l'inférence, et même question sur la
  rétention des entrées, plus aiguë pour un document que pour un texte (le
  prompt caching est activé dans ce dépôt). **Condition propre à ce flux,
  arbitrée le 2026-10-01** : la demande de DPA à Anthropic doit être **envoyée**
  avant la pose du drapeau d'extraction, sa date établie au fil. **Envoyée le
  2026-10-01 à 17:34 UTC (19:34 heure de Paris)** (trace dans `docs/rgpd/DEMANDE_DPA_ANTHROPIC.md`).
  Elle ne referme pas le trou ci-dessous : elle l'ouvre à l'instruction.
  **Réponse reçue le 2026-10-02 à 22:23 UTC** : le DPA d'Anthropic, clauses
  contractuelles types comprises, est intégré à ses Conditions commerciales de
  service et s'accepte avec elles, sans signature distincte. Restent l'archivage
  d'une copie datée, la date d'opposabilité et la couverture des traitements
  antérieurs (`docs/rgpd/DEMANDE_DPA_ANTHROPIC.md`). La réserve sur la
  localisation de l'inférence et la rétention n'est pas levée.
  **[[D-284]] §5 (2026-10-13)** : l'identité est retirée du document avant
  l'envoi (nom, prénom, adresse, identifiants, coordonnées, métadonnées
  nominatives). Le lot passe juste après la clôture du G3. D'ici là, le flux
  reste nominatif : l'exposition est assumée et datée. L'analyse d'impact du
  transfert (TIA) est à rédiger.
  **Mise en œuvre (2026-10-14)** : masquage manuel par le praticien, sous sa
  responsabilité, page par page, avant toute lecture ; seules les pages
  masquées partent (§2 ter). Chaque page porte une zone ou une déclaration
  « sans identité » : aucune ne part sans avoir été jugée. Le flux n'est plus
  nominatif quand le masquage est complet ; une mention oubliée (code-barres,
  numéro de dossier) partirait. L'exposition nominative datée est **close au
  déploiement du lot 2** (#1428), et le patient en est informé par les v8 et
  v15 (§2 ter). La TIA reste à rédiger.

- **Google** — connexion du praticien seul.

**TROU.** Le **mécanisme de transfert invoqué** (clauses contractuelles types,
annexe d'un DPA, décision d'adéquation) n'est écrit nulle part, pour aucun de
ces flux. Ne rien affirmer avant vérification contractuelle. *(Constat
antérieur à l'avis du 2026-10-13 ; pour Sentry, le mécanisme est écrit depuis
le DPA du 2026-10-21, ci-dessous.)*

**Avis reçu le 2026-10-13 ([[D-284]] §5-6).**
- **Anthropic** : clauses contractuelles types de ses Conditions commerciales,
  avec une TIA à rédiger.
- **Google Workspace et Sentry** : le cadre de protection des données
  UE–États-Unis, s'il couvre l'entité et le flux. Sa preuve datée s'archive
  avec le DPA ; à défaut, les clauses contractuelles types et une TIA
  s'appliquent.
  - **Sentry, 2026-10-21** : le DPA signé écrit le mécanisme (annexe 3 :
    DPF, repli sur les CCT module 2). Restent la preuve datée de la
    certification DPF de Sentry et la TIA du repli.
- **Reste** : les pièces à archiver, et les TIA.

## 8. Durées de conservation

**Source — une seule durée est réellement écrite et arbitrée :**

- **Journal d'accès aux dossiers** : **12 mois glissants**, purge opportuniste
  à l'écriture, plus effacement avec le dossier — règle GD-2, alignée sur un
  arbitrage du responsable du 2026-07-22
  (`docs/claude/campagnes/2026-07-22-g-trust-04-durcissement-et-reliquats/CAMPAGNE.md`).
- **Traces d'identité Google** : 12 mois
  (`docs/claude/propositions/2026-07-25-audit-identites-google/AUDIT_IDENTITES_GOOGLE.md`).
- **Effacement sur demande** : le dossier et ses tables filles sont effacés, et
  `DossierEfface` conserve une preuve non ré-identifiante (année de naissance,
  initiales, date).
- **Append-only assumé** : `TrustAcknowledgement` et `TrustChoiceEvent` sont des
  preuves d'information et de choix ; elles ne sont pas réécrites.

**Durées fixées le 2026-10-13 ([[D-283]] §1-2)** — le responsable n'exerce pas
comme professionnel de santé au sens du Code de la santé publique :

- **Base active** : le temps de l'accompagnement, qui finit à la clôture du
  dossier par le praticien, à la demande du patient, ou à défaut **5 ans après
  le dernier contact** (durée active du référentiel CNIL des cabinets, reprise
  par analogie seulement).
- **Archivage intermédiaire** (support séparé, accès restreint) : **10 ans**
  après la fin de l'accompagnement — prescription de l'action pour dommage
  corporel (Code civil, art. 2226). Puis effacement.
- **Trace d'une lecture de compte rendu biologique** : celle des lignes
  validées suit le dossier ; celle des lignes écartées ou jamais décidées
  s'efface 30 jours après le dépôt. Travaux de la file de lecture : 30 jours
  ([[D-282]]).
- **En œuvre depuis le 2026-10-17** : la purge des lignes non validées
  ([[D-318]]) — à 30 jours du dépôt, chaque heure, avec les extractions
  restées sans ligne validée ; à l'écart d'un document transmis, aussitôt.
- **Pas encore en œuvre** : le texte patient (à signer), la clôture après 5 ans
  sans contact et l'archivage séparé sont des lots à venir ([[D-283]] §10). Jusqu'à la signature du texte, le produit dit
  toujours ce qui suit.

*Antérieurement :* **TROU pour tout le reste** — et le produit le dit déjà
publiquement, dans ces termes exacts (`gouvernance.ts`, repris dans `registre.ts`) :

> « La politique détaillée de durées de conservation est **en cours de
> formalisation**. Vos données sont conservées le temps de votre
> accompagnement ; vous pouvez à tout moment demander des précisions ou
> l'exercice de vos droits. »

Cet aveu est honnête ; il n'est pas une politique. Aucune durée n'est fixée pour
les données de santé elles-mêmes (consultations, réponses, synthèses,
correspondances), ni pour la trace des **comptes rendus biologiques déposés**
du LOT-02 de BIO-INGEST (§2 ter) — empreinte, extractions, lignes lues,
intervalle et marque imprimés compris ([[D-267]]). Le
document source, lui, a désormais une règle ([[D-258]], ci-dessous).
Porteur : responsable, avec conseil qualifié. Échéance
proposée : **2026-10-21**, date de revue de la dérogation.

2026-10-14 : durées fixées par [[D-283]] §1-2 (ci-dessus) ; borne levée par [[D-265]] ; restes de la rubrique : point de départ des 10 ans à valider par le conseil avant toute mise en œuvre, rien ne s'efface sur cette règle avant sa réponse ([[D-283]] §2, [[D-284]] §6) ; texte patient signé et mise en œuvre ([[D-283]] §10) ; échéance du 2027-06-30 ([[D-265]] §4).

**Compte rendu biologique déposé : purgé ([[D-258]], arbitrages du responsable
du 2026-10-02).** Le document est purgé dès que toutes les lignes de son
extraction courante sont décidées (validées ou écartées), et **au plus tard 30
jours après son dépôt**, décidées ou non. *(Amendé par [[D-318]] le
2026-10-17 : les lignes non décidées ne restent plus décidables sans lui ; à
la même échéance, elles s'effacent avec les lignes écartées, et avec chaque
extraction restée sans ligne validée.)* Restent l'empreinte du document et,
pour chaque extraction qui porte au moins une ligne validée, sa trace (modèle,
version du procédé, lignes validées et leurs décisions, actes de lecture) :
c'est elle qui tient la provenance des résultats validés (A5) ; sa durée suit
le dossier ([[D-283]] §2). D'un compte rendu sans ligne validée, seule la
trace du dépôt reste — date et empreinte ([[D-318]] §2).

- **Tenue par la base** (migration `bio_ingest_purge_compte_rendu_v1`) : la
  purge est la seule modification admise d'un compte rendu, son motif est
  vérifié, jamais pendant une extraction ; un document purgé ne se relit plus.
- **L'échéance** est tenue par un cron Scalingo (`web/cron.json`), dans un
  conteneur ponctuel chez l'hébergeur.
- **L'écart ([[D-269]] §3, déclaré le 2026-10-07)** : un document transmis
  par le patient et écarté par le praticien (illisible, ou pas le compte
  rendu de ce patient) est purgé **aussitôt**, motif `ecarte`. Les mêmes
  conditions que la purge s'appliquent : aucune ligne validée, et aucune
  extraction en cours.
- **Ce que la purge n'efface pas** : les copies du document dans les
  sauvegardes de l'hébergeur, jusqu'à expiration de leur rétention. **Durée
  établie le 2026-10-10 : 12 mois au plus après la purge.** Source : la
  politique publiée par Scalingo pour le plan Business de la base
  (`postgresql-business-512`). Elle garde une sauvegarde quotidienne 7 jours,
  une hebdomadaire 8 semaines et une mensuelle 12 mois. La restauration à un
  instant donné couvre 7 à 14 jours. Le constat par la CLI du même jour concorde :
  une sauvegarde quotidienne sur les 8 derniers jours, puis une par dimanche
  depuis le 2026-08-23, la première après le cutover. Une copie prise avant la
  purge s'éteint donc au plus tard 12 mois après celle-ci. La borne mensuelle
  n'est pas encore observable sur une base ouverte le 2026-08-22.
- **Déclarée au patient** par « Vos données personnelles » **v12** (accusé
  exigé), qui remplace « conservé dans votre dossier ». **Les sauvegardes sont
  déclarées par la v14 du 2026-10-10** (accusé exigé, motif de la v10). Le
  texte a été validé par le responsable le même jour, au lot de clôture de
  BIO-INGEST : « Des copies peuvent en subsister jusqu'à 12 mois après sa
  suppression dans les sauvegardes de notre hébergeur, qui ne servent qu'à
  rétablir le service en cas d'incident ; elles s'effacent ensuite
  d'elles-mêmes. » Le reste de la v13 est inchangé.
- **État** : migration appliquée et constatée par conteneur le 2026-10-02
  (PR 1, #1286) ; la décision qui purge, la relance refusée et le cron
  (`npm run bio:purge-echeance`, chaque heure) arrivent avec le code
  consommateur (PR 2). Le cron clôt d'abord les extractions abandonnées, qui
  bloqueraient sinon la purge. `WN_BIO_INGEST_ENABLED` ne se pose qu'une fois la purge en œuvre et le
  premier passage du cron constaté (`docs/FEATURE_FLAGS.md`) : aucun document
  ne peut être déposé avant. Mise à jour du 2026-10-17 ([[D-318]]) : le même
  cron efface désormais, à 30 jours du dépôt, les lignes non validées et les
  extractions restées sans ligne validée ; l'écart d'un document transmis les
  efface aussitôt. Première échéance réelle en production : 2026-11-02.

**Documents déposés par le patient ([[D-330]], J3-collecte, déclaré le
2026-10-18).**

- **Durée** : celle du dossier ([[D-283]] §2) — texte de collecte de G-11 :
  « conservés avec votre dossier, selon les mêmes règles que le reste de vos
  données ». Aucune purge propre, au contraire du compte rendu biologique.
- **Retrait** sur demande (dépôt par erreur, ou exercice d'un droit) : le
  praticien du dossier efface le document ; la ligne reste, sans contenu, avec
  les dates et le motif, preuve que la demande a été traitée. Tenu par la base
  (migration `documents_deposes_patient_v1`).
- **Ce que le retrait n'efface pas** : les copies du document dans les
  sauvegardes de l'hébergeur, jusqu'à expiration de leur rétention, et
  l'espace disque avant le passage du VACUUM — même limite que la purge du
  compte rendu.
- **Effacement du dossier** : les classements puis les documents, nommément
  (`patient/effacement.ts`).

**Constats du praticien ([[D-331]], BP-11, déclaré le 2026-10-19).**

- **Durée** : celle du dossier ([[D-283]] §2). Aucune purge propre. Un
  constat remplacé ou retiré reste à l'historique, lisible par le praticien.
- **Effacement du dossier** : les pièces puis les constats, nommément, avant
  les réponses de questionnaire et les résultats qu'ils désignent
  (`patient/effacement.ts`).

**Données physiologiques et traitements en cours ([[D-335]], BP-13, déclaré
le 2026-10-21).**

- **Durée** : celle du dossier ([[D-283]] §2). Aucune purge propre. Une
  ligne remplacée, arrêtée ou retirée reste à l'historique, lisible par le
  praticien.
- **Effacement du dossier** : après les pièces et les constats qui les
  citent, les lignes de traitement et de données physiologiques, nommément
  (`patient/effacement.ts`).

**Décisions de parcours ([[D-343]], BP-15, déclaré le 2026-10-22).**

- **Durée** : celle du dossier ([[D-283]] §2). Aucune purge propre. Une
  ligne remplacée ou retirée reste à l'historique, lisible par le
  praticien.
- **Effacement du dossier** : les décisions de parcours, nommément, avant
  les versions du protocole qu'elles désignent (`patient/effacement.ts`).

## 9. Droits des personnes et modalités d'exercice

**Source.** `registre.ts`, section « Exercer mes droits » : accès,
rectification, effacement, limitation, opposition, retrait d'une autorisation.
Deux canaux — la carte « Signaler un problème » de l'espace patient (choix
« Je souhaite exercer un droit », enregistré en `TrustRightsRequest`) et
l'adresse `martialcayre@wellneuro.fr`. Un canal d'incident de confidentialité
distinct existe (`TrustPrivacyIncident`).

Le texte patient précise déjà que « certains droits dépendent du cadre
applicable au traitement concerné » — formulation prudente, cohérente avec le
trou de la rubrique 3.

**Tranché le 2026-10-13 ([[D-283]] §6).** Délai : un mois, prolongeable dans
les cas prévus (RGPD art. 12.3). Identité : une demande faite depuis le portail
est réputée identifiée par la session ; une demande par e-mail est renvoyée au
portail ; aucune pièce d'identité n'est collectée. Circuit : le responsable
reçoit, trace et répond. La procédure, à écrire sans autre arbitrage, l'est
ci-dessous (2026-10-14).

**Procédure (écrite le 2026-10-14, G-8 ; [[D-283]] §6, §10 f).**

1. **Réception.** Au portail, la demande est enregistrée en
   `TrustRightsRequest`, statut `recu`, datée (`soumis_le`). Une carte du Fil
   du jour la signale tant qu'elle est `recu` ou `en_cours`. Par e-mail : la
   demande est datée à sa réception, et le courriel reçu est gardé. La
   réponse, dans le délai, invite la personne à la confirmer depuis le
   portail (carte « Signaler un problème », choix « Je souhaite exercer un
   droit ») : cette confirmation vaut vérification d'identité (RGPD
   art. 12.6), sans pièce d'identité. Une personne qui n'a plus accès au
   portail ([[D-295]] §1) : la réponse part toujours à l'adresse e-mail
   enregistrée à son dossier, et la demande ne s'instruit qu'à sa
   confirmation depuis cette boîte, quelle que soit l'adresse d'expédition
   (celle-ci se falsifie).
2. **Délai.** Un mois à compter de la réception, quel que soit le canal (RGPD
   art. 12.3). Prolongeable de deux mois si la demande est complexe ou si les
   demandes sont nombreuses : le patient en est informé dans le premier mois,
   avec le motif.
3. **Identité.** Une demande faite au portail est réputée identifiée par la
   session. Aucune pièce d'identité n'est demandée ni conservée.
4. **Instruction.** Le statut passe à `en_cours`. Selon le type :
   - accès et portabilité : l'export du dossier
     (`api/praticien/export-dossier`), remis au patient ;
   - rectification : la correction dans le dossier ;
   - effacement : l'effacement du dossier, tout ou rien
     (`lib/patient/effacement.ts`), qui efface aussi la demande ; rien n'est
     retenu au titre de l'archive intermédiaire tant que son point de départ
     n'est pas validé ([[D-283]] §2) ;
   - retrait d'une autorisation : le retrait dans « Mes choix et
     autorisations », s'il n'a pas été fait par le patient lui-même ;
   - limitation, opposition, information : une réponse écrite, motivée au
     regard du cadre du traitement concerné.
5. **Réponse.** Par e-mail, depuis l'adresse du responsable, dans le délai :
   le portail ne sert pas encore la réponse. Le statut passe à `traite` une
   fois la réponse envoyée, avec son texte (`reponse`) ; `examine_le` date
   l'examen, et la preuve de l'envoi est le courriel envoyé, gardé dans la
   boîte du responsable. Les courriels de demande et de réponse se
   conservent la durée du dossier ([[D-283]] §2 ; [[D-295]] §2) ; après un
   effacement, ils restent la seule trace de la demande et se conservent
   5 ans après la réponse, puis sont supprimés de la boîte. Puis `clos` quand
   plus rien n'est attendu. Aucune demande n'est supprimée, sauf par
   l'effacement du dossier. Le code refuse `traite` sans réponse écrite,
   saisie à l'écran ou déjà enregistrée ([[D-295]] §3, #1451).
6. **Refus ou réponse partielle.** Motivés par écrit. La réponse indique la
   possibilité d'introduire une réclamation auprès de la CNIL et de former un
   recours juridictionnel (RGPD art. 12.4).
7. **Mineurs.** Les titulaires de l'autorité parentale exercent les droits
   sur les données de l'enfant ([[D-283]] §5 ; arbitrage 5 de G-11). Jusqu'à
   J3-mineurs, aucun parent n'a accès au portail : le responsable répond à la
   main au titulaire qui a donné l'accord, à l'adresse notée lors de cet
   accord, quelle que soit l'adresse d'expédition (celle-ci se falsifie) ; la
   demande ne s'instruit qu'à sa confirmation depuis cette boîte, comme à
   l'étape 1. Toute autre demande (autre titulaire, adresse inconnue) passe en
   traitement manuel, comme un désaccord ([[D-284]] §4) ; aucune pièce
   d'identité n'est collectée (étape 3). Délai de l'étape 2 ; courriels gardés
   comme à l'étape 5 ([[D-342]] §6). Le circuit en ligne part avec J3-mineurs.

*Antérieurement :* le **délai de réponse** annoncé, la **procédure de
vérification d'identité** du demandeur, et le **circuit interne de traitement**
d'une demande reçue n'étaient écrits nulle part. Une demande arrivant aujourd'hui serait traitée
sans procédure écrite.

## 10. Mesures de sécurité

**Source.** Le tableau des sept exigences de
`CHECKLIST_ACTIVATION_G_TRUST_04.md` fait foi. En synthèse :

- **Cloisonnement** — RLS `deny-all` sur 71 tables `public` (migration
  `20260707123710_enable_rls_security`) **plus** gardes applicatifs
  (`web/src/lib/praticien/appartenance.ts`, portail résolu par cookie signé).
  Posture retenue et motivée en `docs/DECISIONS.md` D-005 — sous réserve de la
  contradiction DPO signalée en rubrique 1.
- **Accès patient** — lien magique haché, expirant en 24 h, à usage unique
  (G4, activé en production le 2026-07-21) ; coupe-circuit de session
  `sessionsInvalidesAvant`.
- **Piste d'audit** — `journal_acces_dossiers`, écriture branchée sur les
  24 routes GET « dossier nommé » (23ᵉ le 2026-09-03 : lecture des résultats
  biologiques, étage 2 du rayon — D-122 §2 ; 24ᵉ le 2026-09-04 : relecture des
  documents patient déjà consignés — LOT-01 « Biologie exploitée », une pièce
  remise se relit telle qu'elle est partie). **Cette 24ᵉ lecture est
  AUTOMATIQUE, pas gestuelle** : elle part avec l'affichage du panneau de
  proposition, donc une ouverture de fiche inscrit deux accès pour ce rayon là
  où elle en inscrivait un. C'est assumé — ce que la route rapporte est
  affiché, et journaliser une lecture faite vaut mieux qu'un affichage muet.
  **Limites écrites** : pas
  d'écran de consultation (lecture par requête SQL), POST exclus — y compris
  la saisie d'un résultat, qui ne lit rien du dossier et dont l'écriture est
  tracée par la ligne consignée elle-même (`saisi_par`, `saisi_le`) ; les
  POST courrier/document patient, eux, journalisent parce qu'ils DÉRIVENT le
  dossier entier —, liste vide non journalisée.
- **Procédure de violation** — `docs/PROCEDURE_VIOLATION_DONNEES.md`, écrite
  **et exercée sur table** le 2026-07-22 (fiche 2026-EX1, scénario fictif).
- **Hygiène du dépôt** — `docs/securite_rgpd.md`, garde anti-secrets
  (`scripts/check_no_secrets.sh`).

**TROUS.** Aucun **pentest** ni **revue de sécurité externe** (exigence 7 du
gate, restée entière). Le **registre physique des violations** n'existe pas
(EX-3). ~~La preuve fonctionnelle en production de la piste d'audit reste à
faire.~~ **Produite le 2026-08-22** (revue G-TRUST-04 reprise) : 947 accès
journalisés, 14 dossiers distincts, 27 routes, du 2026-07-23 au 2026-08-22,
dont 99 écritures après la bascule Scalingo — historique porté, journal
vivant post-cutover (sonde lecture seule, agrégats sans identité). Trou
nouveau relevé le même jour : **`docs/RUNBOOK.md` est périmé depuis le
cutover** (chapitres infra Vercel/Supabase), à réécrire pour Scalingo.
**2026-10-14** : `docs/RUNBOOK.md` décrit Scalingo ; ses derniers renvois
datés à Vercel et Supabase portent une ligne datée du même jour ([[D-120]]).

## 11. Information des participants

**Source.** Le document `DONNEES_CONFIDENTIALITE_V1`, publié le **2026-07-16**,
versionné et haché (`registre.ts`, hash `b4a5551b…`). Les acquittements sont
tracés (`TrustAcknowledgement`), les choix aussi (`TrustChoiceEvent`).

**TROU — partiellement comblé le 2026-08-19.** L'information délivrée aux
personnes **sur l'écart d'hébergement** — le fait que les données sont
hébergées hors d'un hébergeur certifié HDS pendant la phase de test — n'était
**consignée nulle part** : ni sa date, ni sa forme, ni son contenu, ni la
modalité de retrait. C'est la première recommandation de la décision du
responsable du 2026-07-21 (« Tracer l'information délivrée »), et elle porte
la moitié de l'argumentaire qui autorise la phase de test.

**Ce qui est consigné**, sur déclaration du responsable de traitement rendue
en session le 2026-08-19 — **cette déclaration est la seule source ; il
n'existe aucune trace au dépôt de l'information elle-même** :

- **Forme** : orale, en consultation.
- **Contenu** : l'écart d'hébergement — les données sont hébergées hors d'un
  hébergeur certifié HDS pendant la phase de test.
- **Période, telle que déclarée** : en continu, « depuis la souscription HDS
  Scalingo ». **Cet ancrage n'est pas une date établie** : le dépôt refuse de
  tenir cette souscription pour acquise (« une souscription inférée n'est pas
  une preuve produite », `docs/claude/propositions/2026-07-24-audit-migration-hds/RUNBOOK_MIGRATION_SCALINGO.md`), et `D-047` puis
  `D-078` rappellent qu'**aucune option HDS n'est active tant que l'annexe
  n'est pas signée**. Le staging HDS a été provisionné le 2026-07-24 — cette
  date **date le staging, pas l'information**.

**Ce qui reste ouvert dans ce trou, et n'est donc pas comblé** :

- la **date de délivrance** — une période déclarée « en continu » n'en est
  pas une, et le point de départ n'est pas établi (ci-dessus) ;
- la **modalité de retrait**, qui n'a pas été consignée ;
- l'**absence de trace écrite par participant** : aucun acquittement
  individuel ne porte cette information — le dispositif TRUST couvre
  `DONNEES_CONFIDENTIALITE_V1`, qui ne mentionne pas l'écart HDS ;
- le **périmètre des personnes couvertes** : la déclaration ne dit pas si les
  personnes vues avant le point de départ ont été informées.

**Ce qui reste dû — et `D-078` l'aggrave.** La décision du 2026-08-19 (gate
levé par écart assumé, migration engagée sans attendre l'annexe, fenêtre de
moindre couverture acceptée) change la nature de l'écart : l'information
délivrée jusqu'ici décrit un état antérieur. Elle est donc **à renouveler**,
et un support durable est préparé pour validation du responsable :
`docs/claude/campagnes/2026-08-18-echeance-hds-g-trust-04/sources/brouillon-information-hebergement-v2.md`.
Sa publication (v2 du document versionné, re-acquittement éventuel) est un
geste TRUST distinct, hors de ce dossier.

## 12. Hébergement — écart assumé et daté

**Source.** Ni Supabase ni Vercel ne figurent à l'annuaire ANS des hébergeurs
certifiés HDS — établi le 2026-07-21, sur 404 hébergeurs recensés. Le
responsable du traitement a néanmoins autorisé une phase de test avec des
personnes réelles, **décision datée du 2026-07-21**, **bornée au 2026-10-21**,
« sans reconduction écrite, la règle du dépôt reprend »
(`CHECKLIST_ACTIVATION_G_TRUST_04.md`, relayée par
`docs/claude/REGISTRE_FRONTIERES.md` §1).

2026-10-14 : reconduite sans terme par [[D-265]] ; la borne du 2026-10-21 ne s'applique plus ; échéance des trous ouverts 2027-06-30 ([[D-265]] §4, [[D-283]] §9).

Une migration vers **Scalingo** (certifié HDS) est décidée (D-006, 2026-07-28 ;
confirmée par D-037, 2026-08-09) ~~et non exécutée~~ — **exécutée pour les
données le 2026-08-22** (bloc « État au 2026-08-22 » ci-dessous) ; cutover DNS
et décommissionnement restants. ~~Elle est subordonnée, dans
l'ordre : accord de sous-traitance **en vigueur et archivé** (D-037 : la pièce
s'archive, elle ne s'e-signe pas — et elle n'est pas au dossier au 2026-08-09),
puis confirmation écrite du périmètre HDS de la région cible, puis seulement
données réelles.~~ **Les cinq réserves de D-006 restent entières**, dont la (3),
confirmation DPO — elle-même suspendue à la contradiction DPO de la rubrique 1.

**État au 2026-08-19 — deux décisions ont modifié cet ordre, sans le rendre
caduc :**

- **`D-047` (2026-08-11)** : la confirmation écrite du périmètre HDS de
  `osc-fr1` est **obtenue** — par la **réponse écrite de Scalingo du
  2026-08-11** (rubrique 6), et non par le certificat LNE n° 38436-2, qui ne
  nomme aucune région et ne suffirait donc pas. En
  revanche, la lecture de `D-037` (« la pièce s'archive, elle ne s'e-signe
  pas ») est **démentie par le fournisseur** : le DPA et une **annexe HDS
  distincte** se signent séparément.
- **`D-078` (2026-08-19)** : le gate G-TRUST-04 est **levé par arbitrage du
  responsable** — écart assumé, **pas** mise en conformité : l'état des sept
  exigences est inchangé (une ❌, six partielles, aucune ✅), le gate est levé
  **malgré** cet état. La **migration est engagée sans attendre la signature
  de l'annexe**. Point accepté sciemment, à garder lisible : entre la bascule
  et cette signature, les données réelles ne sont couvertes **ni** par la
  dérogation en vigueur — qui vise l'implantation Vercel — **ni** par une
  option HDS active ; sur cette fenêtre, la posture est **moins couverte
  qu'avant la migration**. Le **décommissionnement** de Vercel/Supabase reste
  subordonné à la signature (seul geste irréversible). **La date de revue est
  inchangée : 2026-10-21.**
  2026-10-14 : borne levée par [[D-265]] ; échéance des trous ouverts 2027-06-30 ([[D-283]] §9).

**État au 2026-08-22 — la bascule des données a eu lieu.** Le chargement des
données réelles vers Scalingo (app `wellneuro`, région `osc-fr1`,
`--hds-resource`, add-on PostgreSQL Business) s'est achevé le **2026-08-22 à
03:24:09 CEST** (dump de la source le même jour à 02:13 CEST). Comptes
vérifiés conformes à la référence figée côté source — dont 19 patients et 118
réponses de questionnaires ; déroulé et leçons :
`docs/claude/propositions/2026-07-24-audit-migration-hds/RUNBOOK_MIGRATION_SCALINGO.md`,
section « Ce que l'exécution de la migration des données a appris ».
**La fenêtre de moindre couverture de `D-078` est ouverte depuis cette date.**
Elle se ferme par la signature de l'annexe HDS (pendante — demandée le
2026-08-12, relancée le 2026-08-19, sans réponse au 2026-08-22) ou se rejuge à
la revue du 2026-10-21. ~~Le **cutover DNS n'est pas fait** — le service aux
personnes reste rendu par Vercel/Supabase — et le **décommissionnement reste
interdit** jusqu'à la signature.~~

2026-10-14 : fenêtre fermée le 2026-08-30 ([[D-121]], ci-dessous) ; revue du 2026-10-21 sans objet, borne levée par [[D-265]] ; échéance des trous ouverts 2027-06-30 ([[D-283]] §9).

**Cutover fait le 2026-08-22 au matin.** La bascule DNS
(`app.wellneuro.fr` → `wellneuro.osc-fr1.scalingo.io`, TTL 300 s) est
constatée propagée avec certificat TLS émis vers **04:05 CEST** ;
`NEXTAUTH_URL` alignée et portée par un redémarrage à **09:53 CEST** (la
boucle OAuth praticien vérifiée sur le domaine) ; l'envoi SMTP validé en
production à **10:16 CEST** (`250 OK`, après correction de l'identifiant —
fournisseur : Google Workspace, rubrique 6). Depuis, **le service aux
personnes est rendu par Scalingo** ; Vercel et Supabase sont gardés chauds
comme filet de retour. **Le décommissionnement est reprogrammé par `D-080`**
(2026-08-22) : fenêtre de stabilité de dix jours, puis décommissionnement au
**2026-09-01**, annexe signée ou non — la subordination de `D-078` est levée
à cette date, la preuve d'effacement écrite reste due.

**Ce n'est pas une conformité. C'est un écart assumé, compté et daté** — et
`D-078` l'élargit sans en changer le terme ; depuis le 2026-08-22, il n'est
plus une intention mais un état de fait, daté à la minute.

**Annexe HDS signée le 2026-08-30** — déclaration du responsable, consignée
le 2026-08-31 (`D-121`) : **la fenêtre de moindre couverture de `D-078` est
fermée**, et l'écart ci-dessus cesse d'être un écart. Le même soir, le
responsable a **validé expressément l'exécution du décommissionnement**
(`D-120`, anticipation d'un jour actée sur le terme de `D-080`) : gestes
réversibles d'abord (domaine détaché du projet Vercel, intégration GitHub
déconnectée), suppressions ensuite — projet Vercel puis projet Supabase gelé.
**La preuve d'effacement écrite de chaque suppression se consignera ici, au
moment du geste** (écran de confirmation daté, e-mail du fournisseur,
confirmation d'effacement des backups) ; tant que cette entrée n'existe pas,
les suppressions ne sont pas faites.

**Suppression du projet Supabase — faite le 2026-09-01, entre 00:12 et
00:18 CEST.** Geste du responsable, par le CLI Supabase depuis son propre
terminal (après authentification `supabase login`), conformément à `D-080`
(« geste du responsable ») et `D-120`. Préflight santé rejoué le jour même —
le terme exact de `D-080` — à 00:14 CEST : production Scalingo
`running`/`HDS=true`, deux conteneurs web, DNS exclusivement Scalingo,
service HTTP sain. **Preuve écrite** : transcript avant/après de la session
d'assistance, archivé hors dépôt par le responsable — à 00:12, le connecteur
listait l'**unique** projet de l'organisation `dshxeplvjhhbkxnllwdd`
(`Wellneuro-app`, ref `ohnbmypinamzzfhqymlt`, eu-central-1,
`ACTIVE_HEALTHY`) ; à 00:18-00:20, **deux canaux indépendants** (CLI
authentifié sur la même organisation, et connecteur de session) renvoient
zéro projet et la ref ne résout plus. Aucune capture d'écran ni e-mail
capturés au moment du geste : le transcript biface tient lieu de preuve
écrite principale. **Restent dus** : la confirmation écrite par le support
Supabase de l'effacement des backups automatiques (demande à envoyer),
l'archivage de tout e-mail de confirmation reçu, et la **partie Vercel** du
décommissionnement (détacher le domaine, déconnecter GitHub, supprimer le
projet — preuve à consigner ici au moment du geste).

**Suppression du projet Vercel — faite le 2026-09-01, constatée à
00:39 CEST.** Gestes du responsable au dashboard, dans l'ordre prévu par
`D-120` : domaine `app.wellneuro.fr` détaché, intégration GitHub déconnectée
(fin des déploiements fantômes constatés depuis le ~2026-08-28), puis
suppression du projet `wellneuro-app`
(`prj_9sg8HgiCvxQfZiULTnmXIaU5c12k`). **Vérification indépendante au même
moment** : l'équipe Vercel du compte ne contient plus aucun projet.
Transcript archivé hors dépôt par le responsable, avec celui de Supabase.
**Le décommissionnement `D-080` est intégralement exécuté.** Il ne reste, au
titre de la preuve, que la confirmation écrite d'effacement des backups
automatiques Supabase (demande au support à envoyer, réponse à archiver et à
référencer ici).

## 13. Analyse d'impact (AIPD)

**À établir par le responsable du traitement** ([[D-265]] §3), sur la trame
ci-dessous. Elle est listée comme réserve à lever dans D-006 et dans
`CHECKLIST_FINALISATION.md:67`. Rien n'est conclu ici : la trame pose les
questions, le responsable y répond. Ce document ne doit pas être confondu avec
l'AIPD elle-même.

**A. Le seuil : une AIPD est-elle requise ?** Les critères des lignes
directrices du G29 (WP248 rév. 01, reprises par le CEPD), à cocher ou non par
le responsable, chacun avec son motif :

- [ ] données sensibles ou à caractère hautement personnel —
- [ ] personnes vulnérables —
- [ ] traitement à grande échelle —
- [ ] évaluation ou notation —
- [ ] décision automatisée avec effet juridique ou similaire —
- [ ] surveillance systématique —
- [ ] croisement ou combinaison d'ensembles de données —
- [ ] usage innovant ou nouvelle solution technologique (modèles d'IA des rubriques 2 bis et 2 ter compris) —
- [ ] traitement qui empêche d'exercer un droit ou de bénéficier d'un service —

Conclusion du responsable : **AIPD non requise à ce stade.** Il statuera à
nouveau quand le produit sera achevé, ce qui est encore loin d'être le cas.
Déclaration rendue en session le 2026-10-04, consignée par l'assistant. Les
critères ci-dessus n'ont pas été renseignés un à un.

**Note du 2026-10-05, versée au réexamen ([[D-267]] §8).** Le relevé de la
rubrique 2 ter conserve désormais aussi l'intervalle de référence et la marque
d'anomalie imprimés par le laboratoire, sur la ligne lue, au-delà de la purge
du document. Ni flux ni destinataire nouveau ; une donnée de santé de plus,
conservée plus longtemps que le document qui la portait. La conclusion du
2026-10-04 n'est pas rouverte ici : ce fait est porté au réexamen du
responsable.

**Réexamen du 2026-10-15 ([[D-313]]).** Faits versés depuis le 2026-10-04 :
commentaires imprimés par le laboratoire recopiés et conservés après la purge
du document ([[D-278]] §3) ; seules les pages masquées par le praticien partent
à l'extraction (`usage_ia` v8) ; OpenAI destinataire ([[D-299]]) ; mineurs
jusqu'à 18 ans et date de naissance demandée ([[D-284]] §3-4, [[D-302]]) ; NIR
retiré ([[D-284]] §2) ; file durable des extractions ([[D-282]]). Le
déclencheur « à l'achèvement du produit » est remplacé : réexamen au premier
des cinq événements de [[D-286]] §2, à l'ouverture de l'étage assistant, à tout
nouveau destinataire ou nouvelle catégorie de données, et au plus tard le
2027-06-30. Conclusion du responsable maintenue au 2026-10-15 : **AIPD non
requise**. Les neuf critères ci-dessus restent à cocher de sa main, chacun avec
son motif ([[D-283]] §9) ; ce motif porte la conclusion.

**B. Si elle est requise : l'AIPD elle-même**, en pièce dédiée.

1. Description du traitement : finalités (rubrique 2), données (rubrique 5),
   destinataires (rubrique 6), durées (rubrique 8), supports.
2. Nécessité et proportionnalité : base légale (rubrique 3), minimisation,
   exactitude, information (rubrique 11), droits (rubrique 9), sous-traitants
   (rubrique 6), transferts (rubrique 7).
3. Risques pour les personnes — accès illégitime, modification non désirée,
   disparition : pour chacun, sources, impacts, vraisemblance, gravité.
4. Mesures existantes ou prévues (rubrique 10), risque résiduel.
5. Avis éventuels (DPO, personnes concernées) ; validation datée du responsable.

Où elle se dépose : hors dépôt si elle décrit des failles exploitables ; ce
dossier en garde alors la conclusion, la date et l'emplacement.

## 14. Récapitulatif des trous

| # | Rubrique | Ce qui manque | Porteur | Échéance | Où la réponse se consignera |
|---|---|---|---|---|---|
| 1 | Responsable | Identité juridique exacte | Responsable | 2027-06-30 (était 2026-10-21) | ici, rubrique 1 |
| 1 | Responsable | **Clos le 2026-10-13 ([[D-284]] §6) : pas d'obligation de désigner un DPO à cette échelle, selon l'avis reçu ; analyse datée à revoir à chaque changement d'échelle.** *Historique :* aucun DPO désigné, le responsable est le point de contact ([[D-283]] §7). Contradiction DPO (G-TRUST-02 vs D-005) | Responsable | fermé | `docs/DECISIONS.md` |
| 3 | Base légale | ~~Qualification, non rédigée à ce jour~~ — **qualifiée le 2026-10-04** par déclaration du responsable ([[D-265]] §3) | Responsable | fermé | ici, rubrique 3 |
| 4 | Personnes | **2026-10-13 ([[D-284]] §3-4) : mineur jusqu'à 18 ans, entrée validée par un titulaire de l'autorité parentale, âge inconnu demandé avant toute fonction de santé ; reste la validation des 15–17 ans par un avocat, préalable de J3-mineurs ([[D-342]] §5).** *Historique :* encadrés, non exclus ([[D-283]] §5). Cas des mineurs | Responsable | 2027-06-30 (était 2026-10-21) | `SOURCES_ET_VALIDATIONS.md` |
| 5 | Catégories | **Soldé le 2026-10-13 ([[D-283]] §3) : les six classées en catégorie particulière, la liste du banc est vide.** *Historique — constat d'origine :* **Six tables filles de `patients` ne sont pas déclarées** — dix-sept au 2026-09-09, mesuré en comparant `schema.prisma` à cette rubrique (38 modèles portaient alors une relation vers `Patient`, 21 y étaient cités ; ils sont 46 et 40 au 2026-09-13). ONZE noms sont sortis de la liste depuis, dont dix le 2026-09-13 : `DecisionPrioritySelection`, déclarée avec `EcartementProposition` sous une même entrée ; et neuf **dettes périmées** — déjà déclarées depuis le rattrapage `D-167`, mais laissées dans la liste, donc DISPENSÉES de vérification alors qu'elles n'en avaient plus besoin. Les qualifier (art. 9 ou non) reste un acte juridique, pas une écriture de code ; la liste vit dans `rubrique5.modeles.test.ts`, qui **rougit sur toute table ajoutée après cette date** et, depuis la purge, sur toute déclaration retirée pour l'une des dix — le passif est ouvert, la récidive est fermée | Responsable + conseil | fermé | ici, rubrique 5 |
| 5 | Catégories | ~~Catégorie « résultats biologiques » absente~~ — **déclarée le 2026-09-09** (quatre tables du rayon), mais **après** la pose de `WN_CB_RESULTS_ENABLED` que la rubrique 2 posait comme conditionnée à cette déclaration préalable. Écart daté en rubrique 2 ; portée nulle sur les données (0 ligne au constat) | — | fermé | ici, rubriques 2 et 5 |
| 6 | Sous-traitants | Aucun DPA archivé — forme connue depuis la réponse du 2026-08-11 (DPA + annexe HDS distincte, signature séparée requise) mais ~~**signature et archivage non faits**~~ — **annexe HDS signée le 2026-08-30** (déclaration du responsable, consignée le 2026-08-31, `D-121`) ; **restent dus : l'archivage du document signé, et la signature + archivage du DPA** | Responsable | 2027-06-30 (était : ~~avant bascule Scalingo~~ — ordre suspendu par `D-078` : **dès réception de l'annexe** (demandée 2026-08-12, relancée 2026-08-19 — **canal et dates vérifiés au fil le 2026-08-20**, rubrique 6 ; **signée le 2026-08-30**) ; ~~en tout état de cause **avant tout décommissionnement**~~ — **plus depuis `D-080`** (2026-08-22) ; archivage dû **avant la revue du 2026-10-21**) | `CHECKLIST_FINALISATION.md` §F |
| 6 | Sous-traitants | ~~Périmètre HDS de la région `osc-fr1` non confirmé~~ — **répondu par écrit le 2026-08-11** : couvert, activités 5 et 6 incluses | Responsable | fermé | ici, rubrique 6 |
| 6 | Sous-traitants | ~~Fournisseur SMTP réel non identifié~~ — **identifié le 2026-08-22 : Google Workspace** (rubrique 6, TROU 2 — SPF/MX/DKIM du domaine + expéditeur du code) ; **restent dus** : localisation du traitement et couverture DPA | Responsable | 2027-06-30 (était 2026-10-21) | ici, rubrique 6 |
| 6 | Sous-traitants | ~~Sentry non déclaré au patient~~ — **déclaré le 2026-09-07** dans `donnees_confidentialite@v5` (`D-141`), résidence UE rendue invariante par `sentryRegion.ts` ; ~~reste dû : le DPA Sentry~~ — **DPA signé le 2026-10-21** (révision de mai 2024, DocuSign, copie hors dépôt) | Responsable | fermé (était 2027-06-30) | `contenus/registre.ts`, rubrique 6 |
| 6 | Destinataires | **Correspondance médecin — la voie d'EXCEPTION, maintenue ([[D-265]] §2)** — ~~n'a aucune justification écrite~~. Le traitement est inventorié depuis `D-222` et ses quatre termes sont posés ; ce qui manque est la qualification de la seule route non gardée, `api/praticien/adressage/courrier`, qui transmet une donnée de santé à un tiers **malgré un refus exprimé** — les deux autres routes sont fail-closed sur refus, retrait et silence. Les deux voies ne peuvent pas reposer sur la même justification. ~~Sa justification s'écrit dans la trame de la rubrique 3~~ — **base déclarée le 2026-10-04** : 6.1.d + 9.2.h | Responsable | fermé | ici, rubrique 3 |
| 7 | Transferts | **2026-10-13 ([[D-284]] §5-6) : CCT pour Anthropic, cadre UE–États-Unis pour Google et Sentry s'il les couvre ; restent les preuves à archiver et les TIA.** Sentry : mécanisme contractuel posé par le DPA signé le 2026-10-21 (annexe 3 : Data Privacy Framework, repli sur les CCT module 2) ; restent dus, pour Sentry aussi, la preuve de sa certification DPF et la TIA du repli. Mécanisme invoqué (CCT/DPA) | Responsable | 2027-06-30 (était 2026-10-21) | ici, rubrique 7 |
| 7 | Transferts | ~~**Demande de DPA à Anthropic non envoyée**~~ — **envoyée le 2026-10-01 à 17:34 UTC (19:34 heure de Paris)** (date établie par capture du message envoyé). La condition de pose du drapeau du LOT-02 est tenue. ~~**Restent dus : la réponse, puis la signature et l'archivage du DPA**~~ — **réponse reçue le 2026-10-02 à 22:23 UTC** : DPA et CCT intégrés aux Conditions commerciales, aucune signature distincte. **Restent dus** : l'archivage d'une copie datée, la date d'opposabilité, la couverture des traitements antérieurs | Responsable | 2027-06-30 (était 2026-10-21, DPA) | `docs/rgpd/DEMANDE_DPA_ANTHROPIC.md` (tableau « Trace à tenir »), puis rubriques 6 et 7 |
| 8 | Conservation | **2026-10-13 ([[D-283]] §2) : durées fixées (active jusqu'à clôture ou 5 ans sans contact, archive 10 ans) ; restent le texte patient signé et la mise en œuvre (§10).** Durées des données de santé — hors le document des comptes rendus biologiques déposés, fixé par [[D-258]] | Responsable + conseil | 2027-06-30 (était 2026-10-21) | ici, rubrique 8 puis `gouvernance.ts` |
| 9 | Droits | **Tranché le 2026-10-13 ([[D-283]] §6) ; procédure écrite le 2026-10-14 (G-8) ; mineurs : à la main jusqu'à J3-mineurs (étape 7, [[D-342]] §6).** *Historique — constat d'origine :* Délai, vérification d'identité, circuit interne | Responsable | fermé | ici, rubrique 9 |
| 10 | Sécurité | **Clos le 2026-10-13 ([[D-283]] §7) : la revue du 2026-08-22 suffit ; test d'intrusion humain obligatoire avant toute offre commerciale ou second compte praticien.** *Historique — constat d'origine :* Pentest / revue externe | Prestataire à engager | fermé | checklist du gate, exigence 7 |
| 10 | Sécurité | **Clos par constat : ouvert hors dépôt le 2026-08-22 (D-085 §3).** *Historique — constat d'origine :* Registre physique des violations (EX-3) | Responsable | fermé | `PROCEDURE_VIOLATION_DONNEES.md` |
| 10 | Sécurité | **Clos par constat : produite le 2026-08-22 (D-085 §2).** *Historique — constat d'origine :* Preuve fonctionnelle de la piste d'audit | Responsable | fermé | checklist du gate, item 4 |
| 11 | Information | **Clos le 2026-10-13 ([[D-283]] §8) : écart fermé depuis le 2026-09-01, information écrite et accusée (v2, v3, jusqu'à v14).** *Historique — constat d'origine :* ~~Information sur l'écart HDS non consignée~~ — **partiellement consignée le 2026-08-19** (forme orale et contenu, sur déclaration du responsable, rubrique 11). **Reste dû** : renouvellement après `D-078`, qui change la nature de l'écart — brouillon de support prêt, publication = geste TRUST distinct | Responsable | fermé | ici, rubrique 11 |
| 11 | Information | **Clos le 2026-10-13 ([[D-283]] §8) : l'information orale est consignée comme non datée.** *Historique — constat d'origine :* **Date de délivrance non établie** et **modalité de retrait non consignée** — deux des quatre composantes du trou d'origine ; la période déclarée (« en continu depuis la souscription HDS ») ne fournit pas de point de départ tenu pour établi par le dépôt | Responsable | fermé | ici, rubrique 11 |
| 11 | Information | **Clos le 2026-10-13 ([[D-283]] §8) : les accusés des versions écrites en tiennent lieu.** *Historique — constat d'origine :* **Aucune trace écrite par participant** de l'information sur l'écart HDS — aucun acquittement individuel ne la porte ; périmètre des personnes couvertes non établi | Responsable | fermé | ici, rubrique 11 |
| 11 | Information | **2026-10-13 ([[D-283]] §8) : un seul dossier reste à la v8 (agrégats, conteneur) ; le praticien l'informe lui-même, geste daté à consigner.** **Deux patients ont accusé `donnees_confidentialite@v8` sans avoir vu `v9`**, qui corrige la promesse inexacte sur le partage. L'accusé de `v9` étant exigé **au portail**, il ne les atteindra qu'à leur prochaine visite — or la production dit qu'on y entre le jour même ou jamais. Deux personnes, mesurées le 2026-09-19 : ce n'est pas un mécanisme à construire mais un geste à décider. Ce qui part vers un patient reste un geste du responsable | Responsable | 2027-06-30 (était : **à fixer** — au plus tôt, en tout état de cause avant le 2026-10-21) | ici, rubrique 11 |
| 13 | AIPD | ~~Absente~~ — **non requise à ce stade**, déclaration du responsable du 2026-10-04 ([[D-265]] §3), **critères du seuil non renseignés** ; à réexaminer à l'achèvement du produit ; **maintenue au 2026-10-15, déclencheur remplacé** ([[D-313]]) | Responsable | réexamen au premier événement de [[D-313]] §2, au plus tard 2027-06-30 (était : à l'achèvement du produit ; avant, 2026-10-21) | ici, rubrique 13 |

Le **2026-10-21** était l'échéance par défaut, date de revue de la dérogation.
La dérogation est reconduite sans terme ([[D-265]] §1) : le responsable a fixé
le 2026-10-04 une échéance unique, le **2027-06-30**, pour chaque trou encore
ouvert ; la date d'origine reste lisible ([[D-265]] §4).

---

## Ce que ce dossier ne fait pas

- Il **ne lève pas** le gate G-TRUST-04.
- Il **ne qualifie pas** de base légale et **ne cite aucun article** du RGPD à
  l'appui d'une conformité.
- Il **ne remplace pas** l'AIPD.
- Il **n'invente aucune durée de conservation** : celles qui manquent sont
  marquées comme manquantes.
- Il **ne tranche pas** la contradiction sur le DPO ; il l'expose.

Voir aussi : `docs/PROCEDURE_VIOLATION_DONNEES.md` (violations),
`docs/securite_rgpd.md` (hygiène du dépôt),
`docs/archive/cadrages/CHECKLIST_ACTIVATION_G_TRUST_04.md`
(gate et exigences).
