'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { PortailSessionResponse, PortailConsultationState } from '@/app/api/portail/session/route';
import { MOTIFS_CONSULTATION } from '@/lib/consultation/motifs';
import { FICHE_SECTIONS, FICHE_CHAMPS_REQUIS } from '@/lib/consultation/fiche';
import { ANAMNESE_SECTIONS, ANAMNESE_CHAMP_REQUIS } from '@/lib/consultation/anamnese';
import {
  CHAMP_ANAMNESE_SIGNAUX,
  SECTION_ANAMNESE_SIGNAUX,
  anamneseSignaleIdeesSuicidaires,
} from '@/lib/securite/urgenceSuicide';
import { EncartUrgenceSuicide } from '@/components/patient/EncartUrgenceSuicide';
import { MessageReponseSuicide } from '@/components/patient/MessageReponseSuicide';
import { DeclarationsPatient } from '@/components/physio-traitements/DeclarationsPatient';
import {
  GROUPES_REMPLACES,
  SECTION_REPERES,
  SECTION_TRAITEMENTS,
  sansGroupesRemplaces,
} from '@/lib/physio-traitements/anamnese';
import type { AnamneseChamp, AnamneseValeurs } from '@/lib/consultation/anamnese';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { PatientButton, patientButtonClassName } from '@/components/patient/ui/PatientButton';
import { PatientField, patientInputClassName } from '@/components/patient/ui/PatientField';
import { PatientInlineMessage } from '@/components/patient/ui/PatientInlineMessage';
import { PatientPageHeader } from '@/components/patient/ui/PatientPageHeader';
import { SaveStatusIndicator, type SaveError } from '@/components/patient/SaveStatusIndicator';
import { PatientJourneyProgress, buildJourneySteps } from '@/components/patient/PatientJourneyProgress';
import { AvantDeCommencer } from '@/components/patient/trust/AvantDeCommencer';
import { AccueilConditions } from '@/components/patient/trust/ConditionsUtilisation';
import { DateNaissanceEcran, EcranCircuitMineur } from '@/components/patient/DateNaissanceEcran';
import type { StatutAge } from '@/lib/patient/gardeAge';
import { DocumentTrust } from '@/components/patient/trust/DocumentTrust';
import { getDocumentCourant } from '@/lib/trust/contenus/registre';
import {
  BOUTON_VERS_SITUATION,
  DESTINATION_RECONNEXION,
  LIEN_RECONNEXION,
  TEXTES_BROUILLON_ENTREE,
  TITRE_SITUATION,
} from './textesEntree';

// Repères « Section i / N » et « Étape n sur 4 » : gardés dans l'entrée seule
// ([[D-333]] §1, famille 1, précision du 2026-11-12). Surtitre du prototype
// PAT-2 : petites capitales espacées, texte atténué plein (pas `/70`).
const CLASSE_REPERE = 'mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground';

// T-36 sous « Session expirée. Reconnectez-vous. » ([[D-481]], complément
// DOC-4, Q5a). Navigation pleine page, dans le même onglet : la connexion
// relit ses conditions d'ouverture et le layout relit le cookie ; par Google,
// le retour mène à `/portail/<idPatient>` dans ce même onglet, où le brouillon
// (`sessionStorage`) est restauré. Par un lien reçu par e-mail, ouvert en
// général dans un nouvel onglet, il ne l'est pas.
function LienReconnexion() {
  return (
    // eslint-disable-next-line @next/next/no-html-link-for-pages -- pleine page voulue (voir ci-dessus).
    <a href={DESTINATION_RECONNEXION} className={patientButtonClassName('ghost')}>
      {LIEN_RECONNEXION}
    </a>
  );
}

// ─── autosave locale minimale (gate/fiche/anamnèse n'ont pas de idAssignation
// avant l'onboarding — clé scopée par patient plutôt que par assignation, sur
// le même principe que web/src/lib/questionnaire-draft.ts).
//
// La clé porte l'`idPatient` de la session vérifiée, jamais le jeton de l'URL.
// Deux raisons : le jeton est un secret d'accès et n'a rien à faire dans le
// stockage du navigateur ; et il est appelé à changer (lien magique à
// consommation unique, gate G4) — un brouillon indexé dessus deviendrait
// introuvable au lien suivant, alors que la personne, elle, n'a pas changé.
// ────────────────────────────────────────────────────────────────────────────
type WizardDraftKind = 'fiche' | 'anamnese';

// Fiche/anamnèse contiennent des données d'identité et de santé (plus
// sensibles qu'un simple brouillon de réponses) sur un lien token parfois
// utilisé depuis un appareil partagé : le brouillon local expire donc après
// un délai, au lieu d'être conservé indéfiniment.
const WIZARD_DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const MESSAGE_LIGNE_OUVERTE = 'Enregistrez ou annulez la ligne en cours avant de continuer.';
const MESSAGE_PARTIE_ILLISIBLE = 'Une partie de votre fiche n’a pas pu être chargée : réessayez avant de continuer.';

type WizardDraftValidator<T> = (value: unknown) => value is T;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (!isPlainObject(value)) return false;
  return Object.values(value).every(v => typeof v === 'string');
}

function isAnamneseValeursRecord(value: unknown): value is AnamneseValeurs {
  if (!isPlainObject(value)) return false;
  return Object.values(value).every((v) => {
    if (typeof v === 'string') return true;
    if (!Array.isArray(v)) return false;
    return v.every((item) => {
      if (typeof item === 'string') return true;
      if (!isPlainObject(item)) return false;
      return Object.values(item).every(field => typeof field === 'string');
    });
  });
}

function isAnamneseWizardDraft(value: unknown): value is { valeurs: AnamneseValeurs; motif: string } {
  if (!isPlainObject(value)) return false;
  if (typeof value.motif !== 'string') return false;
  return isAnamneseValeursRecord(value.valeurs);
}

function wizardDraftKey(kind: WizardDraftKind, idPatient: string): string {
  return `wellneuro:wizard-draft:${kind}:${idPatient}`;
}
function wizardDraftSavedAtKey(kind: WizardDraftKind, idPatient: string): string {
  return `wellneuro:wizard-draft-meta:${kind}:${idPatient}`;
}

// Pas d'identité, pas de brouillon : mieux vaut ne rien conserver qu'écrire
// dans un compartiment commun à tous les patients de l'appareil.
function readWizardDraft<T>(kind: WizardDraftKind, idPatient: string, validate: WizardDraftValidator<T>): T | null {
  if (typeof window === 'undefined' || !idPatient) return null;
  try {
    const savedAt = readWizardDraftSavedAt(kind, idPatient);
    if (savedAt && Date.now() - savedAt.getTime() > WIZARD_DRAFT_TTL_MS) {
      clearWizardDraft(kind, idPatient);
      return null;
    }
    const raw = window.sessionStorage.getItem(wizardDraftKey(kind, idPatient));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return validate(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
// Rend l'heure de CETTE écriture si elle a réussi, `null` sinon ([[D-481]],
// complément DOC-4, Q6b) : l'écran ne confirme la conservation qu'après une
// écriture réussie, et jamais avec l'heure d'une sauvegarde antérieure.
function writeWizardDraft(kind: WizardDraftKind, idPatient: string, value: unknown): Date | null {
  if (typeof window === 'undefined' || !idPatient) return null;
  try {
    const maintenant = new Date();
    window.sessionStorage.setItem(wizardDraftKey(kind, idPatient), JSON.stringify(value));
    window.sessionStorage.setItem(wizardDraftSavedAtKey(kind, idPatient), maintenant.toISOString());
    return maintenant;
  } catch {
    // Quota, mode privé : la saisie continue, sans promesse de conservation.
    // L'heure d'une écriture antérieure ne doit pas survivre à l'échec.
    try {
      window.sessionStorage.removeItem(wizardDraftSavedAtKey(kind, idPatient));
    } catch {
      /* no-op */
    }
    return null;
  }
}
function readWizardDraftSavedAt(kind: WizardDraftKind, idPatient: string): Date | null {
  if (typeof window === 'undefined' || !idPatient) return null;
  try {
    const raw = window.sessionStorage.getItem(wizardDraftSavedAtKey(kind, idPatient));
    if (!raw) return null;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}
function clearWizardDraft(kind: WizardDraftKind, idPatient: string): void {
  if (typeof window === 'undefined' || !idPatient) return;
  try {
    window.sessionStorage.removeItem(wizardDraftKey(kind, idPatient));
    window.sessionStorage.removeItem(wizardDraftSavedAtKey(kind, idPatient));
  } catch {
    /* no-op */
  }
}

// ─── (EmailGate retiré au LOT-04) ───────────────────────────────────────────
// Plus d'entrée par jeton+email : l'accès passe par le cookie de session posé à
// l'atterrissage magic-link/Google. Sans cookie valide, la page redirige vers
// `/portail/connexion` (voir le useEffect ci-dessous) au lieu d'afficher un gate.

// ─── étape : consentement ───────────────────────────────────────────────────
function ConsentScreen({ token, email, onAccepted }: { token: string; email: string; onAccepted: () => void }) {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionExpiree, setSessionExpiree] = useState(false);

  const handleContinue = async () => {
    setError('');
    setSessionExpiree(false);
    setLoading(true);
    try {
      const res = await fetch('/api/portail/consentement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email }),
      });
      setSessionExpiree(res.status === 401);
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) setError(data.error ?? 'Erreur. Réessayez.');
      else onAccepted();
    } catch {
      setError('Erreur réseau. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  // Texte sourcé depuis le document versionné consentement_suivi (TRUST
  // LOT-02) : la version stockée en base correspond enfin au texte affiché.
  return (
    <PatientCard>
      <PatientPageHeader title="Votre consentement au suivi" />
      {/* Zone de lecture posée sur sable (prototype PAT-2) ; le texte du
          consentement ne change pas. */}
      <div className="mt-2 rounded-xl bg-lien-sand p-4">
        <DocumentTrust document={getDocumentCourant('consentement_suivi')} />
      </div>
      <label className="flex min-h-11 items-start gap-3 mt-6 cursor-pointer">
        <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} className="mt-1 accent-primary" />
        <span className="text-sm text-foreground">
          J’ai lu ces informations et j’accepte que mes données soient collectées et utilisées dans les conditions décrites ci-dessus.
        </span>
      </label>
      {error && <div className="mt-4"><PatientInlineMessage tone="error">{error}</PatientInlineMessage></div>}
      {sessionExpiree && <div className="mt-3"><LienReconnexion /></div>}
      <PatientButton
        variant="primary" disabled={!checked} loading={loading} loadingLabel="Enregistrement…"
        onClick={handleContinue} className="w-full mt-6"
      >
        Donner mon consentement
      </PatientButton>
    </PatientCard>
  );
}

// ─── étape : fiche signalétique (paginée section par section) ──────────────
function FicheForm({ token, idPatient, email, onDone }: {
  token: string; idPatient: string; email: string; onDone: () => void;
}) {
  const [valeurs, setValeurs] = useState<Record<string, string>>(() => readWizardDraft('fiche', idPatient, isStringRecord) ?? {});
  const [mentions, setMentions] = useState(false);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Heure de la dernière écriture RÉUSSIE du brouillon ; `null` après un échec.
  const [savedAt, setSavedAt] = useState<Date | null>(() => readWizardDraftSavedAt('fiche', idPatient));
  const [saveError, setSaveError] = useState<SaveError | undefined>(undefined);
  const [sessionExpiree, setSessionExpiree] = useState(false);
  const premierRendu = useRef(true);

  useEffect(() => {
    if (premierRendu.current) { premierRendu.current = false; return; }
    setSavedAt(writeWizardDraft('fiche', idPatient, valeurs));
  }, [valeurs, idPatient]);

  const set = (id: string, v: string) => setValeurs(prev => ({ ...prev, [id]: v }));
  const requisManquant = FICHE_CHAMPS_REQUIS.some(id => !(valeurs[id] ?? '').trim());

  const section = FICHE_SECTIONS[sectionIndex];
  const isLastSection = sectionIndex === FICHE_SECTIONS.length - 1;
  const sectionRequisManquant = section.champs.some(
    champ => FICHE_CHAMPS_REQUIS.includes(champ.id) && !(valeurs[champ.id] ?? '').trim(),
  );

  const soumettre = async () => {
    setError('');
    setSaveError(undefined);
    setSessionExpiree(false);
    setLoading(true);
    try {
      const res = await fetch('/api/portail/fiche', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, fiche: valeurs }),
      });
      setSessionExpiree(res.status === 401);
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) { setError(data.error ?? 'Erreur. Réessayez.'); setSaveError('submission-incomplete'); }
      else { clearWizardDraft('fiche', idPatient); onDone(); }
    } catch {
      setError('Erreur réseau. Réessayez.');
      setSaveError('network');
    } finally {
      setLoading(false);
    }
  };

  const handleSectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLastSection) { setSectionIndex(i => i + 1); window.scrollTo(0, 0); return; }
    void soumettre();
  };

  return (
    <PatientCard as="form" onSubmit={handleSectionSubmit} className="space-y-6">
      <div>
        <div className={CLASSE_REPERE}>Section {sectionIndex + 1} / {FICHE_SECTIONS.length}</div>
        <PatientPageHeader
          title="Fiche de renseignements"
          subtitle="Ces informations aident votre praticien à personnaliser votre suivi."
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-foreground">{section.titre}</legend>
        {section.champs.map(champ => {
          const requis = FICHE_CHAMPS_REQUIS.includes(champ.id);
          return (
            <PatientField key={champ.id} label={champ.label} requis={requis}>
              {champ.type === 'select' ? (
                <select value={valeurs[champ.id] ?? ''} onChange={e => set(champ.id, e.target.value)} required={requis} className={patientInputClassName}>
                  <option value="">Sélectionnez…</option>
                  {(champ.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : champ.type === 'textarea' ? (
                <textarea value={valeurs[champ.id] ?? ''} onChange={e => set(champ.id, e.target.value)} placeholder={champ.placeholder} rows={3} className={patientInputClassName} />
              ) : (
                <input type="text" value={valeurs[champ.id] ?? ''} onChange={e => set(champ.id, e.target.value)} required={requis} placeholder={champ.placeholder} className={patientInputClassName} />
              )}
            </PatientField>
          );
        })}
      </fieldset>

      {isLastSection && (
        <label className="flex min-h-11 items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={mentions} onChange={e => setMentions(e.target.checked)} className="mt-1 accent-primary" />
          <span className="text-sm text-muted-foreground">
            Je certifie l’exactitude des informations fournies. Elles sont traitées de manière confidentielle et
            uniquement dans le cadre de mon suivi (données personnelles, sans finalité de diagnostic médical).
          </span>
        </label>
      )}

      {error && <PatientInlineMessage tone="error">{error}</PatientInlineMessage>}
      {sessionExpiree && <div><LienReconnexion /></div>}
      {/* Q6b : « restent conservées » seulement si la dernière écriture a réussi. */}
      <SaveStatusIndicator savedAt={savedAt} error={savedAt ? saveError : undefined} textes={TEXTES_BROUILLON_ENTREE} />

      <div className="flex gap-3">
        {sectionIndex > 0 && (
          <PatientButton
            variant="neutral" className="flex-1"
            onClick={() => { setSectionIndex(i => i - 1); window.scrollTo(0, 0); }}
          >
            ← Précédent
          </PatientButton>
        )}
        <PatientButton
          type="submit" variant="primary" className="flex-1"
          disabled={isLastSection ? (loading || requisManquant || !mentions) : sectionRequisManquant}
          loading={loading} loadingLabel="Enregistrement…"
        >
          {isLastSection ? BOUTON_VERS_SITUATION : 'Suivant →'}
        </PatientButton>
      </div>
    </PatientCard>
  );
}

// ─── étape : anamnèse hiérarchisée (paginée section par section) ───────────
// Rendu d'un champ simple (text / textarea / radio / checkbox-multi).
function ChampSimple({ champ, valeur, onChange, requis }: {
  champ: AnamneseChamp;
  valeur: string | string[] | undefined;
  onChange: (v: string | string[]) => void;
  requis: boolean;
}) {
  if (champ.type === 'radio') {
    const courant = typeof valeur === 'string' ? valeur : '';
    return (
      <PatientField label={champ.label} requis={requis} groupe>
        <div className="flex flex-wrap gap-2">
          {(champ.options ?? []).map(opt => {
            const actif = courant === opt;
            return (
              <button
                key={opt}
                type="button"
                aria-pressed={actif}
                onClick={() => onChange(actif ? '' : opt)}
                className={`min-h-11 px-3 py-1.5 rounded-lg border text-sm transition-colors ${actif ? 'bg-primary text-primary-foreground border-primary' : 'bg-surface text-muted-foreground border-border hover:border-primary/60'}`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </PatientField>
    );
  }

  if (champ.type === 'checkbox-multi') {
    const selection = Array.isArray(valeur) ? valeur : [];
    const toggle = (opt: string) =>
      onChange(selection.includes(opt) ? selection.filter(o => o !== opt) : [...selection, opt]);
    return (
      <PatientField label={champ.label} requis={requis} groupe>
        <div className="flex flex-col gap-1.5">
          {(champ.options ?? []).map(opt => (
            <label key={opt} className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={selection.includes(opt)} onChange={() => toggle(opt)} className="accent-primary" />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      </PatientField>
    );
  }

  const str = typeof valeur === 'string' ? valeur : '';
  return (
    <PatientField label={champ.label} requis={requis} suffixe={champ.suffixe}>
      {champ.type === 'textarea' ? (
        <textarea value={str} onChange={e => onChange(e.target.value)} required={requis} placeholder={champ.placeholder} rows={3} className={patientInputClassName} />
      ) : (
        <input type="text" value={str} onChange={e => onChange(e.target.value)} required={requis} placeholder={champ.placeholder} className={patientInputClassName} />
      )}
    </PatientField>
  );
}

function AnamneseForm({ token, idPatient, email, motifInitial, onDone }: {
  token: string; idPatient: string; email: string; motifInitial: string | null; onDone: (premiereAssignation: string | null) => void;
}) {
  type AnamneseDraft = { valeurs: AnamneseValeurs; motif: string };
  const draft = readWizardDraft<AnamneseDraft>('anamnese', idPatient, isAnamneseWizardDraft);
  const [valeurs, setValeurs] = useState<AnamneseValeurs>(() => draft?.valeurs ?? {});
  const [motif, setMotif] = useState(() => draft?.motif ?? motifInitial ?? '');
  const [sectionIndex, setSectionIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Heure de la dernière écriture RÉUSSIE du brouillon ; `null` après un échec.
  const [savedAt, setSavedAt] = useState<Date | null>(() => readWizardDraftSavedAt('anamnese', idPatient));
  const [saveError, setSaveError] = useState<SaveError | undefined>(undefined);
  const [sessionExpiree, setSessionExpiree] = useState(false);
  const premierRendu = useRef(true);
  // [[D-335]] §3 (BP-13) : sous `WN_PHYSIO_TRAITEMENTS`, les groupes
  // « Médicaments en cours » et « Compléments alimentaires en cours » sont
  // REMPLACÉS par des lignes datées, et « Repères corporels » reçoit le sexe
  // et les cycles. La route décide (`?interrupteur=1`) ; tant qu'elle n'a pas
  // dit « ouvert », la fiche reste celle d'avant.
  const [physioOuvert, setPhysioOuvert] = useState(false);
  const [lignePhysioOuverte, setLignePhysioOuverte] = useState(false);
  const [physioIllisible, setPhysioIllisible] = useState(false);
  useEffect(() => {
    let vivant = true;
    void (async () => {
      try {
        const res = await fetch('/api/portail/physio-traitements?interrupteur=1');
        const data = (await res.json()) as { ok?: boolean; ouvert?: boolean };
        if (vivant && res.ok && data.ok === true && data.ouvert === true) setPhysioOuvert(true);
      } catch {
        // Silence : la fiche garde ses groupes de texte libre.
      }
    })();
    return () => { vivant = false; };
  }, []);

  useEffect(() => {
    if (premierRendu.current) { premierRendu.current = false; return; }
    setSavedAt(writeWizardDraft('anamnese', idPatient, { valeurs, motif }));
  }, [valeurs, motif, idPatient]);

  // [[D-506]], précision du 2026-11-13 : le message de sécurité vient dans la
  // fenêtre au moment où la case « Idées noires ou suicidaires » est COCHÉE,
  // pas quand on revient sur la section qui la porte, ni à la reprise du
  // brouillon.
  const [messageAAmener, setMessageAAmener] = useState(false);
  const setChamp = (id: string, v: string | string[]) => {
    if (
      id === CHAMP_ANAMNESE_SIGNAUX
      && anamneseSignaleIdeesSuicidaires(v)
      && !anamneseSignaleIdeesSuicidaires(valeurs[CHAMP_ANAMNESE_SIGNAUX])
    ) setMessageAAmener(true);
    setValeurs(prev => ({ ...prev, [id]: v }));
  };

  // Groupes répétables : liste d'entrées (objets de champs texte).
  const entrees = (groupeId: string): Array<Record<string, string>> => {
    const v = valeurs[groupeId];
    return Array.isArray(v) && (v.length === 0 || typeof v[0] === 'object')
      ? (v as Array<Record<string, string>>)
      : [];
  };
  const ajouterEntree = (groupeId: string) =>
    setValeurs(prev => ({ ...prev, [groupeId]: [...entrees(groupeId), {}] }));
  const supprimerEntree = (groupeId: string, index: number) =>
    setValeurs(prev => ({ ...prev, [groupeId]: entrees(groupeId).filter((_, i) => i !== index) }));
  const setEntreeChamp = (groupeId: string, index: number, champId: string, v: string) =>
    setValeurs(prev => ({
      ...prev,
      [groupeId]: entrees(groupeId).map((e, i) => (i === index ? { ...e, [champId]: v } : e)),
    }));

  const requisValeur = valeurs[ANAMNESE_CHAMP_REQUIS];
  const requisManquant = typeof requisValeur !== 'string' || !requisValeur.trim();

  const section = ANAMNESE_SECTIONS[sectionIndex];
  const isLastSection = sectionIndex === ANAMNESE_SECTIONS.length - 1;
  const sectionRequisManquant = (section.champs ?? []).some(champ => {
    if (champ.id !== ANAMNESE_CHAMP_REQUIS) return false;
    const v = valeurs[champ.id];
    return typeof v !== 'string' || !v.trim();
  });

  const soumettre = async () => {
    setError('');
    setSaveError(undefined);
    setSessionExpiree(false);
    setLoading(true);
    try {
      const res = await fetch('/api/portail/valider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Lignes datées ouvertes : un brouillon ancien ne fait pas revivre
        // les groupes remplacés.
        body: JSON.stringify({ token, email, anamnese: physioOuvert ? sansGroupesRemplaces(valeurs) : valeurs, motif }),
      });
      setSessionExpiree(res.status === 401);
      const data = (await res.json()) as { ok: boolean; error?: string; premiereAssignation?: string | null };
      if (!data.ok) { setError(data.error ?? 'Erreur. Réessayez.'); setSaveError('submission-incomplete'); }
      else { clearWizardDraft('anamnese', idPatient); onDone(data.premiereAssignation ?? null); }
    } catch {
      setError('Erreur réseau. Réessayez.');
      setSaveError('network');
    } finally {
      setLoading(false);
    }
  };

  // Une ligne de traitement ouverte et non enregistrée ne se perd pas en
  // silence (revue `wn-reviewer`, P1) : on ne quitte la section — ni en
  // avant, ni en arrière (revue CodeRabbit) — qu'après l'avoir enregistrée ou
  // annulée. Le message tombe dès que la ligne se ferme.
  // Rappels STABLES : recréés à chaque rendu, ils relanceraient le nettoyage
  // de `DeclarationsPatient`, qui effacerait le blocage d'une ligne pourtant
  // toujours ouverte (revue CodeRabbit).
  const bloqueParLigneOuverte = () => {
    if (!lignePhysioOuverte) return false;
    setError(MESSAGE_LIGNE_OUVERTE);
    return true;
  };
  const changerLignePhysio = useCallback((ouverte: boolean) => {
    setLignePhysioOuverte(ouverte);
    if (!ouverte) setError(e => (e === MESSAGE_LIGNE_OUVERTE ? '' : e));
  }, []);
  // Les lignes qui remplacent les groupes de texte libre n'ont pas pu être
  // lues : la section ne se valide pas sans elles (revue CodeRabbit, P1).
  const changerPhysioIllisible = useCallback((illisible: boolean) => {
    setPhysioIllisible(illisible);
    if (!illisible) setError(e => (e === MESSAGE_PARTIE_ILLISIBLE ? '' : e));
  }, []);

  const handleSectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bloqueParLigneOuverte()) return;
    if (physioIllisible) { setError(MESSAGE_PARTIE_ILLISIBLE); return; }
    if (!isLastSection) { setSectionIndex(i => i + 1); window.scrollTo(0, 0); return; }
    void soumettre();
  };

  return (
    <PatientCard as="form" onSubmit={handleSectionSubmit} className="space-y-6">
      <div>
        <div className={CLASSE_REPERE}>Section {sectionIndex + 1} / {ANAMNESE_SECTIONS.length}</div>
        <PatientPageHeader
          title={TITRE_SITUATION}
          subtitle="Décrivez votre situation. Ces éléments complètent vos questionnaires et guideront votre accompagnement."
        />
      </div>

      {sectionIndex === 0 && (
        <PatientField label="Motif de consultation">
          <select value={motif} onChange={e => setMotif(e.target.value)} className={patientInputClassName}>
            <option value="">Sélectionnez un motif (optionnel)</option>
            {MOTIFS_CONSULTATION.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </PatientField>
      )}

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground">{section.titre}</legend>
        {section.description && <p className="text-xs text-muted-foreground/70 -mt-2">{section.description}</p>}
        {section.id === SECTION_ANAMNESE_SIGNAUX && <EncartUrgenceSuicide />}

        {(section.champs ?? []).map(champ => (
          <ChampSimple
            key={champ.id}
            champ={champ}
            valeur={valeurs[champ.id] as string | string[] | undefined}
            onChange={v => setChamp(champ.id, v)}
            requis={champ.id === ANAMNESE_CHAMP_REQUIS}
          />
        ))}
        {/* [[D-277]] §1 : tant que la case « Idées noires ou suicidaires » est cochée. */}
        {section.id === SECTION_ANAMNESE_SIGNAUX && anamneseSignaleIdeesSuicidaires(valeurs[CHAMP_ANAMNESE_SIGNAUX]) && (
          <MessageReponseSuicide defiler={messageAAmener} onVenu={() => setMessageAAmener(false)} />
        )}
        {physioOuvert && section.id === SECTION_REPERES && <DeclarationsPatient parties="sexe" onEditionChange={changerLignePhysio} onLectureEchouee={changerPhysioIllisible} />}

        {(physioOuvert ? (section.groupes ?? []).filter(g => !GROUPES_REMPLACES.includes(g.id)) : section.groupes ?? []).map(groupe => (
          <div key={groupe.id} className="space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground">{groupe.label}</p>
              {groupe.description && <p className="text-xs text-muted-foreground/70">{groupe.description}</p>}
            </div>
            {entrees(groupe.id).map((entree, index) => (
              <div key={index} className="rounded-lg border border-border p-3 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {groupe.champs.map(champ => (
                    <div key={champ.id}>
                      <label htmlFor={`anamnese-${groupe.id}-${index}-${champ.id}`} className="block text-xs text-muted-foreground/70 mb-1">{champ.label}</label>
                      <input
                        id={`anamnese-${groupe.id}-${index}-${champ.id}`}
                        type="text"
                        value={entree[champ.id] ?? ''}
                        onChange={e => setEntreeChamp(groupe.id, index, champ.id, e.target.value)}
                        className={patientInputClassName}
                      />
                    </div>
                  ))}
                </div>
                <PatientButton variant="danger-text" onClick={() => supprimerEntree(groupe.id, index)}>
                  Supprimer cette ligne
                </PatientButton>
              </div>
            ))}
            <PatientButton variant="ghost" onClick={() => ajouterEntree(groupe.id)}>
              + {groupe.ajoutLabel}
            </PatientButton>
          </div>
        ))}
        {physioOuvert && section.id === SECTION_TRAITEMENTS && <DeclarationsPatient parties="traitements" onEditionChange={changerLignePhysio} onLectureEchouee={changerPhysioIllisible} />}
      </fieldset>

      {error && <PatientInlineMessage tone="error">{error}</PatientInlineMessage>}
      {sessionExpiree && <div><LienReconnexion /></div>}
      {/* Q6b : « restent conservées » seulement si la dernière écriture a réussi. */}
      <SaveStatusIndicator savedAt={savedAt} error={savedAt ? saveError : undefined} textes={TEXTES_BROUILLON_ENTREE} />

      <div className="flex gap-3">
        {sectionIndex > 0 && (
          <PatientButton
            variant="neutral" className="flex-1"
            onClick={() => { if (bloqueParLigneOuverte()) return; setSectionIndex(i => i - 1); window.scrollTo(0, 0); }}
          >
            ← Précédent
          </PatientButton>
        )}
        <PatientButton
          type="submit" variant="primary" className="flex-1"
          disabled={isLastSection ? (loading || requisManquant) : sectionRequisManquant}
          loading={loading} loadingLabel="Validation…"
        >
          {isLastSection ? 'Valider et accéder à mon parcours' : 'Suivant →'}
        </PatientButton>
      </div>
    </PatientCard>
  );
}

// ─── étape : terminé / accès questionnaires ─────────────────────────────────
function DoneScreen({ token, premiereAssignation }: { token: string; premiereAssignation: string | null }) {
  return (
    <PatientCard maxWidth="md" className="text-center">
      {/* Pastille sable, coche pétrole (prototype PAT-2, U09). */}
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-lien-sand mb-4">
        <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="font-display text-xl font-bold text-foreground mb-2">Merci !</h2>
      <p className="text-muted-foreground text-sm leading-relaxed mb-6">
        Vos renseignements ont bien été transmis à votre praticien.<br />
        {premiereAssignation
          ? 'Vos questionnaires de suivi sont maintenant disponibles.'
          : 'Vous n’avez aucun questionnaire en attente pour le moment.'}
      </p>
      {/* Le lien ne dépend plus de `premiereAssignation`. La session ne compte
          que les assignations NON complétées (`statut: { not: 'Complété' }`) :
          le champ est donc null AUSSI pour un patient qui a tout rempli, à qui
          cet écran fermait la porte du hub — précisément l'écran qui sait dire
          « transmis / en préparation / restitution disponible ». Le libellé
          ci-dessus ne promet plus rien à sa place. */}
      <a href={`/portail/${token}/questionnaires`} className={patientButtonClassName('primary')}>
        Accéder à mon parcours
      </a>
    </PatientCard>
  );
}

// ─── page principale ─────────────────────────────────────────────────────────
type Step =
  | { name: 'loading' }
  // Séquence TRUST « Avant de commencer », avant tout recueil ; `conditions` :
  // les conditions d'utilisation seules (D-292 §3, `WN_PORTAIL_CONDITIONS`).
  | { name: 'avant'; conditions: boolean }
  | { name: 'date' } // D-284 §3 : date de naissance manquante, avant tout autre geste
  | { name: 'mineur' } // D-284 §4 : circuit des mineurs, pause maintenue (lot i)
  | { name: 'consent' }
  | { name: 'fiche' }
  | { name: 'anamnese' }
  | { name: 'done'; premiereAssignation: string | null };

// LA GARDE D'ÂGE PASSE EN TÊTE, juste après « Avant de commencer » : l'information
// précède le recueil, et la date précède tout le reste (D-284 §3). Un dossier
// déjà onboardé la rencontre aussi — c'est le cas des dossiers existants sans date.
function prochaineEtape(
  c: PortailConsultationState | null,
  premiere: string | null,
  statut: StatutAge,
): Step {
  if (statut === 'date_manquante') return { name: 'date' };
  if (statut === 'mineur') return { name: 'mineur' };
  if (!c || c.statut === 'validee') return { name: 'done', premiereAssignation: premiere };
  if (!c.consentementDonne) return { name: 'consent' };
  if (!c.ficheRemplie) return { name: 'fiche' };
  return { name: 'anamnese' };
}

export default function PortailPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [step, setStep] = useState<Step>({ name: 'loading' });
  const [email, setEmail] = useState('');
  // Identité de session : elle nomme les brouillons locaux. Toujours renseignée
  // avant que fiche ou anamnèse ne s'affichent — ces étapes ne sont atteintes
  // que par `appliquerSession`.
  const [idPatient, setIdPatient] = useState('');
  const [consultation, setConsultation] = useState<PortailConsultationState | null>(null);
  const [premiere, setPremiere] = useState<string | null>(null);
  const [statut, setStatut] = useState<StatutAge>('date_manquante');

  const appliquerSession = useCallback((data: Extract<PortailSessionResponse, { ok: true }>) => {
    setEmail(data.patient.email.toLowerCase());
    setIdPatient(data.patient.idPatient);
    setConsultation(data.consultation);
    setPremiere(data.premiereAssignation);
    // Un dossier clos ne recueille plus rien : aucune date ne lui est demandée.
    const statutAffiche: StatutAge = data.dossierOuvert === false ? 'majeur' : data.statutAge;
    setStatut(statutAffiche);
    // Séquence TRUST « Avant de commencer » : requise tant qu'un des documents
    // exigeant un accusé n'en a pas un sur sa version courante (patients
    // existants inclus, une fois). La règle n'est plus « le cadre » depuis le
    // 2026-09-16 — la route la calcule, cette page ne fait que la lire. Jamais bloquante en cas d'erreur réseau : le
    // parcours de soin continue. Une réponse non-ok juste après l'ouverture
    // de session peut n'être qu'un défaut de propagation du cookie (WebKit,
    // serveur rapide) : brefs réessais bornés avant de dégrader — sinon la
    // séquence serait sautée en silence pour un simple aléa réseau.
    void (async () => {
      for (let essai = 0; essai < 3; essai++) {
        try {
          const res = await fetch(`/api/portail/trust/etat?token=${encodeURIComponent(String(token))}`);
          if (res.ok) {
            const etat = (await res.json()) as {
              ok: boolean;
              avantDeCommencerRequis?: boolean;
              accueilConditions?: boolean;
            };
            if (etat.ok && etat.avantDeCommencerRequis) {
              setStep({ name: 'avant', conditions: etat.accueilConditions === true });
              return;
            }
            break; // réponse saine : séquence non requise
          }
        } catch {
          /* réessai ci-dessous */
        }
        await new Promise(resolve => setTimeout(resolve, 300 * (essai + 1)));
      }
      setStep(prochaineEtape(data.consultation, data.premiereAssignation, statutAffiche));
    })();
  }, [token]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch('/api/portail/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = (await response.json()) as PortailSessionResponse;
        if (!active) return;
        if (data.ok) appliquerSession(data);
        // Pas de cookie valide (lien permanent mort, session expirée) : plus de
        // gate email au LOT-04 — on renvoie vers la page de connexion.
        else router.replace('/portail/connexion');
      } catch {
        if (active) router.replace('/portail/connexion');
      }
    })();
    return () => { active = false; };
  }, [token, appliquerSession, router]);

  if (step.name === 'loading') {
    return (
      <PatientCard maxWidth="md">
        <p className="text-sm text-muted-foreground" role="status">Vérification de votre session…</p>
      </PatientCard>
    );
  }

  if (step.name === 'avant') {
    return (
      <div className="w-full max-w-2xl space-y-4">
        {step.conditions ? (
          <AccueilConditions onDone={() => setStep(prochaineEtape(consultation, premiere, statut))} />
        ) : (
          <AvantDeCommencer
            token={token}
            onDone={() => setStep(prochaineEtape(consultation, premiere, statut))}
          />
        )}
      </div>
    );
  }

  if (step.name === 'date') {
    return (
      <div className="w-full max-w-md space-y-4">
        <DateNaissanceEcran
          onEnregistree={nouveau => {
            setStatut(nouveau);
            setStep(prochaineEtape(consultation, premiere, nouveau));
          }}
        />
      </div>
    );
  }

  if (step.name === 'mineur') {
    return (
      <div className="w-full max-w-md space-y-4">
        <EcranCircuitMineur lienParcours={`/portail/${token}/questionnaires`} />
      </div>
    );
  }

  if (step.name === 'consent') {
    return (
      <div className="w-full max-w-2xl space-y-4">
        <PatientJourneyProgress steps={buildJourneySteps(1)} />
        <ConsentScreen
          token={token}
          email={email}
          onAccepted={() => {
            const next = consultation ? { ...consultation, consentementDonne: true } : null;
            setConsultation(next);
            setStep(prochaineEtape(next, premiere, statut));
          }}
        />
      </div>
    );
  }

  if (step.name === 'fiche') {
    return (
      <div className="w-full max-w-2xl space-y-4">
        <PatientJourneyProgress steps={buildJourneySteps(2)} />
        <FicheForm
          token={token}
          idPatient={idPatient}
          email={email}
          onDone={() => {
            const next = consultation ? { ...consultation, ficheRemplie: true } : null;
            setConsultation(next);
            setStep(prochaineEtape(next, premiere, statut));
          }}
        />
      </div>
    );
  }

  if (step.name === 'anamnese') {
    return (
      <div className="w-full max-w-2xl space-y-4">
        <PatientJourneyProgress steps={buildJourneySteps(3)} />
        <AnamneseForm
          token={token}
          idPatient={idPatient}
          email={email}
          motifInitial={consultation?.motif ?? null}
          onDone={pa => setStep({ name: 'done', premiereAssignation: pa ?? premiere })}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-4">
      <PatientJourneyProgress steps={buildJourneySteps(4)} />
      <DoneScreen token={token} premiereAssignation={step.premiereAssignation} />
    </div>
  );
}
