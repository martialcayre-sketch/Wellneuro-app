'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import type { SignalementPraticien, TrustPraticienResponse } from '@/app/api/praticien/trust/route';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import {
  BROUILLON_AVIS_VIDE,
  type BrouillonAvis,
  ValidationEffetIndesirable,
} from '@/components/ValidationEffetIndesirable';
import { Button } from '@/components/ui/Button';
import { TRAIT_ICONE } from '@/components/ui/icone';

const LIBELLE_STATUT: Record<string, string> = {
  recu: 'Reçu',
  en_cours: 'En cours',
  traite: 'Traité',
  clos: 'Clos',
};
const BADGE_STATUT: Record<string, BadgeVariant> = {
  recu: 'warning',
  en_cours: 'info',
  traite: 'success',
  clos: 'neutral',
};

/** Un avis est attendu : le signalement en appelle un et aucun n'est en vigueur. */
const avisAttendu = (s: SignalementPraticien) =>
  Boolean(s.validation && !s.validation.verdicts.some(v => v.id === s.validation?.verdictCourantId));

/** Au bureau (≥ 1 024 px, `lg`), file et détail côte à côte. */
function useBureau() {
  const [bureau, setBureau] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const requete = window.matchMedia('(min-width: 1024px)');
    const maj = () => setBureau(requete.matches);
    maj();
    requete.addEventListener('change', maj);
    return () => requete.removeEventListener('change', maj);
  }, []);
  return bureau;
}

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

/**
 * File praticien des signalements et demandes TRUST (LOT-03/04) : effets
 * indésirables (avec l'orientation produite par la règle versionnée),
 * incidents de confidentialité, demandes de droits. Les statuts évoluent,
 * rien ne se supprime.
 *
 * FILE COMPACTE ET DÉTAIL (PRA-2b, [[D-481]] Q10 b). La file dit l'état de
 * chaque dépôt ; le détail porte le dépôt choisi en entier, avis toujours
 * déplié. Le choix vit dans l'adresse (`?depot=`, même route) : le retour du
 * navigateur et « Retour à la file » (T-19) rendent la file et la position.
 * Au bureau, file et détail côte à côte, le premier dépôt montré d'office ;
 * à la tablette et au téléphone, le détail occupe la vue. Les brouillons —
 * réponse d'une demande de droit, avis sur un effet indésirable — sont tenus
 * ici : quitter un détail ne perd rien et n'enregistre rien.
 */
export function TrustPanel() {
  const depotDemande = useSearchParams()?.get('depot') ?? null;
  const chemin = usePathname() ?? '/dashboard/droits';
  const bureau = useBureau();
  const [data, setData] = useState<TrustPraticienResponse | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);
  // Demandes de droit : brouillon de la réponse envoyée, et refus du serveur
  // (« Traité » exige une réponse écrite, D-295 §3), par signalement.
  const [brouillons, setBrouillons] = useState<Record<string, string>>({});
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [brouillonsAvis, setBrouillonsAvis] = useState<Record<string, BrouillonAvis>>({});
  const retourRef = useRef<HTMLAnchorElement>(null);
  const depotPrecedent = useRef(depotDemande);

  // LE FOCUS SUIT LA VUE, hors bureau seulement (où la file reste visible et
  // garde le focus) : ouvrir un dépôt pose le focus sur « Retour à la file »,
  // revenir le rend à la ligne quittée — qui revient ainsi sous les yeux.
  useEffect(() => {
    const avant = depotPrecedent.current;
    depotPrecedent.current = depotDemande;
    if (avant === depotDemande || bureau) return;
    if (depotDemande) retourRef.current?.focus();
    else if (avant) document.getElementById(`depot-${avant}`)?.focus();
  }, [depotDemande, bureau]);

  const charger = useCallback(async () => {
    try {
      const res = await fetch('/api/praticien/trust');
      setData((await res.json()) as TrustPraticienResponse);
    } catch {
      setData({ ok: false, error: 'Erreur réseau. Rechargez la page.' });
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  const reponseDe = (s: SignalementPraticien) => brouillons[s.id] ?? s.reponse ?? '';

  const changerStatut = async (signalement: SignalementPraticien, statutTraitement: string) => {
    setEnCours(signalement.id);
    setErreurs(e => ({ ...e, [signalement.id]: '' }));
    try {
      const res = await fetch('/api/praticien/trust', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: signalement.kind,
          id: signalement.id,
          statutTraitement,
          // Seul un brouillon saisi ici part : renvoyer le texte du dernier
          // chargement écraserait une réponse enregistrée entre-temps ailleurs.
          ...(signalement.kind === 'demande_droit' && brouillons[signalement.id] !== undefined
            ? { reponse: brouillons[signalement.id] }
            : {}),
        }),
      });
      const corps = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !corps?.ok) {
        setErreurs(e => ({ ...e, [signalement.id]: corps?.error ?? 'Erreur technique.' }));
        return;
      }
      setBrouillons(b => {
        const reste = { ...b };
        delete reste[signalement.id];
        return reste;
      });
      await charger();
    } catch {
      setErreurs(e => ({ ...e, [signalement.id]: 'Erreur réseau. Réessayez.' }));
    } finally {
      setEnCours(null);
    }
  };

  if (!data) {
    return <div className="bg-surface rounded-xl border border-border p-5 animate-pulse h-32 shadow-card" />;
  }
  if (!data.ok) {
    return (
      <div role="alert" className="bg-muted border border-border rounded-xl p-4 text-base text-muted-foreground">
        {data.error}
      </div>
    );
  }
  if (data.signalements.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl shadow-card p-6 text-base text-muted-foreground shadow-card">
        Aucun signalement ni demande pour le moment. Les dépôts des patients (effets indésirables,
        incidents de confidentialité, demandes de droits) apparaîtront ici et dans le Fil.
      </div>
    );
  }

  // Le dépôt montré : celui de l'adresse, sinon le premier (au bureau).
  const choisi = data.signalements.find(x => x.id === depotDemande) ?? null;
  const s = choisi ?? data.signalements[0];
  const montre = choisi?.id ?? (bureau ? s.id : null);

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
      <ul className={`${choisi ? 'hidden lg:flex' : 'flex'} min-w-0 list-none flex-col gap-2 p-0`}>
        {data.signalements.map(ligne => (
          <li key={ligne.id}>
            {/* La ligne entière ouvre le dépôt ; elle dit son état par un mot. */}
            <Link
              id={`depot-${ligne.id}`}
              href={`${chemin}?depot=${encodeURIComponent(ligne.id)}`}
              scroll={false}
              aria-current={ligne.id === montre ? 'true' : undefined}
              className={`flex flex-col gap-1.5 rounded-xl border bg-surface p-3 text-surface-foreground shadow-card hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
                ligne.id === montre ? 'border-primary ring-1 ring-primary' : 'border-border'
              }`}
            >
              <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="flex min-w-0 items-baseline gap-2">
                  <Badge variant={BADGE_STATUT[ligne.statutTraitement] ?? 'neutral'}>
                    {LIBELLE_STATUT[ligne.statutTraitement] ?? ligne.statutTraitement}
                  </Badge>
                  <span className="truncate text-sm font-semibold text-foreground">{ligne.patient}</span>
                </span>
                <span className="text-xs text-muted-foreground">{formatDate(ligne.soumisLe)}</span>
              </span>
              <span className="text-sm text-foreground">{ligne.resume}</span>
              {avisAttendu(ligne) && (
                <span className="self-start rounded-full bg-voice-practitioner px-2.5 py-0.5 text-xs font-semibold text-foreground">
                  En attente de votre avis.
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>

      {/* `key` : un détail par dépôt — l'état local d'un autre (son erreur)
          ne le suit pas. */}
      <article
        key={s.id}
        className={`${choisi ? 'block' : 'hidden lg:block'} min-w-0 rounded-xl border border-border bg-surface p-4 text-surface-foreground shadow-card`}
      >
        {/* T-19 ([[D-488]], DOC-6) : à la tablette et au téléphone seulement.
            N'enregistre rien : les brouillons restent tenus par ce panneau. */}
        <Link
          ref={retourRef}
          href={chemin}
          scroll={false}
          className="mb-3 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-primary underline underline-offset-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring lg:hidden"
        >
          <ArrowLeft aria-hidden="true" size={18} strokeWidth={TRAIT_ICONE} />
          Retour à la file
        </Link>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <div className="flex items-baseline gap-2 min-w-0">
            <Badge variant={BADGE_STATUT[s.statutTraitement] ?? 'neutral'}>
              {LIBELLE_STATUT[s.statutTraitement] ?? s.statutTraitement}
            </Badge>
            <Link href={`/dashboard/patients/${s.idPatient}`} className="truncate rounded-sm text-sm font-semibold text-primary underline underline-offset-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
              {s.patient}
            </Link>
          </div>
          <span className="text-xs text-muted-foreground">{formatDate(s.soumisLe)}</span>
        </div>
        <p className="text-base text-foreground mt-2">{s.resume}</p>
        {s.detail && <p className="text-xs text-muted-foreground mt-1">{s.detail}</p>}
        {s.orientation && (
          <p className="text-xs text-muted-foreground mt-1">
            Orientation donnée au patient : {s.orientation}
          </p>
        )}
        {s.validation && (
          <ValidationEffetIndesirable
            reportId={s.id}
            validation={s.validation}
            debutPriseLe={s.debutPriseLe ?? null}
            debutSymptomesLe={s.debutSymptomesLe ?? null}
            pauseServie={data.pauseServie}
            onEnregistre={charger}
            brouillon={brouillonsAvis[s.id] ?? BROUILLON_AVIS_VIDE}
            onBrouillon={b => setBrouillonsAvis(tous => ({ ...tous, [s.id]: b }))}
          />
        )}
        <div className="mt-3 flex items-center gap-2">
          <label className="text-xs text-muted-foreground" htmlFor={`statut-${s.id}`}>
            Statut de traitement
          </label>
          <select
            id={`statut-${s.id}`}
            value={s.statutTraitement}
            disabled={enCours === s.id}
            onChange={e => void changerStatut(s, e.target.value)}
            className="min-h-11 text-sm rounded-lg border border-control-border bg-surface px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {Object.entries(LIBELLE_STATUT).map(([valeur, libelle]) => (
              <option key={valeur} value={valeur}>{libelle}</option>
            ))}
          </select>
        </div>
        {s.kind === 'demande_droit' && (
          <div className="mt-3 flex flex-col gap-2">
            <label className="text-xs text-muted-foreground" htmlFor={`reponse-${s.id}`}>
              Réponse envoyée au patient (requise pour « Traité »)
            </label>
            <textarea
              id={`reponse-${s.id}`}
              value={reponseDe(s)}
              onChange={e => setBrouillons(b => ({ ...b, [s.id]: e.target.value }))}
              rows={3}
              maxLength={2000}
              disabled={enCours === s.id}
              placeholder="Recopiez ici la réponse envoyée par e-mail."
              className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <div>
              <Button
                variant="outline"
                disabled={enCours === s.id}
                onClick={() => void changerStatut(s, s.statutTraitement)}
              >
                Enregistrer la réponse
              </Button>
            </div>
          </div>
        )}
        {erreurs[s.id] && (
          <p role="alert" className="mt-2 text-sm text-status-danger">
            {erreurs[s.id]}
          </p>
        )}
      </article>
    </div>
  );
}
