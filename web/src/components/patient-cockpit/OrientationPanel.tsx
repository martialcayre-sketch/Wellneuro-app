'use client';

import { useCallback, useEffect, useState } from 'react';
import type { OrientationApiResponse } from '@/app/api/praticien/orientation/route';
import type { RecommandationServie } from '@/lib/clinical/orientationService';
import { PACKS_REGISTRY, type PackId } from '@/lib/questionnaires-functional';
import { CATALOGUE_DEFINITIONS } from '@/lib/bibliotheque';
import { Badge } from '@/components/ui/Badge';

// Orientation NNPP2 — le premier consommateur de `/api/praticien/orientation`
// (LOT-06). LECTURE SEULE, à une exception près et strictement bornée : le
// bouton d'assignation, qui rejoue le geste manuel existant
// (`POST /api/praticien/packs/assign`). Rien n'est jamais assigné par
// l'affichage.
//
// Ce que ce panneau ne fait PAS, et qui est le cœur de la gouvernance : il ne
// calcule aucune recommandation, n'en réordonne aucune, n'en complète aucune.
// L'ordre servi par la route est déjà calculé et signifiant (priorité
// croissante, puis nombre de motifs, puis clé de cible) — le rendre dans un
// autre ordre détruirait une information. Le `sha256` affiché avec la liste est
// ce qui permet, six mois plus tard, de dire quelle table a produit quoi.

const LABEL_NIVEAU: Record<RecommandationServie['niveau'], string> = {
  socle: 'socle',
  approfondissement: 'approfondissement',
  specialise: 'spécialisé',
};

const TITRE_PACK: ReadonlyMap<PackId, string> = new Map(PACKS_REGISTRY.map(pack => [pack.id, pack.titre]));

function libelleCible(recommandation: RecommandationServie): string {
  if (recommandation.cible.type === 'pack') {
    return TITRE_PACK.get(recommandation.cible.packId) ?? recommandation.cible.packId;
  }
  const definition = CATALOGUE_DEFINITIONS[recommandation.cible.questionnaireId];
  return definition?.titre ?? recommandation.cible.questionnaireId;
}

function cleCible(recommandation: RecommandationServie): string {
  return recommandation.cible.type === 'pack'
    ? `pack:${recommandation.cible.packId}`
    : `questionnaire:${recommandation.cible.questionnaireId}`;
}

export function OrientationPanel({
  idPatient,
  emailPatient,
}: {
  idPatient: string;
  /**
   * Sans email, aucun bouton d'assignation n'est rendu.
   *
   * `POST /api/praticien/packs/assign` identifie le patient par son email, pas
   * par son identifiant — c'est le contrat existant, et ce lot ne le modifie
   * pas. Un appelant qui ne fournit pas l'email obtient donc un panneau de
   * lecture seule, jamais un bouton qui échouerait au clic.
   */
  emailPatient?: string;
}) {
  const [lecture, setLecture] = useState<'chargement' | 'chargee' | 'erreur'>('chargement');
  const [reponse, setReponse] = useState<OrientationApiResponse | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  // Assignation : la cible en cours de confirmation, puis l'issue affichée.
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [assignationEnCours, setAssignationEnCours] = useState<string | null>(null);
  const [issue, setIssue] = useState<{ cle: string; succes: boolean; message: string } | null>(null);
  // Cibles déjà assignées pendant cette session d'affichage. La route
  // d'assignation ne déduplique pas : un second clic créerait des assignations
  // en double ET un second e-mail au patient. Le double-temps protège du clic
  // accidentel, pas du clic répété — celui-ci s'en charge.
  const [assignees, setAssignees] = useState<ReadonlySet<string>>(new Set());

  const [rechargement, setRechargement] = useState(0);
  const relire = useCallback(() => setRechargement(n => n + 1), []);

  useEffect(() => {
    let annule = false;
    setLecture('chargement');
    setErreur(null);
    fetch(`/api/praticien/orientation?idPatient=${encodeURIComponent(idPatient)}`)
      .then(r => r.json())
      .then((payload: OrientationApiResponse) => {
        if (annule) return;
        // Une erreur de lecture n'est jamais rendue comme un état vide : les
        // deux disent des choses opposées au praticien. Une charge `ok: true`
        // malformée (`recommandations` absent) tombe ici plutôt que de jeter
        // pendant le rendu.
        if (!payload?.ok) {
          setReponse(null);
          setErreur(payload?.error ?? "L'orientation n'a pas pu être lue.");
          setLecture('erreur');
          return;
        }
        if (payload.actif === true && !Array.isArray(payload.recommandations)) {
          setReponse(null);
          setErreur("L'orientation n'a pas pu être lue (réponse inattendue).");
          setLecture('erreur');
          return;
        }
        setReponse(payload);
        setLecture('chargee');
      })
      .catch(() => {
        if (annule) return;
        setReponse(null);
        setErreur("L'orientation n'a pas pu être lue (erreur technique).");
        setLecture('erreur');
      });
    return () => {
      annule = true;
    };
  }, [idPatient, rechargement]);

  const assigner = useCallback(
    async (cle: string, idPack: string) => {
      if (!emailPatient) return;
      setAssignationEnCours(cle);
      setIssue(null);
      try {
        const reponseAssignation = await fetch('/api/praticien/packs/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idPack, emailPatient }),
        });
        const payload: { success?: boolean; count?: number; packNom?: string; error?: string } =
          await reponseAssignation.json();
        if (payload?.success) {
          setAssignees(precedent => new Set(precedent).add(cle));
          setIssue({
            cle,
            succes: true,
            message: `${payload.count ?? 0} questionnaire(s) du pack « ${payload.packNom ?? idPack} » assigné(s).`,
          });
        } else {
          setIssue({ cle, succes: false, message: payload?.error ?? "L'assignation a échoué." });
        }
      } catch {
        setIssue({ cle, succes: false, message: 'Erreur réseau. Réessayez.' });
      } finally {
        setAssignationEnCours(null);
        setConfirmation(null);
      }
    },
    [emailPatient],
  );

  return (
    <section aria-label="Orientation des explorations" className="rounded-xl border border-border bg-surface p-4">
      <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
        Orientation · explorations proposées
      </p>
      <h3 className="mt-1 font-display text-base font-bold tracking-[-0.02em] text-foreground">
        Explorations proposées par la table NNPP2
      </h3>

      {lecture === 'chargement' ? (
        <p role="status" className="mt-2 text-xs text-muted-foreground">
          Lecture de l’orientation...
        </p>
      ) : lecture === 'erreur' ? (
        <div role="alert" className="mt-2 rounded-lg bg-status-warning/10 p-3 text-xs text-status-warning">
          <p>{erreur}</p>
          <button
            type="button"
            onClick={relire}
            className="mt-2 rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground"
          >
            Réessayer
          </button>
        </div>
      ) : reponse?.ok && reponse.actif === false ? (
        // Verrou fermé : ce n'est ni une erreur ni un vide. Le message vient du
        // serveur — l'UI n'invente pas la raison pour laquelle la table se tait.
        <p className="mt-2 text-xs text-muted-foreground">{reponse.message}</p>
      ) : reponse?.ok && reponse.actif === true && reponse.recommandations.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Aucune exploration complémentaire n’est proposée par la table en vigueur pour ce patient.
        </p>
      ) : reponse?.ok && reponse.actif === true ? (
        <>
          <ol className="mt-3 space-y-3">
            {reponse.recommandations.map(recommandation => {
              const cle = cleCible(recommandation);
              const estPack = recommandation.cible.type === 'pack';
              const idPackBase = recommandation.idPackBase;
              // Trois conditions cumulatives, aucune supposée : une cible pack,
              // une correspondance en base, et un email pour l'appeler. Sinon
              // le bouton est absent — jamais présent et voué à l'échec.
              const assignable = estPack && Boolean(idPackBase) && Boolean(emailPatient);
              const issueCible = issue?.cle === cle ? issue : null;

              return (
                <li key={cle} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{libelleCible(recommandation)}</span>
                    <Badge variant="info">{estPack ? 'pack' : 'questionnaire'}</Badge>
                    <Badge>{LABEL_NIVEAU[recommandation.niveau]}</Badge>
                    {recommandation.dejaAssigne && <Badge variant="warning">déjà assigné</Badge>}
                    {recommandation.dejaRepondu === true && <Badge variant="success">déjà renseigné</Badge>}
                    {/* `null` = inconnu, et un fait inconnu ne doit pas se
                        présenter comme un fait négatif. */}
                    {recommandation.dejaRepondu === null && <Badge>couverture inconnue</Badge>}
                  </div>

                  {recommandation.objectifs.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Objectifs : {recommandation.objectifs.join(' · ')}
                    </p>
                  )}

                  <ul className="mt-2 space-y-1">
                    {recommandation.motifs.map(motif => (
                      <li key={motif.regleId} className="text-xs text-foreground">
                        <span className="text-muted-foreground">{motif.regleId} —</span>{' '}
                        {motif.conditions.join(' ; ')}
                        {motif.claims.length > 0 && (
                          <span className="text-muted-foreground">
                            {' '}
                            ({motif.claims.map(claim => claim.claimId).join(', ')})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>

                  {assignable && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {assignees.has(cle) ? (
                        <span className="text-xs text-status-success">
                          Pack assigné — le patient a reçu son e-mail.
                        </span>
                      ) : confirmation === cle ? (
                        <>
                          {/* Deux temps, délibérément : l'assignation envoie un
                              e-mail au patient. Un geste sortant ne se déclenche
                              pas sur un clic unique depuis un écran de lecture. */}
                          <span className="text-xs text-muted-foreground">
                            Assigner ce pack enverra un e-mail au patient.
                          </span>
                          <button
                            type="button"
                            disabled={assignationEnCours === cle}
                            onClick={() => assigner(cle, idPackBase as string)}
                            className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-60"
                          >
                            {assignationEnCours === cle ? 'Assignation...' : 'Confirmer l’assignation'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmation(null)}
                            className="rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground"
                          >
                            Annuler
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmation(cle)}
                          className="rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground"
                        >
                          Assigner ce pack
                        </button>
                      )}
                      {issueCible && (
                        <span
                          className={`text-xs ${issueCible.succes ? 'text-status-success' : 'text-status-danger'}`}
                        >
                          {issueCible.message}
                        </span>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-2xs text-muted-foreground">
            Table {reponse.version} · SHA-256 {reponse.sha256}. Aucune assignation n’est automatique : la
            proposition est une lecture, le geste reste praticien.
          </p>
        </>
      ) : null}
    </section>
  );
}
