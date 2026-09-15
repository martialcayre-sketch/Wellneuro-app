import { O_RPS, O_JPT, O_04, O_03jt, O_YN, O_UPPS, O_YOUNG, O_BMS, O_CUNGI, O_PAS, O_ZARIT, O_DASS, O_CONNERS, q, qn, qs } from './shared';

/**
 * PONDÉRATION DE L'AQ — six items valent 2 points, quinze en valent 1.
 *
 * Elle vit dans les VALEURS d'options, pas dans un drapeau de scoring : même
 * patron que `O_PSS_INVERSE`, dont la clé de correction du PSS est écrite dans
 * ses nombres. Le moteur `sum` additionne ce que l'option porte, si bien que la
 * pondération publiée se lit là où elle s'applique.
 */
const O_AQ_1 = [{v:0,l:'Non'},{v:1,l:'Oui'}];
const O_AQ_2 = [{v:0,l:'Non'},{v:2,l:'Oui'}];

export const Q_GEO_03 = {
  id:'Q_GEO_03', titre:'AQ — Alzheimer\u2019s Questionnaire (Sabbagh 2010)',
  // Référence : Sabbagh MN et al. (2010). J Alzheimers Dis, 22(3), 1015-1021.
  //             PMID 20930293 · DOI 10.3233/JAD-2010-101185 · table 7.
  //
  // RÉALIGNÉ SUR SA PUBLICATION LE 2026-09-15 (arbitrage praticien). La forme
  // servie jusque-là portait vingt-et-un items comme la source — et ce chiffre
  // identique cachait DEUX INVENTAIRES DIFFÉRENTS : huit items publiés n'étaient
  // pas servis, huit items servis n'étaient pas publiés. Le domaine Orientation
  // de Sabbagh (trois items, dont le plus lourd de la publication) manquait en
  // entier ; un bloc comportemental de cinq items — irritabilité, dépression,
  // anxiété, hallucinations, personnalité — avait été ajouté, alors que l'AQ ne
  // comporte aucun domaine de ce genre. La pondération publiée était abandonnée
  // au profit d'une cotation plate.
  //
  // POURQUOI C'ÉTAIT GRAVE, ET PAS SEULEMENT INEXACT. Les bandes servies sont
  // celles de la littérature AQ, établies sur l'instrument publié. Posées sur
  // d'autres items, elles ne mesuraient rien — c'est la faute nommée le
  // 2026-08-01 en retirant les bandes de `Q_TAB_04` : « une grille de lecture
  // validée sur un instrument, posée sur un autre, ne mesure rien ». Les items
  // sont réalignés AVANT que les bandes ne soient reposées, et pas l'inverse.
  //
  // AUCUNE PASSATION N'A ÉTÉ PERDUE : la production a été lue le 2026-09-15
  // (one-off détaché) — 188 passations sur trente instruments, et ZÉRO sur
  // `Q_GEO_03`, `Q_GEO_04`, `Q_GEO_05` et `Q_GEO_06`. Les identifiants d'items
  // `AZ1`-`AZ21` sont donc réattribués sans rien rendre illisible.
  //
  // CE QUI RESTE NON VALIDÉ, et le registre le dit : la traduction française.
  // Elle est fidèle au sens de chaque item publié, elle n'est pas une version
  // française validée — `traductionValidee` reste « fr — à confirmer ».
  //
  // Informant-based : à compléter par un proche ou le clinicien. Le mode
  // clinicien est posé le 2026-08-16 (revue D-066) : auto-rempli par le
  // patient, l'instrument répondrait « concernant le patient » À SA PLACE —
  // la population du claim n'est pas respectée (DC-14, DC-28).
  administrationMode: 'clinicien',
  instructions:'Répondez OUI ou NON à chacune des questions suivantes concernant le patient. Certaines questions comptent double, conformément à la cotation publiée.',
  sections:[
    { id:'memoire', titre:'Mémoire',
      questions:[
        q('AZ1',  "La personne a-t-elle des troubles de la mémoire ?",                                        O_AQ_1),
        q('AZ2',  "Si oui, sa mémoire est-elle moins bonne qu'il y a quelques années ?",                      O_AQ_1),
        q('AZ3',  "La personne répète-t-elle des questions, des phrases ou des histoires dans la même journée ?", O_AQ_2),
        q('AZ4',  "Avez-vous dû prendre en charge le suivi de ses rendez-vous ou de ses échéances ?",          O_AQ_1),
        q('AZ5',  "La personne égare-t-elle des objets plus d'une fois par mois ?",                            O_AQ_1),
        q('AZ6',  "La personne soupçonne-t-elle les autres de déplacer, cacher ou voler ses affaires ?",       O_AQ_1),
      ]},
    { id:'orientation', titre:'Orientation',
      questions:[
        q('AZ7',  "La personne a-t-elle souvent du mal à savoir le jour, la date, le mois, l'année ou l'heure ?", O_AQ_2),
        q('AZ8',  "La personne se désoriente-t-elle dans des lieux qu'elle ne connaît pas ?",                  O_AQ_1),
        q('AZ9',  "La personne est-elle plus confuse hors de chez elle ou en déplacement ?",                   O_AQ_1),
      ]},
    { id:'fonctionnel', titre:'Capacités fonctionnelles',
      questions:[
        q('AZ10', "La personne a-t-elle du mal à manipuler l'argent ?",                                        O_AQ_1),
        q('AZ11', "La personne a-t-elle du mal à payer ses factures ou à gérer ses comptes ?",                 O_AQ_2),
        q('AZ12', "La personne a-t-elle du mal à penser à prendre ses médicaments ?",                          O_AQ_1),
        q('AZ13', "La personne a-t-elle des difficultés à conduire ?",                                         O_AQ_1),
        q('AZ14', "La personne a-t-elle du mal à utiliser les appareils ménagers ?",                           O_AQ_1),
        q('AZ15', "La personne a-t-elle des difficultés à effectuer les réparations ou l'entretien du domicile ?", O_AQ_1),
        q('AZ16', "La personne a-t-elle abandonné ou nettement réduit des activités comme le sport, la danse, l'exercice ou les travaux manuels ?", O_AQ_1),
      ]},
    { id:'visuospatial', titre:'Repérage visuo-spatial',
      questions:[
        q('AZ17', "La personne se perd-elle dans des lieux familiers ?",                                       O_AQ_2),
        q('AZ18', "La personne a-t-elle un sens de l'orientation diminué ?",                                   O_AQ_1),
      ]},
    { id:'langage', titre:'Langage',
      questions:[
        q('AZ19', "La personne a-t-elle du mal à trouver ses mots, en dehors des noms propres ?",              O_AQ_1),
        q('AZ20', "La personne confond-elle les prénoms de ses proches ou de ses amis ?",                      O_AQ_2),
        q('AZ21', "La personne a-t-elle du mal à reconnaître des personnes qui lui sont familières ?",         O_AQ_2),
      ]}
  ],
  scoring:{
    // `maxTotal` 27 et non 21 : quinze items à 1 point et six à 2 points, ce qui
    // est le maximum publié — confirmé par la revue des auteurs de l'instrument
    // (Malek-Ahmadi & Sabbagh, J Nat Sci 2015, PMID 25961078 : « The total AQ
    // score ranges from 0 to 27 »).
    type:'sum', severiteCroissante:true, maxTotal:27,
    certification:{source:'drive',status:'certifie'},
    // BANDES : 0-4 / 5-14 / 15-27, sur l'échelle pondérée à 27 points.
    //
    // CE QUI EST ÉTABLI ET CE QUI NE L'EST PAS, et la distinction est le tout de
    // cette note. Les bornes 5 et 15 sont celles qui circulent dans la
    // littérature de l'AQ, et elles portent sur l'échelle pondérée — c'est
    // pourquoi elles sont désormais posées sur 27 et non sur 21. Mais la
    // publication qui les ÉTABLIT n'a pas été lue : l'article de 2010 ne publie
    // aucun seuil (moyennes de groupe NC 2,12 · MCI 11,06 · MA 17,64 et courbes
    // ROC seulement), et le texte intégral de l'étude de validation
    // (Malek-Ahmadi et al., Age Ageing 2012, PMID 22367356) n'a pas pu être
    // atteint le 2026-09-15. Arbitrage praticien du 2026-09-15 : transposer,
    // et le DIRE — `motifBibliographique` au registre porte la réserve.
    //
    // Les `protocol` sont une CONDUITE AJOUTÉE PAR LE CABINET, absente de la
    // source, comme le registre le déclare depuis le 2026-07-25.
    interpretation:[
      {min:0,  max:4,  label:'Cognition normale ou doute mineur',   color:'success', protocol:'Suivi annuel recommandé'},
      {min:5,  max:14, label:'Déclin cognitif léger à modéré (MCI probable)', color:'warning', protocol:'Évaluation neuropsychologique + bilan biologique'},
      {min:15, max:27, label:'Déclin cognitif sévère (démence probable)', color:'danger', protocol:'Consultation neurologique urgente'},
    ]
  }
};
export const Q_GEO_04 = {
  id:'Q_GEO_04', titre:'MMSE — Mini Mental State Examination (GRECO)',
  // ⚠️ CLINICIEN UNIQUEMENT — ne peut pas être auto-administré
  // Référence : Folstein MF et al. (1975). J Psychiatr Res, 12(3), 189-198.
  //             Version GRECO (Groupe de Réflexion sur les Évaluations Cognitives)
  // Seuils HAS 2011 utilisés (absents PDF SIIN) — GAP documenté, escalade SIIN
  // Matériel requis : feuille de papier, stylo, montre, 3 objets
  administrationMode: 'clinicien',
  instructions:'[PRATICIEN] Administrez ce test au patient selon le protocole GRECO standardisé. Cotez chaque item selon les critères ci-dessous.',
  sections:[
    { id:'orientation', titre:'1. Orientation (10 points)',
      questions:[
        q('MM1', "Quelle est l\'année ?",      [{v:0,l:'Incorrect'},{v:1,l:'Correct'}]),
        q('MM2', "Quelle est la saison ?",      [{v:0,l:'Incorrect'},{v:1,l:'Correct'}]),
        q('MM3', "Quel est le mois ?",          [{v:0,l:'Incorrect'},{v:1,l:'Correct'}]),
        q('MM4', "Quel est le jour ?",          [{v:0,l:'Incorrect'},{v:1,l:'Correct'}]),
        q('MM5', "Quel est le jour de la semaine ?", [{v:0,l:'Incorrect'},{v:1,l:'Correct'}]),
        q('MM6', "Dans quel pays sommes-nous ?", [{v:0,l:'Incorrect'},{v:1,l:'Correct'}]),
        q('MM7', "Dans quelle région sommes-nous ?", [{v:0,l:'Incorrect'},{v:1,l:'Correct'}]),
        q('MM8', "Dans quelle ville sommes-nous ?", [{v:0,l:'Incorrect'},{v:1,l:'Correct'}]),
        q('MM9', "Dans quel hôpital / bâtiment sommes-nous ?", [{v:0,l:'Incorrect'},{v:1,l:'Correct'}]),
        q('MM10',"À quel étage sommes-nous ?",  [{v:0,l:'Incorrect'},{v:1,l:'Correct'}]),
      ]},
    { id:'apprentissage', titre:'2. Apprentissage (3 points)',
      questions:[
        q('MM11',"Répétition : CITRON",         [{v:0,l:'Non rappelé'},{v:1,l:'Rappelé'}]),
        q('MM12',"Répétition : CLÉ",            [{v:0,l:'Non rappelé'},{v:1,l:'Rappelé'}]),
        q('MM13',"Répétition : BALLON",         [{v:0,l:'Non rappelé'},{v:1,l:'Rappelé'}]),
      ]},
    { id:'attention', titre:'3. Attention et calcul (5 points)',
      questions:[
        q('MM14',"100 − 7 = 93",  [{v:0,l:'Incorrect'},{v:1,l:'Correct'}]),
        q('MM15',"93 − 7 = 86",   [{v:0,l:'Incorrect'},{v:1,l:'Correct'}]),
        q('MM16',"86 − 7 = 79",   [{v:0,l:'Incorrect'},{v:1,l:'Correct'}]),
        q('MM17',"79 − 7 = 72",   [{v:0,l:'Incorrect'},{v:1,l:'Correct'}]),
        q('MM18',"72 − 7 = 65",   [{v:0,l:'Incorrect'},{v:1,l:'Correct'}]),
      ]},
    { id:'rappel', titre:'4. Rappel (3 points)',
      questions:[
        q('MM19',"Rappel : CITRON",  [{v:0,l:'Non rappelé'},{v:1,l:'Rappelé'}]),
        q('MM20',"Rappel : CLÉ",     [{v:0,l:'Non rappelé'},{v:1,l:'Rappelé'}]),
        q('MM21',"Rappel : BALLON",  [{v:0,l:'Non rappelé'},{v:1,l:'Rappelé'}]),
      ]},
    { id:'langage', titre:'5. Langage (8 points)',
      questions:[
        q('MM22',"Dénomination : montre",         [{v:0,l:'Incorrect'},{v:1,l:'Correct'}]),
        q('MM23',"Dénomination : stylo",           [{v:0,l:'Incorrect'},{v:1,l:'Correct'}]),
        q('MM24',"Répétition : « Pas de si, ni de et, ni de mais »", [{v:0,l:'Incorrect'},{v:1,l:'Correct'}]),
        q('MM25',"Ordre en 3 étapes : papier (main droite)", [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('MM26',"Ordre en 3 étapes : plier en deux",        [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('MM27',"Ordre en 3 étapes : poser sur les genoux", [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('MM28',"Lecture et exécution : « Fermez les yeux »", [{v:0,l:'Non exécuté'},{v:1,l:'Exécuté'}]),
        q('MM29',"Écriture d\'une phrase complète",          [{v:0,l:'Non'},{v:1,l:'Oui'}]),
      ]},
    { id:'construction', titre:'6. Construction visuospatiale (1 point)',
      questions:[
        q('MM30',"Copie de deux pentagones qui se croisent",  [{v:0,l:'Incorrect'},{v:1,l:'Correct'}]),
      ]},
  ],
  scoring:{
    type:'sum', maxTotal:30,
    // Arbitrage praticien du 2026-07-26 : le MMSE se lit par domaine autant que
    // par total. Un 24/30 par déficit d'orientation et un 24/30 par déficit de
    // rappel n'orientent pas vers le même bilan. Les six domaines de la source
    // correspondent exactement aux six sections servies (10+3+5+3+8+1 = 30).
    // Purement descriptif : le total reste 0-30.
    dimensions:[
      {id:'ORI', label:'Orientation',              items:['MM1','MM2','MM3','MM4','MM5','MM6','MM7','MM8','MM9','MM10'], max:10},
      {id:'APP', label:'Apprentissage',            items:['MM11','MM12','MM13'],                                          max:3},
      {id:'ATT', label:'Attention et calcul',      items:['MM14','MM15','MM16','MM17','MM18'],                            max:5},
      {id:'RAP', label:'Rappel',                   items:['MM19','MM20','MM21'],                                          max:3},
      {id:'LAN', label:'Langage',                  items:['MM22','MM23','MM24','MM25','MM26','MM27','MM28','MM29'],       max:8},
      {id:'CON', label:'Construction visuospatiale', items:['MM30'],                                                      max:1},
    ],
    // Seuils HAS 2011 (absents PDF SIIN — escalade documentée)
    interpretation:[
      {min:27, max:30, label:'Normal',                     color:'success', protocol:'Pas d\'indication de trouble cognitif'},
      {min:21, max:26, label:'Troubles cognitifs légers',  color:'info',    protocol:'Suivi neuropsychologique — bilan complémentaire'},
      {min:10, max:20, label:'Démence modérée',            color:'warning', protocol:'Prise en charge spécialisée'},
      {min:0,  max:9,  label:'Démence sévère',             color:'danger',  protocol:'Soins spécialisés — dépendance importante'},
    ]
  }
};
export const Q_GEO_05 = {
  id:'Q_GEO_05', titre:'QDRS — Quick Dementia Rating System (Galvin 2015)',
  // Référence : Galvin JE (2015). Alzheimers Dement, 11(4), 461-474.
  // Informant-based — 10 domaines — valeurs 0/0.5/1/2/3 — score max /30
  // NOUVEAU TYPE SCORING : sum_decimal (flottants)
  // Mode clinicien posé le 2026-08-16 (revue D-066) : la consigne s'adresse à
  // l'aidant — auto-rempli, la grille rendrait « Démence modérée à sévère »
  // sur un auto-report qu'aucun informant n'a produit (DC-14, DC-28).
  administrationMode: 'clinicien',
  instructions:'Aidant ou proche : pour chaque domaine, choisissez la description qui correspond le mieux au patient par rapport à ses capacités antérieures.',
  sections:[
    { id:'1', titre:'10 domaines fonctionnels',
      questions:[
        qs('QD1','Mémoire et apprentissage',
          [{v:0,l:'Normal'},{v:0.5,l:'Oublis bénins (noms, RDV)'},{v:1,l:'Oublis modérés — impact quotidien'},{v:2,l:'Oublis sévères'},{v:3,l:'Ne retient plus rien de nouveau'}]),
        qs('QD2','Orientation',
          [{v:0,l:'Normal'},{v:0.5,l:'Légères difficultés'},{v:1,l:'Parfois perdu'},{v:2,l:'Souvent désorienté'},{v:3,l:'Totalement désorienté'}]),
        qs('QD3','Jugement et résolution de problèmes',
          [{v:0,l:'Normal'},{v:0.5,l:'Légère incertitude'},{v:1,l:'Difficultés modérées'},{v:2,l:'Difficultés sévères'},{v:3,l:'Incapable'}]),
        qs('QD4','Activités hors foyer',
          [{v:0,l:'Normal'},{v:0.5,l:'Légèrement réduit'},{v:1,l:'Assiste mais ne participe pas'},{v:2,l:'Incapable de fonctionner seul'},{v:3,l:'Pas d\'activités'}]),
        qs('QD5','Vie domestique et passe-temps',
          [{v:0,l:'Normal'},{v:0.5,l:'Légèrement altéré'},{v:1,l:'Difficultés modérées'},{v:2,l:'Tâches simples seulement'},{v:3,l:'Ne peut plus rien faire'}]),
        qs('QD6','Soins personnels',
          [{v:0,l:'Normal'},{v:0.5,l:'Quelques rappels nécessaires'},{v:1,l:'Nécessite aide occasionnelle'},{v:2,l:'Nécessite aide fréquente'},{v:3,l:'Entièrement dépendant'}]),
        qs('QD7','Comportement et personnalité',
          [{v:0,l:'Normal'},{v:0.5,l:'Légère irritabilité ou anxiété'},{v:1,l:'Changements notables'},{v:2,l:'Changements importants'},{v:3,l:'Comportement très problématique'}]),
        qs('QD8','Langage et communication',
          [{v:0,l:'Normal'},{v:0.5,l:'Légères difficultés de mots'},{v:1,l:'Manque de mots fréquent'},{v:2,l:'Difficultés importantes'},{v:3,l:'Communication très altérée'}]),
        qs('QD9','Attention et concentration',
          [{v:0,l:'Normal'},{v:0.5,l:'Légèrement distrait'},{v:1,l:'Difficultés modérées'},{v:2,l:'Difficultés sévères'},{v:3,l:'Incapable de se concentrer'}]),
        qs('QD10','Déambulation',
          [{v:0,l:'Normal'},{v:0.5,l:'Légèrement ralenti'},{v:1,l:'Démarche altérée'},{v:2,l:'Aide à la marche nécessaire'},{v:3,l:'Non ambulant'}]),
      ]}
  ],
  scoring:{
    type:'sum_decimal',
    certification:{source:'drive',status:'certifie'},
    maxTotal:30,
    // Grille alignée sur la source le 2026-07-30 (arbitrage praticien, Galvin
    // 2015, relevée à l'identique par les DEUX lectures du banc) : 0–1 / 1,5–5,5
    // / 6–12 / 12,5–17 / 17,5–30. Les bandes servies chevauchaient leurs bornes
    // — 1,5, 12,5 et 17,5 appartenaient chacun à deux bandes, et
    // `interpretRanges` prenant la première, le patient LE PLUS ATTEINT recevait
    // la bande la plus rassurante : 12,5 sortait « démence légère » au lieu de
    // modérée, 17,5 « légère à modérée » au lieu de sévère. La première revue de
    // ce lot n'avait corrigé que 1,5 ; la relecture des spec-B/C a montré que
    // les trois frontières étaient dans les mêmes fichiers. Scores en pas de
    // 0,5 : aucun trou atteignable.
    interpretation:[
      {min:0,   max:1,   label:'Normal ou oublis bénins',         color:'success'},
      {min:1.5, max:5.5, label:'MCI — Déclin cognitif léger',     color:'info'},
      {min:6,   max:12,  label:'Démence légère',                  color:'warning'},
      {min:12.5,max:17,  label:'Démence légère à modérée',        color:'warning'},
      {min:17.5,max:30,  label:'Démence modérée à sévère',        color:'danger'},
    ]
  }
};
export const Q_GEO_06 = {
  id:'Q_GEO_06', titre:'Test des 5 mots — Dubois (rappel en 2 phases)',
  // ⚠️ CLINICIEN UNIQUEMENT — ne peut pas être auto-administré
  // Référence : Dubois B et al. (2002). Neurology, 58(1), 144-150.
  // NOUVEAU TYPE SCORING : sum_two_phases (apprentissage + rappel différé)
  // Matériel requis : carte avec les 5 mots + indiçage sémantique
  administrationMode: 'clinicien',
  instructions:'[PRATICIEN] Présentez la liste des 5 mots au patient. Appliquez le protocole standardisé avec indiçage sémantique.',
  sections:[
    { id:'phase1', titre:'Phase 1 — Apprentissage immédiat',
      description:'Présentez les 5 mots, demandez au patient de les lire. Vérifiez l\'encodage. Demandez immédiatement le rappel libre, puis indicé si nécessaire.',
      questions:[
        q('DU1a',"MUSÉE : rappelé spontanément (rappel libre)",   [{v:0,l:'Non rappelé'},{v:1,l:'Rappelé'}]),
        q('DU2a',"LIMONADE : rappelée spontanément",              [{v:0,l:'Non rappelé'},{v:1,l:'Rappelé'}]),
        q('DU3a',"SAUTERELLE : rappelée spontanément",            [{v:0,l:'Non rappelé'},{v:1,l:'Rappelé'}]),
        q('DU4a',"BALANCE : rappelée spontanément",               [{v:0,l:'Non rappelé'},{v:1,l:'Rappelé'}]),
        q('DU5a',"ROUGE-GORGE : rappelé spontanément",            [{v:0,l:'Non rappelé'},{v:1,l:'Rappelé'}]),
      ]},
    { id:'phase2', titre:'Phase 2 — Rappel différé (après 3 à 5 minutes)',
      description:'Après un délai de 3 à 5 minutes (occupation avec une autre tâche), demandez le rappel libre des 5 mots, puis indicé si nécessaire.',
      questions:[
        q('DU1b',"MUSÉE : rappelé spontanément (rappel différé)",  [{v:0,l:'Non rappelé'},{v:1,l:'Rappelé'}]),
        q('DU2b',"LIMONADE : rappelée en différé",                 [{v:0,l:'Non rappelé'},{v:1,l:'Rappelé'}]),
        q('DU3b',"SAUTERELLE : rappelée en différé",               [{v:0,l:'Non rappelé'},{v:1,l:'Rappelé'}]),
        q('DU4b',"BALANCE : rappelée en différé",                  [{v:0,l:'Non rappelé'},{v:1,l:'Rappelé'}]),
        q('DU5b',"ROUGE-GORGE : rappelé en différé",               [{v:0,l:'Non rappelé'},{v:1,l:'Rappelé'}]),
      ]},
  ],
  scoring:{
    type:'sum_two_phases',
    certification:{source:'drive',status:'certifie'},
    phases:[
      {id:'phase1', items:['DU1a','DU2a','DU3a','DU4a','DU5a'], maxTotal:5, label:'Rappel immédiat'},
      {id:'phase2', items:['DU1b','DU2b','DU3b','DU4b','DU5b'], maxTotal:5, label:'Rappel différé'},
    ],
    maxTotal:10,
    interpretation:[
      {min:0, max:7,  phase2_key:true, label:'Trouble de la mémoire épisodique — consultation neurologique', color:'danger'},
      {min:8, max:10, label:'Mémoire dans les limites normales',   color:'success'},
    ],
    // Note clinique : un score de rappel différé < 3/5 est hautement spécifique de la MA.
    // Les valeurs chiffrées sont ATTRIBUÉES à Dubois 2002 et déclarées PROVISOIRES
    // (décision h du 2026-08-02) : le registre ne porte ni doi, ni pmid, ni
    // dateVerification pour cet instrument — personne dans ce dépôt ne les a
    // confrontées à la publication. Même doctrine que le plafond de Q_GEO_04.
    note:'Un score de rappel différé ≤ 2/5 est fortement évocateur de maladie d\'Alzheimer (sensibilité 85 %, spécificité 90 % attribuées à Dubois 2002 — valeurs provisoires, non vérifiées contre la source primaire).'
  }
};
