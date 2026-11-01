'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { estAncreDeCycle, jalonsDuCycle } from '@/lib/protocol/cycles';
import type { TrajectoireCycle } from '@/lib/protocol/trajectoire';
import type { MedianesCabinet } from '@/lib/protocol/cabinet';
import { texteMotifMomentumCockpit } from '@/lib/equilibre/motifsMomentum';

// Momentum en courbe (A6-R2, décision utilisateur 2026-07-23) — surface
// praticien seule. Chaque point est un jalon RÉELLEMENT mesuré (Δ vs l'ancre
// DU CYCLE LU, nommée à l'écran : `T0`, `T1`, … depuis `D-113`) ;
// un jalon non mesuré est un trou visible (`connectNulls` désactivé), jamais
// un 0 (A8-2). Aucun point interpolé, aucun prolongement prédictif. La
// médiane de cabinet est un repère descriptif (n= toujours affiché, masquée
// sous le seuil de cohorte — A6-2), jamais un objectif. Sous 2 jalons
// mesurés : pas de courbe, un texte de repli.

function signe(valeur: number): string {
  return valeur > 0 ? `+${valeur}` : `${valeur}`;
}

export function MomentumPanel({
  cycle,
  cabinet,
  libelle,
}: {
  /** Cycle lu (courant au présent, sélectionné en vue datée). */
  cycle: TrajectoireCycle | null;
  /** Repère de cabinet — null/absent : ligne médiane non affichée. */
  cabinet?: MedianesCabinet | null;
  /** Ex. « épisode 2 ». */
  libelle?: string;
}) {
  // Le nom de l'ancre du cycle lu. Sans cycle, aucun point n'est tracé : `T0`
  // n'est alors qu'un libellé d'axe, jamais une lecture affirmée.
  const nomAncre = cycle?.ancre ?? 'T0';
  const lectureAncre = cycle?.jalons.find((jalon) => jalon.jalon === nomAncre);
  const valeurAncre =
    lectureAncre && lectureAncre.mesure && lectureAncre.valeur !== null ? lectureAncre.valeur : null;

  const points = jalonsDuCycle(nomAncre).map((jalon) => {
    const lecture = cycle?.jalons.find((candidat) => candidat.jalon === jalon);
    const patient =
      valeurAncre !== null && lecture && lecture.mesure && lecture.valeur !== null
        ? lecture.valeur - valeurAncre
        : null;
    const medianeJalon = cabinet && !cabinet.masque ? cabinet.parJalon.find((m) => m.jalon === jalon) : undefined;
    // L'ancre vaut zéro par construction — c'est son propre point de départ.
    const median = estAncreDeCycle(jalon) && cabinet && !cabinet.masque ? 0 : (medianeJalon?.mediane ?? null);
    return { jalon, patient, cabinet: median, nCabinet: medianeJalon?.n ?? null };
  });

  const jalonsMesures = points.filter((p) => p.patient !== null);
  // [[D-397]] §2 : sur le cycle courant sans jour 0, aucun momentum — ni en
  // texte, ni en courbe. Les jalons lus par le repli restent consultables dans
  // la carte du cycle ; ils ne se soustraient plus à l'ancre ici.
  const sansJourZero = cycle?.motifMomentum === 'sans_jour_zero';
  const courbePossible = !sansJourZero && jalonsMesures.length >= 2;

  return (
    <section
      aria-label="Momentum du cycle"
      className="rounded-lg border border-border/60 p-3"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold text-foreground">Momentum{libelle ? ` — ${libelle}` : ''}</h4>
        <span className="text-xs text-muted-foreground">
          Δ vs {nomAncre} aux jalons mesurés — jamais une prédiction
        </span>
      </div>

      {sansJourZero ? (
        <p className="mt-2 text-base text-muted-foreground">{texteMotifMomentumCockpit('sans_jour_zero', nomAncre)}</p>
      ) : !courbePossible ? (
        <p className="mt-2 text-base text-muted-foreground">
          Courbe indisponible : moins de deux jalons mesurés sur ce cycle. Le momentum textuel des cartes de cycle
          reste la lecture de référence.
        </p>
      ) : (
        <>
          <div role="img" aria-label={`Momentum : ${jalonsMesures.map((p) => `${p.jalon} ${signe(p.patient!)}`).join(', ')}`}>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="jalon" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} />
                {cabinet && !cabinet.masque && (
                  <Line
                    dataKey="cabinet"
                    stroke="var(--muted-foreground)"
                    strokeDasharray="5 5"
                    strokeWidth={1.5}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                )}
                <Line
                  dataKey="patient"
                  stroke="var(--viz-corps)"
                  strokeWidth={2.4}
                  connectNulls={false}
                  isAnimationActive={false}
                  dot={{ r: 4, fill: 'var(--viz-corps)', stroke: 'var(--surface)', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {/* Équivalent textuel complet — la courbe n'est jamais seule. */}
          <table className="sr-only">
            <caption>
              Momentum par jalon de mesure : écart vs {nomAncre}, et médiane du cabinet quand elle est disponible.
            </caption>
            <thead>
              <tr>
                <th scope="col">Jalon</th>
                <th scope="col">Écart vs {nomAncre}</th>
                <th scope="col">Médiane cabinet</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.jalon}>
                  <th scope="row">{p.jalon}</th>
                  <td>{p.patient === null ? 'jalon non mesuré' : signe(p.patient)}</td>
                  <td>{p.cabinet === null ? '—' : `${signe(p.cabinet)}${p.nCabinet ? ` (n=${p.nCabinet})` : ''}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {cabinet &&
        (cabinet.masque ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Repère de cabinet disponible à partir de 5 cycles comparables venant de 5 dossiers distincts —
            aujourd’hui : n={cabinet.nTotal} cycles, {cabinet.nDossiers} dossiers
            {cabinet.versionScoreReference === null ? ' (version de score du cycle inconnue)' : ''}.
          </p>
        ) : cabinet.parJalon.length === 0 && cabinet.jalonsMasques > 0 ? (
          // [[D-298]] §2 : une médiane par jalon venant de moins de cinq
          // dossiers distincts est masquée ; l'écran dit pourquoi elle manque.
          <p className="mt-2 text-xs text-muted-foreground">
            Médianes par jalon masquées : moins de 5 dossiers distincts par jalon (n={cabinet.nTotal} cycles,{' '}
            {cabinet.nDossiers} dossiers, version {cabinet.versionScoreReference}).
          </p>
        ) : cabinet.parJalon.length === 0 ? (
          // La cohorte atteint le seuil, mais aucun jalon n'y contribue : depuis
          // la règle de nouveauté (lot 1), des cycles sans réponse ultérieure
          // n'apportent plus de delta. Annoncer une médiane serait combler par
          // la légende le trou que A6-R2 demande de laisser visible.
          <p className="mt-2 text-xs text-muted-foreground">
            Aucun jalon comparable dans le cabinet pour l’instant (n={cabinet.nTotal} cycles, {cabinet.nDossiers} dossiers, version{' '}
            {cabinet.versionScoreReference}) — les cycles retenus n’ont pas de mesure postérieure à leur ancre.
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            ┄ médiane du cabinet (n={cabinet.nTotal} cycles comparables, {cabinet.nDossiers} dossiers, version{' '}
            {cabinet.versionScoreReference}) — un repère descriptif, jamais une prédiction ni un objectif.
            {cabinet.jalonsMasques > 0 ? ' Les jalons venant de moins de 5 dossiers distincts sont masqués.' : ''}
          </p>
        ))}
    </section>
  );
}
