'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  AncrageAnamnese,
  ObjectifExpose,
  ObjectifsApiResponse,
  TrajectoireObjectif,
} from '@/app/api/praticien/objectifs/route';
import {
  LONGUEUR_MAX_ENONCE,
  LONGUEUR_MAX_MOTIF,
  LONGUEUR_MAX_PRIORITE,
  LONGUEUR_MAX_REFORMULATION,
  type EtatRatification,
} from '@/lib/praticien/objectifNegocie';

// L'objectif négocié (Alliance 6.0-A, LOT-02) — surface praticien, phase
// « Compréhension » du poste de pilotage.
//
// Le panneau est AUTONOME : il ne reçoit que l'identifiant du dossier et lit
// tout ce dont il a besoin. Il vit donc hors du runtime clinique, et c'est
// délibéré — un objectif se négocie AVANT qu'un épisode soit confirmé, pas
// après. Le banc de rendu de `FichePatientPanel` le vérifie sans épisode.
//
// Le refus qui fait foi (dossier clos, bornes, appariement du « non traité »)
// est celui de la ROUTE (#181) : ce que l'écran empêche est une courtoisie, et
// le message du serveur est affiché tel quel s'il survient.

type EtatDossier = 'chargement' | 'chargee' | 'erreur';
type EtatEnvoi = 'repos' | 'envoi' | 'erreur';

const ANCRAGE_VIDE: AncrageAnamnese = {
  consultationValidee: false,
  motifPrincipal: null,
  objectifPrioritaire: null,
  attentes: [],
};

const LIBELLE_RATIFICATION: Record<EtatRatification, string> = {
  // JAMAIS « non ratifié » : le geste de ratification n'existe pas avant le
  // LOT-06, et un « non ratifié » porterait sur le patient un jugement qu'il
  // n'a pas eu l'occasion de démentir (`DC-24` — une absence n'est pas un
  // refus).
  en_attente: 'Pas encore proposé au patient',
  ratifie: 'Ratifié par le patient',
  conteste: 'Contesté par le patient',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Une ligne d'objectif, telle qu'elle se lit — version courante ou antérieure. */
function LigneObjectif({ ligne }: { ligne: ObjectifExpose }) {
  return (
    <div className="text-base text-foreground">
      <p className="whitespace-pre-wrap">« {ligne.enoncePatient} »</p>
      {ligne.reformulationPraticien && (
        <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
          Reformulation : {ligne.reformulationPraticien}
        </p>
      )}
      {ligne.priorite && <p className="mt-1 text-sm text-muted-foreground">Priorité : {ligne.priorite}</p>}
      {ligne.nonTraiteMotif && ligne.nonTraiteDepuisLe && (
        <p className="mt-1 text-sm text-muted-foreground">
          Non traité pour l’instant depuis le {formatDate(ligne.nonTraiteDepuisLe)} — {ligne.nonTraiteMotif}
        </p>
      )}
      <p className="mt-1 text-xs text-muted-foreground">
        Enregistré le {formatDate(ligne.creeLe)}
        {ligne.negocieLe ? ` · négocié le ${formatDate(ligne.negocieLe)}` : ''}
      </p>
    </div>
  );
}

/**
 * Compteur de longueur. Il REMPLACE `maxLength`, il ne le double pas : un
 * attribut `maxLength` coupe un collage trop long sans le dire, ce qui est la
 * troncature même que ce lot refuse côté serveur. Ici le dépassement est
 * visible, la saisie reste intacte, et c'est la route qui tranche (400).
 */
function Compteur({ valeur, maximum }: { valeur: string; maximum: number }) {
  const depasse = valeur.length > maximum;
  return (
    <p
      className={`mt-1 text-xs ${depasse ? 'text-status-warning' : 'text-muted-foreground'}`}
      aria-live="polite"
    >
      {valeur.length.toLocaleString('fr-FR')} / {maximum.toLocaleString('fr-FR')} caractères
      {depasse ? ' — trop long, l’enregistrement sera refusé.' : ''}
    </p>
  );
}

export function ObjectifNegociePanel({ idPatient }: { idPatient: string }) {
  const [etat, setEtat] = useState<EtatDossier>('chargement');
  const [erreur, setErreur] = useState('');
  const [objectifs, setObjectifs] = useState<ObjectifExpose[]>([]);
  const [trajectoires, setTrajectoires] = useState<TrajectoireObjectif[]>([]);
  const [ancrage, setAncrage] = useState<AncrageAnamnese>(ANCRAGE_VIDE);
  const [ratifications, setRatifications] = useState<Record<string, EtatRatification>>({});

  const [reformuleId, setReformuleId] = useState<string | null>(null);
  const [enonce, setEnonce] = useState('');
  const [reformulation, setReformulation] = useState('');
  const [priorite, setPriorite] = useState('');
  const [negocieLe, setNegocieLe] = useState('');
  const [nonTraiteMotif, setNonTraiteMotif] = useState('');
  const [nonTraiteDepuisLe, setNonTraiteDepuisLe] = useState('');
  const [etatEnvoi, setEtatEnvoi] = useState<EtatEnvoi>('repos');
  const [erreurEnvoi, setErreurEnvoi] = useState('');

  // DÉPENDANCE STABLE. `chargerDossier` ne dépend que de `idPatient` ; un
  // littéral recréé au rendu ferait retirer le GET en boucle, et ce GET
  // JOURNALISE l'accès au dossier (G-TRUST-04) — le journal se remplirait de
  // lignes que personne n'a demandées (cicatrice `ClinicalRuntimeSection.tsx:80-81`).
  const chargerDossier = useCallback(async () => {
    setEtat('chargement');
    setErreur('');
    try {
      const reponse = await fetch(`/api/praticien/objectifs?idPatient=${encodeURIComponent(idPatient)}`);
      const payload = (await reponse.json()) as ObjectifsApiResponse;
      if (!reponse.ok || !payload.ok || !('objectifs' in payload)) {
        setErreur(
          ('error' in payload && payload.error) || 'Les objectifs n’ont pas pu être chargés.',
        );
        setEtat('erreur');
        return;
      }
      setObjectifs(payload.objectifs);
      setTrajectoires(payload.trajectoires);
      setAncrage(payload.ancrage);
      setRatifications(payload.ratifications);
      setEtat('chargee');
    } catch {
      setErreur('Les objectifs n’ont pas pu être chargés.');
      setEtat('erreur');
    }
  }, [idPatient]);

  useEffect(() => {
    void chargerDossier();
  }, [chargerDossier]);

  const enregistrer = useCallback(async () => {
    if (!reformuleId && enonce.trim().length === 0) return;
    setEtatEnvoi('envoi');
    setErreurEnvoi('');
    try {
      const charge: Record<string, string | null> = {
        idPatient,
        reformulationPraticien: reformulation,
        priorite,
        negocieLe: negocieLe || '',
        nonTraiteMotif,
        nonTraiteDepuisLe: nonTraiteDepuisLe || '',
        supersedesObjectifId: reformuleId,
      };
      // Pour une révision, l'énoncé n'est PAS transmis : le serveur le recopie
      // depuis la version visée. L'écran ne peut donc pas, même par erreur,
      // réécrire les mots du patient.
      if (!reformuleId) charge.enoncePatient = enonce;

      const reponse = await fetch('/api/praticien/objectifs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(charge),
      });
      const payload = (await reponse.json()) as { ok: boolean; error?: string };
      if (!reponse.ok || !payload.ok) {
        setErreurEnvoi(payload.error ?? 'L’objectif n’a pas pu être enregistré.');
        setEtatEnvoi('erreur');
        return;
      }
      setEnonce('');
      setReformulation('');
      setPriorite('');
      setNegocieLe('');
      setNonTraiteMotif('');
      setNonTraiteDepuisLe('');
      setReformuleId(null);
      setEtatEnvoi('repos');
      await chargerDossier();
    } catch {
      setErreurEnvoi('L’objectif n’a pas pu être enregistré.');
      setEtatEnvoi('erreur');
    }
  }, [
    idPatient,
    reformuleId,
    enonce,
    reformulation,
    priorite,
    negocieLe,
    nonTraiteMotif,
    nonTraiteDepuisLe,
    chargerDossier,
  ]);

  return (
    <section aria-labelledby="objectif-negocie" className="rounded-xl border border-border bg-surface p-4">
      <h3 id="objectif-negocie" className="text-sm font-semibold text-foreground">
        Objectif négocié
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Ce que le patient demande, dans ses mots, et ce que vous en avez compris. Chaque révision s’ajoute :
        rien n’est écrasé, rien n’est supprimé.
      </p>

      {etat === 'chargement' && (
        <p role="status" className="mt-3 text-base text-muted-foreground">
          Chargement des objectifs&hellip;
        </p>
      )}

      {etat === 'erreur' && (
        // ABSENCE N° 3 — une erreur de lecture n'est JAMAIS présentée comme
        // « aucun objectif » : ce serait une affirmation fausse sur le dossier,
        // et elle ferait recommencer une négociation déjà posée.
        <div
          role="alert"
          className="mt-3 flex flex-col gap-3 rounded-lg border border-accent bg-status-warning/10 p-3 text-base text-status-warning"
        >
          <span>{erreur} Ce n’est pas une absence d’objectif : la lecture a échoué.</span>
          <button
            type="button"
            onClick={() => void chargerDossier()}
            className="min-h-9 self-start rounded-lg border border-accent px-3 py-1 text-xs font-medium text-solar-ink hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            Réessayer
          </button>
        </div>
      )}

      {etat === 'chargee' && (
        <div className="mt-3 flex flex-col gap-4">
          {/* MATÉRIAU D'ANCRAGE — À CÔTÉ DE LA SAISIE, JAMAIS DEDANS.
              Pré-remplir l'énoncé avec une phrase d'anamnèse attribuerait
              durablement au patient, comme objectif négocié, quelque chose
              qu'il a dit dans un autre contexte et à une autre question. Le
              praticien le lit, le reprend s'il le veut, mais c'est un geste,
              pas un défaut. */}
          <aside
            aria-label="Matériau d’anamnèse"
            className="rounded-lg border border-border bg-surface p-3"
          >
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Ce que le patient a écrit à l’anamnèse
            </h4>
            {!ancrage.consultationValidee ? (
              // ABSENCE N° 1 — il n'y a pas de consultation validée : il n'y a
              // donc pas de matériau, ce qui ne se dit pas comme « champ vide ».
              <p className="mt-2 text-base text-muted-foreground">
                Aucune consultation validée dans ce dossier : l’anamnèse n’a pas encore de matériau à reprendre.
              </p>
            ) : (
              <dl className="mt-2 flex flex-col gap-2">
                <div>
                  <dt className="text-sm text-muted-foreground">Motif principal</dt>
                  {/* ABSENCE N° 2 — la consultation existe, le champ est vide. */}
                  <dd className="text-base text-foreground">
                    {ancrage.motifPrincipal ?? 'Non renseigné à l’anamnèse.'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Objectif prioritaire déclaré</dt>
                  <dd className="text-base text-foreground">
                    {ancrage.objectifPrioritaire ?? 'Non renseigné à l’anamnèse.'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Attentes principales</dt>
                  <dd className="text-base text-foreground">
                    {ancrage.attentes.length > 0
                      ? ancrage.attentes.join(', ')
                      : 'Non renseignées à l’anamnèse.'}
                  </dd>
                </div>
              </dl>
            )}
            <p className="mt-2 text-sm text-muted-foreground">
              Déclarations recueillies à l’anamnèse, dans un autre contexte que cet entretien : matériau de
              départ, jamais un objectif négocié. Rien n’est recopié automatiquement dans la saisie.
            </p>
          </aside>

          {objectifs.length === 0 && (
            <p className="text-base text-muted-foreground">Aucun objectif négocié pour ce dossier.</p>
          )}

          {objectifs.length > 1 && (
            // On n'en garde PAS un seul : deux reformulations concurrentes ont
            // créé deux versions courantes, et départager en silence ferait
            // disparaître le travail de l'une des deux (`DC-30`).
            <p role="status" className="text-sm text-status-warning">
              {objectifs.length} versions courantes coexistent pour ce dossier — deux reformulations ont été
              enregistrées en parallèle. Elles sont toutes affichées ; aucune n’est écartée.
            </p>
          )}

          {trajectoires.map((trajectoire) => {
            const [courante, ...anterieures] = trajectoire.lignes;
            if (!courante) return null;
            return (
              <article
                key={trajectoire.idObjectif}
                className="rounded-lg border border-border bg-surface p-3"
              >
                <p className="text-xs font-medium text-muted-foreground">
                  Version courante · {LIBELLE_RATIFICATION[ratifications[trajectoire.idObjectif] ?? 'en_attente']}
                </p>
                <div className="mt-1">
                  <LigneObjectif ligne={courante} />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setReformuleId(trajectoire.idObjectif);
                    // Les champs PRATICIEN de la version révisée sont repris :
                    // sans cela, ne toucher qu'à la reformulation ferait
                    // retomber `priorite` et « non traité » à vide sur la
                    // nouvelle tête — la version courante perdrait en silence
                    // ce qu'elle portait. L'ÉNONCÉ DU PATIENT, lui, n'est pas
                    // repris ici : il est recopié côté serveur depuis la ligne
                    // visée, jamais réécrit depuis l'écran.
                    setReformulation(courante.reformulationPraticien ?? '');
                    setPriorite(courante.priorite ?? '');
                    setNonTraiteMotif(courante.nonTraiteMotif ?? '');
                    setNonTraiteDepuisLe(
                      courante.nonTraiteDepuisLe ? courante.nonTraiteDepuisLe.slice(0, 10) : '',
                    );
                  }}
                  className="mt-2 min-h-9 rounded-lg border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  Reformuler cette version
                </button>

                {anterieures.length > 0 && (
                  <div className="mt-3 border-t border-border pt-2">
                    <h5 className="text-xs font-medium text-muted-foreground">
                      Versions antérieures ({anterieures.length})
                    </h5>
                    <ol className="mt-2 flex flex-col gap-3">
                      {anterieures.map((ligne) => (
                        <li key={ligne.id} className="opacity-80">
                          <LigneObjectif ligne={ligne} />
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </article>
            );
          })}

          <div className="border-t border-border pt-3">
            <h4 className="text-sm font-semibold text-foreground">
              {reformuleId ? 'Reformuler l’objectif' : 'Poser un objectif négocié'}
            </h4>

            {reformuleId ? (
              <p className="mt-2 text-sm text-muted-foreground">
                L’énoncé du patient est repris tel quel de la version précédente : il ne se réécrit pas.{' '}
                <button
                  type="button"
                  onClick={() => setReformuleId(null)}
                  className="underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  Poser un nouvel objectif à la place
                </button>
              </p>
            ) : (
              <>
                <label htmlFor="objectif-enonce" className="mt-2 block text-xs font-medium text-foreground">
                  Ce que le patient demande, dans ses mots
                </label>
                <textarea
                  id="objectif-enonce"
                  value={enonce}
                  onChange={(evenement) => setEnonce(evenement.target.value)}
                  rows={3}
                  placeholder="« Je voudrais dormir sans me réveiller à trois heures. »"
                  className="mt-1 w-full rounded-lg border border-border bg-surface p-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                />
                <Compteur valeur={enonce} maximum={LONGUEUR_MAX_ENONCE} />
              </>
            )}

            <label htmlFor="objectif-reformulation" className="mt-3 block text-xs font-medium text-foreground">
              Votre reformulation (facultative)
            </label>
            <textarea
              id="objectif-reformulation"
              value={reformulation}
              onChange={(evenement) => setReformulation(evenement.target.value)}
              rows={3}
              placeholder="Ce que vous avez compris de la demande…"
              className="mt-1 w-full rounded-lg border border-border bg-surface p-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            />
            <Compteur valeur={reformulation} maximum={LONGUEUR_MAX_REFORMULATION} />

            {/* CHAMP TEXTE LIBRE, jamais une liste déroulante ni un badge
                ordonné : une liste fermée serait un rang, et un rang serait un
                score (`schema.prisma:1955-1957`). */}
            <label htmlFor="objectif-priorite" className="mt-3 block text-xs font-medium text-foreground">
              Priorité (libellé libre)
            </label>
            <input
              id="objectif-priorite"
              type="text"
              value={priorite}
              onChange={(evenement) => setPriorite(evenement.target.value)}
              placeholder="Ce sur quoi on travaille d’abord…"
              className="mt-1 w-full rounded-lg border border-border bg-surface p-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            />
            <Compteur valeur={priorite} maximum={LONGUEUR_MAX_PRIORITE} />

            <label htmlFor="objectif-negocie-le" className="mt-3 block text-xs font-medium text-foreground">
              Date de l’accord (facultative)
            </label>
            <input
              id="objectif-negocie-le"
              type="date"
              value={negocieLe}
              onChange={(evenement) => setNegocieLe(evenement.target.value)}
              className="mt-1 rounded-lg border border-border bg-surface p-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            />

            <fieldset className="mt-3 rounded-lg border border-border p-3">
              <legend className="px-1 text-xs font-medium text-foreground">
                Non traité pour l’instant (motif et date vont ensemble)
              </legend>

              <label htmlFor="objectif-non-traite-motif" className="mt-1 block text-xs font-medium text-foreground">
                Ce qui n’est pas traité, et pourquoi
              </label>
              <textarea
                id="objectif-non-traite-motif"
                value={nonTraiteMotif}
                onChange={(evenement) => setNonTraiteMotif(evenement.target.value)}
                rows={2}
                placeholder="Ce qui est assumé de côté pour le moment…"
                className="mt-1 w-full rounded-lg border border-border bg-surface p-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              />
              <Compteur valeur={nonTraiteMotif} maximum={LONGUEUR_MAX_MOTIF} />

              <label htmlFor="objectif-non-traite-depuis" className="mt-2 block text-xs font-medium text-foreground">
                Depuis le
              </label>
              <input
                id="objectif-non-traite-depuis"
                type="date"
                value={nonTraiteDepuisLe}
                onChange={(evenement) => setNonTraiteDepuisLe(evenement.target.value)}
                className="mt-1 rounded-lg border border-border bg-surface p-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              />
            </fieldset>

            {etatEnvoi === 'erreur' && (
              <p role="alert" className="mt-2 text-base text-foreground">
                {erreurEnvoi}
              </p>
            )}

            {/* La date d'enregistrement est posée par la BASE : aucun champ de
                date d'écriture n'existe ici, et c'est délibéré. */}
            <button
              type="button"
              onClick={() => void enregistrer()}
              disabled={(!reformuleId && enonce.trim().length === 0) || etatEnvoi === 'envoi'}
              className="mt-3 min-h-11 rounded-lg border border-primary bg-primary/10 px-3 py-1 text-sm font-medium text-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              {etatEnvoi === 'envoi'
                ? 'Enregistrement…'
                : reformuleId
                  ? 'Enregistrer la reformulation'
                  : 'Enregistrer l’objectif'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
