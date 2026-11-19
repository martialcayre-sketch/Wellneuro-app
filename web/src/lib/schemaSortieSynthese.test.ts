import { describe, expect, it } from 'vitest';
import { analyserSortieSynthese, validateSyntheseSchema, NIVEAUX_PRIORITE } from '@/lib/anthropic';

// Schéma de sortie STRICT de la synthèse (LOT-01, étape 4).
//
// CE QUE CE BANC GARDE. Avant lui, `validateSyntheseSchema` était la seule
// lecture de la sortie du modèle, et elle ne rejetait RIEN : elle substituait
// des défauts, castait `axes_prioritaires` sans regarder son contenu, et jetait
// les clés inconnues en silence. Une sortie hors schéma était donc SERVIE,
// dégradée, au praticien. C'est ce que le critère 3 du lot interdit.
//
// Les cas ci-dessous sont écrits pour ROUGIR si quelqu'un ré-assouplit la
// lecture — chacun nomme la porte qu'il ferme.

/** Sortie conforme minimale, réutilisée comme témoin positif partout. */
function sortieConforme() {
  return {
    resume_praticien: 'Trois phrases de synthèse pour le praticien.',
    axes_prioritaires: [
      {
        axe: 'Adaptation au stress',
        niveau_priorite: 'modere',
        arguments: ['Score bas sur ADAPTATION_STRESS'],
        points_a_confirmer: ['Contexte professionnel récent ?'],
      },
    ],
    points_de_vigilance: ['Discordance entre instruments'],
    questions_entretien: ['Comment décririez-vous vos journées ?'],
    narratif_patient: 'Un texte accessible, sans jargon.',
    limites: 'À valider par le praticien.',
  };
}

describe('analyserSortieSynthese — le témoin positif', () => {
  it('accepte une sortie conforme et rend la synthèse', () => {
    const r = analyserSortieSynthese(sortieConforme());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.synthese.resume_praticien).toBe('Trois phrases de synthèse pour le praticien.');
    expect(r.synthese.axes_prioritaires).toHaveLength(1);
    // Sans ce témoin, tous les cas négatifs ci-dessous pourraient passer avec un
    // validateur qui refuserait TOUT — un banc qui ne peut pas verdir ne prouve
    // pas plus qu'un banc qui ne peut pas rougir.
  });

  it('accepte les trois niveaux de priorité annoncés au modèle, et eux seuls', () => {
    for (const niveau of NIVEAUX_PRIORITE) {
      const s = sortieConforme();
      s.axes_prioritaires[0].niveau_priorite = niveau;
      expect(analyserSortieSynthese(s).ok).toBe(true);
    }
    expect(NIVEAUX_PRIORITE).toEqual(['eleve', 'modere', 'faible']);
  });

  it('accepte une liste d’axes VIDE — ne rien prioriser est une réponse licite', () => {
    const s = sortieConforme();
    s.axes_prioritaires = [];
    expect(analyserSortieSynthese(s).ok).toBe(true);
  });
});

describe('analyserSortieSynthese — le schéma est FERMÉ', () => {
  it('rejette une clé inconnue à la racine', () => {
    const r = analyserSortieSynthese({ ...sortieConforme(), diagnostic: 'burn-out' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.violations.join(' ')).toContain('diagnostic');
    // Le cas n'est pas théorique : un champ `diagnostic` inventé par le modèle
    // était jusqu'ici jeté en silence. Le rejeter le rend VISIBLE.
  });

  it('rejette une clé inconnue dans un axe', () => {
    const s = sortieConforme();
    (s.axes_prioritaires[0] as Record<string, unknown>).score = 0.87;
    const r = analyserSortieSynthese(s);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.violations.join(' ')).toContain('score');
  });

  it('rejette une racine qui n’est pas un objet', () => {
    for (const valeur of [null, [], 'texte', 42]) {
      expect(analyserSortieSynthese(valeur).ok).toBe(false);
    }
  });
});

describe('analyserSortieSynthese — les énumérations sont CONTRÔLÉES', () => {
  it('rejette un niveau de priorité hors énumération', () => {
    const s = sortieConforme();
    (s.axes_prioritaires[0] as Record<string, unknown>).niveau_priorite = 'critique';
    const r = analyserSortieSynthese(s);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.violations.join(' ')).toContain('niveau_priorite');
    // LE TROU HISTORIQUE. `validateSyntheseSchema` castait le tableau entier
    // (`as SyntheseSchema['axes_prioritaires']`) : « critique » arrivait donc
    // jusqu'à l'écran praticien, avec un niveau que l'UI ne sait pas rendre.
  });

  it('rejette un axe qui n’est pas un objet', () => {
    const s = sortieConforme();
    (s.axes_prioritaires as unknown[])[0] = 'Adaptation au stress';
    expect(analyserSortieSynthese(s).ok).toBe(false);
  });
});

describe('analyserSortieSynthese — aucun champ vide ne passe', () => {
  it('rejette une chaîne vide ou blanche là où du texte est attendu', () => {
    for (const cle of ['resume_praticien', 'narratif_patient', 'limites'] as const) {
      const s = sortieConforme() as Record<string, unknown>;
      s[cle] = '   ';
      const r = analyserSortieSynthese(s);
      expect(r.ok, `${cle} vide devrait être rejeté`).toBe(false);
    }
    // Une chaîne vide passait avant : `typeof o.x === 'string'` est vrai pour
    // `''`. Le praticien recevait un narratif vide sans que rien ne le signale.
  });

  it('rejette un tableau contenant une chaîne vide', () => {
    for (const cle of ['points_de_vigilance', 'questions_entretien'] as const) {
      const s = sortieConforme() as Record<string, unknown>;
      s[cle] = ['un point valable', ''];
      expect(analyserSortieSynthese(s).ok, `${cle} avec chaîne vide`).toBe(false);
    }
  });

  it('rejette un champ manquant', () => {
    for (const cle of Object.keys(sortieConforme())) {
      const s = sortieConforme() as Record<string, unknown>;
      delete s[cle];
      expect(analyserSortieSynthese(s).ok, `${cle} absent`).toBe(false);
    }
  });
});

describe('analyserSortieSynthese — les violations ne fuient JAMAIS le contenu', () => {
  it('ne cite pas la valeur fautive, seulement le champ', () => {
    const s = sortieConforme();
    s.resume_praticien = 'Sophie Nicola présente un tableau anxieux marqué';
    (s as Record<string, unknown>).resume_praticien = '';
    (s as Record<string, unknown>).secret = 'Sophie Nicola présente un tableau anxieux marqué';
    const r = analyserSortieSynthese(s);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    const texte = r.violations.join(' ');
    // Les violations partent au journal ET dans la relance. Y recopier ce que
    // le modèle a écrit exfiltrerait du contenu clinique vers les logs — le nom
    // de la clé suffit à dire quoi corriger.
    expect(texte).not.toContain('Sophie Nicola');
    expect(texte).not.toContain('anxieux');
    expect(texte).toContain('secret');
  });
});

describe('validateSyntheseSchema reste TOLÉRANTE — et c’est délibéré', () => {
  it('normalise sans jamais lever, sur une entrée que le strict rejette', () => {
    // `bilanPatient.ts` projette des synthèses DÉJÀ PERSISTÉES, écrites sous des
    // schémas antérieurs. Durcir cette lecture-là ferait échouer l'affichage de
    // bilans existants pour un défaut qu'aucune relance ne peut plus corriger.
    const horsSchema = { resume_praticien: 42, axes_prioritaires: 'non', diagnostic: 'burn-out' };
    expect(analyserSortieSynthese(horsSchema).ok).toBe(false);
    const tolerant = validateSyntheseSchema(horsSchema);
    expect(tolerant.resume_praticien).toContain('non disponible');
    expect(tolerant.axes_prioritaires).toEqual([]);
    expect(tolerant).not.toHaveProperty('diagnostic');
  });

  it('accepte `{}` — la lecture d’un JSONB vide ne casse pas un bilan', () => {
    expect(() => validateSyntheseSchema({})).not.toThrow();
    expect(analyserSortieSynthese({}).ok).toBe(false);
  });
});
