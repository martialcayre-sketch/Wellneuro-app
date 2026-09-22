import { hasDraft } from '@/lib/questionnaire-draft';

// Ce que le portail laisse sur l'APPAREIL du patient, et ce que « Se déconnecter »
// doit emporter.
//
// POURQUOI UN INVENTAIRE, ET PAS QUATRE PRÉFIXES DANS LE COMPOSANT. La première
// version de ce lot purgeait les brouillons de questionnaire, et elle annonçait
// avoir fermé la promesse « appareil partagé ». La revue a compté : deux autres
// familles de clés portent des données de santé — le wizard fiche/anamnèse et
// l'agenda alimentaire patient — toutes deux en `sessionStorage`, qui SURVIT à
// `location.assign` dans le même onglet, c'est-à-dire exactement le scénario
// familial. Corriger la famille trouvée aurait laissé le défaut entier.
//
// L'inventaire est donc la source de vérité, et `stockageAppareil.guard.test.ts`
// refuse toute clé `wellneuro:` écrite sous le portail qui n'y figure pas —
// purgée ou exemptée, mais jamais ignorée.

type Stockage = 'local' | 'session';

type FamilleCles = {
  /** Préfixe littéral, tel qu'il apparaît dans le code qui l'écrit. */
  prefixe: string;
  stockage: Stockage;
  /** Ce que la famille contient, pour qui lit l'inventaire sans lire le code. */
  contenu: string;
  /**
   * Une clé de MÉTADONNÉE (horodatage) accompagne souvent une clé de données.
   * Elle se purge, mais ne compte pas pour décider s'il y a « quelque chose à
   * perdre » : un horodatage orphelin n'est pas du travail.
   */
  metadonnee?: true;
  /**
   * La valeur vaut-elle un avertissement ? Par défaut : un objet non vide.
   * Sert à ne PAS annoncer une perte quand il n'y a rien à perdre — une
   * promesse d'avertissement qui se déclenche à vide s'apprend par cœur et
   * cesse d'être lue.
   */
  estSubstantielle?: (brut: string, cle: string) => boolean;
};

/** Un objet JSON qui porte au moins un champ non vide. */
function objetNonVide(brut: string): boolean {
  try {
    const valeur: unknown = JSON.parse(brut);
    if (valeur === null || typeof valeur !== 'object') return false;
    const entrees = Array.isArray(valeur) ? valeur : Object.values(valeur);
    return entrees.some((v) => {
      if (v === null || v === undefined || v === '') return false;
      if (typeof v === 'object') return Object.keys(v as object).length > 0;
      return true;
    });
  } catch {
    return false;
  }
}

/** Données patient déposées sur l'appareil. Toutes purgées à la déconnexion. */
export const FAMILLES_DONNEES_PATIENT: readonly FamilleCles[] = [
  {
    prefixe: 'wellneuro:questionnaire-draft:v1:',
    stockage: 'local',
    contenu: 'réponses de questionnaire en cours',
    // DÉLÉGUÉ À `hasDraft`, qui porte DEUX règles que ce module ne doit pas
    // recopier : réponses non vides, et brouillon non périmé (30 jours). Sans
    // elle, le dialogue s'ouvrait sur un brouillon que l'application ne
    // restituerait jamais, en promettant de pouvoir le ressaisir.
    estSubstantielle: (_brut, cle) => hasDraft(cle.slice('wellneuro:questionnaire-draft:v1:'.length)),
  },
  { prefixe: 'wellneuro:questionnaire-draft-meta:v1:', stockage: 'local', contenu: 'horodatage du brouillon', metadonnee: true },
  {
    prefixe: 'wellneuro:draft:',
    stockage: 'local',
    contenu: 'réponses de questionnaire (format hérité)',
    estSubstantielle: (_brut, cle) => hasDraft(cle.slice('wellneuro:draft:'.length)),
  },
  { prefixe: 'wellneuro:draft-meta:', stockage: 'local', contenu: 'horodatage hérité', metadonnee: true },
  {
    prefixe: 'wellneuro:wizard-draft:',
    stockage: 'session',
    contenu: 'fiche signalétique et anamnèse en cours de saisie',
  },
  { prefixe: 'wellneuro:wizard-draft-meta:', stockage: 'session', contenu: 'horodatage du wizard', metadonnee: true },
  {
    prefixe: 'wellneuro:ja5-02:patient:',
    stockage: 'session',
    contenu: 'agenda alimentaire — traces, pauses, plans, solutions',
  },
];

/**
 * Clés écrites sous le portail qui NE sont PAS des données patient. Exemptées
 * nommément, avec leur motif : une exemption sans raison écrite est une purge
 * oubliée qui se maquille.
 */
export const FAMILLES_EXEMPTEES: readonly { prefixe: string; motif: string }[] = [
  {
    prefixe: 'wellneuro:portail:confort',
    motif:
      'Réglage d’APPAREIL (texte agrandi, espacement, animations réduites), jamais une donnée de santé. '
      + 'L’effacer punirait la personne qui se déconnecte — en particulier celle qui en a besoin.',
  },
];

function magasin(stockage: Stockage): Storage {
  return stockage === 'local' ? window.localStorage : window.sessionStorage;
}

/** Les clés présentes, par famille, sur cet appareil. */
function clesPresentes(famille: FamilleCles): string[] {
  const store = magasin(famille.stockage);
  const cles: string[] = [];
  for (let i = 0; i < store.length; i += 1) {
    const cle = store.key(i);
    if (cle && cle.startsWith(famille.prefixe)) cles.push(cle);
  }
  return cles;
}

/**
 * Y a-t-il du travail non envoyé à perdre sur cet appareil ?
 *
 * Les métadonnées ne comptent pas, et chaque famille décide de ce qui est
 * substantiel. Une clé vide, orpheline ou périmée ne déclenche donc PAS
 * l'avertissement : la purge l'emportera quand même, silencieusement, puisqu'il
 * n'y a rien à annoncer.
 */
export function aDesDonneesPatientLocales(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return FAMILLES_DONNEES_PATIENT.some((famille) => {
      if (famille.metadonnee) return false;
      const store = magasin(famille.stockage);
      return clesPresentes(famille).some((cle) => {
        const brut = store.getItem(cle);
        if (brut === null) return false;
        return famille.estSubstantielle ? famille.estSubstantielle(brut, cle) : objetNonVide(brut);
      });
    });
  } catch {
    // Mode privé, quota, stockage bloqué : illisible ici veut dire non écrit
    // là-bas. Ne rien annoncer est juste, et la purge échouera pareillement.
    return false;
  }
}

/**
 * Efface toutes les données patient déposées par le portail sur cet appareil —
 * `localStorage` ET `sessionStorage`.
 *
 * L'APPELANT DOIT AVOIR AVERTI quand il y avait quelque chose à perdre. Cette
 * fonction n'interroge rien : elle applique une décision déjà prise.
 */
export function effacerDonneesPatientLocales(): void {
  if (typeof window === 'undefined') return;
  for (const famille of FAMILLES_DONNEES_PATIENT) {
    try {
      const store = magasin(famille.stockage);
      // Les clés sont relevées AVANT la première suppression : `key(i)` est
      // indexé, et retirer une entrée pendant le parcours décale les suivantes
      // — une clé sur deux survivrait.
      for (const cle of clesPresentes(famille)) store.removeItem(cle);
    } catch {
      // Une famille illisible ne doit pas empêcher les autres d'être purgées :
      // le `try` est DANS la boucle, délibérément.
    }
  }
}
