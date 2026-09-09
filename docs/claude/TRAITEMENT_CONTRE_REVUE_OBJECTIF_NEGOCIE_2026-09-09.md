# Traitement de la contre-revue adverse — l'objectif négocié (2026-09-09)

*Troisième pièce du cycle, après l'énoncé
(`PROMPT_CONTRE_REVUE_CODEX_OBJECTIF_NEGOCIE_2026-09-08.md`) et le résultat
(`REVUE_CODEX_ADVERSE_OBJECTIF_NEGOCIE_2026-09-09.md`). Elle dit ce qui a été
accepté, ce qui a été refusé, et pourquoi.*

> **Méthode.** Les dix-neuf verdicts n'ont pas été appliqués sur parole. Seize
> points contestés — les trois réfutations, les trois élargissements, les six
> affaiblissements et les quatre trouvailles neuves — ont été rouverts un par un
> contre le code à `e67743dc`. Une contre-lecture qui tue un constat vrai est une
> faute symétrique de celle qui en invente un ([[D-108]]) : l'arbitrage cherchait
> les deux.
>
> **Résultat : 6 verdicts acceptés en entier, 10 en partie, 0 rejeté en bloc —
> mais 11 points où la contre-revue rétrécit à tort.** Douze corrections portées
> au compte rendu, quatre défauts ajoutés dont deux P1.

## 1. Ce qui tombe — le compte rendu avait tort

| Point | Ce qui était écrit | Ce qui est vrai |
|---|---|---|
| **N3.6** | « Les contrats SQL ne sont joués que par le CI » | Faux. `test:worktree` (`web/package.json:41` → `scripts/wn-test-worktree.sh:475`) extrait les 32 contrats déclarés en `--file` dans `ci.yml`, refuse une liste vide, les joue sur une base éphémère et compare joués/extraits (`:508-509`). Le palier est **hors** de la garde `--fast` (dernier `fi` en `:451`). Le contrat des ancres exige en outre l'existence, l'unicité et le caractère partiel des **deux** index (`prisma/checks/episodes_identite_cycle_v1.sql:27-35`). **À dire à la place** : `npm run check` n'en joue aucun (`package.json:39`), et le palier ne réplique que ce que `ci.yml` déclare — 38 fichiers présents pour 32 joués. |
| **N3.1** | Gate 6.0-A le 23/08 ; « premier T0 réel » le 28/08 | Gate le **22/08** ([[D-092]], `DECISIONS.md:5659`) ; le 23 est la date du journal du lendemain. Le T0 du 28/08 **n'a rien persisté** — page rechargée « en attente », origine littérale de [[D-118]] (`SESSION_LOG.md:4987`, `:5001`). Première persistance établie le **06/09** : 4 lignes ([[D-129]]), relues toutes `T0` le 08/09 ([[D-151]]). |
| **N1.2** | L'e-mail mène à une page de dossier qui rend 404 | L'e-mail porte l'URL de **connexion** (`lib/consultation/email.ts:214`). Surface fermée, le patient entre et ne trouve **aucun lien** — la sonde est fail-closed et c'est le seul chemin du dépôt vers cet écran (`LienDossierDeuxVoix.tsx:46`, `:49`). Le 404 ne s'atteint qu'en tapant l'adresse. **Le défaut demeure entier**, et il est muet des deux côtés. |

## 2. Ce qui s'élargit — le constat était vrai mais trop étroit

Trois élargissements pèsent **plus lourd** que le constat d'origine.

- **N1.1 · Deux têtes.** Le blocage ne vise pas la seule ratification : la garde
  `verifierVersionVisee` est appelée **une fois pour les trois gestes** du patient
  et les refuse tous en 409 (`api/portail/dossier/route.ts:619-623`, appel unique
  `:750`). L'état n'a **aucune sortie applicative** : une ligne ne remplace qu'un
  prédécesseur, donc reformuler les deux chaînes en laisse deux
  (`objectifNegocie.ts:320`, `:345`) ; la seule suppression est l'effacement du
  dossier entier. La seconde tête **naît sans course** (`objectifs/route.ts:504-556`,
  `:872-877`) alors que le cockpit l'attribue à « deux reformulations enregistrées
  en parallèle » (`ObjectifNegociePanel.tsx:929`). **Aggravant** : les deux chemins
  qui ajoutent une racine notifient le patient (`:877`, `:912`) en lui promettant
  deux des trois gestes que le portail vient de fermer (`registreGabarits.ts:437`).
- **N1.6 · Assemblage.** L'échec est absorbé pour **tous** les statuts non OK, pas
  seulement le 503 (`ClinicalRuntimeSection.tsx:958`). **Aucun geste ne permet de
  réessayer** : le défaut dure jusqu'à la confirmation d'un épisode suivant, soit
  un acte clinique. Et l'écran n'affiche pas un blanc mais une **cause fausse** —
  « sans épisode confirmé, il n'a rien de signé à citer » (`:743`) — alors que
  l'épisode vient d'être confirmé.
- **N2.7 · Date d'accord.** Ni « Reformuler » ni « Intégrer cet amendement » ne la
  recopient. Surtout, **aucune des trois annulations ne vide le formulaire**
  (`:1158`, `:1181`, `:1193`), masqué et jamais démonté (`:599`) : une date saisie
  puis abandonnée repart avec la version choisie ensuite (`:493`). Ce n'est plus
  une perte, c'est une **date fausse**.

## 3. Où la contre-revue se trompe — corrections NON portées

**Elle se trompe toujours dans le même sens : en rétrécissant.**

- **N2.3 et N3.4 · les INSERT du `ROLLBACK`.** Les deux réfutations reposent sur
  des écritures de `exprime_le` et `dispose_le` par les contrats SQL. Or le fichier
  ouvre `BEGIN;` (`checks/alli_objectif_trois_voix_v1_negatif.sql:53`) et se ferme
  sur `ROLLBACK;` (`:340`) : **rien ne persiste**, et la contre-revue l'écrit
  elle-même (`REVUE…:116`). Un contrat d'épreuve n'est pas un producteur. Les
  quatre colonnes restent sans écrivain ; seule la formule « écrites par personne »
  était trop absolue. `geste_le` n'est écrite nulle part, contrats compris.
- **N1.3 · la cause de l'échec.** L'étiquette AFFAIBLIE avale le seul point non
  arbitré : `erreurCourte` est écrite (`lib/correspondance/patient.ts:53`), absente
  du `select` (`correspondance-medecin/route.ts:243-252`) et du rendu
  (`CorrespondanceMedecinPanel.tsx:167-183`), et **n'apparaît dans aucune décision**.
  [[D-110]] n'écarte l'alerte entrante que pour l'**amendement** (`:3808-3809`) ;
  ratification et réponse d'étape restent hors de toute décision écrite.
- **N1.4 · D-154 §7.** Elle n'« accepte » rien : sous « Ce qui n'est PAS fait »,
  elle annonce « aucune relance, un seul envoi, à l'écriture » et n'écarte que les
  révisions par une **autre** porte (`DECISIONS.md:122`). La répétition par
  celle-ci n'est pas tolérée — elle n'est pas arbitrée.
- **N3.2 · le décompte.** Deux commentaires affirment bien un état de production
  faux, un troisième à moitié, le quatrième était daté et exact. Le compte juste est
  **deux et demi**, et l'inventaire en manquait un cinquième
  (`ClinicalRuntimeSection.test.tsx:458`).
- **N2.6 · les familles visibles.** Le quantificateur cède à raison, mais les deux
  familles visibles le sont **sans marque de version** (`ObjectifNegociePanel.tsx:974`,
  `:1050`), là où le portail dit « sur une formulation précédente ».

## 4. Les quatre défauts ajoutés

| ID | Gravité | Énoncé | Correctif minimal proposé par la contre-revue |
|---|---|---|---|
| **F1** | P1 | La **restitution d'instrument n'est jamais reconfrontée** : le navigateur fabrique le champ `plainte` (`ClinicalRuntimeSection.tsx:942`), le serveur n'en contrôle que la forme et le recopie (`propositions-objectif/route.ts:453`). Le praticien lit « Restitution publiée par … » sous un texte non confronté. Le texte entre dans l'empreinte : un envoi forgé **supplante l'assemblée légitime** et rend les vraies propositions caduques. | R7 · 40-80 lignes, 4-8 h, **estimation conditionnelle** : relier le fragment à une restitution réellement émise par le serveur. Ne pas recalculer l'instrument dans la route ([[D-115]] l'interdit). |
| **F2** | P1 | **Contestation acceptée puis invisible** : `verifierVersionVisee` lit (`portail/dossier/route.ts:750`), la ligne est créée hors transaction (`:845`), aucune contrainte sur `id_objectif`. Une v2 posée entre les deux rend la ligne invisible des deux côtés. Le patient lit « C'est transmis » au-dessus de « Vous ne vous êtes pas encore prononcé ». | R3 · 40-80 lignes, 4-6 h : servir les ratifications **avec leur version** et les rendre dans l'historique, sans transférer leur état au courant. |
| **F3** | P2 | **Clôture concurrente** : la porte est lue une seule fois (`objectifs/route.ts:658-663`), jamais avant le `create` (`:873`) ni avant l'e-mail (`:877`). Le raisonnement de [[D-154]] §6 — « sans écriture, donc sans envoi » — n'est vrai qu'en exécution séquentielle, et **ses deux moitiés tombent**. | Ajouter `actif` et `suiviClotureLe` au select de `:436` referme l'**envoi** (une ligne) ; l'**écriture** demande une garde partagée avec la route de clôture. |
| **F4** | P2 | **Rien ne borne le volume** : aucune des six routes ne pagine, le plafond de trois est un `slice` d'affichage posé après une lecture non bornée (`propositionObjectif.ts:476`, `:501`). Deux compositions reconstruisent l'index de chaîne à chaque appel — mesuré 84 ms à 200 versions, 670 ms à 400. | R11 · **mesurer avant de corriger** : banc de volume, 10-30 lignes. Aucune modification produit à ce stade. |

## 5. Ce que la contre-revue recommande, et qui n'est PAS décidé ici

Ses deux priorités avant le 2026-10-04 : **obtenir une première réponse patient
réelle** sur un objectif unique dans le périmètre [[D-093]], et **produire le
bilan écrit du classement** réellement présenté. Si un blocage apparaît, R1
(prévenir la seconde racine, 15-30 lignes) et R2 (résultat d'envoi visible,
30-60 lignes) sont les premiers correctifs.

Ce qu'elle déconseille de construire maintenant : une notification patient →
praticien, un tableau de bord d'EVA, une interface complète de départage, une
refonte des DTO. **Aucun de ces arbitrages n'est pris ici** : ce document
rapporte, il ne décide pas. Les 23 familles d'objets sans client qu'elle
inventorie (`REVUE…:389-420`) n'autorisent **aucun lot de purge**, et elle
l'écrit.

## 6. Ce que ni l'un ni l'autre n'avait vu

Relevé par l'arbitrage, à verser au dossier :

- L'absence des quatre dates de déclaration est **verrouillée à la compilation** :
  `DonneesDisposition` ne déclare pas le champ (`propositionObjectif.ts:324`). Ce
  n'est pas un appel qui oublie, c'est un type qui ne le porte pas.
- Deux de ces colonnes mortes sont **épinglées par une liste blanche de contrat**
  (`checks/alli_objectif_trois_voix_v1_negatif.sql:66`, `:70`) : les retirer ferait
  rougir le contrat. C'est un lot, pas un nettoyage.
- Le palier local compare « joués » à « extraits », **jamais « extraits » à
  « fichiers présents »** (`wn-test-worktree.sh:508-509`) :
  `c4_clinical_rules_lignee_v1.sql` n'a aucun exécuteur.
- La même **composition quadratique** que celle relevée en compréhension existe sur
  la table centrale : `chaineDObjectif` est appelée dans un `courants.map`
  (`objectifs/route.ts:357`).
- Le dépôt tient déjà une **doctrine de cadence opposable côté serveur** —
  `JOURS_ENTRE_RELANCES = 3`, `MAX_TENTATIVES_FENETRE = 2`
  (`lib/agenda-sommeil/relanceEmail.ts:25`, `:32`) — que la notification d'objectif
  n'emprunte pas.

---

*Le compte rendu publié a été corrigé en conséquence : douze reformulations à
leur place, une section « ce que la contre-revue a changé », et les quatre
défauts ajoutés avec leur gravité. Les gravités sont celles proposées par la
contre-revue, **sans occurrence observée en production**.*
