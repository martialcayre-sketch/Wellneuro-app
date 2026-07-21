'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { PatientQuestionnaireResponse } from '@/app/api/patient/questionnaire/route';
import type { QuestionnaireDef } from '@/lib/questionnaire-types';
import { MonEquilibreAccueil } from '@/components/patient/MonEquilibreAccueil';
import { MonEquilibreDetail } from '@/components/patient/MonEquilibreDetail';
import { ConsentScreen } from '@/components/patient/ConsentScreen';
import { ConsultationScreen } from '@/components/patient/ConsultationScreen';
import { PlaintesForm } from '@/components/patient/PlaintesForm';
import { GenericQuestionnaire } from '@/components/patient/GenericQuestionnaire';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { PatientErrorState } from '@/components/patient/PatientErrorState';

type VerifiedData = Extract<PatientQuestionnaireResponse, { ok: true }>;

// En-tête compact avec retour vers le hub. Le badge reflète le statut réel de
// l'assignation (HC-F LOT-04, Étape 8 : harmoniser lecture seule et
// correction) — auparavant toujours "Transmis au praticien" même en
// correction demandée, incohérent avec le badge déjà correct du hub.
function EnTete({ token, titre, badge }: { token: string; titre: string; badge?: string }) {
  return (
    <div className="w-full max-w-2xl mb-4">
      <a
        href={`/portail/${token}/questionnaires`}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        ← Mon parcours
      </a>
      <div className="flex items-center justify-between gap-3 mt-2">
        <h1 className="font-display text-lg font-bold text-foreground truncate">{titre}</h1>
        {badge && <span className="text-xs text-muted-foreground shrink-0">{badge}</span>}
      </div>
    </div>
  );
}

export default function PortailQuestionnairePage() {
  const { token, idAssignation } = useParams<{ token: string; idAssignation: string }>();
  const router = useRouter();

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [data, setData] = useState<VerifiedData | null>(null);
  // Sous-vue pour le parcours lecture seule (réponses verrouillées).
  const [vue, setVue] = useState<'principal' | 'equilibre' | 'equilibre-detail'>('principal');

  const charger = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await fetch(`/api/patient/questionnaire?id=${encodeURIComponent(idAssignation)}`);
      if (res.status === 400 || res.status === 401) {
        // Session portail absente / expirée : retour au gate.
        router.replace(`/portail/${token}`);
        return;
      }
      const json = (await res.json()) as PatientQuestionnaireResponse;
      if (!json.ok) {
        setError(json.error);
        setStatus('error');
        return;
      }
      setData(json);
      setStatus('ready');
    } catch {
      setError('Erreur réseau. Réessayez.');
      setStatus('error');
    }
  }, [idAssignation, token, router]);

  useEffect(() => { charger(); }, [charger]);

  if (status === 'loading') {
    return (
      <PatientCard>
        <p className="text-muted-foreground text-sm">Chargement du questionnaire…</p>
      </PatientCard>
    );
  }

  if (status === 'error' || !data) {
    return (
      <div className="w-full max-w-2xl">
        <EnTete token={token} titre="Questionnaire" />
        <PatientCard>
          <PatientErrorState
            message={error || 'Questionnaire introuvable.'}
            onReessayer={() => void charger()}
          />
        </PatientCard>
      </div>
    );
  }

  const { assignation } = data;
  // La session cookie porte déjà l'email côté serveur. On ne le repasse ici
  // qu'aux composants qui l'envoient en corps de requête POST (Consent/Plaintes/
  // GenericQuestionnaire) ; les composants en GET (Consultation/MonEquilibre*)
  // n'en ont plus besoin, pour éviter de l'exposer en query string.
  const email = assignation.emailPatient;
  const retourHub = () => router.push(`/portail/${token}/questionnaires`);

  // 1) Consentement non encore donné (assignation hors pack).
  if (assignation.consentement !== 'donne') {
    return (
      <div className="w-full max-w-2xl">
        <EnTete token={token} titre={assignation.titre} />
        <ConsentScreen
          idAssignation={assignation.idAssignation}
          email={email}
          onAccepted={() => charger()}
        />
      </div>
    );
  }

  // 2) Réponses verrouillées / correction demandée → consultation lecture seule.
  if (assignation.statutReponses === 'verrouille' || assignation.statutReponses === 'modification_demandee') {
    if (vue === 'equilibre') {
      return (
        <MonEquilibreAccueil
          idAssignation={assignation.idAssignation}
          onVoirDetail={() => setVue('equilibre-detail')}
          onRetour={() => setVue('principal')}
        />
      );
    }
    if (vue === 'equilibre-detail') {
      return (
        <MonEquilibreDetail
          idAssignation={assignation.idAssignation}
          onRetour={() => setVue('equilibre')}
        />
      );
    }
    return (
      <div className="w-full max-w-2xl">
        <EnTete
          token={token}
          titre={assignation.titre}
          badge={assignation.statutReponses === 'modification_demandee' ? 'Correction demandée' : 'Transmis au praticien'}
        />
        <ConsultationScreen
          idAssignation={assignation.idAssignation}
          statutReponses={assignation.statutReponses}
          onVoirEquilibre={() => setVue('equilibre')}
        />
      </div>
    );
  }

  // 3) Saisie. Bandeau de rappel : consentement déjà couvert par le suivi.
  const rappelConsentement = (
    <div className="w-full max-w-2xl mb-4 rounded-xl border border-border bg-primary/10 px-4 py-3 text-xs text-primary">
      Ce questionnaire entre dans le cadre de votre suivi Wellneuro déjà accepté. Vous pouvez demander la modification ou la suppression de vos données auprès de votre praticien.
    </div>
  );

  if (assignation.idQuestionnaire === 'Q_PLAINTES') {
    return (
      <div className="w-full max-w-2xl">
        <EnTete token={token} titre={assignation.titre} />
        {rappelConsentement}
        <PlaintesForm assignation={assignation} email={email} onDone={retourHub} />
      </div>
    );
  }

  if (!data.questionnaire) {
    return (
      <div className="w-full max-w-2xl">
        <EnTete token={token} titre={assignation.titre} />
        <PatientCard className="text-center">
          <PatientErrorState
            message="Ce questionnaire n'est pas encore disponible en ligne."
            aide="Contactez votre praticien pour en savoir plus."
          />
        </PatientCard>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl">
      <EnTete token={token} titre={assignation.titre} />
      {rappelConsentement}
      <GenericQuestionnaire
        assignation={assignation}
        questionnaire={data.questionnaire as QuestionnaireDef}
        email={email}
        onDone={retourHub}
      />
    </div>
  );
}
