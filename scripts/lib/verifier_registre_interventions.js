// Validateur du registre des sources d'intervention NNPP2.
// Banc : node --test scripts/lib/verifier_registre_interventions.test.mjs
//
// Ce que ce garde protège, et ce qu'il ne prétend PAS protéger :
//
// - Il protège la COHÉRENCE du registre avec les deux registres voisins
//   (`source_registry.json`, `instrument_registry.json`) et l'honnêteté de ses
//   propres statuts.
// - Il ne confronte JAMAIS les compteurs de claims à la base : le CI n'a pas
//   d'accès production, et un compteur périmé ne doit pas rougir le CI. C'est
//   `claims.mesureLe` qui porte l'information de fraîcheur, pas le garde.
//
// Patron repris de `verifier_registre_instruments.js` : module pur, rend
// `{ erreurs, ... }`, l'appelant assère `erreurs === []`.

const AXES_CANONIQUES = new Set([
  'fondements-12-besoins',
  'sommeil-chronobiologie',
  'stress-burnout',
  'humeur',
  'cognition-memoire',
  'douleurs-chroniques',
  'intestin-cerveau',
  'biologie-fonctionnelle',
  'nutrition-aliments',
  'micronutrition-complements',
  'cas-complexes',
  'audit-contradictions',
  'instruments-cabinet',
]);

const STATUTS = new Set(['complet', 'partiel', 'aucun', 'sans_claim']);
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// `statutValidation` est DÉRIVÉ des compteurs. Le garde le recalcule au lieu de
// faire confiance à la valeur écrite : un statut saisi à la main finit toujours
// par mentir sur ses compteurs.
function statutAttendu(valide, enAttente) {
  if (valide + enAttente === 0) return 'sans_claim';
  if (enAttente === 0) return 'complet';
  return valide === 0 ? 'aucun' : 'partiel';
}

function verifierRegistreInterventions({ registre, notices, instruments }) {
  const erreurs = [];
  const ajouter = (condition, message) => {
    if (!condition) erreurs.push(message);
  };

  const interventions = Array.isArray(registre?.interventions) ? registre.interventions : null;
  const ecartees = Array.isArray(registre?.ecartees) ? registre.ecartees : null;
  if (!interventions || !ecartees) {
    return {
      erreurs: ['nnpp2_interventions_registry.json : `interventions` et `ecartees` doivent être des tableaux'],
      retenues: 0,
      ecartees: 0,
      claims: null,
    };
  }

  // Un registre vide passerait tous les contrôles par vacuité — c'est le faux
  // vert le plus bête, et le seul qu'aucune boucle n'attrape.
  ajouter(interventions.length > 0, 'registre des interventions vide — aucun contrôle ne peut être concluant');

  const parSource = new Map((Array.isArray(notices) ? notices : []).map(n => [n.sourceId, n]));
  ajouter(parSource.size > 0, 'source_registry.json vide ou illisible — le contrôle de référence croisée ne peut pas rester muet');

  // Sources déjà rattachées à un instrument : elles relèvent du banc `certify`,
  // pas de la chaîne de claims. La disjonction est mesurée nulle au 2026-08-03 ;
  // ce garde la maintient.
  const sourcesInstruments = new Set();
  for (const instrument of Array.isArray(instruments) ? instruments : []) {
    for (const sourceId of instrument?.sourceIds || []) sourcesInstruments.add(sourceId);
  }
  ajouter(
    sourcesInstruments.size > 0,
    'aucun sourceId rattaché dans instrument_registry.json — le contrôle de disjonction serait vide de sens',
  );

  const vus = new Set();
  let valide = 0;
  let enAttente = 0;
  let prescriptifs = 0;

  interventions.forEach(entree => {
    const id = entree?.sourceId;
    const ou = id || '(sourceId manquant)';

    ajouter(typeof id === 'string' && id.length > 0, 'entrée sans sourceId');
    ajouter(!vus.has(id), `${ou} : sourceId en double dans interventions`);
    if (id) vus.add(id);

    ajouter(AXES_CANONIQUES.has(entree?.axeId), `${ou} : axeId hors table canonique (${entree?.axeId})`);
    ajouter(
      entree?.sousAxe === null || (typeof entree?.sousAxe === 'string' && KEBAB.test(entree.sousAxe)),
      `${ou} : sousAxe doit être null ou un slug kebab-case (${entree?.sousAxe})`,
    );
    ajouter(
      typeof entree?.tableauClinique === 'string' && entree.tableauClinique.trim().length > 0,
      `${ou} : tableauClinique vide — une entrée sans tableau clinique ne désigne rien`,
    );

    // Référence croisée : l'entrée doit exister, et ne pas avoir dérivé.
    const notice = id ? parSource.get(id) : undefined;
    if (!notice) {
      erreurs.push(`${ou} : sourceId absent de source_registry.json`);
    } else {
      ajouter(
        entree.notebook === notice.primaryNotebook,
        `${ou} : notebook divergent du registre sanitaire (registre « ${entree.notebook} » ≠ source « ${notice.primaryNotebook} »)`,
      );
      ajouter(
        entree.documentType === notice.documentType,
        `${ou} : documentType divergent du registre sanitaire (registre « ${entree.documentType} » ≠ source « ${notice.documentType} »)`,
      );
      ajouter(
        !String(notice.primaryNotebook || '').startsWith('00'),
        `${ou} : notebook 00 — exclu du RAG clinique par la décision du 2026-07-26, il n'a rien à faire dans la couche intervention`,
      );
    }

    ajouter(
      !sourcesInstruments.has(id),
      `${ou} : source déjà rattachée à un instrument d'instrument_registry.json — elle relève du banc certify, pas de la chaîne de claims`,
    );

    const compteurs = entree?.claims;
    const v = compteurs?.valide;
    const a = compteurs?.enAttente;
    const p = compteurs?.prescriptifs;
    const entierPositif = n => Number.isInteger(n) && n >= 0;
    ajouter(
      entierPositif(v) && entierPositif(a) && entierPositif(p),
      `${ou} : claims.valide / enAttente / prescriptifs doivent être des entiers positifs`,
    );
    ajouter(
      typeof compteurs?.mesureLe === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(compteurs.mesureLe),
      `${ou} : claims.mesureLe manquant ou mal formé — sans date, un compteur ne dit pas s'il est frais`,
    );
    if (entierPositif(v) && entierPositif(a) && entierPositif(p)) {
      ajouter(
        p <= v + a,
        `${ou} : plus de claims prescriptifs (${p}) que de claims tout court (${v + a})`,
      );
      ajouter(
        entree.statutValidation === statutAttendu(v, a),
        `${ou} : statutValidation « ${entree.statutValidation} » contredit les compteurs (attendu « ${statutAttendu(v, a)} » pour ${v} validés / ${a} en attente)`,
      );
      valide += v;
      enAttente += a;
      prescriptifs += p;
    }
    ajouter(STATUTS.has(entree?.statutValidation), `${ou} : statutValidation inconnu (${entree?.statutValidation})`);

    // Un zéro sans motif se lit comme un oubli d'extraction — or c'est
    // exactement la signature du 529 silencieux de draft.mjs.
    if (entree?.statutValidation === 'sans_claim') {
      ajouter(
        typeof entree?.motifSansClaim === 'string' && entree.motifSansClaim.trim().length > 0,
        `${ou} : sans_claim sans motifSansClaim — un zéro non motivé est indistinguable d'une extraction ratée`,
      );
    } else {
      ajouter(
        entree?.motifSansClaim === undefined,
        `${ou} : motifSansClaim présent alors que la source porte des claims`,
      );
    }
  });

  ecartees.forEach(entree => {
    const ou = entree?.sourceId || '(sourceId manquant)';
    ajouter(typeof entree?.sourceId === 'string' && entree.sourceId.length > 0, 'écartée sans sourceId');
    ajouter(
      typeof entree?.motif === 'string' && entree.motif.trim().length > 0,
      `${ou} : écartée sans motif — critère de done du LOT-00`,
    );
    ajouter(
      !vus.has(entree?.sourceId),
      `${ou} : source à la fois retenue et écartée`,
    );
  });

  const idsEcartees = ecartees.map(e => e?.sourceId);
  ajouter(
    new Set(idsEcartees).size === idsEcartees.length,
    'sourceId en double dans ecartees',
  );

  return {
    erreurs,
    retenues: interventions.length,
    ecartees: ecartees.length,
    claims: { valide, enAttente, prescriptifs },
  };
}

module.exports = { verifierRegistreInterventions, statutAttendu, AXES_CANONIQUES };
