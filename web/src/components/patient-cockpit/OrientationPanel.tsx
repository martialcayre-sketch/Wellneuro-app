'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { OrientationApiResponse } from '@/app/api/praticien/orientation/route';
import type { RecommandationServie } from '@/lib/clinical/orientationService';
import type {
  FileEnvoiApiResponse,
  MutateFileEnvoiResponse,
} from '@/app/api/praticien/file-envoi/route';
import type { EnvoyerFileResponse } from '@/app/api/praticien/file-envoi/envoyer/route';
import { CATALOGUE_DEFINITIONS } from '@/lib/bibliotheque';
import { MESSAGE_DEJA_ASSIGNE } from '@/lib/assignations/messages';
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

function libelleCible(recommandation: RecommandationServie): string {
  // Plus aucune règle publiée ne cible un pack (table du 2026-08-06) ; le TYPE
  // en admet toujours un, et cette ligne est ce qu'il en reste ici — l'identifiant
  // brut plutôt qu'un rendu inventé.
  if (recommandation.cible.type !== 'questionnaire') return recommandation.cible.packId;
  const definition = CATALOGUE_DEFINITIONS[recommandation.cible.questionnaireId];
  return definition?.titre ?? recommandation.cible.questionnaireId;
}

function cleCible(recommandation: RecommandationServie): string {
  return recommandation.cible.type === 'pack'
    ? `pack:${recommandation.cible.packId}`
    : `questionnaire:${recommandation.cible.questionnaireId}`;
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

  return (
    <section aria-label="Orientation des explorations" className="rounded-xl border border-border bg-surface p-4">
      <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
        Orientation · explorations proposées
      </p>
      <h3 className="mt-1 font-display text-base font-bold tracking-[-0.02em] text-foreground">
        Explorations proposées par la table NNPP2
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
        <p className="mt-2 text-xs text-muted-foreground">
          Aucune exploration complémentaire n’est proposée par la table en vigueur pour ce patient.
        </p>
      ) : reponse?.ok && reponse.actif === true ? (
        <>
          <ol className="mt-3 space-y-3">
            {reponse.recommandations.map(recommandation => {
              const cle = cleCible(recommandation);
              const estPack = recommandation.cible.type === 'pack';
              const qid = recommandation.cible.type === 'questionnaire'
                ? recommandation.cible.questionnaireId
                : null;
              const titre = libelleCible(recommandation);
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
                  </div>

                  {recommandation.objectifs.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Objectifs : {recommandation.objectifs.join(' · ')}
                    </p>
                  )}

                  <ul className="mt-2 space-y-1">
                    {recommandation.motifs.map(motif => (
                      <li key={motif.regleId} className="text-xs text-foreground">
                        <span className="text-muted-foreground">{motif.regleId} —</span>{' '}
                        {motif.conditions.join(' ; ')}
                        {motif.claims.length > 0 && (
                          <span className="text-muted-foreground">
                            {' '}
                            ({motif.claims.map(claim => claim.claimId).join(', ')})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>

                  {recommandation.extinction && (
                    <div className="mt-2 rounded-md bg-muted/50 p-2">
                      <p className="text-xs font-medium text-foreground">{LIBELLE_EXTINCTION}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        <span>{recommandation.extinction.stopRuleId} —</span>{' '}
                        {recommandation.extinction.motif}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {recommandation.extinction.conditions.join(' ; ')}
                        {recommandation.extinction.claims.length > 0 && (
                          <span>
                            {' '}
                            ({recommandation.extinction.claims.map(claim => claim.claimId).join(', ')})
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  {ajoutable && dejaCouvert && (
                    // Le texte vient de la route d'assignation, il n'est pas
                    // réécrit ici : deux formulations du même refus
                    // divergeraient, et c'est l'écran qui mentirait.
                    <p className="mt-2 text-xs text-muted-foreground" role="status">
                      {MESSAGE_DEJA_ASSIGNE}
                    </p>
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
                </li>
              );
            })}
          </ol>
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
            Table {reponse.version} · SHA-256 {reponse.sha256}. Aucune assignation n’est automatique : la
            proposition est une lecture, le geste reste praticien.
          </p>
        </>
      ) : null}
    </section>
  );
}
