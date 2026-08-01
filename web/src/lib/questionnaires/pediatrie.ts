import { O_RPS, O_JPT, O_04, O_03jt, O_YN, O_UPPS, O_YOUNG, O_BMS, O_CUNGI, O_PAS, O_ZARIT, O_DASS, O_CONNERS, q, qn, qs } from './shared';

// DÉBAPTISÉ LE 2026-08-01, sur arbitrage praticien du 2026-07-31.
//
// Cet instrument s'appelait « Échelle de Conners — Version Enseignant ». Il ne
// l'était pas : le banc du 2026-07-30 a lu 28 items des deux côtés, 0 divergence
// critique — et 27 divergences « mineures » dont DIX-SEPT à similarité 0,00. Le
// servi porte les critères diagnostiques du TDAH ; la source porte les items de
// Conners, dont ses six items d'opposition, absents ici.
//
// C'est le cas que la règle du « nombre d'items » désigne comme le plus
// dangereux : un comptage IDENTIQUE à contenus différents est une substitution,
// et c'est le seul cas que le compteur déclare conforme.
//
// Deux options étaient ouvertes — reconstruire sur les 28 items de Conners, ou
// débaptiser. La seconde a été retenue : le servi n'est pas un Conners abîmé,
// c'est une grille cohérente avec elle-même. La reconstruire jetterait un
// instrument utilisable pour en fabriquer un autre dont les droits (© MHS) ne
// sont pas dégagés.
export const Q_PED_02 = {
  id:'Q_PED_02', titre:'Repérage du TDAH par l’enseignant (grille WellNeuro)',
  instructions:'Ce questionnaire est destiné aux ENSEIGNANTS. Évaluez le comportement de l\'élève au cours du dernier mois. 0 = Pas du tout · 1 = Un peu · 2 = Souvent · 3 = Très souvent.',
  sections:[
    // « Opposition et comportement » jusqu'au 2026-08-01. Aucun de ces sept items
    // ne porte sur l'opposition — refus d'obéir, colères, provocation : ils
    // portent sur l'impulsivité et l'agitation motrice, plus deux items
    // attentionnels (CE3, CE4) que le barème rattache d'ailleurs à `INA`.
    { id:'A', titre:'Impulsivité et agitation',
      questions:[
        q('CE1','Est excitable, impulsif(ve)',           [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE2','A du mal à rester assis(e) — se lève souvent',   [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE3','Est facilement distrait(e) par des stimulations extérieures', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE4','Oublie ce qu\'il/elle a déjà appris',  [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE5','Interrompt ou s\'immisce dans les activités des autres', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE6','Répond sans réfléchir aux questions — avant la fin de la question', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE7','A du mal à attendre son tour',         [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
      ]},
    { id:'B', titre:'Inattention',
      questions:[
        q('CE8','Ne fait pas attention aux détails / fait des erreurs d\'étourderie', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE9','A du mal à soutenir l\'attention sur une tâche ou un jeu', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE10','Ne semble pas écouter quand on lui parle directement', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE11','Ne suit pas les instructions / ne termine pas les tâches', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE12','A du mal à organiser son travail ou ses activités', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE13','Évite les tâches qui demandent un effort mental soutenu', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE14','Perd souvent les affaires nécessaires aux tâches',  [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
      ]},
    { id:'C', titre:'Hyperactivité',
      questions:[
        q('CE15','Bouge sans cesse les mains ou les pieds — se tortille', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE16','Quitte sa place en classe / dans d\'autres situations', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE17','Court ou grimpe de façon excessive dans des situations inappropriées', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE18','A du mal à jouer calmement',           [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE19','Parle trop',                            [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE20','Agit comme si il/elle était "sur la brèche"', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
      ]},
    // « Index TDAH — Items clés » jusqu'au 2026-08-01. Le premier membre était le
    // « Conners' ADHD Index » au mot près — celui-là même qui venait d'être retiré
    // du libellé d'axe pour ce motif. Le praticien lisait donc l'emprunt en tête
    // de section pendant que l'axe correspondant portait un autre nom.
    { id:'D', titre:'Items clés de repérage',
      questions:[
        q('CE21','Ses résultats scolaires sont en dessous de ses capacités', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE22','Manque d\'attention — se perd facilement dans sa rêverie', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE23','Est facilement frustré(e) dans ses efforts',  [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE24','Difficultés à démarrer ou terminer le travail de classe', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE25','Changements d\'humeur rapides et imprévisibles', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE26','Ne persévère pas sur les tâches si elles demandent un effort', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE27','Ses relations avec les pairs sont difficiles', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE28','Perturbateur(trice) en classe',               [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
      ]},
  ],
  scoring:{
    type:'subscore',
    // AUCUN TOTAL GLOBAL, et il fallait le DÉCLARER pour que ce soit vrai.
    //
    // Sans ce drapeau, le moteur additionne les quatre axes et rend 84 sur une
    // grille saturée. Ce nombre partait ensuite en `scorePrincipal`, s'affichait
    // au Fil praticien « Score brut : 62 » — sans dénominateur, sans bande — et
    // arrivait au modèle de synthèse. Or aucune source ne donne de sens à un /84
    // sur cette grille : il se lirait comme une sévérité qu'aucun barème ne
    // définit. Même parade que pour le MFI-20, et pour la même raison.
    sansTotalGlobal:true,
    subScores:[
      // `OPP` → `IMP`, et « Opposition / Impulsivité » → « Impulsivité ». LE POINT
      // LE PLUS IMPORTANT DE CE LOT, et il était indépendant du nom de
      // l'instrument : les cinq items sont excitable, mal à rester assis,
      // interrompt, répond sans réfléchir, mal à attendre son tour. Les cinq
      // mesurent l'impulsivité, AUCUN ne mesure l'opposition. Un praticien
      // lisant « Opposition / Impulsivité : 13/15 » aurait conclu à un trouble
      // oppositionnel chez un enfant à qui la question n'a jamais été posée.
      //
      // L'identifiant change AUSSI, et c'est possible sans précaution : la
      // production porte zéro assignation et zéro réponse pour cet instrument
      // (lu le 2026-08-01). Aucune passation enregistrée ne porte la clé `OPP`.
      // « Impulsivité et agitation », comme le titre de sa section : CE2 (« mal à
      // rester assis ») est un item d'agitation motrice, pas d'impulsivité pure.
      // L'étiquette doit couvrir ses cinq items, pas quatre.
      {id:'IMP',label:'Impulsivité et agitation',items:['CE1','CE2','CE5','CE6','CE7'],max:15},
      // Les trois libellés ci-dessous étaient les traductions littérales des
      // échelles publiées du CTRS-R:S — « Cognitive Problems/Inattention »,
      // « Hyperactivity », « Conners' ADHD Index ». L'arbitrage demandait de
      // retirer « ni le nom Conners NI LES INTITULÉS empruntés » : seul celui qui
      // était cliniquement faux l'avait été. « Index TDAH » en particulier est
      // l'index de Conners au mot près ; il est remplacé par ce que ses huit
      // items mesurent réellement.
      {id:'INA',label:'Inattention',  items:['CE3','CE4','CE8','CE9','CE10','CE11','CE12','CE13','CE14'],max:27},
      {id:'HYP',label:'Hyperactivité',            items:['CE15','CE16','CE17','CE18','CE19','CE20'],max:18},
      // `IDX` : « Retentissement scolaire et relationnel » couvrait CE21, CE24,
      // CE26, CE27 et CE28 — mais pas CE22 (rêverie : de l'inattention, comptée
      // HORS de l'axe « Inattention »), ni CE23 (tolérance à la frustration), ni
      // CE25 (labilité de l'humeur). C'était remplacer un emprunt par une
      // approximation, la même mécanique en mineur. Un libellé neutre est plus
      // honnête que l'un ou l'autre.
      {id:'IDX',label:'Items clés de repérage', items:['CE21','CE22','CE23','CE24','CE25','CE26','CE27','CE28'],max:24},
    ]
  }
};
export const Q_PED_03 = {
  id:'Q_PED_03', titre:"Échelle d'évaluation Conners 3 pour le parent",
  instructions:"Voici des choses que des parents peuvent dire de leurs enfants. Répondre en décrivant l'enfant et ce qui s'est passé au cours du dernier mois. Lire attentivement chaque item puis indiquer à quel point il décrit bien l'enfant. Encerclez seulement une réponse pour chaque item. Il est important de répondre à tous les items. Donner la meilleure réponse possible pour les items jugés difficiles.",
  sections:[
    { id:"A", titre:"Items 1 à 36",
      description:'0 = Pas vrai du tout · 1 = Un peu vrai · 2 = Assez vrai · 3 = Très vrai',
      questions:[
        q("CP001","Est heureux(se), joyeux(se) et a une attitude positive.",O_CONNERS),
        q("CP002","Oublie durant ses activités quotidiennes.",O_CONNERS),
        q("CP003","Parle trop.",O_CONNERS),
        q("CP004","S'inquiète de beaucoup de choses.",O_CONNERS),
        q("CP005","Son orthographe est de mauvaise qualité.",O_CONNERS),
        q("CP006","Il/elle sèche des cours, absent de l'école sans autorisation.",O_CONNERS),
        q("CP007","Ne comprend pas ce qu'il/elle lit.",O_CONNERS),
        q("CP008","Il est agréable d'être avec lui/elle.",O_CONNERS),
        q("CP009","Mémorise bien les faits.",O_CONNERS),
        q("CP010","N'est pas invité/e à jouer ou à sortir avec les autres.",O_CONNERS),
        q("CP011","A forcé quelqu'un à avoir des activités sexuelles.",O_CONNERS),
        q("CP012","A de la difficulté à demeurer concentré/e sur une chose à la fois.",O_CONNERS),
        q("CP013","N'a pas d'amis/es.",O_CONNERS),
        q("CP014","Se met en colère.",O_CONNERS),
        q("CP015","Oublie des choses déjà apprises.",O_CONNERS),
        q("CP016","Intimide, menace ou fait peur aux autres.",O_CONNERS),
        q("CP017","Se sent sans valeur.",O_CONNERS),
        q("CP018","Je ne peux pas comprendre ce qui le/la rend heureux/se.",O_CONNERS),
        q("CP019","A la bougeotte, gigote.",O_CONNERS),
        q("CP020","A de la difficulté à contrôler ses inquiétudes.",O_CONNERS),
        q("CP021","Blâme les autres pour ses erreurs ou ses mauvais comportements.",O_CONNERS),
        q("CP022","Est sans cœur et cruel/le.",O_CONNERS),
        q("CP023","A une brève capacité d'attention.",O_CONNERS),
        q("CP024","A de la difficulté à garder ses amis/es.",O_CONNERS),
        q("CP025","Pleure souvent et facilement.",O_CONNERS),
        q("CP026","Ne peut pas faire les choses correctement.",O_CONNERS),
        q("CP027","Se sert d'une arme, par exemple un bâton, une brique, une bouteille brisée, un couteau ou une arme à feu.",O_CONNERS),
        q("CP028","Évite ou n'aime pas les choses qui demandent beaucoup d'efforts et qui ne sont pas amusantes.",O_CONNERS),
        q("CP029","Son humeur change rapidement et de manière radicale.",O_CONNERS),
        q("CP030","Initie délibérément des batailles avec les autres.",O_CONNERS),
        q("CP031","Fait des erreurs.",O_CONNERS),
        q("CP032","Il est difficile de lui plaire ou de l'amuser.",O_CONNERS),
        q("CP033","Dit la vérité, ne dit même pas de petits mensonges.",O_CONNERS),
        q("CP034","Ne termine pas ce qu'il/elle commence.",O_CONNERS),
        q("CP035","Ne semble pas écouter ce qui lui est dit.",O_CONNERS),
        q("CP036","A de la difficulté en lecture.",O_CONNERS)
      ]},
    { id:"B", titre:"Items 37 à 72",
      description:'0 = Pas vrai du tout · 1 = Un peu vrai · 2 = Assez vrai · 3 = Très vrai',
      questions:[
        q("CP037","A de la difficulté à débuter des tâches ou des projets.",O_CONNERS),
        q("CP038","Doit travailler très fort pour compléter les tâches difficiles.",O_CONNERS),
        q("CP039","Blesse physiquement les gens.",O_CONNERS),
        q("CP040","Il faut répondre à ses demandes immédiatement : est facilement frustré.",O_CONNERS),
        q("CP041","Est cruel/le envers les animaux.",O_CONNERS),
        q("CP042","Il est difficile de le/la motiver, même avec des friandises ou de l'argent.",O_CONNERS),
        q("CP043","Donne la réponse avant la fin de la question.",O_CONNERS),
        q("CP044","A de la difficulté à se concentrer.",O_CONNERS),
        q("CP045","Bouge constamment.",O_CONNERS),
        q("CP046","Ment pour blesser les gens.",O_CONNERS),
        q("CP047","Ne porte pas attention aux détails, fait des fautes d'inattention.",O_CONNERS),
        q("CP048","Est en colère et éprouve du ressentiment.",O_CONNERS),
        q("CP049","A de la difficulté à passer d'une activité à une autre.",O_CONNERS),
        q("CP050","Excitable, impulsif/ve.",O_CONNERS),
        q("CP051","A besoin d'explications supplémentaires sur les consignes.",O_CONNERS),
        q("CP052","Devient surstimulé/e.",O_CONNERS),
        q("CP053","Apprend les informations de manière séparée ; ne saisit pas la vue d'ensemble.",O_CONNERS),
        q("CP054","Agit comme s'il/si elle était animé/e par un moteur.",O_CONNERS),
        q("CP055","Dit la première chose qui lui vient à l'esprit.",O_CONNERS),
        q("CP056","Ment afin d'éviter de faire certaines choses ou afin d'obtenir les choses qu'il/elle veut.",O_CONNERS),
        q("CP057","Essaie de se venger.",O_CONNERS),
        q("CP058","Vole en cachette, par exemple vol à l'étalage ou falsification.",O_CONNERS),
        q("CP059","Embête ou ennuie délibérément les autres.",O_CONNERS),
        q("CP060","Lit lentement et avec beaucoup d'efforts.",O_CONNERS),
        q("CP061","A de la difficulté à attendre son tour.",O_CONNERS),
        q("CP062","Est parmi les derniers à être choisi par une équipe ou pour un jeu.",O_CONNERS),
        q("CP063","Complète ses projets à la dernière minute.",O_CONNERS),
        q("CP064","Interagit bien avec les autres enfants.",O_CONNERS),
        q("CP065","Endommage ou détruit volontairement les choses des autres.",O_CONNERS),
        q("CP066","Semble fatigué/e, a peu d'énergie.",O_CONNERS),
        q("CP067","Inattentif/ve, facilement distrait/e.",O_CONNERS),
        q("CP068","Ne suit pas les consignes, même lorsqu'il/elle les comprend et essaie de coopérer.",O_CONNERS),
        q("CP069","Court ou grimpe quand il/elle ne devrait pas le faire.",O_CONNERS),
        q("CP070","Semble « sur les nerfs », nerveux/se, tendu/e.",O_CONNERS),
        q("CP071","Est bruyant/e lors des jeux et des temps libres.",O_CONNERS),
        q("CP072","Planifie bien les choses.",O_CONNERS)
      ]},
    { id:"C", titre:"Items 73 à 108",
      description:'0 = Pas vrai du tout · 1 = Un peu vrai · 2 = Assez vrai · 3 = Très vrai',
      questions:[
        q("CP073","Est irritable et facilement embêté/e par les autres.",O_CONNERS),
        q("CP074","Se comporte comme un ange.",O_CONNERS),
        q("CP075","Oublie de remettre ses travaux complétés.",O_CONNERS),
        q("CP076","S'enfuit de la maison pour au moins une nuit, fugue.",O_CONNERS),
        q("CP077","S'ennuie.",O_CONNERS),
        q("CP078","A délibérément mis le feu afin de causer des dommages.",O_CONNERS),
        q("CP079","Ne complète pas ses travaux scolaires ou ses tâches, même lorsqu'il/elle les comprend et qu'il/elle essaie de coopérer.",O_CONNERS),
        q("CP080","Est patient/e et satisfait/e même lorsqu'il/elle attend longtemps.",O_CONNERS),
        q("CP081","A des crises de colère.",O_CONNERS),
        q("CP082","N'a plus de plaisir ou d'intérêt pour les activités.",O_CONNERS),
        q("CP083","Menace de blesser les autres.",O_CONNERS),
        q("CP084","A de la difficulté à organiser des tâches ou des activités.",O_CONNERS),
        q("CP085","Dérange les autres enfants.",O_CONNERS),
        q("CP086","Jure ou utilise un langage inapproprié.",O_CONNERS),
        q("CP087","N'arrive pas à saisir l'arithmétique.",O_CONNERS),
        q("CP088","Abandonne facilement les tâches difficiles.",O_CONNERS),
        q("CP089","Est déjà entré/e par effraction dans la maison, l'édifice ou la voiture de quelqu'un.",O_CONNERS),
        q("CP090","Est désordonné/e et désorganisé/e.",O_CONNERS),
        q("CP091","Sort tard le soir, même si c'est contre les règles.",O_CONNERS),
        q("CP092","Ne sait pas comment se faire des amis/es.",O_CONNERS),
        q("CP093","Quitte son siège lorsqu'il/elle devrait rester assis/e.",O_CONNERS),
        q("CP094","Refuse activement de faire ce que les adultes lui demandent.",O_CONNERS),
        q("CP095","A de la difficulté à demeurer concentré/e sur un travail ou un jeu pour une longue période de temps.",O_CONNERS),
        q("CP096","Vole en confrontant quelqu'un, par exemple agression, vol de sac à main ou vol à main armée.",O_CONNERS),
        q("CP097","Perd des choses, par exemple des travaux scolaires, des crayons, des livres, des outils ou des jouets.",O_CONNERS),
        q("CP098","Gigote ou se tortille sur son siège.",O_CONNERS),
        q("CP099","Agité/e ou hyperactif/ve.",O_CONNERS),
        q("CP100","Devient irritable lorsqu'anxieux/se.",O_CONNERS),
        q("CP101","Est facilement distrait/e par ce qu'il/elle voit ou entend.",O_CONNERS),
        q("CP102","S'obstine avec les adultes.",O_CONNERS),
        q("CP103","Est triste, morose ou irritable durant plusieurs journées consécutives.",O_CONNERS),
        q("CP104","Interrompt les autres, par exemple leurs conversations ou leurs jeux.",O_CONNERS),
        q("CP105","Est parfait/e en tout point.",O_CONNERS),
        q("CP106","Les problèmes de votre enfant affectent gravement ses travaux scolaires ou ses notes.",O_CONNERS),
        q("CP107","Les problèmes de votre enfant affectent gravement ses amitiés ou ses relations.",O_CONNERS),
        q("CP108","Les problèmes de votre enfant affectent gravement votre vie familiale.",O_CONNERS)
      ]}
  ],
  scoring:{
    type:'sum_items',
    certification:{source:'drive',status:'certifie'},
    items:['CP001','CP002','CP003','CP004','CP005','CP006','CP007','CP008','CP009','CP010','CP011','CP012','CP013','CP014','CP015','CP016','CP017','CP018','CP019','CP020','CP021','CP022','CP023','CP024','CP025','CP026','CP027','CP028','CP029','CP030','CP031','CP032','CP033','CP034','CP035','CP036','CP037','CP038','CP039','CP040','CP041','CP042','CP043','CP044','CP045','CP046','CP047','CP048','CP049','CP050','CP051','CP052','CP053','CP054','CP055','CP056','CP057','CP058','CP059','CP060','CP061','CP062','CP063','CP064','CP065','CP066','CP067','CP068','CP069','CP070','CP071','CP072','CP073','CP074','CP075','CP076','CP077','CP078','CP079','CP080','CP081','CP082','CP083','CP084','CP085','CP086','CP087','CP088','CP089','CP090','CP091','CP092','CP093','CP094','CP095','CP096','CP097','CP098','CP099','CP100','CP101','CP102','CP103','CP104','CP105','CP106','CP107','CP108'],
    maxTotal:324,
    note:"Source Drive Conners 3 Parent : 108 items cotés 0-3 en somme brute. Les deux questions ouvertes Q109/Q110 et les informations administratives ne sont pas codées ici car l'UI patient ne prend pas en charge les champs texte dans le catalogue. Aucune conversion T-score automatisée sans tables normatives validées."
  }
};
