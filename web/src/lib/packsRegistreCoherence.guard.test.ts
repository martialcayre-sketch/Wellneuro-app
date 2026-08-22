import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

// LOT-03 (dette 4) — ce banc garde les deux propriétés que le SQL ne peut pas
// garder tout seul.
//
// 1. LE PRÉDICAT EST ÉCRIT DEUX FOIS. Le contrat de production et son test
//    négatif portent le même bloc. Rien, en SQL, n'empêche l'un de dériver de
//    l'autre — et le jour où ils divergent, le négatif éprouve un prédicat qui
//    n'est plus celui qui garde la production, tout en restant vert.
// 2. UN FICHIER POSÉ DANS `prisma/checks/` NE TOURNE NULLE PART tant qu'aucune
//    étape ne le nomme : il n'existe aucun runner générique. Un contrat non
//    câblé se lit pourtant comme un contrat.

const RACINE = path.resolve(__dirname, '../../..');
const CONTRAT = 'web/prisma/checks/packs_registre_coherence_v1.sql';
const NEGATIF = 'web/prisma/checks/packs_registre_coherence_v1_negatif.sql';
const CI = '.github/workflows/ci.yml';
const RELEASE_DB = '.github/workflows/release-db.yml';
// Depuis D-087 (2026-08-22), le workflow n'exécute plus rien contre la base :
// préflights et `migrate deploy` vivent dans ce script, joué en one-off dans
// l'image de production. C'est LUI qui porte l'ordre à garder.
const RELEASE_SCRIPT = 'web/scripts/release-db-scalingo.sh';

function lire(relatif: string): string {
  return readFileSync(path.join(RACINE, relatif), 'utf8');
}

const DEBUT = '-- >>> PREDICAT_COHERENCE_PACKS';
const FIN = '-- <<< PREDICAT_COHERENCE_PACKS';

// Le bloc, lignes rognées à droite : deux insertions à des profondeurs
// différentes ne doivent pas se lire comme une divergence, mais tout écart de
// CONTENU doit rougir.
function predicat(source: string, fichier: string): string {
  const debut = source.indexOf(DEBUT);
  const fin = source.indexOf(FIN);
  if (debut === -1 || fin === -1 || fin <= debut) {
    throw new Error(`${fichier} : marqueurs PREDICAT_COHERENCE_PACKS absents ou inversés`);
  }
  return source
    .slice(debut + DEBUT.length, fin)
    .split('\n')
    .map(ligne => ligne.trimEnd())
    .join('\n')
    .trim();
}

describe('packs ↔ miroir relationnel — les deux écritures du prédicat', () => {
  const blocContrat = predicat(lire(CONTRAT), CONTRAT);
  const blocNegatif = predicat(lire(NEGATIF), NEGATIF);

  it('le contrat et son test négatif portent le MÊME prédicat', () => {
    expect(blocNegatif).toBe(blocContrat);
  });

  // Anti-vacuité : sans ce cas, deux blocs vides seraient « identiques ».
  it('le prédicat porte bien ses trois assertions', () => {
    expect(blocContrat.length).toBeGreaterThan(500);
    const raises = blocContrat.match(/RAISE EXCEPTION/g) ?? [];
    expect(raises).toHaveLength(3);
    expect(blocContrat).toContain('qid sans definition');
    expect(blocContrat).toContain('packs/registre — derive');
    expect(blocContrat).toContain('miroir orphelin');
  });

  // La borne de l'invariant : « une fois un pack miroité, le miroir est
  // fidèle ». Supprimer la jointure d'UNE assertion ferait rougir le contrat sur
  // toute base seedée, et la réponse serait une exception dans le motif.
  //
  // PAR APPARTENANCE, JAMAIS PAR COMPTAGE. Un `match(/questionnaire_packs qp/g)`
  // global en trouve six (deux par assertion, la clause et le `RAISE`) : retirer
  // la jointure de l'assertion 1 en laisserait quatre, et un seuil « ≥ 3 »
  // resterait vert sur la régression même qu'il prétend interdire.
  it('CHAQUE assertion reste conditionnée à l’existence du miroir', () => {
    const assertions = blocContrat.split('IF EXISTS (').slice(1);
    expect(assertions).toHaveLength(3);

    // 1 et 2 partent des packs et exigent le miroir ; 3 part du miroir.
    expect(assertions[0]).toContain('JOIN questionnaire_packs qp ON qp.pack_id = p.id_pack');
    expect(assertions[1]).toContain('JOIN questionnaire_packs qp ON qp.pack_id = p.id_pack');
    expect(assertions[2]).toContain('FROM questionnaire_packs qp');
  });

  // Les deux propriétés que l'en-tête du contrat PROMET, et qu'un mutant peut
  // retirer sans que le fichier négatif ne bronche : la comparaison porte sur
  // des ENSEMBLES (`DISTINCT`) et ne dépend pas de l'ordre (`ORDER BY`), des
  // deux côtés. Les perdre transforme le préflight fail-closed en bloqueur de
  // release sur une base saine.
  it('la comparaison reste ensembliste et insensible à l’ordre, des DEUX côtés', () => {
    const derive = blocContrat.split('IF EXISTS (')[2];
    expect(derive).toContain('array_agg(DISTINCT x ORDER BY x)');
    expect(derive).toContain('array_agg(DISTINCT d.questionnaire_id ORDER BY d.questionnaire_id)');
    // Égalité, pas inclusion : un miroir PLUS RICHE que le legacy doit mordre.
    expect(derive).toContain('IS DISTINCT FROM');
    expect(derive).not.toMatch(/<@|@>/);
  });

  // Le contrat ne restreint aucune assertion aux packs actifs : sept des huit
  // packs de production sont inactifs, et un pack inactif se réactive.
  it('aucune assertion ne se restreint aux packs actifs', () => {
    expect(blocContrat).not.toMatch(/p\.actif/);
  });
});

describe('packs ↔ miroir relationnel — le contrat de production reste en lecture seule', () => {
  const contrat = lire(CONTRAT);

  // La propriété sur laquelle repose « rejouable sans risque CONTRE LA
  // PRODUCTION ». Vérifié le 2026-08-08 sur un PostgreSQL jetable : à travers
  // `prisma db execute`, un `CREATE TABLE` sous `BEGIN READ ONLY` est refusé par
  // le serveur (« cannot execute CREATE TABLE in a read-only transaction ») et
  // la table n'existe pas ensuite. La protection n'est pas décorative — encore
  // faut-il que la ligne reste.
  it('le contrat ouvre bien une transaction en lecture seule', () => {
    expect(contrat).toMatch(/^BEGIN READ ONLY;$/m);
  });

  it('le contrat ne porte aucun verbe d’écriture', () => {
    const sansCommentaires = contrat.replace(/--[^\n]*/g, ' ');
    expect(sansCommentaires).not.toMatch(/\b(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|GRANT)\b/i);
  });
});

describe('packs ↔ miroir relationnel — les contrats sont câblés', () => {
  const ci = lire(CI);
  const releaseDb = lire(RELEASE_DB);
  const releaseScript = lire(RELEASE_SCRIPT);

  // DEUX FOIS, ET LA SECONDE APRÈS LE SEED. Les deux positions ne prouvent pas
  // la même chose : avant le seed la base est vide et les assertions sont
  // vacues ; après, elles portent sur des données — c'est la seule position où
  // le contrat garde quelque chose en CI, et la seule qui tienne le seed, seul
  // écrivain de miroir hors `syncPackToRegistry`.
  //
  // Un `toContain` serait satisfait par l'une OU l'autre : retirer l'étape
  // « après seed » laisserait ce banc vert et ramènerait le CI à sa position
  // vacue. La position relative EST la propriété, donc c'est elle qu'on assère.
  it('le contrat tourne en CI deux fois, dont une APRÈS le seed', () => {
    const occurrences = [...ci.matchAll(/prisma\/checks\/packs_registre_coherence_v1\.sql/g)];
    expect(occurrences).toHaveLength(2);
    expect(occurrences[1].index).toBeGreaterThan(ci.indexOf('npm run prisma:seed'));
  });

  it('le test négatif tourne en CI — c’est lui qui prouve que le contrat mord', () => {
    expect(ci).toContain('prisma/checks/packs_registre_coherence_v1_negatif.sql');
  });

  // L'ORDRE, pas la présence. Une étape déplacée APRÈS `migrate deploy`
  // vérifierait la base une fois écrite : le préflight n'aurait plus de sens, et
  // une assertion de présence resterait verte — elle serait même satisfaite par
  // un simple commentaire. Depuis D-087, l'ordre vit dans le script du one-off.
  it('le préflight passe AVANT migrate deploy', () => {
    const preflight = releaseScript.indexOf(
      'prisma db execute --file prisma/checks/packs_registre_coherence_v1.sql',
    );
    const deploy = releaseScript.indexOf('npx prisma migrate deploy');
    expect(preflight).toBeGreaterThan(-1);
    expect(deploy).toBeGreaterThan(-1);
    expect(preflight).toBeLessThan(deploy);
  });

  // LE CAS QUI COMPTE. Le fichier négatif ÉCRIT (il pose des fixtures avant de
  // les annuler). Le câbler sur le chemin de release — workflow OU script du
  // one-off — le lancerait contre la base de production, où le dépôt n'écrit
  // que par migration relue.
  it('le test négatif ne tourne JAMAIS contre la production', () => {
    expect(releaseDb).not.toContain('packs_registre_coherence_v1_negatif');
    expect(releaseScript).not.toContain('packs_registre_coherence_v1_negatif');
  });
});
