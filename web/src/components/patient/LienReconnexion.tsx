import { patientButtonClassName } from '@/components/patient/ui/PatientButton';
import { DESTINATION_RECONNEXION, LIEN_RECONNEXION } from '@/app/portail/[token]/textesEntree';

/**
 * T-36 « Me reconnecter » sous le refus HTTP 401 d'une transmission ou d'un
 * enregistrement : questionnaires, plaintes, agendas du sommeil et
 * alimentaire (Q6a, [[D-481]] et [[D-488]], DOC-7), puis les envois de
 * « Ce qui compte pour moi », de la compréhension et du dossier à deux voix
 * (Q6a de PAT-5, DOC-9). Les autres refus ne le proposent pas.
 *
 * Par défaut, navigation pleine page vers la connexion, dans le même onglet,
 * comme à l'entrée (PAT-2). Le retour passe par l'entrée puis « Accéder à mon
 * parcours » : aucun retour direct au questionnaire n'est promis, et la
 * saisie non enregistrée d'un agenda n'est pas gardée.
 *
 * `nouvelOnglet` (U24, U25 ; question `20261113-1856-d`, réponse a) : la
 * connexion s'ouvre dans un nouvel onglet, et la page reste ouverte avec le
 * texte saisi, qui n'existe nulle part ailleurs. Le cookie de session est
 * commun aux onglets : une fois reconnecté, le patient renvoie depuis la
 * page restée ouverte. Aucun texte ne promet que le texte sera gardé.
 */
export function LienReconnexion({ nouvelOnglet = false }: { nouvelOnglet?: boolean } = {}) {
  return (
    // eslint-disable-next-line @next/next/no-html-link-for-pages -- pleine page voulue (voir ci-dessus).
    <a
      href={DESTINATION_RECONNEXION}
      className={patientButtonClassName('ghost')}
      {...(nouvelOnglet ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {LIEN_RECONNEXION}
    </a>
  );
}
