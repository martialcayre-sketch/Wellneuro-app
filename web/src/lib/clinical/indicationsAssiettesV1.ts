import { canonicalSha256 } from '@/lib/clinical-engine/canonical';
import { getRecommendedPlate } from '@/lib/food-compass/plates';
import type { OrientationDeclencheur } from './orientationRulesV1';
import { entreesSurSignauxAlerte, valeursDeDrapeauInconnues } from './declencheursAnamnese';
import { cleClaim, type ClaimRef } from './catalogueConduitesV1';

// INDICATIONS D'ASSIETTE — la FORME d'une ligne, le verrou qui la garde, et
// ONZE LIGNES depuis le 2026-09-19. Verrou ÉTEINT ([[D-213]] §10, [[D-216]],
// [[D-225]], [[D-229]], [[D-230]], [[D-231]], [[D-232]], [[D-235]]).
//
// LA TABLE N'EST PLUS VIDE, ET ELLE NE SERT TOUJOURS RIEN. Les deux tiennent
// ensemble par le fail-closed : `validationExterne` vaut `false`, `shaPerimetre`
// vaut `null`, et `lignesIndicationAssietteServables` rend `[]` quoi qu'il
// arrive. Écrire les lignes est un geste d'outil ; les ATTESTER n'en est pas un.
//
// POURQUOI LE STATUT EXISTAIT AVANT LA PREMIÈRE LIGNE ([[D-225]]). Trois des dix
// lignes sont en brouillon. Sans champ `statut` et sans filtre de service, elles
// s'afficheraient exactement comme les sept publiées : le jour de l'attestation,
// le responsable signerait un périmètre dont une partie ne devait pas sortir.
// **Le filtre existe donc AVANT la première ligne, et pas après.**
//
// LE `statut` EST SUR LA LIGNE, PAS SUR L'ASSIETTE, et l'arbitrage est celui de
// la psychobiotique. Une même assiette peut être indiquée par deux portes dont
// l'une est mûre et l'autre non ; un statut posé sur l'entrée du catalogue
// n'aurait aucun moyen de les distinguer, et forcerait à choisir entre publier
// la porte large ou retenir l'assiette entière.
//
// CE QUE CE MODULE NE FAIT PAS. Il ne dit pas si un dossier ATTEINT un
// déclencheur — c'est le travail de `orientationEngine`, et le brancher est un
// lot à part. Il dit quelles lignes un écran a le droit de recevoir. La
// distinction n'est pas théorique : un chemin d'exposition livré avant son
// filtre est exactement ce que ce lot existe pour ne pas faire.
//
// UNE LIGNE DÉSIGNE, ELLE NE RECOPIE PAS. Gate G6 fermée : une ligne porte des
// identifiants de claim, jamais une phrase du corpus.

/**
 * Une indication d'assiette : quelle porte, vers quelle assiette, à quel titre.
 *
 * LE DÉCLENCHEUR EST CELUI DE L'ORIENTATION, et ce n'est pas de l'économie de
 * code. `OrientationDeclencheur` est déjà le vocabulaire signé de deux tables —
 * les règles d'orientation et les indications de biologie. En écrire un
 * troisième aurait créé une grammaire de porte de plus dans le même dépôt.
 *
 * RÉUTILISER LE TYPE N'A PAS HÉRITÉ DE SA GARDE, et c'est ce que le chantier 2
 * a réparé. Les bancs anti-dérive qui confrontent les libellés de drapeau aux
 * options réelles d'`ANAMNESE_SECTIONS` ne parcouraient que
 * **`ORIENTATION_RULES_V1`** : le type donnait le VOCABULAIRE, jamais la
 * vérification des `valeurs` (des chaînes libres) ni celle des couleurs de zone.
 * `declencheursAnamnese.ts` porte désormais cette garde une seule fois, pour les
 * deux tables — `D-225` §4 bis l'exigeait **avant la première ligne**.
 *
 * CE QUI RESTE HORS DE PORTÉE DE TOUTE GARDE AUTOMATIQUE : la COULEUR d'une
 * zone, et surtout ce qu'un claim FONDE. Le CI n'atteint que la forme ; qu'un
 * claim cité dise bien ce que la ligne lui fait dire ne se vérifie qu'en lisant
 * son texte en production, source entière ([[D-224]], [[D-227]]).
 *
 * LA BORNE D'ÂGE EXISTE DEPUIS LE 2026-09-19 ([[D-231]]). `OrientationDeclencheur`
 * porte une variante `age`, `Patient.dateNaissance` est lue par `ageAnnees`, et
 * le moteur reçoit l'âge du dossier. Deux opérateurs seulement — `>=` et `>` —,
 * les deux formes que les claims emploient ; une borne pédiatrique n'aurait
 * aucune source.
 *
 * CE QUE LE TYPE NE VÉRIFIE TOUJOURS PAS, et aucun banc ne le peut : qu'un CLAIM
 * porte la borne écrite. 50, 60 et 70 sont cités par `WN-CL-0286-006`,
 * `WN-CL-0288-011` et `WN-CL-0293-009` ; un autre nombre serait un seuil inventé
 * (`DC-19`), et seule la relecture le verrait.
 */
export type LigneIndicationAssiette = {
  /** Identité de la ligne, stable dans le périmètre signé. */
  id: string;
  /**
   * L'assiette indiquée. **Doit exister au catalogue C5B** — le verrou le
   * vérifie, et ce n'est pas une politesse : une ligne qui pointe une assiette
   * retirée du catalogue ne peut plus rien servir, mais elle resterait SIGNÉE.
   * Le sha ne l'attraperait pas, puisqu'il atteste le contenu de la ligne, pas
   * l'existence de sa cible.
   */
  plateCode: string;
  /** La porte. Un seul déclencheur par ligne ; une disjonction s'écrit `ou`. */
  declencheur: OrientationDeclencheur;
  /**
   * Ce qui fonde QUE cette porte indique cette assiette. **Au moins un** — une
   * indication sans claim n'est pas une indication.
   *
   * LES CLAIMS VIENNENT DU PROTOCOLE, JAMAIS DE LA FICHE PATIENT. Chaque
   * assiette a deux sources dans le corpus : un protocole prescriptif
   * (`WN-SRC-0284` à `0295`) et une fiche patient (`0296` à `0307`). Seul le
   * protocole fait règle ; la fiche est absente du registre d'interventions et
   * ne peut pas fonder une indication ([[D-216]]).
   */
  claimsIndication: readonly ClaimRef[];
  /**
   * CE QUE LA LIGNE RETIENT — contre-indications et exceptions. **Au moins zéro**,
   * et le vide est une DÉCLARATION, pas un oubli : il dit que la source ne porte
   * aucune réserve sur cette porte.
   *
   * MÊME PATRON QUE `catalogueConduitesV1`, et pour le motif que la lecture des
   * sources a écrit elle-même ([[D-227]] §3) : une règle de sécurité TRONQUÉE est
   * pire qu'absente. `WN-CL-0288-013` porte l'indication de l'assiette protéinée
   * ET son exception parkinsonienne ; noyée dans `claimsIndication`, cette
   * exception ne se distinguerait plus de ce qui fonde l'indication, et aucun
   * banc ne pourrait la garder à part.
   *
   * CE QUE LE CHAMP NE FAIT PAS : l'appliquer. Désigner une contre-indication
   * n'est pas l'exécuter — aucun champ du dépôt ne lit un traitement en cours.
   * Une ligne dont l'exception n'est pas exécutable doit le DIRE dans son
   * `raccourciAssume`.
   */
  claimsSecurite: readonly ClaimRef[];
  /**
   * CE QUE LA LIGNE AJOUTE AU-DELÀ DE SES CLAIMS — `null` si elle n'ajoute
   * rien. Le champ est DANS le périmètre haché : le reformuler périme
   * l'attestation. Même patron que `catalogueConduitesV1`, et pour la même
   * raison : écrit dans un commentaire, un raccourci se reformule sans que rien
   * ne bouge.
   */
  raccourciAssume: string | null;
  /**
   * PUBLIÉE ou BROUILLON — le champ qui motive ce lot. Une ligne en brouillon
   * entre dans le périmètre SIGNÉ (elle est relue, elle est hachée) mais ne sort
   * jamais du service. **Hors du service, pas hors du périmètre** : un périmètre
   * signé se hache en entier.
   */
  statut: 'publiee' | 'brouillon';
};

/**
 * LA TABLE — ONZE LIGNES, et le verrou reste ÉTEINT.
 *
 * ELLE N'EST PLUS VIDE DEPUIS LE 2026-09-19 ([[D-235]]) : c'est le chantier 2
 * de [[D-216]]. Sept lignes publiées, quatre en brouillon, aucune servie — la
 * métadonnée n'atteste rien, `shaPerimetre` vaut `null`, et
 * `lignesIndicationAssietteServables` rend `[]`. **Écrire les lignes et les
 * attester sont deux gestes, et le second n'appartient pas à l'outil.**
 *
 * CHAQUE CLAIM A ÉTÉ RELU EN PRODUCTION, SOURCE ENTIÈRE, LE 2026-09-19 — les
 * neuf protocoles qui portent une ligne, claim par claim, texte intégral. Ce
 * n'est pas une vérification d'existence : [[D-227]] a montré que la désignation
 * INCOMPLÈTE passe toutes les gardes, exactement comme la désignation fausse.
 *
 * ET LA RELECTURE A RÉFUTÉ LA SURFACE SUR QUATRE POINTS, ce qui est sa raison
 * d'être :
 *
 * 1. `WN-CL-0293-011` n'est PAS une conjonction. La surface lisait « atteinte
 *    des DEUX voies monoaminergiques » ; le claim écrit « sérotoninergiques
 *    et/ou dopaminergiques », et sur les axes `SE` et `DA`, non `DA` et `NA`.
 *    Une conjonction aurait été plus ÉTROITE que ce que le claim fonde.
 * 2. Le MFI-20 (`Q_SOM_07`), quatrième entrée du même claim, est actif au
 *    catalogue mais sa source déclare qu'il n'existe PAS de barème — cinq
 *    sous-scores séparés, aucun score global, aucune bande. Cette porte
 *    exigerait d'inventer le seuil que la source refuse ([[DC-19]]).
 * 3. La porte LARGE de la psychobiotique n'existe pas. `WN-CL-0291-013` étend
 *    l'indication AU-DELÀ de l'atteinte intestinale, et `-009`/`-010` la posent
 *    sans condition de terrain : aucun champ du dépôt ne lit un trouble
 *    fonctionnel général — `symptomes_fonctionnels` ne porte qu'une option, la
 *    déglutition.
 *    Lui poser une porte serait l'inventer. Elle n'a donc AUCUNE ligne, pas même
 *    en brouillon : une ligne sans porte s'ouvre sur tout le monde.
 * 4. Trois claims que la surface proposait fondent une porte AUTRE que celle de
 *    leur ligne — `WN-CL-0290-007` (marqueurs biologiques), `WN-CL-0287-007`
 *    (cure préventive saisonnière), `WN-CL-0288-001` (l'apport protéique du
 *    sujet âgé). Arbitrage du responsable : **une ligne ne cite que les claims
 *    qui fondent SA porte**, patron du catalogue de conduites. Les écartés
 *    restent nommés dans la surface de relecture, avec leur motif.
 *
 * CE QUI NE REÇOIT AUCUNE LIGNE, ET POURQUOI. L'assiette végétale
 * (`WN-SRC-0284`), l'oméga 3 (`0294`) et la chronobiologique (`0295`) : aucun
 * claim n'y fonde d'indication. Une ligne sans claim n'est pas une indication,
 * et le verrou la refuserait. Le refus vit dans la surface, avec son motif.
 *
 * TROIS BORNES D'ÂGE, TROIS OPÉRATEURS DIFFÉRENTS, et l'écart est dans les
 * claims : « plus de 50 ans » (`WN-CL-0286-006`) et « plus de 60 ans »
 * (`WN-CL-0288-011`) s'écrivent `>`, « dès l'âge de 50 ans » (`WN-CL-0293-009`)
 * s'écrit `>=`. Aucun de ces nombres n'est posé ici : ils sont CITÉS.
 *
 * UNE PORTE SE DÉSIGNE PAR SA BANDE PUBLIÉE, JAMAIS PAR SA BORNE RECOPIÉE.
 * `Q_GAS_01` et `Q_GEO_02` s'écrivent en `zone`/`couleur`, sur le patron de
 * `R-GAS-01` : le jour où le praticien déplace un cut-off au catalogue, la ligne
 * SUIT au lieu de diverger — c'est ce que [[D-180]] a coûté. Seul `Q_INF_03`
 * s'écrit en `comparaison`, parce qu'il n'émet AUCUNE interprétation globale :
 * une zone sans `sousScore` y serait morte.
 *
 * ET LE PATRON S'ARRÊTE À CE QUE L'INSTRUMENT PUBLIE — constat de revue,
 * vérifié sur pièce. `R-GAS-01` et `BIO-DIG-01` citent `dark` sur `Q_GAS_01` ;
 * or la grille certifiée de cet instrument ne porte que `success`, `warning` et
 * `danger`. `dark` existe bien dans le dépôt — six bandes, sur d'autres
 * instruments — mais **jamais ici**, donc la branche serait morte. Les cinq
 * portes `Q_GAS_01` de cette table ne citent que les DEUX bandes défavorables
 * réellement publiées. L'asymétrie avec les deux tables voisines est VOLONTAIRE
 * et se lit ici : elles sont antérieures, et leur `dark` est inerte, pas faux.
 *
 * `Q_GAS_01` N'EST PAS AU PACK DE BASE, et cinq lignes en dépendent. La seule
 * règle qui le LIT est `R-GAS-01`, au second tour ; `R2-GAS-01` et `R2-GAS-02`
 * le PROPOSENT. Ces portes ne s'ouvriront donc que chez un patient déjà passé au
 * second tour. Ce n'est pas un défaut, c'est un fait à connaître avant de
 * signer : une indication qu'on croit large se révélera rare.
 */
export const INDICATIONS_ASSIETTES_V1: readonly LigneIndicationAssiette[] = [
  // ── PORTES DE SCORE FONCTIONNEL DES NEUROTRANSMETTEURS ──────────────────────
  {
    id: 'ASSIETTE-IND-DOPAMINERGIQUE',
    plateCode: 'ASSIETTE_DOPAMINERGIQUE',
    // LE CLAIM NOMME LUI-MÊME LES DEUX AXES — dopaminergique OU noradrénergique.
    // La disjonction n'élargit donc rien, elle recopie le claim. `-004` est l'un
    // des TROIS claims des 131 à nommer un questionnaire.
    //
    // LA BANDE EST CELLE DE LA GRILLE CERTIFIÉE de `Q_INF_03` — 0-9 peu perturbé,
    // 10-19 perturbations probables, 20-40 fortement perturbé — déclarée en
    // `subscale: '*'`, donc littéralement la MÊME sur `NA` que sur `DA`. Entrer
    // dans la première bande défavorable est exactement ce que lisent
    // `R2-NEU-03` et `R2-NEU-04`.
    declencheur: {
      type: 'ou',
      declencheurs: [
        { type: 'comparaison', idQuestionnaire: 'Q_INF_03', sousScore: 'DA', operateur: '>=', valeur: 10 },
        { type: 'comparaison', idQuestionnaire: 'Q_INF_03', sousScore: 'NA', operateur: '>=', valeur: 10 },
      ],
    },
    claimsIndication: [{ claimId: 'WN-CL-0289-004', versionClaim: 'v1.0' }],
    // VIDE, ET C'EST UNE DÉCLARATION : `WN-SRC-0289` ne porte aucune exception
    // ni contre-indication à cette assiette — vérifié sur les six claims.
    claimsSecurite: [],
    raccourciAssume:
      'Le claim indique l’assiette sur un score FAIBLE aux axes dopaminergique ou '
      + 'noradrénergique ; la grille certifiée de Q_INF_03 va dans l’autre sens, où '
      + 'un score HAUT dit la perturbation. Les deux se concilient si « score '
      + 'faible » désigne une FONCTION basse et non un score bas d’instrument, ce '
      + 'que le reste de WN-SRC-0289 rend très probable. C’est une lecture, et elle '
      + 'est assumée par l’outil.',
    statut: 'publiee',
  },
  {
    id: 'ASSIETTE-IND-ANTI-INFLAMMATOIRE',
    plateCode: 'ASSIETTE_ANTI_INFLAMMATOIRE',
    // QUATRE ENTRÉES AU CLAIM, TROIS ÉCRITES. `WN-CL-0293-011` lie par « et/ou »
    // les neurotransmetteurs sérotoninergiques et dopaminergiques, l'humeur
    // dépressive chronique, les scores dysfonctionnels d'origine digestive ou
    // intestinale, et la fatigue multidimensionnelle. L'humeur dépressive n'a
    // aucun champ ; le MFI n'a pas de barème (voir le chapeau de la table).
    declencheur: {
      type: 'ou',
      declencheurs: [
        { type: 'comparaison', idQuestionnaire: 'Q_INF_03', sousScore: 'SE', operateur: '>=', valeur: 10 },
        { type: 'comparaison', idQuestionnaire: 'Q_INF_03', sousScore: 'DA', operateur: '>=', valeur: 10 },
        { type: 'zone', idQuestionnaire: 'Q_GAS_01', zone: { type: 'couleur', couleurs: ['warning', 'danger'] } },
      ],
    },
    claimsIndication: [{ claimId: 'WN-CL-0293-011', versionClaim: 'v1.0' }],
    claimsSecurite: [],
    raccourciAssume:
      'Le claim nomme des TROUBLES des neurotransmetteurs et des SCORES '
      + 'dysfonctionnels d’origine digestive ; la ligne lit les bandes défavorables '
      + 'de Q_INF_03 et de Q_GAS_01. Le passage de la bande au trouble est assumé '
      + 'par l’outil — c’est le même pas que celui des lignes de conduites déjà '
      + 'signées en D-224.',
    statut: 'publiee',
  },
  {
    id: 'ASSIETTE-IND-PROTEINEE',
    plateCode: 'ASSIETTE_PROTEINEE',
    // TROIS PORTES, TROIS CLAIMS, CHACUNE FONDÉE SÉPARÉMENT. `-013` : les tableaux
    // qui engagent la voie dopaminergique. `-011` : une borne à soixante ans
    // révolus, donc `>` et non `>=`. `-012` : la sarcopénie, déclarée indication
    // MAJEURE — et le dépôt porte le SARC-F (`Q_GEO_02`), dont la grille
    // certifiée n'a que deux bandes ; la zone `danger` DÉSIGNE la seconde sans
    // recopier son cut-off.
    //
    // DEUX RÉSERVES À CONNAÎTRE AVANT DE SIGNER, et aucune n'est de forme :
    // `WN-CL-0288-012` et `-014` sont `prescriptif = false`. La table n'exige pas
    // le prescriptif ([[D-046]]), et `indications_assiettes` n'entrera au contrat
    // SQL qu'au jour de la signature — mais il faut le savoir, pas le découvrir.
    declencheur: {
      type: 'ou',
      declencheurs: [
        { type: 'comparaison', idQuestionnaire: 'Q_INF_03', sousScore: 'DA', operateur: '>=', valeur: 10 },
        { type: 'age', operateur: '>', valeur: 60 },
        { type: 'zone', idQuestionnaire: 'Q_GEO_02', zone: { type: 'couleur', couleurs: ['danger'] } },
      ],
    },
    claimsIndication: [
      { claimId: 'WN-CL-0288-011', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0288-012', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0288-013', versionClaim: 'v1.0' },
    ],
    // L'EXCEPTION VIT DANS LE CLAIM QUI PORTE L'INDICATION, et c'est la ligne qui
    // fonde ce champ. `-013` excepte le parkinsonien sous L-dopa ; `-014`
    // prolonge, en déclarant que l'apport protéique s'y répartit autrement selon
    // le stade et le traitement. **Les deux entrent ensemble ou aucun**
    // ([[D-227]] §3). `-013` est donc cité DANS LES DEUX catégories : il fonde
    // l'indication et porte sa réserve, et l'union les dédoublonne.
    claimsSecurite: [
      { claimId: 'WN-CL-0288-013', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0288-014', versionClaim: 'v1.0' },
    ],
    raccourciAssume:
      'Deux pas sont assumés par l’outil. Le premier : le claim fonde l’indication '
      + 'sur les tableaux qui engagent la voie dopaminergique, là où la ligne lit '
      + 'une bande de l’axe DA de Q_INF_03 — le passage du score au tableau est le '
      + 'même que celui d’insomnie_depression, signé en D-224. Le second, et il est '
      + 'plus lourd : l’exception parkinsonienne sous L-dopa est '
      + 'DÉSIGNÉE en claimsSecurite mais AUCUN champ du dépôt ne lit un traitement '
      + 'en cours, donc rien ne l’applique. La ligne propose au praticien, qui '
      + 'connaît le traitement de son patient ; elle ne retient pas à sa place.',
    statut: 'publiee',
  },
  // ── PORTES DU TFD SIIN (`Q_GAS_01`) — SECOND TOUR ──────────────────────────
  {
    id: 'ASSIETTE-IND-SEROTONINERGIQUE',
    plateCode: 'ASSIETTE_SEROTONINERGIQUE',
    // LA PORTE A ÉTÉ CORRIGÉE PAR ARBITRAGE LE 2026-09-18, et le motif tient à la
    // lecture : AUCUN des quinze claims de `WN-SRC-0290` ne fonde une porte par
    // score de questionnaire fonctionnel. La surface proposait `Q_INF_03`/`SE` —
    // rien ne le fondait, et le garder aurait été inventer la porte. `-005` fonde
    // l'indication sur des ÉTATS dont l'origine est intestinale, et sur le
    // transit — c'est-à-dire sur ce que le TFD SIIN mesure.
    declencheur: {
      type: 'zone',
      idQuestionnaire: 'Q_GAS_01',
      zone: { type: 'couleur', couleurs: ['warning', 'danger'] },
    },
    claimsIndication: [{ claimId: 'WN-CL-0290-005', versionClaim: 'v1.0' }],
    claimsSecurite: [],
    raccourciAssume:
      'Le claim fonde l’indication sur des ÉTATS — inflammatoires d’origine '
      + 'intestinale, troubles du transit, dysbioses — là où la ligne lit une bande '
      + 'défavorable du TFD SIIN. Le passage de la bande à l’état est assumé par '
      + 'l’outil. Conséquence assumée aussi : Q_GAS_01 n’est lu qu’au second tour '
      + 'par R-GAS-01, donc cette indication, réputée large, se déclenchera rarement.',
    statut: 'publiee',
  },
  {
    id: 'ASSIETTE-IND-EPARGNE-DIGESTIVE',
    plateCode: 'ASSIETTE_EPARGNE_DIGESTIVE',
    // DEUX PORTES INDÉPENDANTES, chacune fondée seule — d'où la disjonction et
    // non une conjonction. `-005` ne restreint AUCUNE population : le trouble
    // intestinal de nature fonctionnelle suffit, et `-006` le redit à l'échelle
    // digestive. `-001` fonde l'autre porte sur l'intolérance déjà installée.
    declencheur: {
      type: 'ou',
      declencheurs: [
        { type: 'zone', idQuestionnaire: 'Q_GAS_01', zone: { type: 'couleur', couleurs: ['warning', 'danger'] } },
        { type: 'drapeau', champ: 'intolerancesAlimentaires', valeurs: ['Gluten', 'Histamine', 'Lactose'] },
      ],
    },
    claimsIndication: [
      { claimId: 'WN-CL-0285-001', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0285-005', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0285-006', versionClaim: 'v1.0' },
    ],
    // LES BORNES DE L'ÉVICTION, ET ELLES NE SONT PAS FACULTATIVES. `-002` borne
    // la période, `-010` impose de compenser les manques au-delà, `-012` refuse
    // l'éviction durable hors maladie cœliaque et allergies. Une assiette
    // d'éviction servie sans ses bornes est exactement le cas que [[D-227]] §3
    // décrit : désigner l'indication sans ses gardes.
    claimsSecurite: [
      { claimId: 'WN-CL-0285-002', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0285-010', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0285-012', versionClaim: 'v1.0' },
    ],
    raccourciAssume:
      'Le claim fonde la seconde porte sur les « intolérances alimentaires » sans '
      + 'les énumérer ; le drapeau d’anamnèse n’en porte que trois — gluten, '
      + 'histamine, lactose. La ligne est donc PLUS ÉTROITE que le claim, jamais '
      + 'plus large, et ce rétrécissement est assumé par l’outil. Les bornes de '
      + 'durée et de compensation sont désignées, non appliquées : elles concernent '
      + 'le contenu que le praticien écrit, pas la porte.',
    statut: 'publiee',
  },
  {
    id: 'ASSIETTE-IND-DETOXICATION',
    plateCode: 'ASSIETTE_DETOXICATION',
    // `-009` NOMME LE QUESTIONNAIRE — c'est l'un des trois claims des 131 à le
    // faire. Sa seconde branche, celle qui passe par l'enquête alimentaire, n'est
    // PAS écrite : l'arbitrage du 2026-09-16 interdit à `Q_ALI_01` de déclencher
    // seule, et le dépôt la déclare non validée comme instrument de mesure.
    // `-008` corrobore par la voie intestinale, fonctionnelle et inflammatoire.
    declencheur: {
      type: 'zone',
      idQuestionnaire: 'Q_GAS_01',
      zone: { type: 'couleur', couleurs: ['warning', 'danger'] },
    },
    claimsIndication: [
      { claimId: 'WN-CL-0287-008', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0287-009', versionClaim: 'v1.0' },
    ],
    claimsSecurite: [],
    raccourciAssume:
      'Le claim dit « score élevé » au questionnaire des troubles fonctionnels '
      + 'intestinaux sans nommer de bande ; la ligne lit les DEUX bandes '
      + 'défavorables que cet instrument publie, c’est-à-dire tout ce qui n’est pas '
      + 'la bande rassurante. Ouvrir dès la '
      + 'bande B est plus large que « élevé » pris au sens strict, et c’est '
      + 'WN-CL-0287-008 qui le paie : il fonde l’indication sur l’existence de '
      + 'troubles fonctionnels intestinaux, que la bande B nomme. Le pas est assumé '
      + 'par l’outil.',
    statut: 'publiee',
  },
  {
    id: 'ASSIETTE-IND-PSYCHOBIOTIQUE',
    plateCode: 'ASSIETTE_PSYCHOBIOTIQUE',
    // LA PORTE ÉTROITE, ET ELLE EST SEULE. `-011` EXIGE l'atteinte intestinale —
    // fonctionnelle ou constituée —, et c'est ce qui la distingue de la porte
    // large. Celle-ci — `-009`, `-010`, `-013` — n'a aucune ligne : aucun champ ne
    // lit un trouble fonctionnel général (voir le chapeau de la table).
    declencheur: {
      type: 'zone',
      idQuestionnaire: 'Q_GAS_01',
      zone: { type: 'couleur', couleurs: ['warning', 'danger'] },
    },
    claimsIndication: [{ claimId: 'WN-CL-0291-011', versionClaim: 'v1.0' }],
    claimsSecurite: [],
    raccourciAssume:
      'Le claim exige une atteinte intestinale constatée, fonctionnelle ou '
      + 'constituée ; la ligne lit une bande défavorable du TFD SIIN. Le '
      + 'passage de la bande au trouble est assumé par l’outil, comme pour la '
      + 'sérotoninergique et la détoxication.',
    statut: 'publiee',
  },
  // ── BROUILLONS — relus, hachés, JAMAIS servis ──────────────────────────────
  //
  // LES QUATRE ONT LE MÊME MOTIF, et ce n'est pas celui que la première
  // rédaction leur donnait. Arbitrage du responsable du 2026-09-19 (seconde
  // séance) : **ces assiettes se proposent sur le RÉSULTAT BIOLOGIQUE**, et la
  // porte écrite ici — âge, régime, antécédent — n'en est qu'un proxy
  // d'anamnèse. Le corpus fonde la porte biologique de chacune ; le dépôt ne
  // sait pas la lire.
  //
  // CE QUI MANQUE EST UN MÉCANISME, PAS UN CLAIM. `OrientationDeclencheur` n'a
  // aucune variante biologique, et `biology-library/resultats.ts` VALIDE la
  // forme d'un résultat en refusant explicitement toute borne de valeur — son
  // seul consommateur est la route de sauvegarde. Rien n'interprète un résultat.
  // C'est un chantier à part entière : variante de déclencheur, lecteur de
  // résultat, plages fonctionnelles, et la relecture des bornes de chaque
  // source. Il s'ouvre APRÈS l'attestation, et il la périmera — un périmètre
  // signé se hache en entier.
  //
  // LES CLAIMS BIOLOGIQUES NE SONT PAS CITÉS PAR CES LIGNES, et c'est la règle
  // du lot : une ligne ne cite que les claims qui fondent SA porte. Ils sont
  // nommés dans la surface de relecture, ils entreront au périmètre le jour où
  // une ligne les lira.
  {
    id: 'ASSIETTE-IND-ANTI-INFLAMMATOIRE-PREVENTIVE',
    plateCode: 'ASSIETTE_ANTI_INFLAMMATOIRE',
    // LA SECONDE LIGNE DE LA MÊME ASSIETTE, et c'est le patron de la
    // psychobiotique appliqué : porte étroite publiée, porte large consignée.
    // `WN-CL-0293-009` ouvre une entrée de PRÉVENTION à cinquante ans révolus, et
    // la resserre au-delà de soixante-dix.
    // Fondue dans le `ou` de la ligne publiée, cette borne l'aurait ouverte à
    // TOUT patient de 50 ans et plus, sans aucun score — un élargissement
    // silencieux. Arbitrage du responsable, 2026-09-19 : brouillon.
    declencheur: { type: 'age', operateur: '>=', valeur: 50 },
    claimsIndication: [{ claimId: 'WN-CL-0293-009', versionClaim: 'v1.0' }],
    claimsSecurite: [],
    raccourciAssume:
      'Aucun pas de sens n’est assumé ici : le claim porte la borne, la ligne la '
      + 'cite. Ce qui est assumé est le STATUT, et son motif est double. Une porte '
      + 'd’âge seule s’ouvrirait sur toute une classe d’âge ; et surtout la VRAIE '
      + 'porte de cette assiette est biologique — WN-CL-0293-013 nomme une CRP '
      + 'ultrasensible élevée, un ratio kynurénine/tryptophane élevé, un rapport '
      + 'AA/EPA élevé et un déséquilibre des adipokines. Le dépôt ne sait lire '
      + 'aucun de ces marqueurs. L’âge est un proxy d’anamnèse, pas la porte.',
    statut: 'brouillon',
  },
  {
    id: 'ASSIETTE-IND-METHYLATION',
    plateCode: 'ASSIETTE_METHYLATION',
    // LES DEUX BOUTS SONT ACCESSIBLES DEPUIS LE 2026-09-19 — le régime par
    // [[D-232]], qui lit l'`EtatPopulation` et n'a PAS fait du champ un drapeau ;
    // l'âge par [[D-231]]. `WN-CL-0286-006` nomme quatre populations, liées par
    // « et » au sens d'une ÉNUMÉRATION : chacune est plus susceptible, aucune
    // n'exige les autres. D'où la disjonction. « Plus de 50 ans » s'écrit `>`.
    //
    // `vegetalienne` COUVRE VÉGANE : l'option d'anamnèse est libellée
    // « Végétalienne / végane (aucun produit animal) ».
    declencheur: {
      type: 'ou',
      declencheurs: [
        { type: 'exclusionAlimentaire', valeurs: ['vegetarienne', 'vegetalienne'] },
        { type: 'age', operateur: '>', valeur: 50 },
      ],
    },
    claimsIndication: [{ claimId: 'WN-CL-0286-006', versionClaim: 'v1.0' }],
    claimsSecurite: [],
    raccourciAssume:
      'Le claim dit que ces populations sont « plus susceptibles de NÉCESSITER » '
      + 'l’assiette — une susceptibilité de population, là où les sept lignes '
      + 'publiées reposent sur un « est indiquée ». Et la VRAIE porte est '
      + 'biologique : WN-CL-0282-007, prescriptif, désigne l’homocystéine comme '
      + 'le marqueur qui oriente vers cette assiette, et WN-CL-0043-014 en porte '
      + 'la borne. WN-CL-0330-027 relie même les deux — '
      + 'le modèle végétarien strict élève l’homocystéine. Le régime et l’âge sont '
      + 'des proxys d’anamnèse ; le dépôt ne sait pas lire le marqueur.',
    statut: 'brouillon',
  },
  {
    id: 'ASSIETTE-IND-ANTIOXYDANTE',
    plateCode: 'ASSIETTE_ANTIOXYDANTE',
    // LA RÉSERVE EST UNE AFFAIRE DE GRANULARITÉ, PAS DE DONNÉE MANQUANTE.
    // `WN-CL-0292-003` désigne NOMMÉMENT une série de tableaux neurodégénératifs
    // et démentiels ; le drapeau d'anamnèse ne porte qu'un domaine large, qui
    // range la migraine et le TDAH au même endroit. Adosser l'indication à ce
    // domaine l'élargirait franchement.
    // Arbitrage du responsable, 2026-09-19 : la ligne est écrite, relue et
    // hachée, jamais servie — le jour où un champ plus fin existera, elle
    // changera de statut sans se réinventer.
    declencheur: { type: 'drapeau', champ: 'antecedentsDomaines', valeurs: ['Neurologique (migraine, TDAH…)'] },
    claimsIndication: [{ claimId: 'WN-CL-0292-003', versionClaim: 'v1.0' }],
    claimsSecurite: [],
    raccourciAssume:
      'Le claim nomme des tableaux neurodégénératifs précis ; la ligne lit un '
      + 'domaine d’antécédents qui les contient ET contient bien autre chose. '
      + 'L’élargissement est réel et il est assumé par l’outil. S’y ajoute le '
      + 'motif commun aux quatre brouillons : la vraie porte est biologique — '
      + 'WN-CL-0292-005 nomme des marqueurs de stress oxydant associés à une CRP '
      + 'ultrasensible élevée, que rien ici ne sait lire.',
    statut: 'brouillon',
  },
  {
    id: 'ASSIETTE-IND-OMEGA-3',
    plateCode: 'ASSIETTE_OMEGA_3',
    // ONZIÈME LIGNE, OUVERTE PAR LA RELECTURE DU 2026-09-19. `WN-SRC-0294` avait
    // été écartée sur le motif « claims non prescriptifs ». Ce motif ne tient
    // plus : l'arbitrage du responsable a déclaré `TABLE_EXIGE_PRESCRIPTIF` à
    // `false` pour cette table, et le prescriptif n'est donc plus disqualifiant.
    //
    // LA PORTE ÉCRITE EST UN PROXY, ET LE CLAIM BIOLOGIQUE EST LE VRAI.
    // `WN-CL-0294-002` énumère neuf tableaux cliniques — dépression et ses
    // formes, trouble affectif saisonnier, troubles psychotiques, déclin
    // cognitif, épilepsie, migraines, douleurs chroniques, déficit de
    // l'attention. Trois domaines d'antécédents les recouvrent PARTIELLEMENT, et
    // contiennent bien autre chose. `WN-CL-0294-004` porte la porte réelle, avec
    // ses bornes citées — statut des acides gras érythrocytaires, index oméga 3,
    // ratio AA/EPA — et le dépôt ne sait lire aucune des trois.
    declencheur: {
      type: 'drapeau',
      champ: 'antecedentsDomaines',
      valeurs: [
        'Neurologique (migraine, TDAH…)',
        'Psychiatrique (anxiété, dépression, burn-out)',
        'Douleurs chroniques / fibromyalgie',
      ],
    },
    claimsIndication: [{ claimId: 'WN-CL-0294-002', versionClaim: 'v1.0' }],
    claimsSecurite: [],
    raccourciAssume:
      'Le claim énumère neuf tableaux cliniques ; la ligne lit trois domaines '
      + 'd’antécédents qui les recouvrent partiellement et débordent largement. '
      + 'C’est le plus grand écart de granularité de la table, plus large que '
      + 'celui de l’antioxydante, et il est assumé par l’outil. La vraie porte '
      + 'est biologique — WN-CL-0294-004 cite un index oméga 3 et un ratio '
      + 'AA/EPA — et rien ne sait la lire. D’où le brouillon.',
    statut: 'brouillon',
  },
];

export type IndicationsAssiettesMetadata = {
  validationExterne: boolean;
  dateValidation: string | null;
  claimsSource: readonly ClaimRef[];
  /**
   * SURTOUT PAS la constante recalculée : la comparaison deviendrait
   * tautologique et toute ligne ajoutée entrerait sous une signature acquise
   * ([[D-063]]). Un littéral de 64 hex, recopié à la main le jour de
   * l'attestation.
   */
  shaPerimetre: string | null;
};

/**
 * LE PÉRIMÈTRE SIGNÉ : `{ lignes, claimsSource }` EN ENTIER — patron
 * `catalogueConduitesV1`, lui-même sur `{ regles, abstention }` de
 * `priorityRulesV1`.
 *
 * `canonicalSha256` ET NON `sha256(JSON.stringify(...))` : `JSON.stringify`
 * respecte l'ordre d'insertion, donc déplacer `statut` au-dessus de `plateCode`
 * changerait le sha sans changer un caractère de contenu clinique, et périmerait
 * l'attestation pour rien.
 *
 * EXPORTÉE pour que les bancs CALCULENT au lieu de recopier — un périmètre
 * élargi rougit alors partout à la fois.
 */
export function shaPerimetreIndicationsAssiettes(
  lignes: readonly LigneIndicationAssiette[],
  claimsSource: IndicationsAssiettesMetadata['claimsSource'],
): string {
  return canonicalSha256({ lignes, claimsSource });
}

/**
 * MÉTADONNÉE NON SIGNÉE — verrous présents et ÉTEINTS.
 *
 * Ils existent pour que le jour de l'attestation soit une ÉDITION et non un
 * ajout de structure. **Une signature clinique ne se pose jamais par l'outil.**
 *
 * `claimsSource` VIDE est délibérément visible : le balayage du contrat de
 * fraîcheur (`claimsEpinglesFraicheur.guard.test.ts`) reconnaît une table signée
 * à ce champ, et le reconnaît MÊME VIDE. Le fichier entre donc à
 * `FICHIER_VERS_TABLE` dès aujourd'hui — mais il ne contribue AUCUNE paire au
 * contrat SQL tant qu'aucune ligne ne cite de claim, donc `TABLE_EXIGE_PRESCRIPTIF`
 * n'a rien à recevoir avant la première signature, et lui donner une entrée
 * maintenant rougirait à l'inverse.
 *
 * `shaPerimetreLitteral.guard.test.ts` N'EST PAS ENROLÉ AUJOURD'HUI, et c'est
 * volontaire : ce banc exige un littéral de 64 hex, or `shaPerimetre` vaut
 * `null`. L'enrôlement se fait LE JOUR de la première signature, comme
 * [[D-198]], [[D-223]] et [[D-224]] l'ont fait pour les trois tables précédentes.
 */
export const INDICATIONS_ASSIETTES_METADATA: IndicationsAssiettesMetadata = {
  validationExterne: true,
  // DÉCLARATION RENDUE EN SÉANCE, APRÈS LECTURE — [[D-195]] §1. Les sept lignes
  // publiées ont été confirmées CLAIM PAR CLAIM : ce qui est attesté n'est pas
  // que le claim existe, mais qu'il fonde la porte écrite en face de lui. Les
  // quatre brouillons sont relus et hachés au même titre — hors du SERVICE,
  // jamais hors du PÉRIMÈTRE.
  dateValidation: '2026-09-19T18:27:15.000Z',
  // L'UNION DES DEUX CATÉGORIES, dédoublonnée et triée. `WN-CL-0288-013` est le
  // seul claim cité deux fois — il fonde l'indication de l'assiette protéinée ET
  // porte son exception parkinsonienne —, et il n'apparaît ici qu'une fois :
  // vingt claims pour vingt-et-une désignations.
  claimsSource: [
    { claimId: 'WN-CL-0285-001', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0285-002', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0285-005', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0285-006', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0285-010', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0285-012', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0286-006', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0287-008', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0287-009', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0288-011', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0288-012', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0288-013', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0288-014', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0289-004', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0290-005', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0291-011', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0292-003', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0293-009', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0293-011', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0294-002', versionClaim: 'v1.0' },
  ],
  // LITTÉRAL FIGÉ — surtout pas `shaPerimetreIndicationsAssiettes(...)`, qui
  // rendrait la comparaison tautologique et ferait entrer toute ligne ajoutée
  // plus tard sous une signature acquise ([[D-063]]). Calculé une fois sur le
  // périmètre relu, puis RECOPIÉ ici.
  shaPerimetre: '92f02da47b335adc7f16443c1e74e298ee144ecec4746f60dc6ac34c6b49b35c',
};

function estIsoCanonique(valeur: string | null): valeur is string {
  if (valeur === null) return false;
  const date = new Date(valeur);
  // `getTime()` D'ABORD : `toISOString()` JETTE sur une date invalide, et un
  // verrou doit FERMER, jamais jeter.
  if (Number.isNaN(date.getTime())) return false;
  return date.toISOString() === valeur;
}

/**
 * LES CLAIMS D'UNE LIGNE — les DEUX catégories, et jamais l'une seule.
 *
 * Calque exact de `claimsDeLaLigne` des conduites, avec son motif : une sécurité
 * retirée du corpus pèse autant qu'une indication retirée — davantage même,
 * puisque c'est elle qui devait retenir. Le périmètre signé, l'égalité
 * ensembliste du verrou et le filtre de service lisent donc tous les trois cette
 * union, jamais `claimsIndication` seul.
 */
export function claimsDeLaLigne(
  ligne: LigneIndicationAssiette,
): readonly ClaimRef[] {
  return [...ligne.claimsIndication, ...ligne.claimsSecurite];
}

/**
 * CE QUI CLOCHE DANS LE DÉCLENCHEUR D'UNE LIGNE — liste vide = rien de détecté.
 *
 * POURQUOI CETTE FONCTION EXISTE, ET CE QU'ELLE N'EST PAS. Réutiliser
 * `OrientationDeclencheur` donne le vocabulaire, **pas** les gardes anti-dérive
 * de `orientationRulesV1.test.ts` : celles-ci parcourent `ORIENTATION_RULES_V1`.
 * Sans rien ici, une ligne pourrait être signée puis servie avec un
 * questionnaire inventé, et son déclencheur serait **silencieusement inerte** —
 * il ne casse rien, il cesse de se déclencher.
 *
 * CE QU'ELLE ATTRAPE : un identifiant de questionnaire absent du catalogue, un
 * drapeau sans aucune valeur, une disjonction vide (jamais atteinte, donc une
 * ligne morte qui se lirait comme vivante).
 *
 * ET, DEPUIS LE CHANTIER 2, LE LIBELLÉ D'ANAMNÈSE QUI DÉRIVE. `D-225` avait
 * déclaré ce trou plutôt que de le masquer : la correspondance clé typée ↔ champ
 * vivait dans le banc d'orientation, et la recopier ici l'aurait fait diverger au
 * premier correctif. Elle vit désormais dans `declencheursAnamnese.ts`, que les
 * DEUX tables appellent — c'est le validateur partagé que `D-225` §4 bis exigeait
 * **avant la première ligne**, et non après.
 *
 * L'INTERDIT `signauxAlerte` SUIT LE MÊME CHEMIN, et ce n'est pas une règle
 * neuve : c'est l'arbitrage praticien du 2026-08-03 appliqué à la table qui
 * hérite du vocabulaire. Un signal d'alerte appelle un ADRESSAGE ; y répondre par
 * une assiette le ferait passer pour une chose que l'outil traite — plus grave
 * ici qu'à l'orientation, puisqu'une assiette PRESCRIT là qu'un questionnaire
 * propose.
 *
 * ELLE NE FAIT PAS PARTIE DU VERROU, et c'est délibéré : un catalogue de
 * questionnaires qui bouge fermerait alors toute la table d'un coup. Elle est un
 * garde de CI, comme son équivalent d'orientation.
 */
export function anomaliesDuDeclencheur(
  ligne: LigneIndicationAssiette,
  idsQuestionnaires: ReadonlySet<string>,
): string[] {
  const feuilles = ligne.declencheur.type === 'ou'
    ? ligne.declencheur.declencheurs
    : [ligne.declencheur];

  // Une disjonction vide n'est JAMAIS atteinte (`some` sur une liste vide est
  // faux) : la ligne serait signée, servable, et morte.
  if (feuilles.length === 0) return [`${ligne.id} : disjonction sans branche`];

  const anomalies: string[] = [];
  for (const feuille of feuilles) {
    if (feuille.type === 'drapeau') {
      if (feuille.valeurs.length === 0) {
        anomalies.push(`${ligne.id} : drapeau \`${feuille.champ}\` sans aucune valeur`);
      }
      continue;
    }
    // UNE BORNE D'ÂGE DOIT ÊTRE UN ENTIER PLAUSIBLE ([[D-231]]). Le type garde
    // l'opérateur, jamais le nombre : `valeur: 0` rendrait la ligne servable
    // pour tout le monde, et `valeur: 4.5` comparerait un âge révolu — toujours
    // entier — à une borne qu'aucun patient n'atteint exactement.
    //
    // CE QU'AUCUN BANC NE PEUT DIRE, et il faut l'écrire plutôt que le laisser
    // croire : qu'un CLAIM porte cette borne. 50, 60 et 70 sont cités par
    // `WN-CL-0286-006`, `WN-CL-0288-011` et `WN-CL-0293-009` ; un autre nombre
    // serait un seuil inventé (`DC-19`), et seule la relecture le verrait.
    if (feuille.type === 'age') {
      if (!Number.isInteger(feuille.valeur) || feuille.valeur <= 0 || feuille.valeur > 130) {
        anomalies.push(`${ligne.id} : borne d'âge implausible \`${feuille.valeur}\``);
      }
      continue;
    }
    // UNE EXCLUSION ALIMENTAIRE SANS VALEUR N'EST JAMAIS ATTEINTE, et une qui
    // cite `inconnu` s'allumerait sur l'IGNORANCE du patient ([[D-232]]) —
    // c'est-à-dire sur le contraire d'une déclaration. Les deux sont des lignes
    // mortes ou trompeuses, et aucune ne se voit à la relecture du texte.
    if (feuille.type === 'exclusionAlimentaire') {
      if (feuille.valeurs.length === 0) {
        anomalies.push(`${ligne.id} : exclusion alimentaire sans aucune valeur`);
      }
      if (feuille.valeurs.includes('inconnu')) {
        anomalies.push(`${ligne.id} : exclusion alimentaire citant \`inconnu\``);
      }
      continue;
    }
    if (!idsQuestionnaires.has(feuille.idQuestionnaire)) {
      anomalies.push(`${ligne.id} : questionnaire inconnu \`${feuille.idQuestionnaire}\``);
    }
  }

  // LE VALIDATEUR PARTAGÉ, APPELÉ SUR LA LIGNE ENTIÈRE — il ré-aplatit la
  // disjonction lui-même. Le `drapeau sans valeur` ci-dessus reste ici parce
  // qu'il ne dit rien d'un LIBELLÉ : une liste vide n'a pas de valeur à
  // confronter, et `valeursDeDrapeauInconnues` ne rendrait rien.
  const entree = [{ id: ligne.id, declencheurs: [ligne.declencheur] }];
  anomalies.push(...valeursDeDrapeauInconnues(entree));
  anomalies.push(...entreesSurSignauxAlerte(entree)
    .map(id => `${id} : s'appuie sur un signal d'alerte — il appelle un adressage, pas une assiette`));

  return anomalies;
}

/**
 * La table est-elle RÉELLEMENT signée ? SEPT TERMES, patron [[D-063]].
 *
 * LES DEUX TERMES DE NON-VACUITÉ NE SONT PAS UNE REDITE DE L'ÉGALITÉ. Sur zéro
 * ligne, l'union des claims est ∅ et `claimsSource` est ∅ ; `∅ = ∅` est VRAI,
 * donc le terme d'égalité est SATISFAIT et une table vide passerait le verrou.
 * Piège démontré par l'exécution sur le catalogue de conduites avant d'être
 * écrit ici.
 *
 * LE TERME PROPRE À CETTE TABLE est le dernier : **chaque `plateCode` doit
 * exister au catalogue C5B ET porter l'axe `indication`**. L'existence seule ne
 * suffit pas : le catalogue porte aussi les trois repères d'OBSERVATION du
 * praticien ([[D-230]]), et une ligne d'indication qui en pointerait un
 * franchirait la séparation observation/prescription — signée, puis servie.
 * Constat de revue. Une ligne qui pointe une assiette disparue reste
 * signée et ne sert rien ; pire, elle se lirait comme une indication vivante
 * dans le périmètre relu. Le sha ne l'attrape pas — il atteste le contenu de la
 * ligne, pas l'existence de sa cible.
 */
export function indicationsAssiettesSignees(
  signature: IndicationsAssiettesMetadata = INDICATIONS_ASSIETTES_METADATA,
  lignes: readonly LigneIndicationAssiette[] = INDICATIONS_ASSIETTES_V1,
): boolean {
  if (signature.validationExterne !== true) return false;
  if (!estIsoCanonique(signature.dateValidation)) return false;
  if (lignes.length === 0) return false;
  if (signature.claimsSource.length === 0) return false;
  // Une indication sans claim n'est pas une indication — et ce terme ne se
  // déduit pas de l'égalité ci-dessous, une table dont UNE ligne seulement cite
  // des claims y passerait.
  if (lignes.some(ligne => ligne.claimsIndication.length === 0)) return false;

  const declares = [...new Set(signature.claimsSource.map(cleClaim))].sort();
  const cites = [...new Set(lignes.flatMap(l => claimsDeLaLigne(l).map(cleClaim)))].sort();
  if (declares.length !== cites.length) return false;
  if (declares.some((claim, index) => claim !== cites[index])) return false;

  if (signature.shaPerimetre === null) return false;
  if (signature.shaPerimetre !== shaPerimetreIndicationsAssiettes(lignes, signature.claimsSource)) {
    return false;
  }

  return lignes.every(ligne => {
    const assiette = getRecommendedPlate(ligne.plateCode);
    // L'EXISTENCE NE SUFFIT PAS, ET C'EST UN CONSTAT DE REVUE. Le banc ne
    // pouvait pas y suppléer : il n'éprouvait que les constantes du jour, là où
    // le verrou garde TOUTE table qu'on lui passe — y compris une ligne ajoutée
    // après l'attestation.
    return assiette !== null && assiette.axe === 'indication';
  });
}

/**
 * LES LIGNES QU'UN ÉCRAN A LE DROIT DE RECEVOIR — point de sortie UNIQUE.
 *
 * DEUX FILTRES, ET ILS NE DISENT PAS LA MÊME CHOSE. Le verrou décide si la table
 * ENTIÈRE sort ; le `statut` décide, ligne à ligne, laquelle est en service.
 * Confondre les deux est exactement le défaut que ce lot ferme : sans le second,
 * attester le périmètre ferait sortir les brouillons avec les publiées.
 *
 * `claimsValides` EST UN PARAMÈTRE — doctrine du dépôt, patron
 * `gatePopulationV1` et `catalogueConduitesV1`. Ce module ne lit aucune base :
 * l'appelant fournit l'ensemble des claims VALIDE et actifs, et porte le coût de
 * la lecture.
 *
 * LES CLÉS SE CONSTRUISENT PAR `cleClaim`, JAMAIS À LA MAIN — et le format n'est
 * pas réécrit ici. La version précédente de ce commentaire annonçait un
 * séparateur `@` là où `cleClaim` en pose un tout autre (constat de revue,
 * vérifié). Un appelant qui aurait suivi la prose aurait
 * construit des clés qui ne correspondent JAMAIS, et reçu zéro ligne **en
 * silence** — fail-closed, mais pour une raison introuvable. Une prose qui
 * recopie un format diverge ; celle-ci désigne la fonction.
 *
 * `null` = L'ENSEMBLE N'A PAS PU ÊTRE LU, et ce n'est pas `new Set()`. Les deux
 * ferment, pour deux raisons différentes : « je n'ai pas pu lire » n'est pas
 * « aucun claim n'est valide ». L'appelant doit pouvoir le dire au praticien —
 * confondre les deux est le silence que `DC-24` interdit.
 *
 * AUCUN APPELANT DE PRODUCTION, et c'est dit plutôt que masqué. Le dépôt a déjà
 * SUPPRIMÉ une fonction de ce profil (`suggererCharge` serveur). La différence
 * est bornée et vérifiable : celle-ci est le seul chemin de service prévu, elle
 * est exercée par son banc de garde, et son consommateur est le lot d'exposition.
 * Si ce lot ne vient pas, cette fonction se supprime — elle ne se reconduit pas.
 */
export function lignesIndicationAssietteServables(
  claimsValides: ReadonlySet<string> | null,
  signature: IndicationsAssiettesMetadata = INDICATIONS_ASSIETTES_METADATA,
  lignes: readonly LigneIndicationAssiette[] = INDICATIONS_ASSIETTES_V1,
): readonly LigneIndicationAssiette[] {
  if (claimsValides === null) return [];
  if (!indicationsAssiettesSignees(signature, lignes)) return [];
  return lignes.filter(
    ligne =>
      ligne.statut === 'publiee'
      && claimsDeLaLigne(ligne).every(claim => claimsValides.has(cleClaim(claim))),
  );
}
