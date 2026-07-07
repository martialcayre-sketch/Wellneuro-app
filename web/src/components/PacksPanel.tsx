'use client';

import { useEffect, useState } from 'react';
import type { Pack, PacksApiResponse, MutatePackResponse } from '@/app/api/praticien/packs/route';
import type { AssignPackResponse } from '@/app/api/praticien/packs/assign/route';
import type { QuestionnairesApiResponse } from '@/app/api/praticien/questionnaires/route';
import type { QuestionnairesRegistryApiResponse } from '@/app/api/praticien/questionnaires/registry/route';
import { Badge } from '@/components/ui/Badge';

type Questionnaire = QuestionnairesApiResponse['questionnaires'][number];
type PatientLite = { email: string; prenom: string; nom: string };
type SuggestedPackSelection = {
  registryPackId: string;
  titre: string;
  nonce: number;
};

const inputCls = 'bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground';
const btnPrimary = 'px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-60';

export function PacksPanel({
  questionnaires,
  registry,
  suggestedPackSelection,
  patients,
}: {
  questionnaires: Questionnaire[];
  registry: QuestionnairesRegistryApiResponse | null;
  suggestedPackSelection: SuggestedPackSelection | null;
  patients: PatientLite[];
}) {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [assignFeedback, setAssignFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // Formulaire de création de pack
  const [nom, setNom] = useState('');
  const [thematique, setThematique] = useState('');
  const [description, setDescription] = useState('');
  const [categorieFilter, setCategorieFilter] = useState('');
  const [categorieView, setCategorieView] = useState<'fonctionnelle' | 'historique'>('fonctionnelle');
  const [selectedQids, setSelectedQids] = useState<Set<string>>(new Set());

  // Formulaire d'assignation groupée
  const [assignForm, setAssignForm] = useState({ idPack: '', emailPatient: '', dateLimite: '', notes: '' });

  const loadPacks = async () => {
    try {
      const r = await fetch('/api/praticien/packs');
      const json = (await r.json()) as PacksApiResponse;
      setPacks(json.packs ?? []);
    } catch {
      setPacks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPacks();
  }, []);

  useEffect(() => {
    if (!suggestedPackSelection) return;

    const normalize = (value: string) =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

    const target = normalize(suggestedPackSelection.titre);
    const actifs = packs.filter(p => p.actif);

    const match =
      actifs.find(p => normalize(p.nom) === target) ??
      actifs.find(p => normalize(p.nom).includes(target) || target.includes(normalize(p.nom)));

    if (!match) {
      setAssignFeedback({
        ok: false,
        msg: `Le pack suggéré « ${suggestedPackSelection.titre} » n'existe pas encore parmi les packs actifs.`,
      });
      return;
    }

    setAssignForm(prev => ({ ...prev, idPack: match.idPack }));
    setAssignFeedback({ ok: true, msg: `Pack « ${match.nom} » préselectionné pour l'assignation.` });
  }, [packs, suggestedPackSelection]);

  const categoriesRegistry = registry?.categories ?? [];
  const categoryById = new Map<string, (typeof categoriesRegistry)[number]>(
    categoriesRegistry.map(c => [c.id as string, c]),
  );

  const getFunctionalCategoryLabel = (id: string): string => categoryById.get(id)?.titre ?? id;
  const getFunctionalCategoryPhase = (id: string): 'mvp' | 'phase_2' => categoryById.get(id)?.phase ?? 'phase_2';

  const categories = categorieView === 'fonctionnelle'
    ? Array.from(new Set(questionnaires.map(q => q.categorieFonctionnellePrincipale).filter(Boolean))).sort((a, b) =>
      getFunctionalCategoryLabel(a).localeCompare(getFunctionalCategoryLabel(b), 'fr'),
    )
    : Array.from(new Set(questionnaires.map(q => q.categorie).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'fr'),
    );

  const questionnairesFiltres = categorieFilter
    ? questionnaires.filter(q =>
      categorieView === 'fonctionnelle'
        ? q.categorieFonctionnellePrincipale === categorieFilter
        : q.categorie === categorieFilter,
    )
    : questionnaires;

  const toggleQid = (id: string) => {
    setSelectedQids(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const titreParId = new Map(questionnaires.map(q => [q.id, q.titre]));

  const onCreatePack = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const r = await fetch('/api/praticien/packs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom, thematique, description, qids: Array.from(selectedQids) }),
      });
      const json = (await r.json()) as MutatePackResponse;
      if (!r.ok || !json.success) {
        setFeedback({ ok: false, msg: json.error ?? 'Erreur lors de la création du pack.' });
        return;
      }
      setFeedback({ ok: true, msg: `Pack « ${nom} » créé.` });
      setNom('');
      setThematique('');
      setDescription('');
      setSelectedQids(new Set());
      await loadPacks();
    } catch {
      setFeedback({ ok: false, msg: 'Erreur réseau. Réessayez.' });
    } finally {
      setSaving(false);
    }
  };

  const onDesactiver = async (idPack: string, nomPack: string) => {
    setFeedback(null);
    try {
      const r = await fetch(`/api/praticien/packs?idPack=${encodeURIComponent(idPack)}`, { method: 'DELETE' });
      const json = (await r.json()) as MutatePackResponse;
      if (!r.ok || !json.success) {
        setFeedback({ ok: false, msg: json.error ?? 'Erreur lors de la désactivation.' });
        return;
      }
      setFeedback({ ok: true, msg: `Pack « ${nomPack} » désactivé.` });
      await loadPacks();
    } catch {
      setFeedback({ ok: false, msg: 'Erreur réseau. Réessayez.' });
    }
  };

  const onToggleDefaut = async (idPack: string, nomPack: string, parDefaut: boolean) => {
    setFeedback(null);
    try {
      const r = await fetch('/api/praticien/packs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idPack, parDefaut }),
      });
      const json = (await r.json()) as MutatePackResponse;
      if (!r.ok || !json.success) {
        setFeedback({ ok: false, msg: json.error ?? 'Erreur lors de la mise à jour du pack.' });
        return;
      }
      setFeedback({
        ok: true,
        msg: parDefaut
          ? `Pack « ${nomPack} » défini comme pack de base.`
          : `Pack « ${nomPack} » n’est plus le pack de base.`,
      });
      await loadPacks();
    } catch {
      setFeedback({ ok: false, msg: 'Erreur réseau. Réessayez.' });
    }
  };

  const onAssignPack = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAssigning(true);
    setAssignFeedback(null);
    try {
      const r = await fetch('/api/praticien/packs/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignForm),
      });
      const json = (await r.json()) as AssignPackResponse;
      if (!r.ok || !json.success) {
        setAssignFeedback({ ok: false, msg: json.error ?? "Erreur lors de l'assignation du pack." });
        return;
      }
      setAssignFeedback({
        ok: true,
        msg: `${json.count} questionnaire(s) du pack « ${json.packNom} » assigné(s).`,
      });
      setAssignForm({ idPack: '', emailPatient: '', dateLimite: '', notes: '' });
    } catch {
      setAssignFeedback({ ok: false, msg: 'Erreur réseau. Réessayez.' });
    } finally {
      setAssigning(false);
    }
  };

  const packsActifs = packs.filter(p => p.actif);

  return (
    <div className="flex flex-col gap-4">
      {/* Création d'un pack */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Nouveau pack de questionnaires</h3>
        <form className="flex flex-col gap-3" onSubmit={onCreatePack}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input required value={nom} onChange={e => setNom(e.target.value)} placeholder="Nom du pack *" className={inputCls} maxLength={120} />
            <input value={thematique} onChange={e => setThematique(e.target.value)} placeholder="Thématique (optionnel)" className={inputCls} maxLength={120} />
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optionnel)" className={inputCls} maxLength={500} />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground">Vue catégories</label>
            <select
              value={categorieView}
              onChange={e => {
                setCategorieView(e.target.value as 'fonctionnelle' | 'historique');
                setCategorieFilter('');
              }}
              className={inputCls}
              aria-label="Type de catégories"
            >
              <option value="fonctionnelle">Fonctionnelles (recommandé)</option>
              <option value="historique">Historiques</option>
            </select>
            <label className="text-xs text-muted-foreground">Filtrer les questionnaires</label>
            <select value={categorieFilter} onChange={e => setCategorieFilter(e.target.value)} className={inputCls} aria-label="Filtrer par catégorie">
              <option value="">Toutes les catégories</option>
              {categories.map(c => (
                <option key={c} value={c}>
                  {categorieView === 'fonctionnelle'
                    ? `${getFunctionalCategoryLabel(c)}${getFunctionalCategoryPhase(c) === 'mvp' ? ' (MVP)' : ''}`
                    : c}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground">{selectedQids.size} sélectionné(s)</span>
          </div>

          <div className="max-h-56 overflow-y-auto border border-border rounded-lg p-2 flex flex-col gap-1">
            {questionnairesFiltres.map(q => (
              <label key={q.id} className="flex items-center gap-2 text-sm text-foreground hover:bg-muted/50 rounded px-1 py-0.5 cursor-pointer">
                <input type="checkbox" checked={selectedQids.has(q.id)} onChange={() => toggleQid(q.id)} />
                <span>{q.titre}</span>
                <span className="text-xs text-muted-foreground">
                  ({categorieView === 'fonctionnelle' ? getFunctionalCategoryLabel(q.categorieFonctionnellePrincipale) : q.categorie})
                </span>
              </label>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving || selectedQids.size === 0 || !nom.trim()} className={btnPrimary}>
              {saving ? 'Création...' : 'Créer le pack'}
            </button>
            {feedback && (
              <span className={`text-sm ${feedback.ok ? 'text-green-600' : 'text-red-400'}`}>{feedback.msg}</span>
            )}
          </div>
        </form>
      </div>

      {/* Liste des packs */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Packs existants</h3>
        {loading ? (
          <p className="text-sm text-muted-foreground">Chargement des packs...</p>
        ) : packs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun pack pour l'instant.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {packs.map(p => (
              <li key={p.idPack} className="flex items-start justify-between gap-3 border border-border rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">{p.nom}</span>
                    {p.thematique && <span className="text-xs text-muted-foreground">· {p.thematique}</span>}
                    <Badge variant={p.actif ? 'success' : 'neutral'}>{p.actif ? 'Actif' : 'Inactif'}</Badge>
                    {p.parDefaut && <Badge variant="warning">Pack de base</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {p.qids.length} questionnaire(s) : {p.qids.map(id => titreParId.get(id) ?? id).join(', ')}
                  </p>
                </div>
                {p.actif && (
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => onToggleDefaut(p.idPack, p.nom, !p.parDefaut)}
                      className="text-xs text-foreground hover:underline"
                    >
                      {p.parDefaut ? 'Retirer par défaut' : 'Définir par défaut'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDesactiver(p.idPack, p.nom)}
                      className="text-xs text-red-400 hover:underline"
                    >
                      Désactiver
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Assigner un pack */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Assigner un pack à un patient</h3>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={onAssignPack}>
          <select required value={assignForm.idPack} onChange={e => setAssignForm(p => ({ ...p, idPack: e.target.value }))} className={inputCls}>
            <option value="">Pack *</option>
            {packsActifs.map(p => (
              <option key={p.idPack} value={p.idPack}>{`${p.nom} (${p.qids.length})`}</option>
            ))}
          </select>
          <select required value={assignForm.emailPatient} onChange={e => setAssignForm(p => ({ ...p, emailPatient: e.target.value }))} className={inputCls}>
            <option value="">Patient *</option>
            {patients.map(pat => (
              <option key={pat.email} value={pat.email}>{`${pat.prenom} ${pat.nom} — ${pat.email}`}</option>
            ))}
          </select>
          <input type="date" value={assignForm.dateLimite} onChange={e => setAssignForm(p => ({ ...p, dateLimite: e.target.value }))} className={inputCls} />
          <input value={assignForm.notes} onChange={e => setAssignForm(p => ({ ...p, notes: e.target.value }))} placeholder="Notes praticien (optionnel)" className={inputCls} maxLength={500} />
          <div className="flex items-center gap-3 md:col-span-2">
            <button type="submit" disabled={assigning} className={btnPrimary}>
              {assigning ? 'Assignation...' : 'Assigner le pack'}
            </button>
            {assignFeedback && (
              <span className={`text-sm ${assignFeedback.ok ? 'text-green-600' : 'text-red-400'}`}>{assignFeedback.msg}</span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
