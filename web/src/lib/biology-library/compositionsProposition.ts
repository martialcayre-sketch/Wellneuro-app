// Les compositions SIGNÉES dans la proposition de bilan (F80, D-323 §2-§4) —
// module PUR. Le panneau du cockpit l'importe en valeur : il n'importe que des
// TYPES de `statuts.ts`, qui tirerait sinon la table d'orientation dans le
// paquet du navigateur (`bundleClient.guard.test.ts`), et la seule valeur de
// `remboursable.ts`, pur lui aussi.
//
// Ce que ce module fait, et rien d'autre :
//  - D-326 §1 : un constituant d'un groupe signé est coté par l'acte du
//    groupe, sans ligne NABM écrite pour lui ;
//  - §4 : le remboursement d'un calculé ou d'un regroupement, hérité de ses
//    mesures (la règle est écrite dans `remboursable.ts` ; ici, l'appel) ;
//  - §2 : un groupe (ou un regroupement) que le bilan propose fait UNE ligne,
//    ses constituants dessous ; un constituant que le même bilan propose
//    aussi se range sous lui ;
//  - §3 : un constituant proposé seul qui n'est remboursable qu'accompagné
//    est remplacé par son groupe signé, « demandée pour » lui ;
//  - le texte de ces lignes, écrit une fois pour le courrier, le document
//    patient et l'écran.
//
// Sans composition signée, tout est rendu tel quel : la proposition reste
// celle d'aujourd'hui (D-323 §1, banc de contre-épreuve).
import type { TypeComposition } from './compositionsPreparees';
import { deriverRemboursementParMesures, type Remboursement } from './remboursable';
import type { LigneAnalyteProposition } from './statuts';

/** Une composition signée ACTIVE, telle que la proposition la lit. */
export type CompositionSignee = {
  analyteCode: string;
  /** Libellé de l'analyte composé — la ligne qu'il fait quand il remplace. */
  libelle: string;
  type: TypeComposition;
  /**
   * Dans l'ordre de la signature. `actif` : le composant est encore au
   * catalogue ; retiré depuis, il n'est plus cité, et une mesure retirée ne
   * compte jamais comme remboursée (DC-25).
   */
  composants: ReadonlyArray<{ code: string; libelle: string; actif: boolean }>;
};

const REMBOURSEMENT_NON_EVALUE: Remboursement = {
  statut: 'non_evalue',
  conditions: [],
  codesActesRetenus: [],
};

function contient(composition: CompositionSignee, code: string): boolean {
  return composition.composants.some(c => c.code === code);
}

/**
 * Le groupe signé (type `groupe`, coté par un acte) qui porte un constituant :
 * parmi les groupes éligibles, le plus petit, puis le premier par code —
 * sodium, potassium et chlore vont au 1609 plutôt qu'au 1610 (D-323 §3). Un
 * regroupement n'a pas d'acte : il ne porte personne.
 */
export function groupePourConstituant(
  code: string,
  compositions: ReadonlyMap<string, CompositionSignee>,
  eligible: (groupe: CompositionSignee) => boolean = () => true,
): CompositionSignee | null {
  let retenu: CompositionSignee | null = null;
  for (const composition of compositions.values()) {
    if (composition.type !== 'groupe' || !contient(composition, code) || !eligible(composition)) continue;
    if (
      retenu === null
      || composition.composants.length < retenu.composants.length
      || (composition.composants.length === retenu.composants.length
        && composition.analyteCode < retenu.analyteCode)
    ) {
      retenu = composition;
    }
  }
  return retenu;
}

const union = <T>(a: readonly T[], b: readonly T[]): T[] => [...new Set([...a, ...b])];

/**
 * [[D-326]] §1 : un constituant d'un groupe signé est coté par l'acte du
 * groupe. La composition signée dit qu'il en fait partie, la correspondance
 * signée du groupe dit l'acte : le constituant est « remboursable seulement
 * accompagné » par cet acte, comme s'il portait la correspondance « groupe
 * imposé » — sans qu'aucune ligne NABM ne soit écrite pour lui.
 *
 * Seul hérite ce qui n'a pas été tranché autrement :
 *  - non évalué (ni signature, ni constat valable) : hérite ;
 *  - remboursable seulement accompagné par ses propres signatures : réunit
 *    ses actes à ceux du groupe ;
 *  - remboursable seul : garde son état, le plus fort ;
 *  - hors nomenclature (constat « aucun acte » sur le millésime courant, ou
 *    actes signés tous inactifs) : garde son état — ce qu'on a signé pour lui
 *    ne se recouvre pas.
 * Un groupe dont l'acte n'est ni remboursable ni « si groupé » ne transmet
 * rien ; un regroupement n'a pas d'acte et ne transmet rien ; un composant
 * retiré du catalogue n'hérite pas.
 */
function avecActesDesGroupes(
  remboursements: ReadonlyMap<string, Remboursement>,
  compositions: ReadonlyMap<string, CompositionSignee>,
): Map<string, Remboursement> {
  const resultat = new Map(remboursements);
  const groupes = [...compositions.values()]
    .filter(c => c.type === 'groupe')
    .sort((a, b) => (a.analyteCode < b.analyteCode ? -1 : a.analyteCode > b.analyteCode ? 1 : 0));
  for (const groupe of groupes) {
    const acteDuGroupe = remboursements.get(groupe.analyteCode);
    if (!acteDuGroupe || (acteDuGroupe.statut !== 'remboursable' && acteDuGroupe.statut !== 'remboursable_si_groupe')) {
      continue;
    }
    for (const composant of groupe.composants) {
      if (!composant.actif) continue;
      const propre = remboursements.get(composant.code) ?? REMBOURSEMENT_NON_EVALUE;
      if (propre.statut === 'remboursable' || propre.statut === 'hors_nomenclature') continue;
      const courant = resultat.get(composant.code) ?? REMBOURSEMENT_NON_EVALUE;
      resultat.set(composant.code, {
        statut: 'remboursable_si_groupe',
        conditions: union(courant.conditions, acteDuGroupe.conditions),
        codesActesRetenus: union(courant.codesActesRetenus, acteDuGroupe.codesActesRetenus),
        parGroupes: [...(courant.parGroupes ?? []), { code: groupe.analyteCode, libelle: groupe.libelle }],
      });
    }
  }
  return resultat;
}

/**
 * Les remboursements, une fois les compositions signées lues. D'abord les
 * constituants des groupes, cotés par l'acte du groupe ([[D-326]] §1) ; puis
 * les calculés et les regroupements, dérivés de leurs mesures (D-323 §4). Un
 * groupe garde le sien : il a son acte. Un opérande remboursable seulement
 * accompagné compte par son groupe signé — le plus petit des remboursables,
 * sinon le plus petit ; sans groupe signé, par lui-même. Un opérande retiré du
 * catalogue compte « non évalué » : le taire ferait lire remboursé un calculé
 * dont une mesure manque (DC-25).
 */
export function remboursementsAvecCompositions(
  remboursements: ReadonlyMap<string, Remboursement>,
  compositions: ReadonlyMap<string, CompositionSignee>,
): Map<string, Remboursement> {
  const constituants = avecActesDesGroupes(remboursements, compositions);
  const resultat = new Map(constituants);
  const de = (code: string) => constituants.get(code) ?? REMBOURSEMENT_NON_EVALUE;
  for (const composition of compositions.values()) {
    if (composition.type === 'groupe') continue;
    resultat.set(
      composition.analyteCode,
      deriverRemboursementParMesures(
        composition.composants.map(c => {
          if (!c.actif) return { code: c.code, libelle: c.libelle, remboursement: REMBOURSEMENT_NON_EVALUE, groupe: null };
          const groupe = groupePourConstituant(c.code, compositions, g => de(g.analyteCode).statut === 'remboursable')
            ?? groupePourConstituant(c.code, compositions);
          return {
            code: c.code,
            libelle: c.libelle,
            remboursement: de(c.code),
            groupe: groupe ? de(groupe.analyteCode) : null,
          };
        }),
      ),
    );
  }
  return resultat;
}

type Lecture = {
  compositions: ReadonlyMap<string, CompositionSignee>;
  remboursementDe: (code: string) => Remboursement;
  validationDe: (code: string) => boolean;
};

/**
 * Les analyses d'une ligne de bilan, regroupées par les compositions signées.
 *
 * L'ordre du bilan est gardé : un groupe reste à sa place ; un groupe qui
 * remplace prend celle du premier constituant qu'il range. Les constituants à
 * remplacer qui n'ont qu'un groupe passent les premiers : les bicarbonates ne
 * sont cotés qu'au 1610, et le sodium du même bilan le rejoint alors au lieu
 * d'ouvrir un 1609 de plus (« le groupe que le bilan propose déjà, sinon le
 * plus petit »).
 */
export function regrouperAnalytes(
  analytes: readonly LigneAnalyteProposition[],
  { compositions, remboursementDe, validationDe }: Lecture,
): LigneAnalyteProposition[] {
  if (compositions.size === 0) return [...analytes];

  const codes = new Set(analytes.map(a => a.code));
  const groupeOuRegroupement = (code: string): CompositionSignee | null => {
    const composition = compositions.get(code);
    return composition && composition.type !== 'calcul' ? composition : null;
  };
  // Les groupes que le bilan propose lui-même (§2), dans son ordre.
  const duBilan = analytes.map(a => groupeOuRegroupement(a.code)).filter(c => c !== null);

  // §3 — les groupes ajoutés pour porter un constituant seul. Un groupe ne
  // remplace que s'il est lui-même remboursable : remplacer un constituant par
  // un groupe dont l'acte n'est pas signé ne le rendrait pas remboursé, et
  // rangerait sous un « non évalué » ce qui avait son état (D-323 §7).
  const remboursable = (g: CompositionSignee) => remboursementDe(g.analyteCode).statut === 'remboursable';
  const nombreDeGroupes = (code: string) =>
    [...compositions.values()].filter(c => c.type === 'groupe' && contient(c, code) && remboursable(c)).length;
  const aRemplacer = analytes
    .filter(a => a.remboursement.statut === 'remboursable_si_groupe' && groupeOuRegroupement(a.code) === null)
    .map((a, rang) => ({ a, rang, nombre: nombreDeGroupes(a.code) }))
    .filter(x => x.nombre > 0)
    .sort((x, y) => x.nombre - y.nombre || x.rang - y.rang);
  const ajoutes: CompositionSignee[] = [];
  for (const { a } of aRemplacer) {
    if (duBilan.some(g => contient(g, a.code)) || ajoutes.some(g => contient(g, a.code))) continue;
    const groupe = groupePourConstituant(a.code, compositions, remboursable);
    if (groupe) ajoutes.push(groupe);
  }

  const lignes: LigneAnalyteProposition[] = [];
  const lignesAjoutees = new Map<string, LigneAnalyteProposition>();
  for (const analyte of analytes) {
    const composition = groupeOuRegroupement(analyte.code);
    if (composition) {
      lignes.push(avecConstituants(analyte, composition, validationDe, codes));
      continue;
    }
    // Rangé sous un groupe du bilan : il n'y fait plus de ligne (§2).
    if (duBilan.some(g => contient(g, analyte.code))) continue;
    const groupe = ajoutes.find(g => contient(g, analyte.code));
    if (!groupe) {
      lignes.push(analyte);
      continue;
    }
    let ligne = lignesAjoutees.get(groupe.analyteCode);
    if (!ligne) {
      ligne = {
        ...avecConstituants(
          {
            code: groupe.analyteCode,
            libelle: groupe.libelle,
            validationMedicaleRequise: validationDe(groupe.analyteCode),
            remboursement: remboursementDe(groupe.analyteCode),
          },
          groupe,
          validationDe,
          codes,
        ),
        demandeePour: [],
      };
      lignesAjoutees.set(groupe.analyteCode, ligne);
      lignes.push(ligne);
    }
    // « Demandée pour » : ce que le groupe remplace — pas ce qu'il range de
    // surcroît (un constituant qui a son propre acte, §3).
    if (analyte.remboursement.statut === 'remboursable_si_groupe') {
      ligne.demandeePour!.push({ code: analyte.code, libelle: analyte.libelle });
    }
  }
  return lignes;
}

function avecConstituants(
  analyte: LigneAnalyteProposition,
  composition: CompositionSignee,
  validationDe: (code: string) => boolean,
  codesDuBilan: ReadonlySet<string>,
): LigneAnalyteProposition {
  return {
    ...analyte,
    constituants: composition.composants.filter(c => c.actif).map(c => ({
      code: c.code,
      libelle: c.libelle,
      validationMedicaleRequise: validationDe(c.code),
      proposeParLeBilan: codesDuBilan.has(c.code),
    })),
  };
}

/**
 * Les codes que le BILAN proposait, avant tout regroupement : les analyses de
 * la ligne, moins les groupes ajoutés pour un constituant, plus les
 * constituants rangés sous un groupe. C'est la borne des attentes d'action
 * ([[D-305]] §4) : ranger ou remplacer ne la change pas.
 */
export function codesProposesParLeBilan(analytes: readonly LigneAnalyteProposition[]): string[] {
  const codes: string[] = [];
  for (const analyte of analytes) {
    if (analyte.demandeePour === undefined) codes.push(analyte.code);
    for (const c of analyte.constituants ?? []) if (c.proposeParLeBilan) codes.push(c.code);
  }
  return [...new Set(codes)];
}

/** Le libellé d'un code de la ligne, constituants compris ; `null` s'il n'y figure pas. */
export function libelleDansLesAnalytes(analytes: readonly LigneAnalyteProposition[], code: string): string | null {
  for (const analyte of analytes) {
    if (analyte.code === code) return analyte.libelle;
    const constituant = analyte.constituants?.find(c => c.code === code);
    if (constituant) return constituant.libelle;
  }
  return null;
}

// ── Le texte, écrit une fois ─────────────────────────────────────────────────

/** Une analyse composée : celle qui a des constituants à lister dessous. */
export function estComposee(analyte: LigneAnalyteProposition): boolean {
  return (analyte.constituants?.length ?? 0) > 0;
}

/**
 * Le libellé d'une analyse avec son acte — « Numération formule sanguine
 * (acte 1104) » — quand il est signé et remboursable (D-323 §2). Les autres
 * codes d'acte par ligne restent à F55 ([[D-309]] §1).
 */
export function libelleAvecActe(analyte: LigneAnalyteProposition): string {
  const codes = analyte.remboursement.codesActesRetenus;
  // Un calculé ou un regroupement n'a pas d'acte : ses mesures en ont, et la
  // mention « remboursé par ses mesures » les cite (`mentionsParMesures`).
  const avecActe = (estComposee(analyte) || analyte.demandeePour !== undefined)
    && analyte.remboursement.parMesures === undefined
    && analyte.remboursement.statut === 'remboursable'
    && codes.length > 0;
  return avecActe
    ? `${analyte.libelle} (${codes.length > 1 ? 'actes' : 'acte'} ${codes.join(', ')})`
    : analyte.libelle;
}

/**
 * La phrase d'une analyse composée : son libellé et son acte, ce pour quoi
 * elle est demandée, puis ses constituants. `null` pour une analyse simple,
 * qui reste dans la liste des éléments.
 */
export function phraseAnalyseComposee(
  analyte: LigneAnalyteProposition,
  motConstituants: string,
): string | null {
  if (!estComposee(analyte)) return null;
  const demandee = analyte.demandeePour?.length
    ? `, analyse demandée pour : ${analyte.demandeePour.map(c => c.libelle).join(', ')}`
    : '';
  const constituants = analyte.constituants!.map(c => c.libelle).join(', ');
  return `${libelleAvecActe(analyte)}${demandee} — ${motConstituants} : ${constituants}.`;
}

/**
 * Les analyses dont l'interprétation exige une validation médicale, y compris
 * les constituants rangés sous un groupe : ranger n'efface pas l'exigence.
 */
export function libellesValidationMedicale(analytes: readonly LigneAnalyteProposition[]): string[] {
  const libelles = new Map<string, string>();
  for (const analyte of analytes) {
    if (analyte.validationMedicaleRequise) libelles.set(analyte.code, analyte.libelle);
    for (const c of analyte.constituants ?? []) {
      if (c.validationMedicaleRequise && !libelles.has(c.code)) libelles.set(c.code, c.libelle);
    }
  }
  return [...libelles.values()];
}

/**
 * Le libellé d'une analyse dans la liste « non évalué » : un calculé ou un
 * regroupement nomme la mesure qui manque — c'est elle que le praticien a à
 * signer ([[D-323]] §4).
 */
export function libelleNonEvalue(analyte: LigneAnalyteProposition): string {
  const manquantes = (analyte.remboursement.parMesures ?? []).filter(m => m.statut === 'non_evalue');
  return manquantes.length > 0
    ? `${analyte.libelle} (mesure non évaluée : ${manquantes.map(m => m.libelle).join(', ')})`
    : analyte.libelle;
}

/**
 * « Indice HOMA : remboursé par ses mesures (Glycémie à jeun 0552, Insuline
 * 7422). » — une fois par analyse, pour un calculé ou un regroupement dont
 * toutes les mesures sont remboursables (D-323 §4). Les autres états se
 * disent par les mentions communes.
 */
export function mentionsParMesures(analytes: readonly LigneAnalyteProposition[]): string[] {
  const vues = new Set<string>();
  const mentions: string[] = [];
  for (const analyte of analytes) {
    const mesures = analyte.remboursement.parMesures;
    if (!mesures || analyte.remboursement.statut !== 'remboursable' || vues.has(analyte.code)) continue;
    vues.add(analyte.code);
    const detail = mesures
      .map(m => (m.codesActes.length > 0 ? `${m.libelle} ${m.codesActes.join('/')}` : m.libelle))
      .join(', ');
    mentions.push(`${analyte.libelle} : remboursé par ses mesures (${detail}).`);
  }
  return mentions;
}
