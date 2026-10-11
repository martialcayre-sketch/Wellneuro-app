import { describe, expect, it } from 'vitest';
import { consigneApresTelechargement } from './RappelDuMatin';

// La consigne nomme le geste que le téléphone impose après le téléchargement :
// la page ne peut pas le sauter (aucune API web n'écrit dans un agenda). Une
// consigne fausse laisse le patient avec un fichier dont il ne sait que faire.

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
// Safari sur iPad demande la version ordinateur : il se dit Mac.
const MAC_OU_IPAD =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36';
const ANDROID_MESSAGERIE =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.0.0 Mobile Safari/537.36';
const ORDINATEUR =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';

const SECOND_RAPPEL = 'Le télécharger une seconde fois ajouterait un second rappel.';

describe('consigneApresTelechargement', () => {
  it('iPhone : « Télécharger » s’il est demandé, puis le Calendrier ; repli par l’app Fichiers', () => {
    const consigne = consigneApresTelechargement(IPHONE, 5);
    // Aucun navigateur nommé : Chrome et Firefox sur iPhone demandent aussi « Télécharger ».
    expect(consigne).toMatch(/^Touchez « Télécharger » si on vous le demande, puis confirmez l’ajout au Calendrier\./);
    expect(consigne).toContain('« rappel-du-matin.ics » est dans l’app Fichiers : touchez-le.');
    expect(consigne).not.toContain('Safari');
    expect(consigne).not.toContain('Ouvrir');
    expect(consigne.endsWith(SECOND_RAPPEL)).toBe(true);
  });

  it('iPad qui se dit Mac : reconnu à son écran tactile ; un vrai Mac garde la consigne générale', () => {
    expect(consigneApresTelechargement(MAC_OU_IPAD, 5)).toBe(consigneApresTelechargement(IPHONE, 5));
    expect(consigneApresTelechargement(MAC_OU_IPAD, 0)).toBe(consigneApresTelechargement(ORDINATEUR, 0));
  });

  it('Android, Chrome ou navigateur intégré d’une messagerie : « Ouvrir » dans le message de téléchargement', () => {
    for (const ua of [ANDROID_CHROME, ANDROID_MESSAGERIE]) {
      const consigne = consigneApresTelechargement(ua, 5);
      expect(consigne).toMatch(/^Touchez « Ouvrir » dans le message de téléchargement, puis confirmez l’ajout dans votre agenda\./);
      expect(consigne).toContain('« rappel-du-matin.ics » est dans vos téléchargements : touchez-le.');
      expect(consigne).not.toContain('Calendrier');
      expect(consigne.endsWith(SECOND_RAPPEL)).toBe(true);
    }
  });

  it('ordinateur : aucun geste de téléphone, et l’avertissement que son agenda ne sonne pas forcément sur le téléphone', () => {
    expect(consigneApresTelechargement(ORDINATEUR, 0)).toBe(
      `Le fichier « rappel-du-matin.ics » est prêt : ouvrez-le pour l’ajouter à votre agenda. Pour qu’il sonne sur votre téléphone, ajoutez-le plutôt depuis votre téléphone. ${SECOND_RAPPEL}`,
    );
  });
});
