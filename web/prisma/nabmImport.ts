/**
 * CB-02a — logique pure de l'import de la nomenclature NABM.
 *
 * Aucun accès réseau, aucun accès base : ce module transforme des pages FHIR
 * déjà récupérées en lignes prêtes à écrire, et REFUSE tout ce qui ne se
 * mesure pas. Le CLI (`importNabm.ts`) fait les entrées/sorties.
 *
 * Source : Serveur Multi-Terminologies de l'ANS, sous Licence Ouverte v2.
 * L'audit CB-00 en documente le relevé complet ; les trois pièges qu'il a
 * coûtés sont encodés ici plutôt que racontés :
 *
 *  1. `$expand` ne rend les propriétés QUE si on les NOMME une par une. Un
 *     appel nu laisse croire que la nomenclature est vide de facturation.
 *  2. Sur 1050 concepts, 63 ne sont PAS des actes — 18 chapitres,
 *     33 sous-chapitres, 11 nœuds de règle, et la racine « NABM », qui compte
 *     quatre caractères comme un code d'acte sans en être un.
 *  3. Les libellés sont des intitulés de FACTURATION, pas des noms d'analyte.
 *     Rien ici ne tente de les rapprocher d'un analyte : c'est une mise en
 *     correspondance signée par le praticien (CB-02c), jamais un import.
 */
import { createHash } from 'node:crypto';

/** Identifiant de source, aligné sur le CHECK des tables du catalogue. */
export const NABM_SOURCE_PROVENANCE = 'nabm_smt_ans';

export const NABM_VALUESET_URL = 'https://smt.esante.gouv.fr/terminologie-nabm?vs';
export const NABM_EXPAND_ENDPOINT = 'https://smt.esante.gouv.fr/fhir/ValueSet/$expand';

/**
 * LOv2 impose de citer la source ET sa version. La mention est stockée avec le
 * snapshot pour que l'UI puisse l'afficher sans la reconstruire.
 */
export const NABM_LICENCE = 'Licence Ouverte v2.0 (Etalab) — Agence du numérique en santé';

/** 200 par page : 6 appels pour 1050 concepts. */
export const NABM_PAGE_SIZE = 200;

/**
 * Les propriétés à nommer dans `$expand`. Retirer une ligne d'ici ne provoque
 * aucune erreur : la colonne correspondante devient simplement vide sur les
 * 987 actes. C'est le mode de panne silencieuse de cet import — d'où le
 * contrôle de couverture dans `construireImport`.
 */
export const NABM_PROPRIETES = [
  'coeffB',
  'examenSanguin',
  'ententePrealable',
  'indicationMedicale',
  'nombreMaximumParFacturation',
  // Faute d'orthographe DE LA SOURCE (« initative »), reprise telle quelle :
  // la corriger ici ferait silencieusement rendre NULL par le serveur.
  'initativeBiologistePossible',
  'rmo',
  'remboursementTotal',
  'acteReserve',
  'codeIncompatible',
  'regleApplicable',
  'parent',
  'inactive',
] as const;

/**
 * Propriétés attendues sur CHAQUE acte. Mesuré le 2026-07-26 sur la V105 :
 * couverture 987/987 pour ces dix. Les trois autres sont partielles par
 * nature — `nombreMaximumParFacturation` 821/987, `codeIncompatible` 438/987,
 * `regleApplicable` 25/987 — et ne peuvent donc pas être exigées.
 */
export const NABM_PROPRIETES_UNIVERSELLES = [
  'coeffB',
  'examenSanguin',
  'ententePrealable',
  'indicationMedicale',
  'initativeBiologistePossible',
  'rmo',
  'remboursementTotal',
  'acteReserve',
  'parent',
  'inactive',
] as const;

/**
 * Plancher de volumétrie. La V105 rend 987 actes ; les versions se succèdent
 * mensuellement et font varier ce nombre à la marge. Ce plancher n'est pas une
 * prédiction : il refuse qu'un import déplace le pointeur de version vers un
 * catalogue MUTILÉ — changement d'API, page perdue, ValueSet renommé. Sans
 * lui, un catalogue réduit à quelques actes deviendrait le catalogue courant
 * et ferait basculer en « hors nomenclature » tout ce qui en dépend.
 * Contournable par `--allow-shrink`, qui doit rester un geste motivé.
 */
export const NABM_PLANCHER_ACTES = 800;

// Le MILLÉSIME fait partie du jeton, délibérément. Sans lui, une variable
// d'armement oubliée dans Vercel resterait valide après une PR qui change le
// millésime épinglé : l'import repartirait sur la seule autorité de cette PR,
// alors que le modèle annonce deux clés indépendantes. Avec lui, la variable
// cesse de correspondre et le build échoue avant le moindre appel réseau.
export const NABM_IMPORT_CONFIRMATION = 'CB-02A-IMPORT-NABM-V105-MC-2026-07-26-v1';

const URL_EXTENSION_PROPRIETE =
  'http://hl7.org/fhir/5.0/StructureDefinition/extension-ValueSet.expansion.contains.property';

/** Valeur scalaire d'une propriété FHIR, tous types `value[x]` confondus. */
export type ValeurPropriete = string | number | boolean;

export interface ConceptFhir {
  code?: string;
  display?: string;
  extension?: Array<{
    url?: string;
    extension?: Array<{ url?: string; [cle: string]: unknown }>;
  }>;
}

export interface PageExpand {
  version?: string;
  expansion?: {
    total?: number;
    offset?: number;
    contains?: ConceptFhir[];
  };
}

/** Un concept normalisé : ce que la source dit, sans interprétation. */
export interface ConceptNormalise {
  code: string;
  libelle: string;
  /** Propriétés, toujours sous forme de liste — 201 actes en ont plusieurs. */
  proprietes: Record<string, ValeurPropriete[]>;
}

/** Une ligne prête pour `biology_nabm_actes`. */
export interface ActeNabm {
  codeActe: string;
  libelle: string;
  coefficientB: number | null;
  codeParent: string | null;
  ententePrealable: boolean | null;
  examenSanguin: boolean | null;
  indicationMedicale: boolean | null;
  nombreMaxParFacturation: number | null;
  initiativeBiologistePossible: boolean | null;
  rmo: boolean | null;
  remboursementTotal: boolean | null;
  acteReserve: boolean | null;
  inactif: boolean;
  /** NULL et jamais `[]` : le CHECK en base interdit le tableau vide. */
  codeIncompatible: string[] | null;
  regleApplicable: string[] | null;
}

export interface RapportImportNabm {
  versionSource: string;
  nombreConcepts: number;
  nombreActes: number;
  nonActes: { chapitres: number; sousChapitres: number; noeudsRegle: number; racine: number };
  couverture: Record<string, number>;
  actesInactifs: number;
  incompatibilites: { occurrences: number; actesConcernes: number; maxParActe: number };
  /**
   * Paires d'incompatibilité déclarées d'un seul côté. La V105 n'en a AUCUNE.
   * Signalé, jamais bloquant : c'est un défaut de la source, et faire échouer
   * l'import y répondrait en privant le catalogue de tout le millésime.
   */
  incompatibilitesAsymetriques: number;
  contenuSha256: string;
  tailleSnapshotOctets: number;
}

export interface ImportNabm {
  actes: ActeNabm[];
  /** JSON canonique — c'est CE texte qui est haché et stocké. */
  snapshot: string;
  rapport: RapportImportNabm;
}

/** Un code d'acte : quatre chiffres, zéros de tête signifiants. */
export function estCodeActe(code: string): boolean {
  return /^[0-9]{4}$/.test(code);
}

/**
 * Aplatit les extensions FHIR R5 d'un concept en dictionnaire de listes.
 * Toujours des listes : `codeIncompatible` est multi-valué sur 201 actes, et
 * un scalaire silencieusement écrasé par le dernier serait une perte muette.
 */
export function extraireProprietes(concept: ConceptFhir): Record<string, ValeurPropriete[]> {
  const sortie: Record<string, ValeurPropriete[]> = {};
  for (const extension of concept.extension ?? []) {
    if (extension.url !== URL_EXTENSION_PROPRIETE) continue;
    const parties = extension.extension ?? [];
    const code = parties.find(p => p.url === 'code')?.valueCode;
    const porteur = parties.find(p => p.url === 'value');
    if (typeof code !== 'string' || !porteur) continue;

    const valeur = ['valueBoolean', 'valueString', 'valueCode', 'valueInteger', 'valueDecimal']
      .map(cle => porteur[cle])
      .find(v => v !== undefined);
    if (valeur === undefined) continue;

    (sortie[code] ??= []).push(valeur as ValeurPropriete);
  }
  return sortie;
}

function scalaire(
  proprietes: Record<string, ValeurPropriete[]>,
  nom: string,
  code: string,
): ValeurPropriete | undefined {
  const valeurs = proprietes[nom];
  if (valeurs === undefined) return undefined;
  if (valeurs.length > 1) {
    throw new Error(
      `Acte ${code} : propriété ${nom} multi-valuée (${valeurs.length}) alors qu'un scalaire est attendu`,
    );
  }
  return valeurs[0];
}

function booleen(
  proprietes: Record<string, ValeurPropriete[]>,
  nom: string,
  code: string,
): boolean | null {
  const valeur = scalaire(proprietes, nom, code);
  if (valeur === undefined) return null;
  if (typeof valeur !== 'boolean') {
    throw new Error(`Acte ${code} : propriété ${nom} attendue booléenne, reçue ${typeof valeur}`);
  }
  return valeur;
}

/**
 * La source publie `coeffB` en CHAÎNE (`valueString`). La colonne est en
 * INTEGER parce que les 987 actes de la V105 sont tous des entiers ≥ 0
 * (maximum mesuré : 8120). Une valeur non entière doit donc faire ÉCHOUER
 * l'import bruyamment, jamais être arrondie — un coefficient arrondi est un
 * chiffre de facturation faux.
 */
function entier(
  proprietes: Record<string, ValeurPropriete[]>,
  nom: string,
  code: string,
): number | null {
  const valeur = scalaire(proprietes, nom, code);
  if (valeur === undefined) return null;
  const texte = String(valeur);
  if (!/^[0-9]+$/.test(texte)) {
    throw new Error(
      `Acte ${code} : propriété ${nom} attendue entière positive, reçue « ${texte} » — ` +
        'la colonne est en INTEGER ; corriger le schéma plutôt que d\'arrondir',
    );
  }
  const nombre = Number(texte);
  if (!Number.isSafeInteger(nombre)) {
    throw new Error(`Acte ${code} : propriété ${nom} hors des entiers sûrs (« ${texte} »)`);
  }
  return nombre;
}

function texteOuNull(
  proprietes: Record<string, ValeurPropriete[]>,
  nom: string,
  code: string,
): string | null {
  const valeur = scalaire(proprietes, nom, code);
  return valeur === undefined ? null : String(valeur);
}

/**
 * Liste de codes, ou NULL quand la propriété est absente. Jamais `[]` : le
 * CHECK `biology_nabm_actes_code_incompatible_check` interdit le tableau vide
 * pour n'avoir qu'une seule écriture de « aucune incompatibilité ».
 */
function liste(
  proprietes: Record<string, ValeurPropriete[]>,
  nom: string,
): string[] | null {
  const valeurs = proprietes[nom];
  if (valeurs === undefined || valeurs.length === 0) return null;
  return valeurs.map(String);
}

/**
 * Sérialisation CANONIQUE du snapshot — et le mot compte.
 *
 * Ce n'est pas la réponse HTTP octet pour octet : concepts triés par code,
 * clés de propriétés triées, valeurs de listes triées. C'est délibéré. Le
 * serveur ne garantit aucun ordre stable, si bien qu'un hachage des octets
 * bruts changerait d'un appel à l'autre pour un MÊME millésime — et
 * l'invariant « même version, autre empreinte ⇒ refus » se déclencherait à
 * chaque rejeu au lieu de signaler une source qui a bougé.
 *
 * Ce qui est conservé, en revanche, l'est INTÉGRALEMENT : les 1050 concepts,
 * pas les 987 actes. Les chapitres et sous-chapitres — « 05 Hématologie » —
 * n'ont pas de table dédiée dans le catalogue ; le snapshot est le seul
 * endroit où leurs libellés survivent, et il évite de retélécharger un
 * millésime que la source aura remplacé.
 */
export function serialiserCanonique(
  versionSource: string,
  concepts: ConceptNormalise[],
): string {
  const tries = [...concepts].sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));
  return JSON.stringify({
    source: NABM_SOURCE_PROVENANCE,
    url: NABM_VALUESET_URL,
    licence: NABM_LICENCE,
    version: versionSource,
    concepts: tries.map(concept => ({
      code: concept.code,
      libelle: concept.libelle,
      proprietes: Object.fromEntries(
        Object.keys(concept.proprietes)
          .sort()
          .map(cle => [cle, [...concept.proprietes[cle]].map(String).sort()]),
      ),
    })),
  });
}

/**
 * Empreinte du snapshot. C'est exactement `encode(sha256(convert_to(contenu,
 * 'UTF8')), 'hex')` en SQL : le CHECK
 * `biology_source_snapshots_sha256_verifie_check` recalcule la même valeur à
 * chaque écriture. Une divergence entre ces deux implémentations rendrait
 * l'insertion impossible — c'est voulu, l'empreinte ne doit pas pouvoir être
 * simplement déclarée.
 */
export function empreinteSnapshot(snapshot: string): string {
  return createHash('sha256').update(Buffer.from(snapshot, 'utf8')).digest('hex');
}

/**
 * Assemble les pages en un import vérifié. Lève à la moindre incohérence :
 * un catalogue à demi importé est pire qu'un catalogue absent, parce qu'il
 * devient le catalogue COURANT et fait dire « hors nomenclature » de tout ce
 * qu'il a perdu.
 */
export function construireImport(
  pages: PageExpand[],
  options: { versionAttendue?: string; autoriserReduction?: boolean } = {},
): ImportNabm {
  if (pages.length === 0) throw new Error('Aucune page reçue de la source');

  const versions = new Set(pages.map(p => p.version).filter(v => typeof v === 'string'));
  if (versions.size !== 1) {
    throw new Error(
      `Millésime incohérent entre les pages : ${[...versions].join(', ') || '(aucun)'} — ` +
        'la nomenclature a changé PENDANT la pagination, l\'import serait un mélange',
    );
  }
  const versionSource = [...versions][0] as string;
  if (options.versionAttendue && options.versionAttendue !== versionSource) {
    throw new Error(
      `Millésime ${versionSource} reçu, ${options.versionAttendue} attendu`,
    );
  }

  const totaux = new Set(pages.map(p => p.expansion?.total).filter(t => typeof t === 'number'));
  if (totaux.size !== 1) {
    throw new Error(`Total annoncé incohérent entre les pages : ${[...totaux].join(', ')}`);
  }
  const totalAnnonce = [...totaux][0] as number;

  const concepts: ConceptNormalise[] = [];
  for (const page of pages) {
    for (const brut of page.expansion?.contains ?? []) {
      if (typeof brut.code !== 'string' || brut.code.length === 0) {
        throw new Error('Concept sans code dans la réponse de la source');
      }
      const libelle = (brut.display ?? '').trim();
      if (libelle.length === 0) {
        throw new Error(`Concept ${brut.code} sans libellé`);
      }
      concepts.push({ code: brut.code, libelle, proprietes: extraireProprietes(brut) });
    }
  }

  // Le contrôle qui rattrape une page perdue. Sans lui, cinq pages sur six
  // produiraient un catalogue plausible — et le pointeur de version le
  // servirait comme s'il était complet.
  if (concepts.length !== totalAnnonce) {
    throw new Error(
      `${concepts.length} concepts reçus pour ${totalAnnonce} annoncés — pagination incomplète`,
    );
  }

  const codesVus = new Set<string>();
  for (const concept of concepts) {
    if (codesVus.has(concept.code)) {
      throw new Error(`Concept ${concept.code} reçu deux fois — pagination qui se recouvre`);
    }
    codesVus.add(concept.code);
  }

  const conceptsActes = concepts.filter(c => estCodeActe(c.code));
  if (conceptsActes.length < NABM_PLANCHER_ACTES && !options.autoriserReduction) {
    throw new Error(
      `${conceptsActes.length} actes seulement (plancher ${NABM_PLANCHER_ACTES}) — ` +
        'source tronquée ou ValueSet renommé. Forcer avec --allow-shrink si la ' +
        'réduction est réelle et voulue.',
    );
  }

  const actes: ActeNabm[] = conceptsActes.map(concept => {
    const p = concept.proprietes;
    const code = concept.code;
    const incompatibles = liste(p, 'codeIncompatible');
    if (incompatibles?.includes(code)) {
      throw new Error(`Acte ${code} déclaré incompatible avec lui-même`);
    }
    for (const cible of incompatibles ?? []) {
      if (!estCodeActe(cible)) {
        throw new Error(`Acte ${code} : incompatibilité « ${cible} » qui n'est pas un code d'acte`);
      }
    }
    const regles = liste(p, 'regleApplicable');
    for (const regle of regles ?? []) {
      if (!/^[A-Z][A-Z0-9_]*$/.test(regle)) {
        throw new Error(`Acte ${code} : règle applicable « ${regle} » hors forme attendue`);
      }
    }

    const nombreMax = entier(p, 'nombreMaximumParFacturation', code);
    if (nombreMax !== null && nombreMax < 1) {
      throw new Error(`Acte ${code} : nombre maximum par facturation à ${nombreMax}`);
    }

    return {
      codeActe: code,
      libelle: concept.libelle,
      coefficientB: entier(p, 'coeffB', code),
      codeParent: texteOuNull(p, 'parent', code),
      ententePrealable: booleen(p, 'ententePrealable', code),
      examenSanguin: booleen(p, 'examenSanguin', code),
      indicationMedicale: booleen(p, 'indicationMedicale', code),
      nombreMaxParFacturation: nombreMax,
      initiativeBiologistePossible: booleen(p, 'initativeBiologistePossible', code),
      rmo: booleen(p, 'rmo', code),
      remboursementTotal: booleen(p, 'remboursementTotal', code),
      acteReserve: booleen(p, 'acteReserve', code),
      inactif: booleen(p, 'inactive', code) ?? false,
      codeIncompatible: incompatibles,
      regleApplicable: regles,
    };
  });

  // Toute incompatibilité doit désigner un acte du même millésime : le CHECK
  // garantit la forme, pas l'existence — Postgres n'accepte pas de clé
  // étrangère depuis un tableau.
  const codesActes = new Set(actes.map(a => a.codeActe));
  for (const acte of actes) {
    for (const cible of acte.codeIncompatible ?? []) {
      if (!codesActes.has(cible)) {
        throw new Error(
          `Acte ${acte.codeActe} : incompatibilité vers ${cible}, absent du millésime`,
        );
      }
    }
  }

  // Une propriété qu'on a cessé de demander devient NULL sur tous les actes
  // sans qu'aucune erreur ne le dise. Ce contrôle transforme cette panne
  // silencieuse en refus.
  const couverture: Record<string, number> = {};
  for (const nom of NABM_PROPRIETES) {
    couverture[nom] = conceptsActes.filter(c => c.proprietes[nom] !== undefined).length;
  }
  for (const nom of NABM_PROPRIETES_UNIVERSELLES) {
    if (couverture[nom] !== actes.length) {
      throw new Error(
        `Propriété ${nom} présente sur ${couverture[nom]}/${actes.length} actes alors ` +
          'qu\'elle est universelle — a-t-elle été retirée de NABM_PROPRIETES ?',
      );
    }
  }

  const parCode = new Map(actes.map(a => [a.codeActe, new Set(a.codeIncompatible ?? [])]));
  let asymetriques = 0;
  for (const [code, cibles] of parCode) {
    for (const cible of cibles) {
      if (!parCode.get(cible)?.has(code)) asymetriques += 1;
    }
  }

  const nonActes = concepts.filter(c => !estCodeActe(c.code));
  const snapshot = serialiserCanonique(versionSource, concepts);

  return {
    actes,
    snapshot,
    rapport: {
      versionSource,
      nombreConcepts: concepts.length,
      nombreActes: actes.length,
      nonActes: {
        chapitres: nonActes.filter(c => /^[0-9]{1,2}$/.test(c.code)).length,
        sousChapitres: nonActes.filter(c => /^[0-9]{2}-[0-9]{2}$/.test(c.code)).length,
        noeudsRegle: nonActes.filter(c => /^[A-Z][A-Z0-9_]*$/.test(c.code) && c.code !== 'NABM')
          .length,
        racine: nonActes.filter(c => c.code === 'NABM').length,
      },
      couverture,
      actesInactifs: actes.filter(a => a.inactif).length,
      incompatibilites: {
        occurrences: actes.reduce((n, a) => n + (a.codeIncompatible?.length ?? 0), 0),
        actesConcernes: actes.filter(a => a.codeIncompatible !== null).length,
        maxParActe: actes.reduce((n, a) => Math.max(n, a.codeIncompatible?.length ?? 0), 0),
      },
      incompatibilitesAsymetriques: asymetriques,
      contenuSha256: empreinteSnapshot(snapshot),
      tailleSnapshotOctets: Buffer.byteLength(snapshot, 'utf8'),
    },
  };
}
