// Export PDF du dossier patient (D-252) — section 4 : la dernière synthèse validée.
//
// Le JSON est lu BRUT, et tolérant sans rien combler : `validateSyntheseSchema`
// (lib/anthropic) remplacerait un champ absent par un texte que personne n'a
// validé. Ici, une absence se dit absente — jamais vide, jamais normale (DC-24).

import { estRedactionPraticien } from '@/lib/synthese-praticien';
import {
  citer,
  dateFr,
  dateHeureFr,
  NON_RENSEIGNE,
  type BlocExport,
  type BrouillonPlusRecentExport,
  type SyntheseExport,
} from './modele';

const ABSENT = 'Absent de cette synthèse.';
const LISTE_VIDE = 'Aucun élément dans cette synthèse.';
const TEXTE_VIDE = 'Aucun texte dans cette synthèse.';

// Des Map plutôt que des objets : une valeur brute comme « constructor » ne
// doit pas remonter le prototype.
const STATUT_VALIDE = new Map<string, string>([
  ['Validee_Praticien', 'Validée'],
  ['Corrigee_Praticien', 'Validée, puis annotée par le praticien'],
]);

// Libellés de l'écran praticien (`SynthesePanel.tsx`, STATUT_LABEL).
const STATUT_BROUILLON = new Map<string, string>([
  ['Brouillon_IA', 'Brouillon IA'],
  ['Brouillon_Praticien', 'Brouillon praticien'],
]);

const PRIORITE = new Map<string, string>([
  ['eleve', 'Élevée'],
  ['modere', 'Modérée'],
  ['faible', 'Faible'],
]);

function discret(texte: string): BlocExport {
  return { type: 'paragraphe', texte, ton: 'discret' };
}

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur);
}

function blocTexte(valeur: unknown, ton: 'normal' | 'discret' = 'normal'): BlocExport {
  if (typeof valeur !== 'string') return discret(ABSENT);
  const texte = valeur.trim();
  if (!texte) return discret(TEXTE_VIDE);
  return ton === 'discret' ? discret(texte) : { type: 'paragraphe', texte };
}

function blocListe(valeur: unknown): BlocExport {
  if (!Array.isArray(valeur)) return discret(ABSENT);
  const elements = valeur
    .filter((element): element is string => typeof element === 'string')
    .map((element) => element.trim())
    .filter((element) => element.length > 0);
  return elements.length > 0 ? { type: 'liste', elements } : discret(LISTE_VIDE);
}

/** Dans un axe, une liste ABSENTE vaut liste vide ; une liste de mauvais type reste « absente ». */
function blocListeAxe(valeur: unknown): BlocExport {
  return valeur === undefined || valeur === null ? discret(LISTE_VIDE) : blocListe(valeur);
}

function libellePriorite(valeur: unknown): string {
  if (typeof valeur !== 'string' || !valeur.trim()) return 'Absente de cette synthèse';
  return PRIORITE.get(valeur) ?? valeur;
}

function blocsAxes(valeur: unknown): BlocExport[] {
  if (!Array.isArray(valeur)) return [discret(ABSENT)];
  const axes = valeur.filter(estObjet);
  const illisibles = valeur.length - axes.length;
  if (axes.length === 0 && illisibles === 0) return [discret(LISTE_VIDE)];

  const blocs: BlocExport[] = [];
  axes.forEach((axe, i) => {
    const intitule = typeof axe.axe === 'string' && axe.axe.trim()
      ? axe.axe.trim()
      : 'intitulé absent de cette synthèse';
    blocs.push(
      { type: 'titre', niveau: 3, texte: `Axe ${i + 1} — ${intitule}` },
      { type: 'champ', libelle: 'Priorité', valeur: libellePriorite(axe.niveau_priorite) },
      { type: 'paragraphe', texte: 'Arguments :' },
      blocListeAxe(axe.arguments),
      { type: 'paragraphe', texte: 'À confirmer en entretien :' },
      blocListeAxe(axe.points_a_confirmer),
    );
  });
  // Un axe illisible n'a rien à restituer, mais son existence se signale.
  if (illisibles > 0) {
    blocs.push(discret(
      illisibles === 1
        ? "1 axe de forme illisible n'est pas restitué."
        : `${illisibles} axes de forme illisible ne sont pas restitués.`,
    ));
  }
  return blocs;
}

function libelleBrouillon(statut: string): string {
  return STATUT_BROUILLON.get(statut) ?? statut;
}

export function sectionSynthese(
  synthese: SyntheseExport | null,
  brouillonPlusRecent: BrouillonPlusRecentExport,
): BlocExport[] {
  const blocs: BlocExport[] = [{ type: 'titre', niveau: 1, texte: '4. Dernière synthèse validée' }];

  if (!synthese) {
    blocs.push({ type: 'paragraphe', texte: "Aucune synthèse n'a encore été validée par le praticien." });
    if (brouillonPlusRecent) {
      blocs.push(discret(
        `Un brouillon (${libelleBrouillon(brouillonPlusRecent.statut)}) généré le `
        + `${dateFr(brouillonPlusRecent.dateGeneration)} existe ; il n'est pas inclus car il n'a pas été validé.`,
      ));
    }
    return blocs;
  }

  blocs.push(
    { type: 'champ', libelle: 'Statut', valeur: STATUT_VALIDE.get(synthese.statut) ?? synthese.statut },
    { type: 'champ', libelle: 'Générée le', valeur: dateHeureFr(synthese.dateGeneration) },
    {
      type: 'champ',
      libelle: 'Validée le',
      valeur: synthese.dateValidation ? dateHeureFr(synthese.dateValidation) : NON_RENSEIGNE,
    },
    {
      type: 'champ',
      libelle: 'Rédaction',
      valeur: estRedactionPraticien(synthese.modele)
        ? 'Rédigée par le praticien'
        : "Préparée avec l'assistance d'une IA, relue et validée par le praticien",
    },
  );
  if (synthese.avertissementMesureRetiree) {
    blocs.push({ type: 'paragraphe', texte: synthese.avertissementMesureRetiree, ton: 'alerte' });
  }
  if (brouillonPlusRecent) {
    blocs.push(discret(
      `Une synthèse plus récente existe en brouillon (générée le ${dateFr(brouillonPlusRecent.dateGeneration)}) ; `
      + "elle n'est pas incluse car elle n'a pas été validée.",
    ));
  }

  const json = estObjet(synthese.syntheseJson) ? synthese.syntheseJson : {};
  const note = synthese.notesPraticien?.trim();

  blocs.push(
    { type: 'titre', niveau: 2, texte: 'Résumé praticien' },
    blocTexte(json.resume_praticien),
    { type: 'titre', niveau: 2, texte: 'Axes prioritaires' },
    ...blocsAxes(json.axes_prioritaires),
    { type: 'titre', niveau: 2, texte: 'Points de vigilance' },
    blocListe(json.points_de_vigilance),
    { type: 'titre', niveau: 2, texte: 'Questions pour la consultation' },
    blocListe(json.questions_entretien),
    { type: 'titre', niveau: 2, texte: 'Texte destiné au patient' },
    blocTexte(json.narratif_patient),
    { type: 'titre', niveau: 2, texte: 'Note du praticien' },
    note ? { type: 'paragraphe', texte: citer(note) } : discret('Aucune note.'),
    { type: 'titre', niveau: 2, texte: 'Limites' },
    blocTexte(json.limites, 'discret'),
  );

  return blocs;
}
