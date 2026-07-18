'use client';

import { useCallback, useEffect, useState } from 'react';
import { PatientButton } from '@/components/patient/ui/PatientButton';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { PatientInlineMessage } from '@/components/patient/ui/PatientInlineMessage';
import { PatientPageHeader } from '@/components/patient/ui/PatientPageHeader';
import {
  CHECKIN_QUESTIONS,
  type CheckinQuestionId,
  type PointEtape,
} from '@/lib/protocol/checkinDomain';
import { ProtocolCheckinTrend, type PointEtat } from './ProtocolCheckinTrend';

// Formulaire de « rendez-vous de suivi » (C2A LOT-04). 4 questions à choix
// unique, < 15 s, formulation factuelle non culpabilisante. La soumission passe
// par la session portail (cookie) — aucun identifiant sensible côté client.
// Le point d'étape ouvert et l'assignation d'ancrage sont résolus côté serveur.

type CheckinState = {
  ok: true;
  protocoleDiffuse: boolean;
  pointEtapeOuvert: PointEtape | null;
  points: PointEtat[];
};

const LABEL_POINT: Record<PointEtape, string> = {
  J7: 'Semaine 1',
  J14: 'Semaine 2',
  J21: 'Semaine 3',
};

export function ProtocolCheckinForm() {
  const [state, setState] = useState<CheckinState | null>(null);
  const [chargement, setChargement] = useState(true);
  const [reponses, setReponses] = useState<Partial<Record<CheckinQuestionId, string>>>({});
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur('');
    try {
      const res = await fetch('/api/portail/protocole/checkin', { cache: 'no-store' });
      const data = (await res.json()) as CheckinState | { ok: false; error: string };
      if (data.ok) {
        setState(data);
      } else {
        setState(null);
      }
    } catch {
      setErreur('Erreur réseau. Réessayez.');
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  const pointOuvert = state?.pointEtapeOuvert ?? null;
  const dejaRenseigne = pointOuvert
    ? (state?.points.find((p) => p.pointEtape === pointOuvert)?.renseigne ?? false)
    : false;
  const complet = CHECKIN_QUESTIONS.every((q) => reponses[q.id]);

  const soumettre = useCallback(async () => {
    if (!pointOuvert || !complet) return;
    setEnvoi(true);
    setErreur('');
    try {
      const res = await fetch('/api/portail/protocole/checkin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pointEtape: pointOuvert, reponses }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        setReponses({});
        await charger();
      } else {
        setErreur(data.error ?? 'Envoi impossible pour le moment.');
      }
    } catch {
      setErreur('Erreur réseau. Réessayez.');
    } finally {
      setEnvoi(false);
    }
  }, [pointOuvert, complet, reponses, charger]);

  if (chargement) {
    return (
      <PatientCard>
        <p className="text-sm text-muted-foreground">Chargement de votre suivi…</p>
      </PatientCard>
    );
  }

  if (!state || !state.protocoleDiffuse) {
    return (
      <PatientCard>
        <PatientPageHeader title="Rendez-vous de suivi" />
        <p className="text-sm text-muted-foreground mt-2">
          Votre suivi commencera dès que votre praticien aura partagé votre accompagnement.
        </p>
      </PatientCard>
    );
  }

  const trend = <ProtocolCheckinTrend points={state.points} />;

  // Aucun point d'étape ouvert (hors fenêtre) → tendance seule.
  if (!pointOuvert || dejaRenseigne) {
    return (
      <PatientCard>
        <PatientPageHeader
          title="Rendez-vous de suivi"
          subtitle={
            dejaRenseigne
              ? 'Merci, votre point de cette semaine est enregistré.'
              : 'Votre prochain point de suivi apparaîtra ici le moment venu.'
          }
        />
        <div className="mt-4">{trend}</div>
      </PatientCard>
    );
  }

  return (
    <PatientCard as="form" onSubmit={(e) => { e.preventDefault(); void soumettre(); }} className="space-y-5">
      <PatientPageHeader
        title={`Rendez-vous de suivi — ${LABEL_POINT[pointOuvert]}`}
        subtitle="Quelques questions rapides pour ajuster votre accompagnement."
      />

      {CHECKIN_QUESTIONS.map((question) => (
        <fieldset key={question.id} className="space-y-2">
          <legend className="text-sm font-medium text-foreground">{question.libelle}</legend>
          <div className="flex flex-wrap gap-2">
            {question.options.map((option) => {
              const actif = reponses[question.id] === option.valeur;
              return (
                <button
                  key={option.valeur}
                  type="button"
                  onClick={() => setReponses((prev) => ({ ...prev, [question.id]: option.valeur }))}
                  aria-pressed={actif}
                  className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                    actif
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-surface text-foreground border-border hover:bg-muted'
                  }`}
                >
                  {option.libelle}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      {erreur && <PatientInlineMessage tone="error">{erreur}</PatientInlineMessage>}

      <PatientButton
        type="submit"
        variant="primary"
        disabled={!complet}
        loading={envoi}
        loadingLabel="Envoi…"
        className="w-full"
      >
        Envoyer
      </PatientButton>

      {trend && <div className="pt-2 border-t border-border">{trend}</div>}
    </PatientCard>
  );
}
