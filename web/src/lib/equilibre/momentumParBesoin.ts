import { filtrerPassationsExploitables } from '../scoring/validite';
import { BESOIN_SOURCES, JOURS_JALON, ORDRE_JALONS_MESURE } from './constants';
import { construireReponsesParQuestionnaire, extraireRawAnswers, type ReponseBrute } from './depuisPrisma';
import { calculerEquilibre } from './score';
import type { AncreCycle, JalonMomentum } from './types';
import { joursDepuisAncre } from '../protocol/fenetreJalon';
import { datesRemesures, etiquetteLecture, sourcesMesureesAu } from './momentumDuCycle';
// Réexportée : les bancs et le rendu la lisent ici, avec les séries.
export { etiquetteLecture };
import type { MotifAbsenceMomentum } from './motifsMomentum';

// Momentum PAR BESOIN (LOT-07, `D-058`).
//
// Le praticien ne disposait que du delta d'un scalaire agrégé — qui mélange ce
// qui a bougé et ce qui n'a pas été regardé. Un J21 où seul le TFD a été
// repassé faisait varier le global, sans qu'on puisse dire d'où venait la
// variation ni ce qui était resté immobile faute d'avoir été mesuré.
//
// CE MODULE NE QUALIFIE PAS. Il rend le delta factuel et s'arrête là, tant
// qu'aucune bande de bruit n'est publiée pour le besoin concerné (`D-058`,
// arbitrage 1). Reprendre le `> 0 / < 0 / = 0` du scalaire n'aurait rien coûté
// à écrire — et aurait transformé le bruit de mesure en tendance clinique, sur
// l'écran même où le praticien vient chercher si son protocole agit.

const JOUR_MS = 24 * 60 * 60 * 1000;

export const MOMENTUM_PAR_BESOIN_VERSION = 'momentum-par-besoin-v1' as const;

/**
 * Bande de bruit d'un besoin : en deçà de cet écart, un delta ne se distingue
 * pas de la variabilité de mesure.
 *
 * `source` n'est pas décoratif. Une bande est soit une donnée de fidélité
 * test-retest publiée pour l'instrument, soit un paramètre technique assumé
 * comme tel — jamais un nombre choisi parce qu'il en fallait un (`DC-19`,
 * `DC-20`). Le champ oblige à dire lequel des deux.
 */
export type BandeDeBruit = {
  besoin: number;
  ecartMinimal: number;
  source: string;
};

export type BandesMetadata = {
  version: typeof MOMENTUM_PAR_BESOIN_VERSION;
  /**
   * FAUX à la livraison du LOT-07, et c'est le cœur de `D-058`. Écrire le
   * moteur et publier les bandes sont deux gestes distincts ; seul le second
   * autorise à écrire « stable » sous les yeux d'un praticien.
   */
  publiee: boolean;
  datePublication: string | null;
  bandes: readonly BandeDeBruit[];
};

/**
 * Table VIDE, non publiée. Même discipline que `CONTRADICTIONS_METADATA` et
 * `ORIENTATION_METADATA` : la table existe, elle n'est pas signée, et rien ne
 * s'allume tant qu'elle ne l'est pas.
 */
export const BANDES_DE_BRUIT: BandesMetadata = {
  version: MOMENTUM_PAR_BESOIN_VERSION,
  publiee: false,
  datePublication: null,
  bandes: [],
};

/** Une bande n'est utilisable que si la table est publiée ET la couvre. */
export function bandePourBesoin(
  besoin: number,
  metadata: BandesMetadata = BANDES_DE_BRUIT,
): BandeDeBruit | null {
  if (!metadata.publiee) return null;
  return metadata.bandes.find(bande => bande.besoin === besoin) ?? null;
}

/**
 * `remesure` ([[D-397]] §3) : une passation exploitable nouvelle, faite après
 * l'ancre hors de la fenêtre de tout jalon de mesure. Elle forme une paire,
 * elle ne confirme ni ne crée aucun jalon.
 */
export type LectureBesoin = { jalon: JalonMomentum | 'remesure'; date: Date; couverture: number };

/** Les motifs d'absence d'une paire par besoin ([[D-397]] §4) : jamais zéro ni « stable ». */
export type MotifAbsenceBesoin = MotifAbsenceMomentum | 'sans_source';

export type MomentumBesoin = {
  besoin: number;
  /**
   * `false` quand le besoin n'a pas deux lectures à comparer. Ni zéro, ni
   * « stable », ni absence silencieuse — un besoin que personne n'a re-mesuré
   * n'a pas de momentum, et le dire est la raison d'être de ce module
   * (`DC-24`, `D-058` arbitrage 2).
   */
  mesure: boolean;
  delta: number | null;
  depart: LectureBesoin | null;
  arrivee: LectureBesoin | null;
  /** `null` tant qu'aucune bande ne couvre le besoin : le delta ne se qualifie pas. */
  qualification: 'au_dessus_de_la_bande' | 'dans_la_bande' | null;
  /** Toujours renseigné, y compris quand tout va bien : une sortie s'explique. */
  motif: string;
  /**
   * Cycle courant seulement ([[D-397]]) : le motif d'absence, énuméré, et les
   * lectures admissibles du besoin dans l'ordre chronologique — les douze
   * emplacements du cockpit. Absents sur un cycle passé (`momentum-par-besoin-v1`).
   */
  motifAbsence?: MotifAbsenceBesoin | null;
  lectures?: LectureBesoin[];
};

/**
 * Séries par besoin, aux jalons atteints.
 *
 * Suit le MÊME chemin que le scalaire (`construireHistoriqueEquilibre`) : même
 * `construireReponsesParQuestionnaire`, même moteur, mêmes jalons glissants
 * depuis le T0 réel. Ce qui change est ce qu'on y lit —
 * `strates[].besoins[].couverture` au lieu de `scoreGlobal`.
 *
 * Une couverture `null` NE PRODUIT PAS de lecture : c'est ainsi que « non
 * mesuré » traverse le module sans jamais devenir un zéro.
 */
export function construireHistoriqueParBesoin(
  brutes: ReponseBrute[],
  dateT0: Date,
  maintenant: Date,
  /**
   * L'ancre du cycle auquel ces lectures appartiennent (`D-113`). Défaut `T0` :
   * c'est le premier cycle, et c'était le seul avant la décision — les appelants
   * qui n'ont pas encore été portés au multi-cycle gardent donc EXACTEMENT leur
   * comportement, sans zone grise.
   */
  ancre: AncreCycle = 'T0',
  /**
   * Le jour 0 du suivi ([[D-255]]) : les lectures de MESURE se comptent depuis
   * lui, la lecture d'ancre garde `dateT0`. Absent → comme avant.
   */
  jourZeroMesures: Date | null = null,
): Map<number, LectureBesoin[]> {
  const series = new Map<number, LectureBesoin[]>();
  // L'ANCRE PUIS LES MESURES — et ICI LE NOM DE L'ANCRE COMPTE, contrairement à
  // `depuisPrisma` : chaque lecture PORTE son jalon (`LectureBesoin.jalon`), et
  // ce nom est restitué au praticien. Sur un second cycle, écrire « T0 » sous
  // une lecture qui appartient au cycle `T1` la daterait d'un départ qui n'est
  // pas le sien (`D-113`).
  //
  // `Object.keys(JOURS_JALON)` aurait perdu la lecture de référence en silence
  // depuis que la table ne porte plus `T0: 0`.
  const jalons: readonly JalonMomentum[] = [ancre, ...ORDRE_JALONS_MESURE];

  // RÈGLE DE NOUVEAUTÉ PAR BESOIN — le point qui fait exister ce module.
  //
  // Sans elle, un patient qui n'a passé le Q_GAS_01 qu'au T0 rend au J21 la
  // même couverture (la réponse T0 est toujours « connue » à J21), et le
  // besoin 4 aurait affiché « mesure : vrai, delta : 0 » sans qu'aucune
  // re-mesure ait eu lieu — le défaut F1 (« stable, écart 0 ») que la règle
  // de nouveauté GLOBALE du scalaire ferme déjà, recréé un cran plus bas.
  // Trouvé en branchant le module, avant tout consommateur.
  //
  // La règle est au grain du BESOIN : une lecture n'est ajoutée à sa série
  // que si l'une de SES sources porte une réponse exploitable nouvelle depuis
  // sa lecture précédente. Le prédicat d'exploitabilité est celui de la règle
  // globale (`extraireRawAnswers`), jamais recopié.
  const exploitables = filtrerPassationsExploitables(brutes);
  const datesParBesoin = new Map<number, Date[]>();
  for (const [besoinCle, sources] of Object.entries(BESOIN_SOURCES)) {
    const ids = new Set(sources.map(source => source.idQuestionnaire));
    datesParBesoin.set(
      Number(besoinCle),
      exploitables
        .filter(r => ids.has(r.idQuestionnaire) && extraireRawAnswers(r.scoresJson) !== null)
        .map(r => r.dateReponse),
    );
  }

  const derniereLecture = new Map<number, Date>();
  for (const jalon of jalons) {
    const base = jalon === ancre ? dateT0 : jourZeroMesures ?? dateT0;
    const dateJalon = new Date(base.getTime() + joursDepuisAncre(jalon) * JOUR_MS);
    if (dateJalon > maintenant) continue;

    const resultat = calculerEquilibre(construireReponsesParQuestionnaire(brutes, dateJalon));
    for (const strate of resultat.strates) {
      for (const besoin of strate.besoins) {
        if (besoin.couverture === null) continue;

        const borneBasse = derniereLecture.get(besoin.besoin);
        if (borneBasse) {
          const nouveaute = (datesParBesoin.get(besoin.besoin) ?? [])
            .some(date => date > borneBasse && date <= dateJalon);
          if (!nouveaute) continue;
        }

        const serie = series.get(besoin.besoin) ?? [];
        serie.push({ jalon, date: dateJalon, couverture: besoin.couverture });
        series.set(besoin.besoin, serie);
        derniereLecture.set(besoin.besoin, dateJalon);
      }
    }
  }
  return series;
}

function qualifier(delta: number, besoin: number, metadata: BandesMetadata): Pick<MomentumBesoin, 'qualification' | 'motif'> {
  const bande = bandePourBesoin(besoin, metadata);
  if (!bande) {
    return {
      qualification: null,
      motif: 'Écart non qualifié : aucune bande de bruit n’est publiée pour ce besoin. '
        + 'La valeur est réelle ; savoir si elle dépasse la variabilité de mesure demande une bande.',
    };
  }
  if (Math.abs(delta) < bande.ecartMinimal) {
    return {
      qualification: 'dans_la_bande',
      motif: `Écart inférieur à la bande de bruit publiée (${bande.ecartMinimal}, ${bande.source}).`,
    };
  }
  return {
    qualification: 'au_dessus_de_la_bande',
    motif: `Écart supérieur à la bande de bruit publiée (${bande.ecartMinimal}, ${bande.source}).`,
  };
}

/**
 * Momentum de chaque besoin entre sa première et sa dernière lecture.
 *
 * PAS DE GARDE DE VERSION ICI, et c'est voulu (revue LOT-07, B1) : les deux
 * lectures d'une série sont toujours recalculées par le moteur COURANT
 * (`construireHistoriqueParBesoin` rejoue `calculerEquilibre` à chaque jalon)
 * — il n'existe aucun chemin où deux versions se soustraient. Une garde qui
 * comparerait la version FIGÉE sur l'épisode à la constante courante ne
 * garderait rien : elle éteindrait des comparaisons correctes avec un motif
 * faux, sur tout cycle antérieur au dernier bump. La vraie garde A8-3 est
 * INTER-cycles et vit dans `resoudreComparaison` (`trajectoire.ts`).
 *
 * Le delta est la soustraction brute des deux couvertures — aucun arrondi :
 * un arrondi serait un nombre technique non déclaré (`DC-20`) qui écraserait
 * en « écart 0 » un mouvement réel sur une échelle 0–1. La mise en forme est
 * l'affaire du rendu, jamais de la donnée.
 */
export function calculerMomentumParBesoin(input: {
  series: Map<number, LectureBesoin[]>;
  metadata?: BandesMetadata;
}): MomentumBesoin[] {
  const metadata = input.metadata ?? BANDES_DE_BRUIT;

  // TOUS les besoins que la table signée sait mesurer, plus ceux que la
  // série porte. Un besoin jamais lu est NOMMÉ — « ni absence silencieuse »
  // (`D-058`, arbitrage 2) : l'omettre recréerait un cran plus haut le
  // silence que ce module existe pour fermer. Relevé en revue Copilot :
  // itérer sur les seules séries rendait ce cas inatteignable, puisque
  // `construireHistoriqueParBesoin` ne crée une entrée qu'à la première
  // lecture. Un besoin sans source vivante (besoin 2) n'est pas listé :
  // aucune mesure n'en est possible, le nommer n'informerait rien.
  const besoins = new Set<number>([
    ...Object.entries(BESOIN_SOURCES)
      .filter(([, sources]) => sources.length > 0)
      .map(([cle]) => Number(cle)),
    ...input.series.keys(),
  ]);

  return [...besoins]
    .sort((gauche, droite) => gauche - droite)
    .map((besoin) => {
      const serie = input.series.get(besoin) ?? [];
      const depart = serie[0] ?? null;
      const arrivee = serie.length >= 2 ? serie[serie.length - 1] : null;

      if (!depart || !arrivee) {
        // Le motif nomme le jalon réellement lu : une série peut commencer à
        // J21 (patient sans lecture au T0), et « depuis le T0 » serait faux.
        return {
          besoin,
          mesure: false,
          delta: null,
          depart,
          arrivee: null,
          qualification: null,
          motif: depart
            ? `Besoin lu une seule fois (${depart.jalon}) : aucun momentum. Ce n’est pas une stabilité.`
            : 'Besoin sans lecture : aucun momentum. Ce n’est pas une stabilité.',
        };
      }

      const delta = arrivee.couverture - depart.couverture;
      return { besoin, mesure: true, delta, depart, arrivee, ...qualifier(delta, besoin, metadata) };
    });
}

// ---------------------------------------------------------------------------
// CYCLE COURANT — [[D-397]] §1 à §4
// ---------------------------------------------------------------------------
//
// Les séries v1 ci-dessus échantillonnent l'état aux dates des jalons. Sur le
// cycle courant, D-397 change la construction et le choix des paires : chaque
// passation exploitable nouvelle d'une source du besoin, faite après l'ancre,
// est une lecture, à SA date ; la paire relie la lecture d'ancre à la dernière.
// Les formules, le mapping `BESOIN_SOURCES` et les bandes ne changent pas. Les
// cycles passés gardent leur lecture v1 (§2 : l'historique reste consultable).

export function construireSeriesParBesoinDuCycle(input: {
  brutes: ReponseBrute[];
  ancre: { ancre: AncreCycle; date: Date };
  jourZero: Date | null;
  maintenant: Date;
}): Map<number, LectureBesoin[]> {
  const { brutes, ancre, jourZero, maintenant } = input;
  // Un état par date lue : plusieurs besoins partagent souvent une passation.
  const etats = new Map<number, Map<number, number | null>>();
  const couverturesAu = (date: Date) => {
    const cle = date.getTime();
    let etat = etats.get(cle);
    if (!etat) {
      const resultat = calculerEquilibre(construireReponsesParQuestionnaire(brutes, date));
      etat = new Map(resultat.strates.flatMap(s => s.besoins).map(b => [b.besoin, b.couverture]));
      etats.set(cle, etat);
    }
    return etat;
  };

  // Une remesure porte sur une source déjà mesurée à l'ancre (arbitrage du
  // 2026-10-31) : la première passation d'une source absente du bilan d'ancre
  // n'ouvre pas de lecture à elle seule, ni une passation dont le moteur ne
  // tire aucune couverture de ce besoin (contre-revue Codex P1-1).
  const mesureesAncre = sourcesMesureesAu(brutes, ancre.date);
  const series = new Map<number, LectureBesoin[]>();
  for (const [besoinCle, sources] of Object.entries(BESOIN_SOURCES)) {
    const besoin = Number(besoinCle);
    if (sources.length === 0) continue;
    const serie: LectureBesoin[] = [];
    const auDepart = couverturesAu(ancre.date).get(besoin) ?? null;
    if (auDepart !== null) serie.push({ jalon: ancre.ancre, date: ancre.date, couverture: auDepart });

    const dates = [...new Set(
      datesRemesures(brutes, mesureesAncre, besoin)
        .filter(date => date > ancre.date && date <= maintenant)
        .map(date => date.getTime()),
    )].sort((a, b) => a - b);
    for (const instant of dates) {
      const date = new Date(instant);
      const couverture = couverturesAu(date).get(besoin) ?? null;
      if (couverture === null) continue;
      serie.push({ jalon: etiquetteLecture(date, jourZero), date, couverture });
    }
    if (serie.length > 0) series.set(besoin, serie);
  }
  return series;
}

/** Textes B-0 à B-3, validés mot pour mot le 2026-10-31 ([[D-397]] §7). */
export function texteMotifBesoin(motif: MotifAbsenceBesoin, ancre: AncreCycle | null): string {
  switch (motif) {
    case 'sans_jour_zero':
      return 'Momentum par besoin non calculé : aucun protocole n’est diffusé sur ce cycle.';
    case 'sans_source':
      return 'Aucun questionnaire du bilan ne mesure ce besoin : pas de momentum.';
    case 'sans_lecture_ancre':
      return `Besoin non mesuré à l’ancre ${ancre ?? ''} : aucun momentum. Ce n’est pas une stabilité.`;
    case 'sans_remesure':
      return `Aucune passation nouvelle de ses questionnaires depuis l’ancre ${ancre ?? ''} : aucun momentum. Ce n’est pas une stabilité.`;
  }
}

/**
 * Les douze besoins du cycle courant, TOUS nommés — ceux sans source au
 * mapping (2, 6, 7, 11) portent le motif « sans source », pas une courbe
 * (§4). Paire : la lecture d'ancre et la dernière lecture (Q5). Le delta reste
 * la soustraction brute ; l'arrondi est l'affaire du rendu (§5).
 */
//
// LES BANDES DE BRUIT ONT ÉTÉ PENSÉES POUR LES PAIRES v1 (jalon → jalon). Les
// paires du cycle courant se construisent autrement depuis [[D-397]] §4 : une
// bande publiée devra dire si elle vaut pour elles. Le banc
// `momentumDuCycle.test.ts` rougit le jour où la table est publiée.
export function calculerMomentumParBesoinDuCycle(input: {
  series: Map<number, LectureBesoin[]>;
  ancre: AncreCycle | null;
  jourZero: Date | null;
  metadata?: BandesMetadata;
}): MomentumBesoin[] {
  const metadata = input.metadata ?? BANDES_DE_BRUIT;
  return Object.keys(BESOIN_SOURCES)
    .map(Number)
    .sort((gauche, droite) => gauche - droite)
    .map((besoin): MomentumBesoin => {
      const lectures = input.series.get(besoin) ?? [];
      // Un départ n'est jamais qu'une lecture d'ANCRE : une première lecture
      // postérieure ne se présente pas comme le point de départ.
      const lectureAncre = lectures[0]?.jalon === input.ancre ? lectures[0] : null;
      const absent = (motifAbsence: MotifAbsenceBesoin): MomentumBesoin => ({
        besoin,
        mesure: false,
        delta: null,
        depart: lectureAncre,
        arrivee: null,
        qualification: null,
        motif: texteMotifBesoin(motifAbsence, input.ancre),
        motifAbsence,
        lectures,
      });

      if (!input.ancre || !input.jourZero) return absent('sans_jour_zero');
      if (BESOIN_SOURCES[besoin].length === 0) return absent('sans_source');
      const depart = lectures[0];
      if (!depart || depart.jalon !== input.ancre) return absent('sans_lecture_ancre');
      if (lectures.length < 2) return absent('sans_remesure');

      const arrivee = lectures[lectures.length - 1];
      const delta = arrivee.couverture - depart.couverture;
      return {
        besoin,
        mesure: true,
        delta,
        depart,
        arrivee,
        ...qualifier(delta, besoin, metadata),
        motifAbsence: null,
        lectures,
      };
    });
}
