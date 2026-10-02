'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { lireValeurQuantitative, unitesConcordent, type MotifEcart } from '@/lib/biology-library/import/valeurLue';
import type { CompteRenduLu, LigneLue } from '@/lib/biology-library/import/lecture';
import type { AnalyteChoix } from './SaisieBilan';

// IMPORT D'UN COMPTE RENDU DE LABORATOIRE (BIO-INGEST LOT-02, [[D-256]]),
// derrière `WN_BIO_INGEST_ENABLED`. Quatre gestes, tous du praticien :
// déposer le PDF, lancer la lecture, décider chaque ligne, retirer un dépôt
// erroné. RIEN n'entre au dossier sans la décision « Valider » d'une ligne.
//
// LA LECTURE EST ASYNCHRONE : la route rend la main (202) et l'écran relit le
// compte rendu jusqu'à l'issue — trois pages durent ~36 s, au-delà de la
// fenêtre de 30 s du routeur. Seule l'extraction COURANTE se décide (la plus
// récente qui n'a pas échoué) : ce sont ses seules lignes affichées.
//
// L'HEURE DU PRÉLÈVEMENT EST EXIGÉE (arbitrage du 2026-10-02) : l'extraction
// garde la date seule à minuit DE PARIS quand l'heure n'est pas lue ; l'écran
// laisse alors le champ VIDE plutôt que de proposer un minuit que personne n'a
// lu, et signale les mesures du même analyte déjà au dossier ce jour-là.
// DATES ET HEURES EN HEURE DE PARIS, quel que soit le fuseau du poste : c'est
// celle du laboratoire et celle de l'extraction. Lues dans le fuseau du
// navigateur, un poste hors Paris verrait « 22:00 » la veille au lieu d'une
// heure non lue (revue de la PR 2b, P2-1).
//
// AUCUNE QUALIFICATION (`DC-27`) : une valeur lue s'affiche telle quelle,
// jamais comparée à quoi que ce soit.

export type MesureAuDossier = {
  analyteCode: string;
  valeur: number;
  unite: string | null;
  preleveLe: string;
  /** `null` ⇒ cette mesure fait foi (non corrigée). */
  corrigeeParId: string | null;
};

type CompteRenduListe = {
  id: string;
  deposeLe: string;
  dernierImport: { id: string; statut: string } | null;
};

type Saisie = {
  choix: 'valider' | 'ecarter' | null;
  analyteCode: string;
  valeur: string;
  date: string;
  heure: string;
  motif: MotifEcart;
};

const INTERVALLE_RELECTURE_MS = 3_000;

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

/** Date et heure DE PARIS d'un instant ; l'heure reste VIDE à minuit pile — elle n'a pas été lue. */
export function champsDepuisInstant(iso: string | null): { date: string; heure: string } {
  if (!iso) return { date: '', heure: '' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: '', heure: '' };
  const p = partiesParis(d);
  const heure = `${p.heure}:${p.minute}`;
  return { date: `${p.annee}-${p.mois}-${p.jour}`, heure: heure === '00:00' ? '' : heure };
}

/** L'instant d'une date et d'une heure murales DE PARIS (deux passes, pour les changements d'heure). */
export function instantDepuisParis(date: string, heure: string): Date | null {
  const j = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const h = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(heure);
  if (!j || !h) return null;
  const mural = Date.UTC(+j[1], +j[2] - 1, +j[3], +h[1], +h[2]);
  const premier = mural - decalageParis(mural);
  return new Date(mural - decalageParis(premier));
}

function formatDateHeure(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Paris' });
}

function formatHeure(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
}

function saisieInitiale(ligne: LigneLue): Saisie {
  return {
    choix: null,
    analyteCode: ligne.analytePropose ?? '',
    valeur: ligne.valeurLue,
    ...champsDepuisInstant(ligne.preleveLeLu),
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
}: {
  idPatient: string;
  analytes: AnalyteChoix[];
  mesures: MesureAuDossier[];
  onResultatsEnregistres: () => Promise<void>;
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
  /** Remonte le champ fichier natif, qui garde sinon le nom d'un fichier déjà déposé. */
  const [cleFichier, setCleFichier] = useState(0);
  /** Fait avancer la relecture même quand une relecture échoue (sans nouveau détail). */
  const [tic, setTic] = useState(0);
  /**
   * Le compte rendu OUVERT : toute réponse d'un autre (relecture en vol au
   * moment d'en ouvrir un second) est ignorée (revue de la PR 2b, P2-2).
   */
  const ouvertRef = useRef<string | null>(null);

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
        const payload = await lireJson<{ ok: boolean; compteRendu?: CompteRenduLu; error?: string }>(response);
        if (ouvertRef.current !== idCompteRendu) return false;
        if (!response.ok || !payload?.ok || !payload.compteRendu) {
          setErreur(payload?.error ?? 'Le compte rendu n’a pas pu être lu.');
          return false;
        }
        const lu = payload.compteRendu;
        setDetail(lu);
        // Les saisies en cours survivent à une relecture ; une ligne décidée sort.
        const lignes = lu.imports.find(i => i.courant)?.lignes ?? [];
        setSaisies(avant => {
          const apres: Record<string, Saisie> = {};
          for (const ligne of lignes) {
            if (ligne.statut === 'proposee') apres[ligne.id] = avant[ligne.id] ?? saisieInitiale(ligne);
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
  const enCours = courant?.statut === 'en_cours';
  const interrompu = enCours && courant.perime;

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
      setErreur(null);
      setInfo(null);
      setRefusParLigne({});
      setRetraitArme(false);
      setSaisies({});
      await chargerDetail(idCompteRendu);
    },
    [chargerDetail],
  );

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

  function modifier(idLigne: string, patch: Partial<Saisie>) {
    setSaisies(avant => ({ ...avant, [idLigne]: { ...avant[idLigne], ...patch } }));
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
    const decisions: Array<Record<string, unknown>> = [];
    for (const ligne of courant.lignes) {
      const s = saisies[ligne.id];
      if (!s || s.choix === null) continue;
      if (s.choix === 'ecarter') {
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
        refusLocaux[ligne.id] = 'La date de prélèvement est illisible.';
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
      setInfo(`${payload.validees ?? 0} mesure(s) enregistrée(s), ${payload.ecartees ?? 0} ligne(s) écartée(s).`);
      await chargerDetail(idCompteRendu);
      await chargerListe();
      if ((payload.validees ?? 0) > 0) await onResultatsEnregistres();
    } catch {
      setErreur('Les décisions n’ont pas pu être enregistrées.');
    } finally {
      setOccupe(false);
    }
  }

  const peutLancer = detail !== null && (courant === null || interrompu);
  const lignesProposees = courant?.statut === 'extrait' ? courant.lignes.filter(l => l.statut === 'proposee') : [];

  return (
    <div className="mt-4 rounded-lg border border-border p-3">
      <h4 className="text-sm font-medium text-foreground">Importer un compte rendu de laboratoire</h4>
      <p className="mt-1 text-xs text-muted-foreground">
        Le PDF est transmis entier au service de lecture (Anthropic). Les lignes lues vous sont proposées : rien
        n’entre au dossier sans votre validation, ligne par ligne. Dates et heures en heure de Paris.
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Compte rendu (PDF, 10 Mo au plus)
          <input
            key={cleFichier}
            type="file"
            accept="application/pdf"
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
                {c.dernierImport && ` — ${LIBELLES_STATUT[c.dernierImport.statut] ?? c.dernierImport.statut}`}
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
              {courant?.laboratoireLu && ` — ${courant.laboratoireLu}`}
            </p>
            {retraitArme ? (
              <span className="flex gap-2">
                <button type="button" onClick={() => void retirer()} disabled={occupe} className={BOUTON}>
                  Confirmer le retrait
                </button>
                <button type="button" onClick={() => setRetraitArme(false)} disabled={occupe} className={BOUTON}>
                  Annuler
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setRetraitArme(true)} disabled={occupe || enCours} className={BOUTON}>
                Retirer ce dépôt
              </button>
            )}
          </div>

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
          {peutLancer && (
            <button type="button" onClick={() => void lancerLecture()} disabled={occupe} className={`${BOUTON_PRIMAIRE} mt-2`}>
              Lancer la lecture
            </button>
          )}

          {courant?.statut === 'extrait' && (
            <>
              {courant.lignes.length === 0 && (
                <p className="mt-2 text-sm text-muted-foreground">Aucune ligne n’a été relevée sur ce compte rendu.</p>
              )}
              <ol className="mt-3 space-y-2">
                {courant.lignes.map(ligne => (
                  <LigneImport
                    key={ligne.id}
                    ligne={ligne}
                    saisie={saisies[ligne.id]}
                    refus={refusParLigne[ligne.id]}
                    analytes={analytes}
                    mesures={mesures}
                    disabled={occupe}
                    onModifier={patch => modifier(ligne.id, patch)}
                  />
                ))}
              </ol>
              {lignesProposees.length > 0 && (
                <button type="button" onClick={() => void enregistrer()} disabled={occupe} className={`${BOUTON_PRIMAIRE} mt-3`}>
                  Enregistrer les décisions
                </button>
              )}
            </>
          )}
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
  onModifier,
}: {
  ligne: LigneLue;
  saisie: Saisie | undefined;
  refus: string | undefined;
  analytes: AnalyteChoix[];
  mesures: MesureAuDossier[];
  disabled: boolean;
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
      {ligne.preMarquage && (
        <p className="mt-1 text-xs text-muted-foreground">Signalé : {LIBELLES_MOTIF[ligne.preMarquage]}</p>
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
