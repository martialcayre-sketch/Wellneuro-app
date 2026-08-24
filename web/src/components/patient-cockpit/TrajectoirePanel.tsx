'use client';

import { useEffect, useMemo, useState } from 'react';
import type { JalonMomentum, TendanceMomentum } from '@/lib/equilibre/types';
import type { ModeVieDate } from '@/lib/equilibre/modeVie';
import type { EtatDateTrajectoire } from '@/app/api/praticien/trajectoire/route';
import { rattacherReperesAuxCycles, type Trajectoire } from '@/lib/protocol/trajectoire';
import type { MedianesCabinet } from '@/lib/protocol/cabinet';
import { deriverEpisodeBandeau } from '@/lib/trajectoire-partagee/contrat';
import { Badge } from '@/components/ui/Badge';
import { SpiraleEpisodes } from '@/components/ui/SpiraleEpisodes';
import { ModeDeViePanel } from '@/components/patient-cockpit/ModeDeViePanel';
import { MomentumPanel } from '@/components/patient-cockpit/MomentumPanel';
import { EstimeMesurePanel } from '@/components/patient-cockpit/EstimeMesurePanel';
import { OrientationPanel } from '@/components/patient-cockpit/OrientationPanel';
import { LectureEtatPassePanel } from '@/components/copilote/LectureEtatPassePanel';
import { BESOINS } from '@/lib/equilibre/constants';
import { MENTION_NATURE_INDICE_GLOBAL } from '@/lib/equilibre/natureIndiceGlobal';
import { resoudreJalonDu } from '@/lib/protocol/jalonDu';
import { questionnairesCiblesPourPriorite } from '@/lib/protocol/repassationCiblee';
import { CATALOGUE_DEFINITIONS } from '@/lib/bibliotheque';

// Fiche-trajectoire praticien (C2B LOT-09, registre A8) — LECTURE SEULE.
// « La Spirale comme index temporel » : une liste de repères datés navigable,
// jamais une courbe (A6). Un jalon sans couverture est « non mesuré » (A8-2,
// jamais un 0) ; deux cycles de versionScore différents sont « non comparables »
// (A8-3, jamais de delta). Le comparateur ne s'active qu'à partir de 2 cycles
// (A8-5-ii) et présente des VALEURS côte à côte — il ne calcule aucun écart
// inter-cycles, qui serait une mesure dérivée nouvelle et non sourcée.

const ORDRE_JALONS: readonly JalonMomentum[] = ['T0', 'J21', 'J42', 'J90'] as const;

const LABEL_JALON: Record<JalonMomentum, string> = { T0: 'T0', J21: 'J21', J42: 'J42', J90: 'J90' };

const LABEL_TENDANCE: Record<TendanceMomentum, string> = {
  hausse: 'en hausse',
  stable: 'stable',
  baisse: 'en baisse',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Arrondi d'AFFICHAGE seulement — la donnée (`MomentumBesoin.delta`) reste la
// soustraction brute. Un mouvement réel ne s'affiche jamais « 0 » : en deçà du
// centième, la valeur passe en chiffres significatifs plutôt que d'être écrasée.
function formatCouverture(valeur: number): string {
  if (valeur !== 0 && Math.abs(valeur) < 0.005) {
    return valeur.toLocaleString('fr-FR', { maximumSignificantDigits: 2 });
  }
  return valeur.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}

export function TrajectoirePanel({
  trajectoire,
  idPatient,
  nomComplet,
  emailPatient,
  modeViePresent,
  modeVieT0CycleCourant,
  needIdsPriorite,
}: {
  trajectoire: Trajectoire | null;
  idPatient?: string;
  /** Identité affichée en tête de la fiche-trajectoire (maquette 5.0). */
  nomComplet?: string;
  /** Email du patient — seule clé acceptée par `packs/assign`. Absent : le
   *  panneau d'orientation reste en lecture seule, sans bouton. */
  emailPatient?: string;
  /** Mode de vie au présent (LOT-02) — undefined : appelant sans ce canal,
   *  le panneau n'est pas rendu ; null : non mesuré, l'état est affiché. */
  modeViePresent?: ModeVieDate | null;
  /** Fantôme au T0 du cycle courant. */
  modeVieT0CycleCourant?: ModeVieDate | null;
  /**
   * Besoins fondant la priorité sélectionnée (LOT-07) — alimente la
   * proposition de re-passation ciblée au jalon. Absent ou vide : aucun bloc.
   */
  needIdsPriorite?: number[];
}) {
  // Index de repère sélectionné. Depuis SP-CONV LOT-03, la sélection n'est
  // plus une simple mise en avant : elle pilote la lecture datée `asOf`
  // (mécanique SP-TT, panneau partagé avec le copilote) — « cliquer un tour
  // recharge la fiche telle qu'elle était à cette date », en lecture seule
  // stricte. Sans `idPatient`, l'index reste une navigation visuelle.
  const [repereActif, setRepereActif] = useState<number | null>(null);

  const reperes = useMemo(
    () => rattacherReperesAuxCycles(trajectoire?.index ?? [], trajectoire?.cycles ?? []),
    [trajectoire],
  );

  const repereSelectionne = repereActif === null ? null : (reperes[repereActif] ?? null);
  const cycleSelectionne = repereSelectionne?.cycleId ?? null;

  // Canal fiche (LOT-02/03) : les panneaux mode de vie / momentum / estimé ne
  // se montent que depuis la fiche — les autres montages restent inchangés.
  const canalFiche = modeViePresent !== undefined;

  // Repère de cabinet (A6-R2, LOT-03) : agrégat descriptif, lu une fois par
  // fiche. Un échec de lecture laisse simplement la ligne médiane absente.
  const [cabinet, setCabinet] = useState<MedianesCabinet | null>(null);
  useEffect(() => {
    if (!idPatient || !canalFiche) return;
    let annule = false;
    fetch(`/api/praticien/cabinet-momentum?idPatient=${encodeURIComponent(idPatient)}`)
      .then((r) => r.json())
      .then((payload: { ok?: boolean; cabinet?: MedianesCabinet }) => {
        if (!annule && payload?.ok) setCabinet(payload.cabinet ?? null);
      })
      .catch(() => {});
    return () => {
      annule = true;
    };
  }, [idPatient, canalFiche]);

  // ── Re-passation CIBLÉE au jalon (LOT-07, `D-058`) ────────────────────────
  //
  // Proposée seulement quand un jalon POST-T0 est dans sa fenêtre : proposer
  // une re-mesure hors fenêtre daterait la lecture d'un moment sans jalon. La
  // cible vient des besoins qui FONDENT la priorité (`needIds` →
  // `BESOIN_SOURCES`), jamais du pack entier — c'est ce que la re-passation
  // ciblée remplace. Le geste rejoint la file d'envoi ; RIEN ne part d'ici.
  const jalonDuRepassation = useMemo(() => {
    const du = resoudreJalonDu(trajectoire ?? null, new Date());
    return du.statut === 'du' && du.jalon !== 'T0' ? du.jalon : null;
  }, [trajectoire]);
  const ciblesRepassation = useMemo(
    () => questionnairesCiblesPourPriorite(needIdsPriorite ?? []),
    [needIdsPriorite],
  );
  const [ajouts, setAjouts] = useState<Record<string, 'en_cours' | 'ajoute' | 'erreur'>>({});
  const [erreursAjout, setErreursAjout] = useState<Record<string, string>>({});
  const ajouterALaFile = async (qid: string) => {
    if (!emailPatient) return;
    setAjouts(prev => ({ ...prev, [qid]: 'en_cours' }));
    setErreursAjout(prev => {
      const { [qid]: _retiree, ...reste } = prev;
      return reste;
    });
    try {
      const response = await fetch('/api/praticien/file-envoi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailPatient, qids: [qid] }),
      });
      // MÊME contrat que `OrientationPanel` : la route rend
      // `MutateFileEnvoiResponse { success, error? }` — pas `ok`. Lire `ok`
      // rendait tout ajout réussi comme un échec (revue LOT-07, B3), et le
      // motif d'un vrai refus (« Dossier clos », etc.) n'était jamais affiché.
      const payload = (await response.json()) as { success?: boolean; error?: string };
      if (response.ok && payload.success) {
        setAjouts(prev => ({ ...prev, [qid]: 'ajoute' }));
      } else {
        setAjouts(prev => ({ ...prev, [qid]: 'erreur' }));
        if (payload.error) {
          const motif = payload.error;
          setErreursAjout(prev => ({ ...prev, [qid]: motif }));
        }
      }
    } catch {
      setAjouts(prev => ({ ...prev, [qid]: 'erreur' }));
    }
  };

  // État daté du mode de vie (LOT-02) : recalculé côté serveur au repère
  // sélectionné (`etatAu`, même doctrine que SP-TT — jamais un curseur libre).
  const dateSelectionnee = repereSelectionne?.date ?? null;
  const [etatDate, setEtatDate] = useState<EtatDateTrajectoire | null>(null);
  const [lectureEtatDate, setLectureEtatDate] = useState<'aucune' | 'chargement' | 'chargee' | 'erreur'>('aucune');
  useEffect(() => {
    if (!idPatient || !dateSelectionnee) {
      setEtatDate(null);
      setLectureEtatDate('aucune');
      return;
    }
    let annule = false;
    setLectureEtatDate('chargement');
    fetch(
      `/api/praticien/trajectoire?idPatient=${encodeURIComponent(idPatient)}&etatAu=${encodeURIComponent(dateSelectionnee)}`,
    )
      .then((r) => r.json())
      .then((payload: { ok?: boolean; etatDate?: EtatDateTrajectoire }) => {
        if (annule) return;
        if (!payload?.ok) {
          setEtatDate(null);
          setLectureEtatDate('erreur');
          return;
        }
        setEtatDate(payload.etatDate ?? null);
        setLectureEtatDate('chargee');
      })
      .catch(() => {
        if (!annule) {
          setEtatDate(null);
          setLectureEtatDate('erreur');
        }
      });
    return () => {
      annule = true;
    };
  }, [idPatient, dateSelectionnee]);

  // En-tête d'identité (maquette 5.0, écran Fiche-trajectoire) : « {nom} —
  // épisode N ». Sans cycle confirmé, l'identité seule — aucun épisode n'est
  // affirmé. Sans identité fournie, le titre historique demeure.
  const cycles = trajectoire?.cycles ?? [];
  const episodeBandeau = useMemo(() => deriverEpisodeBandeau(cycles, new Date()), [cycles]);
  const titre = nomComplet
    ? episodeBandeau
      ? `${nomComplet} — épisode ${episodeBandeau.numeroEpisode}`
      : nomComplet
    : 'Fiche-trajectoire — repères datés';

  return (
    <section aria-label="Fiche-trajectoire" className="rounded-xl border border-border bg-surface p-4">
      <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
        Fiche-trajectoire · identité patient durable
      </p>
      <h3 className="mt-1 font-display text-lg font-bold tracking-[-0.02em] text-foreground">{titre}</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        La Spirale indexe les jalons de mesure confirmés (lecture seule) — cliquer un repère relit la fiche telle
        qu’elle était à cette date. Les points d’étape J7/J14/J21 (pilotage) n’y figurent pas — seuls les jalons de
        mesure T0/J21/J42/J90.
      </p>

      {cycles.length > 0 && (
        <ul aria-label="Épisodes" className="mt-2 flex flex-wrap gap-2">
          {cycles.map((cycle, position) => (
            <li key={cycle.cycleId}>
              <Badge variant={position === cycles.length - 1 ? 'info' : 'neutral'}>
                Épisode {position + 1} · T0 le {formatDate(cycle.dateT0)}
                {cycle.momentum
                  ? ` · momentum ${LABEL_TENDANCE[cycle.momentum.tendance]} (écart ${Math.abs(cycle.momentum.delta)})`
                  : ''}
              </Badge>
            </li>
          ))}
        </ul>
      )}

      {reperes.length > 0 && (
        <div className="mt-3 flex flex-wrap items-start gap-x-6 gap-y-3">
          {/* La Spirale navigable double les boutons texte : même sélection,
              même suture time-travel — jamais la géométrie seule (A5-R1). */}
          <div className="flex flex-col items-center gap-1">
            <SpiraleEpisodes
              reperes={reperes}
              cycles={cycles}
              taille={172}
              interactive
              indexActif={repereActif}
              onSelectionRepere={(position) =>
                setRepereActif(position === null ? null : repereActif === position ? null : position)
              }
            />
            <p className="max-w-[13rem] text-center text-2xs text-muted-foreground">
              Un arc = un jalon confirmé. Menthe : épisodes passés · indigo : épisode en cours · point solaire :
              aujourd’hui.
            </p>
          </div>

          <nav aria-label="Index de la Spirale" className="min-w-[14rem] flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Index de la Spirale</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {reperes.map((repere, position) => {
                const actif = repereActif === position;
                return (
                  <li key={`${repere.milestone}-${repere.date}-${position}`}>
                    <button
                      type="button"
                      aria-pressed={actif}
                      onClick={() => setRepereActif(actif ? null : position)}
                      className={`min-h-11 rounded-lg border px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
                        actif
                          ? 'border-primary bg-primary/10 font-semibold text-foreground'
                          : 'border-border text-muted-foreground hover:bg-muted/40'
                      }`}
                    >
                      {LABEL_JALON[repere.milestone]} · {formatDate(repere.date)}
                    </button>
                  </li>
                );
              })}
            </ul>
            <p role="status" className="mt-2 text-xs text-muted-foreground">
              {repereSelectionne === null
                ? 'Sélectionnez un repère pour relire la fiche telle qu’elle était à cette date.'
                : cycleSelectionne === null
                  ? `Repère ${LABEL_JALON[repereSelectionne.milestone]} du ${formatDate(repereSelectionne.date)} — antérieur à tout épisode T0 confirmé, aucun cycle ne lui est rattaché.`
                  : `Repère ${LABEL_JALON[repereSelectionne.milestone]} du ${formatDate(repereSelectionne.date)} — cycle mis en avant ci-dessous, état daté recalculé.`}
            </p>
          </nav>
        </div>
      )}

      {/* Mode de vie au présent (LOT-02) — uniquement hors lecture datée, et
          seulement si l'appelant fournit le canal (la fiche) ; les autres
          montages de TrajectoirePanel restent inchangés. */}
      {repereSelectionne === null && canalFiche && (
        <div className="mt-3 space-y-3">
          <ModeDeViePanel
            modeVie={modeViePresent ?? null}
            modeVieT0={modeVieT0CycleCourant ?? null}
            legendeDate="aujourd’hui"
            legendeT0={
              cycles.length > 0 ? `T0 (${formatDate(cycles[cycles.length - 1].dateT0)})` : undefined
            }
          />
          {/* Momentum en courbe + estimé↔mesuré (A6-R2, LOT-03) — cycle
              courant ; le repère cabinet arrive par sa propre lecture. */}
          {cycles.length > 0 && (
            <MomentumPanel
              cycle={cycles[cycles.length - 1]}
              cabinet={cabinet}
              libelle={`épisode ${cycles.length}`}
            />
          )}
          <EstimeMesurePanel />
          {/* Orientation NNPP2 (LOT-06) — au présent seulement. Une
              recommandation d'exploration se lit sur l'état courant du dossier ;
              l'afficher en lecture datée la ferait passer pour ce que la table
              proposait à cette date-là, ce qu'aucun calcul ne dit ici. */}
          {idPatient && <OrientationPanel idPatient={idPatient} emailPatient={emailPatient} />}
        </div>
      )}

      {/* Suture time-travel (SP-CONV LOT-03, D6) : le repère sélectionné pilote
          le panneau de lecture datée — mécanique SP-TT partagée avec le
          copilote (asOf, lecture seule stricte, note horodatée au présent).
          LOT-02 : l'état daté du mode de vie est recalculé au même repère. */}
      {idPatient && repereSelectionne && (
        <div className="mt-3 space-y-3">
          <LectureEtatPassePanel
            idPatient={idPatient}
            repereInitial={repereSelectionne.date}
            masquerSelecteur
            onRetourPresent={() => setRepereActif(null)}
          />
          {lectureEtatDate === 'chargement' ? (
            <p role="status" className="text-xs text-muted-foreground">
              Recalcul de l’état daté du mode de vie...
            </p>
          ) : lectureEtatDate === 'erreur' ? (
            <p role="status" className="text-xs text-status-warning">
              L’état daté du mode de vie n’a pas pu être lu — l’index et la lecture datée ci-dessus restent valables.
            </p>
          ) : etatDate ? (
            <ModeDeViePanel
              modeVie={etatDate.modeVie}
              modeVieT0={etatDate.modeVieT0}
              legendeDate={`au ${formatDate(etatDate.date)}`}
              legendeT0={
                cycleSelectionne
                  ? (() => {
                      const cycle = cycles.find((candidat) => candidat.cycleId === cycleSelectionne);
                      return cycle ? `T0 (${formatDate(cycle.dateT0)})` : undefined;
                    })()
                  : undefined
              }
            />
          ) : null}
          {/* Momentum du cycle documenté par le repère lu (A6-R2, LOT-03). */}
          {canalFiche && cycleSelectionne && (
            (() => {
              const position = cycles.findIndex((candidat) => candidat.cycleId === cycleSelectionne);
              return position >= 0 ? (
                <MomentumPanel cycle={cycles[position]} cabinet={cabinet} libelle={`épisode ${position + 1}`} />
              ) : null;
            })()
          )}
        </div>
      )}

      {!trajectoire || trajectoire.cycles.length === 0 ? (
        <p className="mt-3 text-base text-muted-foreground">Aucun épisode confirmé pour l’instant.</p>
      ) : (
        <div className="mt-3 space-y-4">
          {/* [[D-108]] — même exigence qu'en fiche praticien : les jalons
              ci-dessous affichent le total de « Mon équilibre », qui n'a pas
              d'interprétation clinique ([[D-106]], `DC-22`). Le praticien est
              précisément celui qui pourrait le lire comme un score. */}
          <p className="text-xs text-muted-foreground">{MENTION_NATURE_INDICE_GLOBAL}</p>
          {trajectoire.cycles.map((cycle) => {
            const misEnAvant = cycleSelectionne === cycle.cycleId;
            return (
              <div
                key={cycle.cycleId}
                aria-current={misEnAvant ? 'true' : undefined}
                className={`rounded-lg border p-3 ${misEnAvant ? 'border-primary bg-primary/5' : 'border-border/60'}`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">
                    Cycle depuis le {formatDate(cycle.dateT0)}
                    {/* Jamais la couleur seule : la mise en avant est aussi écrite. */}
                    {misEnAvant && <span className="text-primary"> · repère sélectionné</span>}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    version de score : {cycle.versionScore ?? 'inconnue'}
                  </span>
                </div>
                <ul className="mt-2 space-y-1">
                  {cycle.jalons.map((jalon) => (
                    <li key={jalon.jalon} className="text-base text-muted-foreground">
                      <span className="font-medium text-foreground">{LABEL_JALON[jalon.jalon]}</span>{' '}
                      {jalon.mesure && jalon.valeur !== null && jalon.date ? (
                        <>· indice {jalon.valeur} · {formatDate(jalon.date)}</>
                      ) : (
                        <span className="italic">· jalon non mesuré</span>
                      )}
                    </li>
                  ))}
                </ul>
                {cycle.momentum && (
                  <p className="mt-2 text-base text-foreground">
                    Momentum T0 → dernier jalon mesuré :{' '}
                    <span className="font-medium">{LABEL_TENDANCE[cycle.momentum.tendance]}</span>{' '}
                    {/* L'unité est nommée : l'écart par besoin, trois lignes plus
                        bas, est sur l'échelle de couverture 0–1 — deux « écart »
                        nus se liraient comme comparables (revue LOT-07, M4). */}
                    <span className="text-muted-foreground">
                      (écart {Math.abs(cycle.momentum.delta)} — indice 0–100)
                    </span>
                  </p>
                )}
                {/* Momentum PAR BESOIN (LOT-07, D-058). Interdits de rendu : un
                    besoin non re-mesuré est nommé tel quel, jamais « stable » ;
                    et le MOTIF est toujours restitué (DC-34/DC-35) — un delta,
                    qualifié ou non, ne s'affiche jamais comme une tendance nue,
                    et les deux jalons comparés sont nommés. */}
                {cycle.momentumParBesoin.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Momentum par besoin
                    </p>
                    <ul className="mt-1 space-y-1.5">
                      {cycle.momentumParBesoin.map((ligne) => {
                        const libelle = BESOINS.find(b => b.id === ligne.besoin)?.libellePraticien
                          ?? `Besoin ${ligne.besoin}`;
                        return (
                          <li key={ligne.besoin} className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">{libelle}</span>
                            {ligne.mesure && ligne.depart && ligne.arrivee && ligne.delta !== null && (
                              <>
                                {' '}· couverture {formatCouverture(ligne.depart.couverture)}{' '}
                                ({ligne.depart.jalon}) → {formatCouverture(ligne.arrivee.couverture)}{' '}
                                ({ligne.arrivee.jalon}) · écart{' '}
                                {ligne.delta > 0 ? `+${formatCouverture(ligne.delta)}` : formatCouverture(ligne.delta)}
                                {' '}— échelle de couverture 0–1
                              </>
                            )}
                            <span className="block text-xs italic">{ligne.motif}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}

          {/* Re-passation ciblée (LOT-07) : proposition au jalon dû, dérivée des
              besoins de la priorité — jamais le pack entier. Le bouton pose
              l'instrument dans la file d'envoi ; rien ne part d'ici, l'envoi
              reste le geste praticien de la Bibliothèque. */}
          {jalonDuRepassation && ciblesRepassation.length > 0 && emailPatient && (
            <div className="rounded-lg bg-muted/40 p-3 text-base">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Re-passation ciblée — jalon {jalonDuRepassation}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Instruments visés par la priorité du protocole. L’ajout pose l’instrument dans la
                file d’envoi ; rien n’est envoyé au patient depuis cet écran.
              </p>
              <ul className="mt-2 space-y-1">
                {ciblesRepassation.map((qid) => (
                  <li key={qid} className="text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-foreground">
                        {CATALOGUE_DEFINITIONS[qid]?.titre ?? qid}
                      </span>
                      {ajouts[qid] === 'ajoute' ? (
                        <span className="text-muted-foreground">Dans la file d’envoi</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void ajouterALaFile(qid)}
                          disabled={ajouts[qid] === 'en_cours'}
                          className="min-h-9 rounded-lg border border-border px-3 py-1 text-xs font-medium hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-50"
                        >
                          {ajouts[qid] === 'erreur' ? 'Réessayer l’ajout' : 'Ajouter à la file d’envoi'}
                        </button>
                      )}
                    </div>
                    {/* Le motif du refus vient de la route (« Dossier clos. », …)
                        — un échec muet ferait recliquer sans comprendre. */}
                    {ajouts[qid] === 'erreur' && (
                      <p role="status" className="mt-1 text-xs text-status-warning">
                        {erreursAjout[qid] ?? 'L’ajout à la file d’envoi a échoué. Réessayez.'}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Comparateur multi-épisodes — s'active à partir de 2 cycles (A8-5-ii). */}
          <div className="rounded-lg bg-muted/40 p-3 text-base">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Comparaison multi-épisodes</p>
            {trajectoire.comparaison.disponible ? (
              <>
                <p className="mt-1 text-foreground">
                  {trajectoire.cycles.length} cycles comparables (même version de score) — repères présentés côte à
                  côte.
                </p>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[20rem] border-collapse text-left text-sm">
                    <caption className="sr-only">
                      Valeurs des jalons de mesure, cycle par cycle. Aucun écart inter-cycles n’est calculé.
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col" className="border-b border-border px-2 py-1 font-medium text-muted-foreground">
                          Jalon
                        </th>
                        {trajectoire.cycles.map((cycle) => (
                          <th
                            key={cycle.cycleId}
                            scope="col"
                            className="border-b border-border px-2 py-1 font-medium text-foreground"
                          >
                            Cycle du {formatDate(cycle.dateT0)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ORDRE_JALONS.map((jalon) => (
                        <tr key={jalon}>
                          <th scope="row" className="px-2 py-1 font-medium text-foreground">
                            {LABEL_JALON[jalon]}
                          </th>
                          {trajectoire.cycles.map((cycle) => {
                            const lecture = cycle.jalons.find((candidat) => candidat.jalon === jalon);
                            const mesure = lecture?.mesure === true && lecture.valeur !== null;
                            return (
                              <td key={`${cycle.cycleId}-${jalon}`} className="px-2 py-1 text-muted-foreground">
                                {mesure ? (
                                  <>indice {lecture?.valeur}</>
                                ) : (
                                  <span className="italic">jalon non mesuré</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Aucun écart n’est calculé entre cycles : seules les valeurs mesurées sont présentées côte à côte.
                </p>
              </>
            ) : trajectoire.comparaison.raison === 'versions_differentes' ? (
              <p className="mt-1 text-foreground">
                Non comparable : les cycles n’utilisent pas la même version de score (score recalibré). Aucun écart
                n’est calculé entre eux.
              </p>
            ) : trajectoire.comparaison.raison === 'version_inconnue' ? (
              <p className="mt-1 text-foreground">
                Non comparable : la version de score d’au moins un cycle est inconnue (mesure antérieure à
                l’enregistrement de la version). Elle n’est pas supposée identique à la version courante, donc aucun
                écart n’est calculé entre ces cycles.
              </p>
            ) : (
              <p className="mt-1 text-muted-foreground">Comparaison disponible dès un 2ᵉ cycle confirmé.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
