import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

/*
 * « AUCUNE DATE NE S'ÉCRIT DEPUIS UNE PAGE QUI NE SERT PAS CETTE PHRASE »
 * ([[D-297]] §4).
 *
 * Toute écriture d'une lecture part de `POST /api/portail/lectures`, et ce POST
 * date désormais la première ouverture. Chaque appelant doit donc servir
 * `AvisLectureDatee` dans le même fichier : les quatre écrans de document qui
 * montent `ConsignerLecturePortail`, et l'accueil qui consigne le protocole.
 *
 * C'est une garde de DÉPÔT, et elle se contourne (un `init` de requête construit
 * ailleurs, une route serveur neuve qui écrirait la table) : elle vérifie qu'un
 * fichier importe et rend l'avis. La place — en tête, avant le document — et
 * la condition — le document rendu — sont tenues par les bancs de rendu.
 */

const SRC = join(process.cwd(), 'src');
const CONSIGNATEUR = join(SRC, 'components', 'patient', 'ConsignerLecturePortail.tsx');
// Le consignateur POSTe lui-même : il est exclu, ce sont ceux qui le MONTENT
// qui doivent servir l'avis.

function fichiersSource(racine: string): string[] {
  const trouves: string[] = [];
  const parcourir = (chemin: string) => {
    for (const entree of readdirSync(chemin)) {
      const complet = join(chemin, entree);
      if (statSync(complet).isDirectory()) {
        if (entree === 'generated' || entree === 'node_modules') continue;
        parcourir(complet);
        continue;
      }
      if (/\.tsx?$/.test(entree) && !/\.test\.tsx?$/.test(entree)) trouves.push(complet);
    }
  };
  parcourir(racine);
  return trouves;
}

/** Les fichiers qui font partir une écriture de lecture. */
function appelants(): string[] {
  return fichiersSource(SRC).filter(f => {
    if (f === CONSIGNATEUR) return false;
    const code = readFileSync(f, 'utf8');
    // Un import renommé monterait le consignateur sous un autre nom : c'est
    // l'IMPORT qui le désigne, quel que soit le nom au montage.
    const monteLeConsignateur = code.includes("from '@/components/patient/ConsignerLecturePortail'");
    // Toutes les formes d'écriture vers la route : guillemets simples, doubles
    // ou gabarit, `method: 'POST'` sous toute quotation, ou `sendBeacon` (un
    // POST sans `method`).
    const nommeLaRoute = /['"`]\/api\/portail\/lectures['"`?]/.test(code);
    const ecrit = /method:\s*['"`]POST['"`]/.test(code) || code.includes('sendBeacon(');
    return monteLeConsignateur || (nommeLaRoute && ecrit);
  });
}

describe('chaque page qui date une lecture sert « Votre lecture est datée »', () => {
  it('les appelants connus sont trouvés — sinon la garde ne garde rien', () => {
    const relatifs = appelants().map(f => f.replace(`${SRC}/`, '')).sort();
    expect(relatifs).toEqual([
      'components/patient-companion/ComprehensionView.tsx',
      'components/patient-companion/PatientCompanionHome.tsx',
      'components/patient/MonBilan.tsx',
      'components/patient/courrier-complement/CourrierComplementLecture.tsx',
      'components/patient/fiches-assiette/FicheRemiseLecture.tsx',
      'components/patient/lettre-adressage/CourrierMedecinLecture.tsx',
    ]);
  });

  it.each(appelants().map(f => [f.replace(`${SRC}/`, ''), f]))('%s rend AvisLectureDatee', (_relatif, fichier) => {
    const code = readFileSync(fichier, 'utf8');
    expect(code).toContain("import { AvisLectureDatee } from '@/components/patient/AvisLectureDatee';");
    expect(code).toContain('<AvisLectureDatee />');
  });

  it.each(['app/portail/[token]/bilan/page.tsx', 'app/portail/[token]/comprehension/page.tsx'])(
    '%s ne consigne plus au montage de la page : c’est le document rendu qui le fait',
    relatif => {
      const code = readFileSync(join(SRC, relatif), 'utf8');
      expect(code).not.toContain('<ConsignerLecturePortail');
    },
  );
});
