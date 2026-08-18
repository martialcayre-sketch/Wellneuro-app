'use client';

import { useState } from 'react';
import type { LimiteProposition } from '@/lib/biology-library/propositionService';
import type { LignePanelProposition, StatutPanel } from '@/lib/biology-library/statuts';

// Proposition de bilan biologique ([[D-071]]) — panneau présentationnel.
//
// Il AFFICHE ce que le moteur a dérivé, et n'en dérive rien lui-même : aucun
// statut, aucun tri, aucun regroupement clinique n'est décidé ici. Le moteur
// rend déjà les lignes hiérarchisées.
//
// Trois choses doivent rester dites à voix haute, parce que les taire
// donnerait à l'écran plus d'assurance qu'il n'en a :
//   1. une proposition n'est PAS une ordonnance (`DC-31`, `DC-32`) ;
//   2. « remboursement non évalué » ne veut pas dire « non remboursé » ;
//   3. l'outil ignore les bilans qu'on ne lui a pas déclarés.

export type PropositionState = 'idle' | 'saving' | 'error';

export type DocumenteAffiche = {
  panelCode: string;
  documenteLe: string;
  declarePar: string;
  declareLe: string;
};

const LIBELLES_STATUT: Record<StatutPanel, string> = {
  recommande: 'Recommandé',
  a_repeter: 'À répéter',
  conditionnel: 'Conditionnel',
  optionnel: 'Optionnel',
  deja_documente: 'Déjà documenté',
  non_indique_actuellement: 'Non indiqué actuellement',
};

// Couleurs de statut : la hiérarchie visuelle suit celle du moteur, elle ne
// la réinvente pas.
const TONS_STATUT: Record<StatutPanel, string> = {
  recommande: 'border-status-success text-status-success',
  a_repeter: 'border-status-warning text-status-warning',
  conditionnel: 'border-border text-foreground',
  optionnel: 'border-border text-muted-foreground',
  deja_documente: 'border-border text-muted-foreground',
  non_indique_actuellement: 'border-border text-muted-foreground',
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('fr-FR');
}

function Limite({
  limite,
  libelle,
}: {
  limite: LimiteProposition;
  /** Rend le libellé d'un panel : une limite se dit en clair, pas en code. */
  libelle: (panelCode: string) => string;
}) {
  if (limite.type === 'remboursement_non_evalue') {
    return (
      <li>
        Le remboursement est <strong>non évalué</strong> pour tous les analytes : la
        correspondance à la nomenclature n’est pas encore renseignée. Cela ne veut pas
        dire « non remboursé » — personne n’a tranché.
      </li>
    );
  }
  if (limite.type === 'items_ratio_ignores') {
    return (
      <li>
        Certains panels comportent des rapports calculés que cette vue n’affiche pas
        encore ({limite.panels.map(libelle).join(', ')}) : leur composition est donc
        incomplète à l’écran.
      </li>
    );
  }
  return (
    <li>
      Déclaration écartée pour {limite.panels.map(libelle).join(', ')} : la date saisie
      est postérieure à aujourd’hui, ou illisible. Le panel est traité comme
      <strong> non exploré</strong> — il vaut mieux le proposer en trop que le taire.
    </li>
  );
}

function FormulaireDeclaration({
  panelCode,
  disabled,
  dejaDeclare,
  onDeclarer,
}: {
  panelCode: string;
  disabled: boolean;
  /** Une déclaration existe déjà : le geste devient une CORRECTION. */
  dejaDeclare: boolean;
  onDeclarer: (panelCode: string, documenteLe: string) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [date, setDate] = useState('');

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="mt-2 min-h-11 rounded-lg border border-border px-3 py-2 text-sm text-foreground"
      >
        {dejaDeclare ? 'Corriger la date du bilan…' : 'Déjà exploré hors outil…'}
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <label className="block text-xs text-muted-foreground" htmlFor={`date-${panelCode}`}>
        Date du bilan (aucun résultat n’est demandé ni conservé)
      </label>
      <input
        id={`date-${panelCode}`}
        type="date"
        value={date}
        onChange={event => setDate(event.target.value)}
        className="min-h-11 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || date === ''}
          onClick={() => onDeclarer(panelCode, date)}
          className="min-h-11 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Consigner la déclaration
        </button>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="min-h-11 rounded-lg border border-border px-3 py-2 text-sm text-foreground"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

export function PropositionBilanPanel({
  lignes,
  limites,
  documentes,
  motifIndisponible = null,
  state = 'idle',
  error = null,
  onDeclarer,
}: {
  lignes: LignePanelProposition[];
  limites: LimiteProposition[];
  documentes: DocumenteAffiche[];
  /** Motif du moteur quand il s'abstient — affiché tel quel, jamais reformulé. */
  motifIndisponible?: string | null;
  state?: PropositionState;
  error?: string | null;
  onDeclarer: (panelCode: string, documenteLe: string) => void;
}) {
  const parPanel = new Map(documentes.map(doc => [doc.panelCode, doc]));
  const libelles = new Map(lignes.map(ligne => [ligne.panelCode, ligne.libelle]));
  const libelleDuPanel = (panelCode: string) => libelles.get(panelCode) ?? panelCode;

  return (
    <section
      aria-labelledby="proposition-bilan-title"
      className="rounded-xl border border-border bg-surface p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 id="proposition-bilan-title" className="text-sm font-semibold text-foreground">
          Biologie — proposition de bilan
        </h3>
        <span className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">
          Aucune valeur d’analyse conservée
        </span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Une orientation d’exploration, hiérarchisée et sourcée — <strong>pas une
        ordonnance</strong>. Chaque ligne cite les claims qui la fondent.
      </p>

      {motifIndisponible ? (
        <p className="mt-3 rounded-lg border border-border p-3 text-sm text-foreground">
          {motifIndisponible}
        </p>
      ) : lignes.length === 0 ? (
        // Le moteur a rendu une proposition VIDE (aucun panel actif ne porte de
        // règle exploitable). Un `<ul>` vide laisserait croire à un écran cassé
        // ou à un dossier sans indication : dire la cause vaut mieux (`DC-34`).
        <p className="mt-3 rounded-lg border border-border p-3 text-sm text-foreground">
          Aucun panel du catalogue n’est couvert par une règle d’indication exploitable :
          il n’y a rien à proposer, et ce n’est pas une absence d’indication clinique.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {lignes.map(ligne => {
            const documente = parPanel.get(ligne.panelCode);
            return (
              <li key={ligne.panelCode} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{ligne.libelle}</p>
                  <span
                    className={`rounded-full border px-2 py-1 text-xs ${TONS_STATUT[ligne.statut]}`}
                  >
                    {LIBELLES_STATUT[ligne.statut]}
                  </span>
                </div>
                {ligne.objectif && (
                  <p className="mt-1 text-xs text-muted-foreground">{ligne.objectif}</p>
                )}
                {ligne.condition && ligne.declencheurRempli === false && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Condition : {ligne.condition}
                  </p>
                )}
                {ligne.motifs.length > 0 && (
                  <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">
                    {ligne.motifs.map((motif, index) => (
                      <li key={`${ligne.panelCode}-${index}`}>{motif}</li>
                    ))}
                  </ul>
                )}
                {ligne.analytes.length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {ligne.analytes.map(analyte => analyte.libelle).join(' · ')}
                  </p>
                )}
                {ligne.analytes.some(analyte => analyte.validationMedicaleRequise) && (
                  <p className="mt-1 text-xs text-status-warning">
                    Interprétation sous validation médicale.
                  </p>
                )}
                {ligne.justificationClaims.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Claims : {ligne.justificationClaims.map(claim => claim.claimId).join(', ')}
                  </p>
                )}
                {documente && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Déclaré exploré le {formatDate(documente.documenteLe)} par{' '}
                    {documente.declarePar}.
                  </p>
                )}
                {/*
                  LE FORMULAIRE RESTE OFFERT MÊME DÉCLARÉ. Une date saisie de
                  travers (2016 pour 2026) retire durablement le panel de la
                  proposition : sans geste de correction, une faute de frappe
                  tairait un bilan sans issue. La route accepte déjà la
                  correction — c'est le même upsert.
                */}
                <FormulaireDeclaration
                  panelCode={ligne.panelCode}
                  disabled={state === 'saving'}
                  dejaDeclare={documente !== undefined}
                  onDeclarer={onDeclarer}
                />
                {/*
                  Un panel proposé ALORS qu'une déclaration existe : sa date a
                  été écartée (future ou illisible). Le dire sur la ligne même,
                  sinon le badge et la mention se contredisent en silence.
                */}
                {documente && ligne.statut !== 'deja_documente' && ligne.statut !== 'a_repeter' && (
                  <p className="mt-1 text-xs text-status-warning">
                    Cette déclaration n’est pas prise en compte : sa date est postérieure à
                    aujourd’hui, ou illisible. Le panel reste proposé.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {state === 'error' && (
        <p role="alert" className="mt-2 text-base text-status-danger">
          {error ?? 'Échec de l’enregistrement de la déclaration.'}
        </p>
      )}

      <div className="mt-3 rounded-lg border border-border p-3">
        <p className="text-xs font-medium text-foreground">Ce que cette vue ne sait pas</p>
        <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">
          <li>
            Un bilan réalisé hors outil n’est connu que s’il a été déclaré ici : sans
            déclaration, le panel est proposé comme s’il n’avait jamais été exploré.
          </li>
          {limites.map((limite, index) => (
            <Limite key={`${limite.type}-${index}`} limite={limite} libelle={libelleDuPanel} />
          ))}
        </ul>
      </div>
    </section>
  );
}
