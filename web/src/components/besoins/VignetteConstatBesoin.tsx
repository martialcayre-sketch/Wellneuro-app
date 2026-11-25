'use client';

import { useChiffresMasques, ValeurMasquee } from '@/components/patient-cockpit/ChiffresMasques';
import { ligneVignette, type VignetteConstat } from '@/lib/constats-besoin/vignette';

// LA VIGNETTE DU CONSTAT SUR UN BESOIN SANS SCORE ([[D-551]], J3-12f) : le
// verdict que le praticien a posé, en mots, sous le « non mesuré » ou le « hors
// score » du besoin. Ni nombre, ni jauge, ni couleur d'état : un texte neutre.
// Elle ne remplace rien : le besoin reste « non mesuré » ou « hors score », et
// n'entre dans aucun total ni aucun compte ([[D-551]] §1).
//
// MODE CONSULTATION ([[D-553]] §2) : un verdict du praticien est une lecture que
// l'écran partagé avec le patient ne doit pas servir. La vignette rend alors la
// mention neutre de [[D-354]] §3, la même que celle des valeurs masquées.
//
// Le composant est rendu à deux endroits : la ligne du besoin dans « Les 12
// besoins » (`DetailBesoinsPanel`) et celle du tiroir de la fiche (`FichePatientPanel`).
export function VignetteConstatBesoin({ besoin, vignette }: { besoin: number; vignette: VignetteConstat }) {
  const masque = useChiffresMasques();
  return (
    <p data-vignette-constat-besoin={besoin} className="mt-1 text-xs text-muted-foreground">
      {masque ? <ValeurMasquee /> : ligneVignette(vignette)}
    </p>
  );
}
