import { match, strictEqual } from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

// Ce que ce banc garde, et pourquoi il est écrit à l'envers de l'intuition :
// le risque de ce script n'est PAS de rater un blocage navigateur — un
// diagnostic muet laisse simplement la situation d'avant. Le risque est qu'il
// EXCUSE un échec applicatif réel, en annonçant « le rouge ne parle pas de
// votre code » sur un rouge qui, lui, en parle. Le cas négatif (réseau non
// vide) est donc le cas central, pas un complément.

const SCRIPT = fileURLToPath(new URL('./wn-diagnostic-e2e.mjs', import.meta.url));
const temporaires = [];

after(() => {
  for (const d of temporaires) rmSync(d, { recursive: true, force: true });
});

function dossierNeuf() {
  const d = mkdtempSync(join(tmpdir(), 'wn-diag-e2e-'));
  temporaires.push(d);
  return d;
}

/**
 * Archive ZIP minimale, entrées « stockées » (aucune compression).
 *
 * Le script ne lit que le répertoire central et n'y vérifie aucun CRC : le
 * champ est donc laissé à zéro, ce qui rend ce constructeur court sans rien
 * affaiblir de ce qui est testé (les noms et les tailles).
 */
function ecrireZip(chemin, entrees) {
  const locaux = [];
  const centraux = [];
  let decalage = 0;

  for (const { nom, contenu, tailleCompressee } of entrees) {
    const octets = Buffer.from(contenu, 'utf8');
    const nomOctets = Buffer.from(nom, 'utf8');

    const local = Buffer.alloc(30 + nomOctets.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(octets.length, 18);
    local.writeUInt32LE(octets.length, 22);
    local.writeUInt16LE(nomOctets.length, 26);
    nomOctets.copy(local, 30);
    locaux.push(local, octets);

    const central = Buffer.alloc(46 + nomOctets.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    // Taille COMPRESSÉE en 20, DÉCOMPRESSÉE en 24. Les fixtures peuvent les
    // dissocier : Playwright écrit des entrées dégonflées, où un fichier vide
    // pèse tout de même quelques octets une fois compressé. Sans cet écart, un
    // lecteur qui viserait le champ 20 passerait ce banc et casserait sur une
    // vraie trace.
    central.writeUInt32LE(tailleCompressee ?? octets.length, 20);
    central.writeUInt32LE(octets.length, 24);
    central.writeUInt16LE(nomOctets.length, 28);
    central.writeUInt32LE(decalage, 42);
    nomOctets.copy(central, 46);
    centraux.push(central);

    decalage += local.length + octets.length;
  }

  const repertoire = Buffer.concat(centraux);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(entrees.length, 8);
  fin.writeUInt16LE(entrees.length, 10);
  fin.writeUInt32LE(repertoire.length, 12);
  fin.writeUInt32LE(decalage, 16);

  writeFileSync(chemin, Buffer.concat([...locaux, repertoire, fin]));
}

const TIMEOUT_GOTO = `# Error details
\`\`\`
Test timeout of 120000ms exceeded.
\`\`\`
\`\`\`
Error: page.goto: Test timeout of 120000ms exceeded.
Call log:
  - navigating to "http://localhost:3118/portail/PAT_SEED_02/questionnaires", waiting until "load"
\`\`\`
`;

const ECHEC_ASSERTION = `# Error details
\`\`\`
Error: expect(locator).toBeVisible() failed
Locator: getByRole('heading', { name: 'Mon parcours' })
\`\`\`
`;

/** Pose un dossier d'échec Playwright vraisemblable. */
function poserEchec(racine, nom, { reseau, erreur }) {
  const d = join(racine, nom);
  mkdirSync(d, { recursive: true });
  ecrireZip(join(d, 'trace.zip'), [
    { nom: '0-trace.trace', contenu: '{"type":"before","apiName":"goto"}' },
    { nom: '0-trace.network', contenu: reseau },
  ]);
  if (erreur !== null) writeFileSync(join(d, 'error-context.md'), erreur);
  return d;
}

/**
 * Lance le script et rend `{ code, err }`.
 *
 * `spawnSync` et non `execFileSync` : ce dernier ne restitue `stderr` que
 * lorsque la commande échoue, or ce script sort délibérément en 0 même quand
 * il diagnostique — un banc bâti dessus lirait un `stderr` toujours vide et
 * passerait au vert sans rien vérifier.
 */
function lancerCapture(racine) {
  const res = spawnSync(process.execPath, [SCRIPT, racine], { encoding: 'utf8' });
  return { code: res.status, err: res.stderr };
}

describe('wn-diagnostic-e2e — ce qu’il refuse d’excuser', () => {
  it('réseau NON vide + goto expiré ⇒ AUCUN diagnostic', () => {
    // Le cas central. Une requête est partie : le serveur a été sollicité, donc
    // l'application peut parfaitement être en cause. Excuser ici serait
    // fabriquer un faux négatif — exactement ce que ce script prétend éviter.
    const racine = dossierNeuf();
    poserEchec(racine, 'hub-iPhone-13', {
      reseau: '{"type":"resource-snapshot","url":"http://localhost:3118/portail"}',
      erreur: TIMEOUT_GOTO,
    });

    const { code, err } = lancerCapture(racine);
    strictEqual(code, 0);
    strictEqual(err, '');
  });

  it('réseau vide MAIS échec d’assertion ⇒ aucun diagnostic', () => {
    // Sans navigation expirée, le journal réseau vide ne veut rien dire : un
    // test peut échouer sur une assertion avant toute requête.
    const racine = dossierNeuf();
    poserEchec(racine, 'hub-iPhone-13', { reseau: '', erreur: ECHEC_ASSERTION });

    const { code, err } = lancerCapture(racine);
    strictEqual(code, 0);
    strictEqual(err, '');
  });
});

describe('wn-diagnostic-e2e — ce qu’il nomme', () => {
  it('réseau vide + goto expiré ⇒ diagnostic, avec le nom du test', () => {
    const racine = dossierNeuf();
    poserEchec(racine, 'visual-hub-et-frise-iPhone-13', { reseau: '', erreur: TIMEOUT_GOTO });

    const { code, err } = lancerCapture(racine);
    strictEqual(code, 0, 'le diagnostic ne doit jamais changer le code de sortie');
    match(err, /AUCUNE requête HTTP émise/);
    match(err, /visual-hub-et-frise-iPhone-13/);
    // Il doit dire, noir sur blanc, que le rouge reste rouge : un lecteur
    // pressé ne doit pas pouvoir lire « c'est vert ».
    match(err, /Elle est rouge/);
  });

  it('compte plusieurs blocages et explore les sous-dossiers', () => {
    const racine = dossierNeuf();
    poserEchec(racine, 'un-iPhone-13', { reseau: '', erreur: TIMEOUT_GOTO });
    poserEchec(join(racine, 'retry1'), 'deux-iPhone-13', { reseau: '', erreur: TIMEOUT_GOTO });

    const { err } = lancerCapture(racine);
    match(err, /DIAGNOSTIC : 2 échec\(s\)/);
    match(err, /deux-iPhone-13/);
  });
});

describe('wn-diagnostic-e2e — il se tait plutôt que de deviner', () => {
  it('aucune trace ⇒ silence', () => {
    const { code, err } = lancerCapture(dossierNeuf());
    strictEqual(code, 0);
    strictEqual(err, '');
  });

  it('dossier inexistant ⇒ silence, pas de plantage', () => {
    const { code, err } = lancerCapture(join(dossierNeuf(), 'absent'));
    strictEqual(code, 0);
    strictEqual(err, '');
  });

  it('archive illisible ⇒ silence, pas de plantage', () => {
    // Un ZIP tronqué ne doit pas faire tomber le script : il tourne juste après
    // un échec de suite, au pire moment pour ajouter une erreur par-dessus.
    const racine = dossierNeuf();
    const d = join(racine, 'casse-iPhone-13');
    mkdirSync(d, { recursive: true });
    writeFileSync(join(d, 'trace.zip'), Buffer.from('pas un zip'));
    writeFileSync(join(d, 'error-context.md'), TIMEOUT_GOTO);

    const { code, err } = lancerCapture(racine);
    strictEqual(code, 0);
    strictEqual(err, '');
  });

  it('trace sans journal réseau du tout ⇒ silence', () => {
    // Absence de fichier `.network` ≠ journal vide. Ne rien conclure.
    const racine = dossierNeuf();
    const d = join(racine, 'sans-reseau-iPhone-13');
    mkdirSync(d, { recursive: true });
    ecrireZip(join(d, 'trace.zip'), [{ nom: '0-trace.trace', contenu: '{}' }]);
    writeFileSync(join(d, 'error-context.md'), TIMEOUT_GOTO);

    const { code, err } = lancerCapture(racine);
    strictEqual(code, 0);
    strictEqual(err, '');
  });

  it('goto expiré sans error-context ⇒ silence', () => {
    const racine = dossierNeuf();
    poserEchec(racine, 'muet-iPhone-13', { reseau: '', erreur: null });

    const { code, err } = lancerCapture(racine);
    strictEqual(code, 0);
    strictEqual(err, '');
  });
});

describe('wn-diagnostic-e2e — le lecteur de ZIP', () => {
  it('lit les tailles décompressées sans décompresser', () => {
    // Garde de non-régression du seul calcul du script : si ce lecteur se
    // trompait de champ, TOUT le diagnostic basculerait — un réseau plein
    // passerait pour vide, et le script excuserait n'importe quel échec.
    const racine = dossierNeuf();
    poserEchec(racine, 'plein-iPhone-13', { reseau: 'x', erreur: TIMEOUT_GOTO });

    const { err } = lancerCapture(racine);
    strictEqual(err, '', 'un octet de réseau suffit à interdire le diagnostic');

    const racine2 = dossierNeuf();
    poserEchec(racine2, 'vide-iPhone-13', { reseau: '', erreur: TIMEOUT_GOTO });
    match(lancerCapture(racine2).err, /AUCUNE requête/);
  });

  it('ne confond pas taille compressée et taille décompressée', () => {
    // Reproduit ce qu'écrit Playwright : un journal réseau VIDE dont l'entrée
    // dégonflée pèse deux octets. Un lecteur visant le champ « compressée »
    // lirait 2, conclurait « du réseau est passé » et se tairait — le
    // diagnostic ne se déclencherait plus jamais sur une vraie trace.
    const racine = dossierNeuf();
    const d = join(racine, 'deflate-iPhone-13');
    mkdirSync(d, { recursive: true });
    ecrireZip(join(d, 'trace.zip'), [
      { nom: '0-trace.trace', contenu: '{}' },
      { nom: '0-trace.network', contenu: '', tailleCompressee: 2 },
    ]);
    writeFileSync(join(d, 'error-context.md'), TIMEOUT_GOTO);

    match(lancerCapture(racine).err, /AUCUNE requête/);
  });
});
