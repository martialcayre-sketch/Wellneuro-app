// LES ENTRÉES D'UNE ADAPTATION, LUES SUR LE MAC ET VÉRIFIÉES ([[D-251]] §3,
// lot 5). Rien n'est lu en production : ni base, ni route.
//
// LA SOURCE. Le texte est l'extraction `canonical.md`, envoyée ENTIÈRE, octet
// pour octet, marqueurs de page compris : c'est elle que la relecture du lot 6
// confronte à l'adaptation. Son ancrage est l'empreinte du PDF tenue par le
// manifeste du snapshot, RECALCULÉE ici sur le fichier : un PDF remplacé depuis
// le snapshot fait échouer la fiche au lieu de partir sous une empreinte qui ne
// le désigne plus. Le compte des pages extraites doit égaler celui des
// marqueurs, sans quoi une page manque au texte.
//
// LES CLAIMS. Ils viennent de l'instantané local du lot de claims (texte,
// clé, empreinte). Chaque texte est revérifié contre son empreinte : un claim
// dont le texte a bougé n'est pas le claim validé. Le statut VALIDE, lui, ne se
// sait qu'en production — la route du lot 4 le tranche au dépôt, et refuse.
//
// AUCUN TEXTE DANS LES ERREURS : elles nomment un fichier ou une clé.

import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { sha256WellneuroText } from '../../lib/wellneuro-text.mjs';
import { ErreurOutil } from './assemblage.mjs';

export const RACINE_CORPUS = path.join(os.homedir(), '.wellneuro', 'corpus');
export const CLAIMS_PAR_DEFAUT = path.join(RACINE_CORPUS, 'claims', 'draft-LOT_004_2026-07-25.json');
export const SORTIES = path.join(RACINE_CORPUS, 'fiches');

const RE_MARQUEUR_PAGE = /^<!-- page \d+ \(lecture [A-Z]\) -->$/gm;

async function sha256Fichier(chemin) {
  return createHash('sha256').update(await readFile(chemin)).digest('hex');
}

/**
 * Un fichier JSON, ou une erreur qui ne nomme QUE le fichier. Le message d'un
 * `JSON.parse` en échec cite la ligne fautive — ici, du texte de claim ou de
 * manifeste (constat de revue).
 */
async function lireJson(chemin, quoi) {
  let brut;
  try {
    brut = await readFile(chemin, 'utf8');
  } catch {
    throw new ErreurOutil(`${quoi} introuvable : ${chemin}`);
  }
  try {
    return JSON.parse(brut);
  } catch {
    throw new ErreurOutil(`${quoi} illisible (JSON invalide) : ${chemin}`);
  }
}

/** Le texte source d'une fiche et l'empreinte de son PDF, vérifiés. */
export async function chargerSource(sourceId, racine = RACINE_CORPUS) {
  const manifeste = (await lireJson(path.join(racine, 'manifest.json'), 'manifeste')).manifeste ?? {};
  const entree = manifeste[sourceId];
  if (!entree?.localPath || !/^[0-9a-f]{64}$/.test(entree.sha256 ?? '')) {
    throw new ErreurOutil(`${sourceId} : absent du manifeste, ou sans empreinte.`);
  }
  let recalculee;
  try {
    recalculee = await sha256Fichier(entree.localPath);
  } catch {
    throw new ErreurOutil(`${sourceId} : PDF introuvable au chemin du manifeste.`);
  }
  if (recalculee !== entree.sha256) {
    throw new ErreurOutil(`${sourceId} : le PDF ne correspond plus à l'empreinte du manifeste — refaire snapshot et extraction.`);
  }

  const dossier = path.join(racine, 'extracted', sourceId);
  let texteSource;
  let fichiers;
  try {
    texteSource = await readFile(path.join(dossier, 'canonical.md'), 'utf8');
    fichiers = await readdir(dossier);
  } catch {
    throw new ErreurOutil(`${sourceId} : extraction introuvable (${dossier}).`);
  }
  const marqueurs = texteSource.match(RE_MARQUEUR_PAGE)?.length ?? 0;
  const pages = fichiers.filter(f => /^p\d{3}\.json$/.test(f)).length;
  if (marqueurs === 0 || marqueurs !== pages) {
    throw new ErreurOutil(`${sourceId} : ${pages} page(s) extraite(s) pour ${marqueurs} marqueur(s) dans canonical.md.`);
  }
  return { texteSource, sourceSha256: entree.sha256, pages, appariement: entree.matchConfidence ?? 'inconnu' };
}

/**
 * Les claims de l'instantané local, par clé `claimId::versionClaim`. Un claim
 * dont le texte ne redonne pas son empreinte est écarté, et compté.
 */
export async function chargerClaimsLocaux(fichier = CLAIMS_PAR_DEFAUT) {
  const brut = await lireJson(fichier, 'instantané des claims');
  const liste = Array.isArray(brut) ? brut : (brut.claims ?? []);
  const claims = new Map();
  const empreintesFausses = [];
  for (const c of liste) {
    const cle = `${c.claimId}::${c.versionClaim}`;
    if (typeof c.texteNormalise !== 'string' || sha256WellneuroText(c.texteNormalise) !== c.contentSha256) {
      empreintesFausses.push(cle);
      continue;
    }
    claims.set(cle, { sourceId: c.sourceId, texte: c.texteNormalise });
  }
  return { claims, empreintesFausses };
}
