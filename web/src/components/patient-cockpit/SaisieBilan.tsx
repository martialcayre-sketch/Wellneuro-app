'use client';

import { useEffect, useRef, useState } from 'react';

// Saisie GROUPÉE d'un bilan (BIO-INGEST LOT-01, A1 et A3 de [[D-256]]) : une
// date de prélèvement commune, N analytes, UNE validation. Remplace la saisie
// unitaire — un bilan d'une ligne EST une saisie unitaire. La correction d'une
// mesure ([[D-124]]) reste un geste de la série, pas de ce formulaire.
//
// TOUT OU RIEN, ET LA SAISIE RESTE EN PLACE. Le serveur refuse le bilan entier
// si une seule ligne est invalide, et nomme chaque ligne fautive : l'écran
// affiche le refus SOUS la ligne et ne vide rien — re-frapper un bilan de
// mémoire est exactement le coût que ce lot supprime. Les lignes ne se vident
// qu'au succès.
//
// L'UNITÉ N'EST PAS SAISIE : le serveur la relit sur l'analyte au catalogue.
// Aucune valeur n'est qualifiée ici (ni basse, ni haute) : `DC-27`.

export type AnalyteChoix = { code: string; libelle: string; unite: string | null };

export type RefusLigneBilan = { index: number; reason: string; error: string };

export type IssueBilan =
  | { ok: true }
  | { ok: false; error: string; lignes?: RefusLigneBilan[] };

type Ligne = { id: number; analyteCode: string; valeur: string };

function valeurNumerique(brute: string): number {
  return brute.trim() === '' ? Number.NaN : Number(brute.replace(',', '.'));
}

export function SaisieBilan({
  analytes,
  disabled,
  onEnregistrer,
}: {
  analytes: AnalyteChoix[];
  disabled: boolean;
  onEnregistrer: (bilan: {
    preleveLe: string;
    lignes: Array<{ analyteCode: string; valeur: number }>;
  }) => Promise<IssueBilan>;
}) {
  const prochainId = useRef(1);
  const nouvelleLigne = (): Ligne => ({ id: prochainId.current++, analyteCode: '', valeur: '' });
  const [preleveLe, setPreleveLe] = useState('');
  const [lignes, setLignes] = useState<Ligne[]>(() => [nouvelleLigne()]);
  /** Refus par ligne, indexés par l'IDENTIFIANT de ligne : retirer une ligne ne décale rien. */
  const [refusParLigne, setRefusParLigne] = useState<Record<number, string>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const [aFocaliser, setAFocaliser] = useState<number | null>(null);
  const selects = useRef(new Map<number, HTMLSelectElement>());

  useEffect(() => {
    if (aFocaliser === null) return;
    selects.current.get(aFocaliser)?.focus();
    setAFocaliser(null);
  }, [aFocaliser]);

  const prete =
    preleveLe !== '' &&
    lignes.length > 0 &&
    lignes.every(l => l.analyteCode !== '' && Number.isFinite(valeurNumerique(l.valeur)));

  const modifier = (id: number, champ: 'analyteCode' | 'valeur', valeur: string) => {
    setLignes(courantes => courantes.map(l => (l.id === id ? { ...l, [champ]: valeur } : l)));
  };

  const enregistrer = async () => {
    const envoyees = lignes;
    setErreur(null);
    setRefusParLigne({});
    const issue = await onEnregistrer({
      preleveLe: new Date(preleveLe).toISOString(),
      lignes: envoyees.map(l => ({ analyteCode: l.analyteCode, valeur: valeurNumerique(l.valeur) })),
    });
    if (issue.ok) {
      // La date reste : un analyte oublié du même prélèvement se rajoute sans
      // la re-frapper. Les lignes, elles, sont consignées — elles se vident.
      setLignes([nouvelleLigne()]);
      return;
    }
    const parId: Record<number, string> = {};
    for (const refus of issue.lignes ?? []) {
      const ligne = envoyees[refus.index];
      if (ligne) parId[ligne.id] = refus.error;
    }
    setRefusParLigne(parId);
    const nombre = Object.keys(parId).length;
    setErreur(
      nombre > 0
        ? `Rien n’a été enregistré : ${nombre} ligne${nombre > 1 ? 's' : ''} à reprendre.`
        : issue.error,
    );
  };

  const n = lignes.length;

  return (
    <div className="mt-3 rounded-lg border border-border p-3">
      <p className="text-xs font-medium text-foreground">Saisir un bilan</p>
      <label className="mt-2 block text-xs text-muted-foreground" htmlFor="bilan-preleve-le">
        Prélevé le (avec l’heure)
      </label>
      <input
        id="bilan-preleve-le"
        type="datetime-local"
        value={preleveLe}
        onChange={event => setPreleveLe(event.target.value)}
        className="min-h-11 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
      />
      <p className="mt-1 text-xs text-muted-foreground">
        Une date et une heure pour tout le bilan. L’heure distingue deux prélèvements du même jour
        (profils salivaires, glycémies). L’unité vient du catalogue.
      </p>

      <ol className="mt-3 space-y-2">
        {lignes.map((ligne, position) => {
          const numero = position + 1;
          const choisi = analytes.find(a => a.code === ligne.analyteCode) ?? null;
          const refus = refusParLigne[ligne.id];
          const idErreur = `bilan-erreur-${ligne.id}`;
          return (
            <li key={ligne.id} className="rounded-lg border border-border/60 p-2">
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-0 flex-1">
                  <label className="block text-xs text-muted-foreground" htmlFor={`bilan-analyte-${ligne.id}`}>
                    Analyte (unité du catalogue)<span className="sr-only">, ligne {numero}</span>
                  </label>
                  <select
                    id={`bilan-analyte-${ligne.id}`}
                    ref={element => {
                      if (element) selects.current.set(ligne.id, element);
                      else selects.current.delete(ligne.id);
                    }}
                    value={ligne.analyteCode}
                    onChange={event => modifier(ligne.id, 'analyteCode', event.target.value)}
                    aria-invalid={refus ? true : undefined}
                    aria-describedby={refus ? idErreur : undefined}
                    className="min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="">— choisir —</option>
                    {analytes.map(analyte => (
                      <option key={analyte.code} value={analyte.code}>
                        {analyte.libelle}
                        {analyte.unite ? ` (${analyte.unite})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground" htmlFor={`bilan-valeur-${ligne.id}`}>
                    Valeur{choisi?.unite ? ` (${choisi.unite})` : ''}
                    <span className="sr-only">, ligne {numero}</span>
                  </label>
                  <input
                    id={`bilan-valeur-${ligne.id}`}
                    type="text"
                    inputMode="decimal"
                    value={ligne.valeur}
                    onChange={event => modifier(ligne.id, 'valeur', event.target.value)}
                    placeholder="42,5"
                    aria-invalid={refus ? true : undefined}
                    aria-describedby={refus ? idErreur : undefined}
                    className="min-h-11 w-32 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
                {n > 1 && (
                  <button
                    type="button"
                    disabled={disabled}
                    // Un nom NUMÉROTÉ : sans lui, n boutons « Retirer » sont
                    // indiscernables au lecteur d'écran. Il commence par le
                    // texte visible (critère « label dans le nom »).
                    aria-label={`Retirer la ligne ${numero}`}
                    onClick={() => {
                      setLignes(courantes => courantes.filter(l => l.id !== ligne.id));
                      setRefusParLigne(({ [ligne.id]: _retire, ...reste }) => reste);
                    }}
                    className="min-h-11 rounded-lg border border-border px-3 py-2 text-xs text-foreground disabled:opacity-50"
                  >
                    Retirer
                  </button>
                )}
              </div>
              {refus && (
                <p id={idErreur} className="mt-1 text-xs text-status-danger">
                  {refus}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {erreur && (
        <p role="alert" className="mt-2 text-sm text-status-danger">
          {erreur}
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            const ligne = nouvelleLigne();
            setLignes(courantes => [...courantes, ligne]);
            setAFocaliser(ligne.id);
          }}
          className="min-h-11 rounded-lg border border-border px-3 py-2 text-sm text-foreground disabled:opacity-50"
        >
          Ajouter une analyse
        </button>
        <button
          type="button"
          disabled={disabled || !prete}
          onClick={() => void enregistrer()}
          className="min-h-11 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Enregistrer le bilan ({n} mesure{n > 1 ? 's' : ''})
        </button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Le bilan s’enregistre entier ou pas du tout : une ligne refusée n’efface rien de la saisie.
        Une valeur saisie de travers se corrige ensuite depuis la série : la correction ajoute une
        ligne et laisse l’erreur visible.
      </p>
    </div>
  );
}
