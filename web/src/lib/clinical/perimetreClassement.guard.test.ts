import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ATTESTATION_CLASSEMENT,
  LIMITATIONS_CANDIDAT,
  MOTIF_ABSTENTION,
  ORDRE_EVALUATION_ABSTENTION,
  PERIMETRE_CLASSEMENT_V1,
  TERMES_DE_CLASSEMENT,
} from './perimetreClassementV1';
import { ABSTENTION_PROCEDURE_V1, PRIORITY_RULES_V1 } from './priorityRulesV1';

// L'ANCRAGE DU PÉRIMÈTRE DU CLASSEMENT — [[D-162]] §5, étape « périmètre ».
//
// CE QUE CE BANC TIENT, ET CE QU'IL NE PRÉTEND PAS TENIR. Il épingle le SHA du
// périmètre pour que toute édition devienne VISIBLE, et il vérifie que le moteur
// lit bien ces données plutôt qu'une copie. Il ne signe rien : l'attestation
// clinique n'a pas eu lieu, et ce banc EXIGE qu'elle soit déclarée absente tant
// qu'elle ne l'est pas.
//
// POURQUOI L'ANCRE EXISTE AVANT LA SIGNATURE. Poser le sha maintenant rend
// mesurable ce que la relecture portera : le jour de l'attestation, le praticien
// relit un objet dont on sait qu'il n'a pas bougé depuis. L'ordre inverse —
// attester puis ancrer — laisse un intervalle où le contenu relu et le contenu
// haché peuvent diverger sans trace. C'est exactement le trou que [[D-180]] a
// montré sur les grilles.

/** L'empreinte du périmètre, figée. Toute édition la fait bouger. */
const EMPREINTE_PERIMETRE = 'da1ba306c0551d7b';

/**
 * La source d'un module, COMMENTAIRES RETIRÉS.
 *
 * Nécessaire, et trouvé en écrivant le banc : les commentaires de `chaineC1.ts`
 * NOMMENT les constantes dont ils expliquent l'usage. Une recherche sur la
 * source brute y voit un emploi, et le banc échouait sur sa propre explication.
 * Même patron que `sourceSansCommentaires` dans `objectifNegocie.guard.test.ts`.
 */
function sourceSansCommentaires(chemin: URL): string {
  return readFileSync(chemin, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function empreinte(): string {
  return createHash('sha256').update(JSON.stringify(PERIMETRE_CLASSEMENT_V1)).digest('hex').slice(0, 16);
}

describe('périmètre du classement — l’ancre existe, la signature non', () => {
  it('l’empreinte est celle-ci, et rien d’autre', () => {
    expect(
      empreinte(),
      'périmètre modifié : reporter la nouvelle empreinte ici. CE GESTE N’EST PAS MÉCANIQUE — ces données décrivent ce qui CLASSE des priorités cliniques (`DC-17`) : relire ce qui a changé, et si un terme de départage, un texte servi ou l’ordre des motifs a bougé, une décision `D-xxx` est due AVANT de reporter. Si une attestation a déjà été posée, elle est PÉRIMÉE et doit être retirée dans le même geste.',
    ).toBe(EMPREINTE_PERIMETRE);
  });

  it('L’ATTESTATION EST POSÉE, ET ELLE PORTE SUR CE PÉRIMÈTRE-CI', () => {
    // CE CAS A ÉTÉ RETOURNÉ LE 2026-09-15, ET C'ÉTAIT LE POINT. Il exigeait
    // l'ABSENCE d'attestation — « ce banc échoue le jour où quelqu'un remplit
    // l'attestation sans le décider : il faudra alors le réécrire ». Le
    // responsable a décidé, après avoir relu le périmètre et fait corriger deux
    // fois sa preuve ([[D-185]], [[D-197]]) ; le voici réécrit.
    expect(ATTESTATION_CLASSEMENT.relu).toBe(true);
    expect(ATTESTATION_CLASSEMENT.dateRelecture).toBe('2026-09-15');

    // LE CŒUR DU CAS, ET IL EST NEUF : l'attestation est PÉRISSABLE. `shaRelu`
    // est un littéral figé, pas la constante calculée — sinon la comparaison
    // serait tautologique et la péremption invisible (patron [[D-063]], et
    // c'est le trou exact que [[D-180]] a montré sur les grilles).
    //
    // Toute édition du périmètre déplace `empreinte()`, ce littéral ne suit
    // pas, et ce cas ROUGIT en réclamant une re-signature. Une signature qui ne
    // sait pas se périmer ne vaut rien : elle couvrirait un contenu que
    // personne n'a relu.
    expect(
      ATTESTATION_CLASSEMENT.shaRelu,
      'ATTESTATION PÉRIMÉE : le périmètre a changé depuis la relecture du 2026-09-15. Ce n’est PAS une empreinte à reporter — le contenu attesté n’est plus celui qui est relu. Retirer l’attestation (`relu: false`, dates et sha à `null`) et la redemander au responsable, avec une décision `D-xxx` qui dit ce qui a bougé.',
    ).toBe(empreinte());
  });

  it('les trois termes sont ordonnés 1, 2, 3 — sans trou ni doublon', () => {
    expect(TERMES_DE_CLASSEMENT.map(t => t.rang)).toEqual([1, 2, 3]);
  });

  it('le terme de dernier ressort est déclaré TECHNIQUE, jamais clinique', () => {
    // SOUS-PROMETTRE PLUTÔT QUE L'INVERSE. L'identifiant départage pour rendre
    // l'ordre stable, pas parce qu'une règle nommée `PRIO-DIG-01` primerait
    // cliniquement sur `PRIO-SOM-02`. Le déclarer `clinique` ferait lire une
    // hiérarchie soignante dans un tri alphabétique.
    const dernier = TERMES_DE_CLASSEMENT.find(t => t.rang === 3);
    expect(dernier?.nature).toBe('technique');
  });

  it('LES DEUX MOTIFS EXISTENT DANS LA TABLE SIGNÉE — pas seulement deux chaînes distinctes', () => {
    // LE TROU QUE CE CAS FERME (constat de revue). La première rédaction ne
    // vérifiait que la LONGUEUR et l'UNICITÉ : deux identifiants inventés
    // l'auraient passée. La divergence n'aurait alors éclaté qu'à l'exécution,
    // dans `motifRequis` — c'est-à-dire tard, et sur un dossier réel qui
    // s'abstient. Un fail-closed qui attend un vrai patient pour se fermer
    // n'est pas un fail-closed.
    const idsSignes = ABSTENTION_PROCEDURE_V1.motifsRequired.map(motif => motif.id);
    for (const id of ORDRE_EVALUATION_ABSTENTION) {
      expect(idsSignes, `« ${id} » n’existe pas dans ABSTENTION_PROCEDURE_V1`).toContain(id);
    }
    expect(new Set(ORDRE_EVALUATION_ABSTENTION).size).toBe(ORDRE_EVALUATION_ABSTENTION.length);
    expect([...ORDRE_EVALUATION_ABSTENTION].sort()).toEqual([...idsSignes].sort());
  });

  it('L’ORDRE DÉCLARÉ EST CELUI QUE LE MOTEUR CODE — sécurité d’abord', () => {
    // CE QUE CE CAS TIENT, ET POURQUOI IL EXISTE. Le périmètre DÉCLARE un ordre
    // d'évaluation ; `chaineC1.ts` le CODE dans un `if`. Rien ne relie
    // mécaniquement les deux : permuter la déclaration sans déplacer le `if`
    // ferait attester un ordre que le moteur n'applique pas — la forme de la
    // conformité sans son effet.
    //
    // ET LE MOTEUR LIE PAR NOM, JAMAIS PAR POSITION. Une première rédaction
    // déstructurait ce tableau dans `chaineC1.ts`, rouvrant le finding M1 de la
    // revue du 2026-08-16 : permuter deux lignes aurait servi le texte SÉCURITÉ
    // sur la branche canal, sans qu'aucun banc ne bouge. Relevé en revue.
    expect(ORDRE_EVALUATION_ABSTENTION).toEqual([MOTIF_ABSTENTION.securite, MOTIF_ABSTENTION.canal]);

    const source = sourceSansCommentaires(new URL('../clinical-engine/chaineC1.ts', import.meta.url));
    expect(
      source.includes('ORDRE_EVALUATION_ABSTENTION'),
      'chaineC1.ts lit l’ORDRE : il doit lire les motifs par NOM (MOTIF_ABSTENTION.securite / .canal), pas par position',
    ).toBe(false);
    expect(source).toContain('MOTIF_ABSTENTION.securite');
    expect(source).toContain('MOTIF_ABSTENTION.canal');
  });

  it('LA PREUVE DE CONSOMMATION N’EST PAS ICI, ET C’EST DÉLIBÉRÉ', () => {
    // CE QUE LA PREMIÈRE RÉDACTION FAISAIT, ET POURQUOI ELLE A ÉTÉ RETIRÉE.
    // Un garde lisait la source de `chaineC1.ts` et exigeait qu'aucun des
    // quatre textes n'y figure en dur. Codex l'a défait en deux coups, et les
    // deux ont été REJOUÉS ICI avant correction :
    //
    //   · remplacer `LIMITATIONS_CANDIDAT.classement` par deux littéraux
    //     CONCATÉNÉS produisant exactement le même texte — garde vert, 8/8 ;
    //   · réviser le texte au périmètre en laissant l'ancien littéral dans le
    //     moteur — garde vert aussi, et c'est le pire : une modification
    //     destinée à la relecture n'atteint jamais le praticien.
    //
    // Un garde de SOURCE interdit une orthographe ; il ne prouve aucune
    // consommation. La preuve vit donc dans `chaineC1.test.ts`, qui EXÉCUTE le
    // moteur et compare sa sortie à ces données — voir « le périmètre pilote
    // ce que le moteur produit ». Ce cas-ci ne fait que l'ancrer, pour qu'un
    // déplacement du banc de comportement ne laisse pas ce fichier muet.
    const bancMoteur = readFileSync(
      new URL('../clinical-engine/chaineC1.test.ts', import.meta.url),
      'utf8',
    );
    expect(
      bancMoteur.includes('le périmètre pilote ce que le moteur produit'),
      'le banc de comportement a disparu de chaineC1.test.ts : le périmètre ne serait plus qu’un document',
    ).toBe(true);
  });

  it('ANTI-VACUITÉ : le périmètre n’est pas vide, et la table signée existe toujours', () => {
    // Un banc qui ne compare que des absences resterait vert sur un module vidé.
    expect(Object.keys(LIMITATIONS_CANDIDAT)).toHaveLength(4);
    // Chaque texte porte sa CONDITION dans la donnée, non dans un commentaire :
    // c'est ce qui la fait entrer dans l'empreinte. Une condition laissée en
    // prose se modifiait sans périmer l'ancre — constat de revue, rejoué.
    for (const [nom, entree] of Object.entries(LIMITATIONS_CANDIDAT)) {
      expect(typeof entree.texte, `${nom}.texte`).toBe('string');
      expect(entree.condition.length, `${nom}.condition`).toBeGreaterThan(0);
    }
    expect(PRIORITY_RULES_V1.length).toBeGreaterThan(0);
  });
});
