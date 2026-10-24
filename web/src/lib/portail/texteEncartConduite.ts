// L'ENCART « QUAND RALENTIR OU DEMANDER AVIS » — lettre bd, fiche H71, [[D-349]].
//
// MODULE PUR, LISIBLE PAR LE NAVIGATEUR : l'accueil du protocole en tire son
// texte. Aucune horloge, aucune base, aucune variable d'environnement — le
// drapeau se lit côté serveur (`encartConduite.ts`) et la route du protocole
// le dit au composant.
//
// TEXTE DU RESPONSABLE, ACCEPTÉ LE 2026-10-23 ([[D-349]] §1), recopié au
// caractère près : un banc relit la décision et rougit au premier écart. Il ne
// se reformule pas ici ; une nouvelle version passe par une décision.

export const TITRE_ENCART_CONDUITE = 'Quand ralentir ou demander avis';

export const PARAGRAPHES_ENCART_CONDUITE: readonly string[] = [
  'Un geste d’alimentation ou d’hygiène de vie vous pèse ? Allégez-le ou ralentissez, sans culpabiliser.',
  'Si une gêne inhabituelle apparaît ou vous inquiète après le début d’un élément, ouvrez « Signaler un problème », puis « Un produit me semble mal toléré ». Respectez les pauses affichées, sans reprendre de vous-même.',
  'En cas de malaise sérieux, appelez les urgences indiquées en bas de page, sans attendre.',
  'Poursuivez vos traitements prescrits et votre suivi médical, sans les modifier sans votre médecin.',
];
