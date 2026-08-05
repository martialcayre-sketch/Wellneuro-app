import { describe, expect, it } from 'vitest';
import { deriverRappelAgendaAli, type EtatAgendaAliPortail } from './rappelPortail';
// Le garde de classe ci-dessous porte sur le CTA **et** sur le badge du hub :
// c'est le même engagement pris aux deux bouts de l'écran, et il n'était tenu
// qu'à un seul.
import { badgeAgendaAli } from '@/lib/portail/hubQuestionnaires';

function etat(over: Partial<EtatAgendaAliPortail> = {}): EtatAgendaAliPortail {
  return {
    nbRenseignees: 5,
    jourCourant: 6,
    journeeDuJourEnregistree: false,
    cloturablePatient: false,
    ...over,
  };
}

const derive = (o: Partial<EtatAgendaAliPortail> = {}) => deriverRappelAgendaAli(etat(o));

describe('deriverRappelAgendaAli — les quatre états', () => {
  it('aucune journée : invite à commencer, mais NON prioritaire', () => {
    const r = derive({ nbRenseignees: 0, jourCourant: null });
    expect(r.etat).toBe('a_commencer');
    expect(r.cta).toBe('Commencer mon agenda alimentaire');
    // Rien ne se perd à commencer demain : la fenêtre s'ancre sur la première
    // journée. Prioritaire, cet état enterrerait sans terme un pack assigné.
    expect(r.prioritaire).toBe(false);
  });

  it('journée du jour absente : « Noter ma journée », prioritaire, avec le compte', () => {
    const r = derive();
    expect(r.etat).toBe('journee_a_noter');
    expect(r.cta).toBe('Noter ma journée');
    expect(r.prioritaire).toBe(true);
    expect(r.factuel).toBe('5 journées notées sur 21.');
  });

  it('journée du jour enregistrée : aucun CTA, quitte la mise en avant', () => {
    const r = derive({ journeeDuJourEnregistree: true, nbRenseignees: 6 });
    expect(r.etat).toBe('a_jour');
    expect(r.cta).toBeNull();
    expect(r.prioritaire).toBe(false);
  });

  it('fenêtre atteinte ET journée du jour enregistrée : recueil terminé, AUCUN geste proposé', () => {
    const r = derive({
      cloturablePatient: true,
      journeeDuJourEnregistree: true,
      nbRenseignees: 18,
      jourCourant: 21,
    });
    expect(r.etat).toBe('a_transmettre');
    // Le jumeau sommeil propose ici « Terminer et transmettre », et il le peut :
    // sa route de clôture existe. L'alimentaire n'en a AUCUNE — la clôture
    // patient est hors du périmètre de LOT-04. Promettre le geste enverrait le
    // patient, au 21e jour, sur une frise sans le bouton annoncé.
    expect(r.cta).toBeNull();
    // Sans action possible, ne pas passer devant les autres tâches du hub.
    expect(r.prioritaire).toBe(false);
    // Le compte QUALIFIE le recueil : sous 7 journées, il ne produit aucun
    // agrégat. Il ne doit jamais disparaître de l'écran.
    expect(r.factuel).toContain('18 journées notées sur 21.');
  });

  it('hors fenêtre : recueil terminé, avec le compte', () => {
    const r = derive({
      cloturablePatient: true,
      journeeDuJourEnregistree: false,
      nbRenseignees: 4,
      jourCourant: null,
    });
    expect(r.etat).toBe('a_transmettre');
    expect(r.cta).toBeNull();
    expect(r.factuel).toContain('4 journées notées sur 21.');
    // Jamais « complet » : la fenêtre l'est, le recueil pas forcément.
    expect(r.factuel).not.toContain('complet');
  });

  // Garde de classe, pas cas particulier : tant qu'aucune route de clôture
  // alimentaire n'existe, AUCUN chemin ne doit rendre un `a_transmettre`
  // porteur d'un libellé de bouton NI d'un badge qui nomme le geste. Le lot qui
  // livrera la clôture fera tomber ce test — c'est le signal attendu, pas une
  // gêne.
  //
  // LE GARDE NE PORTAIT QUE SUR `cta`, et c'est par où la promesse est revenue :
  // `badgeAgendaAli` a rendu « À transmettre » pendant tout le lot, à trois
  // lignes d'un commentaire de vingt lignes expliquant pourquoi le CTA reste
  // `null`. Un garde qui ne couvre qu'une des deux surfaces ne garde pas la
  // règle, il garde un champ.
  it('aucun état a_transmettre ne propose de geste, quelle que soit l’entrée', () => {
    const combinaisons = [
      { cloturablePatient: true, journeeDuJourEnregistree: true, nbRenseignees: 21, jourCourant: 21 },
      { cloturablePatient: true, journeeDuJourEnregistree: false, nbRenseignees: 1, jourCourant: null },
      { cloturablePatient: false, journeeDuJourEnregistree: true, nbRenseignees: 9, jourCourant: null },
      { cloturablePatient: true, journeeDuJourEnregistree: true, nbRenseignees: 3, jourCourant: null },
    ];
    for (const entree of combinaisons) {
      const r = derive(entree);
      if (r.etat === 'a_transmettre') {
        expect(r.cta).toBeNull();
        expect(r.prioritaire).toBe(false);
        // Le BADGE du hub, sur le même état : il doit décrire ce qui EST, jamais
        // ce qu'il faudrait faire.
        const badge = badgeAgendaAli(r.etat);
        for (const geste of [
          'transmettre',
          'envoyer',
          'clôturer',
          'cloturer',
          'valider',
          'finaliser',
          'partager',
          'terminer',
        ]) {
          expect(badge.toLowerCase(), `le badge nomme le geste « ${geste} »`).not.toContain(geste);
        }
        // « À + infinitif » est la FORME d'un geste à poser — c'est celle de tous
        // les autres badges de la famille (« À commencer », « À compléter »).
        // L'état terminal ne la prend pas.
        expect(badge.startsWith('À '), `le badge « ${badge} » est formulé en geste`).toBe(false);
      }
    }
    // …et au moins une des combinaisons atteint bien cet état, sinon le garde
    // serait vert par vacuité.
    expect(combinaisons.map(e => derive(e).etat)).toContain('a_transmettre');
  });

  // Le matin du 21e jour, `cloturablePatient` est DÉJÀ vrai alors que
  // l'emplacement 21 est vide : la case est atteinte, pas remplie (D-018). Sans
  // cet ordre, le hub annoncerait un recueil terminé pendant que le journal
  // ouvre le formulaire de la dernière journée. L'enjeu est aujourd'hui une
  // phrase ; il deviendra un geste irréversible quand la clôture patient
  // existera, et l'ordre sera déjà le bon.
  it('matin du 21e jour, journée pas encore enregistrée : noter prime sur « terminé »', () => {
    const r = derive({
      cloturablePatient: true,
      journeeDuJourEnregistree: false,
      jourCourant: 21,
      nbRenseignees: 20,
    });
    expect(r.etat).toBe('journee_a_noter');
    expect(r.cta).toBe('Noter ma journée');
  });

  it('accorde le singulier', () => {
    expect(derive({ nbRenseignees: 1 }).factuel).toBe('1 journée notée sur 21.');
  });
});

// `journeeDuJourEnregistree` mesure « une ligne existe pour aujourd'hui »,
// LISIBLE OU NON : le hub ne parse pas le JSONB. Les deux lectures doivent
// mener à la MÊME décision — rien à faire aujourd'hui —, sans quoi le hub
// enverrait vers un POST que la route refuse en 409 (`agenda_illisible`).
describe('deriverRappelAgendaAli — une journée en quarantaine n’est pas notable', () => {
  it('journée du jour en quarantaine (ligne présente, contenu illisible) : jamais « Noter ma journée »', () => {
    // Le hub ne voit qu'une chose : une ligne porte la date du jour. Que son
    // contenu soit relu ou non ne change ni l'état, ni le CTA.
    const relue = derive({ journeeDuJourEnregistree: true, nbRenseignees: 6 });
    const enQuarantaine = derive({ journeeDuJourEnregistree: true, nbRenseignees: 5 });
    expect(relue.etat).toBe('a_jour');
    expect(enQuarantaine.etat).toBe('a_jour');
    expect(enQuarantaine.cta).toBeNull();
    expect(enQuarantaine.prioritaire).toBe(false);
  });
});

// Transitions : le passage d'un état à l'autre est ce que le patient VIT au
// fil des 21 jours. Chaque bascule est vérifiée sur le seul champ qui change.
describe('deriverRappelAgendaAli — transitions', () => {
  it('a_commencer → journee_a_noter dès la première journée enregistrée', () => {
    expect(derive({ nbRenseignees: 0, jourCourant: null }).etat).toBe('a_commencer');
    expect(derive({ nbRenseignees: 1, jourCourant: 1 }).etat).toBe('journee_a_noter');
  });

  it('journee_a_noter → a_jour quand la journée du jour arrive en base', () => {
    expect(derive({ journeeDuJourEnregistree: false }).etat).toBe('journee_a_noter');
    expect(derive({ journeeDuJourEnregistree: true }).etat).toBe('a_jour');
  });

  it('a_jour → journee_a_noter le lendemain matin (même compte, journée du jour absente)', () => {
    const veille = derive({ journeeDuJourEnregistree: true, nbRenseignees: 6, jourCourant: 6 });
    const lendemain = derive({ journeeDuJourEnregistree: false, nbRenseignees: 6, jourCourant: 7 });
    expect(veille.prioritaire).toBe(false);
    expect(lendemain.prioritaire).toBe(true);
  });

  it('a_jour → a_transmettre au 21e jour, puis hors fenêtre', () => {
    expect(derive({ journeeDuJourEnregistree: true, jourCourant: 20 }).etat).toBe('a_jour');
    expect(
      derive({ journeeDuJourEnregistree: true, jourCourant: 21, cloturablePatient: true }).etat,
    ).toBe('a_transmettre');
    expect(derive({ jourCourant: null, cloturablePatient: true }).etat).toBe('a_transmettre');
  });

  it('a_commencer prime sur la fenêtre atteinte : un agenda vide ne se transmet pas', () => {
    // Cas limite : `cloturablePatient` ne peut être vrai sans ancre, mais si un
    // appelant le forçait, on n'inviterait pas à transmettre un recueil vide.
    const r = derive({ nbRenseignees: 0, jourCourant: null, cloturablePatient: true });
    expect(r.etat).toBe('a_commencer');
  });
});

// Garde de vocabulaire : ce que le patient lit ne doit contenir ni compte à
// rebours, ni reproche, ni score, ni agrégat. Doctrine « construction jamais
// dégradation » rendue vérifiable.
describe('rappel portail alimentaire — vocabulaire interdit', () => {
  const tousLesTextes = [
    derive({ nbRenseignees: 0, jourCourant: null }),
    derive(),
    derive({ journeeDuJourEnregistree: true }),
    derive({ journeeDuJourEnregistree: true, cloturablePatient: true, jourCourant: 21 }),
    derive({ jourCourant: null }),
  ]
    .flatMap((r) => [r.cta ?? '', r.factuel])
    .join(' | ')
    .toLowerCase();

  it.each([
    'manqué',
    'oubli',
    'retard',
    'il vous reste',
    'plus que',
    'score',
    '%',
    'série',
    'perdu',
    'attention',
    'urgent',
    'complet',
    'affilée',
    'bravo',
    'félicit',
  ])('ne dit jamais « %s »', (interdit) => {
    expect(tousLesTextes).not.toContain(interdit);
  });

  it('ne montre aucun agrégat ni aucune interprétation clinique', () => {
    for (const interdit of [
      'jeûne',
      'fenêtre alimentaire',
      'indice',
      'moyenne',
      'médiane',
      'écart-type',
      'équilibre',
      'ultra-transform',
      'calorie',
      'kcal',
      'gramme',
    ]) {
      expect(tousLesTextes).not.toContain(interdit);
    }
  });
});
