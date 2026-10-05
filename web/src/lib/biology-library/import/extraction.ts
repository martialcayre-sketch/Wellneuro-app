import Anthropic from '@anthropic-ai/sdk';
import { anthropic } from '@/lib/anthropic';
import type { TypeMimeCompteRendu } from './depot';

// EXTRACTION D'UN COMPTE RENDU PAR IA VISION (BIO-INGEST LOT-02, [[D-256]] A4).
//
// Le compte rendu part ENTIER chez Anthropic, identité comprise : la v4 de
// `usage_ia` et la v11 de `donnees_confidentialite` le déclarent, et aucun
// masquage n'est promis (arbitrage du 2026-10-01, §2 ter du dossier RGPD).
//
// LE MODÈLE RELÈVE, IL N'INTERPRÈTE PAS. Il recopie libellé, valeur, unité,
// page, date du prélèvement et laboratoire TELS QU'ILS SONT ÉCRITS. Il ne
// choisit aucun analyte (c'est le resolver signé), ne convertit aucune unité
// ([[D-157]]), ne qualifie aucune valeur. Sa réponse est contrainte par un
// schéma (sortie structurée), puis RE-JUGÉE ici par un schéma fermé aux bornes
// des CHECK de la base : un écart rend `reponse_invalide`, rien n'est écrit.
//
// MODÈLE ET VERSION SONT ENREGISTRÉS À CHAQUE EXTRACTION (promesse de la v4) :
// l'orchestration les pose sur l'import AVANT l'appel. Aucune bascule de
// modèle (`fallbacks`) n'est demandée : le modèle qui répond doit être celui
// qui est enregistré.

/** Modèle d'extraction (arbitrage du 2026-10-02), remplaçable par l'environnement. */
// `||` et non `??` : une variable posée VIDE retombe sur le défaut, au lieu de
// faire échouer le CHECK `modele` de l'import en 500 opaque (revue, P2-7).
export const MODELE_EXTRACTION = process.env.WN_BIO_INGEST_MODEL?.trim() || 'claude-sonnet-5-5';

/**
 * Version du procédé : prompt, schéma de sortie et règles de lecture. Un
 * LITTÉRAL à incrémenter à la main dès que l'un des trois change — c'est elle
 * que l'import enregistre.
 */
export const VERSION_PROCEDE_EXTRACTION = 'bio-extraction-v1';

/**
 * Délai d'attente des EN-TÊTES (ms), SANS nouvelle tentative : technique, sans
 * sémantique clinique. 180 s plutôt que 120 s × 2 (arbitrage du 2026-10-02) :
 * un compte rendu de 200 lignes est estimé à ~95 s (36 s mesurées pour 75
 * lignes). Un échec se relance à la main.
 *
 * Ce délai NE BORNE PAS l'appel : le SDK (0.107.0) efface son minuteur dès les
 * en-têtes reçus, et la lecture du flux qui suit n'a aucune borne. C'est
 * `DUREE_TOTALE_EXTRACTION_MS` qui borne l'appel entier.
 */
export const DELAI_EXTRACTION_MS = 180_000;
export const TENTATIVES_SUPPLEMENTAIRES = 0;

/**
 * Durée TOTALE d'un appel (ms) : en-têtes ET lecture du flux, par un signal
 * d'abandon. Le pire cas d'une extraction (cette borne, puis la transaction
 * des lignes) doit rester sous la péremption d'un import en cours
 * (`PEREMPTION_EN_COURS_MS`, test) : sinon une suite encore vivante serait
 * close `delai_depasse` par une relance, ou ne serait jamais close du tout.
 */
export const DUREE_TOTALE_EXTRACTION_MS = 240_000;

/** Plafond technique de lignes relevées dans un compte rendu. */
export const LIGNES_MAX = 200;

export type MotifEchec = 'erreur_fournisseur' | 'reponse_invalide' | 'document_illisible' | 'delai_depasse';

export type LigneExtraite = {
  page: number;
  libelle: string;
  valeur: string;
  unite: string | null;
  preleveLe: Date | null;
  /**
   * L'heure a été LUE sur le compte rendu ([[D-258]], colonne `heure_lue`) :
   * une heure imprimée « 00:00 » n'est plus confondue avec une heure absente.
   * Jamais vraie sans date lue (CHECK de la base).
   */
  heureLue: boolean;
};

export type ResultatExtraction =
  | { ok: true; laboratoire: string | null; lignes: LigneExtraite[] }
  | { ok: false; motif: MotifEchec };

const CONSIGNE = [
  'Tu relèves les résultats d’un compte rendu d’analyses de biologie médicale.',
  'Recopie chaque résultat mesuré TEL QU’IL EST ÉCRIT : libellé, valeur, unité, numéro de page (1 pour la première).',
  'La valeur se recopie caractère pour caractère, signes compris (« 12,5 », « <0,5 », « positif »).',
  'L’unité se recopie telle qu’imprimée, ou null si aucune n’est écrite. Ne convertis jamais une unité.',
  'N’interprète rien : ne dis jamais si une valeur est normale, basse, haute ou pathologique, et ne recopie ni les valeurs de référence ni les commentaires.',
  'Ne rattache aucun résultat à un code ou à un nom d’analyte : recopie le libellé imprimé.',
  'Pour chaque résultat, la date du prélèvement au format AAAA-MM-JJ et son heure au format HH:MM si elles sont imprimées, sinon null.',
  'Le nom du laboratoire tel qu’imprimé en en-tête, ou null.',
  'Si le document n’est pas un compte rendu d’analyses lisible, réponds lisible = false et aucune ligne.',
].join('\n');

const SCHEMA_SORTIE = {
  type: 'object',
  additionalProperties: false,
  required: ['lisible', 'laboratoire', 'lignes'],
  properties: {
    lisible: { type: 'boolean' },
    laboratoire: { type: ['string', 'null'] },
    lignes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['page', 'libelle', 'valeur', 'unite', 'date_prelevement', 'heure_prelevement'],
        properties: {
          page: { type: 'integer' },
          libelle: { type: 'string' },
          valeur: { type: 'string' },
          unite: { type: ['string', 'null'] },
          date_prelevement: { type: ['string', 'null'] },
          heure_prelevement: { type: ['string', 'null'] },
        },
      },
    },
  },
} as const;

/** Décalage (ms) de l'heure de Paris sur l'UTC à l'instant `t`. */
function decalageParis(t: number): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(t));
  const v = (type: string) => Number(parts.find(p => p.type === type)?.value);
  return Date.UTC(v('year'), v('month') - 1, v('day'), v('hour'), v('minute'), v('second')) - t;
}

/** Une heure d'horloge, 00:00 à 23:59 — la forme le dit, sans comparaison. */
const HEURE_HORLOGE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** L'heure imprimée est lisible — sinon l'extraction garde minuit et ne la dit pas lue. */
export function heureLisible(heure: string | null): boolean {
  return heure !== null && HEURE_HORLOGE.test(heure.trim());
}

/**
 * La date imprimée (heure murale de Paris, celle du laboratoire) en instant
 * UTC — la même conversion que fait le navigateur du praticien pour une saisie.
 * Sans heure imprimée — ou une heure illisible (« 8h30 ») : minuit, que le
 * praticien corrige à la validation ; la date, elle, n'est pas perdue (revue,
 * P2-5). `null` si la DATE est illisible : on ne devine pas.
 */
export function lireDatePrelevement(date: string | null, heure: string | null): Date | null {
  if (date === null) return null;
  const j = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  if (!j) return null;
  let h = 0;
  let mi = 0;
  if (heure !== null && heure.trim() !== '') {
    const hm = HEURE_HORLOGE.exec(heure.trim());
    if (hm) {
      h = Number(hm[1]);
      mi = Number(hm[2]);
    }
  }
  const [an, mois, jour] = [Number(j[1]), Number(j[2]), Number(j[3])];
  const mural = Date.UTC(an, mois - 1, jour, h, mi);
  const verif = new Date(mural);
  if (verif.getUTCFullYear() !== an || verif.getUTCMonth() !== mois - 1 || verif.getUTCDate() !== jour) return null;
  // Deux passes : le décalage se lit à l'instant visé, pas à l'heure murale.
  let instant = mural - decalageParis(mural);
  instant = mural - decalageParis(instant);
  return new Date(instant);
}

/** Les clés EXACTES d'un objet : ni absente, ni en trop (revue Copilot de #1281). */
function clesExactes(objet: Record<string, unknown>, attendues: readonly string[]): boolean {
  const cles = Object.keys(objet);
  return cles.length === attendues.length && attendues.every(c => Object.prototype.hasOwnProperty.call(objet, c));
}

const CLES_SORTIE = SCHEMA_SORTIE.required;
const CLES_LIGNE = SCHEMA_SORTIE.properties.lignes.items.required;

function texteBorne(v: unknown, max: number): string | null | undefined {
  if (v === null) return null;
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  if (t === '') return null;
  return t.length <= max ? t : undefined;
}

/**
 * Re-juge la sortie du modèle par un schéma FERMÉ, aux bornes des CHECK du
 * staging. Pure : testable sans appel. Toute dérogation rend
 * `reponse_invalide` — jamais une ligne tronquée ou complétée.
 */
export function analyserSortieExtraction(texte: string): ResultatExtraction {
  const invalide: ResultatExtraction = { ok: false, motif: 'reponse_invalide' };
  let brut: unknown;
  try {
    brut = JSON.parse(texte);
  } catch {
    return invalide;
  }
  if (brut === null || typeof brut !== 'object' || Array.isArray(brut)) return invalide;
  const sortie = brut as Record<string, unknown>;
  if (!clesExactes(sortie, CLES_SORTIE)) return invalide;
  if (typeof sortie.lisible !== 'boolean' || !Array.isArray(sortie.lignes)) return invalide;
  if (!sortie.lisible) return { ok: false, motif: 'document_illisible' };
  if (sortie.lignes.length > LIGNES_MAX) return invalide;

  const laboratoire = texteBorne(sortie.laboratoire, 200);
  if (laboratoire === undefined) return invalide;

  const lignes: LigneExtraite[] = [];
  for (const l of sortie.lignes as unknown[]) {
    if (l === null || typeof l !== 'object' || Array.isArray(l)) return invalide;
    const ligne = l as Record<string, unknown>;
    if (!clesExactes(ligne, CLES_LIGNE)) return invalide;
    if (typeof ligne.page !== 'number' || !Number.isInteger(ligne.page) || ligne.page < 1) return invalide;
    const libelle = texteBorne(ligne.libelle, 300);
    const valeur = texteBorne(ligne.valeur, 100);
    const unite = texteBorne(ligne.unite, 50);
    if (!libelle || !valeur || unite === undefined) return invalide;
    const date = ligne.date_prelevement;
    const heure = ligne.heure_prelevement;
    if ((date !== null && typeof date !== 'string') || (heure !== null && typeof heure !== 'string')) return invalide;
    const preleveLe = lireDatePrelevement(date, heure);
    lignes.push({ page: ligne.page, libelle, valeur, unite, preleveLe, heureLue: preleveLe !== null && heureLisible(heure) });
  }
  return { ok: true, laboratoire, lignes };
}

/** Le motif d'échec d'une erreur d'appel — jamais son message. */
export function motifDErreur(err: unknown): MotifEchec {
  if (err instanceof Anthropic.APIConnectionTimeoutError) return 'delai_depasse';
  // Seule la borne totale abandonne un appel : aucun autre signal n'est passé.
  if (err instanceof Anthropic.APIUserAbortError) return 'delai_depasse';
  return 'erreur_fournisseur';
}

/**
 * Appelle le modèle sur un compte rendu entier — PDF, ou image (LOT-03) — et
 * rend ses lignes relevées, ou un motif d'échec. Seul le bloc d'entrée change
 * avec le format : consigne, schéma et règles de lecture sont les mêmes.
 */
export async function extraireCompteRendu(
  document: Buffer,
  typeMime: TypeMimeCompteRendu,
): Promise<ResultatExtraction> {
  const data = document.toString('base64');
  const entree: Anthropic.ContentBlockParam =
    typeMime === 'application/pdf'
      ? { type: 'document', source: { type: 'base64', media_type: typeMime, data } }
      : { type: 'image', source: { type: 'base64', media_type: typeMime, data } };
  let reponse: Anthropic.Message;
  const borne = new AbortController();
  const minuteur = setTimeout(() => borne.abort(), DUREE_TOTALE_EXTRACTION_MS);
  try {
    // En flux : un `max_tokens` de cette taille est refusé d'emblée par le SDK
    // en appel simple (durée estimée au-delà de 10 min). Seul le message final
    // est lu ; rien n'est relayé en cours de route.
    reponse = await anthropic.messages.stream(
      {
        model: MODELE_EXTRACTION,
        // Un bilan dense de 200 lignes ne doit pas être coupé (revue, P2-4).
        max_tokens: 32_000,
        system: CONSIGNE,
        output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA_SORTIE } },
        messages: [
          {
            role: 'user',
            content: [
              entree,
              { type: 'text', text: 'Relève les résultats de ce compte rendu.' },
            ],
          },
        ],
      },
      { timeout: DELAI_EXTRACTION_MS, maxRetries: TENTATIVES_SUPPLEMENTAIRES, signal: borne.signal },
    ).finalMessage();
  } catch (err) {
    // La borne atteinte fait foi, quelle que soit la forme de l'erreur levée.
    return { ok: false, motif: borne.signal.aborted ? 'delai_depasse' : motifDErreur(err) };
  } finally {
    clearTimeout(minuteur);
  }
  // Un refus du fournisseur n'est pas une réponse à juger ; une sortie coupée
  // non plus.
  if (reponse.stop_reason === 'refusal') return { ok: false, motif: 'erreur_fournisseur' };
  if (reponse.stop_reason !== 'end_turn') return { ok: false, motif: 'reponse_invalide' };
  const texte = reponse.content.flatMap(b => (b.type === 'text' ? [b.text] : [])).join('');
  return analyserSortieExtraction(texte);
}
