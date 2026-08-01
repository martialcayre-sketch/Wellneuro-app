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

/**
 * Extrait les instruments à PASSATION PRATICIEN depuis `bibliotheque.ts`.
 *
 * `actif: false` porte deux sens que rien ne distinguait, et le contrôle plus
 * bas les confondait :
 *   · « retiré de la production » — un instrument fermé, qu'on ne sert plus ;
 *   · « jamais destiné au patient » — un test administré PAR LE CLINICIEN, dont
 *     l'absence du portail est l'état normal et permanent.
 *
 * Confondre les deux avait une conséquence structurelle : `Q_GEO_04` (MMSE) et
 * `Q_NEU_06` (MMT) portent une entrée de catalogue inactive posée EXPRÈS par
 * #460 pour fermer la route d'assignation — et se retrouvaient de ce fait
 * épinglés à un état terminal, donc **incapables de gravir l'échelle pour
 * toujours**. Les quatre autres instruments de consultation (`Q_GEO_03/05/06`,
 * `Q_URO_02`) n'y échappaient que parce qu'ils n'ont AUCUNE entrée de
 * catalogue — c'est-à-dire par la position « invisible et assignable » que #460
 * a précisément fermée. L'échappatoire était le trou.
 *
 * Même discipline d'extraction que ci-dessus : `null` = erreur bruyante, jamais
 * un silence. Un garde qui ne lit plus rien ne garde rien.
 */
function extrairePassationPraticien(bibliothequeSource) {
  if (!bibliothequeSource || !bibliothequeSource.includes('PASSATION_PRATICIEN')) return null;
  const sansChaines = neutraliser(bibliothequeSource, { chaines: true });
  const debut = sansChaines.indexOf('PASSATION_PRATICIEN');
  if (debut === -1) return null;
  const fin = sansChaines.indexOf('\n];', debut);
  if (fin === -1) return null;
  // Les chaînes sont préservées sur la seconde passe, de mêmes indices : c'est
  // elle qui porte les identifiants, la première ne sert qu'à délimiter le bloc
  // sans se laisser prendre par un `];` cité en commentaire.
  const bloc = neutraliser(bibliothequeSource, { chaines: false }).slice(debut, fin);
  const ids = [...bloc.matchAll(/id:\s*'(Q_[A-Z]{3}_\d{2})'/g)].map(m => m[1]);
  return ids.length > 0 ? new Set(ids) : null;
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
  bibliothequeSource,
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

  const idsPassationPraticien = extrairePassationPraticien(bibliothequeSource);
  if (!idsPassationPraticien) {
    erreurs.push('PASSATION_PRATICIEN introuvable dans bibliotheque.ts — l\'exemption des instruments de consultation ne peut pas rester muette');
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
      // L'EXEMPTION, et son seul sens. Un instrument listé en
      // `PASSATION_PRATICIEN` n'est pas « retiré » : il est administré par le
      // clinicien, et son absence du portail patient est sa forme normale. Son
      // `actif: false` ferme la route d'assignation — c'est le geste de #460, et
      // il reste entier ; il ne dit rien de sa certification.
      //
      // L'exemption ne vaut QUE dans ce sens. Un instrument de consultation
      // reste tenu par tout le reste de l'échelle : source, droits, contenu
      // verrouillé, verdict de banc. Il gagne le droit de gravir, pas celui de
      // sauter un barreau.
      const enConsultation = idsPassationPraticien ? idsPassationPraticien.has(id) : false;
      if (idsSuspendus.has(id) && !enConsultation) {
        ajouter(
          ETATS_TERMINAUX.has(entry.statutCertification),
          `${id} : retiré de la production (actif: false) mais statutCertification '${entry.statutCertification}' — attendu 'suspendu' ou 'remplace'`
        );
      } else if (!idsSuspendus.has(id) && ETATS_TERMINAUX.has(entry.statutCertification) && idsCatalogue.includes(id)) {
        ajouter(
          false,
          `${id} : statutCertification '${entry.statutCertification}' alors que l'instrument est ACTIF au catalogue — une réactivation doit reprendre l'échelle à 'repere'`
        );
      }
    }

    // LA CONTREPARTIE DE L'EXEMPTION, sans laquelle elle rouvrirait le trou
    // qu'elle ferme.
    //
    // Exempter les instruments de consultation de la règle « actif: false ⟹
    // terminal » les sortait des DEUX contrôles à la fois : inscrire un
    // identifiant dans `PASSATION_PRATICIEN` serait devenu le moyen de servir un
    // instrument en consultation tout en le laissant `suspendu`, c'est-à-dire
    // dispensé de source, de droits, de contenu verrouillé et de verdict.
    //
    // C'est le reproche exact adressé le 2026-07-31 à une exemption écrite pour
    // ce même `Q_NEU_06` : « à double sens, elle rouvre le trou qu'elle ferme ».
    // Un instrument servi en consultation EST en production ; son état ne peut
    // donc pas être terminal.
    if (idsPassationPraticien && idsPassationPraticien.has(id)) {
      ajouter(
        !ETATS_TERMINAUX.has(entry.statutCertification),
        `${id} : servi en passation praticien (PASSATION_PRATICIEN) alors que statutCertification `
        + `est '${entry.statutCertification}' — un instrument administré en consultation est en `
        + `production : le retirer de cette liste, ou lui faire reprendre l'échelle`
      );
      // ET UN PLANCHER, sans quoi la contrepartie ci-dessus ne vaut rien.
      //
      // Interdire les deux états terminaux ne posait AUCUNE exigence : tous les
      // contrôles de pièces sont conditionnés à `barreau >= …`, et à `repere`
      // aucun n'est armé. Un instrument pouvait donc être servi en consultation,
      // affiché au rayon et livrer son verbatim intégral sans source, sans
      // droits vérifiés, sans contenu verrouillé et sans verdict de banc — le CI
      // restant vert. Mesuré par mutation le 2026-07-31, sur les deux entrées
      // que ce lot fait monter.
      //
      // Le plancher est `contenu_verrouille` et non `scoring_verifie` : ce qui
      // est publié en consultation, c'est le VERBATIM des items. Exiger que le
      // contenu servi soit verrouillé est exactement ce qui correspond à ce que
      // cette surface expose.
      ajouter(
        ECHELLE.indexOf(entry.statutCertification) >= ECHELLE.indexOf('contenu_verrouille'),
        `${id} : servi en passation praticien alors que statutCertification est `
        + `'${entry.statutCertification}' — cette surface publie le VERBATIM des items, elle `
        + `exige donc au moins 'contenu_verrouille'`
      );
    }

    // `reference_identifiee` DOIT DÉSIGNER QUELQUE CHOSE.
    //
    // Le statut n'était qu'un mot d'un vocabulaire fermé : rien n'obligeait
    // l'entrée à nommer la référence qu'elle prétend avoir identifiée. Une
    // montée de `a_completer` à `reference_identifiee` pouvait donc être
    // purement déclarative — exactement le reproche fait au VQ11 le 2026-07-30,
    // et à `Q_NEU_06` le 2026-07-31, dont tous les champs d'identification
    // restaient à `null` pendant que l'étiquette changeait.
    //
    // Le seuil est volontairement bas : UN champ suffit. On exige que la
    // référence soit désignable, pas qu'elle soit publiée à comité de lecture —
    // un gabarit strict serait contourné par un gabarit vide.
    if (entry.statutBibliographique === 'reference_identifiee') {
      // `valeur != null` ne suffisait pas : `0`, `false`, `[]` et `{}` passaient
      // tous. `anneePublication: 0` ou `auteurs: []` sont des vecteurs
      // réalistes — un champ vide qui satisfait un garde est pire qu'un champ
      // absent, puisqu'il éteint l'alerte au lieu de la déclencher.
      const nonVide = valeur => {
        if (valeur === null || valeur === undefined) return false;
        if (typeof valeur === 'string') return valeur.trim().length > 0;
        if (typeof valeur === 'number') return Number.isFinite(valeur) && valeur > 0;
        if (Array.isArray(valeur)) return valeur.length > 0;
        if (typeof valeur === 'boolean') return false;
        return Object.keys(valeur).length > 0;
      };
      ajouter(
        nonVide(entry.instrument?.auteurs)
        || nonVide(entry.instrument?.anneePublication)
        || nonVide(entry.instrument?.formePubliee)
        || nonVide(entry.references?.doi)
        || nonVide(entry.references?.pmid),
        `${id} : statutBibliographique 'reference_identifiee' sans aucun champ qui désigne la `
        + `référence — renseigner au moins instrument.auteurs, instrument.anneePublication, `
        + `instrument.formePubliee, references.doi ou references.pmid`
      );
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
      // Un statut de droits dégagé ne se pose pas nu : il doit dire SUR QUOI il
      // repose. Sans cette exigence, `permission_obtenue` + une date suffisaient à
      // franchir le barreau avec un `detail` vide — c'est-à-dire à faire autorité
      // sans rien produire à l'appui. Le 2026-07-29, 42 instruments ont été
      // dégagés sur une déclaration du praticien et non sur une pièce signée de
      // l'ayant droit : la distinction ne vit que dans ce champ, et rien ne la
      // gardait. Le seuil est volontairement bas — on exige une phrase, pas une
      // forme : un garde qui imposerait un gabarit serait contourné par un
      // gabarit vide.
      ajouter(
        typeof entry.droits?.detail === 'string' && entry.droits.detail.trim().length >= 40,
        `${id} : droits '${entry.droits?.statut}' sans fondement écrit — `
        + `droits.detail doit dire sur quoi la permission repose`
      );
    }
    // « Référentiel interne » est une AFFIRMATION SUR L'IDENTITÉ, pas un statut par
    // défaut. Le 2026-07-30, deux instruments ont été déclarés tels sur un
    // raisonnement inversé — « le PDF du support ne cite aucun tiers, donc aucun
    // tiers n'a de droits » — puis rouverts à l'assignation. L'un d'eux est le VQ11
    // de Ninot et al. : onze items et trois composantes publiées, reproduits à
    // l'échelle de réponse près. Le champ `droits.detail` de sa propre entrée
    // disait déjà « échelle tierce que le support reproduit ».
    //
    // Un support de formation qui ne cite pas ses sources ne prouve rien : le
    // silence d'un document n'est pas une pièce. Le contrôle exige donc une
    // identification POSITIVE — pas de tiers nommé chez soi, ou alors la
    // reconnaissance explicite de l'emprunt.
    if (entry.statutBibliographique === 'referentiel_interne_siin') {
      const detail = entry.droits?.detail ?? '';
      const revendiqueUnTiers = entry.instrument?.auteurs != null
        || /échelle tierce|instrument tiers/i.test(detail);
      ajouter(
        !revendiqueUnTiers,
        `${id} : statutBibliographique 'referentiel_interne_siin' alors que l'entrée nomme un `
        + `ayant droit tiers (auteurs ${JSON.stringify(entry.instrument?.auteurs ?? null)}) — `
        + `un instrument du référentiel interne ne reproduit pas une échelle publiée`
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
    // FRAÎCHEUR DU VERDICT.
    //
    // Un verdict de banc certifie un scoring à un instant donné. Rien ne le
    // reliait au code qu'il certifie : le 2026-07-30, deux instruments étaient
    // `scoring_verifie` sur un verdict ANTÉRIEUR à la réécriture de leur propre
    // grille — le QDRS a vu ses cinq bandes réalignées le matin et portait encore
    // le verdict de la veille. Un verdict périmé se lit exactement comme un
    // verdict frais.
    //
    // La date de la note de révision est le repère disponible : c'est elle qu'on
    // écrit quand on touche à l'instrument. Un verdict daté AVANT sa propre
    // révision décrit donc un état qui n'existe plus.
    //
    // CE QUE CETTE GARDE NE COUVRE PAS, et il faut le lire avant de s'y fier :
    // son témoin est DÉCLARATIF, écrit à la main dans le même fichier. La moitié
    // des entrées ne porte aucun bloc `revision` et lui échappe entièrement ; et
    // le cas vraiment dangereux — quelqu'un réaligne une grille dans
    // `questions.ts` sans rien écrire au registre — la laisse muette dans tous
    // les cas. Elle n'attrape que la faute inverse, la plus rare : on écrit la
    // note et on oublie de re-dater le verdict.
    //
    // Le seul témoin honnête est déjà produit par le banc — `empreinte-servie.json`
    // décrit le servi tel qu'il est. Y stocker une empreinte dans `verdictScoring`
    // et la recalculer depuis le catalogue au moment du contrôle relierait enfin
    // le verdict au code. C'est un lot à part ; l'angle mort est verrouillé par un
    // test qui le nomme (`verifier_registre_instruments.test.mjs`).
    if (v != null && v.revision != null && estUneDate(v.revision.date) && estUneDate(v.date)) {
      ajouter(
        v.date >= v.revision.date,
        `${id} : verdictScoring daté du ${v.date} alors que sa dernière révision date du `
        + `${v.revision.date} — le verdict est antérieur à ce qu'il certifie, il faut rejouer `
        + `le banc (\`certify --recomparer\`, hors ligne) et reporter la date`
      );
    }

    // RÉSERVE OPPOSABLE.
    //
    // `divergencesCritiques === 0` était la seule condition du barreau
    // `scoring_verifie`, et elle ne suffit pas.
    //
    // LA MESURE, rejouée instrument par instrument sur le code d'AVANT ce lot, en
    // montant chacun à `scoring_verifie` pour voir ce qui rougissait. Une première
    // rédaction annonçait « quatre des cinq » sur le seul compteur : c'est vrai du
    // compteur et FAUX du verrou. Le trou réel était de DEUX.
    //
    //   Q_SOM_09  → passait      (rien ne l'arrêtait)
    //   Q_GEO_04  → passait      (rien ne l'arrêtait)
    //   Q_TAB_04  → arrêté       (actif:false ⟹ terminal, et contenu 'a_auditer')
    //                            [ÉTAT DU 2026-07-30. Q_TAB_04 est `actif: true`
    //                             depuis le 2026-08-01 : ce relevé décrit la
    //                             situation qui a motivé la garde, pas l'actuelle.]
    //   Q_PED_03  → arrêté       (idem)
    //   Q_FIB_03  → arrêté       (idem, plus divergencesCritiques = 2)
    //
    // Les trois `suspendu` étaient donc déjà tenus par deux gardes préexistants.
    // Q_PED_03, que cette rédaction désignait comme « le cas vivant que rien
    // n'arrêtait », était arrêté DEUX FOIS. Corrigé après revue : surestimer le
    // trou d'un facteur deux dans le commentaire qui explique pourquoi la garde
    // existe, c'est refaire ici la faute que cette campagne attaque partout
    // ailleurs — croire un compteur avant de lire ce qu'il compte.
    //
    // Ce qui fonde la garde n'en est pas affaibli : sur les deux instruments
    // réellement libres, ce qui les retenait n'était écrit qu'en français dans
    // `verdictScoring.revision.notes` — « la montée reste refusée », « barreau
    // ramené à contenu_verrouille » — et aucun code ne le lisait. Pour les trois
    // autres, la réserve ne mord pas aujourd'hui (`barreau === -1`, hors
    // comparaison) : elle vivra à la réactivation. Et là encore, mesuré plutôt
    // qu'affirmé — un seul des deux gardes cesse. Celui qui refuse un contenu
    // `a_auditer` SURVIT à la réactivation. La réserve n'ajoute donc quelque
    // chose DÈS ce moment-là que pour Q_TAB_04, dont le plafond est sous
    // `contenu_verrouille` ; pour Q_PED_03 et Q_FIB_03 elle devient porteuse le
    // jour où leur contenu sera audité.
    //
    // [CADUC POUR Q_TAB_04 DEPUIS LE 2026-08-01. Sa réserve a été LEVÉE ce
    //  jour-là — la première levée du mécanisme — et sa ligne retirée de
    //  RESERVES_ATTENDUES. Le raisonnement ci-dessus reste juste et vaut
    //  toujours pour Q_PED_03 et Q_FIB_03 ; il ne décrit simplement plus le seul
    //  cas dont il se servait d'exemple. Conservé plutôt que réécrit : c'est lui
    //  qui explique pourquoi la garde existe.]
    //
    // Le compteur agrège d'ailleurs PAR GENRE (`comparaison.mjs`, par conception) :
    // son « 1 » recouvrait une famille entière. Un chiffre de tête ne peut pas
    // porter cette décision.
    //
    // La réserve rend la note opposable : elle plafonne le barreau, et le plafond
    // est vérifié à chaque `npm run check`.
    //
    // CE QU'ELLE NE COUVRE PAS, et il faut le lire avant de s'y fier :
    //  1. elle ne détecte pas une réserve JAMAIS ÉCRITE — un instrument certifié
    //     sans que personne n'ait vu le problème lui échappe entièrement ;
    //  2. elle ne détecte pas, PAR ELLE-MÊME, la suppression d'une réserve ni son
    //     déplacement (`reserves` mal orthographié, `revision.reserve` au mauvais
    //     niveau : les deux sont silencieusement inertes). Une première rédaction
    //     s'en remettait à « supprimer un bloc est une ligne de diff qu'une revue
    //     voit » — argument qui ne tient pas, la revue ayant montré qu'un plafond
    //     porté à `publie` levait la réserve en UN JETON, bloc et motif restant
    //     en place. C'est le banc qui ferme cette famille : il épingle les cinq
    //     réserves du registre RÉEL, par identifiant, par plafond et par date, et attrape
    //     donc d'un coup la suppression, le `null`, le renommage, le déplacement
    //     et le plafond au sommet ;
    //  3. elle lit une DÉCLARATION, pas le code : elle ne vérifie pas que le servi
    //     manque réellement ses seuils. Le remède existe et il est nommé — faire
    //     écrire au banc la COUVERTURE de sa comparaison (items, seuils,
    //     sous-échelles, de chaque côté) et refuser un verdict vacueux. Lot à
    //     part : les rapports hors dépôt des 59 certifiés sont antérieurs à deux
    //     reconstructions du 2026-07-31 (Q_ALI_03, Q_SOM_07), et les rétro-remplir
    //     écrirait 59 affirmations que personne n'a vérifiées.
    const reserve = v?.reserve;
    if (reserve != null) {
      // Contrôlée PARTOUT, pas seulement là où elle mord : une réserve mal formée
      // inscrite sous son plafond devient vraie le jour de la montée — même raison
      // qu'au contrôle de forme du verdict, ci-dessus.
      // `publie` est REFUSÉ comme plafond, et c'est la moitié du correctif de
      // revue. Il est dans `ECHELLE`, donc bien formé — mais c'est le SOMMET :
      // une réserve qui y plafonne ne contraint rien tout en restant visiblement
      // en place, motif intact. Le diff tient alors en un jeton, et un relecteur
      // qui vérifie « la réserve est-elle toujours là ? » répond oui. Le garde
      // validerait exactement le geste contre lequel il a été écrit.
      const plafondValide = ECHELLE.includes(reserve.plafond) && reserve.plafond !== 'publie';
      ajouter(
        estUneDate(reserve.date)
        && plafondValide
        && typeof reserve.motif === 'string' && reserve.motif.trim().length >= 40,
        `${id} : verdictScoring.reserve mal formée (date ${JSON.stringify(reserve.date)}, `
        + `plafond ${JSON.stringify(reserve.plafond)}, motif de `
        + `${typeof reserve.motif === 'string' ? reserve.motif.trim().length : 0} caractères) — `
        + `une réserve doit dire À QUELLE DATE, JUSQU'OÙ et SUR QUOI elle repose. `
        + `\`publie\` n'est pas un plafond : c'est le sommet de l'échelle`
      );
      // Les états terminaux (`suspendu`, `remplace`) rendent `barreau === -1` : ils
      // sont hors échelle, donc hors comparaison. La réserve n'y dort pas pour
      // autant : le contrôle plus haut interdit seulement de RESTER terminal, il
      // n'impose aucun barreau de reprise — c'est précisément pourquoi la réserve
      // est utile là. Quel que soit le barreau choisi à la réactivation,
      // l'instrument ne peut plus franchir son propre plafond sans que la réserve
      // soit levée explicitement.
      if (barreau !== -1 && plafondValide) {
        ajouter(
          barreau <= ECHELLE.indexOf(reserve.plafond),
          `${id} : statutCertification '${entry.statutCertification}' au-dessus du plafond `
          + `'${reserve.plafond}' posé par la réserve du ${reserve.date} — `
          + `${reserve.motif}. Lever la réserve est une décision explicite, pas une `
          + `conséquence d'un compteur de divergences à zéro`
        );
      }
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
