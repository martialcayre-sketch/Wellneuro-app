import { describe, expect, it } from 'vitest';
import { messageErreurConnexion } from './messagesErreurLogin';

describe('messageErreurConnexion', () => {
  it('sans code, aucun bandeau — la page reste une page de connexion ordinaire', () => {
    expect(messageErreurConnexion(null)).toBeNull();
    expect(messageErreurConnexion(undefined)).toBeNull();
    expect(messageErreurConnexion('')).toBeNull();
  });

  it('un refus dit ce qui est attendu, sans inviter à réessayer', () => {
    // Réessayer avec le même compte redonnera le même refus : le message doit
    // orienter vers le compte professionnel, pas vers le bouton.
    const refus = messageErreurConnexion('AccessDenied');
    expect(refus?.registre).toBe('refus');
    expect(refus?.titre).toMatch(/n’a pas accès/i);
    expect(refus?.detail).toMatch(/wellneuro\.fr/);
    expect(refus?.detail).not.toMatch(/réessayez/i);
  });

  it('une panne invite à réessayer', () => {
    const panne = messageErreurConnexion('OAuthCallback');
    expect(panne?.registre).toBe('panne');
    expect(panne?.detail).toMatch(/réessayez/i);
  });

  // Le cœur du lot : le silence était le défaut. Un code inconnu — NextAuth
  // peut en ajouter, une mise à jour en renommer — ne doit jamais faire
  // disparaître le bandeau, sinon la panne redevient muette sans prévenir.
  it('un code inconnu affiche quand même un message', () => {
    const inconnu = messageErreurConnexion('CodeQueNextAuthNaPasEncoreInvente');
    expect(inconnu).not.toBeNull();
    expect(inconnu?.titre).toMatch(/n’a pas abouti/i);
  });

  it('tous les messages sont en français et non vides', () => {
    const codes = ['AccessDenied', 'Configuration', 'Verification', 'OAuthSignin', 'OAuthCallback', 'Callback', 'OAuthAccountNotLinked', 'SessionRequired', 'Inconnu'];
    for (const code of codes) {
      const message = messageErreurConnexion(code);
      expect(message?.titre.length, code).toBeGreaterThan(10);
      expect(message?.detail.length, code).toBeGreaterThan(10);
      // Les libellés d'interface sont en français (règle du dépôt) : un
      // message anglais recopié de NextAuth passerait sinon inaperçu.
      expect(message?.titre, code).not.toMatch(/\b(error|failed|sign in|try again)\b/i);
      expect(message?.detail, code).not.toMatch(/\b(error|failed|sign in|try again)\b/i);
    }
  });
});
