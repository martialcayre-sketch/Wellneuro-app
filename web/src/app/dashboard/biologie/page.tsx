import { redirect } from 'next/navigation';

// « Biologie fonctionnelle » a quitté le menu avec le groupe « Héritage 4.0 »
// (D-324 §6) : son contenu — validation des fiches d'usage, état de l'étage 2
// — vit sur la page du rayon « Analyses biologiques », où cette adresse mène.
// Les marque-pages et liens anciens restent valides.
export default function BiologiePage() {
  redirect('/dashboard/bibliotheque/biologie');
}
