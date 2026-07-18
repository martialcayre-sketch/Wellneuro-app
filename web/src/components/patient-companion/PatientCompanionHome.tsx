'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { patientButtonClassName } from '@/components/patient/ui/PatientButton';
import { PatientPageHeader } from '@/components/patient/ui/PatientPageHeader';
import type { PointEtape } from '@/lib/protocol/checkinDomain';
import { ProtocolCheckinTrend, type PointEtat } from './ProtocolCheckinTrend';

// Accueil compagnon du PROTOCOLE ACTIF (C2A LOT-05), borné R8-lite. Ce que le
// patient doit savoir en ~10 s : sa raison, son action du jour, l'accès à sa
// fiche et à son rendez-vous de suivi, une progression factuelle (jamais de %),
// et un mode « jour difficile » rassurant. Ce N'EST PAS un accueil de trajectoire
// « Ma spirale » (= SP-SPI, Phase B). Aucun score, aucun détail clinique.

type VueProtocole = {
  purpose: string;
  followUpCriterion: string;
  adviceSheetRef: string | null;
  actionPrincipale: { type: string; title: string; minimalPlan: string } | null;
};
type ProtocoleResponse =
  | { ok: true; protocoleDiffuse: boolean; finDeCycle: boolean; vue: VueProtocole | null }
  | { ok: false };
type CheckinResponse =
  | { ok: true; protocoleDiffuse: boolean; pointEtapeOuvert: PointEtape | null; points: PointEtat[] }
  | { ok: false };

export function PatientCompanionHome({ token }: { token: string }) {
  const [protocole, setProtocole] = useState<Extract<ProtocoleResponse, { ok: true }> | null>(null);
  const [checkin, setCheckin] = useState<Extract<CheckinResponse, { ok: true }> | null>(null);
  const [chargement, setChargement] = useState(true);
  const [jourDifficile, setJourDifficile] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const [rp, rc] = await Promise.all([
        fetch('/api/portail/protocole', { cache: 'no-store' }),
        fetch('/api/portail/protocole/checkin', { cache: 'no-store' }),
      ]);
      const dp = (await rp.json()) as ProtocoleResponse;
      const dc = (await rc.json()) as CheckinResponse;
      setProtocole(dp.ok ? dp : null);
      setCheckin(dc.ok ? dc : null);
    } catch {
      setProtocole(null);
      setCheckin(null);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  if (chargement) {
    return (
      <PatientCard>
        <p className="text-sm text-muted-foreground">Chargement de votre accompagnement…</p>
      </PatientCard>
    );
  }

  // Sans protocole diffusé : accueil calme, aucune pression.
  if (!protocole || !protocole.protocoleDiffuse || !protocole.vue) {
    return (
      <PatientCard>
        <PatientPageHeader title="Votre accompagnement" />
        <p className="text-sm text-muted-foreground mt-2">
          Votre accompagnement arrivera bientôt. Votre praticien prépare votre suivi.
        </p>
      </PatientCard>
    );
  }

  const { vue, finDeCycle } = protocole;
  const action = vue.actionPrincipale;
  const pointOuvert = checkin?.pointEtapeOuvert ?? null;
  const dejaRenseigne = pointOuvert
    ? (checkin?.points.find((p) => p.pointEtape === pointOuvert)?.renseigne ?? false)
    : false;
  const checkinDu = pointOuvert !== null && !dejaRenseigne;

  return (
    <PatientCard className="space-y-5">
      <PatientPageHeader
        title="Votre accompagnement"
        subtitle={finDeCycle ? 'Vous arrivez au terme de ce cycle. Bravo pour le chemin parcouru.' : vue.purpose}
      />

      {/* Action du jour — un seul pas, lisible en quelques secondes. */}
      {action && !finDeCycle && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Votre action</p>
          <p className="mt-1 text-base font-medium text-foreground">{action.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{action.minimalPlan}</p>
        </div>
      )}

      {/* Accès : rendez-vous de suivi (mis en avant si dû) + fiche. */}
      <div className="flex flex-wrap gap-2.5">
        <Link
          href={`/portail/${token}/suivi`}
          className={patientButtonClassName(checkinDu ? 'primary' : 'ghost')}
        >
          {checkinDu ? 'Mon rendez-vous de suivi' : 'Mes rendez-vous de suivi'}
        </Link>
        <Link href={`/portail/${token}/informations`} className={patientButtonClassName('ghost')}>
          Ma fiche conseils
        </Link>
      </div>

      {/* Progression factuelle (jamais de pourcentage). */}
      {checkin && checkin.points.length > 0 && <ProtocolCheckinTrend points={checkin.points} />}

      {/* Mode « jour difficile » — rassurant, non culpabilisant. */}
      {!finDeCycle && (
        <div className="border-t border-border pt-4">
          <button
            type="button"
            onClick={() => setJourDifficile((v) => !v)}
            aria-expanded={jourDifficile}
            className={patientButtonClassName('neutral')}
          >
            Jour difficile ? Je n’ai pas suivi
          </button>
          {jourDifficile && (
            <div className="mt-3 rounded-xl border border-border bg-muted/40 px-4 py-3 space-y-2">
              <p className="text-sm text-foreground">
                Un petit pas compte. Reprenez quand vous pouvez, sans pression.
              </p>
              {action && (
                <p className="text-sm text-muted-foreground">
                  Si vous le pouvez aujourd’hui : {action.minimalPlan}.
                </p>
              )}
              {checkinDu && (
                <Link
                  href={`/portail/${token}/suivi`}
                  className={`mt-1 inline-flex ${patientButtonClassName('ghost')}`}
                >
                  Le noter dans mon rendez-vous de suivi
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </PatientCard>
  );
}
