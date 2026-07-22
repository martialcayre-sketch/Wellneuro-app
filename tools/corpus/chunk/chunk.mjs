// Phase 2 — Étage chunk (conforme SPEC_DECOUPAGE_RAG.md).
//
// Découpe le markdown canonique verbatim d'une source en fragments par UNITÉS
// DE SENS (cible 350-800 mots), jamais une longueur fixe aveugle. Garde-fous de
// la spec, tenus par construction :
//   - on ne coupe jamais à l'intérieur d'un bloc (paragraphe, tableau) → une
//     dose n'est jamais séparée de son unité, une ligne de tableau jamais coupée ;
//   - les frontières de fragment tombent sur les titres (unités de sens) ;
//   - les tableaux restent d'un seul tenant.
//
// Produit des chunks conformes au contrat d'ingest RAG. Le `content` porte un
// front matter YAML (métadonnées SPEC) + le corps ; `contentSha256` couvre le
// tout via la réplique éprouvée de normalizeWellneuroText.
//
// Aucune donnée patient (compartment ACTIF, patientIdentifiable false imposés).

import { sha256WellneuroText } from '../lib/wellneuro-text.mjs';

const CIBLE_MIN = 350;
const CIBLE_MAX = 800;

function numSource(sourceId) {
  const m = /^WN-SRC-(\d{4})$/.exec(sourceId);
  if (!m) throw new Error(`sourceId invalide : ${sourceId}`);
  return m[1];
}

function nbMots(s) {
  return (s.trim().match(/\S+/g) || []).length;
}

// Découpe le markdown canonique en « blocs » atomiques, en suivant la page et la
// section courantes. Un bloc = un paragraphe OU un tableau entier OU un titre.
function enBlocs(md) {
  const lignes = md.split('\n');
  const blocs = [];
  let page = 1;
  let i = 0;
  const estTable = (l) => /^\s*\|/.test(l);
  while (i < lignes.length) {
    const l = lignes[i];
    const mPage = /^<!--\s*page\s+(\d+)/.exec(l);
    if (mPage) { page = Number(mPage[1]); i++; continue; }
    if (l.trim() === '') { i++; continue; }
    if (/^#{1,6}\s/.test(l)) { blocs.push({ type: 'titre', texte: l.trim(), page }); i++; continue; }
    if (estTable(l)) {
      const buf = [];
      while (i < lignes.length && (estTable(lignes[i]) || lignes[i].trim() === '')) {
        if (lignes[i].trim() !== '') buf.push(lignes[i]);
        i++;
      }
      blocs.push({ type: 'table', texte: buf.join('\n'), page });
      continue;
    }
    // paragraphe : jusqu'à ligne vide, titre ou table
    const buf = [];
    while (i < lignes.length && lignes[i].trim() !== '' && !/^#{1,6}\s/.test(lignes[i]) && !estTable(lignes[i]) && !/^<!--\s*page/.test(lignes[i])) {
      buf.push(lignes[i]); i++;
    }
    blocs.push({ type: 'para', texte: buf.join('\n'), page });
  }
  return blocs;
}

// Regroupe les blocs en fragments par unité de sens.
function fragmenter(blocs) {
  const frags = [];
  let buf = [];
  let mots = 0;
  let section = 'Introduction';
  let pageMin = blocs[0]?.page ?? 1;
  let pageMax = pageMin;

  const flush = () => {
    if (!buf.length) return;
    frags.push({ section, pageMin, pageMax, corps: buf.map((b) => b.texte).join('\n\n') });
    buf = []; mots = 0;
  };

  for (const b of blocs) {
    if (b.type === 'titre') {
      // Frontière d'unité de sens : on ferme le fragment courant s'il est assez
      // dense, puis le titre ouvre le suivant.
      if (mots >= CIBLE_MIN) flush();
      section = b.texte.replace(/^#{1,6}\s+/, '');
      if (!buf.length) { pageMin = b.page; pageMax = b.page; }
      buf.push(b); // le titre reste en tête de son fragment
      continue;
    }
    if (!buf.length) { pageMin = b.page; pageMax = b.page; }
    buf.push(b);
    pageMax = Math.max(pageMax, b.page);
    mots += nbMots(b.texte);
    // Au-delà de la cible max, on ferme sur la prochaine frontière de bloc
    // (jamais au milieu d'un bloc → dose/tableau préservés).
    if (mots >= CIBLE_MAX) flush();
  }
  flush();

  // Un résidu final trop court (< cible min) est fusionné dans le fragment
  // précédent : un fragment de 50 mots isole mal pour la récupération.
  if (frags.length >= 2) {
    const dernier = frags[frags.length - 1];
    if (nbMots(dernier.corps) < CIBLE_MIN) {
      const avant = frags[frags.length - 2];
      avant.corps = `${avant.corps}\n\n${dernier.corps}`;
      avant.pageMax = Math.max(avant.pageMax, dernier.pageMax);
      frags.pop();
    }
  }
  return frags;
}

function frontMatter(meta) {
  const q = (v) => JSON.stringify(v);
  return [
    '---',
    `source_id: ${meta.sourceId}`,
    `source_version: ${meta.versionSource}`,
    `markdown_version: ${meta.versionChunk}`,
    `titre: ${q(meta.titre)}`,
    `section: ${q(meta.section)}`,
    `page_source: ${meta.pageMin === meta.pageMax ? meta.pageMin : `${meta.pageMin}-${meta.pageMax}`}`,
    `notebook_principal: ${q(meta.notebook)}`,
    `statut_documentaire: ${meta.statut}`,
    `audience: ${q(meta.audience)}`,
    `niveau_preuve: ${q(meta.niveauPreuve)}`,
    `prescriptif: ${meta.prescriptif}`,
    `date_validation: ${meta.dateValidation}`,
    `validateur: ${q(meta.validateur)}`,
    '---',
    '',
  ].join('\n');
}

/**
 * Construit les chunks d'une source à partir de son markdown canonique verbatim.
 * @param {object} p
 * @param {string} p.batchId
 * @param {string} p.sourceId
 * @param {string} p.notebook
 * @param {string} p.titre            titre de la source (registre)
 * @param {string} p.canonicalMd      markdown verbatim (sortie extract)
 * @param {object} p.registre         notice registre (audience, prescriptif, importance…)
 * @param {string} [p.llmAmendmentModel]
 * @param {string} [p.validationEvidence]
 * @param {string} [p.sourceDriveId]
 * @param {string} [p.versionSource='v1.0']
 * @param {string} [p.versionChunk='v1.0']
 * @returns {Array<object>} chunks prêts pour l'ingest
 */
export function chunksDeSource(p) {
  const {
    batchId, sourceId, notebook, titre, canonicalMd, registre = {},
    llmAmendmentModel, validationEvidence, sourceDriveId,
    versionSource = 'v1.0', versionChunk = 'v1.0',
  } = p;
  const num = numSource(sourceId);
  const frags = fragmenter(enBlocs(canonicalMd));

  // La couche verbatim n'est pas encore validée praticien : statut explicite.
  const statut = 'VERBATIM_EN_ATTENTE_VALIDATION';
  const audience = registre.audienceOriginal || 'Mixte';
  const niveauPreuve = registre.authorityClass === 'COURSE_SIIN'
    ? 'support pédagogique SIIN' : 'source interne à classifier';
  const prescriptif = registre.prescriptive === true;

  return frags.map((f, i) => {
    const seq = String(i + 1).padStart(3, '0');
    const chunkId = `WN-CH-${num}-${seq}`;
    const fm = frontMatter({
      sourceId, versionSource, versionChunk, titre, section: f.section,
      pageMin: f.pageMin, pageMax: f.pageMax, notebook, statut, audience,
      niveauPreuve, prescriptif, dateValidation: 'EN_ATTENTE', validateur: 'EN_ATTENTE',
    });
    const content = `${fm}${f.corps.trim()}\n`;
    const chunk = {
      batchId, sourceId, chunkId, versionSource, versionChunk,
      notebook, section: f.section, content,
      contentSha256: sha256WellneuroText(content),
      metadata: {
        page_source: f.pageMin === f.pageMax ? f.pageMin : `${f.pageMin}-${f.pageMax}`,
        statut_documentaire: statut, niveau_preuve: niveauPreuve, prescriptif,
      },
      compartment: 'ACTIF', indexationAutorisee: true, patientIdentifiable: false,
    };
    if (llmAmendmentModel) chunk.llmAmendmentModel = llmAmendmentModel;
    if (validationEvidence) chunk.validationEvidence = validationEvidence;
    if (sourceDriveId) chunk.sourceDriveId = sourceDriveId;
    return chunk;
  });
}

export function batchId(numero, dateISO) {
  return `LOT_${String(numero).padStart(3, '0')}_${dateISO}`;
}
