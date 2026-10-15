'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { ActeNabmApiResponse } from '@/app/api/praticien/biologie/nabm/acte/route';
import type {
  CorrespondancesNabmApiResponse,
  DecisionCorrespondanceNabmApiResponse,
} from '@/app/api/praticien/biologie/nabm/correspondances/route';
import type {
  ActeNabmAffiche,
  CorrespondanceAffichee,
  EtatCorrespondance,
  NatureNabm,
} from '@/lib/biology-library/correspondancesNabm';
import { formatDate } from './FicheAnalytePanel';

// Signature des correspondances analyte ↔ acte NABM (M-3, F54), dans la fiche
// analyte. Le praticien lit la nomenclature, tape le CODE de l'acte qu'il a
// choisi, vérifie l'acte rendu par le serveur dans le millésime courant, pose
// la nature, puis signe. Aucun acte n'est proposé : pas de recherche par
// libellé (arbitrage du 2026-10-05). Signataire et date sont posés par le
// serveur ; l'écran envoie l'état qu'il a vu (`etatAttendu`).
//
// Les types sont importés en `import type` seulement : la lib serveur importe
// Prisma, qui ne doit pas entrer dans le paquet client.

const NATURES: { valeur: NatureNabm; libelle: string; aide: string }[] = [
  { valeur: 'isole', libelle: 'Acte isolé', aide: 'l’acte cote cet analyte seul' },
  {
    valeur: 'groupe_et',
    libelle: 'Groupe imposé',
    aide: 'l’acte cote un ensemble d’analytes demandés ensemble',
  },
  {
    valeur: 'groupe_ou',
    libelle: 'Groupe au choix',
    aide: 'l’acte couvre cet analyte ou un autre, chacun individuellement',
  },
];

const LABEL_NATURE: Record<string, string> = Object.fromEntries(
  NATURES.map(n => [n.valeur, n.libelle]),
);

/** La nature stockée d'une proposition, si elle est l'une des trois. */
function natureConnue(nature: string): NatureNabm | '' {
  return NATURES.find(n => n.valeur === nature)?.valeur ?? '';
}

function DetailActe({ acte }: { acte: ActeNabmAffiche }) {
  return (
    <span className="flex flex-col gap-1">
      <span className="text-sm text-foreground">
        {acte.codeActe} — {acte.libelle}
      </span>
      <span className="flex flex-wrap gap-1.5">
        {acte.coefficientB !== null && <Badge variant="neutral">B {acte.coefficientB}</Badge>}
        {acte.inactif && <Badge variant="danger">Inactif</Badge>}
        {acte.ententePrealable === true && <Badge variant="neutral">Entente préalable</Badge>}
        {acte.acteReserve === true && <Badge variant="neutral">Acte réservé</Badge>}
        {acte.remboursementTotal === false && <Badge variant="neutral">Remboursement partiel</Badge>}
      </span>
    </span>
  );
}

function ChoixNature({
  nom,
  valeur,
  onChange,
}: {
  nom: string;
  valeur: NatureNabm | '';
  onChange: (nature: NatureNabm) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-xs font-semibold text-foreground">Nature de la correspondance</legend>
      {NATURES.map(n => (
        <label key={n.valeur} className="flex items-start gap-2 text-sm text-foreground">
          <input
            type="radio"
            name={nom}
            value={n.valeur}
            checked={valeur === n.valeur}
            onChange={() => onChange(n.valeur)}
            className="mt-1"
          />
          <span>
            {n.libelle} <span className="text-muted-foreground">— {n.aide}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

export function CorrespondancesNabmSection({
  analyteCode,
  onModifie,
}: {
  analyteCode: string;
  /** Appelé après chaque signature ou retrait : le statut de remboursement de
   *  la fiche, dérivé côté serveur, est à relire. */
  onModifie?: () => void;
}) {
  const [correspondances, setCorrespondances] = useState<CorrespondanceAffichee[] | null>(null);
  const [millesime, setMillesime] = useState<string | null>(null);
  const [messageEchec, setMessageEchec] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const [codeSaisi, setCodeSaisi] = useState('');
  const [acteLu, setActeLu] = useState<{ code: string; acte: ActeNabmAffiche | null } | null>(null);
  const [natureNouvelle, setNatureNouvelle] = useState<NatureNabm | ''>('');
  const [naturesPropositions, setNaturesPropositions] = useState<Record<string, NatureNabm | ''>>({});
  const [retraitAConfirmer, setRetraitAConfirmer] = useState<string | null>(null);

  // Seule la DERNIÈRE lecture émise écrit à l'écran (patron du rayon).
  const sequence = useRef(0);
  // Le tiroir garde ce composant monté d'un analyte à l'autre : une lecture
  // d'acte ou une décision lancée sur l'analyte A ne doit rien écrire sur la
  // fiche de B — sinon l'acte lu pour A se signerait sous B (revue CodeRabbit).
  const generation = useRef(0);

  const charger = useCallback(async () => {
    const jeton = ++sequence.current;
    try {
      const res = await fetch(
        `/api/praticien/biologie/nabm/correspondances?analyte=${encodeURIComponent(analyteCode)}`,
        { cache: 'no-store' },
      );
      const json = (await res.json()) as CorrespondancesNabmApiResponse;
      if (jeton !== sequence.current) return;
      if (!res.ok || !json.ok) {
        setMessageEchec(!json.ok && json.error ? json.error : 'Impossible de lire les correspondances.');
        return;
      }
      setCorrespondances(json.correspondances);
      setMillesime(json.millesime);
    } catch {
      if (jeton !== sequence.current) return;
      setMessageEchec('Impossible de lire les correspondances.');
    }
  }, [analyteCode]);

  useEffect(() => {
    generation.current += 1;
    // Tout l'état propre à l'analyte repart de zéro : un choix de nature fait
    // sur A ne doit ni s'afficher ni s'envoyer sur B, et une requête de A
    // encore en vol ne doit pas tenir les boutons de B désactivés.
    setEnCours(false);
    setNaturesPropositions({});
    setCorrespondances(null);
    setMessageEchec(null);
    setCodeSaisi('');
    setActeLu(null);
    setNatureNouvelle('');
    setRetraitAConfirmer(null);
    void charger();
    return () => {
      sequence.current += 1;
    };
  }, [charger]);

  async function lireActe() {
    const code = codeSaisi.trim();
    setMessageEchec(null);
    setActeLu(null);
    if (!/^[0-9]{4}$/.test(code)) {
      setMessageEchec('Un code d’acte compte quatre chiffres.');
      return;
    }
    const perimee = (gen => () => gen !== generation.current)(generation.current);
    setEnCours(true);
    try {
      const res = await fetch(`/api/praticien/biologie/nabm/acte?code=${code}`, { cache: 'no-store' });
      const json = (await res.json()) as ActeNabmApiResponse;
      if (perimee()) return;
      if (!res.ok || !json.ok) {
        setMessageEchec(!json.ok && json.error ? json.error : 'Impossible de lire cet acte.');
        return;
      }
      setActeLu({ code, acte: json.acte });
    } catch {
      if (perimee()) return;
      setMessageEchec('Impossible de lire cet acte.');
    } finally {
      if (!perimee()) setEnCours(false);
    }
  }

  async function decider(corps: {
    codeActe: string;
    decision: 'signer' | 'retirer';
    etatAttendu: EtatCorrespondance;
    nature?: NatureNabm;
    verifieLeVu?: string;
  }) {
    const perimee = (gen => () => gen !== generation.current)(generation.current);
    setMessageEchec(null);
    setEnCours(true);
    try {
      const res = await fetch('/api/praticien/biologie/nabm/correspondances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analyteCode, ...corps }),
      });
      const json = (await res.json()) as DecisionCorrespondanceNabmApiResponse;
      if (perimee()) {
        // La fiche a changé d'analyte : rien à écrire ici, mais le catalogue
        // se relit si l'écriture a eu lieu.
        if (res.ok && json.ok) onModifie?.();
        return;
      }
      if (!res.ok || !json.ok) {
        setMessageEchec(!json.ok && json.error ? json.error : 'Le geste n’a pas été enregistré.');
        // L'état a pu bouger ailleurs : on relit ce que la base porte.
        await charger();
        return;
      }
      setCodeSaisi('');
      setActeLu(null);
      setNatureNouvelle('');
      setRetraitAConfirmer(null);
      await charger();
      onModifie?.();
    } catch {
      // Une réponse perdue ne dit pas si l'écriture a eu lieu : relire la
      // liste, et le catalogue, dont le remboursement a pu changer.
      if (!perimee()) {
        setMessageEchec('Le geste n’a pas été enregistré.');
        await charger();
      }
      onModifie?.();
    } finally {
      if (!perimee()) setEnCours(false);
    }
  }

  const dejaListee =
    acteLu !== null && (correspondances ?? []).some(c => c.codeActe === acteLu.code);

  return (
    <section aria-label="Correspondances à la nomenclature" className="flex flex-col gap-3">
      <div>
        <h5 className="text-sm font-semibold text-foreground">Correspondances à la nomenclature</h5>
        <p className="mt-1 text-xs text-muted-foreground">
          Seules les correspondances signées comptent pour le remboursement. Signer, c’est
          attester avoir lu l’acte dans la nomenclature{millesime ? ` (millésime ${millesime})` : ''}.
        </p>
      </div>

      {messageEchec && (
        <p
          role="alert"
          className="rounded-lg border border-status-danger/40 bg-status-danger/10 p-3 text-sm text-status-danger"
        >
          {messageEchec}
        </p>
      )}

      {correspondances === null ? (
        !messageEchec && (
          <p role="status" className="text-sm text-muted-foreground">
            Lecture des correspondances…
          </p>
        )
      ) : correspondances.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune correspondance pour cet analyte.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {correspondances.map(c => (
            <li
              key={c.codeActe}
              className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3"
            >
              {c.acte ? (
                <DetailActe acte={c.acte} />
              ) : (
                <span className="text-sm text-foreground">
                  {c.codeActe} — absent du millésime courant
                </span>
              )}
              {c.etat === 'signee' ? (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground">
                    {LABEL_NATURE[c.nature] ?? c.nature} · signée par {c.verifiePar}
                    {c.verifieLe ? ` le ${formatDate(c.verifieLe)}` : ''}
                  </p>
                  {retraitAConfirmer === c.codeActe ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-foreground">
                        La correspondance redeviendra une proposition non signée.
                      </span>
                      <Button
                        variant="danger"
                        disabled={enCours}
                        onClick={() =>
                          void decider({
                            codeActe: c.codeActe,
                            decision: 'retirer',
                            etatAttendu: 'signee',
                            verifieLeVu: c.verifieLe ?? undefined,
                          })
                        }
                      >
                        Confirmer le retrait
                      </Button>
                      <Button variant="outline" disabled={enCours} onClick={() => setRetraitAConfirmer(null)}>
                        Annuler
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <Button
                        variant="outline"
                        disabled={enCours}
                        onClick={() => setRetraitAConfirmer(c.codeActe)}
                      >
                        Retirer la signature
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground">
                    Proposition non signée ({LABEL_NATURE[c.nature] ?? c.nature}) : ne compte pas.
                  </p>
                  <ChoixNature
                    nom={`nature-${c.codeActe}`}
                    valeur={naturesPropositions[c.codeActe] ?? natureConnue(c.nature)}
                    onChange={nature =>
                      setNaturesPropositions(prev => ({ ...prev, [c.codeActe]: nature }))
                    }
                  />
                  <div>
                    <Button
                      disabled={
                        enCours ||
                        !(naturesPropositions[c.codeActe] ?? natureConnue(c.nature)) ||
                        !c.acte ||
                        c.acte.inactif
                      }
                      onClick={() => {
                        const nature = naturesPropositions[c.codeActe] ?? natureConnue(c.nature);
                        if (nature) {
                          void decider({
                            codeActe: c.codeActe,
                            decision: 'signer',
                            etatAttendu: 'proposition',
                            nature,
                          });
                        }
                      }}
                    >
                      Signer la correspondance
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {correspondances !== null && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
          <p className="text-xs font-semibold text-foreground">Ajouter une correspondance</p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Code de l’acte (quatre chiffres)
              <Input
                value={codeSaisi}
                onChange={event => {
                  setCodeSaisi(event.target.value);
                  setActeLu(null);
                }}
                inputMode="numeric"
                maxLength={4}
                autoComplete="off"
                className="w-28"
              />
            </label>
            <Button variant="outline" disabled={enCours} onClick={() => void lireActe()}>
              Lire l’acte
            </Button>
          </div>

          {acteLu &&
            (acteLu.acte === null ? (
              <p className="text-sm text-muted-foreground">
                Aucun acte {acteLu.code} dans le millésime courant de la nomenclature.
              </p>
            ) : dejaListee ? (
              <p className="text-sm text-muted-foreground">
                L’acte {acteLu.code} figure déjà dans les correspondances ci-dessus.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                <DetailActe acte={acteLu.acte} />
                {acteLu.acte.inactif ? (
                  <p className="text-sm text-muted-foreground">
                    Cet acte est inactif dans le millésime courant : il ne se signe pas.
                  </p>
                ) : (
                  <>
                    <ChoixNature nom="nature-nouvelle" valeur={natureNouvelle} onChange={setNatureNouvelle} />
                    <div>
                      <Button
                        disabled={enCours || !natureNouvelle}
                        onClick={() => {
                          if (natureNouvelle) {
                            void decider({
                              codeActe: acteLu.code,
                              decision: 'signer',
                              etatAttendu: 'absente',
                              nature: natureNouvelle,
                            });
                          }
                        }}
                      >
                        Signer la correspondance
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
        </div>
      )}
    </section>
  );
}
