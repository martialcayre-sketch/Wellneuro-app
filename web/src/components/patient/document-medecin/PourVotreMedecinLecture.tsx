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
  NOM_FICHIER_DOCUMENT_MEDECIN,
  PHRASE_DOCUMENT_MEDECIN,
  TITRE_DOCUMENT_MEDECIN,
} from './textesDocumentMedecin';

// « Pour votre médecin » ([[D-307]] §3, F38). Patron de `CourrierMedecinLecture` :
// la route garde l'accès et le drapeau ; 401 renvoie au portail, 403 et 503
// sont définitifs, le reste se réessaie.
//
// LE DOCUMENT NE S'AFFICHE PAS ICI : il se télécharge, et chaque téléchargement
// est journalisé par la route qui le sert. Un POST lancé par le bouton, et non
// un lien : aucun préchargement, aucun HEAD ne compte un téléchargement que
// personne n'a fait, et un refus (accord retiré entre-temps) se dit en
// français au lieu d'un échec de téléchargement muet.

type Etat =
  | { statut: 'chargement' }
  | { statut: 'erreur'; message: string; definitif: boolean }
  | { statut: 'pret'; document: { imprimeLe: string } | null };

export function PourVotreMedecinLecture({ token }: { token: string }) {
  const router = useRouter();
  const [etat, setEtat] = useState<Etat>({ statut: 'chargement' });
  const annuleRef = useRef(false);
  const [telechargement, setTelechargement] = useState<{ enCours: boolean; erreur: string | null }>({
    enCours: false,
    erreur: null,
  });

  async function telecharger() {
    setTelechargement({ enCours: true, erreur: null });
    try {
      const res = await fetch('/api/portail/document-medecin/telechargement', { method: 'POST', cache: 'no-store' });
      if (res.status === 401) {
        router.replace(`/portail/${token}`);
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setTelechargement({ enCours: false, erreur: data?.error ?? 'Le téléchargement a échoué. Réessayez.' });
        return;
      }
      const url = URL.createObjectURL(await res.blob());
      const lien = document.createElement('a');
      lien.href = url;
      lien.download = NOM_FICHIER_DOCUMENT_MEDECIN;
      lien.click();
      URL.revokeObjectURL(url);
      setTelechargement({ enCours: false, erreur: null });
    } catch {
      setTelechargement({ enCours: false, erreur: 'Connexion interrompue. Vérifiez votre connexion et réessayez.' });
    }
  }

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
      <button
        type="button"
        onClick={() => void telecharger()}
        disabled={telechargement.enCours}
        className={patientButtonClassName('primary', 'mt-5')}
      >
        {telechargement.enCours ? 'Téléchargement…' : BOUTON_TELECHARGER}
      </button>
      {telechargement.erreur && (
        <p role="alert" className="mt-3 text-base text-status-warning">
          {telechargement.erreur}
        </p>
      )}
    </PatientCard>
  );
}
