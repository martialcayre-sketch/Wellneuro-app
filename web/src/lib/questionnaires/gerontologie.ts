import { O_RPS, O_JPT, O_04, O_03jt, O_YN, O_UPPS, O_YOUNG, O_BMS, O_CUNGI, O_PAS, O_ZARIT, O_DASS, O_CONNERS, q, qn, qs } from './shared';

export const Q_GEO_03 = {
  id:'Q_GEO_03', titre:'AQ — Questionnaire Alzheimer (Sabbagh 2010)',
  // Référence : Sabbagh MN et al. (2010). Alzheimer Dis Assoc Disord, 24(1), 64-70.
  // Version SIIN simplifiée : cotation 0/1 (vs pondérée originale) — GAP documenté
  // Informant-based : à compléter par un proche ou le clinicien
  instructions:'Répondez OUI ou NON à chacune des questions suivantes concernant le patient.',
  sections:[
    { id:'1', titre:'Questions 1 à 21',
      questions:[
        q('AZ1',  "La personne a-t-elle des difficultés à se souvenir de choses récentes ?",           [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('AZ2',  "La personne a-t-elle des difficultés à se souvenir d\'événements récents importants ?", [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('AZ3',  "La personne a-t-elle des difficultés à se souvenir des conversations récentes ?",   [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('AZ4',  "La personne oublie-t-elle des rendez-vous ou des dates ?",                          [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('AZ5',  "La personne pose-t-elle les mêmes questions ou répète-t-elle les mêmes histoires ?", [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('AZ6',  "La personne a-t-elle des difficultés à trouver ses mots ?",                         [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('AZ7',  "La personne a-t-elle du mal à reconnaître des visages familiers ?",                 [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('AZ8',  "La personne a-t-elle du mal à effectuer des tâches ménagères habituelles ?",        [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('AZ9',  "La personne a-t-elle du mal à gérer ses finances (chèques, factures) ?",            [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('AZ10', "La personne a-t-elle du mal à utiliser les transports en commun ou à conduire ?",   [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('AZ11', "La personne se perd-elle dans des endroits familiers ?",                            [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('AZ12', "La personne a-t-elle du mal à prendre des médicaments correctement ?",              [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('AZ13', "La personne a-t-elle des difficultés à utiliser le téléphone ou les appareils électroniques ?", [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('AZ14', "La personne a-t-elle du mal à faire ses courses ?",                                 [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('AZ15', "La personne est-elle moins intéressée par ses activités ou passe-temps habituels ?", [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('AZ16', "La personne est-elle moins motivée pour entreprendre des activités nouvelles ?",    [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('AZ17', "La personne est-elle plus irritable ou agitée qu\'auparavant ?",                   [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('AZ18', "La personne est-elle déprimée ou triste ?",                                         [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('AZ19', "La personne est-elle anxieuse ou inquiète sans raison apparente ?",                 [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('AZ20', "La personne voit-elle ou entend-elle des choses inexistantes (hallucinations) ?",   [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('AZ21', "La personne a-t-elle des changements importants de personnalité ou de comportement ?", [{v:0,l:'Non'},{v:1,l:'Oui'}]),
      ]}
  ],
  scoring:{
    type:'sum', maxTotal:21,
    interpretation:[
      {min:0,  max:4,  label:'Cognition normale ou doute mineur',   color:'success', protocol:'Suivi annuel recommandé'},
      {min:5,  max:14, label:'Déclin cognitif léger à modéré (MCI probable)', color:'warning', protocol:'Évaluation neuropsychologique + bilan biologique'},
      {min:15, max:21, label:'Déclin cognitif sévère (démence probable)', color:'danger', protocol:'Consultation neurologique urgente'},
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
    maxTotal:30,
    interpretation:[
      {min:0,   max:1.5, label:'Normal ou oublis bénins',         color:'success'},
      {min:1.5, max:5.5, label:'MCI — Déclin cognitif léger',     color:'info'},
      {min:5.5, max:12.5,label:'Démence légère',                  color:'warning'},
      {min:12.5,max:17.5,label:'Démence légère à modérée',        color:'warning'},
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
    phases:[
      {id:'phase1', items:['DU1a','DU2a','DU3a','DU4a','DU5a'], maxTotal:5, label:'Rappel immédiat'},
      {id:'phase2', items:['DU1b','DU2b','DU3b','DU4b','DU5b'], maxTotal:5, label:'Rappel différé'},
    ],
    maxTotal:10,
    interpretation:[
      {min:0, max:7,  phase2_key:true, label:'Trouble de la mémoire épisodique — consultation neurologique', color:'danger'},
      {min:8, max:10, label:'Mémoire dans les limites normales',   color:'success'},
    ],
    // Note clinique : un score de rappel différé < 3/5 est hautement spécifique de la MA
    note:'Un score de rappel différé ≤ 2/5 est fortement évocateur de maladie d\'Alzheimer (sensibilité 85 %, spécificité 90 % — Dubois 2002).'
  }
};
