import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  createSourceFile, isCallExpression, isFunctionDeclaration, isIdentifier,
  isImportDeclaration, isNamedImports, isObjectLiteralExpression, isPropertyAssignment,
  isShorthandPropertyAssignment, isSpreadAssignment, isTypeLiteralNode, isTypeReferenceNode,
  isAsExpression, isNonNullExpression, isParenthesizedExpression, isSatisfiesExpression,
  isTypeAssertionExpression,
  ScriptKind, ScriptTarget, SyntaxKind,
  type Expression, type Node, type SourceFile,
} from 'typescript';
import { describe, expect, it } from 'vitest';
import { canonicalSha256 } from '@/lib/clinical-engine/canonical';
import { getCurrentRecommendedPlateRef } from '@/lib/food-compass/plates';
import {
  REPLIS_ASSIETTE_METADATA,
  decidePlateSubstitution,
  REPLIS_ASSIETTE_V1,
  anomaliesDeLaLigneRepli,
  replisAssietteSignes,
  replisPourProtocole,
  replisServables,
  shaPerimetreReplisAssiette,
  type LigneRepliAssiette,
  type ReplisAssietteMetadata,
} from './replisAssietteV1';
import { INDICATIONS_ASSIETTES_V1 } from './indicationsAssiettesV1';

// LE VERROU DE LA TABLE DE REPLIS ([[D-241]]). Ce banc garde trois choses, et la
// troisième est la seule qui compte vraiment : que l'ÉTAT LIVRÉ — table vide,
// non signée, rien servi — tienne, et qu'une signature ne puisse pas s'acquérir
// par inadvertance. Les deux premières sont la mécanique qui le rend vrai.

/** Une indication réellement présente au dépôt — désignée, jamais inventée. */
const INDICATION = INDICATIONS_ASSIETTES_V1[0]?.id ?? 'ASSIETTE-IND-INTROUVABLE';

/**
 * UNE SECONDE indication réelle, DISTINCTE de la première — cherchée par
 * PRÉDICAT. Le motif que j'avais écrit ici était faux, et la contre-revue l'a
 * vu : `[1]` ne peut jamais désigner le même élément que `[0]`, quel que soit
 * l'ordre. Ce que la forme `[1]` risque vraiment est une table de MOINS DE DEUX
 * lignes, qui la fait retomber sur son littéral de repli — et le cas serait
 * alors vain sans rien dire. Le prédicat, lui, ne peut rendre que `INDICATION`
 * ou rien, et l'assertion du cas refuse le « rien ».
 */
const AUTRE_INDICATION = INDICATIONS_ASSIETTES_V1
  .find(candidate => candidate.id !== INDICATION)?.id ?? 'ASSIETTE-IND-INTROUVABLE';

function ligne(over: Partial<LigneRepliAssiette> = {}): LigneRepliAssiette {
  return {
    id: 'REPLI-FIXTURE-1',
    depuis: 'ASSIETTE_DOPAMINERGIQUE',
    vers: 'ASSIETTE_SEROTONINERGIQUE',
    indication: INDICATION,
    degre: 'acceptable',
    raccourciAssume: 'Affirmation de fixture, assumée pour le banc.',
    statut: 'publiee',
    ...over,
  };
}

/** Signature CALCULÉE dans le banc — jamais la métadonnée réelle ([[D-225]]). */
function signeePour(lignes: readonly LigneRepliAssiette[]): ReplisAssietteMetadata {
  return {
    validationExterne: true,
    dateValidation: '2026-09-21T22:00:00.000Z',
    shaPerimetre: shaPerimetreReplisAssiette(lignes),
  };
}

describe('L’ÉTAT LIVRÉ — la table est vide, non signée, et ne sert rien', () => {
  it('aucune ligne n’est écrite, et c’est l’état NOMINAL', () => {
    // Une ligne ici serait une affirmation clinique qu'aucun claim ne fonde :
    // le corpus décrit l'inclusion, l'association et la parenté de modèle, qui
    // sont l'inverse logique de l'échange. La déclarer appartient au praticien.
    expect(REPLIS_ASSIETTE_V1).toEqual([]);
  });

  it('la métadonnée n’atteste RIEN, et ses trois termes le disent', () => {
    expect(REPLIS_ASSIETTE_METADATA.validationExterne).toBe(false);
    expect(REPLIS_ASSIETTE_METADATA.dateValidation).toBeNull();
    expect(REPLIS_ASSIETTE_METADATA.shaPerimetre).toBeNull();
  });

  it('le verrou est FERMÉ et le service VIDE — sur la table réelle, pas une fixture', () => {
    expect(replisAssietteSignes()).toBe(false);
    expect(replisServables()).toEqual([]);
    expect(replisPourProtocole([{ recommendedPlateRef: { plateCode: 'ASSIETTE_DOPAMINERGIQUE' } }]))
      .toEqual([]);
  });

  it('ON NE SIGNE PAS UNE ABSENCE : une table vide reste non signée même sous une signature valide', () => {
    // Le piège serait de laisser une métadonnée complète « couvrir » le vide :
    // la table deviendrait signée sans que personne n'ait rien relu, et la
    // première ligne ajoutée entrerait sous une attestation acquise.
    expect(replisAssietteSignes(signeePour([]), [])).toBe(false);
  });
});

describe('Le verrou — chaque terme ferme, et aucun ne se supplée', () => {
  it('accepte une table bien formée sous une signature calculée', () => {
    const lignes = [ligne()];
    expect(replisAssietteSignes(signeePour(lignes), lignes)).toBe(true);
    expect(replisServables(signeePour(lignes), lignes)).toEqual(lignes);
  });

  it('refuse sans validation externe, sans date, sans sha, ou sur un sha qui ne correspond pas', () => {
    const lignes = [ligne()];
    const bonne = signeePour(lignes);
    expect(replisAssietteSignes({ ...bonne, validationExterne: false }, lignes)).toBe(false);
    expect(replisAssietteSignes({ ...bonne, dateValidation: null }, lignes)).toBe(false);
    expect(replisAssietteSignes({ ...bonne, shaPerimetre: null }, lignes)).toBe(false);
    expect(replisAssietteSignes({ ...bonne, shaPerimetre: 'a'.repeat(64) }, lignes)).toBe(false);
  });

  it('UNE DATE D’ATTESTATION SE VÉRIFIE — constat de revue, et les deux tables sœurs le faisaient déjà', () => {
    // La première rédaction n'exigeait que `!== null` : une métadonnée portant
    // `validationExterne: true`, une date illisible et le BON sha ouvrait la
    // table. Une date d'attestation qu'on ne peut pas lire n'atteste rien.
    const lignes = [ligne()];
    const bonne = signeePour(lignes);
    for (const date of ['pas une date', '2026-09-21', '2026-13-45T00:00:00.000Z', '']) {
      expect(replisAssietteSignes({ ...bonne, dateValidation: date }, lignes)).toBe(false);
    }
    // Et un verrou FERME au lieu de jeter, même sur une date invalide.
    expect(() => replisAssietteSignes({ ...bonne, dateValidation: 'pas une date' }, lignes)).not.toThrow();
  });

  it('LE PÉRIMÈTRE PORTE LES LIGNES EN ENTIER — une ligne retouchée périme l’attestation', () => {
    const lignes = [ligne()];
    const signature = signeePour(lignes);
    const retouchee = [ligne({ degre: 'dernier_recours' })];
    // Le degré n'est pas un détail de présentation : il change ce qui est
    // attesté. Le sha doit donc bouger avec lui.
    expect(shaPerimetreReplisAssiette(retouchee)).not.toBe(signature.shaPerimetre);
    expect(replisAssietteSignes(signature, retouchee)).toBe(false);
    // Et le calcul est bien celui du module, pas une recopie du banc.
    expect(shaPerimetreReplisAssiette(lignes)).toBe(canonicalSha256({ lignes }));
  });

  it('refuse un identifiant de ligne en double', () => {
    const lignes = [ligne(), ligne({ vers: 'ASSIETTE_PSYCHOBIOTIQUE' })];
    expect(replisAssietteSignes(signeePour(lignes), lignes)).toBe(false);
  });

  it('REFUSE une table qui se recouvre, même signée — deux lignes, le même triplet', () => {
    // Le recouvrement est un défaut de TABLE, pas un cas : `baremeChargeV1` et
    // `tableRepliV1` le refusent tous deux. Ici deux lignes ne se distinguent
    // plus que par leur degré — la décision en retiendrait une arbitrairement.
    const lignes = [ligne(), ligne({ id: 'REPLI-FIXTURE-2', degre: 'dernier_recours' })];
    expect(replisAssietteSignes(signeePour(lignes), lignes)).toBe(false);
    expect(replisServables(signeePour(lignes), lignes)).toEqual([]);
  });

  it('mais la MÊME direction pour deux indications distinctes reste servable', () => {
    // Sans ce cas, la garde ci-dessus pourrait être écrite sur le seul couple
    // `depuis`/`vers` et fermerait ce que la condition existe pour permettre.
    expect(AUTRE_INDICATION, 'une seconde indication réelle est requise')
      .not.toBe(INDICATION);
    const lignes = [ligne(), ligne({ id: 'REPLI-FIXTURE-2', indication: AUTRE_INDICATION })];
    expect(replisAssietteSignes(signeePour(lignes), lignes)).toBe(true);
    expect(replisServables(signeePour(lignes), lignes)).toHaveLength(2);
  });

  it('une seule ligne anormale ferme le service ENTIER, jamais la seule fautive', () => {
    const lignes = [ligne(), ligne({ id: 'REPLI-FIXTURE-2', depuis: 'ASSIETTE_INCONNUE' })];
    expect(replisAssietteSignes(signeePour(lignes), lignes)).toBe(false);
    expect(replisServables(signeePour(lignes), lignes)).toEqual([]);
  });

  it('un BROUILLON est signé avec la table mais jamais servi', () => {
    const lignes = [ligne(), ligne({ id: 'REPLI-FIXTURE-2', vers: 'ASSIETTE_PSYCHOBIOTIQUE', statut: 'brouillon' })];
    expect(replisAssietteSignes(signeePour(lignes), lignes)).toBe(true);
    expect(replisServables(signeePour(lignes), lignes)).toHaveLength(1);
  });
});

describe('Les anomalies — ce qu’une ligne ne peut pas être', () => {
  it('accepte la ligne de fixture, sans quoi tous les cas suivants seraient vains', () => {
    expect(anomaliesDeLaLigneRepli(ligne())).toEqual([]);
  });

  it('refuse une assiette qui se replie sur elle-même — la direction serait vide', () => {
    expect(anomaliesDeLaLigneRepli(ligne({ vers: 'ASSIETTE_DOPAMINERGIQUE' })))
      .toContain('une assiette ne se replie pas sur elle-même');
  });

  it('refuse une assiette absente du catalogue, aux deux bouts', () => {
    expect(anomaliesDeLaLigneRepli(ligne({ depuis: 'ASSIETTE_QUI_N_EXISTE_PAS' })).join(' '))
      .toMatch(/« depuis » absente du catalogue/);
    expect(anomaliesDeLaLigneRepli(ligne({ vers: 'ASSIETTE_QUI_N_EXISTE_PAS' })).join(' '))
      .toMatch(/« vers » absente du catalogue/);
  });

  it('refuse un repère de MOMENT DE REPAS aux deux bouts — il ne se prescrit pas', () => {
    expect(anomaliesDeLaLigneRepli(ligne({ depuis: 'ASSIETTE_SOIR_LEGER' })).join(' '))
      .toMatch(/« depuis » hors de l’axe d’indication/);
    expect(anomaliesDeLaLigneRepli(ligne({ vers: 'ASSIETTE_SOIR_LEGER' })).join(' '))
      .toMatch(/« vers » hors de l’axe d’indication/);
  });

  it('refuse une indication que la table signée ne porte pas', () => {
    expect(anomaliesDeLaLigneRepli(ligne({ indication: 'ASSIETTE-IND-INVENTEE' })).join(' '))
      .toMatch(/indication inconnue/);
  });

  it('refuse un raccourci assumé absent — aucune ligne ne va de soi', () => {
    expect(anomaliesDeLaLigneRepli(ligne({ raccourciAssume: '   ' })))
      .toContain('raccourci assumé absent');
  });

  it('refuse un degré et un statut inconnus', () => {
    expect(anomaliesDeLaLigneRepli(ligne({ degre: 'tres_proche' as LigneRepliAssiette['degre'] })).join(' '))
      .toMatch(/degré de repli inconnu/);
    expect(anomaliesDeLaLigneRepli(ligne({ statut: 'retiree' as LigneRepliAssiette['statut'] })).join(' '))
      .toMatch(/statut inconnu/);
  });
});

describe('La direction se lit dans un seul sens', () => {
  it('une assiette qui est une CIBLE n’a pas de repli', () => {
    // `replisDepuis` n'est plus exportée : elle prenait une liste déjà filtrée,
    // donc l'exporter offrait le contournement que ce lot ferme. Sa propriété
    // s'éprouve par le seul point d'entrée qui reste.
    const lignes = [ligne()];
    expect(replisPourProtocole(
      [{ recommendedPlateRef: { plateCode: 'ASSIETTE_DOPAMINERGIQUE' } }],
      signeePour(lignes), lignes,
    )).toHaveLength(1);
    // Sans une seconde ligne écrite et attestée, l'inverse n'existe pas.
    expect(replisPourProtocole(
      [{ recommendedPlateRef: { plateCode: 'ASSIETTE_SEROTONINERGIQUE' } }],
      signeePour(lignes), lignes,
    )).toEqual([]);
  });
});


// LA DÉCISION DE SUBSTITUTION — déplacée depuis `food-compass/plates.test.ts`
// avec la fonction qu'elle éprouve ([[D-241]], second tour de revue). Elle a
// suivi `decidePlateSubstitution` chez la table qui la gouverne : tant que la
// décision vivait dans `plates.ts`, les replis lui arrivaient en paramètre et le
// point de service unique se contournait.
describe('La décision de substitution — orientée, conditionnée, gardée aux deux bouts', () => {
  // LES BANCS PASSENT PAR LE VERROU, EXACTEMENT COMME LA PRODUCTION — constat de
  // revue, deuxième passe. Ils ne fournissent plus une liste déjà filtrée (la
  // fonction n'en accepte plus) mais une TABLE et sa SIGNATURE, que la décision
  // remet elle-même à `replisServables`. Une ligne de fixture doit donc être
  // complète et cohérente pour être vue : c'est ce qu'on veut éprouver.
  function tableDe(lignes: readonly LigneRepliAssiette[]) {
    return { signature: signeePour(lignes), lignes };
  }

  it('permet explicitement de ne rien proposer — et l’absence est DÉCLARÉE, pas subie', () => {
    const source = getCurrentRecommendedPlateRef('ASSIETTE_DOPAMINERGIQUE');
    expect(decidePlateSubstitution({ source, indication: INDICATION })).toMatchObject({
      status: 'none', reason: 'no_validated_alternative', decidedBy: 'practitioner',
    });
    expect(decidePlateSubstitution({
      source, indication: INDICATION, noProposalReason: 'practitioner_declined',
    })).toMatchObject({ status: 'none', reason: 'practitioner_declined' });
  });

  it('SUR LA TABLE RÉELLE — vide et non signée — aucune cible n’est atteignable', () => {
    expect(() => decidePlateSubstitution({
      source: getCurrentRecommendedPlateRef('ASSIETTE_DOPAMINERGIQUE'),
      indication: INDICATION,
      targetPlateCode: 'ASSIETTE_SEROTONINERGIQUE',
      justification: 'Choix discuté avec le patient.',
    })).toThrow(/Aucun repli attesté/);
  });

  it('UNE TABLE NON SIGNÉE NE SERT RIEN — le verrou n’est pas contournable par l’appel', () => {
    // C'est le cœur du constat de revue : la fonction ne reçoit plus une liste
    // déjà filtrée. Tout ce qu'on lui passe traverse le verrou, qui refuse ici
    // faute de signature valide.
    const lignes = [ligne()];
    expect(() => decidePlateSubstitution({
      source: getCurrentRecommendedPlateRef('ASSIETTE_DOPAMINERGIQUE'),
      indication: INDICATION,
      lignes,
      signature: { validationExterne: false, dateValidation: null, shaPerimetre: null },
      targetPlateCode: 'ASSIETTE_SEROTONINERGIQUE',
      justification: 'Repli discuté avec le patient.',
    })).toThrow(/Aucun repli attesté/);
  });

  it('UN BROUILLON N’EST PAS SERVI — même signé avec la table', () => {
    const lignes = [ligne({ statut: 'brouillon' })];
    expect(() => decidePlateSubstitution({
      source: getCurrentRecommendedPlateRef('ASSIETTE_DOPAMINERGIQUE'),
      indication: INDICATION,
      ...tableDe(lignes),
      targetPlateCode: 'ASSIETTE_SEROTONINERGIQUE',
      justification: 'Repli discuté avec le patient.',
    })).toThrow(/Aucun repli attesté/);
  });

  it('LA DIRECTION NE SE LIT QUE DANS UN SENS — c’est tout l’objet du lot', () => {
    // Une étiquette de famille attestait A→B ET B→A, et par transitivité toute
    // la clique : trois assiettes déclarées valaient six substitutions.
    const lignes = [ligne()];
    const aVersB = decidePlateSubstitution({
      source: getCurrentRecommendedPlateRef('ASSIETTE_DOPAMINERGIQUE'),
      indication: INDICATION,
      ...tableDe(lignes),
      targetPlateCode: 'ASSIETTE_SEROTONINERGIQUE',
      justification: 'Repli discuté avec le patient.',
    });
    expect(aVersB).toMatchObject({
      status: 'proposed',
      repli: {
        depuis: 'ASSIETTE_DOPAMINERGIQUE', vers: 'ASSIETTE_SEROTONINERGIQUE',
        indication: INDICATION, degre: 'acceptable',
      },
      decidedBy: 'practitioner',
    });
    expect(aVersB.status === 'proposed' && aVersB.target.plateCode).toBe('ASSIETTE_SEROTONINERGIQUE');

    expect(() => decidePlateSubstitution({
      source: getCurrentRecommendedPlateRef('ASSIETTE_SEROTONINERGIQUE'),
      indication: INDICATION,
      ...tableDe(lignes),
      targetPlateCode: 'ASSIETTE_DOPAMINERGIQUE',
      justification: 'Repli discuté avec le patient.',
    })).toThrow(/Aucun repli attesté/);
  });

  it('LA CONDITION COMPTE AUTANT QUE LA DIRECTION — constat de revue', () => {
    // Deux lignes du MÊME couple, attestées pour deux indications différentes.
    // Sans le terme d'indication, la recherche retenait la première et la
    // décision perdait la condition qui l'autorise.
    const lignes = [
      ligne({ id: 'REPLI-FIXTURE-A', degre: 'proche' }),
      ligne({ id: 'REPLI-FIXTURE-B', indication: AUTRE_INDICATION, degre: 'dernier_recours' }),
    ];
    const pourLaSeconde = decidePlateSubstitution({
      source: getCurrentRecommendedPlateRef('ASSIETTE_DOPAMINERGIQUE'),
      indication: AUTRE_INDICATION,
      ...tableDe(lignes),
      targetPlateCode: 'ASSIETTE_SEROTONINERGIQUE',
      justification: 'Repli discuté avec le patient.',
    });
    expect(pourLaSeconde).toMatchObject({
      status: 'proposed',
      repli: { indication: AUTRE_INDICATION, degre: 'dernier_recours' },
    });

    // Et une indication qu'aucune ligne n'atteste ne se sert d'aucune autre.
    expect(() => decidePlateSubstitution({
      source: getCurrentRecommendedPlateRef('ASSIETTE_DOPAMINERGIQUE'),
      indication: 'ASSIETTE-IND-QUE-RIEN-N-ATTESTE',
      ...tableDe(lignes),
      targetPlateCode: 'ASSIETTE_SEROTONINERGIQUE',
      justification: 'Repli discuté avec le patient.',
    })).toThrow(/pour cette indication/);
  });

  it('l’AXE est gardé aux deux bouts — un repère de repas ne se replie ni ne sert de repli', () => {
    // L'axe se vérifie AVANT toute lecture de table : une assiette d'observation
    // n'a pas à attendre qu'un repli existe pour être refusée.
    expect(() => decidePlateSubstitution({
      source: getCurrentRecommendedPlateRef('ASSIETTE_SOIR_LEGER'),
      indication: INDICATION,
      targetPlateCode: 'ASSIETTE_DOPAMINERGIQUE',
      justification: 'Repli discuté avec le patient.',
    })).toThrow(/ne se replie pas/);
    expect(() => decidePlateSubstitution({
      source: getCurrentRecommendedPlateRef('ASSIETTE_DOPAMINERGIQUE'),
      indication: INDICATION,
      targetPlateCode: 'ASSIETTE_SOIR_LEGER',
      justification: 'Repli discuté avec le patient.',
    })).toThrow(/servir de repli/);
  });

  it('la justification praticien reste exigée, même sur un repli attesté', () => {
    const lignes = [ligne()];
    expect(() => decidePlateSubstitution({
      source: getCurrentRecommendedPlateRef('ASSIETTE_DOPAMINERGIQUE'),
      indication: INDICATION,
      ...tableDe(lignes),
      targetPlateCode: 'ASSIETTE_SEROTONINERGIQUE',
      // POURQUOI `'court'` ET NON `'trop court'` : le seuil est `< 10`, et
      // « trop court » fait EXACTEMENT 10 caractères — il passerait la
      // validation, et ce cas ne prouverait plus rien. La valeur ci-dessous en
      // fait 5, donc elle est refusée, ce que l'assertion vérifie.
      justification: 'court',
    })).toThrow(/justification praticien/);
  });
});

describe('Les replis d’un protocole — « prescrite » se lit sur les actions', () => {
  it('rend les replis de l’assiette PRESCRITE, avec sa direction et sa condition', () => {
    const lignes = [ligne()];
    const alternatives = replisPourProtocole(
      [{ recommendedPlateRef: { plateCode: 'ASSIETTE_DOPAMINERGIQUE' } }],
      signeePour(lignes), lignes,
    );
    expect(alternatives).toEqual([{
      depuis: 'ASSIETTE_DOPAMINERGIQUE',
      vers: 'ASSIETTE_SEROTONINERGIQUE',
      indication: INDICATION,
      degre: 'acceptable',
    }]);
  });

  it('ne rend RIEN pour une action sans assiette, ni pour une assiette sans repli', () => {
    const lignes = [ligne()];
    expect(replisPourProtocole([{}], signeePour(lignes), lignes)).toEqual([]);
    expect(replisPourProtocole(
      [{ recommendedPlateRef: { plateCode: 'ASSIETTE_PSYCHOBIOTIQUE' } }],
      signeePour(lignes), lignes,
    )).toEqual([]);
  });

  it('ne lit PAS la direction inverse — une assiette qui est une CIBLE n’a pas de repli', () => {
    const lignes = [ligne()];
    expect(replisPourProtocole(
      [{ recommendedPlateRef: { plateCode: 'ASSIETTE_SEROTONINERGIQUE' } }],
      signeePour(lignes), lignes,
    )).toEqual([]);
  });

  it('dédoublonne l’assiette citée par DEUX actions', () => {
    const lignes = [ligne()];
    const alternatives = replisPourProtocole([
      { recommendedPlateRef: { plateCode: 'ASSIETTE_DOPAMINERGIQUE' } },
      { recommendedPlateRef: { plateCode: 'ASSIETTE_DOPAMINERGIQUE' } },
    ], signeePour(lignes), lignes);
    expect(alternatives).toHaveLength(1);
  });

  it('SUR LA TABLE RÉELLE, elle rend une liste vide — une absence DÉCLARÉE', () => {
    // Et c'est la différence que ce lot a introduite : avant, `alternatives`
    // était un tuple vide LITTÉRAL, que le contrat interdisait de remplir.
    expect(replisPourProtocole([{ recommendedPlateRef: { plateCode: 'ASSIETTE_DOPAMINERGIQUE' } }]))
      .toEqual([]);
  });
});


/** Les fichiers de PRODUCTION — un banc n'est pas un chemin de production. */
function fichiersDeProduction(racine: string): readonly string[] {
  return readdirSync(racine, { withFileTypes: true }).flatMap(entree => {
    const chemin = join(racine, entree.name);
    if (entree.isDirectory()) return fichiersDeProduction(chemin);
    if (!/\.tsx?$/.test(entree.name)) return [];
    if (/\.(test|spec|guard\.test)\.tsx?$/.test(entree.name)) return [];
    return [chemin];
  });
}

/**
 * CE QU'ON LIT ICI EST UN ARBRE, PLUS UN TEXTE — et c'est la troisième fois que
 * ce lot apprend la même chose.
 *
 * Les trois rédactions précédentes de cette garde étaient LEXICALES, et la
 * contre-revue a trouvé un défaut réel dans chacune : une liste de noms écrite
 * en dur qui en oubliait deux ; un retrait de prose par expressions régulières
 * qui EFFAÇAIT l'appel fautif ; puis, sur le texte brut, un compteur de
 * parenthèses qu'une parenthèse écrite DANS UNE CHAÎNE — `sansSuffixe(actions,
 * ')')` — refermait trop tôt, rendant l'override invisible. À chaque fois le
 * raté était SILENCIEUX, et à chaque fois j'ai rapiécé le lexeur.
 *
 * **Une garde LEXICALE ne peut pas tenir une propriété STRUCTURELLE.** Chaînes,
 * gabarits, expressions régulières, commentaires, JSX, imports renommés : la
 * liste des cas particuliers n'a pas de fin, et chacun se paie en silence. Le
 * compilateur, lui, connaît la grammaire — il est déjà au dépôt, et l'arbre
 * qu'il rend répond exactement aux questions posées ici.
 *
 * CE QUE LA GARDE TIENT DÉSORMAIS : aucun appel, dans un fichier de PRODUCTION,
 * ne passe d'override à une fonction injectable de ce module — **l'import
 * renommé compris**, que les rédactions lexicales déclaraient hors de portée.
 */
function arbreDe(chemin: string, source: string) {
  return createSourceFile(chemin, source, ScriptTarget.Latest, true, ScriptKind.TSX);
}

/** Chaque nœud de l'arbre, une fois. */
function noeuds(racine: Node): readonly Node[] {
  const tous: Node[] = [];
  const descendre = (noeud: Node) => {
    tous.push(noeud);
    noeud.forEachChild(descendre);
  };
  descendre(racine);
  return tous;
}

/**
 * LES FONCTIONS EXPORTÉES QUI ACCEPTENT UNE SIGNATURE — dérivées du MODULE,
 * jamais énumérées ici.
 *
 * C'est la leçon de la quatrième passe, et elle tient toujours : une garde qui
 * NOMME est une instance déguisée en classe. Une cinquième fonction injectable
 * ajoutée demain est couverte sans que personne y pense.
 *
 * `argumentsNus` est ce que la PRODUCTION a le droit de passer : le rang du
 * premier paramètre d'injection. `objet` distingue la décision, qui reçoit un
 * littéral — là ce sont les propriétés, ou un étalement, qui trahissent.
 */
function exportsInjectables(chemin: string, source: string) {
  const porteUneSignature = (noeud: Node) =>
    noeuds(noeud).some(fils => isTypeReferenceNode(fils)
      && fils.typeName.getText() === 'ReplisAssietteMetadata');
  return noeuds(arbreDe(chemin, source))
    .filter(isFunctionDeclaration)
    .filter(fonction => fonction.name !== undefined
      && fonction.modifiers?.some(mot => mot.kind === SyntaxKind.ExportKeyword) === true
      && fonction.parameters.some(porteUneSignature))
    .map(fonction => {
      const rang = fonction.parameters.findIndex(porteUneSignature);
      const premier = fonction.parameters[0];
      const objet = premier !== undefined && premier.type !== undefined
        && isTypeLiteralNode(premier.type) && porteUneSignature(premier);
      return { nom: fonction.name!.getText(), argumentsNus: objet ? 1 : rang, objet };
    });
}

/** Ce que la production a le droit d'écrire, et ce qui la trahit. */
const INJECTIONS = ['signature', 'lignes', 'lignesIndication'];

/**
 * LES APPELS FAUTIFS D'UN FICHIER — la seule chose que cette garde décide.
 *
 * ELLE PREND SON TEXTE EN PARAMÈTRE, ET C'EST DÉLIBÉRÉ : l'analyse est ainsi
 * éprouvable sur des sources écrites DANS LE BANC, sans rien déposer au dépôt.
 * Les six évasions que les rédactions lexicales manquaient une à une y sont
 * désormais des CAS, pas des mutations jouées une fois puis perdues. C'est ce
 * qui doit empêcher une onzième rédaction de cette garde.
 */
function appelsFautifs(
  formes: ReturnType<typeof exportsInjectables>,
  fichiers: readonly { chemin: string; source: string }[],
): readonly string[] {
  const parNom = new Map(formes.map(forme => [forme.nom, forme]));
  return fichiers.flatMap(({ chemin, source }) => {
    if (!source.includes('replisAssietteV1')) return [];
    const arbre = arbreDe(chemin, source);
    const locaux = nomsLocaux(arbre);
    return noeuds(arbre).flatMap(noeud => {
      if (!isCallExpression(noeud) || !isIdentifier(noeud.expression)) return [];
      const forme = parNom.get(locaux.get(noeud.expression.getText()) ?? '');
      if (forme === undefined) return [];
      // Les formes positionnelles : tout argument au-delà des paramètres nus EST
      // un override. La forme à objet : ce sont les propriétés qui trahissent —
      // ou un étalement, qui les porterait sans les écrire.
      const trop = noeud.arguments.length > forme.argumentsNus;
      const premier = noeud.arguments[0] === undefined
        ? undefined : sousLEnrobage(noeud.arguments[0]);
      const nomme = forme.objet && premier !== undefined
        && isObjectLiteralExpression(premier)
        && premier.properties.some(propriete =>
          isSpreadAssignment(propriete)
          || ((isPropertyAssignment(propriete) || isShorthandPropertyAssignment(propriete))
            && INJECTIONS.includes(propriete.name.getText())));
      return trop || nomme ? [`${chemin} → ${forme.nom}`] : [];
    });
  });
}

/** Combien d'appels au module ce fichier porte — anti-vacuité de l'analyse. */
function nombreDAppels(
  formes: ReturnType<typeof exportsInjectables>,
  chemin: string,
  source: string,
): number {
  const parNom = new Map(formes.map(forme => [forme.nom, forme]));
  const arbre = arbreDe(chemin, source);
  const locaux = nomsLocaux(arbre);
  return noeuds(arbre).filter(noeud =>
    isCallExpression(noeud) && isIdentifier(noeud.expression)
    && parNom.has(locaux.get(noeud.expression.getText()) ?? '')).length;
}

/**
 * L'ARGUMENT SOUS SON ENROBAGE — `as never`, parenthèses, `satisfies`, `!`.
 *
 * Trouvé par ma propre batterie de témoins, et c'est pour cela qu'elle existe :
 * `decidePlateSubstitution({ ...fabrique } as never)` n'est PAS un littéral
 * d'objet pour l'arbre, c'est une assertion de type qui en contient un. Sans ce
 * dépouillement, l'étalement — la forme qui porte les clés d'injection sans les
 * écrire — repassait au travers.
 */
function sousLEnrobage(noeud: Expression): Expression {
  let courant = noeud;
  while (isAsExpression(courant) || isParenthesizedExpression(courant)
    || isSatisfiesExpression(courant) || isNonNullExpression(courant)
    || isTypeAssertionExpression(courant)) {
    courant = courant.expression;
  }
  return courant;
}

/**
 * LES NOMS LOCAUX SOUS LESQUELS CE FICHIER APPELLE LE MODULE.
 *
 * `import { decidePlateSubstitution as deciderRepli }` rend
 * `{ deciderRepli → decidePlateSubstitution }` : l'import renommé cesse d'être
 * un angle mort. Un fichier qui importe sans renommer rend l'identité.
 */
function nomsLocaux(arbre: SourceFile): ReadonlyMap<string, string> {
  const table = new Map<string, string>();
  for (const noeud of noeuds(arbre)) {
    if (!isImportDeclaration(noeud)) continue;
    if (!noeud.moduleSpecifier.getText().includes('replisAssietteV1')) continue;
    const nommes = noeud.importClause?.namedBindings;
    if (nommes === undefined || !isNamedImports(nommes)) continue;
    for (const element of nommes.elements) {
      table.set(element.name.getText(), (element.propertyName ?? element.name).getText());
    }
  }
  return table;
}

describe('Le point de service ne se contourne pas — garde de SOURCE', () => {
  it('la décision lit `replisServables()` par défaut, et non la table nue', () => {
    // POURQUOI UNE GARDE DE SOURCE, ET NON UN BANC DE COMPORTEMENT. Mesuré :
    // remplacer `replisServables()` par `REPLIS_ASSIETTE_V1` dans le défaut ne
    // fait rougir AUCUN cas — la table étant vide, les deux expressions rendent
    // la même liste. Aucun banc de comportement ne peut donc distinguer les deux
    // tant qu'aucune ligne n'existe, et un banc qui prétendrait le faire serait
    // plus faible qu'honnête.
    //
    // CE QUE LA GARDE TIENT EST DONC LA FORME, et c'est exactement ce que le
    // constat de revue visait : « un appelant peut contourner `replisServables()`
    // et faire accepter une ligne brouillon ou une table non attestée ». Le jour
    // où une ligne sera écrite, la différence deviendra observable — d'ici là,
    // c'est la source qui fait foi.
    const source = readFileSync(join(process.cwd(), 'src/lib/clinical/replisAssietteV1.ts'), 'utf8');
    const appel = /const repli = ([A-Za-z_]+)\(input\.signature, input\.lignes, input\.lignesIndication\)\.find\(/
      .exec(source);
    expect(appel, 'l’appel au point de service n’a pas été retrouvé dans la source').not.toBeNull();
    expect(appel![1]).toBe('replisServables');
    // ET LA FONCTION N'ACCEPTE AUCUNE LISTE DÉJÀ FILTRÉE : un paramètre `replis`
    // rouvrirait le contournement que cette garde ferme.
    expect(source).not.toMatch(/replis\?: readonly RepliAssietteDeclare\[\]/);
  });

  it('AUCUNE fonction EXPORTÉE de ce module n’accepte une liste déjà filtrée', () => {
    // LA CLASSE, PAS L'INSTANCE — et c'est la leçon de ce lot, payée en QUATRE
    // passes de revue. J'ai fermé le contournement sur `decidePlateSubstitution`
    // en laissant `replisDepuis` et `replisPourProtocole` l'offrir intact : un
    // paramètre `servables: readonly LigneRepliAssiette[]` accepte
    // `REPLIS_ASSIETTE_V1` nu, un brouillon, ou une ligne fabriquée. Corriger
    // une instance sans balayer ses voisines laisse la classe vivante.
    //
    // CE QUE CETTE GARDE TIENT : une fonction EXPORTÉE d'ici reçoit la table et
    // sa signature — jamais le résultat d'un filtre qu'elle n'a pas fait
    // elle-même. Une fonction interne peut, elle, prendre une liste servable :
    // son appelant l'a obtenue du verrou.
    const source = readFileSync(join(process.cwd(), 'src/lib/clinical/replisAssietteV1.ts'), 'utf8');
    const exportees = [...source.matchAll(// `[^)]*` traverse déjà les sauts de ligne : le drapeau `s` serait inutile,
    // et il n'est pas disponible pour la cible de compilation.
    /export function (\w+)\(([^)]*)\)/g)];
    expect(exportees.length, 'aucune fonction exportée retrouvée — la garde serait vacante')
      .toBeGreaterThan(3);
    const fautives = exportees
      .filter(([, nom, parametres]) =>
        nom !== 'replisServables'
        && nom !== 'replisAssietteSignes'
        && /:\s*readonly LigneRepliAssiette\[\]/.test(parametres)
        && !/lignes\??:\s*readonly LigneRepliAssiette\[\]/.test(parametres))
      .map(([, nom]) => nom);
    expect(fautives, 'ces fonctions exportées prennent une liste déjà filtrée').toEqual([]);
  });

  it('AUCUN appelant de PRODUCTION n’injecte une table ni une signature', () => {
    // CINQUIÈME PASSE SUR LA MÊME CLASSE, ET LE CONSTAT A CHANGÉ DE NIVEAU.
    // Les quatre premières visaient une liste DÉJÀ filtrée ; celle-ci vise les
    // paramètres qui l'ont remplacée. Le relecteur a raison sur le FAIT :
    // `replisAssietteSignes` vérifie la COHÉRENCE de ce qu'on lui donne — sha
    // recalculé, date ISO, anomalies, statut publié, table vide refusée — et
    // jamais sa PROVENANCE. Une métadonnée fabriquée dont on a recalculé le sha
    // passe le verrou.
    //
    // CE QUI N'EST PAS CHANGÉ, ET POURQUOI IL FAUT LE LIRE AVANT DE LE REFAIRE.
    // Cette forme est celle des QUATRE tables signées qui précèdent —
    // `indicationsAssiettesV1`, `catalogueConduitesV1`, `baremeChargeV1`,
    // `tableRepliV1` : toutes exposent `(signature = METADATA, lignes = TABLE)`
    // en paramètres par défaut. Dévier celle-ci seule ne fermerait rien, les
    // quatre autres offrant le même geste, et casserait l'uniformité que la
    // prochaine relecture lira. Dans ce dépôt la provenance n'est pas tenue par
    // une signature de fonction — il n'existe aucun secret : elle est tenue par
    // le littéral committé et son enrôlement à
    // `shaPerimetreLitteral.guard.test.ts`, le jour de la PREMIÈRE signature.
    //
    // CE QUE CETTE GARDE TIENT — et elle le tient sur un ARBRE, parce que trois
    // rédactions lexicales de suite ont échoué EN SILENCE (voir l'en-tête
    // d'`arbreDe`, et [[D-241]] §19).
    //
    // ELLE TIENT : aucun appel, dans un fichier de PRODUCTION, ne passe
    // d'override à une fonction injectable de ce module. La liste de ces
    // fonctions est DÉRIVÉE du module, et l'IMPORT RENOMMÉ est suivi — ce que
    // les rédactions précédentes déclaraient hors de portée.
    //
    // ELLE NE TIENT TOUJOURS PAS, et c'est déclaré : un appel indirect — la
    // fonction passée en valeur, atteinte par un objet, ou reconstruite — n'est
    // pas un appel nommé, et l'arbre seul ne le résout pas. Rien ici ne peut
    // arrêter un contournement délibéré : le `shaPerimetre` est un littéral
    // lisible, et qui sait fabriquer une signature sait éditer la métadonnée.
    // Ce que la garde ferme est la rédaction ORDINAIRE.
    const racine = join(process.cwd(), 'src');
    const fichierDuModule = join(racine, 'lib/clinical/replisAssietteV1.ts');
    const formes = exportsInjectables(fichierDuModule, readFileSync(fichierDuModule, 'utf8'));
    // TÉMOIN DE DÉRIVATION — il ne fait pas la liste, il atteste qu'elle marche.
    expect(formes.map(forme => forme.nom), 'la dérivation des fonctions injectables a échoué')
      .toEqual(expect.arrayContaining([
        'replisAssietteSignes', 'replisServables', 'decidePlateSubstitution', 'replisPourProtocole',
      ]));
    const fichiers = fichiersDeProduction(racine)
      // Le module lui-même est écarté : ses DÉCLARATIONS ne sont pas des appels.
      .filter(chemin => chemin !== fichierDuModule)
      .map(chemin => ({ chemin: relative(racine, chemin), source: readFileSync(chemin, 'utf8') }));
    const vus = fichiers.reduce(
      (total, fichier) => total + nombreDAppels(formes, fichier.chemin, fichier.source), 0);
    expect(vus, 'aucun appel de production retrouvé — la garde serait vacante')
      .toBeGreaterThan(0);
    const fautifs = appelsFautifs(formes, fichiers);
    expect(fautifs, 'ces appelants de production injectent une table ou une signature')
      .toEqual([]);
  });

  it('LES SIX ÉVASIONS QUE LES RÉDACTIONS LEXICALES MANQUAIENT, une à une', () => {
    // POURQUOI CE CAS EXISTE. Cette garde a été écrite QUATRE fois, et la
    // contre-revue a trouvé un défaut réel dans chacune des trois premières —
    // toujours un raté SILENCIEUX, toujours découvert par une mutation jouée
    // une fois puis perdue. Les évasions deviennent donc des CAS : elles vivent
    // ici, en mémoire, et une cinquième rédaction devra les passer toutes.
    //
    // Les sources ci-dessous ne sont pas déposées au dépôt : l'analyse prend
    // son texte en paramètre, c'est tout l'intérêt.
    const formes = exportsInjectables(
      join(process.cwd(), 'src/lib/clinical/replisAssietteV1.ts'),
      readFileSync(join(process.cwd(), 'src/lib/clinical/replisAssietteV1.ts'), 'utf8'),
    );
    const IMPORT = "import { replisPourProtocole, decidePlateSubstitution } from '@/lib/clinical/replisAssietteV1';";
    const EVASIONS = [
      {
        nom: 'appel ordinaire, trois arguments',
        source: IMPORT + '\nexport const a = () => replisPourProtocole(actions, meta, table);',
        fautif: true,
      },
      {
        nom: 'une parenthèse DANS UNE CHAÎNE du premier argument',
        // Elle refermait l'appel trop tôt pour le compteur de parenthèses : la
        // tranche retenue n'avait plus qu'un argument, et l'override devenait
        // invisible.
        source: IMPORT + "\nexport const b = () => replisPourProtocole(sansSuffixe(actions, ')'), meta, table);",
        fautif: true,
      },
      {
        nom: 'une parenthèse dans une EXPRESSION RÉGULIÈRE du premier argument',
        // Celle-ci échappait aux DEUX rédactions lexicales — le retrait de la
        // prose ne connaissait pas les littéraux d'expression régulière.
        source: IMPORT + '\nexport const c = () => replisPourProtocole(actions.filter(x => /\\)$/.test(x.k)), meta, table);',
        fautif: true,
      },
      {
        nom: 'un IMPORT RENOMMÉ — déclaré hors de portée par les rédactions lexicales',
        source: "import { replisPourProtocole as projeter } from '@/lib/clinical/replisAssietteV1';"
          + '\nexport const d = () => projeter(actions, meta, table);',
        fautif: true,
      },
      {
        nom: 'un ÉTALEMENT sous une assertion de type',
        // `{ ...x } as never` n'est pas un littéral d'objet pour l'arbre : sans
        // dépouiller l'enrobage, l'étalement repassait au travers.
        source: IMPORT + '\nexport const e = () => decidePlateSubstitution({ ...fabrique } as never);',
        fautif: true,
      },
      {
        nom: 'une clé d’injection, avec une parenthèse dans un texte clinique',
        source: IMPORT + '\nexport const f = () => decidePlateSubstitution({\n'
          + "  source, indication: 'sommeil (phase)', justification: 'motif ) fabriqué',\n"
          + '  signature: meta, lignes: table,\n});',
        fautif: true,
      },
      {
        nom: 'CONFORME — prose citant l’ancienne forme, apostrophe en guillemets doubles, JSX',
        // Le faux POSITIF que les rédactions lexicales risquaient. L'arbre ne
        // confond pas une phrase avec un appel.
        source: IMPORT
          + '\n// autrefois on écrivait replisPourProtocole(actions, signature, lignes).'
          + "\nconst H = 'replisPourProtocole(actions, signature, lignes)';"
          + '\nconst R = "Réserve d\'adaptation : replisPourProtocole(a, b, c)";'
          + '\nexport const g = () => replisPourProtocole(actions);',
        fautif: false,
      },
    ] as const;

    for (const evasion of EVASIONS) {
      const fautifs = appelsFautifs(formes, [{ chemin: 'temoin.tsx', source: evasion.source }]);
      // ANTI-VACUITÉ, CAS PAR CAS : un témoin dont l'appel ne serait pas même VU
      // passerait pour conforme. On exige donc que l'appel soit trouvé.
      expect(nombreDAppels(formes, 'temoin.tsx', evasion.source), evasion.nom + ' : appel non vu')
        .toBe(1);
      expect(fautifs.length, evasion.nom).toBe(evasion.fautif ? 1 : 0);
    }
  });
});
