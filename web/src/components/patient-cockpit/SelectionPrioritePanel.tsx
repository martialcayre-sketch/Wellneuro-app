'use client';

import { useState } from 'react';
import { isGesteCandidatDisponible } from '@/lib/clinical-engine/decisionGuards';
import { BESOINS } from '@/lib/equilibre/constants';
import { questionnairesCiblesPourPriorite } from '@/lib/protocol/repassationCiblee';
import {
  DOMAINES_PRIORITE_LIBRE,
  LIBELLE_PRIORITE_LIBRE_MAX,
  estSelectionLibre,
  isPrioriteLibreOuverte,
  libelleDomainePrioriteLibre,
  libellePrioriteRetenue,
  normaliserLibellePrioriteLibre,
  type DomainePrioriteLibre,
  type PrioriteLibre,
} from '@/lib/clinical-engine/prioriteLibre';
import type { DecisionCard } from '@/lib/clinical-engine/types';

// LE GESTE QUI MANQUAIT — [[D-127]].
//
// Le protocole 21 jours exige une priorité choisie PAR LE PRATICIEN, et aucun
// écran ne permettait de la choisir : `ProtocolMiniBuilder` affichait
// « Protocole indisponible — priorité praticien non sélectionnée » sans dire où
// aller. Ce panneau est le « où aller ».
//
// IL NE DÉCIDE RIEN, IL TRANSMET. L'auteur et l'horodatage sont posés par le
// serveur ; l'empreinte de la carte est recalculée là-bas (`canonical.ts`
// importe `node:crypto`, le navigateur ne sait pas la produire). L'écran envoie
// un candidat et un motif, puis RECHARGE — il ne fabrique pas la carte
// résultante.
//
// LE MOTIF EST OBLIGATOIRE ICI COMME AU SERVEUR, et ce n'est pas de la
// politesse de formulaire : c'est ce que la version de protocole citera, et ce
// qui se relit six semaines plus tard. Le bouton reste donc désactivé tant que
// le motif est vide — la route refuserait de toute façon, mais un refus après
// coup ferait perdre la saisie.

export type EtatSelectionPriorite = 'idle' | 'saving' | 'error';

/**
 * Ce que l'écran transmet : un candidat du moteur, OU une priorité posée par le
 * praticien ([[D-279]]) — domaine et libellé, jamais l'identifiant, que seul le
 * serveur dérive.
 */
export type ChoixPriorite = { candidateId: string } | { prioriteLibre: PrioriteLibre };

/** Valeur du bouton radio « poser une autre priorité » — jamais un `candidateId`. */
const CHOIX_LIBRE = '__priorite_libre__';

// LES BESOINS VISÉS ([[D-338]] §3) : les douze sont offerts (arbitrage du
// 2026-10-22), et l'effet de chaque case se dit avant le choix — un besoin
// sans questionnaire à re-passer ne cible rien, et le cocher sans le savoir
// ferait attendre une re-mesure qui ne viendra pas. Le constat vient du MÊME
// calcul que la re-passation elle-même, jamais d'une liste recopiée.
const BESOINS_SANS_REPASSATION = new Set(
  BESOINS.filter(besoin => questionnairesCiblesPourPriorite([besoin.id]).length === 0).map(besoin => besoin.id),
);

function libelleBesoin(id: number): string {
  return BESOINS.find(besoin => besoin.id === id)?.libellePraticien ?? `Besoin ${id}`;
}

export function SelectionPrioritePanel({
  decisionCard,
  selectionEcartee = false,
  etat,
  erreur,
  onRetenir,
}: {
  decisionCard: DecisionCard | null;
  /**
   * Une sélection consignée a été écartée du calcul parce qu'elle ne tient plus
   * ([[D-127]] §11). NON DÉDUCTIBLE ICI : la carte servie est celle construite
   * sans elle, identique en tout point à celle d'un dossier où personne n'a
   * jamais choisi. Le serveur est le seul à savoir qu'un acte existait.
   */
  selectionEcartee?: boolean;
  etat: EtatSelectionPriorite;
  erreur: string | null;
  onRetenir: (choix: ChoixPriorite, motif: string) => void;
}) {
  const dejaRetenu = decisionCard?.selectedMainPriority ?? null;
  const [ouvert, setOuvert] = useState(false);
  const [candidatChoisi, setCandidatChoisi] = useState<string | null>(null);
  const [domaineLibre, setDomaineLibre] = useState<DomainePrioriteLibre | ''>('');
  const [libelleLibre, setLibelleLibre] = useState('');
  const [besoinsVises, setBesoinsVises] = useState<number[]>([]);
  const [motif, setMotif] = useState('');

  // TROIS SILENCES, ET CHACUN A SON PROPRIÉTAIRE AILLEURS. Pas de carte : la
  // phase n'est pas ouverte. Décision bloquée : « Priorité et limites » l'a déjà
  // dit, avec le motif signé — un second bloc répéterait sans ajouter, et
  // proposerait un choix que `buildDecisionCard` refuserait. Depuis [[D-279]],
  // « aucun candidat » n'est plus un silence : la priorité posée par le
  // praticien reste offerte, et seul un constat de sécurité retire tout geste.
  //
  // ILS PORTENT SUR LE GESTE, JAMAIS SUR LE CONSTAT ([[D-127]] §11). « Il n'y a
  // rien à retenir » et « ce que vous aviez retenu n'est plus servi » sont deux
  // énoncés différents, et le second n'a de propriétaire NULLE PART ailleurs à
  // l'écran : la carte servie est celle construite sans la sélection, donc
  // indiscernable de celle d'un dossier où personne n'a jamais choisi. Une
  // décision bloquée est d'ailleurs le cas où la péremption est la PLUS
  // probable — `DC-12` retire les candidats — et la taire là serait taire
  // l'essentiel.
  if (!decisionCard) return null;

  // DEUX GESTES, DEUX OUVERTURES ([[D-279]]). Choisir un CANDIDAT : décision
  // non bloquée et au moins un candidat classé, la règle de [[D-127]]. Poser
  // une priorité : ouverte tant qu'aucun constat de sécurité n'est présent —
  // sans candidat, et sous abstention pour recueil incomplet. Offerts que le
  // praticien ait déjà retenu une priorité ou non, puisque ce panneau sert
  // aussi à la CHANGER. `isSelectionPrioriteDue` répond à la question voisine
  // (« reste-t-il à faire ? ») depuis les mêmes gardes.
  const gesteCandidat = isGesteCandidatDisponible(decisionCard);
  const gesteLibre = isPrioriteLibreOuverte(decisionCard);
  const gesteDisponible = gesteCandidat || gesteLibre;
  if (!gesteDisponible && !selectionEcartee) return null;

  const libelleRetenu = libellePrioriteRetenue(decisionCard);
  const retenuLibre = estSelectionLibre(dejaRetenu) ? dejaRetenu.libre : null;
  const formulaireVisible = gesteDisponible && (ouvert || dejaRetenu === null);
  const motifRenseigne = motif.trim() !== '';
  const enregistrement = etat === 'saving';
  // Sans candidat à choisir, la priorité posée est le seul geste : elle est
  // pré-choisie, le praticien n'a pas à cocher une option unique.
  const choixCourant = gesteCandidat ? candidatChoisi : CHOIX_LIBRE;
  const libreChoisi = choixCourant === CHOIX_LIBRE;
  const libreRenseigne = domaineLibre !== '' && normaliserLibellePrioriteLibre(libelleLibre) !== '';
  const choixComplet = libreChoisi ? libreRenseigne : choixCourant !== null;

  return (
    <section aria-labelledby="selection-priorite-title" className="mt-4">
      <h3
        id="selection-priorite-title"
        className="text-xs font-semibold text-solar-ink uppercase tracking-[.06em] mb-3"
      >
        Priorité retenue
      </h3>
      <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
        {/* LA PHRASE DE PÉREMPTION — la dette que `D-127` avait nommée sans la
            traiter. Sans elle, le praticien retrouvait « aucune priorité
            retenue » sur un dossier où il en avait retenu une, et rien à
            l'écran ne distinguait ce cas de l'oubli.

            ELLE NE NOMME PAS LE CANDIDAT ÉCARTÉ : il n'est plus classé — c'est
            la raison même de l'écart — et son libellé n'existe donc plus dans
            la carte. Le fabriquer serait citer une règle qui ne se déclenche
            pas.

            ELLE DIT QUE RIEN N'EST EFFACÉ, parce que c'est vrai et parce que
            c'est la question suivante : le fil est append-only, la ligne reste
            en base, et la relecture d'un dossier en rendra compte. */}
        {selectionEcartee && (
          <p
            role="status"
            className="mb-3 rounded-lg border border-status-warning/40 bg-status-warning/10 p-3 text-sm text-status-warning"
          >
            Une priorité avait été retenue sur ce dossier : elle n’est plus applicable et a été
            écartée du calcul. Elle reste consignée — rien n’a été effacé — mais le dossier a
            changé depuis ce choix.
          </p>
        )}
        {gesteDisponible && (dejaRetenu !== null ? (
          <div>
            <p className="text-base font-semibold text-foreground">
              {libelleRetenu ?? 'Priorité retenue'}
            </p>
            {/* La priorité POSÉE se dit telle : son domaine, et qu'elle vient du
                praticien — jamais confondue avec un axe classé par le moteur. */}
            {retenuLibre && (
              <p className="text-sm text-muted-foreground">
                Priorité posée par le praticien — {libelleDomainePrioriteLibre(retenuLibre.domaine)}
              </p>
            )}
            {retenuLibre?.besoinsVises && (
              <p className="text-sm text-muted-foreground">
                Besoins visés : {retenuLibre.besoinsVises
                  .map(id => (BESOINS_SANS_REPASSATION.has(id)
                    ? `${libelleBesoin(id)} (aucun questionnaire à re-passer)`
                    : libelleBesoin(id)))
                  .join(' · ')}
              </p>
            )}
            {/* LE MOTIF EST RE-AFFICHÉ, jamais seulement stocké : c'est la
                moitié de l'acte, et le praticien qui rouvre le dossier six
                semaines plus tard vient d'abord lire pourquoi. */}
            <p className="mt-1 text-base text-muted-foreground">{dejaRetenu.rationale}</p>
            {!ouvert && (
              <button
                type="button"
                onClick={() => {
                  setOuvert(true);
                  setCandidatChoisi(retenuLibre ? CHOIX_LIBRE : dejaRetenu.candidateId);
                  setDomaineLibre(retenuLibre?.domaine ?? '');
                  setLibelleLibre(retenuLibre?.libelle ?? '');
                  // Repris tels quels : retenir à nouveau sans y toucher ne
                  // doit pas les effacer en silence.
                  setBesoinsVises(retenuLibre?.besoinsVises ?? []);
                  setMotif('');
                }}
                className="mt-3 min-h-11 rounded-lg border border-border px-3 py-2 text-sm text-foreground"
              >
                Retenir une autre priorité
              </button>
            )}
          </div>
        ) : (
          <div>
            <p className="text-base text-foreground">
              Aucune priorité n’est retenue pour l’instant : le protocole 21 jours attend ce choix.
            </p>
            {!gesteCandidat && (
              <p className="mt-1 text-sm text-muted-foreground">
                Aucun axe n’est proposé pour ce dossier : posez vous-même la priorité.
              </p>
            )}
          </div>
        ))}

        {formulaireVisible && (
          <form
            className="mt-3 space-y-3"
            onSubmit={event => {
              event.preventDefault();
              if (!choixComplet || !motifRenseigne || enregistrement) return;
              onRetenir(
                libreChoisi
                  ? {
                    prioriteLibre: {
                      domaine: domaineLibre as DomainePrioriteLibre,
                      libelle: libelleLibre,
                      ...(besoinsVises.length > 0 ? { besoinsVises } : {}),
                    },
                  }
                  : { candidateId: choixCourant as string },
                motif.trim(),
              );
            }}
          >
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-foreground">
                Priorité à retenir
              </legend>
              {gesteCandidat && decisionCard.priorityCandidates.map(candidat => (
                <label
                  key={candidat.candidateId}
                  className="flex min-h-11 items-start gap-2 rounded-lg border border-border p-3"
                >
                  <input
                    type="radio"
                    name="priorite-candidate"
                    value={candidat.candidateId}
                    checked={candidatChoisi === candidat.candidateId}
                    onChange={() => setCandidatChoisi(candidat.candidateId)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-medium text-foreground">{candidat.label}</span>
                    {/* Le RANG et le STATUT viennent de la carte : ils disent ce
                        que le moteur a classé, et le praticien décide CONTRE ou
                        AVEC. Les masquer ferait choisir à l'aveugle. */}
                    <span className="block font-mono text-xs text-muted-foreground">
                      rang {candidat.rank} · {candidat.confidence}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">{candidat.rationale}</span>
                  </span>
                </label>
              ))}
              {gesteCandidat && gesteLibre && (
                <label className="flex min-h-11 items-start gap-2 rounded-lg border border-border p-3">
                  <input
                    type="radio"
                    name="priorite-candidate"
                    value={CHOIX_LIBRE}
                    checked={candidatChoisi === CHOIX_LIBRE}
                    onChange={() => setCandidatChoisi(CHOIX_LIBRE)}
                    className="mt-1"
                  />
                  <span className="block text-sm font-medium text-foreground">Poser une autre priorité</span>
                </label>
              )}
              {/* LA PRIORITÉ POSÉE ([[D-279]]) : un domaine pris dans une liste
                  fermée — il range, il ne déclenche rien — et le libellé que le
                  patient lira en tête de son protocole. */}
              {gesteLibre && libreChoisi && (
                <div className="space-y-3 rounded-lg border border-border p-3">
                  <label className="block text-sm font-medium text-foreground">
                    Domaine
                    <select
                      value={domaineLibre}
                      onChange={event => setDomaineLibre(event.target.value as DomainePrioriteLibre | '')}
                      className="mt-1 block min-h-11 w-full rounded-lg border border-border bg-surface p-2 text-sm text-foreground"
                    >
                      <option value="">Choisir un domaine</option>
                      {DOMAINES_PRIORITE_LIBRE.map(domaine => (
                        <option key={domaine.id} value={domaine.id}>{domaine.libelle}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-foreground">
                    Libellé de la priorité
                    <span className="block text-xs font-normal text-muted-foreground">
                      Le patient lira ce texte en tête de son protocole.
                    </span>
                    <input
                      type="text"
                      value={libelleLibre}
                      onChange={event => setLibelleLibre(event.target.value)}
                      maxLength={LIBELLE_PRIORITE_LIBRE_MAX}
                      className="mt-1 block min-h-11 w-full rounded-lg border border-border bg-surface p-2 text-sm text-foreground"
                    />
                  </label>
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium text-foreground">
                      Besoins visés <span className="font-normal text-muted-foreground">(facultatif)</span>
                    </legend>
                    {/* LA DÉRIVE SE DIT AVANT LE GESTE (arbitrage du responsable du
                        2026-10-23) : changer les besoins visés écrit une
                        nouvelle sélection, dont l'horodatage et le motif
                        entrent dans l'empreinte de la carte — le protocole
                        déjà diffusé dérive, comme pour un motif corrigé. */}
                    <p className="text-xs text-muted-foreground">
                      Ils désignent les questionnaires à re-passer au jalon ; aucun calcul ne les lit. Les
                      modifier après la diffusion du protocole, comme modifier le motif, oblige à le
                      diffuser de nouveau.
                    </p>
                    <ul className="grid gap-1 sm:grid-cols-2">
                      {BESOINS.map(besoin => (
                        <li key={besoin.id}>
                          <label className="flex min-h-11 items-start gap-2 rounded-lg border border-border p-2">
                            <input
                              type="checkbox"
                              checked={besoinsVises.includes(besoin.id)}
                              onChange={event => {
                                const coche = event.target.checked;
                                setBesoinsVises(courants => (coche
                                  ? [...courants.filter(id => id !== besoin.id), besoin.id].sort((x, y) => x - y)
                                  : courants.filter(id => id !== besoin.id)));
                              }}
                              className="mt-1"
                            />
                            <span>
                              <span className="block text-sm text-foreground">{besoin.libellePraticien}</span>
                              {BESOINS_SANS_REPASSATION.has(besoin.id) && (
                                <span className="block text-xs text-muted-foreground">
                                  Aucun questionnaire à re-passer pour ce besoin.
                                </span>
                              )}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </fieldset>
                </div>
              )}
            </fieldset>

            {/* Étiquette ENVELOPPANTE, patron `ArbitrageBiologiquePanel` : le
                champ est associé par imbrication, sans dépendre d'un `htmlFor`
                que jsdom relie mal à un `textarea`. L'aide vit dans
                l'étiquette, donc dans le nom accessible du champ. */}
            <label className="block text-sm font-medium text-foreground">
              Pourquoi cette priorité
              <span className="block text-xs font-normal text-muted-foreground">
                Ce motif accompagne la version de protocole et se relit avec elle.
              </span>
              <textarea
                value={motif}
                onChange={event => setMotif(event.target.value)}
                rows={3}
                maxLength={2000}
                className="mt-1 w-full rounded-lg border border-border bg-surface p-2 text-sm text-foreground"
              />
            </label>

            {erreur !== null && (
              <p role="alert" className="text-sm text-status-danger">
                {erreur}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={!choixComplet || !motifRenseigne || enregistrement}
                className="min-h-11 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {enregistrement ? 'Enregistrement…' : 'Retenir cette priorité'}
              </button>
              {dejaRetenu !== null && (
                <button
                  type="button"
                  onClick={() => {
                    setOuvert(false);
                    setMotif('');
                  }}
                  className="min-h-11 rounded-lg border border-border px-3 py-2 text-sm text-foreground"
                >
                  Annuler
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
