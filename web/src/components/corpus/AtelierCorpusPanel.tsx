'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { ClaimEnRevue, ClaimStatut } from '@/lib/rag/claims/revue';
import type { CorpusClaimsApiResponse } from '@/app/api/praticien/corpus/claims/route';
import type { CorpusClaimDecisionApiResponse } from '@/app/api/praticien/corpus/claims/decision/route';

// Atelier corpus v1 — poste de revue des claims (D-004). L'écran matérialise
// la signature D-003 : chaque claim est lu AVEC ses verbatims cités, puis
// validé, rejeté, ou — dans les onglets Validés/Rejetés — ramené en attente.
// Les deux gestes qui touchent une signature (la poser, l'effacer) sont en
// deux temps : le premier clic arme, le second confirme.
// Le texte d'un claim n'est jamais éditable ici : une correction passe par une
// nouvelle version ingérée.
//
// Deux gardes d'écran contre les courses :
//  - une seule décision en vol à la fois (verrou global : tout bouton d'action
//    est neutralisé pendant l'envoi) ;
//  - chaque chargement porte un numéro de génération — une réponse arrivée
//    après un changement d'onglet ou de page est jetée, jamais affichée.

type Compteurs = {
  enAttenteValidation: number;
  valide: number;
  rejete: number;
  empreintesDerivees: number;
  sourcesSupersedees: number;
};

const ONGLETS: { statut: ClaimStatut; libelle: string }[] = [
  { statut: 'EN_ATTENTE_VALIDATION', libelle: 'En attente' },
  { statut: 'VALIDE', libelle: 'Validés' },
  { statut: 'REJETE', libelle: 'Rejetés' },
];

/** Taille de page de la file — le serveur la borne à 100. */
const LIMITE_PAGE = 50;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

type Etat = 'chargement' | 'chargee' | 'erreur';

export function AtelierCorpusPanel() {
  const [statut, setStatut] = useState<ClaimStatut>('EN_ATTENTE_VALIDATION');
  const [offset, setOffset] = useState(0);
  const [claims, setClaims] = useState<ClaimEnRevue[]>([]);
  const [total, setTotal] = useState(0);
  const [compteurs, setCompteurs] = useState<Compteurs | null>(null);
  const [etat, setEtat] = useState<Etat>('chargement');
  const [erreur, setErreur] = useState('');
  /** Claim dont la décision est « armée » (1er clic) : le 2e clic confirme. */
  const [confirmationId, setConfirmationId] = useState<string | null>(null);
  /** Claim dont la décision est en cours d'envoi — verrou global d'action. */
  const [envoiId, setEnvoiId] = useState<string | null>(null);
  const [erreurDecision, setErreurDecision] = useState('');

  // Génération des chargements (réponses périmées jetées) ; vue courante lue
  // par `decider` pour recharger CE que l'écran affiche, pas la vue d'origine
  // de la décision ; verrou d'envoi lisible hors re-render.
  const generationRef = useRef(0);
  const vueRef = useRef<{ statut: ClaimStatut; offset: number }>({
    statut: 'EN_ATTENTE_VALIDATION',
    offset: 0,
  });
  const envoiRef = useRef(false);
  const refsOnglets = useRef<Array<HTMLButtonElement | null>>([]);

  const charger = useCallback(async (statutCourant: ClaimStatut, offsetCourant: number) => {
    const generation = ++generationRef.current;
    setEtat('chargement');
    setConfirmationId(null);
    setErreurDecision('');
    try {
      const reponse = await fetch(
        `/api/praticien/corpus/claims?statut=${encodeURIComponent(statutCourant)}&limit=${LIMITE_PAGE}&offset=${offsetCourant}`,
      );
      const payload = (await reponse.json()) as CorpusClaimsApiResponse;
      if (generation !== generationRef.current) return;
      if (!reponse.ok || !payload.ok) {
        setErreur(payload.ok ? 'La file de revue n’a pas pu être lue.' : payload.error);
        setEtat('erreur');
        return;
      }
      // Page devenue vide après des décisions (ou un offset périmé) : reculer
      // d'une page plutôt qu'afficher « 0 » sous un total non nul.
      if (payload.claims.length === 0 && payload.total > 0 && offsetCourant > 0) {
        setOffset(Math.max(0, offsetCourant - LIMITE_PAGE));
        return;
      }
      setClaims(payload.claims);
      setTotal(payload.total);
      setCompteurs(payload.compteurs);
      setEtat('chargee');
    } catch {
      if (generation !== generationRef.current) return;
      setErreur('La file de revue n’a pas pu être lue.');
      setEtat('erreur');
    }
  }, []);

  useEffect(() => {
    vueRef.current = { statut, offset };
    void charger(statut, offset);
  }, [charger, statut, offset]);

  const changerOnglet = (prochain: ClaimStatut) => {
    if (prochain === statut) return;
    setStatut(prochain);
    setOffset(0);
  };

  // Navigation clavier du tablist (tabindex roving, motif FichePatientPanel).
  const onClavierOnglets = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    const suivant =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? (index + 1) % ONGLETS.length
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? (index - 1 + ONGLETS.length) % ONGLETS.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? ONGLETS.length - 1
              : null;
    if (suivant === null) return;
    event.preventDefault();
    changerOnglet(ONGLETS[suivant].statut);
    refsOnglets.current[suivant]?.focus();
  };

  const decider = useCallback(
    async (claim: ClaimEnRevue, decision: ClaimStatut) => {
      // Une décision à la fois : le verrou par ref tient même si un re-render
      // n'a pas encore neutralisé les boutons.
      if (envoiRef.current) return;
      envoiRef.current = true;
      setEnvoiId(claim.id);
      setErreurDecision('');
      try {
        const reponse = await fetch('/api/praticien/corpus/claims/decision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: claim.id, decision, statutAttendu: claim.statut }),
        });
        const payload = (await reponse.json()) as CorpusClaimDecisionApiResponse;
        if (!reponse.ok || !payload.ok) {
          setErreurDecision(
            payload.ok ? 'La décision n’a pas pu être enregistrée.' : payload.error,
          );
          // État divergent : la liste affichée ment — on recharge pour remettre
          // l'écran d'accord avec la base avant toute nouvelle décision.
          if (!payload.ok && payload.reason === 'etat_divergent') {
            void charger(vueRef.current.statut, vueRef.current.offset);
          }
          return;
        }
        // Recharge de la vue COURANTE (l'onglet a pu changer pendant l'envoi).
        void charger(vueRef.current.statut, vueRef.current.offset);
      } catch {
        setErreurDecision('La décision n’a pas pu être enregistrée.');
      } finally {
        envoiRef.current = false;
        setEnvoiId(null);
        setConfirmationId(null);
      }
    },
    [charger],
  );

  // Groupement par source : la revue se fait document par document.
  const parSource = new Map<string, ClaimEnRevue[]>();
  for (const claim of claims) {
    const liste = parSource.get(claim.sourceId) ?? [];
    liste.push(claim);
    parSource.set(claim.sourceId, liste);
  }

  const enEnvoiGlobal = envoiId !== null;
  const idOngletActif = `onglet-claims-${statut}`;

  return (
    <div className="flex flex-col gap-5">
      {compteurs && (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
            <dt className="text-xs font-medium text-muted-foreground">En attente</dt>
            <dd className="mt-1 font-display text-2xl font-bold text-foreground">
              {compteurs.enAttenteValidation}
            </dd>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
            <dt className="text-xs font-medium text-muted-foreground">Validés</dt>
            <dd className="mt-1 font-display text-2xl font-bold text-status-success">
              {compteurs.valide}
            </dd>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
            <dt className="text-xs font-medium text-muted-foreground">Rejetés</dt>
            <dd className="mt-1 font-display text-2xl font-bold text-muted-foreground">
              {compteurs.rejete}
            </dd>
          </div>
          {/* Deux natures de dérive, jamais additionnées : l'anomalie
              d'intégrité (verbatim modifié sous un lien — ne devrait jamais
              arriver) et la supersession normale (version plus récente). */}
          <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
            <dt className="text-xs font-medium text-muted-foreground">Verbatims modifiés</dt>
            <dd
              className={`mt-1 font-display text-2xl font-bold ${
                compteurs.empreintesDerivees > 0 ? 'text-status-danger' : 'text-foreground'
              }`}
            >
              {compteurs.empreintesDerivees}
            </dd>
            <p className="mt-1 text-xs text-muted-foreground">
              {compteurs.sourcesSupersedees} version{compteurs.sourcesSupersedees > 1 ? 's' : ''}{' '}
              supersédée{compteurs.sourcesSupersedees > 1 ? 's' : ''}
            </p>
          </div>
        </dl>
      )}

      <div role="tablist" aria-label="Statut des claims" className="flex gap-2">
        {ONGLETS.map((onglet, index) => {
          const actif = onglet.statut === statut;
          return (
            <button
              key={onglet.statut}
              ref={(element) => {
                refsOnglets.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`onglet-claims-${onglet.statut}`}
              aria-selected={actif}
              aria-controls="panneau-claims"
              tabIndex={actif ? 0 : -1}
              onClick={() => changerOnglet(onglet.statut)}
              onKeyDown={(event) => onClavierOnglets(event, index)}
              className={`min-h-9 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
                actif
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {onglet.libelle}
            </button>
          );
        })}
      </div>

      <div id="panneau-claims" role="tabpanel" aria-labelledby={idOngletActif} className="flex flex-col gap-5">
        {erreurDecision && (
          <p role="alert" className="rounded-lg border border-accent bg-status-warning/10 px-3 py-2 text-sm text-status-warning">
            {erreurDecision}
          </p>
        )}

        {etat === 'chargement' && (
          <div role="status" className="rounded-xl border border-border bg-surface p-4 text-base text-muted-foreground shadow-card">
            Lecture de la file de revue&hellip;
          </div>
        )}

        {etat === 'erreur' && (
          <div role="alert" className="flex flex-col gap-3 rounded-xl border border-accent bg-status-warning/10 p-4 text-base text-status-warning">
            <span>{erreur}</span>
            <Button variant="outline" className="self-start" onClick={() => void charger(statut, offset)}>
              Réessayer
            </Button>
          </div>
        )}

        {etat === 'chargee' && claims.length === 0 && (
          <div className="rounded-xl border border-border bg-surface p-5 text-base text-muted-foreground shadow-card">
            {statut === 'EN_ATTENTE_VALIDATION'
              ? 'Aucun claim en attente de validation. La file se remplit à l’ingestion d’un lot rédigé.'
              : 'Aucun claim dans cet état.'}
          </div>
        )}

        {etat === 'chargee' && claims.length > 0 && (
          <div className="flex flex-col gap-6">
            <p className="text-sm text-muted-foreground">
              {claims.length === total
                ? `${total} claim${total > 1 ? 's' : ''}`
                : `${claims.length} claim${claims.length > 1 ? 's' : ''} affiché${claims.length > 1 ? 's' : ''} sur ${total}`}{' '}
              — groupés par source, décision claim par claim.
            </p>
            {[...parSource.entries()].map(([sourceId, claimsSource]) => (
              <section key={sourceId} aria-label={`Source ${sourceId}`} className="flex flex-col gap-3">
                <h3 className="font-display text-lg font-semibold text-foreground">{sourceId}</h3>
                {claimsSource.map((claim) => {
                  const armee = confirmationId === claim.id;
                  return (
                    <article
                      key={claim.id}
                      className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-card"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          {claim.claimId} · {claim.versionClaim}
                        </span>
                        <Badge variant="info">{claim.typologieLecture}</Badge>
                        {claim.prescriptif && <Badge variant="warning">prescriptif</Badge>}
                        {claim.niveauPreuve && <Badge variant="neutral">preuve {claim.niveauPreuve}</Badge>}
                        {claim.classeAutorite && <Badge variant="neutral">{claim.classeAutorite}</Badge>}
                      </div>

                      <p className="text-base text-foreground">{claim.texteNormalise}</p>

                      <div className="flex flex-col gap-2">
                        {claim.sources.map((source) => (
                          <details
                            key={`${source.chunkId}@${source.versionChunk}`}
                            className="rounded-lg border border-border bg-muted/40 px-3 py-2"
                          >
                            <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                              Verbatim {source.chunkId} · {source.versionChunk} — {source.section}
                              {source.shaDerive && (
                                <span className="ml-2 inline-flex"><Badge variant="danger">verbatim modifié</Badge></span>
                              )}
                              {source.supersedee && (
                                <span className="ml-2 inline-flex"><Badge variant="warning">version supersédée</Badge></span>
                              )}
                            </summary>
                            <blockquote className="mt-2 whitespace-pre-wrap border-l-2 border-border pl-3 text-sm text-muted-foreground">
                              {source.extrait}
                              {source.tronque && '…'}
                            </blockquote>
                          </details>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>Rédigé le {formatDate(claim.createdAt)}</span>
                        {claim.modeleReviseur && <span>· réviseur {claim.modeleReviseur}</span>}
                        {claim.statut === 'VALIDE' && claim.validateur && claim.valideAt && (
                          <span>
                            · validé par {claim.validateur} le {formatDate(claim.valideAt)}
                          </span>
                        )}
                        {claim.statut === 'REJETE' && claim.validateur && (
                          <span>· rejeté par {claim.validateur}</span>
                        )}
                      </div>

                      {claim.statut === 'EN_ATTENTE_VALIDATION' && (
                        <div className="flex flex-wrap items-center gap-2">
                          {armee ? (
                            <>
                              <span className="text-sm font-medium text-foreground">
                                Signer la validation de ce claim ?
                              </span>
                              <Button
                                disabled={enEnvoiGlobal}
                                onClick={() => void decider(claim, 'VALIDE')}
                              >
                                Confirmer la validation
                              </Button>
                              <Button
                                variant="outline"
                                disabled={enEnvoiGlobal}
                                onClick={() => setConfirmationId(null)}
                              >
                                Annuler
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button disabled={enEnvoiGlobal} onClick={() => setConfirmationId(claim.id)}>
                                Valider
                              </Button>
                              <Button
                                variant="danger"
                                disabled={enEnvoiGlobal}
                                onClick={() => void decider(claim, 'REJETE')}
                              >
                                Rejeter
                              </Button>
                            </>
                          )}
                        </div>
                      )}

                      {(claim.statut === 'VALIDE' || claim.statut === 'REJETE') && (
                        <div className="flex flex-wrap items-center gap-2">
                          {armee ? (
                            <>
                              <span className="text-sm font-medium text-foreground">
                                {claim.statut === 'VALIDE'
                                  ? 'Effacer la signature et remettre ce claim en attente ?'
                                  : 'Remettre ce claim en attente ?'}
                              </span>
                              <Button
                                variant="danger"
                                disabled={enEnvoiGlobal}
                                onClick={() => void decider(claim, 'EN_ATTENTE_VALIDATION')}
                              >
                                Confirmer la remise en attente
                              </Button>
                              <Button
                                variant="outline"
                                disabled={enEnvoiGlobal}
                                onClick={() => setConfirmationId(null)}
                              >
                                Annuler
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              disabled={enEnvoiGlobal}
                              onClick={() => setConfirmationId(claim.id)}
                            >
                              Remettre en attente
                            </Button>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </section>
            ))}

            {total > LIMITE_PAGE && (
              <nav aria-label="Pagination de la file" className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  disabled={offset === 0 || enEnvoiGlobal}
                  onClick={() => setOffset(Math.max(0, offset - LIMITE_PAGE))}
                >
                  Précédent
                </Button>
                <span className="text-sm text-muted-foreground">
                  Claims {offset + 1}–{offset + claims.length} sur {total}
                </span>
                <Button
                  variant="outline"
                  disabled={offset + LIMITE_PAGE >= total || enEnvoiGlobal}
                  onClick={() => setOffset(offset + LIMITE_PAGE)}
                >
                  Suivant
                </Button>
              </nav>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
