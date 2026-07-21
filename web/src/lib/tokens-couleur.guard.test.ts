import { readFileSync, readdirSync } from 'fs';
import { extname, join, relative } from 'path';
import { describe, expect, it } from 'vitest';

// Garde structurelle — écart E18 de l'audit de conformité 5.0.
//
// Les surfaces de l'application se peignent avec les tokens sémantiques
// (`--color-status-*`, `--surface`, `--border`, `--muted`, la palette de
// marque), pas avec les échelles brutes de Tailwind. Une couleur brute ne suit
// ni un ajustement du canvas, ni une révision de la matrice de contraste, ni un
// changement de thème : elle reste orange pendant que le reste bouge.
//
// Ce test lit les sources plutôt que le rendu, parce que la régression se
// réintroduit par un `bg-orange-50` recopié d'un écran voisin — c'est exactement
// ce qui s'est produit le 2026-07-21, deux composants neufs ayant réintroduit
// `text-red-600` le lendemain de la correction des lignes citées par l'audit.
//
// Ce qui reste autorisé : les échelles redéfinies dans `tailwind.config.ts`
// (`teal-*`, `gold-*`, `violet-*`, `night-*`, `indigo-600`, `mint-600`,
// `solar-500`, `forest-600`, `copper-500`), qui pointent toutes sur une
// variable CSS de la palette de marque.

const RACINE = join(__dirname, '..');

const ECHELLES_BRUTES = [
  'slate', 'gray', 'zinc', 'neutral', 'stone',
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald',
  'cyan', 'sky', 'blue', 'purple', 'fuchsia', 'pink', 'rose',
].join('|');

const UTILITAIRES = [
  'bg', 'text', 'border', 'ring', 'divide', 'placeholder', 'shadow',
  'outline', 'decoration', 'caret', 'accent', 'fill', 'stroke',
  'from', 'via', 'to',
].join('|');

const COULEUR_BRUTE = new RegExp(`\\b(${UTILITAIRES})-(${ECHELLES_BRUTES})-[0-9]{2,3}\\b`, 'g');

const EXTENSIONS = new Set(['.ts', '.tsx', '.css']);
const FICHIER_DE_LA_GARDE = 'lib/tokens-couleur.guard.test.ts';

function fichiersSources(dossier: string): string[] {
  return readdirSync(dossier, { withFileTypes: true }).flatMap(entree => {
    const chemin = join(dossier, entree.name);
    if (entree.isDirectory()) return fichiersSources(chemin);
    return EXTENSIONS.has(extname(entree.name)) ? [chemin] : [];
  });
}

describe('couleurs des surfaces — tokens sémantiques uniquement (E18)', () => {
  it('aucune échelle Tailwind brute dans `web/src`', () => {
    const fautifs: string[] = [];

    for (const chemin of fichiersSources(RACINE)) {
      const relatif = relative(RACINE, chemin);
      if (relatif === FICHIER_DE_LA_GARDE) continue;

      const source = readFileSync(chemin, 'utf8');
      for (const ligne of source.split('\n')) {
        const trouvees = ligne.match(COULEUR_BRUTE);
        if (trouvees) fautifs.push(`${relatif} : ${trouvees.join(', ')}`);
      }
    }

    // Le message d'échec nomme les classes : la correction consiste à choisir
    // le token de statut correspondant (`status-success/warning/danger/info`)
    // ou le token de surface (`surface`, `muted`, `border`, `foreground`).
    expect(fautifs).toEqual([]);
  });

  it('la garde regarde bien un arbre non vide', () => {
    // Si l'arbre se vide (chemin cassé, extensions changées), le test ci-dessus
    // passerait au vert sans rien avoir lu.
    expect(fichiersSources(RACINE).length).toBeGreaterThan(100);
  });
});
