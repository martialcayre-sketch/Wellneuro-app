import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { type SyntheseSchema, maskEmail, sanitizeAuditError } from '@/lib/anthropic';

// GET /api/praticien/booklet?idSynthese=SYN...
// Génère et retourne le HTML du booklet (prévisualisation praticien)
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const idSynthese = (searchParams.get('idSynthese') ?? '').trim();

  if (!idSynthese) return NextResponse.json({ error: 'idSynthese requis.' }, { status: 400 });

  try {
    const synthese = await prisma.syntheseIA.findUnique({
      where: { idSynthese },
      include: { bookletEnvois: { orderBy: { dateEnvoi: 'desc' }, take: 1 } },
    });

    if (!synthese) return NextResponse.json({ error: 'Synthèse introuvable.' }, { status: 404 });

    if (synthese.statut !== 'Validee_Praticien' && synthese.statut !== 'Corrigee_Praticien') {
      return NextResponse.json(
        { error: 'La synthèse doit être validée par le praticien avant de préparer le booklet.' },
        { status: 422 }
      );
    }

    const patient = await prisma.patient.findUnique({ where: { idPatient: synthese.idPatient } });
    const patientNom = patient ? `${patient.prenom} ${patient.nom}` : '';
    const dateDocument = (synthese.dateValidation ?? synthese.dateGeneration)
      .toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

    const syntheseData = synthese.syntheseJson as unknown as SyntheseSchema;
    const html = buildBookletHTML(patientNom, dateDocument, syntheseData, synthese.notesPraticien ?? '');

    const dernierEnvoi = synthese.bookletEnvois[0];

    return NextResponse.json({
      html,
      patientNom,
      patientEmail: synthese.emailPatient,
      idPatient: synthese.idPatient,
      dateDocument,
      dejaEnvoye: !!dernierEnvoi,
      dernierEnvoiDate: dernierEnvoi?.dateEnvoi?.toISOString() ?? null,
      dernierEnvoiEmailMasque: dernierEnvoi ? maskEmail(synthese.emailPatient) : null,
    });
  } catch (err) {
    console.error('[booklet GET] Exception:', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: 'Erreur technique.' }, { status: 500 });
  }
}

// POST /api/praticien/booklet/send
// Envoie le booklet par email au patient (confirmation relecture obligatoire)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });

  type SendBody = { idSynthese?: string; relectureConfirmee?: boolean; forceSend?: boolean };
  let body: SendBody;
  try {
    body = (await req.json()) as SendBody;
  } catch {
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
  }

  const idSynthese = (body.idSynthese ?? '').trim();
  const relectureConfirmee = body.relectureConfirmee === true;
  const forceSend = body.forceSend === true;

  if (!idSynthese) return NextResponse.json({ error: 'idSynthese requis.' }, { status: 400 });

  if (!relectureConfirmee) {
    await logBookletEnvoi(idSynthese, '', '', 'Erreur', 'Blocage_Relecture', false,
      'Relecture praticien non confirmée.');
    return NextResponse.json(
      { error: 'La relecture praticien doit être confirmée avant l\'envoi patient.' },
      { status: 422 }
    );
  }

  try {
    const synthese = await prisma.syntheseIA.findUnique({
      where: { idSynthese },
      include: { bookletEnvois: { orderBy: { dateEnvoi: 'desc' }, take: 1 } },
    });

    if (!synthese) return NextResponse.json({ error: 'Synthèse introuvable.' }, { status: 404 });

    if (synthese.statut !== 'Validee_Praticien' && synthese.statut !== 'Corrigee_Praticien') {
      await logBookletEnvoi(idSynthese, synthese.idPatient, synthese.emailPatient,
        'Erreur', 'Preparation', relectureConfirmee, 'Synthèse non validée.');
      return NextResponse.json(
        { error: 'La synthèse doit être validée avant l\'envoi.' },
        { status: 422 }
      );
    }

    if (!forceSend && synthese.bookletEnvois.length > 0) {
      await logBookletEnvoi(idSynthese, synthese.idPatient, synthese.emailPatient,
        'Confirmation_Requise', 'Renvoi', relectureConfirmee, 'Booklet déjà envoyé.');
      return NextResponse.json({
        needsConfirmation: true,
        warning: 'Ce booklet a déjà été envoyé. Ajoutez forceSend: true pour confirmer le renvoi.',
        emailMasque: maskEmail(synthese.emailPatient),
      });
    }

    const patient = await prisma.patient.findUnique({ where: { idPatient: synthese.idPatient } });
    const patientNom = patient ? `${patient.prenom} ${patient.nom}` : '';
    const dateDocument = (synthese.dateValidation ?? synthese.dateGeneration)
      .toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

    const syntheseData = synthese.syntheseJson as unknown as SyntheseSchema;
    const html = buildBookletHTML(patientNom, dateDocument, syntheseData, synthese.notesPraticien ?? '');

    // Envoi email via nodemailer (SMTP via compte noreply@wellneuro.fr)
    const smtpUrl = process.env.SMTP_URL;
    if (!smtpUrl) {
      await logBookletEnvoi(idSynthese, synthese.idPatient, synthese.emailPatient,
        'Erreur', forceSend ? 'Renvoi' : 'Envoi', relectureConfirmee, 'SMTP_URL non configurée.');
      return NextResponse.json(
        { error: 'SMTP_URL absente dans .env.local. Configurez l\'envoi email avant d\'envoyer le booklet.' },
        { status: 503 }
      );
    }

    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport(smtpUrl);

    await transporter.sendMail({
      from: '"Wellneuro" <noreply@wellneuro.fr>',
      to: synthese.emailPatient,
      subject: 'Votre bilan neuronutritionnel validé — Wellneuro',
      text: 'Bonjour,\n\nVotre praticien vous transmet votre bilan neuronutritionnel Wellneuro.\nCe document a été préparé après validation humaine et ne constitue pas un diagnostic médical.\n\nBien cordialement,\nL\'équipe Wellneuro',
      html,
    });

    await logBookletEnvoi(idSynthese, synthese.idPatient, synthese.emailPatient,
      'Envoye', forceSend ? 'Renvoi' : 'Envoi', relectureConfirmee, '');

    return NextResponse.json({ success: true, emailMasque: maskEmail(synthese.emailPatient) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[booklet POST] Exception:', sanitizeAuditError(msg));
    return NextResponse.json({ error: 'Erreur lors de l\'envoi. Vérifiez le terminal Next.js.' }, { status: 500 });
  }
}

async function logBookletEnvoi(
  idSynthese: string, idPatient: string, emailPatient: string,
  statut: string, operation: string, relectureConfirmee: boolean, erreur: string
) {
  try {
    await prisma.bookletEnvoi.create({
      data: {
        idSynthese,
        idPatient,
        emailPatientMasque: emailPatient ? maskEmail(emailPatient) : '[inconnu]',
        statut,
        operation,
        relectureConfirmee,
        erreurCourte: erreur ? sanitizeAuditError(erreur) : undefined,
      },
    });
  } catch { /* audit non bloquant */ }
}

function buildBookletHTML(patientNom: string, dateDocument: string, s: SyntheseSchema, notesPraticien: string): string {
  const axesPrioritaires = (s.axes_prioritaires ?? []).slice(0, 3);
  const couleurPriorite: Record<string, string> = {
    eleve: '#dc2626',
    modere: '#d97706',
    faible: '#16a34a',
  };

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bilan neuronutritionnel — ${patientNom}</title>
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
      ${patientNom ? `<strong>${patientNom}</strong> &nbsp;·&nbsp; ` : ''}
      Document du ${dateDocument} &nbsp;·&nbsp;
      Validé par votre praticien
    </div>
  </div>

  <h2>Ce que vos réponses suggèrent</h2>
  <div class="narratif">${s.narratif_patient || 'Synthèse à compléter par votre praticien.'}</div>

  ${axesPrioritaires.length > 0 ? `
  <h2>Profil neuronutritionnel — axes prioritaires</h2>
  ${axesPrioritaires.map(axe => `
  <div class="axe">
    <div class="axe-header">
      <h3 style="margin:0">${axe.axe}</h3>
      <span class="prio-badge" style="background:${couleurPriorite[axe.niveau_priorite] ?? '#6b7280'}">
        ${axe.niveau_priorite === 'eleve' ? 'Priorité élevée' : axe.niveau_priorite === 'modere' ? 'Priorité modérée' : 'Priorité faible'}
      </span>
    </div>
    ${axe.arguments?.length ? `<ul>${axe.arguments.map(a => `<li>${a}</li>`).join('')}</ul>` : ''}
    ${axe.points_a_confirmer?.length ? `<p style="font-size:13px;color:#555;margin:10px 0 0"><em>À confirmer : ${axe.points_a_confirmer.join(' — ')}</em></p>` : ''}
  </div>`).join('')}` : ''}

  ${s.points_de_vigilance?.length ? `
  <h2>Points de vigilance</h2>
  <div class="vigilance">
    <ul>${s.points_de_vigilance.map(p => `<li>${p}</li>`).join('')}</ul>
  </div>` : ''}

  ${s.questions_entretien?.length ? `
  <h2>Questions pour la consultation</h2>
  <div class="questions">
    <ul>${s.questions_entretien.map(q => `<li>${q}</li>`).join('')}</ul>
  </div>` : ''}

  ${notesPraticien ? `
  <h2>Note de votre praticien</h2>
  <div class="notes-praticien">${notesPraticien}</div>` : ''}

  <div class="footer">
    Document généré après validation par votre praticien.<br>
    Ce bilan ne constitue pas un diagnostic médical.<br>
    wellneuro.fr &nbsp;·&nbsp; ${dateDocument}
  </div>
</div>
</body>
</html>`;
}
