'use client';

import { useCallback, useEffect, useState } from 'react';
import { PatientButton } from '@/components/patient/ui/PatientButton';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import type { PackReevaluationResponse, PropositionPack } from '@/app/api/portail/pack-reevaluation/route';

/*
 * Proposition de pack de réévaluation (SP-SPI / LOT-01).
 *
 * Ce que ce composant NE fait pas, et c'est tout son sujet :
 *   - il n'assigne rien — accepter dit « d'accord pour refaire le point »,
 *     l'assignation reste un geste praticien ;
 *   - il n'insiste pas — décliner referme la question pour de bon, et l'accusé
 *     le dit explicitement au patient ;
 *   - il n'affiche aucun chiffre de score, aucun décompte de jours manqués,
 *     aucune échéance.
 *
 * Il ne s'affiche qu'en reprise, et disparaît dès que la question a reçu une
 * réponse : c'est la route qui en décide, jamais ce composant.
 *
 * Accessibilité : deux boutons de même poids visuel — refuser n'est pas une
 * action secondaire —, cibles ≥ 44 px via `PatientButton`, état d'envoi annoncé,
 * accusé rendu dans une région `polite` pour que le lecteur d'écran l'entende.
 */

type Etat =
  | { phase: 'chargement' }
  | { phase: 'rien' }
  | { phase: 'proposee'; proposition: PropositionPack }
  | { phase: 'envoi'; proposition: PropositionPack }
  | { phase: 'repondu'; accuse: string }
  | { phase: 'erreur'; proposition: PropositionPack };

export function PropositionPackReevaluation() {
  const [etat, setEtat] = useState<Etat>({ phase: 'chargement' });

  useEffect(() => {
    let vivant = true;
    void (async () => {
      try {
        const reponse = await fetch('/api/portail/pack-reevaluation');
        const payload = (await reponse.json()) as PackReevaluationResponse;
        if (!vivant) return;
        if (!reponse.ok || !('proposition' in payload) || !payload.proposition) {
          setEtat({ phase: 'rien' });
          return;
        }
        setEtat({ phase: 'proposee', proposition: payload.proposition });
      } catch {
        // Silence volontaire : une proposition qu'on n'a pas pu charger ne doit
        // pas produire d'alarme chez le patient. Elle reviendra à la visite
        // suivante, puisque rien n'a été enregistré.
        if (vivant) setEtat({ phase: 'rien' });
      }
    })();
    return () => {
      vivant = false;
    };
  }, []);

  const repondre = useCallback(
    async (proposition: PropositionPack, reponse: 'acceptee' | 'declinee') => {
      setEtat({ phase: 'envoi', proposition });
      try {
        const res = await fetch('/api/portail/pack-reevaluation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idPack: proposition.idPack, reponse }),
        });
        const payload = (await res.json()) as PackReevaluationResponse;
        if (!res.ok || !('accuse' in payload)) {
          setEtat({ phase: 'erreur', proposition });
          return;
        }
        setEtat({ phase: 'repondu', accuse: payload.accuse });
      } catch {
        setEtat({ phase: 'erreur', proposition });
      }
    },
    [],
  );

  if (etat.phase === 'chargement' || etat.phase === 'rien') return null;

  if (etat.phase === 'repondu') {
    return (
      <PatientCard>
        <p role="status" aria-live="polite" className="text-base text-foreground">
          {etat.accuse}
        </p>
      </PatientCard>
    );
  }

  const { proposition } = etat;
  const enCours = etat.phase === 'envoi';

  return (
    <PatientCard>
      <section aria-labelledby="pack-reevaluation-titre" className="flex flex-col gap-3">
        <h2 id="pack-reevaluation-titre" className="font-display text-xl font-bold text-foreground">
          {proposition.titre}
        </h2>
        <p className="text-base text-foreground">{proposition.corps}</p>

        {etat.phase === 'erreur' && (
          <p role="alert" className="text-base text-status-warning">
            Votre réponse n’a pas pu être enregistrée. Réessayez, ou parlez-en à votre praticien.
          </p>
        )}

        {/* Les deux réponses ont le même poids : refuser n'est pas une action
            secondaire, et rien ne pousse vers « oui ». */}
        <div className="flex flex-wrap gap-3">
          <PatientButton
            variant="primary"
            loading={enCours}
            loadingLabel="Enregistrement…"
            onClick={() => void repondre(proposition, 'acceptee')}
          >
            Oui, je veux bien refaire le point
          </PatientButton>
          <PatientButton
            variant="neutral"
            disabled={enCours}
            onClick={() => void repondre(proposition, 'declinee')}
          >
            Non, pas maintenant
          </PatientButton>
        </div>
      </section>
    </PatientCard>
  );
}
