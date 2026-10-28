import type { Ref } from 'react';
import type { VuePatientSurLeFil } from '@/lib/protocol/vuePatientSurLeFil';
import {
  TEXTE_PAUSE_AVIS_RENDU,
  TEXTE_PAUSE_COMPLEMENTS,
  TEXTE_PAUSE_ELEMENT,
  type ElementEnPause,
} from '@/lib/trust/pauseEffetIndesirable';
import { PARAGRAPHES_ENCART_CONDUITE, TITRE_ENCART_CONDUITE } from '@/lib/portail/texteEncartConduite';
import { CHAPEAU_TROIS_PLANS, INTITULES_TROIS_PLANS } from '@/lib/portail/texteTroisPlans';
import type { TroisPlansAction } from '@/lib/portail/troisPlans';

// LE DÉTAIL DU PROTOCOLE SERVI, rendu par UN SEUL composant : l'accueil
// compagnon et la page imprimable ([[D-392]] §1) le montent tous deux. Ce que
// le patient imprime est ce qu'il lit — un second rendu dériverait au premier
// texte ajouté d'un seul côté.

// LE TYPE VIENT DE LA ROUTE ([[D-191]]). Il était redéclaré ici, en plus pauvre,
// et le JSON y était casté : `tsc` restait vert pendant que `followUpCriterion`
// voyageait sans qu'aucun écran ne le rende, et que deux des trois actions du
// protocole n'atteignaient jamais le patient.
export type ProtocoleResponse =
  | {
      ok: true;
      protocoleDiffuse: boolean;
      finDeCycle: boolean;
      vue: VuePatientSurLeFil | null;
      /** Un protocole est diffusé et ne peut pas être servi — distinct d'une attente. */
      indisponible?: boolean;
      /** Éléments en pause sur effet indésirable ([[D-281]] §3) ; vide avant la signature. */
      pauses?: ElementEnPause[];
      /** Lectures de la Boussole dont l'aliment est en pause ([[D-281]] §2) ; vide avant la signature. */
      /** Journal de lecture du protocole ([[D-315]]) ; absent = drapeau fermé, détail déplié. */
      lectureDuDetail?: { dejaOuvert: boolean };
      /** Encart « quand ralentir ou demander avis » ([[D-349]]) ; absent = drapeau fermé. */
      encartConduite?: true;
      /** Instant de l'approbation de diffusion de la version servie ([[D-369]]). */
      valideLe?: string;
      /** Plans idéal et de secours des actions fermes ([[D-384]], [[D-386]]) ; absent = plan minimal seul. */
      troisPlans?: TroisPlansAction[];
      /** L'imprimable du protocole ([[D-392]]) ; absent = drapeau fermé ou dossier non majeur. */
      imprimable?: true;
    }
  | { ok: false };

export type ProtocoleServi = Extract<ProtocoleResponse, { ok: true }>;

/**
 * Les actions sous leur régime, puis le critère à trois semaines. Le parent
 * décide QUAND le détail se lit (déplié, hors fin de cycle) ; ce composant
 * décide seulement CE QUI s'y lit.
 */
export function DetailDuProtocole({
  vue,
  pauses,
  troisPlans,
  titreRef,
}: {
  vue: VuePatientSurLeFil;
  pauses: ElementEnPause[] | undefined;
  troisPlans: TroisPlansAction[] | undefined;
  /** Le focus clavier après le dépli, côté accueil. */
  titreRef?: Ref<HTMLParagraphElement>;
}) {
  // LA PAUSE SUR EFFET INDÉSIRABLE ([[D-281]] §3-4) : les textes SIGNÉS, jamais
  // reformulés. Celui des compléments se lit une fois, au-dessus des actions.
  const pauseDe = new Map((pauses ?? []).map((p) => [p.actionId, p.texte]));
  const complementsEnPause = [...pauseDe.values()].includes('complements');
  // LES TROIS PLANS ([[D-384]] §2-§4) : seulement ceux que la route sert — drapeau
  // ouvert, version créée sous la garde étendue ([[D-386]]), action ferme. Une
  // action absente de la liste garde son plan minimal seul, sans intitulé.
  const plansDe = new Map((troisPlans ?? []).map((p) => [p.actionId, p]));

  return (
    <>
      {/* LES ACTIONS — les trois, et plus « la première ». Le constructeur en
          fait saisir jusqu'à trois ; le portail n'en servait qu'une, élue par
          l'ordre d'insertion ([[D-191]]). */}
      {/* `data-detail-protocole` : le banc de concordance de l'imprimable compare
          ces blocs entre l'accueil et la page imprimable ([[D-392]] §5). */}
      {vue.actions.length > 0 && (
        <div data-detail-protocole="actions" className="space-y-2.5">
          <p ref={titreRef} tabIndex={-1} className="text-xs font-semibold uppercase tracking-wide text-primary">
            {vue.actions.length > 1 ? 'Vos actions' : 'Votre action'}
          </p>
          {complementsEnPause && (
            <p role="status" className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground">
              {TEXTE_PAUSE_COMPLEMENTS}
            </p>
          )}
          {vue.actions.map((action) => (
            <div
              key={action.actionId}
              className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 break-inside-avoid"
            >
              <p className="text-base font-medium text-foreground">{action.title}</p>
              {pauseDe.has(action.actionId) && (
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-foreground">En pause</p>
              )}
              {/* Défense en profondeur : une action en attente ou en pause garde
                  son régime actuel, même si la route servait ses plans (§3). */}
              <PlansDeLAction
                plans={action.interventionStatus || pauseDe.has(action.actionId) ? undefined : plansDe.get(action.actionId)}
                minimalPlan={action.minimalPlan}
              />
              {pauseDe.get(action.actionId) === 'element' && (
                <p className="mt-2 text-sm text-foreground border-t border-primary/20 pt-2">{TEXTE_PAUSE_ELEMENT}</p>
              )}
              {pauseDe.get(action.actionId) === 'avis_rendu' && (
                <p className="mt-2 text-sm text-foreground border-t border-primary/20 pt-2">{TEXTE_PAUSE_AVIS_RENDU}</p>
              )}
              {/* UNE INTERVENTION NON FERME NE SE LIT JAMAIS COMME UN CONSEIL.
                  La phrase vient du contrat, jamais de la cible d'attente du
                  praticien : « ferritine » est son vocabulaire, « votre bilan »
                  celui du patient (`D-056`, arbitrage 5). */}
              {action.attente && (
                <p className="mt-2 text-sm text-foreground/80 border-t border-primary/20 pt-2">
                  {action.attente}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* LE CRITÈRE À TROIS SEMAINES — servi dans le JSON depuis toujours, rendu
          par aucun écran jusqu'ici. C'est ce que le patient et son praticien
          regarderont ensemble : le lui cacher faisait du point d'étape une
          évaluation dont lui seul ignorait la règle. */}
      {vue.followUpCriterion && (
        <div data-detail-protocole="critere" className="rounded-xl border border-border px-4 py-3 break-inside-avoid">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ce qu’on regardera ensemble à trois semaines
          </p>
          <p className="mt-1 text-sm text-foreground">{vue.followUpCriterion}</p>
        </div>
      )}
    </>
  );
}

/**
 * QUAND RALENTIR OU DEMANDER AVIS ([[D-349]], lettre bd) — le texte ACCEPTÉ,
 * jamais reformulé. Le parent décide s'il est servi (`encartConduite`).
 */
export function EncartConduite() {
  return (
    <section aria-labelledby="encart-conduite-titre" className="rounded-xl border border-border px-4 py-3 space-y-2 break-inside-avoid">
      <h3 id="encart-conduite-titre" className="text-sm font-semibold text-foreground">
        {TITRE_ENCART_CONDUITE}
      </h3>
      {PARAGRAPHES_ENCART_CONDUITE.map((paragraphe) => (
        <p key={paragraphe} className="text-sm text-foreground">
          {paragraphe}
        </p>
      ))}
    </section>
  );
}

/**
 * Sans plans servis : le plan minimal seul, sans intitulé, comme avant. Avec :
 * « Selon votre journée : » puis, dans cet ordre, les trois plans sous leurs
 * intitulés validés ([[D-384]] §2). Aucune couleur, aucun chiffre, aucun rang :
 * le patient choisit seul, et rien n'est enregistré (§1).
 */
function PlansDeLAction({ plans, minimalPlan }: { plans: TroisPlansAction | undefined; minimalPlan: string }) {
  if (!plans) return <p className="mt-1 text-sm text-muted-foreground">{minimalPlan}</p>;
  const lignes = [
    ['idealPlan', plans.idealPlan],
    ['minimalPlan', minimalPlan],
    ['rescuePlan', plans.rescuePlan],
  ] as const;
  return (
    <div className="mt-1 space-y-1 text-sm">
      <p className="text-muted-foreground">{CHAPEAU_TROIS_PLANS}</p>
      <dl className="space-y-1">
        {lignes.map(([cle, texte]) => (
          <div key={cle}>
            <dt className="font-medium text-foreground">{INTITULES_TROIS_PLANS[cle]}</dt>
            <dd className="text-muted-foreground">{texte}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
