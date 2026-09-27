// Export PDF du dossier patient (D-252) — section 1 : les renseignements administratifs.
//
// La version « IA externe » ne reçoit AUCUNE valeur identifiante : elle ne les
// masque pas après coup, elle ne les écrit jamais. Le masquage (`masquage.ts`)
// ne vise que les textes libres où elles pourraient affleurer.

import { ageAnnees } from '@/lib/patient/age';
import {
  dateFr,
  dateNaissanceFr,
  NON_RENSEIGNE,
  type BlocExport,
  type PatientExport,
  type VersionExport,
} from './modele';

const TITRE = '1. Renseignements administratifs';

// Le sexe n'est pas une colonne du dossier : le dire, jamais le déduire d'un
// prénom ou d'une réponse. Un questionnaire peut l'avoir demandé (Q_ALI_03) :
// la phrase ne doit pas contredire la section 3 du même document.
const SEXE_NON_RENSEIGNE =
  'Non renseigné dans la fiche administrative (peut figurer dans les réponses aux questionnaires)';

export const MENTION_PSEUDONYMISATION =
  'Version pseudonymisée : nom, prénom, date de naissance, coordonnées, numéro de sécurité sociale et médecin traitant sont retirés de ce document.';

function champ(libelle: string, valeur: string): BlocExport {
  return { type: 'champ', libelle, valeur };
}

function valeurOuAbsence(valeur: string | null): string {
  const texte = valeur?.trim();
  return texte ? texte : NON_RENSEIGNE;
}

function libelleAge(age: number): string {
  return `${age} ${age > 1 ? 'ans' : 'an'}`;
}

function blocsEtatDossier(patient: PatientExport): BlocExport[] {
  const blocs: BlocExport[] = [
    { type: 'titre', niveau: 2, texte: 'État du dossier' },
    champ('Dossier', patient.actif ? 'Actif' : 'Inactif'),
  ];
  if (patient.suiviClotureLe) {
    blocs.push(champ('Suivi', `Clôturé le ${dateFr(patient.suiviClotureLe)}`));
  }
  blocs.push(
    champ('Accès du patient', patient.accessTokenRevoked ? 'Révoqué' : 'Actif'),
    champ('Création du dossier', dateFr(patient.createdAt)),
  );
  return blocs;
}

export function sectionAdministrative(
  patient: PatientExport,
  version: VersionExport,
  maintenant: Date,
): BlocExport[] {
  const age = ageAnnees(patient.dateNaissance, maintenant.getTime());

  if (version === 'ia-externe') {
    return [
      { type: 'titre', niveau: 1, texte: TITRE },
      champ('Identifiant WellNeuro', patient.idPatient),
      champ('Âge', age === null ? NON_RENSEIGNE : libelleAge(age)),
      champ('Sexe', SEXE_NON_RENSEIGNE),
      ...blocsEtatDossier(patient),
      { type: 'paragraphe', texte: MENTION_PSEUDONYMISATION, ton: 'discret' },
    ];
  }

  const naissance = dateNaissanceFr(patient.dateNaissance?.trim() || null);
  const valeurNaissance = naissance
    ? age === null
      ? naissance
      : `${naissance} (${libelleAge(age)})`
    : NON_RENSEIGNE;

  // Libellés de `FicheAdministrativePanel` : le praticien retrouve les mots de son écran.
  return [
    { type: 'titre', niveau: 1, texte: TITRE },
    champ('Identifiant WellNeuro', patient.idPatient),
    champ('Prénom', valeurOuAbsence(patient.prenom)),
    champ('Nom', valeurOuAbsence(patient.nom)),
    champ('Date de naissance', valeurNaissance),
    champ('Sexe', SEXE_NON_RENSEIGNE),
    { type: 'titre', niveau: 2, texte: 'Contact' },
    champ('Adresse e-mail', valeurOuAbsence(patient.email)),
    champ('Téléphone', valeurOuAbsence(patient.telephone)),
    champ('Adresse postale', valeurOuAbsence(patient.adresse)),
    { type: 'titre', niveau: 2, texte: 'Sécurité sociale' },
    champ('Numéro de sécurité sociale', valeurOuAbsence(patient.nir)),
    { type: 'titre', niveau: 2, texte: 'Médecin traitant' },
    champ('Nom du médecin', valeurOuAbsence(patient.medecinTraitantNom)),
    champ('Coordonnées', valeurOuAbsence(patient.medecinTraitantCoordonnees)),
    ...blocsEtatDossier(patient),
  ];
}
