'use client';

import { useEffect, useState } from 'react';
import { FINALITES } from '@/lib/trust/finalitesChoix';
import type { ChoixEtat } from '@/app/api/portail/trust/etat/route';
import { PatientButton } from '@/components/patient/ui/PatientButton';
import { PatientInlineMessage } from '@/components/patient/ui/PatientInlineMessage';
import { PatientVolet } from '@/components/patient/ui/PatientVolet';
import { enTeteDossierPage } from '@/lib/portail/dossierPage';
import { LienReconnexion } from '@/components/patient/LienReconnexion';

/**
 * « Mes choix et autorisations » (TRUST LOT-03) — chaque finalité facultative
 * s'accorde et se retire aussi simplement l'une que l'autre ; rien n'est
 * précoché ; l'historique reste visible et n'est jamais effacé (append-only
 * côté serveur).
 */
// LA FORMULATION A QUITTÉ CET ÉCRAN (2026-09-17). Elle vit dans
// `lib/trust/finalitesChoix.ts`, versionnée et verrouillée par empreinte, parce
// que la ROUTE doit enregistrer la version exactement servie ici ([[D-222]] §3
// amendé). Une constante recopiée des deux côtés diverge à la première
// retouche — le défaut que `gouvernance.ts` a payé.
//
// RÉEXPORTÉE pour son banc, qui interrogeait déjà ce module.
export { FINALITES };

const LIBELLE_STATUT: Record<string, string> = {
  accorde: 'Autorisé',
  refuse: 'Refusé',
  retire: 'Retiré',
};

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));

export function MesChoix({
  token,
  choixCourants,
  historiqueChoix,
  onChange,
}: {
  token: string;
  choixCourants: ChoixEtat[];
  historiqueChoix: ChoixEtat[];
  onChange: () => void;
}) {
  const [enCours, setEnCours] = useState<string | null>(null);
  // L'erreur paraît dans l'accordéon du choix qui a échoué, pas sous la liste
  // (Q5 a du prototype PAT-6, [[D-481]] complément DOC-11).
  // `reconnexion` : refus 401, T-36 suit le message dans un nouvel onglet
  // (Q3 a) ; le patient refait lui-même son choix une fois reconnecté.
  const [erreur, setErreur] = useState<{ finalite: string; texte: string; reconnexion?: boolean } | null>(null);
  // Q6 a : le statut affiché est annoncé aux lecteurs d'écran SEULEMENT quand
  // le serveur a accepté le choix ET que la page l'a relu (nouveaux
  // `choixCourants`) — jamais sur la seule réponse de l'écriture.
  const [attendu, setAttendu] = useState<{ finalite: string; statut: string } | null>(null);
  const [annonce, setAnnonce] = useState('');

  useEffect(() => {
    if (!attendu) return;
    const courant = choixCourants.find(c => c.finalite === attendu.finalite);
    if (courant?.statut !== attendu.statut) return;
    const libelle = FINALITES.find(f => f.finalite === attendu.finalite)?.libelle ?? '';
    setAnnonce(`${libelle} — ${LIBELLE_STATUT[courant.statut] ?? courant.statut}`);
    setAttendu(null);
  }, [attendu, choixCourants]);

  const enregistrer = async (finalite: string, statut: 'accorde' | 'refuse' | 'retire') => {
    setErreur(null);
    setAnnonce('');
    setAttendu(null);
    setEnCours(finalite);
    try {
      const res = await fetch('/api/portail/trust/choix', {
        method: 'POST',
        // Le segment de la page : la route refuse (409, T-51, affiché à
        // l'endroit du geste) s'il n'est pas le dossier de la session.
        headers: { 'Content-Type': 'application/json', ...enTeteDossierPage(token) },
        body: JSON.stringify({ token, finalite, statut }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) setErreur({ finalite, texte: data.error ?? 'Erreur. Réessayez.', reconnexion: res.status === 401 });
      else {
        setAttendu({ finalite, statut });
        onChange();
      }
    } catch {
      setErreur({ finalite, texte: 'Erreur réseau. Réessayez.' });
    } finally {
      setEnCours(null);
    }
  };

  return (
    <div className="space-y-3">
      <p role="status" className="sr-only">{annonce}</p>
      {FINALITES.map(def => {
        const courant = choixCourants.find(c => c.finalite === def.finalite);
        const statut = courant?.statut ?? null;
        const historique = historiqueChoix.filter(h => h.finalite === def.finalite);
        return (
          <PatientVolet
            key={def.finalite}
            titre={
              <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <span className="min-w-0 grow basis-24">{def.libelle}</span>
                <span className="font-normal text-muted-foreground">
                  {statut ? LIBELLE_STATUT[statut] ?? statut : 'Non autorisé'}
                </span>
              </span>
            }
            corpsClassName="px-4 pb-4 space-y-2 text-sm text-muted-foreground leading-relaxed"
          >
              <p>
                <span className="font-semibold text-foreground">Finalité : </span>
                {def.finaliteDetail}
              </p>
              <p>
                <span className="font-semibold text-foreground">Données concernées : </span>
                {def.donnees}
              </p>
              <p>
                <span className="font-semibold text-foreground">Destinataire : </span>
                {def.destinataire}
              </p>
              <p>
                <span className="font-semibold text-foreground">Effet d’un refus : </span>
                {def.effetRefus}
              </p>
              {erreur?.finalite === def.finalite && (
                <PatientInlineMessage tone="error">{erreur.texte}</PatientInlineMessage>
              )}
              {erreur?.finalite === def.finalite && erreur.reconnexion && <LienReconnexion nouvelOnglet />}
              <div className="flex flex-wrap gap-2 pt-1">
                {statut !== 'accorde' && (
                  <PatientButton
                    variant="primary"
                    loading={enCours === def.finalite}
                    loadingLabel="Enregistrement…"
                    onClick={() => void enregistrer(def.finalite, 'accorde')}
                  >
                    J’autorise
                  </PatientButton>
                )}
                {statut === 'accorde' && (
                  <PatientButton
                    variant="neutral"
                    loading={enCours === def.finalite}
                    loadingLabel="Enregistrement…"
                    onClick={() => void enregistrer(def.finalite, 'retire')}
                  >
                    Je retire mon autorisation
                  </PatientButton>
                )}
                {statut === null && (
                  <PatientButton
                    variant="neutral"
                    loading={enCours === def.finalite}
                    loadingLabel="Enregistrement…"
                    onClick={() => void enregistrer(def.finalite, 'refuse')}
                  >
                    Je refuse
                  </PatientButton>
                )}
              </div>
              <p className="text-xs">
                Le retrait s’applique aux utilisations futures. Les traitements déjà réalisés et les
                obligations de conservation peuvent rester soumis au cadre applicable.
              </p>
              {historique.length > 0 && (
                <div className="text-xs">
                  <p className="font-semibold text-foreground">Historique</p>
                  <ul className="list-disc list-inside">
                    {historique.map(h => (
                      <li key={h.enregistreLe}>
                        {LIBELLE_STATUT[h.statut] ?? h.statut} le {formatDate(h.enregistreLe)} (texte {h.documentVersion})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </PatientVolet>
        );
      })}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2 text-sm rounded-lg border border-border bg-surface">
        <span className="min-w-0 grow basis-24 text-foreground">Réutilisation secondaire de vos données</span>
        <span className="text-muted-foreground">Non proposée</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Aucun choix n’est précoché ; refuser un choix facultatif ne bloque jamais votre
        accompagnement.
      </p>
    </div>
  );
}
