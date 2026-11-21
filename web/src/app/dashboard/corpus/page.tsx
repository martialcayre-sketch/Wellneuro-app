import { AtelierCorpus } from '@/components/corpus/AtelierCorpus';
import { EnTeteRayon } from '../bibliotheque/EnTeteRayon';

// Atelier corpus v1 (D-004) — poste de revue des claims du corpus scientifique.
// C'est la surface qui porte la signature praticien D-003 : un claim ingéré
// reste EN_ATTENTE_VALIDATION — donc invisible du moteur clinique — tant qu'il
// n'a pas été validé ici, verbatim source sous les yeux.
// Le titre est le h1 de la page, par l'en-tête commun des rayons (Q1 de
// D-481, complément DOC-13).
export const metadata = { title: 'Wellneuro — Atelier corpus' };

export default function CorpusPage() {
  return (
    <div className="flex flex-col gap-6">
      <EnTeteRayon surtitre="Corpus scientifique · claims sourcés" titre="Atelier corpus">
        Chaque claim est une affirmation rédigée par IA à partir d&apos;un verbatim de
        cours, contre-vérifiée par une seconde IA — et ne sert la clinique qu&apos;une
        fois validée ici, source à l&apos;appui.
      </EnTeteRayon>

      <AtelierCorpus />
    </div>
  );
}
