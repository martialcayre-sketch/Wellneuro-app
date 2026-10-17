'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { ActeNabmApiResponse } from '@/app/api/praticien/biologie/nabm/acte/route';
import type { RechercheNabmApiResponse } from '@/app/api/praticien/biologie/nabm/recherche/route';
import type {
  CorrespondancesNabmApiResponse,
  DecisionCorrespondanceNabmApiResponse,
} from '@/app/api/praticien/biologie/nabm/correspondances/route';
import type { DecisionConstatNabmApiResponse } from '@/app/api/praticien/biologie/nabm/constats/route';
import type {
  ActeNabmAffiche,
  CandidatsNabmAffiches,
  ConstatAffiche,
  CorrespondanceAffichee,
  EtatCorrespondance,
  NatureNabm,
} from '@/lib/biology-library/correspondancesNabm';
import { formatDate } from './FicheAnalytePanel';

// Signature des correspondances analyte ↔ acte NABM (M-3, F54), dans la fiche
// analyte. Le praticien cherche l'acte par son libellé (D-320 §1) ou tape
// son CODE, vérifie l'acte rendu par le serveur dans le millésime courant,
// pose la nature, puis signe. La recherche ne rapproche rien d'elle-même :
// le praticien choisit le résultat qu'il lit. L'écran affiche aussi les
// candidats de la liste relue (M-3b, arbitrage du 2026-10-15), résolus par le
// serveur au millésime courant, nature présélectionnée, à signer en un clic
// par le même POST. Signataire et date sont posés par le serveur ; l'écran
// envoie l'état qu'il a vu (`etatAttendu`).
//
// Pour un analyte que la liste range « aucun acte », le praticien peut signer
// le constat « aucun acte dans la nomenclature » sur le millésime affiché
// (M-3c) : l'analyte passe « hors nomenclature ». Le constat ne vaut que pour
// ce millésime ; périmé, il se retire puis se pose à nouveau. Signature et
// constat s'excluent : le bouton n'est pas offert tant qu'une signature existe.
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

/** Pourquoi rien n'est à signer, selon la situation de la liste préparée. */
const SANS_ACTE: Record<string, string> = {
  aucun_acte: 'aucun acte de la nomenclature ne nomme cet analyte',
  valeur_calculee: 'valeur calculée, qui ne se cote pas elle-même',
  regroupement: 'analyte de regroupement, coté par ses composants',
};

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
  const [candidats, setCandidats] = useState<CandidatsNabmAffiches | null>(null);
  const [naturesCandidats, setNaturesCandidats] = useState<Record<string, NatureNabm>>({});
  const [messageEchec, setMessageEchec] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const [rechercheSaisie, setRechercheSaisie] = useState('');
  const [resultatsRecherche, setResultatsRecherche] = useState<{
    saisie: string;
    millesime: string;
    total: number;
    actes: ActeNabmAffiche[];
  } | null>(null);
  const [codeSaisi, setCodeSaisi] = useState('');
  const [acteLu, setActeLu] = useState<{ code: string; acte: ActeNabmAffiche | null } | null>(null);
  const [natureNouvelle, setNatureNouvelle] = useState<NatureNabm | ''>('');
  const [naturesPropositions, setNaturesPropositions] = useState<Record<string, NatureNabm | ''>>({});
  const [retraitAConfirmer, setRetraitAConfirmer] = useState<string | null>(null);
  const [constat, setConstat] = useState<ConstatAffiche | null>(null);
  const [retraitConstatAConfirmer, setRetraitConstatAConfirmer] = useState(false);

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
      setCandidats(json.candidats ?? null);
      setConstat(json.constat ?? null);
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
    setNaturesCandidats({});
    setCorrespondances(null);
    setCandidats(null);
    setConstat(null);
    setRetraitConstatAConfirmer(false);
    setMessageEchec(null);
    setRechercheSaisie('');
    setResultatsRecherche(null);
    setCodeSaisi('');
    setActeLu(null);
    setNatureNouvelle('');
    setRetraitAConfirmer(null);
    void charger();
    return () => {
      sequence.current += 1;
    };
  }, [charger]);

  async function chercherActes() {
    const saisie = rechercheSaisie.trim();
    setMessageEchec(null);
    setResultatsRecherche(null);
    if (saisie.length < 3) {
      setMessageEchec('Une recherche compte au moins trois caractères.');
      return;
    }
    const perimee = (gen => () => gen !== generation.current)(generation.current);
    setEnCours(true);
    try {
      const res = await fetch(
        `/api/praticien/biologie/nabm/recherche?q=${encodeURIComponent(saisie)}`,
        { cache: 'no-store' },
      );
      const json = (await res.json()) as RechercheNabmApiResponse;
      if (perimee()) return;
      if (!res.ok || !json.ok) {
        setMessageEchec(!json.ok && json.error ? json.error : 'Impossible de chercher dans la nomenclature.');
        return;
      }
      setResultatsRecherche({ saisie, millesime: json.millesime, total: json.total, actes: json.actes });
    } catch {
      if (perimee()) return;
      setMessageEchec('Impossible de chercher dans la nomenclature.');
    } finally {
      if (!perimee()) setEnCours(false);
    }
  }

  async function lireActe(codeChoisi?: string) {
    if (codeChoisi !== undefined) setCodeSaisi(codeChoisi);
    const code = (codeChoisi ?? codeSaisi).trim();
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
    await envoyer('/api/praticien/biologie/nabm/correspondances', corps);
  }

  async function deciderConstat(
    corps: { decision: 'constater'; millesimeVu: string } | { decision: 'retirer'; verifieLeVu: string },
  ) {
    await envoyer('/api/praticien/biologie/nabm/constats', corps);
  }

  /** Un geste (signature, retrait, constat) : POST, puis relecture. */
  async function envoyer(url: string, corps: Record<string, unknown>) {
    const perimee = (gen => () => gen !== generation.current)(generation.current);
    setMessageEchec(null);
    setEnCours(true);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analyteCode, ...corps }),
      });
      const json = (await res.json()) as DecisionCorrespondanceNabmApiResponse | DecisionConstatNabmApiResponse;
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
      setRechercheSaisie('');
      setResultatsRecherche(null);
      setCodeSaisi('');
      setActeLu(null);
      setNatureNouvelle('');
      setRetraitAConfirmer(null);
      setRetraitConstatAConfirmer(false);
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
  const signee = (correspondances ?? []).some(c => c.etat === 'signee');
  const constatEnvisageable =
    correspondances !== null && constat === null && !signee && millesime !== null && candidats?.situation === 'aucun_acte';
  // La liste ne prouve l'absence d'acte que dans le millésime où elle a été
  // relue : sur un autre, pas de constat avant sa relecture (le serveur refuse
  // aussi, `liste_a_relire`).
  const constatPossible = constatEnvisageable && millesime === candidats?.millesimeListe;

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

      {correspondances !== null && candidats && candidats.propositions.length > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
          <div>
            <p className="text-xs font-semibold text-foreground">Propositions à signer</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Préparées sur le millésime {candidats.millesimeListe} à partir des libellés de la
              nomenclature. Rien ne compte avant votre signature : vérifiez l’acte et sa nature.
            </p>
          </div>
          <ul className="flex flex-col gap-2">
            {candidats.propositions.map(p => {
              const nature = naturesCandidats[p.codeActe] ?? p.nature;
              return (
                <li
                  key={p.codeActe}
                  className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3"
                >
                  <DetailActe acte={p.acte} />
                  {candidats.situation === 'a_juger' && (
                    <span>
                      <Badge variant="warning">À juger</Badge>
                    </span>
                  )}
                  <p className="text-xs text-muted-foreground">{p.motif}</p>
                  <ChoixNature
                    nom={`nature-candidat-${p.codeActe}`}
                    valeur={nature}
                    onChange={choisie => setNaturesCandidats(prev => ({ ...prev, [p.codeActe]: choisie }))}
                  />
                  <div>
                    <Button
                      disabled={enCours}
                      onClick={() =>
                        void decider({
                          codeActe: p.codeActe,
                          decision: 'signer',
                          etatAttendu: 'absente',
                          nature,
                        })
                      }
                    >
                      Signer cette proposition
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Une correspondance déjà en base (posée à la main) fait foi : la
          mention de la liste la contredirait. */}
      {correspondances !== null && correspondances.length === 0 && candidats && SANS_ACTE[candidats.situation] && (
        <div className="flex flex-col gap-1 rounded-lg border border-border p-3">
          <p className="text-sm text-foreground">
            Rien à signer : {SANS_ACTE[candidats.situation]} (liste préparée sur le millésime{' '}
            {candidats.millesimeListe}).
          </p>
          {candidats.motif && <p className="text-xs text-muted-foreground">{candidats.motif}</p>}
        </div>
      )}

      {correspondances !== null && constat && (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          {constat.perime ? (
            <>
              <p className="text-sm text-foreground">
                Constat périmé ({constat.millesime})
                {millesime ? ` — à renouveler au millésime ${millesime}` : ''}
              </p>
              <p className="text-xs text-muted-foreground">
                Il ne vaut que pour le millésime constaté : l’analyte reste « non évalué » jusqu’à
                un nouveau constat. Retirez-le, puis constatez à nouveau.
              </p>
            </>
          ) : (
            <p className="text-sm text-foreground">
              Constat signé : aucun acte dans la nomenclature ({constat.millesime}) — l’analyte est
              hors nomenclature.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Signé par {constat.verifiePar} le {formatDate(constat.verifieLe)}
          </p>
          {retraitConstatAConfirmer ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-foreground">L’analyte repassera « non évalué ».</span>
              <Button
                variant="danger"
                disabled={enCours}
                onClick={() => void deciderConstat({ decision: 'retirer', verifieLeVu: constat.verifieLe })}
              >
                Confirmer le retrait
              </Button>
              <Button variant="outline" disabled={enCours} onClick={() => setRetraitConstatAConfirmer(false)}>
                Annuler
              </Button>
            </div>
          ) : (
            <div>
              <Button variant="outline" disabled={enCours} onClick={() => setRetraitConstatAConfirmer(true)}>
                Retirer le constat
              </Button>
            </div>
          )}
        </div>
      )}

      {constatPossible && millesime && (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">
            Constater, c’est attester avoir cherché cet analyte dans la nomenclature (millésime{' '}
            {millesime}) sans y trouver d’acte. Le constat ne vaut que pour ce millésime.
          </p>
          <div>
            <Button
              disabled={enCours}
              onClick={() => void deciderConstat({ decision: 'constater', millesimeVu: millesime })}
            >
              Constater : aucun acte dans la nomenclature ({millesime})
            </Button>
          </div>
        </div>
      )}

      {constatEnvisageable && !constatPossible && candidats && (
        <p className="rounded-lg border border-border p-3 text-xs text-muted-foreground">
          Constat indisponible : la liste des analytes sans acte a été préparée sur le millésime{' '}
          {candidats.millesimeListe}, la nomenclature courante est le millésime {millesime}. Elle doit
          être relue avant tout constat.
        </p>
      )}

      {correspondances !== null && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
          <p className="text-xs font-semibold text-foreground">Ajouter une correspondance</p>
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={event => {
              event.preventDefault();
              void chercherActes();
            }}
          >
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Rechercher dans la nomenclature (libellé)
              <Input
                value={rechercheSaisie}
                onChange={event => setRechercheSaisie(event.target.value)}
                maxLength={80}
                autoComplete="off"
                placeholder="ex. homocystéine"
                className="w-64"
              />
            </label>
            <Button type="submit" variant="outline" disabled={enCours}>
              Chercher
            </Button>
          </form>

          {resultatsRecherche &&
            (resultatsRecherche.actes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun acte du millésime {resultatsRecherche.millesime} ne contient «{' '}
                {resultatsRecherche.saisie} ».
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {resultatsRecherche.total > resultatsRecherche.actes.length && (
                  <p className="text-xs text-muted-foreground">
                    {resultatsRecherche.actes.length} premiers sur {resultatsRecherche.total} —
                    précisez la recherche.
                  </p>
                )}
                <ul aria-label="Actes trouvés" className="flex flex-col gap-2">
                  {resultatsRecherche.actes.map(acte => (
                    <li
                      key={acte.codeActe}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface p-2"
                    >
                      <DetailActe acte={acte} />
                      <Button
                        variant="outline"
                        disabled={enCours}
                        aria-label={`Lire l’acte ${acte.codeActe}`}
                        onClick={() => void lireActe(acte.codeActe)}
                      >
                        Lire cet acte
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

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
