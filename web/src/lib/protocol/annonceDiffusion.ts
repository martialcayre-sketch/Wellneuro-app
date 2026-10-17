// `WN_ANNONCE_PROTOCOLE` — L'E-MAIL DE DIFFUSION DU PROTOCOLE ([[D-317]], PA-2).
//
// NEUF ET ÉTEINT à la livraison (§4). Convention des drapeaux produit
// (`docs/FEATURE_FLAGS.md` § A) : la chaîne exacte `'true'`, absent = fermé.
//
// TROIS CONDITIONS, pas une :
//   • le drapeau lui-même ;
//   • le gabarit `protocole_diffuse` VALIDÉ (§3) : un texte que le responsable
//     n'a pas relu mot pour mot ne part pas, drapeau posé ou non ;
//   • `WN_FICHES_ASSIETTE` ouvert : l'annonce se réserve dans la transaction du
//     clic, qui n'existe que sur ce chemin (ouvert en production depuis le
//     2026-09-28). Le refermer coupe aussi cet e-mail.
//
// Fermé, le clic fait exactement ce qu'il faisait avant PA-2 : l'annonce
// `document_remis` des fiches et du courrier, sous le plafond de 24 heures.

import { getGabarit } from '@/lib/correspondance/registreGabarits';
import { envoiFichesOuvert } from '@/lib/fiches-assiette/drapeau';

export function annonceProtocoleOuverte(): boolean {
  return (
    process.env.WN_ANNONCE_PROTOCOLE === 'true'
    && getGabarit('protocole_diffuse').valideLe !== null
    && envoiFichesOuvert()
  );
}
