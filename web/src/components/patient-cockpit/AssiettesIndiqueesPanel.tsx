'use client';

import { useEffect, useRef, useState } from 'react';
import type { AssiettesIndiqueesApiResponse } from '@/app/api/praticien/assiettes-indiquees/route';
import type { LacuneDeclencheur } from '@/lib/clinical/orientationEngine';
import { CATALOGUE_DEFINITIONS } from '@/lib/bibliotheque';
import { PortesBiologiquesSection } from './PortesBiologiquesSection';

// LES ASSIETTES INDIQUÉES — carte de LECTURE qui ARME UN GESTE, et n'en exécute
// aucun ([[D-237]], puis [[D-240]]).
//
// CE QUI A CHANGÉ, ET CE QUI N'A PAS CHANGÉ. [[D-237]] s'interdisait tout geste
// tant que le cadrage du 2026-09-16 faisait lire ses arbitrages comme ouverts ;
// leur direction était rendue depuis le même jour ([[D-213]]), et le responsable
// a formulé le manque depuis l'écran au premier dossier servi. La carte propose
// donc désormais UNE action, et une seule : retenir une assiette indiquée pour
// le constructeur de protocole.
//
// ELLE N'ÉCRIT TOUJOURS RIEN. Pas de POST, pas de formulaire, pas de champ de
// saisie — sa route n'exporte que `GET`, et un banc l'épingle. Le bouton ne fait
// que REMONTER un choix au parent : c'est le parent qui le garde, et le
// constructeur qui, sur un second geste explicite, en fait une action. Trois
// gestes séparent donc l'assiette affichée du protocole enregistré, et aucun
// n'est automatique.
//
// POURQUOI LE CHOIX NE VIT PAS ICI. Ce panneau est DÉMONTÉ dès que le praticien
// quitte la sous-vue « protocole » — délibérément, pour ne pas journaliser une
// lecture de dossier qu'il n'a pas demandée. Un choix gardé ici se perdrait à
// chaque aller-retour. Il monte donc au parent, exactement comme la sélection
// de l'observatoire Boussole, qui a la même contrainte pour la raison inverse.
//
// ELLE NE MONTRE JAMAIS UN VIDE NU. Une carte qui n'afficherait que les portes
// atteintes se lirait, vide, « aucune assiette n'est indiquée pour ce
// patient » : un constat clinique, là où la vérité est le plus souvent qu'un
// instrument n'a pas été passé. `DC-24`.
//
// LE TYPE VIENT DE LA ROUTE, EN `import type` SEULEMENT — le service importe
// Prisma, et un import de valeur le ferait entrer au paquet client.

/** Titre lisible d'un instrument, ou son identifiant — jamais un rendu inventé. */
function libelleInstrument(idQuestionnaire: string): string {
  return CATALOGUE_DEFINITIONS[idQuestionnaire]?.titre ?? idQuestionnaire;
}

function axeSuffixe(sousScore?: string): string {
  return sousScore ? ` — axe ${sousScore}` : '';
}

// POURQUOI LE CHAMP D'ANAMNÈSE N'EST PAS NOMMÉ À L'ÉCRAN, et ce n'est pas un
// oubli.
//
// `LacuneDeclencheur` porte la clé du moteur — `intolerancesAlimentaires` —,
// un identifiant interne : l'afficher tel quel violerait « UI en français ».
// Le libellé lisible existe (`ANAMNESE_SECTIONS`), mais l'atteindre demande la
// table de correspondance `CHAMP_ANAMNESE`, qui vit dans `declencheursAnamnese`
// — lequel importe `orientationRulesV1`, qui importe `corpusSyntheseV1`, qui
// importe `createHash` de `'crypto'`. **Un import de VALEUR depuis ce composant
// client tirerait donc au paquet du navigateur crypto-browserify ET la table de
// règles entière**, retenue par le `sha256(...)` de portée module — dans un
// fichier `/_next/static/…` qui n'est derrière aucune authentification.
//
// CE QUI L'AURAIT VU, ET CE QUI NE L'AURAIT PAS VU — dit exactement, parce
// qu'une première rédaction s'est trompée sur les trois (constat de revue).
// **Pas le build** : le spécifieur est `'crypto'` nu, que Next résout vers son
// polyfill sans broncher — c'est la forme préfixée `node:crypto` qui casse, et
// c'est une autre chaîne. **Mais un banc unitaire, oui** :
// `bundleClient.guard.test.ts` balaie tout fichier `'use client'` à la
// recherche d'un import de VALEUR depuis `@/lib/clinical/`, et
// `declencheursAnamnese` n'est pas un module feuille. L'import aurait rougi en
// T1. Le coût réel n'est donc pas une erreur de build : c'est le poids du chunk
// et le référentiel clinique servi au navigateur — et la barrière est un banc,
// pas le compilateur.
//
// Trois issues, toutes écartées ici : recopier la correspondance (un troisième
// jeu de noms qui dérive), la faire voyager dans la réponse (élargir le contrat
// HTTP pour un mot), ou déplacer `CHAMP_ANAMNESE` vers un module sans crypto
// (un refactor de module clinique partagé, non demandé). **La carte dit donc le
// fait sans le champ** — « aucune anamnèse au dossier » —, ce qui reste vrai et
// actionnable : c'est l'anamnèse entière qui manque, pas une case.

/**
 * CE QUI MANQUE, EN FRANÇAIS — et chaque phrase dit la MÊME chose que le type.
 *
 * Aucune n'affirme rien du patient : « non passé », « non coté », « recueil
 * incomplet » sont des faits sur le DOSSIER. Une formulation comme « le patient
 * ne présente pas… » serait la faute que cette carte existe pour éviter.
 */
export function libelleLacune(lacune: LacuneDeclencheur): string {
  switch (lacune.type) {
    case 'instrument_non_passe':
      return `${libelleInstrument(lacune.idQuestionnaire)} non passé${axeSuffixe(lacune.sousScore)}`;
    case 'instrument_non_cotable':
      return `${libelleInstrument(lacune.idQuestionnaire)} passé, mais non coté${axeSuffixe(lacune.sousScore)}`;
    case 'recueil_incomplet':
      return lacune.total === null
        ? `${libelleInstrument(lacune.idQuestionnaire)} — recueil incomplet : ${lacune.manquants} item(s) manquant(s)${axeSuffixe(lacune.sousScore)}`
        : `${libelleInstrument(lacune.idQuestionnaire)} — recueil incomplet : ${lacune.manquants} item(s) manquant(s) sur ${lacune.total}${axeSuffixe(lacune.sousScore)}`;
    // COMPLÉTUDE ILLISIBLE — et surtout pas « 0 item manquant ». Le praticien
    // doit lire qu'on ne SAIT PAS, pas un nombre qu'on aurait fabriqué.
    case 'completude_illisible':
      return `${libelleInstrument(lacune.idQuestionnaire)} — complétude du recueil illisible${axeSuffixe(lacune.sousScore)}`;
    case 'mesure_indisponible':
      return `${libelleInstrument(lacune.idQuestionnaire)} — mesure indisponible${axeSuffixe(lacune.sousScore)}`;
    case 'anamnese_absente':
      return 'Aucune anamnèse au dossier — la déclaration du patient n’a pas été lue';
    case 'age_inconnu':
      return 'Date de naissance absente ou illisible — la borne d’âge n’a pas été appliquée';
    case 'alimentation_non_declaree':
      return 'Régime alimentaire non déclaré';
  }
}

/** Ce que la carte remonte au parent : l'assiette retenue, rien de plus. */
export type AssietteRetenue = { plateCode: string; libelle: string };

export function AssiettesIndiqueesPanel({
  idPatient,
  onRetenirAssiette,
}: {
  idPatient: string;
  /**
   * SANS CETTE PROP, LA CARTE RESTE CE QU'ELLE ÉTAIT : aucun bouton, aucun
   * geste. Elle est optionnelle parce qu'une carte de lecture doit rester
   * montable ailleurs sans traîner un geste dont le point de montage n'a que
   * faire — et les deux branches sont épinglées par le banc, faute de quoi
   * l'absence de bouton passerait pour un état et non pour un contrat.
   */
  onRetenirAssiette?: (choix: AssietteRetenue) => void;
}) {
  // CHAQUE ÉTAT PORTE LE DOSSIER QUI L'A PRODUIT — constat de revue, et le
  // jeton seul n'y suffisait pas.
  //
  // LE DÉFAUT. `jeton` écarte une réponse EN RETARD ; il ne dit rien du rendu
  // qui suit un changement de `idPatient`. React rend d'abord avec la nouvelle
  // prop et l'ANCIEN état — l'effet qui le vide ne tourne qu'après le commit.
  // Le temps d'une image, les indications du patient précédent se peignaient
  // donc sous l'en-tête du nouveau. Bref, mais c'est une donnée clinique servie
  // sous le mauvais dossier.
  //
  // LE REMÈDE EST DANS LE COMPOSANT, ET NON UNE `key` AU POINT DE MONTAGE :
  // une `key={idPatient}` corrigerait le seul appelant d'aujourd'hui, et le
  // prochain appelant la réinventerait ou l'oublierait. Un état daté ne
  // s'oublie pas.
  //
  // AUCUN BANC UNITAIRE NE VOIT CETTE IMAGE, et il faut le dire plutôt que
  // laisser croire à une garde : `act()` fait tourner l'effet avant que le
  // rendu intermédiaire soit observable, si bien que le défaut et son correctif
  // rendent le même DOM au banc. Ce qui est éprouvé ci-dessous est le contrat
  // voisin — après bascule, c'est le contenu du NOUVEAU dossier qui paraît.
  const [payload, setPayload] = useState<{ pour: string; corps: AssiettesIndiqueesApiResponse } | null>(null);
  const [erreur, setErreur] = useState<{ pour: string; message: string } | null>(null);
  const [chargement, setChargement] = useState(true);
  // Un jeton par dossier : la réponse d'un dossier précédent ne doit jamais
  // s'afficher sous un autre patient. Même garde que l'observatoire.
  const jeton = useRef(0);

  useEffect(() => {
    jeton.current += 1;
    const courant = jeton.current;
    setPayload(null);
    setErreur(null);
    setChargement(true);
    (async () => {
      try {
        const reponse = await fetch(
          `/api/praticien/assiettes-indiquees?idPatient=${encodeURIComponent(idPatient)}`,
        );
        const corps = (await reponse.json()) as AssiettesIndiqueesApiResponse;
        if (jeton.current !== courant) return;
        if (!corps.ok) {
          setErreur({ pour: idPatient, message: corps.error });
          return;
        }
        setPayload({ pour: idPatient, corps });
      } catch {
        if (jeton.current === courant) {
          setErreur({ pour: idPatient, message: "Lecture impossible des indications d'assiette." });
        }
      } finally {
        if (jeton.current === courant) setChargement(false);
      }
    })();
  }, [idPatient]);

  // CE QUI EST RENDU EST CE QUI VIENT DE CE DOSSIER-CI, et rien d'autre.
  const lecture = payload !== null && payload.pour === idPatient ? payload.corps : null;
  const messageErreur = erreur !== null && erreur.pour === idPatient ? erreur.message : null;

  // VERROU FERMÉ : la carte disparaît entièrement. Elle n'a rien à dire au
  // praticien d'une fonctionnalité que le cabinet n'a pas ouverte, et un
  // encart « non activé » sur chaque dossier serait un bruit permanent.
  if (lecture?.ok && lecture.actif === false) return null;

  // RIEN NE PARAÎT AVANT LA RÉPONSE, et ce n'est pas de l'esthétique. Le
  // drapeau est livré ÉTEINT : tant qu'il n'est pas posé, TOUS les dossiers
  // sont dans la branche ci-dessus. Afficher « Lecture en cours… » pendant
  // l'attente ferait donc CLIGNOTER, sur chaque dossier du cabinet, une carte
  // qui s'efface aussitôt — un titre clinique qui apparaît puis disparaît se
  // lit comme un défaut, pas comme un chargement. Le prix est qu'aucun
  // indicateur d'attente n'est rendu ; c'est le bon prix pour une lecture
  // secondaire, et l'erreur, elle, reste dite.
  // `chargement` EST EN RETARD D'UN RENDU lui aussi : au premier rendu qui suit
  // une bascule de dossier, il vaut encore `false`. La seconde clause tient ce
  // cas — rien de ce dossier n'est encore arrivé, donc rien ne paraît.
  if (chargement || (lecture === null && messageErreur === null)) return null;

  return (
    <section
      aria-labelledby="assiettes-indiquees-title"
      className="rounded-xl border border-rail bg-surface overflow-hidden"
    >
      <div className="border-l-8 border-rail p-4">
        <h3 id="assiettes-indiquees-title" className="font-display text-lg font-semibold text-foreground">
          Assiettes indiquées
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Lecture de la table signée des indications d’assiette. Aucune assiette n’est prescrite ni
          transmise : la décision reste la vôtre.
        </p>

        {messageErreur && (
          <p role="alert" className="mt-4 text-sm text-status-danger">{messageErreur}</p>
        )}

        {lecture?.ok && lecture.actif === true && (
          <>
            {/* LE CORPUS N'A PAS PU ÊTRE LU — et ce n'est pas « aucune assiette
                n'est indiquée ». Les deux ferment, pour deux raisons
                différentes, et le praticien doit pouvoir les distinguer. */}
            {!lecture.corpusLu && (
              <p role="alert" className="mt-4 text-sm text-status-danger">
                Le corpus n’a pas pu être interrogé : aucune indication n’est servie pour ce dossier.
              </p>
            )}

            {/* DES LIGNES PUBLIÉES N'ONT PAS ÉTÉ REGARDÉES — et ce n'est ni
                « aucune assiette indiquée », ni un corpus illisible. Un claim
                qui cesse d'être valide retire SA ligne du service : la table
                reste signée, la carte rétrécit, et sans cette phrase le
                praticien lirait un constat portant sur la table entière.
                Constat de revue ; `DC-24` est la règle qui l'exige. */}
            {lecture.corpusLu && lecture.retireesFauteDeClaim > 0 && (
              <p role="alert" className="mt-4 text-sm text-status-warning">
                {lecture.retireesFauteDeClaim} indication(s) publiée(s) ne sont pas servies : un de
                leurs claims n’est plus valide au corpus. Elles n’ont pas été regardées sur ce
                dossier.
              </p>
            )}

            {lecture.corpusLu && lecture.indiquees.length === 0 && lecture.nonEvaluees.length === 0 && (
              <p className="mt-4 text-sm text-muted-foreground">
                {lecture.nonIndiquees === 0
                  ? 'Aucune ligne d’indication n’est en service.'
                  : `Les ${lecture.nonIndiquees} indications en service ont été évaluées ; aucune n’est retenue sur ce dossier.`}
              </p>
            )}

            {lecture.indiquees.length > 0 && (
              <ul className="mt-4 grid gap-3">
                {lecture.indiquees.map(assiette => (
                  <li
                    key={assiette.ligneId}
                    className="rounded-lg border border-border bg-background p-3"
                  >
                    <p className="text-sm font-semibold text-foreground">{assiette.libelle}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Ce qui l’indique : {assiette.motif}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {assiette.sourceProtocole ? `${assiette.sourceProtocole} · ` : ''}
                      {assiette.claims.join(' · ')}
                    </p>
                    {/* LE GESTE EST SUR LA LIGNE INDIQUÉE, ET NULLE PART
                        AILLEURS. Les assiettes NON ÉVALUÉES n'en reçoivent
                        aucun : une porte qu'on n'a pas pu regarder n'indique
                        rien, et lui offrir le même bouton ferait de « on ne
                        sait pas » un « c'est indiqué » (`DC-24`). */}
                    {onRetenirAssiette && (
                      <button
                        type="button"
                        // LE NOM ACCESSIBLE NOMME L'ASSIETTE, le texte visible
                        // reste court. Sans cela, une carte qui porte trois
                        // indications rend trois boutons de nom IDENTIQUE : à la
                        // synthèse vocale, le praticien entendrait trois fois la
                        // même chose sans savoir laquelle il retient.
                        aria-label={`Retenir « ${assiette.libelle} » pour le protocole`}
                        onClick={() => onRetenirAssiette({
                          plateCode: assiette.plateCode,
                          libelle: assiette.libelle,
                        })}
                        className="mt-2 min-h-11 rounded-lg border border-foreground px-3 py-2 text-xs font-medium"
                      >
                        Retenir pour le protocole
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {lecture.nonEvaluees.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-foreground">Non évaluées — ce qui manque</h4>
                <ul className="mt-2 grid gap-2">
                  {lecture.nonEvaluees.map(assiette => (
                    <li key={assiette.ligneId} className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{assiette.libelle}</span>
                      {' — '}
                      {assiette.lacunes.map(libelleLacune).join(' ; ')}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {lecture.corpusLu
              && lecture.nonIndiquees > 0
              && (lecture.indiquees.length > 0 || lecture.nonEvaluees.length > 0) && (
              <p className="mt-3 text-xs text-muted-foreground">
                {lecture.nonIndiquees} autre(s) indication(s) évaluée(s), non retenue(s) sur ce dossier.
              </p>
            )}

            <p className="mt-3 text-xs text-muted-foreground">
              Périmètre signé : {lecture.shaPerimetre.slice(0, 12)}…
            </p>

            {/* LA BIOLOGIE, SOUS LES INDICATIONS ET JAMAIS MÊLÉE À ELLES
                ([[D-245]]). Une section à part, avec sa propre lecture et son
                propre verrou : une assiette n'y devient jamais « indiquée ». */}
            <PortesBiologiquesSection idPatient={idPatient} />
          </>
        )}
      </div>
    </section>
  );
}
