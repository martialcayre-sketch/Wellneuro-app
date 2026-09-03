import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

// GARDE DE THÈME DE LA PRIMITIVE DE SUPERPOSITION.
//
// `PanneauSuperpose` re-pose `data-theme` sur l'overlay ET le contenu, parce que
// Radix portale vers `document.body` — hors du `[data-theme="praticien"]` du
// layout du cockpit. Sa valeur par défaut est `praticien` : neuf de ses dix
// appelants vivent dans le cockpit, et l'exiger partout rendrait à la primitive
// le bruit qu'elle existe pour supprimer.
//
// LE DÉFAUT EST DONC AUSSI LE PIÈGE. Une surface PATIENT qui adopte la
// primitive sans passer `theme="patient"` se repeint en praticien, et personne
// ne le voit passer : ni `tsc`, ni un banc de rendu, qui n'assertionnent pas des
// couleurs. Le coût de l'oubli est un écran patient aux couleurs du cabinet.
//
// CE N'EST PAS UNE CRAINTE THÉORIQUE. Le 2026-09-03, `DossierConfirmDialog` et
// `AnnulationAssignationDialog` — l'écran d'effacement définitif d'un dossier
// compris — s'affichaient aux couleurs du portail patient, pour la faute
// exactement symétrique : `data-theme` absent, donc retour aux tokens par
// défaut de `globals.css`, qui sont ceux du patient.
//
// La garde est PROUVÉE ROUGE sur des sources synthétiques avant d'être
// appliquée à l'arbre réel : aucune surface patient n'a encore migré, et une
// garde qui ne balaie que du vide est décorative.

const RACINE_WEB = path.resolve(__dirname, '../../..');

/** Les arbres où le thème patient fait loi. */
const SURFACES_PATIENT = [
  'src/components/patient',
  'src/components/patient-companion',
  'src/app/portail',
];

function sansCommentaires(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
}

/**
 * Combien de montages de la primitive ne sont pas couverts par un
 * `theme="patient"` explicite.
 *
 * COMPTAGE, ET NON ANALYSE DE L'ATTRIBUT EN PLACE : les props d'un JSX
 * contiennent des `>` (`onClick={() => …}`), si bien que délimiter la balise
 * ouvrante à l'expression régulière se trompe de borne dès le premier
 * gestionnaire. Comparer deux comptes est plus grossier — un fichier qui monte
 * deux panneaux dont un seul est patient passerait s'il écrivait deux fois
 * l'attribut — mais c'est SÛR dans le sens qui compte : zéro `theme="patient"`
 * sur une surface patient est toujours attrapé, et c'est la faute réelle.
 */
function montagesSansThemePatient(source: string): number {
  const propre = sansCommentaires(source);
  const montages = propre.match(/<PanneauSuperpose[\s/>]/g)?.length ?? 0;
  const themes = propre.match(/theme=["']patient["']/g)?.length ?? 0;
  return Math.max(0, montages - themes);
}

function fichiersTsx(racineRelative: string): string[] {
  const racine = path.join(RACINE_WEB, racineRelative);
  let entrees: string[];
  try {
    entrees = readdirSync(racine);
  } catch {
    return [];
  }
  return entrees.flatMap((entree) => {
    const complet = path.join(racine, entree);
    if (statSync(complet).isDirectory()) {
      return fichiersTsx(path.join(racineRelative, entree));
    }
    return entree.endsWith('.tsx') ? [path.join(racineRelative, entree)] : [];
  });
}

describe('PanneauSuperpose — le thème d’une surface patient ne se laisse pas au défaut', () => {
  // ── La garde, vue rouge puis verte sur des sources fabriquées ──────────────

  it('ATTRAPE un montage sans thème — c’est le cas qui repeint un écran patient', () => {
    expect(
      montagesSansThemePatient('<PanneauSuperpose titre="Confirmer" description="…" />'),
    ).toBe(1);
  });

  it('ATTRAPE le thème praticien posé par erreur sur une surface patient', () => {
    expect(
      montagesSansThemePatient('<PanneauSuperpose theme="praticien" titre="Confirmer" />'),
    ).toBe(1);
  });

  it('ACCEPTE un montage explicitement patient, gestionnaire et chevrons compris', () => {
    expect(
      montagesSansThemePatient(
        '<PanneauSuperpose theme="patient" onOpenChange={(o) => setOuvert(o)} titre="Confirmer" />',
      ),
    ).toBe(0);
  });

  it('ne compte pas un montage qui n’est écrit qu’en commentaire', () => {
    expect(montagesSansThemePatient('// migrer vers <PanneauSuperpose /> un jour')).toBe(0);
  });

  // ── Application à l'arbre réel ────────────────────────────────────────────

  it('aucune surface patient ne monte la primitive sans se nommer', () => {
    const fichiers = SURFACES_PATIENT.flatMap(fichiersTsx);

    // ANTI-VACUITÉ : un chemin renommé viderait le balayage et rendrait ce cas
    // vert sans rien garder. On exige d'avoir réellement lu des fichiers.
    expect(fichiers.length).toBeGreaterThan(10);

    const fautifs = fichiers.filter(
      (fichier) => montagesSansThemePatient(readFileSync(path.join(RACINE_WEB, fichier), 'utf8')) > 0,
    );
    expect(
      fautifs,
      `Surface patient montant PanneauSuperpose sans theme="patient" : ${fautifs.join(', ')}`,
    ).toEqual([]);
  });
});
