import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LIBELLES_STATUT_POSE, STATUTS_POSES, estStatutPose } from './statutPoseListe';

// La liste fermée de [[D-322]] §1, recopiée du CHECK de la migration : ce banc
// tient la recopie. Un statut ajouté ici seul serait proposé par l'écran et
// refusé par la base ; un statut ajouté à la base seule ne serait jamais
// proposé.

const RACINE = join(__dirname, '../../..');
const MIGRATION = readFileSync(
  join(RACINE, 'prisma/migrations/20261018120000_statuts_poses_resultats_biologiques_v1/migration.sql'),
  'utf8',
);

describe('statuts posés — la liste fermée (D-322 §1)', () => {
  it('égale, dans l’ordre, la liste du CHECK de la migration', () => {
    const clause = MIGRATION.match(/statuts_poses_resultats_biologiques_statut_check"\s*CHECK \("statut" IN \(([^)]*)\)\)/);
    expect(clause).not.toBeNull();
    const codes = [...clause![1].matchAll(/'([a-z_]+)'/g)].map(m => m[1]);
    expect(codes).toEqual([...STATUTS_POSES]);
  });

  it('affiche les libellés de la décision, tels quels', () => {
    expect(LIBELLES_STATUT_POSE).toEqual({
      aucune_action_retenue: 'aucune action retenue',
      a_suivre: 'à suivre',
      contexte_a_preciser: 'contexte à préciser',
      donnee_a_verifier: 'donnée à vérifier',
      avis_medical_a_envisager: 'avis médical à envisager',
      relie_au_protocole: 'relié au protocole',
    });
  });

  it('aucun libellé ne porte un mot écarté par la décision', () => {
    const ecartes = [
      /normal/i, /hausse/i, /baisse/i, /amélior/i, /aggrav/i, /tendance/i, /carence/i, /excès/i,
      /patholog/i, /validé/i, /\bvu\b/i, /prioritaire/i, /urgent/i, /recontrôler/i, /examiner/i, /consign/i,
    ];
    for (const libelle of Object.values(LIBELLES_STATUT_POSE)) {
      for (const mot of ecartes) expect(libelle).not.toMatch(mot);
    }
  });

  it('la garde ne reconnaît que les codes de la liste', () => {
    for (const code of STATUTS_POSES) expect(estStatutPose(code)).toBe(true);
    for (const autre of ['a_examiner', 'normal', 'à suivre', '', null, undefined, 42]) {
      expect(estStatutPose(autre)).toBe(false);
    }
  });

  it('reste une FEUILLE : aucun import — l’écran client le lit', () => {
    const source = readFileSync(join(__dirname, 'statutPoseListe.ts'), 'utf8');
    expect(source).not.toMatch(/^\s*import\s/m);
  });
});
