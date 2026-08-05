import { O_RPS, O_JPT, O_04, O_03jt, O_YN, O_UPPS, O_YOUNG, O_BMS, O_CUNGI, O_PAS, O_ZARIT, O_DASS, O_CONNERS, O_MFI, q, qn, qs } from './shared';

export const Q_SOM_01 = {
  id:'Q_SOM_01', titre:'PSQI — Index de qualité du sommeil de Pittsburgh',
  instructions:'Ces questions concernent vos habitudes de sommeil habituelles au cours du dernier mois uniquement. Répondez aussi précisément que possible.',
  sections:[
    { id:'habitudes', titre:'Habitudes de sommeil',
      questions:[
        qs('Q1',"À quelle heure vous couchez-vous habituellement le soir ?",
          [{v:18,l:'18h00'},{v:19,l:'19h00'},{v:20,l:'20h00'},{v:21,l:'21h00'},{v:22,l:'22h00'},{v:23,l:'23h00'},{v:0,l:'00h00'},{v:1,l:'01h00'},{v:2,l:'02h00'},{v:3,l:'03h00'}]),
        qn('Q2',"Combien de temps (en minutes) vous faut-il généralement pour vous endormir ?",0,120,5,'min'),
        qs('Q3',"À quelle heure vous levez-vous habituellement le matin ?",
          [{v:4,l:'04h00'},{v:5,l:'05h00'},{v:6,l:'06h00'},{v:7,l:'07h00'},{v:8,l:'08h00'},{v:9,l:'09h00'},{v:10,l:'10h00'},{v:11,l:'11h00'},{v:12,l:'12h00'}]),
        qn('Q4',"Combien d'heures de sommeil effectif avez-vous en moyenne par nuit ?",0,14,0.5,'h'),
      ]},
    { id:'perturbations', titre:'Perturbations du sommeil (au cours du dernier mois)',
      description:"Pour chaque situation, indiquez la fréquence à laquelle elle a perturbé votre sommeil :\n0 = Aucune fois · 1 = Moins d'une fois par semaine · 2 = Une ou deux fois par semaine · 3 = Trois fois ou plus par semaine",
      questions:[
        q('Q5a',"Impossibilité de vous endormir en moins de 30 minutes",O_03jt),
        q('Q5b',"Réveil durant la nuit ou très tôt le matin",O_03jt),
        q('Q5c',"Lever pour aller aux toilettes",O_03jt),
        q('Q5d',"Difficultés à respirer correctement",O_03jt),
        q('Q5e',"Toux ou ronflement",O_03jt),
        q('Q5f',"Sensation de froid",O_03jt),
        q('Q5g',"Sensation de chaleur",O_03jt),
        q('Q5h',"Cauchemars",O_03jt),
        q('Q5i',"Douleurs",O_03jt),
        q('Q5j',"Autre raison perturbant votre sommeil",O_03jt),
      ]},
    { id:'qualite', titre:'Qualité générale du sommeil',
      questions:[
        q('Q6',"Comment évaluez-vous la qualité globale de votre sommeil ?",
          [{v:0,l:'Très bonne'},{v:1,l:'Plutôt bonne'},{v:2,l:'Plutôt mauvaise'},{v:3,l:'Très mauvaise'}]),
        q('Q7',"Au cours du dernier mois, à quelle fréquence avez-vous pris des médicaments pour vous aider à dormir ?",O_03jt),
        q('Q8',"Au cours du dernier mois, avec quelle fréquence avez-vous eu des difficultés à rester éveillé(e) (pendant les repas, la conduite, activités sociales) ?",O_03jt),
        q('Q9',"Au cours du dernier mois, dans quelle mesure avez-vous eu des difficultés à effectuer votre travail avec suffisamment d'enthousiasme ?",
          [{v:0,l:'Aucune difficulté'},{v:1,l:'Un peu difficile'},{v:2,l:'Assez difficile'},{v:3,l:'Très difficile'}]),
      ]},
    // Questions 10 et 11 du PSQI — le volet « conjoint ou camarade de chambre ».
    //
    // ELLES NE SONT PAS COTÉES, et c'est la source qui le dit : Buysse 1989
    // construit les sept composantes et le total /21 sur les seules questions
    // 1 à 9. Le moteur `psqi` est donc inchangé par leur ajout, et un banc de
    // garde le prouve (psqiVoletPartenaire.guard.test.ts) : sans lui, un futur
    // remaniement pourrait les faire entrer dans une composante sans que rien
    // ne s'y oppose.
    //
    // D'où `horsBareme: true`, et pas seulement `conditionnel`. Relevé en revue
    // adversariale sur la première rédaction de ce lot : `conditionnel` est lu
    // dans DEUX SENS OPPOSÉS. Le formulaire patient en fait un item facultatif ;
    // le prédicat de complétude du moteur clinique
    // (`clinicalSnapshot.hasExploitableRawAnswers`) le rend au contraire
    // OBLIGATOIRE dès que la condition est remplie. Sans `horsBareme`, un
    // patient déclarant un conjoint puis laissant 11a-e vides sortait le PSQI
    // entier du bilan — et `Q10`, qui n'a aucune condition, en sortait aussi
    // TOUTES les passations antérieures, qui ne peuvent pas la porter.
    //
    // Leur valeur est ailleurs : `11a` et `11b` — ronflement fort, pauses
    // respiratoires observées — sont les deux signaux d'apnée que seul un tiers
    // peut rapporter, et le questionnaire ne les recueillait pas. Ils
    // atteignent le praticien par les réponses lisibles de l'inbox et par la
    // synthèse, jamais par un score.
    //
    // Comme `Q5j`, `Q11e` est servie sans son champ « décrivez » : l'UI patient
    // n'a pas de champ texte libre (même motif que Q109/Q110 du Conners 3).
    { id:'partenaire', titre:'Conjoint ou camarade de chambre',
      description:"Ces questions ne comptent pas dans le score : elles renseignent le praticien sur ce qu'un tiers observe de vos nuits.\nLa première est à renseigner par tout le monde. Les cinq suivantes sont facultatives : si vous avez un conjoint ou un camarade de chambre, demandez-lui à quelle fréquence, au cours du dernier mois, il a observé ces situations — sinon, laissez-les sans réponse.",
      questions:[
        q('Q10',"Avez-vous un conjoint ou un camarade de chambre ?",
          [{v:0,l:'Pas de conjoint ni de camarade de chambre'},{v:1,l:'Conjoint ou camarade dans une autre chambre'},{v:2,l:'Conjoint dans la même chambre, mais pas dans le même lit'},{v:3,l:'Conjoint dans le même lit'}],
          {horsBareme:true}),
        q('Q11a',"Un ronflement fort",O_03jt,{conditionnel:'Q10>=1',horsBareme:true}),
        q('Q11b',"De longues pauses respiratoires pendant votre sommeil",O_03jt,{conditionnel:'Q10>=1',horsBareme:true}),
        q('Q11c',"Des saccades ou des secousses des jambes pendant que vous dormiez",O_03jt,{conditionnel:'Q10>=1',horsBareme:true}),
        q('Q11d',"Des épisodes de désorientation ou de confusion pendant le sommeil",O_03jt,{conditionnel:'Q10>=1',horsBareme:true}),
        q('Q11e',"D'autres motifs d'agitation pendant le sommeil",O_03jt,{conditionnel:'Q10>=1',horsBareme:true}),
      ]}
  ],
  // `severiteCroissante` : les quatre bandes du PSQI montent avec le total
  // (0-4 « Pas de trouble » → 17-21 « sévères »), et ses sept composantes sont
  // monotones. L'instrument est donc éligible au plancher garanti servi sur
  // recueil partiel. La grille elle-même reste dans le moteur (Buysse 1989).
  scoring:{type:'psqi', severiteCroissante:true}
};
// MFI-20 (Q_SOM_07). RECONSTRUIT le 2026-07-31 depuis sa source
// (WN-SRC-0397, « Echelle multidimensionnelle de fatigue pro def.pdf »), sur la
// règle du praticien : le servi porte les items de sa source.
//
// CE QUI ÉTAIT SERVI ÉTAIT L'INSTRUMENT LE PLUS ABÎMÉ DU CATALOGUE. Trois
// divergences critiques, et elles se composaient :
//   · l'échelle d'ACCORD 1→5 de la source était servie en fréquence 0→4 ;
//   · AUCUNE des dix inversions n'était appliquée ;
//   · les cinq sous-échelles étaient servies en deux sections inventées ;
//   · et trois bandes s'affichaient sur un /80, là où la source écrit « Il n'y a
//     pas de barème interprétation ».
// S'y ajoutait, mesuré au banc : ONZE des vingt libellés n'étaient pas ceux de
// la source, plusieurs de polarité inverse — l'item 14 de la source dit
// « Physiquement, je me sens en mauvaise condition », le servi disait « en état
// de faire beaucoup de choses ».
//
// Additionner sans inverser revient à sommer la fatigue et la vigueur dans le
// même sens : « je me sens en forme » comptait comme un symptôme. Le total
// enregistré n'était pas une mesure de fatigue, et c'est pourquoi les quatre
// passations de production sont neutralisées depuis le 2026-07-27.
//
// LA CLÉ DE CORRECTION VIENT DE LA SOURCE, pas de la littérature. Sa dernière
// page porte une « Grille de calcul de l'échelle MFI » — une colonne par
// sous-échelle, la case de chaque item marquée dans sa colonne, et « 6-réponse »
// inscrit sur les items à inverser. L'extraction automatique n'en rendait rien
// (une table vidée de sa mise en page) ; elle a été lue sur l'image de la page.
// Les dix inversions qu'elle donne — 1, 3, 4, 6, 7, 8, 11, 12, 15, 20 —
// recoupent exactement la liste que la source énonce en toutes lettres deux
// pages plus haut, ce qui vaut contrôle croisé.
export const Q_SOM_07 = {
  id:'Q_SOM_07', titre:'MFI-20 — Échelle multidimensionnelle de fatigue',
  instructions:"Nous aimerions comprendre comment vous vous sentiez récemment. Pour chaque affirmation, répondez 1 si vous n'êtes pas du tout d'accord, 5 si vous êtes tout à fait d'accord — toutes les nuances entre les deux sont possibles.",
  sections:[
    { id:'MFI', titre:'Vos réponses',
      questions:[
        q('M1',"Je me sens en forme",O_MFI),
        q('M2',"Physiquement, je n'ai pas la force de faire grand-chose",O_MFI),
        q('M3',"Je me sens très actif",O_MFI),
        q('M4',"J'ai envie de faire plein de choses agréables",O_MFI),
        q('M5',"Je me sens fatigué(e)",O_MFI),
        q('M6',"Je crois que j'en fais beaucoup dans une journée",O_MFI),
        q('M7',"Je suis capable de me concentrer sur ce que j'entreprends",O_MFI),
        q('M8',"J'ai une bonne résistance physique",O_MFI),
        q('M9',"Je suis stressé(e) à l'idée d'avoir quelque chose à faire",O_MFI),
        q('M10',"Je crois que je fais très peu dans une journée",O_MFI),
        q('M11',"J'arrive facilement à me concentrer",O_MFI),
        q('M12',"Je me sens reposé(e)",O_MFI),
        q('M13',"Il me faut beaucoup d'efforts pour me concentrer",O_MFI),
        q('M14',"Physiquement, je me sens en mauvaise condition",O_MFI),
        q('M15',"J'ai beaucoup de projets",O_MFI),
        q('M16',"Je me fatigue facilement",O_MFI),
        q('M17',"Je n'achève que très peu de choses",O_MFI),
        q('M18',"J'ai envie de ne rien faire",O_MFI),
        q('M19',"Je me laisse facilement distraire",O_MFI),
        q('M20',"Physiquement, je me sens en excellente forme",O_MFI),
      ]}
  ],
  scoring:{
    type:'subscore',
    // AUCUN SCORE GLOBAL, et c'est la source qui l'impose : elle ne totalise
    // jamais ses cinq sous-échelles et écrit « Il n'y a pas de barème
    // interprétation ». Une somme sur 100 se lirait comme une sévérité.
    sansTotalGlobal:true,
    subScores:[
      {id:'GEN', label:'Fatigue générale', items:['M1','M5','M12','M16'], reversed:['M1','M12'], max:20},
      {id:'PHY', label:'Fatigue physique', items:['M2','M8','M14','M20'], reversed:['M8','M20'], max:20},
      {id:'MEN', label:'Fatigue mentale', items:['M7','M11','M13','M19'], reversed:['M7','M11'], max:20},
      {id:'ACT', label:'Réduction des activités', items:['M3','M6','M10','M17'], reversed:['M3','M6'], max:20},
      {id:'MOT', label:'Réduction de la motivation', items:['M4','M9','M15','M18'], reversed:['M4','M15'], max:20},
    ],
    // Les seuils de la source dépendent du SEXE et de l'ÂGE, et ne portent que
    // sur la fatigue générale. Le moteur ne reçoit que des réponses : il ne peut
    // pas les appliquer sans se tromper de population. Ils sont donc rendus au
    // praticien en toutes lettres, jamais convertis en bandes.
    note:"Cinq sous-échelles de quatre items, chacune de 4 à 20 ; dix items sont inversés (6 − réponse) selon la clé de la source. L'instrument ne définit AUCUN score global ni barème d'interprétation. La source cite par ailleurs, pour la seule sous-échelle « Fatigue générale », des seuils suggérant une fatigue significative — hommes : ≥ 9 avant 40 ans, ≥ 11 de 40 à 59 ans, ≥ 14 à partir de 60 ans ; femmes : ≥ 11 avant 40 ans, ≥ 12 de 40 à 59 ans, ≥ 14 à partir de 60 ans. Elle les rapporte à des données épidémiologiques allemandes (25e percentile) qu'elle attribue à Schwarz et al. 2003 et Singer et al. 2011 ; ces deux références ne sont pas au dossier et ne sont donc pas vérifiées ici. Ils dépendent du sexe et de l'âge, que le scoring ne reçoit pas : ils s'apprécient au cas par cas et ne valent pas bande.",
  }
};
export const Q_SOM_03 = {
  id:'Q_SOM_03', titre:'Questionnaire de Berlin — Dépistage apnée du sommeil',
  instructions:'Ce questionnaire dépiste le syndrome d\'apnées obstructives du sommeil. Il comporte 3 catégories.',
  sections:[
    { id:'A', titre:'Catégorie 1 — Ronflements',
      questions:[
        qs('BE1','Ronflez-vous ?',
          [{v:0,l:'Non'},{v:1,l:'Oui'},{v:0,l:'Je ne sais pas'}]),
        qs('BE2','À quelle fréquence ronflez-vous ?',
          [{v:0,l:'Pas ou presque jamais'},{v:0,l:'Moins d\'1 fois/semaine'},{v:1,l:'1-2 fois/semaine'},{v:1,l:'3-4 fois/semaine'},{v:1,l:'Presque tous les soirs'}]),
        qs('BE3','Votre ronflement dérange-t-il votre entourage ?',
          [{v:0,l:'Non'},{v:0,l:'Oui, légèrement'},{v:1,l:'Oui, beaucoup'},{v:0,l:'Je ne sais pas'}]),
        q('BE4','Votre entourage a-t-il remarqué que vous arrêtiez de respirer pendant le sommeil ?',
          [{v:0,l:'Non'},{v:1,l:'Oui, parfois'},{v:1,l:'Oui, régulièrement'},{v:0,l:'Je ne sais pas'}]),
      ]},
    { id:'B', titre:'Catégorie 2 — Somnolence diurne',
      questions:[
        qs('BE5','Comment vous sentez-vous le matin au réveil ?',
          [{v:0,l:'Bien reposé(e)'},{v:0,l:'Légèrement fatigué(e)'},{v:1,l:'Souvent fatigué(e)'},{v:1,l:'Épuisé(e) presque chaque matin'}]),
        qs('BE6','Au cours de la journée, vous arrive-t-il de vous endormir involontairement ?',
          [{v:0,l:'Jamais'},{v:0,l:'Rarement'},{v:1,l:'Souvent'},{v:1,l:'Très souvent'}]),
        q('BE7','Vous êtes-vous déjà endormi(e) au volant ou avez-vous failli le faire ?',
          [{v:0,l:'Non'},{v:1,l:'Oui, au moins une fois'}]),
      ]},
    { id:'C', titre:'Catégorie 3 — Facteurs de risque',
      questions:[
        q('BE8','Avez-vous été traité(e) pour une hypertension artérielle ?',
          [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        qn('BE9','Quelle est votre indice de masse corporelle approximatif (poids en kg / taille² en m) ?',10,60,0.5,'kg/m²'),
      ]},
  ],
  scoring:{type:'berlin'}
};
// Agenda du sommeil — 21 nuits (Q_SOM_09). Instrument de RECUEIL longitudinal :
// le patient saisit une nuit par matin via un composant dédié (jamais le rendu
// générique). Les items ci-dessous sont des PSEUDO-ITEMS d'agrégats produits à
// la CLÔTURE (cf. lib/agenda-sommeil/agregats.ts) — ils ne sont jamais saisis
// ni montrés au patient ; ils existent pour que le scoring `agenda_sommeil` les
// lise dans `rawAnswers` et pour la compatibilité fiche/équilibre.
//
// TROIS STATUTS DE PREUVE DISTINCTS, à ne pas confondre :
//   — le recueil nuit par nuit est un agenda du sommeil standard (SIIN,
//     Consensus Sleep Diary) ;
//   — les métriques dérivées (TST, efficacité, écart-type du milieu) sont des
//     grandeurs usuelles de la littérature ;
//   — l'indice /100 ci-dessous est une CONSTRUCTION WellNeuro, approuvée par le
//     praticien mais sans validation psychométrique ni cohorte de calibration.
//     Niveau de preuve D. Il se lit comme un indice longitudinal — le patient
//     comparé à lui-même — et jamais comme un résultat diagnostique.
export const Q_SOM_09 = {
  id:'Q_SOM_09', titre:'Agenda du sommeil — 21 nuits',
  instructions:"Chaque matin pendant trois semaines, notez en une minute votre nuit passée. Vos saisies restent visibles sous forme d'une frise ; l'analyse est transmise à votre praticien à la fin du recueil.",
  sections:[
    { id:'agregats', titre:'Agrégats générés à la clôture — jamais saisis',
      description:"Valeurs calculées automatiquement à partir des nuits renseignées. Le patient ne les voit pas. Une métrique non couverte vaut null, jamais 0.",
      questions:[
        qn('AGD_NB_NUITS',"Nombre de nuits renseignées",0,21,1,'nuits'),
        qn('AGD_FENETRE_MOY',"Fenêtre de sommeil (extinction → lever)",0,960,1,'min'),
        qn('AGD_TIB_MOY',"Temps au lit (mise au lit → lever)",0,1200,1,'min'),
        qn('AGD_PRELIT_MOY',"Temps au lit avant extinction",0,480,1,'min'),
        qn('AGD_TST_MOY',"Temps de sommeil total moyen",0,960,1,'min'),
        qn('AGD_EFF_MOY',"Efficacité du sommeil moyenne",0,100,1,'%'),
        qn('AGD_LAT_MED',"Latence d'endormissement médiane",0,120,1,'min'),
        qn('AGD_WASO_MOY',"Éveil nocturne cumulé moyen",0,240,1,'min'),
        qn('AGD_TWAK_MOY',"Éveil au lit après le réveil final",0,480,1,'min'),
        qn('AGD_REV_MOY',"Réveils nocturnes moyens par nuit",0,3,0.1,'réveils'),
        qn('AGD_REG_ECT',"Régularité (écart-type du milieu de sommeil)",0,360,1,'min'),
        qn('AGD_QUAL_MOY',"Qualité subjective moyenne",1,5,0.1,''),
        qn('AGD_FREQ_LAT30_SEM',"Nuits par semaine à endormissement > 30 min",0,7,0.1,'nuits'),
        qn('AGD_FREQ_WASO30_SEM',"Nuits par semaine à éveil nocturne > 30 min",0,7,0.1,'nuits'),
        qn('AGD_FREQ_CRITERE_SEM',"Nuits par semaine au-delà de 30 min (l'un ou l'autre)",0,7,0.1,'nuits'),
        qn('AGD_NB_NUITS_AIDE',"Nuits sous aide au sommeil",0,21,1,'nuits'),
        qn('AGD_NB_NUITS_TST',"Nuits exploitables pour le temps de sommeil",0,21,1,'nuits'),
        qn('AGD_NB_NUITS_EFF',"Nuits exploitables pour l'efficacité",0,21,1,'nuits'),
        qn('AGD_NB_NUITS_PRELIT',"Nuits où le mode de coucher est connu",0,21,1,'nuits'),
        qn('AGD_NB_NUITS_REV',"Nuits où le compte de réveils est connu",0,21,1,'nuits'),
        qn('AGD_NB_NUITS_TWAK',"Nuits où le mode de lever est connu",0,21,1,'nuits'),
        qn('AGD_NB_NUITS_FREQ',"Nuits classables pour le seuil de 30 min",0,21,1,'nuits'),
        qn('AGD_NB_NUITS_AIDE_CONNU',"Nuits où l'aide au sommeil est renseignée",0,21,1,'nuits'),
        qn('AGD_NB_NUITS_WE',"Nuits de week-end retenues",0,21,1,'nuits'),
        qn('AGD_INDICE_ELIGIBLE',"Couverture suffisante pour l'indice composite",0,1,1,''),
      ]},
  ],
  scoring:{
    type:'agenda_sommeil',
    maxTotal:100,
    // Quatorze nuits, et non cinq : une moyenne se stabilise vite, une
    // variabilité non — et c'est la régularité qui pèse un quart de l'indice.
    minNuits:14,
    // Plancher par AXE : un axe alimenté par moins de nuits que cela sort de
    // l'indice. Le compte global ne dit rien de la couverture de chaque axe, qui
    // diverge dès qu'une fenêtre mélange des nuits d'avant et d'après un
    // changement de contrat.
    minNuitsAxe:7,
    note:"Indice longitudinal WellNeuro — non diagnostique (niveau de preuve D). Quatre sous-indices indépendants /25 : durée, efficacité, régularité, qualité vécue. Latence et nombre de réveils sont affichés comme métriques brutes ; ils entrent dans l'indice à travers l'efficacité, jamais une seconde fois.",
    interpretation:[
      {min:0, max:49, label:'Sommeil nettement perturbé',color:'danger'},
      {min:50,max:74, label:'Fragilités du sommeil',color:'warning'},
      {min:75,max:100,label:'Sommeil globalement satisfaisant',color:'success'},
    ]
  }
};
export const Q_SOM_04 = {
  id:'Q_SOM_04', titre:'IRLS — Syndrome des jambes sans repos (Échelle internationale)',
  instructions:'Pour chaque question, choisissez la réponse qui décrit le mieux vos symptômes au cours des 7 derniers jours.',
  sections:[
    { id:'A', titre:'Intensité et fréquence des symptômes',
      questions:[
        qs('IR1','Quel est l\'inconfort ressenti dans vos jambes ou bras lorsque vous êtes immobile ?',
          [{v:0,l:'Aucun'},{v:1,l:'Léger'},{v:2,l:'Modéré'},{v:3,l:'Sévère'},{v:4,l:'Très sévère'}]),
        qs('IR2','Quel est le besoin de bouger les jambes ou bras lorsque vous êtes au repos ?',
          [{v:0,l:'Aucun'},{v:1,l:'Léger'},{v:2,l:'Modéré'},{v:3,l:'Sévère'},{v:4,l:'Très sévère'}]),
        qs('IR3','Le mouvement vous soulage-t-il des symptômes ?',
          [{v:0,l:'Soulagement complet'},{v:1,l:'Soulagement important'},{v:2,l:'Soulagement modéré'},{v:3,l:'Faible soulagement'},{v:4,l:'Aucun soulagement'}]),
        qs('IR4','Quelle est la perturbation de votre sommeil due aux symptômes ?',
          [{v:0,l:'Aucune'},{v:1,l:'Légère'},{v:2,l:'Modérée'},{v:3,l:'Sévère'},{v:4,l:'Très sévère'}]),
        qs('IR5','Quelle est votre fatigue ou somnolence diurne due aux symptômes ?',
          [{v:0,l:'Aucune'},{v:1,l:'Légère'},{v:2,l:'Modérée'},{v:3,l:'Sévère'},{v:4,l:'Très sévère'}]),
        qs('IR6','Comment évaluez-vous la sévérité globale de vos symptômes ?',
          [{v:0,l:'Absente'},{v:1,l:'Légère'},{v:2,l:'Modérée'},{v:3,l:'Sévère'},{v:4,l:'Très sévère'}]),
        qs('IR7','À quelle fréquence surviennent vos symptômes ?',
          [{v:0,l:'Jamais'},{v:1,l:'Moins d\'1 fois/semaine'},{v:2,l:'1-2 fois/semaine'},{v:3,l:'3-4 fois/semaine'},{v:4,l:'Tous les jours ou presque'}]),
        qs('IR8','Quand les symptômes surviennent-ils, quelle est leur durée quotidienne ?',
          [{v:0,l:'Absents'},{v:1,l:'< 1 heure'},{v:2,l:'1-3 heures'},{v:3,l:'3-8 heures'},{v:4,l:'> 8 heures'}]),
        qs('IR9','Dans quelle mesure les symptômes perturbent-ils vos activités quotidiennes (travail, loisirs, famille) ?',
          [{v:0,l:'Pas du tout'},{v:1,l:'Légèrement'},{v:2,l:'Modérément'},{v:3,l:'Sévèrement'},{v:4,l:'Très sévèrement'}]),
        qs('IR10','Quel est votre niveau d\'irritabilité, dépression ou anxiété lié aux symptômes ?',
          [{v:0,l:'Nul'},{v:1,l:'Léger'},{v:2,l:'Modéré'},{v:3,l:'Sévère'},{v:4,l:'Très sévère'}]),
      ]},
  ],
  scoring:{
    type:'sum', severiteCroissante:true, maxTotal:40,
    interpretation:[
      {min:0, max:0,  label:'Absence de syndrome des jambes sans repos',color:'success',protocol:''},
      {min:1, max:10, label:'SJSR léger',color:'info',protocol:'Correction déficits : fer, magnésium, vitamine D, folates — hygiène de vie'},
      {min:11,max:20, label:'SJSR modéré',color:'warning',protocol:'Bilan biologique complet (ferritine++) + micronutrition spécialisée + avis neurologique'},
      {min:21,max:30, label:'SJSR sévère',color:'danger',protocol:'Consultation neurologique — envisager traitement pharmacologique + micronutrition'},
      {min:31,max:40, label:'SJSR très sévère',color:'danger',protocol:'Prise en charge neurologique urgente'},
    ]
  }
};
