import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import { REFERENCE_HBA1C, REPERE_INDEX_OMEGA3, claimsCitesParLesConstats } from './constatsBiomarqueursBesoin1';
import {
  CLAIMS_PROVENANCE_SEULE,
  claimsProvenanceSeuleDuBesoin,
  tousLesClaimsProvenanceSeule,
} from './claimsProvenanceSeule';

// L'ÉLIGIBILITÉ DES CLAIMS ([[D-516]] §5.4, [[D-526]] §5.5, [[D-529]] §5.5,
// [[D-541]] §5.5 ; [[D-548]] §2.2 à §2.5). Un claim étiqueté ne vaut pas
// autorisation : ceux de ces listes ne servent que de provenance, de contexte ou
// de limite. Le banc vérifie ce qu'un dépôt peut vérifier — qu'AUCUN code qui
// fonde un constat, un déclencheur ou une conduite ne les cite.
//
// LIMITES, NOMMÉES : l'étiquetage « besoin n » d'un claim vit en base (corpus),
// hors de ce dépôt ; le banc ne lit pas la sélection de la base. Il garde le code,
// par identifiant ÉCRIT EN TOUTES LETTRES : un identifiant assemblé à l'exécution
// ou une donnée hors `.ts`/`.tsx` lui échappe.

// Tout `web/src` : les routes (`app/`) et les composants comptent, pas seulement `lib/`.
const RACINE = path.resolve(__dirname, '../..');
const FICHIERS_EXEMPTES = new Set([
  path.join(RACINE, 'lib', 'equilibre', 'claimsProvenanceSeule.ts'),
  path.join(RACINE, 'lib', 'equilibre', 'claimsProvenanceSeule.guard.test.ts'),
]);

function sources(dossier: string): string[] {
  const sortie: string[] = [];
  for (const nom of readdirSync(dossier)) {
    const chemin = path.join(dossier, nom);
    if (statSync(chemin).isDirectory()) sortie.push(...sources(chemin));
    else if (/\.(ts|tsx)$/.test(nom) && !/\.test\.(ts|tsx)$/.test(nom)) sortie.push(chemin);
  }
  return sortie;
}

describe('les claims de provenance seule', () => {
  it('quatre listes, une par dossier signé, chacune avec sa décision', () => {
    expect(CLAIMS_PROVENANCE_SEULE.map(l => [l.besoin, l.decision, l.section])).toEqual([
      [1, 'D-516', '§5.4'],
      [4, 'D-526', '§5.5'],
      [5, 'D-529', '§5.5'],
      [9, 'D-541', '§5.5'],
    ]);
  });

  it('les effectifs sont ceux des décisions', () => {
    expect(claimsProvenanceSeuleDuBesoin(1)).toHaveLength(8 + 1 + 7 + 1);
    expect(claimsProvenanceSeuleDuBesoin(4)).toHaveLength(2 + 4 + 3 + (4 + 3 + 4) + (4 + 3 + 4));
    expect(claimsProvenanceSeuleDuBesoin(5)).toHaveLength(5 + 7 + 4 + 2 + 4);
    expect(claimsProvenanceSeuleDuBesoin(9)).toHaveLength(6 + (4 + 6) + 2);
  });

  it('chaque identifiant est un identifiant de claim, sans doublon', () => {
    const tous = tousLesClaimsProvenanceSeule();
    for (const id of tous) expect(id).toMatch(/^WN-CL-\d{4}-\d{3}$/);
    expect(new Set(tous).size).toBe(tous.length);
  });

  it("aucun n'est cité par le code qui fonde un déclencheur ou une conduite", () => {
    const tous = tousLesClaimsProvenanceSeule();
    const fautes: string[] = [];
    for (const fichier of sources(RACINE)) {
      if (FICHIERS_EXEMPTES.has(fichier)) continue;
      const texte = readFileSync(fichier, 'utf8');
      for (const id of tous) {
        if (texte.includes(id)) fautes.push(`${path.relative(RACINE, fichier)} cite ${id}`);
      }
    }
    expect(fautes).toEqual([]);
  });

  it("les claims que les constats du besoin 1 citent ne sont dans aucune liste de provenance seule", () => {
    const seule = new Set(tousLesClaimsProvenanceSeule());
    expect(claimsCitesParLesConstats().filter(id => seule.has(id))).toEqual([]);
    expect(REFERENCE_HBA1C.claimReference).toBe('WN-CL-0654-001');
    expect(REPERE_INDEX_OMEGA3.claimPublicationPrimaire).toBe('WN-CL-0655-002');
  });

  it("le catalogue des questionnaires n'en cite aucun non plus (aucun scoring ne les porte)", () => {
    const json = JSON.stringify(QUESTIONNAIRE_CATALOGUE);
    for (const id of tousLesClaimsProvenanceSeule()) expect(json).not.toContain(id);
  });
});
