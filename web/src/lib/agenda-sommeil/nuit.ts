// Validation et chaînage des nuits (domaine PUR). Patron `checkinDomain.ts` :
// `ensureNuitReponses` rejette (TypeError → 400 côté route), `resolveNuitsActives`
// résout la tête de chaîne par date, `estDateSaisissable` borne la saisie à
// aujourd'hui ou la veille (au-delà : trou assumé, jamais rattrapable —
// anti-fabrication et anti-culpabilisation).

import {
  CLASSES_AIDE_SOMMEIL,
  CLASSES_DUREE_REVEILS,
  CLASSES_DUREE_REVEILS_LUES,
  CLASSES_LATENCE,
  CLASSES_SIESTE,
  CLES_FACTEURS,
  NB_REVEILS_MAX,
  type ClasseAideSommeil,
  type ClasseDureeReveils,
  type ClasseDureeReveilsHeritee,
  type ClasseLatence,
  type ClasseSieste,
  type FacteursNuit,
  type NuitReponses,
  type NuitRow,
} from './types';

const RE_DATE = /^\d{4}-\d{2}-\d{2}$/;
const RE_HEURE = /^([01]\d|2[0-3]):(00|15|30|45)$/; // HH:MM au pas de 15 min
const COMMENTAIRE_MAX = 200;

// ─── Primitive horaire ───────────────────────────────────────────────────────
// Durée d'un intervalle horaire, minuit traversé (modulo 1440). Elle vit ici, et
// non dans `agregats.ts`, parce que c'est une primitive de temps au même titre
// que `decalerDate` — et parce que la validation en a besoin : `agregats`
// importe `nuit`, l'inverse fermerait un cycle. `agregats` la réexporte, les
// appelants existants ne bougent pas.
function minutesDepuisMinuit(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function dureeMinutes(hDebut: string, hFin: string): number {
  return (minutesDepuisMinuit(hFin) - minutesDepuisMinuit(hDebut) + 1440) % 1440;
}

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
//
// `exigerObligatoires` sépare l'ÉCRITURE de la LECTURE. En écriture (v2, cf.
// `saveNuit`) l'éveil nocturne, l'aide au sommeil et le mode de lever sont
// obligatoires : sans eux, l'agrégation devrait inventer un zéro ou un « non ».
// En lecture ils restent facultatifs — des milliers de nuits v1 sont déjà en
// base sans aucun des trois, et `toNuitRow` re-valide chaque ligne lue ; les
// exiger en lecture rendrait l'historique illisible.
export function ensureNuitReponses(
  value: unknown,
  options: { exigerObligatoires?: boolean } = {},
): NuitReponses {
  if (!value || typeof value !== 'object') {
    throw new TypeError('Réponses de nuit illisibles.');
  }
  const v = value as Record<string, unknown>;

  // — Obligatoire —
  const out: NuitReponses = {
    heureCoucher: ensureHeure(v.heureCoucher, 'extinction de la lumière'),
    heureLever: ensureHeure(v.heureLever, 'sortie du lit'),
    latence: ensureDansClasses<ClasseLatence>(v.latence, CLASSES_LATENCE, 'endormissement'),
    qualite: ensureEntierBorne(v.qualite, 1, 5, 'qualité de la nuit'),
  };

  if (v.reveils !== undefined && v.reveils !== null) {
    if (typeof v.reveils !== 'object') throw new TypeError('Réveils illisibles.');
    const r = v.reveils as Record<string, unknown>;
    // v3 : compte exact borné par vraisemblance. Les lignes v1/v2 (0..3, où
    // 3 = « 3 ou plus ») passent la même borne — leur 3 se lit comme un
    // plancher, jamais réinterprété (cf. note (g) du contrat).
    const nombre =
      r.nombre === undefined || r.nombre === null
        ? undefined
        : ensureEntierBorne(r.nombre, 0, NB_REVEILS_MAX, 'nombre de réveils');
    // En lecture on accepte aussi les classes héritées de la v1 ; en écriture,
    // seules les classes courantes passent — sinon un client obsolète pourrait
    // continuer d'écrire des bornes que le critère de 30 min ne sait pas lire.
    let dureeTotale = ensureDansClasses<ClasseDureeReveils | ClasseDureeReveilsHeritee>(
      r.dureeTotale,
      options.exigerObligatoires ? CLASSES_DUREE_REVEILS : CLASSES_DUREE_REVEILS_LUES,
      'durée des réveils',
    );
    if (options.exigerObligatoires) {
      // ÉCRITURE : on refuse la contradiction, on ne la corrige pas. Corriger
      // reviendrait à réécrire un éveil nocturne DÉCLARÉ en « aucun » dès qu'un
      // `nombre: 0` résiduel traîne — exactement le zéro inventé que toute la v2
      // existe pour supprimer, et indiscernable d'une vraie nuit continue une
      // fois en base.
      if (nombre === 0 && dureeTotale !== 'aucun') {
        throw new TypeError('Éveil nocturne incohérent avec un compte de zéro réveil.');
      }
      if (nombre !== undefined && nombre > 0 && dureeTotale === 'aucun') {
        throw new TypeError('Nuit continue incompatible avec des réveils comptés.');
      }
    } else if (nombre === 0) {
      // LECTURE seule : artefact connu du formulaire v1, qui masquait la
      // question de durée quand le patient déclarait 0 réveil et rangeait tout
      // de même `'lt15'` par défaut. Une nuit sans réveil n'a pas 8 minutes
      // d'éveil — on la ramène à la classe `aucun`, désormais explicite.
      dureeTotale = 'aucun';
    }
    out.reveils = nombre === undefined ? { dureeTotale } : { dureeTotale, nombre };
  } else if (options.exigerObligatoires) {
    throw new TypeError('Indiquez comment s’est passée votre nuit.');
  }

  if (v.aideSommeil !== undefined && v.aideSommeil !== null) {
    out.aideSommeil = ensureDansClasses<ClasseAideSommeil>(
      v.aideSommeil,
      CLASSES_AIDE_SOMMEIL,
      'aide au sommeil',
    );
  } else if (options.exigerObligatoires) {
    throw new TypeError('Indiquez si vous avez pris une aide pour dormir.');
  }

  if (v.extinctionImmediate !== undefined && v.extinctionImmediate !== null) {
    if (typeof v.extinctionImmediate !== 'boolean') {
      throw new TypeError('Mode de coucher invalide.');
    }
    out.extinctionImmediate = v.extinctionImmediate;
  } else if (options.exigerObligatoires) {
    throw new TypeError('Indiquez si vous avez éteint la lumière en vous couchant.');
  }

  if (v.heureMiseAuLit !== undefined && v.heureMiseAuLit !== null) {
    out.heureMiseAuLit = ensureHeure(v.heureMiseAuLit, 'heure de mise au lit');
  }

  if (v.leverImmediat !== undefined && v.leverImmediat !== null) {
    if (typeof v.leverImmediat !== 'boolean') throw new TypeError('Mode de lever invalide.');
    out.leverImmediat = v.leverImmediat;
  } else if (options.exigerObligatoires) {
    throw new TypeError('Indiquez si vous vous êtes levé·e dès votre réveil.');
  }

  if (v.heureReveilFinal !== undefined && v.heureReveilFinal !== null) {
    out.heureReveilFinal = ensureHeure(v.heureReveilFinal, 'heure du réveil final');
  }

  // Une heure ne vaut que si son mode l'appelle, et réciproquement. Les
  // incohérences sont refusées plutôt que silencieusement corrigées : elles
  // signaleraient un client cassé, et une nuit fausse vaut moins qu'une nuit
  // absente.
  if (out.extinctionImmediate === true && out.heureMiseAuLit !== undefined) {
    throw new TypeError('Heure de mise au lit incompatible avec une extinction immédiate.');
  }
  if (out.extinctionImmediate === false && out.heureMiseAuLit === undefined) {
    throw new TypeError('Indiquez l’heure à laquelle vous vous êtes mis·e au lit.');
  }
  if (out.leverImmediat === true && out.heureReveilFinal !== undefined) {
    throw new TypeError('Réveil final incompatible avec un lever immédiat.');
  }
  if (out.leverImmediat === false && out.heureReveilFinal === undefined) {
    throw new TypeError('Indiquez l’heure de votre réveil.');
  }

  // Ordre des quatre ancres : mise au lit → extinction → réveil final → sortie
  // du lit, au sens modulo (une nuit traverse minuit). On mesure tout depuis la
  // mise au lit, seule origine qui précède les trois autres. Un ordre inversé
  // produirait une durée négative — donc un temps au lit ou un temps de sommeil
  // faux, jamais visible comme tel.
  //
  // Ces contrôles ne valent QU'EN ÉCRITURE. `toNuitRow` re-valide chaque ligne
  // lue : une règle d'ordre appliquée en lecture ferait lever le GET entier d'un
  // patient sur une ligne historique un peu bancale, et transformerait toute
  // règle future en incident de production. Le chemin de lecture doit rester
  // capable de rendre l'historique tel qu'il est.
  if (options.exigerObligatoires) {
    const origine = out.heureMiseAuLit ?? out.heureCoucher;
    const depuisOrigine = (h: string) => dureeMinutes(origine, h);
    const versLever = depuisOrigine(out.heureLever);
    if (out.heureMiseAuLit !== undefined && depuisOrigine(out.heureCoucher) > versLever) {
      throw new TypeError('L’extinction doit suivre la mise au lit.');
    }
    if (out.heureReveilFinal !== undefined && depuisOrigine(out.heureReveilFinal) > versLever) {
      throw new TypeError('Le réveil doit se situer avant la sortie du lit.');
    }
    if (
      out.heureMiseAuLit !== undefined &&
      out.heureReveilFinal !== undefined &&
      depuisOrigine(out.heureReveilFinal) < depuisOrigine(out.heureCoucher)
    ) {
      throw new TypeError('Le réveil doit suivre l’extinction.');
    }
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
    const facteurs: FacteursNuit = {};
    for (const cle of CLES_FACTEURS) {
      if (f[cle] !== undefined) {
        if (typeof f[cle] !== 'boolean') throw new TypeError(`Facteur « ${cle} » invalide.`);
        facteurs[cle] = f[cle] as boolean;
      }
    }
    if (f.rienDeParticulier !== undefined) {
      if (typeof f.rienDeParticulier !== 'boolean') {
        throw new TypeError('Facteur « rienDeParticulier » invalide.');
      }
      facteurs.rienDeParticulier = f.rienDeParticulier;
    }
    // Exclusivité : « rien de particulier » est ce qui distingue « aucun
    // facteur ce soir » de « pas répondu ». Le laisser coexister avec un facteur
    // coché détruirait cette distinction, la seule qui permette de lire un objet
    // vide comme une absence de réponse.
    if (facteurs.rienDeParticulier && CLES_FACTEURS.some((cle) => facteurs[cle])) {
      throw new TypeError('« Rien de particulier » exclut les autres facteurs.');
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

// Une nuit tombe-t-elle sur un week-end ? `dateNuit` est le MATIN du réveil :
// la nuit du samedi au dimanche porte donc la date du dimanche. Sont comptées
// comme week-end les nuits dont le matin est un samedi ou un dimanche, c'est-à-
// dire les nuits des vendredi et samedi soir — celles où les horaires dérivent.
export function estWeekend(dateNuit: string): boolean {
  const [a, m, j] = dateNuit.split('-').map(Number);
  const jour = new Date(Date.UTC(a, m - 1, j)).getUTCDay(); // 0 = dimanche
  return jour === 0 || jour === 6;
}

// Une nuit ne peut être saisie/corrigée que pour aujourd'hui ou la veille. Le
// matin, le patient note la nuit passée (= aujourd'hui) ; la correction J-1
// couvre l'oubli d'un jour. Au-delà, un trou reste un trou — on ne fabrique pas
// rétrospectivement des nuits.
export function estDateSaisissable(dateNuit: string, aujourdHui: string): boolean {
  if (!estDateValide(dateNuit) || !estDateValide(aujourdHui)) return false;
  return dateNuit === aujourdHui || dateNuit === decalerDate(aujourdHui, -1);
}
