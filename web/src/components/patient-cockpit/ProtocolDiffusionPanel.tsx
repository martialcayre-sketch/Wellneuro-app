'use client';

// Validation « pour diffusion » d'une version relue (C2A LOT-03 Part B). La
// validation est persistée et ancrée sur la version : elle devient caduque dès
// qu'une nouvelle version est enregistrée. Le portail sert la version validée
// (`servirAuPatient.ts`) ; aucun e-mail n'annonce le protocole lui-même. Le
// badge « Non transmis », figé depuis C2A LOT-03, contredisait un portail qui
// servait : il suit désormais `servieAuPatient`, le constat de la route. Sous
// `WN_FICHES_ASSIETTE` seul, le même clic remet les fiches d'assiette de
// l'aperçu ci-dessous ([[D-251]] §7, lot 8).

import type { ApercuPatientServi } from '@/lib/clinical-engine/contenuPatientProtocole';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import {
  fichesARemettre,
  TEXTE_ANNONCE,
  TEXTE_ANNONCE_A_VENIR,
  type AnnonceFiches,
  type ApercuFiches,
  type StatutLigneFiche,
} from '@/lib/fiches-assiette/apercuRemise';
import type { ApercuLettreAdressage } from '@/lib/correspondance/lettreAdressageRemise';
import { ApercuPatientProtocole } from './ApercuPatientProtocole';

export type DiffusionState = 'idle' | 'saving' | 'error';

const STATUT_FICHE: Record<StatutLigneFiche, { texte: string; variante: BadgeVariant }> = {
  part: { texte: 'Partira', variante: 'success' },
  deja_remise: { texte: 'Déjà remise', variante: 'neutral' },
  ne_part_pas: { texte: 'Ne partira pas', variante: 'warning' },
};

/**
 * LES FICHES D'ASSIETTE QUE LE CLIC REMETTRAIT ([[D-251]] §7, lot 8) — celles
 * qui partiront ET celles qui ne partiront pas, chacune avec sa phrase (`DC-24`).
 * Sous un blocage (dossier clos, protocole non servable), le motif est dit UNE
 * fois, en tête, et chaque fiche ne porte plus que son statut.
 */
function ApercuFichesAssiette({
  fiches,
  dejaValide,
  annonceParEmail,
}: {
  fiches: ApercuFiches;
  dejaValide: boolean;
  annonceParEmail: boolean;
}) {
  return (
    <section
      aria-labelledby="protocol-diffusion-fiches-title"
      data-testid="apercu-fiches-assiette"
      className="mt-4 rounded-lg border border-border p-3"
    >
      <h4 id="protocol-diffusion-fiches-title" className="text-sm font-semibold text-foreground">
        Fiches d’assiette que ce clic remettra au patient
      </h4>
      {fiches.blocage && (
        <p className="mt-2 text-base text-status-warning">{fiches.blocage.detail}</p>
      )}
      {fiches.lignes.length === 0 ? (
        // Sous un blocage, zéro ligne peut vouloir dire « non lu » (payload
        // illisible, lecture en échec) : le blocage l'a déjà dit, et affirmer
        // « aucune action ne porte d'assiette » serait un constat inventé
        // (`DC-24`, constat de revue du lot 8).
        fiches.blocage ? null : (
          <p className="mt-2 text-base text-muted-foreground">
            Aucune action de ce protocole ne porte d’assiette : aucune fiche ne part.
          </p>
        )
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {fiches.lignes.map(ligne => (
            <li
              key={ligne.plateCode}
              data-testid={`fiche-diffusion-${ligne.plateCode}`}
              className="flex flex-wrap items-baseline gap-x-2 gap-y-1"
            >
              <Badge variant={STATUT_FICHE[ligne.statut].variante}>{STATUT_FICHE[ligne.statut].texte}</Badge>
              <span className="text-base font-medium text-foreground">{ligne.libelle}</span>
              {ligne.motif !== fiches.blocage?.motif ? (
                <span className="min-w-0 break-words text-base text-muted-foreground">{ligne.detail}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {dejaValide && fichesARemettre(fiches) && (
        <p className="mt-2 text-base text-foreground">
          Ce protocole est déjà validé : un nouveau clic sur « Valider pour diffusion » remet les fiches validées depuis.
        </p>
      )}
      {/* L'E-MAIL, DIT AVANT LE GESTE ([[D-251]] §9, lot 11) : espace de
          lecture ouvert, le clic qui remet une fiche avertit le patient. */}
      {annonceParEmail && fichesARemettre(fiches) && (
        <p className="mt-2 text-base text-foreground">{TEXTE_ANNONCE_A_VENIR}</p>
      )}
    </section>
  );
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

/**
 * La date de la lettre TELLE QU'ELLE EST ÉCRITE dans la lettre : le générateur
 * (`genererCourrierAdressage`) date « Courrier préparé le … » au jour UTC, et la
 * version imprimée reprend ce jour. L'aperçu le suit, fuseau épinglé — jamais
 * celui du navigateur (revue Copilot de #1309) —, pour ne pas annoncer un autre
 * jour que celui imprimé. Passer le générateur au jour de Paris changerait le
 * texte des lettres : hors de ce lot.
 */
function dateLisible(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** Le drapeau de la lettre ouvre sa lecture : une lettre remise est toujours annoncée ([[D-262]] B3). */
export const TEXTE_ANNONCE_LETTRE =
  'Votre patient reçoit un e-mail neutre, sans contenu de santé : « Un document de votre praticien vous attend ». Un seul e-mail par clic, fiches comprises.';

/**
 * LE COURRIER POUR LE MÉDECIN QUE LE CLIC REMETTRAIT ([[D-262]], LOT-03b ;
 * revue du LOT-02, P1). Le praticien atteste ce qui part : la lettre est dite
 * AVANT le geste, et son identifiant entre dans le jeton du clic — une lettre
 * consignée ou révoquée entre-temps fait refuser le clic, puis relire l'aperçu.
 * Le texte n'est pas recopié ici : il est dans l'onglet Correspondance.
 */
function ApercuLettreAdressageBloc({
  lettre,
  annonceDejaDite,
}: {
  lettre: ApercuLettreAdressage;
  /** L'e-mail est déjà annoncé au-dessus, pour les fiches : un seul par clic. */
  annonceDejaDite: boolean;
}) {
  const quand = dateLisible(lettre.consigneLe);
  return (
    <section
      aria-labelledby="protocol-diffusion-lettre-title"
      data-testid="apercu-lettre-adressage"
      className="mt-4 rounded-lg border border-border p-3"
    >
      <h4 id="protocol-diffusion-lettre-title" className="text-sm font-semibold text-foreground">
        Courrier pour le médecin traitant
      </h4>
      <p className="mt-2 text-base text-foreground">
        {lettre.dejaRemise
          ? `La lettre d’adressage du ${quand} est déjà remise au patient : ce clic ne la remet pas de nouveau.`
          : `La lettre d’adressage du ${quand} sera remise au patient avec ce protocole, telle qu’elle a été consignée.`}
      </p>
      {!lettre.dejaRemise && !annonceDejaDite && (
        <p className="mt-2 text-sm text-muted-foreground">{TEXTE_ANNONCE_LETTRE}</p>
      )}
    </section>
  );
}

export function ProtocolDiffusionPanel({
  canApprove,
  approved,
  stale,
  approvedAt,
  servieAuPatient = null,
  apercu = null,
  fiches = null,
  lettre = null,
  annonceParEmail = false,
  annonce = null,
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
  /**
   * Les fiches d'assiette que le clic remettrait ([[D-251]] §7). `null` :
   * `WN_FICHES_ASSIETTE` fermé, ou lecture non aboutie — l'écran n'en dit rien.
   */
  fiches?: ApercuFiches | null;
  /**
   * Le courrier pour le médecin que le clic remettrait ([[D-262]], LOT-03b).
   * `null` : aucune lettre ne partira, ou drapeau fermé — l'écran n'en dit rien.
   */
  lettre?: ApercuLettreAdressage | null;
  /** Une fiche remise par le clic serait annoncée par e-mail (lecture ouverte). */
  annonceParEmail?: boolean;
  /** Le sort de l'e-mail du DERNIER clic ; `null` : aucun n'était dû. */
  annonce?: AnnonceFiches | null;
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
          {/* CE QUE LE PORTAIL SERT, lu sur `servieAuPatient` : `null` (rien de
              diffusé, ou constat non lu) n'affirme rien, donc aucun badge ; sans
              approbation non plus : « plus servi » dirait qu'il l'a été. */}
          {approved && servieAuPatient !== null && (
            <span className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">
              {servieAuPatient ? 'Servi sur le portail' : 'Plus servi au patient'}
            </span>
          )}
        </div>
      </div>

      <p className="mt-3 text-base">
        {approved && stale ? (
          <span className="text-status-warning">
            Une nouvelle version a été enregistrée : la validation précédente est caduque. Re-validez la version active.
          </span>
        ) : approved && approvedAt ? (
          <span className="text-foreground">
            Version active validée pour diffusion le {formatDate(approvedAt)}
            {servieAuPatient === true
              ? ' — servie sur le portail du patient (aucun e-mail n’annonce le protocole lui-même).'
              : '.'}
          </span>
        ) : canApprove ? (
          <span className="text-muted-foreground">
            {/* « aucun envoi automatique » ne vaut que sans fiches : avec elles,
                le clic REMET, et l'aperçu ci-dessous dit quoi (revue Copilot de
                #1249). */}
            {fiches
              ? 'La version active est relue. Vous pouvez la valider pour diffusion.'
              : 'La version active est relue. Vous pouvez la valider pour diffusion (aucun envoi automatique).'}
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

      {/* LE SORT DE L'E-MAIL, DIT APRÈS LE GESTE : un échec ne doit pas
          ressembler à un succès. Il ne bloque rien — les fiches sont remises. */}
      {annonce && (
        <p
          role={TEXTE_ANNONCE[annonce].alerte ? 'alert' : 'status'}
          className={`mt-2 text-base ${TEXTE_ANNONCE[annonce].alerte ? 'text-status-warning' : 'text-foreground'}`}
        >
          {TEXTE_ANNONCE[annonce].texte}
        </p>
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

      {fiches && (
        <ApercuFichesAssiette fiches={fiches} dejaValide={approved && !stale} annonceParEmail={annonceParEmail} />
      )}

      {lettre && (
        <ApercuLettreAdressageBloc
          lettre={lettre}
          annonceDejaDite={Boolean(fiches && annonceParEmail && fichesARemettre(fiches))}
        />
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
