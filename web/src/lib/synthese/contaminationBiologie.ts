// LE CONTRÔLE DE CONTAMINATION — [[D-513]] §5 (arbitrage `20261113-1119-b`).
//
// La séparation des champs protège contre la SORTIE des deux champs
// biologiques ; elle ne garantit pas que le modèle ne recopie rien dans les
// champs ordinaires. Ce module relève, dans les six champs ordinaires, les
// formes tirées du bloc de biologie RÉELLEMENT TRANSMIS (sa trace dans
// `donneesEntree.blocBiologie`). Une forme relevée rend la synthèse SUSPECTE :
// sa validation et ses quatre sorties sont refusées tant que le champ n'a pas
// été corrigé dans l'éditeur.
//
// CE QU'IL NE FAIT PAS, ET LES BANCS LE TIENNENT (§5, « Limites ») :
// - il ne relève ni un nom d'analyte (il se confond avec un nutriment que le
//   narratif peut écrire), ni une valeur sans son unité (elle se confond avec
//   une date ou une heure), ni une valeur en toutes lettres ;
// - une autre graphie d'unité, un intervalle reformulé ou séparé en bornes,
//   une qualification sans chiffre lui échappent ;
// - sans bloc exploitable, il n'a aucune forme à rechercher.
// Son silence n'atteste donc pas la conformité. Il ne corrige jamais le texte.
//
// AUCUN TEXTE NE SORT D'ICI VERS LE JOURNAL : un relevé nomme un champ et un
// code, jamais ce qui a été lu.

/** Les six champs ordinaires contrôlés (§5), `limites` compris. */
export const CHAMPS_CONTROLES = [
  'resume_praticien',
  'axes_prioritaires',
  'points_de_vigilance',
  'questions_entretien',
  'narratif_patient',
  'limites',
] as const;
export type ChampControle = (typeof CHAMPS_CONTROLES)[number];

/** Les deux codes de forme (§5). */
export type CodeForme = 'valeur_unite' | 'intervalle';

export type Releve = { champ: ChampControle; code: CodeForme };

/**
 * La trace du bloc de biologie, telle que le constructeur la dépose dans
 * `donneesEntree.blocBiologie` (PR 2 du lot). `texte` est le bloc exact parti
 * au modèle ; `formes` en sont tirées, à la construction, pour ce contrôle.
 */
export type TraceBlocBiologie = {
  texte: string;
  formes: {
    /** Chaque valeur transmise avec son unité ; une unité absente n'y figure pas. */
    valeursUnites: { valeur: string; unite: string }[];
    /** Chaque texte d'intervalle imprimé transmis, tel quel. */
    intervalles: string[];
  };
};

export type VerdictContamination =
  | { suspecte: false }
  | { suspecte: true; motif: 'formes_relevees'; releves: Releve[] }
  | { suspecte: true; motif: 'schema_anterieur'; releves: [] };

function estObjet(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Lit la trace du bloc. `null` : aucun bloc n'est parti (absent, `null`, ou
 * illisible). Une trace illisible ne rend rien suspect par elle-même : seule la
 * règle des anciennes synthèses lit la PRÉSENCE d'un bloc.
 */
export function lireTraceBlocBiologie(donneesEntree: unknown): TraceBlocBiologie | null {
  if (!estObjet(donneesEntree)) return null;
  const bloc = donneesEntree.blocBiologie;
  if (!estObjet(bloc) || typeof bloc.texte !== 'string' || bloc.texte.trim() === '') return null;
  const formes = estObjet(bloc.formes) ? bloc.formes : {};
  const valeursUnites = Array.isArray(formes.valeursUnites)
    ? formes.valeursUnites.filter(
        (f): f is { valeur: string; unite: string } =>
          estObjet(f) && typeof f.valeur === 'string' && typeof f.unite === 'string'
          && f.valeur.trim() !== '' && f.unite.trim() !== '',
      )
    : [];
  const intervalles = Array.isArray(formes.intervalles)
    ? formes.intervalles.filter((t): t is string => typeof t === 'string' && t.trim() !== '')
    : [];
  return { texte: bloc.texte, formes: { valeursUnites, intervalles } };
}

/**
 * La version du schéma TELLE QUE LA TRACE L'A CONSERVÉE (§5) — lue dans
 * `donneesEntree.metadonneesPrompt.versionSchema`, avant toute normalisation :
 * `validateSyntheseSchema` réécrit `_schema_version` dans le JSON et ne doit
 * jamais servir ici.
 */
export function versionSchemaConservee(donneesEntree: unknown): string | null {
  if (!estObjet(donneesEntree) || !estObjet(donneesEntree.metadonneesPrompt)) return null;
  const v = donneesEntree.metadonneesPrompt.versionSchema;
  return typeof v === 'string' ? v : null;
}

/** Vrai seulement pour `synthese-json-vN`, N ≥ 4. Toute autre forme est antérieure. */
function schemaAuMoinsV4(version: string | null): boolean {
  const m = /^synthese-json-v(\d+)$/.exec(version ?? '');
  return m !== null && Number(m[1]) >= 4;
}

/** Espaces normalisées : toute suite de blancs (espaces insécables comprises) devient une espace. */
function normaliserEspaces(texte: string): string {
  return texte.replace(/[\s  ]+/gu, ' ').trim();
}

function echapper(texte: string): string {
  return texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * La valeur, virgule ou point décimal, suivie de son unité (espaces
 * facultatives). Frontières : ni chiffre ni séparateur décimal avant la valeur
 * (« 132 » ne contient pas « 32 »), ni lettre ni chiffre après l'unité.
 */
function motifValeurUnite(valeur: string, unite: string): RegExp {
  const v = echapper(valeur.trim()).replace(/\\\.|,/g, '[.,]');
  const u = normaliserEspaces(unite).split(' ').map(echapper).join('\\s*');
  return new RegExp(`(?<![\\p{N}.,])${v}\\s*${u}(?![\\p{L}\\p{N}])`, 'u');
}

/** Les textes d'un champ, à plat (axes : nom, arguments, points à confirmer). */
function textesDuChamp(synthese: Record<string, unknown>, champ: ChampControle): string[] {
  const v = synthese[champ];
  if (typeof v === 'string') return [v];
  if (!Array.isArray(v)) return [];
  if (champ !== 'axes_prioritaires') return v.filter((x): x is string => typeof x === 'string');
  return v.flatMap((axe) => {
    if (!estObjet(axe)) return [];
    const morceaux: unknown[] = [axe.axe, ...(Array.isArray(axe.arguments) ? axe.arguments : []),
      ...(Array.isArray(axe.points_a_confirmer) ? axe.points_a_confirmer : [])];
    return morceaux.filter((x): x is string => typeof x === 'string');
  });
}

/** Relève les formes du bloc dans les six champs ordinaires. Pur. */
export function releverFormes(syntheseJson: unknown, trace: TraceBlocBiologie): Releve[] {
  if (!estObjet(syntheseJson)) return [];
  const motifs = trace.formes.valeursUnites.map((f) => motifValeurUnite(f.valeur, f.unite));
  const intervalles = trace.formes.intervalles.map(normaliserEspaces).filter((t) => t !== '');
  const releves: Releve[] = [];
  for (const champ of CHAMPS_CONTROLES) {
    const textes = textesDuChamp(syntheseJson, champ).map(normaliserEspaces);
    if (textes.some((t) => motifs.some((m) => m.test(t)))) releves.push({ champ, code: 'valeur_unite' });
    if (textes.some((t) => intervalles.some((i) => t.includes(i)))) releves.push({ champ, code: 'intervalle' });
  }
  return releves;
}

/**
 * Le verdict, pour une synthèse et sa trace. Rejoué à chaque validation et à
 * chaque sortie, quel que soit l'auteur du texte.
 *
 * - aucun bloc dans la trace : jamais suspecte (aucune forme à chercher) ;
 * - un bloc, mais un schéma conservé antérieur à v4 : suspecte (§5, règle
 *   conservatrice des anciennes synthèses), et une correction ne la lève pas ;
 * - sinon : suspecte dès qu'une forme est relevée dans un champ ordinaire.
 */
export function verdictContamination(syntheseJson: unknown, donneesEntree: unknown): VerdictContamination {
  // La PRÉSENCE d'un bloc se juge avant sa lecture : un bloc illisible sous un
  // schéma antérieur reste une ancienne synthèse qui a reçu de la biologie.
  const blocPresent = estObjet(donneesEntree)
    && donneesEntree.blocBiologie !== undefined && donneesEntree.blocBiologie !== null;
  if (!blocPresent) return { suspecte: false };
  if (!schemaAuMoinsV4(versionSchemaConservee(donneesEntree))) {
    return { suspecte: true, motif: 'schema_anterieur', releves: [] };
  }
  const trace = lireTraceBlocBiologie(donneesEntree);
  if (trace === null) return { suspecte: false };
  const releves = releverFormes(syntheseJson, trace);
  return releves.length > 0 ? { suspecte: true, motif: 'formes_relevees', releves } : { suspecte: false };
}

/**
 * Le motif affiché au praticien (UI en français), sans aucun texte relevé.
 * L'issue dite dépend du statut : seul un brouillon IA se corrige dans
 * l'éditeur ; pour tout autre, l'issue est une nouvelle synthèse.
 */
export function motifAffiche(verdict: Exclude<VerdictContamination, { suspecte: false }>, statut = 'Brouillon_IA'): string {
  if (verdict.motif === 'schema_anterieur') {
    return 'Cette synthèse a reçu des résultats de biologie sous un format antérieur : elle ne peut être ni validée ni diffusée. Générez-en une nouvelle.';
  }
  const champs = [...new Set(verdict.releves.map((r) => LIBELLES_CHAMPS[r.champ]))].join(', ');
  const issue = statut === 'Brouillon_IA'
    ? 'Corrigez ce texte dans l’éditeur pour pouvoir valider ou diffuser la synthèse.'
    : 'Elle ne peut être ni validée ni diffusée : générez-en une nouvelle.';
  return `Un résultat de biologie a été repris hors des champs qui lui sont réservés (${champs}). ${issue}`;
}

const LIBELLES_CHAMPS: Record<ChampControle, string> = {
  resume_praticien: 'résumé praticien',
  axes_prioritaires: 'axes prioritaires',
  points_de_vigilance: 'points de vigilance',
  questions_entretien: 'questions d’entretien',
  narratif_patient: 'texte patient',
  limites: 'limites',
};
