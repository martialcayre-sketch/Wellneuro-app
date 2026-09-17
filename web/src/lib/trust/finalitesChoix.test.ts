import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import {
  FINALITES,
  FORMULATION_CHOIX_VERSION,
  SHA_ATTENDU_PAR_VERSION,
  traceFormulationActive,
} from './finalitesChoix';
// L'empreinte vit à part — `node:crypto` ne doit pas entrer dans le bundle
// client par la porte de `MesChoix.tsx`.
import { FORMULATION_CHOIX_SHA256 } from './finalitesChoixEmpreinte';

describe('la formulation des choix — versionnée, et verrouillée sur son contenu', () => {
  it('★ la version DÉCLARÉE concorde avec le contenu RÉELLEMENT servi', () => {
    // LE PIÈGE FERMÉ ICI est celui du verrou biologie, repris tel quel :
    // comparer l'empreinte vivante à elle-même serait tautologique. Le littéral
    // de `SHA_ATTENDU_PAR_VERSION` a été relu ; c'est lui qui fait foi.
    //
    // LA MUTATION QUI DOIT FAIRE ROUGIR CE BANC : retoucher un libellé sans
    // monter la version — exactement ce qui s'est produit huit fois sur la
    // phrase de confidentialité avant que [[D-222]] ne la nomme.
    expect(SHA_ATTENDU_PAR_VERSION[FORMULATION_CHOIX_VERSION]).toBe(FORMULATION_CHOIX_SHA256);
  });

  it('★ l’effet du refus dit ce que le LOGICIEL fait, et nomme l’exception', () => {
    // Avant le 2026-09-17, il disait « Aucun document ne sera partagé » — une
    // garantie que rien ne tenait. La garde existe désormais ([[D-219]] §3
    // amendé) ; taire son exception recréerait l'écart que ce lot ferme.
    const partage = FINALITES.find(f => f.finalite === 'partage_medecin_traitant');
    expect(partage).toBeTruthy();
    expect(partage?.effetRefus).not.toContain('Aucun document ne sera partagé');
    expect(partage?.effetRefus).toContain('ne pourra pas préparer de courrier');
    expect(partage?.effetRefus).toContain('ni y consigner un échange');
    expect(partage?.effetRefus).toContain('votre sécurité');
  });

  it('le drapeau de trace est fail-closed — seule la chaîne exacte ouvre', () => {
    // Un ADD se protège par drapeau éteint : entre le merge et l'approbation
    // `release-db`, la colonne n'existe pas, et la nommer casserait
    // l'enregistrement du choix du patient.
    expect(traceFormulationActive('true')).toBe(true);
    for (const valeur of [undefined, '', '1', 'TRUE', 'oui', 'false']) {
      expect(traceFormulationActive(valeur), String(valeur)).toBe(false);
    }
  });
});

describe('le module de formulation reste importable par un composant client', () => {
  it('★ n’importe RIEN qui tire `node:crypto` — la mutation a coûté un T2 rouge', async () => {
    // CE BANC NAÎT D'UN ÉCHEC RÉEL, le 2026-09-17. L'empreinte était calculée
    // dans `finalitesChoix.ts`, que `MesChoix.tsx` ('use client') importe :
    // `node:crypto` est entré dans le bundle client et le build webpack a cassé
    // net (`UnhandledSchemeError`). Les 9 661 bancs, eux, étaient verts — un
    // banc unitaire ne voit pas un problème de bundle.
    //
    // LA MUTATION QUI DOIT FAIRE ROUGIR CE BANC : re-fusionner les deux modules,
    // ou importer ici quoi que ce soit qui remonte à `canonical`.
    const source = await readFile(
      new URL('./finalitesChoix.ts', import.meta.url),
      'utf8',
    );
    // On interroge les IMPORTS, pas le texte : l'en-tête du module NOMME le
    // piège (« y appeler canonicalSha256 ferait entrer node:crypto »), et un
    // banc qui rougirait sur ce commentaire punirait la documentation du défaut.
    const imports = source.split('\n').filter(l => /^\s*import\b/.test(l)).join('\n');
    expect(imports).not.toContain('canonical');
    expect(imports).not.toContain('node:crypto');
    expect(imports).not.toContain('empreinte');
  });
});
