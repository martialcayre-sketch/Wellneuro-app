import { describe, expect, it } from 'vitest';
import {
  cibleBienFormee,
  cleCibleEcartement,
  motifRecevable,
  motifStockable,
  MOTIF_LONGUEUR_MAX,
  teteDuFil,
  tetesParCible,
  verdictPourCible,
  type GesteEcartement,
} from './ecartements';

// La lecture du fil d'écartement. Chaque cas tient une propriété, et les cas de
// FIL CASSÉ comptent autant que les autres : la base autorise des états qu'aucune
// contrainte ne ferme (cycle de longueur 2, `supersedes` pendouillant), et c'est
// ici qu'ils doivent être refusés plutôt que devinés.

function geste(surcharges: Partial<GesteEcartement> = {}): GesteEcartement {
  return {
    id: 'ec_1',
    cibleId: 'questionnaire:Q_STR_03',
    espece: 'ecartement',
    reglesAuGeste: ['R2-STR-02'],
    motif: 'Le stress est déjà exploré.',
    parEmail: 'praticien@wellneuro.fr',
    faitLe: '2026-09-13T10:00:00.000Z',
    supersedesEcartementId: null,
    ...surcharges,
  };
}

describe('cleCibleEcartement — la forme LONGUE est canonique en base', () => {
  it('préfixe un questionnaire et un pack, et ne les confond pas', () => {
    expect(cleCibleEcartement({ type: 'questionnaire', questionnaireId: 'Q_STR_03' }))
      .toBe('questionnaire:Q_STR_03');
    expect(cleCibleEcartement({ type: 'pack', packId: 'pack_socle_initial_neuronutrition' }))
      .toBe('pack:pack_socle_initial_neuronutrition');
  });

  it('ce qu’elle rend passe le CHECK de forme de la base', () => {
    // Le banc qui empêche la divergence la plus coûteuse : une clé produite ici
    // et refusée là-bas vaudrait un `23514` opaque au praticien.
    expect(cibleBienFormee(cleCibleEcartement({ type: 'questionnaire', questionnaireId: 'Q_SOM_01' }))).toBe(true);
    expect(cibleBienFormee(cleCibleEcartement({ type: 'pack', packId: 'pack_sommeil_chronobiologie' }))).toBe(true);
  });

  it('refuse la clé INTERNE du moteur — `q:` et `p:` ne sont pas la forme de la base', () => {
    // `cleCible` (privée à `orientationEngine`) rend `q:Q_STR_03`. La passer
    // telle quelle serait le piège que ce module existe pour fermer.
    expect(cibleBienFormee('q:Q_STR_03')).toBe(false);
    expect(cibleBienFormee('p:pack_socle_initial_neuronutrition')).toBe(false);
    expect(cibleBienFormee('Q_STR_03')).toBe(false);
    expect(cibleBienFormee('instrument:Q_STR_03')).toBe(false);
  });
});

describe('teteDuFil — jamais par la date', () => {
  it('un fil d’un seul geste a ce geste pour tête', () => {
    expect(teteDuFil([geste()])?.id).toBe('ec_1');
  });

  it('trois gestes chaînés : la tête est le dernier, pas le plus récent par date', () => {
    // TOUTES LES DATES SONT IDENTIQUES, et c'est le point : `fait_le` vaut
    // l'horodatage de TRANSACTION en base, donc deux lignes d'une même
    // transaction le partagent. Un tri par date élirait au hasard ; ce banc
    // échouerait sur une implémentation qui trie.
    const meme = '2026-09-13T10:00:00.000Z';
    const fil = [
      geste({ id: 'a', faitLe: meme, supersedesEcartementId: null }),
      geste({ id: 'b', espece: 'reprise', reglesAuGeste: [], faitLe: meme, supersedesEcartementId: 'a' }),
      geste({ id: 'c', faitLe: meme, supersedesEcartementId: 'b' }),
    ];
    expect(teteDuFil(fil)?.id).toBe('c');
  });

  it('un fil VIDE n’a pas de tête', () => {
    expect(teteDuFil([])).toBeNull();
  });

  it('un `supersedes` PENDOUILLANT ne rend aucune tête', () => {
    // La référence est souple, sans clé étrangère : la base accepte un id qui
    // n'existe pas. On ne devine pas une racine absente.
    expect(teteDuFil([geste({ id: 'a', supersedesEcartementId: 'jamais_ecrit' })])).toBeNull();
  });

  it('un CYCLE de longueur 2 ne rend aucune tête', () => {
    // Le CHECK non réflexif ferme `A→A` ; `A→B, B→A` passe l'unicité de
    // `supersedes` puisque les deux valeurs diffèrent. Sans borne de marche, une
    // implémentation récursive y tournerait sans fin.
    const cycle = [
      geste({ id: 'a', supersedesEcartementId: 'b' }),
      geste({ id: 'b', supersedesEcartementId: 'a' }),
    ];
    expect(teteDuFil(cycle)).toBeNull();
  });

  it('un cycle À CÔTÉ d’un fil sain laisse la tête du fil sain', () => {
    // Les lignes du cycle sont inatteignables depuis la racine : elles ne sont
    // pas une seconde tête, elles sont du rebut. La lecture ne doit pas s’y perdre.
    const fil = [
      geste({ id: 'racine', supersedesEcartementId: null }),
      geste({ id: 'x', supersedesEcartementId: 'y' }),
      geste({ id: 'y', supersedesEcartementId: 'x' }),
    ];
    expect(teteDuFil(fil)?.id).toBe('racine');
  });

  it('DEUX racines concurrentes ne rendent aucune tête — on n’élit pas', () => {
    const deux = [
      geste({ id: 'r1', supersedesEcartementId: null }),
      geste({ id: 'r2', supersedesEcartementId: null }),
    ];
    expect(teteDuFil(deux)).toBeNull();
  });
});

describe('tetesParCible — un fil par cible', () => {
  it('sépare les cibles et ne mélange pas leurs fils', () => {
    const tetes = tetesParCible([
      geste({ id: 'a1', cibleId: 'questionnaire:Q_STR_03' }),
      geste({ id: 'a2', cibleId: 'questionnaire:Q_STR_03', espece: 'reprise', reglesAuGeste: [], supersedesEcartementId: 'a1' }),
      geste({ id: 'b1', cibleId: 'questionnaire:Q_NEU_11' }),
    ]);
    expect(tetes.get('questionnaire:Q_STR_03')?.id).toBe('a2');
    expect(tetes.get('questionnaire:Q_NEU_11')?.id).toBe('b1');
  });

  it('une cible au fil CASSÉ est absente de la carte, pas devinée', () => {
    const tetes = tetesParCible([geste({ id: 'a', supersedesEcartementId: 'fantome' })]);
    expect(tetes.has('questionnaire:Q_STR_03')).toBe(false);
  });
});

describe('verdictPourCible — le réveil sur motif neuf', () => {
  it('aucun fil : la proposition est visible', () => {
    expect(verdictPourCible(undefined, ['R2-STR-02']).etat).toBe('visible');
  });

  it('tête = reprise : la proposition est revenue, donc visible', () => {
    const tete = geste({ espece: 'reprise', reglesAuGeste: [] });
    expect(verdictPourCible(tete, ['R2-STR-02']).etat).toBe('visible');
  });

  it('tête = écartement, mêmes règles : la proposition est écartée', () => {
    expect(verdictPourCible(geste(), ['R2-STR-02']).etat).toBe('ecartee');
  });

  it('une règle ABSENTE du geste RÉVEILLE la proposition, et la nomme', () => {
    // LE CAS QUI FAIT TENIR DC-30. Le Cungi écarté depuis l'axe stress
    // (`R2-STR-02`) revient quand l'axe sommeil le propose (`R-SOM-01`) : sans
    // ce réveil, écarter la ligne ferait taire un axe qui n'a rien demandé.
    const verdict = verdictPourCible(geste(), ['R2-STR-02', 'R-SOM-01']);
    expect(verdict.etat).toBe('reveillee');
    expect(verdict.etat === 'reveillee' && verdict.reglesNouvelles).toEqual(['R-SOM-01']);
  });

  it('une règle RETIRÉE ne réveille rien — seule une règle NOUVELLE le fait', () => {
    // Contre-épreuve : sans elle, une implémentation comparant les ensembles par
    // leur taille ou par égalité stricte passerait le cas précédent et
    // réveillerait tout dossier dont une règle a cessé de s'allumer.
    const tete = geste({ reglesAuGeste: ['R2-STR-02', 'R-SOM-01'] });
    expect(verdictPourCible(tete, ['R2-STR-02']).etat).toBe('ecartee');
  });

  it('plus AUCUNE règle ne motive la cible : elle reste écartée', () => {
    expect(verdictPourCible(geste(), []).etat).toBe('ecartee');
  });

  it('les règles nouvelles sont dédupliquées et triées', () => {
    const verdict = verdictPourCible(geste(), ['R-SOM-01', 'R2-SOM-01', 'R-SOM-01']);
    expect(verdict.etat === 'reveillee' && verdict.reglesNouvelles).toEqual(['R-SOM-01', 'R2-SOM-01']);
  });
});

describe('motifRecevable — la même sévérité que le CHECK de la base', () => {
  it('accepte un motif écrit', () => {
    expect(motifRecevable('Le sommeil est traité ailleurs.')).toBe(true);
  });

  it('refuse le vide, les espaces, ET les tabulations', () => {
    // Les tabulations sont le cas qui a manqué à la migration avant la revue :
    // `btrim/1` ne retire que l'espace ASCII. Ici comme là-bas, elles tombent.
    expect(motifRecevable('')).toBe(false);
    expect(motifRecevable('   ')).toBe(false);
    expect(motifRecevable('\t\n\r ')).toBe(false);
  });

  it('refuse les blancs UNICODE que le `btrim` de la base laisserait passer', () => {
    // DÉFAUT TROUVÉ EN REVUE (2026-09-13). `btrim("motif", E' \t\r\n')` ne connaît
    // que quatre caractères : un motif fait d'une espace INSÉCABLE, de largeur
    // nulle ou idéographique passe son CHECK. Le repli afficherait alors
    // « Écartée le … par … » suivi de rien — l'écartement sans motif écrit que
    // [[D-178]] existe pour interdire, obtenu sans rien contourner. La garde ne
    // peut pas vivre en base (table déjà appliquée, pas de migration dans ce
    // lot) : elle refuse donc DAVANTAGE ici, et c'est le seul sens admis.
    //
    // Construits par POINT DE CODE : un `U+200B` littéral dans ce fichier serait
    // invisible à la relecture.
    const blancs = [0x00a0, 0x202f, 0x2003, 0x3000, 0x200b, 0x200c, 0x200d, 0x2060, 0xfeff, 0x000b, 0x000c];
    for (const point of blancs) {
      const caractere = String.fromCodePoint(point);
      expect(motifRecevable(caractere), `U+${point.toString(16).padStart(4, '0')}`).toBe(false);
      // Et en mélange : trois blancs de familles différentes ne font pas un motif.
      expect(motifRecevable(` ${caractere}\t`), `mélange U+${point.toString(16)}`).toBe(false);
    }
  });

  it('un vrai motif n’est pas emporté par la garde', () => {
    // Contre-épreuve : une classe de blancs trop large refuserait du texte réel.
    expect(motifRecevable('Déjà exploré — cf. anamnèse du 12/09.')).toBe(true);
    expect(motifRecevable('Deux lignes.\n\nLa seconde.')).toBe(true);
    // Une espace insécable AU MILIEU d'un vrai motif est du texte, pas un blanc
    // seul : la typographie française en met avant les deux-points.
    expect(motifRecevable(`Motif${String.fromCodePoint(0x00a0)}: déjà exploré.`)).toBe(true);
  });

  it('refuse ce qui n’est pas une chaîne', () => {
    expect(motifRecevable(undefined)).toBe(false);
    expect(motifRecevable(null)).toBe(false);
    expect(motifRecevable(42)).toBe(false);
  });

  it('mord sur la borne haute, et la borne est celle de la base', () => {
    expect(motifRecevable('x'.repeat(MOTIF_LONGUEUR_MAX))).toBe(true);
    expect(motifRecevable('x'.repeat(MOTIF_LONGUEUR_MAX + 1))).toBe(false);
    expect(MOTIF_LONGUEUR_MAX).toBe(2000);
  });
});

describe('motifStockable — les bords seulement', () => {
  it('retire les blancs de tête et de queue', () => {
    expect(motifStockable('\n\n  Déjà exploré. ')).toBe('Déjà exploré.');
    expect(motifStockable(`${String.fromCodePoint(0x00a0)}Déjà exploré.`)).toBe('Déjà exploré.');
  });

  it('ne touche PAS le milieu — deux paragraphes restent deux paragraphes', () => {
    // La base stocke ce qu'on lui donne : normaliser l'intérieur réécrirait le
    // texte du praticien, ce qu'aucune décision n'autorise.
    expect(motifStockable('Deux raisons.\n\nLa seconde.')).toBe('Deux raisons.\n\nLa seconde.');
    expect(motifStockable('  A.\n\n  B.  ')).toBe('A.\n\n  B.');
  });

  it('un motif déjà propre est rendu tel quel', () => {
    expect(motifStockable('Déjà exploré.')).toBe('Déjà exploré.');
  });
});
