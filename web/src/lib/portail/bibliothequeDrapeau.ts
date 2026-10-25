import { statutAge } from '@/lib/patient/gardeAge';

// `WN_PORTAIL_BIBLIOTHEQUE` ([[D-357]], lettre ap ; place 10 de la file C,
// H82) — valeur exacte `'true'`, absent = fermé. Variable serveur : la page et
// les routes la lisent, un composant client ne la voit pas.
//
// NEUF ET ÉTEINT à la livraison. Il s'ouvre après le constat de la place 9
// (porte 18, [[D-357]] §7).

export function bibliothequeOuverte(value = process.env.WN_PORTAIL_BIBLIOTHEQUE): boolean {
  return value === 'true';
}

// LA BIBLIOTHÈQUE EST-ELLE SERVIE À CE DOSSIER ? Drapeau ouvert ET dossier
// majeur ([[D-357]] §5, même garde que « Mes échanges ») : mineur ou date de
// naissance manquante, ni page ni lien.
//
// Point unique : la route de la bibliothèque et la sonde du lien des fiches
// l'appellent toutes deux, pour que les deux liens ne se contredisent jamais —
// servie, la bibliothèque remplace le lien des fiches (arbitrage du
// 2026-10-25) ; le mineur garde le sien.
export function bibliothequeServie(dateNaissance: string | null | undefined, maintenantMs: number): boolean {
  return bibliothequeOuverte() && statutAge(dateNaissance, maintenantMs) === 'majeur';
}
