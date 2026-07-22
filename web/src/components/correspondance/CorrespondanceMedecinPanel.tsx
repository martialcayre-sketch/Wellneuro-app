'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  CorrespondanceExposee,
  CorrespondanceMedecinApiResponse,
} from '@/app/api/praticien/correspondance-medecin/route';
import { LONGUEUR_MAX_MEDECIN_LIBELLE, LONGUEUR_MAX_TEXTE } from '@/lib/praticien/correspondanceMedecin';

// Fil de correspondance médecin (C3 LOT-06, V1 = transcription praticien) —
// surface praticien, onglet « Correspondance » de la fiche patient.
//
// L'application n'envoie rien au médecin et ne lui ouvre aucun accès : le
// praticien consigne un envoi fait par ses canaux habituels, et transcrit une
// réponse reçue. La consignation est datée du jour PAR LA BASE — l'écran le
// dit, et ne transmet jamais de date de consignation.
//
// Le refus qui fait foi (dossier clos, validation) est celui de la ROUTE
// (#181) : la désactivation du formulaire ici est une courtoisie d'écran, et
// le message d'erreur du serveur est affiché tel quel s'il survient.

type EtatFil = 'chargement' | 'chargee' | 'erreur';
type EtatEnvoi = 'repos' | 'envoi' | 'erreur';
type Sens = 'sortant' | 'entrant';

type SyntheseReferencable = { idSynthese: string; dateGeneration: string; statut: string };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function CorrespondanceMedecinPanel({ idPatient }: { idPatient: string }) {
  const [etat, setEtat] = useState<EtatFil>('chargement');
  const [erreur, setErreur] = useState('');
  const [correspondances, setCorrespondances] = useState<CorrespondanceExposee[]>([]);
  const [accepteConsignation, setAccepteConsignation] = useState(true);
  const [partage, setPartage] = useState<string | null>(null);

  const [sens, setSens] = useState<Sens>('sortant');
  const [medecinLibelle, setMedecinLibelle] = useState('');
  const [texte, setTexte] = useState('');
  const [echangeLe, setEchangeLe] = useState('');
  const [idSynthese, setIdSynthese] = useState('');
  const [syntheses, setSyntheses] = useState<SyntheseReferencable[]>([]);
  const [etatEnvoi, setEtatEnvoi] = useState<EtatEnvoi>('repos');
  const [erreurEnvoi, setErreurEnvoi] = useState('');

  const chargerFil = useCallback(async () => {
    setEtat('chargement');
    setErreur('');
    try {
      const reponse = await fetch(
        `/api/praticien/correspondance-medecin?idPatient=${encodeURIComponent(idPatient)}`,
      );
      const payload = (await reponse.json()) as CorrespondanceMedecinApiResponse;
      if (!reponse.ok || !payload.ok || !('correspondances' in payload)) {
        setErreur(('error' in payload && payload.error) || 'Le fil n’a pas pu être chargé.');
        setEtat('erreur');
        return;
      }
      setCorrespondances(payload.correspondances);
      setAccepteConsignation(payload.accepteConsignation);
      setPartage(payload.partageMedecinTraitant);
      setEtat('chargee');
    } catch {
      setErreur('Le fil n’a pas pu être chargé.');
      setEtat('erreur');
    }
  }, [idPatient]);

  useEffect(() => {
    void chargerFil();
  }, [chargerFil]);

  // Les synthèses référencables sont un confort : si leur lecture échoue, le
  // champ disparaît, la consignation reste possible sans référence.
  useEffect(() => {
    let annule = false;
    void (async () => {
      try {
        const reponse = await fetch(`/api/praticien/synthese?idPatient=${encodeURIComponent(idPatient)}`);
        const payload = (await reponse.json()) as { syntheses?: SyntheseReferencable[] };
        if (!annule && reponse.ok && Array.isArray(payload.syntheses)) {
          setSyntheses(
            payload.syntheses.map((synthese) => ({
              idSynthese: synthese.idSynthese,
              dateGeneration: synthese.dateGeneration,
              statut: synthese.statut,
            })),
          );
        }
      } catch {
        // Dégradation silencieuse voulue.
      }
    })();
    return () => {
      annule = true;
    };
  }, [idPatient]);

  const consigner = useCallback(async () => {
    if (medecinLibelle.trim().length === 0 || texte.trim().length === 0) return;
    setEtatEnvoi('envoi');
    setErreurEnvoi('');
    try {
      const reponse = await fetch('/api/praticien/correspondance-medecin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idPatient,
          sens,
          medecinLibelle,
          texte,
          idSynthese: idSynthese || null,
          echangeLe: echangeLe || null,
        }),
      });
      const payload = (await reponse.json()) as { ok: boolean; error?: string };
      if (!reponse.ok || !payload.ok) {
        setErreurEnvoi(payload.error ?? 'La consignation n’a pas pu être enregistrée.');
        setEtatEnvoi('erreur');
        return;
      }
      setMedecinLibelle('');
      setTexte('');
      setEchangeLe('');
      setIdSynthese('');
      setEtatEnvoi('repos');
      await chargerFil();
    } catch {
      setErreurEnvoi('La consignation n’a pas pu être enregistrée.');
      setEtatEnvoi('erreur');
    }
  }, [idPatient, sens, medecinLibelle, texte, idSynthese, echangeLe, chargerFil]);

  return (
    <section aria-labelledby="correspondance-medecin" className="rounded-xl border border-border bg-surface p-4">
      <h3 id="correspondance-medecin" className="text-sm font-semibold text-foreground">
        Correspondance avec le médecin traitant
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        L’application n’envoie rien au médecin et ne lui ouvre aucun accès. Vous consignez ici, en texte
        seul, les échanges faits par vos canaux habituels (courrier, e-mail du cabinet).
      </p>

      {etat === 'chargee' && (
        <p className="mt-2 text-xs text-muted-foreground">
          {partage === 'accorde'
            ? 'Partage avec le médecin traitant : accordé par le patient.'
            : 'Partage avec le médecin traitant : non accordé ou non exprimé — vérifiez les choix du patient.'}
        </p>
      )}

      {etat === 'chargement' && (
        <p role="status" className="mt-3 text-base text-muted-foreground">
          Chargement du fil&hellip;
        </p>
      )}

      {etat === 'erreur' && (
        // Un échec de lecture n'est JAMAIS présenté comme « aucune
        // correspondance » : ce serait une affirmation fausse sur le dossier.
        <div role="alert" className="mt-3 flex flex-col gap-3 rounded-lg border border-accent bg-status-warning/10 p-3 text-base text-status-warning">
          <span>{erreur}</span>
          <button
            type="button"
            onClick={() => void chargerFil()}
            className="min-h-9 self-start rounded-lg border border-accent px-3 py-1 text-xs font-medium text-solar-ink hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            Réessayer
          </button>
        </div>
      )}

      {etat === 'chargee' && correspondances.length === 0 && (
        <p className="mt-3 text-base text-muted-foreground">Aucune correspondance consignée pour ce patient.</p>
      )}

      {etat === 'chargee' && correspondances.length > 0 && (
        <ul className="mt-3 space-y-2">
          {correspondances.map((ligne) => (
            <li key={ligne.id} className="rounded-lg border border-border bg-surface p-3 text-base text-foreground">
              <p className="text-xs font-medium text-muted-foreground">
                {ligne.sens === 'sortant' ? 'Envoi consigné' : 'Réponse transcrite'} · {ligne.medecinLibelle}
              </p>
              <p className="mt-1 whitespace-pre-wrap">{ligne.texte}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Consigné le {formatDate(ligne.consigneLe)}
                {ligne.echangeLe ? ` · échange du ${formatDate(ligne.echangeLe)}` : ''}
                {ligne.idSynthese ? ' · synthèse référencée' : ''}
              </p>
            </li>
          ))}
        </ul>
      )}

      {etat === 'chargee' && (
        <div className="mt-4 border-t border-border pt-3">
          <h4 className="text-sm font-semibold text-foreground">Consigner un échange</h4>

          {!accepteConsignation && (
            <p role="status" className="mt-2 text-base text-muted-foreground">
              Le suivi de ce dossier est clôturé : la correspondance reste lisible, mais plus rien ne s’y
              consigne. Rouvrez le suivi pour transcrire un échange.
            </p>
          )}

          {accepteConsignation && (
            <>
              <fieldset className="mt-2">
                <legend className="text-xs font-medium text-foreground">Sens de l’échange</legend>
                <div className="mt-1 flex flex-wrap gap-3">
                  <label className="flex min-h-11 items-center gap-2 text-base text-foreground">
                    <input
                      type="radio"
                      name="sens-correspondance"
                      value="sortant"
                      checked={sens === 'sortant'}
                      onChange={() => setSens('sortant')}
                    />
                    J’ai envoyé un document au médecin
                  </label>
                  <label className="flex min-h-11 items-center gap-2 text-base text-foreground">
                    <input
                      type="radio"
                      name="sens-correspondance"
                      value="entrant"
                      checked={sens === 'entrant'}
                      onChange={() => setSens('entrant')}
                    />
                    Le médecin a répondu
                  </label>
                </div>
              </fieldset>

              <label htmlFor="correspondance-medecin-libelle" className="mt-3 block text-xs font-medium text-foreground">
                Médecin (désignation libre, sans adresse e-mail)
              </label>
              <input
                id="correspondance-medecin-libelle"
                type="text"
                value={medecinLibelle}
                onChange={(evenement) => setMedecinLibelle(evenement.target.value)}
                maxLength={LONGUEUR_MAX_MEDECIN_LIBELLE}
                placeholder="Dr Martin, médecin traitant"
                className="mt-1 w-full rounded-lg border border-border bg-surface p-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              />

              <label htmlFor="correspondance-texte" className="mt-3 block text-xs font-medium text-foreground">
                Texte de l’échange
              </label>
              <textarea
                id="correspondance-texte"
                value={texte}
                onChange={(evenement) => setTexte(evenement.target.value)}
                rows={4}
                maxLength={LONGUEUR_MAX_TEXTE}
                placeholder={
                  sens === 'sortant'
                    ? 'Ce qui a été transmis au médecin…'
                    : 'La réponse du médecin, transcrite fidèlement…'
                }
                className="mt-1 w-full rounded-lg border border-border bg-surface p-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              />

              <label htmlFor="correspondance-echange-le" className="mt-3 block text-xs font-medium text-foreground">
                Date de l’échange (facultative)
              </label>
              <input
                id="correspondance-echange-le"
                type="date"
                value={echangeLe}
                onChange={(evenement) => setEchangeLe(evenement.target.value)}
                className="mt-1 rounded-lg border border-border bg-surface p-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              />

              {syntheses.length > 0 && (
                <>
                  <label htmlFor="correspondance-synthese" className="mt-3 block text-xs font-medium text-foreground">
                    Synthèse concernée (facultatif)
                  </label>
                  <select
                    id="correspondance-synthese"
                    value={idSynthese}
                    onChange={(evenement) => setIdSynthese(evenement.target.value)}
                    className="mt-1 rounded-lg border border-border bg-surface p-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                  >
                    <option value="">Aucune</option>
                    {syntheses.map((synthese) => (
                      <option key={synthese.idSynthese} value={synthese.idSynthese}>
                        Synthèse du {formatDate(synthese.dateGeneration)} · {synthese.statut}
                      </option>
                    ))}
                  </select>
                </>
              )}

              {etatEnvoi === 'erreur' && (
                <p role="alert" className="mt-2 text-base text-foreground">
                  {erreurEnvoi}
                </p>
              )}

              {/* La consignation est datée du jour PAR LA BASE : aucun champ de
                  date de consignation n'existe, et c'est délibéré. */}
              <button
                type="button"
                onClick={() => void consigner()}
                disabled={
                  medecinLibelle.trim().length === 0 || texte.trim().length === 0 || etatEnvoi === 'envoi'
                }
                className="mt-3 min-h-11 rounded-lg border border-primary bg-primary/10 px-3 py-1 text-sm font-medium text-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                {etatEnvoi === 'envoi' ? 'Enregistrement…' : 'Consigner (daté d’aujourd’hui)'}
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
