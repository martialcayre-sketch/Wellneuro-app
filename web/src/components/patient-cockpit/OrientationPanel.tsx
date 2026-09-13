'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { OrientationApiResponse } from '@/app/api/praticien/orientation/route';
import type { EcartementPropositionResponse } from '@/app/api/praticien/orientation/ecartement/route';
import type { PropositionEcartee, RecommandationServie } from '@/lib/clinical/orientationService';
import { cleCibleEcartement, motifRecevable, MOTIF_LONGUEUR_MAX } from '@/lib/orientation/ecartements';
import type { CibleExploration } from '@/lib/clinical/orientationEngine';
import type {
  FileEnvoiApiResponse,
  MutateFileEnvoiResponse,
} from '@/app/api/praticien/file-envoi/route';
import type { EnvoyerFileResponse } from '@/app/api/praticien/file-envoi/envoyer/route';
import { CATALOGUE_DEFINITIONS } from '@/lib/bibliotheque';
import { MESSAGE_DEJA_ASSIGNE } from '@/lib/assignations/messages';
import { anciennete } from '@/lib/assignations/peremption';
import { LIBELLE_EXTINCTION } from '@/lib/clinical/stopRulesLibelles';
import { Badge } from '@/components/ui/Badge';

// Orientation NNPP2 — le premier consommateur de `/api/praticien/orientation`
// (LOT-06). LECTURE SEULE, à une exception près et strictement bornée : le
// bouton d'ajout à la file d'envoi, qui rejoue le geste manuel de la
// Bibliothèque (`POST /api/praticien/file-envoi`). Rien n'est jamais assigné
// par l'affichage.
//
// LE GESTE A CHANGÉ LE 2026-08-06 (LOT-02, D-030), et le changement est plus
// grand qu'un renommage de bouton. Avant : « Assigner ce pack » appelait
// `POST /api/praticien/packs/assign`, qui CRÉAIT des assignations et envoyait
// un e-mail au patient — d'où la confirmation en deux temps qui l'entourait.
// Maintenant : « Ajouter à la file d'envoi » pose l'instrument dans un
// brouillon, et RIEN NE PART tant que le praticien n'a pas validé l'envoi
// depuis la Bibliothèque. Un geste qui n'a pas d'effet sortant n'a pas besoin
// d'être confirmé deux fois : le double temps a donc été retiré avec ce qu'il
// protégeait.
//
// Ce que ce panneau ne fait PAS, et qui est le cœur de la gouvernance : il ne
// calcule aucune recommandation, n'en réordonne aucune, n'en complète aucune.
// L'ordre servi par la route est déjà calculé et signifiant (priorité
// croissante, puis nombre de motifs, puis clé de cible) — le rendre dans un
// autre ordre détruirait une information. Le `sha256` affiché avec la liste est
// ce qui permet, six mois plus tard, de dire quelle table a produit quoi.

const LABEL_NIVEAU: Record<RecommandationServie['niveau'], string> = {
  socle: 'socle',
  approfondissement: 'approfondissement',
  specialise: 'spécialisé',
};

function libelleCible(cible: CibleExploration): string {
  // Plus aucune règle publiée ne cible un pack (table du 2026-08-06) ; le TYPE
  // en admet toujours un, et cette ligne est ce qu'il en reste ici — l'identifiant
  // brut plutôt qu'un rendu inventé.
  if (cible.type !== 'questionnaire') return cible.packId;
  const definition = CATALOGUE_DEFINITIONS[cible.questionnaireId];
  return definition?.titre ?? cible.questionnaireId;
}

/** Date lisible d'un horodatage ISO — jamais l'heure : le geste se situe au jour. */
function jourLisible(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR');
}

export function OrientationPanel({
  idPatient,
  emailPatient,
}: {
  idPatient: string;
  /**
   * Sans email, aucun bouton d'ajout n'est rendu.
   *
   * `POST /api/praticien/file-envoi` identifie le patient par son email, pas
   * par son identifiant — c'est le contrat existant, et ce lot ne le modifie
   * pas. Un appelant qui ne fournit pas l'email obtient donc un panneau de
   * lecture seule, jamais un bouton qui échouerait au clic.
   */
  emailPatient?: string;
}) {
  const [lecture, setLecture] = useState<'chargement' | 'chargee' | 'erreur'>('chargement');
  const [reponse, setReponse] = useState<OrientationApiResponse | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  // File d'envoi : la cible dont l'ajout est en cours, puis l'issue affichée.
  const [ajoutEnCours, setAjoutEnCours] = useState<string | null>(null);
  const [issue, setIssue] = useState<{ cle: string; succes: boolean; message: string } | null>(null);
  // Questionnaires DÉJÀ au brouillon du patient affiché, lus au montage puis
  // relus après chaque ajout. La réponse du POST ne le dit pas : la route
  // déduplique en silence et son `count` est la taille TOTALE du brouillon,
  // jamais le nombre d'ajouts. « Déjà dans la file » ne peut donc venir que
  // d'une lecture, pas d'une écriture.
  const [dansLaFile, setDansLaFile] = useState<ReadonlySet<string>>(new Set());
  // Le brouillon du patient affiché (identifiant + taille), pour le bouton
  // d'envoi sous la liste (demande propriétaire 2026-08-09) : le même geste
  // que la Bibliothèque, sans navigation. Le clic EST la validation — la
  // doctrine D-030 « rien ne part sans validation » change d'écran, pas de
  // nature.
  const [brouillonPatient, setBrouillonPatient] = useState<{ idBrouillon: string; nb: number } | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [issueEnvoi, setIssueEnvoi] = useState<{ succes: boolean; message: string } | null>(null);

  // ÉCARTEMENT PRATICIEN — [[D-178]]. UN SEUL formulaire ouvert à la fois, et
  // c'est un choix : le motif écrit est la décision, et on n'en rédige pas
  // quatre en parallèle. Le formulaire ne se ferme que sur un succès — un refus
  // du serveur laisse le texte saisi en place, sinon le praticien le réécrirait.
  const [formulaire, setFormulaire] = useState<{ cle: string; action: 'ecarter' | 'reprendre' } | null>(null);
  const [motifGeste, setMotifGeste] = useState('');
  const [gesteEnCours, setGesteEnCours] = useState(false);
  const [issueGeste, setIssueGeste] = useState<{ cle: string; succes: boolean; message: string } | null>(null);

  const [rechargement, setRechargement] = useState(0);
  const relire = useCallback(() => setRechargement(n => n + 1), []);

  /**
   * Relit la file du praticien et n'en garde que le patient affiché.
   *
   * `estObsolete` EST LA PIÈCE CRITIQUE, et son absence était un vrai défaut
   * (revue du 2026-08-06). `idPatient` est capturé dans la clôture : le filtre
   * est donc toujours correct POUR LA REQUÊTE QUI L'A LANCÉ. Mais rien
   * n'empêchait une réponse lente du patient A d'arriver APRÈS le passage à B
   * et d'écraser l'état de B avec la file de A — le résultat était juste, il
   * s'appliquait au mauvais écran. Le drapeau vient de l'appelant, qui seul
   * sait si son tour est encore d'actualité.
   */
  // La valeur COURANTE du patient affiché, lisible depuis un callback créé
  // pour un patient précédent : c'est elle qui périme une relecture en vol
  // (clic « Ajouter » puis navigation avant le retour du POST + GET).
  // Au démontage, la ref est vidée pour qu'une réponse lente déjà en vol
  // soit considérée obsolète et n'appelle plus `setDansLaFile`.
  const idPatientRef = useRef<string | null>(idPatient);
  idPatientRef.current = idPatient;
  useEffect(() => () => { idPatientRef.current = null; }, []);

  const chargerFile = useCallback(async (estObsolete: () => boolean = () => false) => {
    try {
      const res = await fetch('/api/praticien/file-envoi');
      const json = (await res.json()) as FileEnvoiApiResponse;
      // UNE FILE ILLISIBLE N'EST PAS UNE FILE VIDE — et la route ne le dit pas
      // en jetant : sur 401 comme sur 500, elle rend un JSON bien formé
      // `{brouillons: [], unavailable: true}`. Sans ce test, l'échec se lisait
      // comme « rien dans la file », donc comme un feu vert à réajouter ce qui
      // s'y trouve peut-être déjà. On garde ce qu'on savait.
      if (!res.ok || json?.unavailable) return;
      if (estObsolete()) return;
      const brouillons = Array.isArray(json?.brouillons) ? json.brouillons : [];
      // Filtré sur le patient AFFICHÉ : la route sert tous les brouillons du
      // praticien, et un questionnaire posé dans la file d'un autre patient ne
      // dit rien de celui-ci.
      const duPatient = brouillons.filter(brouillon => brouillon.idPatient === idPatient);
      const qids = duPatient.flatMap(brouillon => brouillon.items.map(item => item.id));
      setDansLaFile(new Set(qids));
      // « Un seul brouillon actif par patient et par praticien » — invariant
      // tenu sous verrou par la route d'écriture : le premier est LE brouillon.
      setBrouillonPatient(
        duPatient.length > 0 && duPatient[0].items.length > 0
          ? { idBrouillon: duPatient[0].idBrouillon, nb: duPatient[0].items.length }
          : null,
      );
    } catch {
      // Même raison : on ne fabrique pas une file vide à partir d'une panne.
    }
  }, [idPatient]);

  // L'état d'ajout appartient au PATIENT affiché, pas au composant. Les clés
  // (`questionnaire:Q_SOM_01`) ne le portent pas : sans cette remise à zéro,
  // une navigation d'un patient à l'autre sans démontage afficherait « déjà
  // dans la file » sous la recommandation d'un patient dont la file est vide.
  //
  // Effet séparé, sur `idPatient` SEUL : le relancer sur un « Réessayer »
  // effacerait l'issue que le praticien vient de lire.
  useEffect(() => {
    let annule = false;
    setDansLaFile(new Set());
    setBrouillonPatient(null);
    setIssue(null);
    setIssueEnvoi(null);
    // Le formulaire d'écartement appartient au DOSSIER affiché : un motif à
    // demi rédigé pour un patient ne doit pas suivre la navigation vers un
    // autre — il s'y enregistrerait sur la mauvaise proposition.
    setFormulaire(null);
    setMotifGeste('');
    setIssueGeste(null);
    void chargerFile(() => annule);
    return () => {
      annule = true;
    };
  }, [idPatient, chargerFile]);

  useEffect(() => {
    let annule = false;
    setLecture('chargement');
    setErreur(null);
    fetch(`/api/praticien/orientation?idPatient=${encodeURIComponent(idPatient)}`)
      .then(r => r.json())
      .then((payload: OrientationApiResponse) => {
        if (annule) return;
        // Une erreur de lecture n'est jamais rendue comme un état vide : les
        // deux disent des choses opposées au praticien. Une charge `ok: true`
        // malformée (`recommandations` absent) tombe ici plutôt que de jeter
        // pendant le rendu.
        if (!payload?.ok) {
          setReponse(null);
          setErreur(payload?.error ?? "L'orientation n'a pas pu être lue.");
          setLecture('erreur');
          return;
        }
        if (payload.actif === true && !Array.isArray(payload.recommandations)) {
          setReponse(null);
          setErreur("L'orientation n'a pas pu être lue (réponse inattendue).");
          setLecture('erreur');
          return;
        }
        setReponse(payload);
        setLecture('chargee');
      })
      .catch(() => {
        if (annule) return;
        setReponse(null);
        setErreur("L'orientation n'a pas pu être lue (erreur technique).");
        setLecture('erreur');
      });
    return () => {
      annule = true;
    };
  }, [idPatient, rechargement]);

  const ajouterALaFile = useCallback(
    async (cle: string, qid: string, titre: string) => {
      if (!emailPatient) return;
      setAjoutEnCours(cle);
      setIssue(null);
      try {
        const res = await fetch('/api/praticien/file-envoi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emailPatient, qids: [qid] }),
        });
        const payload = (await res.json()) as MutateFileEnvoiResponse;
        if (payload?.success) {
          // Le message ne cite AUCUN compte : `count` est la taille totale du
          // brouillon, et l'afficher comme un nombre d'ajouts mentirait dès le
          // deuxième instrument.
          setIssue({
            cle,
            succes: true,
            message: `« ${titre} » ajouté à la file — rien ne part sans votre validation.`,
          });
        } else {
          // DEUX FORMES, PARCE QUE CE SONT DEUX PHRASES DIFFÉRENTES. Quand la
          // route explique le refus, sa phrase se suffit (« Dossier clos. ») et
          // la coller derrière « pour : » produisait un charabia — le gabarit
          // attendait un titre, il recevait une phrase. Quand elle ne dit rien
          // (panne réseau, charge illisible), c'est nous qui nommons ce qui a
          // échoué, et là le titre est la bonne information.
          setIssue(payload?.error
            ? { cle, succes: false, message: `Ajout impossible : ${payload.error}` }
            : { cle, succes: false, message: `Ajout impossible pour « ${titre} ».` });
        }
      } catch {
        setIssue({ cle, succes: false, message: `Ajout impossible pour « ${titre} ».` });
      } finally {
        setAjoutEnCours(null);
        // Relecture systématique : c'est elle, et non la réponse du POST, qui
        // fait passer la ligne à « déjà dans la file ». Périmée par le même
        // drapeau que la relecture au montage : si le praticien a changé de
        // patient pendant le POST, le résultat ne s'applique pas à l'écran.
        await chargerFile(() => idPatientRef.current !== idPatient);
      }
    },
    [emailPatient, chargerFile, idPatient],
  );

  /**
   * Écarte une proposition, ou la reprend — [[D-178]].
   *
   * LE CORPS NE PORTE NI RÈGLE NI `supersedes`, et ce n'est pas une économie :
   * la route les calcule elle-même, et c'est ce qui rend le réveil fiable. Un
   * client qui figerait les règles pourrait empêcher une proposition de revenir
   * quand un autre axe clinique la motive — soit faire taire cet axe (`DC-30`).
   */
  const enregistrerGeste = useCallback(
    async (cle: string, action: 'ecarter' | 'reprendre', motif: string) => {
      if (gesteEnCours) return;
      setGesteEnCours(true);
      setIssueGeste(null);
      try {
        const res = await fetch('/api/praticien/orientation/ecartement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idPatient, cibleId: cle, action, motif }),
        });
        const payload = (await res.json()) as EcartementPropositionResponse;
        // PÉREMPTION — le même patron que les deux autres appels de ce fichier, et
        // son absence était un vrai défaut. Si le praticien a changé de dossier
        // pendant le POST, l'effet de changement a déjà remis le formulaire et
        // l'issue à zéro : écrire ici afficherait, sur le dossier B, un message
        // vert affirmant qu'une proposition vient d'être écartée — et renvoyant
        // vers un repli qui peut être absent. Le geste, lui, a bien été enregistré
        // sur le dossier A ; c'est l'écran qui n'est plus le bon.
        if (idPatientRef.current !== idPatient) return;
        if (payload?.ok) {
          setFormulaire(null);
          setMotifGeste('');
          setIssueGeste({
            cle,
            succes: true,
            message: action === 'ecarter'
              ? 'Proposition écartée — elle reste consultable dans le repli ci-dessous, avec votre motif.'
              : 'Proposition reprise — elle est de nouveau dans la liste.',
          });
          // C'est la RELECTURE qui déplace la ligne, jamais une déduction
          // locale : le serveur seul sait si la proposition est encore motivée,
          // et une ligne reprise peut revenir accompagnée d'un réveil.
          relire();
        } else {
          // La phrase du refus vient du serveur : lui seul distingue « déjà
          // écartée » de « plus proposée » ou d'un fil illisible, et réécrire
          // ces cas ici les ferait diverger.
          setIssueGeste({
            cle,
            succes: false,
            message: payload?.error ?? "Le geste n'a pas pu être enregistré.",
          });
        }
      } catch {
        // Même péremption : une panne réseau survenue après la navigation ne
        // s'annonce pas sur le dossier suivant.
        if (idPatientRef.current !== idPatient) return;
        setIssueGeste({ cle, succes: false, message: "Le geste n'a pas pu être enregistré (erreur technique)." });
      } finally {
        // NON gardé, à la différence des deux au-dessus : laisser `gesteEnCours`
        // à vrai désactiverait les boutons du dossier suivant.
        setGesteEnCours(false);
      }
    },
    [gesteEnCours, idPatient, relire],
  );

  const envoyerLaFile = useCallback(async () => {
    const brouillon = brouillonPatient;
    if (!brouillon || envoiEnCours) return;
    setEnvoiEnCours(true);
    setIssueEnvoi(null);
    try {
      const res = await fetch('/api/praticien/file-envoi/envoyer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idBrouillon: brouillon.idBrouillon }),
      });
      const payload = (await res.json()) as EnvoyerFileResponse;
      if (payload?.success) {
        const nb = payload.count ?? brouillon.nb;
        setIssueEnvoi({
          succes: true,
          message: `${nb} questionnaire${nb > 1 ? 's' : ''} envoyé${nb > 1 ? 's' : ''} — un seul mail au patient.`,
        });
        // Les lignes envoyées sont désormais ASSIGNÉES : c'est l'orientation
        // relue qui le dira (`dejaAssigne`), pas une déduction locale.
        relire();
      } else {
        // Le texte du refus vient de la route quand elle en donne un —
        // deux formulations du même refus divergeraient.
        setIssueEnvoi({
          succes: false,
          message: payload?.error ? `Envoi impossible : ${payload.error}` : 'Envoi impossible.',
        });
      }
    } catch {
      setIssueEnvoi({ succes: false, message: 'Envoi impossible.' });
    } finally {
      setEnvoiEnCours(false);
      await chargerFile(() => idPatientRef.current !== idPatient);
    }
  }, [brouillonPatient, envoiEnCours, chargerFile, idPatient, relire]);

  const ecartees: PropositionEcartee[] =
    reponse?.ok && reponse.actif === true && Array.isArray(reponse.ecartees) ? reponse.ecartees : [];

  /**
   * Le champ de motif, identique pour les deux gestes.
   *
   * Pas un `<form>`, et c'est délibéré : ce panneau est rendu dans la fiche
   * patient, et un formulaire imbriqué dans un autre est du HTML invalide dont
   * le comportement de soumission dépend du navigateur.
   */
  const champMotif = (cle: string, action: 'ecarter' | 'reprendre') => (
    <div className="mt-2 rounded-md border border-border bg-muted/40 p-2">
      <label htmlFor={`motif-${action}-${cle}`} className="block text-2xs font-medium text-foreground">
        {action === 'ecarter'
          ? 'Pourquoi écarter cette exploration ? (obligatoire)'
          : 'Pourquoi la reprendre ? (obligatoire)'}
      </label>
      <textarea
        id={`motif-${action}-${cle}`}
        rows={2}
        value={motifGeste}
        maxLength={MOTIF_LONGUEUR_MAX}
        onChange={event => setMotifGeste(event.target.value)}
        className="mt-1 w-full rounded-md border border-border bg-surface p-2 text-xs text-foreground"
      />
      <p className="mt-1 text-2xs text-muted-foreground">
        Votre motif, votre nom et la date sont enregistrés. Rien n’est effacé : l’exploration reste
        consultable, et revient d’elle-même si une autre règle la motive plus tard.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          // La même sévérité que la route et que la base : un motif fait
          // d'espaces ou de tabulations n'est pas un motif. Refuser ici évite
          // un aller-retour, mais ne remplace RIEN — le serveur revérifie.
          disabled={gesteEnCours || !motifRecevable(motifGeste)}
          onClick={() => void enregistrerGeste(cle, action, motifGeste)}
          className="rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground disabled:opacity-60"
        >
          {gesteEnCours
            ? 'Enregistrement...'
            : action === 'ecarter' ? 'Confirmer l’écartement' : 'Confirmer la reprise'}
        </button>
        <button
          type="button"
          disabled={gesteEnCours}
          onClick={() => { setFormulaire(null); setMotifGeste(''); setIssueGeste(null); }}
          className="rounded-md px-2 py-1 text-xs text-muted-foreground disabled:opacity-60"
        >
          Annuler
        </button>
      </div>
      {issueGeste && !issueGeste.succes && issueGeste.cle === cle && (
        // Le refus s'affiche DANS le formulaire, et le texte saisi y reste :
        // « déjà écartée », « plus proposée » ou fil illisible sont des refus
        // dont le praticien peut avoir à tenir compte avant de réécrire.
        <p role="alert" className="mt-1 text-xs text-status-danger">{issueGeste.message}</p>
      )}
    </div>
  );

  /**
   * Le repli des propositions écartées — [[D-178]], troisième arbitrage.
   *
   * LE GESTE DOIT DÉGAGER L'ÉCRAN, sinon il ne sert qu'à consigner ; mais rien
   * n'est effacé, et ce repli est ce qui l'atteste. Il est rendu aussi quand la
   * liste visible est vide : c'est même là qu'il compte le plus, puisque l'écran
   * dirait sinon « aucune exploration proposée » alors que la table en propose.
   */
  const blocEcartees = ecartees.length > 0 ? (
    <details className="mt-3 rounded-lg border border-border p-2">
      <summary className="cursor-pointer text-xs font-medium text-foreground">
        {`${ecartees.length} exploration${ecartees.length > 1 ? 's' : ''} écartée${ecartees.length > 1 ? 's' : ''}`}
      </summary>
      <ul className="mt-2 space-y-2">
        {ecartees.map(ecartee => {
          const cle = cleCibleEcartement(ecartee.cible);
          return (
            <li key={ecartee.ecartementId} className="rounded-md bg-muted/40 p-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-foreground">{libelleCible(ecartee.cible)}</span>
                <Badge variant="info">{ecartee.cible.type === 'pack' ? 'pack' : 'questionnaire'}</Badge>
                {/* DEUX FAITS DE NATURES DIFFÉRENTES, et le repli n'en montrait
                    qu'un. Une ligne peut être ÉTEINTE par la table d'arrêt ET
                    écartée par le praticien : écarter ne dé-qualifie pas, et
                    l'extinction est justement ce qui explique pourquoi
                    l'exploration avait cessé d'être proposée. Neutre, comme dans
                    la liste principale — jamais `success` : la peindre en vert
                    dirait que c'est un résultat normal. */}
                {ecartee.extinction && <Badge variant="neutral">exploration éteinte</Badge>}
              </div>
              <p className="mt-1 text-2xs text-muted-foreground">
                {`Écartée le ${jourLisible(ecartee.faitLe)} par ${ecartee.parEmail}`}
              </p>
              <p className="mt-1 text-xs text-foreground">{ecartee.motif}</p>
              {ecartee.extinction && (
                // MÊME PROVENANCE QUE DANS LA LISTE PRINCIPALE : conditions et repli
                // de traçabilité. Une première rédaction n'affichait que le libellé
                // et le motif — écarter ne dé-qualifie pas, mais cela dé-SOURÇAIT :
                // l'identifiant de règle d'arrêt et les claims sont ce qui permet,
                // six mois plus tard, d'expliquer une extinction contestée.
                <div className="mt-1 rounded-md bg-muted/60 p-2">
                  <p className="text-2xs font-medium text-foreground">{LIBELLE_EXTINCTION}</p>
                  <p className="mt-0.5 text-2xs text-muted-foreground">{ecartee.extinction.motif}</p>
                  <p className="mt-0.5 text-2xs text-muted-foreground">
                    {ecartee.extinction.conditions.join(' ; ')}
                  </p>
                  <details className="mt-0.5 text-2xs text-muted-foreground">
                    <summary className="cursor-pointer">Traçabilité</summary>
                    <span>
                      {ecartee.extinction.stopRuleId}
                      {ecartee.extinction.claims.length > 0 &&
                        ` (${ecartee.extinction.claims.map(claim => claim.claimId).join(', ')})`}
                    </span>
                  </details>
                </div>
              )}
              {formulaire?.cle === cle && formulaire.action === 'reprendre'
                ? champMotif(cle, 'reprendre')
                : (
                  <button
                    type="button"
                    disabled={gesteEnCours}
                    onClick={() => { setFormulaire({ cle, action: 'reprendre' }); setMotifGeste(''); setIssueGeste(null); }}
                    className="mt-2 rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground disabled:opacity-60"
                  >
                    Reprendre cette exploration
                  </button>
                )}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-2xs text-muted-foreground">
        Une exploration écartée revient d’elle-même si une autre indication la motive plus tard.
      </p>
    </details>
  ) : null;

  return (
    <section aria-label="Orientation des explorations" className="rounded-xl border border-border bg-surface p-4">
      <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
        Orientation · explorations proposées
      </p>
      {/* Langage métier à l'écran — « NNPP2 » est le codename interne de la
          table, sans signification pour un praticien (audit 2026-09-02,
          fuite dev). L'identité exacte de la table reste lisible dans le
          repli « Provenance de la table » en pied de section. */}
      <h3 className="mt-1 font-display text-base font-bold tracking-[-0.02em] text-foreground">
        Explorations complémentaires proposées
      </h3>

      {lecture === 'chargement' ? (
        <p role="status" className="mt-2 text-xs text-muted-foreground">
          Lecture de l’orientation...
        </p>
      ) : lecture === 'erreur' ? (
        <div role="alert" className="mt-2 rounded-lg bg-status-warning/10 p-3 text-xs text-status-warning">
          <p>{erreur}</p>
          <button
            type="button"
            onClick={relire}
            className="mt-2 rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground"
          >
            Réessayer
          </button>
        </div>
      ) : reponse?.ok && reponse.actif === false ? (
        // Verrou fermé : ce n'est ni une erreur ni un vide. Le message vient du
        // serveur — l'UI n'invente pas la raison pour laquelle la table se tait.
        <p className="mt-2 text-xs text-muted-foreground">{reponse.message}</p>
      ) : reponse?.ok && reponse.actif === true && reponse.recommandations.length === 0 ? (
        <>
          {/* DEUX PHRASES, PARCE QUE CE SONT DEUX FAITS DIFFÉRENTS. « Aucune
              exploration n'est proposée » serait FAUX quand la table en propose
              et que le praticien les a écartées : ce qui est vide, c'est la
              liste à traiter, pas la proposition ([[DC-24]] — une absence à
              l'écran ne doit pas se lire comme une absence de fait). */}
          <p className="mt-2 text-xs text-muted-foreground">
            {ecartees.length > 0
              ? 'Plus aucune exploration à examiner : celles que la table propose pour ce patient ont toutes été écartées.'
              : 'Aucune exploration complémentaire n’est proposée par la table en vigueur pour ce patient.'}
          </p>
          {issueGeste?.succes && (
            <p role="status" className="mt-2 text-xs text-status-success">{issueGeste.message}</p>
          )}
          {blocEcartees}
        </>
      ) : reponse?.ok && reponse.actif === true ? (
        <>
          <ol className="mt-3 space-y-3">
            {reponse.recommandations.map(recommandation => {
              // La clé vient du module d'écartement, et non plus d'une copie
              // locale : la route d'écartement et la base parlent cette
              // orthographe-là, et deux implémentations divergeraient sur la
              // cible même du geste. La chaîne produite est identique à celle
              // que ce panneau construisait — rien ne change pour la file.
              const cle = cleCibleEcartement(recommandation.cible);
              const estPack = recommandation.cible.type === 'pack';
              const qid = recommandation.cible.type === 'questionnaire'
                ? recommandation.cible.questionnaireId
                : null;
              const titre = libelleCible(recommandation.cible);
              // Deux conditions cumulatives, aucune supposée : une cible
              // questionnaire, et un email pour l'appeler. Sinon le bouton est
              // absent — jamais présent et voué à l'échec.
              const ajoutable = !estPack && qid !== null && Boolean(emailPatient);
              // Le questionnaire est déjà assigné au patient : le proposer une
              // seconde fois lui ferait repasser ce qu'il vient de passer. Le
              // bouton n'est pas simplement retiré — le remplacer par rien
              // laisserait croire à un défaut de droits.
              const dejaCouvert = recommandation.dejaAssigne === true;
              const dejaEnFile = qid !== null && dansLaFile.has(qid);
              const issueCible = issue?.cle === cle ? issue : null;

              return (
                <li key={cle} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{titre}</span>
                    <Badge variant="info">{estPack ? 'pack' : 'questionnaire'}</Badge>
                    <Badge>{LABEL_NIVEAU[recommandation.niveau]}</Badge>
                    {recommandation.dejaAssigne && <Badge variant="warning">déjà assigné</Badge>}
                    {recommandation.dejaRepondu === true && <Badge variant="success">déjà renseigné</Badge>}
                    {/* `null` = inconnu, et un fait inconnu ne doit pas se
                        présenter comme un fait négatif. */}
                    {recommandation.dejaRepondu === null && <Badge>couverture inconnue</Badge>}
                    {/* Une extinction n'efface pas la ligne : elle la qualifie.
                        Les motifs d'origine restent affichés dessous, et c'est
                        ce qui permet de relire POURQUOI l'exploration avait été
                        proposée avant de lire pourquoi elle ne l'est plus. */}
                    {/* NEUTRE, ET PAS `success` — relevé en revue. La consigne de synthèse
                        écrite par ce même lot interdit au modèle de lire une
                        extinction comme un résultat normal ou une absence de
                        trouble ; la peindre en vert à l'écran dirait le
                        contraire au praticien. */}
                    {recommandation.extinction && <Badge variant="neutral">exploration éteinte</Badge>}
                    {/* WARNING, et pas `info` : une ligne qui réapparaît après
                        avoir été écartée par écrit demande à être regardée. Sans
                        ce signal, sa réapparition se lirait comme un défaut de
                        l'écran, alors que c'est le comportement voulu. */}
                    {recommandation.reveil && <Badge variant="warning">revenue</Badge>}
                  </div>

                  {recommandation.objectifs.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Objectifs : {recommandation.objectifs.join(' · ')}
                    </p>
                  )}

                  {/* LA CONDITION CLINIQUE D'ABORD, LES IDENTIFIANTS EN REPLI
                      (audit 2026-09-02) : regleId et claimId sont de la
                      traçabilité, pas du langage praticien. Ils restent
                      ENTIERS dans le DOM (repli natif — les bancs d'ordre qui
                      lisent le textContent des items passent tels quels) ;
                      seule leur proéminence change. */}
                  <ul className="mt-2 space-y-1">
                    {recommandation.motifs.map(motif => (
                      <li key={motif.regleId} className="text-xs text-foreground">
                        {motif.conditions.join(' ; ')}
                        <details className="mt-0.5 text-2xs text-muted-foreground">
                          <summary className="cursor-pointer">Traçabilité</summary>
                          <span>
                            {motif.regleId}
                            {motif.claims.length > 0 &&
                              ` (${motif.claims.map(claim => claim.claimId).join(', ')})`}
                          </span>
                        </details>
                      </li>
                    ))}
                  </ul>

                  {recommandation.reveil && (
                    // LE RÉVEIL SE DIT, il ne se devine pas — [[D-178]]. Le
                    // praticien avait écarté cette ligne par écrit : elle ne
                    // peut pas revenir en silence. Ce qui la ramène est une
                    // indication NOUVELLE, et son identifiant reste en repli de
                    // traçabilité comme partout ailleurs dans ce panneau
                    // (audit 2026-09-02 : un `regleId` n'est pas du langage
                    // praticien).
                    <div className="mt-2 rounded-md bg-status-warning/10 p-2">
                      <p className="text-xs font-medium text-foreground">
                        Cette exploration revient : une nouvelle indication la motive.
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {/* PAS « vous l'aviez écartée » : le champ de réveil ne
                            porte pas l'auteur du geste, et l'attribuer au
                            lecteur serait une affirmation que rien ne soutient
                            — l'auteur reste nommé dans le repli des écartées. */}
                        {`Écartée le ${jourLisible(recommandation.reveil.ecarteLe)} : ${recommandation.reveil.motif}`}
                      </p>
                      <details className="mt-1 text-2xs text-muted-foreground">
                        <summary className="cursor-pointer">Traçabilité</summary>
                        <span>{recommandation.reveil.reglesNouvelles.join(', ')}</span>
                      </details>
                    </div>
                  )}

                  {recommandation.extinction && (
                    <div className="mt-2 rounded-md bg-muted/50 p-2">
                      <p className="text-xs font-medium text-foreground">{LIBELLE_EXTINCTION}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {recommandation.extinction.motif}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {recommandation.extinction.conditions.join(' ; ')}
                      </p>
                      <details className="mt-1 text-2xs text-muted-foreground">
                        <summary className="cursor-pointer">Traçabilité</summary>
                        <span>
                          {recommandation.extinction.stopRuleId}
                          {recommandation.extinction.claims.length > 0 &&
                            ` (${recommandation.extinction.claims.map(claim => claim.claimId).join(', ')})`}
                        </span>
                      </details>
                    </div>
                  )}

                  {ajoutable && dejaCouvert && (
                    // Le texte vient de la route d'assignation, il n'est pas
                    // réécrit ici : deux formulations du même refus
                    // divergeraient, et c'est l'écran qui mentirait.
                    //
                    // CE QUE CET ÉCRAN AJOUTE, ET QUE LA CONSTANTE NE PEUT PAS
                    // PORTER. La constante est rendue par cinq écrans, dont un
                    // seul — celui-ci — est sur la fiche qui porte le bouton
                    // d'annulation ; et la date de l'envoi qui bloque ne se
                    // connaît qu'au cas par cas. Les deux sont donc dits ici,
                    // par l'écran qui sait où il est et ce qu'il affiche. Le
                    // formatage de l'ancienneté est partagé avec la liste des
                    // envois de la fiche (`anciennete`) : deux formatages du même
                    // fait donneraient deux nombres sur la même page.
                    //
                    // La date reste ABSENTE sur un pack, et le refus s'affiche
                    // alors seul : un pack est dit couvert parce que tous ses
                    // membres le sont, à des dates qui peuvent différer.
                    <div className="mt-2" role="status">
                      <p className="text-xs text-muted-foreground">{MESSAGE_DEJA_ASSIGNE}</p>
                      {recommandation.dateAssignationOuverte && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {`Envoi ${anciennete(recommandation.dateAssignationOuverte)} — à annuler sur cette fiche, phase « Données fiables ».`}
                        </p>
                      )}
                    </div>
                  )}

                  {ajoutable && !dejaCouvert && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {dejaEnFile ? (
                        <span className="text-xs text-muted-foreground" role="status">
                          Déjà dans la file d’envoi — rien ne part sans votre validation.
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={ajoutEnCours === cle}
                          onClick={() => ajouterALaFile(cle, qid as string, titre)}
                          className="rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground disabled:opacity-60"
                        >
                          {ajoutEnCours === cle ? 'Ajout...' : 'Ajouter à la file d’envoi'}
                        </button>
                      )}
                      {issueCible && (
                        <span
                          className={`text-xs ${issueCible.succes ? 'text-status-success' : 'text-status-danger'}`}
                        >
                          {issueCible.message}
                        </span>
                      )}
                    </div>
                  )}

                  {/* ÉCARTER — disponible sur TOUTE ligne visible, pack compris,
                      et même déjà assignée : le geste porte sur la proposition,
                      pas sur l'envoi. Le conditionner à `ajoutable` en priverait
                      les lignes qu'on a justement le plus de raisons d'écarter.
                      La reprise, elle, vit dans le repli des écartées : c'est là
                      que la ligne se trouve après le geste. */}
                  {formulaire?.cle === cle && formulaire.action === 'ecarter' ? (
                    champMotif(cle, 'ecarter')
                  ) : (
                    <div className="mt-2">
                      <button
                        type="button"
                        disabled={gesteEnCours}
                        onClick={() => { setFormulaire({ cle, action: 'ecarter' }); setMotifGeste(''); setIssueGeste(null); }}
                        className="rounded-md px-2 py-1 text-xs text-muted-foreground underline decoration-dotted disabled:opacity-60"
                      >
                        Écarter cette exploration
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          {issueGeste?.succes && (
            // AU NIVEAU DU PANNEAU, et non dans la ligne : après un écartement
            // la ligne n'est plus là, et un message accroché à elle
            // disparaîtrait avec elle — le praticien ne saurait pas si son
            // geste a été enregistré.
            <p role="status" className="mt-2 text-xs text-status-success">{issueGeste.message}</p>
          )}
          {blocEcartees}
          {/* Le même bouton que la file de la Bibliothèque, sous les
              suggestions (demande propriétaire 2026-08-09) : il envoie TOUT le
              brouillon du patient — y compris d'éventuels items ajoutés depuis
              la Bibliothèque, le libellé porte donc le compte. Sans email, le
              panneau reste en lecture seule, envoi compris. */}
          {Boolean(emailPatient) && brouillonPatient && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <button
                type="button"
                disabled={envoiEnCours}
                onClick={() => void envoyerLaFile()}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground disabled:opacity-60"
              >
                {envoiEnCours
                  ? 'Envoi...'
                  : `Envoyer (${brouillonPatient.nb}) — un seul mail`}
              </button>
              <span className="text-2xs text-muted-foreground">
                Toute la file d’envoi de ce patient part d’un coup.
              </span>
            </div>
          )}
          {issueEnvoi && (
            <p
              role="status"
              className={`mt-2 text-xs ${issueEnvoi.succes ? 'text-status-success' : 'text-status-danger'}`}
            >
              {issueEnvoi.message}
            </p>
          )}
          <p className="mt-3 text-2xs text-muted-foreground">
            Aucune assignation n’est automatique : la proposition est une lecture, le geste reste praticien.
          </p>
          <details className="mt-1 text-2xs text-muted-foreground">
            <summary className="cursor-pointer">Provenance de la table</summary>
            <span>Table NNPP2 {reponse.version} · SHA-256 {reponse.sha256}</span>
          </details>
        </>
      ) : null}
    </section>
  );
}
