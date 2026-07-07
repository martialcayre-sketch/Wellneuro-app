'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  CreatePatientResponse,
  DeletePatientResponse,
  PatchPatientResponse,
  PatientsApiResponse,
  PatientsPagination,
} from '@/app/api/praticien/patients/route';
import type { CreateAssignationResponse } from '@/app/api/praticien/assignations/route';
import type { QuestionnairesApiResponse } from '@/app/api/praticien/questionnaires/route';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { PatientRow } from '@/components/ui/PatientRow';
import { Pagination } from '@/components/ui/Pagination';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

type SortBy = 'nom' | 'email';
type StatutFilter = '' | 'Complété' | 'En attente';

const STATUT_LABELS: Record<StatutFilter, string> = {
  '': 'Tous les statuts',
  'Complété': 'Complété',
  'En attente': 'En attente',
};

function erreurLisible(reason?: string, fallback?: string): string {
  const map: Record<string, string> = {
    unauthenticated: 'Votre session a expiré. Déconnectez-vous puis reconnectez-vous.',
    invalid_payload: fallback ?? 'Données invalides.',
    duplicate_email: 'Un patient avec cet email existe déjà.',
    patient_not_found: 'Patient introuvable.',
    questionnaire_not_found: 'Questionnaire introuvable.',
    exception: 'Erreur technique. Vérifiez le terminal Next.js.',
  };
  return (reason && map[reason]) ?? fallback ?? 'Erreur inconnue.';
}

function StatusBadge({ value }: { value: string }) {
  const status = value || '—';
  const variant: BadgeVariant = status === 'Complété' ? 'success' : 'neutral';
  return <Badge variant={variant}>{status}</Badge>;
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
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null); // idPatient en attente de confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('nom');
  const [statutFilter, setStatutFilter] = useState<StatutFilter>('');
  const [page, setPage] = useState(1);
  const [tablePatients, setTablePatients] = useState<PatientsApiResponse['patients']>([]);
  const [pagination, setPagination] = useState<PatientsPagination | null>(null);
  const [loadingTable, setLoadingTable] = useState(true);
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
  // Filtre catégorie du sélecteur de questionnaire ('' = Toutes). Purement
  // côté client : restreint la liste sans appel réseau ni migration.
  const [categorieFilter, setCategorieFilter] = useState('');

  const loadData = async () => {
    const r = await fetch('/api/praticien/patients');
    const json = (await r.json()) as PatientsApiResponse;
    setData(json);
  };

  // Pagination côté serveur (skip/take) : source de vérité pour le tableau
  // affiché. `data.patients` (chargé sans pagination par loadData) reste la
  // liste complète utilisée par le sélecteur "Nouvelle assignation".
  const loadPatientsTable = async (targetPage: number, currentSearch: string, currentSortBy: SortBy) => {
    setLoadingTable(true);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(PAGE_SIZE),
        sortBy: currentSortBy,
      });
      if (currentSearch.trim()) params.set('search', currentSearch.trim());
      const r = await fetch(`/api/praticien/patients?${params.toString()}`);
      const json = (await r.json()) as PatientsApiResponse;
      setTablePatients(json.patients ?? []);
      setPagination(json.pagination ?? null);
    } catch {
      setTablePatients([]);
      setPagination(null);
    } finally {
      setLoadingTable(false);
    }
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

  // Recherche/tri changés : revient en page 1 et recharge (debounce sur la
  // recherche pour éviter une requête par frappe clavier). Ignoré au premier
  // rendu : le chargement initial est déjà couvert par l'effet [page].
  const isFirstSearchRender = useRef(true);
  useEffect(() => {
    if (isFirstSearchRender.current) {
      isFirstSearchRender.current = false;
      return;
    }
    const timeout = setTimeout(() => {
      setPage(1);
      loadPatientsTable(1, search, sortBy);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sortBy]);

  useEffect(() => {
    loadPatientsTable(page, search, sortBy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const refreshPatients = () => Promise.all([loadData(), loadPatientsTable(page, search, sortBy)]);

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
      await refreshPatients();
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
        await refreshPatients();
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
      await refreshPatients();
      setTimeout(() => setEditState(null), 800);
    } catch {
      setEditFeedback({ ok: false, msg: 'Erreur réseau. Réessayez.' });
    } finally {
      setSavingEdit(false);
    }
  };

  const filteredAssignations = useMemo(() => {
    const list = data?.assignations ?? [];
    if (!statutFilter) return list;
    return list.filter(a => a.statut === statutFilter);
  }, [data?.assignations, statutFilter]);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Chargement des données patients...</div>;
  }

  if (data?.unavailable) {
    return (
      <div className="bg-muted border border-border rounded-xl p-4 text-sm text-muted-foreground">
        {erreurLisible(data.reason)}
      </div>
    );
  }

  const inputCls = 'bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground';
  const btnPrimary = 'px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-60';

  // Catégories distinctes (tri alphabétique FR) pour le filtre d'assignation.
  const categories = Array.from(new Set(questionnaires.map(q => q.categorie).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, 'fr'),
  );
  const questionnairesFiltres = categorieFilter
    ? questionnaires.filter(q => q.categorie === categorieFilter)
    : questionnaires;

  return (
    <div className="flex flex-col gap-6">

      {/* Nouveau patient */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Nouveau patient</h3>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={onCreatePatient}>
          <input required value={form.prenom} onChange={e => setForm(p => ({ ...p, prenom: e.target.value }))} placeholder="Prénom *" className={inputCls} maxLength={100} />
          <input required value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} placeholder="Nom *" className={inputCls} maxLength={100} />
          <input required type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Email *" className={inputCls} maxLength={254} />
          <input value={form.telephone} onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))} placeholder="Téléphone" className={inputCls} maxLength={30} />
          <input type="date" value={form.dateNaissance} onChange={e => setForm(p => ({ ...p, dateNaissance: e.target.value }))} className={inputCls} />
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? 'Création...' : 'Créer le patient'}
            </button>
            {feedback && (
              <span className={`text-sm ${feedback.ok ? 'text-green-600' : 'text-red-400'}`}>
                {feedback.msg}
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Nouvelle assignation */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Nouvelle assignation questionnaire</h3>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={onCreateAssignation}>
          <select required value={assignationForm.emailPatient} onChange={e => setAssignationForm(p => ({ ...p, emailPatient: e.target.value }))} className={inputCls}>
            <option value="">Patient *</option>
            {(data?.patients ?? []).map(p => (
              <option key={p.idPatient} value={p.email}>{`${p.prenom} ${p.nom} — ${p.email}`}</option>
            ))}
          </select>
          <select
            value={categorieFilter}
            onChange={e => {
              setCategorieFilter(e.target.value);
              // Réinitialise le questionnaire sélectionné s'il n'est plus visible.
              setAssignationForm(p => ({ ...p, idQuestionnaire: '' }));
            }}
            className={inputCls}
            aria-label="Filtrer par catégorie"
          >
            <option value="">Toutes les catégories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select required value={assignationForm.idQuestionnaire} onChange={e => setAssignationForm(p => ({ ...p, idQuestionnaire: e.target.value }))} className={inputCls}>
            <option value="">Questionnaire *</option>
            {questionnairesFiltres.map(q => (
              <option key={q.id} value={q.id}>{`${q.titre} (${q.categorie})`}</option>
            ))}
          </select>
          <input type="date" value={assignationForm.dateLimite} onChange={e => setAssignationForm(p => ({ ...p, dateLimite: e.target.value }))} className={inputCls} />
          <input value={assignationForm.notes} onChange={e => setAssignationForm(p => ({ ...p, notes: e.target.value }))} placeholder="Notes praticien (optionnel)" className={inputCls} maxLength={500} />
          <div className="flex items-center gap-3 md:col-span-2">
            <button type="submit" disabled={savingAssignation} className={btnPrimary}>
              {savingAssignation ? 'Création...' : 'Créer l’assignation'}
            </button>
            {assignationFeedback && (
              <span className={`text-sm ${assignationFeedback.ok ? 'text-green-600' : 'text-red-400'}`}>
                {assignationFeedback.msg}
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Édition patient inline */}
      {editState && (
        <div className="bg-surface border border-accent rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Modifier patient <span className="font-normal text-muted-foreground">{editState.idPatient}</span>
          </h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Téléphone</label>
              <input value={editState.telephone} onChange={e => setEditState(s => s ? { ...s, telephone: e.target.value } : s)} className={inputCls} maxLength={30} placeholder="Téléphone" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Actif</label>
              <select value={editState.actif} onChange={e => setEditState(s => s ? { ...s, actif: e.target.value as 'OUI' | 'NON' } : s)} className={inputCls}>
                <option value="OUI">Actif</option>
                <option value="NON">Inactif</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onSaveEdit} disabled={savingEdit} className={btnPrimary}>
                {savingEdit ? 'Enregistrement...' : 'Enregistrer'}
              </button>
              <button onClick={() => setEditState(null)} className="px-3 py-2 rounded-lg text-sm text-muted-foreground border border-border">
                Annuler
              </button>
            </div>
            {editFeedback && (
              <span className={`text-sm ${editFeedback.ok ? 'text-green-600' : 'text-red-400'}`}>
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
        <div className="text-sm text-muted-foreground">
          {pagination ? `${pagination.total} patient(s)` : '—'}
        </div>
      </div>

      {/* Tableau patients */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Patients</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
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
              {!loadingTable && tablePatients.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-4 text-center text-muted-foreground">Aucun patient.</td></tr>
              )}
              {tablePatients.map(p => (
                <PatientRow
                  key={p.idPatient}
                  patient={{ ...p, actif: p.actif === 'OUI' ? 'OUI' : 'NON' }}
                  onEdit={openEdit}
                  onDelete={onDelete}
                  confirmationSuppression={confirmDelete === p.idPatient}
                  onDemanderSuppression={setConfirmDelete}
                  onAnnulerSuppression={() => setConfirmDelete(null)}
                  suppressionEnCours={deletingId === p.idPatient}
                />
              ))}
            </tbody>
          </table>
        </div>
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border">
            <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* Tableau assignations */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Assignations récentes
            <span className="ml-2 text-muted-foreground font-normal">({filteredAssignations.length})</span>
          </h3>
          <select value={statutFilter} onChange={e => setStatutFilter(e.target.value as StatutFilter)} className="text-xs border border-border rounded-lg px-2 py-1 bg-surface text-muted-foreground">
            {(Object.keys(STATUT_LABELS) as StatutFilter[]).map(s => (
              <option key={s} value={s}>{STATUT_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Patient</th>
                <th className="px-4 py-2 text-left">Questionnaire</th>
                <th className="px-4 py-2 text-left">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssignations.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-4 text-center text-muted-foreground">Aucune assignation.</td></tr>
              )}
              {filteredAssignations.map(a => (
                <tr key={a.idAssignation} className="border-t border-border">
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
