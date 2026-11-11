'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
  lireListeExclusion,
  type ListeExclusionLue,
  type SensExclusion,
} from '@/lib/rag/claims/exclusionRecherche';
import type { CorpusExclusionRechercheLotApiResponse } from '@/app/api/praticien/corpus/claims/exclusion-recherche-lot/route';

// Exclusion de la recherche en lot ([[D-490]] §3 et §6, au patron de
// l'étiquetage en lot de [[D-325]]). Le praticien choisit le sens, colle une
// liste (un claim par ligne : identifiant ; motif), la relit dans l'aperçu,
// puis confirme : un geste, un acte `exclusion_recherche` par claim au
// journal. Une ligne illisible bloque l'envoi — rien n'est complété ni ignoré
// en silence ; la base refuse à son tour tout claim introuvable ou non
// validé, et alors rien n'est écrit. Les claims restent validés et citables.

const RAISONS_REFUS: Record<string, string> = {
  claim_introuvable: 'introuvable',
  claim_non_valide: 'pas validé',
  claim_ambigu: 'plusieurs versions actives',
  version_divergente: 'autre version active',
};

type Etat = 'saisie' | 'apercu' | 'confirmation' | 'envoi' | 'fait';

export function ExclusionRechercheLotPanel({ onConclu }: { onConclu?: () => void }) {
  const [ouvert, setOuvert] = useState(false);
  const [sens, setSens] = useState<SensExclusion>('exclure');
  const [texte, setTexte] = useState('');
  const [liste, setListe] = useState<ListeExclusionLue | null>(null);
  const [etat, setEtat] = useState<Etat>('saisie');
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');
  const [refus, setRefus] = useState<Array<{ claimId: string; raison: string }>>([]);
  const boutonConfirmer = useRef<HTMLButtonElement>(null);

  // Le bouton du geste disparaît au clic : le focus passe à la confirmation.
  useEffect(() => {
    if (etat === 'confirmation') boutonConfirmer.current?.focus();
  }, [etat]);

  const reinitialiserApercu = () => {
    setMessage('');
    setEtat('saisie');
    setListe(null);
    setErreur('');
    setRefus([]);
  };

  const verifier = () => {
    setListe(lireListeExclusion(texte));
    setEtat('apercu');
    setErreur('');
    setRefus([]);
    setMessage('');
  };

  const envoyer = async () => {
    if (!liste) return;
    setEtat('envoi');
    setErreur('');
    setRefus([]);
    try {
      const reponse = await fetch('/api/praticien/corpus/claims/exclusion-recherche-lot', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sens, lignes: liste.lignes }),
      });
      const payload = (await reponse.json()) as CorpusExclusionRechercheLotApiResponse;
      if (!reponse.ok || !payload.ok) {
        setErreur(payload.ok ? 'Réponse illisible.' : payload.error);
        if (!payload.ok && 'refus' in payload) setRefus(payload.refus);
        setEtat('apercu');
        return;
      }
      const s = (k: number) => (k > 1 ? 's' : '');
      const geste = sens === 'exclure' ? 'exclu' : 'rétabli';
      const lieu = sens === 'exclure' ? 'de la recherche' : 'dans la recherche';
      const k = payload.inchanges;
      setMessage(
        `${payload.n} claim${s(payload.n)} ${geste}${s(payload.n)} ${lieu}.` +
          (k > 0
            ? ` ${k} l’étai${k > 1 ? 'ent' : 't'} déjà : laissé${s(k)} tel${s(k)} quel${s(k)}, sans nouvel acte.`
            : ''),
      );
      setTexte('');
      setListe(null);
      setEtat('fait');
      onConclu?.();
    } catch {
      setErreur(
        'Résultat inconnu : la réponse n’a pas pu être lue. Vérifiez les claims dans l’atelier avant de renvoyer ; un renvoi de la même liste n’ajoute aucun acte sur un claim déjà dans cet état.',
      );
      setEtat('apercu');
      // Le lot a pu être écrit : la file de l'atelier est relue, l'aperçu reste.
      onConclu?.();
    }
  };

  const pret = liste !== null && liste.erreurs.length === 0 && liste.lignes.length > 0;
  const n = liste?.lignes.length ?? 0;

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-xl font-bold text-foreground">Exclusion de la recherche en lot</h3>
        <Button variant="outline" aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)}>
          {ouvert ? 'Fermer' : 'Traiter une liste'}
        </Button>
      </div>
      {message ? (
        <p role="status" className="mt-3 text-sm text-foreground">
          {message}
        </p>
      ) : null}

      {ouvert ? (
        <div className="mt-3 flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Un claim validé par ligne : identifiant ; motif — par exemple « WN-CL-0001-001@v1.0 ;
            dossier, classement ». Le motif est obligatoire. Un claim exclu ne remonte plus par la
            recherche des rayons ; il reste validé, signé et citable.
          </p>
          <fieldset className="flex flex-wrap items-center gap-4" disabled={etat === 'envoi'}>
            <legend className="sr-only">Sens du geste</legend>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="exclusion-lot-sens"
                value="exclure"
                checked={sens === 'exclure'}
                onChange={() => {
                  setSens('exclure');
                  reinitialiserApercu();
                }}
              />
              Exclure de la recherche
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="exclusion-lot-sens"
                value="retablir"
                checked={sens === 'retablir'}
                onChange={() => {
                  setSens('retablir');
                  reinitialiserApercu();
                }}
              />
              Rétablir dans la recherche
            </label>
          </fieldset>
          <label htmlFor="exclusion-lot-liste" className="text-sm font-medium text-foreground">
            Liste à traiter
          </label>
          <textarea
            id="exclusion-lot-liste"
            value={texte}
            onChange={(event) => {
              setTexte(event.target.value);
              reinitialiserApercu();
            }}
            rows={8}
            disabled={etat === 'envoi'}
            className="rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
          />
          <div>
            <Button variant="outline" disabled={!texte.trim() || etat === 'envoi'} onClick={verifier}>
              Vérifier la liste
            </Button>
          </div>

          {liste && etat !== 'saisie' ? (
            <div className="flex flex-col gap-3">
              {liste.erreurs.length > 0 ? (
                <div role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <p className="font-medium">
                    {liste.erreurs.length} ligne{liste.erreurs.length > 1 ? 's' : ''} à corriger avant
                    l’envoi :
                  </p>
                  <ul className="mt-1 list-disc pl-5">
                    {liste.erreurs.map((e) => (
                      <li key={`${e.numero}-${e.raison}`}>
                        {e.numero > 0 ? `Ligne ${e.numero} : ` : ''}
                        {e.raison}
                        {e.texte ? ` — « ${e.texte} »` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {n > 0 ? (
                <div className="max-h-80 overflow-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <caption className="px-3 py-2 text-left text-sm text-muted-foreground">
                      {n} claim{n > 1 ? 's' : ''} lu{n > 1 ? 's' : ''}
                    </caption>
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground">
                        <th className="px-3 py-1.5 font-medium">Claim</th>
                        <th className="px-3 py-1.5 font-medium">Motif</th>
                      </tr>
                    </thead>
                    <tbody>
                      {liste.lignes.map((ligne) => (
                        <tr key={ligne.claimId} className="border-t border-border">
                          <td className="px-3 py-1.5 font-mono">
                            {ligne.claimId}
                            {ligne.versionClaim ? `@${ligne.versionClaim}` : ''}
                          </td>
                          <td className="px-3 py-1.5">{ligne.motif}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {erreur ? (
                <div role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <p>{erreur}</p>
                  {refus.length > 0 ? (
                    <ul className="mt-1 list-disc pl-5">
                      {refus.map((r) => (
                        <li key={r.claimId}>
                          {r.claimId} : {RAISONS_REFUS[r.raison] ?? r.raison}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}

              {pret && etat === 'apercu' ? (
                <div>
                  <Button onClick={() => setEtat('confirmation')}>
                    {sens === 'exclure' ? 'Exclure' : 'Rétablir'} {n > 1 ? `ces ${n} claims` : 'ce claim'}
                  </Button>
                </div>
              ) : null}
              {pret && (etat === 'confirmation' || etat === 'envoi') ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span role="status" className="text-sm font-medium text-foreground">
                    {sens === 'exclure' ? 'Exclure de la recherche' : 'Rétablir dans la recherche'}{' '}
                    {n > 1 ? `${n} claims validés` : '1 claim validé'} ? Un acte par claim est journalisé
                    à votre nom, avec son motif.
                  </span>
                  <Button ref={boutonConfirmer} disabled={etat === 'envoi'} onClick={() => void envoyer()}>
                    {etat === 'envoi'
                      ? 'Envoi…'
                      : sens === 'exclure'
                        ? 'Confirmer l’exclusion'
                        : 'Confirmer le rétablissement'}
                  </Button>
                  <Button variant="outline" disabled={etat === 'envoi'} onClick={() => setEtat('apercu')}>
                    Annuler
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
