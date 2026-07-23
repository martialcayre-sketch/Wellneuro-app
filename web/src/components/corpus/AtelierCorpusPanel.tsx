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
// Les trois gestes qui touchent une signature (valider, rejeter, effacer une
// signature) sont en deux temps : le premier clic arme, le second confirme. Un
// rejet exige EN PLUS un motif journalisé (la route decision le refuse sans —
// motif_requis) : l'armement du rejet ouvre le champ, la confirmation est
// bloquée tant qu'il est vide.
// Le texte d'un claim n'est jamais éditable ici : une correction passe par une
// nouvelle version ingérée.
//
// Deux voies de décision, jamais une validation en masse aveugle :
//  - « une par une » : arme/confirme claim par claim (défaut) ;
//  - « en lot » : le praticien MARQUE localement chaque claim (à valider / à
//    rejeter + motif), puis « Soumettre » les rejoue UN PAR UN sur la route
//    decision — une décision individuelle journalisée par claim, jamais un
//    lot transactionnel. Le marquage est le jugement ; seul « Soumettre »
//    touche le réseau. Aucun « tout marquer » : chaque marque est un clic.
//
// Deux gardes d'écran contre les courses :
//  - une seule décision en vol à la fois (verrou global : tout bouton d'action
//    est neutralisé pendant l'envoi, individuel comme en lot) ;
//  - chaque chargement porte un numéro de génération — une réponse arrivée
//    après un changement d'onglet ou de page est jetée, jamais affichée ; une
//    soumission en lot s'interrompt si la vue a changé sous elle.

type Compteurs = {
  enAttenteValidation: number;
  valide: number;
  rejete: number;
  empreintesDerivees: number;
  sourcesSupersedees: number;
};

/** Marque locale d'un claim en revue en lot — non encore soumise au serveur. */
type MarqueLot = { decision: 'VALIDE' | 'REJETE'; motif: string };

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

export function AtelierCorpusPanel({ notebook }: { notebook?: string } = {}) {
  const [statut, setStatut] = useState<ClaimStatut>('EN_ATTENTE_VALIDATION');
  const [offset, setOffset] = useState(0);
  const [claims, setClaims] = useState<ClaimEnRevue[]>([]);
  const [total, setTotal] = useState(0);
  const [compteurs, setCompteurs] = useState<Compteurs | null>(null);
  const [etat, setEtat] = useState<Etat>('chargement');
  const [erreur, setErreur] = useState('');
  /** Claim dont la décision est « armée » (1er clic) : le 2e clic confirme. */
  const [confirmationId, setConfirmationId] = useState<string | null>(null);
  /** Quelle décision est armée sur ce claim — distingue valider / rejeter / remise. */
  const [confirmationAction, setConfirmationAction] = useState<ClaimStatut | null>(null);
  /** Motif saisi pour un rejet individuel armé (obligatoire avant confirmation). */
  const [motifRejet, setMotifRejet] = useState('');
  /** Claim dont la décision est en cours d'envoi — verrou global d'action. */
  const [envoiId, setEnvoiId] = useState<string | null>(null);
  const [erreurDecision, setErreurDecision] = useState('');

  /** Revue en lot : marquage local puis soumission séquentielle. */
  const [modeLot, setModeLot] = useState(false);
  const [marques, setMarques] = useState<Map<string, MarqueLot>>(new Map());
  const [enCoursLot, setEnCoursLot] = useState(false);
  /** Résumé honnête après une soumission en lot (signés / échecs / interrompu). */
  const [resumeLot, setResumeLot] = useState('');

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

  const annulerArmement = useCallback(() => {
    setConfirmationId(null);
    setConfirmationAction(null);
    setMotifRejet('');
  }, []);

  const charger = useCallback(async (statutCourant: ClaimStatut, offsetCourant: number) => {
    const generation = ++generationRef.current;
    setEtat('chargement');
    setConfirmationId(null);
    setConfirmationAction(null);
    setMotifRejet('');
    setErreurDecision('');
    try {
      const filtreNotebook = notebook ? `&notebook=${encodeURIComponent(notebook)}` : '';
      const reponse = await fetch(
        `/api/praticien/corpus/claims?statut=${encodeURIComponent(statutCourant)}&limit=${LIMITE_PAGE}&offset=${offsetCourant}${filtreNotebook}`,
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
  }, [notebook]);

  useEffect(() => {
    vueRef.current = { statut, offset };
    // La vue change : les marques d'une page ne valent pas pour une autre.
    // Le résumé de lot, lui, SURVIT à la recharge automatique qui vide la file
    // (une page vidée fait reculer l'offset) — sinon le seul retour d'audit à
    // l'écran disparaîtrait pile quand tout a réussi. Il n'est effacé que par
    // une action explicite : changement d'onglet, bascule de mode, nouveau
    // marquage, ou nouveau run.
    setMarques(new Map());
    void charger(statut, offset);
  }, [charger, statut, offset]);

  const changerOnglet = (prochain: ClaimStatut) => {
    // Pas de changement d'onglet pendant une soumission en lot : la vue ne
    // doit pas bouger sous le runner (il s'interromprait par la garde de
    // génération, mais autant ne pas l'exposer).
    if (prochain === statut || enCoursLot) return;
    setResumeLot('');
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
    async (claim: ClaimEnRevue, decision: ClaimStatut, motif?: string) => {
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
          body: JSON.stringify({
            id: claim.id,
            decision,
            statutAttendu: claim.statut,
            // Le motif n'accompagne QUE le rejet — la route l'exige pour REJETE
            // et l'ignore ailleurs ; on n'alourdit pas les autres corps.
            ...(decision === 'REJETE' ? { motif: motif ?? '' } : {}),
          }),
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
        setConfirmationAction(null);
        setMotifRejet('');
      }
    },
    [charger],
  );

  // --- Revue en lot : marquage local, puis soumission séquentielle ---------

  const basculerMarque = useCallback((id: string, decision: 'VALIDE' | 'REJETE') => {
    setMarques((prev) => {
      const suivant = new Map(prev);
      const actuel = suivant.get(id);
      if (actuel && actuel.decision === decision) {
        suivant.delete(id); // re-clic sur la même marque : on démarque
      } else {
        suivant.set(id, { decision, motif: actuel?.motif ?? '' });
      }
      return suivant;
    });
    setResumeLot('');
  }, []);

  const definirMotifMarque = useCallback((id: string, motif: string) => {
    setMarques((prev) => {
      const actuel = prev.get(id);
      if (!actuel) return prev;
      const suivant = new Map(prev);
      suivant.set(id, { ...actuel, motif });
      return suivant;
    });
  }, []);

  /**
   * Soumet les marques UNE PAR UNE sur la route decision : une décision
   * individuelle journalisée par claim, jamais un lot transactionnel. Le
   * verrou global est pris une fois pour tout le run ; une seule recharge à la
   * fin (au lieu de N). Sur un état divergent, on ARRÊTE (la vue ment) et on
   * recharge. Le résumé ne dit « signé » que pour un `ok` du serveur.
   */
  const soumettreLot = useCallback(async () => {
    if (envoiRef.current) return;
    const cibles = claims.filter((claim) => marques.has(claim.id));
    if (cibles.length === 0) return;
    const motifManquant = cibles.some((claim) => {
      const marque = marques.get(claim.id);
      return marque?.decision === 'REJETE' && marque.motif.trim().length === 0;
    });
    if (motifManquant) return;

    envoiRef.current = true;
    setEnCoursLot(true);
    setErreurDecision('');
    setResumeLot('');
    const generation = generationRef.current;

    const signes: string[] = [];
    const echecs: string[] = [];
    let conflit = false;

    for (const claim of cibles) {
      if (generation !== generationRef.current) break; // la vue a changé sous le run
      const marque = marques.get(claim.id);
      if (!marque) continue;
      try {
        const reponse = await fetch('/api/praticien/corpus/claims/decision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: claim.id,
            decision: marque.decision,
            statutAttendu: claim.statut,
            ...(marque.decision === 'REJETE' ? { motif: marque.motif } : {}),
          }),
        });
        const payload = (await reponse.json()) as CorpusClaimDecisionApiResponse;
        if (reponse.ok && payload.ok) {
          signes.push(claim.id);
        } else if (!payload.ok && payload.reason === 'etat_divergent') {
          conflit = true;
          break; // vue périmée : on arrête et on rechargera
        } else {
          echecs.push(claim.claimId);
        }
      } catch {
        echecs.push(claim.claimId);
      }
    }

    // On retire les marques signées ; celles en échec ou non soumises restent
    // visibles après la recharge (les claims restent EN_ATTENTE).
    setMarques((prev) => {
      const suivant = new Map(prev);
      for (const id of signes) suivant.delete(id);
      return suivant;
    });

    const nonSoumis = cibles.length - signes.length - echecs.length - (conflit ? 1 : 0);
    const parts: string[] = [
      `${signes.length} décision${signes.length > 1 ? 's' : ''} enregistrée${signes.length > 1 ? 's' : ''}`,
    ];
    if (echecs.length > 0) parts.push(`${echecs.length} en échec (${echecs.join(', ')})`);
    if (conflit) parts.push('interrompu : un claim avait changé, file rechargée');
    if (nonSoumis > 0) parts.push(`${nonSoumis} non soumis`);
    setResumeLot(parts.join(' · '));

    envoiRef.current = false;
    setEnCoursLot(false);
    void charger(vueRef.current.statut, vueRef.current.offset);
  }, [claims, marques, charger]);

  // Groupement par source : la revue se fait document par document.
  const parSource = new Map<string, ClaimEnRevue[]>();
  for (const claim of claims) {
    const liste = parSource.get(claim.sourceId) ?? [];
    liste.push(claim);
    parSource.set(claim.sourceId, liste);
  }

  const enEnvoiGlobal = envoiId !== null || enCoursLot;
  const idOngletActif = `onglet-claims-${statut}`;

  const marquesArr = [...marques.values()];
  const aValider = marquesArr.filter((m) => m.decision === 'VALIDE').length;
  const aRejeter = marquesArr.filter((m) => m.decision === 'REJETE').length;
  const rejetSansMotif = marquesArr.some((m) => m.decision === 'REJETE' && m.motif.trim().length === 0);
  const nonJuges = Math.max(0, claims.length - marques.size);

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

        {/* Résumé d'une soumission en lot — rendu HORS du bloc « claims.length
            > 0 » pour rester lisible même quand le lot a vidé la file (le seul
            retour d'audit à l'écran ne doit pas disparaître sur succès). */}
        {resumeLot && (
          <p
            role="status"
            aria-live="polite"
            className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground"
          >
            {resumeLot}
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
            {statut === 'EN_ATTENTE_VALIDATION' && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  variant="outline"
                  aria-pressed={modeLot}
                  disabled={enEnvoiGlobal}
                  onClick={() => {
                    setModeLot((v) => !v);
                    setMarques(new Map());
                    setResumeLot('');
                    annulerArmement();
                  }}
                >
                  {modeLot ? 'Revue une par une' : 'Revue en lot'}
                </Button>
                {modeLot && (
                  <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
                    {aValider} à valider · {aRejeter} à rejeter · {nonJuges} non jugé
                    {nonJuges > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}

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
                  const armeeValider = confirmationId === claim.id && confirmationAction === 'VALIDE';
                  const armeeRejeter = confirmationId === claim.id && confirmationAction === 'REJETE';
                  const armeeRemise =
                    confirmationId === claim.id && confirmationAction === 'EN_ATTENTE_VALIDATION';
                  const marque = marques.get(claim.id);
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

                      {/* En attente, revue « une par une » : arme puis confirme. */}
                      {claim.statut === 'EN_ATTENTE_VALIDATION' && !modeLot && (
                        <div className="flex flex-wrap items-center gap-2">
                          {armeeValider ? (
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
                              <Button variant="outline" disabled={enEnvoiGlobal} onClick={annulerArmement}>
                                Annuler
                              </Button>
                            </>
                          ) : armeeRejeter ? (
                            <>
                              <span className="text-sm font-medium text-foreground">Motif du rejet</span>
                              <input
                                type="text"
                                aria-label={`Motif du rejet — ${claim.claimId}`}
                                autoFocus
                                maxLength={4000}
                                value={motifRejet}
                                disabled={enEnvoiGlobal}
                                onChange={(event) => setMotifRejet(event.target.value)}
                                placeholder="Motif du rejet (obligatoire)"
                                className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
                              />
                              <Button
                                variant="danger"
                                disabled={enEnvoiGlobal || motifRejet.trim().length === 0}
                                onClick={() => void decider(claim, 'REJETE', motifRejet)}
                              >
                                Confirmer le rejet
                              </Button>
                              <Button variant="outline" disabled={enEnvoiGlobal} onClick={annulerArmement}>
                                Annuler
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                disabled={enEnvoiGlobal}
                                onClick={() => {
                                  setConfirmationId(claim.id);
                                  setConfirmationAction('VALIDE');
                                }}
                              >
                                Valider
                              </Button>
                              <Button
                                variant="danger"
                                disabled={enEnvoiGlobal}
                                onClick={() => {
                                  setConfirmationId(claim.id);
                                  setConfirmationAction('REJETE');
                                  setMotifRejet('');
                                }}
                              >
                                Rejeter
                              </Button>
                            </>
                          )}
                        </div>
                      )}

                      {/* En attente, revue « en lot » : marquage local réversible. */}
                      {claim.statut === 'EN_ATTENTE_VALIDATION' && modeLot && (
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              variant={marque?.decision === 'VALIDE' ? 'primary' : 'outline'}
                              aria-pressed={marque?.decision === 'VALIDE'}
                              disabled={enCoursLot}
                              onClick={() => basculerMarque(claim.id, 'VALIDE')}
                            >
                              À valider
                            </Button>
                            <Button
                              variant={marque?.decision === 'REJETE' ? 'danger' : 'outline'}
                              aria-pressed={marque?.decision === 'REJETE'}
                              disabled={enCoursLot}
                              onClick={() => basculerMarque(claim.id, 'REJETE')}
                            >
                              À rejeter
                            </Button>
                          </div>
                          {marque?.decision === 'REJETE' && (
                            <input
                              type="text"
                              aria-label={`Motif du rejet — ${claim.claimId}`}
                              maxLength={4000}
                              value={marque.motif}
                              disabled={enCoursLot}
                              onChange={(event) => definirMotifMarque(claim.id, event.target.value)}
                              placeholder="Motif du rejet (obligatoire)"
                              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
                            />
                          )}
                        </div>
                      )}

                      {(claim.statut === 'VALIDE' || claim.statut === 'REJETE') && (
                        <div className="flex flex-wrap items-center gap-2">
                          {armeeRemise ? (
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
                              <Button variant="outline" disabled={enEnvoiGlobal} onClick={annulerArmement}>
                                Annuler
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              disabled={enEnvoiGlobal}
                              onClick={() => {
                                setConfirmationId(claim.id);
                                setConfirmationAction('EN_ATTENTE_VALIDATION');
                              }}
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

            {modeLot && statut === 'EN_ATTENTE_VALIDATION' && (
              <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 border-t border-border bg-surface/95 py-3 backdrop-blur">
                <Button
                  disabled={marques.size === 0 || rejetSansMotif || enCoursLot}
                  onClick={() => void soumettreLot()}
                >
                  {enCoursLot ? 'Envoi en cours…' : `Soumettre les décisions (${marques.size})`}
                </Button>
                {rejetSansMotif && (
                  <span className="text-sm text-status-warning">Un rejet marqué attend son motif.</span>
                )}
              </div>
            )}

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
