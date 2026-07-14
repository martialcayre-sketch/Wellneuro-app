'use client';

import { useState } from 'react';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { PatientButton } from '@/components/patient/ui/PatientButton';
import { PatientPageHeader } from '@/components/patient/ui/PatientPageHeader';
import { PatientInlineMessage } from '@/components/patient/ui/PatientInlineMessage';

// Écran de consentement par assignation (flux legacy /patient/[idAssignation]).
// Dans le flux portail, le consentement est recueilli une fois au niveau de la
// consultation puis pré-estampillé sur chaque assignation du pack : cet écran
// est alors sauté (assignation.consentement === 'donne').
export function ConsentScreen({ idAssignation, email, onAccepted }: {
  idAssignation: string;
  email: string;
  onAccepted: () => void;
}) {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/patient/consentement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idAssignation, email, action: 'donner' }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) { setError(data.error ?? 'Erreur. Réessayez.'); }
      else { onAccepted(); }
    } catch {
      setError('Erreur réseau. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PatientCard>
      <PatientPageHeader title="Avant de commencer" />

      <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
        <p>
          Vous avez été invité·e par votre praticien à répondre à un ou
          plusieurs questionnaires dans le cadre de WellNeuro, un outil
          d&apos;accompagnement bien-être et de suivi personnalisé.
        </p>
        <div>
          <p className="font-semibold text-foreground">Ce que nous collectons</p>
          <p>
            Vos réponses aux questionnaires (habitudes de sommeil, énergie,
            stress, et selon les cas d&apos;autres axes de suivi), ainsi que
            la date de vos réponses.
          </p>
        </div>
        <div>
          <p className="font-semibold text-foreground">Pourquoi</p>
          <p>
            Ces réponses permettent à votre praticien de mieux comprendre
            votre situation et de vous proposer des recommandations et un
            protocole personnalisé adaptés. Il ne s&apos;agit pas d&apos;un
            outil de diagnostic médical : les résultats constituent un
            indice de suivi destiné à accompagner l&apos;échange avec votre
            praticien, pas à le remplacer.
          </p>
        </div>
        <div>
          <p className="font-semibold text-foreground">Qui peut voir vos réponses</p>
          <p>Seul votre praticien a accès à vos réponses. Elles ne sont partagées avec aucun tiers.</p>
        </div>
        <div>
          <p className="font-semibold text-foreground">Combien de temps sont-elles conservées</p>
          <p>Vos réponses sont conservées le temps de votre suivi. Vous pouvez en demander la suppression à tout moment.</p>
        </div>
        <div>
          <p className="font-semibold text-foreground">Vos droits</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Vous pouvez consulter vos réponses à tout moment via ce même lien.</li>
            <li>Vous pouvez demander une modification de vos réponses ; elle sera effective après accord de votre praticien.</li>
            <li>Vous pouvez demander la suppression de vos données à tout moment, en contactant votre praticien.</li>
            <li>Vous pouvez retirer votre consentement à tout moment, ce qui arrêtera la collecte sans affecter les réponses déjà nécessaires au suivi en cours.</li>
          </ul>
        </div>
        <p className="text-xs text-muted-foreground bg-muted rounded-lg px-4 py-3">
          Cet outil est actuellement en phase de test. Vos retours sur
          l&apos;usage de l&apos;outil (pas seulement vos réponses
          cliniques) sont les bienvenus auprès de votre praticien.
        </p>
      </div>

      <label className="flex items-start gap-3 mt-6 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={e => setChecked(e.target.checked)}
          className="mt-1 accent-primary"
        />
        <span className="text-sm text-foreground">
          J&apos;ai lu ces informations et j&apos;accepte que mes réponses
          soient collectées et utilisées dans les conditions décrites
          ci-dessus.
        </span>
      </label>

      {error && <div className="mt-4"><PatientInlineMessage tone="error">{error}</PatientInlineMessage></div>}

      <PatientButton
        variant="primary" disabled={!checked} loading={loading} loadingLabel="Enregistrement…"
        onClick={handleContinue} className="w-full mt-6"
      >
        Continuer vers le questionnaire
      </PatientButton>
    </PatientCard>
  );
}
