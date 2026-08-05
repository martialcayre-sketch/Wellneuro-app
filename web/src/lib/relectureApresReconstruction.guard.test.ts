// Banc de la RELECTURE d'une passation antérieure à une reconstruction — 2026-07-31.
//
// `construireReponsesLisibles` apparie les clés de `rawAnswers` aux questions de
// la définition COURANTE. Elle n'a aucune notion de date, et elle ne peut pas en
// avoir : le catalogue ne garde qu'une version de chaque instrument.
//
// Tant qu'un instrument ne change pas, c'est sans conséquence. Dès qu'il est
// reconstruit EN GARDANT ses identifiants d'items — le cas du MFI-20, `M1`…`M20`
// des deux côtés — les anciennes réponses se retrouvent appariées aux NOUVEAUX
// libellés. Onze des vingt textes ont changé, plusieurs de polarité inverse.
//
// La garde ne rend pas la relecture juste : elle la RETIRE. Un identifiant et
// une valeur brute, plutôt qu'une phrase renversée. C'est la doctrine « marquer,
// pas effacer » appliquée d'un cran plus bas que le score.
//
// Trouvé en revue adversariale, et aucun test ne l'aurait vu : le lot ne touchait
// ni cette fonction ni ce composant.
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import { construireReponsesLisibles } from '@/lib/questionnaire-reponses';
import { motifNonInterpretable } from '@/lib/scoring/passationsNonInterpretables';

const DEF_MFI: any = (QUESTIONNAIRE_CATALOGUE as any).Q_SOM_07;

/** Une passation d'avant la reconstruction : mêmes identifiants, autre échelle. */
const ANCIENNE = { M1: 1, M3: 4, M14: 3, M20: 0 };

describe('relecture d’une passation antérieure à une reconstruction', () => {
  it('LE DÉFAUT, s’il revenait : la définition courante renverse le sens des anciennes réponses', () => {
    // Ce test décrit ce qu'il ne FAUT pas servir. Il documente la mécanique et
    // vaut anti-vacuité pour celui d'après : sans lui, on ne saurait pas que le
    // danger est réel.
    const avecDefinition = construireReponsesLisibles(DEF_MFI, ANCIENNE);
    const m3 = avecDefinition.find(r => r.idQuestion === 'M3');
    // L'ancien `M3` était « J'ai le sentiment de ne rien faire ». Le nouveau dit
    // exactement l'inverse — et c'est lui qui s'afficherait.
    expect(m3?.libelleQuestion).toBe('Je me sens très actif');
  });

  it('LA GARDE : sans définition, il reste l’identifiant et la valeur brute', () => {
    // C'est ce que la route passe désormais quand la passation est non
    // interprétable. Aucune phrase, donc aucune phrase fausse.
    const sansDefinition = construireReponsesLisibles(null, ANCIENNE);
    expect(sansDefinition).toHaveLength(4);
    for (const ligne of sansDefinition) {
      expect(ligne.libelleQuestion, ligne.idQuestion).toBeNull();
      expect(ligne.libelleReponse, ligne.idQuestion).toBeNull();
      expect(ligne.section, ligne.idQuestion).toBeNull();
    }
    // Les réponses du patient, elles, restent : marquer n'est pas effacer.
    expect(sansDefinition.map(l => [l.idQuestion, l.valeurBrute])).toEqual([
      ['M1', '1'], ['M3', '4'], ['M14', '3'], ['M20', '0'],
    ]);
  });

  it('la passation ancienne EST bien classée non interprétable — c’est ce qui déclenche la garde', () => {
    // Le couplage : la route retire la définition quand `motifNonInterpretable`
    // rend un motif. Si la frontière datée cessait de marquer les anciennes
    // passations, la relecture renversée reviendrait par cette porte.
    expect(motifNonInterpretable('Q_SOM_07', new Date('2026-07-21T08:00:00.000Z'))).not.toBeNull();
  });

  it('CONTRE-ÉPREUVE : une passation NEUVE garde sa relecture complète', () => {
    // La garde ne doit pas manger les passations saines. Sur une réponse
    // postérieure à la reconstruction, les libellés sont ceux du servi courant,
    // et ils sont justes.
    expect(motifNonInterpretable('Q_SOM_07', new Date('2026-08-01T08:00:00.000Z'))).toBeNull();
    const neuve = construireReponsesLisibles(DEF_MFI, { M1: 5, M5: 1 });
    expect(neuve.find(r => r.idQuestion === 'M1')?.libelleQuestion).toBe('Je me sens en forme');
    expect(neuve.find(r => r.idQuestion === 'M1')?.libelleReponse).toBe("5 — Tout à fait d'accord");
  });
});

describe('la règle générale que ce cas révèle', () => {
  it('tout instrument du registre des non interprétables doit être relu SANS définition', () => {
    // Formulé en invariant, et pas sur `Q_SOM_07` seul : la prochaine
    // reconstruction posera le même piège, et rien d'autre ne l'attend. La route
    // le respecte en passant `null` dès que `nonInterpretable` est vrai —
    // épinglé ici sur la SOURCE de la route, faute de pouvoir l'exécuter sans
    // base.
    const source = readFileSync(
      resolve(process.cwd(), 'src/app/api/praticien/inbox-questionnaires/route.ts'),
      'utf8',
    );
    expect(source).toMatch(/nonInterpretable \? null : \(definitions\.get\(r\.idQuestionnaire\) \?\? null\)/);
  });
});
