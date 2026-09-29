'use client';

import { PatientCard } from '@/components/patient/ui/PatientCard';
import { patientButtonClassName } from '@/components/patient/ui/PatientButton';
import { PatientPageHeader } from '@/components/patient/ui/PatientPageHeader';
import { PatientErrorState } from '@/components/patient/PatientErrorState';
import { dateDeRemise, mentionsDeLaFiche, titreDeLaFiche, TITRE_ESPACE } from './textesFiches';
import { useFichesRemises } from './useFichesRemises';

// L'espace « Fiches remises par mon praticien » ([[D-251]] §8, lot 10) : la
// liste des fiches, la remise en cours de chacune. Aucun texte de fiche ici :
// il se lit sur la page de la fiche, dont l'ouverture acquitte la lecture.
//
// UNE FICHE RETIRÉE OU INDISPONIBLE RESTE DANS LA LISTE, avec sa mention et
// sans lien : rien ne disparaît en silence (§7), et rien ne mène à une page
// sans texte.

export function FichesRemises({ token }: { token: string }) {
  const { etat, recharger } = useFichesRemises(token);

  if (etat.statut === 'chargement') {
    return (
      <PatientCard padding="sm">
        <p className="text-sm text-muted-foreground">Chargement de vos fiches…</p>
      </PatientCard>
    );
  }

  if (etat.statut === 'erreur') {
    return (
      <PatientCard padding="sm">
        <PatientErrorState message={etat.message} onReessayer={etat.definitif ? undefined : recharger} />
      </PatientCard>
    );
  }

  return (
    <div className="space-y-4">
      <PatientCard padding="sm">
        <PatientPageHeader
          title={TITRE_ESPACE}
          subtitle="Les fiches que votre praticien vous a remises avec votre protocole."
        />
      </PatientCard>

      {etat.fiches.length === 0 ? (
        <PatientCard padding="sm">
          <p className="text-base text-muted-foreground">
            Votre praticien ne vous a pas encore remis de fiche. Elles apparaîtront ici dès qu’il l’aura fait.
          </p>
        </PatientCard>
      ) : (
        <ul className="space-y-3">
          {etat.fiches.map(fiche => {
            const date = dateDeRemise(fiche.remiseLe);
            const mentions = mentionsDeLaFiche(fiche);
            return (
              <li key={fiche.idRemise}>
                <PatientCard padding="sm">
                  <h2 className="text-lg font-semibold text-foreground">{titreDeLaFiche(fiche)}</h2>
                  {date && <p className="mt-1 text-sm text-muted-foreground">{date}</p>}
                  {mentions.map(mention => (
                    <p key={mention} className="mt-2 text-sm text-foreground">{mention}</p>
                  ))}
                  {fiche.etat === 'servie' && (
                    <a
                      href={`/portail/${token}/fiches/${encodeURIComponent(fiche.idRemise)}`}
                      className={patientButtonClassName('ghost', 'mt-3')}
                    >
                      Lire la fiche
                    </a>
                  )}
                </PatientCard>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
