import { prisma } from '@/lib/prisma';
import { lireMatierePriorite } from '@/lib/objectif/matierePriorite';
import { VERSION_CONSIGNE } from '@/lib/objectif/propositionPriorite';

// LA PROVENANCE SE CONSTATE, ELLE NE SE DÉCLARE PAS — `D-167` §6, arbitrage du
// 2026-09-11.
//
// POURQUOI LE SERVEUR RELIT PLUTÔT QUE DE CROIRE. L'écran pourrait envoyer
// « cet énoncé vient du dépôt `ent_42` » et la route le recopier. C'est
// exactement le défaut que `D-164` a fermé (`F1`, P1) : la route de proposition
// acceptait du NAVIGATEUR un fragment de restitution et n'en contrôlait que la
// FORME, si bien que le praticien lisait « Restitution publiée par… » sous un
// texte que rien n'avait confronté. Rouvrir ce trou ici porterait plus loin
// encore : la priorité part dans le dossier à deux voix que le PATIENT lit.
//
// CE MODULE NE REÇOIT DONC AUCUNE DÉCLARATION DE PROVENANCE. Il prend les
// textes enregistrés, relit les sources, et compare. Une provenance n'est posée
// que sur une correspondance EXACTE.
//
// ET C'EST AUSSI CE QUI FAIT TOMBER LA MARQUE. `D-167` §6 : « un texte modifié
// par le praticien perd sa marque et redevient ses mots ». Ici, la marque ne se
// retire pas — elle ne se pose simplement pas, faute de correspondance. Un seul
// mécanisme pour les deux clauses, donc aucun chemin où l'une tiendrait sans
// l'autre.
//
// LE RANG TOMBE AVEC LA MARQUE (§11, réserve levée le 2026-09-11) : il n'est
// écrit que si la priorité est la proposition TELLE QUELLE. Un contrôle en base
// le tient aussi (`alli_objectif_priorite_rang_avec_source`).

/**
 * Les colonnes de provenance, telles que la route les écrira.
 *
 * TOUTES OPTIONNELLES, ET ABSENTES PAR DÉFAUT. Une provenance qu'on ne peut pas
 * constater ne s'invente pas : le champ reste NULL, et le contrat SQL du
 * 2026-09-10 prouve qu'un objectif SANS aucune provenance reste acceptable.
 */
export type ProvenanceConstatee = {
  enonceSource?: string;
  enonceSourceId?: string;
  reformulationSource?: string;
  reformulationSourceId?: string;
  prioriteSource?: string;
  prioriteSourceSyntheseId?: string;
  prioriteSourceDepotId?: string;
  prioritePrompt?: string;
  prioriteSourceRang?: number;
};

/** Les textes tels qu'ils seront enregistrés. */
export type TextesEnregistres = {
  enoncePatient: string | null;
  reformulationPraticien: string | null;
  priorite: string | null;
};

/**
 * Comparaison de citation — stricte sur le contenu, tolérante sur les bords.
 *
 * `trim` SEULEMENT, JAMAIS DE NORMALISATION PLUS LARGE. Replier les espaces
 * internes ou la casse ferait passer pour « cité verbatim » un texte que le
 * praticien a retouché : ce serait poser la marque sur ses mots à lui, le faux
 * symétrique de celui que `D-167` §6 nomme. Un espace de fin, en revanche, ne
 * distingue rien — il vient du champ, pas de la main.
 */
function citeExactement(enregistre: string | null, source: string): boolean {
  if (enregistre === null) return false;
  return enregistre.trim() === source.trim();
}

/**
 * Constate la provenance des trois textes.
 *
 * NE LÈVE JAMAIS. Une lecture en échec rend une provenance VIDE : l'objectif
 * s'enregistre sans marque plutôt que d'échouer. Perdre une trace de provenance
 * est un moindre mal que perdre l'objectif que le praticien vient d'écrire —
 * et une trace absente se lit comme absente, jamais comme un démenti.
 */
export async function constaterProvenance(
  idPatient: string,
  textes: TextesEnregistres,
): Promise<ProvenanceConstatee> {
  try {
    const { synthese, depot } = await lireMatierePriorite(idPatient);
    const constat: ProvenanceConstatee = {};

    // 1. L'ÉNONCÉ — cité du dépôt patient, verbatim (`D-167` §1).
    if (depot !== null && citeExactement(textes.enoncePatient, depot.texte)) {
      constat.enonceSource = 'ce_qui_compte';
      constat.enonceSourceId = depot.idDepot;
    }

    // 2. LA REFORMULATION — citée du `narratif_patient` d'une synthèse validée
    //    (`D-167` §2). `synthese_ia` et non `synthese_comprehension` : ce sont
    //    deux tables, et la nature déclarée doit dire laquelle.
    if (synthese !== null && citeExactement(textes.reformulationPraticien, synthese.narratifPatient)) {
      constat.reformulationSource = 'synthese_ia';
      constat.reformulationSourceId = synthese.idSynthese;
    }

    // 3. LA PRIORITÉ — la proposition de la machine, telle quelle (`D-167` §3).
    //    Les DEUX sources doivent être là : sans dépôt, aucune proposition n'a
    //    pu être produite, et en revendiquer une serait un faux.
    if (synthese !== null && depot !== null && textes.priorite !== null) {
      const tirage = await prisma.propositionPrioriteIA.findFirst({
        where: {
          idPatient,
          idSynthese: synthese.idSynthese,
          idDepot: depot.idDepot,
          versionConsigne: VERSION_CONSIGNE,
          // LE TEXTE EST DANS LE `where`, ET C'EST LE POINT. On ne cherche pas
          // « le dernier tirage » pour le comparer ensuite : on cherche CELUI
          // dont le texte est exactement celui qu'on enregistre. Un praticien
          // qui accepte le tirage 2 après en avoir vu un 3ᵉ garde le rang 2.
          texte: textes.priorite.trim(),
        },
        orderBy: { rang: 'desc' },
        select: { rang: true },
      });
      if (tirage !== null) {
        constat.prioriteSource = 'proposition_ia';
        constat.prioriteSourceSyntheseId = synthese.idSynthese;
        constat.prioriteSourceDepotId = depot.idDepot;
        constat.prioritePrompt = VERSION_CONSIGNE;
        constat.prioriteSourceRang = tirage.rang;
      }
    }

    return constat;
  } catch {
    return {};
  }
}
