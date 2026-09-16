'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  CreatePatientResponse,
  PatchPatientResponse,
  PatientsApiResponse,
  PatientsPagination,
} from '@/app/api/praticien/patients/route';
import type { CycleDeVieAction, CycleDeVieResponse } from '@/app/api/praticien/patients/cycle-de-vie/route';
import type { CreateConsultationResponse } from '@/app/api/praticien/consultations/route';
import type { TokenActionResponse } from '@/app/api/praticien/token/route';
import { MOTIFS_CONSULTATION } from '@/lib/consultation/motifs';
import { erreurLisible } from '@/lib/praticien/messagesDossier';
import { PatientRow, type ActionDossier, type PatientRowData } from '@/components/ui/PatientRow';
import { DossierConfirmDialog, type ModeConfirmation } from '@/components/ui/DossierConfirmDialog';
import { Pagination } from '@/components/ui/Pagination';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { PanneauSuperpose } from '@/components/ui/PanneauSuperpose';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

type SortBy = 'nom' | 'email';

/**
 * `success: true` ne dit que l'écriture en base ; c'est `envoi` qui dit si
 * l'e-mail est parti. Les trois libellés d'envoi passent par ici, chacun
 * nommant ses trois cas en toutes lettres.
 *
 * Le type vient du DTO de route, jamais de `lib/consultation/email` : ce
 * module-là importe `nodemailer` via `transportSmtp`, et un import de valeur
 * l'embarquerait au bundle client. Passer par `CreateConsultationResponse`
 * (déjà importé) rend cette faute impossible plutôt que surveillée.
 *
 * `undefined` vaut « envoyé » : les routes posent désormais toujours le champ
 * sur un chemin d'envoi, et son absence ne doit rougir ni un envoi réussi ni
 * une action qui n'envoie rien.
 */
function libelleEnvoi(
  envoi: CreateConsultationResponse['envoi'],
  textes: { envoye: string; echoue: string; nonConfigure: string },
): string {
  return envoi === 'echoue' ? textes.echoue
    : envoi === 'non_configure' ? textes.nonConfigure
    : textes.envoye;
}

/** Vrai tant qu'aucun envoi n'est mort : sert la COULEUR de la ligne de statut. */
function envoiReussi(envoi: CreateConsultationResponse['envoi']): boolean {
  return envoi !== 'echoue' && envoi !== 'non_configure';
}

// Tiroir d'action (SP-TRAJ LOT-05) : les formulaires de création quittent
// l'empilement de cartes pour des tiroirs Radix ouverts depuis une barre
// d'actions — le tableau patients redevient le premier élément de la page.
// Ils étaient trois ; le troisième, « Nouvelle assignation », est parti au
// rayon assignations et packs de la Bibliothèque le 2026-09-16.
//
// Les formulaires sont DÉFINIS AU NIVEAU MODULE (jamais dans le rendu du
// panneau : une définition imbriquée les remonterait à chaque rendu et ferait
// perdre le focus de saisie). Le déclencheur vit dans le Root Radix : le
// focus revient dessus à la fermeture.

type EditPatientState = {
  idPatient: string;
  telephone: string;
  actif: 'OUI' | 'NON';
};

export function RayonPatientsPanel({ lienMagiqueActif = false }: { lienMagiqueActif?: boolean }) {
  const [data, setData] = useState<PatientsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  // Fin de parcours en attente de confirmation. Un seul dialogue pour tout le
  // tableau : dix lignes ne doivent pas produire dix dialogues dans le DOM.
  // `suite` ne concerne que le mode `retablissement` : ce dialogue-là ne porte
  // pas un geste à lui, il s'interpose devant un geste EN COURS. Sans ce champ,
  // la confirmation ne saurait pas lequel des deux reprendre.
  const [confirmation, setConfirmation] = useState<
    { mode: ModeConfirmation; patient: PatientRowData; suite?: 'resend' | 'consultation' } | null
  >(null);
  const [cycleEnCours, setCycleEnCours] = useState(false);
  // L'échec d'une action de fin de parcours se dit DANS le dialogue : Radix
  // pose un voile et `aria-hidden` sur le reste de la page, un message affiché
  // ailleurs serait invisible et muet pour un lecteur d'écran.
  const [erreurConfirmation, setErreurConfirmation] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('nom');
  const [page, setPage] = useState(1);
  const [tablePatients, setTablePatients] = useState<PatientsApiResponse['patients']>([]);
  const [pagination, setPagination] = useState<PatientsPagination | null>(null);
  const [loadingTable, setLoadingTable] = useState(true);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [editFeedback, setEditFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [editState, setEditState] = useState<EditPatientState | null>(null);
  const [form, setForm] = useState({ prenom: '', nom: '', email: '', telephone: '', dateNaissance: '' });
  // Consultation / accès portail patient.
  const [consultationForm, setConsultationForm] = useState({ idPatient: '', motif: '' });
  const [savingConsultation, setSavingConsultation] = useState(false);
  const [tokenAction, setTokenAction] = useState<'resend' | 'revoke' | 'copier' | 'lien_magique' | null>(null);
  const [consultationFeedback, setConsultationFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  // Tiroir d'action ouvert (LOT-05) — un seul à la fois.
  const [tiroirOuvert, setTiroirOuvert] = useState<'patient' | 'consultation' | null>(null);

  // Liste COMPLÈTE des dossiers, non paginée. Elle sert au sélecteur de
  // « Nouvelle consultation » et à la lecture d'`accesRevoque` avant d'ouvrir
  // le dialogue de rétablissement. Le TABLEAU, lui, est paginé au serveur
  // (`loadPatientsTable`), et c'est une autre lecture.
  //
  // LE PARAMÈTRE `statut` EST PARTI AVEC LES ASSIGNATIONS (2026-09-16) : il ne
  // filtrait qu'elles, et elles vivent désormais au rayon de la Bibliothèque.
  // La garde de fraîcheur qui l'accompagnait — jeter une réponse dont le statut
  // contredit le filtre courant — n'a plus d'objet ici : aucun geste de cet
  // écran ne relance cet appel avec des paramètres concurrents.
  const loadData = async () => {
    const r = await fetch('/api/praticien/patients');
    const json = (await r.json()) as PatientsApiResponse;
    setData(json);
  };

  // Pagination côté serveur (skip/take) : source de vérité pour le tableau
  // affiché. `data.patients` (chargé sans pagination par loadData) reste la
  // liste complète utilisée par le sélecteur « Nouvelle consultation ».
  const loadPatientsTable = useCallback(async (targetPage: number, currentSearch: string, currentSortBy: SortBy) => {
    setLoadingTable(true);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(PAGE_SIZE),
        sortBy: currentSortBy,
      });
      if (currentSearch.trim()) params.set('search', currentSearch.trim());
      const r = await fetch(`/api/praticien/patients?${params.toString()}`);
      const json = (await r.json()) as PatientsApiResponse;
      setTablePatients(json.patients ?? []);
      setPagination(json.pagination ?? null);
    } catch {
      setTablePatients([]);
      setPagination(null);
    } finally {
      setLoadingTable(false);
    }
  }, []);

  useEffect(() => {
    loadData()
      .catch(() => setData({ patients: [], assignations: [], unavailable: true, reason: 'exception' }))
      .finally(() => setLoading(false));
  }, []);

  // Recherche/tri changés : revient en page 1 et recharge (debounce sur la
  // recherche pour éviter une requête par frappe clavier). Ignoré au premier
  // rendu : le chargement initial est déjà couvert par l'effet [page].
  const isFirstSearchRender = useRef(true);
  useEffect(() => {
    if (isFirstSearchRender.current) {
      isFirstSearchRender.current = false;
      return;
    }
    const timeout = setTimeout(() => {
      setPage(1);
      loadPatientsTable(1, search, sortBy);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [search, sortBy, loadPatientsTable]);

  useEffect(() => {
    loadPatientsTable(page, search, sortBy);
  }, [page, search, sortBy, loadPatientsTable]);

  const refreshPatients = () => Promise.all([loadData(), loadPatientsTable(page, search, sortBy)]);

  const onCreatePatient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const r = await fetch('/api/praticien/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = (await r.json()) as CreatePatientResponse;
      if (!r.ok || !json.success) {
        setFeedback({ ok: false, msg: erreurLisible(json.reason, json.error) });
        return;
      }
      setFeedback({ ok: true, msg: `Patient ${form.prenom} ${form.nom} créé.` });
      setForm({ prenom: '', nom: '', email: '', telephone: '', dateNaissance: '' });
      await refreshPatients();
    } catch {
      setFeedback({ ok: false, msg: 'Erreur réseau. Réessayez.' });
    } finally {
      setSaving(false);
    }
  };

  // SCINDÉE EN DEUX : le geste du formulaire garde le dossier révoqué DEVANT le
  // dialogue, et `posterConsultation` porte l'appel — repris tel quel après
  // confirmation, sans que le praticien resaisisse quoi que ce soit.
  const posterConsultation = async (retablirAcces = false) => {
    setSavingConsultation(true);
    setConsultationFeedback(null);
    if (retablirAcces) setErreurConfirmation(null);
    try {
      const r = await fetch('/api/praticien/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idPatient: consultationForm.idPatient,
          motif: consultationForm.motif,
          ...(retablirAcces ? { retablirAcces: true } : {}),
        }),
      });
      const json = (await r.json()) as CreateConsultationResponse;
      if (!r.ok || !json.success) {
        const message = erreurLisible(json.reason, json.error);
        // Le refus se rend DANS le dialogue quand c'est lui qui a lancé
        // l'appel : derrière l'overlay, personne ne le lirait.
        if (retablirAcces) setErreurConfirmation(message);
        else setConsultationFeedback({ ok: false, msg: message });
        return;
      }
      // `ok: true` MAINTENU même sur envoi mort : la consultation EST créée, le
      // tiroir doit se fermer et le formulaire se réinitialiser. Un `ok: false`
      // laisserait le tiroir ouvert sur un dossier déjà créé — invitation à la
      // double soumission. C'est le TEXTE qui porte l'échec, et il dit quoi
      // faire, pour que le vert ne se lise pas comme un succès d'envoi.
      setConsultationFeedback({
        ok: true,
        msg: libelleEnvoi(json.envoi, {
          envoye: retablirAcces
            ? 'Accès rétabli, consultation créée et lien d’accès envoyé au patient.'
            : 'Consultation créée, lien d’accès envoyé au patient.',
          echoue: retablirAcces
            ? 'Accès rétabli et consultation créée, mais l’e-mail n’est pas parti. Renvoyez le lien depuis le menu du dossier.'
            : 'Consultation créée, mais l’e-mail n’est pas parti. Renvoyez le lien depuis le menu du dossier.',
          nonConfigure: retablirAcces
            ? 'Accès rétabli et consultation créée. Aucun e-mail n’est parti : la messagerie n’est pas configurée.'
            : 'Consultation créée. Aucun e-mail n’est parti : la messagerie n’est pas configurée.',
        }),
      });
      setConsultationForm({ idPatient: '', motif: '' });
      // Succès → le tiroir se ferme, la ligne de statut de la page l'annonce.
      setTiroirOuvert(null);
      if (retablirAcces) {
        setConfirmation(null);
        await refreshPatients();
      }
    } catch {
      if (retablirAcces) setErreurConfirmation('Erreur réseau. Réessayez.');
      else setConsultationFeedback({ ok: false, msg: 'Erreur réseau. Réessayez.' });
    } finally {
      setSavingConsultation(false);
    }
  };

  const onCreateConsultation = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const cible = (data?.patients ?? []).find(p => p.idPatient === consultationForm.idPatient);
    if (cible?.accesRevoque) {
      // Le chemin normal nettoie le retour précédent dans `posterConsultation` ;
      // celui-ci n'y passe pas. Sans cette ligne, un échec antérieur reste dans
      // la ligne de statut DERRIÈRE l'overlay Radix, et réapparaît à la
      // fermeture du dialogue comme s'il commentait le geste qu'on vient de faire.
      setConsultationFeedback(null);
      // LE TIROIR SE FERME AVANT LE DIALOGUE. Deux couches Radix superposées
      // empileraient overlay, piège de focus et `aria-hidden` ; la saisie du
      // formulaire survit dans `consultationForm`, que `posterConsultation`
      // relira telle quelle.
      setTiroirOuvert(null);
      demanderConfirmation(
        'retablissement',
        { ...cible, actif: cible.actif === 'OUI' ? 'OUI' : 'NON' },
        'consultation',
      );
      return;
    }
    void posterConsultation();
  };

  // Les quatre actions d'accès prennent désormais leur patient en paramètre :
  // elles sont déclenchées depuis le menu d'une LIGNE, et non plus depuis le
  // sélecteur de la carte consultation. Le garde « Sélectionnez un patient »
  // n'a plus d'objet — une ligne désigne toujours un dossier.
  // `retablirAcces` : ce renvoi vient d'une confirmation de rétablissement —
  // le refus et le succès se rendent alors DANS le dialogue, pas derrière lui.
  const onResendToken = async (idPatient: string, retablirAcces = false) => {
    setTokenAction('resend');
    setConsultationFeedback(null);
    if (retablirAcces) setErreurConfirmation(null);
    try {
      const r = await fetch('/api/praticien/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idPatient,
          action: 'resend',
          ...(retablirAcces ? { retablirAcces: true } : {}),
        }),
      });
      const json = (await r.json()) as TokenActionResponse;
      if (!r.ok || !json.success) {
        const message = erreurLisible(json.reason, json.error);
        if (retablirAcces) setErreurConfirmation(message);
        else setConsultationFeedback({ ok: false, msg: message });
        return;
      }
      setConsultationFeedback({
        // Ici, pas de tiroir à refermer et l'action est répétable : un envoi
        // mort peut donc rougir franchement la ligne de statut.
        ok: envoiReussi(json.envoi),
        msg: libelleEnvoi(json.envoi, {
          // Le rétablissement est un fait de plus, et il a eu lieu même si
          // l'e-mail meurt : le dire dans les trois cas.
          envoye: retablirAcces
            ? 'Accès rétabli et lien renvoyé au patient.'
            : 'Lien d’accès renvoyé au patient.',
          echoue: retablirAcces
            ? 'Accès rétabli, mais le lien n’est pas parti : l’envoi a échoué. Réessayez.'
            : 'Le lien n’est pas parti : l’envoi de l’e-mail a échoué. Réessayez.',
          nonConfigure: retablirAcces
            ? 'Accès rétabli, mais le lien n’est pas parti : la messagerie n’est pas configurée.'
            : 'Le lien n’est pas parti : la messagerie n’est pas configurée.',
        }),
      });
      if (retablirAcces) {
        setConfirmation(null);
        await refreshPatients();
      }
    } catch {
      if (retablirAcces) setErreurConfirmation('Erreur réseau. Réessayez.');
      else setConsultationFeedback({ ok: false, msg: 'Erreur réseau. Réessayez.' });
    } finally {
      setTokenAction(null);
    }
  };

  // Lien magique (gate G4) — action de nature différente des autres, qui
  // pointent la page de connexion : celui-ci expire en 24 h et ne s'ouvre qu'une
  // fois. Le libellé le dit, pour qu'on ne le confonde pas avec « Renvoyer le lien ».
  const onEnvoyerLienMagique = async (idPatient: string) => {
    setTokenAction('lien_magique');
    setConsultationFeedback(null);
    try {
      const r = await fetch('/api/praticien/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idPatient, action: 'lien_magique' }),
      });
      const json = (await r.json()) as TokenActionResponse;
      setConsultationFeedback(
        !r.ok || !json.success
          ? { ok: false, msg: erreurLisible(json.reason, json.error) }
          : {
              ok: envoiReussi(json.envoi),
              msg: libelleEnvoi(json.envoi, {
                envoye: 'Lien à usage unique envoyé — valable 24 h.',
                echoue: 'Lien à usage unique émis, mais l’e-mail n’est pas parti. Réessayez.',
                nonConfigure: 'Lien à usage unique émis, mais aucun e-mail n’est parti : la messagerie n’est pas configurée.',
              }),
            }
      );
    } catch {
      setConsultationFeedback({ ok: false, msg: 'Erreur réseau. Réessayez.' });
    } finally {
      setTokenAction(null);
    }
  };

  const onCopierLien = async (idPatient: string) => {
    setTokenAction('copier');
    setConsultationFeedback(null);
    try {
      const r = await fetch('/api/praticien/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idPatient, action: 'lien' }),
      });
      const json = (await r.json()) as TokenActionResponse;
      if (!r.ok || !json.success || !json.lien) {
        setConsultationFeedback({ ok: false, msg: erreurLisible(json.reason, json.error) });
        return;
      }
      await navigator.clipboard.writeText(json.lien);
      setConsultationFeedback({ ok: true, msg: 'Lien copié dans le presse-papiers.' });
    } catch {
      setConsultationFeedback({ ok: false, msg: 'Erreur réseau. Réessayez.' });
    } finally {
      setTokenAction(null);
    }
  };

  // Appelée UNIQUEMENT derrière la confirmation (LOT-02c) : un échec part donc
  // dans `erreurConfirmation`, à l'intérieur du dialogue. Rendu ailleurs dans la
  // page, il serait derrière l'overlay Radix et sous `aria-hidden` — le défaut
  // que la revue du LOT-01b avait rattrapé sur l'effacement.
  const onRevokeToken = async (idPatient: string) => {
    setTokenAction('revoke');
    setErreurConfirmation(null);
    setConsultationFeedback(null);
    try {
      const r = await fetch(`/api/praticien/token?idPatient=${encodeURIComponent(idPatient)}`, {
        method: 'DELETE',
      });
      const json = (await r.json()) as TokenActionResponse;
      if (!r.ok || !json.success) {
        setErreurConfirmation(erreurLisible(json.reason, json.error));
        return;
      }
      setConsultationFeedback({
        ok: true,
        msg: 'Accès révoqué : lien coupé, session en cours terminée, liens à usage unique annulés.',
      });
      setConfirmation(null);
      await refreshPatients();
    } catch {
      setErreurConfirmation('Erreur réseau. Réessayez.');
    } finally {
      setTokenAction(null);
    }
  };

  const openEdit = (p: PatientRowData) => {
    setEditState({ idPatient: p.idPatient, telephone: p.telephone, actif: p.actif === 'OUI' ? 'OUI' : 'NON' });
    setEditFeedback(null);
  };

  // Activation / désactivation par PATCH, dans les deux sens. Il n'y a plus de
  // route DELETE à appeler : elle ne savait que désactiver, et son nom laissait
  // croire à une suppression — précisément le malentendu que ce lot corrige.
  const onToggleActif = async (idPatient: string, actif: 'OUI' | 'NON') => {
    setErreurConfirmation(null);
    const r = await fetch('/api/praticien/patients', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idPatient, actif }),
    });
    const json = (await r.json()) as PatchPatientResponse;
    if (!r.ok || !json.success) {
      setErreurConfirmation(erreurLisible(json.reason, json.error));
      return;
    }
    setConsultationFeedback({
      ok: true,
      msg: actif === 'OUI' ? 'Dossier réactivé.' : 'Dossier désactivé : l’accès au portail est coupé.',
    });
    setConfirmation(null);
    await refreshPatients();
  };

  // Le paramètre porte la SAISIE, pas l'état du dialogue — d'où `saisie` et non
  // `confirmation` : nommé ainsi, il masquait l'état `confirmation`, donc le
  // dossier concerné, et le message final ne pouvait plus le consulter.
  //
  // Le mode est typé `CycleDeVieAction` — l'union de la ROUTE — et non
  // `ModeConfirmation`, qui couvre aussi `desactivation`/`reactivation`. Ces
  // deux-là passent par `PATCH` : les accepter ici les aurait laissées typées
  // jusqu'à un 400 à l'exécution. Le dispatcher les écarte déjà, mais un garde
  // qui ne vit que dans une branche `if` ne protège pas le prochain appelant.
  const onCycleDeVie = async (idPatient: string, mode: CycleDeVieAction, saisie: string) => {
    // `confirmation` est le binding de CETTE fermeture de rendu : ni
    // `setConfirmation(null)` ni `refreshPatients()` ne le réassignent — ils
    // programment un rendu, qui produira une autre fermeture. La valeur reste
    // donc valide jusqu'au bout de la fonction, et l'alias ci-dessous ne fait
    // que nommer ce fait pour le lecteur.
    //
    // Ce qui garantit qu'il s'agit du BON dossier est ailleurs : l'unique
    // appelant (`onConfirmerFinDeParcours`) refuse d'entrer sans `confirmation`
    // et exclut la réentrance par `cycleEnCours`.
    const confirmationEnCours = confirmation;
    const r = await fetch('/api/praticien/patients/cycle-de-vie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idPatient,
        action: mode,
        // La saisie RÉELLE de l'utilisateur, jamais une constante recopiée :
        // si un jour l'activation du bouton régressait, le serveur refuserait
        // encore. Une constante en dur ferait de cette régression un
        // effacement.
        ...(mode === 'effacement' ? { confirmation: saisie } : {}),
      }),
    });
    const json = (await r.json()) as CycleDeVieResponse;
    if (!r.ok || !json.success) {
      setErreurConfirmation(
        erreurLisible(
          json.success === false ? json.reason : undefined,
          json.success === false ? json.error : undefined,
        ),
      );
      return;
    }
    // Le message de clôture suit la MÊME condition que le dialogue qui vient de
    // le précéder (`accesActif`) : sur un dossier désactivé, le portail refuse
    // déjà le lien, et le lui promettre ici serait faux. C'est ce texte-là que
    // le praticien lit systématiquement — les deux autres ne s'affichent qu'en
    // amont ou en cas de refus.
    const accesOuvert = confirmationEnCours?.patient.actif === 'OUI';
    setConsultationFeedback({
      ok: true,
      msg:
        mode === 'effacement'
          ? 'Dossier effacé définitivement. Il ne subsiste qu’une ligne anonyme.'
          : mode === 'cloture'
            ? accesOuvert
              ? 'Suivi clôturé : plus aucune assignation ni aucun envoi de document de suivi. Le patient garde l’accès à ses archives, et vous pouvez lui renvoyer son lien.'
              : 'Suivi clôturé : plus aucune assignation ni aucun envoi de document de suivi. Le dossier reste désactivé, donc sans accès au portail.'
            : 'Suivi rouvert.',
    });
    setConfirmation(null);
    await refreshPatients();
  };

  /** Exécute l'action confirmée, quelle qu'elle soit, avec un seul garde. */
  const onConfirmerFinDeParcours = async (saisie: string) => {
    if (!confirmation || cycleEnCours) return;
    const { mode, patient, suite } = confirmation;
    setCycleEnCours(true);
    setErreurConfirmation(null);
    try {
      if (mode === 'desactivation') await onToggleActif(patient.idPatient, 'NON');
      else if (mode === 'reactivation') await onToggleActif(patient.idPatient, 'OUI');
      else if (mode === 'revocation') await onRevokeToken(patient.idPatient);
      // Ce mode ne porte pas de geste à lui : il REPREND celui qu'il a
      // interrompu. La branche est aussi ce qui garde le `else` final, typé
      // `CycleDeVieAction` : sans elle, TypeScript refuse d'y laisser passer
      // `retablissement` — et c'est voulu, la prochaine addition à
      // `ModeConfirmation` butera ici plutôt qu'en 400 à l'exécution.
      else if (mode === 'retablissement') {
        await (suite === 'consultation'
          ? posterConsultation(true)
          : onResendToken(patient.idPatient, true));
      }
      else await onCycleDeVie(patient.idPatient, mode, saisie);
    } catch {
      setErreurConfirmation('Erreur réseau. Réessayez.');
    } finally {
      setCycleEnCours(false);
    }
  };

  // Un seul point d'entrée pour le menu d'une ligne. TOUTE action qui change
  // ce à quoi le patient a accès passe par un dialogue — y compris la
  // désactivation, qui coupe l'accès au portail : avant ce lot elle demandait
  // déjà deux gestes (« Supprimer » puis « Confirmer »), la renommer ne
  // justifiait pas de lui retirer sa confirmation.
  //
  // La révocation y entre au LOT-02c. Elle échappait à cette règle que le code
  // énonçait déjà : un clic, aucune question, alors qu'elle coupe désormais une
  // session en cours et les liens à usage unique en vol.
  const demanderConfirmation = (
    mode: ModeConfirmation,
    patient: PatientRowData,
    suite?: 'resend' | 'consultation',
  ) => {
    setErreurConfirmation(null);
    setConfirmation({ mode, patient, suite });
  };

  const onActionDossier = (action: ActionDossier, patient: PatientRowData) => {
    switch (action) {
      // SEULE ACTION DU MENU DONT LE GESTE CHANGE SELON L'ÉTAT DU DOSSIER : sur
      // un accès révoqué, « Renvoyer le lien » le RÉTABLIRAIT — d'où le
      // dialogue. Sur un dossier ouvert, rien de plus n'arrive, rien n'est
      // demandé : une confirmation systématique userait la seule qui compte.
      case 'resend':
        return patient.accesRevoque
          ? demanderConfirmation('retablissement', patient, 'resend')
          : void onResendToken(patient.idPatient);
      case 'copier': return void onCopierLien(patient.idPatient);
      case 'lien_magique': return void onEnvoyerLienMagique(patient.idPatient);
      case 'revoke': return demanderConfirmation('revocation', patient);
      case 'desactiver': return demanderConfirmation('desactivation', patient);
      case 'reactiver': return demanderConfirmation('reactivation', patient);
      case 'cloturer': return demanderConfirmation('cloture', patient);
      case 'rouvrir': return demanderConfirmation('reprise', patient);
      case 'effacer': return demanderConfirmation('effacement', patient);
    }
  };

  const onSaveEdit = async () => {
    if (!editState) return;
    setSavingEdit(true);
    setEditFeedback(null);
    try {
      // LE FORMULAIRE NE POSTE QUE LE CONTACT. `actif` en est retiré depuis
      // `D-126` : désactiver ferme désormais les liens en vol, geste
      // IRRÉVERSIBLE, et ce chemin-ci était le seul sans dialogue de
      // confirmation. Un praticien venu corriger un numéro de téléphone
      // pouvait effleurer le select et tuer le lien envoyé deux heures plus
      // tôt, pour tout retour « Patient mis à jour. ». La règle que ce module
      // s'écrit à lui-même vaut ici comme ailleurs : toute action qui change ce
      // à quoi le patient a accès passe par un dialogue — celui du menu de
      // ligne, « Désactiver le dossier ».
      const r = await fetch('/api/praticien/patients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idPatient: editState.idPatient, telephone: editState.telephone }),
      });
      const json = (await r.json()) as PatchPatientResponse;
      if (!r.ok || !json.success) {
        setEditFeedback({ ok: false, msg: erreurLisible(json.reason, json.error) });
        return;
      }
      setEditFeedback({ ok: true, msg: 'Patient mis à jour.' });
      await refreshPatients();
      setTimeout(() => setEditState(null), 800);
    } catch {
      setEditFeedback({ ok: false, msg: 'Erreur réseau. Réessayez.' });
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) {
    return <div className="text-base text-muted-foreground">Chargement des données patients...</div>;
  }

  if (data?.unavailable) {
    return (
      <div className="bg-muted border border-border rounded-xl p-4 text-base text-muted-foreground">
        {erreurLisible(data.reason)}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Confirmation de fin de parcours — un seul dialogue pour le tableau */}
      {confirmation && (
        <DossierConfirmDialog
          mode={confirmation.mode}
          nomPatient={`${confirmation.patient.prenom} ${confirmation.patient.nom}`.trim()}
          accesActif={confirmation.patient.actif === 'OUI'}
          open
          onOpenChange={ouvert => {
            if (!ouvert && !cycleEnCours) {
              setConfirmation(null);
              setErreurConfirmation(null);
            }
          }}
          enCours={cycleEnCours}
          erreur={erreurConfirmation}
          onConfirm={onConfirmerFinDeParcours}
        />
      )}

      {/* Barre d'actions (LOT-05) : les formulaires de création vivent en
          tiroirs — le tableau patients est le premier contenu de la page. */}
      <div className="flex flex-wrap items-center gap-3">
        <PanneauSuperpose
          largeur="standard"
          declencheur={<Button className="min-h-11">Nouveau patient</Button>}
          titre="Nouveau patient"
          description="Nouveau patient"
          descriptionMasquee
          open={tiroirOuvert === 'patient'}
          onOpenChange={ouvert => setTiroirOuvert(ouvert ? 'patient' : null)}
        >
          <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={onCreatePatient}>
          <Input required value={form.prenom} onChange={e => setForm(p => ({ ...p, prenom: e.target.value }))} placeholder="Prénom *" maxLength={100} />
          <Input required value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} placeholder="Nom *" maxLength={100} />
          <Input required type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Email *" maxLength={254} />
          <Input value={form.telephone} onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))} placeholder="Téléphone" maxLength={30} />
          <Input type="date" value={form.dateNaissance} onChange={e => setForm(p => ({ ...p, dateNaissance: e.target.value }))} />
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? 'Création...' : 'Créer le patient'}
            </Button>
            {feedback && (
              <span role="status" className={`text-sm ${feedback.ok ? 'text-status-success' : 'text-status-danger'}`}>
                {feedback.msg}
              </span>
            )}
          </div>
          </form>
        </PanneauSuperpose>

        <PanneauSuperpose
          largeur="standard"
          declencheur={<Button className="min-h-11">Nouvelle consultation</Button>}
          titre="Nouvelle consultation"
          description="Ouvre une consultation et envoie au patient son lien d’accès : consentement, fiche de renseignements, anamnèse, puis assignation automatique du pack de base. Les actions sur un dossier existant sont dans « Gérer le dossier », au bout de sa ligne."
          open={tiroirOuvert === 'consultation'}
          onOpenChange={ouvert => setTiroirOuvert(ouvert ? 'consultation' : null)}
        >
          <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={onCreateConsultation}>
          <Select required value={consultationForm.idPatient} onChange={e => setConsultationForm(p => ({ ...p, idPatient: e.target.value }))}>
            <option value="">Patient *</option>
            {/* Un dossier clos est signalé ICI, et pas seulement refusé après
                coup : la route répond 409, mais découvrir la clôture au moment
                de l'échec est une mauvaise façon de l'apprendre. */}
            {(data?.patients ?? []).map(p => (
              <option key={p.idPatient} value={p.idPatient}>
                {`${p.prenom} ${p.nom} — ${p.email}${p.suiviClotureLe ? ' (suivi clôturé)' : ''}${p.accesRevoque ? ' (accès révoqué)' : ''}`}
              </option>
            ))}
          </Select>
          <Select value={consultationForm.motif} onChange={e => setConsultationForm(p => ({ ...p, motif: e.target.value }))} aria-label="Motif de consultation">
            <option value="">Motif de consultation (optionnel)</option>
            {MOTIFS_CONSULTATION.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </Select>
          <div className="flex flex-wrap items-center gap-3 md:col-span-2">
            <Button type="submit" disabled={savingConsultation || tokenAction !== null}>
              {savingConsultation ? 'Envoi...' : 'Créer une consultation & envoyer le lien'}
            </Button>
            {/* Un échec se dit DANS le tiroir (Radix voile le reste de la
                page) ; le succès ferme le tiroir et s'annonce par la ligne
                de statut de la barre d'actions. */}
            {consultationFeedback && !consultationFeedback.ok && (
              <span role="status" className="text-sm text-status-danger">
                {consultationFeedback.msg}
              </span>
            )}
          </div>
          </form>
        </PanneauSuperpose>

        {/* Retour des actions déclenchées depuis les lignes du tableau (lien
            renvoyé/copié/révoqué, consultation créée…) : loin du geste,
            `aria-live` le fait au moins annoncer. */}
        <span
          role="status"
          aria-live="polite"
          className={`text-sm ${consultationFeedback?.ok ? 'text-status-success' : 'text-status-danger'}`}
        >
          {consultationFeedback?.msg ?? ''}
        </span>
      </div>

      {/* Édition patient inline */}
      {editState && (
        <div className="bg-surface border border-accent rounded-xl p-4">
          <h3 className="font-display text-lg font-semibold text-foreground mb-3">
            Modifier patient <span className="font-normal text-muted-foreground">{editState.idPatient}</span>
          </h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Téléphone</label>
              <Input value={editState.telephone} onChange={e => setEditState(s => s ? { ...s, telephone: e.target.value } : s)} maxLength={30} placeholder="Téléphone" />
            </div>
            {/* L'état du dossier se change au menu de la ligne, derrière un
                dialogue — jamais ici : ce formulaire n'avait aucune
                confirmation et le geste est devenu irréversible (`D-126`). */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">État du dossier</label>
              <span className="text-sm text-foreground py-2">
                {editState.actif === 'OUI' ? 'Actif' : 'Inactif'}
                <span className="text-muted-foreground"> — se change au menu de la ligne</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={onSaveEdit} disabled={savingEdit}>
                {savingEdit ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
              <Button variant="outline" onClick={() => setEditState(null)}>
                Annuler
              </Button>
            </div>
            {editFeedback && (
              <span className={`text-sm ${editFeedback.ok ? 'text-status-success' : 'text-status-danger'}`}>
                {editFeedback.msg}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Barre recherche / tri */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher (nom, prénom, email)" className="w-full sm:w-72" />
          <Select value={sortBy} onChange={e => setSortBy(e.target.value as SortBy)}>
            <option value="nom">Tri : nom</option>
            <option value="email">Tri : email</option>
          </Select>
        </div>
        {/* Meta de panel façon maquette : compteur en mono. */}
        <div className="font-mono text-13 text-muted-foreground">
          {pagination ? `${pagination.total} patient(s)` : '—'}
        </div>
      </div>

      {/* Tableau patients */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-card">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-display text-lg font-semibold text-foreground">Patients</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted text-2xs uppercase tracking-[.07em] text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Nom</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Téléphone</th>
                <th className="px-4 py-2 text-left">Actif</th>
                <th className="px-4 py-2 text-left"></th>
                <th className="px-4 py-2 text-left"></th>
                <th className="px-4 py-2 text-left"></th>
              </tr>
            </thead>
            <tbody>
              {!loadingTable && tablePatients.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-4 text-center text-muted-foreground">Aucun patient.</td></tr>
              )}
              {tablePatients.map(p => (
                <PatientRow
                  key={p.idPatient}
                  patient={{ ...p, actif: p.actif === 'OUI' ? 'OUI' : 'NON' }}
                  onEdit={openEdit}
                  onAction={onActionDossier}
                  lienMagiqueActif={lienMagiqueActif}
                  actionAccesEnCours={tokenAction !== null}
                />
              ))}
            </tbody>
          </table>
        </div>
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border">
            <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

    </div>
  );
}
