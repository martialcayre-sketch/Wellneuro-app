'use client';

import { useEffect, useRef, useState } from 'react';
import {
  LIBELLES_STATUT_POSE,
  STATUTS_POSES,
  estStatutPose,
  type StatutPose,
} from '@/lib/biology-library/statutPoseListe';

// Le second temps d'un statut posé près d'une valeur, ou de son retrait
// ([[D-322]], F58) : un statut pris dans la liste fermée du responsable,
// aucun texte libre. Le statut dit ce que le praticien fait de la valeur,
// jamais ce que vaut la valeur ; rien ne s'efface — la phrase le dit avant le
// geste, comme pour l'annulation.

type Props = {
  acte: 'pose' | 'retrait';
  /** Identifiant de la ligne visée : il nomme le groupe de boutons radio. */
  idLigne: string;
  /** Ce qui est visé, déjà formaté : valeur et date de prélèvement. */
  description: string;
  /** Le statut actif de la ligne, `null` : « sans statut posé ». */
  actif: string | null;
  disabled: boolean;
  /** Pose : le statut choisi. Retrait : `null`. */
  onConsigner: (statut: StatutPose | null) => Promise<boolean>;
  onFermer: () => void;
};

export function ActeStatutResultat({ acte, idLigne, description, actif, disabled, onConsigner, onFermer }: Props) {
  const [statut, setStatut] = useState<StatutPose | null>(null);
  const premier = useRef<HTMLElement | null>(null);
  // Reposer le statut actif est refusé (la base le refuse aussi) : l'écran ne
  // le propose pas.
  const choix = STATUTS_POSES.filter(s => s !== actif);
  const libelleActif = actif === null ? null : estStatutPose(actif) ? LIBELLES_STATUT_POSE[actif] : actif;

  // Le focus suit le geste : le bouton disparaît, le premier choix prend sa
  // place.
  useEffect(() => {
    premier.current?.focus();
  }, []);

  if (acte === 'retrait') {
    return (
      <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3">
        <p className="text-xs font-medium text-foreground">{`Retirer le statut de la valeur ${description}`}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {libelleActif ? `Le statut « ${libelleActif} » est retiré : ` : ''}
          la valeur revient à « sans statut posé ». Le retrait est daté et reste à l’historique, avec la
          pose qu’il retire.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            ref={el => {
              premier.current = el;
            }}
            type="button"
            disabled={disabled}
            onClick={() => void onConsigner(null)}
            className="min-h-11 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Retirer le statut
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

  return (
    <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-xs font-medium text-foreground">{`Poser un statut sur la valeur ${description}`}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Le statut dit ce que vous faites de cette valeur, à votre écran seul : ni le patient, ni le
        courrier au médecin, ni aucun calcul ne le lisent.
        {libelleActif ? ` Il remplace « ${libelleActif} », qui reste à l’historique.` : ''} Une valeur
        corrigée apparaît sans statut.
      </p>
      <fieldset className="mt-2 space-y-1 text-sm text-foreground" disabled={disabled}>
        <legend className="text-xs text-muted-foreground">Statut</legend>
        {choix.map((s, i) => (
          <label key={s} className="flex min-h-11 items-center gap-2">
            <input
              ref={
                i === 0
                  ? el => {
                      premier.current = el;
                    }
                  : undefined
              }
              type="radio"
              name={`statut-${idLigne}`}
              value={s}
              checked={statut === s}
              onChange={() => setStatut(s)}
            />
            {LIBELLES_STATUT_POSE[s]}
          </label>
        ))}
      </fieldset>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || statut === null}
          onClick={() => {
            if (statut !== null) void onConsigner(statut);
          }}
          className="min-h-11 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Poser ce statut
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
