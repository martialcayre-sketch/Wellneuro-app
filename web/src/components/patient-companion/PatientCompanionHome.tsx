'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AvisLectureDatee } from '@/components/patient/AvisLectureDatee';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { patientButtonClassName } from '@/components/patient/ui/PatientButton';
import { PatientPageHeader } from '@/components/patient/ui/PatientPageHeader';
import type { PointEtape } from '@/lib/protocol/checkinDomain';
import { ProtocolCheckinTrend, type PointEtat } from './ProtocolCheckinTrend';
import { PatientFoodCompassSummary } from '@/components/patient-food-compass/PatientFoodCompassSummary';
import type { VuePatientSurLeFil } from '@/lib/protocol/vuePatientSurLeFil';
import {
  TEXTE_PAUSE_AVIS_RENDU,
  TEXTE_PAUSE_COMPLEMENTS,
  TEXTE_PAUSE_ELEMENT,
  type ElementEnPause,
} from '@/lib/trust/pauseEffetIndesirable';
import { PARAGRAPHES_ENCART_CONDUITE, TITRE_ENCART_CONDUITE } from '@/lib/portail/texteEncartConduite';

// Accueil compagnon du PROTOCOLE ACTIF (C2A LOT-05), borné R8-lite. Ce que le
// patient doit savoir en ~10 s : sa raison, son action du jour, l'accès à sa
// fiche et à son rendez-vous de suivi, une progression factuelle (jamais de %),
// et un mode « jour difficile » rassurant. Ce N'EST PAS un accueil de trajectoire
// « Ma spirale » (= SP-SPI, Phase B). Aucun score, aucun détail clinique.

// LE TYPE VIENT DE LA ROUTE ([[D-191]]). Il était redéclaré ici, en plus pauvre,
// et le JSON y était casté : `tsc` restait vert pendant que `followUpCriterion`
// voyageait sans qu'aucun écran ne le rende, et que deux des trois actions du
// protocole n'atteignaient jamais le patient.
type ProtocoleResponse =
  | {
      ok: true;
      protocoleDiffuse: boolean;
      finDeCycle: boolean;
      vue: VuePatientSurLeFil | null;
      /** Un protocole est diffusé et ne peut pas être servi — distinct d'une attente. */
      indisponible?: boolean;
      /** Éléments en pause sur effet indésirable ([[D-281]] §3) ; vide avant la signature. */
      pauses?: ElementEnPause[];
      /** Lectures de la Boussole dont l'aliment est en pause ([[D-281]] §2) ; vide avant la signature. */
      boussolesEnPause?: { foodRef: string; texte: ElementEnPause['texte'] }[];
      /** Journal de lecture du protocole ([[D-315]]) ; absent = drapeau fermé, détail déplié. */
      lectureDuDetail?: { dejaOuvert: boolean };
      /** Encart « quand ralentir ou demander avis » ([[D-348]]) ; absent = drapeau fermé. */
      encartConduite?: true;
    }
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
  // LE DÉTAIL DU PROTOCOLE ([[D-315]] §1, amendement du 2026-10-16). Replié
  // seulement si la route sert `lectureDuDetail` (drapeau ouvert), que cette
  // version n'a pas encore été ouverte et qu'aucune action n'est en pause ;
  // déplié d'office sinon.
  const [detailDeplie, setDetailDeplie] = useState(true);
  const lectureEnvoyee = useRef(false);
  // Le bouton disparaît au clic : le focus clavier passe aux actions dépliées
  // plutôt que de retomber sur la page.
  const titreActions = useRef<HTMLParagraphElement>(null);
  const focusApresDepli = useRef(false);
  useEffect(() => {
    if (!detailDeplie || !focusApresDepli.current) return;
    focusApresDepli.current = false;
    titreActions.current?.focus();
  }, [detailDeplie]);

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
      // UNE PAUSE SUR EFFET INDÉSIRABLE SE LIT SANS CLIC ([[D-281]]) : son texte
      // signé est dans le détail, donc le détail s'ouvre. Ce dépli n'est pas un
      // geste du patient, et rien n'est consigné ([[D-315]] §1).
      setDetailDeplie(
        !dp.ok || !dp.lectureDuDetail || dp.lectureDuDetail.dejaOuvert || (dp.pauses ?? []).length > 0,
      );
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

  // UN PROTOCOLE EXISTE ET N'EST PAS SERVI. Le dire, plutôt que de le faire
  // passer pour une attente : le patient qui a vu son protocole hier saurait que
  // la phrase d'attente est fausse, et n'aurait aucun moyen de le signaler.
  // Le praticien lit le même constat sur son écran de diffusion ([[D-191]]).
  if (protocole?.ok && protocole.indisponible) {
    return (
      <PatientCard>
        <PatientPageHeader title="Votre accompagnement" />
        <p className="text-sm text-muted-foreground mt-2">
          Votre accompagnement n’est pas consultable pour le moment. Votre praticien en est informé.
        </p>
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
  // LA PAUSE SUR EFFET INDÉSIRABLE ([[D-281]] §3-4) : les textes SIGNÉS, jamais
  // reformulés. Celui des compléments se lit une fois, au-dessus des actions.
  const pauseDe = new Map((protocole.pauses ?? []).map((p) => [p.actionId, p.texte]));
  const complementsEnPause = [...pauseDe.values()].includes('complements');
  // LE JOUR DIFFICILE PROPOSE UN SEUL PAS, ET JAMAIS UN PAS SUSPENDU. Une action
  // en attente de bilan porte sa phrase d'attente : la proposer « si vous le
  // pouvez aujourd'hui » dirait au patient le contraire de ce que son praticien
  // a posé. Un élément en pause non plus. La première action FERME, ou rien.
  const actionFerme = vue.actions.find((item) => !item.interventionStatus && !pauseDe.has(item.actionId)) ?? null;
  const pointOuvert = checkin?.pointEtapeOuvert ?? null;
  const dejaRenseigne = pointOuvert
    ? (checkin?.points.find((p) => p.pointEtape === pointOuvert)?.renseigne ?? false)
    : false;
  const checkinDu = pointOuvert !== null && !dejaRenseigne;

  // LA PREMIÈRE OUVERTURE DU DÉTAIL S'ENREGISTRE ([[D-315]] §1-2). Le
  // navigateur renvoie la `cycleRef` reçue avec la vue ; le serveur résout la
  // diffusion et refuse une version qui n'est plus en vigueur. Une fois par
  // montage, sans message ni erreur visible, comme `ConsignerLecturePortail` :
  // un échec laisse seulement la version « non ouverte », repliée à la visite
  // suivante.
  const deplierDetail = () => {
    focusApresDepli.current = true;
    setDetailDeplie(true);
    if (lectureEnvoyee.current) return;
    lectureEnvoyee.current = true;
    void fetch('/api/portail/lectures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ espece: 'protocole', cycleRef: vue.cycleRef }),
    }).catch(() => {
      // Silence délibéré : le patient a ouvert son protocole, rien d'autre.
    });
  };

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

      {/* CE SUR QUOI ON TRAVAILLE — le libellé d'axe SIGNÉ, recopié du registre
          des priorités par le serveur. Le patient lisait jusqu'ici sa raison
          d'être sans jamais savoir de quel axe elle venait. */}
      {!finDeCycle && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Ce qu’on travaille :</span> {vue.priorityLabel}
        </p>
      )}

      {/* REPLIÉ ([[D-315]] §1) : la raison et l'axe restent lus, les actions
          passent dans le détail — jamais une action sans sa phrase d'attente
          (`D-056`). Jamais replié sur une pause ([[D-281]]) : voir `charger`. */}
      {/* Le clic ci-dessous date la première ouverture du protocole : la phrase
          se lit AVANT ([[D-297]] §4 ; protocole daté, arbitrage du 2026-10-18).
          Même condition que le bouton — c'est lui seul qui consigne. */}
      {!finDeCycle && !detailDeplie && (vue.actions.length > 0 || vue.followUpCriterion) && <AvisLectureDatee />}
      {!finDeCycle && !detailDeplie && (vue.actions.length > 0 || vue.followUpCriterion) && (
        <button
          type="button"
          onClick={deplierDetail}
          aria-expanded={false}
          className={patientButtonClassName('primary')}
        >
          Voir le détail de mon protocole
        </button>
      )}

      {/* LES ACTIONS — les trois, et plus « la première ». Le constructeur en
          fait saisir jusqu'à trois ; le portail n'en servait qu'une, élue par
          l'ordre d'insertion ([[D-191]]). */}
      {!finDeCycle && detailDeplie && vue.actions.length > 0 && (
        <div className="space-y-2.5">
          <p ref={titreActions} tabIndex={-1} className="text-xs font-semibold uppercase tracking-wide text-primary">
            {vue.actions.length > 1 ? 'Vos actions' : 'Votre action'}
          </p>
          {complementsEnPause && (
            <p role="status" className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground">
              {TEXTE_PAUSE_COMPLEMENTS}
            </p>
          )}
          {vue.actions.map((action) => (
            <div
              key={action.actionId}
              className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3"
            >
              <p className="text-base font-medium text-foreground">{action.title}</p>
              {pauseDe.has(action.actionId) && (
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-foreground">En pause</p>
              )}
              <p className="mt-1 text-sm text-muted-foreground">{action.minimalPlan}</p>
              {pauseDe.get(action.actionId) === 'element' && (
                <p className="mt-2 text-sm text-foreground border-t border-primary/20 pt-2">{TEXTE_PAUSE_ELEMENT}</p>
              )}
              {pauseDe.get(action.actionId) === 'avis_rendu' && (
                <p className="mt-2 text-sm text-foreground border-t border-primary/20 pt-2">{TEXTE_PAUSE_AVIS_RENDU}</p>
              )}
              {/* UNE INTERVENTION NON FERME NE SE LIT JAMAIS COMME UN CONSEIL.
                  La phrase vient du contrat, jamais de la cible d'attente du
                  praticien : « ferritine » est son vocabulaire, « votre bilan »
                  celui du patient (`D-056`, arbitrage 5). */}
              {action.attente && (
                <p className="mt-2 text-sm text-foreground/80 border-t border-primary/20 pt-2">
                  {action.attente}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* LE CRITÈRE À TROIS SEMAINES — servi dans le JSON depuis toujours, rendu
          par aucun écran jusqu'ici. C'est ce que le patient et son praticien
          regarderont ensemble : le lui cacher faisait du point d'étape une
          évaluation dont lui seul ignorait la règle. */}
      {!finDeCycle && detailDeplie && vue.followUpCriterion && (
        <div className="rounded-xl border border-border px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ce qu’on regardera ensemble à trois semaines
          </p>
          <p className="mt-1 text-sm text-foreground">{vue.followUpCriterion}</p>
        </div>
      )}

      <PatientFoodCompassSummary token={token} items={vue.boussoles ?? []} enPause={protocole.boussolesEnPause ?? []} />

      {/* Accès : rendez-vous de suivi (mis en avant si dû) + fiche. */}
      <div className="flex flex-wrap gap-2.5">
        <Link
          href={`/portail/${token}/suivi`}
          className={patientButtonClassName(checkinDu ? 'primary' : 'ghost')}
        >
          {checkinDu ? 'Mon rendez-vous de suivi' : 'Mes rendez-vous de suivi'}
        </Link>
        {/* LE BOUTON DIT CE QU'IL FAIT ([[D-191]]). « Ma fiche conseils »
            promettait une fiche : il mène au centre TRUST — documents, droits,
            confidentialité —, et `adviceSheetRef`, la vraie fiche du contrat,
            est écrite `null` par la route depuis toujours. Aucun champ du
            constructeur ne la renseigne ; la dette est nommée au dossier de
            campagne, elle n'est pas refermée par un libellé. */}
        <Link href={`/portail/${token}/informations`} className={patientButtonClassName('ghost')}>
          Mes informations et mes droits
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

      {/* QUAND RALENTIR OU DEMANDER AVIS ([[D-348]], lettre bd) — le texte
          ACCEPTÉ, jamais reformulé. Hors du détail replié et servi en fin de
          cycle aussi : la conduite vaut tant qu'un protocole est servi. */}
      {protocole.encartConduite && (
        <section aria-labelledby="encart-conduite-titre" className="rounded-xl border border-border px-4 py-3 space-y-2">
          <h3 id="encart-conduite-titre" className="text-sm font-semibold text-foreground">
            {TITRE_ENCART_CONDUITE}
          </h3>
          {PARAGRAPHES_ENCART_CONDUITE.map((paragraphe) => (
            <p key={paragraphe} className="text-sm text-foreground">
              {paragraphe}
            </p>
          ))}
        </section>
      )}

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
              {actionFerme && (
                <p className="text-sm text-muted-foreground">
                  Si vous le pouvez aujourd’hui : {actionFerme.minimalPlan}.
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
