'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { lireValeurQuantitative, unitesConcordent, type MotifEcart } from '@/lib/biology-library/import/valeurLue';
import type { CompteRenduLu, LigneLue } from '@/lib/biology-library/import/lecture';
import type { AnalyteChoix } from './SaisieBilan';
import { FaitsDuLaboratoire } from './FaitsDuLaboratoire';
import type { ActeLectureLu } from '@/lib/biology-library/import/acteLecture';
import { etatLecture } from '@/lib/biology-library/import/lectureImport';
import { useBioLectureEnabled } from './CbFeatureProvider';
import { LectureImportBiologique } from './LectureImportBiologique';
import { MasquageIdentite } from './MasquageIdentite';

type MotifEcartDocument = 'illisible' | 'document_non_conforme';

// IMPORT D'UN COMPTE RENDU DE LABORATOIRE (BIO-INGEST LOT-02, [[D-256]]),
// derrière `WN_BIO_INGEST_ENABLED`. Quatre gestes, tous du praticien :
// déposer le document (PDF, ou photo au LOT-03), lancer la lecture, décider
// chaque ligne, retirer un dépôt erroné. RIEN n'entre au dossier sans la
// décision « Valider » d'une ligne.
//
// LA LECTURE EST ASYNCHRONE : la route rend la main (202) et l'écran relit le
// compte rendu jusqu'à l'issue — trois pages durent ~36 s, au-delà de la
// fenêtre de 30 s du routeur. Seule l'extraction COURANTE se décide (la plus
// récente qui n'a pas échoué) : ce sont ses seules lignes affichées.
//
// L'HEURE DU PRÉLÈVEMENT EST EXIGÉE (arbitrage du 2026-10-02) : l'extraction
// garde la date seule à minuit DE PARIS quand l'heure n'est pas lue ; l'écran
// laisse alors le champ VIDE plutôt que de proposer un minuit que personne n'a
// lu, et signale les mesures du même analyte déjà au dossier ce jour-là. Une
// heure IMPRIMÉE « 00:00 » (`heureLue`, [[D-258]]) reste affichée.
//
// UN DOCUMENT TRANSMIS PAR LE PATIENT ([[D-269]]) ne se retire pas : il
// S'ÉCARTE, motif fermé, ce qui l'efface aussitôt (§3). Avant la lecture, le
// praticien vérifie que c'est bien le compte rendu de ce patient (§1).
//
// LE DOCUMENT S'EFFACE ([[D-258]]) à la dernière décision de l'extraction
// courante, et au plus tard 30 jours après le dépôt : il ne se relit plus.
// À la même échéance, les lignes non validées s'effacent aussi ; à l'écart,
// tout de suite ([[D-283]] §2, F44). Seules les lignes validées restent.
// DATES ET HEURES EN HEURE DE PARIS, quel que soit le fuseau du poste : c'est
// celle du laboratoire et celle de l'extraction. Lues dans le fuseau du
// navigateur, un poste hors Paris verrait « 22:00 » la veille au lieu d'une
// heure non lue (revue de la PR 2b, P2-1).
//
// AUCUNE QUALIFICATION (`DC-27`) : une valeur lue s'affiche telle quelle,
// jamais comparée à quoi que ce soit.

export type MesureAuDossier = {
  analyteCode: string;
  /** Décimal exact en forme canonique (LOT-10). */
  valeur: string;
  unite: string | null;
  preleveLe: string;
  /** `null` ⇒ cette mesure fait foi (non corrigée). */
  corrigeeParId: string | null;
  /** Fil annulé ([[D-294]]) : la mesure ne tient plus sa place. */
  annulation?: unknown;
};

type CompteRenduListe = {
  id: string;
  deposeLe: string;
  origine?: string;
  purgeLe?: string | null;
  dernierImport: { id: string; statut: string } | null;
};

type Saisie = {
  choix: 'valider' | 'ecarter' | null;
  analyteCode: string;
  valeur: string;
  date: string;
  heure: string;
  motif: MotifEcart;
  /** Seconde unité ([[D-270]]) : l'« Écarter » pré-coché tient tant que l'une
   *  de ces lignes part validée sur le même analyte. Effacé dès que le
   *  praticien touche la ligne : la décision est alors la sienne. */
  jumelles?: readonly string[];
};

const INTERVALLE_RELECTURE_MS = 3_000;

/** Les deux motifs fermés de l'écart d'un document transmis ([[D-269]] §3). */
const LIBELLES_MOTIF_ECART_DOCUMENT: Record<MotifEcartDocument, string> = {
  illisible: 'Illisible',
  document_non_conforme: 'Pas un compte rendu de ce patient',
};

const LIBELLES_MOTIF: Record<MotifEcart, string> = {
  non_quantitative: 'Valeur non chiffrée',
  unite_divergente: 'Unité différente du catalogue',
  analyte_non_reconnu: 'Analyte non reconnu',
  ecartee_par_praticien: 'Écartée par le praticien',
};

const MESSAGES_ECHEC: Record<string, string> = {
  document_illisible: 'Le document n’a pas pu être lu.',
  reponse_invalide: 'La lecture a rendu une réponse inexploitable.',
  erreur_fournisseur: 'Le service de lecture a échoué.',
  delai_depasse: 'La lecture a dépassé le délai.',
};

const LIBELLES_STATUT: Record<string, string> = {
  en_cours: 'Lecture en cours',
  extrait: 'Lu',
  echec: 'Échec de lecture',
};

const CHAMP = 'min-h-11 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground';
const BOUTON = 'min-h-11 rounded-lg border border-border px-3 py-2 text-sm text-foreground disabled:opacity-50';
const BOUTON_PRIMAIRE =
  'min-h-11 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50';

const FORMAT_PARIS = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Paris', hourCycle: 'h23',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
});

function partiesParis(t: Date) {
  const parties = FORMAT_PARIS.formatToParts(t);
  const v = (type: string) => parties.find(p => p.type === type)?.value ?? '';
  return { annee: v('year'), mois: v('month'), jour: v('day'), heure: v('hour'), minute: v('minute'), seconde: v('second') };
}

/** Décalage (ms) de Paris sur l'UTC à l'instant `t` — même calcul que l'extraction, sans l'importer (module serveur). */
function decalageParis(t: number): number {
  const p = partiesParis(new Date(t));
  return Date.UTC(+p.annee, +p.mois - 1, +p.jour, +p.heure, +p.minute, +p.seconde) - t;
}

/**
 * Date et heure DE PARIS d'un instant ; l'heure reste VIDE à minuit pile —
 * elle n'a pas été lue —, sauf si l'extraction l'a LUE (`heureLue`, [[D-258]]).
 */
export function champsDepuisInstant(iso: string | null, heureLue = false): { date: string; heure: string } {
  if (!iso) return { date: '', heure: '' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: '', heure: '' };
  const p = partiesParis(d);
  const heure = `${p.heure}:${p.minute}`;
  return { date: `${p.annee}-${p.mois}-${p.jour}`, heure: heure === '00:00' && !heureLue ? '' : heure };
}

/**
 * L'instant d'une date et d'une heure murales DE PARIS (deux passes, pour les
 * changements d'heure). `null` si cette heure N'EXISTE PAS à Paris (passage à
 * l'heure d'été : 02:30 le dernier dimanche de mars) — l'aller-retour le
 * révèle ; la normaliser en 03:30 enregistrerait une autre heure que la saisie
 * (revue Copilot de #1283).
 */
export function instantDepuisParis(date: string, heure: string): Date | null {
  const j = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const h = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(heure);
  if (!j || !h) return null;
  const mural = Date.UTC(+j[1], +j[2] - 1, +j[3], +h[1], +h[2]);
  const premier = mural - decalageParis(mural);
  const instant = new Date(mural - decalageParis(premier));
  const retour = partiesParis(instant);
  if (`${retour.annee}-${retour.mois}-${retour.jour}` !== date || `${retour.heure}:${retour.minute}` !== heure) {
    return null;
  }
  return instant;
}

function formatDateHeure(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Paris' });
}

/**
 * LES DEUX MARQUES DATÉES DE LA CARTE ([[D-308]] §3, F58) — un affichage de
 * données existantes, sans stockage neuf ([[D-322]]) :
 *  - « lignes validées » : la date de la DERNIÈRE ligne validée du compte
 *    rendu, tous imports confondus (`traiteLe`, posé par la base) ; absente
 *    tant qu'aucune ligne n'est validée ;
 *  - « lecture consignée » : la lecture ACTIVE la plus récente (BP-10,
 *    [[D-268]]), ou « non consignée » ; un geste distinct, dont le bouton reste
 *    dans le bloc de lecture. Absente sans ligne validée (rien à lire), drapeau
 *    éteint ou état non lu : on n'affirme rien qu'on n'a pas lu.
 * Deux marques distinctes : la validation des lignes n'est pas la lecture, et
 * le « Validé » du portail garde son sens ([[D-269]] §4).
 */
export function marquesDatees(
  detail: Pick<CompteRenduLu, 'imports'>,
  actesLecture: Record<string, ActeLectureLu[]> | null,
): { lignesValideesLe: string | null; lecture: { consigneeLe: string } | 'non_consignee' | null } {
  let lignesValideesLe: string | null = null;
  for (const imp of detail.imports) {
    for (const l of imp.lignes) {
      if (l.statut === 'validee' && l.traiteLe && (lignesValideesLe === null || l.traiteLe > lignesValideesLe)) {
        lignesValideesLe = l.traiteLe;
      }
    }
  }
  if (lignesValideesLe === null || actesLecture === null) return { lignesValideesLe, lecture: null };
  let consigneeLe: string | null = null;
  for (const imp of detail.imports) {
    const actes = actesLecture[imp.id] ?? [];
    const etat = etatLecture(actes.map((a, rang) => ({ ...a, ordre: rang, acteLe: new Date(a.acteLe) })));
    const le = etat.active?.acteLe.toISOString() ?? null;
    if (le !== null && (consigneeLe === null || le > consigneeLe)) consigneeLe = le;
  }
  return { lignesValideesLe, lecture: consigneeLe ? { consigneeLe } : 'non_consignee' };
}

function formatHeure(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
}

/**
 * « Valider » est PRÉ-POSITIONNÉ pour une ligne rapprochée par le resolver signé
 * et sans écart pré-marqué ([[D-260]], demande du responsable) ; « Plus tard »
 * reste le défaut de toute autre ligne. Rien ne part sans « Enregistrer les
 * décisions » : le geste reste celui du praticien, ligne par ligne réversible.
 */
export function choixInitial(ligne: Pick<LigneLue, 'analytePropose' | 'preMarquage'>): Saisie['choix'] {
  return ligne.analytePropose !== null && ligne.preMarquage === null ? 'valider' : null;
}

/**
 * Les JUMELLES d'une ligne imprimée dans une SECONDE UNITÉ ([[D-270]]) : les
 * lignes du même import qui portent le même analyte proposé, au même instant
 * de prélèvement lu, et que « Valider » attend d'office (unité du catalogue).
 * Le laboratoire imprime la même mesure deux fois (g/L et mmol/L) ; la seconde
 * ne peut que s'écarter, aucune conversion ([[D-157]]). Vide ⇒ la ligne reste
 * à trancher : c'est alors la seule mesure de cet analyte.
 */
export function jumellesEnUniteCatalogue(
  ligne: Pick<LigneLue, 'id' | 'analytePropose' | 'preMarquage' | 'preleveLeLu'>,
  lignes: readonly Pick<LigneLue, 'id' | 'statut' | 'analytePropose' | 'preMarquage' | 'preleveLeLu'>[],
): string[] {
  if (ligne.preMarquage !== 'unite_divergente' || ligne.analytePropose === null || ligne.preleveLeLu === null) return [];
  return lignes
    .filter(
      l =>
        l.id !== ligne.id &&
        l.statut === 'proposee' &&
        l.analytePropose === ligne.analytePropose &&
        l.preleveLeLu === ligne.preleveLeLu &&
        choixInitial(l) === 'valider',
    )
    .map(l => l.id);
}

function saisieInitiale(ligne: LigneLue, lignes: readonly LigneLue[]): Saisie {
  const jumelles = jumellesEnUniteCatalogue(ligne, lignes);
  return {
    ...(jumelles.length > 0 ? { jumelles } : {}),
    choix: jumelles.length > 0 ? 'ecarter' : choixInitial(ligne),
    analyteCode: ligne.analytePropose ?? '',
    valeur: ligne.valeurLue,
    ...champsDepuisInstant(ligne.preleveLeLu, ligne.heureLue),
    motif: ligne.preMarquage ?? 'ecartee_par_praticien',
  };
}

async function lireJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function ImportCompteRenduPanel({
  idPatient,
  analytes,
  mesures,
  onResultatsEnregistres,
  compteRenduDemande,
}: {
  idPatient: string;
  analytes: AnalyteChoix[];
  mesures: MesureAuDossier[];
  onResultatsEnregistres: () => Promise<void>;
  /** Compte rendu ouvert à l'arrivée — la carte du Fil le désigne ([[D-268]]). */
  compteRenduDemande?: string;
}) {
  const [liste, setListe] = useState<CompteRenduListe[]>([]);
  const [lectureListe, setLectureListe] = useState<'chargement' | 'ok' | 'erreur'>('chargement');
  const [detail, setDetail] = useState<CompteRenduLu | null>(null);
  const [fichier, setFichier] = useState<File | null>(null);
  const [saisies, setSaisies] = useState<Record<string, Saisie>>({});
  const [refusParLigne, setRefusParLigne] = useState<Record<string, string>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [retraitArme, setRetraitArme] = useState(false);
  /** L'écart d'un document transmis, armé : le motif reste à choisir avant de confirmer. */
  const [ecartArme, setEcartArme] = useState(false);
  const [motifEcartDocument, setMotifEcartDocument] = useState<MotifEcartDocument | null>(null);
  const [relanceArmee, setRelanceArmee] = useState(false);
  /** Refaire le masquage de l'identité alors qu'un masquage existe déjà ([[D-284]] §5). */
  const [remasquage, setRemasquage] = useState(false);
  /** Remonte le champ fichier natif, qui garde sinon le nom d'un fichier déjà déposé. */
  const [cleFichier, setCleFichier] = useState(0);
  /** Fait avancer la relecture même quand une relecture échoue (sans nouveau détail). */
  const [tic, setTic] = useState(0);
  /**
   * Le compte rendu OUVERT : toute réponse d'un autre (relecture en vol au
   * moment d'en ouvrir un second) est ignorée (revue de la PR 2b, P2-2).
   */
  const ouvertRef = useRef<string | null>(null);
  /**
   * La dernière demande d'arrivée servie : ouvrir ensuite un autre compte rendu
   * n'y ramène pas, une demande NOUVELLE (autre carte, même fiche) est servie.
   */
  const demandeServieRef = useRef<string | null>(null);
  const racineRef = useRef<HTMLDivElement>(null);
  /**
   * Les actes de lecture des imports ouverts ([[D-268]], BP-10) — `null` tant
   * que la route ne les rend pas (drapeau `WN_BIO_LECTURE_ENABLED` éteint).
   */
  const [actesLecture, setActesLecture] = useState<Record<string, ActeLectureLu[]> | null>(null);
  const [actesLectureIndisponibles, setActesLectureIndisponibles] = useState(false);
  const bioLectureEnabled = useBioLectureEnabled();

  const urlDossier = `idPatient=${encodeURIComponent(idPatient)}`;

  const chargerListe = useCallback(async () => {
    try {
      const response = await fetch(`/api/praticien/biologie/import?${urlDossier}`);
      const payload = await lireJson<{ ok: boolean; comptesRendus?: CompteRenduListe[] }>(response);
      if (response.ok && payload?.ok) {
        setListe(payload.comptesRendus ?? []);
        setLectureListe('ok');
      } else {
        setLectureListe('erreur');
      }
    } catch {
      setLectureListe('erreur');
    }
  }, [urlDossier]);

  const chargerDetail = useCallback(
    async (idCompteRendu: string): Promise<boolean> => {
      try {
        const response = await fetch(
          `/api/praticien/biologie/import/compte-rendu?${urlDossier}&idCompteRendu=${encodeURIComponent(idCompteRendu)}`,
        );
        const payload = await lireJson<{
          ok: boolean;
          compteRendu?: CompteRenduLu;
          actesLecture?: Record<string, ActeLectureLu[]>;
          actesLectureIndisponibles?: boolean;
          error?: string;
        }>(response);
        if (ouvertRef.current !== idCompteRendu) return false;
        if (!response.ok || !payload?.ok || !payload.compteRendu) {
          setErreur(payload?.error ?? 'Le compte rendu n’a pas pu être lu.');
          return false;
        }
        const lu = payload.compteRendu;
        setDetail(lu);
        setActesLecture(payload.actesLecture ?? null);
        setActesLectureIndisponibles(payload.actesLectureIndisponibles === true);
        // Les saisies en cours survivent à une relecture ; une ligne décidée sort.
        const lignes = lu.imports.find(i => i.courant)?.lignes ?? [];
        setSaisies(avant => {
          const apres: Record<string, Saisie> = {};
          for (const ligne of lignes) {
            if (ligne.statut === 'proposee') apres[ligne.id] = avant[ligne.id] ?? saisieInitiale(ligne, lignes);
          }
          return apres;
        });
        return true;
      } catch {
        if (ouvertRef.current === idCompteRendu) setErreur('Le compte rendu n’a pas pu être lu.');
        return false;
      }
    },
    [urlDossier],
  );

  useEffect(() => {
    void chargerListe();
  }, [chargerListe]);

  const courant = detail?.imports.find(i => i.courant) ?? null;
  const marques = detail ? marquesDatees(detail, bioLectureEnabled ? actesLecture : null) : null;
  // Une lecture demandée à la file ([[D-282]]) court, même sans import encore
  // ouvert ou avec un import périmé : le processus de fond la reprend. Elle
  // n'est jamais « interrompue » tant que le travail est ouvert.
  const lectureDemandee = detail?.lectureDemandee === true;
  const enCours = lectureDemandee || courant?.statut === 'en_cours';
  const interrompu = !lectureDemandee && courant?.statut === 'en_cours' && courant.perime;

  // Relecture tant que la lecture court ; un import abandonné (processus mort)
  // n'est plus relu : la péremption le clora à la prochaine tentative. Une
  // relecture qui échoue n'arrête pas le suivi (`tic`, revue P2-4) ; celle qui
  // aboutit efface l'erreur qu'avait laissée la précédente.
  useEffect(() => {
    if (!detail || !enCours || interrompu) return;
    const idCompteRendu = detail.id;
    const minuterie = setTimeout(() => {
      void (async () => {
        if (await chargerDetail(idCompteRendu)) {
          setErreur(null);
          await chargerListe();
        }
        setTic(t => t + 1);
      })();
    }, INTERVALLE_RELECTURE_MS);
    return () => clearTimeout(minuterie);
  }, [detail, enCours, interrompu, tic, chargerDetail, chargerListe]);

  const ouvrir = useCallback(
    async (idCompteRendu: string) => {
      ouvertRef.current = idCompteRendu;
      setDetail(null);
      setActesLecture(null);
      setActesLectureIndisponibles(false);
      setErreur(null);
      setInfo(null);
      setRefusParLigne({});
      setRetraitArme(false);
      setEcartArme(false);
      setMotifEcartDocument(null);
      setRelanceArmee(false);
      setRemasquage(false);
      setSaisies({});
      await chargerDetail(idCompteRendu);
    },
    [chargerDetail],
  );

  // Arrivée par la carte « compte rendu à lire » : le compte rendu désigné
  // s'ouvre et le panneau vient à l'écran. Un identifiant inconnu ou étranger
  // au dossier est refusé par la route (404) : le message d'échec habituel.
  useEffect(() => {
    if (!compteRenduDemande || demandeServieRef.current === compteRenduDemande) return;
    demandeServieRef.current = compteRenduDemande;
    racineRef.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
    void ouvrir(compteRenduDemande);
  }, [compteRenduDemande, ouvrir]);

  async function deposer() {
    if (!fichier) return;
    setOccupe(true);
    setErreur(null);
    setInfo(null);
    try {
      const form = new FormData();
      form.append('fichier', fichier);
      const response = await fetch(`/api/praticien/biologie/import/depot?${urlDossier}`, {
        method: 'POST',
        body: form,
      });
      const payload = await lireJson<{ ok: boolean; idCompteRendu?: string; reason?: string; error?: string }>(response);
      await chargerListe();
      if (payload?.idCompteRendu) {
        await ouvrir(payload.idCompteRendu);
        setFichier(null);
        setCleFichier(c => c + 1);
      }
      if (!response.ok || !payload?.ok) {
        // Un document déjà déposé n'est pas une panne : on ouvre le premier dépôt.
        setErreur(payload?.error ?? 'Le compte rendu n’a pas pu être déposé.');
      }
    } catch {
      setErreur('Le compte rendu n’a pas pu être déposé.');
    } finally {
      setOccupe(false);
    }
  }

  async function lancerLecture() {
    if (!detail) return;
    setOccupe(true);
    setErreur(null);
    setRelanceArmee(false);
    try {
      const response = await fetch('/api/praticien/biologie/import/extraction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idPatient, idCompteRendu: detail.id }),
      });
      const payload = await lireJson<{ ok: boolean; reason?: string; error?: string }>(response);
      // Un 409 `extraction_en_cours` se DIT aussi : l'écran relit, mais le praticien sait pourquoi.
      if (!response.ok || !payload?.ok) setErreur(payload?.error ?? 'La lecture n’a pas pu être lancée.');
      await chargerDetail(detail.id);
      await chargerListe();
    } catch {
      setErreur('La lecture n’a pas pu être lancée.');
    } finally {
      setOccupe(false);
    }
  }

  async function retirer() {
    if (!detail) return;
    setOccupe(true);
    setErreur(null);
    try {
      const response = await fetch(
        `/api/praticien/biologie/import/compte-rendu?${urlDossier}&idCompteRendu=${encodeURIComponent(detail.id)}`,
        { method: 'DELETE' },
      );
      const payload = await lireJson<{ ok: boolean; error?: string }>(response);
      if (!response.ok || !payload?.ok) {
        setErreur(payload?.error ?? 'Le dépôt n’a pas pu être retiré.');
        return;
      }
      ouvertRef.current = null;
      setDetail(null);
      setSaisies({});
      setInfo('Le dépôt a été retiré.');
      await chargerListe();
    } catch {
      setErreur('Le dépôt n’a pas pu être retiré.');
    } finally {
      setOccupe(false);
      setRetraitArme(false);
    }
  }

  async function ecarterDocument() {
    if (!detail || !motifEcartDocument) return;
    setOccupe(true);
    setErreur(null);
    try {
      const response = await fetch('/api/praticien/biologie/import/ecart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idPatient, idCompteRendu: detail.id, motif: motifEcartDocument }),
      });
      const payload = await lireJson<{ ok: boolean; error?: string }>(response);
      if (!response.ok || !payload?.ok) {
        setErreur(payload?.error ?? 'Le document n’a pas pu être écarté.');
        return;
      }
      setInfo('Le document a été écarté et effacé.');
      await chargerDetail(detail.id);
      await chargerListe();
    } catch {
      setErreur('Le document n’a pas pu être écarté.');
    } finally {
      setOccupe(false);
      setEcartArme(false);
      setMotifEcartDocument(null);
    }
  }

  function modifier(idLigne: string, patch: Partial<Saisie>) {
    // Toucher la ligne la fait sienne : un « Écarter » pré-coché ne dépend plus de sa jumelle.
    setSaisies(avant => ({ ...avant, [idLigne]: { ...avant[idLigne], ...patch, jumelles: undefined } }));
    setRefusParLigne(avant => {
      const apres = { ...avant };
      delete apres[idLigne];
      return apres;
    });
  }

  async function enregistrer() {
    if (!detail || !courant) return;
    const idCompteRendu = detail.id;
    setErreur(null);
    setInfo(null);
    const refusLocaux: Record<string, string> = {};
    const aRejuger: string[] = [];
    const decisions: Array<Record<string, unknown>> = [];
    for (const ligne of courant.lignes) {
      const s = saisies[ligne.id];
      if (!s || s.choix === null) continue;
      if (s.choix === 'ecarter') {
        // [[D-270]] : la seconde unité ne s'écarte d'office qu'avec sa mesure
        // dans l'unité du catalogue. Jumelle décochée ⇒ la ligne se rejuge.
        const jumelleValidee = s.jumelles?.some(id => saisies[id]?.choix === 'valider' && saisies[id]?.analyteCode === ligne.analytePropose);
        if (s.jumelles && !jumelleValidee) {
          refusLocaux[ligne.id] = 'La même mesure dans l’unité du catalogue ne part plus validée : décidez cette ligne.';
          aRejuger.push(ligne.id);
          continue;
        }
        decisions.push({ idLigne: ligne.id, decision: 'ecarter', motif: s.motif });
        continue;
      }
      const analyte = analytes.find(a => a.code === s.analyteCode);
      if (!analyte) {
        refusLocaux[ligne.id] = 'Choisissez l’analyte de cette ligne.';
        continue;
      }
      if (!unitesConcordent(ligne.uniteLue, analyte.unite)) {
        refusLocaux[ligne.id] =
          'L’unité lue n’est pas celle de l’analyte au catalogue : aucune conversion n’est faite, la ligne ne peut que s’écarter.';
        continue;
      }
      if (s.date === '') {
        refusLocaux[ligne.id] = 'Saisissez la date du prélèvement.';
        continue;
      }
      if (s.heure === '') {
        refusLocaux[ligne.id] = 'L’heure du prélèvement n’a pas été lue : saisissez-la.';
        continue;
      }
      const instant = instantDepuisParis(s.date, s.heure);
      if (!instant) {
        refusLocaux[ligne.id] = 'Cette date et cette heure n’existent pas à Paris (passage à l’heure d’été) : vérifiez la saisie.';
        continue;
      }
      decisions.push({
        idLigne: ligne.id,
        decision: 'valider',
        analyteCode: analyte.code,
        valeur: lireValeurQuantitative(s.valeur),
        preleveLe: instant.toISOString(),
      });
    }
    if (Object.keys(refusLocaux).length > 0) {
      // La ligne à rejuger repasse sur « Plus tard » (revue Copilot de #1353) :
      // un « Écarter » resté coché ne se confirmerait plus d'un clic.
      if (aRejuger.length > 0) {
        setSaisies(avant => {
          const apres = { ...avant };
          for (const id of aRejuger) apres[id] = { ...avant[id], choix: null, jumelles: undefined };
          return apres;
        });
      }
      setRefusParLigne(refusLocaux);
      setErreur('Rien n’a été enregistré : reprenez les lignes signalées.');
      return;
    }
    if (decisions.length === 0) {
      setErreur('Aucune ligne n’est décidée.');
      return;
    }

    setOccupe(true);
    try {
      const response = await fetch('/api/praticien/biologie/import/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idPatient, idImport: courant.id, decisions }),
      });
      const payload = await lireJson<{
        ok: boolean;
        validees?: number;
        ecartees?: number;
        documentPurge?: boolean;
        error?: string;
        lignes?: Array<{ idLigne: string | null; index: number; error: string }>;
      }>(response);
      if (!response.ok || !payload?.ok) {
        const parLigne: Record<string, string> = {};
        for (const r of payload?.lignes ?? []) {
          const id = r.idLigne ?? (decisions[r.index]?.idLigne as string | undefined);
          if (id) parLigne[id] = r.error;
        }
        setRefusParLigne(parLigne);
        setErreur(payload?.error ?? 'Les décisions n’ont pas pu être enregistrées.');
        return;
      }
      setRefusParLigne({});
      setInfo(
        `${payload.validees ?? 0} mesure(s) enregistrée(s), ${payload.ecartees ?? 0} ligne(s) écartée(s).` +
          (payload.documentPurge ? ' Toutes les lignes sont décidées : le document a été effacé.' : ''),
      );
      await chargerDetail(idCompteRendu);
      await chargerListe();
      if ((payload.validees ?? 0) > 0) await onResultatsEnregistres();
    } catch {
      setErreur('Les décisions n’ont pas pu être enregistrées.');
    } finally {
      setOccupe(false);
    }
  }

  // RELANCER LA LECTURE (LOT-09) : une lecture aboutie se relit tant qu'aucune
  // ligne d'aucune lecture de ce compte rendu n'est validée — le serveur le
  // refuse de toute façon (`ligne_validee`). La lecture précédente et ses
  // écarts restent consignés ; seules les lignes de la nouvelle se décident.
  const aUneLigneValidee = detail?.imports.some(i => i.lignes.some(l => l.statut === 'validee')) ?? false;
  const transmisParLePatient = detail?.origine === 'patient';
  // L'IDENTITÉ MASQUÉE AVANT TOUTE LECTURE ([[D-284]] §5) : seules les pages
  // masquées partent ; sans masquage, ni lecture ni relance. Le masquage se
  // fait (ou se refait) tant qu'aucune lecture ne court et qu'aucune ligne
  // n'est validée.
  const masque = detail?.masquage ?? null;
  const peutMasquer = detail !== null && !detail.purgeLe && !lectureDemandee && (!enCours || interrompu) && !aUneLigneValidee;
  const masquageOuvert = peutMasquer && (masque === null || remasquage);
  const peutLancer = detail !== null && !detail.purgeLe && !lectureDemandee && (courant === null || interrompu) && !aUneLigneValidee
    && masque !== null && !masquageOuvert;
  const peutRelancer = detail !== null && !detail.purgeLe && !lectureDemandee && courant?.statut === 'extrait' && !aUneLigneValidee
    && masque !== null && !masquageOuvert;
  const lignesProposees = courant?.statut === 'extrait' ? courant.lignes.filter(l => l.statut === 'proposee') : [];
  const lignesDecidees = courant?.statut === 'extrait' ? courant.lignes.filter(l => l.statut !== 'proposee') : [];
  // Deux repliés (demande du responsable, 2026-10-07) : seules les lignes à
  // TRANCHER (« Plus tard » d'office : signalées ou non rapprochées) restent
  // déployées. Le partage suit le choix INITIAL ([[D-260]]), pas la saisie :
  // une ligne ne saute pas d'une liste à l'autre sous le clic.
  // Troisième repli ([[D-270]]) : la seconde unité d'une mesure rapprochée.
  const lignesSecondeUnite = lignesProposees.filter(l => jumellesEnUniteCatalogue(l, lignesProposees).length > 0);
  const lignesATrancher = lignesProposees.filter(l => choixInitial(l) === null && !lignesSecondeUnite.includes(l));
  const lignesPretes = lignesProposees.filter(l => choixInitial(l) !== null);
  const pretesRefusees = lignesPretes.some(l => refusParLigne[l.id] !== undefined);
  // Le dépli sur refus TIENT (revue Copilot de #1351) : la première correction
  // efface le refus (`modifier`), et la liste se refermerait en pleine saisie.
  const [pretesDepliees, setPretesDepliees] = useState(false);
  useEffect(() => {
    if (pretesRefusees) setPretesDepliees(true);
  }, [pretesRefusees]);
  const pretesOuvertes = lignesATrancher.length === 0 || pretesRefusees || pretesDepliees;
  const secondesRefusees = lignesSecondeUnite.some(l => refusParLigne[l.id] !== undefined);
  const [secondesDepliees, setSecondesDepliees] = useState(false);
  useEffect(() => {
    if (secondesRefusees) setSecondesDepliees(true);
  }, [secondesRefusees]);
  const secondesOuvertes = lignesATrancher.length === 0 || secondesRefusees || secondesDepliees;
  const nbValidees = lignesDecidees.filter(l => l.statut === 'validee').length;
  const nbEcartees = lignesDecidees.length - nbValidees;

  return (
    <div ref={racineRef} className="mt-4 rounded-lg border border-border p-3">
      <h4 className="text-sm font-medium text-foreground">Importer un compte rendu de laboratoire</h4>
      <p className="mt-1 text-xs text-muted-foreground">
        Avant la lecture, vous masquez l’identité du patient sur chaque page : seules les pages masquées sont
        transmises au service de lecture (Anthropic), jamais le document d’origine. Les lignes lues vous sont proposées : rien
        n’entre au dossier sans votre validation, ligne par ligne. Dates et heures en heure de Paris.
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Compte rendu (PDF de 10 Mo, ou photo JPEG, PNG, WebP de 3,75 Mo au plus)
          <input
            key={cleFichier}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            disabled={occupe}
            onChange={e => setFichier(e.target.files?.[0] ?? null)}
            className="text-sm text-foreground"
          />
        </label>
        <button type="button" onClick={() => void deposer()} disabled={occupe || !fichier} className={BOUTON}>
          Déposer
        </button>
      </div>

      {lectureListe === 'erreur' && (
        <p className="mt-2 text-xs text-status-danger">La liste des comptes rendus n’a pas pu être lue.</p>
      )}
      {lectureListe === 'ok' && liste.length > 0 && (
        <ul className="mt-3 space-y-1" aria-label="Comptes rendus déposés">
          {liste.map(c => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => void ouvrir(c.id)}
                disabled={occupe}
                aria-current={detail?.id === c.id ? 'true' : undefined}
                className={`${BOUTON} w-full text-left ${detail?.id === c.id ? 'font-medium' : ''}`}
              >
                Déposé le {formatDateHeure(c.deposeLe)}
                {c.origine === 'patient' && ' — transmis par le patient'}
                {c.dernierImport && ` — ${LIBELLES_STATUT[c.dernierImport.statut] ?? c.dernierImport.statut}`}
                {c.purgeLe && ' — document effacé'}
              </button>
            </li>
          ))}
        </ul>
      )}

      {detail && (
        <div className="mt-3 rounded-lg border border-border/60 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-foreground">
              Compte rendu déposé le {formatDateHeure(detail.deposeLe)}
              {transmisParLePatient && ' — transmis par le patient'}
              {courant?.laboratoireLu && ` — ${courant.laboratoireLu}`}
            </p>
            {/* LE REGARD AVANT LA LECTURE ([[D-269]] §1) : le document s'ouvre
                dans un onglet, servi par la route du praticien ; rien ne part
                chez Anthropic. Plus rien à montrer une fois effacé. */}
            {!detail.purgeLe && (
              <a
                href={`/api/praticien/biologie/import/document?${urlDossier}&idCompteRendu=${encodeURIComponent(detail.id)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`${BOUTON} inline-flex items-center`}
              >
                Voir le document
              </a>
            )}
            {transmisParLePatient ? (
              // Écarter, jamais retirer ([[D-269]] §3). Rien à écarter une fois
              // le document effacé ; la base refuse aussi après une ligne validée.
              !detail.purgeLe && !aUneLigneValidee && !ecartArme && (
                <button type="button" onClick={() => setEcartArme(true)} disabled={occupe || (enCours && !interrompu)} className={BOUTON}>
                  Écarter ce document
                </button>
              )
            ) : retraitArme ? (
              <span className="flex gap-2">
                <button type="button" onClick={() => void retirer()} disabled={occupe} className={BOUTON}>
                  Confirmer le retrait
                </button>
                <button type="button" onClick={() => setRetraitArme(false)} disabled={occupe} className={BOUTON}>
                  Annuler
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setRetraitArme(true)} disabled={occupe || (enCours && !interrompu)} className={BOUTON}>
                Retirer ce dépôt
              </button>
            )}
          </div>
          {marques?.lignesValideesLe && (
            <p className="mt-1 text-xs text-muted-foreground" data-marques-datees>
              Lignes validées — dernière le {formatDateHeure(marques.lignesValideesLe)}
              {marques.lecture === 'non_consignee' && ' · Lecture non consignée'}
              {marques.lecture && marques.lecture !== 'non_consignee'
                && ` · Lecture consignée le ${formatDateHeure(marques.lecture.consigneeLe)}`}
            </p>
          )}

          {/* LES COMMENTAIRES DU COMPTE RENDU ENTIER ([[D-278]] §3), tels
              qu'imprimés, attribués au laboratoire, sans rien en conclure.
              Une lecture antérieure à `bio-extraction-v4` n'en a relevé
              aucun : son silence ne dit pas qu'il n'y en avait pas. Le
              document effacé ne se relit plus : on renvoie à l'original. */}
          {courant && courant.statut === 'extrait' && (
            !courant.commentairesReleves ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Les commentaires du laboratoire n’ont pas été relevés par cette lecture : à lire sur {detail.purgeLe ? 'l’original du laboratoire' : 'le compte rendu'}.
              </p>
            ) : (
              <>
                {courant.commentairesLus !== null && (
                  <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">
                    Commentaires du laboratoire sur le compte rendu :{' '}
                    <span data-fait-laboratoire="commentaire">{courant.commentairesLus}</span>
                  </p>
                )}
                {courant.commentairesNonTranscrits && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Commentaires du laboratoire imprimés mais trop longs pour être transcrits : à lire sur {detail.purgeLe ? 'l’original du laboratoire' : 'le compte rendu'}.
                  </p>
                )}
              </>
            )
          )}

          {ecartArme && (
            <fieldset className="mt-2 rounded-lg border border-border/60 p-2">
              <legend className="px-1 text-xs text-muted-foreground">
                Écarter ce document l’efface aussitôt, sans retour possible. Le patient le verra « refusé » ou « illisible ».
              </legend>
              <div className="flex flex-wrap gap-3">
                {(Object.keys(LIBELLES_MOTIF_ECART_DOCUMENT) as MotifEcartDocument[]).map(motif => (
                  <label key={motif} className="flex min-h-11 items-center gap-2 text-sm text-foreground">
                    <input
                      type="radio"
                      name="motif-ecart-document"
                      value={motif}
                      checked={motifEcartDocument === motif}
                      onChange={() => setMotifEcartDocument(motif)}
                      disabled={occupe}
                    />
                    {LIBELLES_MOTIF_ECART_DOCUMENT[motif]}
                  </label>
                ))}
              </div>
              <span className="mt-2 flex gap-2">
                <button type="button" onClick={() => void ecarterDocument()} disabled={occupe || !motifEcartDocument} className={BOUTON}>
                  Confirmer l’écart
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEcartArme(false);
                    setMotifEcartDocument(null);
                  }}
                  disabled={occupe}
                  className={BOUTON}
                >
                  Annuler
                </button>
              </span>
            </fieldset>
          )}

          {transmisParLePatient && !detail.purgeLe && detail.imports.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Transmis par le patient : ouvrez-le (« Voir le document ») et vérifiez qu’il s’agit bien de son compte
              rendu avant d’en masquer l’identité et de lancer la lecture. Sinon, écartez-le.
            </p>
          )}

          {/* L'échec de la DERNIÈRE tentative seulement : un échec qu’une lecture réussie a suivi ne se rappelle pas. */}
          {detail.imports
            .slice(0, 1)
            .filter(i => i.statut === 'echec')
            .map(i => (
              <p key={i.id} className="mt-2 text-xs text-muted-foreground">
                Dernière lecture échouée ({formatDateHeure(i.lanceLe)}) :{' '}
                {MESSAGES_ECHEC[i.motifEchec ?? ''] ?? 'échec.'}
              </p>
            ))}

          {detail.purgeLe && (
            <p className="mt-2 text-xs text-muted-foreground">
              Document effacé le {formatDateHeure(detail.purgeLe)}
              {detail.motifPurge === 'echeance'
                ? ', 30 jours après son dépôt'
                : detail.motifPurge === 'ecarte'
                  ? `, écarté (${(LIBELLES_MOTIF_ECART_DOCUMENT[detail.motifEcart as MotifEcartDocument] ?? 'motif inconnu').toLowerCase()})`
                  : ', toutes ses lignes décidées'} :
              il ne peut plus être relu.{' '}
              {detail.motifPurge === 'ecarte'
                ? 'Ses lignes lues sont effacées.'
                : detail.motifPurge === 'echeance'
                  ? 'Seules les lignes validées restent.'
                  : 'Les lignes validées restent ; les autres s’effacent 30 jours après le dépôt.'}
            </p>
          )}

          {enCours && !interrompu && (
            <p role="status" className="mt-2 text-sm text-foreground">
              Lecture en cours — environ une minute pour un compte rendu de plusieurs pages.
            </p>
          )}
          {interrompu && (
            <p role="alert" className="mt-2 text-sm text-status-danger">
              La lecture semble interrompue : relancez-la.
            </p>
          )}
          {masque !== null && !masquageOuvert && !detail.purgeLe && (
            <p className="mt-2 text-xs text-muted-foreground">
              {masque.aucuneIdentite
                ? `Aucune identité déclarée sur ce document le ${formatDateHeure(masque.poseLe)} : ses pages partent telles quelles, jamais le document d’origine.`
                : `Identité masquée le ${formatDateHeure(masque.poseLe)} (${masque.zonesMasquees} zone(s)) : seules les pages masquées partent au service de lecture.`}
              {peutMasquer && (
                <>
                  {' '}
                  <button type="button" onClick={() => setRemasquage(true)} disabled={occupe} className="underline">
                    Refaire le masquage
                  </button>
                </>
              )}
            </p>
          )}
          {masquageOuvert && (
            <MasquageIdentite
              key={`${detail.id}-${masque?.poseLe ?? 'aucun'}`}
              urlDocument={`/api/praticien/biologie/import/document?${urlDossier}&idCompteRendu=${encodeURIComponent(detail.id)}`}
              typeMime={detail.typeMime}
              urlEnregistrement={`/api/praticien/biologie/import/masquage?${urlDossier}`}
              idCompteRendu={detail.id}
              dateNaissanceDossier={detail.dateNaissanceDossier}
              onEnregistre={async () => {
                setRemasquage(false);
                await chargerDetail(detail.id);
              }}
              onAnnuler={masque !== null ? () => setRemasquage(false) : undefined}
            />
          )}
          {peutLancer && (
            <button type="button" onClick={() => void lancerLecture()} disabled={occupe} className={`${BOUTON_PRIMAIRE} mt-2`}>
              Lancer la lecture
            </button>
          )}
          {peutRelancer && (relanceArmee ? (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">
                Les pages masquées sont transmises à nouveau au service de lecture. Si la nouvelle lecture aboutit, les lignes
                de la lecture actuelle ne se décideront plus ; celles déjà écartées restent consignées.
              </p>
              <span className="mt-2 flex gap-2">
                <button type="button" onClick={() => void lancerLecture()} disabled={occupe} className={BOUTON_PRIMAIRE}>
                  Confirmer la relance
                </button>
                <button type="button" onClick={() => setRelanceArmee(false)} disabled={occupe} className={BOUTON}>
                  Annuler
                </button>
              </span>
            </div>
          ) : (
            <button type="button" onClick={() => setRelanceArmee(true)} disabled={occupe} className={`${BOUTON} mt-2`}>
              Relancer la lecture
            </button>
          ))}

          {courant?.statut === 'extrait' && (
            <>
              {courant.lignes.length === 0 && (
                <p className="mt-2 text-sm text-muted-foreground">Aucune ligne n’a été relevée sur ce compte rendu.</p>
              )}
              {lignesATrancher.length > 0 && (
                <ol className="mt-3 space-y-2">
                  {lignesATrancher.map(ligne => (
                    <LigneImport
                      key={ligne.id}
                      ligne={ligne}
                      saisie={saisies[ligne.id]}
                      refus={refusParLigne[ligne.id]}
                      analytes={analytes}
                      mesures={mesures}
                      disabled={occupe}
                      documentEfface={Boolean(detail?.purgeLe)}
                      onModifier={patch => modifier(ligne.id, patch)}
                    />
                  ))}
                </ol>
              )}
              {/* Les lignes rapprochées, « Valider » pré-positionné : repliées
                  tant qu'il reste à trancher, mais le titre DIT qu'elles partent
                  validées à l'enregistrement. Un refus du serveur sur l'une
                  d'elles, ou plus rien à trancher, les déplie. */}
              {lignesPretes.length > 0 && (
                <details
                  key={pretesOuvertes ? 'deplie' : 'replie'}
                  open={pretesOuvertes}
                  className="mt-3"
                >
                  <summary className="cursor-pointer text-sm font-semibold text-foreground">
                    Lignes rapprochées, « Valider » pré-coché ({lignesPretes.length}) — validées à l’enregistrement,
                    sauf changement
                  </summary>
                  <ol className="mt-2 space-y-2">
                    {lignesPretes.map(ligne => (
                      <LigneImport
                        key={ligne.id}
                        ligne={ligne}
                        saisie={saisies[ligne.id]}
                        refus={refusParLigne[ligne.id]}
                        analytes={analytes}
                        mesures={mesures}
                        disabled={occupe}
                        documentEfface={Boolean(detail?.purgeLe)}
                        onModifier={patch => modifier(ligne.id, patch)}
                      />
                    ))}
                  </ol>
                </details>
              )}
              {/* La même mesure imprimée dans une seconde unité ([[D-270]]) :
                  « Écarter » pré-coché tant que sa jumelle part validée. */}
              {lignesSecondeUnite.length > 0 && (
                <details
                  key={secondesOuvertes ? 'deplie' : 'replie'}
                  open={secondesOuvertes}
                  className="mt-3"
                >
                  <summary className="cursor-pointer text-sm font-semibold text-foreground">
                    Mesures imprimées dans une seconde unité, « Écarter » pré-coché ({lignesSecondeUnite.length}) — écartées
                    à l’enregistrement, sauf changement
                  </summary>
                  <ol className="mt-2 space-y-2">
                    {lignesSecondeUnite.map(ligne => (
                      <LigneImport
                        key={ligne.id}
                        ligne={ligne}
                        saisie={saisies[ligne.id]}
                        refus={refusParLigne[ligne.id]}
                        analytes={analytes}
                        mesures={mesures}
                        disabled={occupe}
                        documentEfface={Boolean(detail?.purgeLe)}
                        onModifier={patch => modifier(ligne.id, patch)}
                      />
                    ))}
                  </ol>
                </details>
              )}
              {/* Les lignes déjà décidées, repliées tant qu'il en reste à
                  décider (demande du responsable, 2026-10-07 : trop de
                  défilement). Dépliées d'office une fois tout décidé : c'est
                  la restitution que l'acte de lecture atteste ([[D-268]]). */}
              {lignesDecidees.length > 0 && (
                <details
                  key={lignesProposees.length > 0 ? 'replie' : 'deplie'}
                  open={lignesProposees.length === 0}
                  className="mt-3"
                >
                  <summary className="cursor-pointer text-sm font-semibold text-foreground">
                    Lignes déjà décidées ({nbValidees} validée{nbValidees > 1 ? 's' : ''}, {nbEcartees} écartée
                    {nbEcartees > 1 ? 's' : ''})
                  </summary>
                  <ol className="mt-2 space-y-2">
                    {lignesDecidees.map(ligne => (
                      <LigneImport
                        key={ligne.id}
                        ligne={ligne}
                        saisie={saisies[ligne.id]}
                        refus={refusParLigne[ligne.id]}
                        analytes={analytes}
                        mesures={mesures}
                        disabled={occupe}
                        documentEfface={Boolean(detail?.purgeLe)}
                        onModifier={patch => modifier(ligne.id, patch)}
                      />
                    ))}
                  </ol>
                </details>
              )}
              {lignesProposees.length > 0 && (
                <button type="button" onClick={() => void enregistrer()} disabled={occupe} className={`${BOUTON_PRIMAIRE} mt-3`}>
                  Enregistrer les décisions
                </button>
              )}
            </>
          )}

          {/* L'acte de lecture d'un import VALIDÉ ([[D-268]]) : sous la
              restitution qu'il atteste, jamais à sa place. */}
          {bioLectureEnabled && actesLectureIndisponibles && (
            <p role="alert" className="mt-3 text-sm text-status-danger">
              L’état de lecture de ce compte rendu n’a pas pu être vérifié. Rouvrez-le pour réessayer.
            </p>
          )}
          {bioLectureEnabled && actesLecture !== null && detail.imports.map(i => (
            <LectureImportBiologique
              key={i.id}
              idPatient={idPatient}
              imp={i}
              actes={actesLecture[i.id] ?? []}
              onActe={async () => {
                await chargerDetail(detail.id);
              }}
            />
          ))}
        </div>
      )}

      {erreur && (
        <p role="alert" className="mt-2 text-sm text-status-danger">
          {erreur}
        </p>
      )}
      {info && (
        <p role="status" className="mt-2 text-sm text-foreground">
          {info}
        </p>
      )}
    </div>
  );
}

function LigneImport({
  ligne,
  saisie,
  refus,
  analytes,
  mesures,
  disabled,
  documentEfface,
  onModifier,
}: {
  ligne: LigneLue;
  saisie: Saisie | undefined;
  refus: string | undefined;
  analytes: AnalyteChoix[];
  mesures: MesureAuDossier[];
  disabled: boolean;
  /** Le document est purgé : un fait non transcrit se lit sur l'original du laboratoire. */
  documentEfface: boolean;
  onModifier: (patch: Partial<Saisie>) => void;
}) {
  const lue = `${ligne.libelleLu} : ${ligne.valeurLue}${ligne.uniteLue ? ` ${ligne.uniteLue}` : ''}`;
  const idRefus = `refus-${ligne.id}`;

  if (ligne.statut !== 'proposee' || !saisie) {
    return (
      <li className="rounded-lg border border-border/60 p-2 text-sm text-foreground">
        <span className="text-xs text-muted-foreground">p. {ligne.page} — </span>
        {lue}{' '}
        <Badge variant="neutral">
          {ligne.statut === 'validee'
            ? 'Validée'
            : `Écartée${ligne.motifEcart ? ` (${LIBELLES_MOTIF[ligne.motifEcart as MotifEcart] ?? ligne.motifEcart})` : ''}`}
        </Badge>
        <FaitsDuLaboratoire
          intervalle={ligne.intervalleLu}
          marquage={ligne.marquageLu}
          intervalleNonTranscrit={ligne.intervalleNonTranscrit}
          marquageNonTranscrit={ligne.marquageNonTranscrit}
          commentaire={ligne.commentaireLu}
          commentaireNonTranscrit={ligne.commentaireNonTranscrit}
          documentEfface={documentEfface}
        />
      </li>
    );
  }

  const nonChiffree = ligne.preMarquage === 'non_quantitative';
  const analyte = analytes.find(a => a.code === saisie.analyteCode) ?? null;
  const uniteDivergente = analyte !== null && !unitesConcordent(ligne.uniteLue, analyte.unite);
  const memeJour =
    saisie.choix === 'valider' && analyte && saisie.date !== ''
      ? mesures.filter(
          m =>
            m.analyteCode === analyte.code &&
            m.corrigeeParId === null &&
            !m.annulation &&
            champsDepuisInstant(m.preleveLe).date === saisie.date,
        )
      : [];
  const nomGroupe = `decision-${ligne.id}`;

  return (
    <li className="rounded-lg border border-border/60 p-2">
      <p className="text-sm text-foreground">
        <span className="text-xs text-muted-foreground">p. {ligne.page} — </span>
        {lue}
      </p>
      <FaitsDuLaboratoire
        intervalle={ligne.intervalleLu}
        marquage={ligne.marquageLu}
        intervalleNonTranscrit={ligne.intervalleNonTranscrit}
        marquageNonTranscrit={ligne.marquageNonTranscrit}
        commentaire={ligne.commentaireLu}
        commentaireNonTranscrit={ligne.commentaireNonTranscrit}
        documentEfface={documentEfface}
      />
      {ligne.preMarquage && (
        <p className="mt-1 text-xs text-muted-foreground">Signalé : {LIBELLES_MOTIF[ligne.preMarquage]}</p>
      )}
      {saisie.jumelles && saisie.choix === 'ecarter' && (
        <p className="mt-1 text-xs text-muted-foreground">
          La même mesure, dans l’unité du catalogue, part validée : celle-ci s’écarte, aucune conversion n’est faite.
        </p>
      )}

      <fieldset className="mt-2 flex flex-wrap gap-3 text-sm text-foreground" disabled={disabled}>
        <legend className="sr-only">Décision pour la ligne « {ligne.libelleLu} »</legend>
        <label className="flex min-h-11 items-center gap-1">
          <input
            type="radio"
            name={nomGroupe}
            checked={saisie.choix === 'valider'}
            disabled={nonChiffree}
            onChange={() => onModifier({ choix: 'valider' })}
          />
          Valider
        </label>
        <label className="flex min-h-11 items-center gap-1">
          <input
            type="radio"
            name={nomGroupe}
            checked={saisie.choix === 'ecarter'}
            onChange={() => onModifier({ choix: 'ecarter' })}
          />
          Écarter
        </label>
        <label className="flex min-h-11 items-center gap-1">
          <input
            type="radio"
            name={nomGroupe}
            checked={saisie.choix === null}
            onChange={() => onModifier({ choix: null })}
          />
          Plus tard
        </label>
      </fieldset>

      {saisie.choix === 'valider' && (
        <div className="mt-2 flex flex-wrap gap-2">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Analyte
            <select
              value={saisie.analyteCode}
              disabled={disabled}
              onChange={e => onModifier({ analyteCode: e.target.value })}
              aria-invalid={refus ? true : undefined}
              aria-describedby={refus ? idRefus : undefined}
              className={CHAMP}
            >
              <option value="">Choisir…</option>
              {analytes.map(a => (
                <option key={a.code} value={a.code}>
                  {a.libelle}
                  {a.unite ? ` (${a.unite})` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Valeur
            <input
              type="text"
              inputMode="decimal"
              value={saisie.valeur}
              disabled={disabled}
              onChange={e => onModifier({ valeur: e.target.value })}
              aria-invalid={refus ? true : undefined}
              aria-describedby={refus ? idRefus : undefined}
              className={CHAMP}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Date du prélèvement
            <input
              type="date"
              value={saisie.date}
              disabled={disabled}
              onChange={e => onModifier({ date: e.target.value })}
              aria-invalid={refus ? true : undefined}
              aria-describedby={refus ? idRefus : undefined}
              className={CHAMP}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Heure du prélèvement
            <input
              type="time"
              value={saisie.heure}
              required
              disabled={disabled}
              onChange={e => onModifier({ heure: e.target.value })}
              aria-invalid={refus ? true : undefined}
              aria-describedby={refus ? idRefus : undefined}
              className={CHAMP}
            />
          </label>
        </div>
      )}
      {saisie.choix === 'valider' && saisie.heure === '' && (
        <p className="mt-1 text-xs text-muted-foreground">L’heure n’a pas été lue sur le compte rendu : saisissez-la.</p>
      )}
      {saisie.choix === 'valider' && uniteDivergente && (
        <p className="mt-1 text-xs text-muted-foreground">
          Unité lue « {ligne.uniteLue ?? 'aucune'} », unité au catalogue « {analyte?.unite ?? 'aucune'} » : aucune
          conversion n’est faite.
        </p>
      )}
      {memeJour.length > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          Déjà au dossier ce jour-là :{' '}
          {memeJour.map(m => `${m.valeur}${m.unite ? ` ${m.unite}` : ''} à ${formatHeure(m.preleveLe)}`).join(', ')}.
        </p>
      )}

      {saisie.choix === 'ecarter' && (
        <label className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
          Motif de l’écart
          <select
            value={saisie.motif}
            disabled={disabled}
            onChange={e => onModifier({ motif: e.target.value as MotifEcart })}
            className={CHAMP}
          >
            {(Object.keys(LIBELLES_MOTIF) as MotifEcart[]).map(m => (
              <option key={m} value={m}>
                {LIBELLES_MOTIF[m]}
              </option>
            ))}
          </select>
        </label>
      )}

      {refus && (
        <p id={idRefus} className="mt-1 text-xs text-status-danger">
          {refus}
        </p>
      )}
    </li>
  );
}
