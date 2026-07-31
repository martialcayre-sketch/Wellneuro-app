// Ingestion du RÉFÉRENTIEL d'ingrédients (campagne C4, phase 1b).
//
// Ce module pose le VOCABULAIRE — quels ingrédients existent, sous quelles
// formes. Il ne pose aucun JUGEMENT : ni règle clinique, ni seuil, ni alerte
// de sécurité. Cette frontière est la raison d'être du lot, et les tests la
// vérifient explicitement.
//
// Origine des données : le référentiel officiel Compl'Alim (DGAL), dont la
// couverture des libellés du catalogue a été mesurée à 100 %. La relation
// ingrédient × forme y est EXPLICITE — elle n'est jamais déduite du libellé.
// C'est un point de sécurité clinique, pas une préférence : une lecture
// syntaxique de « Hydrogénosélénite de sodium » conclut au sodium, alors que
// le nutriment est le sélénium.
//
// Lecture seule côté patient : aucune donnée patient n'entre ici.
import { prisma } from '@/lib/prisma';
import {
  SUPPLEMENTS_MAX_BATCH_SIZE,
  SUPPLEMENTS_PROVENANCES,
  type SupplementProvenance,
} from '@/lib/supplement-library/config';

export type ReferentielFormeInput = {
  /** Identifiant officiel de la forme, préfixé par son espace de noms. */
  sourceIdentifiant: string;
  code: string;
  labelFr: string;
};

export type ReferentielIngredientInput = {
  /** Identifiant officiel de l'ingrédient, préfixé par son espace de noms. */
  sourceIdentifiant: string;
  code: string;
  nomFr: string;
  formes: ReferentielFormeInput[];
};

export type ReferentielPayload = {
  provenance: SupplementProvenance;
  ingredients: ReferentielIngredientInput[];
};

export type ReferentielBilan = {
  ok: boolean;
  ingredientsCrees: number;
  ingredientsMisAJour: number;
  ingredientsInchanges: number;
  formesCreees: number;
  formesMisesAJour: number;
  formesInchangees: number;
};

/**
 * Espace de noms OBLIGATOIRE dans l'identifiant source. Sans lui, la
 * substance 356 et la plante 356 entrent en collision sur l'index unique —
 * deux ingrédients sans rapport fusionneraient silencieusement.
 */
const IDENTIFIANT = /^[a-z_]+:[0-9]+$/;

/** Code lisible : c'est lui que les règles cliniques manipulent. */
const CODE = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

const PROVENANCES = new Set<string>(SUPPLEMENTS_PROVENANCES);
const LONGUEUR_MAX = 300;

export class ReferentielPayloadInvalide extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReferentielPayloadInvalide';
  }
}

function objet(valeur: unknown, label: string): Record<string, unknown> {
  if (typeof valeur !== 'object' || valeur === null || Array.isArray(valeur)) {
    throw new ReferentielPayloadInvalide(`${label} doit être un objet.`);
  }
  return valeur as Record<string, unknown>;
}

function texte(source: Record<string, unknown>, cle: string, label: string): string {
  const brut = source[cle];
  if (typeof brut !== 'string' || brut.trim() === '') {
    throw new ReferentielPayloadInvalide(`${label}.${cle} est requis (chaîne non vide).`);
  }
  const valeur = brut.trim();
  if (valeur.length > LONGUEUR_MAX) {
    throw new ReferentielPayloadInvalide(`${label}.${cle} dépasse ${LONGUEUR_MAX} caractères.`);
  }
  return valeur;
}

function motif(valeur: string, regex: RegExp, cle: string, label: string): string {
  if (!regex.test(valeur)) {
    throw new ReferentielPayloadInvalide(`${label}.${cle} « ${valeur} » ne respecte pas le format attendu.`);
  }
  return valeur;
}

export function parseReferentielPayload(brut: unknown): ReferentielPayload {
  const racine = objet(brut, 'payload');

  const provenance = texte(racine, 'provenance', 'payload');
  if (!PROVENANCES.has(provenance)) {
    throw new ReferentielPayloadInvalide(
      `payload.provenance « ${provenance} » hors vocabulaire ${SUPPLEMENTS_PROVENANCES.join(', ')}.`,
    );
  }

  const liste = racine.ingredients;
  if (!Array.isArray(liste) || liste.length === 0) {
    throw new ReferentielPayloadInvalide('payload.ingredients doit être un tableau non vide.');
  }
  if (liste.length > SUPPLEMENTS_MAX_BATCH_SIZE) {
    throw new ReferentielPayloadInvalide(
      `payload.ingredients dépasse ${SUPPLEMENTS_MAX_BATCH_SIZE} entrées — découper en lots.`,
    );
  }

  // Un doublon DANS le lot ferait échouer l'écriture sur l'index unique, à
  // mi-parcours et sans dire pourquoi. On le refuse ici, en le nommant.
  const identifiantsVus = new Set<string>();
  const codesVus = new Set<string>();

  const ingredients = liste.map((entree, index) => {
    const label = `ingredients[${index}]`;
    const source = objet(entree, label);

    const sourceIdentifiant = motif(
      texte(source, 'sourceIdentifiant', label), IDENTIFIANT, 'sourceIdentifiant', label,
    );
    const code = motif(texte(source, 'code', label), CODE, 'code', label);
    const nomFr = texte(source, 'nomFr', label);

    if (identifiantsVus.has(sourceIdentifiant)) {
      throw new ReferentielPayloadInvalide(`${label}.sourceIdentifiant « ${sourceIdentifiant} » apparaît deux fois dans le lot.`);
    }
    identifiantsVus.add(sourceIdentifiant);
    if (codesVus.has(code)) {
      throw new ReferentielPayloadInvalide(`${label}.code « ${code} » apparaît deux fois dans le lot.`);
    }
    codesVus.add(code);

    const brutFormes = source.formes;
    if (!Array.isArray(brutFormes)) {
      throw new ReferentielPayloadInvalide(`${label}.formes doit être un tableau (vide accepté).`);
    }
    const codesFormes = new Set<string>();
    const formes = brutFormes.map((f, j) => {
      const labelForme = `${label}.formes[${j}]`;
      const sf = objet(f, labelForme);
      const codeForme = motif(texte(sf, 'code', labelForme), CODE, 'code', labelForme);
      if (codesFormes.has(codeForme)) {
        throw new ReferentielPayloadInvalide(`${labelForme}.code « ${codeForme} » apparaît deux fois pour le même ingrédient.`);
      }
      codesFormes.add(codeForme);
      return {
        sourceIdentifiant: motif(
          texte(sf, 'sourceIdentifiant', labelForme), IDENTIFIANT, 'sourceIdentifiant', labelForme,
        ),
        code: codeForme,
        labelFr: texte(sf, 'labelFr', labelForme),
      };
    });

    return { sourceIdentifiant, code, nomFr, formes };
  });

  return { provenance: provenance as SupplementProvenance, ingredients };
}

/**
 * Écrit le référentiel. Idempotent : rejouer le même lot ne crée rien et ne
 * modifie rien.
 *
 * Ce qui n'est JAMAIS fait ici, et qui doit le rester :
 * — aucune désactivation, aucune suppression. Une entrée retirée en amont
 *   demeure : la retirer du service est un geste praticien signé, pas un effet
 *   de bord d'une synchronisation ;
 * — aucune écriture dans `clinical_rules`, `ingredient_functional_thresholds`
 *   ni `supplement_safety_alerts`. Le vocabulaire n'est pas le jugement.
 */
export async function ingestReferentiel(payload: ReferentielPayload): Promise<ReferentielBilan> {
  const bilan: ReferentielBilan = {
    ok: true,
    ingredientsCrees: 0,
    ingredientsMisAJour: 0,
    ingredientsInchanges: 0,
    formesCreees: 0,
    formesMisesAJour: 0,
    formesInchangees: 0,
  };

  for (const entree of payload.ingredients) {
    await prisma.$transaction(async (tx) => {
      const cle = {
        sourceProvenance: payload.provenance,
        sourceIdentifiant: entree.sourceIdentifiant,
      };
      const existant = await tx.supplementIngredient.findFirst({ where: cle, select: { id: true, code: true, nomFr: true } });

      // Le code est unique. S'il est déjà porté par une AUTRE entrée, écrire
      // détournerait l'ingrédient de quelqu'un d'autre — y compris une entrée
      // saisie à la main par le praticien. On refuse en le nommant plutôt que
      // d'écraser ou de renommer d'office.
      const porteurDuCode = await tx.supplementIngredient.findUnique({
        where: { code: entree.code },
        select: { id: true, sourceProvenance: true, sourceIdentifiant: true },
      });
      if (porteurDuCode && porteurDuCode.id !== existant?.id) {
        throw new ReferentielPayloadInvalide(
          `Le code « ${entree.code} » appartient déjà à une autre entrée (${porteurDuCode.sourceProvenance ?? 'saisie manuelle'} / ${porteurDuCode.sourceIdentifiant ?? '—'}) : ingestion refusée pour ${entree.sourceIdentifiant}.`,
        );
      }

      let ingredientId: string;
      if (!existant) {
        const cree = await tx.supplementIngredient.create({
          data: { ...cle, code: entree.code, nomFr: entree.nomFr },
          select: { id: true },
        });
        ingredientId = cree.id;
        bilan.ingredientsCrees += 1;
      } else {
        ingredientId = existant.id;
        if (existant.code !== entree.code || existant.nomFr !== entree.nomFr) {
          await tx.supplementIngredient.update({
            where: { id: existant.id },
            data: { code: entree.code, nomFr: entree.nomFr },
          });
          bilan.ingredientsMisAJour += 1;
        } else {
          bilan.ingredientsInchanges += 1;
        }
      }

      for (const forme of entree.formes) {
        const formeExistante = await tx.supplementIngredientForme.findUnique({
          where: { ingredientId_code: { ingredientId, code: forme.code } },
          select: { id: true, labelFr: true, sourceIdentifiant: true },
        });
        if (!formeExistante) {
          await tx.supplementIngredientForme.create({
            data: {
              ingredientId,
              code: forme.code,
              labelFr: forme.labelFr,
              sourceProvenance: payload.provenance,
              sourceIdentifiant: forme.sourceIdentifiant,
            },
          });
          bilan.formesCreees += 1;
        } else if (
          formeExistante.labelFr !== forme.labelFr
          || formeExistante.sourceIdentifiant !== forme.sourceIdentifiant
        ) {
          await tx.supplementIngredientForme.update({
            where: { id: formeExistante.id },
            data: {
              labelFr: forme.labelFr,
              sourceProvenance: payload.provenance,
              sourceIdentifiant: forme.sourceIdentifiant,
            },
          });
          bilan.formesMisesAJour += 1;
        } else {
          bilan.formesInchangees += 1;
        }
      }
    });
  }

  return bilan;
}
