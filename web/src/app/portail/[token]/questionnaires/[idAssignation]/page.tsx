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
import { AgendaSommeilJournal } from '@/components/patient/agenda-sommeil/AgendaSommeilJournal';
import { AgendaAlimentaireJournal } from '@/components/patient/agenda-alimentaire/AgendaAlimentaireJournal';
import { GenericQuestionnaire } from '@/components/patient/GenericQuestionnaire';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { PatientErrorState } from '@/components/patient/PatientErrorState';
import { AGENDA_ALI_ID } from '@/lib/agenda-alimentaire/types';

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
  //
  // ── LA PÉRIODE FERMÉE PASSE AVANT LE CONSENTEMENT ───────────────────────
  // Sans ce garde, une assignation périmée et sans consentement affichait
  // « donnez votre consentement », le patient posait le geste, et
  // `api/patient/consentement` répondait 410 : un geste IMPOSSIBLE était
  // proposé, et le patient n'apprenait le refus qu'après l'avoir fait.
  //
  // ── LE VERDICT VIENT DU SERVEUR, IL N'EST PLUS RECALCULÉ ICI ────────────
  // Ce garde évaluait `isDeadlineExpired` lui-même. Ce composant est
  // `'use client'`, et `isDeadlineExpired` construit
  // `new Date(`${dateLimite}T23:59:59.999`) SANS fuseau : l'expiration se lisait
  // donc dans le fuseau du NAVIGATEUR — à Paris l'été, ~2 h avant le serveur ; à
  // l'ouest d'UTC, plusieurs heures après. Le commentaire précédent affirmait
  // « la condition est celle de la route, mot pour mot » : le TEXTE l'était,
  // l'ÉVALUATION non, et c'est l'évaluation qui décide. `consentementPossible`
  // est calculé par `api/patient/questionnaire` avec le même `isDeadlineExpired`
  // que les routes d'écriture — un seul fuseau, un seul verdict.
  //
  // ÉLARGISSEMENT DÉLIBÉRÉ : ce garde vaut pour TOUS les questionnaires, pas
  // seulement l'agenda alimentaire. Le défaut y est identique et le correctif y
  // est le même ; le borner à un instrument aurait laissé l'impasse ouverte
  // partout ailleurs. Le même garde était posé sur l'autre écran porteur du
  // `ConsentScreen`, le parcours legacy `app/patient/[idAssignation]` —
  // **supprimé le 2026-08-08** (dette 5). Cet écran est désormais le SEUL, et
  // son banc reprend les cinq cas que gardait celui du legacy.
  if (assignation.consentement !== 'donne') {
    if (!data.consentementPossible) {
      // ── LE MESSAGE NE PRÉJUGE PAS DE CE QUI A ÉTÉ FAIT ──────────────────
      // Depuis que `api/patient/questionnaire` exempte `deverrouille` à son
      // tour, ce garde n'est atteignable que sur `verrouille` et
      // `modification_demandee` périmés — des questionnaires DÉJÀ REMPLIS ET
      // TRANSMIS. « ne peut plus être rempli » y était faux. Ce qui est vrai
      // dans TOUS les cas où l'écran s'affiche : la période est close et le
      // consentement ne s'enregistre plus.
      return (
        <div className="w-full max-w-2xl">
          <EnTete token={token} titre={assignation.titre} />
          <PatientCard className="text-center">
            <PatientErrorState
              message="La période est terminée : votre consentement ne peut plus être enregistré."
              aide="Contactez votre praticien pour la suite de votre suivi."
            />
          </PatientCard>
        </div>
      );
    }
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

  // 1 bis) Agenda du sommeil (Q_SOM_09) : recueil nuit par nuit via composant
  // dédié. Placé AVANT le bloc « verrouillé » : une fois clôturé, le composant
  // affiche la frise en consultation (état « Transmis au praticien »), au lieu
  // de l'écran générique de lecture seule.
  if (assignation.idQuestionnaire === 'Q_SOM_09') {
    return (
      <div className="w-full max-w-2xl">
        <EnTete
          token={token}
          titre={assignation.titre}
          badge={assignation.statutReponses === 'verrouille' ? 'Transmis au praticien' : undefined}
        />
        <AgendaSommeilJournal idAssignation={assignation.idAssignation} onRetourHub={retourHub} />
      </div>
    );
  }

  // 1 ter) Agenda alimentaire (`Q_ALI_09`) : recueil journée par journée. Même
  // placement que son jumeau du sommeil, et pour les mêmes deux raisons.
  //
  // AVANT le bloc « verrouillé » : une fois clôturé, le composant affiche sa
  // propre frise en consultation, au lieu de l'écran générique de lecture seule.
  //
  // AVANT le test `!data.questionnaire` : la page passe par
  // `/api/patient/questionnaire`, dont le resolver ne connaît pas `Q_ALI_09` —
  // l'écran générique rendrait « pas encore disponible en ligne » sur un
  // instrument qui existe et fonctionne.
  //
  // Le test porte sur `AGENDA_ALI_ID`, JAMAIS sur le littéral `'Q_ALI_09'` : le
  // bloc voisin du sommeil utilise encore un littéral, et ce raccourci n'est pas
  // recopié ici — l'identifiant a une source, autant s'y brancher.
  if (assignation.idQuestionnaire === AGENDA_ALI_ID) {
    return (
      <div className="w-full max-w-2xl">
        <EnTete
          token={token}
          titre={assignation.titre}
          badge={assignation.statutReponses === 'verrouille' ? 'Transmis au praticien' : undefined}
        />
        <AgendaAlimentaireJournal
          idAssignation={assignation.idAssignation}
          onRetourHub={retourHub}
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
        renderer={data.renderer}
      />
    </div>
  );
}
