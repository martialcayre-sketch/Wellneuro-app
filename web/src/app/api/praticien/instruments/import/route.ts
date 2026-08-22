import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { createPublicId } from '@/lib/ids';
import { emailPraticien } from '@/lib/praticien/appartenance';
import {
  ECHELLES_NOMMEES,
  estEchelleNommee,
  interditTouteBande,
  type OptionCabinet,
} from '@/lib/echelles-cabinet';
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
//
// UNE famille échappe à cette bande d'attente, et à toute bande : celle qui se
// déclare `sum_no_interpretation` (`D-088`) — un instrument de pilotage, sans
// provenance clinique et sans verdict. C'est par ici qu'une EVA entre : shape
// complète, items `number` bornés, `scoring: { type: 'sum_no_interpretation' }`.

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

/**
 * Saisie chiffrée sans grille déclarée — refus DÉDIÉ (`D-088`).
 *
 * Sans lui, ce cas tombait dans l'amorce par défaut (famille `sum`, donc
 * interprétée) et ressortait avec les messages de CETTE famille : « seul
 * “likert” est admis », « entre 2 et 8 options ». Deux reproches exacts, et
 * aucun des deux ne dit le geste qui débloque — le praticien lit qu'il doit
 * transformer son curseur en échelle à options, alors qu'il doit déclarer sa
 * famille. La famille ne se devine pas depuis la définition (un instrument à
 * items `number` n'est pas *forcément* sans interprétation) : elle se déclare.
 *
 * Fail-closed inchangé : c'était un 400 avant, c'est un 400 maintenant. Seul
 * le message change.
 */
const ERREUR_SAISIE_CHIFFREE_SANS_GRILLE =
  'Saisie chiffrée sans grille déclarée : un item « number » n’est admis que dans la famille sans interprétation. Déclarez scoring: { "type": "sum_no_interpretation" } — aucune bande n’y est admise, l’instrument pilote la conversation sans classer.';

/** Vrai dès qu'un item de la définition est une saisie chiffrée. */
function porteUneSaisieChiffree(definition: DefinitionCabinet): boolean {
  return definition.sections.some(section =>
    section.questions.some(question => question.type === 'number'),
  );
}

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
    // Le refus dédié ci-dessous ne vaut que sur une grille ABSENTE : un
    // `scoring: { type: 'sum' }` déclaré avec des items `number` est une
    // contradiction du praticien, et mérite le message qui la nomme
    // (« seul “likert” est admis »), pas celui qui suppose un oubli.
    let grilleDeclaree = false;

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
          // La grille déclarée passe TELLE QUELLE à la validation, bandes
          // comprises : c'est elle qui refuse une bande sur la famille sans
          // interprétation (`D-088`). Les effacer ici les ferait passer en
          // silence.
          scoring = normaliserScoringCabinet(objet.scoring);
          grilleDeclaree = true;
        } else {
          scoring = scoringParDefaut(definition);
          // L'avertissement suit la bande d'attente ; il ne s'annonce pas tout
          // seul. `scoringParDefaut` n'en pose aucune sur la famille sans
          // interprétation — garde `interditTouteBande`.
          if (!interditTouteBande(scoring)) avertissements.push(AVERTISSEMENT_GRILLE_ABSENTE);
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
          // La grille déclarée passe TELLE QUELLE à la validation, bandes
          // comprises : c'est elle qui refuse une bande sur la famille sans
          // interprétation (`D-088`). Les effacer ici les ferait passer en
          // silence.
          scoring = normaliserScoringCabinet(objet.scoring);
          grilleDeclaree = true;
        } else {
          scoring = scoringParDefaut(definition);
          // L'avertissement suit la bande d'attente ; il ne s'annonce pas tout
          // seul. `scoringParDefaut` n'en pose aucune sur la famille sans
          // interprétation — garde `interditTouteBande`.
          if (!interditTouteBande(scoring)) avertissements.push(AVERTISSEMENT_GRILLE_ABSENTE);
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
      if (!interditTouteBande(scoring)) avertissements.push(AVERTISSEMENT_GRILLE_ABSENTE);
    }

    // AVANT la validation générale, et seulement pour lui donner un message
    // utilisable : le verdict serait le même (400), mais rédigé depuis la
    // famille par défaut, donc à côté du geste attendu.
    if (!grilleDeclaree && porteUneSaisieChiffree(definition)) {
      return NextResponse.json<ImportInstrumentResponse>(
        {
          success: false,
          reason: 'invalid_payload',
          error: ERREUR_SAISIE_CHIFFREE_SANS_GRILLE,
          erreurs: [ERREUR_SAISIE_CHIFFREE_SANS_GRILLE],
        },
        { status: 400 },
      );
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
