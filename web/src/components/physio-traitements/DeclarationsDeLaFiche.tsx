'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DeclarationsPatient } from './DeclarationsPatient';

// La page de la fiche de renseignements (U35) : toutes les parties, et une
// lecture refusée en 401 renvoie à l'entrée, comme les autres pages du lot
// (Q4 a du prototype PAT-6, [[D-481]] complément DOC-11). La fiche de l'entrée
// (U07) emploie `DeclarationsPatient` directement et garde son comportement.
export function DeclarationsDeLaFiche({ token }: { token: string }) {
  const router = useRouter();
  const onSessionExpiree = useCallback(() => router.replace(`/portail/${token}`), [router, token]);
  return <DeclarationsPatient parties="tout" onSessionExpiree={onSessionExpiree} />;
}
