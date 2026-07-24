// LOT-02a — Parseur des déclarations Compl'Alim (open data) → fiches normalisées.
//
// Source : « Déclarations de compléments alimentaires », DGAL / Ministère de
// l'Agriculture (reprise du jeu DGCCRF/Téléicare), Licence Ouverte v2.0.
//   https://www.data.gouv.fr/datasets/declarations-de-complements-alimentaires
//
// Entrée  : CSV `;` (utf-8-sig, champs multilignes, JSON embarqué) téléchargé
//           HORS dépôt dans ~/.wellneuro/supplements/source/declarations.csv.
// Sortie  : NDJSON de fiches normalisées (produit + composition + provenance)
//           dans ~/.wellneuro/supplements/normalized/fiches.ndjson.
//
// Chaque fiche porte un calcul DÉTERMINISTE du niveau de complétude et la
// liste explicite des données manquantes (dimensions qualitatives de la
// proposition §5 — jamais de score agrégé). Aucune écriture en base ici.
//
//   node tools/supplements/import/parse.mjs [--csv <chemin>] [--out <chemin>]
//     [--limit 2000] [--url-fichier <url>] [--date-telechargement AAAA-MM-JJ]

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const home = os.homedir();
const SOURCE_DIR = path.join(home, '.wellneuro', 'supplements', 'source');
const OUT_DIR = path.join(home, '.wellneuro', 'supplements', 'normalized');

const PROVENANCE = {
  source: "Compl'Alim — déclarations de compléments alimentaires (open data)",
  producteur: "DGAL / Ministère de l'Agriculture (reprise DGCCRF Téléicare 2016-2025)",
  urlJeu: 'https://www.data.gouv.fr/datasets/declarations-de-complements-alimentaires',
  licence: 'Licence Ouverte v2.0 (Etalab)',
};

function parseArgs() {
  const a = process.argv.slice(2);
  const o = {
    csv: path.join(SOURCE_DIR, 'declarations.csv'),
    out: path.join(OUT_DIR, 'fiches.ndjson'),
    limit: Infinity,
    urlFichier: 'https://cellar-c2.services.clever-cloud.com/compl-alim-prod/media/declarations.csv',
    dateTelechargement: null,
  };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--csv') o.csv = a[++i];
    else if (a[i] === '--out') o.out = a[++i];
    else if (a[i] === '--limit') o.limit = Number(a[++i]);
    else if (a[i] === '--url-fichier') o.urlFichier = a[++i];
    else if (a[i] === '--date-telechargement') o.dateTelechargement = a[++i];
  }
  return o;
}

// ---------------------------------------------------------------------------
// Parseur CSV `;` minimal (RFC 4180) : guillemets doublés, retours à la ligne
// dans les champs, BOM utf-8-sig. Générateur → pas de tableau géant en mémoire.
// ---------------------------------------------------------------------------
function* csvRecords(text, delim = ';') {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  let field = '';
  let record = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delim) {
      record.push(field); field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      record.push(field); field = '';
      if (record.length > 1 || record[0] !== '') yield record;
      record = [];
    } else field += c;
  }
  if (field !== '' || record.length > 0) {
    record.push(field);
    if (record.length > 1 || record[0] !== '') {
      // Un guillemet resté ouvert à la fin du fichier signale un enregistrement
      // tronqué (échantillon coupé au milieu d'un champ) : sentinelle `undefined`.
      yield inQuotes ? undefined : record;
    }
  }
}

// ---------------------------------------------------------------------------
// Décodage des valeurs embarquées
// ---------------------------------------------------------------------------
const vide = (s) => s == null || String(s).trim() === '';
const texte = (s) => (vide(s) ? null : String(s).trim());

// Listes/objets JSON embarqués. Certaines valeurs historiques (Téléicare) sont
// des répliques Python (`{'pays': 'FR'}`, `True`, `None`) : réparation
// prudente, sinon la valeur brute est conservée et une incertitude est notée.
function jsonEmbarque(s, incertitudes, champ) {
  const t = texte(s);
  if (t === null) return null;
  try { return JSON.parse(t); } catch { /* tentative de réparation */ }
  const repare = t
    .replace(/'/g, '"')
    .replace(/\bTrue\b/g, 'true')
    .replace(/\bFalse\b/g, 'false')
    .replace(/\bNone\b/g, 'null');
  try { return JSON.parse(repare); } catch { /* valeur brute conservée */ }
  incertitudes.push(`champ ${champ} non décodable en JSON — valeur brute conservée`);
  return t;
}

const enListe = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

// Quantité par DJR : les clés varient selon l'époque de la déclaration
// (`quantité_par_djr` accentuée, `quantite_par_djr`, `unité`/`unite`).
function quantite(obj) {
  if (obj == null || typeof obj !== 'object') return { dose: null, unite: null };
  const dose = obj['quantité_par_djr'] ?? obj.quantite_par_djr ?? null;
  const unite = obj['unité'] ?? obj.unite ?? null;
  const n = dose == null || dose === '' ? null : Number(dose);
  return { dose: Number.isFinite(n) ? n : null, unite: texte(unite) };
}

// ---------------------------------------------------------------------------
// Complétude — calcul déterministe, dimensions qualitatives (proposition §5).
// Liste explicite des données manquantes (abstention honnête), niveau nommé,
// JAMAIS de score agrégé.
// ---------------------------------------------------------------------------
const NIVEAUX = { BIEN: 'bien_documentee', PARTIELLE: 'partielle', LACUNAIRE: 'lacunaire' };

function completude(fiche) {
  const manquantes = [];
  const p = fiche.produit;
  const c = fiche.composition;

  if (p.marque === null) manquantes.push('marque non renseignée');
  if (p.formeGalenique === null) manquantes.push('forme galénique non renseignée');
  if (p.doseJournaliere === null) manquantes.push('dose journalière recommandée non renseignée');
  if (p.modeEmploi === null) manquantes.push("mode d'emploi non renseigné");
  if (p.misesEnGarde === null) manquantes.push('mises en garde non renseignées');
  if (p.objectifsEffet.length === 0) manquantes.push('objectif / effet non renseigné');
  if (p.populationsCibles.length === 0) manquantes.push('populations cibles non renseignées');
  if (p.facteursRisques.length === 0) manquantes.push('facteurs de risques non renseignés');
  if (p.dateDecision === null) manquantes.push('date de décision non renseignée');
  if (p.responsable.siret === null && p.responsable.vat === null) {
    manquantes.push('identification du responsable incomplète (ni SIRET ni TVA)');
  }

  const actifs = [
    ...c.plantes, ...c.microOrganismes, ...c.substances,
    ...c.nutriments, ...c.autresIngredientsActifs,
  ];
  const compositionAbsente = actifs.length === 0;
  if (compositionAbsente) manquantes.push('composition active absente (aucun composant actif déclaré)');

  const dosables = [...c.plantes, ...c.substances, ...c.microOrganismes.filter((m) => m.inactive !== true)];
  const sansDose = dosables.filter((x) => x.doseParDjr === null);
  if (dosables.length > 0 && sansDose.length > 0) {
    manquantes.push(`quantité par DJR manquante pour ${sansDose.length} composant(s) actif(s)`);
  }

  let niveau;
  if (compositionAbsente || manquantes.length >= 5) niveau = NIVEAUX.LACUNAIRE;
  else if (manquantes.length >= 1) niveau = NIVEAUX.PARTIELLE;
  else niveau = NIVEAUX.BIEN;

  return { niveau, manquantes };
}

// ---------------------------------------------------------------------------
// Normalisation d'un enregistrement CSV → fiche
// ---------------------------------------------------------------------------
const COLONNES = [
  'id', 'teleicare_id', 'numero_declaration_teleicare', 'article_procedure',
  'decision', 'date_decision', 'date_retrait', 'nom_commercial', 'marque',
  'gamme', 'responsable_mise_sur_marche', 'adresse_responsable_mise_sur_marche',
  'siret_responsable_mise_sur_marche', 'vat_responsable_mise_sur_marche',
  'forme_galenique', 'dose_journaliere', 'mode_emploi', 'mises_en_garde',
  'objectif_effet', 'aromes', 'facteurs_risques', 'populations_cibles',
  'plantes', 'ingredients_inactifs', 'micro_organismes', 'additifs',
  'nutriments', 'autres_ingredients_actifs', 'substances',
];

function normalise(row, provenance) {
  const incertitudes = [];
  const r = Object.fromEntries(COLONNES.map((c, i) => [c, row[i] ?? '']));

  const adresse = jsonEmbarque(r.adresse_responsable_mise_sur_marche, incertitudes, 'adresse_responsable');
  const plantes = enListe(jsonEmbarque(r.plantes, incertitudes, 'plantes')).map((x) => {
    const q = quantite(x);
    return {
      nom: texte(x?.nom) ?? (typeof x === 'string' ? x : null),
      partie: texte(x?.partie), preparation: texte(x?.preparation),
      doseParDjr: q.dose, unite: q.unite,
    };
  });
  const microOrganismes = enListe(jsonEmbarque(r.micro_organismes, incertitudes, 'micro_organismes')).map((x) => {
    const q = quantite(x);
    return {
      genre: texte(x?.genre), espece: texte(x?.['espèce'] ?? x?.espece), souche: texte(x?.souche),
      inactive: x?.['inactivé'] === true || x?.inactive === true || x?.['inactivé'] === 'True',
      doseParDjr: q.dose, unite: q.unite,
    };
  });
  const substances = enListe(jsonEmbarque(r.substances, incertitudes, 'substances')).map((x) => {
    const q = quantite(x);
    return { nom: texte(x?.nom) ?? (typeof x === 'string' ? x : null), doseParDjr: q.dose, unite: q.unite };
  });
  const listeSimple = (champ) =>
    enListe(jsonEmbarque(r[champ], incertitudes, champ)).map((x) => (typeof x === 'string' ? x : x?.nom ?? JSON.stringify(x))).filter(Boolean);

  const fiche = {
    sourceId: `complalim-${r.id}`,
    produit: {
      idComplAlim: Number(r.id),
      teleicareId: vide(r.teleicare_id) ? null : Number(r.teleicare_id),
      numeroDeclarationTeleicare: texte(r.numero_declaration_teleicare),
      nomCommercial: texte(r.nom_commercial),
      marque: texte(r.marque),
      gamme: texte(r.gamme),
      articleProcedure: texte(r.article_procedure),
      decision: texte(r.decision),
      dateDecision: texte(r.date_decision),
      dateRetrait: texte(r.date_retrait),
      formeGalenique: texte(r.forme_galenique),
      doseJournaliere: texte(r.dose_journaliere),
      modeEmploi: texte(r.mode_emploi),
      misesEnGarde: texte(r.mises_en_garde),
      aromes: listeSimple('aromes'),
      objectifsEffet: listeSimple('objectif_effet'),
      populationsCibles: listeSimple('populations_cibles'),
      facteursRisques: listeSimple('facteurs_risques'),
      responsable: {
        nom: texte(r.responsable_mise_sur_marche),
        adresse: typeof adresse === 'object' ? adresse : null,
        siret: texte(r.siret_responsable_mise_sur_marche),
        vat: texte(r.vat_responsable_mise_sur_marche),
      },
    },
    composition: {
      plantes,
      microOrganismes,
      substances,
      nutriments: listeSimple('nutriments'),
      autresIngredientsActifs: listeSimple('autres_ingredients_actifs'),
      ingredientsInactifs: listeSimple('ingredients_inactifs'),
      additifs: listeSimple('additifs'),
    },
    provenance,
    qualite: { niveauCompletude: null, donneesManquantes: [], incertitudes },
  };

  const { niveau, manquantes } = completude(fiche);
  fiche.qualite.niveauCompletude = niveau;
  fiche.qualite.donneesManquantes = manquantes;
  return fiche;
}

// ---------------------------------------------------------------------------
async function main() {
  const o = parseArgs();
  const debut = Date.now();

  const stat = await fsp.stat(o.csv).catch(() => null);
  if (!stat) {
    console.error(`Fichier source introuvable : ${o.csv}`);
    console.error('Télécharger l\'open data Compl\'Alim (voir README) hors dépôt, puis relancer.');
    process.exit(1);
  }
  const provenance = {
    ...PROVENANCE,
    urlFichier: o.urlFichier,
    dateTelechargement: o.dateTelechargement || stat.mtime.toISOString().slice(0, 10),
    tailleFichierOctets: stat.size,
  };

  const text = await fsp.readFile(o.csv, 'utf8');
  await fsp.mkdir(path.dirname(o.out), { recursive: true });
  const out = fs.createWriteStream(o.out, 'utf8');

  let entete = null;
  let n = 0;
  let ignorees = 0;
  const parNiveau = new Map();
  const parManquante = new Map();

  for (const rec of csvRecords(text)) {
    if (rec === undefined) { ignorees++; continue; } // enregistrement final tronqué (échantillon)
    if (entete === null) {
      entete = rec.map((h) => h.trim());
      const attendu = COLONNES.join(',');
      if (entete.join(',') !== attendu) {
        console.error('En-tête inattendu — le format source a peut-être changé.');
        console.error(`  attendu : ${attendu}`);
        console.error(`  reçu    : ${entete.join(',')}`);
        process.exit(1);
      }
      continue;
    }
    if (n >= o.limit) break;
    if (rec.length !== COLONNES.length) { ignorees++; continue; }
    const fiche = normalise(rec, provenance);
    out.write(JSON.stringify(fiche) + '\n');
    n++;
    parNiveau.set(fiche.qualite.niveauCompletude, (parNiveau.get(fiche.qualite.niveauCompletude) ?? 0) + 1);
    for (const m of fiche.qualite.donneesManquantes) {
      const cle = m.replace(/ \d+ /, ' N ');
      parManquante.set(cle, (parManquante.get(cle) ?? 0) + 1);
    }
  }
  await new Promise((res) => out.end(res));

  const s = (Date.now() - debut) / 1000;
  console.log(`Fiches normalisées : ${n} (${ignorees} enregistrement(s) ignoré(s) — tronqués ou malformés)`);
  console.log(`Sortie : ${o.out}`);
  console.log(`Durée : ${s.toFixed(1)} s\n`);
  console.log('Distribution des niveaux de complétude (qualitatifs, jamais agrégés) :');
  for (const [niv, cnt] of [...parNiveau.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${niv} : ${cnt}`);
  }
  console.log('\nDonnées manquantes les plus fréquentes :');
  for (const [m, cnt] of [...parManquante.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
    console.log(`  ${cnt} × ${m}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
