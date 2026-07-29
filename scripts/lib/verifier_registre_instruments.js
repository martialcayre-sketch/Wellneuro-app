'use strict';

// Validation du registre de certification des instruments (campagne
// 2026-07-25-certification-corpus-questionnaires, lot 1).
//
// Fonction PURE, sans accès disque : c'est ce qui la rend testable
// (`verifier_registre_instruments.test.mjs`). Le script appelant
// (`check_questionnaire_certification.js`) lit les fichiers et convertit les
// erreurs retournées en échec bloquant.

const STATUTS_BIBLIO = new Set(['reference_identifiee', 'a_completer', 'referentiel_interne_siin']);
const STATUTS_CERTIFICATION = new Set([
  'repere', 'source_obtenue', 'droits_verifies', 'contenu_verrouille', 'scoring_verifie',
  'psychometrie_revue', 'mapping_clinique_approuve', 'publie', 'suspendu', 'remplace',
]);
const STATUTS_DROITS = new Set(['a_verifier', 'libre', 'licence_requise', 'permission_obtenue', 'restreint']);

// L'échelle de certification, DANS L'ORDRE. Sert au contrôle de cohérence : un
// barreau ne vaut que si les pièces des barreaux d'en dessous sont au dossier.
// `suspendu` et `remplace` sont terminaux et hors échelle — volontairement absents.
const ECHELLE = [
  'repere', 'source_obtenue', 'droits_verifies', 'contenu_verrouille',
  'scoring_verifie', 'psychometrie_revue', 'mapping_clinique_approuve', 'publie',
];
// `licence_requise` et `restreint` sont des verdicts VÉRIFIÉS, mais négatifs : ils
// constatent qu'un droit manque. Ils ne dégagent donc pas l'usage.
const DROITS_DEGAGES = new Set(['libre', 'permission_obtenue']);
// Une date de vérification doit être une date. `Boolean()` acceptait « à faire », et
// un simple motif `\d{4}-\d{2}-\d{2}` acceptait « 2026-13-45 » : on relit la date
// rendue par `Date` pour refuser un mois 13 ou un 30 février.
const ETATS_TERMINAUX = new Set(['suspendu', 'remplace']);
function estUneDate(valeur) {
  if (typeof valeur !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valeur)) return false;
  const date = new Date(`${valeur}T00:00:00Z`);
  // `2026-13-45` rend un temps invalide, et `toISOString()` lève alors plutôt que de
  // rendre false : sans ce test, le garde faisait tomber le CI au lieu de refuser.
  if (Number.isNaN(date.getTime())) return false;
  return date.toISOString().slice(0, 10) === valeur;
}
const STATUTS_CONTENU = new Set(['verbatim', 'traduit', 'adapte', 'cree_localement', 'a_auditer']);
const COSMIN = new Set(['A', 'B', 'C', 'inconnu']);
const PROPRIETES_PSYCHOMETRIQUES = new Set([
  'validite_contenu', 'structure_interne', 'coherence_interne', 'fidelite', 'erreur_mesure',
  'validite_construit', 'sensibilite_changement', 'mdc', 'mcid',
]);

/**
 * Extrait les questionnaires sources de Mon Équilibre depuis le SEUL bloc
 * `BESOIN_SOURCES` de `equilibre/constants.ts`. Scoper au bloc est ce qui
 * évite qu'une future structure du même fichier (noyau d'ancrage momentum,
 * par exemple) soit comptée par erreur comme une source de l'indice.
 * Retourne null si le bloc est introuvable — un garde muet vaut un échec.
 */
function extraireSourcesEquilibre(constantsSource) {
  const debut = constantsSource.indexOf('BESOIN_SOURCES');
  if (debut === -1) return null;
  const fin = constantsSource.indexOf('\n};', debut);
  if (fin === -1) return null;
  const bloc = constantsSource.slice(debut, fin);
  return new Set([...bloc.matchAll(/idQuestionnaire:\s*'([A-Za-z0-9_]+)'/g)].map(m => m[1]));
}

/**
 * Extrait les instruments retirés de la production (`actif: false`) depuis le
 * catalogue servi. Même parti que `extraireSourcesEquilibre` : lire la source de
 * vérité plutôt que recopier une liste qui divergerait en silence. Retourne null
 * si rien n'est trouvé — un garde muet vaut un échec.
 */
/**
 * Neutralise commentaires et contenus de chaîne, en préservant les positions et les
 * sauts de ligne. Écrit après TROIS extractions fausses le 2026-07-29 : un découpage
 * par accolades qui ratait les entrées fermées en fin de ligne, puis un rattachement
 * qui comptait les `actif: false` cités en prose dans un commentaire, puis les mêmes
 * cités dans une description. Un filtre ligne à ligne ne voit ni le commentaire en
 * fin de ligne, ni la chaîne — il faut suivre l'état.
 */
function neutraliser(source, { chaines }) {
  let out = '';
  let i = 0;
  let guillemet = null;
  while (i < source.length) {
    const c = source[i];
    const suivant = source[i + 1];
    if (guillemet) {
      if (c === '\\') { out += chaines ? '  ' : source.slice(i, i + 2); i += 2; continue; }
      if (c === guillemet) { guillemet = null; out += c; i++; continue; }
      out += chaines ? (c === '\n' ? '\n' : ' ') : c;
      i++;
      continue;
    }
    if (c === '/' && suivant === '/') {
      while (i < source.length && source[i] !== '\n') { out += ' '; i++; }
      continue;
    }
    if (c === '/' && suivant === '*') {
      out += '  '; i += 2;
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) {
        out += source[i] === '\n' ? '\n' : ' ';
        i++;
      }
      out += '  '; i += 2;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { guillemet = c; out += c; i++; continue; }
    out += c;
    i++;
  }
  return out;
}

function extraireIdsSuspendus(catalogueSource) {
  if (!catalogueSource || !catalogueSource.includes('actif')) return null;
  // Deux passes de MÊME LONGUEUR, donc d'indices comparables : la première efface
  // aussi le contenu des chaînes — ce qui neutralise un `actif: false` cité dans une
  // description, mais effacerait les identifiants ; la seconde les préserve.
  const sansChaines = neutraliser(catalogueSource, { chaines: true });
  const avecChaines = neutraliser(catalogueSource, { chaines: false });
  // Chaque `actif: false` est rattaché au dernier `id:` qui le précède, plutôt que
  // découpé par accolades : le découpage dépendait de la mise en forme du fichier,
  // et une entrée fermée en fin de ligne lui échappait en silence.
  const marqueurs = [...sansChaines.matchAll(/actif:\s*false/g)];
  const ids = [];
  for (const marqueur of marqueurs) {
    const avant = sansChaines.slice(0, marqueur.index);
    const dernierId = [...avecChaines.slice(0, marqueur.index).matchAll(/id:\s*'(Q_[A-Z]{3}_\d{2})'/g)].pop();
    if (!dernierId) continue;
    // Une accolade fermante entre l'identifiant et le marqueur veut dire qu'ils
    // appartiennent à deux entrées différentes — cas d'un `actif` déclaré AVANT
    // l'`id`, que TypeScript autorise. Rattacher malgré tout déclarerait suspendu un
    // instrument actif ET manquerait le vrai suspendu, sans un bruit.
    if (avant.slice(dernierId.index).includes('}')) continue;
    ids.push(dernierId[1]);
  }
  // Un `actif: false` non rattachable veut dire que la forme du catalogue a changé :
  // mieux vaut rendre le garde bruyant que borgne.
  if (ids.length !== marqueurs.length) return null;
  return new Set(ids);
}

/**
 * @returns {{erreurs: string[], sourcesEquilibre: Set<string>|null, aCompleter: number}}
 */
function verifierRegistreInstruments({
  registre,
  idsCatalogue,
  sourceIdsCorpus,
  constantsSource,
  matriceDrive,
  evidence,
  catalogueSource,
}) {
  const erreurs = [];
  const ajouter = (condition, message) => {
    if (!condition) erreurs.push(message);
  };

  const instruments = Array.isArray(registre?.instruments) ? registre.instruments : null;
  if (!instruments) {
    return { erreurs: ['instrument_registry.json : `instruments` doit être un tableau'], sourcesEquilibre: null, aCompleter: 0 };
  }

  const registryIds = instruments.map(entry => entry.questionnaireId);
  ajouter(new Set(registryIds).size === registryIds.length, 'instrument_registry contient un doublon questionnaireId');
  idsCatalogue
    .filter(id => !registryIds.includes(id))
    .forEach(id => erreurs.push(`${id} : questionnaire du catalogue absent d'instrument_registry.json`));
  registryIds
    .filter(id => !idsCatalogue.includes(id))
    .forEach(id => erreurs.push(`${id} : entrée d'instrument_registry sans questionnaire correspondant au catalogue`));

  const sourcesEquilibre = extraireSourcesEquilibre(constantsSource);
  if (!sourcesEquilibre) {
    erreurs.push('BESOIN_SOURCES introuvable dans equilibre/constants.ts — le contrôle sourceMonEquilibre ne peut pas être muet');
  } else if (sourcesEquilibre.size === 0) {
    erreurs.push('BESOIN_SOURCES extrait mais vide — extraction cassée, contrôle sourceMonEquilibre non fiable');
  }

  // Instruments pour lesquels une preuve psychométrique est au dossier — calculé
  // avant la boucle, le barreau `psychometrie_revue` en dépendant.
  const idsAvecPreuve = new Set(
    (Array.isArray(evidence?.etudes) ? evidence.etudes : []).map(etude => etude.questionnaireId)
  );

  const idsSuspendus = extraireIdsSuspendus(catalogueSource);
  if (!idsSuspendus) {
    erreurs.push('instruments suspendus introuvables dans le catalogue — le contrôle registre ↔ actif:false ne peut pas rester muet');
  }

  instruments.forEach(entry => {
    const id = entry.questionnaireId;
    ajouter(STATUTS_BIBLIO.has(entry.statutBibliographique), `${id} : statutBibliographique inconnu (${entry.statutBibliographique})`);
    ajouter(STATUTS_CERTIFICATION.has(entry.statutCertification), `${id} : statutCertification inconnu (${entry.statutCertification})`);
    ajouter(STATUTS_DROITS.has(entry.droits?.statut), `${id} : droits.statut inconnu (${entry.droits?.statut})`);
    ajouter(COSMIN.has(entry.cosmin), `${id} : cosmin inconnu (${entry.cosmin})`);
    ajouter(STATUTS_CONTENU.has(entry.versionServie?.statutContenu), `${id} : versionServie.statutContenu inconnu (${entry.versionServie?.statutContenu})`);

    // Champs structurants obligatoires : un axe absent se lit comme un axe
    // vide, et un axe vide se lit comme « rien à signaler ».
    ajouter(typeof entry.instrument?.nomOfficiel === 'string' && entry.instrument.nomOfficiel.length > 0, `${id} : instrument.nomOfficiel manquant`);
    ajouter(entry.references !== undefined && entry.references !== null, `${id} : bloc references manquant`);
    ajouter(entry.politiqueSuivi !== undefined && entry.politiqueSuivi !== null, `${id} : bloc politiqueSuivi manquant`);
    ajouter(typeof entry.sourceMonEquilibre === 'boolean', `${id} : sourceMonEquilibre doit être un booléen`);
    ajouter(Array.isArray(entry.sourceIds), `${id} : sourceIds doit être un tableau`);

    // Tant que le contenu servi n'est pas verrouillé par le banc, le registre
    // ne doit rien affirmer sur ce que l'application administre.
    if (entry.versionServie?.statutContenu === 'a_auditer') {
      ajouter(
        entry.versionServie.description === null || entry.versionServie.description === undefined,
        `${id} : versionServie.description affirmée alors que le contenu servi reste 'a_auditer'`
      );
    }

    // Cohérence de l'échelle de certification. Le contrôle de vocabulaire plus
    // haut vérifie que `statutCertification` est une valeur connue — il accepte
    // donc `publie` sur une entrée restée `a_verifier`. Un barreau que les pièces
    // ne portent pas est précisément ce que la campagne cherche à empêcher.
    // `indexOf` rend -1 pour `suspendu`/`remplace` : les états terminaux sont
    // exemptés sans avoir à être énumérés.
    const barreau = ECHELLE.indexOf(entry.statutCertification);

    // Un instrument retiré de la production n'est pas en cours de certification :
    // l'échelle a deux états terminaux pour cela. Sans ce contrôle, un instrument
    // désactivé continue de gravir les barreaux — et `Q_SOM_07`, dont #418 a établi
    // que le servi n'est pas l'instrument qu'il nomme, se retrouvait avec son
    // contenu « verrouillé ».
    // Les DEUX sens. Le contrôle à sens unique laissait passer la réactivation, que
    // `questionnaires-catalog.ts` annonce noir sur blanc pour Q_SOM_07 : l'instrument
    // serait revenu en production en gardant `suspendu`, donc dispensé de source, de
    // droits, de contenu et de verdict — hors échelle, et le CI muet.
    if (idsSuspendus) {
      if (idsSuspendus.has(id)) {
        ajouter(
          ETATS_TERMINAUX.has(entry.statutCertification),
          `${id} : retiré de la production (actif: false) mais statutCertification '${entry.statutCertification}' — attendu 'suspendu' ou 'remplace'`
        );
      } else if (ETATS_TERMINAUX.has(entry.statutCertification) && idsCatalogue.includes(id)) {
        ajouter(
          false,
          `${id} : statutCertification '${entry.statutCertification}' alors que l'instrument est ACTIF au catalogue — une réactivation doit reprendre l'échelle à 'repere'`
        );
      }
    }

    if (barreau >= ECHELLE.indexOf('source_obtenue')) {
      // Un instrument créé localement n'a par construction aucune source externe.
      // Lui en exiger une le bloquerait à `repere` pour toujours.
      ajouter(
        (entry.sourceIds ?? []).length > 0 || entry.versionServie?.statutContenu === 'cree_localement',
        `${id} : statutCertification '${entry.statutCertification}' sans aucune source au dossier (sourceIds vide)`
      );
    }
    if (barreau >= ECHELLE.indexOf('droits_verifies')) {
      ajouter(
        DROITS_DEGAGES.has(entry.droits?.statut) && estUneDate(entry.droits?.dateVerification),
        `${id} : statutCertification '${entry.statutCertification}' alors que les droits ne sont pas dégagés `
        + `(droits.statut ${entry.droits?.statut}, dateVerification ${entry.droits?.dateVerification ?? 'absente'})`
      );
    }
    if (barreau >= ECHELLE.indexOf('contenu_verrouille')) {
      ajouter(
        entry.versionServie?.statutContenu !== 'a_auditer',
        `${id} : statutCertification '${entry.statutCertification}' alors que le contenu servi reste 'a_auditer'`
      );
    }
    // Un verdict de banc mal formé est une erreur PARTOUT, pas seulement là où il
    // sert de pièce : inscrit sous le barreau, il passait sans contrôle et devenait
    // vrai le jour de la montée.
    const v = entry.verdictScoring;
    if (v != null) {
      ajouter(
        typeof v.banc === 'string' && v.banc.length > 0
        && estUneDate(v.date)
        && Number.isInteger(v.divergencesCritiques) && v.divergencesCritiques >= 0,
        `${id} : verdictScoring mal formé (banc ${JSON.stringify(v.banc)}, date ${JSON.stringify(v.date)}, `
        + `divergencesCritiques ${JSON.stringify(v.divergencesCritiques)})`
      );
    }
    if (barreau >= ECHELLE.indexOf('scoring_verifie')) {
      // La pièce de ce barreau-là : le verdict du banc, INSCRIT AU REGISTRE. Sans
      // lui, le critère ne vivait que dans un fichier hors dépôt, sur une machine —
      // ni rejouable, ni relisible en revue.
      ajouter(
        v != null && v.divergencesCritiques === 0,
        `${id} : statutCertification '${entry.statutCertification}' sans verdict de banc exploitable `
        + `(verdictScoring ${v == null ? 'absent' : `divergencesCritiques ${v.divergencesCritiques}`})`
      );
    }
    if (barreau >= ECHELLE.indexOf('psychometrie_revue')) {
      ajouter(
        idsAvecPreuve.has(id),
        `${id} : statutCertification '${entry.statutCertification}' sans aucune preuve psychométrique au dossier`
      );
    }

    // Une date de vérification sans vérificateur (et l'inverse) est une
    // traçabilité incomplète.
    const { dateVerification, verifiePar } = entry.references ?? {};
    ajouter(
      (dateVerification === null || dateVerification === undefined) === (verifiePar === null || verifiePar === undefined),
      `${id} : references.dateVerification et references.verifiePar doivent être renseignés ensemble`
    );

    (entry.sourceIds ?? []).forEach(sourceId => {
      ajouter(sourceIdsCorpus.has(sourceId), `${id} : sourceId ${sourceId} absent de source_registry.json`);
    });

    if (sourcesEquilibre) {
      ajouter(
        entry.sourceMonEquilibre === sourcesEquilibre.has(id),
        `${id} : sourceMonEquilibre incohérent avec BESOIN_SOURCES`
      );
    }

    // Le registre et la matrice Drive doivent désigner le même fichier source.
    if (typeof entry.driveMd === 'string' && entry.driveMd.length > 0) {
      ajouter(matriceDrive.includes(entry.driveMd), `${id} : driveMd ${entry.driveMd} absent de docs/questionnaires-drive-mapping.md`);
    }
  });

  const etudes = Array.isArray(evidence?.etudes) ? evidence.etudes : null;
  if (!etudes) {
    erreurs.push('measurement_evidence.json : `etudes` doit être un tableau');
  } else {
    etudes.forEach((etude, index) => {
      ajouter(registryIds.includes(etude.questionnaireId), `measurement_evidence[${index}] : questionnaireId inconnu (${etude.questionnaireId})`);
      ajouter(PROPRIETES_PSYCHOMETRIQUES.has(etude.propriete), `measurement_evidence[${index}] : propriete inconnue (${etude.propriete})`);
      ajouter(COSMIN.has(etude.conclusionCosmin), `measurement_evidence[${index}] : conclusionCosmin inconnue (${etude.conclusionCosmin})`);
      // Une preuve sans référence vérifiable n'est pas une preuve.
      ajouter(
        Boolean(etude.doi || etude.pmid || etude.sourceId),
        `measurement_evidence[${index}] : au moins une référence (doi, pmid ou sourceId) est requise`
      );
      if (etude.sourceId) {
        ajouter(sourceIdsCorpus.has(etude.sourceId), `measurement_evidence[${index}] : sourceId ${etude.sourceId} absent de source_registry.json`);
      }
    });
  }

  const aCompleter = instruments.filter(entry => entry.statutBibliographique === 'a_completer').length;
  return { erreurs, sourcesEquilibre, aCompleter };
}

module.exports = { verifierRegistreInstruments, extraireSourcesEquilibre, extraireIdsSuspendus };
