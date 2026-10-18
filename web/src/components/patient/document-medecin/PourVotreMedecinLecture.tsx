'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PortailDocumentMedecinResponse } from '@/app/api/portail/document-medecin/route';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { patientButtonClassName } from '@/components/patient/ui/PatientButton';
import { PatientErrorState } from '@/components/patient/PatientErrorState';
import {
  AUCUN_DOCUMENT_MEDECIN,
  BOUTON_TELECHARGER,
  dateDuDocumentMedecin,
  PHRASE_DOCUMENT_MEDECIN,
  TITRE_DOCUMENT_MEDECIN,
} from './textesDocumentMedecin';

// « Pour votre médecin » ([[D-307]] §3, F38). Patron de `CourrierMedecinLecture` :
// la route garde l'accès et le drapeau ; 401 renvoie au portail, 403 et 503
// sont définitifs, le reste se réessaie.
//
// LE DOCUMENT NE S'AFFICHE PAS ICI : il se télécharge, et chaque téléchargement
// est journalisé par la route qui le sert. Un lien simple (pas `next/link`) :
// aucun préchargement ne doit compter un téléchargement que personne n'a fait.

type Etat =
  | { statut: 'chargement' }
  | { statut: 'erreur'; message: string; definitif: boolean }
  | { statut: 'pret'; document: { imprimeLe: string } | null };

export function PourVotreMedecinLecture({ token }: { token: string }) {
  const router = useRouter();
  const [etat, setEtat] = useState<Etat>({ statut: 'chargement' });
  const annuleRef = useRef(false);

  const charger = useCallback(async () => {
    setEtat({ statut: 'chargement' });
    try {
      const res = await fetch('/api/portail/document-medecin', { cache: 'no-store' });
      if (annuleRef.current) return;
      if (res.status === 401) {
        router.replace(`/portail/${token}`);
        return;
      }
      const data = (await res.json()) as PortailDocumentMedecinResponse;
      if (annuleRef.current) return;
      if (!data.ok) {
        setEtat({ statut: 'erreur', message: data.error, definitif: res.status === 403 || res.status === 503 });
        return;
      }
      if (!('document' in data)) {
        setEtat({ statut: 'erreur', message: 'Réponse inattendue. Réessayez.', definitif: false });
        return;
      }
      setEtat({ statut: 'pret', document: data.document });
    } catch {
      if (annuleRef.current) return;
      setEtat({ statut: 'erreur', message: 'Connexion interrompue. Vérifiez votre connexion et réessayez.', definitif: false });
    }
  }, [token, router]);

  useEffect(() => {
    annuleRef.current = false;
    void charger();
    return () => {
      annuleRef.current = true;
    };
  }, [charger]);

  if (etat.statut === 'chargement') {
    return (
      <PatientCard padding="sm">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </PatientCard>
    );
  }

  if (etat.statut === 'erreur') {
    return (
      <PatientCard padding="sm">
        <PatientErrorState message={etat.message} onReessayer={etat.definitif ? undefined : () => void charger()} />
      </PatientCard>
    );
  }

  if (!etat.document) {
    return (
      <PatientCard padding="sm">
        <p className="text-base text-foreground">{AUCUN_DOCUMENT_MEDECIN}</p>
      </PatientCard>
    );
  }

  const date = dateDuDocumentMedecin(etat.document.imprimeLe);

  return (
    <PatientCard>
      <h1 className="text-2xl font-semibold text-foreground">{TITRE_DOCUMENT_MEDECIN}</h1>
      {date && <p className="mt-1 text-sm text-muted-foreground">{date}</p>}
      <p className="mt-3 text-base text-foreground">{PHRASE_DOCUMENT_MEDECIN}</p>
      <a href="/api/portail/document-medecin/telechargement" download className={patientButtonClassName('primary', 'mt-5')}>
        {BOUTON_TELECHARGER}
      </a>
    </PatientCard>
  );
}
