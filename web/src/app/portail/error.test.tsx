// @vitest-environment jsdom
import { readFileSync } from 'fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

import PortailError from './error';

afterEach(cleanup);
beforeEach(() => refresh.mockClear());

const ERREUR = Object.assign(new Error('base injoignable'), { digest: 'abc123' });

describe('/portail — écran d’échec', () => {
  it('dit à la personne qu’elle n’a rien cassé et que ses données sont conservées', () => {
    render(<PortailError error={ERREUR} reset={() => {}} />);
    expect(screen.getByText(/vient de notre côté/i)).toBeTruthy();
    expect(screen.getByText(/conservées/i)).toBeTruthy();
  });

  it('donne les deux suites possibles : réessayer, ou passer par le praticien', () => {
    render(<PortailError error={ERREUR} reset={() => {}} />);
    expect(screen.getByText(/Réessayez dans quelques minutes/i)).toBeTruthy();
    expect(screen.getByText(/praticien/i)).toBeTruthy();
  });

  // `reset()` seul rejoue le même payload en échec quand l'erreur vient du
  // rendu serveur : le bouton semble alors ne rien faire, ce qui est l'impasse
  // que cet écran doit supprimer. Le rafraîchissement doit précéder.
  it('le bouton redemande le rendu au serveur, pas seulement un re-rendu local', () => {
    const reset = vi.fn();
    render(<PortailError error={ERREUR} reset={reset} />);
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(refresh).toHaveBeenCalledOnce();
    expect(reset).toHaveBeenCalledOnce();
  });

  it('le remplacement du contenu est annoncé et prend le focus', () => {
    // Sans cela, un lecteur d'écran ne signale rien et le focus retombe sur
    // `body` : la personne ne sait pas que la page a changé.
    render(<PortailError error={ERREUR} reset={() => {}} />);
    const alerte = screen.getByRole('alert');
    expect(alerte.textContent).toMatch(/n’a pas pu s’afficher/);
    expect(document.activeElement).toBe(alerte);
  });

  it('l’empreinte technique est affichée quand elle existe, jamais le message', () => {
    // Le message d'une exception peut nommer une table, une requête, un hôte —
    // ou porter une donnée patient ramassée en chemin.
    const avecDonnee = Object.assign(new Error('échec sur le dossier de Michel Dogné'), {
      digest: 'abc123',
    });
    const { container } = render(<PortailError error={avecDonnee} reset={() => {}} />);
    expect(screen.getByText(/abc123/)).toBeTruthy();
    expect(container.textContent).not.toMatch(/Michel Dogné/);
    expect(container.textContent).not.toMatch(/échec sur le dossier/);
  });

  it('le journal du navigateur ne reçoit ni message ni pile', () => {
    const journal = vi.spyOn(console, 'error').mockImplementation(() => {});
    const avecDonnee = Object.assign(new Error('échec sur le dossier de Michel Dogné'), {
      digest: 'abc123',
    });
    render(<PortailError error={avecDonnee} reset={() => {}} />);
    const charge = JSON.stringify(journal.mock.calls);
    expect(charge).toMatch(/abc123/);
    expect(charge).not.toMatch(/Michel Dogné/);
    expect(charge).not.toMatch(/stack/i);
    journal.mockRestore();
  });

  // Le cas courant, et non l'exception : `digest` n'est posé que par le rendu
  // serveur. Une erreur survenue dans le navigateur n'en porte pas — l'écran
  // doit rester entier sans lui.
  it('sans empreinte, aucune ligne vide et les deux suites restent offertes', () => {
    render(<PortailError error={new Error('erreur client')} reset={() => {}} />);
    expect(screen.queryByText(/Référence/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeTruthy();
    expect(screen.getByText(/praticien/i)).toBeTruthy();
  });

  // L'invariant du lot : un patient n'a que faire du nom de l'hébergeur, et le
  // dire renseignerait qui sonde le service. La transparence sur les
  // sous-traitants a son lieu — le document de confidentialité du registre.
  it('ne nomme aucun sous-traitant ni composant technique', () => {
    const { container } = render(<PortailError error={ERREUR} reset={() => {}} />);
    expect(container.textContent).not.toMatch(
      /scalingo|vercel|supabase|postgres|prisma|smtp|sentry|google|serveur|base de données/i,
    );
  });
});

describe('frontière d’erreur × notFound() — contrat de la dépendance', () => {
  // Ce que la revue adversariale redoutait : qu'`error.tsx` avale les
  // `notFound()` du segment (cinq appels côté portail), transformant une page
  // absente en « une erreur est survenue ». Next s'en garde en relançant ses
  // erreurs internes de routage au lieu de les capturer — mais c'est une
  // garantie de la dépendance, pas du dépôt. Ce banc l'épingle dans la source
  // installée : il rougira si une mise à jour retire ce relais.
  it('Next relance ses erreurs de routage au lieu de les capturer', () => {
    const chargeur = createRequire(__filename);
    const source = readFileSync(
      join(dirname(chargeur.resolve('next/package.json')), 'dist', 'client', 'components', 'error-boundary.js'),
      'utf8',
    );
    // La forme compilée varie d'une version à l'autre (préfixe d'interop du
    // module) : on épingle la séquence, pas sa syntaxe exacte — le test de
    // routage suivi d'un `throw` dans le dérivateur d'état.
    const derivateur = source.match(/getDerivedStateFromError\(error\)\s*\{[\s\S]{0,400}?\}/)?.[0];
    expect(derivateur).toBeDefined();
    expect(derivateur).toMatch(/isNextRouterError/);
    expect(derivateur).toMatch(/throw error/);
  });
});
