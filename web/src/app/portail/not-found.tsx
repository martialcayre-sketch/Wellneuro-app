import Link from 'next/link';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { PatientPageHeader } from '@/components/patient/ui/PatientPageHeader';
import { patientButtonClassName } from '@/components/patient/ui/PatientButton';

// L'autre porte, et la plus empruntée des deux.
//
// Le segment appelle `notFound()` en plusieurs endroits — une page dont le
// drapeau est éteint, une référence d'aliment inconnue, un dossier qui ne
// correspond à rien. Sans ce fichier, tous atterrissaient sur la page par
// défaut de Next : « This page could not be found », en anglais, sans en-tête
// ni pied de page du portail, sans recours. Un drapeau éteint suffisait à la
// produire.
//
// Le message reste au même niveau de discrétion que le reste du portail : il
// ne dit pas si l'adresse a existé, ni pourquoi elle ne répond plus. C'est la
// même prudence que l'écran de lien indisponible, où consommé, expiré et
// inconnu se lisent d'une seule phrase — apprendre quelque chose en sondant
// des URL doit rester impossible.
export default function PortailNotFound() {
  return (
    <div className="w-full max-w-md space-y-4">
      <PatientCard className="space-y-4">
        <PatientPageHeader
          center
          title="Cette page n’existe pas"
          subtitle="Le lien que vous avez suivi ne mène à rien. Vérifiez l’adresse, ou revenez à votre espace."
        />
        <Link href="/portail/connexion" className={patientButtonClassName('primary', 'w-full block text-center')}>
          Retourner à l’accueil
        </Link>
        <p className="text-sm text-muted-foreground text-center">
          Si vous êtes arrivé ici depuis un e-mail, parlez-en à votre praticien.
        </p>
      </PatientCard>
    </div>
  );
}
