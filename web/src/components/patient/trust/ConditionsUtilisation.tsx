'use client';

import { useState } from 'react';
import { getDocumentCourant } from '@/lib/trust/contenus/registre';
import { DocumentTrust } from '@/components/patient/trust/DocumentTrust';
import { PatientButton } from '@/components/patient/ui/PatientButton';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { PatientInlineMessage } from '@/components/patient/ui/PatientInlineMessage';
import { PatientPageHeader } from '@/components/patient/ui/PatientPageHeader';

// LES CONDITIONS D'UTILISATION ET LEUR BOUTON ([[D-292]], `WN_PORTAIL_CONDITIONS`).
//
// L'accusé se pose par un POST, au clic, et JAMAIS à l'affichage (§3) : un
// scanner de liens qui ouvre la page ne valide rien. Aucune trace `presente`
// non plus : une ouverture par un scanner l'écrirait comme une lecture.
// Version et hash sont résolus par la route, jamais par l'écran.

/** Le texte en vigueur et « J'en ai pris connaissance ». */
export function AccuseConditions({
  onAccuse,
  partiesDepliees,
}: {
  onAccuse: () => void;
  partiesDepliees?: readonly string[];
}) {
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const conditions = getDocumentCourant('conditions_utilisation');

  const accuser = async () => {
    setErreur('');
    setEnvoi(true);
    try {
      const res = await fetch('/api/portail/trust/lecture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentKey: 'conditions_utilisation', type: 'pris_connaissance' }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean } | null;
      if (!res.ok || !data?.ok) {
        setErreur('Votre lecture n’a pas pu être enregistrée. Réessayez.');
        setEnvoi(false);
        return;
      }
      onAccuse();
    } catch {
      setErreur('Connexion interrompue. Vérifiez votre connexion et réessayez.');
      setEnvoi(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-display text-lg font-bold text-foreground">{conditions.titre}</h2>
        <p className="text-sm text-muted-foreground">{conditions.resume}</p>
      </div>
      <DocumentTrust document={conditions} accordeons partiesDepliees={partiesDepliees} />
      {erreur && <PatientInlineMessage tone="error">{erreur}</PatientInlineMessage>}
      <PatientButton
        variant="primary"
        loading={envoi}
        loadingLabel="Enregistrement…"
        onClick={() => void accuser()}
        className="w-full"
      >
        J’en ai pris connaissance
      </PatientButton>
    </div>
  );
}

/**
 * L'accueil d'un nouveau patient majeur sous les conditions ([[D-292]] §3) :
 * elles seules, avant d'accéder à l'espace. Remplace la séquence en trois
 * textes, que gardent les dossiers mineurs ou sans date de naissance.
 *
 * LA SÉCURITÉ SE LIT SANS CLIC (arbitrage du 2026-10-16) : l'accueil d'avant
 * avait un écran « pas un service d'urgence » et une case à cocher. Ici, la
 * partie « Limites et sécurité médicale » s'ouvre d'office, numéros d'urgence
 * visibles ; le texte reste celui validé, seule sa présentation change.
 */
const PARTIES_DEPLIEES_A_L_ACCUEIL = Object.freeze(['Limites et sécurité médicale']);

export function AccueilConditions({ onDone }: { onDone: () => void }) {
  return (
    <PatientCard className="space-y-4">
      <PatientPageHeader title="Bienvenue dans votre espace Wellneuro" />
      <AccuseConditions onAccuse={onDone} partiesDepliees={PARTIES_DEPLIEES_A_L_ACCUEIL} />
    </PatientCard>
  );
}
