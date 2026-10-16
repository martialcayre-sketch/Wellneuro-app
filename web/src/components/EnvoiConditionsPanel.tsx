'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type {
  ConditionsEnvoiResponse,
  ConditionsEnvoiResultat,
} from '@/app/api/praticien/conditions-utilisation/route';
import { Button } from '@/components/ui/Button';

/**
 * L'e-mail des conditions d'utilisation aux patients suivis ([[D-292]] §3) :
 * la liste des dossiers éligibles, l'aperçu de l'e-mail, puis un envoi
 * confirmé en une fois. Les dossiers servis sortent de la liste ; un envoi en
 * échec y reste.
 */
export function EnvoiConditionsPanel() {
  const [data, setData] = useState<ConditionsEnvoiResponse | null>(null);
  const [confirmation, setConfirmation] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [resultat, setResultat] = useState<ConditionsEnvoiResultat | null>(null);

  const charger = useCallback(async () => {
    try {
      const res = await fetch('/api/praticien/conditions-utilisation');
      setData((await res.json()) as ConditionsEnvoiResponse);
    } catch {
      setData({ ok: false, error: 'Erreur réseau. Rechargez la page.' });
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  // Un geste, plusieurs appels : la route accepte `parEnvoi` dossiers à la
  // fois. Chaque dossier est réservé côté serveur avant de partir — un lot
  // rejoué ne renvoie rien à qui a déjà reçu.
  const envoyer = async (idsPatient: string[], parEnvoi: number) => {
    setEnvoi(true);
    setResultat(null);
    const total = { envoyes: 0, echoues: 0, ignores: 0 };
    try {
      for (let i = 0; i < idsPatient.length; i += parEnvoi) {
        const res = await fetch('/api/praticien/conditions-utilisation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idsPatient: idsPatient.slice(i, i + parEnvoi) }),
        });
        const corps = (await res.json().catch(() => null)) as ConditionsEnvoiResultat | null;
        if (!corps?.ok) {
          const deja = total.envoyes > 0 ? ` ${total.envoyes} e-mail(s) étaient déjà partis.` : '';
          setResultat({
            ok: false,
            error: `${corps?.error ?? 'Erreur technique.'}${deja} Des e-mails ont pu partir : la liste ci-dessus est relue.`,
          });
          return;
        }
        total.envoyes += corps.envoyes;
        total.echoues += corps.echoues;
        total.ignores += corps.ignores;
      }
      setResultat({ ok: true, ...total });
    } catch {
      setResultat({
        ok: false,
        error: 'Connexion interrompue. Des e-mails ont pu partir : la liste ci-dessus est relue.',
      });
    } finally {
      setEnvoi(false);
      setConfirmation(false);
      await charger();
    }
  };

  if (!data) {
    return <div className="bg-surface rounded-xl border border-border p-5 animate-pulse h-32 shadow-card" />;
  }
  if (!data.ok) {
    return (
      <div className="bg-muted border border-border rounded-xl p-4 text-base text-muted-foreground">{data.error}</div>
    );
  }

  const n = data.eligibles.length;
  return (
    <div className="bg-surface text-surface-foreground rounded-xl border border-border p-4 shadow-card flex flex-col gap-4">
      {!data.ouvert ? (
        <p className="text-base text-muted-foreground">
          L’envoi demande le lien d’accès direct à l’espace patient, qui n’est pas ouvert.
        </p>
      ) : n === 0 ? (
        <p className="text-base text-muted-foreground">
          Aucun patient suivi n’attend l’e-mail des conditions d’utilisation.
        </p>
      ) : (
        <div>
          <p className="text-base text-foreground">
            {n === 1 ? '1 patient suivi' : `${n} patients suivis`} sans accusé des conditions d’utilisation
            en vigueur :
          </p>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {data.eligibles.map(p => (
              <li key={p.idPatient}>
                <Link href={`/dashboard/patients/${p.idPatient}`} className="text-sm text-foreground hover:underline">
                  {p.prenom} {p.nom}
                </Link>
              </li>
            ))}
          </ul>
          {data.tronque && (
            <p className="mt-2 text-xs text-muted-foreground">
              Liste limitée : d’autres dossiers peuvent attendre. Rechargez la page après l’envoi.
            </p>
          )}
        </div>
      )}

      <details className="rounded-lg border border-border">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-foreground">Aperçu de l’e-mail</summary>
        <div className="px-3 pb-3 text-sm">
          <p className="text-muted-foreground">Objet : {data.apercu.sujet}</p>
          <p className="text-muted-foreground">Réponses : à l’adresse du praticien du dossier.</p>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-foreground">{data.apercu.corps}</pre>
          <p className="mt-2 text-xs text-muted-foreground">
            Chaque patient reçoit son propre lien, valable 24 heures, qui ouvre la page des conditions.
          </p>
        </div>
      </details>

      {resultat &&
        (resultat.ok ? (
          <p role="status" className="text-sm text-foreground">
            {resultat.envoyes} envoyé{resultat.envoyes > 1 ? 's' : ''}
            {resultat.echoues > 0 && `, ${resultat.echoues} en échec (restés dans la liste)`}
            {resultat.ignores > 0 && `, ${resultat.ignores} sorti${resultat.ignores > 1 ? 's' : ''} de la liste entre-temps`}
            .
          </p>
        ) : (
          <p role="alert" className="text-sm text-status-danger">
            {resultat.error}
          </p>
        ))}

      {data.ouvert && n > 0 &&
        (confirmation ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-foreground">
              Envoyer l’e-mail à {n === 1 ? 'ce patient' : `ces ${n} patients`}, en une fois ?
            </p>
            <Button
              disabled={envoi}
              onClick={() => void envoyer(data.eligibles.map(p => p.idPatient), data.parEnvoi)}
            >
              {envoi ? 'Envoi…' : 'Confirmer l’envoi'}
            </Button>
            <Button variant="outline" disabled={envoi} onClick={() => setConfirmation(false)}>
              Annuler
            </Button>
          </div>
        ) : (
          <div>
            <Button onClick={() => setConfirmation(true)}>Envoyer l’e-mail…</Button>
          </div>
        ))}
    </div>
  );
}
