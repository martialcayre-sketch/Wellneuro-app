import { BibliothequePanel } from '@/components/BibliothequePanel';
import { AssignationsPacksPanel } from '@/components/bibliotheque/AssignationsPacksPanel';
import { listeBibliotheque } from '@/lib/bibliotheque';
import { EnTeteRayon } from '../EnTeteRayon';

export const metadata = { title: 'Wellneuro — Questionnaires' };

// Rayon Questionnaires (D-324 §4) : le catalogue, l'aperçu tel que le patient
// le verra et la file d'envoi, puis les assignations et packs — choisir,
// envoyer et voir ce qui est parti au même endroit. Le catalogue vit en code :
// il est calculé côté serveur et passé au panneau client, qui ne recharge que
// le vivant (patients, file d'envoi, aperçus).
export default function QuestionnairesPage() {
  const entrees = listeBibliotheque();
  const domaines = new Set(entrees.map(e => e.categorie)).size;
  return (
    <div className="flex flex-col gap-6">
      <EnTeteRayon
        surtitre={`Bibliothèque du cabinet · ${entrees.length} instruments · ${domaines} domaines`}
        titre="Questionnaires"
      >
        Chercher, prévisualiser tel que le patient le verra, composer la file d&apos;envoi — un
        seul mail par patient, un seul lien portail.
      </EnTeteRayon>
      <BibliothequePanel entrees={entrees} />

      <section aria-labelledby="rayon-assignations-titre" className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.06em] text-solar-ink">
            Assignations et packs · ce qui est envoyé, et à qui
          </p>
          <h3
            id="rayon-assignations-titre"
            className="font-display text-2xl font-bold tracking-[-0.02em] text-foreground"
          >
            Assignations et packs
          </h3>
          <p className="mt-1 max-w-2xl text-base text-muted-foreground">
            Assigner un questionnaire à un dossier, composer les packs, et relire les assignations
            récentes. Ce rayon a quitté la page d’héritage « Questionnaires &amp; packs » le
            2026-09-16 : la gestion des dossiers, qui y cohabitait, vit désormais dans « Patients ».
          </p>
        </div>

        <AssignationsPacksPanel />
      </section>
    </div>
  );
}
