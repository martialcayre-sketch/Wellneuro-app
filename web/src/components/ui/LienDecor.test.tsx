// @vitest-environment jsdom
import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import path from 'path';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LIEN_DECOR, LienDecor, classesAdmises, type LienDecorProps } from './LienDecor';

// Banc de réception de COM-1 ([[D-481]] §1 bis et §1 quater) : nœud décoratif
// hors de l'arbre d'accessibilité, sans pointeur, caché à l'impression ;
// aucun mouvement, y compris sans `prefers-reduced-motion` ; seuls les
// éléments nommés aux emplacements retenus sont acceptés.

afterEach(cleanup);

const WEB = path.resolve(__dirname, '../../..');
const PUBLIC = path.join(WEB, 'public');

const TOUS: LienDecorProps[] = [
  { emplacement: 'connexion-praticien' },
  { emplacement: 'entree-patient' },
  { emplacement: 'deux-voix' },
  { emplacement: 'entete-fiche', element: 'alliance-arcs' },
  { emplacement: 'entete-fiche', element: 'linked-loops-muted' },
  { emplacement: 'etat-vide', element: 'nutrition-sprout' },
  { emplacement: 'etat-vide', element: 'neural-branches' },
];

const nom = (p: LienDecorProps) => `${p.emplacement}${p.element ? ` / ${p.element}` : ''}`;

function rendre(p: LienDecorProps) {
  const { container } = render(
    <div>
      <p>Contenu</p>
      <LienDecor {...p} />
    </div>,
  );
  const noeud = container.querySelector<HTMLElement>('[data-lien-decor]');
  return { container, noeud };
}

function fichiersDe(noeud: HTMLElement): string[] {
  return [noeud, ...Array.from(noeud.querySelectorAll<HTMLElement>('*'))]
    .map((n) => /url\(["']?([^"')]+)["']?\)/.exec(n.style.backgroundImage)?.[1])
    .filter((f): f is string => Boolean(f));
}

describe('LienDecor — décoratif seulement', () => {
  it.each(TOUS.map((p) => [nom(p), p] as const))('%s : hors de l’arbre d’accessibilité', (_, p) => {
    const { noeud } = rendre(p);
    expect(noeud).not.toBeNull();
    expect(noeud!.getAttribute('aria-hidden')).toBe('true');
    expect(noeud!.textContent).toBe('');
    expect(noeud!.querySelector('img, svg, [role], [tabindex], a, button, input')).toBeNull();
    expect(noeud!.hasAttribute('role')).toBe(false);
    expect(noeud!.hasAttribute('tabindex')).toBe(false);
  });

  it.each(TOUS.map((p) => [nom(p), p] as const))('%s : sans pointeur, caché à l’impression', (_, p) => {
    const { noeud } = rendre(p);
    const classes = noeud!.className.split(/\s+/);
    expect(classes).toContain('pointer-events-none');
    expect(classes).toContain('select-none');
    expect(classes).toContain('print:hidden');
  });

  it('un fond reste sous le contenu ; un ornement prend sa place dans le flux', () => {
    const fond = rendre({ emplacement: 'entree-patient' }).noeud!;
    expect(fond.className.split(/\s+/)).toEqual(expect.arrayContaining(['absolute', 'inset-0', '-z-10']));
    cleanup();
    const ornement = rendre({ emplacement: 'etat-vide', element: 'nutrition-sprout' }).noeud!;
    expect(ornement.className).not.toMatch(/(?:^|\s)(?:absolute|fixed|-?z-)/);
  });

  it('l’entrée patient sert le fond étroit sous 768 px et le fond large au-delà', () => {
    const noeud = rendre({ emplacement: 'entree-patient' }).noeud!;
    const [etroit, large] = Array.from(noeud.children) as HTMLElement[];
    expect(etroit.className).toContain('md:hidden');
    expect(etroit.style.backgroundImage).toContain('backgrounds/screen-mobile.svg');
    expect(large.className).toContain('hidden md:block');
    expect(large.style.backgroundImage).toContain('backgrounds/screen-desktop.svg');
  });
});

describe('LienDecor — aucun mouvement', () => {
  it.each(TOUS.map((p) => [nom(p), p] as const))('%s : aucune classe ni style de mouvement', (_, p) => {
    const { noeud } = rendre(p);
    for (const n of [noeud!, ...Array.from(noeud!.querySelectorAll<HTMLElement>('*'))]) {
      // Sans `motion-safe:` ni `motion-reduce:` : rien ne bouge, que la
      // préférence de mouvement réduit soit déclarée ou non.
      expect(n.className).not.toMatch(/animate-|transition|duration-|ease-|delay-|will-change|motion-/);
      expect(n.style.animation).toBe('');
      expect(n.style.transition).toBe('');
    }
  });

  it('retire des classes de l’appelant ce qui défait une règle', () => {
    expect(
      classesAdmises(
        'w-32 mx-auto animate-pulse md:animate-spin transition-opacity duration-300 ease-in delay-75 ' +
          'motion-safe:animate-bounce motion-reduce:opacity-50 pointer-events-auto !pointer-events-auto ' +
          'select-text z-10 -z-10 md:z-20 print:block will-change-transform opacity-80',
      ),
    ).toBe('w-32 mx-auto opacity-80');
    const noeud = rendre({ emplacement: 'deux-voix', className: 'my-4 animate-spin print:block pointer-events-auto' })
      .noeud!;
    expect(noeud.className).toContain('my-4');
    expect(noeud.className).not.toMatch(/animate-|print:block|pointer-events-auto/);
  });

  it('les SVG servis par la primitive sont statiques, sans texte ni ressource externe', () => {
    const servis = new Set(TOUS.flatMap((p) => fichiersDe(rendre(p).noeud!)));
    cleanup();
    expect(servis.size).toBe(8);
    for (const f of servis) {
      const chemin = path.join(PUBLIC, f);
      expect(existsSync(chemin), f).toBe(true);
      const svg = readFileSync(chemin, 'utf8');
      expect(svg, f).not.toMatch(/<animate|<set\b|@keyframes|animation|transition|<script|<text|<foreignObject|https?:\/\/(?!www\.w3\.org\/)/i);
    }
  });
});

describe('LienDecor — seuls les éléments nommés aux emplacements retenus', () => {
  it('le catalogue est celui de D-481 §1 bis, choix du responsable du 2026-11-25', () => {
    expect(Object.keys(LIEN_DECOR).sort()).toEqual(
      ['connexion-praticien', 'deux-voix', 'entete-fiche', 'entree-patient', 'etat-vide'].sort(),
    );
    expect(LIEN_DECOR['connexion-praticien']).toMatchObject({ etroit: expect.stringContaining('login-calm.svg') });
    expect(LIEN_DECOR['deux-voix'].elements).toEqual(['divider-two-voices']);
    expect(LIEN_DECOR['entete-fiche'].elements).toEqual(['alliance-arcs', 'linked-loops-muted']);
    expect(LIEN_DECOR['etat-vide'].elements).toEqual(['nutrition-sprout', 'neural-branches']);
  });

  it('chaque élément nommé est servi à son emplacement', () => {
    expect(fichiersDe(rendre({ emplacement: 'connexion-praticien' }).noeud!)).toEqual([
      '/wellneuro-lien/backgrounds/login-calm.svg',
      '/wellneuro-lien/backgrounds/login-calm.svg',
    ]);
    cleanup();
    expect(fichiersDe(rendre({ emplacement: 'deux-voix' }).noeud!)).toEqual([
      '/wellneuro-lien/ornaments/divider-two-voices.svg',
    ]);
    cleanup();
    expect(fichiersDe(rendre({ emplacement: 'entete-fiche', element: 'linked-loops-muted' }).noeud!)).toEqual([
      '/wellneuro-lien/ornaments/linked-loops-muted.svg',
    ]);
  });

  it('refuse, au typage, un élément hors de son emplacement ou un emplacement non retenu', () => {
    const refus = [
      // @ts-expect-error -- un ornement d'état vide n'est pas un motif d'alliance
      <LienDecor key="1" emplacement="entete-fiche" element="nutrition-sprout" />,
      // @ts-expect-error -- l'en-tête de fiche attend le choix du prototype
      <LienDecor key="2" emplacement="entete-fiche" />,
      // @ts-expect-error -- le hub patient (U10) n'a aucun élément nommé
      <LienDecor key="3" emplacement="hub-patient" />,
      // @ts-expect-error -- un fond ne prend pas d'élément
      <LienDecor key="4" emplacement="entree-patient" element="alliance-arcs" />,
      // @ts-expect-error -- un fond remplit son parent, sans classes
      <LienDecor key="5" emplacement="connexion-praticien" className="z-50" />,
    ];
    expect(refus).toHaveLength(5);
  });

  it.each([
    ['emplacement non retenu', { emplacement: 'hub-patient' }],
    ['motif non retenu', { emplacement: 'etat-vide', element: 'living-links' }],
    ['élément hors de son emplacement', { emplacement: 'entete-fiche', element: 'nutrition-sprout' }],
    ['ornement neuf non validé', { emplacement: 'etat-vide', element: 'ornement-neuf' }],
    ['élément attendu absent', { emplacement: 'etat-vide' }],
    ['fond avec élément', { emplacement: 'connexion-praticien', element: 'login-calm' }],
    ['clé héritée', { emplacement: 'toString' }],
  ])('à l’exécution, ne rend rien : %s', (_, props) => {
    const { container } = render(<LienDecor {...(props as unknown as LienDecorProps)} />);
    expect(container.innerHTML).toBe('');
  });
});

// Garde du §1 quater : « Un lot ne pose un décor que par elle. » Aucun
// fichier de `web/src` hors de la primitive ne cite un fond, un ornement ou
// un motif du kit. La marque (`brand/`) n'est pas un décor.
const CITATION_DECOR = /wellneuro-lien\/(?:backgrounds|ornaments|patterns)\//;
const PRIMITIVE = new Set(['src/components/ui/LienDecor.tsx', 'src/components/ui/LienDecor.test.tsx']);

function citationsHorsPrimitive(sources: Record<string, string>): string[] {
  return Object.entries(sources)
    .filter(([fichier, texte]) => !PRIMITIVE.has(fichier) && CITATION_DECOR.test(texte))
    .map(([fichier]) => fichier);
}

function lireSources(dossier: string, acc: Record<string, string> = {}): Record<string, string> {
  for (const entree of readdirSync(dossier)) {
    const chemin = path.join(dossier, entree);
    if (statSync(chemin).isDirectory()) lireSources(chemin, acc);
    else if (/\.(?:tsx?|css|mdx?)$/.test(entree)) acc[path.relative(WEB, chemin)] = readFileSync(chemin, 'utf8');
  }
  return acc;
}

describe('LienDecor — seule porte du décor', () => {
  it('rougit sur une citation du kit hors de la primitive (sources fabriquées)', () => {
    expect(
      citationsHorsPrimitive({
        'src/app/x/page.tsx': "style={{ backgroundImage: \"url('/wellneuro-lien/backgrounds/login-calm.svg')\" }}",
        'src/components/y.css': '.y { background: url(/wellneuro-lien/patterns/fine-dots.svg); }',
        'src/components/z.tsx': "<img src='/wellneuro-lien/ornaments/alliance-arcs.svg' alt='' />",
        'src/app/layout.tsx': "{ url: '/wellneuro-lien/brand/favicon.svg' }",
        'src/components/ui/LienDecor.tsx': "'/wellneuro-lien/ornaments/alliance-arcs.svg'",
      }),
    ).toEqual(['src/app/x/page.tsx', 'src/components/y.css', 'src/components/z.tsx']);
  });

  it('aucun fichier de web/src ne cite un décor du kit hors de la primitive', () => {
    expect(citationsHorsPrimitive(lireSources(path.join(WEB, 'src')))).toEqual([]);
  });
});
