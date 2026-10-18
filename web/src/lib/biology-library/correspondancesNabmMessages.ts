// Les refus d'une signature de correspondance NABM, tels que les routes les
// disent — la route unitaire et celle du lot ([[D-326]] §2). Une route
// Next.js n'exporte que ses verbes : la table vit donc ici.
import type { RaisonRefusCorrespondance } from './correspondancesNabm';

export const MESSAGES_REFUS_CORRESPONDANCE: Record<RaisonRefusCorrespondance, { message: string; status: number }> = {
  transition_invalide: { message: 'Ce geste n’est pas permis sur cette correspondance.', status: 409 },
  nature_requise: {
    message: 'Choisissez la nature de la correspondance : acte isolé, groupe imposé ou groupe au choix.',
    status: 422,
  },
  analyte_inconnu: { message: 'Cet analyte n’existe pas au catalogue.', status: 404 },
  analyte_inactif: { message: 'Cet analyte est inactif au catalogue : rien à signer.', status: 409 },
  millesime_absent: {
    message: 'La nomenclature n’est pas importée : aucune correspondance ne peut être signée.',
    status: 409,
  },
  acte_introuvable: {
    message: 'Ce code d’acte n’existe pas dans le millésime courant de la nomenclature.',
    status: 404,
  },
  acte_inactif: {
    message: 'Cet acte est inactif dans le millésime courant : la correspondance ne rembourserait rien.',
    status: 409,
  },
  import_en_cours: {
    message: 'Un import de la nomenclature est en cours : rien n’a été enregistré, réessayez dans quelques minutes.',
    status: 409,
  },
  constat_present: {
    message: 'Cet analyte porte un constat « aucun acte dans la nomenclature » : retirez-le d’abord.',
    status: 409,
  },
  etat_divergent: {
    message: 'La correspondance a changé depuis l’affichage — rechargez la fiche.',
    status: 409,
  },
};
