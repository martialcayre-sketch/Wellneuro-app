// Cycle de vie d'un dossier patient — campagne IDP2, LOT-01.
//
// DEUX ÉTATS DE FIN, ET ILS NE SONT PAS DEUX INTENSITÉS DU MÊME :
//
// - CLÔTURE DE SUIVI — le dossier reste, le patient garde l'accès en lecture
//   à ses archives. Plus aucune assignation de questionnaire, plus aucun envoi
//   de document de suivi. Réversible.
//
//   LE LIEN D'ACCÈS AU PORTAIL, LUI, RESTE ENVOYABLE — décision du 2026-07-21.
//   Ce n'est pas une exception de confort : la clôture promet la lecture des
//   archives, et un patient qui a perdu son e-mail n'a pas d'autre porte. La
//   bloquer aurait tenu la lettre (« aucun envoi ») en cassant la promesse
//   qu'elle sert. Un lien d'accès n'est pas un document de suivi.
// - EFFACEMENT — les données partent, l'accès avec. Il ne subsiste qu'un
//   résidu non identifiant. Irréversible.
//
// La distinction n'est pas cosmétique. L'application PROMET l'effacement au
// patient (`lib/trust/contenus/registre.ts`) ; une clôture présentée comme un
// effacement serait un engagement en défaut.
//
// Tout ce qui décide est ici, en fonctions pures. Les routes lisent la base et
// appliquent ce que ces fonctions répondent.

/** Ce que la base sait de l'état d'un dossier. */
export type EtatDossier = {
  actif: boolean;
  suiviClotureLe: Date | null;
};

export type PhaseDossier = 'en_suivi' | 'suivi_cloture' | 'desactive';

/**
 * La clôture prime sur la désactivation : un dossier clos puis désactivé reste
 * « clos » quant à ce qu'il accepte — plus aucune assignation, plus aucun envoi
 * de suivi.
 *
 * Elle NE dit rien de l'accès du patient : celui-ci dépend de `actif` seul, et
 * un dossier clos-puis-désactivé n'ouvre plus le portail. Ne pas dériver une
 * promesse de lecture de cette fonction — c'est l'erreur que le libellé de
 * `MESSAGE_DOSSIER_CLOS` a faite le 2026-07-21.
 */
export function phaseDossier(etat: EtatDossier): PhaseDossier {
  if (etat.suiviClotureLe) return 'suivi_cloture';
  if (!etat.actif) return 'desactive';
  return 'en_suivi';
}

/**
 * Un dossier clos n'accepte plus rien de nouveau.
 *
 * Cette fonction est le point unique de décision : elle est appelée par les
 * ROUTES, jamais seulement par l'écran. Le dépôt a déjà connu le cas d'une
 * interdiction qui ne vivait que dans l'UI et se contournait par un appel
 * direct (#181).
 */
export function accepteNouvelEnvoi(etat: EtatDossier): boolean {
  return phaseDossier(etat) === 'en_suivi';
}

/** Le refus opposé au praticien. Une seule formulation, un seul endroit. */
/**
 * CETTE CONSTANTE NE PROMET RIEN SUR L'ACCÈS, et c'est délibéré.
 *
 * Elle est partagée par quatre routes qui n'ont pas toutes le dossier complet
 * sous la main, et `phaseDossier` fait primer la clôture sur la désactivation :
 * un dossier clos PUIS désactivé produit ce message alors que le portail lui
 * refuse déjà toute entrée. Une phrase du type « l'accès reste ouvert » y serait
 * donc fausse dans un état parfaitement atteignable.
 *
 * Ce qui subsiste est dit là où l'état est connu : le dialogue de clôture et le
 * message de confirmation branchent tous deux sur `actif`.
 */
export const MESSAGE_DOSSIER_CLOS =
  'Le suivi de ce dossier est clôturé : aucun questionnaire ne peut être assigné, aucun document de suivi envoyé. Rouvrez le suivi pour reprendre.';

export const RAISON_DOSSIER_CLOS = 'dossier_cloture';

/**
 * Le résidu laissé par un effacement.
 *
 * ANNÉE et non date complète, TROIS LETTRES et non nom : de quoi ne pas
 * effondrer les comptages de l'historique clinique, jamais de quoi désigner
 * quelqu'un. Décision de l'utilisateur du 2026-07-21.
 *
 * LE PRÉNOM EN EST ABSENT, et c'est le point qui rend ce résidu défendable.
 * Il figurait dans la décision initiale ; retiré le même jour, parce que sur
 * une population de quelques dizaines de dossiers, « prénom + trois lettres +
 * année » redevenait rapprochable d'une personne par recoupement. Le mot
 * « effacement » n'aurait alors pas été tenable — or l'application le promet
 * au patient (`lib/trust/contenus/registre.ts`).
 *
 * L'e-mail n'y figure pas non plus — ni en clair, ni haché. Une empreinte à
 * clé reste une pseudonymisation : on peut tester une adresse candidate et
 * obtenir une correspondance, donc la donnée resterait personnelle.
 */
export type ResiduEffacement = {
  anneeNaissance: number | null;
  initialesNom: string;
};

/**
 * `dateNaissance` est une chaîne libre en base, de format non garanti. On en
 * extrait une année plausible, ou rien — jamais une valeur devinée.
 */
export function anneeDeNaissance(valeur: string | null | undefined): number | null {
  if (!valeur) return null;
  const trouve = valeur.match(/(18|19|20)\d{2}/);
  if (!trouve) return null;
  const annee = Number(trouve[0]);
  return annee >= 1900 && annee <= 2099 ? annee : null;
}

/** Les trois premières lettres du nom, en capitales. Moins s'il est plus court. */
export function initialesNom(nom: string): string {
  return nom.trim().slice(0, 3).toUpperCase();
}

/**
 * Le paramètre ne prend QUE ce qui entre dans le résidu. Passer le patient
 * entier inviterait à en retenir davantage à la prochaine évolution.
 */
export function residuEffacement(patient: {
  nom: string;
  dateNaissance: string | null;
}): ResiduEffacement {
  return {
    anneeNaissance: anneeDeNaissance(patient.dateNaissance),
    initialesNom: initialesNom(patient.nom),
  };
}
