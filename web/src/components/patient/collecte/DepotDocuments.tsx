'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PortailDocumentsResponse } from '@/app/api/portail/documents/route';
import {
  CATEGORIES_DOCUMENT,
  LIBELLES_CATEGORIE_DOCUMENT,
  libelleCategorie,
  MESSAGES_DEPOT_DOCUMENT,
  type CategorieDocument,
} from '@/lib/collecte/documentsDeposes';
import type { DepotLu } from '@/lib/collecte/documentsDeposesServeur';
import { EncartUrgenceSuicide } from '@/components/patient/EncartUrgenceSuicide';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { PatientButton } from '@/components/patient/ui/PatientButton';
import { PatientInlineMessage } from '@/components/patient/ui/PatientInlineMessage';
import { PatientErrorState } from '@/components/patient/PatientErrorState';
import { DateNaissanceEcran } from '@/components/patient/DateNaissanceEcran';
import { MESSAGE_CIRCUIT_MINEUR } from '@/lib/patient/gardeAge';
import {
  AUCUN_DEPOT,
  BLOCS_COLLECTE_G11,
  BOUTON_DEPOSER,
  DEPOT_REUSSI,
  LEGENDE_CATEGORIE,
  LIBELLE_FICHIER,
  TITRE_DEPOT,
  TITRE_MES_DEPOTS,
} from './textesDepot';

// Le patient dépose un document dans son dossier ([[D-330]], J3-collecte). La
// route garde l'accès, le drapeau, le dossier ouvert, l'âge et les plafonds ;
// l'écran ne fait que dire ce qu'elle répond. 401 renvoie au portail ; 403, 404
// et 409 sont définitifs ; le reste se réessaie (patron de
// `TransmissionCompteRendu`).
//
// L'ENCART D'URGENCE EST RENDU SANS CONDITION, avant tout état de chargement
// ([[D-293]] §3) : une panne de la route ne peut pas le faire disparaître. Le
// texte de collecte de G-11 suit, tel quel, à côté du dépôt (sans accusé).
//
// LE PATIENT NE VOIT QUE DATE, CATÉGORIE PROPOSÉE ET RETRAIT : ni le document, ni
// la consultation par le praticien, ni le motif d'un retrait. Le nom du fichier
// ne part pas : le navigateur l'enverrait dans l'en-tête multipart, il est
// remplacé par un nom neutre (le serveur ne le lit ni ne le garde).

type Pret = Exclude<Extract<PortailDocumentsResponse, { ok: true }>, { ouvert: true }>;

type Etat =
  | { statut: 'chargement' }
  | { statut: 'erreur'; message: string; definitif: boolean }
  | { statut: 'pret'; donnees: Pret };

const FORMAT_DATE = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'long' });

function ligneDepot(d: DepotLu): string {
  const depose = `Déposé le ${FORMAT_DATE.format(new Date(d.deposeLe))} — ${libelleCategorie(d.categorie)}`;
  return d.retireLe ? `${depose} · retiré le ${FORMAT_DATE.format(new Date(d.retireLe))}` : depose;
}

export function DepotDocuments({ token }: { token: string }) {
  const router = useRouter();
  const [etat, setEtat] = useState<Etat>({ statut: 'chargement' });
  const [categorie, setCategorie] = useState<CategorieDocument | null>(null);
  const [fichier, setFichier] = useState<File | null>(null);
  const [cleFichier, setCleFichier] = useState(0);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const annuleRef = useRef(false);

  const charger = useCallback(async () => {
    try {
      const res = await fetch('/api/portail/documents', { cache: 'no-store' });
      if (annuleRef.current) return;
      if (res.status === 401) {
        router.replace(`/portail/${token}`);
        return;
      }
      const data = (await res.json()) as PortailDocumentsResponse;
      if (annuleRef.current) return;
      if (!data.ok) {
        setEtat({ statut: 'erreur', message: data.error, definitif: res.status === 403 || res.status === 404 || res.status === 409 });
        return;
      }
      if (!('documents' in data) || !Array.isArray(data.documents)) {
        setEtat({ statut: 'erreur', message: 'Réponse inattendue. Réessayez.', definitif: false });
        return;
      }
      setEtat({ statut: 'pret', donnees: data });
    } catch {
      if (annuleRef.current) return;
      setEtat({ statut: 'erreur', message: 'Connexion interrompue. Vérifiez votre connexion et réessayez.', definitif: false });
    }
  }, [token, router]);

  useEffect(() => {
    annuleRef.current = false;
    void charger();
    return () => {
      annuleRef.current = true;
    };
  }, [charger]);

  async function deposer() {
    if (!fichier) return;
    if (!categorie) {
      setErreur(MESSAGES_DEPOT_DOCUMENT.categorie_absente);
      return;
    }
    setOccupe(true);
    setErreur(null);
    setInfo(null);
    try {
      const form = new FormData();
      form.append('categorie', categorie);
      form.append('fichier', fichier, 'document');
      const res = await fetch('/api/portail/documents', { method: 'POST', body: form });
      if (res.status === 401) {
        router.replace(`/portail/${token}`);
        return;
      }
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) {
        setErreur(data?.error ?? 'Le document n’a pas pu être déposé. Réessayez.');
      } else {
        setInfo(DEPOT_REUSSI);
        setFichier(null);
        setCategorie(null);
        setCleFichier(c => c + 1);
      }
      await charger();
    } catch {
      setErreur('Connexion interrompue. Vérifiez votre connexion et réessayez.');
    } finally {
      setOccupe(false);
    }
  }

  const donnees = etat.statut === 'pret' ? etat.donnees : null;
  if (donnees && donnees.dossierOuvert && donnees.statutAge === 'date_manquante') {
    // L'encart reste rendu ici aussi : chaque branche de rendu le porte.
    return (
      <article className="space-y-6">
        <EncartUrgenceSuicide ecran="depot_documents" />
        <DateNaissanceEcran onEnregistree={() => void charger()} />
      </article>
    );
  }

  return (
    <article className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">{TITRE_DEPOT}</h1>
      <EncartUrgenceSuicide ecran="depot_documents" />

      {etat.statut === 'chargement' && (
        <PatientCard padding="sm">
          <p className="text-sm text-muted-foreground">Chargement…</p>
        </PatientCard>
      )}
      {etat.statut === 'erreur' && (
        <PatientCard padding="sm">
          <PatientErrorState message={etat.message} onReessayer={etat.definitif ? undefined : () => void charger()} />
        </PatientCard>
      )}

      {donnees && (
        <PatientCard>
          {/* Le succès s'ANNONCE : région `status` présente dès le premier rendu
              (patron de `TransmissionCompteRendu`). L'erreur garde `role="alert"`. */}
          <div role="status">
            {info && (
              <div className="mb-4">
                <PatientInlineMessage tone="success">{info}</PatientInlineMessage>
              </div>
            )}
          </div>
          <div className="space-y-4">
            {erreur && <PatientInlineMessage tone="error">{erreur}</PatientInlineMessage>}
            {!donnees.dossierOuvert ? (
              <p className="text-base text-foreground">{MESSAGES_DEPOT_DOCUMENT.dossier_cloture}</p>
            ) : donnees.statutAge === 'mineur' ? (
              <p className="text-base text-foreground">{MESSAGE_CIRCUIT_MINEUR}</p>
            ) : donnees.plafond ? (
              <p className="text-base text-foreground">{MESSAGES_DEPOT_DOCUMENT[donnees.plafond]}</p>
            ) : (
              <div className="space-y-4">
                <fieldset className="space-y-2" disabled={occupe}>
                  <legend className="text-base font-semibold text-foreground">{LEGENDE_CATEGORIE}</legend>
                  {CATEGORIES_DOCUMENT.map(c => (
                    <label key={c} className="flex min-h-11 items-center gap-3 text-base text-foreground">
                      <input
                        type="radio"
                        name="categorie"
                        value={c}
                        checked={categorie === c}
                        onChange={() => setCategorie(c)}
                        className="h-5 w-5"
                      />
                      {LIBELLES_CATEGORIE_DOCUMENT[c]}
                    </label>
                  ))}
                </fieldset>
                <label className="flex flex-col gap-2 text-base text-foreground">
                  {LIBELLE_FICHIER}
                  <input
                    key={cleFichier}
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    disabled={occupe}
                    onChange={e => setFichier(e.target.files?.[0] ?? null)}
                    className="text-base text-foreground"
                  />
                </label>
                <PatientButton onClick={() => void deposer()} disabled={!fichier} loading={occupe} loadingLabel="Envoi…">
                  {BOUTON_DEPOSER}
                </PatientButton>
              </div>
            )}
          </div>
        </PatientCard>
      )}

      {donnees && (
        <PatientCard padding="sm">
          <h2 className="text-lg font-semibold text-foreground">{TITRE_MES_DEPOTS}</h2>
          {donnees.documents.length === 0 ? (
            <p className="mt-2 text-base text-muted-foreground">{AUCUN_DEPOT}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {donnees.documents.map((d, i) => (
                <li key={`${d.deposeLe}-${i}`} className="text-base text-foreground">
                  {ligneDepot(d)}
                </li>
              ))}
            </ul>
          )}
        </PatientCard>
      )}

      <PatientCard>
        <div className="space-y-4">
          {BLOCS_COLLECTE_G11.map(bloc => (
            <section key={bloc.titre}>
              <h2 className="text-base font-semibold text-foreground">{bloc.titre}</h2>
              <p className="mt-1 text-base text-foreground">{bloc.texte}</p>
            </section>
          ))}
        </div>
      </PatientCard>
    </article>
  );
}
