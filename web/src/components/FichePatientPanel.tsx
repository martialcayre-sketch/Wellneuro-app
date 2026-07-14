'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Stethoscope } from 'lucide-react';
import type { EquilibreApiResponse, PrioriteBesoin } from '@/app/api/praticien/equilibre/route';
import type { PatientsApiResponse } from '@/app/api/praticien/patients/route';
import type { PatchAssignationResponse } from '@/app/api/praticien/assignations/route';
import type { ReponsesApiResponse, ReponseQuestionnaire } from '@/app/api/praticien/reponses/route';
import type { ResultatMomentum } from '@/lib/equilibre/types';
import type { ScoreSubScore } from '@/lib/scoring/types';
import { buildMiniSynthese } from '@/lib/scoring/miniSynthese';
import { ScoreGauge } from '@/components/ui/ScoreGauge';
import { EvidenceBadge } from '@/components/ui/EvidenceBadge';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { CerclesConcentriques } from '@/components/ui/CerclesConcentriques';
import { ModeConsultation } from '@/components/ui/ModeConsultation';
import { PatientPreview } from '@/components/PatientPreview';
import { MissingDataPanel } from '@/components/patient-cockpit/MissingDataPanel';
import { DecisionSummaryCard } from '@/components/patient-cockpit/DecisionSummaryCard';
import { ProtocolMiniBuilder } from '@/components/patient-cockpit/ProtocolMiniBuilder';
import { ProtocolConsultationPanel } from '@/components/patient-cockpit/ProtocolConsultationPanel';

type ScoreCertification = { source?: string; status?: string };

function getArrayField(scores: Record<string, unknown> | null, key: string): string[] {
  const value = scores?.[key];
  return Array.isArray(value) ? value.map(String) : [];
}

function certificationBadge(certification: ScoreCertification | null) {
  if (!certification) return null;
  if (certification.source === 'drive' && certification.status === 'certifie') {
    return { label: 'Certifié Drive', variant: 'success' as BadgeVariant };
  }
  if (certification.source === 'drive' && certification.status === 'ambigu') {
    return { label: 'Drive ambigu', variant: 'warning' as BadgeVariant };
  }
  if (certification.status === 'a_verifier') {
    return { label: 'À vérifier', variant: 'warning' as BadgeVariant };
  }
  if (certification.status === 'non_score') {
    return { label: 'Non scoré', variant: 'neutral' as BadgeVariant };
  }
  return { label: 'Non certifié', variant: 'neutral' as BadgeVariant };
}

function interpColorToVariant(color?: string): BadgeVariant {
  if (color === 'success' || color === 'warning' || color === 'danger') return color;
  return 'neutral';
}

function ObjetGauge({ label, value }: { label: string; value: number | null }) {
  if (value === null) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 bg-surface border border-border rounded-xl p-4 h-[148px]">
        <span className="text-sm text-muted-foreground">Non mesuré</span>
        <span className="text-xs text-muted-foreground uppercase tracking-wide text-center">{label}</span>
      </div>
    );
  }
  return <ScoreGauge value={value} label={label} />;
}

function MomentumCard({ momentum }: { momentum: ResultatMomentum | null }) {
  if (!momentum) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 bg-surface border border-border rounded-xl p-4 h-[148px]">
        <span className="text-sm text-muted-foreground">Non mesuré</span>
        <span className="text-xs text-muted-foreground uppercase tracking-wide">Momentum</span>
        <span className="text-xs text-muted-foreground text-center">Historique insuffisant</span>
      </div>
    );
  }
  const signe = momentum.delta > 0 ? '+' : '';
  return (
    <div className="flex flex-col items-center justify-center gap-1 bg-surface border border-border rounded-xl p-4 h-[148px]">
      <span className="text-2xl font-bold text-foreground">
        {signe}
        {momentum.delta}
      </span>
      <span className="text-xs text-muted-foreground uppercase tracking-wide">Momentum</span>
      <Badge variant={momentum.tendance === 'hausse' ? 'success' : momentum.tendance === 'baisse' ? 'warning' : 'neutral'}>
        {momentum.tendance}
      </Badge>
    </div>
  );
}

function LegendeNiveauxPreuve() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span><span className="font-medium text-foreground">A</span> — questionnaire clinique validé</span>
      <span><span className="font-medium text-foreground">B</span> — référentiel neuronutrition</span>
      <span><span className="font-medium text-foreground">C</span> — biologie fonctionnelle interprétative</span>
      <span><span className="font-medium text-foreground">D</span> — hypothèse WellNeuro</span>
    </div>
  );
}

export function FichePatientPanel({ idPatient }: { idPatient: string }) {
  const [data, setData] = useState<EquilibreApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [reponses, setReponses] = useState<ReponseQuestionnaire[]>([]);
  const [loadingReponses, setLoadingReponses] = useState(true);
  const [assignationsModif, setAssignationsModif] = useState<PatientsApiResponse['assignations']>([]);
  const [deverrouillageId, setDeverrouillageId] = useState<string | null>(null);
  const [modeConsultationActif, setModeConsultationActif] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/praticien/equilibre?idPatient=${encodeURIComponent(idPatient)}`)
      .then(r => r.json())
      .then((d: EquilibreApiResponse) => setData(d))
      .catch(() => setData({ unavailable: true, reason: 'exception' }))
      .finally(() => setLoading(false));
  }, [idPatient]);

  useEffect(() => {
    if (!data || 'unavailable' in data) return;
    const email = data.patient.email;

    setLoadingReponses(true);
    fetch(`/api/praticien/reponses?email=${encodeURIComponent(email)}`)
      .then(r => r.json())
      .then((d: ReponsesApiResponse) => setReponses(d.reponses ?? []))
      .catch(() => setReponses([]))
      .finally(() => setLoadingReponses(false));

    fetch('/api/praticien/patients')
      .then(r => r.json())
      .then((d: PatientsApiResponse) => {
        setAssignationsModif(
          (d.assignations ?? []).filter(a => a.emailPatient === email && a.statutReponses === 'modification_demandee')
        );
      })
      .catch(() => setAssignationsModif([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const onDebloquer = async (idAssignation: string) => {
    setDeverrouillageId(idAssignation);
    try {
      const r = await fetch('/api/praticien/assignations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idAssignation }),
      });
      const json = (await r.json()) as PatchAssignationResponse;
      if (json.success) setAssignationsModif(prev => prev.filter(a => a.idAssignation !== idAssignation));
    } finally {
      setDeverrouillageId(null);
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Chargement de la fiche patient...</div>;
  }

  if (!data || 'unavailable' in data) {
    const reason = data && 'unavailable' in data ? data.reason : 'exception';
    const message =
      reason === 'patient_not_found'
        ? 'Patient introuvable.'
        : reason === 'unauthenticated'
          ? 'Votre session a expiré. Déconnectez-vous puis reconnectez-vous.'
          : 'Erreur technique. Vérifiez le terminal Next.js.';
    return <div className="bg-muted border border-border rounded-xl p-4 text-sm text-muted-foreground">{message}</div>;
  }

  const { patient, objetsCliniques, priorites } = data;
  const derniereAssignationId = reponses[0]?.idAssignation || null;

  return (
    <ModeConsultation active={modeConsultationActif} onToggle={() => setModeConsultationActif(false)}>
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{`${patient.prenom} ${patient.nom}`.trim()}</h2>
          <p className="text-sm text-muted-foreground mt-1">{patient.email}</p>
        </div>
        <div className="flex items-center gap-3">
          {derniereAssignationId && (
            <PatientPreview patientId={idPatient} assignationId={derniereAssignationId} />
          )}
          {!modeConsultationActif && (
            <button
              type="button"
              onClick={() => setModeConsultationActif(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary"
            >
              <Stethoscope size={16} strokeWidth={2} />
              Mode consultation
            </button>
          )}
          <Link href="/dashboard/patients" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
            ← Retour aux patients
          </Link>
        </div>
      </div>

      {/* Cartographie neuro-fonctionnelle — 5 objets cliniques */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Cartographie neuro-fonctionnelle
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <ObjetGauge label="Indice global" value={objetsCliniques.indiceGlobal} />
          <ObjetGauge label="Stabilité métabolique" value={objetsCliniques.stabiliteMetabolique} />
          <ObjetGauge label="Réserve d'adaptation" value={objetsCliniques.reserveAdaptation} />
          <ObjetGauge label="Clarté" value={objetsCliniques.clarte} />
          <MomentumCard momentum={objetsCliniques.momentum} />
        </div>
      </section>

      {/* Vue d'ensemble de l'équilibre — cercles concentriques par strate */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Vue d&apos;ensemble de l&apos;équilibre
        </h3>
        <div className="bg-surface border border-border rounded-xl p-4 flex justify-center">
          <CerclesConcentriques
            besoins={priorites.map(p => ({
              id: p.besoin,
              libelle: p.libellePraticien,
              strate: p.strate,
              couverture: p.couverture,
            }))}
          />
        </div>
      </section>

      {/* Les manques et bloqueurs précèdent toujours la décision. Le flux
          runtime ClinicalSnapshot/ClinicalReview sera branché dans un lot dédié. */}
      <MissingDataPanel missingData={null} discordances={null} />
      <DecisionSummaryCard decisionCard={null} />
      <ProtocolMiniBuilder decisionCard={null} />
      <ProtocolConsultationPanel decisionCard={null} protocolDraft={null} />

      {/* Couvertures descriptives — aucune priorité clinique n'est déduite ici. */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Couverture des 12 besoins
          </h3>
          <Link
            href={`/dashboard/patients/${encodeURIComponent(idPatient)}/besoins`}
            className="text-xs text-accent hover:underline"
          >
            Voir le détail des 12 besoins →
          </Link>
        </div>
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Besoin</th>
                <th className="px-4 py-2 text-left">Couverture</th>
                <th className="px-4 py-2 text-left">Niveau de preuve</th>
              </tr>
            </thead>
            <tbody>
              {priorites.map((p: PrioriteBesoin) => (
                <tr key={p.besoin} className="border-t border-border">
                  <td className="px-4 py-2">{p.libellePraticien}</td>
                  <td className="px-4 py-2 text-muted-foreground">{p.couverture !== null ? `${p.couverture}%` : '—'}</td>
                  <td className="px-4 py-2"><EvidenceBadge niveau={p.niveauPreuve} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-border">
            <LegendeNiveauxPreuve />
          </div>
        </div>
      </section>

      {/* Demandes de modification en attente */}
      {assignationsModif.length > 0 && (
        <section className="bg-surface border border-accent rounded-xl overflow-hidden">
          {assignationsModif.map(a => (
            <div key={a.idAssignation} className="px-4 py-3 border-b border-border last:border-b-0 flex items-start justify-between gap-3 bg-orange-50">
              <div className="min-w-0">
                <span className="text-sm text-orange-800">
                  Demande de correction — <span className="font-medium">{a.titre || a.idQuestionnaire}</span>
                </span>
                {a.correctionCommentaire && (
                  <p className="text-xs text-orange-700 mt-1 italic">« {a.correctionCommentaire} »</p>
                )}
              </div>
              <button
                onClick={() => onDebloquer(a.idAssignation)}
                disabled={deverrouillageId === a.idAssignation}
                className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-600 text-white disabled:opacity-60"
              >
                {deverrouillageId === a.idAssignation ? 'Déblocage...' : 'Débloquer'}
              </button>
            </div>
          ))}
        </section>
      )}

      {/* Détail technique des réponses */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Détail technique des réponses
        </h3>
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          {loadingReponses ? (
            <div className="px-4 py-4 text-sm text-muted-foreground">Chargement...</div>
          ) : reponses.length === 0 ? (
            <div className="px-4 py-4 text-sm text-muted-foreground">Aucun questionnaire complété pour ce patient.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Questionnaire</th>
                    <th className="px-4 py-2 text-left">Score</th>
                    <th className="px-4 py-2 text-left">Interprétation</th>
                    <th className="px-4 py-2 text-left">Qualité</th>
                  </tr>
                </thead>
                <tbody>
                  {reponses.map(r => {
                    const scores = r.scoresParsed;
                    const certification = certificationBadge((scores?.certification as ScoreCertification | undefined) ?? null);
                    const missingIds = getArrayField(scores, 'missingIds');
                    const notApplicable = getArrayField(scores, 'notApplicable');
                    const note = typeof scores?.note === 'string' ? scores.note : '';
                    const subScores = Array.isArray(scores?.subScores)
                      ? (scores!.subScores as ScoreSubScore[])
                      : [];
                    const miniSynthese = buildMiniSynthese(scores);
                    return (
                      <tr key={r.idReponse} className="border-t border-border align-top">
                        <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">
                          {r.dateSoumission ? new Date(r.dateSoumission).toLocaleDateString('fr-FR') : '—'}
                        </td>
                        <td className="px-4 py-2 font-medium">
                          <div>{r.titre || r.idQuestionnaire || '—'}</div>
                          {miniSynthese && (
                            <div className="mt-1 text-xs font-normal italic text-foreground/80 max-w-md" title={miniSynthese}>
                              Synthèse : {miniSynthese}
                            </div>
                          )}
                          {note && (
                            <div className="mt-1 text-xs font-normal text-muted-foreground max-w-md" title={note}>
                              {note}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {subScores.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {subScores.map(sub => (
                                <div key={sub.id} className="flex items-center gap-2 whitespace-nowrap">
                                  <span className="text-xs text-muted-foreground">{sub.label}</span>
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                    {sub.total ?? '—'}
                                    {typeof sub.max === 'number' ? `/${sub.max}` : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : r.scorePrincipal !== null ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              {r.scorePrincipal}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground max-w-xs">
                          {subScores.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {subScores.map(sub => (
                                <div key={sub.id}>
                                  {sub.interpretation?.label ? (
                                    <Badge variant={interpColorToVariant(sub.interpretation.color)}>
                                      {sub.interpretation.label}
                                    </Badge>
                                  ) : (
                                    <span>—</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="block truncate" title={r.interpretation}>
                              {r.interpretation || '—'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex flex-wrap gap-1.5">
                            {certification ? (
                              <Badge variant={certification.variant}>{certification.label}</Badge>
                            ) : (
                              <Badge variant="neutral">Historique</Badge>
                            )}
                            {missingIds.length > 0 && (
                              <Badge variant="warning">{missingIds.length} manquant(s)</Badge>
                            )}
                            {notApplicable.length > 0 && (
                              <Badge variant="neutral">{notApplicable.length} n/a</Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
    </ModeConsultation>
  );
}
