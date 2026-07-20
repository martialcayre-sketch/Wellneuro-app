'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { PortailAssignationsResponse } from '@/app/api/portail/assignations/route';
import type { AssignationPatient } from '@/lib/consultation/mapAssignation';
import { hasDraft } from '@/lib/questionnaire-draft';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { PatientCard, patientCardClassName } from '@/components/patient/ui/PatientCard';
import { patientButtonClassName } from '@/components/patient/ui/PatientButton';
import { PatientPageHeader } from '@/components/patient/ui/PatientPageHeader';
import { PatientJourneyProgress, buildJourneySteps } from '@/components/patient/PatientJourneyProgress';
import { detecterChangementsEtMettreAJour, type ChangementVisite } from '@/lib/portail-visite';
import { PatientErrorState } from '@/components/patient/PatientErrorState';
import { AvantDeCommencer } from '@/components/patient/trust/AvantDeCommencer';
import { PatientCompanionHome } from '@/components/patient-companion/PatientCompanionHome';

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
type ActionRecommandee =
  | { kind: 'action'; idAssignation: string; cta: string }
  | { kind: 'attente'; texte: string }
  | { kind: 'stable' };

// Une seule action mise en avant, en priorité une reprise de brouillon, sinon
// le premier "à compléter" (Commencer/Corriger déverrouillé confondus,
// tous deux réellement actionnables), sinon une correction demandée en
// attente (non actionnable tant que le praticien ne l'a pas déverrouillée —
// présentée en information, pas en CTA), sinon un état stable sans action.
function calculerActionRecommandee(enriched: Enrichi[], brouillons: Set<string>): ActionRecommandee {
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
  const [brouillons, setBrouillons] = useState<Set<string>>(new Set());
  const [changements, setChangements] = useState<ChangementVisite[]>([]);
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
  const transmis = enriched.filter(e => e.aff.groupe === 'transmis' || e.aff.groupe === 'correction').length;
  const total = assignations.length;
  const actionRecommandee = calculerActionRecommandee(enriched, brouillons);

  return (
    <div className="w-full max-w-2xl space-y-6">
      <PatientJourneyProgress steps={buildJourneySteps(4)} />
      <PatientCompanionHome token={token} />
      <PatientPageHeader
        title="Mes questionnaires"
        subtitle={`${patient ? `Bonjour ${patient.prenom}. ` : ''}Vous pouvez les compléter dans l’ordre qui vous convient. Votre praticien recevra uniquement les questionnaires transmis.`}
      />
      <PatientCard padding="sm" className="border-primary/30">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Ma spirale alimentaire</p>
        <p className="text-sm text-foreground">
          Journal d’essai court pour préparer votre prochain point d’étape, sans détailler tous les repas.
        </p>
        <a
          href={`/portail/${token}/alimentation`}
          className={`mt-3 inline-flex items-center justify-center ${patientButtonClassName('ghost')}`}
        >
          Ouvrir Ma spirale alimentaire
        </a>
      </PatientCard>
      <PatientCard padding="sm" className="border-primary/30">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Mes rendez-vous de suivi</p>
        <p className="text-sm text-foreground">
          Quelques questions rapides à J7, J14 et J21 pour ajuster votre accompagnement avec votre praticien.
        </p>
        <a
          href={`/portail/${token}/suivi`}
          className={`mt-3 inline-flex items-center justify-center ${patientButtonClassName('ghost')}`}
        >
          Ouvrir mes rendez-vous de suivi
        </a>
      </PatientCard>
      <div className="flex flex-wrap gap-3 -mt-3 text-sm">
        <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-3 py-1 font-medium">
          {aCompleter} à compléter{dureeACompleterMin > 0 ? ` · ≈ ${dureeACompleterMin} min` : ''}
        </span>
        <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-3 py-1">
          {transmis}/{total} transmis
        </span>
      </div>

      {total === 0 && (
        <PatientCard padding="sm">
          <p className="text-muted-foreground text-sm">
            Aucun questionnaire pour le moment. Votre praticien les mettra à disposition prochainement.
          </p>
        </PatientCard>
      )}

      {total > 0 && (
        <PatientCard padding="sm" className="border-primary/30">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Action recommandée maintenant</p>
          {actionRecommandee.kind === 'action' ? (
            <>
              <a
                href={`/portail/${token}/questionnaires/${actionRecommandee.idAssignation}`}
                className={`inline-flex items-center justify-center ${patientButtonClassName('primary')}`}
              >
                {actionRecommandee.cta}
              </a>
              <p className="text-xs text-muted-foreground mt-2">
                Une fois transmis, un questionnaire est verrouillé et votre praticien en est informé.
              </p>
            </>
          ) : actionRecommandee.kind === 'attente' ? (
            <p className="text-sm text-muted-foreground">{actionRecommandee.texte}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Vous avez transmis tous vos questionnaires disponibles. Votre praticien vous recontactera pour la suite.
            </p>
          )}
        </PatientCard>
      )}

      {changements.length > 0 && (
        <PatientCard padding="sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Depuis votre dernière visite</p>
          <ul className="space-y-1">
            {changements.map(c => (
              <li key={c.idAssignation} className="text-sm text-foreground">{c.texte}</li>
            ))}
          </ul>
        </PatientCard>
      )}

      {GROUPES.map(({ cle, titre }) => {
        const items = enriched.filter(e => e.aff.groupe === cle);
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
