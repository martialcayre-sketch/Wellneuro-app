import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { CATALOGUE_DEFINITIONS, PASSATION_PRATICIEN } from './bibliotheque';
import { IDS_SUSPENDUS, QUESTIONNAIRES_CATALOG } from './questionnaires-catalog';

// LA GARDE QUE #465 A NOMMÉE SANS LA POSER.
//
// Son fragment de changelog l'écrit en toutes lettres, sous « ce qui n'est PAS
// couvert » : « rien, dans le code, ne relie `droits.statut: licence_requise` à
// l'assignabilité. Ce lot a pu ouvrir un instrument sous licence non instruite
// sans qu'aucun garde ne rougisse. » C'est exactement ce qui s'est passé — HAD
// est devenu servable, et le seul test qui en parle est celui que le même lot a
// écrit pour le dire.
//
// Les gardes existantes de `bibliotheque.test.ts` sont des listes d'identifiants
// TAPÉES À LA MAIN : `SUSPENDUS_DROITS`, les trois laissés ouverts. Elles
// verrouillent une décision déjà prise et elles le font bien. Mais elles ne
// lisent pas le registre : le jour où l'instruction des 42 `a_verifier` fera
// passer un neuvième instrument à `licence_requise`, rien dans le dépôt ne
// remarquera qu'il est assignable. Une liste écrite à la main ne peut pas
// s'étonner d'une ligne qu'on n'y a pas écrite.
//
// Ce banc part donc du REGISTRE, jamais d'une liste d'ids, et exige que
// l'exposition constatée soit exactement celle qui a été décidée.
const REGISTRE = JSON.parse(
  readFileSync(resolve(process.cwd(), '../docs/claude/corpus/instrument_registry.json'), 'utf8'),
) as {
  instruments: { questionnaireId: string; droits?: { statut?: string; detail?: string } }[];
};

// LE PRÉDICAT A CHANGÉ DE FORME LE 2026-07-30, PAS DE SENS.
//
// Ce jour-là, le praticien a déclaré couvert l'usage clinique des huit
// instruments qui étaient `licence_requise`, en connaissance des réserves et
// contre l'avis consigné. Lire `statut === 'licence_requise'` ne rendait plus
// personne : la garde serait passée au vert en ayant cessé de regarder — et
// c'est précisément la classe de défaut que son troisième test dénonce.
//
// Ce qui subsiste, et qui est la vraie population à garder, c'est l'instrument
// dont le droit d'usage repose sur une DÉCLARATION posée par-dessus une réserve
// qu'on n'a pas levée. Le registre le dit littéralement : la déclaration
// conserve la réserve derrière le marqueur ci-dessous. Un statut dégagé sans
// réserve au dossier (`libre`, permission d'un ayant droit réellement obtenue)
// ne relève pas de cette garde.
// Le prédicat est une DISJONCTION, et c'est le point : remplacer le statut par le
// marqueur aurait fait cesser la surveillance de la valeur canonique. Or
// `licence_requise` et `restreint` restent des statuts légaux et vivants
// (`scripts/lib/verifier_registre_instruments.js`, `STATUTS_DROITS` /
// `DROITS_DEGAGES`) : la prochaine instruction qui conclut « licence requise »
// reprendra le gabarit de 2026-07-29, lequel ne contient PAS le marqueur — inventé
// le lendemain. L'instrument aurait alors été invisible pour cette garde, et
// assignable en silence. C'est le constat B1 de la revue adversariale du
// 2026-07-30, et il portait sur la version qui avait remplacé au lieu d'ajouter.
// CE QUE CETTE GARDE NE PEUT PAS FAIRE, et qu'il a fallu apprendre.
//
// La revue du 2026-07-30 lui reprochait (constat A3) de ne pas voir `Q_PNE_01` ni
// `Q_TAB_04`, dont le `detail` porte « échelle tierce que le support reproduit,
// droits NON INSTRUITS ». Élargir le prédicat à cette formule a été essayé : elle
// est présente dans QUARANTE-DEUX entrées, toutes assorties d'une clause
// « [SUPERSÉDÉ le 2026-07-29] ». La garde ne désignait plus une population, elle
// désignait presque tout le catalogue — et une garde qui accuse tout le monde
// n'accuse personne.
//
// Ces deux instruments-là n'échappaient pas à une réserve de droits : ils
// échappaient à un contrôle d'IDENTITÉ. Ce que le lot avait écrit de faux, c'est
// « aucune échelle publiée n'est reproduite » sur ce qui est le VQ11 de Ninot et
// al. Ce contrôle-là appartient au vérificateur du registre, où il a été posé, et
// pas ici : celle-ci garde l'exposition, pas la bibliographie.
const MARQUEUR_RESERVE = 'RÉSERVE CONSERVÉE';
const STATUTS_NON_DEGAGES = new Set(['licence_requise', 'restreint']);
const SOUS_RESERVE = REGISTRE.instruments
  .filter(i => STATUTS_NON_DEGAGES.has(i.droits?.statut ?? '')
    || (i.droits?.detail ?? '').includes(MARQUEUR_RESERVE))
  .map(i => i.questionnaireId)
  .sort();

// Les instruments dont le droit repose sur la déclaration du 2026-07-30 — huit à
// l'origine, DIX depuis le 2026-07-31 (entrées de `Q_NEU_06` puis `Q_PNE_01`). La
// liste est ÉPINGLÉE, et non seulement comptée : le marqueur vit dans du texte
// libre, que la prochaine réécriture d'un `detail` peut emporter sans le vouloir —
// la phrase « Statut porté à `licence_requise` : à arbitrer » y est d'ailleurs
// devenue fausse et appelle une correction. Un `length > 0` laisserait cinq
// instruments quitter la population sans qu'un test bouge ; le MMSE (© PAR)
// redeviendrait assignable dans le silence. Constat M2 de la même revue.
// `Q_NEU_06` (MMT) est ENTRÉ dans cette population le 2026-07-31, avec sa
// reconstruction depuis la source. Sa réserve ne porte pas sur un ayant droit
// nommé, comme les huit autres, mais sur l'IDENTITÉ : les items 1-5 et 10 sont
// de la famille MMSE, les items 6-9 de celle des questionnaires de plainte
// mnésique, et aucune publication ne lui est rattachée. Tant que l'origine n'est
// pas instruite, on ne peut pas affirmer qu'aucun tiers n'a de droit dessus — et
// conclure au référentiel interne parce que le support ne cite pas ses sources
// serait le renversement de charge commis sur le VQ11 la veille. C'est cette
// entrée qui a fait rougir les deux gardes ci-dessous quand le lot voulait
// afficher sa grille en consultation ; l'instrument est resté fermé.
// `Q_PNE_01` (VQ11) est ENTRÉ dans cette population le 2026-07-31, avec sa
// réouverture. Sa réserve est de la même famille que celle des cinq autres
// laissés assignables : le servi est une échelle PUBLIÉE — le VQ11 de Ninot et
// al. (2010) — que le support SIIN reproduit, et les droits de ses ayants droit
// restent entiers et non instruits. Ce que la déclaration étendue du 2026-07-29
// couvre, c'est l'usage ; elle n'éteint aucun droit détenu par un tiers.
const SOUS_RESERVE_ATTENDUS = [
  'Q_CAN_01', 'Q_CAN_02', 'Q_GEO_04', 'Q_INF_04',
  'Q_NEU_06', 'Q_NEU_11', 'Q_PED_02', 'Q_PED_03', 'Q_PNE_01', 'Q_SOM_02',
];

// LE BON PRÉDICAT EST CELUI DE LA ROUTE, PAS `IDS_ASSIGNABLES`.
//
// `IDS_ASSIGNABLES` exige une entrée de rayon active ; les trois routes
// d'assignation, elles, n'exigent qu'une définition de scoring une fois passé le
// filtre `IDS_SUSPENDUS`. Elles sont donc PLUS PERMISSIVES — et l'écart entre
// les deux est précisément la position « invisible et assignable » que #460 a
// fermée sur le MMSE et #465 sur HAD. Garder sur `IDS_ASSIGNABLES` laisserait
// passer un instrument sous licence sans entrée de rayon : le cas même que ces
// deux lots ont eu à corriger.
const assignableParLaRoute = (id: string) =>
  CATALOGUE_DEFINITIONS[id] !== undefined && !IDS_SUSPENDUS.has(id);

// Les instruments dont le droit repose sur une déclaration surmontant une
// réserve, et que l'arbitrage praticien laisse ouverts. Un identifiant n'entre
// ici que par une décision, et la décision est écrite à côté de lui.
//
// La liste s'est allongée le 2026-07-30 : la déclaration de ce jour vaut aussi
// ouverture pour les instruments qu'elle couvre et qui sont actifs au catalogue.
// Ceux qui restent suspendus (Conners ×2, MMSE) ne figurent pas ici — leur droit
// est déclaré, mais leur route est fermée, et c'est ce que le test constate.
const LAISSES_ASSIGNABLES = [
  // EORTC QLQ-C30 et QLQ-BR23 — « © EORTC, enregistrement/autorisation requis ».
  // Rouverts le 2026-07-30 par décision du praticien-propriétaire, en même temps
  // que leur cotation est passée aux manuels officiels. L'EORTC accorde une
  // autorisation gratuite pour l'usage clinique : la réserve porte sur une
  // démarche à faire, pas sur une redevance à payer, et elle reste au dossier.
  // Ce sont les deux seuls instruments de cancérologie du catalogue — les
  // refermer referme le domaine.
  'Q_CAN_01',
  'Q_CAN_02',
  // HIT-6 — « © QualityMetric (licence requise, à vérifier) ». Laissé ouvert le
  // 2026-07-29 : 0 divergence critique au banc, aucune assignation ouverte.
  'Q_INF_04',
  // HAD — « GL Assessment (copyright déclaré, à vérifier) ». Ouvert par #465,
  // contre la position antérieure « invisible mais assignable ». Source UNIQUE
  // du besoin 8 de « Mon équilibre » : le fermer fait tomber ce besoin à
  // `NON_MESURE` sans substitut. Exposition assumée, et le fragment de #465 le
  // dit — c'est le prix de la gouvernabilité.
  'Q_NEU_11',
  // Epworth — « © M. W. Johns (licence requise POUR CERTAINS USAGES) ». La
  // mention distingue des usages sans dire lesquels ; aucun substitut au
  // catalogue ne mesure la somnolence diurne.
  'Q_SOM_02',
  // VQ11 — Ninot et al. (2010), échelle publiée que le support SIIN reproduit.
  // Rouvert le 2026-07-31 : sa fermeture du 2026-07-29 tenait à un motif de
  // DOCUMENTATION — « on ne sait pas dire ce qu'il est » — et la condition
  // qu'elle posait, « réactivation à la première source identifiée », est
  // remplie. L'identification vient de la revue adversariale du 2026-07-30, sur
  // la correspondance exacte des onze items et des trois composantes publiées.
  //
  // Il est le SEUL instrument de pneumologie du catalogue : l'ouvrir rouvre le
  // domaine. La réserve sur les droits de Ninot et al. reste au registre, comme
  // pour les cinq au-dessus, et l'usage repose sur la déclaration étendue du
  // 2026-07-29 — laquelle n'éteint aucun droit détenu par un tiers.
  'Q_PNE_01',
].sort();

describe('droits et assignabilité — les instruments dont le droit surmonte une réserve', () => {
  it('aucun n’est assignable sans avoir été nommé ici', () => {
    const exposes = SOUS_RESERVE.filter(assignableParLaRoute).sort();

    // Le message distingue les deux dérives, qui n'appellent pas le même geste.
    const nouveaux = exposes.filter(id => !LAISSES_ASSIGNABLES.includes(id));
    const partis = LAISSES_ASSIGNABLES.filter(id => !exposes.includes(id));
    expect(
      exposes,
      [
        nouveaux.length
          ? `EXPOSÉS SANS DÉCISION : ${nouveaux.join(', ')} — un instrument dont le droit `
            + `surmonte une réserve non levée est assignable. Le fermer (\`actif: false\`) ou `
            + `l'inscrire ici avec le motif.`
          : '',
        partis.length
          ? `NOMMÉS MAIS PLUS EXPOSÉS : ${partis.join(', ')} — fermés, ou leur réserve réellement `
            + `levée au registre. Retirer la ligne plutôt que la laisser vieillir.`
          : '',
      ].filter(Boolean).join('\n'),
    ).toEqual(LAISSES_ASSIGNABLES);
  });

  it('aucun n’expose sa grille en passation praticien', () => {
    // Surface DISTINCTE de l'assignation, et la distinction n'est pas théorique :
    // `PASSATION_PRATICIEN` porte l'aperçu des items, donc l'usage en
    // consultation. #460 a dû faire les DEUX gestes sur le MMSE — fermer la route
    // ET retirer la ligne d'affichage — parce que fermer la seule assignation en
    // continuant d'afficher la grille laisse l'usage licencié se poursuivre sur
    // papier.
    //
    // LA LISTE N'EST PLUS VIDE DEPUIS LE 2026-07-31, et c'est un RENVERSEMENT de
    // la décision du 2026-07-29 — pas son application. Il se lit comme tel, avec
    // son motif à côté de chaque identifiant, parce qu'une liste qui s'allonge
    // en silence est une décision qu'on ne reprend jamais.
    //
    // Le motif est commun aux deux : une asymétrie qui ne se défendait pas. SIX
    // instruments portant la même classe de réserve sont ENVOYÉS AU PATIENT
    // (`LAISSES_ASSIGNABLES` ci-dessus). Afficher une grille au praticien qui
    // porte la déclaration d'usage expose strictement moins que de l'adresser à
    // un patient. Interdire le moins en autorisant le plus ne tenait pas.
    //
    // Ce que cette liste n'est PAS : une levée de droits. Le MMSE reste © PAR,
    // et aucune des réserves de cette population n'est levée — seule la décision
    // d'USAGE change.
    //
    // Une première rédaction ajoutait que le MMSE serait le seul dont l'ayant
    // droit vend activement la licence. C'est faux : QualityMetric (HIT-6) et
    // GL Assessment (HAD) portent la même mention au registre, et tous deux sont
    // dans `LAISSES_ASSIGNABLES` ci-dessus, donc envoyés au patient. Le fait
    // rectifié RENFORCE l'asymétrie qui motive cette liste — ce n'est pas que le
    // MMSE serait un cas à part, c'est que des instruments de même statut de
    // droits sont déjà servis plus largement que lui.
    const EN_PASSATION_ATTENDUS = [
      // MMSE (GRECO) — test administré par le clinicien : rappel différé et copie
      // de figure n'ont aucun sens en auto-remplissage. Son entrée de catalogue
      // reste `actif: false`, donc la route d'assignation reste fermée : c'est
      // l'usage EN CONSULTATION qui rouvre, et lui seul.
      'Q_GEO_04',
      // MMT — sa réserve n'est pas de droits mais d'IDENTITÉ, et elle a changé de
      // nature le 2026-07-31 : la recherche bibliographique l'identifie au
      // document « MMT ou Mini Mental Test » diffusé par l'IEDM (2005), dix items
      // au mot près, mêmes bandes. Sa propre bande 5-10 ordonne « Faire MMS » —
      // il n'est donc pas le MMSE, et la réserve « © PAR » ne le concerne pas.
      // Ce qui subsiste : le document ne nomme aucun auteur, donc aucun ayant
      // droit n'est identifiable pour être sollicité.
      //
      // Lui aussi reste hors auto-passation, et pour une raison de MESURE : trois
      // de ses items forment un enregistrement de trois mots puis deux rappels.
      // Rempli seul, le test se corrige en remontant la page.
      'Q_NEU_06',
      // Repérage du TDAH par l'enseignant — DÉBAPTISÉ le 2026-08-01, et servi en
      // consultation, pas au portail. Sa réserve visait « © MHS », c'est-à-dire
      // l'échelle de Conners : l'instrument ne la reproduit pas et ne s'en
      // réclame plus. Il reste DANS la population sous réserve, délibérément —
      // ce qui remplace MHS n'est pas instruit (les items reprennent des critères
      // diagnostiques dont l'APA est l'éditeur), et la mention MHS REVIVRAIT si
      // la grille était un jour reconstruite sur les items de Conners.
      //
      // Il n'est PAS assignable : la grille est renseignée par un ENSEIGNANT, et
      // l'envoyer au portail ferait remplir le parent à sa place, ou ferait
      // transiter le lien magique du patient vers un tiers.
      'Q_PED_02',
    ].sort();
    const enPassation = PASSATION_PRATICIEN.map(p => p.id)
      .filter(id => SOUS_RESERVE.includes(id))
      .sort();
    expect(
      enPassation,
      `grille exposée en consultation sur un instrument sous réserve : ${enPassation.join(', ')} — `
        + `chaque entrée demande une décision écrite, et chaque sortie une vérification `
        + `(retirer la ligne plutôt que la laisser vieillir)`,
    ).toEqual(EN_PASSATION_ATTENDUS);
  });

  it('ne se tait pas parce qu’il ne lit plus rien', () => {
    // ANTI-VACUITÉ. Les deux assertions ci-dessus portent sur `SOUS_RESERVE` :
    // qu'il soit vide — chemin faux, marqueur de réserve reformulé, registre
    // déplacé — et la seconde passe au vert sans avoir rien vérifié. La première
    // rougirait, mais avec un message qui parlerait d'instruments « partis » au
    // lieu d'un fichier illisible. Ce test a déjà servi une fois : c'est lui qui
    // a rendu visible, le 2026-07-30, que la déclaration en bloc vidait la
    // population lue par la version précédente de cette garde.
    expect(
      SOUS_RESERVE,
      'la population sous réserve a changé — un instrument est entré ou sorti sans que '
        + 'la décision soit écrite ici. Vérifier son `droits` au registre avant de mettre '
        + 'cette liste à jour : une sortie silencieuse rouvre une assignation.',
    ).toEqual(SOUS_RESERVE_ATTENDUS);
    // Et les identifiants du registre désignent bien des instruments du dépôt :
    // une coquille dans le registre sortirait l'instrument du filtre en silence.
    const auRayon = new Set(QUESTIONNAIRES_CATALOG.map(q => q.id));
    const inconnus = SOUS_RESERVE.filter(
      id => !auRayon.has(id) && CATALOGUE_DEFINITIONS[id] === undefined,
    );
    expect(inconnus, `ids du registre inconnus du dépôt : ${inconnus.join(', ')}`).toEqual([]);
  });
});

// ── LA GARDE QUI MANQUAIT, ET QUI AURAIT ROUGI DEPUIS TOUJOURS ──────────────
//
// Trouvée en revue le 2026-08-01. `PASSATION_PRATICIEN` est une liste
// d'AFFICHAGE : les trois routes d'assignation ne la consultent pas. Elles
// n'exigent qu'une définition, une fois passé le filtre `IDS_SUSPENDUS`.
//
// Quatre des six instruments de consultation n'avaient AUCUNE entrée de
// catalogue — ils échappaient donc à `IDS_SUSPENDUS`, et un POST direct sur
// `api/praticien/assignations` les acceptait. Trois tests cognitifs de
// gérontologie et un catalogue mictionnel, administrés en consultation,
// pouvaient partir au portail patient.
//
// C'est la position « invisible et assignable » que #460 avait fermée sur le
// seul MMSE, en lui donnant une entrée `actif: false`. Les quatre autres l'ont
// reçue le 2026-08-01 — et ce test est ce qui empêche la prochaine ligne de
// `PASSATION_PRATICIEN` d'être ajoutée sans elle.
describe('passation praticien — aucun n’est assignable par la route', () => {
  it('les six sont fermés au prédicat que la route exécute vraiment', () => {
    // Le prédicat est celui de la route, PAS `IDS_ASSIGNABLES` : les deux
    // diffèrent, et c'est l'écart entre eux qui était le trou. `IDS_ASSIGNABLES`
    // exige une entrée de rayon active ; la route se contente d'une définition.
    const ouverts = PASSATION_PRATICIEN.map(p => p.id).filter(assignableParLaRoute);
    expect(
      ouverts,
      `assignables par appel direct alors qu'ils sont administrés en consultation : `
        + `${ouverts.join(', ')} — leur donner une entrée de catalogue \`actif: false\``,
    ).toEqual([]);
  });

  it('ne se tait pas parce qu’il ne lit plus rien', () => {
    // ANTI-VACUITÉ : sur une liste vide, l'assertion ci-dessus est vraie sans
    // rien avoir vérifié.
    expect(PASSATION_PRATICIEN.length).toBeGreaterThanOrEqual(6);
    // Et le prédicat doit encore savoir dire OUI, sinon il ne dit rien.
    expect(assignableParLaRoute('Q_SOM_01')).toBe(true);
  });
});

// ── LE BANDEAU D'AVERTISSEMENT, QUE RIEN NE GARDAIT ─────────────────────────
//
// Relevé en revue le 2026-08-01, et c'est la vraie lacune du lot : le champ
// `administrationMode: 'clinicien'` est ce qui fait afficher, dans l'aperçu
// praticien, « Instrument à faire passer en consultation — jamais envoyé au
// portail ». Aucun test ne le lisait. Il pouvait donc être retiré sans qu'une
// ligne rougisse — et la grille d'un test qui SE CORRIGE TOUT SEUL s'il est
// auto-rempli serait alors affichée sans son avertissement.
//
// Ce n'est pas une garde d'affichage : c'est le seul endroit du dépôt où la
// raison clinique de ne pas auto-administrer ces instruments est portée jusqu'à
// l'écran.
describe('passation praticien — l’avertissement clinicien atteint l’écran', () => {
  it('les instruments à rappel différé le déclarent', () => {
    // La liste est nommée, pas dérivée : ce sont les instruments dont un item
    // vaut zéro point s'il est lu avant d'être répondu — rappel de mots, copie
    // de figure. Un instrument de consultation peut légitimement ne pas en
    // porter (un catalogue mictionnel se remplit chez soi) ; ceux-ci non.
    for (const id of ['Q_GEO_04', 'Q_NEU_06', 'Q_GEO_06']) {
      const def = CATALOGUE_DEFINITIONS[id] as { administrationMode?: string } | undefined;
      expect(def, id).toBeDefined();
      expect(
        def?.administrationMode,
        `${id} : sans \`administrationMode: 'clinicien'\`, l'aperçu affiche la grille `
          + `SANS le bandeau « jamais envoyé au portail » — et ces instruments se corrigent `
          + `d'eux-mêmes en auto-remplissage (rappel différé, copie de figure)`,
      ).toBe('clinicien');
    }
  });
});

// ── LE BARREAU DU MMSE, ÉPINGLÉ PAR LE HAUT ────────────────────────────────
//
// `Q_GEO_04` n'était gardé que par le bas — le plancher du vérificateur, qui
// l'empêche de descendre sous `contenu_verrouille`. Rien ne l'empêchait de
// REMONTER : mesuré le 2026-08-01, le repasser à `scoring_verifie` traverse le
// CI en silence.
//
// Le scénario est réaliste, et c'est exactement celui qu'un lot a déjà joué :
// quelqu'un rejoue le banc, lit « 0 divergence critique », et remonte le barreau
// sans rouvrir la question des bandes. Or ce zéro est VACUEUX — les deux
// lectures rendent `seuils: []` — et les quatre bandes viennent d'une
// transcription HAS 2011 que rien dans le dépôt n'a vérifiée.
describe('MMSE — le barreau ne remonte pas sans que la question des bandes soit rouverte', () => {
  it('reste à `contenu_verrouille`', () => {
    const entree = REGISTRE.instruments.find(i => i.questionnaireId === 'Q_GEO_04') as
      { statutCertification?: string } | undefined;
    expect(
      entree?.statutCertification,
      'Le MMSE ne peut pas porter `scoring_verifie` : ses quatre bandes — celles qui rendent '
        + '« Démence sévère » — n\'ont été comparées à RIEN (les deux lectures du banc rendent '
        + '`seuils: []`), et elles viennent d\'une transcription HAS 2011 non vérifiée. Un « 0 '
        + 'divergence critique » ne dit ici rien du scoring. Précédent : la montée de Q_SOM_09, '
        + 'annulée le 2026-07-30 pour une vacuité de même nature.',
    ).toBe('contenu_verrouille');
  });
});
