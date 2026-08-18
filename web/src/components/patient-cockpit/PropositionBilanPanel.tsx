'use client';

import { useEffect, useState } from 'react';
import type { LimiteProposition } from '@/lib/biology-library/propositionService';
import type { LignePanelProposition, StatutPanel } from '@/lib/biology-library/statuts';
import { STATUTS_PROPOSES } from '@/lib/biology-library/courrier';

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

export type PropositionState = 'idle' | 'saving' | 'saved' | 'error';

/** Courrier établi : le texte à transcrire, et l'ancre qui l'explique. */
export type CourrierEtabli = {
  texte: string;
  ancrageSha256: string;
  ancrageVersion: string;
};

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

function Limite({ limite }: { limite: LimiteProposition }) {
  if (limite.type === 'remboursement_non_evalue') {
    return (
      <li>
        Le remboursement est <strong>non évalué</strong> pour tous les analytes : la
        correspondance à la nomenclature n’est pas encore renseignée. Cela ne veut pas
        dire « non remboursé » — personne n’a tranché.
      </li>
    );
  }
  return (
    <li>
      {limite.motifs.map((motif, index) => (
        <span key={index}>{motif} </span>
      ))}
      Le panel concerné n’apparaît pas dans la liste ci-dessus (inactif au
      catalogue, ou couvert par aucune règle d’indication).
    </li>
  );
}

const LIBELLES_PARTAGE: Record<string, string> = {
  accepte: 'Le patient a consenti au partage avec son médecin traitant.',
  refuse:
    'Le patient a refusé le partage avec son médecin traitant. Cette information est '
    + 'exposée, jamais opposée : la décision de transmettre vous appartient.',
  retire:
    'Le patient a retiré son consentement au partage. Cette information est exposée, '
    + 'jamais opposée : la décision de transmettre vous appartient.',
};

function FormulaireCourrier({
  disabled,
  courrier,
  erreur,
  partageMedecinTraitant,
  onEtablir,
}: {
  disabled: boolean;
  courrier: CourrierEtabli | null;
  erreur: string | null;
  /** Choix TRUST du patient — exposé, jamais opposé (décision du 2026-07-22). */
  partageMedecinTraitant: string | null;
  onEtablir: (medecinLibelle: string) => void;
}) {
  const [medecin, setMedecin] = useState('');
  // Un envoi à la fois, et pas de re-consignation du même geste (revue M4) :
  // l'état `saving` est PARTAGÉ avec la déclaration de panel — une déclaration
  // qui aboutit pendant le POST du courrier réarmerait le bouton en plein vol.
  // Le verrou vit donc ICI. Il se lève quand le résultat revient (succès ou
  // refus), et le succès n'est re-consignable qu'après modification du
  // destinataire — deux clics rapprochés n'écrivent qu'une ligne.
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [consigneSans, setConsigneSans] = useState<string | null>(null);
  // Le verrou se lève au CHANGEMENT du résultat, jamais à sa simple présence :
  // corriger le destinataire alors qu'un courrier antérieur est affiché ne
  // doit pas déverrouiller le bouton pendant que le POST est en vol.
  useEffect(() => {
    setEnvoiEnCours(false);
  }, [courrier, erreur]);
  const dejaConsigne = courrier !== null && consigneSans === medecin.trim();

  return (
    <div className="mt-3 rounded-lg border border-border p-3">
      <p className="text-xs font-medium text-foreground">Courrier au médecin traitant</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Établi à partir de la proposition ci-dessus, dans un registre non prescriptif :
        la décision de demander ces explorations, comme leur interprétation, revient au
        médecin. <strong>Aucun envoi automatique</strong> — le courrier est à transcrire
        ou à imprimer.
      </p>
      {partageMedecinTraitant !== null && LIBELLES_PARTAGE[partageMedecinTraitant] && (
        <p
          className={`mt-2 text-xs ${partageMedecinTraitant === 'accepte' ? 'text-muted-foreground' : 'text-status-warning'}`}
        >
          {LIBELLES_PARTAGE[partageMedecinTraitant]}
        </p>
      )}
      {partageMedecinTraitant === null && (
        <p className="mt-2 text-xs text-muted-foreground">
          Le patient ne s’est pas exprimé sur le partage avec son médecin traitant.
        </p>
      )}
      <label className="mt-2 block text-xs text-muted-foreground" htmlFor="courrier-medecin">
        Nom du médecin destinataire
      </label>
      <input
        id="courrier-medecin"
        type="text"
        value={medecin}
        onChange={event => setMedecin(event.target.value)}
        placeholder="Dr Nicola"
        className="min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
      />
      <button
        type="button"
        disabled={disabled || envoiEnCours || dejaConsigne || medecin.trim() === ''}
        onClick={() => {
          setEnvoiEnCours(true);
          setConsigneSans(medecin.trim());
          onEtablir(medecin.trim());
        }}
        className="mt-2 min-h-11 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        Établir et consigner le courrier
      </button>

      {erreur && (
        <p role="alert" className="mt-2 text-sm text-status-danger">
          {erreur}
        </p>
      )}

      {courrier && (
        <div className="mt-3">
          <p role="status" className="text-xs text-status-success">
            Courrier consigné au dossier. Provenance : {courrier.ancrageVersion}, empreinte{' '}
            {courrier.ancrageSha256.slice(0, 12)}…
          </p>
          <textarea
            readOnly
            value={courrier.texte}
            rows={10}
            aria-label="Texte du courrier à transcrire"
            className="mt-2 w-full rounded-lg border border-border bg-background p-3 text-xs text-foreground"
          />
        </div>
      )}
    </div>
  );
}

function FormulaireDeclaration({
  panelCode,
  disabled,
  dejaDeclare,
  onDeclarer,
  onOuvrir,
}: {
  panelCode: string;
  disabled: boolean;
  /** Une déclaration existe déjà : le geste devient une CORRECTION. */
  dejaDeclare: boolean;
  onDeclarer: (panelCode: string, documenteLe: string) => void;
  /** Efface le retour de la consignation précédente : sans cela la bannière
   *  resterait, et une seconde consignation ne serait plus annoncée. */
  onOuvrir: () => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [date, setDate] = useState('');

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => { setOuvert(true); onOuvrir(); }}
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
  onNouvelleSaisie = () => {},
  courrier = null,
  courrierErreur = null,
  partageMedecinTraitant = null,
  onEtablirCourrier,
}: {
  lignes: LignePanelProposition[];
  limites: LimiteProposition[];
  documentes: DocumenteAffiche[];
  /** Motif du moteur quand il s'abstient — affiché tel quel, jamais reformulé. */
  motifIndisponible?: string | null;
  state?: PropositionState;
  error?: string | null;
  onDeclarer: (panelCode: string, documenteLe: string) => void;
  /** Appelé à l'ouverture d'un formulaire : remet l'état à `idle`. */
  onNouvelleSaisie?: () => void;
  /** Courrier établi lors de ce passage, à transcrire. */
  courrier?: CourrierEtabli | null;
  courrierErreur?: string | null;
  /** Choix « partage médecin traitant » — exposé, jamais opposé. */
  partageMedecinTraitant?: string | null;
  onEtablirCourrier?: (medecinLibelle: string) => void;
}) {
  const parPanel = new Map(documentes.map(doc => [doc.panelCode, doc]));

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
                {ligne.ratios.length > 0 && (
                  // Rapports calculés : ce sont des CALCULS sur les analytes du
                  // panel, pas des actes — ni remboursement propre, ni
                  // validation médicale. Les taire amputait la composition
                  // affichée de ce que le bilan contient ([[D-072]]).
                  <p className="mt-1 text-xs text-muted-foreground">
                    Rapports calculés : {ligne.ratios.map(ratio => ratio.libelle).join(' · ')}
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
                  onOuvrir={onNouvelleSaisie}
                />
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

      {/* Une consignation muette laisse le praticien sans preuve que son geste
          a porté — et la ligne ne change pas toujours de statut. */}
      {state === 'saved' && (
        <p role="status" className="mt-2 text-sm text-status-success">
          Déclaration consignée : la proposition a été recalculée.
        </p>
      )}

      {/* Le geste s'offre sur le MÊME prédicat que le générateur (revue M5) :
          un dossier dont tous les panels sont déjà documentés ou non indiqués
          n'a pas de courrier — l'offrir ferait journaliser un accès pour un
          409. */}
      {onEtablirCourrier && !motifIndisponible
        && lignes.some(ligne => STATUTS_PROPOSES.has(ligne.statut)) && (
        <FormulaireCourrier
          disabled={state === 'saving'}
          courrier={courrier}
          erreur={courrierErreur}
          partageMedecinTraitant={partageMedecinTraitant}
          onEtablir={onEtablirCourrier}
        />
      )}

      <div className="mt-3 rounded-lg border border-border p-3">
        <p className="text-xs font-medium text-foreground">Ce que cette vue ne sait pas</p>
        <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">
          <li>
            Un bilan réalisé hors outil n’est connu que s’il a été déclaré ici : sans
            déclaration, le panel est proposé comme s’il n’avait jamais été exploré.
          </li>
          {limites.map((limite, index) => (
            <Limite key={`${limite.type}-${index}`} limite={limite} />
          ))}
        </ul>
      </div>
    </section>
  );
}
