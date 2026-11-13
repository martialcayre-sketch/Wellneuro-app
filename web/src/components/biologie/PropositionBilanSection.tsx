'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useCbEnabled, useCbResultsEnabled } from '@/components/patient-cockpit/CbFeatureProvider';
import {
  PropositionBilanPanel,
  type CourrierEtabli,
  type DocumentPatientEtabli,
  type DocumentPatientConsigneAffiche,
  type DocumenteAffiche,
  type LectureDocumentsPatient,
  type PropositionState,
} from '@/components/patient-cockpit/PropositionBilanPanel';
import {
  ajouterConfirmation,
  type ConfirmationsDocument,
} from '@/lib/biology-library/confirmationsDocument';
import type { LimiteProposition } from '@/lib/biology-library/propositionService';
import type { LignePanelProposition } from '@/lib/biology-library/statuts';

// LA PROPOSITION DE BILAN DANS L'ONGLET « BIOLOGIE » ([[D-308]] §1 amendée
// par [[D-319]], plan F57, PR 2). Elle vivait sous la phase « Actions » du
// protocole ; elle n'en dépendait que par le moment de sa lecture (la carte de
// décision prête). Ses états et ses gestes sont repris ICI À L'IDENTIQUE —
// déclaration d'un panel documenté, courrier au médecin, document patient et
// liste des remises — sans rien changer de ce que les routes reçoivent.
//
// UNE LECTURE AU MONTAGE, et le montage suit l'OUVERTURE de l'onglet : la fiche
// ne monte cette section qu'une fois l'onglet visité, puis la garde montée
// (même règle que « Correspondance ») — le destinataire du courrier, le
// courrier établi et le refus à trancher du document patient survivent à un
// changement d'onglet (revue wn-reviewer B2 du lot d'origine). Le GET de la
// proposition et celui des remises journalisent l'accès (`G-TRUST-04`) : ils ne
// partent que là où ce qu'ils rapportent s'affiche.
//
// Dans le domaine biologie (`components/biologie/`) : ses imports de
// `biology-library` ne passent pas la frontière de [[D-306]].

export function PropositionBilanSection({
  idPatient,
  onDeclaration,
}: {
  idPatient: string;
  /** Une déclaration a abouti : la phase Actions relit ses dérivés (voir `ClinicalRuntimeSection`). */
  onDeclaration?: () => void;
}) {
  const cbEnabled = useCbEnabled();
  const cbResultatsActifs = useCbResultsEnabled();
  // `propositionDisponible` reste faux tant que la route n'a pas répondu `ok` :
  // c'est LUI qui porte le drapeau `WN_CB_PROPOSITION`, sans second
  // FeatureProvider — un 503 laisse simplement le panneau absent.
  const [propositionDisponible, setPropositionDisponible] = useState(false);
  /**
   * La lecture de la proposition a ÉCHOUÉ autrement que par l'étage fermé
   * (T-65, [[D-488]] ; Q12 a de PRA-3b) : le panneau ne disparaît plus en
   * silence, il le dit.
   */
  const [echecProposition, setEchecProposition] = useState(false);
  const [relectureProposition, setRelectureProposition] = useState(false);
  const [propositionLignes, setPropositionLignes] = useState<LignePanelProposition[]>([]);
  const [propositionLimites, setPropositionLimites] = useState<LimiteProposition[]>([]);
  const [propositionDocumentes, setPropositionDocumentes] = useState<DocumenteAffiche[]>([]);
  const [propositionMotif, setPropositionMotif] = useState<string | null>(null);
  const [propositionState, setPropositionState] = useState<PropositionState>('idle');
  const [propositionError, setPropositionError] = useState<string | null>(null);
  const [courrier, setCourrier] = useState<CourrierEtabli | null>(null);
  const [courrierErreur, setCourrierErreur] = useState<string | null>(null);
  const [documentPatient, setDocumentPatient] = useState<DocumentPatientEtabli | null>(null);
  // UN SEUL état de refus (raison + message + empreinte du texte refusé) : trois
  // useState synchronisés à la main se désynchronisent à la première branche
  // oubliée. `registreATrancher` et l'empreinte à confirmer s'en dérivent.
  const [documentPatientRefus, setDocumentPatientRefus] = useState<{
    reason?: string;
    error: string;
    texteSha256?: string;
  } | null>(null);
  // Compteur de réponses ABOUTIES : le verrou du formulaire se lève sur son
  // incrément — une référence fraîche par réponse, là où un même message
  // d'erreur répété ne changerait pas.
  const [documentPatientReponses, setDocumentPatientReponses] = useState(0);
  // Ce qui a DÉJÀ été remis, relu en base : c'est ce qui survit au
  // rechargement, là où l'état de session ci-dessus repart à zéro.
  const [documentsPatientConsignes, setDocumentsPatientConsignes] = useState<
    DocumentPatientConsigneAffiche[]
  >([]);
  const [lectureDocumentsPatient, setLectureDocumentsPatient] =
    useState<LectureDocumentsPatient>('chargement');
  // Les confirmations s'ACCUMULENT, chacune liée à l'empreinte du texte
  // qu'elle vise. Un texte peut être refusé deux fois de suite pour deux
  // motifs (registre puis doublon) : n'envoyer que la dernière ferait
  // re-refuser la première, et le geste tournerait en rond. Une empreinte
  // rassie ne correspond plus au texte re-dérivé : le serveur re-refuse, ce
  // qui est exactement le comportement voulu.
  const [confirmationsDocument, setConfirmationsDocument] = useState<ConfirmationsDocument>({});
  const [partageMedecin, setPartageMedecin] = useState<string | null>(null);

  // Les remises déjà consignées. Ce GET journalise un accès au dossier (GD-1) :
  // il est chaîné au RENDU du panneau (les deux branches qui posent
  // `propositionDisponible`), pas à l'offre du geste d'établir — la relecture
  // s'affiche même quand plus aucune ligne n'est proposée.
  const chargerDocumentsPatient = useCallback(async () => {
    if (!cbEnabled) return;
    setLectureDocumentsPatient('chargement');
    try {
      const response = await fetch(
        `/api/praticien/biologie/proposition/document-patient?idPatient=${encodeURIComponent(idPatient)}`,
      );
      const payload = (await response.json()) as {
        ok?: boolean;
        documents?: DocumentPatientConsigneAffiche[];
      };
      if (!response.ok || !payload.ok) {
        // Un 503 (étage fermé) comme une panne : dans les deux cas l'écran ne
        // SAIT pas ce qui a été remis, et ne doit pas l'affirmer (`DC-24`).
        setLectureDocumentsPatient('erreur');
        return;
      }
      setDocumentsPatientConsignes(payload.documents ?? []);
      setLectureDocumentsPatient('ok');
    } catch {
      setLectureDocumentsPatient('erreur');
    }
  }, [idPatient, cbEnabled]);

  // Le drapeau `WN_CB_PROPOSITION` est lu côté serveur seulement. LE CLIENT
  // LIT LE MOTIF, JAMAIS LE CODE SEUL (Q12 a) : seul le garde de drapeau rend
  // 503, et il porte `cb_proposition_desactivee` — l'étage fermé, panneau
  // absent comme avant. Toute autre réponse (503 sans ce motif — redémarrage,
  // délai du routeur —, 500, refus, réseau) est un échec de lecture : T-65.
  //
  // Jeton d'obsolescence : seule la DERNIÈRE lecture écrit l'échec.
  const seqProposition = useRef(0);
  const loadProposition = useCallback(async (): Promise<boolean> => {
    if (!cbEnabled) return false;
    const seq = ++seqProposition.current;
    const aJour = () => seq === seqProposition.current;
    try {
      const response = await fetch(
        `/api/praticien/biologie/proposition?idPatient=${encodeURIComponent(idPatient)}`,
      );
      const payload = (await response.json()) as {
        ok: boolean;
        reason?: string;
        error?: string;
        lignes?: LignePanelProposition[];
        limites?: LimiteProposition[];
        documentes?: DocumenteAffiche[];
        partageMedecinTraitant?: string | null;
      };
      // Le moteur qui s'abstient (409) N'EST PAS une indisponibilité : son
      // motif est écrit pour le praticien et doit s'afficher tel quel — une
      // abstention expliquée vaut mieux qu'un panneau vide (`DC-34`).
      if (!aJour()) return false;
      if (response.status === 409 && payload.error) {
        setEchecProposition(false);
        setPropositionDisponible(true);
        setPropositionMotif(payload.error);
        setPropositionLignes([]);
        setPropositionLimites([]);
        // Les déclarations déjà consignées NE sont PAS effacées de l'écran :
        // l'abstention porte sur la dérivation, pas sur ce que le praticien a
        // déclaré. Les vider ferait disparaître un fait du dossier.
        //
        // Le panneau est rendu, donc la liste des remises l'est aussi : elle a
        // lieu d'être lue. Ce que le moteur ne sait plus dériver aujourd'hui
        // ne retire rien à ce qui a été remis hier.
        void chargerDocumentsPatient();
        return true;
      }
      if (!response.ok || !payload.ok) {
        setPropositionDisponible(false);
        const etageFerme = response.status === 503 && payload.reason === 'cb_proposition_desactivee';
        setEchecProposition(!etageFerme);
        return etageFerme;
      }
      setEchecProposition(false);
      setPropositionDisponible(true);
      setPropositionMotif(null);
      setPropositionLignes(payload.lignes ?? []);
      setPropositionLimites(payload.limites ?? []);
      setPropositionDocumentes(payload.documentes ?? []);
      setPartageMedecin(payload.partageMedecinTraitant ?? null);
      // La proposition vient de changer : le document patient affiché et le
      // refus en attente (empreinte comprise) visaient l'ANCIENNE dérivation.
      // Les garder montrerait une pièce rassie à imprimer, et armerait une
      // confirmation contre un texte disparu — le point unique où « la
      // proposition a changé » est su, c'est ici.
      setDocumentPatient(null);
      setDocumentPatientRefus(null);
      setConfirmationsDocument({});
      setDocumentPatientReponses(n => n + 1);
      // Le panneau est rendu : la liste des remises l'est aussi, donc elle a
      // lieu d'être lue. Le GET journalise — il ne part que là où ce qu'il
      // rapporte sera affiché.
      void chargerDocumentsPatient();
      return true;
    } catch {
      // La proposition est rechargeable : un échec de lecture ne bloque pas la
      // fiche — mais il se dit (T-65).
      if (!aJour()) return false;
      setPropositionDisponible(false);
      setEchecProposition(true);
      return false;
    }
  }, [idPatient, cbEnabled, chargerDocumentsPatient]);

  // « Réessayer » (T-17) : relit la seule proposition, bouton désactivé en vol,
  // puis rend le focus — au panneau relu, ou au bouton si l'échec persiste.
  const reessayerRef = useRef<HTMLButtonElement>(null);
  // La cible du focus est mémorisée, et posée par un effet une fois la
  // relecture finie ET rendue : avant, le bouton est encore désactivé, ou
  // c'est le titre de la section d'échec, pas celui du panneau relu (revue
  // PR-Agent de #2071).
  const [focusApres, setFocusApres] = useState<'titre' | 'reessayer' | null>(null);
  useEffect(() => {
    if (focusApres === null || relectureProposition) return;
    if (focusApres === 'titre') document.getElementById('proposition-bilan-title')?.focus();
    else reessayerRef.current?.focus();
    setFocusApres(null);
  }, [focusApres, relectureProposition, propositionDisponible, echecProposition]);
  const relireProposition = useCallback(async () => {
    setRelectureProposition(true);
    let lue = false;
    try {
      lue = await loadProposition();
    } finally {
      setRelectureProposition(false);
      setFocusApres(lue ? 'titre' : 'reessayer');
    }
  }, [loadProposition]);

  // UNE lecture par montage, et par dossier : `loadProposition` ne change
  // d'identité qu'avec `idPatient` ou le drapeau CB.
  useEffect(() => {
    void loadProposition();
  }, [loadProposition]);

  const declarerPanelDocumente = useCallback(
    async (panelCode: string, documenteLe: string) => {
      setPropositionState('saving');
      setPropositionError(null);
      try {
        const response = await fetch('/api/praticien/biologie/proposition', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idPatient, panelCode, documenteLe }),
        });
        const payload = (await response.json()) as { ok: boolean; error?: string };
        if (!response.ok || !payload.ok) {
          setPropositionState('error');
          setPropositionError(payload.error ?? 'Échec de l’enregistrement de la déclaration.');
          return;
        }
        // Relire plutôt que patcher l'état : la déclaration change les statuts
        // dérivés du panel, et c'est le moteur qui les décide, pas l'écran.
        await loadProposition();
        setPropositionState('saved');
        onDeclaration?.();
      } catch {
        setPropositionState('error');
        setPropositionError('Échec de l’enregistrement de la déclaration.');
      }
    },
    [idPatient, loadProposition, onDeclaration],
  );

  // Courrier médecin : le texte est GÉNÉRÉ ET CONSIGNÉ côté serveur ; l'écran
  // ne fournit que le nom du destinataire et n'affiche que ce qui revient.
  const etablirCourrier = useCallback(
    async (medecinLibelle: string) => {
      setPropositionState('saving');
      setCourrierErreur(null);
      try {
        const response = await fetch('/api/praticien/biologie/proposition/courrier', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idPatient, medecinLibelle }),
        });
        const payload = (await response.json()) as {
          ok: boolean;
          error?: string;
          texte?: string;
          html?: string;
          ancrageSha256?: string;
          ancrageVersion?: string;
        };
        setPropositionState('idle');
        if (!response.ok || !payload.ok || !payload.texte) {
          setCourrier(null);
          setCourrierErreur(payload.error ?? 'Le courrier n’a pas pu être établi.');
          return;
        }
        setCourrier({
          texte: payload.texte,
          // Le rendu imprimable est SERVI, jamais recomposé : absent, l'écran
          // n'offre pas d'impression et retombe sur la transcription, plutôt
          // que d'imprimer une lettre qu'aucune garde n'a lue.
          html: payload.html ?? '',
          ancrageSha256: payload.ancrageSha256 ?? '',
          ancrageVersion: payload.ancrageVersion ?? '',
        });
      } catch {
        setPropositionState('idle');
        setCourrier(null);
        setCourrierErreur('Le courrier n’a pas pu être établi.');
      }
    },
    [idPatient],
  );

  // Document patient (décision F, D-122) : généré et consigné côté serveur.
  // Le refus REGISTRE_ANXIOGENE est CONFIRMABLE (D-090), et la confirmation
  // est LIÉE AU TEXTE refusé : le 409 rend l'empreinte du texte jugé, le
  // second clic la renvoie — un dossier qui a bougé entre-temps re-refuse au
  // lieu de consigner un texte que personne n'a lu. Aucun état de refus n'est
  // effacé au départ du POST : il ne change qu'à l'arrivée d'une réponse
  // (sinon le verrou du formulaire se lèverait en plein vol).
  const etablirDocumentPatient = useCallback(
    async (confirmer: boolean) => {
      setPropositionState('saving');
      // Confirmer, c'est AJOUTER un jeton à ceux déjà tranchés, pas remplacer :
      // le motif du refus courant dit lequel. La règle vit dans un module pur,
      // gardée par ses bancs — pas enfouie ici.
      const confirmations = confirmer
        ? ajouterConfirmation(confirmationsDocument, documentPatientRefus)
        : confirmationsDocument;
      if (confirmations !== confirmationsDocument) setConfirmationsDocument(confirmations);
      try {
        const response = await fetch('/api/praticien/biologie/proposition/document-patient', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idPatient,
            confirmerTexteSha256: confirmations.registre,
            confirmerDoublonSha256: confirmations.doublon,
          }),
        });
        const payload = (await response.json()) as {
          ok: boolean;
          reason?: string;
          error?: string;
          texteSha256?: string;
          texte?: string;
          ancrageSha256?: string;
          ancrageVersion?: string;
        };
        setPropositionState('idle');
        if (!response.ok || !payload.ok || !payload.texte) {
          setDocumentPatient(null);
          setDocumentPatientRefus({
            reason: payload.reason,
            error: payload.error ?? 'Le document n’a pas pu être établi.',
            texteSha256: payload.texteSha256,
          });
          return;
        }
        setDocumentPatientRefus(null);
        setDocumentPatient({
          texte: payload.texte,
          ancrageSha256: payload.ancrageSha256 ?? '',
          ancrageVersion: payload.ancrageVersion ?? '',
        });
        // La pièce vient d'entrer au dossier : la liste des remises la montre
        // sans attendre un rechargement de page.
        void chargerDocumentsPatient();
      } catch {
        // Panne réseau : le CONTEXTE du refus précédent est conservé (raison,
        // empreinte) — perdre le second temps sur une saute de connexion
        // forcerait un POST non confirmant de plus, donc un accès journalisé
        // de plus, pour retrouver un bouton qui n'aurait jamais dû partir.
        setPropositionState('idle');
        setDocumentPatient(null);
        setDocumentPatientRefus(prev => ({
          ...(prev ?? {}),
          error: 'Le document n’a pas pu être établi. Vérifiez la connexion et réessayez.',
        }));
      } finally {
        setDocumentPatientReponses(n => n + 1);
      }
    },
    [idPatient, documentPatientRefus, confirmationsDocument, chargerDocumentsPatient],
  );

  if (!propositionDisponible) {
    if (!cbEnabled || !echecProposition) return null;
    return (
      <section
        aria-labelledby="proposition-bilan-title"
        aria-busy={relectureProposition || undefined}
        className="rounded-xl border border-border bg-surface p-4"
      >
        <h3 id="proposition-bilan-title" className="font-display text-base font-semibold text-foreground">
          Biologie — proposition de bilan
        </h3>
        <div role="alert" className="mt-3 flex flex-col gap-3 rounded-lg bg-status-warning/10 p-3 text-base text-status-warning">
          <span>La proposition de bilan n’a pas pu être lue. Ce n’est pas une absence de proposition.</span>
          <button
            ref={reessayerRef}
            type="button"
            onClick={() => void relireProposition()}
            disabled={relectureProposition}
            className="min-h-11 self-start rounded-lg border border-accent px-3 py-1 text-sm font-medium text-solar-ink hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-50"
          >
            Réessayer
          </button>
        </div>
      </section>
    );
  }
  return (
    <PropositionBilanPanel
      lignes={propositionLignes}
      limites={propositionLimites}
      documentes={propositionDocumentes}
      motifIndisponible={propositionMotif}
      state={propositionState}
      error={propositionError}
      onDeclarer={declarerPanelDocumente}
      onNouvelleSaisie={() => setPropositionState('idle')}
      courrier={courrier}
      courrierErreur={courrierErreur}
      partageMedecinTraitant={partageMedecin}
      onEtablirCourrier={etablirCourrier}
      documentPatient={documentPatient}
      documentPatientErreur={documentPatientRefus?.error ?? null}
      documentPatientRegistreATrancher={
        documentPatientRefus?.reason === 'REGISTRE_ANXIOGENE'
        && documentPatientRefus.texteSha256 !== undefined
      }
      documentPatientDoublonATrancher={
        documentPatientRefus?.reason === 'DOUBLON_DOCUMENT'
        && documentPatientRefus.texteSha256 !== undefined
      }
      documentsPatientConsignes={documentsPatientConsignes}
      lectureDocumentsPatient={lectureDocumentsPatient}
      documentPatientReponses={documentPatientReponses}
      onEtablirDocumentPatient={etablirDocumentPatient}
      onRelireDocumentsPatient={chargerDocumentsPatient}
      resultatsActifs={cbResultatsActifs}
    />
  );
}
