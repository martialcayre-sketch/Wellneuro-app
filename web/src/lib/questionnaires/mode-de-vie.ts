// @ts-nocheck
/* eslint-disable */
import { O_RPS, O_JPT, O_04, O_03jt, O_YN, O_UPPS, O_YOUNG, O_BMS, O_CUNGI, O_PAS, O_ZARIT, O_DASS, O_CONNERS, q, qn, qs } from './shared';

export const Q_MOD_03 = {
  id:'Q_MOD_03', titre:'Mes plaintes actuelles et troubles ressentis',
  instructions:'Des valeurs élevées représentent l’intensité des troubles actuellement ressentis. 1 correspond à l’absence de problème et 10 correspond à un degré maximum de problèmes et troubles.',
  sections:[
    { id:'A', titre:'Plaintes actuelles',
      questions:[
        qn('Q001','Fatigue — 10 = je suis très fatigué(e), épuisé(e) / 1 = j’ai une bonne vitalité',1,10,1,''),
        qn('Q002','Douleurs — 10 = je ressens des douleurs intenses ou chroniques / 1 = je ne ressens aucune douleur',1,10,1,''),
        qn('Q003','Digestion — 10 = je souffre de beaucoup de troubles digestifs et intestinaux / 1 = je n’ai aucun problème de digestion, ni troubles intestinaux',1,10,1,''),
        qn('Q004','Surpoids — 10 = j’ai des problèmes de surpoids importants / 1 = je n’ai aucun problème de poids',1,10,1,''),
        qn('Q005','Insomnie — 10 = je souffre d’insomnie ou de troubles du sommeil / 1 = je n’ai aucun problème de sommeil',1,10,1,''),
        qn('Q006','Moral — 10 = je souffre de beaucoup de troubles dépressifs ou d’anxiété ou d’angoisse / 1 = j’ai un bon moral, je suis serein(e)',1,10,1,''),
        qn('Q007','Mobilité — 10 = je souffre de beaucoup de troubles de mobilité / 1 = je n’ai aucun problème de mobilité',1,10,1,''),
      ]},
  ],
  scoring:{
    type:'plaintes_actuelles',
    minTotal:7,
    maxTotal:70,
    certification:{source:'drive',status:'certifie'},
    note:'Source Drive : questionnaire de suivi longitudinal, sans seuil diagnostique. Les lectures faible/modérée/élevée/très élevée sont descriptives.',
    domains:[
      {id:'fatigue', label:'Fatigue', item:'Q001'},
      {id:'douleurs', label:'Douleurs', item:'Q002'},
      {id:'digestion', label:'Digestion', item:'Q003'},
      {id:'surpoids', label:'Surpoids', item:'Q004'},
      {id:'sommeil', label:'Sommeil / insomnie', item:'Q005'},
      {id:'moral', label:'Moral / anxiété / angoisse', item:'Q006'},
      {id:'mobilite', label:'Mobilité', item:'Q007'},
    ],
    interpretation:[
      {min:1,max:3,label:'Intensité faible ou absente',color:'success'},
      {min:4,max:6,label:'Intensité modérée',color:'warning'},
      {min:7,max:8,label:'Intensité élevée',color:'danger'},
      {min:9,max:10,label:'Intensité très élevée',color:'danger'},
    ]
  }
};
export const Q_MOD_01 = {
  id:'Q_MOD_01', titre:'Questionnaire contextuel de mode de vie SIIN',
  instructions:'Répondez spontanément en vous évaluant sur les dernières semaines.',
  sections:[
    { id:'SOMMEIL', titre:'Votre sommeil',
      questions:[
        q('SOMMEIL_Q001','Estimez-vous avoir un sommeil satisfaisant ?',[{v:4,l:'Excellent sommeil'},{v:3,l:'Tout à fait satisfaisant'},{v:2,l:'Plutôt satisfaisant'},{v:1,l:'Peu satisfaisant'},{v:0,l:'Pas du tout satisfaisant'}]),
        q('SOMMEIL_Q002','Avez-vous des difficultés pour vous endormir ou pour rester endormi ?',[{v:4,l:'Aucune'},{v:3,l:'Légère'},{v:2,l:'Moyenne'},{v:1,l:'Importante'},{v:0,l:'Extrême'}]),
        q('SOMMEIL_Q003','Comment vous sentez-vous le matin au réveil ?',[{v:4,l:'Reposé et en pleine forme'},{v:3,l:'Plutôt reposé'},{v:2,l:'Variable, parfois encore fatigué'},{v:1,l:'Encore fatigué'},{v:0,l:'Tout à fait fatigué'}]),
        q('SOMMEIL_Q004','Combien d\'heures de sommeil avez-vous en moyenne ?',[{v:0,l:'< 5h30'},{v:1,l:'5h30 à 6h30'},{v:2,l:'6h30 à 7h30'},{v:3,l:'7h30 à 8h30'},{v:4,l:'> 8h30'}]),
        q('SOMMEIL_Q005','Estimez-vous manquer de temps de sommeil ?',[{v:12,l:'Pas du tout'},{v:9,l:'Légèrement'},{v:6,l:'Moyennement'},{v:3,l:'Importante'},{v:0,l:'Extrêmement'}]),
      ]},
    { id:'RYTHME_BIOLOGIQUE', titre:'Votre rythme biologique',
      questions:[
        q('RYTHME_BIOLOGIQUE_Q001','Le soir lorsque je ressens l\'envie de dormir je m\'écoute et je respecte mon rythme.',[{v:4,l:'Oui toujours'},{v:3,l:'Le plus souvent'},{v:2,l:'Fréquemment'},{v:1,l:'Très variable'},{v:0,l:'Rarement ou jamais'}]),
        q('RYTHME_BIOLOGIQUE_Q002','Avez-vous des horaires de sommeil réguliers ? (heures de lever et de coucher régulières)',[{v:8,l:'Oui toujours régulier'},{v:6,l:'Oui le plus souvent régulier'},{v:4,l:'Variable'},{v:2,l:'Rarement régulier'},{v:0,l:'Tout à fait irrégulier'}]),
        q('RYTHME_BIOLOGIQUE_Q003','Dans votre métier, avez-vous un travail posté, un travail de nuit, les décalages horaires ?',[{v:8,l:'Non, jamais'},{v:6,l:'Très rarement'},{v:4,l:'Occasionnellement'},{v:2,l:'Fréquemment'},{v:0,l:'Régulièrement'}]),
        q('RYTHME_BIOLOGIQUE_Q004','Regardez-vous des écrans lumineux le soir après 20 heures (téléphone, ordinateur, tablette) ?',[{v:0,l:'Chaque soir'},{v:1,l:'Plusieurs fois/semaine'},{v:2,l:'Occasionnellement'},{v:3,l:'Rarement'},{v:4,l:'Jamais'}]),
        q('RYTHME_BIOLOGIQUE_Q005','Avez-vous des heures de sommeil avant minuit ?',[{v:4,l:'Oui toujours'},{v:3,l:'Oui le plus souvent'},{v:2,l:'Oui au moins 3 x/sem'},{v:1,l:'Rarement'},{v:0,l:'Jamais'}]),
      ]},
    { id:'ADAPTATION_STRESS', titre:'Votre adaptation et le stress',
      questions:[
        q('ADAPTATION_STRESS_Q001','Comment réagissez-vous en situation de stress habituellement ?',[{v:8,l:'Je gère très bien, toujours'},{v:6,l:'Je gère bien, le plus souvent'},{v:4,l:'Je gère occasionnellement'},{v:2,l:'Je me sens vulnérable'},{v:0,l:'Je me sens complètement dépassé'}]),
        q('ADAPTATION_STRESS_Q002','Lors de situations stressantes imprévues, ressentez-vous des troubles (palpitations, angoisse, insomnie, troubles digestifs...) ?',[{v:0,l:'Toujours'},{v:1,l:'Très fréquemment'},{v:2,l:'Occasionnellement'},{v:3,l:'Rarement'},{v:4,l:'Jamais'}]),
        q('ADAPTATION_STRESS_Q003','Estimez-vous que votre vie personnelle, familiale ou professionnelle est une source de stress ?',[{v:0,l:'Stress intense et quotidien'},{v:1,l:'Stress intense et occasionnel'},{v:2,l:'Stress modéré'},{v:3,l:'Rarement stressé, par à-coups'},{v:4,l:'Peu de stress'}]),
        q('ADAPTATION_STRESS_Q004','Est-ce que vos proches ou votre entourage disent de vous que vous êtes une personne très stressée ?',[{v:0,l:'Toujours'},{v:1,l:'Très fréquemment'},{v:2,l:'Occasionnellement'},{v:3,l:'Rarement'},{v:4,l:'Jamais'}]),
        q('ADAPTATION_STRESS_Q005','Pratiquez-vous une méthode de gestion du stress (relaxation, sophrologie, yoga, méditation, jardinage, promenade dans la nature...) ?',[{v:8,l:'Oui, avec efficacité'},{v:6,l:'Oui mais insuffisant'},{v:4,l:'Parfois'},{v:2,l:'Très rarement'},{v:0,l:'Non, jamais'}]),
      ]},
    { id:'ACTIVITE_PHYSIQUE', titre:'Votre activité physique',
      questions:[
        q('ACTIVITE_PHYSIQUE_Q001','À quelle fréquence pratiquez-vous une activité physique ou sportive intense ? (dans votre métier ou vos loisirs)',[{v:4,l:'Régulièrement > 7 h/sem'},{v:3,l:'3 à 6 h/sem'},{v:2,l:'1 à 3 h/sem'},{v:1,l:'< 1 h/sem'},{v:0,l:'Rarement ou jamais'}]),
        q('ACTIVITE_PHYSIQUE_Q002','À quelle fréquence avez-vous une activité physique modérée ? (type marche sans essoufflement)',[{v:4,l:'Régulièrement > 7 h/sem'},{v:3,l:'3 à 6 h/sem'},{v:2,l:'1 à 3 h/sem'},{v:1,l:'< 1 h/sem'},{v:0,l:'Rarement ou jamais'}]),
        q('ACTIVITE_PHYSIQUE_Q003','À quelle fréquence avez-vous une activité corporelle "douce" ? (type séance de gymnastique, yoga, stretching...)',[{v:4,l:'Tous les jours'},{v:3,l:'Plusieurs fois par semaine'},{v:2,l:'Une fois par semaine'},{v:1,l:'Occasionnellement'},{v:0,l:'Jamais'}]),
        q('ACTIVITE_PHYSIQUE_Q004','Quel est votre niveau d\'activité dans votre vie quotidienne ?',[{v:4,l:'Actif(ve), je bouge régulièrement'},{v:3,l:'Plutôt actif(ve)'},{v:2,l:'Variable'},{v:1,l:'Activité et mouvement plutôt modéré'},{v:0,l:'Je suis plutôt inactif(ve)'}]),
        q('ACTIVITE_PHYSIQUE_Q005','Quel est votre temps passé assis, immobile sans bouger (d\'affilée) ?',[{v:4,l:'Jamais plus de 30 minutes'},{v:3,l:'Jamais plus d\'1 heure'},{v:2,l:'Jamais plus de 2 h'},{v:1,l:'Entre 3 et 5 h/jour'},{v:0,l:'Plus de 5 h/jour'}]),
      ]},
    { id:'EXPOSITION_TOXIQUES', titre:'Votre exposition aux toxiques',
      questions:[
        q('EXPOSITION_TOXIQUES_Q001','Êtes-vous exposé à un environnement pollué ou potentiellement toxique ? (lieu de travail, pollution industrielle, fumée, bruit excessif...)',[{v:0,l:'Très fréquemment'},{v:1,l:'Fréquemment'},{v:2,l:'Occasionnellement'},{v:3,l:'Rarement'},{v:4,l:'Jamais'}]),
        q('EXPOSITION_TOXIQUES_Q002','Consommez-vous du tabac ?',[{v:0,l:'Je suis fumeur au quotidien'},{v:3,l:'Je souhaite arrêter de fumer'},{v:6,l:'Je fume très occasionnellement'},{v:9,l:'J\'ai arrêté de fumer'},{v:12,l:'Je n\'ai jamais fumé'}]),
        q('EXPOSITION_TOXIQUES_Q003','Consommez-vous du cannabis ou autre drogue...',[{v:0,l:'Quotidiennement'},{v:1,l:'Plusieurs fois par semaine'},{v:2,l:'Occasionnellement'},{v:3,l:'Exceptionnellement'},{v:4,l:'Jamais'}]),
        q('EXPOSITION_TOXIQUES_Q004','Consommez-vous de l\'alcool (vin, bière, apéritif, autres boissons alcoolisées...)',[{v:0,l:'Plus de 3 verres/jour'},{v:1,l:'2 verres tous les jours'},{v:2,l:'Moins de 2 verres/jour'},{v:3,l:'Occasionnellement'},{v:4,l:'Jamais'}]),
        q('EXPOSITION_TOXIQUES_Q005','Consommez-vous des produits très cuits ou grillés (barbecue, pain grillé, friture...)',[{v:0,l:'Plus de 3 fois/semaine'},{v:1,l:'2 à 3 fois/semaine'},{v:2,l:'1 fois/semaine'},{v:3,l:'Occasionnellement'},{v:4,l:'Très rarement'}]),
      ]},
    { id:'RELATION_AUX_AUTRES', titre:'Votre relation aux autres',
      questions:[
        q('RELATION_AUX_AUTRES_Q001','J\'ai peu de contacts, je me sens isolé, je souffre de solitude.',[{v:0,l:'Toujours en effet'},{v:1,l:'Le plus souvent'},{v:2,l:'Occasionnellement'},{v:3,l:'Rarement'},{v:4,l:'Jamais'}]),
        q('RELATION_AUX_AUTRES_Q002','J\'ai de nombreuses activités sociales, des réseaux sociaux importants.',[{v:4,l:'Tout à fait'},{v:3,l:'Plutôt actif(ve)'},{v:2,l:'Variable'},{v:1,l:'Pas vraiment'},{v:0,l:'Pas du tout'}]),
        q('RELATION_AUX_AUTRES_Q003','Dans mon quotidien je souffre de relations familiales ou professionnelles toxiques, de harcèlement.',[{v:0,l:'En effet très fréquemment'},{v:1,l:'Oui régulièrement'},{v:2,l:'Parfois'},{v:3,l:'Très rarement'},{v:4,l:'Jamais'}]),
        q('RELATION_AUX_AUTRES_Q004','Au sein de ma famille, parents, enfants, conjoints, je ressens de nombreux conflits.',[{v:0,l:'En effet très fréquemment'},{v:1,l:'Oui régulièrement'},{v:2,l:'Parfois'},{v:3,l:'Très rarement'},{v:4,l:'Jamais'}]),
        q('RELATION_AUX_AUTRES_Q005','J\'ai des facilités de communication et d\'expression de mon ressenti.',[{v:4,l:'Je suis tout à fait à l\'aise'},{v:3,l:'Je suis plutôt à l\'aise'},{v:2,l:'Variable selon les circonstances'},{v:1,l:'J\'ai plutôt des difficultés'},{v:0,l:'J\'ai beaucoup de difficultés'}]),
      ]},
    { id:'MODE_ALIMENTAIRE', titre:'Votre mode alimentaire',
      questions:[
        q('MODE_ALIMENTAIRE_Q001','Je connais et j\'adopte les recommandations d\'alimentation-santé (telles que celles du PNNS 4).',[{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Occasionnellement'},{v:3,l:'Très fréquemment'},{v:4,l:'Toujours'}]),
        q('MODE_ALIMENTAIRE_Q002','Je favorise l\'achat et la consommation des aliments sains, de saison, peu transformés, complets et bio.',[{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Occasionnellement'},{v:3,l:'Très fréquemment'},{v:4,l:'Toujours'}]),
        q('MODE_ALIMENTAIRE_Q003','Je limite la consommation de charcuterie, viande rouge.',[{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Occasionnellement'},{v:3,l:'Très fréquemment'},{v:4,l:'Toujours'}]),
        q('MODE_ALIMENTAIRE_Q004','Je limite la consommation de produits salés, de sucreries et de boissons sucrées.',[{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Occasionnellement'},{v:3,l:'Très fréquemment'},{v:4,l:'Toujours'}]),
        q('MODE_ALIMENTAIRE_Q005','Je favorise la consommation de produits végétaux, fruits, légumes, légumes secs, noix...',[{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Occasionnellement'},{v:3,l:'Très fréquemment'},{v:4,l:'Toujours'}]),
        q('MODE_ALIMENTAIRE_Q006','Je favorise la consommation de poissons gras, d\'huile de colza ou d\'olive.',[{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Occasionnellement'},{v:3,l:'Très fréquemment'},{v:4,l:'Toujours'}]),
        q('MODE_ALIMENTAIRE_Q007','Je favorise une cuisine saine, fait maison, limitant les cuissons excessives (BBQ, fritures...).',[{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Occasionnellement'},{v:3,l:'Très fréquemment'},{v:4,l:'Toujours'}]),
      ]},
  ],
  scoring:{
    type:'subscore',
    subScores:[
      {id:'SOMMEIL',label:'Sommeil',items:['SOMMEIL_Q001','SOMMEIL_Q002','SOMMEIL_Q003','SOMMEIL_Q004','SOMMEIL_Q005'],max:28},
      {id:'RYTHME_BIOLOGIQUE',label:'Rythme biologique',items:['RYTHME_BIOLOGIQUE_Q001','RYTHME_BIOLOGIQUE_Q002','RYTHME_BIOLOGIQUE_Q003','RYTHME_BIOLOGIQUE_Q004','RYTHME_BIOLOGIQUE_Q005'],max:28},
      {id:'ADAPTATION_STRESS',label:'Adaptation et stress',items:['ADAPTATION_STRESS_Q001','ADAPTATION_STRESS_Q002','ADAPTATION_STRESS_Q003','ADAPTATION_STRESS_Q004','ADAPTATION_STRESS_Q005'],max:28},
      {id:'ACTIVITE_PHYSIQUE',label:'Activité physique',items:['ACTIVITE_PHYSIQUE_Q001','ACTIVITE_PHYSIQUE_Q002','ACTIVITE_PHYSIQUE_Q003','ACTIVITE_PHYSIQUE_Q004','ACTIVITE_PHYSIQUE_Q005'],max:20},
      {id:'EXPOSITION_TOXIQUES',label:'Exposition aux toxiques',items:['EXPOSITION_TOXIQUES_Q001','EXPOSITION_TOXIQUES_Q002','EXPOSITION_TOXIQUES_Q003','EXPOSITION_TOXIQUES_Q004','EXPOSITION_TOXIQUES_Q005'],max:28},
      {id:'RELATION_AUX_AUTRES',label:'Relation aux autres',items:['RELATION_AUX_AUTRES_Q001','RELATION_AUX_AUTRES_Q002','RELATION_AUX_AUTRES_Q003','RELATION_AUX_AUTRES_Q004','RELATION_AUX_AUTRES_Q005'],max:20},
      {id:'MODE_ALIMENTAIRE',label:'Mode alimentaire',items:['MODE_ALIMENTAIRE_Q001','MODE_ALIMENTAIRE_Q002','MODE_ALIMENTAIRE_Q003','MODE_ALIMENTAIRE_Q004','MODE_ALIMENTAIRE_Q005','MODE_ALIMENTAIRE_Q006','MODE_ALIMENTAIRE_Q007'],max:28},
    ],
    interpretation:[
      {subscale:'SOMMEIL',ranges:[{min:0,max:8,label:'Sommeil non réparateur',color:'danger'},{min:10,max:14,label:'Sommeil insuffisant',color:'warning'},{min:15,max:28,label:'Sommeil satisfaisant',color:'success'}]},
      {subscale:'RYTHME_BIOLOGIQUE',ranges:[{min:0,max:8,label:'Rythme non réparateur',color:'danger'},{min:10,max:14,label:'Rythme insuffisant',color:'warning'},{min:15,max:28,label:'Rythme satisfaisant',color:'success'}]},
      {subscale:'ADAPTATION_STRESS',ranges:[{min:0,max:8,label:'Adaptation perturbée',color:'danger'},{min:10,max:17,label:'Adaptation insuffisante',color:'warning'},{min:18,max:24,label:'Adaptation satisfaisante',color:'success'}]},
      {subscale:'ACTIVITE_PHYSIQUE',ranges:[{min:0,max:6,label:'Activité non satisfaisante',color:'danger'},{min:7,max:13,label:'Activité insuffisante',color:'warning'},{min:14,max:20,label:'Activité satisfaisante',color:'success'}]},
      {subscale:'EXPOSITION_TOXIQUES',ranges:[{min:0,max:8,label:'Exposition non satisfaisante',color:'danger'},{min:10,max:14,label:'Exposition insuffisante',color:'warning'},{min:15,max:28,label:'Exposition satisfaisante',color:'success'}]},
      {subscale:'RELATION_AUX_AUTRES',ranges:[{min:0,max:6,label:'Relation non satisfaisante',color:'danger'},{min:7,max:13,label:'Relation insuffisante',color:'warning'},{min:14,max:20,label:'Relation satisfaisante',color:'success'}]},
      {subscale:'MODE_ALIMENTAIRE',ranges:[{min:0,max:10,label:'Mode alimentaire non satisfaisant',color:'danger'},{min:11,max:20,label:'Mode alimentaire insuffisant',color:'warning'},{min:21,max:28,label:'Mode alimentaire satisfaisant',color:'success'}]},
    ]
  }
};
export const Q_MOD_02 = {
  id:'Q_MOD_02', titre:'Activité et dépense énergétique globale SIIN',
  instructions:'Identifiez votre niveau d\'activité habituelle au travail et en dehors du travail.',
  sections:[
    { id:'A', titre:'Niveau d\'activité',
      questions:[
        qs('ACT_DEP_EN_Q001','Que faites-vous lors de votre travail ?',
          [{v:0,l:'Je reste assis en permanence'},{v:1,l:'Je me lève et marche fréquemment'},{v:2,l:'J\'exerce un travail manuel'}]),
        qs('ACT_DEP_EN_Q002','Que faites-vous en dehors de votre travail ?',
          [{v:0,l:'Je reste assis'},{v:1,l:'J\'ai une activité sportive de loisirs, une ou plusieurs fois par semaine'},{v:2,l:'J\'ai une activité sportive de compétition'}]),
      ]},
  ],
  scoring:{
    type:'sum_no_interpretation', maxTotal:4,
    note:'Interprétation source non linéaire : activité forte si au moins une réponse est forte; sinon activité moyenne si au moins une réponse est moyenne; sinon faible. Estimation énergétique proposée par la source : 2000/2200/2400/2600 kcal selon 0/1/2/3 critères (âge <45, sexe masculin, activité moyenne ou forte).'
  }
};
