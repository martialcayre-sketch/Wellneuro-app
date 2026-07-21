import { notFound } from 'next/navigation';
import { isG5GooglePatientEnabled } from '@/lib/portail/featureFlag';
import { MESSAGE_ACCES_GOOGLE_REFUSE } from '@/lib/portail/googleIdentite';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { PatientInlineMessage } from '@/components/patient/ui/PatientInlineMessage';
import { PatientPageHeader } from '@/components/patient/ui/PatientPageHeader';
import { patientButtonClassName } from '@/components/patient/ui/PatientButton';

// Entrée du portail SANS jeton — gate G5 (IDP2 LOT-03c).
//
// C'est la page qui manquait : jusqu'ici, un patient ne pouvait entrer qu'avec
// un lien reçu (permanent ou magique). Sans lien sous la main, il n'y avait
// aucune porte. Google en ouvre une, en s'appuyant sur ce que le patient a
// déjà : le contrôle de sa boîte e-mail.
//
// `force-dynamic` n'est pas décoratif : sans lui, Next prérendrait la page au
// build et y figerait la valeur du drapeau de ce moment-là. Un drapeau qu'il
// faut redéployer pour changer n'en est pas un.
export const dynamic = 'force-dynamic';

export default function ConnexionPortailPage({
  searchParams,
}: {
  searchParams?: { etat?: string };
}) {
  if (!isG5GooglePatientEnabled()) notFound();

  // Le paramètre ne prend qu'une valeur : tous les refus du chemin Google
  // atterrissent ici, à l'identique. Rien dans cet écran ne dit lequel des
  // motifs s'applique — c'est la propriété de non-oracle.
  const refuse = searchParams?.etat === 'refus';

  return (
    <div className="w-full max-w-md space-y-4">
      <PatientCard className="space-y-4">
        <PatientPageHeader
          center
          title="Accéder à votre espace"
          subtitle="Utilisez l’adresse e-mail que vous avez communiquée à votre praticien."
        />

        {refuse && <PatientInlineMessage tone="error">{MESSAGE_ACCES_GOOGLE_REFUSE}</PatientInlineMessage>}

        {/* Un lien et non un bouton : la route pose un cookie puis redirige,
            elle se navigue. Pas de JavaScript nécessaire pour entrer. */}
        <a href="/portail/google" className={patientButtonClassName('primary', 'w-full')}>
          Continuer avec Google
        </a>

        {/* Dit AVANT le clic, pas après. Le registre inscrit Google comme
            sous-traitant nouveau sur les patients (LOT-03a) : la personne doit
            savoir ce qu'elle déclenche pendant qu'elle peut encore choisir
            l'autre chemin. La phrase ne promet rien qu'on ne tienne — le scope
            demandé est `openid email`, aucune donnée de santé ne transite. */}
        <p className="text-xs text-muted-foreground text-center">
          Vous serez redirigé vers Google, qui apprendra que vous vous connectez à cette
          application. Seule votre adresse e-mail est transmise — aucune donnée de santé.
        </p>

        <PatientInlineMessage tone="info">
          Vous avez reçu un lien d’accès par e-mail ? Il reste valable : ouvrez-le directement.
          Vous pouvez aussi en demander un à votre praticien, sans passer par Google.
        </PatientInlineMessage>
      </PatientCard>
    </div>
  );
}
