import type { DrapeauxAnamnese } from '@/lib/consultation/drapeauxAnamnese';
import { BESOINS } from '@/lib/equilibre/constants';
import type {
  ContradictionClaimRef,
  ContradictionFinding,
  GraduationConvergence,
  SourceContradiction,
} from './contradictionFinding';
import { FUSEAU_CLINIQUE, ecartJoursEntreSources } from './contradictionsEngine';
import {
  ACTION_CONVERGENCE,
  BORNES_GRADUATION_CONVERGENCE,
  CONDITIONS_SANS_COMPTE_V1,
  EXCLUSIONS_CONVERGENCE_V1,
  FAMILLES_MESURE_V1,
  IMPORTANCE_CONVERGENCE,
  LIMITATIONS_CONVERGENCE,
  LIMITATIONS_PAR_BESOIN,
  RATTACHEMENTS_CONVERGENCE_V1,
  type ConditionConvergence,
  type ConditionSansCompte,
  type FamilleLue,
  type RattachementConvergence,
} from './convergenceV1';
import {
  derniereReponseParQuestionnaire,
  dernieresFraiches,
  evaluerDeclencheur,
  evaluerDeclencheursDeRegle,
  feuilleAtteinteComplete,
  fraicheurDeLEntree,
  type ContexteDossier,
  type ReponseOrientation,
} from './orientationEngine';
import {
  estFeuilleInstrument,
  feuillesDuDeclencheur,
  type OrientationDeclencheurFeuille,
  type OrientationRule,
  type RepetitionOrientation,
} from './orientationRulesV1';

// ─────────────────────────────────────────────────────────────────────────────
// LE PRODUCTEUR DE LA FORME `CONVERGENCE` — `DC-29`, lot H98 ([[D-443]] §8,
// [[D-450]] §6, [[D-453]] §8).
//
// PUR ET REJOUABLE : aucune lecture de base, aucune date courante — l'horloge
// arrive par l'entrée, comme au moteur d'orientation.
//
// HORS DE `CONTRADICTIONS_RULES_V1`, et c'est voulu : la convergence se lit sur
// les règles d'ORIENTATION, sous leur signature. Le refus du moteur de
// contradictions (`forme !== 'DISCORDANCE'`) demeure ([[D-443]], « ne touche
// pas »), et le registre des conflits n'ouvre aucune convergence ([[D-103]]).
//
// L'ALGORITHME, en cinq temps :
// 1. une règle publiée DÉCLENCHE au sens exact du moteur d'orientation
//    (`evaluerDeclencheursDeRegle`, partagé — jamais recopié) ;
// 2. elle OUVRE les besoins que documentent ses conditions rattachées
//    ([[D-453]] §2) ; sans condition rattachée, elle n'ouvre rien ;
// 3. sur un besoin ouvert, toute condition rattachée COMPTE dès qu'une de ses
//    feuilles est atteinte sur une passation fraîche et complète, même hors de
//    sa règle ([[D-450]] §3) ; absente, incomplète, périmée ou atteinte par
//    plancher, elle ne compte pas ;
// 4. une condition compte au plus une fois par besoin, dans sa famille
//    ([[D-453]] §1) ;
// 5. la graduation compte les familles distinctes ([[D-443]] §1).
//
// GARDE-FOU DE [[D-041]] : l'objet produit ne porte aucun champ de certitude,
// de probabilité, de score ou de confiance. La convergence augmente la
// priorité, jamais la certitude.
// ─────────────────────────────────────────────────────────────────────────────

export type EntreeConvergence = {
  reponses: ReponseOrientation[];
  /** Absent = anamnèse non lue : aucune déclaration n'est atteinte (`DC-24`). */
  drapeaux?: DrapeauxAnamnese;
  /** Les règles d'orientation — le service passe `ORIENTATION_RULES_V1`. */
  regles: readonly OrientationRule[];
  /** Horloge en millisecondes, fournie par l'appelant. */
  maintenantMs?: number;
  fenetres?: Readonly<Record<string, RepetitionOrientation>>;
  /** Injectables pour les bancs ; par défaut, la table signée. */
  rattachements?: readonly RattachementConvergence[];
  sansCompte?: readonly ConditionSansCompte[];
};

/** Clé d'une condition : instrument + sous-score, ou champ + valeur. */
export function cleCondition(condition: ConditionConvergence): string {
  return condition.type === 'instrument'
    ? `instrument:${condition.idQuestionnaire}:${condition.sousScore ?? ''}`
    : `drapeau:${condition.champ}:${condition.valeur}`;
}

/**
 * Les conditions qu'une feuille porte. Une feuille de drapeau à plusieurs
 * valeurs porte une condition par valeur : chacune se rattache seule.
 * Une feuille d'âge ou d'alimentation n'en porte aucune.
 */
export function conditionsDeLaFeuille(
  feuille: OrientationDeclencheurFeuille,
): { condition: ConditionConvergence; feuille: OrientationDeclencheurFeuille }[] {
  if (estFeuilleInstrument(feuille)) {
    return [{
      condition: {
        type: 'instrument',
        idQuestionnaire: feuille.idQuestionnaire,
        ...(feuille.sousScore ? { sousScore: feuille.sousScore } : {}),
      },
      feuille,
    }];
  }
  if (feuille.type === 'drapeau') {
    return feuille.valeurs.map(valeur => ({
      condition: { type: 'drapeau', champ: feuille.champ, valeur },
      feuille: { type: 'drapeau', champ: feuille.champ, valeurs: [valeur] },
    }));
  }
  return [];
}

/** Les règles qu'évalue le producteur : même filtre d'entrée que l'orientation. */
function reglesEligibles(regles: readonly OrientationRule[]): OrientationRule[] {
  return regles.filter(regle => regle.statut === 'publiee'
    && regle.declencheurs.length > 0
    && regle.justificationClaims.length > 0);
}

type ConditionComptee = {
  rattachement: RattachementConvergence;
  /** Les règles où une feuille de cette condition est atteinte. */
  regles: Set<string>;
};

function exclue(rattachement: RattachementConvergence, besoin: number): boolean {
  const condition = rattachement.condition;
  return condition.type === 'instrument'
    && EXCLUSIONS_CONVERGENCE_V1.some(exclusion =>
      exclusion.idQuestionnaire === condition.idQuestionnaire && exclusion.besoin === besoin);
}

function graduationDe(nombreFamilles: number): GraduationConvergence | null {
  for (const borne of BORNES_GRADUATION_CONVERGENCE) {
    if (nombreFamilles >= borne.minFamilles) return borne.graduation;
  }
  return null;
}

const LIBELLE_FAMILLE: Record<FamilleLue, string> = Object.fromEntries(
  FAMILLES_MESURE_V1.filter(f => f.id === 'AUTO' || f.id === 'ANAMNESE').map(f => [f.id, f.libelle]),
) as Record<FamilleLue, string>;

/** Ordre de lecture des familles dans la phrase : celui du registre. */
const ORDRE_FAMILLE: Record<FamilleLue, number> = { AUTO: 0, ANAMNESE: 1 };

function nomDeLaSource(rattachement: RattachementConvergence): string {
  const condition = rattachement.condition;
  return condition.type === 'instrument' ? condition.idQuestionnaire : rattachement.libelle ?? condition.valeur;
}

function dateLisible(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', { timeZone: FUSEAU_CLINIQUE }).format(new Date(iso));
}

function libelleBesoin(besoin: number): string {
  const definition = BESOINS.find(b => b.id === besoin);
  return definition ? `besoin ${besoin}, « ${definition.libellePraticien} »` : `besoin ${besoin}`;
}

function pluriel(n: number, singulier: string, plurielForme: string): string {
  return n > 1 ? plurielForme : singulier;
}

/**
 * Les constats de convergence du dossier, un par besoin ouvert qui porte au
 * moins une famille concordante — triés par numéro de besoin.
 */
export function evaluerConvergences(entree: EntreeConvergence): ContradictionFinding[] {
  const rattachements = entree.rattachements ?? RATTACHEMENTS_CONVERGENCE_V1;
  const sansCompte = entree.sansCompte ?? CONDITIONS_SANS_COMPTE_V1;
  const parCle = new Map(rattachements.map(r => [cleCondition(r.condition), r]));
  const dernieres = derniereReponseParQuestionnaire(entree.reponses);
  const fraicheur = fraicheurDeLEntree(entree);
  const fraiches = dernieresFraiches(dernieres, fraicheur);
  // Le producteur ne connaît ni l'âge ni l'état de population : aucune des
  // vingt règles ne les lit, et le banc d'alignement rougit si l'une le faisait
  // sans rattachement.
  const dossier: ContexteDossier = {};
  const regles = reglesEligibles(entree.regles);

  // 1-2. Règles déclenchées, et besoins qu'elles ouvrent.
  const ouvertures = new Map<number, { regles: Set<string>; claims: ContradictionClaimRef[] }>();
  const declenchees = new Set<string>();
  for (const regle of regles) {
    const issue = evaluerDeclencheursDeRegle(regle, dernieres, entree.drapeaux, dossier, fraicheur);
    if (issue.statut !== 'declenchee') continue;
    declenchees.add(regle.id);
    for (const declencheur of regle.declencheurs) {
      for (const feuille of feuillesDuDeclencheur(declencheur)) {
        for (const { condition, feuille: porteuse } of conditionsDeLaFeuille(feuille)) {
          const rattachement = parCle.get(cleCondition(condition));
          if (!rattachement) continue;
          // Sous un `ou`, seule la branche atteinte ouvre : la même lecture
          // que le moteur, sur les passations fraîches.
          if (evaluerDeclencheur(porteuse, fraiches, entree.drapeaux, dossier) === null) continue;
          for (const besoin of rattachement.besoins) {
            if (exclue(rattachement, besoin)) continue;
            const ouverture = ouvertures.get(besoin) ?? { regles: new Set<string>(), claims: [] };
            if (!ouverture.regles.has(regle.id)) {
              ouverture.regles.add(regle.id);
              ouverture.claims.push(...regle.justificationClaims);
            }
            ouvertures.set(besoin, ouverture);
          }
        }
      }
    }
  }

  // 3. Conditions comptables : atteintes sur passation fraîche et complète.
  const comptees = new Map<string, ConditionComptee>();
  for (const regle of regles) {
    for (const declencheur of regle.declencheurs) {
      for (const feuille of feuillesDuDeclencheur(declencheur)) {
        for (const { condition, feuille: porteuse } of conditionsDeLaFeuille(feuille)) {
          const cle = cleCondition(condition);
          const rattachement = parCle.get(cle);
          if (!rattachement) continue;
          if (!feuilleAtteinteComplete(porteuse, dernieres, entree.drapeaux, dossier, fraicheur)) continue;
          const deja = comptees.get(cle) ?? { rattachement, regles: new Set<string>() };
          deja.regles.add(regle.id);
          comptees.set(cle, deja);
        }
      }
    }
  }

  const constats: ContradictionFinding[] = [];
  for (const besoin of [...ouvertures.keys()].sort((a, b) => a - b)) {
    const ouverture = ouvertures.get(besoin)!;
    // 4. Une condition, une fois par besoin, dans sa famille.
    const surLeBesoin = [...comptees.values()]
      .filter(c => c.rattachement.besoins.includes(besoin) && !exclue(c.rattachement, besoin));
    if (surLeBesoin.length === 0) continue;

    const familles = [...new Set(surLeBesoin.map(c => c.rattachement.famille))]
      .sort((a, b) => ORDRE_FAMILLE[a] - ORDRE_FAMILLE[b]);
    // 5. La graduation compte les familles.
    const graduation = graduationDe(familles.length);
    if (graduation === null) continue;

    // Sources : un instrument une fois par axe, sous-scores non nommés
    // séparément ([[D-443]] §7) ; une déclaration par condition.
    const sources: SourceContradiction[] = [];
    const instrumentsVus = new Set<string>();
    let sourceIncomplete = false;
    for (const c of surLeBesoin) {
      const condition = c.rattachement.condition;
      if (condition.type === 'instrument') {
        if (instrumentsVus.has(condition.idQuestionnaire)) continue;
        instrumentsVus.add(condition.idQuestionnaire);
        const reponse = dernieres.get(condition.idQuestionnaire);
        // UNE SOURCE QUI NE SAIT PAS NOMMER SA PASSATION N'EST PAS REMONTABLE
        // (`DC-34`) : même refus que le moteur de contradictions.
        if (!reponse?.idReponse) {
          sourceIncomplete = true;
          break;
        }
        sources.push({
          type: 'instrument',
          idQuestionnaire: condition.idQuestionnaire,
          reponseId: reponse.idReponse,
          dateReponse: reponse.dateReponse,
        });
      } else {
        sources.push({
          type: 'anamnese',
          champ: condition.champ,
          valeur: condition.valeur,
          libelle: c.rattachement.libelle ?? condition.valeur,
        });
      }
    }
    if (sourceIncomplete) continue;

    // La phrase NEUTRE du constat : familles et membres, règles déclenchées,
    // et À PART les conditions comptées hors de leur règle ([[D-450]] §3).
    const membres = familles.map(famille => {
      const noms = [...new Set(surLeBesoin
        .filter(c => c.rattachement.famille === famille)
        .map(c => nomDeLaSource(c.rattachement)))];
      return `${LIBELLE_FAMILLE[famille]} : ${noms.join(', ')}`;
    });
    const reglesDeclenchees = [...ouverture.regles];
    const horsRegle = [...new Set(surLeBesoin
      .filter(c => ![...c.regles].some(id => declenchees.has(id)))
      .map(c => nomDeLaSource(c.rattachement)))];

    let description = `Sur le ${libelleBesoin(besoin)}, ${familles.length} `
      + `${pluriel(familles.length, 'famille de mesure concordante', 'familles de mesure concordantes')} `
      + `(${membres.join(' ; ')}). `
      + `${pluriel(reglesDeclenchees.length, 'Règle déclenchée', 'Règles déclenchées')} sur ce besoin : `
      + `${reglesDeclenchees.join(', ')}.`;
    if (horsRegle.length > 0) {
      description += ` ${pluriel(horsRegle.length, 'Condition comptée', 'Conditions comptées')} `
        + `hors de sa règle : ${horsRegle.join(', ')}.`;
    }

    const limitations = [...LIMITATIONS_CONVERGENCE, ...(LIMITATIONS_PAR_BESOIN[besoin] ?? [])];
    // Source partagée ([[D-453]] §1) : présente dans plusieurs cartes, elle ne
    // vaut pas plusieurs observations indépendantes.
    for (const c of surLeBesoin) {
      const autres = c.rattachement.besoins.filter(b => b !== besoin);
      if (autres.length === 0) continue;
      limitations.push(`Source partagée avec le ${autres.map(libelleBesoin).join(', ')} : `
        + `${nomDeLaSource(c.rattachement)} ne vaut pas une observation indépendante.`);
    }
    // Conditions visibles sans compter ([[D-453]] §4), atteintes sur une
    // passation fraîche, dans la carte de leur besoin.
    for (const visible of sansCompte) {
      if (!visible.besoinsCarte.includes(besoin)) continue;
      const constat = conditionVisibleAtteinte(visible, regles, fraiches, entree.drapeaux, dossier);
      if (constat !== null) {
        limitations.push(`Visible sans compter : ${visible.libelle}${constat} — ${visible.motif}.`);
      }
    }

    const id = `CONV-B${besoin}`;
    constats.push({
      forme: 'CONVERGENCE',
      graduation,
      id,
      audience: 'praticien_seul',
      sources,
      description,
      importance: IMPORTANCE_CONVERGENCE,
      hypotheses: [],
      actionSuggeree: ACTION_CONVERGENCE,
      resolution: { statut: 'ouverte' },
      justificationClaims: dedoublonnerClaims(ouverture.claims),
      regleId: id,
      limitations,
      ecartJoursEntreSources: ecartJoursEntreSources(sources),
    });
  }
  return constats;
}

/**
 * Une condition visible est-elle atteinte ? `null` si non ; sinon le détail à
 * afficher — l'intensité et la date pour une plainte ([[D-453]] §4), rien de
 * plus pour une déclaration.
 */
function conditionVisibleAtteinte(
  visible: ConditionSansCompte,
  regles: readonly OrientationRule[],
  fraiches: Map<string, ReponseOrientation>,
  drapeaux: DrapeauxAnamnese | undefined,
  dossier: ContexteDossier,
): string | null {
  const cle = cleCondition(visible.condition);
  for (const regle of regles) {
    for (const declencheur of regle.declencheurs) {
      for (const feuille of feuillesDuDeclencheur(declencheur)) {
        for (const { condition, feuille: porteuse } of conditionsDeLaFeuille(feuille)) {
          if (cleCondition(condition) !== cle) continue;
          const atteint = evaluerDeclencheur(porteuse, fraiches, drapeaux, dossier);
          if (atteint === null) continue;
          if (condition.type !== 'instrument') return '';
          const reponse = fraiches.get(condition.idQuestionnaire);
          return reponse ? ` (${atteint.motif}, le ${dateLisible(reponse.dateReponse)})` : ` (${atteint.motif})`;
        }
      }
    }
  }
  return null;
}

function dedoublonnerClaims(claims: readonly ContradictionClaimRef[]): ContradictionClaimRef[] {
  const vus = new Map<string, ContradictionClaimRef>();
  for (const claim of claims) vus.set(`${claim.claimId}@${claim.versionClaim}`, { ...claim });
  return [...vus.values()].sort((a, b) => a.claimId.localeCompare(b.claimId) || a.versionClaim.localeCompare(b.versionClaim));
}
