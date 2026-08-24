'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { patientButtonClassName } from '@/components/patient/ui/PatientButton';
import { PatientPageHeader } from '@/components/patient/ui/PatientPageHeader';
import type { PointEtape } from '@/lib/protocol/checkinDomain';
import { ProtocolCheckinTrend, type PointEtat } from './ProtocolCheckinTrend';
import { PatientFoodCompassSummary } from '@/components/patient-food-compass/PatientFoodCompassSummary';
import type { PatientFoodCompassSafeView } from '@/lib/food-compass/patientSafe';

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
  boussoles?: PatientFoodCompassSafeView[];
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
  // Surface « ce qui compte » ouverte ? Décidé par la route (drapeau serveur),
  // jamais deviné ici. Reste `false` sur toute erreur — le lien n'apparaît que
  // sur un « oui » explicite.
  const [ceQuiCompteOuvert, setCeQuiCompteOuvert] = useState(false);
  const [comprehensionOuverte, setComprehensionOuverte] = useState(false);

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

  // Lecture séparée et non bloquante : un échec ne doit pas priver l'accueil
  // de son protocole. Aucune donnée n'en revient — seulement « ouvert ou non ».
  const sonderCeQuiCompte = useCallback(async () => {
    try {
      const res = await fetch('/api/portail/ce-qui-compte', { cache: 'no-store' });
      const data = (await res.json()) as { ok?: boolean; ouvert?: boolean };
      setCeQuiCompteOuvert(res.ok && data.ok === true && data.ouvert === true);
    } catch {
      setCeQuiCompteOuvert(false);
    }
  }, []);

  /**
   * Même sonde, même motif — avec `?interrupteur=1`, qui est OBLIGATOIRE ici et
   * pas cosmétique : sans lui, la route servirait la synthèse complète à chaque
   * visite de l'accueil et émettrait son événement « registre anxiogène servi »
   * pour une page que personne n'a ouverte. Aucune donnée n'en revient —
   * seulement « ouvert ou non ». Motif complet à la route.
   */
  const sonderComprehension = useCallback(async () => {
    try {
      const res = await fetch('/api/portail/comprehension?interrupteur=1', { cache: 'no-store' });
      const data = (await res.json()) as { ok?: boolean; ouvert?: boolean };
      setComprehensionOuverte(res.ok && data.ok === true && data.ouvert === true);
    } catch {
      setComprehensionOuverte(false);
    }
  }, []);

  useEffect(() => {
    void charger();
    void sonderCeQuiCompte();
    void sonderComprehension();
  }, [charger, sonderCeQuiCompte, sonderComprehension]);

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
        subtitle={
          finDeCycle
            ? // Constat de l'étape, pas récompense — [[D-108]]. La rédaction
              // précédente félicitait le patient « pour le chemin parcouru »,
              // c'est-à-dire pour une date atteinte. La phrase dit désormais ce
              // qui se passe ensuite. (Le mot retiré n'est pas réécrit ici : ce
              // fichier est balayé par le garde de gamification, qui lit le
              // texte et non l'intention — y compris en commentaire.)
              'Vous arrivez au terme de ce cycle. Votre praticien en fait le point avec vous.'
            : vue.purpose
        }
      />

      {/* Action du jour — un seul pas, lisible en quelques secondes. */}
      {action && !finDeCycle && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Votre action</p>
          <p className="mt-1 text-base font-medium text-foreground">{action.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{action.minimalPlan}</p>
        </div>
      )}

      <PatientFoodCompassSummary token={token} items={vue.boussoles ?? []} />

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
        {/* « Ce qui compte pour moi aujourd'hui » (Alliance 6.0-A, LOT-03) —
            lien ADDITIF, sous drapeau. Ce composant est client : il ne peut pas
            lire `WN_CE_QUI_COMPTE` (variable non `NEXT_PUBLIC_*`, absente du
            bundle navigateur), donc c'est la route qui décide — elle rend 503
            drapeau éteint. Fail-closed : tant qu'elle n'a pas répondu, ou si
            elle échoue, le lien reste absent. */}
        {ceQuiCompteOuvert && (
          <Link href={`/portail/${token}/ce-qui-compte`} className={patientButtonClassName('ghost')}>
            Ce qui compte pour moi aujourd’hui
          </Link>
        )}
        {/* « Ce que votre praticien a compris de vous » (Alliance 6.0-A,
            LOT-04) — lien ADDITIF, sous drapeau, même mécanique que ci-dessus :
            c'est la route qui décide, fail-closed. Le libellé ne promet RIEN sur
            le contenu : il peut n'y avoir aucune synthèse publiée, et l'écran le
            dira comme une absence, jamais comme un « rien à signaler ». */}
        {comprehensionOuverte && (
          <Link href={`/portail/${token}/comprehension`} className={patientButtonClassName('ghost')}>
            Ce que mon praticien a compris de moi
          </Link>
        )}
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
