'use client';

// Validation « pour diffusion » d'une version relue (C2A LOT-03 Part B). La
// validation est persistée et ancrée sur la version : elle devient caduque dès
// qu'une nouvelle version est enregistrée. Elle ne déclenche AUCUN envoi patient
// (« Non transmis » reste affiché) — la transmission relève d'un lot ultérieur.

import type { ApercuPatientServi } from '@/lib/clinical-engine/contenuPatientProtocole';
import { ApercuPatientProtocole } from './ApercuPatientProtocole';

export type DiffusionState = 'idle' | 'saving' | 'error';

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

export function ProtocolDiffusionPanel({
  canApprove,
  approved,
  stale,
  approvedAt,
  servieAuPatient = null,
  apercu = null,
  state = 'idle',
  error = null,
  onApprove,
}: {
  // Une version relue existe et peut être validée pour diffusion.
  canApprove: boolean;
  // Une approbation active existe.
  approved: boolean;
  // L'approbation active n'ancre plus la version active (une nouvelle version a
  // été enregistrée depuis).
  stale: boolean;
  approvedAt: string | null;
  /**
   * Le protocole approuvé est-il RÉELLEMENT servi au patient aujourd'hui ?
   *
   * `null` = rien de diffusé, ou constat non lu — on n'affirme alors rien.
   * `false` = une validation existe et l'écran du patient est vide : la carte de
   * décision a été recomposée au serveur et son empreinte n'est plus celle qui a
   * été approuvée ([[D-191]]). Distinct de `stale`, qui compare deux VERSIONS ;
   * celui-ci compare le DOSSIER à lui-même.
   */
  servieAuPatient?: boolean | null;
  /**
   * CE QUE LE PATIENT LIRA de la version active, projeté par le contrat
   * ([[D-200]] dette 1). `null` = lecture non aboutie : on ne montre rien.
   *
   * Il porte sur la version que le bouton ci-dessous validerait, pas sur celle
   * déjà validée — c'est un aperçu AVANT le geste, et c'était le seul manquant :
   * l'unique aperçu patient du cockpit vivait sur fixture, débranché de tout
   * dossier réel.
   */
  apercu?: ApercuPatientServi | null;
  state?: DiffusionState;
  error?: string | null;
  onApprove?: () => void;
}) {
  return (
    <section aria-labelledby="protocol-diffusion-title" className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 id="protocol-diffusion-title" className="text-sm font-semibold text-foreground">
          Validation pour diffusion
        </h3>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">
            {approved && !stale ? 'Validé pour diffusion' : 'Non validé pour diffusion'}
          </span>
          <span className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">
            Non transmis
          </span>
        </div>
      </div>

      <p className="mt-3 text-base">
        {approved && stale ? (
          <span className="text-status-warning">
            Une nouvelle version a été enregistrée : la validation précédente est caduque. Re-validez la version active.
          </span>
        ) : approved && approvedAt ? (
          <span className="text-foreground">
            Version active validée pour diffusion le {formatDate(approvedAt)} — non transmise au patient.
          </span>
        ) : canApprove ? (
          <span className="text-muted-foreground">
            La version active est relue. Vous pouvez la valider pour diffusion (aucun envoi automatique).
          </span>
        ) : (
          <span className="text-muted-foreground">
            Aucune version relue à valider pour l’instant.
          </span>
        )}
      </p>

      {/* LE CONSTAT QUI MANQUAIT. Une validation pour diffusion pouvait cesser
          d'être servie sans que personne ne l'apprenne : le patient lisait une
          indisponibilité, le praticien lisait « Validé pour diffusion ». Les
          causes sont peu nombreuses et toutes nommables — une retouche
          d'anamnèse, un signalement d'effet indésirable déposé par le patient,
          une re-sélection de priorité. Le motif n'est pas affiché : il nommerait
          un acte du dossier là où l'écran doit appeler une relecture. */}
      {approved && servieAuPatient === false && (
        <p role="alert" className="mt-2 text-base text-status-warning">
          Ce protocole n’est plus affiché à votre patient : le dossier a changé depuis sa validation.
          Relisez la version active et re-validez-la pour diffusion.
        </p>
      )}

      {state === 'error' && (
        <p role="alert" className="mt-2 text-base text-status-danger">{error ?? 'Échec de la validation.'}</p>
      )}

      {/* L'APERÇU, SOUS LA MAIN DU PRATICIEN ET AVANT SON GESTE. Un refus dit son
          motif : il y a alors quelque chose à lever, et un aperçu vide ne
          l'aurait pas appris. */}
      {apercu && (
        <div className="mt-4">
          {apercu.ok ? (
            <ApercuPatientProtocole contenu={apercu.contenu} />
          ) : (
            <p className="rounded-lg border border-border bg-muted p-3 text-base text-muted-foreground">
              Aucun aperçu patient pour la version active : {apercu.detail}
            </p>
          )}
        </div>
      )}

      {onApprove && (canApprove || stale) && (
        <div className="mt-3">
          <button
            type="button"
            onClick={onApprove}
            disabled={state === 'saving'}
            className="min-h-11 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {approved && stale ? 'Re-valider pour diffusion' : 'Valider pour diffusion'}
          </button>
        </div>
      )}
    </section>
  );
}
