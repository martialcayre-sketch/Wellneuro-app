'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type {
  CompositionAnalyteApiResponse,
  DecisionCompositionApiResponse,
} from '@/app/api/praticien/biologie/compositions/route';
import type {
  CompositionPrepareeAffichee,
  CompositionSigneeAffichee,
} from '@/lib/biology-library/compositionsAnalytes';
import { LIBELLES_TYPE_COMPOSITION, type TypeComposition } from '@/lib/biology-library/compositionsPreparees';
import { formatDate } from './FicheAnalytePanel';

// Composition signée d'une analyse groupée ou d'une valeur calculée (F80,
// D-323 §1), dans la fiche analyte. L'écran montre la composition signée, ou
// la liste préparée à signer (tout coché ; le praticien peut décocher, jamais
// ajouter un analyte hors liste) ; et, pour un constituant, les groupes signés
// dont il fait partie. Signataire et date sont posés par le serveur ; le
// retrait désigne la composition vue par sa date.
//
// Types importés en `import type` seulement, sauf `compositionsPreparees`,
// module pur sans Prisma.

type Donnees = Extract<CompositionAnalyteApiResponse, { ok: true }>;

const ROLE: Record<TypeComposition, string> = {
  groupe: 'Constituants',
  calcul: 'Mesures dont la valeur est calculée',
  regroupement: 'Composants',
};

function MessageEchec({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-status-danger/40 bg-status-danger/10 p-3 text-sm text-status-danger"
    >
      {message}
    </p>
  );
}

function ListeComposants({ composition }: { composition: CompositionSigneeAffichee }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {composition.composants.map(c => (
        <li key={c.code}>
          <Badge variant={c.actif ? 'neutral' : 'danger'}>
            {c.libelle}
            {c.actif ? '' : ' (inactif)'}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

export function CompositionAnalyteSection({
  analyteCode,
  onModifie,
}: {
  analyteCode: string;
  onModifie?: () => void;
}) {
  const [donnees, setDonnees] = useState<Donnees | null>(null);
  const [coches, setCoches] = useState<Set<string>>(new Set());
  const [messageEchec, setMessageEchec] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [retraitAConfirmer, setRetraitAConfirmer] = useState(false);

  const charger = useCallback(async () => {
    setMessageEchec(null);
    try {
      const res = await fetch(`/api/praticien/biologie/compositions?analyte=${encodeURIComponent(analyteCode)}`);
      const corps = (await res.json()) as CompositionAnalyteApiResponse;
      if (!corps.ok) {
        setMessageEchec(corps.error);
        return;
      }
      // Une réponse d'une autre forme ne s'affiche pas en partie : elle se dit.
      if (!Array.isArray(corps.membreDe) || !Array.isArray(corps.retirees)) {
        setMessageEchec('La composition n’a pas pu être chargée.');
        return;
      }
      setDonnees(corps);
      // Un composant inactif au catalogue ne se coche pas : le serveur le refuserait.
      setCoches(new Set(corps.preparee?.composants.filter(c => c.actif).map(c => c.code) ?? []));
    } catch {
      setMessageEchec('La composition n’a pas pu être chargée.');
    }
  }, [analyteCode]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function decider(corpsRequete: Record<string, unknown>) {
    setEnCours(true);
    setMessageEchec(null);
    try {
      const res = await fetch('/api/praticien/biologie/compositions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analyteCode, ...corpsRequete }),
      });
      const corps = (await res.json()) as DecisionCompositionApiResponse;
      if (!corps.ok) {
        setMessageEchec(corps.error);
        return;
      }
      setRetraitAConfirmer(false);
      await charger();
      onModifie?.();
    } catch {
      setMessageEchec('Rien n’a été enregistré : erreur technique.');
    } finally {
      setEnCours(false);
    }
  }

  if (!donnees) {
    return messageEchec ? <MessageEchec message={messageEchec} /> : (
      <p role="status" className="text-sm text-muted-foreground">
        Lecture de la composition…
      </p>
    );
  }

  const { active, preparee, operandesAbsents, membreDe, retirees } = donnees;
  if (!active && !preparee && !operandesAbsents && membreDe.length === 0 && retirees.length === 0) return null;

  return (
    <section aria-labelledby={`composition-${analyteCode}`} className="flex flex-col gap-3">
      <h5 id={`composition-${analyteCode}`} className="text-sm font-semibold text-foreground">
        Composition
      </h5>

      {membreDe.length > 0 && (
        <p className="text-sm text-foreground">
          Fait partie de : {membreDe.map(m => m.libelle).join(', ')}.
        </p>
      )}

      {operandesAbsents && (
        <p className="text-sm text-muted-foreground">
          Rien à signer : {LIBELLES_TYPE_COMPOSITION.calcul}, dont les mesures manquent au catalogue.{' '}
          {operandesAbsents} Son remboursement reste non évalué.
        </p>
      )}

      {active && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-foreground">
            {ROLE[active.type]} — {LIBELLES_TYPE_COMPOSITION[active.type]} :
          </p>
          <ListeComposants composition={active} />
          <p className="text-xs text-muted-foreground">
            Signée par {active.verifiePar} le {formatDate(active.verifieLe)}.
          </p>
          {retraitAConfirmer ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-foreground">Retirer cette composition signée ?</span>
              <Button
                variant="danger"
                disabled={enCours}
                onClick={() => void decider({ decision: 'retirer', verifieLeVu: active.verifieLe })}
              >
                Confirmer le retrait
              </Button>
              <Button variant="outline" disabled={enCours} onClick={() => setRetraitAConfirmer(false)}>
                Annuler
              </Button>
            </div>
          ) : (
            <div>
              <Button variant="outline" disabled={enCours} onClick={() => setRetraitAConfirmer(true)}>
                Retirer la composition
              </Button>
            </div>
          )}
        </div>
      )}

      {!active && preparee && (
        <PrepareeASigner
          preparee={preparee}
          coches={coches}
          onBascule={code =>
            setCoches(prec => {
              const suiv = new Set(prec);
              if (suiv.has(code)) suiv.delete(code);
              else suiv.add(code);
              return suiv;
            })
          }
          enCours={enCours}
          onSigner={() =>
            void decider({
              decision: 'signer',
              composants: preparee.composants.map(c => c.code).filter(code => coches.has(code)),
            })
          }
        />
      )}

      {retirees.length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary>Compositions retirées ({retirees.length})</summary>
          <ul className="mt-1 flex flex-col gap-1">
            {retirees.map(r => (
              <li key={r.verifieLe}>
                {r.composants.map(c => c.libelle).join(', ')} — signée par {r.verifiePar} le{' '}
                {formatDate(r.verifieLe)}, retirée par {r.retireePar} le {r.retireeLe ? formatDate(r.retireeLe) : '—'}.
              </li>
            ))}
          </ul>
        </details>
      )}

      {messageEchec && <MessageEchec message={messageEchec} />}
    </section>
  );
}

function PrepareeASigner({
  preparee,
  coches,
  onBascule,
  enCours,
  onSigner,
}: {
  preparee: CompositionPrepareeAffichee;
  coches: Set<string>;
  onBascule: (code: string) => void;
  enCours: boolean;
  onSigner: () => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm text-foreground">
        Composition préparée, à signer — {LIBELLES_TYPE_COMPOSITION[preparee.type]}
      </legend>
      <p className="text-xs text-muted-foreground">{preparee.motif}</p>
      <ul className="flex flex-col gap-1">
        {preparee.composants.map(c => (
          <li key={c.code}>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={coches.has(c.code)}
                disabled={!c.actif}
                onChange={() => onBascule(c.code)}
              />
              {c.libelle}
              {c.actif ? '' : ' (inactif au catalogue)'}
            </label>
          </li>
        ))}
      </ul>
      <div>
        <Button disabled={enCours || coches.size === 0} onClick={onSigner}>
          Signer la composition
        </Button>
      </div>
    </fieldset>
  );
}
