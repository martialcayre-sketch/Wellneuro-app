import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import { VERSION_PROCEDE_EXTRACTION } from './extraction';
import { procedeReleveCommentaires } from './lecture';

describe('procedeReleveCommentaires — les commentaires ne sont relevés que depuis bio-extraction-v4 (D-278 §3)', () => {
  it('le procédé courant les relève : sinon l’écran dirait « non relevés » à chaque lecture neuve', () => {
    expect(procedeReleveCommentaires(VERSION_PROCEDE_EXTRACTION)).toBe(true);
  });

  it('une version antérieure ne les relevait pas : son silence ne vaut pas « aucun commentaire »', () => {
    for (const v of ['bio-extraction-v1', 'bio-extraction-v2', 'bio-extraction-v3']) {
      expect(procedeReleveCommentaires(v), v).toBe(false);
    }
  });

  it('les versions suivantes les relèvent, comparées en nombre et non en texte', () => {
    expect(procedeReleveCommentaires('bio-extraction-v4')).toBe(true);
    expect(procedeReleveCommentaires('bio-extraction-v10')).toBe(true);
  });

  it('une version illisible est jugée NON relevante : le sens sûr', () => {
    for (const v of ['', 'bio-extraction', 'bio-extraction-v', 'bio-extraction-v4-essai', 'autre-v9', 'BIO-EXTRACTION-V4']) {
      expect(procedeReleveCommentaires(v), v).toBe(false);
    }
  });
});
