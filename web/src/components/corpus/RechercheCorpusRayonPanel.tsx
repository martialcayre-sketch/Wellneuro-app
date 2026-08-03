'use client';

import { useCallback, useRef, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { CorpusRayonsApiResponse } from '@/app/api/praticien/corpus/rayons/route';
import type { ClaimRayon } from '@/lib/supplement-library/rayonCorpus';

// Recherche corpus clinique — instrument de consultation simple : un rayon,
// une requête libre, les claims validés qui en ressortent. Contrairement au
// rayon compléments (catalogue de 140 148 fiches produit), il n'y a ici ni
// facette, ni pagination, ni fiche produit : juste la barrière D-003
// (match_wellneuro_rag_claims) exposée pour les rayons sans navigateur de
// catalogue dédié (cognition, intestin — d'autres pourront s'ajouter ici sans
// nouvel écran, à condition d'étendre RAYONS_RECHERCHE_CORPUS côté service).

const RAYONS_DISPONIBLES: ReadonlyArray<{ valeur: string; libelle: string }> = [
  { valeur: 'cognition', libelle: 'Cognition et mémoire' },
  { valeur: 'intestin', libelle: 'Axe intestin-cerveau' },
];

const MESSAGE_REQUETE_ATTENDUE = 'Saisissez une recherche pour afficher les claims validés de ce rayon.';
const MESSAGE_AUCUN_CLAIM = 'Aucun claim ne correspond à cette recherche.';
const TITRE_PRESCRIPTIF = 'Claim prescriptif — posologie ou seuil ; à contextualiser avant toute reprise patient.';

function libelleClasseAutorite(valeur: string): string {
  return valeur.replaceAll('_', ' ');
}

export function RechercheCorpusRayonPanel() {
  const [rayon, setRayon] = useState(RAYONS_DISPONIBLES[0].valeur);
  const [requeteSaisie, setRequeteSaisie] = useState('');
  const [resultat, setResultat] = useState<CorpusRayonsApiResponse | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [messageEchec, setMessageEchec] = useState<string | null>(null);

  // Jeton de séquence : seule la dernière requête émise a le droit d'écrire à
  // l'écran (une réponse lente arrivée après une réponse rapide afficherait
  // des claims qui ne correspondent plus au rayon/requête courants).
  const sequence = useRef(0);

  // Changer de rayon invalide tout résultat affiché : sans cela, basculer de
  // « cognition » à « intestin » laisserait les claims de cognition à l'écran
  // sous un sélecteur affichant « Axe intestin-cerveau » — un claim attribué
  // au mauvais rayon, sur un instrument de consultation clinique.
  function changerRayon(valeur: string) {
    sequence.current += 1;
    setRayon(valeur);
    setResultat(null);
    setMessageEchec(null);
    setEnCours(false);
  }

  const rechercher = useCallback(async () => {
    const requete = requeteSaisie.trim();
    if (!requete) {
      setResultat(null);
      setMessageEchec(null);
      return;
    }
    const jeton = ++sequence.current;
    const perimee = () => jeton !== sequence.current;
    setEnCours(true);
    setMessageEchec(null);
    try {
      const url = `/api/praticien/corpus/rayons?rayon=${encodeURIComponent(rayon)}&requete=${encodeURIComponent(requete)}`;
      const res = await fetch(url, { cache: 'no-store' });
      const json = (await res.json()) as CorpusRayonsApiResponse;
      if (perimee()) return;
      if (!res.ok || !json.ok) {
        setResultat(null);
        setMessageEchec(!json.ok && json.error ? json.error : 'Impossible de charger le corpus.');
        return;
      }
      setResultat(json);
    } catch {
      if (perimee()) return;
      setResultat(null);
      setMessageEchec('Impossible de charger le corpus.');
    } finally {
      if (!perimee()) setEnCours(false);
    }
  }, [rayon, requeteSaisie]);

  const claims: ClaimRayon[] = resultat && resultat.ok ? resultat.claims : [];

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs font-semibold text-foreground">
          Rayon
          <select
            value={rayon}
            onChange={(e) => changerRayon(e.target.value)}
            aria-label="Rayon de recherche corpus"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {RAYONS_DISPONIBLES.map(({ valeur, libelle }) => (
              <option key={valeur} value={valeur}>
                {libelle}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 min-w-[16rem] flex-col gap-1 text-xs font-semibold text-foreground">
          Recherche
          <input
            value={requeteSaisie}
            disabled={enCours}
            onChange={(e) => setRequeteSaisie(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void rechercher();
              }
            }}
            placeholder="Ex. mémoire de travail, microbiote"
            aria-label="Recherche dans le rayon"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </label>
        <Button type="button" variant="outline" onClick={() => void rechercher()} disabled={enCours}>
          Rechercher
        </Button>
      </div>

      <div className="mt-4">
        {!requeteSaisie.trim() ? (
          <p className="text-sm text-muted-foreground">{MESSAGE_REQUETE_ATTENDUE}</p>
        ) : enCours ? (
          <p className="text-sm text-muted-foreground">Recherche en cours…</p>
        ) : messageEchec ? (
          <div role="alert" className="flex flex-col gap-2 text-sm text-status-danger">
            <p>{messageEchec}</p>
            <Button type="button" variant="outline" onClick={() => void rechercher()}>
              Réessayer
            </Button>
          </div>
        ) : resultat && resultat.ok && resultat.corpusVide ? (
          <p className="text-sm text-muted-foreground">{resultat.message}</p>
        ) : claims.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {claims.map((claim) => (
              <li key={`${claim.claimId}-${claim.versionClaim}`} className="rounded-lg border border-border p-3">
                <p className="text-sm text-foreground">« {claim.texteNormalise} »</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant="neutral">{libelleClasseAutorite(claim.classeAutorite)}</Badge>
                  <Badge variant="neutral">{libelleClasseAutorite(claim.niveauPreuve)}</Badge>
                  {claim.prescriptif && (
                    <Badge variant="warning">
                      <span title={TITRE_PRESCRIPTIF}>Prescriptif</span>
                    </Badge>
                  )}
                </div>
                {claim.validateur && (
                  <p className="mt-2 text-2xs text-muted-foreground">
                    Validé par {claim.validateur}
                    {claim.valideAt ? ` le ${new Date(claim.valideAt).toLocaleDateString('fr-FR')}` : ''}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : resultat ? (
          <p className="text-sm text-muted-foreground">{MESSAGE_AUCUN_CLAIM}</p>
        ) : null}
      </div>
    </div>
  );
}
