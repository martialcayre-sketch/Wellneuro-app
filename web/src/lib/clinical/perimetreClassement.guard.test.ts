import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ATTESTATION_CLASSEMENT,
  LIMITATIONS_CANDIDAT,
  ORDRE_EVALUATION_ABSTENTION,
  PERIMETRE_CLASSEMENT_V1,
  TERMES_DE_CLASSEMENT,
} from './perimetreClassementV1';
import { PRIORITY_RULES_V1 } from './priorityRulesV1';

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
const EMPREINTE_PERIMETRE = '3d73b1207d55b99f';

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

  it('AUCUNE ATTESTATION N’EST DÉCLARÉE — l’ancre ne vaut pas relecture', () => {
    // LE DÉFAUT QUE CE CAS INTERDIT. Un périmètre posé, haché et gardé RESSEMBLE
    // à un périmètre signé : il en a la forme, les bancs et le vocabulaire. S'en
    // réclamer serait fabriquer la provenance que `D-162` §5 défend justement de
    // s'attribuer — « aucune généralisation ne peut se réclamer d'une provenance
    // certifiée tant que ce n'est pas fait ». Ce banc échoue le jour où
    // quelqu'un remplit l'attestation sans le décider : il faudra alors le
    // réécrire, ce qui est le point.
    expect(ATTESTATION_CLASSEMENT.relu).toBe(false);
    expect(ATTESTATION_CLASSEMENT.dateRelecture).toBeNull();
    expect(ATTESTATION_CLASSEMENT.shaRelu).toBeNull();
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

  it('LES DEUX MOTIFS D’ABSTENTION SONT CEUX DE LA TABLE SIGNÉE, dans un ordre déclaré', () => {
    // La liaison se fait par IDENTITÉ : un identifiant qui n'existerait plus
    // dans la table signée ferait jeter le moteur à l'exécution
    // (`motifRequis`), mais seulement sur un dossier qui s'abstient — donc
    // tard, et sur un vrai patient.
    expect(new Set(ORDRE_EVALUATION_ABSTENTION).size).toBe(ORDRE_EVALUATION_ABSTENTION.length);
    expect(ORDRE_EVALUATION_ABSTENTION).toHaveLength(2);
  });

  it('LE MOTEUR LIT CES DONNÉES, il n’en garde pas une copie', () => {
    // LE POINT QUI FAIT LA DIFFÉRENCE ENTRE UN PÉRIMÈTRE ET UN DOCUMENT.
    // `chaineC1.ts` composait ses quatre limitations depuis des littéraux
    // locaux. Les laisser en place aurait donné une signature portant sur un
    // texte que rien n'exécute (`DC-26`) — la forme de la conformité sans son
    // effet. Ce banc lit la SOURCE du moteur et refuse qu'un de ces textes y
    // réapparaisse en dur.
    const source = readFileSync(
      new URL('../clinical-engine/chaineC1.ts', import.meta.url),
      'utf8',
    );
    for (const texte of Object.values(LIMITATIONS_CANDIDAT)) {
      expect(
        source.includes(texte),
        `« ${texte.slice(0, 40)}… » est réécrit en dur dans chaineC1.ts : le périmètre cesserait de décrire ce que le moteur applique`,
      ).toBe(false);
    }
  });

  it('ANTI-VACUITÉ : le périmètre n’est pas vide, et la table signée existe toujours', () => {
    // Un banc qui ne compare que des absences resterait vert sur un module vidé.
    expect(Object.keys(LIMITATIONS_CANDIDAT)).toHaveLength(4);
    expect(PRIORITY_RULES_V1.length).toBeGreaterThan(0);
  });
});
