// LA BIBLIOTHÈQUE DES OPTIONS AU COCKPIT, SOUS UN CONSTAT CONFIRMÉ ([[D-480]]
// §1, §8 ; BP-17 PR 6 ; cadrage BIO-PARCOURS v3 `:260`). Surface du praticien,
// sous `WN_BIBLIOTHEQUE_OPTIONS_COCKPIT` éteint : la route des constats ne rend
// ce bloc qu'allumé.
//
// Ce que l'écran dit, et ce qu'il ne dit jamais :
//   - TOUTES les options de l'hypothèse, dans l'ordre des identifiants, aucune
//     mise en avant ; « Ne rien changer, ou surveiller » toujours affiché ;
//   - l'admissibilité n'est pas calculée, aucun contrôle n'est fait — jamais
//     « aucune interaction détectée » ;
//   - un texte non validé ne montre que son état, jamais son contenu (DC-24) ;
//   - aucune prescription n'est autorisée par la bibliothèque.
//
// Composant de présentation : il ne lit rien, il reçoit ce que la route a rendu.
// Les types seulement, depuis le module serveur.

import type { EtatRubriqueAuCockpit, EtatStructureAuCockpit, OptionsAuCockpit } from '@/lib/atelier-bibliotheque-options/cockpit';
import { libelleRenvoi, nomRubriqueOption } from './libelles';

export const AVERTISSEMENT_COCKPIT =
  'Toutes les options de l’hypothèse, sans sélection d’après le dossier. L’admissibilité n’est pas calculée : aucun contrôle de contre-indication, d’interaction, de population ou de dose n’est fait au regard du dossier. La bibliothèque n’autorise aucune prescription.';

export const TOUJOURS_AFFICHE = 'Toujours possible : ne rien changer, ou surveiller.';

/**
 * Le constat confirmé est « à relire » (pièce corrigée ou annulée, prélèvement
 * plus récent, hypothèse sortie de la structure) : le bloc le dit en tête, avant
 * toute option (`wn-reviewer` sur la PR 6, P2-1). Le masquer est un arbitrage
 * laissé au responsable avant l'allumage.
 */
export const CONSTAT_A_RELIRE =
  'Le constat qui confirme cette hypothèse est à relire : relisez-le avant de vous appuyer sur ces options.';

export const MESSAGE_STRUCTURE: Record<Exclude<EtatStructureAuCockpit, 'signee'>, string> = {
  non_signee: 'La bibliothèque des options n’est pas encore signée : aucune option ne s’affiche.',
  signature_rompue:
    'La signature de la bibliothèque ne tient plus (structure retouchée, ou fiches d’usage re-signées sans elle) : aucune option ne s’affiche avant sa re-signature.',
  a_relire:
    'La bibliothèque est à relire : les fiches d’usage ne sont plus celles de sa signature. Aucune option ne s’affiche avant sa re-signature.',
};

export const LIBELLE_RUBRIQUE_NON_VALIDEE: Record<Exclude<EtatRubriqueAuCockpit, 'validee'>, string> = {
  a_valider: 'Texte non encore validé : il ne s’affiche pas.',
  vide: 'Aucun texte saisi.',
  retiree: 'Texte retiré : il ne s’affiche pas.',
  a_relire: 'Texte à relire (structure modifiée) : il ne s’affiche pas.',
  illisible: 'Statut illisible : le texte ne s’affiche pas.',
};

const jour = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric' });

export function OptionsAuCockpitBloc({
  hypotheseCode,
  options,
  constatARelire = false,
}: {
  hypotheseCode: string;
  options: OptionsAuCockpit;
  constatARelire?: boolean;
}) {
  const titre = `options-${hypotheseCode}`;
  return (
    <section aria-labelledby={titre} className="mt-3 rounded-md border border-border p-3">
      <h5 id={titre} className="text-sm font-medium text-foreground">
        Bibliothèque des options
      </h5>
      {constatARelire && <p className="mt-1 text-sm font-medium text-foreground">{CONSTAT_A_RELIRE}</p>}
      {options.lecture === 'echec' ? (
        <p className="mt-1 text-sm text-status-danger">La bibliothèque des options n’a pas pu être lue.</p>
      ) : (
        <>
          <p className="mt-1 text-xs text-muted-foreground">{AVERTISSEMENT_COCKPIT}</p>
          {options.etatStructure !== 'signee' ? (
            <p className="mt-2 text-sm text-muted-foreground">{MESSAGE_STRUCTURE[options.etatStructure]}</p>
          ) : (
            <ListeOptions hypotheseCode={hypotheseCode} options={options} />
          )}
        </>
      )}
      {/* Toujours affiché, quel que soit l'état (cadrage `:260`, NG197 1.2.10). */}
      <p className="mt-2 text-sm text-foreground">{TOUJOURS_AFFICHE}</p>
    </section>
  );
}

function ListeOptions({ hypotheseCode, options }: { hypotheseCode: string; options: Extract<OptionsAuCockpit, { lecture: 'ok' }> }) {
  const liste = options.hypotheses.find(h => h.hypotheseCode === hypotheseCode)?.options ?? [];
  if (liste.length === 0) {
    return <p className="mt-2 text-sm text-muted-foreground">La bibliothèque ne déclare aucune option pour cette hypothèse.</p>;
  }
  return (
    <ul className="mt-2 space-y-3">
      {liste.map(option => (
        <li key={option.id} className="rounded-md border border-border p-3">
          <h6 className="text-sm font-medium text-foreground">{option.id}</h6>
          <p className="text-xs text-muted-foreground">
            Population{option.populations.length > 1 ? 's' : ''} : {option.populations.join(', ')}
          </p>
          <dl className="mt-2 space-y-2">
            {option.rubriques.map(r => (
              <div key={r.rubrique}>
                <dt className="text-xs font-medium text-foreground">{nomRubriqueOption(r.rubrique)}</dt>
                <dd className="text-sm text-foreground">
                  {r.etat === 'validee' && r.texte !== null ? (
                    <>
                      <span className="whitespace-pre-wrap">{r.texte}</span>
                      {r.valideLe && <span className="block text-xs text-muted-foreground">Validé le {jour(r.valideLe)}</span>}
                    </>
                  ) : (
                    <span className="text-muted-foreground">{LIBELLE_RUBRIQUE_NON_VALIDEE[r.etat === 'validee' ? 'illisible' : r.etat]}</span>
                  )}
                  <span className="block text-xs text-muted-foreground">
                    {r.renvois.length > 0 ? `Sources : ${r.renvois.map(libelleRenvoi).join(' · ')}` : 'Aucune source déclarée.'}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </li>
      ))}
    </ul>
  );
}
