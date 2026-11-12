'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PatientErrorState } from '@/components/patient/PatientErrorState';
import { PatientButton } from '@/components/patient/ui/PatientButton';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { PatientPageHeader } from '@/components/patient/ui/PatientPageHeader';
import {
  CHECKIN_QUESTIONS,
  type CheckinQuestionId,
  type PointEtape,
} from '@/lib/protocol/checkinDomain';
import { ProtocolCheckinTrend, type PointEtat } from './ProtocolCheckinTrend';

// Formulaire du « point de suivi » (C2A LOT-04 ; nommé par T-30, [[D-488]]). 4 questions à choix
// unique, < 15 s, formulation factuelle non culpabilisante. La soumission passe
// par la session portail (cookie) — aucun identifiant sensible côté client.
// Le point d'étape ouvert et l'assignation d'ancrage sont résolus côté serveur.

type CheckinState = {
  ok: true;
  protocoleDiffuse: boolean;
  pointEtapeOuvert: PointEtape | null;
  points: PointEtat[];
};

// T-30b et T-30c ([[D-488]]) : « Mon point de suivi », « — semaine N ».
const TITRE = 'Mon point de suivi';
const TITRE_POINT: Record<PointEtape, string> = {
  J7: `${TITRE} — semaine 1`,
  J14: `${TITRE} — semaine 2`,
  J21: `${TITRE} — semaine 3`,
};

type ErreurChargement = { message: string; nonReconnu: boolean };

export function ProtocolCheckinForm({ token }: { token: string }) {
  const router = useRouter();
  const [state, setState] = useState<CheckinState | null>(null);
  const [chargement, setChargement] = useState(true);
  const [reponses, setReponses] = useState<Partial<Record<CheckinQuestionId, string>>>({});
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  // UNE LECTURE EN ÉCHEC N'EST PAS UNE ATTENTE. Sans protocole, la route répond
  // `ok: true, protocoleDiffuse: false` ; `ok: false` est un refus (session,
  // erreur technique) et une coupure réseau n'a pas de réponse du tout. Les
  // deux prenaient la phrase d'attente, sans moyen de réessayer.
  // Un refus 404 (« Suivi non reconnu. ») ne peut pas réussir en réessayant :
  // il se lit sans « Réessayer » ([[D-488]] §7, Q-E2-5 (a)) ; le retour
  // « ← Mon parcours » de la page reste. Les autres erreurs le gardent.
  const [erreurChargement, setErreurChargement] = useState<ErreurChargement | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur('');
    setErreurChargement(null);
    // Pendant le renvoi au gate, l'écran reste sur « Chargement » : ni erreur
    // ni phrase d'attente.
    let renvoi = false;
    try {
      const res = await fetch('/api/portail/protocole/checkin', { cache: 'no-store' });
      if (res.status === 401) {
        // Session absente ou expirée : retour au gate du portail, comme les
        // autres écrans — « Réessayer » ne pourrait pas réussir (réponse 7 (b)
        // du responsable à l'étape 1 de la refonte Lien, 2026-11-11).
        renvoi = true;
        router.replace(`/portail/${token}`);
        return;
      }
      const data = (await res.json()) as CheckinState | { ok: false; error?: string };
      if (data.ok) {
        setState(data);
      } else {
        setState(null);
        setErreurChargement({ message: data.error || 'Erreur réseau. Réessayez.', nonReconnu: res.status === 404 });
      }
    } catch {
      setState(null);
      setErreurChargement({ message: 'Erreur réseau. Réessayez.', nonReconnu: false });
    } finally {
      if (!renvoi) setChargement(false);
    }
  }, [router, token]);

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
      if (res.status === 401) {
        router.replace(`/portail/${token}`);
        return;
      }
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
  }, [pointOuvert, complet, reponses, charger, router, token]);

  if (chargement) {
    return (
      <PatientCard>
        <p className="text-sm text-muted-foreground">Chargement de votre suivi…</p>
      </PatientCard>
    );
  }

  if (erreurChargement) {
    return (
      <PatientCard>
        <PatientPageHeader title={TITRE} />
        <div className="mt-3" role="alert">
          {erreurChargement.nonReconnu ? (
            <PatientErrorState forme="constat" message={erreurChargement.message} />
          ) : (
            <PatientErrorState forme="erreur" message={erreurChargement.message} onReessayer={() => void charger()} />
          )}
        </div>
      </PatientCard>
    );
  }

  if (!state || !state.protocoleDiffuse) {
    return (
      <PatientCard>
        <PatientPageHeader title={TITRE} />
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
          title={TITRE}
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
        title={TITRE_POINT[pointOuvert]}
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
                  // Bord `control-border` (3,35:1) : le filet `border` (1,4:1)
                  // ne délimitait pas un contrôle (prototype PAT-3 validé).
                  className={`inline-flex min-h-11 items-center rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${
                    actif
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-surface text-foreground border-control-border hover:bg-muted'
                  }`}
                >
                  {option.libelle}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      {/* Échec de l'envoi : les réponses restent sélectionnées, aucune
          confirmation sans succès réel. */}
      {erreur && (
        <div role="alert">
          <PatientErrorState forme="erreur" message={erreur} />
        </div>
      )}

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
