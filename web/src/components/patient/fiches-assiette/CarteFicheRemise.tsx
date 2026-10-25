import { PatientCard } from '@/components/patient/ui/PatientCard';
import { patientButtonClassName } from '@/components/patient/ui/PatientButton';
import type { FicheRemiseServie } from '@/lib/fiches-assiette/ficheServie';
import { dateDeRemise, mentionsDeLaFiche, texteDePauseDeLaFiche, titreDeLaFiche } from './textesFiches';

// La carte d'une fiche remise ([[D-251]] §8, lot 10), servie par « Fiches
// remises par mon praticien » et par le rayon « Remis par mon praticien » de
// « Ma bibliothèque » ([[D-357]]). Le niveau du titre suit la page : `h2` sous
// le titre de l'espace, `h3` sous celui d'un rayon.

export function CarteFicheRemise({
  token,
  fiche,
  niveauTitre = 'h2',
}: {
  token: string;
  fiche: FicheRemiseServie;
  niveauTitre?: 'h2' | 'h3';
}) {
  const Titre = niveauTitre;
  const date = dateDeRemise(fiche.remiseLe);
  const mentions = mentionsDeLaFiche(fiche);
  const pause = texteDePauseDeLaFiche(fiche);
  return (
    <PatientCard padding="sm">
      <Titre className="text-lg font-semibold text-foreground">{titreDeLaFiche(fiche)}</Titre>
      {date && <p className="mt-1 text-sm text-muted-foreground">{date}</p>}
      {mentions.map(mention => (
        <p key={mention} className="mt-2 text-sm text-foreground">{mention}</p>
      ))}
      {pause && (
        <>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-foreground">En pause</p>
          <p className="mt-1 text-sm text-foreground">{pause}</p>
        </>
      )}
      {fiche.etat === 'servie' && (
        <a
          href={`/portail/${token}/fiches/${encodeURIComponent(fiche.idRemise)}`}
          className={patientButtonClassName('ghost', 'mt-3')}
        >
          Lire la fiche
        </a>
      )}
    </PatientCard>
  );
}
