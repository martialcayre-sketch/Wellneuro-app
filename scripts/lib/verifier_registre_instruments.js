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
 * @returns {{erreurs: string[], sourcesEquilibre: Set<string>|null, aCompleter: number}}
 */
function verifierRegistreInstruments({
  registre,
  idsCatalogue,
  sourceIdsCorpus,
  constantsSource,
  matriceDrive,
  evidence,
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

module.exports = { verifierRegistreInstruments, extraireSourcesEquilibre };
