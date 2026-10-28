import { statutAge } from '@/lib/patient/gardeAge';

// `WN_PORTAIL_PROTOCOLE_IMPRIMABLE` — L'IMPRIMABLE DU PROTOCOLE (lettre bh,
// fiche H69, [[D-392]]). Valeur exacte `'true'`, absent = fermé. Variable
// serveur : la page et la route du protocole la lisent, un composant client ne
// la voit pas — la route lui dit `imprimable`.
//
// NEUF ET ÉTEINT à la livraison. Il s'ouvre sans place dans la file C
// ([[D-392]] §5), constaté sur un vrai dossier.

export function protocoleImprimableOuvert(value = process.env.WN_PORTAIL_PROTOCOLE_IMPRIMABLE): boolean {
  return value === 'true';
}

// L'IMPRIMABLE EST-IL SERVI À CE DOSSIER ? Drapeau ouvert ET dossier majeur
// ([[D-392]] §3, même garde que « Mes échanges » et la bibliothèque) : mineur
// ou date de naissance manquante, ni lien ni page — aucune surface neuve
// ([[D-283]] §5).
export function protocoleImprimableServi(dateNaissance: string | null | undefined, maintenantMs: number): boolean {
  return protocoleImprimableOuvert() && statutAge(dateNaissance, maintenantMs) === 'majeur';
}
