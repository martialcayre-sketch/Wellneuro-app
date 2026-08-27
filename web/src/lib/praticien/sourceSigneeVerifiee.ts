import {
  PRIORITY_RULES_SHA256,
  PRIORITY_RULES_V1,
  tablePrioritesSignee,
} from '@/lib/clinical/priorityRulesV1';

// L'ADAPTATEUR DE VÉRIFICATION D'UNE SOURCE SIGNÉE (`D-115`).
//
// POURQUOI CE FICHIER EXISTE, ET POURQUOI IL EST SEUL. La contre-revue adverse
// du 2026-08-27 a réfuté l'affirmation `N2.2` — « le moteur cite et n'invente
// jamais ». La route de proposition acceptait du NAVIGATEUR le couple
// `{regle, texte}` et le persistait comme `regle_signee` après n'avoir vérifié
// qu'une FORME : 64 caractères hexadécimaux pour le SHA, un identifiant
// plausible pour la règle. Une règle inventée, syntaxiquement valide, était
// donc servie au praticien puis au patient comme citée d'une table signée que
// le registre ne contient pas.
//
// Ce n'était pas un oubli : la route le DISAIT, faute de pouvoir importer
// `lib/clinical/` sous `G7-1`. Mais une garde qui documente le trou qu'elle
// laisse reste un trou. `D-115` amende `G7-1` dans UN SEUL SENS, et ce fichier
// est cette exception — la seule.
//
// CE QUI RESTE INTERDIT, ET QUI N'EST PAS NÉGOCIABLE :
//
//   1. le module PUR (`propositionObjectif.ts`) n'importe toujours RIEN — ni ce
//      fichier, ni quoi que ce soit d'autre. Il part dans le bundle patient, et
//      un import serveur y a déjà cassé la construction de production ;
//   2. la route n'importe le moteur clinique QUE par ce fichier, jamais
//      directement, et jamais un autre module de `lib/clinical/` ;
//   3. ce fichier ne lit QUE le registre des règles de priorité. Ni
//      `clinical-engine`, ni `scoring`, ni `instruments`, ni `equilibre` : il
//      RÉSOUT une citation, il ne calcule aucune clinique ;
//   4. il ne rend jamais de texte fabriqué. Sans règle publiée correspondante,
//      il rend `null` — et l'appelant n'a alors rien à citer.
//
// Ces quatre interdits sont éprouvés par `G7-1` amendé
// (`propositionObjectif.guard.test.ts`) : les écrire ici sans les faire rougir
// serait exactement la faute que `N2.2` a sanctionnée.

export type RegleSigneeResolue = {
  /** L'identifiant tel que le REGISTRE le porte, jamais celui reçu. */
  regle: string;
  /** Le libellé RECOPIÉ du registre — jamais le texte du corps de requête. */
  texte: string;
  /** Le SHA du périmètre signé, calculé ici et non reçu. */
  shaPerimetre: string;
};

/** Le SHA du périmètre signé, tel que le serveur le calcule. */
export function shaPerimetreSigne(): string {
  return PRIORITY_RULES_SHA256;
}

/**
 * La table des règles de priorité est-elle signée ?
 *
 * Exposée pour que l'appelant puisse être FAIL-CLOSED sans importer le
 * registre : table non signée ⇒ il n'y a rien de signé à citer, et aucune
 * proposition ne s'assemble.
 */
export function registreSigne(): boolean {
  return tablePrioritesSignee();
}

/**
 * Résout une règle citée, ou rend `null`.
 *
 * LE TEXTE VIENT DU REGISTRE, PAS DE L'APPELANT. C'est tout l'objet : ce que
 * la route servira ensuite est une RECOPIE d'une ligne signée, et plus une
 * chaîne que le navigateur a fournie. Une règle absente, en brouillon ou
 * suspendue ne se cite pas — on ne fabrique pas une phrase de remplacement
 * (`D-094`, `DC-26`).
 *
 * Le registre n'est pas signé ⇒ `null` pour toute règle : une signature
 * absente ne se contourne pas règle par règle.
 */
export function resoudreRegleSignee(regle: string): RegleSigneeResolue | null {
  if (!tablePrioritesSignee()) return null;

  const identifiant = regle.trim();
  if (identifiant.length === 0) return null;

  const trouvee = PRIORITY_RULES_V1.find(
    (candidate) => candidate.id === identifiant && candidate.statut === 'publiee',
  );
  if (!trouvee) return null;

  // `libelle` est ce que la table signée énonce de cette règle, et le SHA le
  // couvre : le recopier est la seule façon de tenir « cite et n'invente
  // jamais ». Un libellé vide en registre serait un défaut de la table, pas
  // une invitation à compléter — la règle devient alors non citable.
  const texte = trouvee.libelle.trim();
  if (texte.length === 0) return null;

  return { regle: trouvee.id, texte, shaPerimetre: PRIORITY_RULES_SHA256 };
}
