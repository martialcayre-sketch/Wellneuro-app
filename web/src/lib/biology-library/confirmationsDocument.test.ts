import { describe, expect, it } from 'vitest';
import { ajouterConfirmation, type ConfirmationsDocument } from './confirmationsDocument';

const JETON_REGISTRE = 'a'.repeat(64);
const JETON_DOUBLON = 'b'.repeat(64);

describe('accumulation des confirmations du document patient', () => {
  it('un refus de registre pose le jeton du registre', () => {
    const suite = ajouterConfirmation(
      {},
      { reason: 'REGISTRE_ANXIOGENE', texteSha256: JETON_REGISTRE },
    );
    expect(suite).toEqual({ registre: JETON_REGISTRE });
  });

  it('un refus de doublon pose le jeton du doublon', () => {
    const suite = ajouterConfirmation({}, { reason: 'DOUBLON_DOCUMENT', texteSha256: JETON_DOUBLON });
    expect(suite).toEqual({ doublon: JETON_DOUBLON });
  });

  it('ACCUMULE : confirmer le second ne perd pas le premier', () => {
    // Le cas qui motive ce module. Registre puis doublon sur le même texte :
    // n'envoyer que le dernier ferait re-refuser le premier, et le geste
    // tournerait en rond entre deux 409.
    const apresRegistre = ajouterConfirmation(
      {},
      { reason: 'REGISTRE_ANXIOGENE', texteSha256: JETON_REGISTRE },
    );
    const apresDoublon = ajouterConfirmation(apresRegistre, {
      reason: 'DOUBLON_DOCUMENT',
      texteSha256: JETON_DOUBLON,
    });
    expect(apresDoublon).toEqual({ registre: JETON_REGISTRE, doublon: JETON_DOUBLON });
  });

  it('un second refus de la MÊME garde remplace son jeton, pas l’autre', () => {
    // Le texte a bougé entre deux clics : le nouveau jeton du registre
    // remplace l'ancien, celui du doublon reste ce qu'il était.
    const courantes: ConfirmationsDocument = { registre: JETON_REGISTRE, doublon: JETON_DOUBLON };
    const suite = ajouterConfirmation(courantes, {
      reason: 'REGISTRE_ANXIOGENE',
      texteSha256: 'c'.repeat(64),
    });
    expect(suite).toEqual({ registre: 'c'.repeat(64), doublon: JETON_DOUBLON });
  });

  it('un motif INCONNU ne confirme rien (fail-closed)', () => {
    // On ne lève pas une garde qu'on ne sait pas nommer : un motif neuf côté
    // serveur ne doit jamais se confirmer par accident côté écran.
    const suite = ajouterConfirmation({}, { reason: 'MOTIF_NEUF', texteSha256: JETON_REGISTRE });
    expect(suite).toEqual({});
  });

  it('un refus sans jeton ne confirme rien', () => {
    expect(ajouterConfirmation({}, { reason: 'REGISTRE_ANXIOGENE' })).toEqual({});
  });

  it('l’absence de refus ne confirme rien', () => {
    const courantes: ConfirmationsDocument = { registre: JETON_REGISTRE };
    expect(ajouterConfirmation(courantes, null)).toBe(courantes);
    expect(ajouterConfirmation(courantes, undefined)).toBe(courantes);
  });

  it('ne mute jamais le trousseau reçu', () => {
    const courantes: ConfirmationsDocument = { registre: JETON_REGISTRE };
    ajouterConfirmation(courantes, { reason: 'DOUBLON_DOCUMENT', texteSha256: JETON_DOUBLON });
    expect(courantes).toEqual({ registre: JETON_REGISTRE });
  });
});
