import { canonicalSha256 } from '@/lib/clinical-engine/canonical';
import { getRecommendedPlate } from '@/lib/food-compass/plates';
import type { OrientationDeclencheur } from './orientationRulesV1';
import { cleClaim, type ClaimRef } from './catalogueConduitesV1';

// INDICATIONS D'ASSIETTE — la FORME d'une ligne et le verrou qui la garde.
// Table livrée VIDE, verrou ÉTEINT ([[D-213]] §10, [[D-216]], [[D-225]]).
//
// CE QUE CE LOT FERME, ET C'EST SA SEULE RAISON D'ÊTRE. La surface de relecture
// du 2026-09-16 propose HUIT indications d'assiette, dont l'une — la
// psychobiotique — porte une porte ÉTROITE à publier et une porte LARGE à
// garder en brouillon ([[D-216]]). Sans champ `statut` et sans filtre de
// service, une ligne en brouillon s'afficherait exactement comme une ligne
// publiée : le jour de l'attestation, le responsable signerait un périmètre
// dont une partie ne devait pas sortir. **Le filtre existe donc AVANT la
// première ligne, et pas après.**
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
 * MAIS RÉUTILISER LE TYPE N'HÉRITE PAS DE SA GARDE, et il faut le dire ici parce
 * que la première version de ce commentaire affirmait le contraire — constat de
 * revue, vérifié et fondé. Les bancs anti-dérive qui confrontent les libellés de
 * drapeau aux options réelles d'`ANAMNESE_SECTIONS` parcourent
 * **`ORIENTATION_RULES_V1`**, pas cette table. Le type donne le VOCABULAIRE ; il
 * ne donne ni la vérification des `valeurs` (des chaînes libres), ni celle des
 * couleurs de zone.
 *
 * CE QUI EST GARDÉ ICI, ET CE QUI NE L'EST PAS ENCORE. Le banc de ce module
 * vérifie que chaque feuille nomme un questionnaire du catalogue et qu'un
 * drapeau porte au moins une valeur — assez pour attraper un identifiant
 * inventé, pas assez pour attraper un LIBELLÉ d'anamnèse qui dérive. Ce
 * dernier trou est **ouvert et nommé** : le validateur partagé s’écrit au
 * chantier 2, AVANT la première ligne, parce qu'un déclencheur inerte ne casse
 * rien — il cesse simplement de se déclencher, et personne ne le voit.
 *
 * CE QUE CE TYPE NE PERMET PAS ENCORE : une borne d'ÂGE. `D-216` a rendu l'âge
 * déclencheur, mais `Patient.dateNaissance` n'est lu par aucune porte et
 * `OrientationDeclencheur` n'a pas de forme pour lui. Trois des huit
 * indications proposées en dépendent : elles ne sont pas constructibles
 * aujourd'hui, et c'est dit ici plutôt que découvert à l'attestation.
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
 * LA TABLE, VIDE — et le fail-closed la rend inoffensive tant qu'elle l'est.
 *
 * Elle n'attend pas qu'on trouve des claims : la surface de relecture
 * (`SURFACE_RELECTURE_CATALOGUE_ASSIETTES_2026-09-16.md`) en désigne déjà, et
 * les douze protocoles prescriptifs portent 131 claims validés. Ce qu'elle
 * attend est l'ATTESTATION, et deux chantiers avant elle : le champ d'indication
 * confronté claim par claim au texte lu en production ([[D-224]] a montré qu'une
 * désignation sur trois pouvait être fausse), et le déclencheur d'âge dont trois
 * des huit indications dépendent.
 */
export const INDICATIONS_ASSIETTES_V1: readonly LigneIndicationAssiette[] = [];

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
  validationExterne: false,
  dateValidation: null,
  claimsSource: [],
  shaPerimetre: null,
};

function estIsoCanonique(valeur: string | null): valeur is string {
  if (valeur === null) return false;
  const date = new Date(valeur);
  // `getTime()` D'ABORD : `toISOString()` JETTE sur une date invalide, et un
  // verrou doit FERMER, jamais jeter.
  if (Number.isNaN(date.getTime())) return false;
  return date.toISOString() === valeur;
}

/** Les claims d'une ligne. Une seule catégorie ici, contrairement aux conduites. */
export function claimsDeLIndication(
  ligne: LigneIndicationAssiette,
): readonly ClaimRef[] {
  return ligne.claimsIndication;
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
 * CE QU'ELLE N'ATTRAPE PAS, ET C'EST DÉCLARÉ : un LIBELLÉ de drapeau qui dérive
 * des options réelles d'`ANAMNESE_SECTIONS`. La correspondance clé typée ↔ champ
 * d'anamnèse vit dans le banc d'orientation ; la recopier ici la ferait diverger
 * au premier correctif. **Le validateur partagé est à écrire au chantier 2,
 * avant la première ligne.** Le trou est nommé plutôt que masqué.
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
    if (!idsQuestionnaires.has(feuille.idQuestionnaire)) {
      anomalies.push(`${ligne.id} : questionnaire inconnu \`${feuille.idQuestionnaire}\``);
    }
  }
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
 * exister au catalogue C5B**. Une ligne qui pointe une assiette disparue reste
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
  const cites = [...new Set(lignes.flatMap(l => claimsDeLIndication(l).map(cleClaim)))].sort();
  if (declares.length !== cites.length) return false;
  if (declares.some((claim, index) => claim !== cites[index])) return false;

  if (signature.shaPerimetre === null) return false;
  if (signature.shaPerimetre !== shaPerimetreIndicationsAssiettes(lignes, signature.claimsSource)) {
    return false;
  }

  return lignes.every(ligne => getRecommendedPlate(ligne.plateCode) !== null);
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
      && claimsDeLIndication(ligne).every(claim => claimsValides.has(cleClaim(claim))),
  );
}
