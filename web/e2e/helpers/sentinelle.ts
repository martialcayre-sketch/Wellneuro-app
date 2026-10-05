// Sentinelle biologie — le point d'entrée unique des surfaces que le patient
// lit et qui touchent la biologie (BP-01, [[D-266]]). Elle remplace les listes
// recopiées d'un spec à l'autre et vérifie trois choses, conformément à
// [[D-122]] / [[D-157]] (restitution fidèle : jamais d'écart, de couleur ni de
// verdict) :
//
//   MOTS     — registre anxiogène du domaine documents (`termeAnxiogene`, la
//              même liste que les gardes serveur), mots de verdict sur une
//              valeur, mots de priorité ;
//   COULEUR  — aucune classe de statut (`*-status-danger|success|warning`)
//              dans la région servie : une couleur est un verdict ;
//   PRIORITÉ — aucun mot de priorité, aucun badge `data-priorite`.
//
// LECTURE PAR `innerText`, JAMAIS `textContent` : ce dernier inclut les
// scripts RSC, où « taux » peut sortir du buildId aléatoire (constaté). Les
// champs de saisie sont lus par leur valeur — `innerText` ne la rend pas.
//
// Toute surface patient neuve du programme appelle cette sentinelle ; un spec
// peut AJOUTER des mots propres à son écran, jamais en retirer. Le jour du
// lot, aucune page du portail ne montre de biologie : seul le texte du
// document remis est gardé (`assertTexteSentinelle`), et la forme « région »
// (`assertSentinelleBiologie`) attend la première surface patient (BP-16).
import { expect, type Locator } from '@playwright/test';
import { termeAnxiogene } from '../../src/lib/documents/vocabulaire';

/**
 * Mots de verdict sur UNE VALEUR — sans accent, comparés au texte normalisé.
 * Pas de mot de POPULATION : « déficit », « carence », « insuffisant »
 * décrivent légitimement à qui un bilan s'adresse (libellé signé d'un panel,
 * « population à risque de déficit martial ») — la sentinelle les refusait au
 * premier passage (T2 de BP-01, revue P1-1). Le verdict, c'est l'écart lu sur
 * une mesure du patient.
 */
const MOTS_VERDICT = ['anormal', 'hors norme', 'hors des normes', 'trop eleve', 'trop bas'];
/** Mots de priorité : une biologie restituée ne classe rien. */
const MOTS_PRIORITE = ['prioritaire', 'priorite'];
const CLASSE_STATUT = /\b(?:text|bg|border)-status-(?:danger|success|warning)\b/;

function normaliser(texte: string): string {
  return texte.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

export type OptionsSentinelle = {
  /** Mots propres à l'écran, AJOUTÉS aux listes communes. */
  motsEnPlus?: readonly string[];
  /**
   * `true` seulement pour un texte dont le praticien a TRANCHÉ le refus
   * confirmable du registre anxiogène ([[D-090]]) : le terme y est alors
   * légitime, lu et assumé. Verdict et priorité restent gardés.
   */
  registreTranche?: boolean;
};

/** Ce que la sentinelle reproche à un texte — vide s'il passe. */
export function reprochesTexte(texte: string, options: OptionsSentinelle = {}): string[] {
  const motsEnPlus = options.motsEnPlus ?? [];
  const norme = normaliser(texte);
  const reproches: string[] = [];
  const anxiogene = options.registreTranche ? null : termeAnxiogene(texte);
  if (anxiogene) reproches.push(`terme anxiogène « ${anxiogene} »`);
  for (const mot of [...MOTS_VERDICT, ...MOTS_PRIORITE, ...motsEnPlus.map(normaliser)]) {
    // Échappé AVANT de convertir les espaces : un mot propre à un écran
    // (`[urgent]`, `CRP+`) se cherche littéralement (revue Copilot).
    const litteral = mot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+');
    if (new RegExp(`(?<![\\p{L}\\p{N}])${litteral}`, 'u').test(norme)) {
      reproches.push(`mot « ${mot} »`);
    }
  }
  return reproches;
}

/** Sentinelle sur un texte déjà extrait (valeur d'un champ, document remis). */
export function assertTexteSentinelle(texte: string, options: OptionsSentinelle = {}): void {
  expect(reprochesTexte(texte, options), 'sentinelle biologie (BP-01) : texte servi au patient').toEqual([]);
}

/**
 * L'élément de la marque d'anomalie IMPRIMÉE par le laboratoire ([[D-267]] §6).
 * « H », « ↑ » ou « Anormal » y sont les mots du laboratoire, pas ceux de
 * Wellneuro : la sentinelle exempte cet élément, et lui seul, à condition
 * qu'il ne porte que le texte brut (ni enfant, ni classe). Miroir de
 * `SELECTEUR_MARQUAGE_LABORATOIRE` (`FaitsDuLaboratoire.tsx`), tenu égal par un
 * banc Vitest.
 */
export const SELECTEUR_MARQUAGE_LABORATOIRE = '[data-fait-laboratoire="marquage"]';

/** Sentinelle sur une région rendue : texte visible, champs, couleurs, badges. */
export async function assertSentinelleBiologie(region: Locator, options: OptionsSentinelle = {}): Promise<void> {
  // Le texte visible SANS les marques imprimées : vidées le temps de la
  // lecture, puis rendues. Un retrait par chaîne après coup pourrait amputer un
  // mot de Wellneuro qui contient la marque (« a » dans « anormal »).
  const { visible, marques } = await region.evaluate((racine, selecteur) => {
    const noeuds = Array.from(racine.querySelectorAll<HTMLElement>(selecteur));
    const lues = noeuds.map(n => ({ enfants: n.children.length, classe: n.getAttribute('class') }));
    const textes = noeuds.map(n => n.textContent);
    noeuds.forEach(n => { n.textContent = ''; });
    const texte = (racine as HTMLElement).innerText;
    noeuds.forEach((n, i) => { n.textContent = textes[i]; });
    return { visible: texte, marques: lues };
  }, SELECTEUR_MARQUAGE_LABORATOIRE);
  expect(
    marques.filter(m => m.enfants > 0 || m.classe !== null),
    'sentinelle biologie (BP-01) : la marque exemptée ne porte que le texte imprimé',
  ).toEqual([]);
  const valeurs = await region.locator('textarea, input[type="text"]').evaluateAll(
    champs => champs.map(champ => (champ as HTMLInputElement | HTMLTextAreaElement).value),
  );
  assertTexteSentinelle([visible, ...valeurs].join('\n'), options);

  const classesStatut = await region.locator('[class*="status-"]').evaluateAll(
    noeuds => noeuds.map(noeud => noeud.getAttribute('class') ?? ''),
  );
  expect(
    classesStatut.filter(classe => CLASSE_STATUT.test(classe)),
    'sentinelle biologie (BP-01) : une couleur de statut est un verdict',
  ).toEqual([]);
  await expect(region.locator('[data-priorite]'), 'sentinelle biologie (BP-01) : badge de priorité').toHaveCount(0);
}
