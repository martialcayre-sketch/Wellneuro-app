import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MESSAGE_SESSION_EXPIREE } from '@/app/portail/[token]/textesEntree';

// T-36 paraît sous « Session expirée. Reconnectez-vous. » ([[D-488]],
// amendement DOC-11). Les pages de PAT-6 affichent le message que sert la
// route et ne gardent la copie cliente que pour un corps illisible : les deux
// ne doivent jamais diverger (revue PR-Agent de #2146).
describe('message de session expirée — copie cliente et texte de la route', () => {
  it('le texte de la réponse 401 de `authentifierPatientPortail` est la copie cliente, mot pour mot', () => {
    const source = readFileSync(join(process.cwd(), 'src/lib/trust/portailAuth.ts'), 'utf8');
    expect(source).toContain(`error: '${MESSAGE_SESSION_EXPIREE}'`);
  });
});
