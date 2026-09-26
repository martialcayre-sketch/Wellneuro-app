'use client';

import { useId, useState } from 'react';
import { FileDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PanneauSuperpose } from '@/components/ui/PanneauSuperpose';
import type { VersionExport } from '@/lib/export-dossier/modele';

// Export PDF du dossier (D-252). Téléchargement par `fetch` plutôt que par un
// simple lien : c'est la seule façon de dire POURQUOI il échoue (session
// expirée, dossier hors du compte) au lieu d'enregistrer une page d'erreur
// sous un nom en `.pdf`.

const OPTIONS_VERSION: readonly { valeur: VersionExport; libelle: string; aide: string }[] = [
  {
    valeur: 'ia-externe',
    libelle: 'Pour une IA externe (pseudonymisée)',
    aide:
      'Sans nom, prénom, date de naissance, coordonnées, numéro de sécurité sociale ni médecin traitant ; '
      + 'l’âge et l’identifiant du dossier restent. Leurs occurrences dans les textes libres sont masquées : '
      + 'relisez le PDF avant de l’envoyer.',
  },
  {
    valeur: 'complete',
    libelle: 'Complète',
    aide:
      'Identité, coordonnées et numéro de sécurité sociale compris. À conserver dans votre environnement de '
      + 'santé : ne pas transmettre à un service d’IA externe.',
  },
];

const VERSION_PAR_DEFAUT: VersionExport = 'ia-externe';

// Révoquer dans la foulée du clic peut interrompre le téléchargement sur
// certains navigateurs : on laisse le temps de lire le blob.
const DELAI_REVOCATION_MS = 40_000;

function messageEchec(statut: number | null): string {
  if (statut === 401) return 'Votre session a expiré : reconnectez-vous puis recommencez.';
  if (statut === 403 || statut === 404) return 'Ce dossier n’est pas accessible depuis votre compte.';
  return 'Le PDF n’a pas pu être préparé. Réessayez dans un instant.';
}

function nomDeFichier(disposition: string | null, idPatient: string): string {
  const nom = disposition ? /filename="([^"]+)"/i.exec(disposition)?.[1] : undefined;
  return nom ?? `dossier-${idPatient}.pdf`;
}

export function ExportDossierPanel({ idPatient }: { idPatient: string }) {
  const id = useId();
  const [ouvert, setOuvert] = useState(false);
  const [version, setVersion] = useState<VersionExport>(VERSION_PAR_DEFAUT);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Chaque ouverture repart de la version pseudonymisée : la version complète
  // se choisit à chaque fois, elle ne se retient pas.
  function changerOuverture(ouverture: boolean) {
    setOuvert(ouverture);
    if (!ouverture) {
      setVersion(VERSION_PAR_DEFAUT);
      setErreur(null);
    }
  }

  async function telecharger() {
    if (enCours) return;
    setEnCours(true);
    setErreur(null);
    try {
      const reponse = await fetch(
        `/api/praticien/export-dossier?idPatient=${encodeURIComponent(idPatient)}&version=${version}`,
      );
      if (!reponse.ok) {
        setErreur(messageEchec(reponse.status));
        return;
      }
      if (!(reponse.headers.get('Content-Type') ?? '').includes('application/pdf')) {
        setErreur(messageEchec(null));
        return;
      }
      const blob = await reponse.blob();
      const url = URL.createObjectURL(blob);
      const lien = document.createElement('a');
      lien.href = url;
      lien.download = nomDeFichier(reponse.headers.get('Content-Disposition'), idPatient);
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), DELAI_REVOCATION_MS);
    } catch {
      setErreur(messageEchec(null));
    } finally {
      setEnCours(false);
    }
  }

  return (
    <PanneauSuperpose
      largeur="standard"
      titre="Exporter le dossier en PDF"
      description="Renseignements administratifs, fiche signalétique et anamnèse, réponses à tous les questionnaires et dernière synthèse validée — axes prioritaires, questions pour la consultation, vigilance."
      open={ouvert}
      onOpenChange={changerOuverture}
      declencheur={
        <button
          type="button"
          className="flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          <FileDown aria-hidden="true" size={16} strokeWidth={2} />
          Exporter en PDF
        </button>
      }
    >
      {/* Figé pendant la préparation : le fichier reçu doit être celui de la
          version affichée. */}
      <fieldset disabled={enCours} className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium text-foreground">Version</legend>
        {OPTIONS_VERSION.map(option => {
          const choisie = version === option.valeur;
          const idLibelle = `${id}-${option.valeur}-libelle`;
          const idAide = `${id}-${option.valeur}-aide`;
          return (
            <label
              key={option.valeur}
              className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                choisie ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            >
              <input
                type="radio"
                name={`${id}-version`}
                value={option.valeur}
                checked={choisie}
                onChange={() => setVersion(option.valeur)}
                aria-labelledby={idLibelle}
                aria-describedby={idAide}
                className="mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              />
              <span>
                <span id={idLibelle} className="block text-sm font-medium text-foreground">
                  {option.libelle}
                </span>
                <span id={idAide} className="mt-0.5 block text-sm text-muted-foreground">
                  {option.aide}
                </span>
              </span>
            </label>
          );
        })}
      </fieldset>

      <Button
        type="button"
        onClick={() => void telecharger()}
        disabled={enCours}
        aria-busy={enCours}
        className="mt-4 inline-flex min-h-11 items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
      >
        <FileDown aria-hidden="true" size={16} strokeWidth={2} />
        {enCours ? 'Préparation du PDF…' : 'Télécharger le PDF'}
      </Button>

      {erreur && (
        <p role="alert" className="mt-3 text-sm text-status-danger">
          {erreur}
        </p>
      )}
    </PanneauSuperpose>
  );
}
