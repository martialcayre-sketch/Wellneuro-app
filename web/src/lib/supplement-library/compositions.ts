// Transport des COMPOSITIONS de produits vers le pivot clinique (campagne C4,
// PR B : l'écriture). #504 avait livré la décision — le résolveur et le rapport
// de couverture — sans aucun chemin d'écriture. Celui-ci est ce chemin.
//
// Ce module écrit QUI compose QUOI, et à quelle dose. Il n'écrit aucun
// jugement : ni règle clinique, ni seuil, ni alerte de sécurité. La frontière
// est la même qu'au référentiel, et elle est ici plus exposée : la table que
// l'on peuple est l'entrée de la sentinelle de cumul, qui rapproche des doses
// entre produits. Une ligne fausse n'y dort pas — elle est lue comme clinique.
//
// Aucune donnée patient n'entre ici.
import { prisma } from '@/lib/prisma';
import {
  SUPPLEMENTS_MAX_BATCH_SIZE,
  SUPPLEMENTS_PROVENANCES,
  SUPPLEMENTS_UNITES,
  type SupplementProvenance,
} from '@/lib/supplement-library/config';

export type CompositionLigneInput = {
  /** Identifiant officiel de l'ingrédient, préfixé par son espace de noms. */
  ingredientSourceIdentifiant: string;
  /** Identifiant officiel de la forme, ou `null` si la ligne n'en porte pas. */
  formeSourceIdentifiant: string | null;
  /** Quantité par DOSE JOURNALIÈRE RECOMMANDÉE — jamais par unité de prise. */
  doseParDjr: number | null;
  unite: string | null;
  position: number;
};

export type CompositionProduitInput = {
  /** Identifiant officiel du produit. */
  sourceIdentifiant: string;
  versionFormulation: number;
  /**
   * Nombre de lignes ACTIVES que la source déclare, toutes catégories — y
   * compris celles qui ne se résolvent pas. C'est le dénominateur de la preuve
   * d'intégrité : sans lui, on ne peut pas distinguer « tout est là » de « on
   * n'a écrit que ce qu'on savait lire ».
   */
  sourceLignes: number;
  lignes: CompositionLigneInput[];
};

export type CompositionsPayload = {
  provenance: SupplementProvenance;
  produits: CompositionProduitInput[];
};

export type CompositionsBilan = {
  ok: boolean;
  produitsEcrits: number;
  produitsInchanges: number;
  lignesCreees: number;
  /**
   * Produits sautés parce qu'ils portent DÉJÀ une composition divergente pour
   * cette version de formulation. Ni une erreur ni un succès : un arbitrage —
   * voir la règle d'append-only dans `ingestCompositions`.
   */
  produitsDivergents: string[];
  /**
   * Produits sautés parce qu'un de leurs ingrédients ou une de leurs formes
   * est absent du référentiel en base. Rendus nommément : c'est la liste que
   * l'opérateur doit traiter avant de rejouer.
   */
  produitsIncomplets: string[];
};

/** Espace de noms obligatoire — la substance 356 et la plante 356 sont deux
 *  ingrédients sans rapport, et l'index unique ne les distingue que par lui. */
const IDENTIFIANT = /^[a-z_]+:[0-9]+$/;

/** Même exclusion qu'au référentiel : cette voie est un import externe, et
 *  `saisie_praticien` y donnerait à des lignes machine l'autorité d'un geste
 *  signé. */
const PROVENANCES = new Set<string>(
  SUPPLEMENTS_PROVENANCES.filter((p) => p !== 'saisie_praticien'),
);
const UNITES = new Set<string>(SUPPLEMENTS_UNITES);

/**
 * Chaque ligne coûte au moins un aller-retour DANS la transaction de son
 * produit. Borner les produits ne protège de rien si l'un d'eux en porte mille :
 * la borne qui compte est celle des lignes.
 */
const LIGNES_MAX_PAR_LOT = 5000;

export class CompositionsPayloadInvalide extends Error {
  /** Ce qui a été écrit AVANT le refus. Un lot interrompu doit dire ce qu'il
   *  laisse derrière lui, sinon l'opérateur relance à l'aveugle — c'est
   *  exactement ce qui a manqué à l'ingestion du référentiel le 2026-07-31. */
  readonly bilanPartiel?: CompositionsBilan;

  constructor(message: string, bilanPartiel?: CompositionsBilan) {
    super(message);
    this.name = 'CompositionsPayloadInvalide';
    this.bilanPartiel = bilanPartiel;
  }
}

function objet(valeur: unknown, label: string): Record<string, unknown> {
  if (typeof valeur !== 'object' || valeur === null || Array.isArray(valeur)) {
    throw new CompositionsPayloadInvalide(`${label} doit être un objet.`);
  }
  return valeur as Record<string, unknown>;
}

function texte(source: Record<string, unknown>, cle: string, label: string): string {
  const brut = source[cle];
  if (typeof brut !== 'string' || brut.trim() === '') {
    throw new CompositionsPayloadInvalide(`${label}.${cle} est requis (chaîne non vide).`);
  }
  return brut.trim();
}

function entier(source: Record<string, unknown>, cle: string, label: string, min: number): number {
  const brut = source[cle];
  if (typeof brut !== 'number' || !Number.isInteger(brut) || brut < min) {
    throw new CompositionsPayloadInvalide(
      `${label}.${cle} doit être un entier ≥ ${min}.`,
    );
  }
  return brut;
}

/**
 * Dose et unité vont PAR PAIRE, et le refus est volontairement symétrique.
 *
 * Une dose sans unité est un nombre auquel un lecteur prêtera la grandeur qui
 * l'arrange — et le prochain lecteur est la sentinelle de cumul. Une unité sans
 * dose est une grandeur sans quantité : elle n'affirme rien mais laisse croire
 * qu'une mesure existe. La base porte déjà ce CHECK ; le refuser ici le nomme,
 * au lieu de le laisser tomber en erreur 23514 au milieu d'un lot.
 */
function dosePaire(
  source: Record<string, unknown>,
  label: string,
): { doseParDjr: number | null; unite: string | null } {
  const doseBrute = source.doseParDjr;
  const uniteBrute = source.unite;

  const doseAbsente = doseBrute === null || doseBrute === undefined;
  const uniteAbsente = uniteBrute === null || uniteBrute === undefined;

  if (doseAbsente && uniteAbsente) return { doseParDjr: null, unite: null };

  if (doseAbsente !== uniteAbsente) {
    throw new CompositionsPayloadInvalide(
      `${label} : dose et unité vont par paire — « ${String(doseBrute)} » / « ${String(uniteBrute)} ».`,
    );
  }

  if (typeof doseBrute !== 'number' || !Number.isFinite(doseBrute) || doseBrute < 0) {
    throw new CompositionsPayloadInvalide(
      `${label}.doseParDjr doit être un nombre fini positif.`,
    );
  }
  if (typeof uniteBrute !== 'string' || !UNITES.has(uniteBrute)) {
    throw new CompositionsPayloadInvalide(
      `${label}.unite « ${String(uniteBrute)} » hors vocabulaire ${[...UNITES].join(', ')}.`,
    );
  }

  return { doseParDjr: doseBrute, unite: uniteBrute };
}

export function parseCompositionsPayload(brut: unknown): CompositionsPayload {
  const racine = objet(brut, 'payload');

  const provenance = texte(racine, 'provenance', 'payload');
  if (!PROVENANCES.has(provenance)) {
    throw new CompositionsPayloadInvalide(
      `payload.provenance « ${provenance} » hors vocabulaire ${[...PROVENANCES].join(', ')}.`,
    );
  }

  const liste = racine.produits;
  if (!Array.isArray(liste) || liste.length === 0) {
    throw new CompositionsPayloadInvalide('payload.produits doit être un tableau non vide.');
  }
  if (liste.length > SUPPLEMENTS_MAX_BATCH_SIZE) {
    throw new CompositionsPayloadInvalide(
      `payload.produits dépasse ${SUPPLEMENTS_MAX_BATCH_SIZE} entrées — découper en lots.`,
    );
  }

  const clesVues = new Set<string>();

  const produits = liste.map((entree, index) => {
    const label = `produits[${index}]`;
    const source = objet(entree, label);

    const sourceIdentifiant = texte(source, 'sourceIdentifiant', label);
    const versionFormulation = entier(source, 'versionFormulation', label, 1);
    const sourceLignes = entier(source, 'sourceLignes', label, 0);

    // Un doublon DANS le lot ferait échouer l'écriture sur l'index unique, à
    // mi-parcours, sans dire pourquoi. On le refuse ici, en le nommant.
    const cle = `${sourceIdentifiant}#${versionFormulation}`;
    if (clesVues.has(cle)) {
      throw new CompositionsPayloadInvalide(
        `${label} : le produit « ${cle} » apparaît deux fois dans le lot.`,
      );
    }
    clesVues.add(cle);

    const brutLignes = source.lignes;
    if (!Array.isArray(brutLignes)) {
      throw new CompositionsPayloadInvalide(`${label}.lignes doit être un tableau (vide accepté).`);
    }

    // L'unicité en base porte sur (produit, ingrédient, forme). Deux lignes de
    // même clé dans un même lot ne peuvent pas coexister — et surtout, elles
    // n'ont pas de fusion honnête : additionner deux doses inventerait une
    // quantité que la source ne déclare pas, en garder une en jetterait une.
    const clesLignes = new Set<string>();

    const lignes = brutLignes.map((l, j): CompositionLigneInput => {
      const labelLigne = `${label}.lignes[${j}]`;
      const sl = objet(l, labelLigne);

      const ingredientSourceIdentifiant = texte(sl, 'ingredientSourceIdentifiant', labelLigne);
      if (!IDENTIFIANT.test(ingredientSourceIdentifiant)) {
        throw new CompositionsPayloadInvalide(
          `${labelLigne}.ingredientSourceIdentifiant « ${ingredientSourceIdentifiant} » ne respecte pas le format attendu.`,
        );
      }

      const formeBrute = sl.formeSourceIdentifiant;
      let formeSourceIdentifiant: string | null = null;
      if (formeBrute !== null && formeBrute !== undefined) {
        if (typeof formeBrute !== 'string' || !IDENTIFIANT.test(formeBrute.trim())) {
          throw new CompositionsPayloadInvalide(
            `${labelLigne}.formeSourceIdentifiant « ${String(formeBrute)} » ne respecte pas le format attendu.`,
          );
        }
        formeSourceIdentifiant = formeBrute.trim();
      }

      const cleLigne = `${ingredientSourceIdentifiant}#${formeSourceIdentifiant ?? '—'}`;
      if (clesLignes.has(cleLigne)) {
        throw new CompositionsPayloadInvalide(
          `${labelLigne} : la ligne « ${cleLigne} » apparaît deux fois pour ce produit — aucune fusion n'est honnête, ni additionner les doses ni en jeter une.`,
        );
      }
      clesLignes.add(cleLigne);

      return {
        ingredientSourceIdentifiant,
        formeSourceIdentifiant,
        ...dosePaire(sl, labelLigne),
        position: entier(sl, 'position', labelLigne, 0),
      };
    });

    // `sourceLignes` est le DÉNOMINATEUR, donc il ne peut pas être plus petit
    // que ce qu'on écrit. S'il l'était, la preuve d'intégrité rendrait un taux
    // supérieur à 100 % — et un produit incomplet passerait pour intègre.
    if (lignes.length > sourceLignes) {
      throw new CompositionsPayloadInvalide(
        `${label} : ${lignes.length} lignes écrites pour ${sourceLignes} déclarées par la source — le dénominateur ne peut pas être plus petit que le numérateur.`,
      );
    }

    return { sourceIdentifiant, versionFormulation, sourceLignes, lignes };
  });

  const nbLignes = produits.reduce((n, p) => n + p.lignes.length, 0);
  if (nbLignes > LIGNES_MAX_PAR_LOT) {
    throw new CompositionsPayloadInvalide(
      `payload porte ${nbLignes} lignes, au-delà de ${LIGNES_MAX_PAR_LOT} — découper en lots.`,
    );
  }

  return { provenance: provenance as SupplementProvenance, produits };
}

/**
 * Écrit les compositions. Idempotent : rejouer le même lot ne crée rien.
 *
 * TROIS RÈGLES, et aucune n'est décorative.
 *
 * 1. **Append-only, comme tout le catalogue.** Le schéma l'écrit : « reformulation
 *    = nouvelle ligne (version_formulation), jamais d'édition en place ». Un
 *    produit qui porte déjà une composition pour CETTE version ne se met donc
 *    pas à jour : ou bien le lot est identique et il n'y a rien à faire, ou bien
 *    il diverge — et une divergence est une reformulation, qui doit arriver sous
 *    une nouvelle `versionFormulation`. On saute et on rapporte. Écraser
 *    ferait muter sous les yeux de la sentinelle de cumul une composition qu'un
 *    praticien a peut-être déjà lue.
 *
 * 2. **Un produit s'écrit entier ou pas du tout.** Si un seul de ses ingrédients
 *    ou une seule de ses formes manque au référentiel, tout le produit est
 *    sauté. Écrire les lignes connues laisserait une composition PARTIELLE, que
 *    rien ne distingue d'une composition complète : la sentinelle sommerait
 *    alors sur un sous-ensemble en croyant tenir le tout, et une alerte de cumul
 *    manquerait — dans le sens rassurant.
 *
 * 3. **`compositionSourceLignes` s'écrit dans LA MÊME transaction que les
 *    lignes.** C'est le dénominateur de la preuve d'intégrité. Écrit à part, il
 *    existerait une fenêtre où le produit annonce vingt lignes déclarées et n'en
 *    porte aucune — soit exactement l'état « coquille » que ce lot fait cesser,
 *    mais cette fois avec un compteur qui affirme le contraire.
 *
 * Ce qui n'est JAMAIS fait ici : aucune suppression, aucune désactivation,
 * aucune écriture dans `clinical_rules`, `ingredient_functional_thresholds` ni
 * `supplement_safety_alerts`.
 */
export async function ingestCompositions(
  payload: CompositionsPayload,
): Promise<CompositionsBilan> {
  const bilan: CompositionsBilan = {
    ok: true,
    produitsEcrits: 0,
    produitsInchanges: 0,
    lignesCreees: 0,
    produitsDivergents: [],
    produitsIncomplets: [],
  };

  for (const produit of payload.produits) {
    await prisma.$transaction(async (tx) => {
      const enBase = await tx.supplementProduct.findFirst({
        where: {
          sourceProvenance: payload.provenance,
          sourceIdentifiant: produit.sourceIdentifiant,
          versionFormulation: produit.versionFormulation,
        },
        select: { id: true, compositionSourceLignes: true },
      });

      if (!enBase) {
        // Le produit doit préexister : ce lot transporte des compositions, il
        // ne crée pas de fiches. Un produit absent est une erreur d'ordre des
        // opérations, pas une donnée à inventer.
        bilan.produitsIncomplets.push(
          `${produit.sourceIdentifiant}#${produit.versionFormulation} : aucune fiche produit en base.`,
        );
        return;
      }

      // Règle n°1 — append-only.
      const dejaEcrites = await tx.supplementProductComposition.findMany({
        where: { productId: enBase.id },
        select: { ingredientId: true, formeId: true, doseParDjr: true, unite: true },
      });

      // Règle n°2 — résolution INTÉGRALE avant la moindre écriture.
      const resolues: {
        ingredientId: string;
        formeId: string | null;
        doseParDjr: number | null;
        unite: string | null;
        position: number;
      }[] = [];
      let manquant: string | null = null;

      for (const ligne of produit.lignes) {
        const ingredient = await tx.supplementIngredient.findFirst({
          where: {
            sourceProvenance: payload.provenance,
            sourceIdentifiant: ligne.ingredientSourceIdentifiant,
          },
          select: { id: true },
        });
        if (!ingredient) {
          manquant = `ingrédient ${ligne.ingredientSourceIdentifiant}`;
          break;
        }

        let formeId: string | null = null;
        if (ligne.formeSourceIdentifiant !== null) {
          const forme = await tx.supplementIngredientForme.findFirst({
            where: {
              ingredientId: ingredient.id,
              sourceProvenance: payload.provenance,
              sourceIdentifiant: ligne.formeSourceIdentifiant,
            },
            select: { id: true },
          });
          if (!forme) {
            manquant = `forme ${ligne.formeSourceIdentifiant} sous ${ligne.ingredientSourceIdentifiant}`;
            break;
          }
          formeId = forme.id;
        }

        resolues.push({
          ingredientId: ingredient.id,
          formeId,
          doseParDjr: ligne.doseParDjr,
          unite: ligne.unite,
          position: ligne.position,
        });
      }

      if (manquant !== null) {
        bilan.produitsIncomplets.push(
          `${produit.sourceIdentifiant}#${produit.versionFormulation} : ${manquant} absent du référentiel.`,
        );
        return;
      }

      if (dejaEcrites.length > 0) {
        const signature = (l: { ingredientId: string; formeId: string | null; doseParDjr: number | null; unite: string | null }) =>
          `${l.ingredientId}#${l.formeId ?? '—'}#${l.doseParDjr ?? '—'}#${l.unite ?? '—'}`;
        const avant = new Set(dejaEcrites.map(signature));
        const apres = new Set(resolues.map(signature));
        const identique =
          avant.size === apres.size && [...apres].every((s) => avant.has(s));

        if (identique) {
          bilan.produitsInchanges += 1;
          return;
        }
        bilan.produitsDivergents.push(
          `${produit.sourceIdentifiant}#${produit.versionFormulation} : ${dejaEcrites.length} ligne(s) déjà écrites, ${resolues.length} proposée(s) — une reformulation se dépose sous une nouvelle versionFormulation, elle ne s'édite pas en place.`,
        );
        return;
      }

      for (const ligne of resolues) {
        await tx.supplementProductComposition.create({
          data: {
            productId: enBase.id,
            ingredientId: ligne.ingredientId,
            formeId: ligne.formeId,
            doseParDjr: ligne.doseParDjr,
            unite: ligne.unite,
            position: ligne.position,
          },
        });
        bilan.lignesCreees += 1;
      }

      // Règle n°3 — le dénominateur part avec les lignes, pas après.
      await tx.supplementProduct.update({
        where: { id: enBase.id },
        data: { compositionSourceLignes: produit.sourceLignes },
      });
      bilan.produitsEcrits += 1;
    });
  }

  return bilan;
}
