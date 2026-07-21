'use client';

import { useMemo, useState } from 'react';
import {
  assemblerDocument,
  avancerEtat,
  blocsPourDestinataire,
  contenuPourDestinataire,
  etatSuivant,
  type Bloc,
  type Destinataire,
  type DocumentComposite,
  type EtatDocument,
  type ModeleDocument,
  type SourceBloc,
  type TypeBloc,
} from '@/lib/documents';

// Vue de composition « deux colonnes » (C3 LOT-02) : à gauche les sources
// praticien, à droite l'aperçu tel que le destinataire le lira. La colonne de
// droite n'affiche JAMAIS le champ interne praticien pour un destinataire
// patient/médecin (field-filter du domaine). La machine d'états vit dans la
// session de composition (V1 sans persistance) ; « validé » ne s'atteint que par
// une action praticien explicite.

const SOURCE_LABELS: Record<SourceBloc, string> = {
  c1_snapshot: 'Snapshot (C1)',
  c1_review: 'Revue (C1)',
  c1_decision: 'Décision (C1)',
  c2_protocol: 'Protocole (C2)',
  c2_diffusion: 'Diffusion (C2)',
  c2_checkin: 'Check-in (C2)',
  c2_trajectoire: 'Trajectoire (C2B)',
  synthese_ia: 'Synthèse IA',
};

const TYPE_LABELS: Record<TypeBloc, string> = {
  donnee_declaree: 'Donnée déclarée',
  score_calcule: 'Score calculé',
  decision_validee: 'Décision validée',
  action_21j: 'Action 21 jours',
  narratif: 'Narratif',
  vigilance: 'Vigilance',
  note_praticien: 'Note du praticien',
};

const DESTINATAIRE_LABELS: Record<Destinataire, string> = {
  patient: 'Patient',
  medecin: 'Médecin traitant',
  praticien: 'Praticien',
};

const ETAT_LABELS: Record<EtatDocument, string> = {
  brouillon: 'Brouillon',
  relu: 'Relu',
  valide: 'Validé',
  envoye: 'Envoyé',
};

// Libellé de l'action qui fait ENTRER dans l'état cible. `brouillon` est l'état
// initial : aucune action n'y mène (jamais affiché), présent pour l'exhaustivité.
const ACTION_LABELS: Record<EtatDocument, string> = {
  brouillon: '',
  relu: 'Marquer comme relu',
  valide: 'Valider le document',
  envoye: 'Marquer comme envoyé',
};

const DESTINATAIRES: Destinataire[] = ['patient', 'medecin', 'praticien'];

export type DocumentComposerProps = {
  modele: ModeleDocument;
  blocs: Bloc[];
  destinataireInitial?: Destinataire;
};

export function DocumentComposer({ modele, blocs, destinataireInitial = 'patient' }: DocumentComposerProps) {
  const [document, setDocument] = useState<DocumentComposite>(() =>
    assemblerDocument({ modele, patientId: 'apercu', blocs }),
  );
  const [destinataire, setDestinataire] = useState<Destinataire>(destinataireInitial);
  const [erreur, setErreur] = useState<string | null>(null);

  const blocsVisibles = useMemo(
    () => blocsPourDestinataire(document.blocs, destinataire),
    [document.blocs, destinataire],
  );

  const prochainEtat = etatSuivant(document.etat);

  function onAvancer() {
    if (!prochainEtat) return;
    try {
      setDocument((prev) =>
        avancerEtat(prev, prochainEtat, { parActionPraticien: prochainEtat === 'valide' }),
      );
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Transition refusée.');
    }
  }

  return (
    <section aria-label="Composition du document" className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">{modele.titre}</h3>
        <span
          aria-label={`État : ${ETAT_LABELS[document.etat]}`}
          className="rounded-full border px-3 py-1 text-sm"
        >
          État : {ETAT_LABELS[document.etat]}
        </span>
      </header>

      <div role="group" aria-label="Destinataire de l’aperçu" className="flex flex-wrap gap-2">
        {DESTINATAIRES.map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={destinataire === d}
            onClick={() => setDestinataire(d)}
            className={`min-h-11 rounded-md border px-3 py-2 text-sm ${
              destinataire === d ? 'bg-foreground text-surface' : 'bg-surface'
            }`}
          >
            {DESTINATAIRE_LABELS[d]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div aria-label="Sources praticien" className="flex flex-col gap-3">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Sources praticien
          </h4>
          {document.blocs.map((bloc) => (
            <article key={bloc.id} className="rounded-md border p-3">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="font-medium">{TYPE_LABELS[bloc.type]}</span>
                <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {SOURCE_LABELS[bloc.provenance.source]} · {bloc.provenance.version}
                </span>
              </div>
              <p className="text-base text-foreground">{bloc.contenu.praticien}</p>
            </article>
          ))}
        </div>

        <div aria-label="Aperçu destinataire" className="flex flex-col gap-3">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Aperçu destinataire — {DESTINATAIRE_LABELS[destinataire]}
          </h4>
          {blocsVisibles.length === 0 ? (
            <p className="rounded-md border border-dashed p-3 text-base text-muted-foreground">
              Aucun contenu diffusé à ce destinataire.
            </p>
          ) : (
            blocsVisibles.map((bloc) => (
              <article key={bloc.id} className="rounded-md border p-3">
                <p className="text-base text-foreground">{contenuPourDestinataire(bloc, destinataire)}</p>
              </article>
            ))
          )}
        </div>
      </div>

      {erreur ? (
        <p role="alert" className="text-base text-status-danger">
          {erreur}
        </p>
      ) : null}

      <footer className="flex items-center gap-3">
        {prochainEtat ? (
          <button
            type="button"
            onClick={onAvancer}
            className="min-h-11 rounded-md bg-status-success px-4 py-2 text-sm font-medium text-white"
          >
            {ACTION_LABELS[prochainEtat]}
          </button>
        ) : (
          <span className="text-sm text-muted-foreground">Document envoyé — parcours terminé.</span>
        )}
      </footer>
    </section>
  );
}
