'use client';

import { useCallback, useEffect, useState } from 'react';
import { PatientButton } from '@/components/patient/ui/PatientButton';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { PatientField, patientInputClassName } from '@/components/patient/ui/PatientField';
import { PatientInlineMessage } from '@/components/patient/ui/PatientInlineMessage';
import { PatientPageHeader } from '@/components/patient/ui/PatientPageHeader';
import { LONGUEUR_MAX_DESACCORD } from '@/lib/praticien/syntheseComprehension';
import type { PortailComprehensionResponse } from '@/app/api/portail/comprehension/route';

// « Ce que j'ai compris de vous » (Alliance 6.0-A, LOT-04) — surface PATIENT.
//
// Le patient LIT la synthèse publiée par son praticien, et peut dire « ce n'est
// pas exactement ça ». Rien d'autre : ni note, ni pouce, ni échelle d'accord.
// Une contestation n'est pas une évaluation — la graduer en ferait un score sur
// la parole du praticien, et un décompte sur celle du patient.
//
// LE DÉSACCORD NE SE RETIRE PAS, et l'écran le dit AVANT le geste plutôt que
// de le découvrir après : c'est la contrepartie honnête d'un objet qu'on ne
// peut pas effacer. Aucun bouton « annuler », aucun bouton « supprimer » —
// changer d'avis, c'est en déposer un autre.
//
// La soumission passe par la SESSION PORTAIL (cookie implicite) — aucun
// identifiant patient côté client. Même convention que `CeQuiCompteForm`.

type Etat =
  | { phase: 'chargement' }
  | { phase: 'erreur'; message: string }
  | { phase: 'pret'; donnees: Extract<PortailComprehensionResponse, { synthese: unknown }> };

/** Date lisible en français, ou `null` — jamais comblée par autre chose. */
function dateLisible(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function ComprehensionView() {
  const [etat, setEtat] = useState<Etat>({ phase: 'chargement' });
  const [ouvertureFormulaire, setOuvertureFormulaire] = useState(false);
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreurEnvoi, setErreurEnvoi] = useState('');
  const [depose, setDepose] = useState(false);

  const charger = useCallback(async () => {
    try {
      const res = await fetch('/api/portail/comprehension');
      const data = (await res.json()) as PortailComprehensionResponse;
      if (res.ok && data.ok && 'synthese' in data) {
        setEtat({ phase: 'pret', donnees: data });
      } else {
        setEtat({
          phase: 'erreur',
          message:
            (!data.ok && data.error) || 'Cette page n’a pas pu être chargée. Réessayez plus tard.',
        });
      }
    } catch {
      setEtat({ phase: 'erreur', message: 'Erreur réseau. Réessayez plus tard.' });
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  // Le dépassement s'AFFICHE, il ne bloque pas : le bouton reste actif, la
  // requête part, et c'est la route qui refuse avec son message. Désactiver
  // l'envoi ici priverait le patient de la seule explication existante.
  const tropLong = texte.length > LONGUEUR_MAX_DESACCORD;

  const contester = useCallback(async () => {
    if (etat.phase !== 'pret' || !etat.donnees.synthese) return;
    setEnvoi(true);
    setErreurEnvoi('');
    try {
      const res = await fetch('/api/portail/comprehension', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        // Le corps ne porte que la version visée et, s'il y en a un, le texte.
        // Pas d'identifiant : la session le dit, et la route ne lirait pas
        // celui-ci de toute façon.
        body: JSON.stringify({
          idSynthese: etat.donnees.synthese.id,
          texte: texte.trim() || null,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (res.ok && data.ok) {
        setTexte('');
        setOuvertureFormulaire(false);
        setDepose(true);
        await charger();
      } else {
        // LE CHAMP N'EST PAS VIDÉ SUR ERREUR : la session du portail dure 12 h,
        // un 401 peut donc tomber sur un texte tout juste rédigé. Ce n'est pas
        // une suite de clics à refaire, c'est une parole — l'effacer serait la
        // perdre.
        setErreurEnvoi(data.error ?? 'Votre message n’a pas pu être enregistré.');
      }
    } catch {
      setErreurEnvoi('Erreur réseau. Réessayez — votre texte est conservé ici.');
    } finally {
      setEnvoi(false);
    }
  }, [etat, texte, charger]);

  if (etat.phase === 'chargement') {
    return (
      <PatientCard className="space-y-4">
        <PatientPageHeader title="Ce que votre praticien a compris de vous" />
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </PatientCard>
    );
  }

  if (etat.phase === 'erreur') {
    return (
      <PatientCard className="space-y-4">
        <PatientPageHeader title="Ce que votre praticien a compris de vous" />
        <PatientInlineMessage tone="error">{etat.message}</PatientInlineMessage>
      </PatientCard>
    );
  }

  const { synthese, desaccords } = etat.donnees;

  return (
    <div className="space-y-4">
      <PatientCard className="space-y-5">
        <PatientPageHeader
          title="Ce que votre praticien a compris de vous"
          subtitle="C’est sa compréhension, écrite avec ses mots. Si elle ne correspond pas à ce que vous vouliez dire, dites-le : c’est utile."
        />

        {/* SILENCE ≠ RÉPONSE (`DC-24`) : l'absence de synthèse se dit comme une
            absence, jamais comme un « rien à signaler ». */}
        {!synthese ? (
          <PatientInlineMessage tone="info">
            Votre praticien n’a encore rien publié ici. Cela ne veut rien dire de plus : il n’a
            simplement pas encore écrit cette page.
          </PatientInlineMessage>
        ) : (
          <>
            <div className="space-y-2">
              {dateLisible(synthese.redigeeLe ?? synthese.publieeLe) && (
                <p className="text-xs text-muted-foreground">
                  Écrit le {dateLisible(synthese.redigeeLe ?? synthese.publieeLe)}
                </p>
              )}
              {/* `whitespace-pre-wrap` : le texte du praticien est rendu TEL
                  QU'IL L'A ÉCRIT, retours à la ligne compris. Le reformater
                  serait déjà le réécrire. */}
              <p className="whitespace-pre-wrap text-base leading-relaxed">{synthese.texte}</p>
            </div>

            {depose && (
              <PatientInlineMessage tone="success">
                C’est transmis. Votre praticien le verra tel que vous l’avez écrit.
              </PatientInlineMessage>
            )}

            {!ouvertureFormulaire ? (
              <PatientButton
                type="button"
                variant="neutral"
                onClick={() => {
                  setOuvertureFormulaire(true);
                  setDepose(false);
                }}
                className="w-full"
              >
                Ce n’est pas exactement ça
              </PatientButton>
            ) : (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void contester();
                }}
              >
                <PatientField
                  label="Ce qui ne correspond pas"
                  suffixe="facultatif — vous pouvez envoyer sans rien écrire"
                >
                  {/* AUCUN `maxLength` : il ferait couper le navigateur en
                      silence. La borne est opposée par la route, en refus, avec
                      un message que le patient lit et un texte qui reste à
                      l'écran. Motif complet : `CeQuiCompteForm`. */}
                  <textarea
                    value={texte}
                    onChange={(e) => setTexte(e.target.value)}
                    rows={6}
                    placeholder="Ce que je voulais dire, c’est plutôt…"
                    aria-label="Ce qui ne correspond pas"
                    aria-describedby="desaccord-compteur"
                    className={patientInputClassName}
                  />
                  <p
                    id="desaccord-compteur"
                    className={`mt-1 text-xs ${tropLong ? 'text-status-warning' : 'text-muted-foreground'}`}
                  >
                    {texte.length} / {LONGUEUR_MAX_DESACCORD} caractères
                    {tropLong && ' — au-delà de la limite : raccourcissez avant d’envoyer.'}
                  </p>
                </PatientField>

                <PatientInlineMessage tone="info">
                  Ce message reste dans votre dossier et ne s’efface pas. Si vous changez d’avis,
                  vous pourrez en écrire un autre.
                </PatientInlineMessage>

                {erreurEnvoi && (
                  <PatientInlineMessage tone="error">{erreurEnvoi}</PatientInlineMessage>
                )}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <PatientButton
                    type="submit"
                    variant="primary"
                    loading={envoi}
                    loadingLabel="Envoi…"
                    className="w-full"
                  >
                    Envoyer
                  </PatientButton>
                  <PatientButton
                    type="button"
                    variant="neutral"
                    onClick={() => {
                      setOuvertureFormulaire(false);
                      setErreurEnvoi('');
                    }}
                    className="w-full"
                  >
                    Annuler
                  </PatientButton>
                </div>
              </form>
            )}
          </>
        )}
      </PatientCard>

      {/* Les messages déjà envoyés — y compris ceux qui visaient une version
          depuis réécrite. Aucun décompte, aucun état affiché : « 2 désaccords »
          ou « en attente de réponse » transformeraient une parole en dossier de
          réclamation. La liste dit ce qui a été dit, et quand. */}
      {desaccords.length > 0 && (
        <PatientCard className="space-y-3">
          <h2 className="text-sm font-medium">Ce que vous avez déjà signalé</h2>
          <ul className="space-y-3">
            {desaccords.map((desaccord) => (
              <li key={desaccord.id} className="border-l-2 border-border pl-3">
                <p className="text-xs text-muted-foreground">
                  {dateLisible(desaccord.exprimeLe ?? desaccord.creeLe)}
                </p>
                {desaccord.texte ? (
                  <p className="whitespace-pre-wrap text-sm">{desaccord.texte}</p>
                ) : (
                  <p className="text-sm italic text-muted-foreground">
                    Vous avez signalé que ce n’était pas exactement ça, sans ajouter de texte.
                  </p>
                )}
              </li>
            ))}
          </ul>
        </PatientCard>
      )}
    </div>
  );
}
