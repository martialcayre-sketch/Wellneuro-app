import { prisma } from '@/lib/prisma';
import {
  INDICATIONS_ASSIETTES_METADATA,
  INDICATIONS_ASSIETTES_V1,
  claimsDeLaLigne,
  indicationsAssiettesSignees,
  lignesIndicationAssietteServables,
} from '@/lib/clinical/indicationsAssiettesV1';
import { cleClaim } from '@/lib/clinical/catalogueConduitesV1';
import {
  derniereReponseParQuestionnaire,
  evaluerDeclencheur,
  lacunesDuDeclencheur,
  type ContexteDossier,
  type DeclencheurAtteint,
  type LacuneDeclencheur,
} from '@/lib/clinical/orientationEngine';
import { scoresRecalculesPourRaisonnement } from '@/lib/clinical/orientationService';
import { claimsValidesAuCorpus } from '@/lib/rag/claims/validite';
import { assiettesParIndication } from '@/lib/food-compass/plates';
import { ORDRE_CONSULTATION_PORTEUSE, whereConsultationPorteuse } from '@/lib/consultation/consultationPorteuse';
import { extraireDrapeauxAnamnese } from '@/lib/consultation/drapeauxAnamnese';
import { lireEtatPopulation } from '@/lib/consultation/etatPopulation';
import { ageAnnees } from '@/lib/patient/age';

// LES ASSIETTES INDIQUÉES POUR UN DOSSIER — LECTURE SEULE, et le premier
// appelant de production de `lignesIndicationAssietteServables` ([[D-237]]).
//
// LA TABLE EXISTAIT ET N'ATTEIGNAIT PERSONNE. Écrite par [[D-235]], attestée
// par [[D-236]], elle est restée deux lots sans consommateur : `plates.ts`
// annonçait qu'`assiettesParIndication` se SUPPRIMERAIT si le lot d'exposition
// ne venait pas, et le module d'indications disait la même chose de son point
// de sortie. Ce module est ce lot.
//
// CE QU'IL NE FAIT PAS — ni authentification, ni contrôle d'appartenance, ni
// journalisation d'accès. Même partage des rôles que `orientationService` et
// `propositionService` : l'appelant pose ces gestes AVANT d'appeler ici. Il vit
// en `lib/` et non dans la route parce qu'un `route.ts` Next ne peut pas
// exporter de valeur — `next build` casse, et `tsc --noEmit` ne le voit pas.
//
// IL N'ÉCRIT RIEN, ET IL NE PROPOSE AUCUN GESTE. Une assiette indiquée est une
// LECTURE servie au praticien : rien ne s'attache à un protocole, rien ne part
// vers un patient. Que l'assiette devienne une unité d'action est un lot à
// part, cadré le 2026-09-16 et dépendant de deux arbitrages encore ouverts.
//
// LE SCORE EST RECALCULÉ, JAMAIS RELU EN BASE, et ce module ne refait pas ce
// calcul : il importe `scoresRecalculesPourRaisonnement`. Un score stocké est
// un instantané de la doctrine qui avait cours à la soumission ; deux
// consommateurs cliniques du même score qui ne lisent pas la même chose est un
// défaut que le dépôt a déjà payé une fois (`orientationService`, 2026-08-04).

/**
 * Message du verrou fermé — il ne nomme aucun des deux termes.
 *
 * `assiettesIndiqueesActives()` est un ET : le drapeau d'environnement et la
 * signature de la table. Nommer l'un donnerait au praticien une raison que
 * l'autre dément, et c'est exactement la faute que [[D-076]] a corrigée sur
 * l'orientation — un message qui affirmait « les règles ne sont pas validées »
 * le jour où elles l'étaient.
 */
export const MESSAGE_ASSIETTES_INACTIVES =
  "Indications d'assiette non activées sur cet environnement.";

/**
 * UNE ASSIETTE DONT LA PORTE EST ATTEINTE.
 *
 * `libelle` VIENT DU CATALOGUE C5B, jamais de la ligne ni du corpus. La ligne
 * ne porte qu'un `plateCode` ; le libellé lisible est celui que le catalogue
 * signé donne à l'assiette, et il DÉSIGNE la source sans en recopier une
 * phrase — G6 reste fermée.
 *
 * `claims` SONT DES IDENTIFIANTS, et rien d'autre ne traverse. Ni verbatim, ni
 * paraphrase : le praticien qui veut lire le fondement le lit au corpus, par
 * les surfaces qui existent pour cela.
 */
export type AssietteIndiquee = {
  ligneId: string;
  plateCode: string;
  libelle: string;
  /** Protocole du corpus adossé à l'assiette (`WN-SRC-nnnn`), ou `null`. */
  sourceProtocole: string | null;
  /** Ce qui a atteint la porte, tel que le moteur l'écrit. */
  motif: string;
  /** Instruments à l'appui — vide pour une porte d'anamnèse, d'âge ou de régime. */
  instruments: DeclencheurAtteint['instruments'];
  /** Identifiants de claim, dédoublonnés et triés. Indication ET sécurité. */
  claims: readonly string[];
};

// `raccourciAssume` NE TRAVERSE PAS, ET C'EST UN CONSTAT DE REVUE CORRIGÉ.
//
// Le champ existe sur la ligne, il est dans le périmètre haché, et une première
// rédaction le servait tel quel — la carte affichait « Raccourci assumé : … »
// au praticien. Ce texte n'est pas écrit pour lui : il est écrit pour la
// RELECTURE DE SIGNATURE, et il en porte les mots — `claimsSecurite`,
// `insomnie_depression`, `Q_INF_03`, `D-224`. Le rendre violait « UI en
// français » sur la carte même dont le chapeau explique qu'elle renonce à
// nommer un champ d'anamnèse pour ne pas afficher un identifiant interne. Et
// aucun banc ne le voyait : la fixture du panneau posait `raccourciAssume: null`.
//
// POURQUOI ON NE LE REFORMULE PAS ICI, et c'est la raison qui ferme le sujet
// pour ce lot : le champ est DANS le périmètre signé. Le reformuler périme
// l'attestation de [[D-236]]. Un libellé écrit POUR L'ÉCRAN est un champ neuf,
// donc une re-signature — le lot qui la portera est nommé au dossier de
// campagne. CE QUI MANQUE EST DONC DIT, PAS CONTOURNÉ : le texte du raccourci
// vit dans la table signée, au dépôt, et non sur une surface praticien
// (vérifié — la surface de relecture NOMME le champ, elle ne le recopie pas).
// De la réserve, l'écran ne porte que les claims que la carte désigne, ceux de
// `claimsSecurite` compris.

/**
 * UNE ASSIETTE QU'ON N'A PAS PU REGARDER — et la carte doit le dire.
 *
 * SANS CETTE LISTE, LE LOT AURAIT MENTI PAR OMISSION. Une carte qui ne montre
 * que les portes atteintes se lit, quand elle est vide, « aucune assiette n'est
 * indiquée pour ce patient » — un constat clinique. La vérité est souvent
 * qu'un instrument n'a pas été passé. `DC-24` : l'absence d'information ne vaut
 * jamais mesure normale.
 *
 * CE QU'ELLE NE CONTIENT PAS : les lignes ÉVALUÉES et non atteintes. Celles-là
 * ont été lues et tranchées — leur silence est honnête, et les afficher
 * noierait ce qui manque vraiment sous ce qui ne manque pas.
 */
export type AssietteNonEvaluee = {
  ligneId: string;
  plateCode: string;
  libelle: string;
  lacunes: readonly LacuneDeclencheur[];
};

export type ResultatAssiettesInactif = {
  actif: false;
  message: string;
};

export type ResultatAssiettes = {
  actif: true;
  /** Le `shaPerimetre` littéral de la table servie — jamais recalculé ici. */
  shaPerimetre: string;
  indiquees: readonly AssietteIndiquee[];
  nonEvaluees: readonly AssietteNonEvaluee[];
  /**
   * Combien de lignes servables ont été LUES et n'indiquent rien. Un nombre,
   * pas une liste : il permet à la carte de distinguer « rien à montrer » de
   * « rien n'a été regardé », sans étaler des refus qui n'apprennent rien.
   */
  nonIndiquees: number;
  /**
   * COMBIEN DE LIGNES PUBLIÉES LE FILTRE DE CLAIMS A RETIRÉES — et pourquoi ce
   * nombre ne pouvait pas manquer. CONSTAT DE REVUE.
   *
   * `lignesIndicationAssietteServables` retire une ligne publiée dès qu'UN de
   * ses claims cesse d'être valide au corpus — désactivé, remis en attente de
   * validation, sorti du compartiment actif. C'est le bon fail-closed : aucune
   * indication non fondée n'atteint l'écran. Mais sans ce terme, la fermeture
   * était INDISCERNABLE d'un vide : les trois sorts ne comptent que les lignes
   * SERVABLES, et `corpusLu` valait `true` — il rassurait au lieu de nuancer.
   * La carte annonçait alors « les N indications en service ont été évaluées »
   * sous le sha du périmètre signé ENTIER, alors que plusieurs lignes publiées
   * n'avaient pas été regardées. `DC-24`, et c'est la faute exacte que ce lot
   * existe pour empêcher.
   *
   * `0` QUAND LE CORPUS EST ILLISIBLE, et ce n'est pas un repli : dans ce cas
   * AUCUNE ligne n'est servable, et la raison est déjà portée par `corpusLu`.
   * Compter là un retrait par claim nommerait une seconde cause qui n'a pas eu
   * lieu — la faute que `completude_illisible` a fermée côté moteur.
   */
  retireesFauteDeClaim: number;
  /**
   * Le corpus a-t-il pu être interrogé ? `false` ⇒ `indiquees` et
   * `nonEvaluees` sont VIDES pour cette raison-là, et pas parce que le dossier
   * ne déclenche rien.
   *
   * `lignesIndicationAssietteServables` accepte `null` précisément pour cette
   * distinction : les deux ferment, pour deux raisons différentes. Confondre
   * une lecture impossible avec un corpus vide est le silence que `DC-24`
   * interdit — le praticien doit pouvoir savoir que la machine n'a pas regardé.
   *
   * LE CHAMP PORTE LE FAIT, PAS LA PHRASE. Une première rédaction exportait
   * aussi un `MESSAGE_CORPUS_ILLISIBLE` — **que personne n'appelait** : le
   * panneau ne peut pas importer ce module (il tire Prisma), et il écrivait
   * donc son propre texte. Deux orthographes du même message, dont une morte.
   * La formulation appartient à la surface qui la rend ; ce champ ne dit que
   * ce qui s'est passé.
   */
  corpusLu: boolean;
};

/**
 * Le verrou : le drapeau d'environnement ET la signature de la table.
 *
 * EXPORTÉ POUR QUE LA ROUTE LE CONSULTE AVANT SES PROPRES LECTURES — patron
 * d'`orientationActive()`. `verifierAppartenancePatient` JOURNALISE l'accès au
 * dossier : verrou fermé, la route répond sans avoir touché au patient, et ne
 * consigne donc pas un accès qui n'a pas eu lieu.
 *
 * POURQUOI UN DRAPEAU ALORS QUE LA SIGNATURE SUFFIRAIT À FERMER. Parce qu'elle
 * ne ferme plus : la table est signée depuis le 2026-09-19. Sans drapeau, les
 * sept lignes servables atteindraient l'écran du praticien au prochain
 * déploiement de production — une mise en service par accident de calendrier.
 * Le drapeau rend le jour au cabinet. Arbitrage du responsable, rendu en
 * séance ([[D-237]]).
 */
export function assiettesIndiqueesActives(): boolean {
  return process.env.WN_ASSIETTES_INDIQUEES === 'true' && indicationsAssiettesSignees();
}

export function resultatAssiettesInactif(): ResultatAssiettesInactif {
  return { actif: false, message: MESSAGE_ASSIETTES_INACTIVES };
}

/**
 * LES CLAIMS QUE LA TABLE CITE — lus sur les LIGNES, jamais sur `claimsSource`.
 *
 * Les deux ensembles sont égaux tant que le verrou est ouvert : c'est un de ses
 * sept termes. Mais c'est le FILTRE qui décide du service, et il interroge les
 * lignes (`claimsDeLaLigne`). Passer la métadonnée ferait dépendre le service
 * d'une égalité vérifiée ailleurs ; passer les lignes ne peut pas diverger.
 */
function referencesCiteesParLaTable(): readonly { claimId: string; versionClaim: string }[] {
  const uniques = new Map<string, { claimId: string; versionClaim: string }>();
  for (const ligne of INDICATIONS_ASSIETTES_V1) {
    for (const claim of claimsDeLaLigne(ligne)) uniques.set(cleClaim(claim), claim);
  }
  return [...uniques.values()];
}

/**
 * Les assiettes indiquées pour ce dossier — et celles qu'on n'a pas pu regarder.
 *
 * L'ORDRE DES TROIS LECTURES EST CELUI DU COÛT CROISSANT DE L'ERREUR : le
 * verrou d'abord (aucune base touchée), le corpus ensuite (aucun dossier
 * touché), le dossier en dernier.
 */
export async function evaluerAssiettesPourPatient(
  idPatient: string,
): Promise<ResultatAssiettes | ResultatAssiettesInactif> {
  // Re-vérifié ici même si la route l'a déjà consulté : c'est ce qui garantit
  // qu'aucun futur appelant ne puisse lire un dossier à travers ce module sans
  // que le verrou soit passé. La lecture Prisma est en aval de ce test.
  if (!assiettesIndiqueesActives()) return resultatAssiettesInactif();

  // UN SEUL INSTANT POUR TOUT LE CALCUL — il ne sert aujourd'hui que l'âge,
  // mais deux appels à `Date.now()` seraient deux instants, et il suffit d'un
  // passage de minuit entre les deux pour qu'un dossier soit évalué sur deux
  // horloges. Même discipline que [[D-231]] côté orientation.
  const maintenantMs = Date.now();

  // LE CORPUS D'ABORD, ET SON ÉCHEC NE LÈVE PAS. `null` traverse le filtre et
  // rend `[]` : c'est le fail-closed voulu. Mais on RETIENT la raison, sans
  // quoi la carte afficherait un vide indiscernable d'un dossier sans
  // indication.
  let claimsValides: ReadonlySet<string> | null = null;
  try {
    claimsValides = await claimsValidesAuCorpus(referencesCiteesParLaTable());
  } catch (err) {
    console.error(
      '[indicationsAssiettesService] corpus illisible',
      err instanceof Error ? err.message : String(err),
    );
    claimsValides = null;
  }

  const servables = lignesIndicationAssietteServables(claimsValides);
  const shaPerimetre = INDICATIONS_ASSIETTES_METADATA.shaPerimetre ?? '';
  // COMBIEN DE LIGNES PUBLIÉES LE CORPUS A RETIRÉES — voir `retireesFauteDeClaim`.
  // Compté ICI, par différence, et non dans le filtre : le filtre rend ce qu'il
  // sert, et lui faire rendre aussi ce qu'il écarte changerait un contrat que
  // trois appelants partagent. Corpus illisible ⇒ `0` : aucune ligne n'est
  // servable, et `corpusLu` porte déjà la raison.
  const publiees = INDICATIONS_ASSIETTES_V1.filter(ligne => ligne.statut === 'publiee').length;
  const retireesFauteDeClaim = claimsValides === null ? 0 : publiees - servables.length;

  // AUCUNE LIGNE SERVABLE ⇒ AUCUNE LECTURE DE DOSSIER. Ni scores, ni anamnèse,
  // ni date de naissance : il n'y aurait rien à évaluer avec. Un dossier qu'on
  // n'a pas besoin de lire ne se lit pas.
  if (servables.length === 0) {
    return {
      actif: true,
      shaPerimetre,
      indiquees: [],
      nonEvaluees: [],
      nonIndiquees: 0,
      retireesFauteDeClaim,
      corpusLu: claimsValides !== null,
    };
  }

  const [reponses, consultation, patient] = await Promise.all([
    prisma.questionnaireReponse.findMany({
      where: { idPatient },
      select: {
        idReponse: true,
        idQuestionnaire: true,
        dateReponse: true,
        scoresJson: true,
        statutValidite: true,
      },
      orderBy: { dateReponse: 'desc' },
    }),
    // LA CONSULTATION QUI PORTE UNE ANAMNÈSE, et non la plus récente tout
    // court : une consultation naît sans anamnèse et ne la reçoit qu'à la
    // validation du patient. Sélection PARTAGÉE avec l'orientation ([[D-101]]) —
    // deux tris divergents feraient lire deux anamnèses au même dossier.
    prisma.consultation.findFirst({
      where: whereConsultationPorteuse(idPatient),
      select: { anamnese: true },
      orderBy: ORDRE_CONSULTATION_PORTEUSE,
    }),
    // LA DATE DE NAISSANCE, ET RIEN D'AUTRE. Ce module est en lecture seule sur
    // le dossier et n'a aucune raison de rapporter une identité.
    prisma.patient.findUnique({
      where: { idPatient },
      select: { dateNaissance: true },
    }),
  ]);

  const dernieres = derniereReponseParQuestionnaire(
    reponses.map(reponse => ({
      idQuestionnaire: reponse.idQuestionnaire,
      dateReponse: reponse.dateReponse.toISOString(),
      idReponse: reponse.idReponse,
      statutValidite: reponse.statutValidite,
      scores: scoresRecalculesPourRaisonnement(
        reponse.idQuestionnaire,
        reponse.scoresJson as Record<string, unknown> | null,
        reponse.dateReponse,
        reponse.statutValidite,
      ),
    })),
  );

  // AUCUNE CONSULTATION PORTEUSE ⇒ ON NE PASSE RIEN, et surtout pas un objet
  // aux drapeaux vides : des drapeaux absents n'atteignent aucune porte, alors
  // que des drapeaux VIDES affirmeraient que le patient n'a rien déclaré. Le
  // moteur distingue les deux, et c'est `DC-24` à la source. Même discipline
  // pour l'état de population ([[D-232]]).
  const drapeaux = consultation?.anamnese == null
    ? undefined
    : extraireDrapeauxAnamnese(consultation.anamnese);
  const dossier: ContexteDossier = {
    ageAnnees: ageAnnees(patient?.dateNaissance, maintenantMs),
    ...(consultation?.anamnese == null
      ? {}
      : { etatPopulation: lireEtatPopulation(consultation.anamnese) }),
  };

  // LE POINT DE SORTIE DU CATALOGUE, PAS LE LOOKUP NU ([[D-230]]). `plates.ts`
  // pose que le catalogue ne se rend JAMAIS en entier à un écran : on y entre
  // par `assiettesParMomentDeRepas` (l'observation) ou `assiettesParIndication`
  // (la prescription). `getRecommendedPlate` est la recherche brute — légitime
  // dans le verrou, qui doit pouvoir constater l'axe d'une ligne quelconque,
  // mais pas ici : ce module SERT un écran.
  //
  // CE QUE LA NUANCE ACHÈTE, et ce n'est pas une politesse : la partition est
  // refaite au point de service. Une ligne qui pointerait une assiette
  // d'observation — ce que le verrou refuse, mais qu'un appelant passant ses
  // propres lignes contournerait — ne trouverait rien ici et ne sortirait pas.
  const assiettesIndicables = new Map(
    assiettesParIndication().map(assiette => [assiette.plateCode, assiette]),
  );

  const indiquees: AssietteIndiquee[] = [];
  const nonEvaluees: AssietteNonEvaluee[] = [];
  let nonIndiquees = 0;

  for (const ligne of servables) {
    const assiette = assiettesIndicables.get(ligne.plateCode);
    if (assiette === undefined) continue;

    const atteint = evaluerDeclencheur(ligne.declencheur, dernieres, drapeaux, dossier);
    if (atteint !== null) {
      indiquees.push({
        ligneId: ligne.id,
        plateCode: ligne.plateCode,
        libelle: assiette.label,
        sourceProtocole: assiette.sourceProtocole,
        motif: atteint.motif,
        instruments: atteint.instruments,
        claims: [...new Set(claimsDeLaLigne(ligne).map(cleClaim))].sort(),
      });
      continue;
    }

    // INTERROGÉ SEULEMENT APRÈS UN `null`, et le contrat de la fonction
    // l'exige : sur une porte atteinte, elle rendrait les lacunes de branches
    // qui n'ont pas décidé.
    const lacunes = lacunesDuDeclencheur(ligne.declencheur, dernieres, drapeaux, dossier);
    if (lacunes.length === 0) {
      nonIndiquees += 1;
      continue;
    }
    nonEvaluees.push({
      ligneId: ligne.id,
      plateCode: ligne.plateCode,
      libelle: assiette.label,
      lacunes,
    });
  }

  return {
    actif: true,
    shaPerimetre,
    indiquees,
    nonEvaluees,
    nonIndiquees,
    retireesFauteDeClaim,
    corpusLu: claimsValides !== null,
  };
}
