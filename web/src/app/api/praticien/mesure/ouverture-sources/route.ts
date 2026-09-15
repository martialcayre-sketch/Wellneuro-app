import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { estEspeceMesuree, jourDeMesure } from '@/lib/mesure/ouvertureSources';

// POST /api/praticien/mesure/ouverture-sources — incrémente d'UN le compteur du
// jour pour l'espèce reçue.
//
// CE QUE CETTE ROUTE N'ÉCRIT PAS, ET C'EST L'ESSENTIEL. Ni le dossier, ni le
// praticien, ni l'instant. La session est exigée pour que le compteur ne
// s'alimente pas depuis l'extérieur, puis son identité est JETÉE : elle ne
// traverse pas cette fonction. « Ce praticien n'ouvre jamais les limitations »
// doit rester une phrase que le dépôt est incapable de produire, et ce n'est pas
// une intention, c'est la forme de la table (`compteur_ouverture_sources`).
//
// ELLE ÉCHOUE EN SILENCE POUR L'APPELANT ([[D-146]], fail-open). Une mesure qui
// empêcherait de lire les sources et limites d'une décision clinique serait un
// renversement complet : la surface d'explicabilité passe avant sa mesure. Le
// composant n'attend pas la réponse et ne l'affiche jamais ; ce qui est rendu
// ici ne sert qu'aux bancs et aux journaux.

export type MesureOuvertureApiResponse =
  | { ok: true; espece: string }
  | { ok: false; reason: string; error: string };

type PostBody = { espece?: unknown };

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<MesureOuvertureApiResponse>({ ok: false, reason, error }, { status });
}

export async function POST(req: Request): Promise<NextResponse<MesureOuvertureApiResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return echec('unauthenticated', 'Authentification requise.', 401);

    let body: PostBody;
    try {
      body = (await req.json()) as PostBody;
    } catch {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }

    // LA LISTE ÉTROITE EST TENUE ICI AUSSI, pas seulement par le `CHECK` de la
    // base. Sans ce contrôle, une espèce forgée ferait remonter un 23514 de
    // Postgres — donc un 500 — pour une situation parfaitement identifiable.
    if (!estEspeceMesuree(body.espece)) {
      return echec('espece_inconnue', 'Espèce mesurée inconnue.', 400);
    }
    const espece = body.espece;

    // L'INSTANT EST POSÉ PAR LE SERVEUR, jamais par l'appelant : une date reçue
    // laisserait remplir le passé, et un compteur qu'on peut antidater ne mesure
    // plus rien. Même discipline que `RelectureNote.creeLe`.
    const jour = jourDeMesure(new Date());

    // UN SEUL ALLER-RETOUR, ET ATOMIQUE. Un `findUnique` suivi d'un `update`
    // perdrait des incréments dès deux praticiens simultanés — un compteur qui
    // sous-compte silencieusement est pire qu'un compteur absent, parce qu'il a
    // l'air de fonctionner. `ON CONFLICT DO UPDATE` laisse Postgres sérialiser.
    await prisma.compteurOuvertureSources.upsert({
      where: { jour_espece: { jour, espece } },
      create: { jour, espece, compte: 1 },
      update: { compte: { increment: 1 } },
    });

    return NextResponse.json({ ok: true, espece }, { status: 201 });
  } catch (err) {
    console.error('[praticien/mesure/ouverture-sources POST]', err instanceof Error ? err.message : String(err));
    return echec('exception', 'Erreur technique.', 500);
  }
}
