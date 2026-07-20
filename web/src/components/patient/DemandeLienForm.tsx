'use client';

import { useState } from 'react';
import type { DemandeLienResponse } from '@/app/api/portail/lien/demande/route';
import { PatientButton } from '@/components/patient/ui/PatientButton';
import { PatientField, patientInputClassName } from '@/components/patient/ui/PatientField';
import { PatientInlineMessage } from '@/components/patient/ui/PatientInlineMessage';

// Redemande d'un lien d'accès (gate G4).
//
// L'écran affiche ce que le serveur répond, sans l'interpréter : la réponse est
// volontairement la même que l'adresse existe ou non. Ne jamais y ajouter un
// « adresse inconnue » côté client — ce serait rétablir l'oracle que la route
// prend soin de fermer.
export function DemandeLienForm() {
  const [email, setEmail] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setErreur('');
    setEnvoi(true);
    try {
      const res = await fetch('/api/portail/lien/demande', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = (await res.json()) as DemandeLienResponse;
      if (data.ok) setMessage(data.message);
      else setErreur(data.error);
    } catch {
      setErreur('Erreur réseau. Réessayez.');
    } finally {
      setEnvoi(false);
    }
  };

  // Une fois la demande passée, le formulaire disparaît : le renvoyer en boucle
  // ne ferait qu'épuiser le plafond horaire sans rien changer pour la personne.
  if (message) {
    return <PatientInlineMessage tone="success">{message}</PatientInlineMessage>;
  }

  return (
    <form onSubmit={soumettre} className="space-y-4">
      <PatientField label="Votre adresse e-mail">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoFocus
          placeholder="votre@email.fr"
          className={patientInputClassName}
        />
      </PatientField>
      {erreur && <PatientInlineMessage tone="error">{erreur}</PatientInlineMessage>}
      <PatientButton
        type="submit"
        variant="primary"
        className="w-full"
        disabled={!email.trim()}
        loading={envoi}
        loadingLabel="Envoi…"
      >
        Recevoir un nouveau lien
      </PatientButton>
    </form>
  );
}
