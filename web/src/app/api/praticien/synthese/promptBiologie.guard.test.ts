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
// et §5 (qui amende [[D-513]] §3, §4 et §6), amendés par [[D-545]] §3 et §5,
// complétés par [[D-557]] §2 et [[D-559]] §3 (`synthese-v41`, jamais servie),
// puis par [[D-563]] §3 et §4 (`synthese-v42`, jamais servie), puis par
// [[D-571]] §4 (`synthese-v43`, 2026-11-26).
// Textes validés mot pour mot par le responsable le 2026-11-18 (D-539) et le
// 2026-11-19 (D-545) : la section « Résultats de biologie » de `synthese-v38`,
// ses retouches et son contrat de sortie ; la consigne du second appel,
// `synthese-biologie-v2` ; la phrase posée par le code.
//
// LE TEXTE ATTENDU SE CONSTRUIT DES DEUX DÉCISIONS : la citation de D-539, où
// chaque passage remplacé par D-545 est cherché tel quel (une seule fois) et
// remplacé par la citation de D-545 ; puis, pour v41, les trois paragraphes de
// D-557 §2, chacun suivi du texte de D-559 §3 de même rang, et le texte 4 de
// D-559 en paragraphe neuf ; pour v42, les textes 5 et 6 de D-563 à la suite
// du texte 3 de D-559, le texte 7 en puce du narratif et l'exemple du contrat ;
// pour v43, le texte 10 à la suite du texte 1 de D-559, le texte 11 et la phrase
// qui le suit à la suite du texte 2, le texte 9 à la suite du texte 6 de D-563,
// et le texte 8 en paragraphe neuf, avant le texte 4 de D-559.
// Rien n'est recopié à la main.
//
// CE BANC NE PROUVE PAS QUE LE MODÈLE OBÉIT : il prouve qu'on ne peut plus
// toucher à ces textes sans le décider. Ce que le modèle écrit se voit par
// l'évaluation rejouée de D-539 §8 et le contrôle de contamination.

const CONSIGNE = SYSTEM_PROMPT_GOUVERNANCE;
const TITRE_SECTION = '## Résultats de biologie';
const SECTION_SUIVANTE = '## Consignes de réponse';

const EMPREINTE_SECTION_V43 = '501667127401b843';
const EMPREINTE_CONTRAT_V42 = '7d968ff7f97c6c5c';
const EMPREINTE_CONSIGNE_BIOLOGIE_V2 = 'a7a0ec27ba117fea';
const EMPREINTE_RELANCE_BIOLOGIE_V1 = '4e45bd3f269fe124';

function lireDecision(id: string): string[] {
  return readFileSync(join(__dirname, `../../../../../../docs/decisions/${id}.md`), 'utf8').split('\n');
}
const D539 = lireDecision('D-539');
const D545 = lireDecision('D-545');
const D557 = lireDecision('D-557');
const D559 = lireDecision('D-559');
const D563 = lireDecision('D-563');
const D571 = lireDecision('D-571');

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

/** Les trois paragraphes de [[D-557]] §2, sans retouche. */
function paragraphesD557(): string[] {
  const p = citationDe(D557, 'Un diagnostic, une suspicion, un traitement ou un suivi déclarés').split('\n\n');
  expect(p, 'D-557 §2 : trois paragraphes').toHaveLength(3);
  return p;
}

/** Les quatre textes de [[D-559]] §3, sans retouche (citations retirées de deux espaces). */
function textesD559(): string[] {
  const t = D559.filter((l) => l.startsWith('  > ')).map((l) => l.slice(4));
  expect(t, 'D-559 §3 : quatre textes').toHaveLength(4);
  return t;
}

/**
 * v41 ([[D-559]] §3) : après le paragraphe de D-545 §5, qui ne change pas, les
 * trois paragraphes de D-557 §2, chacun suivi, dans le même paragraphe, du
 * texte de D-559 de même rang ; puis le texte 4, paragraphe neuf, en fin de section.
 */
function sectionAttendueV41(): string {
  const p = paragraphesD557();
  const t = textesD559();
  return [sectionAttendueV38(), `${p[0]} ${t[0]}`, `${p[1]} ${t[1]}`, `${p[2]} ${t[2]}`, t[3]].join('\n\n');
}

/**
 * Les textes de [[D-563]] §3 et §4, sans retouche (citations retirées de deux
 * espaces), dans l'ordre de la décision : texte 5, texte 6, texte 7 (une puce),
 * puis l'exemple d'argument du contrat de sortie.
 */
function textesD563(): { t5: string; t6: string; t7: string; exemple: string } {
  const t = D563.filter((l) => l.startsWith('  > ')).map((l) => l.slice(4));
  expect(t, 'D-563 §3 et §4 : trois textes et un exemple').toHaveLength(4);
  expect(t[2].startsWith('- '), 'D-563 §3 : le texte 7 est une puce').toBe(true);
  expect(t[3].startsWith('"arguments": '), 'D-563 §4 : la ligne d’exemple du contrat').toBe(true);
  return { t5: t[0], t6: t[1], t7: t[2], exemple: t[3] };
}

/**
 * v42 ([[D-563]] §3) : la section de v41, où les textes 5 puis 6 de D-563
 * suivent, dans le même paragraphe, le texte 3 de D-559.
 */
function sectionAttendueV42(): string {
  const p = paragraphesD557();
  const t = textesD559();
  const { t5, t6 } = textesD563();
  return [sectionAttendueV38(), `${p[0]} ${t[0]}`, `${p[1]} ${t[1]}`, `${p[2]} ${t[2]} ${t5} ${t6}`, t[3]].join('\n\n');
}

/**
 * Les textes de [[D-571]] §4, sans retouche (citations retirées de deux
 * espaces), dans l'ordre de la décision : textes 8, 9, 10, 11, puis la phrase
 * qui suit le texte 11.
 */
function textesD571(): { t8: string; t9: string; t10: string; t11: string; phrase: string } {
  const t = D571.filter((l) => l.startsWith('  > ')).map((l) => l.slice(4));
  expect(t, 'D-571 §4 : quatre textes et une phrase').toHaveLength(5);
  expect(t[0].startsWith('Certaines passations portent le champ interpretationNonTransmise'), 'D-571 §4 : texte 8 en tête').toBe(true);
  return { t8: t[0], t9: t[1], t10: t[2], t11: t[3], phrase: t[4] };
}

/**
 * v43 ([[D-571]] §4) : la section de v42, où le texte 10 suit le texte 1 de
 * D-559, le texte 11 puis la phrase suivent le texte 2, le texte 9 suit le
 * texte 6 de D-563 (même paragraphe), et le texte 8 forme un paragraphe neuf
 * juste après, avant le texte 4 de D-559.
 */
function sectionAttendueV43(): string {
  const p = paragraphesD557();
  const t = textesD559();
  const { t5, t6 } = textesD563();
  const { t8, t9, t10, t11, phrase } = textesD571();
  return [
    sectionAttendueV38(),
    `${p[0]} ${t[0]} ${t10}`,
    `${p[1]} ${t[1]} ${t11} ${phrase}`,
    `${p[2]} ${t[2]} ${t5} ${t6} ${t9}`,
    t8,
    t[3],
  ].join('\n\n');
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

describe('synthese-v43 — la section « Résultats de biologie » (D-539 §5.1, D-545 §5.1, D-557 §2, D-559 §3, D-563 §3, D-571 §4)', () => {
  // v39 (D-543) ne touchait pas cette section ; v41 (D-559, jamais servie) y ajoutait les textes de
  // D-557 §2 et D-559 §3 ; v42 (D-563, jamais servie) les textes 5 et 6 à la suite du texte 3 de
  // D-559 ; v43 (D-571) les textes 8 à 11 et la phrase qui suit le texte 11.
  it('la version est synthese-v43', () => {
    expect(VERSION_PROMPT_SYNTHESE).toBe('synthese-v43');
  });

  it('la section est, au caractère près, le texte de D-539 amendé par D-545, suivi des textes de D-557 §2, D-559 §3, D-563 §3 et D-571 §4 à leur place', () => {
    expect(section()).toBe(sectionAttendueV43());
  });

  it('v43 (D-571 §4) : chaque texte neuf est à sa place, une seule fois ; la section de v42 n’a pas changé autrement', () => {
    const t = textesD559();
    const { t6 } = textesD563();
    const { t8, t9, t10, t11, phrase } = textesD571();
    expect(section()).toContain(`${t[0]} ${t10}\n\n`);
    expect(section()).toContain(`${t[1]} ${t11} ${phrase}\n\n`);
    expect(section()).toContain(`${t6} ${t9}\n\n${t8}\n\n${t[3]}`);
    for (const x of [t8, t9, t10, t11, phrase]) expect(CONSIGNE.split(x)).toHaveLength(2);
    const sansV43 = section()
      .replace(` ${t10}`, '')
      .replace(` ${t11} ${phrase}`, '')
      .replace(` ${t9}`, '')
      .replace(`\n\n${t8}`, '');
    expect(sansV43).toBe(sectionAttendueV42());
  });

  it('les textes 5 puis 6 de D-563 suivent, dans le même paragraphe, le texte 3 de D-559 ; la section de v41 n’a pas changé autrement', () => {
    const t = textesD559();
    const { t5, t6 } = textesD563();
    const { t8, t9, t10, t11, phrase } = textesD571();
    const v42 = section()
      .replace(` ${t10}`, '')
      .replace(` ${t11} ${phrase}`, '')
      .replace(` ${t9}`, '')
      .replace(`\n\n${t8}`, '');
    expect(v42).toContain(`${t[2]} ${t5} ${t6}\n\n`);
    expect(v42.replace(` ${t5} ${t6}`, '')).toBe(sectionAttendueV41());
  });

  it('le paragraphe de D-545 §5 reste intact et en tête ; chaque texte de D-559 suit, dans son paragraphe, celui de D-557 de même rang ; le texte 8 précède le texte 4, qui ferme la section', () => {
    const paragraphes = section().split('\n\n');
    expect(section().startsWith(`${sectionAttendueV38()}\n\n`)).toBe(true);
    const p = paragraphesD557();
    const t = textesD559();
    const { t5, t6 } = textesD563();
    const { t8, t9, t10, t11, phrase } = textesD571();
    const fin = paragraphes.slice(-5);
    const suites = [`${t[0]} ${t10}`, `${t[1]} ${t11} ${phrase}`, `${t[2]} ${t5} ${t6} ${t9}`];
    for (let i = 0; i < 3; i++) {
      expect(fin[i].startsWith(p[i]), `paragraphe ${i + 1} : D-557 en tête`).toBe(true);
      expect(fin[i].endsWith(suites[i]), `paragraphe ${i + 1} : texte ${i + 1} de D-559 et ses suites`).toBe(true);
    }
    expect(fin[3]).toBe(t8);
    expect(fin[4]).toBe(t[3]);
  });

  it('la section est épinglée par empreinte', () => {
    expect(empreinte(section()), 'section modifiée : les textes ont été validés mot pour mot, resoumettre au responsable ; toute modification fait rejouer l’appel principal en entier (D-556 §5, D-571 §5)').toBe(EMPREINTE_SECTION_V43);
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

  it('v42 (D-563 §3) : le texte 7 est une puce neuve, juste après celle de D-545 §5 (2), qui ne change pas', () => {
    const puce = citation545("- N'écris dans narratif_patient aucune valeur");
    const { t7 } = textesD563();
    const ton = CONSIGNE.slice(CONSIGNE.indexOf('## Ton du narratif patient'));
    expect(ton).toContain(`${puce}\n${t7}\n`);
    expect(CONSIGNE.split(t7)).toHaveLength(2);
  });
});

describe('synthese-v43 — le contrat de sortie, inchangé depuis v42, schéma v4 sans les clés biologiques (D-539 §5.4), exemple d’argument de D-563 §4', () => {
  it('le schéma enregistré reste synthese-json-v4', () => {
    expect(VERSION_SCHEMA_SYNTHESE).toBe('synthese-json-v4');
  });

  it('le contrat ne nomme plus les deux clés, ni la phrase qui les décrivait', () => {
    expect(SYSTEM_PROMPT_CONTRAT_JSON).not.toContain('resume_biologie_praticien');
    expect(SYSTEM_PROMPT_CONTRAT_JSON).not.toContain('points_de_vigilance_biologie');
    expect(SYSTEM_PROMPT_CONTRAT_JSON.trimEnd().endsWith('}')).toBe(true);
  });

  it('l’exemple d’argument est celui de D-563 §4, à sa ligne ; l’ancien a disparu', () => {
    const { exemple } = textesD563();
    expect(SYSTEM_PROMPT_CONTRAT_JSON).toContain(`\n      ${exemple}\n      "points_a_confirmer": [`);
    expect(SYSTEM_PROMPT_CONTRAT_JSON).not.toContain('Interprétation Y');
  });

  it('le contrat est épinglé par empreinte', () => {
    expect(empreinte(SYSTEM_PROMPT_CONTRAT_JSON), 'contrat modifié : le texte a été validé mot pour mot, resoumettre au responsable').toBe(EMPREINTE_CONTRAT_V42);
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
