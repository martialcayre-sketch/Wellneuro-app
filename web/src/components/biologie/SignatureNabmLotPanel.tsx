'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type {
  LotNabmApiResponse,
  SignatureLotNabmApiResponse,
} from '@/app/api/praticien/biologie/nabm/correspondances/lot/route';
import type { LigneLotNabm, NatureNabm } from '@/lib/biology-library/correspondancesNabm';
import { ChoixNature, DetailActe } from './CorrespondancesNabmSection';

// Signature en lot des correspondances préparées ([[D-326]] §2). L'écran
// montre les candidats que chaque fiche d'analyte propose, tous analytes
// confondus ; le praticien relit, décoche ou change une nature, puis signe la
// sélection en un geste, après une confirmation qui en dit le compte. Chaque
// couple est signé comme sur la fiche — au nom de la session, avec sa ligne
// de journal —, tout ou rien. Un candidat « à juger » n'est jamais coché
// d'office.
//
// Les types sont importés en `import type` seulement : la lib serveur importe
// Prisma, qui ne doit pas entrer dans le paquet client.

const cle = (l: { analyteCode: string; codeActe: string }) => `${l.analyteCode}|${l.codeActe}`;

export function SignatureNabmLotPanel({ onSignees }: { onSignees?: () => void }) {
  const [lignes, setLignes] = useState<LigneLotNabm[] | null>(null);
  const [millesime, setMillesime] = useState<string | null>(null);
  const [cochees, setCochees] = useState<Set<string>>(new Set());
  const [natures, setNatures] = useState<Record<string, NatureNabm>>({});
  const [aConfirmer, setAConfirmer] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [messageEchec, setMessageEchec] = useState<string | null>(null);
  const [messageSucces, setMessageSucces] = useState<string | null>(null);
  // Seule la DERNIÈRE lecture émise écrit à l'écran.
  const derniereLecture = useRef(0);

  const charger = useCallback(async () => {
    const lecture = ++derniereLecture.current;
    try {
      const res = await fetch('/api/praticien/biologie/nabm/correspondances/lot', { cache: 'no-store' });
      const corps = (await res.json()) as LotNabmApiResponse;
      if (lecture !== derniereLecture.current) return;
      if (!corps.ok) {
        setMessageEchec(corps.error);
        return;
      }
      if (!Array.isArray(corps.lignes)) {
        setMessageEchec('La liste n’a pas pu être chargée.');
        return;
      }
      setLignes(corps.lignes);
      setMillesime(corps.millesime);
      setCochees(new Set(corps.lignes.filter(l => l.precochee).map(cle)));
      setNatures({});
      setAConfirmer(false);
    } catch {
      if (lecture === derniereLecture.current) setMessageEchec('La liste n’a pas pu être chargée.');
    }
  }, []);

  useEffect(() => {
    void charger();
    return () => {
      derniereLecture.current += 1;
    };
  }, [charger]);

  const parAnalyte = useMemo(() => {
    const groupes = new Map<string, { libelle: string; lignes: LigneLotNabm[] }>();
    for (const ligne of lignes ?? []) {
      const groupe = groupes.get(ligne.analyteCode) ?? { libelle: ligne.analyteLibelle, lignes: [] };
      groupe.lignes.push(ligne);
      groupes.set(ligne.analyteCode, groupe);
    }
    return [...groupes.entries()];
  }, [lignes]);

  const selection = (lignes ?? []).filter(l => cochees.has(cle(l)));

  function basculer(ligne: LigneLotNabm) {
    setAConfirmer(false);
    setCochees(prev => {
      const suiv = new Set(prev);
      if (suiv.has(cle(ligne))) suiv.delete(cle(ligne));
      else suiv.add(cle(ligne));
      return suiv;
    });
  }

  async function signer() {
    setEnCours(true);
    setMessageEchec(null);
    setMessageSucces(null);
    try {
      const res = await fetch('/api/praticien/biologie/nabm/correspondances/lot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lignes: selection.map(l => ({
            analyteCode: l.analyteCode,
            codeActe: l.codeActe,
            nature: natures[cle(l)] ?? l.nature,
          })),
        }),
      });
      const corps = (await res.json()) as SignatureLotNabmApiResponse;
      if (!corps.ok) {
        setMessageEchec(corps.error);
        setAConfirmer(false);
        return;
      }
      setMessageSucces(
        corps.signees === 1 ? 'Une correspondance signée.' : `${corps.signees} correspondances signées.`,
      );
      await charger();
      onSignees?.();
    } catch {
      // La réponse s'est perdue : la signature a pu avoir lieu. La relecture
      // le dit — un couple signé ne figure plus dans la liste.
      setMessageEchec('Résultat inconnu : la réponse ne nous est pas parvenue. La liste est relue.');
      setAConfirmer(false);
      await charger();
    } finally {
      setEnCours(false);
    }
  }

  return (
    <section aria-labelledby="signature-lot-titre" className="flex flex-col gap-4">
      <div>
        <h4 id="signature-lot-titre" className="text-sm font-semibold text-foreground">
          Correspondances préparées à signer
        </h4>
        <p className="mt-1 text-xs text-muted-foreground">
          Les propositions de chaque fiche d’analyte, réunies. Chaque correspondance cochée est
          signée à votre nom, comme sur la fiche : signer, c’est attester avoir lu l’acte dans la
          nomenclature{millesime ? ` (millésime ${millesime})` : ''}. Tout ou rien : un seul refus et
          rien n’est signé. Les propositions « à juger » ne sont jamais cochées d’office.
        </p>
      </div>

      {messageEchec && (
        <p role="alert" className="rounded-lg border border-status-danger/40 bg-status-danger/10 p-3 text-sm text-status-danger">
          {messageEchec}
        </p>
      )}
      {messageSucces && (
        <p role="status" className="rounded-lg border border-border bg-muted p-3 text-sm text-foreground">
          {messageSucces}
        </p>
      )}

      {lignes === null ? (
        !messageEchec && (
          <p role="status" className="text-sm text-muted-foreground">
            Lecture des propositions…
          </p>
        )
      ) : lignes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune correspondance préparée ne reste à signer.</p>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {parAnalyte.map(([code, groupe]) => (
              <li key={code} className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3">
                <p className="text-sm font-medium text-foreground">{groupe.libelle}</p>
                <ul className="flex flex-col gap-2">
                  {groupe.lignes.map(ligne => (
                    <li key={cle(ligne)} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                      <label className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={cochees.has(cle(ligne))}
                          onChange={() => basculer(ligne)}
                          disabled={enCours}
                          className="mt-1"
                          aria-label={`Signer ${groupe.libelle} → acte ${ligne.codeActe}`}
                        />
                        <DetailActe acte={ligne.acte} />
                      </label>
                      {ligne.situation === 'a_juger' && (
                        <span>
                          <Badge variant="warning">À juger</Badge>
                        </span>
                      )}
                      <p className="text-xs text-muted-foreground">{ligne.motif}</p>
                      <ChoixNature
                        nom={`nature-lot-${cle(ligne)}`}
                        valeur={natures[cle(ligne)] ?? ligne.nature}
                        onChange={nature => {
                          setAConfirmer(false);
                          setNatures(prev => ({ ...prev, [cle(ligne)]: nature }));
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2">
            {aConfirmer ? (
              <>
                <p className="text-sm text-foreground">
                  Signer à votre nom{' '}
                  {selection.length === 1 ? 'une correspondance' : `${selection.length} correspondances`} ?
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button disabled={enCours} onClick={() => void signer()}>
                    Confirmer la signature
                  </Button>
                  <Button variant="outline" disabled={enCours} onClick={() => setAConfirmer(false)}>
                    Annuler
                  </Button>
                </div>
              </>
            ) : (
              <div>
                <Button disabled={enCours || selection.length === 0} onClick={() => setAConfirmer(true)}>
                  Signer la sélection ({selection.length})
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
