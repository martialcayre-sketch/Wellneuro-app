import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

// Garde structurelle de l'échafaudage de release Scalingo. Elle verrouille des
// invariants faciles à casser par mégarde lors d'une future édition :
//  - `start` reste SANS `-p` — Playwright lance `npm run start -- -p <port>` ;
//    un `-p` codé en dur ferait un double `-p` et casserait les E2E.
//  - le port Scalingo passe par `start:scalingo` (`$PORT`), sinon le routeur
//    coupe faute de liaison sur le bon port.
//  - le Procfile porte un `postdeploy` qui applique les migrations, sans quoi la
//    base Scalingo démarrerait sur un schéma en retard, silencieusement.

const WEB = join(__dirname, '..', '..');
const pkg = JSON.parse(readFileSync(join(WEB, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};
const procfile = readFileSync(join(WEB, 'Procfile'), 'utf8');

describe('Échafaudage de release Scalingo (structurel)', () => {
  it('`start` ne code aucun port en dur (piège du double -p Playwright)', () => {
    expect(pkg.scripts.start).toBe('next start');
    expect(pkg.scripts.start).not.toMatch(/-p\b/);
  });

  it('`start:scalingo` lie le serveur au $PORT fourni par Scalingo', () => {
    expect(pkg.scripts['start:scalingo']).toContain('-p ${PORT');
  });

  it('`db:deploy` délègue au script de migrations', () => {
    expect(pkg.scripts['db:deploy']).toContain('db-deploy.sh');
  });

  it('le Procfile démarre via start:scalingo et migre en postdeploy', () => {
    expect(procfile).toMatch(/^web:\s*npm run start:scalingo\s*$/m);
    expect(procfile).toMatch(/^postdeploy:\s*npm run db:deploy\s*$/m);
  });
});
