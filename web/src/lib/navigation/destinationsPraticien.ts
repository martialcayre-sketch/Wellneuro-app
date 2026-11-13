import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Compass,
  FlaskConical,
  House,
  Lightbulb,
  Mail,
  Pill,
  Route,
  Settings,
  ShieldCheck,
  Sparkles,
  Tally5,
  Users,
  type LucideIcon,
} from 'lucide-react';

/*
 * DESTINATIONS DU PORTAIL PRATICIEN, DÉCLARÉES UNE FOIS ([[D-485]] §1).
 *
 * Le rail du bureau, le tiroir de 768 à 1 023 px, la barre basse du téléphone
 * et sa feuille « Plus » en dérivent ; aucune couche ne recopie une entrée à la
 * main. Jusqu'à la refonte Lien (lot PRA-1), trois listes vivaient côte à côte
 * (rail, barre, vues rapides) et devaient être tenues d'accord à la main : la
 * feuille avait ainsi perdu « Comptes du cabinet » (Q26 de l'audit des rails).
 *
 * - Groupes et ordre : [[D-487]] (Travail, Bibliothèque, Ateliers, Cabinet).
 *   Intertitres : textes T-01 à T-04 de [[D-488]].
 * - Libellés et routes : ceux de [[D-324]] §1 à §6, inchangés.
 * - Activation : propriété de la déclaration ([[D-485]] §3). Une fiche
 *   (`/dashboard/patients/<id>`) allume « Fiche-trajectoire » au rail et
 *   « Fiches » sur la barre, par `prefixesActifs`.
 * - Sans entrée : Documents ([[D-324]]), l'atelier des règles et les positions
 *   d'expert tant que leur garde est fermée ([[D-487]] §3), et l'atelier de la
 *   bibliothèque des options sous son drapeau éteint ([[D-480]] §8). « Synthèses » n'a
 *   d'entrée que sur la barre du téléphone ([[D-324]] §5).
 *
 * Aucune route, aucune garde n'est décidée ici : une entrée visible n'est
 * jamais une autorisation.
 */

export type GroupeNavigation = 'travail' | 'bibliotheque' | 'ateliers' | 'cabinet';

/** Intertitres du rail, du tiroir et de la feuille « Plus » ([[D-488]] T-01 à T-04). */
export const GROUPES_NAVIGATION: readonly { id: GroupeNavigation; intertitre: string }[] = [
  { id: 'travail', intertitre: 'Travail' },
  { id: 'bibliotheque', intertitre: 'Bibliothèque' },
  { id: 'ateliers', intertitre: 'Ateliers' },
  { id: 'cabinet', intertitre: 'Cabinet' },
];

/**
 * - `exacte` : active sur la route seule. Désambiguïse « Patients » (la liste)
 *   des fiches ouvertes sous le même préfixe, qui appartiennent à
 *   « Fiche-trajectoire ».
 * - `rubrique` : active sur la route et ses sous-pages (`<route>/…`).
 */
export type Activation = 'exacte' | 'rubrique';

export type DestinationPraticien = {
  href: string;
  libelle: string;
  icone: LucideIcon;
  groupe: GroupeNavigation;
  activation: Activation;
  /** Préfixes SUPPLÉMENTAIRES qui activent l'entrée ([[D-485]] §3). */
  prefixesActifs?: readonly string[];
  /**
   * Compteur réel affiché par le rail : cartes du Fil, ou dossiers sans
   * réponse du médecin ([[D-210]]). Lu par `SidebarRail`, jamais inventé.
   */
  compteur?: 'fil' | 'correspondance';
};

/** Les quinze entrées du menu ([[D-324]] §7 amendé par [[D-485]] §2), dans l'ordre. */
export const DESTINATIONS_PRATICIEN: readonly DestinationPraticien[] = [
  // Travail ([[D-487]] §1) : les entrées de La Spirale, sauf « Comptes du cabinet ».
  // Icônes : table `icon-map.fr.json` du kit Lien v2.0.0 (Le Fil du jour → house,
  // Patients → users). La fiche-trajectoire, absente de la table, prend `Route`
  // pour ne pas partager `Users` avec Patients.
  { href: '/dashboard', libelle: 'Le Fil du jour', icone: House, groupe: 'travail', activation: 'exacte', compteur: 'fil' },
  { href: '/dashboard/patients', libelle: 'Patients', icone: Users, groupe: 'travail', activation: 'exacte' },
  {
    href: '/dashboard/trajectoires',
    libelle: 'Fiche-trajectoire',
    icone: Route,
    groupe: 'travail',
    activation: 'rubrique',
    prefixesActifs: ['/dashboard/patients/'],
  },
  { href: '/dashboard/copilote', libelle: 'Consultation copilote', icone: Compass, groupe: 'travail', activation: 'rubrique' },
  // L'agenda reste une entrée du menu, sans encart à l'accueil ([[D-324]] §2).
  { href: '/dashboard/agenda', libelle: 'Agenda & consultations', icone: CalendarDays, groupe: 'travail', activation: 'rubrique' },
  {
    href: '/dashboard/correspondance',
    libelle: 'Correspondance',
    icone: Mail,
    groupe: 'travail',
    activation: 'rubrique',
    compteur: 'correspondance',
  },
  // Du travail du jour, pas un réglage ([[D-324]] §3, [[D-487]] §2).
  { href: '/dashboard/droits', libelle: 'Confiance & droits', icone: ShieldCheck, groupe: 'travail', activation: 'rubrique' },

  // Bibliothèque : ses cinq rayons, chacun son entrée ([[D-324]] §4).
  { href: '/dashboard/bibliotheque/questionnaires', libelle: 'Questionnaires', icone: ClipboardList, groupe: 'bibliotheque', activation: 'rubrique' },
  { href: '/dashboard/bibliotheque/fiches-conseils', libelle: 'Fiches conseils', icone: Lightbulb, groupe: 'bibliotheque', activation: 'rubrique' },
  { href: '/dashboard/bibliotheque/complements', libelle: 'Compléments alimentaires', icone: Pill, groupe: 'bibliotheque', activation: 'rubrique' },
  { href: '/dashboard/bibliotheque/biologie', libelle: 'Analyses biologiques', icone: FlaskConical, groupe: 'bibliotheque', activation: 'rubrique' },
  { href: '/dashboard/bibliotheque/connaissances', libelle: 'Connaissances', icone: BookOpen, groupe: 'bibliotheque', activation: 'rubrique' },

  // Ateliers ([[D-487]] §3) : l'atelier de validation du corpus.
  { href: '/dashboard/corpus', libelle: 'Atelier corpus', icone: ClipboardCheck, groupe: 'ateliers', activation: 'rubrique' },

  // Cabinet ([[D-487]] §2) : « Comptes du cabinet » ([[D-385]]) puis « Paramètres ».
  { href: '/dashboard/cabinet', libelle: 'Comptes du cabinet', icone: Tally5, groupe: 'cabinet', activation: 'rubrique' },
  { href: '/dashboard/parametres', libelle: 'Paramètres', icone: Settings, groupe: 'cabinet', activation: 'rubrique' },
];

export type RaccourciTelephone = {
  href: string;
  /** Libellé court de la barre basse ([[D-488]] T-05, T-06 : inchangés). */
  libelle: string;
  icone: LucideIcon;
  activation: Activation;
  prefixesActifs?: readonly string[];
};

function raccourciDe(href: string, libelle: string): RaccourciTelephone {
  const destination = DESTINATIONS_PRATICIEN.find((d) => d.href === href);
  if (!destination) throw new Error(`Destination praticien inconnue : ${href}`);
  return {
    href,
    libelle,
    icone: destination.icone,
    activation: destination.activation,
    prefixesActifs: destination.prefixesActifs,
  };
}

/**
 * Les trois raccourcis de la barre basse du téléphone ([[D-324]] §5, gardés par
 * [[D-481]] §5). « Le Fil » et « Fiches » sont les formes courtes de deux
 * destinations du menu ; « Synthèses » est propre au téléphone : trois cartes
 * du Fil y mènent, c'est le geste de relecture.
 */
export const RACCOURCIS_TELEPHONE: readonly RaccourciTelephone[] = [
  raccourciDe('/dashboard', 'Le Fil'),
  raccourciDe('/dashboard/trajectoires', 'Fiches'),
  { href: '/dashboard/synthese', libelle: 'Synthèses', icone: Sparkles, activation: 'rubrique' },
];

/** Les entrées d'un groupe, dans l'ordre de la déclaration. */
export function destinationsDuGroupe(
  groupe: GroupeNavigation,
  destinations: readonly DestinationPraticien[] = DESTINATIONS_PRATICIEN,
): DestinationPraticien[] {
  return destinations.filter((d) => d.groupe === groupe);
}

/**
 * La feuille « Plus » : toutes les destinations du menu qui ne sont pas déjà
 * sur la barre basse, dans l'ordre du menu, sous leurs intertitres
 * ([[D-481]] §5).
 */
export const DESTINATIONS_FEUILLE_PLUS: readonly DestinationPraticien[] = DESTINATIONS_PRATICIEN.filter(
  (d) => !RACCOURCIS_TELEPHONE.some((r) => r.href === d.href),
);

/** Vrai si l'entrée doit porter `aria-current="page"` sur ce chemin. */
export function estActive(
  entree: { href: string; activation: Activation; prefixesActifs?: readonly string[] },
  chemin: string | null | undefined,
): boolean {
  if (!chemin) return false;
  if (entree.prefixesActifs?.some((prefixe) => chemin.startsWith(prefixe))) return true;
  if (chemin === entree.href) return true;
  return entree.activation === 'rubrique' && chemin.startsWith(`${entree.href}/`);
}
