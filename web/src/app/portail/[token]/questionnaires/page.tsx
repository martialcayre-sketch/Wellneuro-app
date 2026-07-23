'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { PortailAssignationsResponse } from '@/app/api/portail/assignations/route';
import type { AssignationPatient } from '@/lib/consultation/mapAssignation';
import { hasDraft } from '@/lib/questionnaire-draft';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { PatientCard, patientCardClassName } from '@/components/patient/ui/PatientCard';
import { patientButtonClassName } from '@/components/patient/ui/PatientButton';
import { PatientJourneyProgress, buildJourneySteps } from '@/components/patient/PatientJourneyProgress';
import { detecterChangementsEtMettreAJour, type ChangementVisite } from '@/lib/portail-visite';
import { PatientErrorState } from '@/components/patient/PatientErrorState';
import { AvantDeCommencer } from '@/components/patient/trust/AvantDeCommencer';
import { PatientCompanionHome } from '@/components/patient-companion/PatientCompanionHome';
import { MonParcoursAccueil, type EtapeDuMoment } from '@/components/patient/MonParcoursAccueil';
import { PropositionPackReevaluation } from '@/components/patient/PropositionPackReevaluation';
import { deriverEtatParcoursPatient } from '@/lib/trajectoire-partagee/contrat';

type Groupe = 'a_completer' | 'correction' | 'transmis' | 'expire';

type Affichage = {
  groupe: Groupe;
  badge: string;
  badgeVariant: BadgeVariant;
  action: string | null; // libellé du bouton, null si non cliquable
  ghost?: boolean;
};

// Dérive l'affichage patient à partir des statuts de l'assignation.
function affichage(a: AssignationPatient, avecBrouillon: boolean): Affichage {
  if (a.statutReponses === 'verrouille') {
    return { groupe: 'transmis', badge: 'Transmis au praticien', badgeVariant: 'info', action: 'Consulter', ghost: true };
  }
  if (a.statutReponses === 'modification_demandee') {
    return { groupe: 'correction', badge: 'Correction demandée', badgeVariant: 'warning', action: 'Consulter', ghost: true };
  }
  if (a.statutReponses === 'deverrouille') {
    return { groupe: 'a_completer', badge: 'Déverrouillé par le praticien', badgeVariant: 'warning', action: 'Corriger' };
  }
  if (!a.estEnAttenteSaisie) {
    return { groupe: 'expire', badge: 'Expiré', badgeVariant: 'neutral', action: null };
  }
  return {
    groupe: 'a_completer',
    badge: avecBrouillon ? 'Brouillon enregistré' : 'À compléter',
    badgeVariant: 'neutral',
    action: avecBrouillon ? 'Reprendre' : 'Commencer',
  };
}

// Extrait le nombre de minutes d'une durée catalogue du type "5 min".
function parseDureeMinutes(duree: string | null): number {
  if (!duree) return 0;
  const m = duree.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

const GROUPES: { cle: Groupe; titre: string }[] = [
  { cle: 'a_completer', titre: 'À compléter' },
  { cle: 'correction', titre: 'Correction demandée' },
  { cle: 'transmis', titre: 'Transmis au praticien' },
  { cle: 'expire', titre: 'Expiré' },
];

// Groupes affichés en sections secondaires (repliables) : "à compléter"
// reste toujours visible en premier plan, le reste est du détail consultable.
const GROUPES_SECONDAIRES = new Set<Groupe>(['correction', 'transmis', 'expire']);

type Enrichi = { a: AssignationPatient; aff: Affichage };
type ActionRecommandee = EtapeDuMoment;

// Une seule action mise en avant, en priorité une reprise de brouillon, sinon
// le premier "à compléter" (Commencer/Corriger déverrouillé confondus,
// tous deux réellement actionnables), sinon une correction demandée en
// attente (non actionnable tant que le praticien ne l'a pas déverrouillée —
// présentée en information, pas en CTA), sinon un état stable sans action.
function calculerActionRecommandee(enriched: Enrichi[], brouillons: Set<string>): ActionRecommandee {
  if (enriched.length === 0) return { kind: 'vide' };
  const brouillon = enriched.find(e => e.aff.groupe === 'a_completer' && brouillons.has(e.a.idAssignation));
  const cible = brouillon ?? enriched.find(e => e.aff.groupe === 'a_completer');
  if (cible) {
    const titre = cible.a.titre || cible.a.idQuestionnaire;
    return { kind: 'action', idAssignation: cible.a.idAssignation, cta: `${cible.aff.action} « ${titre} »` };
  }
  const enAttente = enriched.find(e => e.aff.groupe === 'correction');
  if (enAttente) {
    const titre = enAttente.a.titre || enAttente.a.idQuestionnaire;
    return { kind: 'attente', texte: `Votre demande de correction sur « ${titre} » est en attente de traitement par votre praticien.` };
  }
  return { kind: 'stable' };
}

export default function QuestionnairesHubPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; error?: string }>({ status: 'loading' });
  const [patient, setPatient] = useState<{ idPatient: string; prenom: string; nom: string } | null>(null);
  const [assignations, setAssignations] = useState<AssignationPatient[]>([]);
  const [derniereReponseLe, setDerniereReponseLe] = useState<string | null>(null);
  const [brouillons, setBrouillons] = useState<Set<string>>(new Set());
  const [changements, setChangements] = useState<ChangementVisite[]>([]);
  // Parcours synchronisé (SP-CONV LOT-04, D11) : signaux servis par les
  // routes portail existantes. En cas d'échec de lecture, tout reste au plus
  // prudent (false / null) — le parcours n'avance jamais sur une supposition.
  const [signauxParcours, setSignauxParcours] = useState<{ consultationStatut: string | null; bookletEnvoye: boolean }>({
    consultationStatut: null,
    bookletEnvoye: false,
  });
  const [signauxProtocole, setSignauxProtocole] = useState<{ protocoleDiffuse: boolean; finDeCycle: boolean }>({
    protocoleDiffuse: false,
    finDeCycle: false,
  });
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
      setDerniereReponseLe(data.derniereReponseLe);
      setSignauxParcours(data.parcours ?? { consultationStatut: null, bookletEnvoye: false });
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
      // Comparaison locale à l'instantané de la visite précédente — purement
      // présentationnel, aucune écriture serveur (cf. lib/portail-visite.ts).
      setChangements(detecterChangementsEtMettreAJour(
        data.patient.idPatient,
        data.assignations.map(a => ({ idAssignation: a.idAssignation, titre: a.titre || a.idQuestionnaire, statutReponses: a.statutReponses })),
      ));
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

  const enriched = assignations.map(a => ({ a, aff: affichage(a, brouillons.has(a.idAssignation)) }));
  const aCompleterItems = enriched.filter(e => e.aff.groupe === 'a_completer');
  const aCompleter = aCompleterItems.length;
  const dureeACompleterMin = aCompleterItems.reduce((somme, e) => somme + parseDureeMinutes(e.a.duree), 0);
  const actionRecommandee = calculerActionRecommandee(enriched, brouillons);

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

  // L'étape du moment reflète l'état synchronisé quand plus rien n'est à
  // compléter : « stable » devient la formulation D7 (transmis / en
  // préparation / restitution disponible / prochaine étape prête). Une
  // correction en attente garde la priorité — elle est plus actionnable.
  const etapeDuMoment: EtapeDuMoment =
    actionRecommandee.kind === 'stable' && etatParcours
      ? { kind: 'attente', texte: etatParcours.formulation }
      : actionRecommandee;

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
        etape={etapeDuMoment}
      />

      {/* Proposition de réévaluation : ne s'affiche qu'en reprise, et une seule
          fois — la route décide, le composant ne rend rien sinon. Placée juste
          après l'étape du moment pour ne pas la concurrencer. */}
      <PropositionPackReevaluation />

      {/* Accès secondaires : une ligne de liens, plus deux cartes rivales. */}
      <nav aria-label="Autres espaces" className="flex flex-wrap gap-3">
        <a href={`/portail/${token}/alimentation`} className={patientButtonClassName('ghost')}>
          Ouvrir Mon carnet alimentaire
        </a>
        <a href={`/portail/${token}/suivi`} className={patientButtonClassName('ghost')}>
          Ouvrir mes rendez-vous de suivi
        </a>
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

      {changements.length > 0 && (
        <details className="rounded-xl border border-border bg-surface p-4">
          <summary className="cursor-pointer select-none text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Depuis votre dernière visite ({changements.length})
          </summary>
          <ul className="mt-3 space-y-1">
            {changements.map(c => (
              <li key={c.idAssignation} className="text-base text-foreground">{c.texte}</li>
            ))}
          </ul>
        </details>
      )}

      {aCompleter > 0 && (
        <p className="text-sm text-muted-foreground">
          {aCompleter === 1 ? 'Un questionnaire à compléter' : `${aCompleter} questionnaires à compléter`}
          {dureeACompleterMin > 0 ? ` · ≈ ${dureeACompleterMin} min` : ''}
        </p>
      )}

      {GROUPES.map(({ cle, titre }) => {
        // Dédoublonnage (SP-CONV LOT-04) : l'action recommandée est déjà mise
        // en avant par « Mon parcours » — la réafficher dans « À compléter »
        // diluait la promesse « une étape à la fois ». Rien n'est retiré : le
        // compteur reste complet, et l'item revient dans la liste dès qu'il
        // n'est plus l'action recommandée.
        const items = enriched.filter(
          e =>
            e.aff.groupe === cle &&
            !(
              cle === 'a_completer' &&
              actionRecommandee.kind === 'action' &&
              e.a.idAssignation === actionRecommandee.idAssignation
            ),
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
