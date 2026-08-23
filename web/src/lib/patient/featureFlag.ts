/**
 * Drapeau de la surface patient « Ce qui compte pour moi aujourd'hui »
 * (campagne Alliance 6.0-A, LOT-03).
 *
 * Drapeau NEUF et ÉTEINT, et non un drapeau existant : la table est en
 * production depuis le LOT-01, mais l'ouverture d'une surface d'ÉCRITURE au
 * patient est un geste d'exploitation distinct du déploiement du code. Se
 * greffer sur un drapeau déjà allumé rendrait l'écran visible à tous les
 * dossiers du cabinet dès le déploiement, sans qu'aucune décision ne l'ait
 * ouvert — le défaut exact que `D-070` a constaté sur le rayon biologie.
 *
 * Fail-closed : seule la chaîne EXACTE « true » ouvre. Une variable absente,
 * vide, « 1 », « TRUE » ou « oui » laisse la surface fermée — une faute de
 * frappe dans un panneau d'environnement n'ouvre jamais un chemin vers un
 * patient par accident. Même doctrine que `WN_C4_ENABLED`, `WN_CB_ENABLED`,
 * `WN_AGENDA_ALI` et `WN_AGENDA_RELANCE`.
 *
 * Le drapeau garde LES DEUX surfaces : la route de dépôt (503) et l'écran du
 * portail (404). Fermer l'écran seul laisserait la route ouverte — « invisible
 * et écrivable » est la pire des combinaisons.
 *
 * Il ne garde PAS la lecture praticien : une liste vide côté dossier est un
 * silence honnête, alors qu'un 503 ferait croire à une panne.
 */
export function isCeQuiCompteEnabled(value = process.env.WN_CE_QUI_COMPTE): boolean {
  return value === 'true';
}

/**
 * Drapeau de la surface patient « Ce que j'ai compris de vous » (campagne
 * Alliance 6.0-A, LOT-04).
 *
 * Drapeau NEUF et ÉTEINT, distinct de `WN_CE_QUI_COMPTE`, pour la même raison
 * qu'au LOT-03 et une de plus : ce qui s'ouvre ici n'est pas seulement une
 * surface d'écriture, c'est un TEXTE DU PRATICIEN QUI ATTEINT LE PATIENT. Le
 * réutiliser ferait qu'ouvrir « ce qui compte » publierait aussi, du même
 * geste et sans que personne l'ait décidé, les synthèses de compréhension déjà
 * rédigées.
 *
 * Fail-closed : seule la chaîne EXACTE « true » ouvre. Même doctrine que
 * `WN_CE_QUI_COMPTE`, `WN_C4_ENABLED`, `WN_CB_ENABLED` et `WN_AGENDA_ALI`.
 *
 * IL GARDE TROIS GESTES, ET LE TROISIÈME EST LE MOINS ÉVIDENT :
 *   1. la route du portail (503) et 2. l'écran du portail (404) — « invisible
 *      et écrivable » reste la pire des combinaisons ;
 *   3. LA PUBLICATION côté praticien (503), et pas seulement l'affichage.
 *
 * Le troisième mérite son motif. Publier, c'est s'adresser au patient. Laisser
 * publier dans une surface fermée produirait un stock de synthèses que le
 * praticien croit remises, que personne ne lit, et qui atteindraient toutes le
 * patient d'un seul coup le jour de l'allumage — sans qu'aucune décision
 * n'ait ouvert CELLES-LÀ. C'est le défaut que `D-070` a constaté sur le rayon
 * biologie, vu depuis l'autre bout de la chaîne.
 *
 * Il ne garde PAS le brouillon : rédiger et réviser des versions non publiées
 * reste possible drapeau éteint. Un brouillon ne s'adresse à personne, et
 * préparer avant d'ouvrir est l'usage attendu d'une ouverture progressive.
 * Il ne garde pas non plus la LECTURE praticien : une liste vide côté dossier
 * est un silence honnête, un 503 ferait croire à une panne.
 */
export function isComprehensionEnabled(value = process.env.WN_COMPREHENSION): boolean {
  return value === 'true';
}

/**
 * Drapeau de l'écran « dossier à deux voix » et du geste de RATIFICATION
 * (campagne Alliance 6.0-A, LOT-06).
 *
 * QUATRIÈME DRAPEAU NEUF ET ÉTEINT, et il ne se compose PAS des deux
 * précédents. Se contenter de `WN_CE_QUI_COMPTE || WN_COMPREHENSION` ouvrirait
 * la ratification — seule écriture patient IRRÉVERSIBLE de la campagne — du
 * même geste qui ouvre une surface de dépôt ou de lecture, et l'objectif
 * négocié, lui, n'a aucun drapeau du tout (choix commenté du LOT-02 : surface
 * praticien). Un patient se serait alors prononcé sur son objectif sans que
 * personne n'ait décidé d'ouvrir ce geste-là.
 *
 * Fail-closed : seule la chaîne EXACTE « true » ouvre. Même doctrine que
 * `WN_CE_QUI_COMPTE`, `WN_COMPREHENSION`, `WN_C4_ENABLED` et `WN_CB_ENABLED`.
 *
 * IL GARDE TROIS GESTES : la route d'assemblage (503), l'écran du portail
 * (404), et la ratification (503) — « invisible et écrivable » reste la pire
 * des combinaisons.
 *
 * IL NE REMPLACE PAS LES AUTRES, IL S'Y AJOUTE. Chaque bloc de l'écran reste
 * soumis à son propre drapeau : ouvrir le dossier à deux voix n'ouvre ni
 * « ce qui compte » ni les synthèses de compréhension. Un bloc dont le drapeau
 * est éteint est ABSENT de la réponse — pas « vide », pas « pas encore
 * ouvert » : une phrase d'attente parlerait au patient de l'état d'un
 * déploiement, et un bloc vide se lirait comme un silence de son praticien
 * (`DC-24`).
 */
export function isDossierDeuxVoixEnabled(value = process.env.WN_DOSSIER_DEUX_VOIX): boolean {
  return value === 'true';
}

/**
 * Drapeau du moteur de proposition d'objectif (campagne Alliance 6.0-B,
 * LOT-02) — `D-094`, gouvernance du périmètre.
 *
 * CINQUIÈME DRAPEAU NEUF ET ÉTEINT, et il ne se compose d'aucun des quatre
 * précédents. Ce qu'il ouvre n'est pas une surface : c'est une MACHINE QUI
 * PROPOSE. Se greffer sur `WN_DOSSIER_DEUX_VOIX` ferait qu'ouvrir la
 * ratification mettrait aussi Wellneuro en position de force de proposition
 * sur l'objectif — deux gestes de gouvernance distincts confondus en un seul
 * interrupteur, ce que `D-070` a précisément constaté sur le rayon biologie.
 *
 * Fail-closed : seule la chaîne EXACTE « true » ouvre. Même doctrine que
 * `WN_CE_QUI_COMPTE`, `WN_COMPREHENSION`, `WN_DOSSIER_DEUX_VOIX`,
 * `WN_C4_ENABLED` et `WN_CB_ENABLED`.
 *
 * IL GARDE LES DEUX GESTES DE LA ROUTE, et pas seulement l'écriture :
 * l'assemblage (503) ET la lecture (503). C'est une exception assumée à la
 * règle « une liste vide est un silence honnête, un 503 ferait croire à une
 * panne » — laquelle vaut pour une surface que le praticien alimente lui-même.
 * Ici, une liste vide se lirait « la machine n'a rien trouvé à proposer sur ce
 * dossier », c'est-à-dire un CONSTAT sur le patient, là où la vérité est que
 * personne n'a encore ouvert la fonctionnalité. Mieux vaut dire « fermé » que
 * laisser lire un verdict.
 */
export function isObjectifProposeEnabled(value = process.env.WN_OBJECTIF_PROPOSE): boolean {
  return value === 'true';
}

/**
 * Interrupteur de repli du LOT-02 (`D-094`, gouvernance du périmètre) : la
 * liste des dossiers auxquels la proposition s'applique, **vide = tous**.
 *
 * SA VALEUR PAR DÉFAUT EST OUVERTE, ET CE N'EST PAS UNE ENTORSE AU
 * FAIL-CLOSED. Le fail-closed est tenu par `isObjectifProposeEnabled`, qui
 * précède toujours : rien ne s'ouvre tant que le drapeau est éteint. Cet
 * interrupteur-ci est un MÉCANISME DE RÉVERSIBILITÉ — le moyen de restreindre
 * après coup, sans redéploiement, si la fonctionnalité se comporte mal sur
 * certains dossiers. En faire un périmètre par défaut inverserait son rôle :
 * il faudrait penser à l'alimenter pour que l'ouverture serve à quelque chose,
 * et un oubli passerait pour une fermeture voulue.
 *
 * Le périmètre nominal est bien « tous les patients actuels » : `D-094` le
 * fonde sur un fait, non sur une commodité — ce sont des bêta-testeurs réels
 * et informés. Restreindre par défaut contredirait la décision.
 *
 * Séparateur virgule, espaces tolérés, entrées vides écartées : un panneau
 * d'environnement se remplit à la main, et « a, b » ne doit pas produire un
 * identifiant `" b"` qui n'appartiendrait à personne.
 */
export function dossierDansPerimetreProposition(
  idPatient: string,
  value = process.env.WN_OBJECTIF_PROPOSE_PATIENTS,
): boolean {
  const liste = (value ?? '')
    .split(',')
    .map((entree) => entree.trim())
    .filter((entree) => entree.length > 0);
  if (liste.length === 0) return true;
  return liste.includes(idPatient);
}
