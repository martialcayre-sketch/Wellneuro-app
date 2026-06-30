'use client';

import { useEffect, useMemo, useState } from 'react';
import type {
  CreatePatientResponse,
  DeletePatientResponse,
  PatchPatientResponse,
  PatientsApiResponse,
} from '@/app/api/praticien/patients/route';
import type { CreateAssignationResponse } from '@/app/api/praticien/assignations/route';
import type { QuestionnairesApiResponse } from '@/app/api/praticien/questionnaires/route';
import type { ReponsesApiResponse, ReponseQuestionnaire } from '@/app/api/praticien/reponses/route';

type SortBy = 'nom' | 'email';
type StatutFilter = '' | 'Terminé' | 'Envoyé' | 'En_cours' | 'En attente';

const STATUT_LABELS: Record<StatutFilter, string> = {
  '': 'Tous les statuts',
  'Terminé': 'Terminé',
  'Envoyé': 'Envoyé',
  'En_cours': 'En cours',
  'En attente': 'En attente',
};

function erreurLisible(reason?: string, fallback?: string): string {
  const map: Record<string, string> = {
    unauthenticated: 'Votre session a expiré. Déconnectez-vous puis reconnectez-vous.',
    no_sheet_id: 'Configuration incomplète (SHEET_ID manquant).',
    no_access_token: 'Accès Google Sheets non accordé. Reconnectez-vous.',
    invalid_payload: fallback ?? 'Données invalides.',
    duplicate_email: 'Un patient avec cet email existe déjà.',
    patient_not_found: 'Patient introuvable dans la feuille.',
    questionnaire_not_found: 'Questionnaire introuvable ou inactif.',
    sheets_400: 'Requête Google Sheets invalide.',
    sheets_401: 'Jeton Google expiré. Déconnectez-vous puis reconnectez-vous.',
    sheets_403: 'Accès refusé par Google Sheets. Vérifiez les droits sur le fichier.',
    sheets_404: 'Feuille Google Sheets introuvable. Vérifiez SHEET_ID.',
    exception: 'Erreur technique. Vérifiez le terminal Next.js.',
  };
  return (reason && map[reason]) ?? fallback ?? 'Erreur inconnue.';
}

function StatusBadge({ value }: { value: string }) {
  const status = value || '—';
  const classes =
    status === 'Terminé'
      ? 'bg-green-100 text-green-700'
      : status === 'Envoyé' || status === 'En_cours'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-gray-100 text-gray-600';
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${classes}`}>{status}</span>;
}

type EditPatientState = {
  idPatient: string;
  telephone: string;
  actif: 'OUI' | 'NON';
};

export function PatientsPanel() {
  const [data, setData] = useState<PatientsApiResponse | null>(null);
  const [questionnaires, setQuestionnaires] = useState<QuestionnairesApiResponse['questionnaires']>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAssignation, setSavingAssignation] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [reponses, setReponses] = useState<ReponseQuestionnaire[]>([]);
  const [loadingReponses, setLoadingReponses] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null); // idPatient en attente de confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('nom');
  const [statutFilter, setStatutFilter] = useState<StatutFilter>('');
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [assignationFeedback, setAssignationFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [editFeedback, setEditFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [editState, setEditState] = useState<EditPatientState | null>(null);
  const [form, setForm] = useState({ prenom: '', nom: '', email: '', telephone: '', dateNaissance: '' });
  const [assignationForm, setAssignationForm] = useState({
    emailPatient: '',
    idQuestionnaire: '',
    dateLimite: '',
    notes: '',
  });

  const loadData = async () => {
    const r = await fetch('/api/praticien/patients');
    const json = (await r.json()) as PatientsApiResponse;
    setData(json);
  };

  const loadQuestionnaires = async () => {
    const r = await fetch('/api/praticien/questionnaires');
    const json = (await r.json()) as QuestionnairesApiResponse;
    setQuestionnaires(json.questionnaires ?? []);
  };

  useEffect(() => {
    Promise.all([loadData(), loadQuestionnaires()])
      .catch(() => setData({ patients: [], assignations: [], unavailable: true, reason: 'exception' }))
      .finally(() => setLoading(false));
  }, []);

  const onCreatePatient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const r = await fetch('/api/praticien/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = (await r.json()) as CreatePatientResponse;
      if (!r.ok || !json.success) {
        setFeedback({ ok: false, msg: erreurLisible(json.reason, json.error) });
        return;
      }
      setFeedback({ ok: true, msg: `Patient ${form.prenom} ${form.nom} créé.` });
      setForm({ prenom: '', nom: '', email: '', telephone: '', dateNaissance: '' });
      await loadData();
    } catch {
      setFeedback({ ok: false, msg: 'Erreur réseau. Réessayez.' });
    } finally {
      setSaving(false);
    }
  };

  const onCreateAssignation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSavingAssignation(true);
    setAssignationFeedback(null);
    try {
      const selectedQ = questionnaires.find(q => q.id === assignationForm.idQuestionnaire);
      const r = await fetch('/api/praticien/assignations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailPatient: assignationForm.emailPatient,
          idQuestionnaire: assignationForm.idQuestionnaire,
          titre: selectedQ?.titre ?? '',
          dateLimite: assignationForm.dateLimite,
          notes: assignationForm.notes,
        }),
      });
      const json = (await r.json()) as CreateAssignationResponse;
      if (!r.ok || !json.success) {
        setAssignationFeedback({ ok: false, msg: erreurLisible(json.reason, json.error) });
        return;
      }
      setAssignationFeedback({ ok: true, msg: 'Assignation créée.' });
      setAssignationForm({ emailPatient: '', idQuestionnaire: '', dateLimite: '', notes: '' });
      await loadData();
    } catch {
      setAssignationFeedback({ ok: false, msg: 'Erreur réseau. Réessayez.' });
    } finally {
      setSavingAssignation(false);
    }
  };

  const loadReponses = async (email: string) => {
    if (selectedEmail === email) { setSelectedEmail(null); setReponses([]); return; }
    setSelectedEmail(email);
    setReponses([]);
    setLoadingReponses(true);
    try {
      const r = await fetch(`/api/praticien/reponses?email=${encodeURIComponent(email)}`);
      const d = await r.json() as ReponsesApiResponse;
      setReponses(d.reponses ?? []);
    } catch { setReponses([]); }
    finally { setLoadingReponses(false); }
  };

  const openEdit = (p: PatientsApiResponse['patients'][number]) => {
    setEditState({ idPatient: p.idPatient, telephone: p.telephone, actif: p.actif === 'OUI' ? 'OUI' : 'NON' });
    setEditFeedback(null);
    setConfirmDelete(null);
  };

  const onDelete = async (idPatient: string) => {
    setDeletingId(idPatient);
    setConfirmDelete(null);
    try {
      const r = await fetch(`/api/praticien/patients?idPatient=${encodeURIComponent(idPatient)}`, { method: 'DELETE' });
      const json = (await r.json()) as DeletePatientResponse;
      if (!r.ok || !json.success) {
        setFeedback({ ok: false, msg: json.error ?? 'Erreur lors de la suppression.' });
      } else {
        await loadData();
      }
    } catch {
      setFeedback({ ok: false, msg: 'Erreur réseau. Réessayez.' });
    } finally {
      setDeletingId(null);
    }
  };

  const onSaveEdit = async () => {
    if (!editState) return;
    setSavingEdit(true);
    setEditFeedback(null);
    try {
      const r = await fetch('/api/praticien/patients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editState),
      });
      const json = (await r.json()) as PatchPatientResponse;
      if (!r.ok || !json.success) {
        setEditFeedback({ ok: false, msg: erreurLisible(json.reason, json.error) });
        return;
      }
      setEditFeedback({ ok: true, msg: 'Patient mis à jour.' });
      await loadData();
      setTimeout(() => setEditState(null), 800);
    } catch {
      setEditFeedback({ ok: false, msg: 'Erreur réseau. Réessayez.' });
    } finally {
      setSavingEdit(false);
    }
  };

  const filteredPatients = useMemo(() => {
    const list = data?.patients ?? [];
    const q = search.toLowerCase().trim();
    const searched = q
      ? list.filter(p => `${p.prenom} ${p.nom} ${p.email}`.toLowerCase().includes(q))
      : list;
    return [...searched].sort((a, b) =>
      sortBy === 'email'
        ? a.email.localeCompare(b.email)
        : `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`)
    );
  }, [data?.patients, search, sortBy]);

  const filteredAssignations = useMemo(() => {
    const list = data?.assignations ?? [];
    if (!statutFilter) return list;
    return list.filter(a => a.statut === statutFilter);
  }, [data?.assignations, statutFilter]);

  if (loading) {
    return <div className="text-sm text-gray-500">Chargement des données patients...</div>;
  }

  if (data?.unavailable) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-600">
        {erreurLisible(data.reason)}
      </div>
    );
  }

  const inputCls = 'bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm';
  const btnPrimary = 'px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60';

  return (
    <div className="flex flex-col gap-6">

      {/* Nouveau patient */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Nouveau patient</h3>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={onCreatePatient}>
          <input required value={form.prenom} onChange={e => setForm(p => ({ ...p, prenom: e.target.value }))} placeholder="Prénom *" className={inputCls} maxLength={100} />
          <input required value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} placeholder="Nom *" className={inputCls} maxLength={100} />
          <input required type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Email *" className={inputCls} maxLength={254} />
          <input value={form.telephone} onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))} placeholder="Téléphone" className={inputCls} maxLength={30} />
          <input type="date" value={form.dateNaissance} onChange={e => setForm(p => ({ ...p, dateNaissance: e.target.value }))} className={inputCls} />
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className={btnPrimary} style={{ backgroundColor: 'var(--primary)' }}>
              {saving ? 'Création...' : 'Créer le patient'}
            </button>
            {feedback && (
              <span className={`text-sm ${feedback.ok ? 'text-green-600' : 'text-red-600'}`}>
                {feedback.msg}
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Nouvelle assignation */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Nouvelle assignation questionnaire</h3>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={onCreateAssignation}>
          <select required value={assignationForm.emailPatient} onChange={e => setAssignationForm(p => ({ ...p, emailPatient: e.target.value }))} className={inputCls}>
            <option value="">Patient *</option>
            {(data?.patients ?? []).map(p => (
              <option key={p.idPatient} value={p.email}>{`${p.prenom} ${p.nom} — ${p.email}`}</option>
            ))}
          </select>
          <select required value={assignationForm.idQuestionnaire} onChange={e => setAssignationForm(p => ({ ...p, idQuestionnaire: e.target.value }))} className={inputCls}>
            <option value="">Questionnaire *</option>
            {questionnaires.map(q => (
              <option key={q.id} value={q.id}>{`${q.titre} (${q.categorie})`}</option>
            ))}
          </select>
          <input type="date" value={assignationForm.dateLimite} onChange={e => setAssignationForm(p => ({ ...p, dateLimite: e.target.value }))} className={inputCls} />
          <input value={assignationForm.notes} onChange={e => setAssignationForm(p => ({ ...p, notes: e.target.value }))} placeholder="Notes praticien (optionnel)" className={inputCls} maxLength={500} />
          <div className="flex items-center gap-3 md:col-span-2">
            <button type="submit" disabled={savingAssignation} className={btnPrimary} style={{ backgroundColor: 'var(--primary)' }}>
              {savingAssignation ? 'Création...' : 'Créer l’assignation'}
            </button>
            {assignationFeedback && (
              <span className={`text-sm ${assignationFeedback.ok ? 'text-green-600' : 'text-red-600'}`}>
                {assignationFeedback.msg}
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Édition patient inline */}
      {editState && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Modifier patient <span className="font-normal text-gray-500">{editState.idPatient}</span>
          </h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Téléphone</label>
              <input value={editState.telephone} onChange={e => setEditState(s => s ? { ...s, telephone: e.target.value } : s)} className={inputCls} maxLength={30} placeholder="Téléphone" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Actif</label>
              <select value={editState.actif} onChange={e => setEditState(s => s ? { ...s, actif: e.target.value as 'OUI' | 'NON' } : s)} className={inputCls}>
                <option value="OUI">Actif</option>
                <option value="NON">Inactif</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onSaveEdit} disabled={savingEdit} className={btnPrimary} style={{ backgroundColor: 'var(--primary)' }}>
                {savingEdit ? 'Enregistrement...' : 'Enregistrer'}
              </button>
              <button onClick={() => setEditState(null)} className="px-3 py-2 rounded-lg text-sm text-gray-600 border border-gray-300">
                Annuler
              </button>
            </div>
            {editFeedback && (
              <span className={`text-sm ${editFeedback.ok ? 'text-green-600' : 'text-red-600'}`}>
                {editFeedback.msg}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Barre recherche / tri */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher (nom, prénom, email)" className={`w-full sm:w-72 ${inputCls}`} />
          <select value={sortBy} onChange={e => setSortBy(e.target.value as SortBy)} className={inputCls}>
            <option value="nom">Tri : nom</option>
            <option value="email">Tri : email</option>
          </select>
        </div>
        <div className="text-sm text-gray-500">{filteredPatients.length} patient(s)</div>
      </div>

      {/* Tableau patients */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700">Patients</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-2 text-left">Nom</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Téléphone</th>
                <th className="px-4 py-2 text-left">Actif</th>
                <th className="px-4 py-2 text-left"></th>
                <th className="px-4 py-2 text-left"></th>
                <th className="px-4 py-2 text-left"></th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-4 text-center text-gray-400">Aucun patient.</td></tr>
              )}
              {filteredPatients.map(p => (
                <tr key={p.idPatient} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2">{`${p.prenom} ${p.nom}`.trim() || '—'}</td>
                  <td className="px-4 py-2">{p.email || '—'}</td>
                  <td className="px-4 py-2">{p.telephone || '—'}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.actif === 'OUI' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {p.actif === 'OUI' ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <button onClick={() => openEdit(p)} className="text-xs text-blue-600 hover:underline">
                      Modifier
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => loadReponses(p.email)}
                      className={`text-xs hover:underline ${selectedEmail === p.email ? 'text-indigo-600 font-medium' : 'text-gray-500'}`}
                    >
                      {selectedEmail === p.email ? 'Masquer' : 'Résultats'}
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    {confirmDelete === p.idPatient ? (
                      <span className="flex items-center gap-1">
                        <button
                          onClick={() => onDelete(p.idPatient)}
                          disabled={deletingId === p.idPatient}
                          className="text-xs text-white bg-red-600 hover:bg-red-700 px-2 py-0.5 rounded disabled:opacity-60"
                        >
                          {deletingId === p.idPatient ? '...' : 'Confirmer'}
                        </button>
                        <button onClick={() => setConfirmDelete(null)} className="text-xs text-gray-500 hover:underline">
                          Annuler
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(p.idPatient)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Supprimer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Résultats questionnaires du patient sélectionné */}
      {selectedEmail && (
        <div className="bg-white border border-indigo-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-indigo-100 flex items-center justify-between bg-indigo-50">
            <h3 className="text-sm font-semibold text-indigo-800">
              Résultats questionnaires — {selectedEmail}
            </h3>
            {loadingReponses && <span className="text-xs text-indigo-500">Chargement...</span>}
          </div>
          {!loadingReponses && reponses.length === 0 && (
            <div className="px-4 py-4 text-sm text-gray-400">
              Aucun questionnaire complété pour ce patient.
            </div>
          )}
          {reponses.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Questionnaire</th>
                    <th className="px-4 py-2 text-left">Score</th>
                    <th className="px-4 py-2 text-left">Interprétation</th>
                  </tr>
                </thead>
                <tbody>
                  {reponses.map(r => (
                    <tr key={r.idReponse} className="border-t border-gray-100">
                      <td className="px-4 py-2 whitespace-nowrap text-gray-500">
                        {r.dateSoumission ? new Date(r.dateSoumission).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="px-4 py-2 font-medium">{r.titre || r.idQuestionnaire || '—'}</td>
                      <td className="px-4 py-2">
                        {r.scorePrincipal !== null ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            {r.scorePrincipal}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-2 text-gray-600 max-w-xs truncate" title={r.interpretation}>
                        {r.interpretation || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tableau assignations */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">
            Assignations récentes
            <span className="ml-2 text-gray-400 font-normal">({filteredAssignations.length})</span>
          </h3>
          <select value={statutFilter} onChange={e => setStatutFilter(e.target.value as StatutFilter)} className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-600">
            {(Object.keys(STATUT_LABELS) as StatutFilter[]).map(s => (
              <option key={s} value={s}>{STATUT_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Patient</th>
                <th className="px-4 py-2 text-left">Questionnaire</th>
                <th className="px-4 py-2 text-left">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssignations.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-4 text-center text-gray-400">Aucune assignation.</td></tr>
              )}
              {filteredAssignations.map(a => (
                <tr key={a.idAssignation} className="border-t border-gray-100">
                  <td className="px-4 py-2">{a.dateAssignation ? new Date(a.dateAssignation).toLocaleDateString('fr-FR') : '—'}</td>
                  <td className="px-4 py-2">{a.emailPatient || a.idPatient || '—'}</td>
                  <td className="px-4 py-2">{a.titre || a.idQuestionnaire || '—'}</td>
                  <td className="px-4 py-2"><StatusBadge value={a.statut} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
