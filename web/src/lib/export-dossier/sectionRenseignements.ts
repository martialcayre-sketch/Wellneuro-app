// Export PDF du dossier patient (D-252) — section 2 : fiche signalétique et anamnèse.
//
// Restitution seule (DC-19, DC-20) : ordre et libellés viennent des
// descripteurs, jamais d'une copie. Ce que le patient a saisi librement est
// cité — une donnée, pas une consigne pour le LLM qui lira le PDF.

import {
  ANAMNESE_SECTIONS,
  type AnamneseGroupeRepetable,
  type AnamneseValeurs,
} from '@/lib/consultation/anamnese';
import { FICHE_SECTIONS } from '@/lib/consultation/fiche';
import { isMotifValide } from '@/lib/consultation/motifs';
import { formaterDatePeriode, formaterJour } from '@/lib/physio-traitements/dates';
import {
  BLOCS_PATIENT,
  CHAMPS_PATIENT,
  LIBELLES_CRITERE,
  LIBELLES_NATURE,
  LIBELLES_REPONSE,
  LIBELLES_SOURCE_PRATICIEN,
  UNITES,
  type Critere,
} from '@/lib/physio-traitements/liste';
import {
  citer,
  dateFr,
  NON_RENSEIGNE,
  type BlocExport,
  type ConsultationExport,
  type DonneePhysioExport,
  type DonneesDateesExport,
  type TraitementExport,
} from './modele';

const TITRE = '2. Fiche signalétique et anamnèse';

function champ(libelle: string, valeur: string): BlocExport {
  return { type: 'champ', libelle, valeur };
}

function discret(texte: string): BlocExport {
  return { type: 'paragraphe', texte, ton: 'discret' };
}

/** Titre de section en ton discret : jamais seul en bas de page. */
function intertitre(texte: string): BlocExport {
  return { type: 'paragraphe', texte, ton: 'discret', garderAvecSuite: true };
}

function libelleStatut(consultation: ConsultationExport): string {
  switch (consultation.statut) {
    case 'creee':
      return 'Créée';
    case 'en_cours':
      return 'En cours';
    case 'validee':
      return consultation.dateValidation
        ? `Validée le ${dateFr(consultation.dateValidation)}`
        : 'Validée';
    default:
      return consultation.statut.trim() || NON_RENSEIGNE;
  }
}

// Valeurs écrites par les routes du portail : 'non_donne' par défaut, 'donne' au recueil.
function libelleConsentement(consultation: ConsultationExport): string {
  switch (consultation.consentement) {
    case 'donne': {
      const date = consultation.consentementHorodatage
        ? ` le ${dateFr(consultation.consentementHorodatage)}`
        : '';
      const version = consultation.consentementVersion?.trim()
        ? ` (version ${consultation.consentementVersion.trim()})`
        : '';
      return `Donné${date}${version}`;
    }
    case 'non_donne':
      return 'Non donné';
    default:
      return consultation.consentement.trim() || NON_RENSEIGNE;
  }
}

function libelleMotif(motif: string | null): string {
  const texte = motif?.trim();
  if (!texte) return NON_RENSEIGNE;
  return isMotifValide(texte) ? texte : citer(texte);
}

type Descripteur = { type: string; options?: string[]; suffixe?: string };

const TYPES_CHOIX = new Set(['select', 'radio', 'checkbox-multi']);

// Une valeur hors des options proposées n'a pas été choisie mais écrite
// (`normaliserAnamnese` ne vérifie pas les options d'un radio) : elle se cite.
function rendreTexte(valeur: string, descripteur: Descripteur): string {
  const choisie = TYPES_CHOIX.has(descripteur.type) && descripteur.options?.includes(valeur);
  const rendue = choisie ? valeur : citer(valeur);
  return descripteur.suffixe ? `${rendue} ${descripteur.suffixe}` : rendue;
}

function rendreValeur(valeur: unknown, descripteur: Descripteur): string {
  if (typeof valeur === 'string') {
    const texte = valeur.trim();
    return texte ? rendreTexte(texte, descripteur) : NON_RENSEIGNE;
  }
  if (Array.isArray(valeur)) {
    const elements = valeur
      .filter((element): element is string => typeof element === 'string')
      .map(element => element.trim())
      .filter(Boolean);
    return elements.length
      ? elements.map(element => rendreTexte(element, descripteur)).join(' ; ')
      : NON_RENSEIGNE;
  }
  return NON_RENSEIGNE;
}

function blocsFiche(fiche: Record<string, string> | null): BlocExport[] {
  const blocs: BlocExport[] = [{ type: 'titre', niveau: 3, texte: 'Fiche signalétique' }];
  if (fiche === null) {
    blocs.push({ type: 'paragraphe', texte: 'Fiche signalétique non déposée.' });
    return blocs;
  }
  for (const section of FICHE_SECTIONS) {
    blocs.push(intertitre(section.titre));
    for (const c of section.champs) {
      blocs.push(champ(c.label, rendreValeur(fiche[c.id], c)));
    }
  }
  return blocs;
}

function entreeGroupe(entree: unknown, groupe: AnamneseGroupeRepetable): string | null {
  if (!entree || typeof entree !== 'object' || Array.isArray(entree)) return null;
  const valeurs = entree as Record<string, unknown>;
  const morceaux: string[] = [];
  for (const sousChamp of groupe.champs) {
    const valeur = valeurs[sousChamp.id];
    if (typeof valeur !== 'string' || !valeur.trim()) continue;
    morceaux.push(`${sousChamp.label} : ${citer(valeur.trim())}`);
  }
  return morceaux.length ? morceaux.join(' · ') : null;
}

function blocsGroupe(anamnese: AnamneseValeurs, groupe: AnamneseGroupeRepetable): BlocExport[] {
  const brut = anamnese[groupe.id];
  const elements = Array.isArray(brut)
    ? brut.map(entree => entreeGroupe(entree, groupe)).filter((e): e is string => e !== null)
    : [];
  if (!elements.length) return [champ(groupe.label, NON_RENSEIGNE)];
  return [
    { type: 'paragraphe', texte: `${groupe.label} :`, garderAvecSuite: true },
    { type: 'liste', elements },
  ];
}

function blocsAnamnese(anamnese: AnamneseValeurs | null): BlocExport[] {
  const blocs: BlocExport[] = [{ type: 'titre', niveau: 3, texte: 'Anamnèse' }];
  if (anamnese === null) {
    blocs.push({ type: 'paragraphe', texte: 'Anamnèse non déposée.' });
    return blocs;
  }
  for (const section of ANAMNESE_SECTIONS) {
    blocs.push(intertitre(section.titre));
    for (const c of section.champs ?? []) {
      blocs.push(champ(c.label, rendreValeur(anamnese[c.id], c)));
    }
    for (const groupe of section.groupes ?? []) {
      blocs.push(...blocsGroupe(anamnese, groupe));
    }
  }
  return blocs;
}

function blocsConsultation(consultation: ConsultationExport, porteuse: boolean): BlocExport[] {
  const blocs: BlocExport[] = [
    { type: 'titre', niveau: 2, texte: `Consultation du ${dateFr(consultation.createdAt)}` },
  ];
  if (porteuse) {
    blocs.push(discret("Consultation qui fait foi : c'est cette anamnèse que lit la synthèse."));
  }
  blocs.push(
    champ('Statut', libelleStatut(consultation)),
    champ('Motif de consultation', libelleMotif(consultation.motif)),
    champ('Consentement', libelleConsentement(consultation)),
  );
  const finalite = consultation.finaliteConsentement?.trim();
  if (finalite) blocs.push(champ('Finalité du consentement', finalite));
  return [...blocs, ...blocsFiche(consultation.ficheSignaletique), ...blocsAnamnese(consultation.anamnese)];
}

// ── Les lignes datées du dossier ([[D-391]] §2, [[D-335]] §2-§5) ──────────
// Seule la TÊTE de chaque fil : un retrait ramène le fil à « non renseigné »,
// il n'apparaît pas. « inconnu » est une réponse écrite, distincte de
// « Non renseigné » (DC-24). Aucun calcul (ni IMC, ni variation de poids).

const DATE_INCONNUE = 'date inconnue';

// Distinct de la section « Traitements et compléments » de l'anamnèse, qui suit
// dans le même document.
const TITRE_TRAITEMENTS = 'Traitements et compléments, en cours et arrêtés';

const LIGNES_DATEES =
  "Lignes datées, tenues à part de l'anamnèse : chacune dit sa date et sa source — déclarée par " +
  'le patient, ou confirmée par le praticien. Seule la ligne en vigueur figure ici. « Non renseigné » : ' +
  'aucune ligne en vigueur ; « inconnu » est une réponse donnée. Une date de traitement est écrite à la ' +
  'précision connue : un jour (12/05/2024), un mois (mai 2024), une année (2024), ou « date inconnue ».';

function source(ligne: { source: 'patient' | 'praticien'; acteLe: string }): string {
  return `${LIBELLES_SOURCE_PRATICIEN[ligne.source]} le ${dateFr(new Date(ligne.acteLe))}`;
}

/** Valeur fermée par les CHECK de la base : son libellé ; hors liste, citée telle quelle. */
function ferme(valeur: string | null): string {
  if (valeur === null) return NON_RENSEIGNE;
  // `hasOwn` : une clé héritée (`constructor`) n'est pas un libellé.
  return Object.hasOwn(LIBELLES_REPONSE, valeur) ? LIBELLES_REPONSE[valeur] : citer(valeur);
}

function valeurPhysio(critere: Critere, tete: DonneePhysioExport | null): string {
  if (tete === null) return NON_RENSEIGNE;
  if (tete.mesure !== null) {
    const unite = critere === 'poids' || critere === 'taille' ? ` ${UNITES[critere]}` : '';
    const le = tete.mesureLe ? `, mesuré le ${formaterJour(tete.mesureLe)}` : '';
    return `${tete.mesure.replace('.', ',')}${unite}${le} — ${source(tete)}`;
  }
  return `${ferme(tete.reponse)} — ${source(tete)}`;
}

function texteTraitement(t: TraitementExport): string {
  const nature = t.nature === 'complement' ? 'complement' : 'medicament';
  const libelleNature = t.nature === 'medicament' || t.nature === 'complement' ? LIBELLES_NATURE[t.nature] : 'Traitement';
  const morceaux = [`${libelleNature} : ${t.nom ? citer(t.nom) : NON_RENSEIGNE}`];
  if (t.dose) morceaux.push(`${CHAMPS_PATIENT.dose} : ${citer(t.dose)}`);
  if (t.moment) morceaux.push(`${CHAMPS_PATIENT.moment} : ${citer(t.moment)}`);
  if (t.motif) morceaux.push(`${BLOCS_PATIENT[nature].motif} : ${citer(t.motif)}`);
  morceaux.push(`Depuis : ${formaterDatePeriode(t.debut, t.debutPrecision, DATE_INCONNUE) || NON_RENSEIGNE}`);
  morceaux.push(
    t.finPrecision === null
      ? 'En cours'
      : `Arrêté : ${formaterDatePeriode(t.fin, t.finPrecision, DATE_INCONNUE)}`,
  );
  morceaux.push(`Prescrit par un autre soignant : ${ferme(t.prescritParTiers)}`);
  return `${morceaux.join(' · ')} — ${source(t)}`;
}

function blocsDonneesDatees(donnees: DonneesDateesExport): BlocExport[] {
  const blocs: BlocExport[] = [
    { type: 'titre', niveau: 2, texte: 'Données physiologiques et traitements du dossier' },
    discret(LIGNES_DATEES),
    { type: 'titre', niveau: 3, texte: 'Données physiologiques' },
    ...donnees.criteres.map(c => champ(LIBELLES_CRITERE[c.critere], valeurPhysio(c.critere, c.tete))),
  ];
  // Sans traitement, le champ seul : pas un titre suivi du même libellé.
  if (!donnees.traitements.length) {
    blocs.push(champ(TITRE_TRAITEMENTS, NON_RENSEIGNE));
  } else {
    blocs.push(
      { type: 'titre', niveau: 3, texte: TITRE_TRAITEMENTS },
      { type: 'liste', elements: donnees.traitements.map(texteTraitement) },
    );
  }
  return blocs;
}

/**
 * Consultations reçues déjà triées, la plus récente d'abord : l'ordre est celui
 * de l'appelant. Les lignes datées du dossier ouvrent la section ; sans aucune
 * ligne (`null`), la section est celle d'avant [[D-391]].
 */
export function sectionRenseignements(
  consultations: ConsultationExport[],
  idConsultationPorteuse: string | null,
  donneesDatees: DonneesDateesExport | null = null,
): BlocExport[] {
  const blocs: BlocExport[] = [{ type: 'titre', niveau: 1, texte: TITRE }];
  if (donneesDatees) blocs.push(...blocsDonneesDatees(donneesDatees));
  if (!consultations.length) {
    blocs.push({
      type: 'paragraphe',
      texte: "Aucune fiche signalétique ni anamnèse n'a été déposée par le patient.",
    });
    return blocs;
  }
  for (const consultation of consultations) {
    blocs.push(
      ...blocsConsultation(
        consultation,
        idConsultationPorteuse !== null && consultation.idConsultation === idConsultationPorteuse,
      ),
    );
  }
  return blocs;
}
