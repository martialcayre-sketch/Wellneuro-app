'use client';

import { useState } from 'react';
import type { CouvertureAdressage } from '@/lib/clinical-engine/safetyFindingSource';

// Signaux d'alerte ADRESSÉS ([[D-257]], LOT-04b) — panneau présentationnel.
//
// UN SIGNAL ADRESSÉ N'EST PAS UN SIGNAL EFFACÉ (A1). Il ne suspend plus la
// décision, mais il reste sous les yeux du praticien, avec la ou les lettres qui
// le couvrent. Effacer l'un des deux ferait passer une levée pour une absence.
//
// TOUTES LES LETTRES, ET UN BOUTON PAR LETTRE (cadrage §7, revue du
// 2026-10-03). Une révocation vise UNE lettre, et rebloque tous les signaux
// qu'elle couvre — sauf ceux qu'une autre lettre couvre encore.
//
// IL N'AFFIRME RIEN DE CLINIQUE : il rend le `rationale` produit au serveur et
// les dates servies par la réponse du cockpit, sans rien recalculer.

export type ConstatAdresse = { findingId: string; rationale: string };

export type RevocationState = { idAdressage: string; enCours: boolean; erreur: string | null } | null;

const MOTIF_MAX = 2000;

function dateLisible(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function SignauxAdressesPanel({
  constats,
  couvertures,
  revocation,
  onRevoquer,
}: {
  constats: ConstatAdresse[];
  couvertures: CouvertureAdressage[];
  revocation: RevocationState;
  onRevoquer: (idAdressage: string, motif: string) => void;
}) {
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [motif, setMotif] = useState('');
  if (constats.length === 0) return null;

  return (
    <section
      aria-label="Signaux adressés"
      className="rounded-xl border border-border bg-surface p-4"
    >
      <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
        Signaux adressés au médecin
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Ces signaux ont fait l’objet d’une lettre d’adressage consignée : ils ne suspendent plus
        la décision, et restent affichés. Révoquer une lettre consignée par erreur fait de nouveau
        suspendre la décision à tous les signaux qu’elle couvre, sauf si une autre lettre les couvre.
      </p>
      <ul className="mt-3 flex flex-col gap-3">
        {constats.map(constat => {
          const nombre = couvertures.filter(c => c.findingIds.includes(constat.findingId)).length;
          return (
            <li key={constat.findingId} className="rounded-lg border border-border p-3">
              <p className="text-sm text-foreground">{constat.rationale}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {nombre > 1 ? `Couvert par ${nombre} lettres d’adressage.` : 'Couvert par une lettre d’adressage.'}
              </p>
            </li>
          );
        })}
      </ul>
      {/* UNE RÉVOCATION VISE UNE LETTRE, PAS UN SIGNAL (revue du 2026-10-03,
          P2-3) : un bouton par lettre, qui dit combien de signaux elle couvre.
          Un bouton sous chaque signal laissait croire qu'on révoquait celui-là
          seul, et deux boutons identiques ne se distinguaient pas au lecteur
          d'écran. */}
      <h4 className="mt-4 text-sm font-medium text-foreground">Lettres consignées</h4>
      <ul className="mt-2 flex flex-col gap-2">
        {couvertures
          .filter(couverture => couverture.findingIds.some(id => constats.some(c => c.findingId === id)))
          .map(couverture => {
            const cible = couverture.idAdressage;
            const couverts = couverture.findingIds.filter(id => constats.some(c => c.findingId === id)).length;
            const quand = dateLisible(couverture.acteLe);
            const enCours = revocation?.idAdressage === cible && revocation.enCours;
            return (
              <li key={cible} className="text-sm text-muted-foreground">
                <span>
                  Adressage engagé le {quand} — la lettre couvre {couverts > 1 ? `${couverts} signaux` : 'un signal'}.
                </span>{' '}
                {ouverte !== cible ? (
                  <button
                    type="button"
                    aria-label={`Révoquer la lettre du ${quand}, qui couvre ${couverts > 1 ? `${couverts} signaux` : 'un signal'}`}
                    onClick={() => { setOuverte(cible); setMotif(''); }}
                    className="min-h-11 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground"
                  >
                    Révoquer cette lettre
                  </button>
                ) : (
                  <div className="mt-2">
                    <label className="block text-xs text-muted-foreground" htmlFor={`motif-${cible}`}>
                      Motif de la révocation (obligatoire)
                    </label>
                    <textarea
                      id={`motif-${cible}`}
                      value={motif}
                      maxLength={MOTIF_MAX}
                      rows={3}
                      onChange={event => setMotif(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm text-foreground"
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={enCours || motif.trim() === ''}
                        onClick={() => onRevoquer(cible, motif.trim())}
                        className="min-h-11 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                      >
                        Confirmer la révocation
                      </button>
                      <button
                        type="button"
                        disabled={enCours}
                        onClick={() => setOuverte(null)}
                        className="min-h-11 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground"
                      >
                        Annuler
                      </button>
                    </div>
                    {revocation?.idAdressage === cible && revocation.erreur && (
                      <p role="alert" className="mt-2 text-sm text-status-danger">{revocation.erreur}</p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
      </ul>
    </section>
  );
}
