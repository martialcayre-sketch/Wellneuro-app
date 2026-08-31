'use client';

import { Badge } from '@/components/ui/Badge';
import type { FicheAnalyte } from '@/lib/biology-library/catalogue';

// Fiche d'analyte du rayon biologie (CB-08) — consultation documentaire.
//
// Les DEUX référentiels de valeurs sont présentés CÔTE À CÔTE et jamais
// fusionnés (invariant du schéma, `schema.prisma` bloc CB-A) : la plage
// laboratoire est une donnée d'appareil, la plage fonctionnelle une lecture
// clinique ancrée à un claim validé. Une colonne vide se DIT — elle n'est
// jamais comblée par l'autre référentiel.
//
// Le remboursement affiche les quatre états de `remboursable.ts` tels quels :
// « non évalué » n'est pas « non remboursé », et l'écran l'écrit. Jamais
// d'euros — la source NABM ne porte qu'un coefficient, la valeur de la
// lettre-clé relève d'un arrêté.

export const LABEL_NIVEAU: Record<string, string> = {
  socle: 'Socle',
  approfondissement: 'Approfondissement',
  specialise: 'Spécialisé',
};

export const LABEL_STATUT_FICHE: Record<string, string> = {
  importee: 'Importée',
  verifiee: 'Vérifiée',
};

export const LABEL_COMPLETUDE: Record<string, string> = {
  bien_documentee: 'Bien documentée',
  partielle: 'Partielle',
  lacunaire: 'Lacunaire',
};

export const LABEL_REMBOURSEMENT: Record<string, string> = {
  non_evalue: 'Non évalué',
  hors_nomenclature: 'Hors nomenclature courante',
  remboursable: 'Remboursable',
  remboursable_si_groupe: 'Remboursable en groupe d’actes',
};

const LABEL_CONDITION: Record<string, string> = {
  entente_prealable: 'Entente préalable requise',
  acte_reserve: 'Acte réservé',
  remboursement_partiel: 'Remboursement partiel',
};

/** Vocabulaire technique (`type_prelevement`, `population`) rendu lisible. */
export function libelleTechnique(valeur: string): string {
  const texte = valeur.replaceAll('_', ' ').trim();
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('fr-FR');
}

function formatBornes(borneMin: number | null, borneMax: number | null, unite: string): string {
  if (borneMin !== null && borneMax !== null) return `${borneMin} – ${borneMax} ${unite}`;
  if (borneMin !== null) return `≥ ${borneMin} ${unite}`;
  if (borneMax !== null) return `≤ ${borneMax} ${unite}`;
  return '—';
}

function LigneDetail({ label, valeur }: { label: string; valeur: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{valeur}</dd>
    </div>
  );
}

export function FicheAnalytePanel({ fiche }: { fiche: FicheAnalyte }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-display text-xl font-semibold text-foreground">{fiche.libelle}</h4>
          <Badge variant="neutral">{LABEL_STATUT_FICHE[fiche.statutFiche] ?? fiche.statutFiche}</Badge>
          {fiche.validationMedicaleRequise && (
            <Badge variant="warning">Interprétation sous validation médicale</Badge>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Code catalogue : {fiche.code}</p>
        {fiche.libellePatient && (
          <p className="mt-1 text-sm text-muted-foreground">
            Présenté au patient comme : « {fiche.libellePatient} »
          </p>
        )}
      </div>

      <dl className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface-2 p-3">
        <LigneDetail label="Unité" valeur={fiche.unite ?? 'Sans unité (bloc d’analyses)'} />
        <LigneDetail label="Prélèvement" valeur={libelleTechnique(fiche.typePrelevement)} />
        {fiche.delaiRenduIndicatif && (
          <LigneDetail label="Délai de rendu indicatif" valeur={fiche.delaiRenduIndicatif} />
        )}
      </dl>

      <section aria-label="Référentiels de valeurs">
        <h5 className="text-sm font-semibold text-foreground">Référentiels de valeurs</h5>
        <p className="mt-1 text-xs text-muted-foreground">
          Deux référentiels distincts, présentés côte à côte et jamais fusionnés : la plage
          laboratoire décrit la mesure, la plage fonctionnelle est une lecture clinique ancrée à
          un claim validé.
        </p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs font-semibold uppercase tracking-[.06em] text-muted-foreground">
              Laboratoire
            </p>
            {fiche.plagesLaboratoire.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Aucune plage laboratoire renseignée à ce jour.
              </p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {fiche.plagesLaboratoire.map((plage, index) => (
                  <li key={index} className="text-sm text-foreground">
                    {formatBornes(plage.borneMin, plage.borneMax, plage.unite)}
                    <span className="block text-xs text-muted-foreground">
                      {libelleTechnique(plage.population)} · Source : {plage.sourceLibelle}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs font-semibold uppercase tracking-[.06em] text-muted-foreground">
              Fonctionnel
            </p>
            {fiche.plagesFonctionnelles.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Aucune plage fonctionnelle publiée — une plage fonctionnelle n’existe qu’ancrée à
                un claim validé du corpus.
              </p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {fiche.plagesFonctionnelles.map((plage, index) => (
                  <li key={index} className="text-sm text-foreground">
                    {formatBornes(plage.borneMin, plage.borneMax, plage.unite)}
                    <span className="block text-xs text-muted-foreground">
                      {libelleTechnique(plage.population)} · Claim {plage.claimId} (v
                      {plage.versionClaim}) · Niveau de preuve : {plage.niveauPreuve}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section aria-label="Remboursement">
        <h5 className="text-sm font-semibold text-foreground">Remboursement</h5>
        <p className="mt-1 text-sm text-foreground">
          {LABEL_REMBOURSEMENT[fiche.remboursement.statut] ?? fiche.remboursement.statut}
        </p>
        {fiche.remboursement.statut === 'non_evalue' && (
          <p className="mt-1 text-xs text-muted-foreground">
            La correspondance à la nomenclature n’est pas encore signée. Cela ne veut pas dire
            « non remboursé » — personne n’a tranché.
          </p>
        )}
        {fiche.remboursement.conditions.length > 0 && (
          <ul className="mt-1 flex flex-wrap gap-2">
            {fiche.remboursement.conditions.map(condition => (
              <li key={condition}>
                <Badge variant="neutral">{LABEL_CONDITION[condition] ?? condition}</Badge>
              </li>
            ))}
          </ul>
        )}
        {fiche.remboursement.codesActesRetenus.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            Actes cités : {fiche.remboursement.codesActesRetenus.join(', ')}
          </p>
        )}
      </section>

      <section aria-label="Conditions préanalytiques">
        <h5 className="text-sm font-semibold text-foreground">Préanalytique</h5>
        {fiche.preanalytiques.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Aucune consigne préanalytique renseignée à ce jour.
          </p>
        ) : (
          <ul className="mt-1 flex flex-col gap-1">
            {fiche.preanalytiques.map((condition, index) => (
              <li key={index} className="text-sm text-foreground">
                <span className="text-muted-foreground">
                  {libelleTechnique(condition.typeCondition)} :
                </span>{' '}
                {condition.consigne}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Provenance et complétude">
        <h5 className="text-sm font-semibold text-foreground">Provenance et complétude</h5>
        <dl className="mt-1 flex flex-col gap-1.5">
          <LigneDetail label="Source" valeur={libelleTechnique(fiche.sourceProvenance)} />
          <LigneDetail
            label="Complétude"
            valeur={LABEL_COMPLETUDE[fiche.niveauCompletude] ?? fiche.niveauCompletude}
          />
          <LigneDetail
            label="Vérification"
            valeur={
              fiche.verifieLe
                ? `Vérifiée le ${formatDate(fiche.verifieLe)}`
                : 'Fiche importée, non encore vérifiée par le praticien'
            }
          />
        </dl>
        {fiche.donneesManquantes.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            Données manquantes déclarées : {fiche.donneesManquantes.join(', ')}
          </p>
        )}
        {fiche.incertitudes && (
          <p className="mt-1 text-xs text-muted-foreground">Incertitudes : {fiche.incertitudes}</p>
        )}
      </section>

      {fiche.panels.length > 0 && (
        <section aria-label="Bilans citant cet analyte">
          <h5 className="text-sm font-semibold text-foreground">Présent dans les bilans</h5>
          <ul className="mt-1 flex flex-wrap gap-2">
            {fiche.panels.map(panel => (
              <li key={panel.code}>
                <Badge variant="neutral">
                  {panel.libelle} · {LABEL_NIVEAU[panel.niveau] ?? panel.niveau}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
