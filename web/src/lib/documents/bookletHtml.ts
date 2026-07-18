import { type SyntheseSchema } from '@/lib/anthropic';
import { escapeHtml } from '@/lib/html';

// Rendu HTML du booklet patient (extrait verbatim de
// `app/api/praticien/booklet/route.ts` — C3 LOT-03, principe « auditer avant de
// créer, ne pas empiler »). Fonction PURE, sans I/O : comportement inchangé, la
// route l'importe désormais au lieu de la redéfinir. Sert de patron de référence
// au rendu C3 par destinataire (`documents/rendu.ts`).
export function buildBookletHTML(
  patientNom: string,
  dateDocument: string,
  s: SyntheseSchema,
  notesPraticien: string,
): string {
  const axesPrioritaires = (s.axes_prioritaires ?? []).slice(0, 3);
  const couleurPriorite: Record<string, string> = {
    eleve: '#dc2626',
    modere: '#d97706',
    faible: '#16a34a',
  };
  const patientNomHtml = escapeHtml(patientNom);
  const dateDocumentHtml = escapeHtml(dateDocument);
  const narratifHtml = escapeHtml(s.narratif_patient || 'Synthèse à compléter par votre praticien.');
  const notesPraticienHtml = escapeHtml(notesPraticien);

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
  .axe { background: #fafafa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px 20px; margin-bottom: 16px; }
  .axe-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
  .prio-badge { font-size: 11px; font-weight: bold; padding: 3px 10px; border-radius: 12px; color: #fff; }
  ul { margin: 6px 0 0; padding-left: 20px; }
  li { margin-bottom: 4px; font-size: 14px; line-height: 1.6; }
  .vigilance { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px 20px; }
  .questions { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px 20px; }
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

  ${axesPrioritaires.length > 0 ? `
  <h2>Profil neuronutritionnel — axes prioritaires</h2>
  ${axesPrioritaires.map(axe => `
  <div class="axe">
    <div class="axe-header">
      <h3 style="margin:0">${escapeHtml(axe.axe)}</h3>
      <span class="prio-badge" style="background:${couleurPriorite[axe.niveau_priorite] ?? '#6b7280'}">
        ${axe.niveau_priorite === 'eleve' ? 'Priorité élevée' : axe.niveau_priorite === 'modere' ? 'Priorité modérée' : 'Priorité faible'}
      </span>
    </div>
    ${axe.arguments?.length ? `<ul>${axe.arguments.map(a => `<li>${escapeHtml(a)}</li>`).join('')}</ul>` : ''}
    ${axe.points_a_confirmer?.length ? `<p style="font-size:13px;color:#555;margin:10px 0 0"><em>À confirmer : ${axe.points_a_confirmer.map(escapeHtml).join(' — ')}</em></p>` : ''}
  </div>`).join('')}` : ''}

  ${s.points_de_vigilance?.length ? `
  <h2>Points de vigilance</h2>
  <div class="vigilance">
    <ul>${s.points_de_vigilance.map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ul>
  </div>` : ''}

  ${s.questions_entretien?.length ? `
  <h2>Questions pour la consultation</h2>
  <div class="questions">
    <ul>${s.questions_entretien.map(q => `<li>${escapeHtml(q)}</li>`).join('')}</ul>
  </div>` : ''}

  ${notesPraticien ? `
  <h2>Note de votre praticien</h2>
  <div class="notes-praticien">${notesPraticienHtml}</div>` : ''}

  <div class="footer">
    Document préparé avec une assistance d’intelligence artificielle et validé par votre praticien.<br>
    Ce bilan ne constitue pas un diagnostic médical.<br>
    wellneuro.fr &nbsp;·&nbsp; ${dateDocumentHtml}
  </div>
</div>
</body>
</html>`;
}
