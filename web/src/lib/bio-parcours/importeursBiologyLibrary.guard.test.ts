import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RACINE, estUnTest, fichiersSource } from './balayageSources';
import { contexteResolution, designe, importsResolus, type ContexteResolution } from './resolutionImports';

// BP-01 ([[D-266]]) — l'import de `biology-library` est interdit hors liste
// blanche NOMINATIVE. Le jour du lot, 26 fichiers de production l'importent :
// la liste les fige tous (arbitrage du 2026-10-04), et chaque entrée neuve
// passe par un diff relu de CE fichier. Le lecteur d'attente C4 s'y inscrira
// le jour venu, avec son motif.
// LIMITE : le banc juge l'import DIRECT. Un module neuf qui passerait par un
// importeur listé (un service, par exemple) lirait la biologie sans figurer
// ici ; ce chemin indirect relève de la revue.
//
// PÉRIMÈTRE : le code de production de `web/src`. Les bancs et tests en sont
// exclus (ils importent le module pour l'éprouver), le module lui-même aussi.
// Une prose qui CITE `biology-library` n'est pas un import (six fichiers le
// font) : seuls les nœuds d'import comptent.
//
// LE PARSEUR ET LA RÉSOLUTION (lot `bp17-extension-bancs-garde`, d'après le
// banc de la bibliothèque des options, D-480 §8) : un import est lu par
// `importsSyntaxiques` (commentaire glissé, échappement, concaténation
// constante, `require`, `import type` compté), puis RÉSOLU comme le fait
// TypeScript, liens symboliques suivis — un alias ou un lien qui mène au
// dossier sans le nommer est vu. Un import non constant ou un nom nu inconnu
// est un lecteur possible. Verrous de configuration :
// `resolutionImports.guard.test.ts`.
//
// DEUX SENS : un importeur absent de la liste rougit ; une entrée qui n'importe
// plus rougit aussi — une liste blanche qui se périme finit par couvrir un
// fichier qu'on ne relit plus.
const IMPORTEURS_ADMIS = [
  // LA TRANSMISSION PAR LE PATIENT ([[D-269]], BIO-INGEST LOT-04) : route, page
  // et écran du portail. Drapeau, dépôt, statut dérivé (date et statut seuls) :
  // aucune valeur, aucun libellé lu, aucun marquage ne sort vers le patient.
  'web/src/app/api/portail/comptes-rendus/route.ts',
  'web/src/app/portail/[token]/comptes-rendus/page.tsx',
  'web/src/components/patient/biologie/TransmissionCompteRendu.tsx',
  // Routes praticien de la biologie.
  'web/src/app/api/praticien/biologie/arbitrage/route.ts',
  'web/src/app/api/praticien/biologie/catalogue/route.ts',
  // La composition signée des analyses groupées et des calculés (F80, D-323
  // §1) : référentiel global au cabinet, même garde que la signature NABM —
  // aucune donnée patient.
  'web/src/app/api/praticien/biologie/compositions/route.ts',
  // Les constats du praticien sur une hypothèse ([[D-331]], BP-11) : la
  // garde des résultats, le drapeau parent, le fil d'une ligne citée (tête,
  // annulation) et son verrou de clé — la pièce se dit par son analyse et sa
  // date, aucune valeur lue, aucune qualification.
  'web/src/app/api/praticien/biologie/constats/route.ts',
  'web/src/lib/bio-parcours/constats/drapeau.ts',
  'web/src/lib/bio-parcours/constats/ecriture.ts',
  'web/src/lib/bio-parcours/constats/lecture.ts',
  'web/src/app/api/praticien/biologie/import/compte-rendu/route.ts',
  'web/src/app/api/praticien/biologie/import/decisions/route.ts',
  'web/src/app/api/praticien/biologie/import/depot/route.ts',
  // Le regard du praticien sur le document déposé ([[D-269]] §1) : les octets
  // consignés, servis au praticien du dossier, aucune valeur lue.
  'web/src/app/api/praticien/biologie/import/document/route.ts',
  // « Écarter ce document » transmis par le patient ([[D-269]] §3) : purge, aucune valeur lue.
  'web/src/app/api/praticien/biologie/import/ecart/route.ts',
  'web/src/app/api/praticien/biologie/import/extraction/route.ts',
  // L'acte de lecture d'un import validé ([[D-268]], BP-10).
  'web/src/app/api/praticien/biologie/import/lecture/route.ts',
  // Le masquage de l'identité avant la lecture ([[D-284]] §5, lot j) : des
  // pages noircies, réencodées et consignées — aucune valeur lue.
  'web/src/app/api/praticien/biologie/import/masquage/route.ts',
  // Le compte des refus « plus de 20 pages » (arbitrage du 2026-11-03) : la
  // garde de l'import et la borne du nombre de pages — aucune valeur lue,
  // rien en base, une ligne de journal sans identifiant.
  'web/src/app/api/praticien/biologie/import/masquage/refus/route.ts',
  'web/src/app/api/praticien/biologie/import/route.ts',
  // La signature des correspondances analyte ↔ acte NABM (M-3, F54) : la
  // nomenclature et le catalogue, globaux au cabinet — aucune donnée patient.
  // Les candidats préparés (M-3b) passent par la même route, lus dans le
  // module PUR `candidatsNabm` par la lib : aucun importeur neuf.
  'web/src/app/api/praticien/biologie/nabm/acte/route.ts',
  // Le constat signé « aucun acte dans la nomenclature » (M-3c, F54) : même
  // référentiel global, même garde que la signature — aucune donnée patient.
  'web/src/app/api/praticien/biologie/nabm/constats/route.ts',
  'web/src/app/api/praticien/biologie/nabm/correspondances/route.ts',
  // La signature en lot ([[D-326]] §2) : même référentiel global, même garde,
  // même service que la signature unitaire — aucune donnée patient.
  'web/src/app/api/praticien/biologie/nabm/correspondances/lot/route.ts',
  // La recherche d'actes par libellé ([[D-320]] §1) : lecture seule du
  // millésime courant de la nomenclature, globale au cabinet — aucune donnée
  // patient, aucune écriture.
  'web/src/app/api/praticien/biologie/nabm/recherche/route.ts',
  'web/src/app/api/praticien/biologie/proposition/courrier/route.ts',
  'web/src/app/api/praticien/biologie/proposition/document-patient/route.ts',
  'web/src/app/api/praticien/biologie/proposition/route.ts',
  // L'annulation d'un résultat saisi par erreur ([[D-294]], BP-09) : actes en
  // ajout seul, motif fermé ; lit le fil, ne qualifie aucune valeur.
  'web/src/app/api/praticien/biologie/resultats/annulations/route.ts',
  'web/src/app/api/praticien/biologie/resultats/bilan/route.ts',
  'web/src/app/api/praticien/biologie/resultats/route.ts',
  // Le statut posé près d'une valeur ([[D-322]], F58) : actes en ajout seul,
  // statut pris dans une liste fermée ; lit le fil, ne qualifie aucune valeur.
  'web/src/app/api/praticien/biologie/resultats/statuts/route.ts',
  // Routes praticien hors biologie : cockpit, fil, et refus de résolution d'une
  // version tant qu'un arbitrage biologique est ouvert.
  'web/src/app/api/praticien/cockpit/route.ts',
  'web/src/app/api/praticien/fil/route.ts',
  // Clôture et désactivation d'un dossier ([[D-282]] §9) : le module
  // `lectureDemandee` seul, qui compte les travaux de lecture ouverts —
  // aucune valeur, aucun libellé lu. Lu par l'entrée publiée `publie`
  // depuis le 2026-10-17 : premier lecteur hors biologie ([[D-306]] §4).
  'web/src/app/api/praticien/patients/cycle-de-vie/route.ts',
  // « Mes échanges » au portail ([[D-293]]) : les comptes rendus transmis par
  // le patient, date seule, sous `isBioPortailEnabled` — par l'entrée publiée,
  // deuxième lecteur hors biologie (2026-10-18).
  'web/src/lib/portail/mesEchangesServeur.ts',
  // La collecte documentaire ([[D-330]], J3-collecte) : les bornes du fichier
  // déposé sont celles du compte rendu (arbitrage 4) — signature, taille,
  // image réencodée, empreinte. Validation seule, aucune table ni valeur de la
  // biologie ; par l'entrée publiée, troisième lecteur hors biologie (2026-10-19).
  'web/src/app/api/portail/documents/route.ts',
  'web/src/app/api/praticien/documents-deposes/contenu/route.ts',
  'web/src/lib/collecte/documentsDeposesServeur.ts',
  // Le constat du praticien sur un besoin sans score ([[D-347]], t40) : le
  // drapeau de l'étage des résultats, le fil d'une ligne citée en pièce
  // (tête, annulation) et son verrou de clé — aucune valeur lue ; par
  // l'entrée publiée, quatrième lecteur hors biologie (2026-10-23).
  'web/src/app/api/praticien/besoins/constats/route.ts',
  'web/src/lib/constats-besoin/ecriture.ts',
  'web/src/lib/constats-besoin/lecture.ts',
  // L'export PDF du dossier ([[D-519]]) : les mesures qui font foi, la
  // lecture de l'import et les faits du laboratoire — par l'entrée publiée,
  // cinquième lecteur hors biologie (2026-11-14).
  'web/src/lib/export-dossier/assembler.ts',
  'web/src/lib/export-dossier/biologieExport.ts',
  'web/src/app/api/praticien/patients/route.ts',
  'web/src/app/api/praticien/protocoles/versions/route.ts',
  // Pages et composants praticien. La page unique de la biologie est le
  // rayon « Analyses biologiques » depuis D-324 §6 : elle remplace à la fois
  // la Bibliothèque d'un seul tenant et la page « Biologie fonctionnelle »,
  // qui ne font plus que rediriger (même drapeau lu, aucune lecture neuve).
  'web/src/app/dashboard/bibliotheque/biologie/page.tsx',
  'web/src/app/dashboard/patients/[idPatient]/page.tsx',
  // Même motif (F80) : l'écran de signature de la composition, en `import
  // type` et le module PUR `compositionsPreparees` (libellés des types).
  'web/src/components/biologie/CompositionAnalyteSection.tsx',
  // Même motif (M-3) : l'écran de signature, en `import type` seul.
  'web/src/components/biologie/CorrespondancesNabmSection.tsx',
  // Même motif ([[D-326]] §2) : la signature en lot, en `import type` seul.
  'web/src/components/biologie/SignatureNabmLotPanel.tsx',
  // Le geste du statut posé ([[D-322]], F58) : le module PUR `statutPoseListe`
  // (codes et libellés de la liste fermée) — aucune valeur lue.
  'web/src/components/biologie/ActeStatutResultat.tsx',
  // La proposition de bilan dans l'onglet « Biologie » ([[D-319]], F57 PR 2) :
  // le module PUR `confirmationsDocument` et des types — les gestes et les
  // lectures repris tels quels de la section clinique, qui les portait.
  'web/src/components/biologie/PropositionBilanSection.tsx',
  'web/src/components/biologie/FicheAnalytePanel.tsx',
  'web/src/components/biologie/RayonBiologiePanel.tsx',
  'web/src/components/patient-cockpit/ArbitrageBiologiquePanel.tsx',
  'web/src/components/patient-cockpit/ClinicalRuntimeSection.tsx',
  // La saisie d'une valeur (BIO-INGEST LOT-10) : le module PUR
  // `valeurDecimale`, qui met en forme ce que le praticien tape — aucune
  // donnée lue, aucune qualification. Et les libellés des motifs
  // d'annulation ([[D-294]]), module PUR `annulationMotifs`, avec le geste
  // qui les propose (`ActeAnnulationResultat`).
  'web/src/components/patient-cockpit/ActeAnnulationResultat.tsx',
  // Le bloc du contexte de prélèvement ([[D-497]] §4, BP-05) : le module PUR
  // `contextePrelevement` (forme des sept champs, libellés) — aucune valeur
  // de résultat lue, aucune qualification.
  'web/src/components/biologie/BlocContextePrelevement.tsx',
  'web/src/components/patient-cockpit/EstimeMesurePanel.tsx',
  'web/src/components/patient-cockpit/ImportCompteRenduPanel.tsx',
  // L'écran de l'acte de lecture ([[D-268]], BP-10) : codes et états, sans valeur.
  'web/src/components/patient-cockpit/LectureImportBiologique.tsx',
  // L'écran du masquage ([[D-284]] §5, lot j) : le module PUR `masquage`
  // seul (bornes, géométrie des zones) — aucune valeur lue.
  'web/src/components/patient-cockpit/MasquageIdentite.tsx',
  'web/src/components/patient-cockpit/PropositionBilanPanel.tsx',
  // Même motif (LOT-10) : `valeurDecimale` seul.
  'web/src/components/patient-cockpit/SaisieBilan.tsx',
  // Portes biologiques des assiettes ([[D-245]]).
  'web/src/lib/clinical/portesBiologiquesService.ts',
  // La carte « compte rendu à lire » du Fil ([[D-268]], BP-10) : le module pur
  // des états de lecture, qui ne lit aucune valeur.
  'web/src/lib/fil/cartes.ts',
  // Ancrage des courriers.
  'web/src/lib/praticien/ancrageCorrespondance.ts',
];

const DOSSIER = 'web/src/lib/biology-library/';
/** Un spécificateur qui NOMME le module, en alias `@/` ou en relatif. */
const NOMME_BIOLOGY_LIBRARY = /(^|\/)biology-library(\/|$)/;

/** Le pipeline de lecture — extrait pour être éprouvé (contre-épreuve). */
export function importeursDe(
  fichiers: readonly { chemin: string; source?: string }[],
  contexte: ContexteResolution = contexteResolution(),
): string[] {
  return fichiers
    .filter(f => !estUnTest(f.chemin))
    .filter(f => !f.chemin.startsWith(DOSSIER))
    .filter(f => importsResolus(f.chemin, contexte, f.source).some(i => designe(i, NOMME_BIOLOGY_LIBRARY, [DOSSIER])))
    .map(f => f.chemin)
    .sort();
}

describe('biology-library — liste blanche nominative des importeurs (BP-01)', () => {
  it('aucun importeur de production hors de la liste, aucune entrée périmée', () => {
    const lus = importeursDe(fichiersSource().map(chemin => ({ chemin })));
    expect(
      lus,
      'importeur neuf de `biology-library` : l\'inscrire ici par un diff relu, avec son motif ; '
        + 'entrée qui n\'importe plus : la retirer',
    ).toEqual([...IMPORTEURS_ADMIS].sort());
    // Le parseur et le résolveur lisent tout `web/src` : délai élargi.
  }, 120_000);

  it('chaque entrée désigne un fichier réel', () => {
    for (const chemin of IMPORTEURS_ADMIS) {
      expect(existsSync(join(RACINE, chemin)), `entrée périmée : ${chemin}`).toBe(true);
    }
  });

  // CONTRE-ÉPREUVE : la mutation que ce banc doit attraper — un module neuf
  // qui importe la bibliothèque — rougit, en alias comme en relatif, en import
  // statique comme dynamique, masqué par un commentaire, un échappement ou une
  // concaténation, par `require` ou en type seul, ou par un spécificateur
  // indéterminé ; une simple mention en commentaire ne rougit pas.
  it('le pipeline voit un import neuf, ignore une mention et un banc', () => {
    const lus = importeursDe([
      { chemin: 'web/src/lib/neuf/f.ts', source: 'import/**/"@/lib/biology-library/catalogue";' },
      { chemin: 'web/src/lib/neuf/g.ts', source: 'import { x } from "@/lib/\\u0062iology-library/catalogue";' },
      { chemin: 'web/src/lib/neuf/h.ts', source: 'const m = require("@/lib/biology-" + "library/catalogue");' },
      { chemin: 'web/src/lib/neuf/i.ts', source: "import type { T } from '../biology-library/catalogue';" },
      { chemin: 'web/src/lib/neuf/j.ts', source: 'const m = await import(chemin);' },
      { chemin: 'web/src/lib/neuf/k.ts', source: "import { x } from 'biology-library/catalogue';" },
      { chemin: 'web/src/lib/neuf/l.ts', source: "import { x } from '@/lib/autre/module';" },
      { chemin: 'web/src/lib/neuf/a.ts', source: "import { x } from '@/lib/biology-library/catalogue';" },
      { chemin: 'web/src/lib/neuf/b.ts', source: "const m = await import('../biology-library/resultats');" },
      { chemin: 'web/src/lib/neuf/c.ts', source: "export { y } from '../../lib/biology-library';" },
      { chemin: 'web/src/lib/neuf/d.ts', source: '// lit `@/lib/biology-library/x` en prose seulement' },
      { chemin: 'web/src/lib/neuf/e.guard.test.ts', source: "import '@/lib/biology-library/catalogue';" },
      { chemin: 'web/src/lib/biology-library/interne.ts', source: "import { z } from './catalogue';" },
    ]);
    expect(lus).toEqual([
      'web/src/lib/neuf/a.ts', 'web/src/lib/neuf/b.ts', 'web/src/lib/neuf/c.ts', 'web/src/lib/neuf/f.ts',
      'web/src/lib/neuf/g.ts', 'web/src/lib/neuf/h.ts', 'web/src/lib/neuf/i.ts', 'web/src/lib/neuf/j.ts',
      'web/src/lib/neuf/k.ts',
    ]);
  });

  // CONTRE-ÉPREUVE DE LA RÉSOLUTION : un alias `paths` sous `@/` (que la
  // règle des noms nus admet) qui mène au dossier sans le nommer est vu, en
  // mémoire, sans toucher aucun fichier.
  it('un alias de configuration qui mène au dossier est vu', () => {
    const contexte = contexteResolution();
    const source = 'import { x } from "@/bio";';
    expect(importeursDe([{ chemin: 'web/src/lib/neuf/a.ts', source }], contexte)).toEqual([]);
    const avecAlias = {
      ...contexte,
      cache: undefined,
      options: { ...contexte.options, paths: { ...contexte.options.paths, '@/bio': ['./src/lib/biology-library/publie.ts'] } },
    };
    expect(importeursDe([{ chemin: 'web/src/lib/neuf/a.ts', source }], avecAlias)).toEqual(['web/src/lib/neuf/a.ts']);
  });
});
