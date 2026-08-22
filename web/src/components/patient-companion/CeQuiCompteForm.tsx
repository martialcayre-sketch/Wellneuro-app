'use client';

import { useCallback, useState } from 'react';
import { PatientButton } from '@/components/patient/ui/PatientButton';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { PatientField, patientInputClassName } from '@/components/patient/ui/PatientField';
import { PatientInlineMessage } from '@/components/patient/ui/PatientInlineMessage';
import { PatientPageHeader } from '@/components/patient/ui/PatientPageHeader';
import { LONGUEUR_MAX_CE_QUI_COMPTE } from '@/lib/patient/ceQuiCompte';

// Dépôt patient de « ce qui compte pour moi aujourd'hui » (Alliance 6.0-A,
// LOT-03). Un champ libre, une date facultative, un bouton.
//
// La soumission passe par la SESSION PORTAIL (cookie implicite) — aucun
// identifiant patient côté client, aucun jeton dans le corps : la route lit
// l'identité de la session et ignore ce que le corps pourrait porter. Même
// convention que `ProtocolCheckinForm`.
//
// Rien n'est noté, compté, catégorisé ni résumé : l'écran n'affiche aucun
// retour sur le CONTENU, seulement l'accusé du dépôt. Le compteur de
// caractères ne fait pas exception — il mesure une longueur de frappe, pas ce
// qui est dit, et n'existe que pour rendre la borne de la route visible AVANT
// l'envoi plutôt qu'après un refus.
//
// Aucune correction, aucune suppression : la table n'a pas de chaînage, une
// entrée déposée se conserve. On n'ajoute donc ici ni bouton « modifier », ni
// bouton « supprimer ».

export function CeQuiCompteForm() {
  const [texte, setTexte] = useState('');
  const [saisiLe, setSaisiLe] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const [depose, setDepose] = useState(false);

  // Le dépassement s'AFFICHE, il ne bloque pas : le bouton reste actif, la
  // requête part, et c'est la route qui refuse avec son message. Désactiver
  // l'envoi ici priverait le patient de la seule explication existante.
  const tropLong = texte.length > LONGUEUR_MAX_CE_QUI_COMPTE;

  const soumettre = useCallback(async () => {
    setEnvoi(true);
    setErreur('');
    setDepose(false);
    try {
      const res = await fetch('/api/portail/ce-qui-compte', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        // Le corps ne porte QUE la parole et sa date déclarée. Pas
        // d'identifiant : la session le dit, et la route ne lirait pas
        // celui-ci de toute façon.
        body: JSON.stringify({ texte, saisiLe: saisiLe || null }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (res.ok && data.ok) {
        // Le dépôt est acquis : le champ peut repartir vide.
        setTexte('');
        setSaisiLe('');
        setDepose(true);
      } else {
        // LE CHAMP N'EST PAS VIDÉ SUR ERREUR, et c'est délibéré : la session
        // du portail dure 12 h (`lib/patient-session.ts`), un 401 peut donc
        // tomber sur un texte tout juste rédigé. Ce n'est pas une suite de
        // clics à refaire, c'est une parole — l'effacer serait la perdre.
        setErreur(data.error ?? 'Votre dépôt n’a pas pu être enregistré.');
      }
    } catch {
      setErreur('Erreur réseau. Réessayez — votre texte est conservé ici.');
    } finally {
      setEnvoi(false);
    }
  }, [texte, saisiLe]);

  return (
    <PatientCard
      as="form"
      onSubmit={(e) => {
        e.preventDefault();
        void soumettre();
      }}
      className="space-y-5"
    >
      <PatientPageHeader
        title="Ce qui compte pour moi aujourd’hui"
        subtitle="Écrivez ce que vous souhaitez que votre praticien sache. Personne ne le note ni ne le résume : c’est conservé tel quel."
      />

      <PatientField label="Ce que je veux dire" requis>
        {/* AUCUN `maxLength` SUR CE CHAMP, ET C'EST LE POINT.
            `maxLength` fait couper le navigateur SILENCIEUSEMENT : un collage
            de 6 000 caractères devient 4 000 sans message, sans que le patient
            sache qu'il manque un morceau. C'est exactement l'altération de
            donnée que `lib/patient/ceQuiCompte.ts` désigne en contre-patron —
            simplement déplacée du serveur vers le client, où elle est plus
            difficile à voir. La borne est opposée par la route, en REFUS 400,
            avec un message que le patient lit et un texte qui reste à l'écran.
            Le compteur ci-dessous informe ; il n'ampute pas. Ne pas rétablir
            l'attribut « pour aider l'utilisateur » : il aide en effaçant. */}
        <textarea
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          rows={7}
          placeholder="Ce qui compte pour moi en ce moment…"
          aria-label="Ce que je veux dire"
          aria-describedby="ce-qui-compte-compteur"
          className={patientInputClassName}
        />
        <p
          id="ce-qui-compte-compteur"
          className={`mt-1 text-xs ${tropLong ? 'text-status-warning' : 'text-muted-foreground'}`}
        >
          {texte.length} / {LONGUEUR_MAX_CE_QUI_COMPTE} caractères
          {tropLong && ' — au-delà de la limite : raccourcissez avant d’envoyer.'}
        </p>
      </PatientField>

      <PatientField
        label="Date à laquelle cela vous concerne"
        suffixe="facultatif — laissez vide si vous préférez"
      >
        <input
          type="date"
          value={saisiLe}
          onChange={(e) => setSaisiLe(e.target.value)}
          aria-label="Date à laquelle cela vous concerne"
          className={patientInputClassName}
        />
      </PatientField>

      {erreur && <PatientInlineMessage tone="error">{erreur}</PatientInlineMessage>}
      {depose && (
        <PatientInlineMessage tone="success">
          C’est enregistré. Merci de l’avoir écrit.
        </PatientInlineMessage>
      )}

      <PatientButton
        type="submit"
        variant="primary"
        disabled={texte.trim().length === 0}
        loading={envoi}
        loadingLabel="Envoi…"
        className="w-full"
      >
        Envoyer
      </PatientButton>
    </PatientCard>
  );
}
