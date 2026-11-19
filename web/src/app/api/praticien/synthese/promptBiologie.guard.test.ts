import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  SYSTEM_PROMPT_CONTRAT_JSON,
  SYSTEM_PROMPT_GOUVERNANCE,
  VERSION_PROMPT_SYNTHESE,
  VERSION_SCHEMA_SYNTHESE,
} from '@/lib/anthropic';
import {
  ECART_INTERVALLE_SUIVI_UNITE,
  SYSTEM_PROMPT_SYNTHESE_BIOLOGIE,
  VERSION_PROMPT_SYNTHESE_BIOLOGIE,
  messageRelanceBiologie,
  phraseReceptionBilan,
} from '@/lib/synthese/appelBiologie';

// LES DEUX CONSIGNES DE LA SYNTHÈSE ET LA BIOLOGIE — H95 part B, [[D-539]] §4
// et §5 (qui amende [[D-513]] §3, §4 et §6), amendés par [[D-545]] §3 et §5.
// Textes validés mot pour mot par le responsable le 2026-11-18 (D-539) et le
// 2026-11-19 (D-545) : la section « Résultats de biologie » de `synthese-v38`,
// ses retouches et son contrat de sortie ; la consigne du second appel,
// `synthese-biologie-v2` ; la phrase posée par le code.
//
// LE TEXTE ATTENDU SE CONSTRUIT DES DEUX DÉCISIONS : la citation de D-539, où
// chaque passage remplacé par D-545 est cherché tel quel (une seule fois) et
// remplacé par la citation de D-545. Rien n'est recopié à la main.
//
// CE BANC NE PROUVE PAS QUE LE MODÈLE OBÉIT : il prouve qu'on ne peut plus
// toucher à ces textes sans le décider. Ce que le modèle écrit se voit par
// l'évaluation rejouée de D-539 §8 et le contrôle de contamination.

const CONSIGNE = SYSTEM_PROMPT_GOUVERNANCE;
const TITRE_SECTION = '## Résultats de biologie';
const SECTION_SUIVANTE = '## Consignes de réponse';

const EMPREINTE_SECTION_V38 = '5d07b064de5fc5ed';
const EMPREINTE_CONTRAT_V37 = '40026cfcb8b22b39';
const EMPREINTE_CONSIGNE_BIOLOGIE_V2 = 'a7a0ec27ba117fea';
const EMPREINTE_RELANCE_BIOLOGIE_V1 = '4e45bd3f269fe124';

function lireDecision(id: string): string[] {
  return readFileSync(join(__dirname, `../../../../../../docs/decisions/${id}.md`), 'utf8').split('\n');
}
const D539 = lireDecision('D-539');
const D545 = lireDecision('D-545');

/** Un bloc cité d'une décision, à partir de sa première ligne, sans ses chevrons (et leur retrait). */
function citationDe(decision: string[], premiere: string, retrait = ''): string {
  const ouvre = `${retrait}> `;
  const vide = `${retrait}>`;
  const debut = decision.findIndex((l) => l.startsWith(`${ouvre}${premiere}`));
  if (debut < 0) throw new Error(`citation introuvable : ${premiere}`);
  const lignes: string[] = [];
  for (let i = debut; i < decision.length; i++) {
    const l = decision[i];
    if (l === vide) lignes.push('');
    else if (l.startsWith(ouvre)) lignes.push(l.slice(ouvre.length));
    else break;
  }
  return lignes.join('\n');
}
const citation = (premiere: string, retrait = '') => citationDe(D539, premiere, retrait);
const citation545 = (premiere: string) => citationDe(D545, premiere, '   ');

/** Remplace dans `texte` chaque passage, présent une fois et une seule. */
function remplacer(texte: string, changements: [string, string][]): string {
  let r = texte;
  for (const [avant, apres] of changements) {
    expect(r.split(avant).length - 1, `passage à remplacer : ${avant.slice(0, 60)}`).toBe(1);
    r = r.replace(avant, () => apres);
  }
  return r;
}

// Les passages de D-539 que D-545 remplace : D-545 les nomme par leur texte,
// cité ici tel que D-539 l'écrit ; `remplacer` exige qu'ils y soient, une fois.
const V37_EXAMEN_DOSAGE =
  "Tu peux rappeler qu'un examen a été déclaré dans l'anamnèse, en le présentant comme une déclaration, sans en déduire de résultat ni de conclusion biologique. Tu peux aussi mentionner qu'un dosage biologique serait nécessaire pour conclure, dans les limites posées plus haut.";
const BIO_V1_INTERVALLE =
  "Ne l'appelle jamais « intervalle de référence », et n'ajoute aucune unité à son texte : cite-le tel qu'il est imprimé.";
const BIO_V1_SERIE = citation("- **Une série n'est pas une évolution.**").split('\n')[0];
const BIO_V1_OU_ECRIRE = "N'invente aucune vérification pour justifier ce choix.";

function sectionAttendueV38(): string {
  return remplacer(citation('## Résultats de biologie', '   '), [
    [V37_EXAMEN_DOSAGE, citation545("Tu peux rappeler qu'un examen a été déclaré")],
  ]);
}

function consigneBiologieAttendueV2(): string {
  return remplacer(citation('Tu restitues, pour le praticien seul'), [
    [BIO_V1_INTERVALLE, citation545("Ne l'appelle jamais « intervalle de référence ». Cite-le")],
    [BIO_V1_SERIE, citation545("- **Une série n'est pas une évolution.**")],
    [BIO_V1_OU_ECRIRE, `${BIO_V1_OU_ECRIRE} ${citation545('Reprends ce fait tel que le bloc le donne')}`],
  ]);
}

function section(): string {
  const debut = CONSIGNE.indexOf(TITRE_SECTION);
  const fin = CONSIGNE.indexOf(SECTION_SUIVANTE);
  if (debut < 0 || fin < debut) throw new Error('la section de biologie a disparu ou a changé de place');
  return CONSIGNE.slice(debut, fin).trimEnd();
}

function empreinte(texte: string): string {
  return createHash('sha256').update(texte).digest('hex').slice(0, 16);
}

describe('synthese-v38 — la section « Résultats de biologie » (D-539 §5.1, D-545 §5.1)', () => {
  it('la version est synthese-v38', () => {
    expect(VERSION_PROMPT_SYNTHESE).toBe('synthese-v38');
  });

  it('la section est, au caractère près, le texte de D-539 amendé par D-545', () => {
    expect(section()).toBe(sectionAttendueV38());
  });

  it('la section est épinglée par empreinte', () => {
    expect(empreinte(section()), 'section modifiée : le texte a été validé mot pour mot, resoumettre au responsable ; toute modification fait rejouer l’évaluation de D-545 §7').toBe(EMPREINTE_SECTION_V38);
  });

  it('elle suit la section des besoins et précède les consignes de réponse', () => {
    expect(CONSIGNE.indexOf('## Besoins mesurés et non mesurés')).toBeLessThan(CONSIGNE.indexOf(TITRE_SECTION));
    expect(CONSIGNE.indexOf(TITRE_SECTION)).toBeLessThan(CONSIGNE.indexOf(SECTION_SUIVANTE));
  });

  it('rien de la section v36 ne reste dans la consigne principale', () => {
    for (const reste of [
      '<textes_laboratoire_cites>',
      'resume_biologie_praticien',
      'points_de_vigilance_biologie',
      'Les données patient peuvent inclure un bloc « Résultats de biologie »',
      "Le contexte de prélèvement ne remplace pas l'anamnèse.",
      "seule la réception d'un bilan daté peut y être dite",
    ]) {
      expect(CONSIGNE, reste).not.toContain(reste);
    }
  });
});

describe('synthese-v38 — les retouches (D-539 §5.2 et §5.3, D-545 §5.2)', () => {
  it('le contexte anamnestique non renseigné renvoie aux blocs déterministes, sans le contexte de prélèvement', () => {
    expect(CONSIGNE).toContain("- Si le contexte anamnestique est indiqué comme non renseigné, mentionne cette limite. Appuie-toi sur les scores et les blocs déterministes effectivement transmis, dans les seules limites autorisées par leurs sections respectives.\n");
  });

  it('le ton du narratif ferme la biologie au texte patient, la puce citée par D-545, après celle des scores', () => {
    const puce = citation545("- N'écris dans narratif_patient aucune valeur");
    expect(CONSIGNE).not.toContain("- N'écris dans narratif_patient aucun nom d'analyte");
    const ton = CONSIGNE.slice(CONSIGNE.indexOf('## Ton du narratif patient'));
    const puceScores = ton.indexOf("- N'écris dans narratif_patient ni score");
    expect(puceScores).toBeGreaterThanOrEqual(0);
    expect(ton.indexOf(`${puce}\n`)).toBeGreaterThan(puceScores);
  });
});

describe('synthese-v38 — le contrat de sortie, inchangé depuis v37, schéma v4 sans les clés biologiques (D-539 §5.4)', () => {
  it('le schéma enregistré reste synthese-json-v4', () => {
    expect(VERSION_SCHEMA_SYNTHESE).toBe('synthese-json-v4');
  });

  it('le contrat ne nomme plus les deux clés, ni la phrase qui les décrivait', () => {
    expect(SYSTEM_PROMPT_CONTRAT_JSON).not.toContain('resume_biologie_praticien');
    expect(SYSTEM_PROMPT_CONTRAT_JSON).not.toContain('points_de_vigilance_biologie');
    expect(SYSTEM_PROMPT_CONTRAT_JSON.trimEnd().endsWith('}')).toBe(true);
  });

  it('le contrat est épinglé par empreinte', () => {
    expect(empreinte(SYSTEM_PROMPT_CONTRAT_JSON), 'contrat modifié : le texte a été validé mot pour mot, resoumettre au responsable').toBe(EMPREINTE_CONTRAT_V37);
  });
});

describe('synthese-biologie-v2 — la consigne du second appel (D-539 §4, D-545 §3)', () => {
  it('la version est synthese-biologie-v2', () => {
    expect(VERSION_PROMPT_SYNTHESE_BIOLOGIE).toBe('synthese-biologie-v2');
  });

  it('la consigne est, au caractère près, le texte de D-539 avec les trois changements de D-545, et eux seuls', () => {
    expect(SYSTEM_PROMPT_SYNTHESE_BIOLOGIE).toBe(consigneBiologieAttendueV2());
  });

  it('la consigne est épinglée par empreinte', () => {
    expect(empreinte(SYSTEM_PROMPT_SYNTHESE_BIOLOGIE), 'consigne modifiée : le texte a été validé mot pour mot, resoumettre au responsable ; toute modification fait rejouer l’évaluation de D-545 §7').toBe(EMPREINTE_CONSIGNE_BIOLOGIE_V2);
  });

  it('elle ne parle ni de narratif, ni du cas sans bloc (D-539 §4, puces retirées)', () => {
    expect(SYSTEM_PROMPT_SYNTHESE_BIOLOGIE).not.toContain('narratif_patient');
    expect(SYSTEM_PROMPT_SYNTHESE_BIOLOGIE).not.toContain('Si le bloc est absent');
  });

  // La relance n'est pas citée par D-539 (elle dit le format, pas la clinique),
  // mais le modèle la lit : épinglée pour qu'une retouche se voie et fasse
  // rejouer l'évaluation de D-539 §8 (revue `wn-reviewer`, P2). D-545 §4 ne
  // change pas son gabarit : il ajoute un écart à sa liste.
  it('la relance du second appel est épinglée par empreinte', () => {
    const relance = messageRelanceBiologie(['resume_biologie_praticien : chaîne non vide attendue']);
    expect(empreinte(relance), 'relance modifiée : toute modification fait rejouer l’évaluation de D-545 §7').toBe(EMPREINTE_RELANCE_BIOLOGIE_V1);
  });

  it('l’écart du contrôle ajouté à la relance est, au caractère près, le texte de D-545 §4', () => {
    expect(ECART_INTERVALLE_SUIVI_UNITE).toBe(citationDe(D545, "un intervalle imprimé est suivi d'une unité", '  '));
    expect(messageRelanceBiologie([ECART_INTERVALLE_SUIVI_UNITE])).toContain(`- ${ECART_INTERVALLE_SUIVI_UNITE}\n`);
  });
});

describe('la phrase du narratif (D-539 §5, N3)', () => {
  it('le gabarit du code est la phrase citée par la décision', () => {
    const gabarit = citation('Votre praticien a reçu votre bilan biologique du');
    expect(gabarit).toBe('Votre praticien a reçu votre bilan biologique du {date}.');
    const phrase = phraseReceptionBilan({
      texte: '## Résultats de biologie\nX — 1 prélèvement.\n- Prélevé le 2026-03-12, heure non lue : 1 u.',
      formes: { valeursUnites: [], intervalles: [] },
    });
    expect(phrase).toBe(gabarit.replace('{date}', '12 mars 2026'));
  });
});
