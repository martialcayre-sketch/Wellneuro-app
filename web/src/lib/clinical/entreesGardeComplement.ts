import type { Prisma } from '@/generated/prisma';
import type { prisma } from '@/lib/prisma';
import type { ProtocolAction } from '@/lib/clinical-engine/types';
import { whereConsultationPorteuse } from '@/lib/consultation/consultationPorteuse';
import { lireEtatPopulation } from '@/lib/consultation/etatPopulation';
import { statutAge } from '@/lib/patient/gardeAge';
import { lireDonneesDuDossier, type LignePhysioLue } from '@/lib/physio-traitements/lecture';
import { verdictPartageMedecin } from '@/lib/trust/consentementPartage';
import type { CritereEtat, DeclarationEtat, EntreeGardeComplement } from './gardeComplementCible';

// LES ENTRÉES DE LA GARDE DU COMPLÉMENT CIBLÉ, LUES DANS LE DOSSIER —
// [[D-345]] §3 et §6, J3-12h, lot 3. L'appelant du clic et la route du courrier
// passent ce que ce module rend à `courrierComplementRequis`, SANS table ni
// signature : la garde prend ses valeurs signées par défaut (reste du lot 1,
// revue CodeRabbit de #1662 — un appelant ne doit pas pouvoir injecter une
// table non relue).
//
// CE QUI EST LU, ET RIEN D'AUTRE :
//
// - L'ÂGE : `statutAge` sur la date de naissance du dossier, à l'instant posé
//   par l'appelant. Absente ou illisible : « date requise » (Q5).
// - LA FICHE PHYSIOLOGIQUE ([[D-335]]) : pour grossesse et allaitement, la
//   TÊTE de fil seule — la ligne en vigueur. Un fil clos par un retrait n'en a
//   pas : aucune déclaration, l'état est à établir. La date est `acteLe`, posée
//   par la base.
// - L'ANAMNÈSE : chaque consultation ENVOYÉE qui en porte une (la condition de
//   `whereConsultationPorteuse`, [[D-101]]), datée par son envoi
//   (`dateValidation`, posée par `api/portail/valider`). Sans date d'envoi, la
//   déclaration est NON DATÉE : un « oui » non daté déclenche et ne se lève
//   jamais (la garde le lit le plus récent). TOUTES les anamnèses envoyées, pas
//   la porteuse seule : un « oui » d'une anamnèse ancienne n'est levé que par
//   un « non » du praticien postérieur — jamais par une anamnèse plus récente
//   qui dirait « non » (seul le praticien lève, D-345 §3). Un brouillon non
//   envoyé n'est pas une déclaration.
// - L'ACCORD de partage avec le médecin traitant, régime fermé ([[D-345]] §6) :
//   le motif de `verdictPartageMedecin`, relu à chaque appel.
//
// Aucune inférence par le sexe déclaré, un score ou un texte libre.

type Client = Prisma.TransactionClient | typeof prisma;

const CRITERES: readonly CritereEtat[] = ['grossesse', 'allaitement'];
const REPONSES = new Set(['oui', 'non', 'inconnu']);

function declarationPhysio(critere: CritereEtat, tete: LignePhysioLue | null): DeclarationEtat[] {
  if (tete === null || tete.acte !== 'pose') return [];
  // Une réponse hors liste fermée se lit « inconnu » : elle ne lève ni ne déclenche.
  const reponse = tete.reponse !== null && REPONSES.has(tete.reponse)
    ? tete.reponse as DeclarationEtat['reponse']
    : 'inconnu';
  return [{ critere, reponse, source: tete.source, le: tete.acteLe }];
}

/** Les déclarations EN VIGUEUR de grossesse et d'allaitement du dossier. */
export async function lireDeclarationsEtat(client: Client, idPatient: string): Promise<DeclarationEtat[]> {
  const [donnees, consultations] = await Promise.all([
    lireDonneesDuDossier(client, idPatient),
    client.consultation.findMany({
      where: whereConsultationPorteuse(idPatient),
      select: { anamnese: true, dateValidation: true },
    }),
  ]);
  const declarations: DeclarationEtat[] = [];
  for (const critere of CRITERES) {
    const lu = donnees.criteres.find(ligne => ligne.critere === critere);
    declarations.push(...declarationPhysio(critere, lu?.tete ?? null));
  }
  for (const consultation of consultations) {
    const etat = lireEtatPopulation(consultation.anamnese);
    const le = consultation.dateValidation ? consultation.dateValidation.toISOString() : null;
    for (const critere of CRITERES) {
      declarations.push({ critere, reponse: etat[critere], source: 'anamnese', le });
    }
  }
  return declarations;
}

export async function lireEntreesGardeComplement(
  client: Client,
  idPatient: string,
  actions: readonly ProtocolAction[],
  maintenantMs: number,
): Promise<EntreeGardeComplement | null> {
  const patient = await client.patient.findUnique({
    where: { idPatient },
    select: { dateNaissance: true },
  });
  if (!patient) return null;
  const [declarations, choix] = await Promise.all([
    lireDeclarationsEtat(client, idPatient),
    client.trustChoiceEvent.findMany({
      where: { idPatient, finalite: 'partage_medecin_traitant' },
      select: { finalite: true, statut: true, enregistreLe: true },
    }),
  ]);
  return {
    actions,
    statutAge: statutAge(patient.dateNaissance, maintenantMs),
    declarations,
    accordPartage: verdictPartageMedecin(choix).motif,
  };
}
