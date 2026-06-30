'use client';

import { useEffect, useState } from 'react';
import type { PatientsPgApiResponse } from '@/app/api/praticien/patients-pg/route';
import type { SyntheseSchema } from '@/lib/anthropic';

type SyntheseRecord = {
  idSynthese: string;
  idPatient: string;
  dateGeneration: string;
  modele: string;
  statut: string;
  dateValidation: string | null;
  notesPraticien: string | null;
  syntheseJson: SyntheseSchema;
};

const STATUT_LABEL: Record<string, string> = {
  Brouillon_IA: 'Brouillon IA',
  Validee_Praticien: 'Validée',
  Corrigee_Praticien: 'Corrigée',
  Rejetee: 'Rejetée',
};

const STATUT_COLOR: Record<string, string> = {
  Brouillon_IA: 'bg-amber-100 text-amber-700',
  Validee_Praticien: 'bg-green-100 text-green-700',
  Corrigee_Praticien: 'bg-blue-100 text-blue-700',
  Rejetee: 'bg-red-100 text-red-700',
};

const PRIORITE_COLOR: Record<string, string> = {
  eleve: 'bg-red-100 text-red-700',
  modere: 'bg-amber-100 text-amber-700',
  faible: 'bg-green-100 text-green-700',
};

const PRIORITE_LABEL: Record<string, string> = {
  eleve: 'Élevée',
  modere: 'Modérée',
  faible: 'Faible',
};

const inputCls = 'bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm';
const btnPrimary = 'px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60';

export function SynthesePanel() {
  const [patients, setPatients] = useState<PatientsPgApiResponse['patients']>([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [syntheses, setSyntheses] = useState<SyntheseRecord[]>([]);
  const [selectedSynthese, setSelectedSynthese] = useState<SyntheseRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bookletHtml, setBookletHtml] = useState<string | null>(null);
  const [bookletInfo, setBookletInfo] = useState<{ dejaEnvoye: boolean; emailMasque: string | null } | null>(null);
  const [loadingBooklet, setLoadingBooklet] = useState(false);
  const [sending, setSending] = useState(false);
  const [relectureConfirmee, setRelectureConfirmee] = useState(false);
  const [forceSend, setForceSend] = useState(false);
  const [notes, setNotes] = useState('');
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    fetch('/api/praticien/patients-pg')
      .then(r => r.json())
      .then((d: PatientsPgApiResponse) => setPatients(d.patients ?? []))
      .catch(() => {});
  }, []);

  const loadSyntheses = async (idPatient: string) => {
    if (!idPatient) { setSyntheses([]); return; }
    setLoading(true);
    try {
      const r = await fetch(`/api/praticien/synthese?idPatient=${encodeURIComponent(idPatient)}`);
      const d = await r.json() as { syntheses: SyntheseRecord[] };
      setSyntheses(d.syntheses ?? []);
    } catch { setSyntheses([]); }
    finally { setLoading(false); }
  };

  const onSelectPatient = (id: string) => {
    setSelectedPatient(id);
    setSelectedSynthese(null);
    setBookletHtml(null);
    setBookletInfo(null);
    setFeedback(null);
    loadSyntheses(id);
  };

  const onGenerate = async () => {
    if (!selectedPatient) return;
    setGenerating(true);
    setFeedback(null);
    try {
      const r = await fetch('/api/praticien/synthese', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idPatient: selectedPatient }),
      });
      const d = await r.json() as { success?: boolean; error?: string; idSynthese?: string };
      if (!r.ok || !d.success) {
        setFeedback({ ok: false, msg: d.error ?? 'Erreur lors de la génération.' });
        return;
      }
      setFeedback({ ok: true, msg: 'Synthèse générée. Relisez et validez avant envoi.' });
      await loadSyntheses(selectedPatient);
    } catch {
      setFeedback({ ok: false, msg: 'Erreur réseau. Réessayez.' });
    } finally {
      setGenerating(false);
    }
  };

  const onAction = async (idSynthese: string, action: 'valider' | 'rejeter' | 'annoter') => {
    setSaving(true);
    setFeedback(null);
    try {
      const r = await fetch('/api/praticien/synthese', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idSynthese, action, notes }),
      });
      const d = await r.json() as { success?: boolean; error?: string; statut?: string };
      if (!r.ok || !d.success) {
        setFeedback({ ok: false, msg: d.error ?? 'Erreur.' });
        return;
      }
      const labels: Record<string, string> = { valider: 'Synthèse validée.', rejeter: 'Synthèse rejetée.', annoter: 'Notes enregistrées.' };
      setFeedback({ ok: true, msg: labels[action] ?? 'Mis à jour.' });
      await loadSyntheses(selectedPatient);
      setSelectedSynthese(null);
      setBookletHtml(null);
    } catch {
      setFeedback({ ok: false, msg: 'Erreur réseau. Réessayez.' });
    } finally {
      setSaving(false);
    }
  };

  const onLoadBooklet = async (idSynthese: string) => {
    setLoadingBooklet(true);
    setBookletHtml(null);
    setBookletInfo(null);
    setRelectureConfirmee(false);
    setForceSend(false);
    setFeedback(null);
    try {
      const r = await fetch(`/api/praticien/booklet?idSynthese=${encodeURIComponent(idSynthese)}`);
      const d = await r.json() as { html?: string; error?: string; dejaEnvoye?: boolean; dernierEnvoiEmailMasque?: string | null };
      if (!r.ok || !d.html) {
        setFeedback({ ok: false, msg: d.error ?? 'Impossible de générer le booklet.' });
        return;
      }
      setBookletHtml(d.html);
      setBookletInfo({ dejaEnvoye: d.dejaEnvoye ?? false, emailMasque: d.dernierEnvoiEmailMasque ?? null });
    } catch {
      setFeedback({ ok: false, msg: 'Erreur réseau. Réessayez.' });
    } finally {
      setLoadingBooklet(false);
    }
  };

  const onSend = async (idSynthese: string) => {
    if (!relectureConfirmee) {
      setFeedback({ ok: false, msg: 'Confirmez d\'abord la relecture du booklet.' });
      return;
    }
    setSending(true);
    setFeedback(null);
    try {
      const r = await fetch('/api/praticien/booklet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idSynthese, relectureConfirmee, forceSend }),
      });
      const d = await r.json() as { success?: boolean; error?: string; warning?: string; needsConfirmation?: boolean; emailMasque?: string };
      if (d.needsConfirmation) {
        setFeedback({ ok: false, msg: d.warning ?? 'Booklet déjà envoyé. Cochez le renvoi forcé pour confirmer.' });
        return;
      }
      if (!r.ok || !d.success) {
        setFeedback({ ok: false, msg: d.error ?? 'Erreur lors de l\'envoi.' });
        return;
      }
      setFeedback({ ok: true, msg: `Booklet envoyé à ${d.emailMasque ?? 'patient'}.` });
      setRelectureConfirmee(false);
      setForceSend(false);
      await loadSyntheses(selectedPatient);
    } catch {
      setFeedback({ ok: false, msg: 'Erreur réseau. Réessayez.' });
    } finally {
      setSending(false);
    }
  };

  const patient = patients.find(p => p.idPatient === selectedPatient);

  return (
    <div className="flex flex-col gap-6">

      {/* Sélection patient */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Patient</h3>
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={selectedPatient}
            onChange={e => onSelectPatient(e.target.value)}
            className={`${inputCls} w-full sm:w-96`}
          >
            <option value="">Sélectionner un patient</option>
            {patients.map(p => (
              <option key={p.idPatient} value={p.idPatient}>
                {`${p.prenom} ${p.nom} — ${p.email}`}
              </option>
            ))}
          </select>
          {selectedPatient && (
            <button
              onClick={onGenerate}
              disabled={generating}
              className={btnPrimary}
              style={{ backgroundColor: 'var(--primary)' }}
            >
              {generating ? 'Génération en cours...' : 'Générer une synthèse IA'}
            </button>
          )}
        </div>
        {feedback && (
          <p className={`mt-2 text-sm ${feedback.ok ? 'text-green-600' : 'text-red-600'}`}>{feedback.msg}</p>
        )}
      </div>

      {/* Liste des synthèses */}
      {selectedPatient && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">
              Synthèses de {patient ? `${patient.prenom} ${patient.nom}` : selectedPatient}
              <span className="ml-2 text-gray-400 font-normal">({syntheses.length})</span>
            </h3>
          </div>
          {loading ? (
            <div className="px-4 py-4 text-sm text-gray-500">Chargement...</div>
          ) : syntheses.length === 0 ? (
            <div className="px-4 py-4 text-sm text-gray-400">Aucune synthèse pour ce patient.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {syntheses.map(s => (
                <div key={s.idSynthese} className="px-4 py-3 flex flex-wrap gap-3 items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_COLOR[s.statut] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUT_LABEL[s.statut] ?? s.statut}
                    </span>
                    <span className="text-sm text-gray-600">
                      {new Date(s.dateGeneration).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-xs text-gray-400">{s.modele}</span>
                  </div>
                  <button
                    onClick={() => { setSelectedSynthese(s); setNotes(s.notesPraticien ?? ''); setBookletHtml(null); setBookletInfo(null); setFeedback(null); }}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Voir / gérer
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Détail synthèse sélectionnée */}
      {selectedSynthese && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">
              Synthèse {selectedSynthese.idSynthese}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_COLOR[selectedSynthese.statut] ?? 'bg-gray-100 text-gray-600'}`}>
                {STATUT_LABEL[selectedSynthese.statut] ?? selectedSynthese.statut}
              </span>
            </h3>
            <button onClick={() => { setSelectedSynthese(null); setBookletHtml(null); }} className="text-xs text-gray-400 hover:text-gray-600">
              Fermer
            </button>
          </div>

          {/* Résumé praticien */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Résumé praticien</p>
            <p className="text-sm text-gray-700 leading-relaxed">{selectedSynthese.syntheseJson.resume_praticien}</p>
          </div>

          {/* Axes prioritaires */}
          {selectedSynthese.syntheseJson.axes_prioritaires?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Axes prioritaires</p>
              <div className="flex flex-col gap-2">
                {selectedSynthese.syntheseJson.axes_prioritaires.map((axe, i) => (
                  <div key={i} className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-800">{axe.axe}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITE_COLOR[axe.niveau_priorite] ?? 'bg-gray-100 text-gray-600'}`}>
                        {PRIORITE_LABEL[axe.niveau_priorite] ?? axe.niveau_priorite}
                      </span>
                    </div>
                    {axe.arguments?.length > 0 && (
                      <ul className="text-xs text-gray-600 list-disc pl-4 space-y-0.5">
                        {axe.arguments.map((a, j) => <li key={j}>{a}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Points de vigilance */}
          {selectedSynthese.syntheseJson.points_de_vigilance?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Points de vigilance</p>
              <ul className="text-sm text-gray-700 list-disc pl-4 space-y-0.5">
                {selectedSynthese.syntheseJson.points_de_vigilance.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}

          {/* Limites */}
          <p className="text-xs text-gray-400 italic">{selectedSynthese.syntheseJson.limites}</p>

          {/* Actions validation */}
          {selectedSynthese.statut === 'Brouillon_IA' && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
              <button onClick={() => onAction(selectedSynthese.idSynthese, 'valider')} disabled={saving} className={`${btnPrimary} bg-green-600`}>
                {saving ? '...' : 'Valider la synthèse'}
              </button>
              <button onClick={() => onAction(selectedSynthese.idSynthese, 'rejeter')} disabled={saving} className={`${btnPrimary} bg-red-500`}>
                {saving ? '...' : 'Rejeter'}
              </button>
            </div>
          )}

          {/* Notes praticien */}
          {(selectedSynthese.statut === 'Validee_Praticien' || selectedSynthese.statut === 'Corrigee_Praticien') && (
            <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Note / correction praticien</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Ajoutez une note ou une correction à inclure dans le booklet..."
                className={`${inputCls} resize-y`}
              />
              <button onClick={() => onAction(selectedSynthese.idSynthese, 'annoter')} disabled={saving} className={`${btnPrimary} self-start`} style={{ backgroundColor: 'var(--primary)' }}>
                {saving ? '...' : 'Enregistrer la note'}
              </button>
            </div>
          )}

          {/* Booklet */}
          {(selectedSynthese.statut === 'Validee_Praticien' || selectedSynthese.statut === 'Corrigee_Praticien') && (
            <div className="pt-2 border-t border-gray-100 flex flex-col gap-3">
              <h4 className="text-sm font-semibold text-gray-700">Booklet patient</h4>
              <button
                onClick={() => onLoadBooklet(selectedSynthese.idSynthese)}
                disabled={loadingBooklet}
                className={`${btnPrimary} self-start bg-indigo-600`}
              >
                {loadingBooklet ? 'Préparation...' : 'Prévisualiser le booklet'}
              </button>

              {bookletHtml && (
                <div className="flex flex-col gap-3">
                  {bookletInfo?.dejaEnvoye && (
                    <div className="text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-700">
                      Booklet déjà envoyé à {bookletInfo.emailMasque ?? 'patient'}.
                    </div>
                  )}
                  <div className="border border-gray-200 rounded-lg overflow-hidden" style={{ height: 480 }}>
                    <iframe srcDoc={bookletHtml} title="Prévisualisation booklet" className="w-full h-full" sandbox="allow-same-origin" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input type="checkbox" checked={relectureConfirmee} onChange={e => setRelectureConfirmee(e.target.checked)} />
                      J&apos;ai relu et validé le booklet ci-dessus avant envoi au patient.
                    </label>
                    {bookletInfo?.dejaEnvoye && (
                      <label className="flex items-center gap-2 text-sm text-amber-700 cursor-pointer">
                        <input type="checkbox" checked={forceSend} onChange={e => setForceSend(e.target.checked)} />
                        Confirmer le renvoi (déjà envoyé précédemment).
                      </label>
                    )}
                    <button
                      onClick={() => onSend(selectedSynthese.idSynthese)}
                      disabled={sending || !relectureConfirmee}
                      className={`${btnPrimary} self-start bg-green-600`}
                    >
                      {sending ? 'Envoi en cours...' : 'Envoyer au patient'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {feedback && (
            <p className={`text-sm ${feedback.ok ? 'text-green-600' : 'text-red-600'}`}>{feedback.msg}</p>
          )}
        </div>
      )}
    </div>
  );
}
