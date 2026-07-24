import { createHash } from 'node:crypto';
import {
  SUPPLEMENTS_MAX_BATCH_SIZE,
  SUPPLEMENTS_NIVEAUX_COMPLETUDE,
  SUPPLEMENTS_PROVENANCES,
  SUPPLEMENTS_UNITES,
  type SupplementNiveauCompletude,
  type SupplementProvenance,
  type SupplementUnite,
} from '@/lib/supplement-library/config';

// Validation stricte du payload d'ingestion, dans le style du dépôt (Zod est
// absent — cf. web/src/lib/rag/validation.ts). Aucune donnée patient : le
// catalogue est un référentiel documentaire.

export type SupplementCompositionInput = {
  // FK vers supplement_ingredients — la résolution nominatif → pivot clinique
  // se fait EN AMONT (LOT-03) ; la voie d'ingestion reçoit des ingredientId
  // déjà résolus. Une fiche sans composition résolue s'importe sans ligne de
  // composition (brouillon, résolution différée).
  ingredientId: string;
  // FK vers supplement_ingredient_formes (optionnelle).
  formeId?: string;
  // Dose et unité vont ensemble (CHECK dose_unite) : les deux ou aucune.
  doseParPortion?: number;
  unite?: SupplementUnite;
  position?: number;
};

export type SupplementFicheInput = {
  nomCommercial: string;
  marque: string;
  marche: string;
  sourceProvenance: SupplementProvenance;
  sourceIdentifiant: string;
  sourceUrl?: string;
  niveauCompletude: SupplementNiveauCompletude;
  donneesManquantes: string[];
  incertitudes?: string;
  labels: string[];
  allergenes: string[];
  excipients: string[];
  compositions: SupplementCompositionInput[];
  // Empreinte déterministe (attributs sourcés + composition + doses), calculée
  // ici par le serveur — jamais fournie par le client. C'est elle qui rend le
  // ré-import idempotent (même contenu → no-op).
  contenuSha256: string;
};

export type SupplementIngestPayload = {
  fiches: SupplementFicheInput[];
};

const PROVENANCES = new Set<string>(SUPPLEMENTS_PROVENANCES);
const NIVEAUX = new Set<string>(SUPPLEMENTS_NIVEAUX_COMPLETUDE);
const UNITES = new Set<string>(SUPPLEMENTS_UNITES);

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} doit être un objet.`);
  }
  return value as Record<string, unknown>;
}

function requiredString(record: Record<string, unknown>, key: string, label: string): string {
  const value = record[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label}.${key} est requis.`);
  }
  return value.trim();
}

function optionalString(record: Record<string, unknown>, key: string, label: string): string | undefined {
  const value = record[key];
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new Error(`${label}.${key} doit être une chaîne.`);
  return value.trim() || undefined;
}

function stringArray(record: Record<string, unknown>, key: string, label: string): string[] {
  const value = record[key];
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
    throw new Error(`${label}.${key} doit être une liste de chaînes.`);
  }
  return (value as string[]).map((v) => v.trim()).filter(Boolean);
}

function optionalFiniteNumber(record: Record<string, unknown>, key: string, label: string): number | undefined {
  const value = record[key];
  if (value === undefined || value === null || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) throw new Error(`${label}.${key} doit être un nombre.`);
  return n;
}

function parseComposition(value: unknown, ficheLabel: string, index: number): SupplementCompositionInput {
  const label = `${ficheLabel}.compositions[${index}]`;
  const record = asRecord(value, label);
  const ingredientId = requiredString(record, 'ingredientId', label);
  const formeId = optionalString(record, 'formeId', label);
  const dose = optionalFiniteNumber(record, 'doseParPortion', label);
  const unite = optionalString(record, 'unite', label);
  const positionRaw = optionalFiniteNumber(record, 'position', label);
  const position = positionRaw === undefined ? index : Math.trunc(positionRaw);

  // CHECK dose_unite : dose et unité renseignées ensemble, ou pas du tout.
  if ((dose === undefined) !== (unite === undefined)) {
    throw new Error(
      `${label} : dose et unité vont ensemble — jamais un nombre nu ni une unité orpheline.`,
    );
  }
  // CHECK unite : vocabulaire canonique fermé.
  if (unite !== undefined && !UNITES.has(unite)) {
    throw new Error(
      `${label}.unite « ${unite} » hors vocabulaire ${SUPPLEMENTS_UNITES.join(', ')}.`,
    );
  }

  return {
    ingredientId,
    formeId,
    doseParPortion: dose,
    unite: unite as SupplementUnite | undefined,
    position,
  };
}

function parseFiche(value: unknown, index: number): SupplementFicheInput {
  const label = `fiches[${index}]`;
  const record = asRecord(value, label);

  const nomCommercial = requiredString(record, 'nomCommercial', label);
  const marque = requiredString(record, 'marque', label);
  const marche = optionalString(record, 'marche', label) ?? 'FR';
  const sourceProvenance = requiredString(record, 'sourceProvenance', label);
  const sourceIdentifiant = requiredString(record, 'sourceIdentifiant', label);
  const sourceUrl = optionalString(record, 'sourceUrl', label);
  const niveauCompletude = requiredString(record, 'niveauCompletude', label);
  const incertitudes = optionalString(record, 'incertitudes', label);
  const donneesManquantes = stringArray(record, 'donneesManquantes', label);
  const labels = stringArray(record, 'labels', label);
  const allergenes = stringArray(record, 'allergenes', label);
  const excipients = stringArray(record, 'excipients', label);

  if (!PROVENANCES.has(sourceProvenance)) {
    throw new Error(
      `${label}.sourceProvenance « ${sourceProvenance} » hors vocabulaire ${SUPPLEMENTS_PROVENANCES.join(', ')}.`,
    );
  }
  if (!NIVEAUX.has(niveauCompletude)) {
    throw new Error(
      `${label}.niveauCompletude « ${niveauCompletude} » hors vocabulaire ${SUPPLEMENTS_NIVEAUX_COMPLETUDE.join(', ')}.`,
    );
  }

  const compositionsRaw = record.compositions;
  if (compositionsRaw !== undefined && compositionsRaw !== null && !Array.isArray(compositionsRaw)) {
    throw new Error(`${label}.compositions doit être une liste.`);
  }
  const compositions = Array.isArray(compositionsRaw)
    ? compositionsRaw.map((c, i) => parseComposition(c, label, i))
    : [];

  // Unicité (ingredientId, formeId) dans la fiche : la base la garantit (index
  // unique + index partiel forme NULL) ; on rejette tôt et clairement.
  const clefs = new Set<string>();
  for (const c of compositions) {
    const clef = `${c.ingredientId}::${c.formeId ?? ''}`;
    if (clefs.has(clef)) {
      throw new Error(
        `${label} : composition en double pour l'ingrédient ${c.ingredientId}${c.formeId ? ` / forme ${c.formeId}` : ''}.`,
      );
    }
    clefs.add(clef);
  }

  const fiche: Omit<SupplementFicheInput, 'contenuSha256'> = {
    nomCommercial,
    marque,
    marche,
    sourceProvenance: sourceProvenance as SupplementProvenance,
    sourceIdentifiant,
    sourceUrl,
    niveauCompletude: niveauCompletude as SupplementNiveauCompletude,
    donneesManquantes,
    incertitudes,
    labels,
    allergenes,
    excipients,
    compositions,
  };

  return { ...fiche, contenuSha256: contenuSha256ForFiche(fiche) };
}

export function parseSupplementIngestPayload(value: unknown): SupplementIngestPayload {
  const record = asRecord(value, 'payload');
  if (!Array.isArray(record.fiches) || record.fiches.length === 0) {
    throw new Error('fiches doit être une liste non vide.');
  }
  if (record.fiches.length > SUPPLEMENTS_MAX_BATCH_SIZE) {
    throw new Error(
      `Un lot d'ingestion ne peut pas dépasser ${SUPPLEMENTS_MAX_BATCH_SIZE} fiches.`,
    );
  }

  const fiches = record.fiches.map(parseFiche);

  // (provenance, identifiant) unique dans une même requête : deux versions du
  // même produit source dans un seul lot rendraient l'ordre d'écriture — donc
  // la version courante — non déterministe.
  const identites = new Set<string>();
  for (const fiche of fiches) {
    const clef = `${fiche.sourceProvenance}::${fiche.sourceIdentifiant}`;
    if (identites.has(clef)) {
      throw new Error(`Produit source dupliqué dans la requête : ${clef}.`);
    }
    identites.add(clef);
  }

  return { fiches };
}

// ---------------------------------------------------------------------------
// Empreinte déterministe de formulation.
//
// Porte sur les attributs SOURCÉS et la composition (ingrédient, forme, dose,
// unité, position) — jamais sur les champs de cycle de vie (statut, version,
// signataire, dates, actif). Deux imports du même contenu produisent le même
// hash quel que soit l'ordre des composants → ré-import idempotent.
// Même format que rag_corpus_claims.content_sha256 (64 hex, CHECK en base).
// ---------------------------------------------------------------------------
function canonicalise(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalise);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = canonicalise((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

export function contenuSha256ForFiche(fiche: Omit<SupplementFicheInput, 'contenuSha256'>): string {
  // `position` est EXCLUE de l'empreinte : c'est un ordre d'affichage, pas une
  // donnée d'identité de formulation. L'identité est l'ensemble (ingrédient,
  // forme, dose, unité). Sans cette exclusion, deux payloads aux mêmes
  // composants dans un ordre de tableau inversé et SANS position explicite
  // (parseComposition assigne alors position = index) produiraient des
  // positions différentes → hash différent → fausse « nouvelle version »
  // (revue #352, R1).
  const composition = [...fiche.compositions]
    .map((c) => ({
      ingredientId: c.ingredientId,
      formeId: c.formeId ?? null,
      doseParPortion: c.doseParPortion ?? null,
      unite: c.unite ?? null,
    }))
    .sort((a, b) => {
      const parIng = a.ingredientId.localeCompare(b.ingredientId);
      if (parIng !== 0) return parIng;
      return (a.formeId ?? '').localeCompare(b.formeId ?? '');
    });

  const empreinte = canonicalise({
    nomCommercial: fiche.nomCommercial,
    marque: fiche.marque,
    marche: fiche.marche,
    sourceProvenance: fiche.sourceProvenance,
    sourceIdentifiant: fiche.sourceIdentifiant,
    sourceUrl: fiche.sourceUrl ?? null,
    niveauCompletude: fiche.niveauCompletude,
    donneesManquantes: [...fiche.donneesManquantes].sort(),
    incertitudes: fiche.incertitudes ?? null,
    labels: [...fiche.labels].sort(),
    allergenes: [...fiche.allergenes].sort(),
    excipients: [...fiche.excipients].sort(),
    composition,
  });

  return createHash('sha256').update(JSON.stringify(empreinte), 'utf8').digest('hex');
}
