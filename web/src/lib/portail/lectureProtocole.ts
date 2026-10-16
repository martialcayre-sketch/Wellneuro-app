// `WN_PORTAIL_LECTURE_PROTOCOLE` — LE JOURNAL DE LECTURE DU PROTOCOLE (CC-8,
// [[D-315]]). Fermé, l'accueil du portail sert le protocole exactement comme
// avant : déplié, sans trace. Ouvert, il le présente replié tant que la version
// diffusée en vigueur n'a pas été ouverte, et la première ouverture de son
// détail s'enregistre dans `portail_lectures_patient` (espèce `protocole`, une
// ligne par diffusion approuvée, sans date).
//
// Il se sert avec ACT-1 (place 1 de la file C, [[D-315]] §5) : une activation,
// constatée sur un premier vrai dossier par identifiant en conteneur.
//
// Convention des drapeaux produit (`docs/FEATURE_FLAGS.md` § A) : la chaîne
// exacte `'true'`, absent = fermé. Variable serveur : un composant client ne la
// lit pas, c'est la route du protocole qui le lui dit.

export function lectureProtocoleOuverte(): boolean {
  return process.env.WN_PORTAIL_LECTURE_PROTOCOLE === 'true';
}
