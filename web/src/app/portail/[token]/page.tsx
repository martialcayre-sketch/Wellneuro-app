'use client';

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import type { PortailSessionResponse, PortailConsultationState } from '@/app/api/portail/session/route';
import { MOTIFS_CONSULTATION } from '@/lib/consultation/motifs';
import { FICHE_SECTIONS, FICHE_CHAMPS_REQUIS } from '@/lib/consultation/fiche';
import { ANAMNESE_SECTIONS, ANAMNESE_CHAMP_REQUIS } from '@/lib/consultation/anamnese';
import type { AnamneseChamp, AnamneseValeurs } from '@/lib/consultation/anamnese';

type Verified = Extract<PortailSessionResponse, { ok: true }>;

const card = 'bg-white rounded-2xl shadow-sm border border-blue-100 p-8';
const inputCls = 'w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const btnCls = 'w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

// ─── étape : email gate ─────────────────────────────────────────────────────
function EmailGate({ token, onVerified }: { token: string; onVerified: (email: string, data: Verified) => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/portail/session?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email.trim().toLowerCase())}`);
      const data = (await res.json()) as PortailSessionResponse;
      if (!data.ok) setError(data.error);
      else onVerified(email.trim().toLowerCase(), data);
    } catch {
      setError('Erreur réseau. Réessayez.');
    } finally {
      setLoading(false);
    }
  }, [token, email, onVerified]);

  return (
    <div className="w-full max-w-md">
      <div className={card}>
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-gray-900">Votre espace patient</h1>
          <p className="text-gray-500 text-sm mt-2">Confirmez l’adresse email enregistrée par votre praticien pour accéder à votre espace.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Adresse email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus placeholder="votre@email.fr" className={inputCls} />
          </div>
          {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-4 py-2">{error}</p>}
          <button type="submit" disabled={loading || !email.trim()} className={btnCls}>
            {loading ? 'Vérification…' : 'Accéder à mon espace'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── étape : consentement ───────────────────────────────────────────────────
function ConsentScreen({ token, email, onAccepted }: { token: string; email: string; onAccepted: () => void }) {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/portail/consentement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) setError(data.error ?? 'Erreur. Réessayez.');
      else onAccepted();
    } catch {
      setError('Erreur réseau. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl">
      <div className={card}>
        <h1 className="text-xl font-bold text-gray-900 mb-4">Avant de commencer</h1>
        <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
          <p>
            Votre praticien vous ouvre l’accès à votre espace patient Wellneuro, un outil
            d’accompagnement bien-être et de suivi personnalisé.
          </p>
          <div>
            <p className="font-semibold text-gray-900">Ce que nous collectons</p>
            <p>Vos renseignements (situation, mode de vie), votre anamnèse et vos réponses aux questionnaires de suivi, ainsi que les dates associées.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Pourquoi</p>
            <p>Ces informations permettent à votre praticien de mieux comprendre votre situation et de vous proposer un accompagnement adapté. Il ne s’agit pas d’un outil de diagnostic médical.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Qui peut voir vos informations</p>
            <p>Seul votre praticien y a accès. Elles ne sont partagées avec aucun tiers.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Vos droits</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Accéder à vos informations à tout moment via ce même lien.</li>
              <li>Demander la modification ou la suppression de vos données auprès de votre praticien.</li>
              <li>Retirer votre consentement à tout moment.</li>
            </ul>
          </div>
        </div>
        <label className="flex items-start gap-3 mt-6 cursor-pointer">
          <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} className="mt-1 accent-blue-600" />
          <span className="text-sm text-gray-800">
            J’ai lu ces informations et j’accepte que mes données soient collectées et utilisées dans les conditions décrites ci-dessus.
          </span>
        </label>
        {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-4 py-2 mt-4">{error}</p>}
        <button type="button" onClick={handleContinue} disabled={!checked || loading} className={`${btnCls} mt-6`}>
          {loading ? 'Enregistrement…' : 'Donner mon consentement'}
        </button>
      </div>
    </div>
  );
}

// ─── étape : fiche signalétique ─────────────────────────────────────────────
function FicheForm({ token, email, onDone }: {
  token: string; email: string; onDone: () => void;
}) {
  const [valeurs, setValeurs] = useState<Record<string, string>>({});
  const [mentions, setMentions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (id: string, v: string) => setValeurs(prev => ({ ...prev, [id]: v }));
  const requisManquant = FICHE_CHAMPS_REQUIS.some(id => !(valeurs[id] ?? '').trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/portail/fiche', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, fiche: valeurs }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) setError(data.error ?? 'Erreur. Réessayez.');
      else onDone();
    } catch {
      setError('Erreur réseau. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl">
      <form onSubmit={handleSubmit} className={`${card} space-y-6`}>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Fiche de renseignements</h1>
          <p className="text-gray-500 text-sm mt-1">Ces informations aident votre praticien à personnaliser votre suivi.</p>
        </div>

        {FICHE_SECTIONS.map(section => (
          <fieldset key={section.id} className="space-y-3">
            <legend className="text-sm font-semibold text-gray-900">{section.titre}</legend>
            {section.champs.map(champ => {
              const requis = FICHE_CHAMPS_REQUIS.includes(champ.id);
              return (
                <div key={champ.id}>
                  <label className={labelCls}>{champ.label}{requis && ' *'}</label>
                  {champ.type === 'select' ? (
                    <select value={valeurs[champ.id] ?? ''} onChange={e => set(champ.id, e.target.value)} required={requis} className={inputCls}>
                      <option value="">Sélectionnez…</option>
                      {(champ.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : champ.type === 'textarea' ? (
                    <textarea value={valeurs[champ.id] ?? ''} onChange={e => set(champ.id, e.target.value)} placeholder={champ.placeholder} rows={3} className={inputCls} />
                  ) : (
                    <input type="text" value={valeurs[champ.id] ?? ''} onChange={e => set(champ.id, e.target.value)} required={requis} placeholder={champ.placeholder} className={inputCls} />
                  )}
                </div>
              );
            })}
          </fieldset>
        ))}

        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={mentions} onChange={e => setMentions(e.target.checked)} className="mt-1 accent-blue-600" />
          <span className="text-sm text-gray-700">
            Je certifie l’exactitude des informations fournies. Elles sont traitées de manière confidentielle et
            uniquement dans le cadre de mon suivi (données personnelles, sans finalité de diagnostic médical).
          </span>
        </label>

        {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-4 py-2">{error}</p>}
        <button type="submit" disabled={loading || requisManquant || !mentions} className={btnCls}>
          {loading ? 'Enregistrement…' : 'Continuer vers l’anamnèse'}
        </button>
      </form>
    </div>
  );
}

// ─── étape : anamnèse hiérarchisée ──────────────────────────────────────────
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
      <div>
        <label className={labelCls}>{champ.label}{requis && ' *'}</label>
        <div className="flex flex-wrap gap-2">
          {(champ.options ?? []).map(opt => {
            const actif = courant === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(actif ? '' : opt)}
                className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${actif ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'}`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (champ.type === 'checkbox-multi') {
    const selection = Array.isArray(valeur) ? valeur : [];
    const toggle = (opt: string) =>
      onChange(selection.includes(opt) ? selection.filter(o => o !== opt) : [...selection, opt]);
    return (
      <div>
        <label className={labelCls}>{champ.label}{requis && ' *'}</label>
        <div className="flex flex-col gap-1.5">
          {(champ.options ?? []).map(opt => (
            <label key={opt} className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={selection.includes(opt)} onChange={() => toggle(opt)} className="mt-0.5 accent-blue-600" />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  const str = typeof valeur === 'string' ? valeur : '';
  return (
    <div>
      <label className={labelCls}>{champ.label}{requis && ' *'}{champ.suffixe && <span className="text-gray-400 font-normal"> ({champ.suffixe})</span>}</label>
      {champ.type === 'textarea' ? (
        <textarea value={str} onChange={e => onChange(e.target.value)} required={requis} placeholder={champ.placeholder} rows={3} className={inputCls} />
      ) : (
        <input type="text" value={str} onChange={e => onChange(e.target.value)} required={requis} placeholder={champ.placeholder} className={inputCls} />
      )}
    </div>
  );
}

function AnamneseForm({ token, email, motifInitial, onDone }: {
  token: string; email: string; motifInitial: string | null; onDone: (premiereAssignation: string | null) => void;
}) {
  const [valeurs, setValeurs] = useState<AnamneseValeurs>({});
  const [motif, setMotif] = useState(motifInitial ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setChamp = (id: string, v: string | string[]) => setValeurs(prev => ({ ...prev, [id]: v }));

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/portail/valider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, anamnese: valeurs, motif }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; premiereAssignation?: string | null };
      if (!data.ok) setError(data.error ?? 'Erreur. Réessayez.');
      else onDone(data.premiereAssignation ?? null);
    } catch {
      setError('Erreur réseau. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl">
      <form onSubmit={handleSubmit} className={`${card} space-y-6`}>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Anamnèse</h1>
          <p className="text-gray-500 text-sm mt-1">Décrivez votre situation. Ces éléments complètent vos questionnaires et guideront votre accompagnement.</p>
        </div>

        <div>
          <label className={labelCls}>Motif de consultation</label>
          <select value={motif} onChange={e => setMotif(e.target.value)} className={inputCls}>
            <option value="">Sélectionnez un motif (optionnel)</option>
            {MOTIFS_CONSULTATION.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {ANAMNESE_SECTIONS.map(section => (
          <fieldset key={section.id} className="space-y-4">
            <legend className="text-sm font-semibold text-gray-900">{section.titre}</legend>
            {section.description && <p className="text-xs text-gray-500 -mt-2">{section.description}</p>}

            {(section.champs ?? []).map(champ => (
              <ChampSimple
                key={champ.id}
                champ={champ}
                valeur={valeurs[champ.id] as string | string[] | undefined}
                onChange={v => setChamp(champ.id, v)}
                requis={champ.id === ANAMNESE_CHAMP_REQUIS}
              />
            ))}

            {(section.groupes ?? []).map(groupe => (
              <div key={groupe.id} className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{groupe.label}</p>
                  {groupe.description && <p className="text-xs text-gray-500">{groupe.description}</p>}
                </div>
                {entrees(groupe.id).map((entree, index) => (
                  <div key={index} className="rounded-lg border border-gray-200 p-3 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {groupe.champs.map(champ => (
                        <div key={champ.id}>
                          <label className="block text-xs text-gray-500 mb-1">{champ.label}</label>
                          <input
                            type="text"
                            value={entree[champ.id] ?? ''}
                            onChange={e => setEntreeChamp(groupe.id, index, champ.id, e.target.value)}
                            className={inputCls}
                          />
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={() => supprimerEntree(groupe.id, index)} className="text-xs text-red-500 hover:underline">
                      Supprimer cette ligne
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => ajouterEntree(groupe.id)}
                  className="text-sm text-blue-600 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50"
                >
                  + {groupe.ajoutLabel}
                </button>
              </div>
            ))}
          </fieldset>
        ))}

        {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-4 py-2">{error}</p>}
        <button type="submit" disabled={loading || requisManquant} className={btnCls}>
          {loading ? 'Validation…' : 'Valider et accéder à mes questionnaires'}
        </button>
      </form>
    </div>
  );
}

// ─── étape : terminé / accès questionnaires ─────────────────────────────────
function DoneScreen({ token, premiereAssignation }: { token: string; premiereAssignation: string | null }) {
  return (
    <div className="w-full max-w-md">
      <div className={`${card} text-center`}>
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Merci !</h2>
        <p className="text-gray-600 text-sm leading-relaxed mb-6">
          Vos renseignements ont bien été transmis à votre praticien.<br />
          {premiereAssignation
            ? 'Vos questionnaires de suivi sont maintenant disponibles.'
            : 'Votre praticien mettra vos questionnaires à disposition prochainement.'}
        </p>
        {premiereAssignation && (
          <a href={`/portail/${token}/questionnaires`} className={`${btnCls} inline-block`}>
            Accéder à mes questionnaires
          </a>
        )}
      </div>
    </div>
  );
}

// ─── page principale ─────────────────────────────────────────────────────────
type Step =
  | { name: 'gate' }
  | { name: 'consent' }
  | { name: 'fiche' }
  | { name: 'anamnese' }
  | { name: 'done'; premiereAssignation: string | null };

function prochaineEtape(c: PortailConsultationState | null, premiere: string | null): Step {
  if (!c || c.statut === 'validee') return { name: 'done', premiereAssignation: premiere };
  if (!c.consentementDonne) return { name: 'consent' };
  if (!c.ficheRemplie) return { name: 'fiche' };
  return { name: 'anamnese' };
}

export default function PortailPage() {
  const { token } = useParams<{ token: string }>();
  const [step, setStep] = useState<Step>({ name: 'gate' });
  const [email, setEmail] = useState('');
  const [consultation, setConsultation] = useState<PortailConsultationState | null>(null);
  const [premiere, setPremiere] = useState<string | null>(null);

  if (step.name === 'gate') {
    return (
      <EmailGate
        token={token}
        onVerified={(mail, data) => {
          setEmail(mail);
          setConsultation(data.consultation);
          setPremiere(data.premiereAssignation);
          setStep(prochaineEtape(data.consultation, data.premiereAssignation));
        }}
      />
    );
  }

  if (step.name === 'consent') {
    return (
      <ConsentScreen
        token={token}
        email={email}
        onAccepted={() => {
          const next = consultation ? { ...consultation, consentementDonne: true } : null;
          setConsultation(next);
          setStep(prochaineEtape(next, premiere));
        }}
      />
    );
  }

  if (step.name === 'fiche') {
    return (
      <FicheForm
        token={token}
        email={email}
        onDone={() => {
          const next = consultation ? { ...consultation, ficheRemplie: true } : null;
          setConsultation(next);
          setStep(prochaineEtape(next, premiere));
        }}
      />
    );
  }

  if (step.name === 'anamnese') {
    return (
      <AnamneseForm
        token={token}
        email={email}
        motifInitial={consultation?.motif ?? null}
        onDone={pa => setStep({ name: 'done', premiereAssignation: pa ?? premiere })}
      />
    );
  }

  return <DoneScreen token={token} premiereAssignation={step.premiereAssignation} />;
}
