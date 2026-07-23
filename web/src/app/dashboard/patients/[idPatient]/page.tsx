import { FichePatientPanel } from '@/components/FichePatientPanel';
import { estOngletFiche, type OngletFiche } from '@/lib/praticien/ongletsFiche';
import {
  buildValidationErgoC1Fixture,
  estModeValidationErgoActif,
  type ValidationErgoC1Fixture,
} from '@/lib/clinical-engine/validationErgoFixture';
import { isC5Enabled } from '@/lib/food-compass';
import { C5FeatureProvider } from '@/components/patient-cockpit/C5FeatureProvider';

export default function FichePatientPage({
  params,
  searchParams,
}: {
  params: { idPatient: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  // Harnais de validation ergonomique C1 : actif uniquement en développement
  // local avec `?validationErgo=c1` — en production ce calcul vaut toujours
  // false et la fiche reste strictement identique. La fixture est construite
  // ici, côté serveur : le moteur clinique (canonical.ts → node:crypto) ne
  // peut pas être embarqué dans le bundle client.
  const modeValidationErgo = estModeValidationErgoActif(
    process.env.NODE_ENV,
    searchParams?.validationErgo,
  );
  const fixtureValidationErgo: ValidationErgoC1Fixture | null = modeValidationErgo
    ? buildValidationErgoC1Fixture()
    : null;
  // Deep-link `?onglet=` (ex. `?onglet=trajectoire` depuis la future page
  // Trajectoires) : validé ici côté serveur, toute valeur inconnue est ignorée.
  const ongletBrut = Array.isArray(searchParams?.onglet) ? searchParams.onglet[0] : searchParams?.onglet;
  const ongletInitial: OngletFiche | undefined = estOngletFiche(ongletBrut) ? ongletBrut : undefined;
  return (
    <C5FeatureProvider enabled={isC5Enabled(process.env.WN_C5_ENABLED)}>
      <FichePatientPanel
        idPatient={params.idPatient}
        ongletInitial={ongletInitial}
        fixtureValidationErgo={fixtureValidationErgo}
      />
    </C5FeatureProvider>
  );
}
