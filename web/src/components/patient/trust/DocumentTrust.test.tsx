// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { getDocumentCourant } from '@/lib/trust/contenus/registre';
import { DocumentTrust, LigneVersion } from './DocumentTrust';

afterEach(cleanup);

// La version reste toujours visible (LOT-02) ; PAT-7m (F7 a) la sort seulement
// du bloc sable du consentement, où la page la rend sous le titre.
describe('DocumentTrust, ligne de version', () => {
  const doc = getDocumentCourant('consentement_suivi');

  it('rend la version par défaut', () => {
    render(<DocumentTrust document={doc} />);
    expect(screen.getByText(new RegExp(`^Version ${doc.version} — publiée le `))).toBeTruthy();
  });

  it('la laisse à la page quand elle la rend ailleurs', () => {
    const { container } = render(
      <>
        <LigneVersion document={doc} />
        <div data-testid="bloc"><DocumentTrust document={doc} versionAilleurs /></div>
      </>,
    );
    expect(screen.getAllByText(new RegExp(`^Version ${doc.version} — publiée le `))).toHaveLength(1);
    expect(container.querySelector('[data-testid="bloc"]')?.textContent).not.toMatch(/^Version /);
  });
});
