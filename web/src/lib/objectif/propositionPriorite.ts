import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic';
import { LONGUEUR_MAX_PRIORITE } from '@/lib/praticien/objectifNegocie';
import type { MatiereDepot, MatiereSynthese } from '@/lib/objectif/matierePriorite';

// L'APPEL QUI PROPOSE UNE PRIORITÉ — `D-167` §3.
//
// POURQUOI UN APPEL ET NON UNE CITATION. La priorité est bornée à 200
// caractères et AUCUNE source ne tient dedans : mesuré sur les 36 synthèses
// validées de production, `resume_praticien` va de 682 à 2 282 caractères,
// moyenne 1 391 — la plus courte dépasse la borne d'un facteur 3,4. Citer
// imposerait de tronquer, ce que `lib/patient/ceQuiCompte.ts` nomme
// « ALTÉRATION DE DONNÉE ». La borne ne bouge pas : c'est l'appel qui s'y plie.
//
// CE MODULE NE DÉCIDE RIEN, ET C'EST CE QUI SATISFAIT `D-003`. Il propose ; la
// proposition est marquée comme telle à l'écran ; le praticien la valide, la
// réécrit ou l'efface. Retirer la marque ferait de cette clause une dérogation.
//
// IL VIT HORS DU MOTEUR DE PROPOSITION (`D-094` §4, `D-167` §5). Ce moteur est
// déterministe et sans LLM par décision — mêmes entrées, mêmes propositions,
// même empreinte, ce qui rend sa caducité calculable. Cet appel ne passe ni par
// `assemblerPropositions`, ni par `hashSources`, ni par `fragments`.

/**
 * La version de la consigne, écrite en base à chaque proposition.
 *
 * ELLE PORTE UNE PROMESSE FAITE AU PATIENT. La v2 de « L'intelligence
 * artificielle dans Wellneuro » lui dit : « Le modèle utilisé et la version du
 * procédé sont enregistrés à chaque fois, ce qui permet de retracer l'origine de
 * chaque texte. » Un bump se fait ICI, avec sa raison en commentaire — jamais en
 * changeant la consigne sans changer le numéro, ce qui rendrait deux textes
 * différents indiscernables en relecture.
 *
 * v1 (2026-09-11) : première consigne.
 */
export const VERSION_CONSIGNE = 'priorite-v1';

/**
 * La borne. Elle ne bouge pas : `D-167` §3, et un CHECK la tient en base.
 *
 * ELLE N'EST PAS REDÉCLARÉE ICI. `objectifNegocie.ts` la porte depuis toujours
 * et la route d'écriture s'en sert pour refuser un texte trop long. En poser une
 * seconde ferait DEUX bornes pour le même champ : elles tiendraient tant que
 * personne n'en bouge une, puis l'appel produirait un libellé que l'écriture
 * refuserait. C'est la leçon des deux listes blanches du 2026-09-10, dans une
 * autre matière.
 */
export { LONGUEUR_MAX_PRIORITE };

/**
 * Le modèle de CET appel, réglable séparément de celui des synthèses.
 *
 * `D-167` §3 amendé : cet appel n'a pas la taille d'une synthèse — deux textes
 * en entrée, un libellé en sortie — et doit pouvoir changer de gamme sans
 * toucher à la rédaction des synthèses. Par défaut il suit `CLAUDE_MODEL`, pour
 * qu'une installation qui ne pose rien reste cohérente avec le reste.
 */
export function modelePropositionPriorite(): string {
  return process.env.WN_MODELE_PROPOSITION_PRIORITE ?? CLAUDE_MODEL;
}

/**
 * Le résultat d'un appel.
 *
 * UN ÉCHEC PORTE SON MOTIF, et les motifs ne se confondent pas : `D-167` §3
 * exige qu'une ligne DISE ce qui s'est passé. « Rien à proposer » et « l'appel
 * n'a pas abouti » sont deux phrases différentes, et les mélanger reproduirait
 * le défaut du rail de phase 3 — un écran qui affirme une cause qu'il n'a pas
 * vérifiée.
 */
export type ResultatProposition =
  | { ok: true; texte: string; modele: string; versionConsigne: string }
  | { ok: false; motif: 'indisponible' | 'trop_longue' | 'vide' };

/** La consigne système, versionnée par `VERSION_CONSIGNE`. */
const CONSIGNE = [
  'Tu assistes un praticien en neuronutrition qui pose avec son patient',
  "l'objectif de son suivi.",
  '',
  'À partir des deux textes fournis, propose UNE SEULE formulation courte de la',
  'priorité de travail, du point de vue du praticien.',
  '',
  'Règles absolues :',
  `- au plus ${LONGUEUR_MAX_PRIORITE} caractères ;`,
  '- une seule phrase ou un seul syntagme, jamais une liste, jamais une',
  "  énumération, jamais un ordre, jamais un rang, jamais de numérotation ;",
  '- aucun diagnostic, aucune conclusion médicale, aucun score, aucun seuil,',
  '  aucune bande, aucun chiffre de mesure ;',
  "- aucune recommandation de traitement, de complément ni d'examen ;",
  "- le vocabulaire du patient est préféré à celui de l'outil quand les deux",
  '  disent la même chose ;',
  '- réponds par la formulation SEULE, sans guillemets, sans préambule, sans',
  '  commentaire, sans ponctuation finale superflue.',
].join('\n');

/**
 * Produit une proposition à partir des DEUX pièces.
 *
 * LES DEUX SONT EXIGÉES par la signature elle-même (`D-167` §3 amendé) : la
 * parole du patient est une condition, pas un complément. Un appelant qui n'a
 * qu'une pièce ne peut pas appeler cette fonction — l'arbitrage est dans le
 * type, pas dans un `if` qu'on peut oublier.
 */
export async function proposerPriorite(
  synthese: MatiereSynthese,
  depot: MatiereDepot,
): Promise<ResultatProposition> {
  const modele = modelePropositionPriorite();

  let brut: string;
  try {
    const reponse = await anthropic.messages.create({
      model: modele,
      max_tokens: 300,
      system: CONSIGNE,
      messages: [
        {
          role: 'user',
          content: [
            'SYNTHÈSE VALIDÉE PAR LE PRATICIEN :',
            synthese.resumePraticien,
            '',
            'CE QUE LE PATIENT A ÉCRIT, TEL QUEL :',
            depot.texte,
          ].join('\n'),
        },
      ],
    });
    const bloc = reponse.content.find((c) => c.type === 'text');
    brut = bloc !== undefined && bloc.type === 'text' ? bloc.text : '';
  } catch {
    // AUCUN DÉTAIL D'ERREUR NE REMONTE. Un message de fournisseur peut porter
    // de la matière d'appel ; le praticien n'en a pas besoin pour agir, et
    // l'écran n'a rien à en faire d'autre que dire que l'appel n'a pas abouti.
    return { ok: false, motif: 'indisponible' };
  }

  const texte = brut.trim();
  if (texte === '') return { ok: false, motif: 'vide' };

  // UN DÉPASSEMENT SE REFUSE, IL NE SE COUPE PAS (`D-167` §3). Tronquer ici
  // rendrait un texte que le modèle n'a pas écrit, sous une marque qui dirait
  // qu'il l'a écrit.
  if (texte.length > LONGUEUR_MAX_PRIORITE) return { ok: false, motif: 'trop_longue' };

  return { ok: true, texte, modele, versionConsigne: VERSION_CONSIGNE };
}
