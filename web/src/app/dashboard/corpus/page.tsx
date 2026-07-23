import { AtelierCorpusPanel } from '@/components/corpus/AtelierCorpusPanel';
import { AtelierVoieRapide } from '@/components/corpus/AtelierVoieRapide';

// Atelier corpus v1 (D-004) — poste de revue des claims du corpus scientifique.
// C'est la surface qui porte la signature praticien D-003 : un claim ingéré
// reste EN_ATTENTE_VALIDATION — donc invisible du moteur clinique — tant qu'il
// n'a pas été validé ici, verbatim source sous les yeux.
export const metadata = { title: 'Wellneuro — Atelier corpus' };

export default function CorpusPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.06em] text-solar-ink">
          Corpus scientifique · claims sourcés
        </p>
        <h2 className="font-display text-3xl font-bold tracking-[-0.02em] text-foreground">
          Atelier corpus
        </h2>
        <p className="mt-1 text-base text-muted-foreground">
          Chaque claim est une affirmation rédigée par IA à partir d&apos;un verbatim de
          cours, contre-vérifiée par une seconde IA — et ne sert la clinique qu&apos;une
          fois validée ici, source à l&apos;appui.
        </p>
      </div>

      <AtelierVoieRapide />

      <AtelierCorpusPanel />
    </div>
  );
}
