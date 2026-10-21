'use client';

import { useState } from 'react';
import type { StatutAge } from '@/lib/patient/gardeAge';
import { TEXTE_MINEUR_JEUNE, decouperNumeros } from '@/lib/patient/texteMineurs';
import type { PortailDateNaissanceResponse } from '@/app/api/portail/date-naissance/route';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { PatientButton, patientButtonClassName } from '@/components/patient/ui/PatientButton';
import { patientInputClassName } from '@/components/patient/ui/PatientField';
import { PatientInlineMessage } from '@/components/patient/ui/PatientInlineMessage';
import { PatientPageHeader } from '@/components/patient/ui/PatientPageHeader';

// D-284 §3 et §4, lot (h). Deux écrans pour un dossier qui n'est pas « majeur » :
// la date manque — on la demande, puis on la fait confirmer, parce qu'une
// faute de frappe sur l'année ferait basculer un adulte dans le circuit des
// mineurs, et qu'une date enregistrée ne se corrige plus que par le praticien ;
// ou le patient a moins de 18 ans — on le dit sans rien rouvrir, avec le texte
// des mineurs (G-11, texte 2B ; ACT-5).
//
// La garde qui fait foi est celle des ROUTES : cet écran ne décide rien, il
// rend visible une pause que le serveur applique de toute façon.

/** « 12 mars 1985 » — lue en UTC, comme la stocke la base (`AAAA-MM-JJ`). */
function dateEnClair(iso: string): string {
  // Un navigateur sans champ date natif rend la saisie telle quelle : on la
  // montre telle quelle plutôt qu'« Invalid Date ». La route juge ensuite.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [a, m, j] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, j)).toLocaleDateString('fr-FR', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// ACT-5 (H78) : l'écran du mineur sert le texte 2B de G-11, mot pour mot
// (`texteMineurs.ts`). Sa première section en est le titre ; les numéros
// d'urgence du texte s'appellent d'un geste, comme au pied du portail.
export function EcranCircuitMineur({ lienParcours }: { lienParcours?: string }) {
  const [entree, ...suite] = TEXTE_MINEUR_JEUNE;
  return (
    <PatientCard maxWidth="md">
      <PatientPageHeader title={entree.titre} as="h2" />
      <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
        <p>{entree.texte}</p>
        {suite.map(section => (
          <section key={section.titre} className="space-y-1">
            <h3 className="font-semibold text-foreground">{section.titre}</h3>
            <p>
              {decouperNumeros(section.texte, section.numerosAppelables).map((m, i) =>
                m.numero ? (
                  <a
                    key={i}
                    href={`tel:${m.morceau}`}
                    className="font-semibold underline underline-offset-2 text-foreground"
                  >
                    {m.morceau}
                  </a>
                ) : (
                  m.morceau
                ),
              )}
            </p>
          </section>
        ))}
      </div>
      {lienParcours && (
        <a href={lienParcours} className={`${patientButtonClassName('primary', 'inline-block mt-6')}`}>
          Accéder à mon parcours
        </a>
      )}
    </PatientCard>
  );
}

export function DateNaissanceEcran({ onEnregistree }: { onEnregistree: (statut: StatutAge) => void }) {
  const [saisie, setSaisie] = useState('');
  const [aConfirmer, setAConfirmer] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');

  const enregistrer = async () => {
    setErreur('');
    setEnvoi(true);
    try {
      const res = await fetch('/api/portail/date-naissance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateNaissance: saisie }),
      });
      const data = (await res.json()) as PortailDateNaissanceResponse;
      if (data.ok) {
        onEnregistree(data.statutAge);
        return;
      }
      setErreur(data.error);
      setAConfirmer(false);
    } catch {
      setErreur('Erreur réseau. Réessayez.');
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <PatientCard maxWidth="md">
      <PatientPageHeader title="Votre date de naissance" />
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>
          Avant de continuer, nous avons besoin de votre date de naissance. Elle sert à vérifier
          votre âge : jusqu’à 18 ans, l’accompagnement suit un cadre particulier.
        </p>
        <p>
          Tant qu’elle n’est pas indiquée, vos questionnaires et l’envoi de vos analyses
          biologiques sont en pause.
        </p>
      </div>

      {aConfirmer ? (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-foreground">
            Vous avez indiqué le <strong>{dateEnClair(saisie)}</strong>. Une fois enregistrée,
            seul votre praticien pourra la corriger.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <PatientButton
              variant="primary"
              loading={envoi}
              loadingLabel="Enregistrement…"
              onClick={enregistrer}
              className="w-full sm:w-auto"
            >
              C’est exact, enregistrer
            </PatientButton>
            <PatientButton
              variant="ghost"
              disabled={envoi}
              onClick={() => setAConfirmer(false)}
              className="w-full sm:w-auto"
            >
              Corriger
            </PatientButton>
          </div>
        </div>
      ) : (
        <form
          className="mt-6 space-y-4"
          onSubmit={e => {
            e.preventDefault();
            if (saisie) setAConfirmer(true);
          }}
        >
          <div>
            <label htmlFor="date-naissance" className="block text-sm font-medium text-muted-foreground mb-1">
              Date de naissance
            </label>
            <input
              id="date-naissance"
              type="date"
              required
              value={saisie}
              onChange={e => setSaisie(e.target.value)}
              className={patientInputClassName}
            />
          </div>
          <PatientButton type="submit" variant="primary" disabled={!saisie} className="w-full">
            Continuer
          </PatientButton>
        </form>
      )}

      {erreur && (
        <div className="mt-4">
          <PatientInlineMessage tone="error">{erreur}</PatientInlineMessage>
        </div>
      )}
    </PatientCard>
  );
}
