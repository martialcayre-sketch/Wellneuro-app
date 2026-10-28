import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { LIEN_PROTOCOLE_IMPRIMABLE, PREFIXE_MENTION_IMPRESSION, mentionImpression } from './texteProtocoleImprimable';

describe('textes acceptés de l’imprimable du protocole', () => {
  // RECOPIE MOT POUR MOT de D-392 §4 : le lien et le pied.
  it('sont ceux de D-392 §4', () => {
    const decisions = readFileSync(path.join(process.cwd(), '..', 'docs', 'DECISIONS.md'), 'utf8');
    const debut = decisions.indexOf('### D-392');
    const fin = decisions.indexOf('### D-391');
    expect(debut).toBeGreaterThanOrEqual(0);
    expect(fin).toBeGreaterThan(debut);
    const section = decisions.slice(debut, fin);
    const paragraphe4 = section.slice(section.indexOf('**§4'), section.indexOf('**§5'));
    expect(paragraphe4).toContain(`« ${LIEN_PROTOCOLE_IMPRIMABLE} »`);
    expect(paragraphe4).toContain(`« ${PREFIXE_MENTION_IMPRESSION} … »`);
  });

  it('le pied date l’impression en lettres, au jour de Paris', () => {
    // 23 h 30 UTC le 31 octobre = 0 h 30 le 1er novembre à Paris (heure d'hiver).
    expect(mentionImpression(new Date('2026-10-31T23:30:00Z'))).toBe('Imprimé le 1er novembre 2026.');
    expect(mentionImpression(new Date('2026-10-28T10:00:00Z'))).toBe('Imprimé le 28 octobre 2026.');
  });

  it('un instant illisible ne date rien', () => {
    expect(mentionImpression(new Date('pas une date'))).toBeNull();
  });
});
