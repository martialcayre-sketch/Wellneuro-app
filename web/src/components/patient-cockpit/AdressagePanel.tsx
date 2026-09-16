'use client';

import { useEffect, useRef, useState } from 'react';

// Lettre d'adressage ([[D-217]], LOT-04) — panneau présentationnel, posé DANS
// le bloc qui dit ce qui suspend la décision.
//
// LE GESTE EST À L'ENDROIT DU BLOCAGE, et ce n'est pas une préférence
// d'ergonomie. Un signal d'alerte de rang `adressage` inhibe la chaîne : plus
// de priorité proposée, aucun protocole diffusable. Le praticien lit « décision
// suspendue » ici ; c'est ici que doit se trouver la seule sortie que la
// doctrine lui laisse — écrire au médecin.
//
// IL N'AFFIRME RIEN DE CLINIQUE. Il ne cote aucun signal, n'en affiche aucun de
// son propre chef, et ne lit aucune valeur de `lib/clinical` — le banc de
// frontière du bundle client l'interdit, et la lettre est générée au serveur.
//
// AUCUN ENVOI. La remise est manuelle : on imprime, ou on transcrit.

/** Lettre établie : les deux formes du MÊME rendu, et l'ancre qui l'explique. */
export type AdressageEtabli = {
  texte: string;
  /**
   * Rendu imprimable produit par le serveur et passé par la garde non
   * prescriptive — jamais recomposé ici : un second gabarit à l'écran
   * imprimerait une lettre que personne n'a jugée.
   */
  html: string;
  ancrageSha256: string;
  ancrageVersion: string;
};

export type AdressageState = 'idle' | 'saving';

export function AdressagePanel({
  lettre,
  erreur,
  state,
  onEtablir,
}: {
  lettre: AdressageEtabli | null;
  erreur: string | null;
  state: AdressageState;
  onEtablir: (medecinLibelle: string) => void;
}) {
  const [medecin, setMedecin] = useState('');
  // Un envoi à la fois, et pas de re-consignation du même geste : le verrou se
  // lève quand le résultat revient, et le succès n'est re-consignable qu'après
  // modification du destinataire — deux clics rapprochés n'écrivent qu'une
  // ligne. Patron repris du courrier biologie (revue M4).
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [consigneSans, setConsigneSans] = useState<string | null>(null);
  const apercuRef = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    setEnvoiEnCours(false);
  }, [lettre, erreur]);
  const dejaConsigne = lettre !== null && consigneSans === medecin.trim();

  return (
    <div className="mt-4 rounded-lg border border-border bg-surface p-3">
      <p className="text-sm font-medium text-foreground">Lettre d’adressage au médecin</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Établie à partir des signaux <strong>déclarés par le patient</strong> ci-dessus, dans un
        registre non prescriptif : l’appréciation de ces éléments, comme la conduite à tenir,
        reviennent au médecin. <strong>Aucun envoi automatique</strong> — la lettre est à
        imprimer ou à transcrire.
      </p>
      {/*
        CE QUE LA LETTRE NE FAIT PAS, dit à l'écran et pas seulement au registre :
        elle TRACE l'adressage, elle ne le vaut pas. Consigner ne lève aucune
        abstention, et le praticien doit le savoir avant de cliquer.
      */}
      <p className="mt-1 text-xs text-muted-foreground">
        La consigner <strong>trace</strong> l’adressage ; elle ne lève pas l’abstention clinique.
      </p>

      <label className="mt-2 block text-xs text-muted-foreground" htmlFor="adressage-medecin">
        Nom du médecin destinataire
      </label>
      <input
        id="adressage-medecin"
        type="text"
        value={medecin}
        onChange={event => setMedecin(event.target.value)}
        placeholder="Dr Nicola"
        className="min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
      />
      <button
        type="button"
        disabled={state === 'saving' || envoiEnCours || dejaConsigne || medecin.trim() === ''}
        onClick={() => {
          setEnvoiEnCours(true);
          setConsigneSans(medecin.trim());
          onEtablir(medecin.trim());
        }}
        className="mt-2 min-h-11 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        Établir et consigner la lettre
      </button>

      {erreur && (
        <p role="alert" className="mt-2 text-sm text-status-danger">
          {erreur}
        </p>
      )}

      {lettre && (
        <div className="mt-3">
          <p role="status" className="text-xs text-status-success">
            Lettre consignée au dossier. Provenance : {lettre.ancrageVersion}, empreinte{' '}
            {lettre.ancrageSha256.slice(0, 12)}…
          </p>
          {/*
            DEUX CHEMINS DE REMISE, LE MÊME PAPIER — patron du courrier biologie.
            L'aperçu imprime le rendu SERVEUR tel quel ; le texte reste dessous
            parce que la transcription à la main reste un chemin valide.
          */}
          {lettre.html !== '' && (
            <>
              <iframe
                ref={apercuRef}
                title="Aperçu imprimable de la lettre d’adressage"
                srcDoc={lettre.html}
                sandbox="allow-same-origin allow-modals"
                className="mt-2 h-96 w-full rounded-lg border border-border bg-surface"
              />
              <button
                type="button"
                onClick={() => apercuRef.current?.contentWindow?.print()}
                className="mt-2 min-h-11 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground"
              >
                Imprimer la lettre
              </button>
            </>
          )}
          <textarea
            readOnly
            value={lettre.texte}
            rows={10}
            aria-label="Texte de la lettre à transcrire"
            className="mt-2 w-full rounded-lg border border-border bg-background p-3 text-xs text-foreground"
          />
        </div>
      )}
    </div>
  );
}
