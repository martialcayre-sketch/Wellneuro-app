// Export PDF du dossier patient — l'écriture des dates ([[D-512]] §3).
//
// La version complète écrit le calendrier, comme avant. La version « IA
// externe » écrit des JOURS RELATIFS : J0 est le jour de la première
// consultation, puis J+n et J-n. Les intervalles restent, le calendrier part :
// combinées, des dates exactes réidentifient un dossier dans une petite
// patientèle (revue de sécurité du 2026-11-12, P1-3).
//
// Une date connue au mois ou à l'année près (début d'un traitement) ne
// s'écrit PAS en jours : son premier jour stocké (le 1er du mois, le 1er
// janvier) donnerait, par différence, le quantième de J0, puis tout le
// calendrier. Elle s'écrit en mois ou en années relatifs, à sa précision.
//
// Module PUR : aucun import Prisma, aucune horloge.

import { dateJourParis } from '@/lib/dateParis';
import { formaterDatePeriode, formaterJour } from '@/lib/physio-traitements/dates';
import { dateFr, dateHeureFr, dateNaissanceFr } from './modele';

/** Repère de J0 : la première consultation, ou à défaut le premier événement enregistré. */
export type RepereJourZero = 'consultation' | 'premier-evenement';

export type JourZero = { jour: string; repere: RepereJourZero } | null;

export type Dateur = {
  /** true : version « IA externe », jours relatifs. */
  relatif: boolean;
  /** Un instant, au jour : « 12/05/2024 » ou « J+42 ». */
  jour(date: Date): string;
  /** Un instant, à la minute dans la version complète ; au jour relatif sinon. */
  jourHeure(date: Date): string;
  /** Une date civile `AAAA-MM-JJ` : « 12/05/2024 » ou « J-3 ». */
  jourCivil(iso: string): string;
  /**
   * Une chaîne de date stockée sans format garanti (échéance d'un envoi). La
   * version complète la recopie ; la version relative rend `null` quand elle ne
   * la lit pas, et la date n'est pas écrite.
   */
  chaineStockee(valeur: string): string | null;
  /** Une date de période, à sa précision (jour, mois, année, inconnue). */
  periode(premierJour: string | null, precision: string | null, inconnue: string): string;
  /**
   * Un texte fixe venu d'un autre module (motif d'une passation non
   * interprétable) : la version relative en retire les dates `AAAA-MM-JJ`,
   * sans toucher au module qui le porte.
   */
  texteFixe(texte: string): string;
  /** « le 12/05/2024 » ou « à J+42 ». */
  le(date: Date): string;
  /** « du 12/05/2024 » ou « à J+42 ». */
  du(date: Date): string;
};

/** Sans J0 (dossier sans aucune date), aucune date ne se calcule : elle n'est pas écrite. */
export const DATE_NON_COMMUNIQUEE = 'date non communiquée';

const JOUR_ISO = /^(\d{4})-(\d{2})-(\d{2})/;
const DATE_CIVILE = /^\d{4}-\d{2}-\d{2}$/;
const INSTANT_ISO = /^\d{4}-\d{2}-\d{2}T/;
const DATE_ISO_DANS_TEXTE = /\d{4}-\d{2}-\d{2}/g;
const LE_DATE_ISO_DANS_TEXTE = /\s+le\s+\d{4}-\d{2}-\d{2}/g;
const MS_PAR_JOUR = 86_400_000;

function partiesIso(iso: string): [number, number, number] | null {
  const m = JOUR_ISO.exec(iso);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

function decalage(prefixe: string, n: number): string {
  if (n === 0) return `${prefixe}0`;
  return `${prefixe}${n > 0 ? '+' : '-'}${Math.abs(n)}`;
}

export const DATEUR_CALENDAIRE: Dateur = {
  relatif: false,
  jour: dateFr,
  jourHeure: dateHeureFr,
  jourCivil: formaterJour,
  chaineStockee: valeur => dateNaissanceFr(valeur),
  periode: formaterDatePeriode,
  texteFixe: texte => texte,
  le: date => `le ${dateFr(date)}`,
  du: date => `du ${dateFr(date)}`,
};

export function dateurRelatif(jourZero: JourZero): Dateur {
  const zero = jourZero ? partiesIso(jourZero.jour) : null;

  const jourCivil = (iso: string): string => {
    const parties = partiesIso(iso);
    if (!zero || !parties) return DATE_NON_COMMUNIQUEE;
    const [a, m, j] = parties;
    const ecart = Math.round((Date.UTC(a, m - 1, j) - Date.UTC(zero[0], zero[1] - 1, zero[2])) / MS_PAR_JOUR);
    return decalage('J', ecart);
  };
  const jour = (date: Date): string => jourCivil(dateJourParis(date));

  return {
    relatif: true,
    jour,
    jourHeure: jour,
    jourCivil,
    // Une date civile se compte telle quelle ; un instant (« …T22:30:00Z »)
    // se ramène d'abord au jour de Paris, sans quoi il tomberait la veille
    // (contre-revue Codex, P2-1). Tout le reste n'est pas écrit.
    chaineStockee(valeur) {
      const texte = valeur.trim();
      if (!zero) return null;
      if (DATE_CIVILE.test(texte)) return jourCivil(texte);
      if (INSTANT_ISO.test(texte)) {
        const instant = new Date(texte);
        return Number.isNaN(instant.getTime()) ? null : jour(instant);
      }
      return null;
    },
    periode(premierJour, precision, inconnue) {
      if (precision === null) return '';
      if (precision === 'inconnu' || premierJour === null) return inconnue;
      const parties = partiesIso(premierJour);
      if (!zero || !parties) return DATE_NON_COMMUNIQUEE;
      if (precision === 'annee') return `${decalage('A', parties[0] - zero[0])} (à l'année près)`;
      if (precision === 'mois') {
        return `${decalage('M', (parties[0] - zero[0]) * 12 + (parties[1] - zero[1]))} (au mois près)`;
      }
      return jourCivil(premierJour);
    },
    texteFixe: texte => texte.replace(LE_DATE_ISO_DANS_TEXTE, '').replace(DATE_ISO_DANS_TEXTE, 'date retirée'),
    le: date => `à ${jour(date)}`,
    du: date => `à ${jour(date)}`,
  };
}

/**
 * J0 : le jour (Europe/Paris) de la première consultation. Sans consultation,
 * le premier événement que l'application a ENREGISTRÉ (envoi, passation,
 * ligne datée, synthèse) — jamais une date déclarée du passé (début d'un
 * traitement, jour d'une mesure), qui ferait de J0 une date de vie. `null`
 * quand le dossier n'a aucune date.
 */
export function choisirJourZero(consultations: readonly Date[], evenements: readonly Date[]): JourZero {
  const plusAncien = (dates: readonly Date[]) =>
    dates.reduce<Date | null>((min, d) => (min === null || d.getTime() < min.getTime() ? d : min), null);
  const consultation = plusAncien(consultations);
  if (consultation) return { jour: dateJourParis(consultation), repere: 'consultation' };
  const evenement = plusAncien(evenements);
  return evenement ? { jour: dateJourParis(evenement), repere: 'premier-evenement' } : null;
}

/** La phrase du préambule qui dit comment lire les dates relatives. */
export function lectureDatesRelatives(jourZero: JourZero): string {
  const repere = jourZero?.repere === 'premier-evenement'
    ? "J0 est le jour du premier événement enregistré dans le dossier (envoi ou réponse à un questionnaire, ligne datée, synthèse) : le dossier n'a aucune consultation"
    : 'J0 est le jour de la première consultation';
  return (
    `Les dates sont écrites en jours relatifs. ${repere} ; J+n tombe n jours après J0, J-n n jours avant. ` +
    "Une date connue au mois près s'écrit en mois relatifs (M-3 : trois mois civils avant celui de J0), " +
    "une date connue à l'année près en années relatives (A-1 : l'année civile qui précède celle de J0). " +
    'Les dates administratives (création du dossier, consentement, accès du patient, clôture du suivi) sont retirées.'
  );
}
