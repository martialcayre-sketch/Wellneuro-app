// Validation et chaînage des nuits (domaine PUR). Patron `checkinDomain.ts` :
// `ensureNuitReponses` rejette (TypeError → 400 côté route), `resolveNuitsActives`
// résout la tête de chaîne par date, `estDateSaisissable` borne la saisie à
// aujourd'hui ou la veille (au-delà : trou assumé, jamais rattrapable —
// anti-fabrication et anti-culpabilisation).

import {
  CLASSES_DUREE_REVEILS,
  CLASSES_LATENCE,
  CLASSES_SIESTE,
  type ClasseDureeReveils,
  type ClasseLatence,
  type ClasseSieste,
  type NuitReponses,
  type NuitRow,
} from './types';

const RE_DATE = /^\d{4}-\d{2}-\d{2}$/;
const RE_HEURE = /^([01]\d|2[0-3]):(00|15|30|45)$/; // HH:MM au pas de 15 min
const COMMENTAIRE_MAX = 200;

// ─── Validation des formats atomiques ────────────────────────────────────────
export function estDateValide(value: unknown): value is string {
  if (typeof value !== 'string' || !RE_DATE.test(value)) return false;
  // Rejette 2026-13-40 : reconstruit la date et compare (horloge murale, UTC
  // pour éviter tout décalage de fuseau dans la reconstruction).
  const [a, m, j] = value.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1, j));
  return d.getUTCFullYear() === a && d.getUTCMonth() === m - 1 && d.getUTCDate() === j;
}

function ensureHeure(value: unknown, champ: string): string {
  if (typeof value !== 'string' || !RE_HEURE.test(value)) {
    throw new TypeError(`Heure invalide pour « ${champ} ».`);
  }
  return value;
}

function ensureEntierBorne(value: unknown, min: number, max: number, champ: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new TypeError(`Valeur invalide pour « ${champ} ».`);
  }
  return value;
}

function ensureDansClasses<T extends string>(
  value: unknown,
  classes: readonly T[],
  champ: string,
): T {
  if (typeof value !== 'string' || !(classes as readonly string[]).includes(value)) {
    throw new TypeError(`Classe invalide pour « ${champ} ».`);
  }
  return value as T;
}

// ─── Validation d'une nuit complète (throw TypeError → 400) ──────────────────
// Ignore les clés supplémentaires (ex. `contractVersion` rangé dans le JSON
// stocké), comme `ensureReponses` des check-ins.
export function ensureNuitReponses(value: unknown): NuitReponses {
  if (!value || typeof value !== 'object') {
    throw new TypeError('Réponses de nuit illisibles.');
  }
  const v = value as Record<string, unknown>;

  // — Express (obligatoire) —
  const out: NuitReponses = {
    heureCoucher: ensureHeure(v.heureCoucher, 'heure du coucher'),
    heureLever: ensureHeure(v.heureLever, 'heure du lever'),
    latence: ensureDansClasses<ClasseLatence>(v.latence, CLASSES_LATENCE, 'endormissement'),
    qualite: ensureEntierBorne(v.qualite, 1, 5, 'qualité de la nuit'),
  };

  // — Complet (facultatif) : chaque champ absent ne dit rien, aucune inférence —
  if (v.reveils !== undefined && v.reveils !== null) {
    if (typeof v.reveils !== 'object') throw new TypeError('Réveils illisibles.');
    const r = v.reveils as Record<string, unknown>;
    out.reveils = {
      nombre: ensureEntierBorne(r.nombre, 0, 3, 'nombre de réveils'),
      dureeTotale: ensureDansClasses<ClasseDureeReveils>(
        r.dureeTotale,
        CLASSES_DUREE_REVEILS,
        'durée des réveils',
      ),
    };
  }
  if (v.heureReveilFinal !== undefined && v.heureReveilFinal !== null) {
    out.heureReveilFinal = ensureHeure(v.heureReveilFinal, 'heure du réveil final');
  }
  if (v.forme !== undefined && v.forme !== null) {
    out.forme = ensureEntierBorne(v.forme, 1, 5, 'forme au réveil');
  }
  if (v.siesteVeille !== undefined && v.siesteVeille !== null) {
    out.siesteVeille = ensureDansClasses<ClasseSieste>(v.siesteVeille, CLASSES_SIESTE, 'sieste');
  }
  if (v.facteurs !== undefined && v.facteurs !== null) {
    if (typeof v.facteurs !== 'object') throw new TypeError('Facteurs illisibles.');
    const f = v.facteurs as Record<string, unknown>;
    const facteurs: NonNullable<NuitReponses['facteurs']> = {};
    for (const cle of ['cafeApres14h', 'alcool', 'ecransAuLit', 'activitePhysique'] as const) {
      if (f[cle] !== undefined) {
        if (typeof f[cle] !== 'boolean') throw new TypeError(`Facteur « ${cle} » invalide.`);
        facteurs[cle] = f[cle] as boolean;
      }
    }
    out.facteurs = facteurs;
  }
  if (v.commentaire !== undefined && v.commentaire !== null) {
    if (typeof v.commentaire !== 'string' || v.commentaire.length > COMMENTAIRE_MAX) {
      throw new TypeError('Commentaire invalide (200 caractères maximum).');
    }
    if (v.commentaire.length > 0) out.commentaire = v.commentaire;
  }

  return out;
}

// ─── Chaînage append-only ────────────────────────────────────────────────────
// Nuit « courante » d'une date = tête de chaîne : la ligne qu'aucune autre ne
// supplante, la plus récente en cas d'égalité. Une seule nuit active par date.
// Même algorithme que `resolveActiveCheckin`, groupé par `dateNuit`.
export function resolveNuitsActives(rows: NuitRow[]): NuitRow[] {
  const parDate = new Map<string, NuitRow[]>();
  for (const row of rows) {
    const lot = parDate.get(row.dateNuit);
    if (lot) lot.push(row);
    else parDate.set(row.dateNuit, [row]);
  }
  const actives: NuitRow[] = [];
  for (const [, scoped] of parDate) {
    const superseded = new Set(
      scoped.map((row) => row.supersedesNuitId).filter((id): id is string => id !== null),
    );
    const heads = scoped.filter((row) => !superseded.has(row.id));
    const pool = heads.length > 0 ? heads : scoped;
    const tete = [...pool].sort((left, right) => {
      const delta = new Date(right.soumisLe).getTime() - new Date(left.soumisLe).getTime();
      if (delta !== 0) return delta;
      return left.id < right.id ? 1 : left.id > right.id ? -1 : 0;
    })[0];
    actives.push(tete);
  }
  // Tri chronologique par date de nuit (ordre d'affichage naturel).
  return actives.sort((a, b) => (a.dateNuit < b.dateNuit ? -1 : a.dateNuit > b.dateNuit ? 1 : 0));
}

// Décale une date AAAA-MM-JJ de `n` jours (horloge murale, calcul en UTC pour
// neutraliser tout fuseau — une date-calendrier n'a pas d'heure).
export function decalerDate(dateNuit: string, n: number): string {
  const [a, m, j] = dateNuit.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1, j + n));
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

// Une nuit ne peut être saisie/corrigée que pour aujourd'hui ou la veille. Le
// matin, le patient note la nuit passée (= aujourd'hui) ; la correction J-1
// couvre l'oubli d'un jour. Au-delà, un trou reste un trou — on ne fabrique pas
// rétrospectivement des nuits.
export function estDateSaisissable(dateNuit: string, aujourdHui: string): boolean {
  if (!estDateValide(dateNuit) || !estDateValide(aujourdHui)) return false;
  return dateNuit === aujourdHui || dateNuit === decalerDate(aujourdHui, -1);
}
