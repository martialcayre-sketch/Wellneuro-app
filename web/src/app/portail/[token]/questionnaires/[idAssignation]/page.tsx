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

type VerifiedData = Extract<PatientQuestionnaireResponse, { ok: true }>;

// En-tête compact avec retour vers le hub.
function EnTete({ token, titre, badge }: { token: string; titre: string; badge?: string }) {
  return (
    <div className="w-full max-w-2xl mb-4">
      <a
        href={`/portail/${token}/questionnaires`}
        className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline"
      >
        ← Mes questionnaires
      </a>
      <div className="flex items-center justify-between gap-3 mt-2">
        <h1 className="text-lg font-bold text-gray-900 truncate">{titre}</h1>
        {badge && <span className="text-xs text-gray-500 shrink-0">{badge}</span>}
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
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-8">
          <p className="text-gray-500 text-sm">Chargement du questionnaire…</p>
        </div>
      </div>
    );
  }

  if (status === 'error' || !data) {
    return (
      <div className="w-full max-w-2xl">
        <EnTete token={token} titre="Questionnaire" />
        <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-8">
          <p className="text-red-600 text-sm bg-red-50 rounded-lg px-4 py-2">{error || 'Questionnaire introuvable.'}</p>
        </div>
      </div>
    );
  }

  const { assignation } = data;
  // La session cookie porte l'email ; les composants factorisés le passent
  // encore en repli aux appels API, mais le cookie prime côté serveur.
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
          email={email}
          onVoirDetail={() => setVue('equilibre-detail')}
          onRetour={() => setVue('principal')}
        />
      );
    }
    if (vue === 'equilibre-detail') {
      return (
        <MonEquilibreDetail
          idAssignation={assignation.idAssignation}
          email={email}
          onRetour={() => setVue('equilibre')}
        />
      );
    }
    return (
      <div className="w-full max-w-2xl">
        <EnTete token={token} titre={assignation.titre} badge="Transmis au praticien" />
        <ConsultationScreen
          idAssignation={assignation.idAssignation}
          email={email}
          statutReponses={assignation.statutReponses}
          onVoirEquilibre={() => setVue('equilibre')}
        />
      </div>
    );
  }

  // 3) Saisie. Bandeau de rappel : consentement déjà couvert par le suivi.
  const rappelConsentement = (
    <div className="w-full max-w-2xl mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800">
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
        <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-8 text-center">
          <p className="text-orange-700">Ce questionnaire n&apos;est pas encore disponible en ligne. Contactez votre praticien.</p>
        </div>
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
