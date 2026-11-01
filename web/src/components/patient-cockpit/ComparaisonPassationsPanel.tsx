'use client';

// Deux passations du même instrument, comparées (D-406, fiche H65, porte 20).
// L'écart est dit en points du score, sans bande ni lecture clinique : aucune
// bande de bruit n'est publiée (D-402, lettre v). Textes validés mot pour mot
// par le responsable le 2026-11-01.

import {
  formaterPoints,
  LIBELLES_MOTIF_NON_COMPARAISON,
  phraseEcart,
  type ComparaisonsPassations,
  type PaireComparee,
} from '@/lib/scoring/comparaisonPassations';
import { useChiffresMasques, ValeurMasquee } from '@/components/patient-cockpit/ChiffresMasques';

function formaterDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });
}

function valeur(score: number, maximum: number | null): string {
  return maximum === null ? formaterPoints(score) : `${formaterPoints(score)} / ${formaterPoints(maximum)}`;
}

function lignePaire(paire: PaireComparee): string {
  return (
    `${valeur(paire.a.score, paire.maximum)} le ${formaterDate(paire.a.date)} → ` +
    `${valeur(paire.b.score, paire.maximum)} le ${formaterDate(paire.b.date)} — ${phraseEcart(paire.ecart)}`
  );
}

export function ComparaisonPassationsPanel({ comparaisons }: { comparaisons: ComparaisonsPassations }) {
  const masques = useChiffresMasques();
  const { paires, nonComparees } = comparaisons;

  return (
    <section aria-labelledby="comparaison-passations-titre" className="rounded-xl border border-border bg-surface p-4">
      <h3 id="comparaison-passations-titre" className="text-sm font-semibold text-foreground">
        Deux passations comparées
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Même instrument, même version, deux passations complètes du cycle en cours. L&apos;écart est donné en points
        du score : il ne dit pas si le changement est cliniquement réel.
      </p>
      {paires.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Aucune paire comparable sur ce cycle.</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {paires.map((paire) => (
            <li key={paire.idQuestionnaire} className="text-sm text-foreground" data-comparaison-paire="">
              <span className="font-medium">{paire.titre}</span> :{' '}
              {masques ? <ValeurMasquee /> : lignePaire(paire)}
            </li>
          ))}
        </ul>
      )}
      {nonComparees.length > 0 && (
        <ul className="mt-3 grid gap-1">
          {nonComparees.map((ligne) => (
            <li key={ligne.idQuestionnaire} className="text-xs text-muted-foreground" data-comparaison-non-comparee="">
              {ligne.titre} : deux passations, non comparées — {LIBELLES_MOTIF_NON_COMPARAISON[ligne.motif]}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
