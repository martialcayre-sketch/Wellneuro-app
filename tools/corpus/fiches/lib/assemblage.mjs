// L'ASSEMBLAGE D'UNE FICHE ADAPTÉE, APRÈS CONTRE-LECTURE ([[D-251]] §5, lot 5)
// — pur, sans modèle, sans réseau, sans fichier.
//
// LA RÈGLE : « un désaccord exclut le bloc », sans repêchage automatique. Elle
// se décline selon ce que l'élément porte :
//   — un BLOC refusé est exclu ; une section que ses exclusions vident l'est
//     aussi ;
//   — un TITRE DE SECTION refusé exclut sa section entière : des blocs sous un
//     titre faux seraient lus sous ce titre ;
//   — une PRÉCAUTION refusée fait ÉCHOUER la fiche. Elle porte une réserve de
//     sécurité qui doit partir ; l'exclure produirait une fiche sans elle, ce
//     que [[D-227]] §3 interdit (« une éviction ne part jamais sans ses
//     bornes ») ;
//   — le TITRE DE LA FICHE refusé la fait échouer ;
//   — une fiche sans section restante échoue.
//
// UNE CONTRE-LECTURE INCOMPLÈTE FAIT ÉCHOUER LA FICHE (constat de revue). Un
// élément sans verdict, ou dont l'appel a échoué, n'a été ni accepté ni refusé :
// l'exclure produirait une fiche amputée par une panne, déposable comme si un
// relecteur l'avait voulue. L'absence n'est pas un accord, ni un refus (`DC-24`).
//
// UNE SECTION AMPUTÉE EST RELUE ENTIÈRE (constat de revue). Exclure un bloc
// peut retirer à son voisin la borne ou la condition qu'il portait (« À éviter
// pendant … : » exclu, « les charcuteries » gardé). Chaque section qui a perdu
// un bloc repasse donc en contre-lecture comme un tout ; un refus l'exclut.
//
// AUCUN TEXTE DANS CE QUI S'IMPRIME. Les résumés ne rendent que des comptes et
// des identifiants ; le texte ne sort que vers les fichiers hors dépôt.

import path from 'node:path';

/** Une erreur dont le message ne porte QUE des identifiants — imprimable. */
export class ErreurOutil extends Error {
  constructor(message) {
    super(message);
    this.name = 'ErreurOutil';
  }
}

/** Le JSON d'une réponse de modèle, clôture de code ou préambule tolérés. */
export function parseJsonLache(txt) {
  let s = (txt || '').trim();
  const cloture = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (cloture) s = cloture[1].trim();
  const debut = s.search(/[[{]/);
  if (debut > 0) s = s.slice(debut);
  return JSON.parse(s);
}

/**
 * Les éléments à contre-lire, chacun avec un identifiant stable — `titre`,
 * `precaution:<p>`, `section:<s>`, `bloc:<s>:<b>` (rangs à partir de 1) — et
 * son CONTEXTE, en lecture seule : un bloc se lit sous le titre de sa section,
 * un titre de section avec ses blocs, le titre de la fiche avec ses sections.
 * Sans lui, un bloc fidèle placé sous un titre fidèle pouvait inverser le sens
 * sans qu'aucun des deux relecteurs ne le voie (constat de revue).
 */
export function unitesAContreLire(contenu) {
  const unites = [
    {
      id: 'titre',
      nature: 'titre de la fiche',
      texte: contenu.titre,
      claims: [],
      contexte: `Titres de ses sections :\n${contenu.sections.map(s => `- ${s.titre}`).join('\n')}`,
    },
  ];
  contenu.precautions.forEach((p, i) => {
    unites.push({ id: `precaution:${i + 1}`, nature: 'précaution', texte: p.texte, claims: [...p.claims], contexte: '' });
  });
  contenu.sections.forEach((section, s) => {
    unites.push({
      id: `section:${s + 1}`,
      nature: 'titre de section',
      texte: section.titre,
      claims: [],
      contexte: `Blocs placés sous ce titre :\n${section.blocs.map(b => `- ${b.texte}`).join('\n')}`,
    });
    section.blocs.forEach((bloc, b) => {
      const verbatim = bloc.provenance.type === 'verbatim';
      unites.push({
        id: `bloc:${s + 1}:${b + 1}`,
        nature: verbatim ? 'bloc repris mot pour mot de la source' : 'bloc reformulé depuis des claims',
        texte: bloc.texte,
        claims: verbatim ? [] : [...bloc.provenance.claims],
        contexte: `Titre de sa section : ${section.titre}`,
      });
    });
  });
  return unites;
}

/** Une contre-lecture qui n'a pas abouti : ni accord, ni refus. */
function incomplete(verdicts, id) {
  const v = verdicts.get(id);
  return !v || v.technique === true;
}

function refuse(verdicts, id) {
  return verdicts.get(id).fidele !== true;
}

/**
 * La fiche retenue après les verdicts, ou son échec — et, dans les deux cas,
 * la liste des éléments exclus avec la raison du relecteur. Les sections qui
 * ont perdu un bloc sont nommées dans `aRelire`, pour la seconde passe.
 *
 * @param contenu  ContenuFicheAssiette rédigé
 * @param verdicts Map<id, { fidele: boolean, raison: string, technique?: true }>
 */
export function appliquerVerdicts(contenu, verdicts) {
  const ids = unitesAContreLire(contenu).map(u => u.id);
  const manquants = ids.filter(id => incomplete(verdicts, id));
  if (manquants.length > 0) {
    return {
      issue: 'echec',
      motif: 'contre_lecture_incomplete',
      exclusions: manquants.map(id => ({ id, raison: verdicts.get(id)?.raison || 'aucun verdict de contre-lecture' })),
    };
  }

  const exclusions = [];
  const exclure = id => exclusions.push({ id, raison: verdicts.get(id).raison });

  if (refuse(verdicts, 'titre')) {
    exclure('titre');
    return { issue: 'echec', motif: 'titre_refuse', exclusions };
  }
  const precautionsRefusees = contenu.precautions.map((_, i) => `precaution:${i + 1}`).filter(id => refuse(verdicts, id));
  if (precautionsRefusees.length > 0) {
    precautionsRefusees.forEach(exclure);
    return { issue: 'echec', motif: 'precaution_refusee', exclusions };
  }

  const sections = [];
  const aRelire = [];
  contenu.sections.forEach((section, s) => {
    const idSection = `section:${s + 1}`;
    if (refuse(verdicts, idSection)) {
      exclure(idSection);
      return;
    }
    const blocs = section.blocs.filter((_, b) => {
      const idBloc = `bloc:${s + 1}:${b + 1}`;
      if (!refuse(verdicts, idBloc)) return true;
      exclure(idBloc);
      return false;
    });
    if (blocs.length === 0) {
      exclusions.push({ id: idSection, raison: 'tous ses blocs ont été exclus' });
      return;
    }
    if (blocs.length < section.blocs.length) aRelire.push(sections.length);
    sections.push({ titre: section.titre, blocs });
  });
  if (sections.length === 0) return { issue: 'echec', motif: 'aucune_section', exclusions };

  return {
    issue: 'retenue',
    contenu: { titre: contenu.titre, precautions: contenu.precautions, sections },
    exclusions,
    aRelire,
  };
}

/**
 * Les sections amputées, à relire ENTIÈRES : identifiant `relue:<s>` (rang dans
 * la fiche retenue, à partir de 1), titre et blocs restants ensemble.
 */
export function sectionsARelire(contenuRetenu, aRelire) {
  return aRelire.map(s => {
    const section = contenuRetenu.sections[s];
    return {
      id: `relue:${s + 1}`,
      nature: 'section entière, relue après l’exclusion de certains de ses blocs',
      texte: [section.titre, ...section.blocs.map(b => b.texte)].join('\n'),
      claims: [...new Set(section.blocs.flatMap(b => (b.provenance.type === 'claims' ? b.provenance.claims : [])))],
      contexte: '',
    };
  });
}

/**
 * La seconde passe : une section amputée refusée est exclue ; une relecture
 * incomplète fait échouer la fiche, comme à la première passe.
 */
export function appliquerRelecture(assemblage, verdicts) {
  const unites = sectionsARelire(assemblage.contenu, assemblage.aRelire);
  const manquantes = unites.filter(u => incomplete(verdicts, u.id));
  if (manquantes.length > 0) {
    return {
      issue: 'echec',
      motif: 'contre_lecture_incomplete',
      exclusions: [
        ...assemblage.exclusions,
        ...manquantes.map(u => ({ id: u.id, raison: verdicts.get(u.id)?.raison || 'aucun verdict de contre-lecture' })),
      ],
    };
  }
  const refusees = new Set(unites.filter(u => refuse(verdicts, u.id)).map(u => u.id));
  const exclusions = [
    ...assemblage.exclusions,
    ...[...refusees].map(id => ({ id, raison: verdicts.get(id).raison })),
  ];
  const sections = assemblage.contenu.sections.filter((_, s) => !refusees.has(`relue:${s + 1}`));
  if (sections.length === 0) return { issue: 'echec', motif: 'aucune_section', exclusions };
  return { issue: 'retenue', contenu: { ...assemblage.contenu, sections }, exclusions };
}

/** Des comptes, jamais du texte : ce qui peut s'imprimer. */
export function resumeSansTexte(contenu) {
  return {
    precautions: contenu.precautions.length,
    sections: contenu.sections.length,
    blocs: contenu.sections.reduce((n, s) => n + s.blocs.length, 0),
  };
}

/**
 * Le nom et le code d'une erreur, jamais son message — sauf une `ErreurOutil`,
 * écrite pour ne porter que des identifiants. Le message d'un `JSON.parse`
 * cite un extrait de son entrée, et celui d'un SDK peut recopier la requête.
 */
export function erreurSansTexte(e) {
  if (e instanceof ErreurOutil) return e.message;
  const nom = e instanceof Error ? e.name : typeof e;
  const code = e && typeof e === 'object' ? (e.status ?? e.code ?? '') : '';
  return code === '' ? nom : `${nom} (${code})`;
}

/**
 * Le chemin d'un rapport écrit à côté d'un brouillon, quel que soit le nom de
 * celui-ci — jamais le brouillon lui-même (constat de revue : un nom sans
 * « .json » était écrasé par son propre rapport de refus).
 */
export function cheminVoisin(fichier, suffixe) {
  const { dir, name } = path.parse(fichier);
  const voisin = path.join(dir, `${name}-${suffixe}.json`);
  if (path.resolve(voisin) === path.resolve(fichier)) throw new ErreurOutil(`Rapport et brouillon auraient le même chemin : ${fichier}`);
  return voisin;
}

/**
 * `fn` sur chaque élément, au plus `limite` à la fois, résultats dans l'ordre.
 * Borne les appels simultanés au relecteur : une rafale sans borne se fait
 * limiter par le fournisseur, et chaque limitation fait échouer la fiche.
 */
export async function enParallele(elements, limite, fn) {
  const resultats = new Array(elements.length);
  let suivant = 0;
  const travailleur = async () => {
    while (suivant < elements.length) {
      const i = suivant++;
      resultats[i] = await fn(elements[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limite, elements.length) }, travailleur));
  return resultats;
}

const HOTES_LOCAUX = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * L'adresse de la route d'ingestion, depuis une cible NOMMÉE sur la ligne de
 * commande — jamais tirée de l'environnement, pour qu'un envoi en production ne
 * parte jamais d'un fichier `.env` oublié. `http:` n'est admis qu'en local.
 */
export function adresseDIngestion(cible) {
  if (!cible) throw new ErreurOutil('--cible est obligatoire : l’adresse de l’application visée, écrite en toutes lettres.');
  let url;
  try {
    url = new URL(cible);
  } catch {
    throw new ErreurOutil('--cible : adresse illisible.');
  }
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && HOTES_LOCAUX.has(url.hostname))) {
    throw new ErreurOutil('--cible : https exigé hors de la machine locale.');
  }
  return { hote: url.host, adresse: new URL('/api/internal/fiches-assiette/ingest', url).href };
}
