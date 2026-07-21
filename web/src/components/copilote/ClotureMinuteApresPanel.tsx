'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { Cloture, StatutEtape } from '@/lib/copilote/minuteApres';

// La minute d'après (SP-COP LOT-02) — surface praticien, LECTURE SEULE.
//
// L'écran montre où en est la chaîne « Relu → Validé pour diffusion → Envoyé »
// et ce qui la bloque. Il ne franchit aucune de ces étapes : chacune se pose là
// où elle vit déjà, et l'écran y renvoie. C'est le sens de « pré-remplit, mais
// n'envoie pas » — jusqu'au bout, aucun bouton d'ici ne fait partir un contenu.

const MARQUE_STATUT: Record<StatutEtape, { texte: string; classe: string }> = {
  faite: { texte: 'Fait', classe: 'border-emerald-300 bg-emerald-50 text-emerald-800' },
  a_faire: { texte: 'À faire', classe: 'border-accent bg-orange-50 text-orange-800' },
  caduque: { texte: 'Caduc', classe: 'border-accent bg-orange-50 text-orange-800' },
  indisponible: { texte: 'Sans objet', classe: 'border-border bg-muted text-muted-foreground' },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

type Etat = 'chargement' | 'chargee' | 'erreur';

export function ClotureMinuteApresPanel({ idPatient }: { idPatient: string }) {
  const [cloture, setCloture] = useState<Cloture | null>(null);
  const [etat, setEtat] = useState<Etat>('chargement');
  const [erreur, setErreur] = useState<string>('');

  const charger = useCallback(async () => {
    setEtat('chargement');
    try {
      const reponse = await fetch(`/api/praticien/copilote/cloture?idPatient=${encodeURIComponent(idPatient)}`);
      const payload = (await reponse.json()) as { ok: boolean; cloture?: Cloture; error?: string };
      if (!reponse.ok || !payload.ok || !payload.cloture) {
        setErreur(payload.error ?? 'L’état de clôture n’a pas pu être lu.');
        setEtat('erreur');
        return;
      }
      setCloture(payload.cloture);
      setEtat('chargee');
    } catch {
      setErreur('L’état de clôture n’a pas pu être lu.');
      setEtat('erreur');
    }
  }, [idPatient]);

  useEffect(() => {
    void charger();
  }, [charger]);

  if (etat === 'chargement') {
    return (
      <div
        id="panneau-cloture"
        role="status"
        className="rounded-xl border border-border bg-surface p-4 text-base text-muted-foreground"
      >
        Lecture de l’état de clôture&hellip;
      </div>
    );
  }

  if (etat === 'erreur' || !cloture) {
    // Un échec de lecture n'est jamais présenté comme « tout est prêt » : ce
    // serait une autorisation implicite à diffuser.
    return (
      <div
        id="panneau-cloture"
        role="alert"
        className="flex flex-col gap-3 rounded-xl border border-accent bg-orange-50 p-4 text-base text-orange-800"
      >
        <span>{erreur} Rien ne peut être diffusé tant que cet état n’a pas été relu.</span>
        <button
          type="button"
          onClick={() => void charger()}
          className="min-h-9 self-start rounded-lg border border-accent px-3 py-1 text-xs font-medium text-solar-ink hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <section
      id="panneau-cloture"
      aria-labelledby="cloture-titre"
      className="rounded-xl border border-border bg-surface p-4"
    >
      <h3 id="cloture-titre" className="text-sm font-semibold text-foreground">
        La minute d’après
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Ce qui doit être franchi avant qu’un contenu puisse partir. Cet écran <strong>n’envoie rien</strong> et
        n’enregistre rien : chaque étape se pose depuis la fiche où elle vit.
      </p>

      {cloture.decision ? (
        <p className="mt-3 text-base text-foreground">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Décision</span> ·
          priorité retenue <strong>{cloture.decision.selectedPriorityId}</strong>, enregistrée le{' '}
          {formatDate(cloture.decision.enregistreLe)}.
        </p>
      ) : (
        <p className="mt-3 text-base text-muted-foreground">
          Aucune décision enregistrée pour ce patient : il n’y a pas de consultation à clôturer.
        </p>
      )}

      <ul className="mt-3 space-y-2">
        {cloture.etapes.map((etape) => {
          const marque = MARQUE_STATUT[etape.statut];
          return (
            <li key={etape.cle} className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-foreground">{etape.libelle}</span>
                <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${marque.classe}`}>
                  {marque.texte}
                </span>
                {etape.date && (
                  <span className="text-xs text-muted-foreground">le {formatDate(etape.date)}</span>
                )}
              </div>
              {/* Patron « pourquoi maintenant » du Fil : jamais un statut nu. */}
              <p className="mt-1 text-xs text-muted-foreground">{etape.pourquoiMaintenant}</p>
            </li>
          );
        })}
      </ul>

      {cloture.blocages.length > 0 && (
        <div className="mt-3 rounded-lg border border-accent bg-orange-50 p-3">
          <p className="text-base font-medium text-orange-800">Rien ne peut être diffusé en l’état.</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-base text-orange-800">
            {cloture.blocages.map((blocage) => (
              <li key={blocage}>{blocage}</li>
            ))}
          </ul>
        </div>
      )}

      {cloture.pretPourDiffusion && (
        <p className="mt-3 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-base text-emerald-800">
          Les trois étapes sont franchies sur la version active. L’envoi reste une action distincte, à déclencher
          depuis la fiche du patient — il ne part pas d’ici.
        </p>
      )}

      <Link
        href={`/dashboard/patients/${encodeURIComponent(idPatient)}`}
        className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-border px-3 py-1 text-sm text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
      >
        Ouvrir le poste de pilotage →
      </Link>
    </section>
  );
}
