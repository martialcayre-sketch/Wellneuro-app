import { patientButtonClassName } from '@/components/patient/ui/PatientButton';
import { DESTINATION_RECONNEXION, LIEN_RECONNEXION } from '@/app/portail/[token]/textesEntree';

/**
 * T-36 « Me reconnecter » sous le refus HTTP 401 d'une transmission ou d'un
 * enregistrement : questionnaires, plaintes, agendas du sommeil et
 * alimentaire (Q6a, [[D-481]] et [[D-488]], DOC-7). Les autres refus ne le
 * proposent pas.
 *
 * Navigation pleine page vers la connexion, dans le même onglet, comme à
 * l'entrée (PAT-2). Le retour passe par l'entrée puis « Accéder à mon
 * parcours » : aucun retour direct au questionnaire n'est promis, et la
 * saisie non enregistrée d'un agenda n'est pas gardée.
 */
export function LienReconnexion() {
  return (
    // eslint-disable-next-line @next/next/no-html-link-for-pages -- pleine page voulue (voir ci-dessus).
    <a href={DESTINATION_RECONNEXION} className={patientButtonClassName('ghost')}>
      {LIEN_RECONNEXION}
    </a>
  );
}
