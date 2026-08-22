'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  EntreeCeQuiCompteExposee,
  PraticienCeQuiCompteApiResponse,
} from '@/app/api/praticien/ce-qui-compte/route';

// « Ce qui compte pour moi aujourd'hui » — lecture praticien (Alliance 6.0-A,
// LOT-03), onglet Trajectoire de la fiche patient.
//
// Ce panneau AFFICHE, il ne calcule rien : aucun décompte, aucune moyenne,
// aucune tendance, aucune catégorie, aucun résumé (`DC-27`). Le texte du
// patient est rendu tel quel, dans son ordre chronologique.
//
// TROIS ÉTATS DISTINCTS, jamais deux : chargement, erreur, liste chargée. Une
// erreur de lecture ne doit JAMAIS être présentée comme « aucune entrée » —
// ce serait une affirmation fausse sur le dossier, et exactement la confusion
// que `DC-24` interdit (une absence n'est ni zéro, ni « rien à signaler »).
//
// Aucune surface de correction ni de suppression : la table n'a pas de
// chaînage, une entrée déposée se conserve. Pas de bouton d'édition ici.

type Etat = 'chargement' | 'chargee' | 'erreur';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function CeQuiComptePanel({ idPatient }: { idPatient: string }) {
  const [etat, setEtat] = useState<Etat>('chargement');
  const [erreur, setErreur] = useState('');
  const [entrees, setEntrees] = useState<EntreeCeQuiCompteExposee[]>([]);

  const charger = useCallback(async () => {
    setEtat('chargement');
    setErreur('');
    try {
      const reponse = await fetch(
        `/api/praticien/ce-qui-compte?idPatient=${encodeURIComponent(idPatient)}`,
      );
      const payload = (await reponse.json()) as PraticienCeQuiCompteApiResponse;
      if (!reponse.ok || !payload.ok) {
        setErreur(('error' in payload && payload.error) || 'Ces dépôts n’ont pas pu être lus.');
        setEtat('erreur');
        return;
      }
      setEntrees(payload.entrees);
      setEtat('chargee');
    } catch {
      setErreur('Ces dépôts n’ont pas pu être lus.');
      setEtat('erreur');
    }
  }, [idPatient]);

  useEffect(() => {
    void charger();
  }, [charger]);

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Ce qui compte pour le patient
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Déposé au portail par le patient, conservé tel quel. Ni noté, ni résumé.
      </p>

      {etat === 'chargement' && (
        <p role="status" className="mt-3 text-base text-muted-foreground">
          Chargement des dépôts&hellip;
        </p>
      )}

      {etat === 'erreur' && (
        // Un échec de lecture n'est JAMAIS présenté comme « aucun dépôt » : ce
        // serait affirmer un silence du patient qu'on n'a pas constaté.
        <div
          role="alert"
          className="mt-3 flex flex-col gap-3 rounded-lg border border-accent bg-status-warning/10 p-3 text-base text-status-warning"
        >
          <span>{erreur}</span>
          <button
            type="button"
            onClick={() => void charger()}
            className="min-h-9 self-start rounded-lg border border-accent px-3 py-1 text-xs font-medium text-solar-ink hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            {/* Nom accessible QUALIFIÉ, et ce n'est pas cosmétique : l'onglet
                « Trajectoire » porte déjà un « Réessayer » (TrajectoirePanel).
                Deux boutons homonymes dans le même panneau sont ambigus pour
                qui navigue au lecteur d'écran — et ils rendaient un banc
                préexistant indéterminé. */}
            Réessayer la lecture
          </button>
        </div>
      )}

      {etat === 'chargee' && entrees.length === 0 && (
        <p className="mt-3 text-base text-muted-foreground">
          Aucun dépôt à ce jour. Ce silence n’est pas une réponse : il ne dit rien de l’état du patient.
        </p>
      )}

      {etat === 'chargee' && entrees.length > 0 && (
        <ul className="mt-3 space-y-2">
          {entrees.map((entree) => (
            <li key={entree.id} className="rounded-lg border border-border bg-surface p-3 text-base text-foreground">
              <p className="whitespace-pre-wrap">{entree.texte}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {/* DEUX DATES, jamais confondues. `saisiLe` absente reste
                    ABSENTE : pas de repli sur `creeLe`, qui inventerait une
                    déclaration que le patient n'a pas faite (`DC-24`). */}
                Déposé le {formatDate(entree.creeLe)}
                {entree.saisiLe ? ` · concerne le ${formatDate(entree.saisiLe)}` : ' · aucune date indiquée'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
