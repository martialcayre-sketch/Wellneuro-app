'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { PatientsPgApiResponse } from '@/app/api/praticien/patients-pg/route';
import {
  assemblerDocument,
  renderDocumentHtml,
  MODELE_SUIVI_21J,
  type Bloc,
  type Destinataire,
} from '@/lib/documents';
import { DocumentComposer } from '@/components/patient-cockpit/DocumentComposer';
import type { ImpressionDocumentMedecinResponse } from '@/app/api/praticien/documents/medecin/impression/route';

// Montage praticien de la composition documentaire C3 (LOT-05). Page dédiée
// `/dashboard/documents`. Sélectionne une synthèse VALIDÉE, compose côté serveur
// (route `GET /api/praticien/documents`), affiche la vue deux colonnes
// (DocumentComposer), l'aperçu imprimable par destinataire, et réutilise l'envoi
// booklet existant pour le patient. Aucune migration ; frontière de données tenue
// par le domaine (field-filter). 100 % français.

type SyntheseRecord = { idSynthese: string; statut: string; dateValidation: string | null };

type DocumentApiResponse = {
  ok: boolean;
  patientNom: string;
  dateDocument: string;
  statut: string;
  blocs: Bloc[];
  portailDocumentMedecinOuvert?: boolean;
  error?: string;
};

const STATUTS_VALIDES = new Set(['Validee_Praticien', 'Corrigee_Praticien']);
const DESTINATAIRES: Destinataire[] = ['patient', 'medecin', 'praticien'];
const DESTINATAIRE_LABELS: Record<Destinataire, string> = {
  patient: 'Patient',
  medecin: 'Médecin traitant',
  praticien: 'Praticien',
};

const inputCls = 'bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground';
const btnBase = 'min-h-11 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60';

export function DocumentsPanel({ initialPatientId = '' }: { initialPatientId?: string } = {}) {
  const [patients, setPatients] = useState<PatientsPgApiResponse['patients']>([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [syntheses, setSyntheses] = useState<SyntheseRecord[]>([]);
  const [selectedIdSynthese, setSelectedIdSynthese] = useState('');
  const [doc, setDoc] = useState<DocumentApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [destinataireApercu, setDestinataireApercu] = useState<Destinataire>('patient');
  const [relectureConfirmee, setRelectureConfirmee] = useState(false);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const apercuRef = useRef<HTMLIFrameElement>(null);
  // Document pour le médecin ([[D-307]] §2, F38) : l'impression se confirme,
  // s'enregistre côté serveur, puis imprime l'instantané que le serveur a
  // composé et conservé — pas l'aperçu du navigateur.
  const [confirmationImpression, setConfirmationImpression] = useState(false);
  const [impressionEnCours, setImpressionEnCours] = useState(false);
  const [htmlImprime, setHtmlImprime] = useState<string | null>(null);
  const imprimerAuChargement = useRef(false);
  // La sélection AU RENDU : une réponse d'impression arrivée après un
  // changement de synthèse ou de destinataire est ignorée — sinon le document
  // d'un dossier s'imprimerait sous la sélection d'un autre (revue wn-reviewer).
  const selectionCourante = useRef({ idSynthese: selectedIdSynthese, destinataire: destinataireApercu });
  selectionCourante.current = { idSynthese: selectedIdSynthese, destinataire: destinataireApercu };

  useEffect(() => {
    fetch('/api/praticien/patients-pg')
      .then((r) => r.json())
      .then((d: PatientsPgApiResponse) => {
        const liste = d.patients ?? [];
        setPatients(liste);
        // Continuité `?idPatient=` (audit 2026-09-02) : pré-sélectionner le
        // dossier transmis par l'URL — seulement s'il existe dans la liste du
        // praticien, jamais sur la foi du paramètre seul.
        if (initialPatientId && liste.some((p) => p.idPatient === initialPatientId)) {
          void onSelectPatient(initialPatientId);
        }
      })
      .catch(() => {});
    // `initialPatientId` vient de l'URL au montage : une seule lecture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSelectPatient(idPatient: string) {
    setSelectedPatient(idPatient);
    setSelectedIdSynthese('');
    setDoc(null);
    setConfirmationImpression(false);
    setHtmlImprime(null);
    setFeedback(null);
    setSyntheses([]);
    if (!idPatient) return;
    try {
      const r = await fetch(`/api/praticien/synthese?idPatient=${encodeURIComponent(idPatient)}`);
      const d = (await r.json()) as { syntheses: SyntheseRecord[] };
      setSyntheses((d.syntheses ?? []).filter((s) => STATUTS_VALIDES.has(s.statut)));
    } catch {
      setSyntheses([]);
    }
  }

  async function onSelectSynthese(idSynthese: string) {
    setSelectedIdSynthese(idSynthese);
    setDoc(null);
    setConfirmationImpression(false);
    setHtmlImprime(null);
    setFeedback(null);
    setRelectureConfirmee(false);
    if (!idSynthese) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/praticien/documents?idSynthese=${encodeURIComponent(idSynthese)}`);
      const d = (await r.json()) as DocumentApiResponse;
      if (!r.ok || !d.ok) {
        setFeedback({ ok: false, msg: d.error ?? 'Composition impossible.' });
        return;
      }
      setDoc(d);
    } catch {
      setFeedback({ ok: false, msg: 'Erreur réseau lors de la composition.' });
    } finally {
      setLoading(false);
    }
  }

  // `renderDocumentHtml` lève si un contenu médecin emploie un registre
  // prescriptif (garde de vocabulaire, E15) : capturé ici pour un message
  // actionnable plutôt qu'un aperçu qui plante.
  const apercu = useMemo(() => {
    if (!doc) return { html: null as string | null, erreur: null as string | null };
    const composite = assemblerDocument({ modele: MODELE_SUIVI_21J, patientId: 'apercu', blocs: doc.blocs });
    try {
      const html = renderDocumentHtml(composite, destinataireApercu, {
        patientNom: doc.patientNom,
        dateDocument: doc.dateDocument,
      });
      return { html, erreur: null as string | null };
    } catch (e) {
      return { html: null as string | null, erreur: e instanceof Error ? e.message : 'Aperçu indisponible.' };
    }
  }, [doc, destinataireApercu]);

  function onImprimer() {
    if (destinataireApercu === 'medecin') {
      setConfirmationImpression(true);
      return;
    }
    apercuRef.current?.contentWindow?.print();
  }

  function choisirDestinataire(d: Destinataire) {
    setDestinataireApercu(d);
    setConfirmationImpression(false);
    setHtmlImprime(null);
  }

  async function onConfirmerImpressionMedecin() {
    const idSynthese = selectedIdSynthese;
    if (!idSynthese) return;
    setImpressionEnCours(true);
    setFeedback(null);
    try {
      const r = await fetch('/api/praticien/documents/medecin/impression', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idSynthese }),
      });
      const d = (await r.json()) as ImpressionDocumentMedecinResponse;
      const memeSelection =
        selectionCourante.current.idSynthese === idSynthese && selectionCourante.current.destinataire === 'medecin';
      if (r.ok && d.ok && !memeSelection) {
        // Enregistrée, mais l'écran montre désormais autre chose : on le dit,
        // on n'imprime pas.
        setConfirmationImpression(false);
        setFeedback({ ok: true, msg: 'Impression enregistrée au Fil de correspondance ; la sélection a changé, rien n’a été imprimé.' });
        return;
      }
      if (!r.ok || !d.ok) {
        setFeedback({ ok: false, msg: ('error' in d && d.error) || 'Impression impossible.' });
        return;
      }
      setConfirmationImpression(false);
      setFeedback({ ok: true, msg: 'Impression enregistrée : une ligne datée est ajoutée au Fil de correspondance.' });
      if (d.html === (htmlImprime ?? apercu.html)) {
        apercuRef.current?.contentWindow?.print();
      } else {
        // L'iframe se recharge sur l'instantané, puis imprime (`onLoad`).
        imprimerAuChargement.current = true;
        setHtmlImprime(d.html);
      }
    } catch {
      setFeedback({ ok: false, msg: 'Erreur réseau lors de l’impression.' });
    } finally {
      setImpressionEnCours(false);
    }
  }

  function onApercuCharge() {
    if (!imprimerAuChargement.current) return;
    imprimerAuChargement.current = false;
    apercuRef.current?.contentWindow?.print();
  }

  async function onEnvoyerPatient() {
    if (!selectedIdSynthese || !relectureConfirmee) return;
    setSending(true);
    setFeedback(null);
    try {
      const r = await fetch('/api/praticien/booklet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idSynthese: selectedIdSynthese, relectureConfirmee: true }),
      });
      const d = (await r.json()) as { success?: boolean; needsConfirmation?: boolean; reason?: string; terme?: string; warning?: string; error?: string };
      if (d.needsConfirmation) {
        // Cet écran ne tranche NI le renvoi NI le registre : il renvoie vers
        // celui qui porte la prévisualisation, parce qu'une décision sur un
        // mot du texte patient se prend en regardant le texte. Il doit en
        // revanche dire LEQUEL des deux est en jeu — le message unique
        // « déjà envoyé » envoyait chercher la mauvaise case.
        const msgDefaut = d.reason === 'REGISTRE_ANXIOGENE'
          ? `Le texte patient emploie « ${d.terme ?? 'un mot signalé'} ». Relisez-le depuis l’écran Synthèse & Booklet, où vous pourrez le reformuler ou l’assumer.`
          : 'Document déjà envoyé — confirmez le renvoi depuis l’écran Synthèse & Booklet.';
        setFeedback({ ok: false, msg: d.warning ?? msgDefaut });
      } else if (d.success) {
        setFeedback({ ok: true, msg: 'Document envoyé au patient.' });
      } else {
        setFeedback({ ok: false, msg: d.error ?? 'Envoi impossible.' });
      }
    } catch {
      setFeedback({ ok: false, msg: 'Erreur réseau lors de l’envoi.' });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Sélection patient + synthèse validée */}
      <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3 shadow-card">
        <h3 className="font-display text-lg font-semibold text-foreground">Patient et synthèse validée</h3>
        <div className="flex flex-wrap gap-3">
          <select value={selectedPatient} onChange={(e) => onSelectPatient(e.target.value)} className={`${inputCls} w-full sm:w-80`}>
            <option value="">Sélectionner un patient</option>
            {patients.map((p) => (
              <option key={p.idPatient} value={p.idPatient}>{`${p.prenom} ${p.nom} — ${p.email}`}</option>
            ))}
          </select>
          <select
            value={selectedIdSynthese}
            onChange={(e) => onSelectSynthese(e.target.value)}
            disabled={!selectedPatient}
            className={`${inputCls} w-full sm:w-80`}
          >
            <option value="">Sélectionner une synthèse validée</option>
            {syntheses.map((s) => (
              <option key={s.idSynthese} value={s.idSynthese}>
                {`${s.idSynthese.slice(0, 10)}… — ${s.statut === 'Corrigee_Praticien' ? 'Corrigée' : 'Validée'}`}
              </option>
            ))}
          </select>
        </div>
        {selectedPatient && syntheses.length === 0 && (
          <p className="text-base text-muted-foreground">
            Aucune synthèse validée pour ce patient. Validez une synthèse dans « Synthèse IA & Booklet » d’abord.
          </p>
        )}
        {feedback && <p className={`text-base ${feedback.ok ? 'text-status-success' : 'text-status-danger'}`}>{feedback.msg}</p>}
      </div>

      {loading && <p className="text-sm text-muted-foreground">Composition en cours…</p>}

      {doc && (
        <>
          {/* Vue de composition deux colonnes */}
          <div className="bg-surface border border-border rounded-xl p-4 shadow-card">
            <DocumentComposer modele={MODELE_SUIVI_21J} blocs={doc.blocs} />
          </div>

          {/* Aperçu imprimable par destinataire */}
          <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-lg font-semibold text-foreground">Aperçu imprimable</h3>
              <div role="group" aria-label="Destinataire de l’aperçu imprimable" className="flex flex-wrap gap-2">
                {DESTINATAIRES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={destinataireApercu === d}
                    onClick={() => choisirDestinataire(d)}
                    disabled={impressionEnCours}
                    className={`${btnBase} border ${destinataireApercu === d ? 'bg-foreground text-surface' : 'bg-surface text-foreground'}`}
                  >
                    {DESTINATAIRE_LABELS[d]}
                  </button>
                ))}
              </div>
            </div>
            {apercu.erreur && (
              <p className="text-sm text-status-danger" role="alert">{apercu.erreur}</p>
            )}
            <iframe
              ref={apercuRef}
              title={`Aperçu ${DESTINATAIRE_LABELS[destinataireApercu]}`}
              srcDoc={htmlImprime ?? apercu.html ?? ''}
              onLoad={onApercuCharge}
              sandbox="allow-same-origin allow-modals"
              className="w-full h-[420px] border border-border rounded-lg bg-surface"
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onImprimer}
                disabled={impressionEnCours}
                className={`${btnBase} border bg-surface text-foreground`}
              >
                Imprimer cet aperçu
              </button>
              {destinataireApercu === 'patient' && (
                <>
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={relectureConfirmee}
                      onChange={(e) => setRelectureConfirmee(e.target.checked)}
                    />
                    J’ai relu et je valide l’envoi au patient
                  </label>
                  <button
                    type="button"
                    onClick={onEnvoyerPatient}
                    disabled={!relectureConfirmee || sending}
                    className={`${btnBase} bg-status-success text-white`}
                  >
                    {sending ? 'Envoi…' : 'Envoyer au patient'}
                  </button>
                </>
              )}
            </div>
            {destinataireApercu === 'medecin' && confirmationImpression && (
              <div role="group" aria-label="Confirmer l’impression" className="flex flex-col gap-2 rounded-lg border border-border p-3">
                <p className="text-sm text-foreground">
                  Imprimer le document pour le médecin ? L’impression est datée dans le Fil de correspondance.
                  {doc.portailDocumentMedecinOuvert
                    && ' Le patient pourra le télécharger dans son espace pour le remettre lui-même.'}{' '}
                  Wellneuro n’envoie ce document à personne.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void onConfirmerImpressionMedecin()}
                    disabled={impressionEnCours}
                    className={`${btnBase} bg-foreground text-surface`}
                  >
                    {impressionEnCours ? 'Enregistrement…' : 'Confirmer et imprimer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmationImpression(false)}
                    disabled={impressionEnCours}
                    className={`${btnBase} border bg-surface text-foreground`}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Le rendu médecin et praticien s’imprime en HTML (PDF différé). L’envoi patient réutilise le canal
              e-mail existant (booklet).
            </p>
          </div>
        </>
      )}
    </div>
  );
}
