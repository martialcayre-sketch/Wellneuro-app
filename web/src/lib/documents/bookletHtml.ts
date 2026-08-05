import { type SyntheseSchema } from '@/lib/anthropic';
import { escapeHtml } from '@/lib/html';
import { mentionPreparation as construireMentionPreparation } from '@/lib/documents/bilanPatient';

// Rendu HTML du booklet patient (extrait verbatim de
// `app/api/praticien/booklet/route.ts` — C3 LOT-03, principe « auditer avant de
// créer, ne pas empiler »). Fonction PURE, sans I/O. Sert de patron de référence
// au rendu C3 par destinataire (`documents/rendu.ts`).
//
// CE DOCUMENT PART PAR E-MAIL AU PATIENT. Il ne rend donc RIEN de ce que le
// field-filter de `depuisSynthese.ts` réserve au praticien et au médecin —
// TROIS blocs, pas deux :
//
//   axes prioritaires        « praticien (détaillé) + médecin ; jamais patient »
//   points de vigilance      « praticien + médecin ; jamais patient »
//   questions d'entretien    « praticien uniquement »
//
// Le booklet contournait ce filtre en lisant `syntheseJson` directement.
//
// Ce n'était pas une question de ton. `extraireVigilanceDeterministe`
// (lib/consultation/contexteClinique.ts) préfixe les points de vigilance des
// signaux d'alerte déclarés par le patient — « Idées noires ou suicidaires » en
// fait partie — suivis de « avis médical à évaluer en priorité ». Un patient
// pouvait recevoir cette phrase seul dans sa boîte mail, sans accompagnement.
//
// LE BLOC AXES ÉTAIT LA MÊME FUITE SOUS UN AUTRE NOM DE CHAMP, et c'est une
// revue adversariale qui l'a vue : `axe.arguments` porte les libellés
// d'interprétation destinés au praticien (contrat JSON : « Score X élevé »,
// « Interprétation Y ») et `axe.points_a_confirmer` porte, littéralement,
// « Question à poser en entretien ». Retirer `questions_entretien` en laissant
// ce champ-là revenait à déplacer la fuite, pas à la fermer.
//
// Ce que le patient reçoit désormais : le narratif qui lui est destiné, et la
// note que son praticien a écrite pour lui. Rétablir un profil par axes est une
// DÉCISION PRODUIT — elle suppose des libellés écrits pour le patient, et une
// mise à jour du field-filter qui fasse foi.
//
// Garde opposable : `bookletHtml.test.ts` échoue si l'un des trois blocs
// reparaît, y compris avec un signal d'alerte ou une question d'entretien en
// contenu.
export function buildBookletHTML(
  patientNom: string,
  dateDocument: string,
  s: SyntheseSchema,
  notesPraticien: string,
  options: { assistanceIA?: boolean } = {},
): string {
  const patientNomHtml = escapeHtml(patientNom);
  const dateDocumentHtml = escapeHtml(dateDocument);
  const narratifHtml = escapeHtml(s.narratif_patient || 'Synthèse à compléter par votre praticien.');
  const notesPraticienHtml = escapeHtml(notesPraticien);
  // Phrase partagée avec la page « Mon bilan » du portail (`bilanPatient.ts`) :
  // le même document ne peut pas s'attribuer différemment selon la surface.
  const mentionPreparation = construireMentionPreparation(options.assistanceIA !== false);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bilan neuronutritionnel — ${patientNomHtml}</title>
<style>
  body { font-family: Georgia, serif; color: #1a1a2e; background: #fff; margin: 0; padding: 0; }
  .page { max-width: 780px; margin: 0 auto; padding: 40px 48px; }
  .header { border-bottom: 3px solid #2d6a4f; padding-bottom: 24px; margin-bottom: 32px; }
  .brand { font-size: 22px; font-weight: bold; color: #2d6a4f; letter-spacing: 1px; }
  .title { font-size: 28px; font-weight: bold; color: #1a1a2e; margin: 8px 0 4px; }
  .meta { font-size: 14px; color: #555; }
  h2 { font-size: 18px; color: #2d6a4f; border-left: 4px solid #2d6a4f; padding-left: 12px; margin-top: 36px; }
  h3 { font-size: 15px; color: #1a1a2e; margin-bottom: 6px; }
  .narratif { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px 24px; font-size: 15px; line-height: 1.7; color: #166534; }
  .notes-praticien { background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 16px 20px; font-style: italic; }
  .footer { border-top: 1px solid #e5e7eb; margin-top: 48px; padding-top: 20px; font-size: 12px; color: #9ca3af; text-align: center; line-height: 1.6; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="brand">WELLNEURO</div>
    <div class="title">Bilan neuronutritionnel</div>
    <div class="meta">
      ${patientNom ? `<strong>${patientNomHtml}</strong> &nbsp;·&nbsp; ` : ''}
      Document du ${dateDocumentHtml} &nbsp;·&nbsp;
      Validé par votre praticien
    </div>
  </div>

  <h2>Ce que vos réponses suggèrent</h2>
  <div class="narratif">${narratifHtml}</div>

  <!-- Axes prioritaires, vigilance et questions d'entretien : voir la note en
       tête de fichier. Les trois sont réservés au praticien et au médecin. -->

  ${notesPraticien ? `
  <h2>Note de votre praticien</h2>
  <div class="notes-praticien">${notesPraticienHtml}</div>` : ''}

  <div class="footer">
    ${mentionPreparation}<br>
    Ce bilan ne constitue pas un diagnostic médical.<br>
    wellneuro.fr &nbsp;·&nbsp; ${dateDocumentHtml}
  </div>
</div>
</body>
</html>`;
}
