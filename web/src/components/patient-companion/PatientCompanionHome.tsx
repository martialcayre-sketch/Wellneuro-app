'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AvisLectureDatee } from '@/components/patient/AvisLectureDatee';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { patientButtonClassName } from '@/components/patient/ui/PatientButton';
import { PatientPageHeader } from '@/components/patient/ui/PatientPageHeader';
import type { PointEtape } from '@/lib/protocol/checkinDomain';
import { ProtocolCheckinTrend, type PointEtat } from './ProtocolCheckinTrend';
import { DetailDuProtocole, EncartConduite, type ProtocoleResponse } from './DetailDuProtocole';
import { mentionValidation } from '@/lib/portail/texteMentionValidation';
import { LIEN_PROTOCOLE_IMPRIMABLE } from '@/lib/portail/texteProtocoleImprimable';

// Accueil compagnon du PROTOCOLE ACTIF (C2A LOT-05), borné R8-lite. Ce que le
// patient doit savoir en ~10 s : sa raison, son action du jour, l'accès à sa
// fiche et à son rendez-vous de suivi, une progression factuelle (jamais de %),
// et un mode « jour difficile » rassurant. Ce N'EST PAS un accueil de trajectoire
// « Ma spirale » (= SP-SPI, Phase B). Aucun score, aucun détail clinique.

// Le type de la réponse vit avec le détail qu'il nourrit (`DetailDuProtocole`).
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
  const mention = protocole.valideLe ? mentionValidation(protocole.valideLe) : null;
  // Pauses et plans : le détail les lit lui-même ; l'accueil en garde ce qu'il
  // faut au jour difficile.
  const pauseDe = new Map((protocole.pauses ?? []).map((p) => [p.actionId, p.texte]));
  const plansDe = new Map((protocole.troisPlans ?? []).map((p) => [p.actionId, p]));
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

      {/* « VALIDÉ PAR VOTRE PRATICIEN LE … » ([[D-369]], lettre ba) — en tête,
          une fois, la date de l'approbation de diffusion de la version servie.
          Hors du détail replié, et en fin de cycle aussi : elle date la page. */}
      {mention && <p className="text-sm text-muted-foreground">{mention}</p>}

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

      {/* LES ACTIONS ET LE CRITÈRE À TROIS SEMAINES — le même composant que
          l'imprimable ([[D-392]] §1). */}
      {!finDeCycle && detailDeplie && (
        <DetailDuProtocole vue={vue} pauses={protocole.pauses} troisPlans={protocole.troisPlans} titreRef={titreActions} />
      )}

      {/* Accès : rendez-vous de suivi (mis en avant si dû) + fiche. */}
      <div className="flex flex-wrap gap-2.5">
        <Link
          href={`/portail/${token}/suivi`}
          className={patientButtonClassName(checkinDu ? 'primary' : 'ghost')}
        >
          {checkinDu ? 'Mon rendez-vous de suivi' : 'Mes rendez-vous de suivi'}
        </Link>
        {/* « IMPRIMER MON PROTOCOLE » ([[D-392]], lettre bh) — dans le détail
            déplié seulement : il imprime ce détail-là. La route décide
            (drapeau, dossier majeur) ; absent, aucun lien. */}
        {protocole.imprimable && !finDeCycle && detailDeplie && (vue.actions.length > 0 || vue.followUpCriterion) && (
          <Link href={`/portail/${token}/protocole`} className={patientButtonClassName('ghost')}>
            {LIEN_PROTOCOLE_IMPRIMABLE}
          </Link>
        )}
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

      {/* QUAND RALENTIR OU DEMANDER AVIS ([[D-349]], lettre bd) — le texte
          ACCEPTÉ, jamais reformulé. Hors du détail replié et servi en fin de
          cycle aussi : la conduite vaut tant qu'un protocole est servi. */}
      {protocole.encartConduite && <EncartConduite />}

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
                  {/* Le plan de secours de la même action, s'il est servi ([[D-384]] §4),
                      sinon le plan minimal, comme avant. L'un comme l'autre sans son
                      point final : le gabarit pose le sien (plus de « .. »). */}
                  Si vous le pouvez aujourd’hui : {(plansDe.get(actionFerme.actionId)?.rescuePlan ?? actionFerme.minimalPlan).replace(/\.\s*$/, '')}.
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
