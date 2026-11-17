'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PenLine, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { TRAIT_ICONE } from '@/components/ui/icone';
import { readEventStream } from '@/lib/sse/readEventStream';
import type { PatientsPgApiResponse } from '@/app/api/praticien/patients-pg/route';
import type { SyntheseSchema } from '@/lib/anthropic';
import { SynthesePraticienEditor } from '@/components/SynthesePraticienEditor';
import {
  estRedactionPraticien,
  MODELE_REDACTION_PRATICIEN,
  nouveauBrouillonPraticien,
} from '@/lib/synthese-praticien';

type SyntheseRecord = {
  idSynthese: string;
  idPatient: string;
  dateGeneration: string;
  modele: string;
  statut: string;
  dateValidation: string | null;
  notesPraticien: string | null;
  syntheseJson: SyntheseSchema;
  /* Renseigné quand la synthèse précède le retrait d'interprétation d'un des
   * questionnaires du dossier — calculé côté serveur, jamais ici. */
  avertissementMesureRetiree?: string | null;
  /* [[D-513]] §5 : renseigné quand la synthèse est suspecte (un résultat de
   * biologie repris hors de ses champs) — calculé côté serveur, qui refuse
   * aussi la validation et les sorties. */
  motifSuspecte?: string | null;
  /* Version optimiste : renvoyée telle quelle au PATCH, qui répond 409
   * `synthese_modifiee` si la synthèse a changé depuis. */
  updatedAt?: string;
};

// Le 409 sur lequel l'écran recharge la synthèse (route PATCH).
const CODE_SYNTHESE_MODIFIEE = 'synthese_modifiee';

const STATUT_LABEL: Record<string, string> = {
  Brouillon_IA: 'Brouillon IA',
  Brouillon_Praticien: 'Brouillon praticien',
  Validee_Praticien: 'Validée',
  Corrigee_Praticien: 'Corrigée',
  Rejetee: 'Rejetée',
};

const STATUT_COLOR: Record<string, string> = {
  Brouillon_IA: 'bg-status-warning/10 text-status-warning',
  Brouillon_Praticien: 'bg-status-info/10 text-status-info',
  Validee_Praticien: 'bg-status-success/10 text-status-success',
  Corrigee_Praticien: 'bg-status-info/10 text-status-info',
  Rejetee: 'bg-status-danger/10 text-status-danger',
};

const PRIORITE_COLOR: Record<string, string> = {
  eleve: 'bg-status-danger/10 text-status-danger',
  modere: 'bg-status-warning/10 text-status-warning',
  faible: 'bg-status-success/10 text-status-success',
};

const PRIORITE_LABEL: Record<string, string> = {
  eleve: 'Élevée',
  modere: 'Modérée',
  faible: 'Faible',
};

// Q7 de PRA-5 ([[D-481]] complément DOC-15) : 44 px et focus visible.
const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring';
const inputCls = `bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground ${focus}`;

// Q6 : le retour d'action paraît une seule fois, sous le geste qui l'a
// produit — succès en `role=status`, échec en `role=alert`.
type ZoneRetour = 'patient' | 'brouillon' | 'edition' | 'actions' | 'note' | 'booklet';
type Retour = { ok: boolean; msg: string; zone: ZoneRetour };

function RetourAction({ retour, zone, className = '' }: { retour: Retour | null; zone: ZoneRetour; className?: string }) {
  if (!retour || retour.zone !== zone) return null;
  return (
    <p
      role={retour.ok ? 'status' : 'alert'}
      className={`text-base ${retour.ok ? 'text-status-success' : 'text-status-danger'} ${className}`}
    >
      {retour.msg}
    </p>
  );
}

export function SynthesePanel({ initialPatientId = '' }: { initialPatientId?: string }) {
  const [patients, setPatients] = useState<PatientsPgApiResponse['patients']>([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [syntheses, setSyntheses] = useState<SyntheseRecord[]>([]);
  const [selectedSynthese, setSelectedSynthese] = useState<SyntheseRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [manualDraft, setManualDraft] = useState<SyntheseSchema | null>(null);
  const [editedManual, setEditedManual] = useState<SyntheseSchema | null>(null);
  const [manualDirty, setManualDirty] = useState(false);
  const [bookletHtml, setBookletHtml] = useState<string | null>(null);
  const [bookletInfo, setBookletInfo] = useState<{ dejaEnvoye: boolean; emailMasque: string | null } | null>(null);
  const [loadingBooklet, setLoadingBooklet] = useState(false);
  const [sending, setSending] = useState(false);
  const [relectureConfirmee, setRelectureConfirmee] = useState(false);
  const [forceSend, setForceSend] = useState(false);
  // Garde de registre anxiogène : la route SAIT depuis toujours accepter
  // `confirmerRegistre` (« le praticien voit le mot, et décide »), mais aucun
  // écran ne l'envoyait. Le praticien recevait un avertissement lui demandant
  // d'« ajouter confirmerRegistre: true » — un champ JSON, sans commande pour
  // le poser. `registreATrancher` porte le mot signalé ; il n'apparaît qu'après
  // un refus de la garde, jamais avant : la case ne se coche pas à l'avance.
  const [registreATrancher, setRegistreATrancher] = useState<string | null>(null);
  const [confirmerRegistre, setConfirmerRegistre] = useState(false);
  const [notes, setNotes] = useState('');
  const [feedback, setFeedback] = useState<Retour | null>(null);
  // Q4 et Q5 de PRA-5 : un échec de lecture n'est pas une absence. Chaque
  // lecture a son état d'échec et son « Réessayer », qui ne relance qu'elle ;
  // le focus revient au bouton si la lecture échoue encore.
  const [erreurPatients, setErreurPatients] = useState(false);
  const [erreurSyntheses, setErreurSyntheses] = useState(false);
  const reessayerPatients = useRef<HTMLButtonElement>(null);
  const reessayerSyntheses = useRef<HTMLButtonElement>(null);
  const [focusApresRelecture, setFocusApresRelecture] = useState<'patients' | 'syntheses' | null>(null);
  // La synthèse ouverte AU RENDU : un retour arrivé après la fermeture du
  // détail, ou l'ouverture d'une autre synthèse, paraît sous le choix du
  // patient, toujours affiché — jamais nulle part, ni sous une autre synthèse.
  const syntheseOuverte = useRef<string | null>(null);
  syntheseOuverte.current = selectedSynthese?.idSynthese ?? null;
  const zoneDuDetail = (idSynthese: string, zone: ZoneRetour): ZoneRetour =>
    syntheseOuverte.current === idSynthese ? zone : 'patient';

  // UNE RÉPONSE PÉRIMÉE N'ÉCRASE PAS LE DOSSIER COURANT. Deux lectures peuvent
  // être en vol : celle du dossier qu'on quitte et celle du dossier choisi. Si
  // la première se résout APRÈS la seconde, le sélecteur affiche un dossier et
  // la liste montre les synthèses d'un autre — et les actions de l'écran, qui
  // prennent leur identifiant dans la sélection, portent alors sur un dossier
  // dont on ne lit pas les synthèses. Chaque lecture prend un numéro ; seule la
  // dernière écrit. Même patron que `chargerTrajectoire` dans
  // `FichePatientPanel`, et pour la même raison.
  const generationSyntheses = useRef(0);

  // Rend la liste lue, ou `null` (échec, ou lecture dépassée par une autre).
  const loadSyntheses = useCallback(async (idPatient: string): Promise<SyntheseRecord[] | null> => {
    const generation = ++generationSyntheses.current;
    setErreurSyntheses(false);
    if (!idPatient) { setSyntheses([]); return null; }
    setLoading(true);
    try {
      const r = await fetch(`/api/praticien/synthese?idPatient=${encodeURIComponent(idPatient)}`);
      const d = await r.json() as { syntheses?: SyntheseRecord[] };
      if (generation !== generationSyntheses.current) return null;
      // Une réponse non `ok` est un échec, pas une liste vide (Q4).
      if (!r.ok || !Array.isArray(d.syntheses)) {
        setSyntheses([]);
        setErreurSyntheses(true);
        return null;
      }
      setSyntheses(d.syntheses);
      return d.syntheses;
    } catch {
      if (generation !== generationSyntheses.current) return null;
      setSyntheses([]);
      setErreurSyntheses(true);
      return null;
    }
    finally { if (generation === generationSyntheses.current) setLoading(false); }
  }, []);

  // LA RELECTURE QUI SUIT UNE ACTION VISE LE PATIENT COURANT (PRA-6c). Une
  // génération, une action ou un envoi relit la liste après sa réponse ; le
  // patient de la closure est celui du clic. S'il a changé pendant la requête,
  // relire l'ancien numéroterait cette lecture APRÈS celle du nouveau : la
  // liste de l'ancien paraîtrait sous le titre du nouveau. Elle ne s'applique
  // donc que si le patient est encore le courant.
  const patientCourant = useRef(selectedPatient);
  patientCourant.current = selectedPatient;
  const relireSiCourant = async (idPatient: string) => {
    if (patientCourant.current !== idPatient) return;
    await loadSyntheses(idPatient);
  };

  // SUR 409 `synthese_modifiee` (lot synthese-version-optimiste), l'écran
  // relit la synthèse et l'affiche telle qu'elle est enregistrée : le geste
  // suivant porte alors sur ce que le praticien voit. Le texte non enregistré
  // de l'éditeur visait une version qui n'existe plus ; il est remplacé, et le
  // message le dit. Le détail se ferme si la synthèse a disparu. Même garde
  // que `relireSiCourant` : un autre patient choisi entre-temps n'est pas relu
  // à la place du sien.
  const rechargerApresConflit = async (idSynthese: string, zone: ZoneRetour, texteNonEnregistre: boolean) => {
    // Sous un autre patient, rien n'est relu : le message dit seulement que
    // le geste n'a pas été appliqué.
    const msgAutrePatient = 'Votre geste sur la synthèse d’un autre patient n’a pas été appliqué : elle avait été modifiée entre-temps. Rouvrez-la avant de recommencer.';
    if (patientCourant.current !== selectedPatient) {
      setFeedback({ ok: false, msg: msgAutrePatient, zone: 'patient' });
      return;
    }
    const liste = await loadSyntheses(selectedPatient);
    const msg = 'La synthèse a été modifiée entre-temps. Elle est rechargée : vérifiez-la avant de recommencer.'
      + (texteNonEnregistre ? ' Vos modifications non enregistrées ne sont pas conservées.' : '');
    if (!liste) {
      // Rien n'a été relu : jamais « rechargée » ici (P3-2 de wn-reviewer, deux
      // passes). Patient changé pendant la relecture, elle n'a rien écrit ;
      // sinon elle a échoué, et le détail reste tel quel, texte saisi compris.
      setFeedback(patientCourant.current !== selectedPatient
        ? { ok: false, msg: msgAutrePatient, zone: 'patient' }
        : {
            ok: false,
            msg: 'La synthèse a été modifiée entre-temps et n’a pas pu être relue. Fermez-la puis rouvrez-la avant de recommencer.',
            zone: zoneDuDetail(idSynthese, zone),
          });
      return;
    }
    if (syntheseOuverte.current !== idSynthese) {
      setFeedback({ ok: false, msg, zone: 'patient' });
      return;
    }
    const fraiche = liste.find(s => s.idSynthese === idSynthese);
    if (!fraiche) {
      setSelectedSynthese(null);
      setEditedManual(null);
      setManualDirty(false);
      setBookletHtml(null);
      setBookletInfo(null);
      setFeedback({ ok: false, msg, zone: 'patient' });
      return;
    }
    const editable = fraiche.statut === 'Brouillon_Praticien' || fraiche.statut === 'Brouillon_IA';
    const validee = fraiche.statut === 'Validee_Praticien' || fraiche.statut === 'Corrigee_Praticien';
    setSelectedSynthese(fraiche);
    setEditedManual(editable ? fraiche.syntheseJson : null);
    setManualDirty(false);
    setNotes(fraiche.notesPraticien ?? '');
    setBookletHtml(null);
    setBookletInfo(null);
    // La zone de l'éditeur ou de la note peut disparaître avec le nouveau
    // statut : le message va alors sous « Vider la synthèse », toujours affiché.
    const zoneAffichee = (zone === 'edition' && !editable) || (zone === 'note' && !validee) ? 'actions' : zone;
    setFeedback({ ok: false, msg, zone: zoneAffichee });
  };

  // Q5 : l'échec de la liste des patients n'est plus avalé.
  const chargerPatients = useCallback(async () => {
    try {
      const r = await fetch('/api/praticien/patients-pg');
      const d = (await r.json()) as Partial<PatientsPgApiResponse>;
      if (!r.ok || !Array.isArray(d.patients)) {
        setErreurPatients(true);
        return;
      }
      setPatients(d.patients);
    } catch {
      setErreurPatients(true);
    }
  }, []);

  useEffect(() => {
    void chargerPatients();
  }, [chargerPatients]);

  const relirePatients = async () => {
    setErreurPatients(false);
    await chargerPatients();
    setFocusApresRelecture('patients');
  };

  const relireSyntheses = async () => {
    await loadSyntheses(selectedPatient);
    setFocusApresRelecture('syntheses');
  };

  // Le bouton n'est rendu que si la lecture a encore échoué : le focus y revient.
  useEffect(() => {
    if (!focusApresRelecture) return;
    (focusApresRelecture === 'patients' ? reessayerPatients : reessayerSyntheses).current?.focus();
    setFocusApresRelecture(null);
  }, [focusApresRelecture]);

  // LE DOSSIER DE L'URL S'APPLIQUE UNE FOIS, PAS À CHAQUE CHANGEMENT DE
  // SÉLECTION. `selectedPatient` a été dans les dépendances ET dans la garde de
  // cet effet : choisir un AUTRE patient relançait donc l'effet, la garde ne
  // renvoyait plus tôt puisque la sélection différait de l'URL, et la sélection
  // revenait de force au dossier de l'URL. Verrou déterministe à 100 %, sur les
  // portes d'entrée qui posent `?idPatient=` (fiche, cartes du Fil) — et les actions cliniques de
  // cet écran prennent leur identifiant dans la sélection que le verrou
  // désynchronisait.
  //
  // La référence retient l'identifiant DÉJÀ APPLIQUÉ, et non un simple booléen :
  // si l'URL change pour un autre dossier — navigation d'une carte du Fil à une
  // autre sans démontage —, l'effet doit s'appliquer de nouveau. Un booléen
  // l'aurait interdit.
  const dossierUrlApplique = useRef<string | null>(null);

  useEffect(() => {
    if (!initialPatientId || dossierUrlApplique.current === initialPatientId) return;
    if (!patients.some(p => p.idPatient === initialPatientId)) return;
    dossierUrlApplique.current = initialPatientId;
    setSelectedPatient(initialPatientId);
    setSelectedSynthese(null);
    setManualDraft(null);
    setEditedManual(null);
    setManualDirty(false);
    setBookletHtml(null);
    setBookletInfo(null);
    setFeedback(null);
    void loadSyntheses(initialPatientId);
  }, [initialPatientId, loadSyntheses, patients]);

  const onSelectPatient = (id: string) => {
    setSelectedPatient(id);
    setSelectedSynthese(null);
    setManualDraft(null);
    setEditedManual(null);
    setManualDirty(false);
    setBookletHtml(null);
    setBookletInfo(null);
    setFeedback(null);
    loadSyntheses(id);
  };

  const onGenerate = async () => {
    if (!selectedPatient) return;
    setGenerating(true);
    setFeedback(null);
    try {
      const r = await fetch('/api/praticien/synthese', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idPatient: selectedPatient }),
      });

      // Les gardes d'erreur répondent toujours en JSON (401/404/409/422/503/500),
      // quel que soit le transport de succès.
      if (!r.ok) {
        const d = (await r.json().catch(() => ({}))) as { error?: string };
        setFeedback({ ok: false, msg: d.error ?? 'Erreur lors de la génération.', zone: 'patient' });
        return;
      }

      const msgSucces = 'Synthèse générée. Relisez et validez avant envoi.';

      // Transport SSE (Scalingo) : lire le flux jusqu'à l'événement terminal.
      if (r.headers.get('content-type')?.includes('text/event-stream')) {
        let terminal: Retour | null = null;
        await readEventStream(r, e => {
          if (e.event === 'done') {
            terminal = { ok: true, msg: msgSucces, zone: 'patient' };
          } else if (e.event === 'error') {
            let msg = 'Erreur lors de la génération.';
            try {
              msg = (JSON.parse(e.data) as { error?: string }).error ?? msg;
            } catch {
              /* trame d'erreur illisible : message générique */
            }
            terminal = { ok: false, msg, zone: 'patient' };
          }
        });
        if (!terminal) {
          setFeedback({ ok: false, msg: 'Réponse incomplète du serveur. Réessayez.', zone: 'patient' });
          return;
        }
        setFeedback(terminal);
        if ((terminal as { ok: boolean }).ok) await relireSiCourant(selectedPatient);
        return;
      }

      // Transport JSON historique.
      const d = (await r.json()) as { success?: boolean; error?: string };
      if (!d.success) {
        setFeedback({ ok: false, msg: d.error ?? 'Erreur lors de la génération.', zone: 'patient' });
        return;
      }
      setFeedback({ ok: true, msg: msgSucces, zone: 'patient' });
      await relireSiCourant(selectedPatient);
    } catch {
      setFeedback({ ok: false, msg: 'Erreur réseau. Réessayez.', zone: 'patient' });
    } finally {
      setGenerating(false);
    }
  };

  const onCreateManual = async () => {
    if (!selectedPatient || !manualDraft) return;
    setSaving(true);
    setFeedback(null);
    try {
      const r = await fetch('/api/praticien/synthese', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idPatient: selectedPatient, synthese: manualDraft }),
      });
      const d = await r.json() as { success?: boolean; error?: string; synthese?: SyntheseRecord };
      if (!r.ok || !d.success || !d.synthese) {
        setFeedback({ ok: false, msg: d.error ?? 'Impossible de créer le brouillon.', zone: 'brouillon' });
        return;
      }
      setManualDraft(null);
      setSelectedSynthese(d.synthese);
      setEditedManual(d.synthese.syntheseJson);
      setManualDirty(false);
      // Le brouillon devient le détail ouvert : le retour suit l'éditeur.
      setFeedback({ ok: true, msg: 'Brouillon praticien enregistré. Validez-le avant de préparer le booklet.', zone: 'edition' });
      await relireSiCourant(selectedPatient);
    } catch {
      setFeedback({ ok: false, msg: 'Erreur réseau. Réessayez.', zone: 'brouillon' });
    } finally {
      setSaving(false);
    }
  };

  const onSaveManual = async () => {
    if (!selectedSynthese || !editedManual) return;
    setSaving(true);
    setFeedback(null);
    try {
      const r = await fetch('/api/praticien/synthese', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idSynthese: selectedSynthese.idSynthese,
          action: 'enregistrer',
          synthese: editedManual,
          version: selectedSynthese.updatedAt,
        }),
      });
      const d = await r.json() as { success?: boolean; error?: string; code?: string; syntheseJson?: SyntheseSchema; motifSuspecte?: string | null; updatedAt?: string };
      if (r.status === 409 && d.code === CODE_SYNTHESE_MODIFIEE) {
        await rechargerApresConflit(selectedSynthese.idSynthese, 'edition', true);
        return;
      }
      if (!r.ok || !d.success || !d.syntheseJson) {
        setFeedback({ ok: false, msg: d.error ?? 'Impossible d’enregistrer le brouillon.', zone: zoneDuDetail(selectedSynthese.idSynthese, 'edition') });
        return;
      }
      // [[D-513]] §5 : le verdict recalculé par le serveur sur le texte enregistré.
      setSelectedSynthese({ ...selectedSynthese, syntheseJson: d.syntheseJson, motifSuspecte: d.motifSuspecte ?? null, updatedAt: d.updatedAt });
      setEditedManual(d.syntheseJson);
      setManualDirty(false);
      setFeedback({ ok: true, msg: 'Brouillon praticien enregistré.', zone: zoneDuDetail(selectedSynthese.idSynthese, 'edition') });
      await relireSiCourant(selectedPatient);
    } catch {
      setFeedback({ ok: false, msg: 'Erreur réseau. Réessayez.', zone: zoneDuDetail(selectedSynthese.idSynthese, 'edition') });
    } finally {
      setSaving(false);
    }
  };

  const onAction = async (idSynthese: string, action: 'valider' | 'rejeter' | 'annoter') => {
    setSaving(true);
    setFeedback(null);
    // La version de la synthèse affichée — celle sur laquelle porte le geste.
    const version = selectedSynthese?.idSynthese === idSynthese ? selectedSynthese.updatedAt : undefined;
    try {
      const r = await fetch('/api/praticien/synthese', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idSynthese, action, notes, version }),
      });
      const d = await r.json() as { success?: boolean; error?: string; code?: string; statut?: string };
      if (r.status === 409 && d.code === CODE_SYNTHESE_MODIFIEE) {
        const noteNonEnregistree = action === 'annoter' && notes.trim() !== (selectedSynthese?.notesPraticien ?? '').trim();
        await rechargerApresConflit(idSynthese, action === 'annoter' ? 'note' : 'actions', noteNonEnregistree);
        return;
      }
      if (!r.ok || !d.success) {
        setFeedback({ ok: false, msg: d.error ?? 'Erreur.', zone: zoneDuDetail(idSynthese, action === 'annoter' ? 'note' : 'actions') });
        return;
      }
      const labels: Record<string, string> = { valider: 'Synthèse validée.', rejeter: 'Synthèse rejetée.', annoter: 'Notes enregistrées.' };
      // Le détail se ferme : le retour paraît sous le choix du patient.
      setFeedback({ ok: true, msg: labels[action] ?? 'Mis à jour.', zone: 'patient' });
      await relireSiCourant(selectedPatient);
      setSelectedSynthese(null);
      setBookletHtml(null);
    } catch {
      setFeedback({ ok: false, msg: 'Erreur réseau. Réessayez.', zone: zoneDuDetail(idSynthese, action === 'annoter' ? 'note' : 'actions') });
    } finally {
      setSaving(false);
    }
  };

  const onResetSynthese = async () => {
    if (!selectedSynthese) return;
    const confirme = window.confirm(
      'Effacer le contenu de cette synthèse et la remettre en brouillon praticien vide ?',
    );
    if (!confirme) return;

    setSaving(true);
    setFeedback(null);
    try {
      const r = await fetch('/api/praticien/synthese', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idSynthese: selectedSynthese.idSynthese, action: 'effacer', version: selectedSynthese.updatedAt }),
      });
      const d = await r.json() as {
        success?: boolean;
        error?: string;
        code?: string;
        statut?: string;
        syntheseJson?: SyntheseSchema;
        modele?: string;
        dateValidation?: string | null;
        notesPraticien?: string | null;
        updatedAt?: string;
      };
      if (r.status === 409 && d.code === CODE_SYNTHESE_MODIFIEE) {
        await rechargerApresConflit(selectedSynthese.idSynthese, 'actions', manualDirty);
        return;
      }
      if (!r.ok || !d.success || !d.syntheseJson || !d.statut) {
        setFeedback({ ok: false, msg: d.error ?? 'Impossible d’effacer la synthèse.', zone: zoneDuDetail(selectedSynthese.idSynthese, 'actions') });
        return;
      }
      const syntheseVide = {
        ...selectedSynthese,
        statut: d.statut,
        modele: d.modele ?? MODELE_REDACTION_PRATICIEN,
        dateValidation: d.dateValidation ?? null,
        notesPraticien: d.notesPraticien ?? null,
        syntheseJson: d.syntheseJson,
        updatedAt: d.updatedAt,
      };
      setSelectedSynthese(syntheseVide);
      setEditedManual(d.syntheseJson);
      setManualDraft(null);
      setManualDirty(false);
      setNotes('');
      setBookletHtml(null);
      setBookletInfo(null);
      setRelectureConfirmee(false);
      setForceSend(false);
      setRegistreATrancher(null);
      setConfirmerRegistre(false);
      setFeedback({ ok: true, msg: 'Synthèse vidée. Complétez le brouillon avant validation et booklet.', zone: zoneDuDetail(selectedSynthese.idSynthese, 'actions') });
      await relireSiCourant(selectedPatient);
    } catch {
      setFeedback({ ok: false, msg: 'Erreur réseau. Réessayez.', zone: zoneDuDetail(selectedSynthese.idSynthese, 'actions') });
    } finally {
      setSaving(false);
    }
  };

  // L'APERÇU DU BOOKLET APPARTIENT À LA SYNTHÈSE DEMANDÉE (PRA-6c). Si l'on
  // ouvre une autre synthèse, ou ferme le détail, avant la réponse, le HTML de
  // la première paraîtrait dans l'aperçu de la seconde — et la case « J'ai
  // relu… » se cocherait, puis l'envoi partirait, sur un booklet que l'on n'a
  // pas lu. Chaque prévisualisation prend un numéro ; une réponse qui n'est pas
  // la dernière, ou dont la synthèse n'est plus ouverte, ne pose rien : ni
  // aperçu, ni information d'envoi, ni retour.
  const generationBooklet = useRef(0);

  const onLoadBooklet = async (idSynthese: string) => {
    const generation = ++generationBooklet.current;
    const perimee = () => generation !== generationBooklet.current || syntheseOuverte.current !== idSynthese;
    setLoadingBooklet(true);
    setBookletHtml(null);
    setBookletInfo(null);
    setRelectureConfirmee(false);
    setForceSend(false);
    setRegistreATrancher(null);
    setConfirmerRegistre(false);
    setFeedback(null);
    try {
      const r = await fetch(`/api/praticien/booklet?idSynthese=${encodeURIComponent(idSynthese)}`);
      const d = await r.json() as { html?: string; error?: string; dejaEnvoye?: boolean; dernierEnvoiEmailMasque?: string | null };
      if (perimee()) return;
      if (!r.ok || !d.html) {
        setFeedback({ ok: false, msg: d.error ?? 'Impossible de générer le booklet.', zone: zoneDuDetail(idSynthese, 'booklet') });
        return;
      }
      setBookletHtml(d.html);
      setBookletInfo({ dejaEnvoye: d.dejaEnvoye ?? false, emailMasque: d.dernierEnvoiEmailMasque ?? null });
    } catch {
      if (perimee()) return;
      setFeedback({ ok: false, msg: 'Erreur réseau. Réessayez.', zone: zoneDuDetail(idSynthese, 'booklet') });
    } finally {
      if (generation === generationBooklet.current) setLoadingBooklet(false);
    }
  };

  const onClearBooklet = () => {
    setBookletHtml(null);
    setBookletInfo(null);
    setRelectureConfirmee(false);
    setForceSend(false);
    setRegistreATrancher(null);
    setConfirmerRegistre(false);
    setFeedback({ ok: true, msg: 'Prévisualisation du booklet effacée.', zone: 'booklet' });
  };

  const onSend = async (idSynthese: string) => {
    if (!relectureConfirmee) {
      setFeedback({ ok: false, msg: 'Confirmez d\'abord la relecture du booklet.', zone: zoneDuDetail(idSynthese, 'booklet') });
      return;
    }
    setSending(true);
    setFeedback(null);
    try {
      const r = await fetch('/api/praticien/booklet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idSynthese, relectureConfirmee, forceSend, confirmerRegistre }),
      });
      const d = await r.json() as { success?: boolean; error?: string; warning?: string; needsConfirmation?: boolean; reason?: string; terme?: string; emailMasque?: string };
      // Les cases de l'aperçu sont celles de la synthèse OUVERTE (PRA-6c) : si
      // une autre l'est devenue pendant l'envoi, la réponse n'y touche pas —
      // sinon le mot signalé dans A ferait paraître, sous B, une case qui
      // lèverait la garde du registre de B.
      const casesDeCetteSynthese = syntheseOuverte.current === idSynthese;
      if (d.needsConfirmation) {
        // Deux confirmations distinctes, deux cases distinctes : le renvoi
        // (déjà envoyé) et le registre (un mot du texte patient). La route
        // refuse de faire valoir l'une pour l'autre ; l'écran non plus.
        if (casesDeCetteSynthese && d.reason === 'REGISTRE_ANXIOGENE') setRegistreATrancher(d.terme ?? '');
        setFeedback({ ok: false, msg: d.warning ?? 'Booklet déjà envoyé. Cochez le renvoi forcé pour confirmer.', zone: zoneDuDetail(idSynthese, 'booklet') });
        return;
      }
      if (!r.ok || !d.success) {
        setFeedback({ ok: false, msg: d.error ?? 'Erreur lors de l\'envoi.', zone: zoneDuDetail(idSynthese, 'booklet') });
        return;
      }
      setFeedback({ ok: true, msg: `Booklet envoyé à ${d.emailMasque ?? 'patient'}.`, zone: zoneDuDetail(idSynthese, 'booklet') });
      if (casesDeCetteSynthese) {
        setRelectureConfirmee(false);
        setForceSend(false);
        setRegistreATrancher(null);
        setConfirmerRegistre(false);
      }
      await relireSiCourant(selectedPatient);
    } catch {
      setFeedback({ ok: false, msg: 'Erreur réseau. Réessayez.', zone: zoneDuDetail(idSynthese, 'booklet') });
    } finally {
      setSending(false);
    }
  };

  const patient = patients.find(p => p.idPatient === selectedPatient);
  const brouillonEditable = selectedSynthese?.statut === 'Brouillon_Praticien' || selectedSynthese?.statut === 'Brouillon_IA';
  const validationBrouillonBloquee =
    brouillonEditable
    && (
      manualDirty
      || !editedManual?.resume_praticien.trim()
      || !editedManual?.narratif_patient.trim()
      || Boolean(selectedSynthese?.motifSuspecte)
    );

  return (
    <div className="flex flex-col gap-6">

      {/* Sélection patient */}
      <div className="bg-surface border border-border rounded-xl shadow-card p-4">
        <h2 id="synthese-patient-titre" className="font-display text-lg font-semibold text-foreground mb-3">Patient</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <Select
            aria-labelledby="synthese-patient-titre"
            value={selectedPatient}
            onChange={e => onSelectPatient(e.target.value)}
            className={`min-h-11 w-full sm:w-96 ${focus}`}
          >
            <option value="">Sélectionner un patient</option>
            {patients.map(p => (
              <option key={p.idPatient} value={p.idPatient}>
                {`${p.prenom} ${p.nom} — ${p.email}`}
              </option>
            ))}
          </Select>
          {selectedPatient && (
            <>
              <Button
                type="button"
                onClick={onGenerate}
                disabled={generating || saving}
                className="inline-flex items-center gap-2"
              >
                <Sparkles size={16} strokeWidth={TRAIT_ICONE} aria-hidden="true" />
                {generating ? 'Génération en cours...' : 'Générer une synthèse IA'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSelectedSynthese(null);
                  setEditedManual(null);
                  setManualDraft(nouveauBrouillonPraticien());
                  setBookletHtml(null);
                  setFeedback(null);
                }}
                disabled={generating || saving}
                className="inline-flex items-center gap-2"
              >
                <PenLine size={16} strokeWidth={TRAIT_ICONE} aria-hidden="true" />
                Rédiger une synthèse
              </Button>
            </>
          )}
        </div>
        {erreurPatients && (
          <div role="alert" className="mt-2 flex flex-wrap items-center gap-3 text-base text-status-danger">
            <span>La liste des patients n’a pas pu être lue.</span>
            <Button ref={reessayerPatients} type="button" variant="outline" onClick={() => void relirePatients()}>
              Réessayer
            </Button>
          </div>
        )}
        <RetourAction retour={feedback} zone="patient" className="mt-2" />
      </div>

      {manualDraft && selectedPatient && (
        <div className="bg-surface border border-border rounded-xl shadow-card p-4">
          <h2 className="mb-4 font-display text-lg font-semibold text-foreground">
            Nouveau brouillon praticien
          </h2>
          <SynthesePraticienEditor
            value={manualDraft}
            onChange={setManualDraft}
            onSave={onCreateManual}
            onCancel={() => setManualDraft(null)}
            saving={saving}
            saveLabel="Créer le brouillon"
          />
          <RetourAction retour={feedback} zone="brouillon" className="mt-3" />
        </div>
      )}

      {/* Liste des synthèses */}
      {selectedPatient && (
        <div className="bg-surface border border-border rounded-xl shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-display text-lg font-semibold text-foreground">
              Synthèses de {patient ? `${patient.prenom} ${patient.nom}` : selectedPatient}
              {!loading && !erreurSyntheses && (
                <span className="ml-2 text-muted-foreground font-normal">({syntheses.length})</span>
              )}
            </h2>
          </div>
          {loading ? (
            <div role="status" className="px-4 py-4 text-base text-muted-foreground">Chargement...</div>
          ) : erreurSyntheses ? (
            <div role="alert" className="flex flex-wrap items-center gap-3 px-4 py-4 text-base text-status-danger">
              <span>Les synthèses n’ont pas pu être lues. Ce n’est pas une absence de synthèse.</span>
              <Button ref={reessayerSyntheses} type="button" variant="outline" onClick={() => void relireSyntheses()}>
                Réessayer
              </Button>
            </div>
          ) : syntheses.length === 0 ? (
            <div className="px-4 py-4 text-base text-muted-foreground">Aucune synthèse pour ce patient.</div>
          ) : (
            <div className="divide-y divide-border">
              {syntheses.map(s => (
                <div key={s.idSynthese} className="px-4 py-3 flex flex-wrap gap-3 items-center justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_COLOR[s.statut] ?? 'bg-muted text-muted-foreground'}`}>
                      {STATUT_LABEL[s.statut] ?? s.statut}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(s.dateGeneration).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {estRedactionPraticien(s.modele) ? 'Rédaction praticien' : s.modele}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSelectedSynthese(s);
                      setManualDraft(null);
                      setEditedManual(s.statut === 'Brouillon_Praticien' || s.statut === 'Brouillon_IA' ? s.syntheseJson : null);
                      setManualDirty(false);
                      setNotes(s.notesPraticien ?? '');
                      setBookletHtml(null);
                      setBookletInfo(null);
                      setFeedback(null);
                    }}
                  >
                    Voir / gérer
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Détail synthèse sélectionnée */}
      {selectedSynthese && (
        <div className="bg-surface border border-border rounded-xl shadow-card p-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="min-w-0 break-all font-display text-lg font-semibold text-foreground">
              Synthèse {selectedSynthese.idSynthese}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_COLOR[selectedSynthese.statut] ?? 'bg-muted text-muted-foreground'}`}>
                {STATUT_LABEL[selectedSynthese.statut] ?? selectedSynthese.statut}
              </span>
            </h2>
            <Button type="button" variant="outline" onClick={() => { setSelectedSynthese(null); setEditedManual(null); setManualDirty(false); setBookletHtml(null); }}>
              Fermer
            </Button>
          </div>

          {/* Synthèse antérieure au retrait d'interprétation : elle a pu
              s'appuyer sur une mesure qui n'en était pas une, et elle reste la
              seule source du booklet patient et du courrier médecin. On ne la
              réécrit pas — on dit ce qu'elle vaut, avant que le praticien ne
              l'envoie. */}
          {selectedSynthese.avertissementMesureRetiree && (
            <p className="rounded-lg border border-status-danger/40 bg-status-danger/10 px-3 py-2 text-sm text-status-danger">
              {selectedSynthese.avertissementMesureRetiree}
            </p>
          )}

          {selectedSynthese.motifSuspecte && (
            <p role="alert" className="rounded-lg border border-status-danger/40 bg-status-danger/10 px-3 py-2 text-sm text-status-danger">
              {selectedSynthese.motifSuspecte}
            </p>
          )}

          {brouillonEditable && editedManual ? (
            <>
              <SynthesePraticienEditor
                key={selectedSynthese.idSynthese}
                limitesEditable={selectedSynthese.statut === 'Brouillon_IA'}
                value={editedManual}
                onChange={value => {
                  setEditedManual(value);
                  setManualDirty(true);
                }}
                onSave={onSaveManual}
                saving={saving}
              />
              {manualDirty && (
                <p className="text-sm text-status-warning">
                  Enregistrez les modifications avant de valider le brouillon.
                </p>
              )}
              <RetourAction retour={feedback} zone="edition" />
            </>
          ) : (
            <>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Résumé praticien</p>
                <p className="text-base text-foreground leading-relaxed">{selectedSynthese.syntheseJson.resume_praticien}</p>
              </div>

              {selectedSynthese.syntheseJson.axes_prioritaires?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Axes prioritaires</p>
                  <div className="flex flex-col gap-2">
                    {selectedSynthese.syntheseJson.axes_prioritaires.map((axe, i) => (
                      <div key={i} className="bg-muted border border-border rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base font-medium text-foreground">{axe.axe}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITE_COLOR[axe.niveau_priorite] ?? 'bg-muted text-muted-foreground'}`}>
                            {PRIORITE_LABEL[axe.niveau_priorite] ?? axe.niveau_priorite}
                          </span>
                        </div>
                        {axe.arguments?.length > 0 && (
                          <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                            {axe.arguments.map((a, j) => <li key={j}>{a}</li>)}
                          </ul>
                        )}
                        {/* SAISISSABLE DEPUIS TOUJOURS, JAMAIS RELU. L'éditeur
                            offre « Points à confirmer, un par ligne » sur chaque
                            axe, et cette vue n'en rendait rien : ce que le
                            praticien écrivait pour préparer son entretien ne lui
                            revenait plus une fois l'édition fermée.

                            AUCUNE FUITE OUVERTE ICI. Le field-filter classe ce
                            champ « praticien (détaillé) + médecin », au même
                            rang que `questions_entretien` — et le praticien EST
                            le destinataire de cet écran. La projection PATIENT
                            n'a pas ces blocs dans son TYPE (`BilanPatient`), et
                            `bilanPatient.test.ts` échoue si l'un d'eux y
                            reparaît : la garde opposable est ailleurs, elle
                            n'est pas l'absence d'affichage ici. */}
                        {axe.points_a_confirmer?.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">À confirmer en entretien</p>
                            <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                              {axe.points_a_confirmer.map((p, j) => <li key={j}>{p}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedSynthese.syntheseJson.points_de_vigilance?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Points de vigilance</p>
                  <ul className="text-base text-foreground list-disc pl-4 space-y-0.5">
                    {selectedSynthese.syntheseJson.points_de_vigilance.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
              )}

              {/* Même motif que `points_a_confirmer` ci-dessus : saisissable
                  dans l'éditeur (« Questions pour la consultation »), jamais
                  réaffiché en lecture. Le field-filter le réserve au praticien
                  SEUL — plus étroit que les axes, qui vont aussi au médecin. */}
              {selectedSynthese.syntheseJson.questions_entretien?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Questions pour la consultation</p>
                  <ul className="text-base text-foreground list-disc pl-4 space-y-0.5">
                    {selectedSynthese.syntheseJson.questions_entretien.map((q, i) => <li key={i}>{q}</li>)}
                  </ul>
                </div>
              )}

              <p className="text-xs text-muted-foreground italic">{selectedSynthese.syntheseJson.limites}</p>
            </>
          )}

          {/* [[D-513]] §3 et §6 : la restitution biologique, réservée au cockpit
              praticien. Lecture seule ; aucune sortie ne la reprend. */}
          {(Boolean(selectedSynthese.syntheseJson.resume_biologie_praticien?.trim())
            || (selectedSynthese.syntheseJson.points_de_vigilance_biologie?.length ?? 0) > 0) && (
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Biologie — réservé au praticien</p>
              {selectedSynthese.syntheseJson.resume_biologie_praticien?.trim() && (
                <p className="text-base text-foreground leading-relaxed">{selectedSynthese.syntheseJson.resume_biologie_praticien}</p>
              )}
              {(selectedSynthese.syntheseJson.points_de_vigilance_biologie?.length ?? 0) > 0 && (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-2 mb-1">Points de vigilance biologiques</p>
                  <ul className="text-base text-foreground list-disc pl-4 space-y-0.5">
                    {selectedSynthese.syntheseJson.points_de_vigilance_biologie?.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Ces éléments n’entrent ni au document du médecin, ni au portail du patient, ni à l’export du dossier.
              </p>
            </div>
          )}

          {/* Actions validation */}
          {(selectedSynthese.statut === 'Brouillon_IA' || selectedSynthese.statut === 'Brouillon_Praticien') && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                onClick={() => onAction(selectedSynthese.idSynthese, 'valider')}
                disabled={saving || validationBrouillonBloquee}
              >
                {saving ? '...' : 'Valider la synthèse'}
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => onAction(selectedSynthese.idSynthese, 'rejeter')}
                disabled={saving}
              >
                {saving ? '...' : 'Rejeter'}
              </Button>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onResetSynthese}
              disabled={saving || sending}
              className="inline-flex items-center gap-2"
            >
              <Trash2 size={16} strokeWidth={TRAIT_ICONE} aria-hidden="true" />
              {saving ? 'Effacement...' : 'Vider la synthèse'}
            </Button>
            <RetourAction retour={feedback} zone="actions" className="basis-full" />
          </div>

          {/* Notes praticien */}
          {(selectedSynthese.statut === 'Validee_Praticien' || selectedSynthese.statut === 'Corrigee_Praticien') && (
            <div className="pt-2 border-t border-border flex flex-col gap-2">
              <label htmlFor="synthese-note-praticien" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Note / correction praticien</label>
              <textarea
                id="synthese-note-praticien"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Ajoutez une note ou une correction à inclure dans le booklet..."
                className={`${inputCls} resize-y`}
              />
              <Button type="button" variant="outline" onClick={() => onAction(selectedSynthese.idSynthese, 'annoter')} disabled={saving} className="self-start">
                {saving ? '...' : 'Enregistrer la note'}
              </Button>
              <RetourAction retour={feedback} zone="note" />
            </div>
          )}

          {/* Booklet */}
          {(selectedSynthese.statut === 'Validee_Praticien' || selectedSynthese.statut === 'Corrigee_Praticien') && (
            <div className="pt-2 border-t border-border flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-foreground">Booklet patient</h3>
              <Button
                type="button"
                variant="outline"
                onClick={() => onLoadBooklet(selectedSynthese.idSynthese)}
                disabled={loadingBooklet}
                className="self-start"
              >
                {loadingBooklet ? 'Préparation...' : 'Prévisualiser le booklet'}
              </Button>

              {bookletHtml && (
                <div className="flex flex-col gap-3">
                  {bookletInfo?.dejaEnvoye && (
                    <div className="text-xs bg-status-warning/10 border border-status-warning/30 rounded-lg px-3 py-2 text-status-warning">
                      Booklet déjà envoyé à {bookletInfo.emailMasque ?? 'patient'}.
                    </div>
                  )}
                  <div className="border border-border rounded-lg overflow-hidden" style={{ height: 480 }}>
                    <iframe srcDoc={bookletHtml} title="Prévisualisation booklet" className="w-full h-full" sandbox="allow-same-origin" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="flex min-h-11 items-center gap-2 text-sm text-foreground cursor-pointer">
                      <input type="checkbox" checked={relectureConfirmee} onChange={e => setRelectureConfirmee(e.target.checked)} />
                      J&apos;ai relu et validé le booklet ci-dessus avant envoi au patient.
                    </label>
                    {bookletInfo?.dejaEnvoye && (
                      <label className="flex min-h-11 items-center gap-2 text-sm text-status-warning cursor-pointer">
                        <input type="checkbox" checked={forceSend} onChange={e => setForceSend(e.target.checked)} />
                        Confirmer le renvoi (déjà envoyé précédemment).
                      </label>
                    )}
                    {registreATrancher !== null && (
                      <label className="flex min-h-11 items-start gap-2 text-sm text-status-warning cursor-pointer">
                        <input
                          type="checkbox"
                          checked={confirmerRegistre}
                          onChange={e => setConfirmerRegistre(e.target.checked)}
                          className="mt-1"
                        />
                        <span>
                          Envoyer tel quel malgré le mot{' '}
                          <strong>« {registreATrancher} »</strong> dans le texte lu par le patient.
                          Ce texte est lu seul, souvent avant la consultation : reformulez-le si vous
                          le pouvez, ou cochez pour l&apos;assumer.
                        </span>
                      </label>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        onClick={() => onSend(selectedSynthese.idSynthese)}
                        disabled={sending || !relectureConfirmee}
                      >
                        {sending ? 'Envoi en cours...' : 'Envoyer au patient'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={onClearBooklet}
                        disabled={sending}
                        className="inline-flex items-center gap-2"
                      >
                        <Trash2 size={16} strokeWidth={TRAIT_ICONE} aria-hidden="true" />
                        Effacer le booklet affiché
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              <RetourAction retour={feedback} zone="booklet" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
