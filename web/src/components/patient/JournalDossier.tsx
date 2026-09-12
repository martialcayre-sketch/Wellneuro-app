'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { PortailJournalResponse } from '@/app/api/portail/journal/route';
import { libelleDateJournal, type EvenementJournal } from '@/lib/portail/journalDossier';

/**
 * « CE QUI S'EST PASSÉ DANS VOTRE DOSSIER » — le journal du portail patient
 * (campagne « la vie du portail patient », LOT-03).
 *
 * REPLIÉ PAR DÉFAUT, DÉPLIÉ S'IL Y A DU NEUF — arbitrage du responsable
 * (2026-09-12). Replié, il ne concurrence pas « votre étape du moment », et le
 * principe `A6-R1` (une étape à la fois, pas de hub empilé) tient : c'est
 * l'écart `E11` de l'audit 5.0 qui a fait démonter la page d'atterrissage
 * empilée, et ce bloc ne doit pas la reconstruire. Déplié quand il y a du neuf,
 * il se montre quand il a quelque chose à dire, et se tait sinon.
 *
 * AUCUN DÉCOMPTE DANS LE TITRE, contrairement au bloc qu'il remplace
 * (« Depuis votre dernière visite (3) »). Le nombre de fois qu'un patient a
 * reçu ou transmis quelque chose n'est pas une mesure de lui (`DC-19`/`DC-20`).
 *
 * LA VOIX EST DANS LA PHRASE, PAS DANS UNE PASTILLE. « Vous avez transmis… » et
 * « Votre praticien a publié… » se distinguent d'eux-mêmes : une puce colorée
 * porterait l'information par la seule couleur, ce que `A5-R1` interdit, et
 * ajouterait un vocabulaire à apprendre pour rien.
 *
 * SI LE JOURNAL EST FERMÉ, LE BLOC D'AVANT REPREND SA PLACE. Tant que
 * `WN_PORTAIL_JOURNAL` est éteint, la route rend 503 et ce composant rend son
 * `fallback` — « Depuis votre dernière visite ». Retirer l'ancien bloc avant la
 * mise en service enlèverait au patient le peu qu'il a.
 */
export function JournalDossier({ fallback }: { fallback?: ReactNode }) {
  const [etat, setEtat] = useState<'chargement' | 'ferme' | 'ouvert'>('chargement');
  const [evenements, setEvenements] = useState<EvenementJournal[]>([]);
  const [duNeuf, setDuNeuf] = useState(false);
  const vuSignale = useRef(false);

  useEffect(() => {
    let vivant = true;
    void fetch('/api/portail/journal')
      .then(async r => (await r.json()) as PortailJournalResponse)
      .then(payload => {
        if (!vivant) return;
        if (!payload.ok) {
          setEtat('ferme');
          return;
        }
        setEvenements(payload.evenements);
        setDuNeuf(payload.duNeuf);
        setEtat('ouvert');
      })
      .catch(() => {
        if (vivant) setEtat('ferme');
      });
    return () => {
      vivant = false;
    };
  }, []);

  /**
   * LE REPÈRE AVANCE QUAND LE JOURNAL A ÉTÉ MONTRÉ DÉPLIÉ, pas à chaque
   * ouverture du portail. Le déplacer à chaque chargement le viderait de son
   * sens au premier rafraîchissement : le patient n'aurait rien lu et le
   * portail dirait qu'il a tout vu.
   *
   * UN SEUL CHEMIN, `onToggle`, ET C'EST DÉLIBÉRÉ. Un effet de montage
   * doublerait ce chemin sans rien ajouter : la spécification HTML fait naître
   * un `toggle` chaque fois que l'attribut `open` est POSÉ — y compris par React
   * au premier rendu d'un `<details open>`. Le doublon était présent, et aucune
   * mutation ne pouvait le tuer : jsdom comme un vrai navigateur émettent le
   * `toggle`, si bien que supprimer l'effet ne changeait aucun verdict. Du code
   * qu'aucun banc ne peut éprouver n'a pas sa place sur une surface patient.
   *
   * CE QUE CE CHOIX COÛTE, ET IL FAUT LE SAVOIR : un navigateur qui n'émettrait
   * pas ce `toggle` laisserait le repère immobile. Le journal se rouvrirait à
   * chaque visite — visible, gênant, et sans perte de donnée.
   *
   * UNE SEULE FOIS PAR MONTAGE (`useRef`) : replier puis redéplier le bloc n'est
   * pas une seconde lecture, et la route refuserait de toute façon d'écrire deux
   * fois le même instant.
   *
   * L'ÉCHEC EST SILENCIEUX. Sans repère avancé, le journal se rouvrira au
   * prochain chargement — l'état d'avant ce lot, pas une perte. Une bannière
   * d'erreur pour un repère d'affichage ferait du bruit sur la page d'accueil
   * d'un patient.
   */
  const signalerVu = useCallback(() => {
    if (vuSignale.current) return;
    vuSignale.current = true;
    void fetch('/api/portail/journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    }).catch(() => {});
  }, []);

  // EN VOL, ON N'AFFIRME RIEN — ni le journal, ni le bloc d'avant. Montrer le
  // repli pour le remplacer une seconde plus tard ferait sauter la page sous
  // les yeux du patient.
  if (etat === 'chargement') return null;
  if (etat === 'ferme') return <>{fallback}</>;
  // Le journal porte toujours au moins l'entrée dans l'accompagnement ; une
  // liste vide voudrait dire que la dérivation a changé sous nos pieds.
  if (evenements.length === 0) return <>{fallback}</>;

  return (
    <details
      open={duNeuf}
      // LE PREMIER `toggle` EST NÉCESSAIREMENT UNE OUVERTURE — d'où l'absence
      // de garde sur le sens. Le bloc part replié quand il n'y a rien de neuf
      // (aucun `toggle` tant que le patient n'ouvre pas), et déplié sinon
      // (`toggle` posé par React avec `open` à vrai). Un `if (open)` ici ne
      // pourrait jamais rendre « faux » : il a été écrit, puis retiré, parce
      // qu'aucune mutation ne pouvait le tuer.
      onToggle={signalerVu}
      className="rounded-xl border border-border bg-surface p-4"
      data-testid="journal-dossier"
    >
      <summary className="cursor-pointer select-none text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Ce qui s&apos;est passé dans votre dossier
      </summary>
      <ol className="mt-3 space-y-2">
        {evenements.map(evenement => (
          <li key={evenement.cle} className="text-base text-foreground">
            <span className="mr-2 font-mono text-sm text-muted-foreground">
              {libelleDateJournal(evenement.date)}
            </span>
            {evenement.libelle}
          </li>
        ))}
      </ol>
    </details>
  );
}
