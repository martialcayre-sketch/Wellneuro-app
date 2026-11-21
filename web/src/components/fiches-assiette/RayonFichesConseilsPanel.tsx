'use client';

// LE RAYON « FICHES CONSEILS » DE LA BIBLIOTHÈQUE ([[D-251]] §5 à §7, lot 6) :
// les douze fiches d'assiette adaptées des Fiches MY, l'état de leur dernière
// version et leur version de référence. Une version se relit ici, source et
// adaptation côte à côte, avant d'être validée — ou retirée.
//
// « VERSION DE RÉFÉRENCE », PAS « VERSION SERVIE » : c'est la plus récente
// validée (§5), mais ses contrôles sont rejoués au moment de la remettre
// (§6, lot 8) — l'écran ne promet pas qu'elle sera servie (constat de revue).
//
// Pas de drapeau : `WN_FICHES_ASSIETTE` garde l'ÉMISSION, pas la relecture
// (§7). Rien de ce rayon n'atteint un patient : la remise part du clic
// « Valider pour diffusion » d'un protocole, au cockpit.
//
// Les types seulement, depuis les modules serveur : un import de valeur tirerait
// Prisma et les tables cliniques dans le bundle client.

import { useCallback, useEffect, useRef, useState } from 'react';
import { EnTeteRayon } from '@/app/dashboard/bibliotheque/EnTeteRayon';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useFocusApresRelecture } from '@/components/ui/useFocusApresRelecture';
import type { RayonFichesApiResponse } from '@/app/api/praticien/fiches-assiette/route';
import type { LigneRayonFiche, ResumeVersion } from '@/lib/fiches-assiette/lecture';
import { RAISON_ILLISIBLE, libelleEtat } from './libelles';
import { RelectureFicheAssiette } from './RelectureFicheAssiette';

/** La version de référence d'une ligne : la dernière si elle est validée, sinon la dernière validée. */
function versionDeReference(ligne: LigneRayonFiche): ResumeVersion | null {
  if (ligne.derniere?.etat.etat === 'validee') return ligne.derniere;
  return ligne.derniereValidee;
}

export function RayonFichesConseilsPanel() {
  const [lignes, setLignes] = useState<LigneRayonFiche[] | null>(null);
  const [enCours, setEnCours] = useState(true);
  const [echec, setEchec] = useState<string | null>(null);
  const [versionOuverte, setVersionOuverte] = useState<string | null>(null);
  const sequence = useRef(0);

  const charger = useCallback(async () => {
    const jeton = ++sequence.current;
    const perimee = () => jeton !== sequence.current;
    setEnCours(true);
    setEchec(null);
    // Jamais l'ancienne liste pendant qu'on relit : au retour d'un acte, elle
    // afficherait l'état d'avant (constat de revue).
    setLignes(null);
    try {
      const res = await fetch('/api/praticien/fiches-assiette', { cache: 'no-store' });
      const json = (await res.json()) as RayonFichesApiResponse;
      if (perimee()) return;
      if (!res.ok || !json.ok) {
        setEchec(!json.ok && json.error ? json.error : 'Impossible de charger les fiches conseils.');
        return;
      }
      setLignes(json.assiettes);
    } catch {
      if (!perimee()) setEchec('Impossible de charger les fiches conseils.');
    } finally {
      if (!perimee()) setEnCours(false);
    }
  }, []);

  useEffect(() => {
    void charger();
    return () => {
      sequence.current += 1;
    };
  }, [charger]);

  // Au retour de la relecture, le focus revient au titre du rayon plutôt que
  // de tomber sur la page.
  // Le titre sert aussi au retour d'une relecture : une seule ref pour les deux.
  const { titreRef, boutonRef, relire } = useFocusApresRelecture();
  const retourDeRelecture = useRef(false);
  useEffect(() => {
    if (versionOuverte !== null || !retourDeRelecture.current) return;
    retourDeRelecture.current = false;
    titreRef.current?.focus();
  }, [versionOuverte, titreRef]);

  // L'en-tête du rayon est le h1 de la page (Q1 de D-481, complément DOC-13),
  // au niveau des autres rayons. Il reste au-dessus de la relecture : la page
  // garde son h1, et la relecture se range dessous, en h2.
  return (
    <section aria-labelledby="rayon-fiches-conseils-titre" className="flex flex-col gap-6">
      <EnTeteRayon
        idTitre="rayon-fiches-conseils-titre"
        titreRef={titreRef}
        surtitre="Rayon fiches conseils · adaptées des Fiches MY, validées ici"
        titre="Fiches conseils"
      >
        Une fiche par assiette d’indication. Chaque version déposée se relit en entier, source et
        adaptation côte à côte, avant d’être validée ; une version validée se retire à tout moment,
        avec un motif. La version de référence d’une fiche est sa plus récente version validée ;
        ses contrôles sont rejoués au moment de la remettre. Valider une fiche ne l’envoie à
        personne : elle part au patient au clic « Valider pour diffusion » d’un protocole qui
        porte son assiette, une fois l’envoi des fiches ouvert.
      </EnTeteRayon>

      {versionOuverte ? (
        // Une instance par version : une réponse tardive d'une version quittée
        // ne peut rien écrire dans celle qui est ouverte (constat de revue).
        <RelectureFicheAssiette
          key={versionOuverte}
          idVersion={versionOuverte}
          onOuvrirVersion={setVersionOuverte}
          onFermer={() => {
            retourDeRelecture.current = true;
            setVersionOuverte(null);
            void charger();
          }}
        />
      ) : enCours && lignes === null ? (
        <p role="status" className="text-sm text-muted-foreground">
          Chargement des fiches…
        </p>
      ) : echec ? (
        <div role="alert" className="flex flex-col items-start gap-2 text-sm text-status-danger">
          <p>{echec}</p>
          <Button ref={boutonRef} type="button" variant="outline" onClick={() => void relire(charger)}>
            Réessayer
          </Button>
        </div>
      ) : (
        <ul aria-label="Fiches d’assiette" className="flex flex-col gap-3">
          {(lignes ?? []).map(ligne => (
            <LigneFiche key={ligne.plateCode} ligne={ligne} onRelire={setVersionOuverte} />
          ))}
        </ul>
      )}
    </section>
  );
}

function LigneFiche({ ligne, onRelire }: { ligne: LigneRayonFiche; onRelire: (idVersion: string) => void }) {
  const reference = versionDeReference(ligne);
  const derniere = ligne.derniere;
  const validee = ligne.derniereValidee;
  return (
    <li
      data-testid={`fiche-assiette-${ligne.plateCode}`}
      className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-card sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <p className="font-medium text-foreground">{ligne.libelle}</p>
        <p className="text-xs text-muted-foreground">
          <span className="font-mono">{ligne.sourceId}</span> ·{' '}
          {ligne.nbVersions === 0
            ? 'aucune version déposée'
            : `${ligne.nbVersions} version${ligne.nbVersions > 1 ? 's' : ''}`}
        </p>
        <p className="text-xs text-muted-foreground">
          {reference ? `Version de référence : v${reference.numero}` : 'Aucune version de référence'}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {derniere ? (
          <>
            <EtatDeVersion resume={derniere} />
            <Button type="button" variant="outline" className="min-h-11" onClick={() => onRelire(derniere.id)}>
              Relire la v{derniere.numero}
            </Button>
          </>
        ) : (
          <Badge variant="neutral">Aucune version</Badge>
        )}
        {validee && (
          <Button type="button" variant="outline" className="min-h-11" onClick={() => onRelire(validee.id)}>
            Relire la v{validee.numero} (référence)
          </Button>
        )}
      </div>
    </li>
  );
}

function EtatDeVersion({ resume }: { resume: ResumeVersion }) {
  const { texte, variante } = libelleEtat(resume.etat);
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge variant={variante}>
        v{resume.numero} · {texte}
      </Badge>
      {resume.etat.etat === 'illisible' && (
        <span className="text-xs text-status-danger">{RAISON_ILLISIBLE[resume.etat.raison]}</span>
      )}
    </span>
  );
}
