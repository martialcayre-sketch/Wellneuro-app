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
import {
  citer,
  dateFr,
  NON_RENSEIGNE,
  type BlocExport,
  type ConsultationExport,
} from './modele';

const TITRE = '2. Fiche signalétique et anamnèse';

function champ(libelle: string, valeur: string): BlocExport {
  return { type: 'champ', libelle, valeur };
}

function discret(texte: string): BlocExport {
  return { type: 'paragraphe', texte, ton: 'discret' };
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
    blocs.push(discret(section.titre));
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
    { type: 'paragraphe', texte: `${groupe.label} :` },
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
    blocs.push(discret(section.titre));
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

/** Consultations reçues déjà triées, la plus récente d'abord : l'ordre est celui de l'appelant. */
export function sectionRenseignements(
  consultations: ConsultationExport[],
  idConsultationPorteuse: string | null,
): BlocExport[] {
  const blocs: BlocExport[] = [{ type: 'titre', niveau: 1, texte: TITRE }];
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
