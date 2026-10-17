'use client';

import { BESOINS as BESOINS_GUIDE } from '@/lib/equilibre/constants';
import { RUBRIQUES_FICHE_USAGE } from '@/lib/fiches-usage/vocabulaire';
import { nomRubrique } from '@/components/fiches-usage/libelles';

// Saisie des clés de lien d'un claim ([[D-321]]) : les besoins qu'il sert (12
// cases, aucune cochée d'office) et la rubrique de la chaîne d'usage (aucune
// présélectionnée). Rien n'est proposé par l'assistant : la saisie part vide,
// ou des clés déjà posées par le praticien.

export type SaisieClesLien = { besoins: number[]; rubrique: string };

export const SAISIE_CLES_VIDE: SaisieClesLien = { besoins: [], rubrique: '' };

/** Vide (rien de posé), complète (les deux clés), ou partielle — refusée à l'envoi. */
export function etatSaisieCles(saisie: SaisieClesLien): 'vide' | 'complete' | 'partielle' {
  const aBesoins = saisie.besoins.length > 0;
  const aRubrique = saisie.rubrique !== '';
  if (!aBesoins && !aRubrique) return 'vide';
  return aBesoins && aRubrique ? 'complete' : 'partielle';
}

export function ClesLienChamps({
  saisie,
  onChange,
  disabled,
  libelleClaim,
  facultatif,
}: {
  saisie: SaisieClesLien;
  onChange: (suivante: SaisieClesLien) => void;
  disabled: boolean;
  /** Identifiant lisible du claim, pour des libellés uniques à l'écran. */
  libelleClaim: string;
  /** À la signature, les clés sont facultatives ; à l'étiquetage, requises. */
  facultatif: boolean;
}) {
  const basculer = (besoin: number) => {
    const besoins = saisie.besoins.includes(besoin)
      ? saisie.besoins.filter((b) => b !== besoin)
      : [...saisie.besoins, besoin].sort((a, b) => a - b);
    onChange({ ...saisie, besoins });
  };
  const partielle = etatSaisieCles(saisie) === 'partielle';

  return (
    <fieldset
      aria-label={`Besoins servis et rubrique d’usage — ${libelleClaim}`}
      className="flex w-full flex-col gap-3 rounded-lg border border-border bg-muted/40 p-3"
    >
      <legend className="px-1 text-sm font-medium text-foreground">
        Besoins servis et rubrique d’usage{facultatif ? ' (facultatif)' : ''}
      </legend>
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {BESOINS_GUIDE.map((besoin) => (
          <label key={besoin.id} className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={saisie.besoins.includes(besoin.id)}
              disabled={disabled}
              onChange={() => basculer(besoin.id)}
            />
            {besoin.id}. {besoin.libellePraticien}
          </label>
        ))}
      </div>
      <label className="flex flex-col gap-1 text-sm text-foreground">
        Rubrique d’usage
        <select
          value={saisie.rubrique}
          disabled={disabled}
          onChange={(event) => onChange({ ...saisie, rubrique: event.target.value })}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
        >
          <option value="">— Choisir une rubrique —</option>
          {RUBRIQUES_FICHE_USAGE.map((rubrique) => (
            <option key={rubrique} value={rubrique}>
              {nomRubrique(rubrique)}
            </option>
          ))}
        </select>
      </label>
      {partielle && (
        <p className="text-sm text-status-warning">
          Les besoins et la rubrique se posent ensemble : complétez ou videz les deux.
        </p>
      )}
    </fieldset>
  );
}
