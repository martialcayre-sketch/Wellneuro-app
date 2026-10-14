'use client';

import { useEffect, useRef, useState } from 'react';
import {
  LIBELLES_MOTIF_ANNULATION,
  LIBELLES_MOTIF_REVOCATION,
  MOTIFS_ANNULATION,
  MOTIFS_REVOCATION,
} from '@/lib/biology-library/annulationMotifs';

// Le second temps d'une annulation, ou de sa révocation ([[D-294]]) : un
// motif pris dans une liste fermée, aucun texte libre. Rien ne s'efface — la
// phrase le dit avant le geste, comme pour la correction.

type Props = {
  acte: 'annulation' | 'revocation';
  /** Identifiant de la ligne visée : il nomme le groupe de boutons radio. */
  idLigne: string;
  /** Ce qui est visé, déjà formaté : valeur et date de prélèvement. */
  description: string;
  disabled: boolean;
  onConsigner: (motif: string) => Promise<boolean>;
  onFermer: () => void;
};

export function ActeAnnulationResultat({ acte, idLigne, description, disabled, onConsigner, onFermer }: Props) {
  const [motif, setMotif] = useState<string | null>(null);
  const premier = useRef<HTMLInputElement | null>(null);
  const motifs: readonly string[] = acte === 'annulation' ? MOTIFS_ANNULATION : MOTIFS_REVOCATION;
  const libelles: Record<string, string> =
    acte === 'annulation' ? LIBELLES_MOTIF_ANNULATION : LIBELLES_MOTIF_REVOCATION;

  // Le focus suit le geste, comme pour la correction : le bouton disparaît,
  // le premier choix prend sa place.
  useEffect(() => {
    premier.current?.focus();
  }, []);

  return (
    <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-xs font-medium text-foreground">
        {acte === 'annulation'
          ? `Annuler le résultat ${description}`
          : `Révoquer l’annulation du résultat ${description}`}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {acte === 'annulation' ? (
          <>
            Le résultat <strong>reste lisible ici</strong>, marqué « annulé » : il sort des séries et des
            derniers résultats, et sa place se libère pour la bonne mesure. Une erreur de valeur ou
            d’unité se corrige, elle ne s’annule pas. Une annulation se révoque une fois.
          </>
        ) : (
          <>
            Le résultat revient dans les séries. La révocation est refusée si une autre mesure a pris sa
            place. Une annulation ne se révoque qu’une fois.
          </>
        )}
      </p>
      <fieldset className="mt-2 space-y-1 text-sm text-foreground" disabled={disabled}>
        <legend className="text-xs text-muted-foreground">Motif</legend>
        {motifs.map((m, i) => (
          <label key={m} className="flex min-h-11 items-center gap-2">
            <input
              ref={i === 0 ? premier : undefined}
              type="radio"
              name={`motif-${acte}-${idLigne}`}
              value={m}
              checked={motif === m}
              onChange={() => setMotif(m)}
            />
            {libelles[m]}
          </label>
        ))}
      </fieldset>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || motif === null}
          onClick={() => {
            if (motif !== null) void onConsigner(motif);
          }}
          className="min-h-11 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {acte === 'annulation' ? 'Consigner l’annulation' : 'Consigner la révocation'}
        </button>
        <button
          type="button"
          onClick={onFermer}
          className="min-h-11 rounded-lg border border-border px-3 py-2 text-sm text-foreground"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
