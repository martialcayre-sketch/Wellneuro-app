import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { createPublicId } from '@/lib/ids';
import { emailPraticien } from '@/lib/praticien/appartenance';
import { ECHELLES_NOMMEES, estEchelleNommee, type OptionCabinet } from '@/lib/echelles-cabinet';
import {
  normaliserDefinitionCabinet,
  normaliserScoringCabinet,
  scoringParDefaut,
  validerInstrumentCabinet,
  type DefinitionCabinet,
  type ScoringCabinet,
} from '@/lib/instruments';

// Import d'un instrument du cabinet — JSON (shape simple ou complète) ou CSV
// (une question par ligne). Le résultat entre TOUJOURS en brouillon : sans
// grille fournie, une bande unique « Grille à définir » est posée, et la
// relecture puis la publication restent obligatoires avant toute assignation.

export type ImportInstrumentResponse = {
  success: boolean;
  idInstrument?: string;
  nbQuestions?: number;
  avertissements?: string[];
  erreurs?: string[];
  error?: string;
  reason?: 'unauthenticated' | 'invalid_payload' | 'doublon_titre' | 'exception';
};

const AVERTISSEMENT_GRILLE_ABSENTE =
  'Grille de score absente : bande unique « Grille à définir — relecture requise » posée. La relecture reste obligatoire avant publication.';

function avertissementEchelle(nom: keyof typeof ECHELLES_NOMMEES): string {
  return `Échelle non précisée : « ${ECHELLES_NOMMEES[nom].libelle} » appliquée par défaut.`;
}

/** Sections à question unique par ligne : ids Q1..Qn générés. */
function definitionDepuisQuestions(
  instructions: string,
  questions: { texte: string; options: OptionCabinet[] }[],
): DefinitionCabinet {
  return normaliserDefinitionCabinet({
    ...(instructions ? { instructions } : {}),
    sections: [
      {
        id: 'S1',
        questions: questions.map((q, i) => ({
          id: `Q${i + 1}`,
          texte: q.texte,
          type: 'likert',
          options: q.options,
        })),
      },
    ],
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const emailSession = emailPraticien(session);
  if (!session || !emailSession) {
    return NextResponse.json<ImportInstrumentResponse>(
      { success: false, reason: 'unauthenticated', error: 'Session absente.' },
      { status: 401 },
    );
  }
  try {
    const body = (await request.json().catch(() => ({}))) as {
      format?: unknown;
      contenu?: unknown;
      titre?: unknown;
      categorie?: unknown;
      echelle?: unknown;
    };
    const format = body.format === 'json' || body.format === 'csv' ? body.format : null;
    const contenu = typeof body.contenu === 'string' ? body.contenu.slice(0, 200_000) : '';
    if (!format || contenu.trim().length === 0) {
      return NextResponse.json<ImportInstrumentResponse>(
        { success: false, reason: 'invalid_payload', error: 'Format ou contenu manquant.' },
        { status: 400 },
      );
    }
    const titreBody = typeof body.titre === 'string' ? body.titre.trim().slice(0, 200) : '';
    const categorieBody =
      typeof body.categorie === 'string' && body.categorie.trim().length > 0
        ? body.categorie.trim().slice(0, 60)
        : '';
    const echelleBody = estEchelleNommee(body.echelle) ? body.echelle : null;

    const avertissements: string[] = [];
    let titre = titreBody;
    let categorie = categorieBody || 'Cabinet';
    let definition: DefinitionCabinet;
    let scoring: ScoringCabinet;

    if (format === 'json') {
      let objet: Record<string, unknown>;
      try {
        const brut: unknown = JSON.parse(contenu);
        if (typeof brut !== 'object' || brut === null || Array.isArray(brut)) {
          throw new Error('objet attendu');
        }
        objet = brut as Record<string, unknown>;
      } catch {
        return NextResponse.json<ImportInstrumentResponse>(
          { success: false, reason: 'invalid_payload', error: 'JSON invalide : un objet est attendu.' },
          { status: 400 },
        );
      }
      if (typeof objet.titre === 'string' && objet.titre.trim().length > 0) {
        titre = objet.titre.trim().slice(0, 200);
      }
      if (typeof objet.categorie === 'string' && objet.categorie.trim().length > 0 && !categorieBody) {
        categorie = objet.categorie.trim().slice(0, 60);
      }

      if (objet.definition !== undefined) {
        // Shape complète { titre, definition, scoring? }.
        definition = normaliserDefinitionCabinet(objet.definition);
        if (objet.scoring !== undefined) {
          scoring = normaliserScoringCabinet(objet.scoring);
        } else {
          scoring = scoringParDefaut(definition);
          avertissements.push(AVERTISSEMENT_GRILLE_ABSENTE);
        }
      } else {
        // Shape simple { titre, instructions?, questions, echelle?, scoring? }.
        const lignes = Array.isArray(objet.questions) ? objet.questions : [];
        if (lignes.length === 0) {
          return NextResponse.json<ImportInstrumentResponse>(
            { success: false, reason: 'invalid_payload', error: 'Aucune question dans le JSON fourni.' },
            { status: 400 },
          );
        }
        const echelle = estEchelleNommee(objet.echelle) ? objet.echelle : echelleBody;
        let echelleAppliqueeParDefaut = false;
        const questions = lignes.map((ligne: unknown) => {
          const q = (ligne ?? {}) as { texte?: unknown; options?: unknown };
          const texte = typeof q.texte === 'string' ? q.texte.trim() : '';
          if (Array.isArray(q.options) && q.options.length > 0) {
            return { texte, options: q.options as OptionCabinet[] };
          }
          if (!echelle) echelleAppliqueeParDefaut = true;
          return { texte, options: ECHELLES_NOMMEES[echelle ?? 'frequence_0_4'].options };
        });
        if (echelleAppliqueeParDefaut) {
          avertissements.push(avertissementEchelle('frequence_0_4'));
        }
        const instructions = typeof objet.instructions === 'string' ? objet.instructions : '';
        definition = definitionDepuisQuestions(instructions, questions);
        if (objet.scoring !== undefined) {
          scoring = normaliserScoringCabinet(objet.scoring);
        } else {
          scoring = scoringParDefaut(definition);
          avertissements.push(AVERTISSEMENT_GRILLE_ABSENTE);
        }
      }
    } else {
      // CSV : première ligne d'en-tête `question` (ou `texte`), une question
      // par ligne ensuite. Titre et échelle arrivent par le corps de requête.
      const lignes = contenu
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => l.length > 0);
      const entete = (lignes[0] ?? '').replace(/^"|"$/g, '').trim().toLowerCase();
      if (entete !== 'question' && entete !== 'texte') {
        return NextResponse.json<ImportInstrumentResponse>(
          {
            success: false,
            reason: 'invalid_payload',
            error: 'CSV invalide : la première ligne doit être l’en-tête « question » (ou « texte »).',
          },
          { status: 400 },
        );
      }
      const textes = lignes.slice(1).map(l => l.replace(/^"|"$/g, '').trim());
      if (textes.length === 0) {
        return NextResponse.json<ImportInstrumentResponse>(
          { success: false, reason: 'invalid_payload', error: 'Aucune question dans le CSV fourni.' },
          { status: 400 },
        );
      }
      const echelle = echelleBody ?? 'frequence_0_4';
      if (!echelleBody) avertissements.push(avertissementEchelle('frequence_0_4'));
      const options = ECHELLES_NOMMEES[echelle].options;
      definition = definitionDepuisQuestions('', textes.map(texte => ({ texte, options })));
      scoring = scoringParDefaut(definition);
      avertissements.push(AVERTISSEMENT_GRILLE_ABSENTE);
    }

    const verdict = validerInstrumentCabinet({ titre, definition, scoring });
    if (!verdict.ok) {
      return NextResponse.json<ImportInstrumentResponse>(
        {
          success: false,
          reason: 'invalid_payload',
          error: 'Import invalide.',
          erreurs: verdict.erreurs,
        },
        { status: 400 },
      );
    }

    // Anti-doublon : même garde que la création — un import relancé par
    // erreur ne duplique pas l'instrument.
    const doublon = await prisma.cabinetInstrument.findFirst({
      where: {
        praticienEmail: { equals: emailSession, mode: 'insensitive' },
        actif: true,
        titre: { equals: titre, mode: 'insensitive' },
      },
      select: { idInstrument: true },
    });
    if (doublon) {
      return NextResponse.json<ImportInstrumentResponse>(
        {
          success: false,
          reason: 'doublon_titre',
          error: 'Un instrument actif du cabinet porte déjà ce titre.',
        },
        { status: 409 },
      );
    }

    const idInstrument = createPublicId('CAB');
    await prisma.cabinetInstrument.create({
      data: {
        idInstrument,
        praticienEmail: emailSession,
        titre,
        categorie,
        definitionJson: definition as unknown as Prisma.InputJsonValue,
        scoringJson: { ...scoring, maxTotal: verdict.scoreMax } as unknown as Prisma.InputJsonValue,
        statutRelecture: 'brouillon',
      },
    });
    return NextResponse.json<ImportInstrumentResponse>({
      success: true,
      idInstrument,
      nbQuestions: verdict.nbQuestions,
      avertissements,
    });
  } catch {
    return NextResponse.json<ImportInstrumentResponse>(
      { success: false, reason: 'exception', error: 'Erreur inattendue.' },
      { status: 500 },
    );
  }
}
