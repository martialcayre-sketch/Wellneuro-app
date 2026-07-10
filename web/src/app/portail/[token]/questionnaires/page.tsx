'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { PortailAssignationsResponse } from '@/app/api/portail/assignations/route';
import type { AssignationPatient } from '@/lib/consultation/mapAssignation';
import { hasDraft } from '@/lib/questionnaire-draft';

const card = 'bg-white rounded-2xl shadow-sm border border-blue-100 p-5';
const btnCls = 'inline-flex items-center justify-center py-2 px-4 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors';
const btnGhost = 'inline-flex items-center justify-center py-2 px-4 bg-white text-blue-700 border border-blue-200 rounded-lg font-medium text-sm hover:bg-blue-50 transition-colors';

type Groupe = 'a_completer' | 'correction' | 'transmis' | 'expire';

type Affichage = {
  groupe: Groupe;
  badge: string;
  action: string | null; // libellé du bouton, null si non cliquable
  ghost?: boolean;
};

// Dérive l'affichage patient à partir des statuts de l'assignation.
function affichage(a: AssignationPatient, avecBrouillon: boolean): Affichage {
  if (a.statutReponses === 'verrouille') {
    return { groupe: 'transmis', badge: 'Transmis au praticien', action: 'Consulter', ghost: true };
  }
  if (a.statutReponses === 'modification_demandee') {
    return { groupe: 'correction', badge: 'Correction demandée', action: 'Consulter', ghost: true };
  }
  if (a.statutReponses === 'deverrouille') {
    return { groupe: 'a_completer', badge: 'Déverrouillé par le praticien', action: 'Corriger' };
  }
  if (!a.estEnAttenteSaisie) {
    return { groupe: 'expire', badge: 'Expiré', action: null };
  }
  return {
    groupe: 'a_completer',
    badge: avecBrouillon ? 'Brouillon enregistré' : 'À compléter',
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

export default function QuestionnairesHubPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; error?: string }>({ status: 'loading' });
  const [patient, setPatient] = useState<{ prenom: string; nom: string } | null>(null);
  const [assignations, setAssignations] = useState<AssignationPatient[]>([]);
  const [brouillons, setBrouillons] = useState<Set<string>>(new Set());

  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        const res = await fetch('/api/portail/assignations');
        if (res.status === 401) {
          // Session absente / expirée : retour au gate du portail.
          router.replace(`/portail/${token}`);
          return;
        }
        const data = (await res.json()) as PortailAssignationsResponse;
        if (annule) return;
        if (!data.ok) {
          setState({ status: 'error', error: data.error });
          return;
        }
        setPatient(data.patient);
        setAssignations(data.assignations);
        setBrouillons(new Set(data.assignations.filter(a => hasDraft(a.idAssignation)).map(a => a.idAssignation)));
        setState({ status: 'ready' });
      } catch {
        if (!annule) setState({ status: 'error', error: 'Erreur réseau. Réessayez.' });
      }
    })();
    return () => { annule = true; };
  }, [token, router]);

  if (state.status === 'loading') {
    return (
      <div className="w-full max-w-2xl">
        <div className={card}><p className="text-gray-500 text-sm">Chargement de vos questionnaires…</p></div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="w-full max-w-2xl">
        <div className={card}>
          <p className="text-red-600 text-sm bg-red-50 rounded-lg px-4 py-2">{state.error}</p>
        </div>
      </div>
    );
  }

  const enriched = assignations.map(a => ({ a, aff: affichage(a, brouillons.has(a.idAssignation)) }));
  const aCompleterItems = enriched.filter(e => e.aff.groupe === 'a_completer');
  const aCompleter = aCompleterItems.length;
  const dureeACompleterMin = aCompleterItems.reduce((somme, e) => somme + parseDureeMinutes(e.a.duree), 0);
  const transmis = enriched.filter(e => e.aff.groupe === 'transmis' || e.aff.groupe === 'correction').length;
  const total = assignations.length;

  return (
    <div className="w-full max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mes questionnaires</h1>
        <p className="text-gray-500 text-sm mt-1">
          {patient ? `Bonjour ${patient.prenom}. ` : ''}
          Vous pouvez les compléter dans l’ordre qui vous convient. Votre praticien recevra uniquement les questionnaires transmis.
        </p>
        <div className="flex flex-wrap gap-3 mt-3 text-sm">
          <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-3 py-1 font-medium">
            {aCompleter} à compléter{dureeACompleterMin > 0 ? ` · ≈ ${dureeACompleterMin} min` : ''}
          </span>
          <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-600 px-3 py-1">
            {transmis}/{total} transmis
          </span>
        </div>
      </div>

      {total === 0 && (
        <div className={card}>
          <p className="text-gray-600 text-sm">
            Aucun questionnaire pour le moment. Votre praticien les mettra à disposition prochainement.
          </p>
        </div>
      )}

      {GROUPES.map(({ cle, titre }) => {
        const items = enriched.filter(e => e.aff.groupe === cle);
        if (items.length === 0) return null;
        return (
          <section key={cle} className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{titre}</h2>
            <div className="space-y-3">
              {items.map(({ a, aff }) => (
                <div key={a.idAssignation} className={`${card} flex items-center justify-between gap-4`}>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 line-clamp-2">{a.titre || a.idQuestionnaire}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {aff.badge}
                      {a.duree ? ` · ${a.duree}` : ''}
                      {a.dateLimite ? ` · à rendre avant le ${a.dateLimite}` : ''}
                    </p>
                  </div>
                  {aff.action ? (
                    <a
                      href={`/portail/${token}/questionnaires/${a.idAssignation}`}
                      className={aff.ghost ? btnGhost : btnCls}
                    >
                      {aff.action}
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400 shrink-0">Indisponible</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
