'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { PortailAssignationsResponse } from '@/app/api/portail/assignations/route';
import type { AssignationPatient } from '@/lib/consultation/mapAssignation';
import { hasDraft } from '@/lib/questionnaire-draft';
import { Badge } from '@/components/ui/Badge';
import { PatientCard, patientCardClassName } from '@/components/patient/ui/PatientCard';
import { patientButtonClassName } from '@/components/patient/ui/PatientButton';
import { PatientJourneyProgress, buildJourneySteps } from '@/components/patient/PatientJourneyProgress';
import {
  affichage,
  GROUPES,
  GROUPES_SECONDAIRES,
  type AgendaAliPortail,
  type AgendaPortail,
  type Groupe,
} from '@/lib/portail/hubQuestionnaires';
import { PatientErrorState } from '@/components/patient/PatientErrorState';
import { AvantDeCommencer } from '@/components/patient/trust/AvantDeCommencer';
import { PatientCompanionHome } from '@/components/patient-companion/PatientCompanionHome';
import { LienDossierDeuxVoix } from '@/components/patient-companion/LienDossierDeuxVoix';
import { MonParcoursAccueil } from '@/components/patient/MonParcoursAccueil';
import { construireFilDuJour } from '@/lib/portail/filDuJour';
import type { LectureAttendue } from '@/lib/portail/lecturesAttendues';
import { PropositionPackReevaluation } from '@/components/patient/PropositionPackReevaluation';
import { deriverEtatParcoursPatient } from '@/lib/trajectoire-partagee/contrat';

// Extrait le nombre de minutes d'une durée catalogue du type "5 min".
function parseDureeMinutes(duree: string | null): number {
  if (!duree) return 0;
  const m = duree.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

export default function QuestionnairesHubPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; error?: string }>({ status: 'loading' });
  const [patient, setPatient] = useState<{ idPatient: string; prenom: string; nom: string } | null>(null);
  const [assignations, setAssignations] = useState<AssignationPatient[]>([]);
  // Agendas du sommeil en cours : compte de nuits et position dans la fenêtre,
  // rien d'autre. En cas d'échec de lecture, tableau vide — le hub retombe sur
  // son comportement d'avant, jamais sur une supposition.
  const [agendas, setAgendas] = useState<AgendaPortail[]>([]);
  // Agendas alimentaires en cours : compte de journées et position dans la
  // fenêtre, rien d'autre. Même résilience que ci-dessus — en cas d'échec de
  // lecture, tableau vide : le hub retombe sur son comportement d'avant
  // l'agenda alimentaire, jamais sur une supposition.
  const [agendasAli, setAgendasAli] = useState<AgendaAliPortail[]>([]);
  const [derniereReponseLe, setDerniereReponseLe] = useState<string | null>(null);
  const [brouillons, setBrouillons] = useState<Set<string>>(new Set());
  // Parcours synchronisé (SP-CONV LOT-04, D11) : signaux servis par les
  // routes portail existantes. En cas d'échec de lecture, tout reste au plus
  // prudent (false / null) — le parcours n'avance jamais sur une supposition.
  // `bookletEnvoye` (historique, alimente la frise) et `bilanConsultable`
  // (accès au document, gouverne le lien) sont DEUX signaux : le rejet d'un
  // bilan retire l'accès sans faire reculer la frise. Voir le commentaire de
  // `api/portail/assignations/route.ts` et l'invariant de
  // `lib/trajectoire-partagee/contrat.ts`.
  const [signauxParcours, setSignauxParcours] = useState<{
    consultationStatut: string | null;
    bookletEnvoye: boolean;
    bilanConsultable: boolean;
  }>({
    consultationStatut: null,
    bookletEnvoye: false,
    bilanConsultable: false,
  });
  const [signauxProtocole, setSignauxProtocole] = useState<{ protocoleDiffuse: boolean; finDeCycle: boolean }>({
    protocoleDiffuse: false,
    finDeCycle: false,
  });
  /*
   * LA FENÊTRE DE DÉPÔT DE « CE QUI COMPTE » — et pourquoi une sonde.
   *
   * Le hub est un composant CLIENT, et `WN_CE_QUI_COMPTE` n'est pas
   * `NEXT_PUBLIC_*` : elle est absente du bundle navigateur. C'est donc la
   * route qui décide, et son GET ne sert QUE d'interrupteur — il ne transporte
   * aucun texte de patient.
   *
   * `null` = ON NE SAIT PAS : drapeau fermé, sonde en vol, sonde en échec. Le
   * fil du jour n'invite PAS dans le doute (`D-015`) — inviter à un geste
   * impossible enverrait le patient sur un écran qui rend `notFound()`.
   *
   * CONTRAIREMENT AU LIEN DE NAVIGATION QUI A ÉTÉ ESSAYÉ PUIS RETIRÉ (#1052),
   * la FENÊTRE est consultée ici, et pas seulement le drapeau. Une porte peut
   * rester ouverte sur un écran qui explique pourquoi le dépôt est clos ; une
   * TÂCHE, non — « dire ce qui compte pour moi » proposé à quelqu'un qui a déjà
   * déposé nommerait un geste que `D-166` refuse.
   */
  const [ceQuiCompteOuvert, setCeQuiCompteOuvert] = useState<boolean | null>(null);
  /*
   * CE QUE LE PRATICIEN A REMIS et que le patient n'a pas encore ouvert. La
   * route applique les MÊMES règles de visibilité que les écrans du bilan et de
   * la synthèse, et ne transporte aucun contenu — une espèce, une version, une
   * date.
   *
   * Tableau vide en cas d'échec : le fil retombe sur ce qu'il sait. Annoncer
   * une lecture qu'on n'a pas pu vérifier enverrait le patient sur un écran qui
   * lui dirait qu'il n'y a rien.
   */
  const [lectures, setLectures] = useState<LectureAttendue[]>([]);
  // Séquence TRUST « Avant de commencer » pour les patients existants : une
  // fois au prochain accès, tant que la version courante du cadre n'a pas
  // d'accusé de lecture. Jamais bloquante en cas d'erreur réseau.
  const [avantRequis, setAvantRequis] = useState(false);
  // Garde-fou : ignorer une réponse tardive si le composant a été démonté
  // (navigation rapide) pendant que le fetch était en vol.
  const annuleRef = useRef(false);

  useEffect(() => {
    // Même durcissement que le wizard : une réponse non-ok peut n'être qu'un
    // aléa transitoire (propagation de cookie, hoquet réseau) — brefs
    // réessais bornés avant de dégrader, sinon la séquence serait sautée.
    void (async () => {
      for (let essai = 0; essai < 3; essai++) {
        try {
          const res = await fetch(`/api/portail/trust/etat?token=${encodeURIComponent(token)}`);
          if (res.ok) {
            const etat = (await res.json()) as { ok: boolean; avantDeCommencerRequis?: boolean };
            if (!annuleRef.current && etat.ok && etat.avantDeCommencerRequis) setAvantRequis(true);
            return;
          }
        } catch {
          /* réessai ci-dessous */
        }
        if (annuleRef.current) return;
        await new Promise(resolve => setTimeout(resolve, 300 * (essai + 1)));
      }
    })();
  }, [token]);

  useEffect(() => {
    let vivant = true;
    void (async () => {
      try {
        const res = await fetch('/api/portail/ce-qui-compte');
        const data = (await res.json()) as {
          ok?: boolean;
          ouvert?: boolean;
          fenetre?: { ouverte?: boolean };
        };
        if (!vivant) return;
        // Trois conditions, et aucune n'est de trop : la route a répondu, la
        // surface est ouverte pour ce patient, et la fenêtre de dépôt l'est
        // aussi. `=== true` partout — une clé absente ne doit pas ouvrir.
        if (res.ok && data.ok === true && data.ouvert === true) {
          setCeQuiCompteOuvert(data.fenetre?.ouverte === true);
        }
      } catch {
        // Silence délibéré : on reste à `null`, donc sans invitation. Annoncer
        // une panne sur une surface que le patient ne connaît pas encore
        // l'informerait d'un incident sur un écran qui n'existe pas pour lui.
      }
    })();
    return () => {
      vivant = false;
    };
  }, []);

  useEffect(() => {
    let vivant = true;
    void (async () => {
      try {
        const res = await fetch('/api/portail/lectures');
        const data = (await res.json()) as { ok?: boolean; lectures?: LectureAttendue[] };
        if (vivant && res.ok && data.ok === true && Array.isArray(data.lectures)) {
          setLectures(data.lectures);
        }
      } catch {
        // Silence délibéré : aucune lecture annoncée. Le portail ne signale pas
        // au patient la panne d'une surface dont il ignore l'existence.
      }
    })();
    return () => {
      vivant = false;
    };
  }, []);

  const charger = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const res = await fetch('/api/portail/assignations');
      if (annuleRef.current) return;
      if (res.status === 401) {
        // Session absente / expirée : retour au gate du portail.
        router.replace(`/portail/${token}`);
        return;
      }
      const data = (await res.json()) as PortailAssignationsResponse;
      if (annuleRef.current) return;
      if (!data.ok) {
        setState({ status: 'error', error: data.error });
        return;
      }
      setPatient(data.patient);
      setAssignations(data.assignations);
      setAgendas(data.agendas ?? []);
      setAgendasAli(data.agendasAlimentaires ?? []);
      setDerniereReponseLe(data.derniereReponseLe);
      setSignauxParcours(
        data.parcours ?? { consultationStatut: null, bookletEnvoye: false, bilanConsultable: false },
      );
      // Protocole diffusé / fin de cycle : route existante, lecture résiliente
      // — un échec laisse les signaux au plus prudent, jamais bloquant.
      void (async () => {
        try {
          const resProtocole = await fetch('/api/portail/protocole');
          if (!resProtocole.ok || annuleRef.current) return;
          const protocole = (await resProtocole.json()) as {
            ok?: boolean;
            protocoleDiffuse?: boolean;
            finDeCycle?: boolean;
          };
          if (!annuleRef.current && protocole.ok) {
            setSignauxProtocole({
              protocoleDiffuse: protocole.protocoleDiffuse === true,
              finDeCycle: protocole.finDeCycle === true,
            });
          }
        } catch {
          /* signaux laissés au plus prudent */
        }
      })();
      setBrouillons(new Set(data.assignations.filter(a => hasDraft(a.idAssignation)).map(a => a.idAssignation)));
      setState({ status: 'ready' });
    } catch {
      if (annuleRef.current) return;
      setState({ status: 'error', error: 'Connexion interrompue. Vérifiez votre connexion et réessayez.' });
    }
  }, [token, router]);

  useEffect(() => {
    annuleRef.current = false;
    void charger();
    return () => { annuleRef.current = true; };
  }, [charger]);

  if (state.status === 'loading') {
    return (
      <PatientCard padding="sm">
        <p className="text-muted-foreground text-sm">Chargement de vos questionnaires…</p>
      </PatientCard>
    );
  }

  if (state.status === 'error') {
    return (
      <PatientCard padding="sm">
        <PatientErrorState message={state.error ?? 'Une erreur est survenue.'} onReessayer={() => void charger()} />
      </PatientCard>
    );
  }

  if (avantRequis) {
    return (
      <div className="w-full max-w-2xl space-y-4">
        <AvantDeCommencer token={token} onDone={() => setAvantRequis(false)} />
      </div>
    );
  }

  const enriched = assignations.map(a => ({
    a,
    aff: affichage(
      a,
      brouillons.has(a.idAssignation),
      agendas.find(g => g.idAssignation === a.idAssignation),
      agendasAli.find(g => g.idAssignation === a.idAssignation),
    ),
  }));
  const aCompleterItems = enriched.filter(e => e.aff.groupe === 'a_completer');
  const aCompleter = aCompleterItems.length;
  const dureeACompleterMin = aCompleterItems.reduce((somme, e) => somme + parseDureeMinutes(e.a.duree), 0);

  // Parcours synchronisé (SP-CONV LOT-04) : les étapes 5-6 vivent enfin —
  // dérivées du contrat partagé sur les seuls signaux que le portail sert
  // déjà. Null tant que des questionnaires restent à compléter : les étapes
  // 1-4 gardent leur logique d'écran.
  const etatParcours = deriverEtatParcoursPatient({
    questionnairesTransmis: enriched.length > 0 && aCompleterItems.length === 0,
    consultationStatut: signauxParcours.consultationStatut,
    protocoleDiffuse: signauxProtocole.protocoleDiffuse,
    finDeCycle: signauxProtocole.finDeCycle,
    bookletEnvoye: signauxParcours.bookletEnvoye,
  });

  // LE FIL DU JOUR : ce qu'il y a à faire, dans l'ordre. La formulation du
  // contrat de parcours ne devient le repos que si rien n'est à faire ET qu'il
  // n'y a pas de correction en attente — c'est la dérivation qui arbitre, ici
  // on ne fait que lui passer la phrase.
  const fil = construireFilDuJour({
    token,
    enrichis: enriched,
    brouillons,
    lectures,
    agendas,
    agendasAli,
    ceQuiCompteOuvert,
    formulationParcours: etatParcours?.formulation ?? null,
  });
  // Ce que le fil met en avant ne se répète pas dans les listes plus bas. Le
  // dédoublonnage portait jusqu'ici sur la SEULE action recommandée ; il porte
  // maintenant sur tout le fil, sans quoi un patient à quatre tâches lirait
  // quatre fois la même chose sur un écran dont on vient de lui retirer le
  // bruit. Rien n'est perdu : un item revient dans sa liste dès qu'il quitte
  // le fil.
  const clesDuFil = new Set(fil.taches.map(t => t.cle));

  /*
   * Disposition séquentielle (SP-SPI / LOT-01, résorption de l'écart E11).
   *
   * Avant : une dizaine de blocs autonomes empilés se disputaient l'attention
   * — frise, compagnon, deux cartes d'accès, deux compteurs, l'action
   * recommandée, les changements, puis quatre groupes de liste.
   *
   * Après : une seule chose est mise en avant, « Mon parcours », qui porte
   * l'étape du moment. Tout le reste descend d'un cran — les accès secondaires
   * deviennent une ligne de liens plutôt que des cartes concurrentes, et ce
   * qui relève du détail passe sous `<details>`. Rien n'est retiré : c'est la
   * hiérarchie qui change, pas le contenu.
   */
  return (
    <div className="w-full max-w-2xl space-y-6">
      {/* Étapes 5-6 pilotées par le contrat (SP-CONV LOT-04) — jamais
          rétrogrades : les signaux sous-jacents ne reculent pas. */}
      <PatientJourneyProgress steps={buildJourneySteps(etatParcours?.journeyCurrentId ?? 4)} />

      <MonParcoursAccueil
        token={token}
        prenom={patient?.prenom ?? null}
        derniereReponseLe={derniereReponseLe}
        fil={fil}
      />

      {/* Proposition de réévaluation : ne s'affiche qu'en reprise, et une seule
          fois — la route décide, le composant ne rend rien sinon. Placée juste
          après l'étape du moment pour ne pas la concurrencer. */}
      <PropositionPackReevaluation />

      {/* Accès secondaires : une ligne de liens, plus deux cartes rivales. */}
      <nav aria-label="Autres espaces" className="flex flex-wrap gap-3">
        {/* Le bilan n'apparaît que si le praticien en a transmis un ET que le
            document est encore lisible : `bilanConsultable`, pas
            `bookletEnvoye`. Les deux se séparent au rejet — l'envoi reste
            acquis pour la frise (elle ne recule pas), l'accès au document
            disparaît. C'est la MÊME visibilité que sert `api/portail/bilan`,
            sinon ce lien mènerait à « votre praticien ne vous a pas encore
            transmis de bilan ». Il reste un accès secondaire : un document à
            relire n'est jamais une tâche périssable, et il ne doit pas
            concurrencer l'étape du moment. */}
        {signauxParcours.bilanConsultable && (
          <a href={`/portail/${token}/bilan`} className={patientButtonClassName('ghost')}>
            Consulter mon bilan
          </a>
        )}
        <a href={`/portail/${token}/alimentation`} className={patientButtonClassName('ghost')}>
          Ouvrir Mon carnet alimentaire
        </a>
        <a href={`/portail/${token}/suivi`} className={patientButtonClassName('ghost')}>
          Ouvrir mes rendez-vous de suivi
        </a>
        {/* ICI, et non dans « Mon accompagnement » : ce dernier est replié et
            placé après un retour anticipé qui exige un protocole diffusé — un
            patient sans protocole n'y verrait jamais ce lien. Le composant se
            rend lui-même invisible tant que la route ne dit pas que la surface
            est ouverte (LOT-06). */}
        {/* PAS DE PORTE SÉPARÉE VERS « CE QUI COMPTE » NI VERS « CE QUE J'AI
            COMPRIS », et c'est un arbitrage du responsable (2026-09-12, sur
            copie d'écran) : les deux vivent DÉJÀ dans le dossier à deux voix,
            qu'ouvre le lien ci-dessus. Deux boutons de plus ne donnaient pas un
            accès, ils ajoutaient du bruit à une nav qui en portait déjà cinq.

            CE QUI MANQUE VRAIMENT N'EST PAS UNE PORTE, C'EST UNE INVITATION :
            jamais le patient n'est invité à DIRE ce qui compte pour lui. Cela
            appartient au fil du jour — une tâche qui paraît quand elle est due
            et s'en va quand elle est faite —, pas à une navigation permanente. */}
        <LienDossierDeuxVoix token={token} />
      </nav>

      {/*
        L'accompagnement du protocole actif reste un objet distinct (il est
        borné R8-lite et n'est pas l'accueil de trajectoire) : on le replie
        plutôt que de le fondre dans « Mon parcours ».
      */}
      <details className="rounded-xl border border-border bg-surface p-4">
        <summary className="cursor-pointer select-none text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Mon accompagnement
        </summary>
        <div className="mt-3">
          <PatientCompanionHome token={token} />
        </div>
      </details>

      {/*
        ── CE QUI OCCUPAIT CETTE PLACE, ET POURQUOI IL N'Y EST PLUS ──────────

        Deux récapitulatifs RÉTROSPECTIFS se sont succédé ici : « Depuis votre
        dernière visite (N) », deviné d'un instantané `localStorage`, puis le
        journal du dossier, dérivé du serveur — ce dernier gardé par
        `WN_PORTAIL_JOURNAL`, allumé treize minutes le 2026-09-12.

        Le responsable a tranché en ouvrant son propre écran : un récapitulatif
        rétrospectif AJOUTE DU BRUIT là où il attend une liste de ce qu'il y a à
        faire. Les deux sont donc partis, et le second n'a pas servi de raison
        de garder le premier : ils étaient de la même famille.

        Ce qui répond maintenant à « où en suis-je » est le FIL DU JOUR, plus
        haut — non pas ce qui s'est passé, mais ce qui reste à faire. Un dossier
        qui n'a rien à demander le dit avec « Rien à faire aujourd'hui », et
        c'est une réponse, pas un vide.
      */}

      {aCompleter > 0 && (
        <p className="text-sm text-muted-foreground">
          {aCompleter === 1 ? 'Un questionnaire à compléter' : `${aCompleter} questionnaires à compléter`}
          {dureeACompleterMin > 0 ? ` · ≈ ${dureeACompleterMin} min` : ''}
        </p>
      )}

      {GROUPES.map(({ cle, titre }) => {
        // Dédoublonnage (SP-CONV LOT-04, élargi au fil du jour le 2026-09-12) :
        // ce que « Mon parcours » porte déjà ne se réaffiche pas ici. Le
        // compteur, lui, reste complet — il totalise ce qui est à compléter, y
        // compris ce que le fil a remonté.
        const items = enriched.filter(
          e => e.aff.groupe === cle && !(cle === 'a_completer' && clesDuFil.has(e.a.idAssignation)),
        );
        if (items.length === 0) return null;

        const liste = (
          <div className="space-y-3">
            {items.map(({ a, aff }) => (
              <div key={a.idAssignation} className={patientCardClassName('sm', 'flex items-center justify-between gap-4')}>
                <div className={`min-w-0 ${aff.groupe === 'expire' ? 'opacity-60' : ''}`}>
                  <p className="font-medium text-foreground line-clamp-2">{a.titre || a.idQuestionnaire}</p>
                  <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1.5">
                    <Badge variant={aff.badgeVariant}>{aff.badge}</Badge>
                    {(a.duree || a.dateLimite) && (
                      <span className="text-xs text-muted-foreground">
                        {a.duree ?? ''}
                        {a.dateLimite ? `${a.duree ? ' · ' : ''}à rendre avant le ${a.dateLimite}` : ''}
                      </span>
                    )}
                  </div>
                </div>
                {aff.action ? (
                  <a
                    href={`/portail/${token}/questionnaires/${a.idAssignation}`}
                    className={`inline-flex items-center justify-center shrink-0 ${patientButtonClassName(aff.ghost ? 'ghost' : 'primary')}`}
                  >
                    {aff.action}
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground/70 shrink-0">Indisponible</span>
                )}
              </div>
            ))}
          </div>
        );

        // "À compléter" reste toujours visible ; les sections secondaires
        // (transmis/correction/expiré) sont repliées par défaut sous un
        // <details> natif — accessible sans JavaScript custom.
        if (GROUPES_SECONDAIRES.has(cle)) {
          return (
            <details key={cle} className="space-y-3">
              <summary className="text-sm font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer select-none">
                {titre} ({items.length})
              </summary>
              <div className="mt-3">{liste}</div>
            </details>
          );
        }

        return (
          <section key={cle} className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{titre}</h2>
            {liste}
          </section>
        );
      })}
    </div>
  );
}
