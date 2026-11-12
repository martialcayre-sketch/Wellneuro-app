import type { TextesSauvegarde } from '@/components/patient/SaveStatusIndicator';

// Textes de l'entrée du parcours (refonte Lien, PAT-2), acceptés mot pour mot
// et inscrits dans [[D-488]] : T-31a et T-31b au §4, T-36 à T-39 par
// l'amendement DOC-5. Aucun autre texte de l'entrée ne change ici.

/** T-31a — titre de l'étape d'entrée, à la place de « Anamnèse ». */
export const TITRE_SITUATION = 'Parler de votre situation';

/** T-31b — bouton qui mène à cette étape, à la place de « Continuer vers l’anamnèse ». */
export const BOUTON_VERS_SITUATION = 'Continuer vers votre situation';

/**
 * T-36 — lien sous « Session expirée. Reconnectez-vous. » (réponse 401 de
 * `/api/portail/consentement`, `/fiche`, `/valider`), vers la page de
 * connexion, dans le même onglet ([[D-481]], complément DOC-4, Q5a).
 */
export const LIEN_RECONNEXION = 'Me reconnecter';
export const DESTINATION_RECONNEXION = '/portail/connexion';

/**
 * T-37 à T-39 — brouillon de l'entrée (fiche et situation), gardé en
 * `sessionStorage`, donc « dans cet onglet ». Les questionnaires gardent les
 * textes par défaut de `SaveStatusIndicator`, « sur cet appareil ». Ces trois
 * phrases ne paraissent qu'après une écriture du brouillon réussie (Q6b).
 */
export const TEXTES_BROUILLON_ENTREE: TextesSauvegarde = {
  brouillon: heure =>
    `Brouillon gardé dans cet onglet — dernière sauvegarde à ${heure}. Il ne sera transmis à votre praticien qu’après validation.`,
  reseau: 'Connexion interrompue — vos réponses restent conservées dans cet onglet.',
  transmission: 'Transmission non terminée — vos réponses restent conservées dans cet onglet.',
};
