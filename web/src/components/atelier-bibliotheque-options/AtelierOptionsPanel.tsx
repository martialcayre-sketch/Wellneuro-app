'use client';

// L'ATELIER DE LA BIBLIOTHÈQUE DES OPTIONS ([[D-480]] §3, BP-17 PR 5) — surface
// PRIVÉE du praticien, derrière `WN_BIBLIOTHEQUE_OPTIONS_ATELIER` éteint. Pour
// chaque option que la structure déclare, rubrique par rubrique : les renvois
// de la structure, la dernière version du texte et son état. Le responsable y
// saisit une version neuve, la valide (relecture intégrale) ou la retire
// (motif). Les autres praticiens lisent, sans geste.
//
// AUCUN PRÉ-REMPLISSAGE : le champ de saisie part vide, jamais d'un texte
// proposé par l'outil (DC-11, porte 23). Un texte « à relire » ne s'affiche
// jamais comme validé.
//
// Les types seulement, depuis les modules serveur : un import de valeur tirerait
// Prisma dans le bundle client.

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { GesteTexte } from '@/components/fiches-usage/GesteTexte';
import type { AtelierOptionsApiResponse } from '@/app/api/praticien/atelier-options/route';
import type { AtelierOptions, RubriqueAffichee } from '@/lib/atelier-bibliotheque-options/lecture';
import type { EtatBibliotheque } from '@/lib/atelier-bibliotheque-options/structure';
import { libelleEtatRubrique, libelleRenvoi, LIBELLE_ETAT_STRUCTURE, nomRubriqueOption, obstacleValidation } from './libelles';

type Retour = { type: 'succes' | 'erreur'; texte: string };
type ReponseEcriture = { ok: true } | { ok: false; error: string };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

async function ecrire(chemin: string, corps: string): Promise<ReponseEcriture> {
  try {
    const res = await fetch(chemin, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: corps });
    return (await res.json()) as ReponseEcriture;
  } catch {
    // Une coupure peut suivre le commit : le résultat est inconnu. L'écran se
    // recharge ; un second envoi sur un état périmé est refusé « état divergent ».
    return {
      ok: false,
      error: 'Réponse du serveur illisible : le résultat est inconnu. Vérifiez l’état affiché, rechargé, avant de recommencer.',
    };
  }
}

type Soumettre = (chemin: string, corps: string, succes: string) => Promise<boolean>;

function SaisieTexte({
  optionId,
  rubrique,
  derniereVersionVue,
  envoi,
  soumettre,
}: {
  optionId: string;
  rubrique: string;
  derniereVersionVue: string | null;
  envoi: boolean;
  soumettre: Soumettre;
}) {
  const [ouverte, setOuverte] = useState(false);
  const [texte, setTexte] = useState('');
  const idTexte = useId();
  if (!ouverte) {
    return (
      <div>
        <Button type="button" variant="outline" className="min-h-11" disabled={envoi} onClick={() => setOuverte(true)}>
          {derniereVersionVue ? 'Saisir une version neuve' : 'Saisir le texte'}
        </Button>
      </div>
    );
  }
  const envoyer = async () => {
    const ok = await soumettre(
      '/api/praticien/atelier-options/versions',
      JSON.stringify({ optionId, rubrique, texte, derniereVersionVue }),
      'Version enregistrée, à valider.',
    );
    if (ok) {
      setTexte('');
      setOuverte(false);
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={idTexte} className="text-sm font-medium text-foreground">
        Texte de la rubrique « {nomRubriqueOption(rubrique)} »
      </label>
      <textarea
        id={idTexte}
        rows={5}
        autoFocus
        value={texte}
        disabled={envoi}
        onChange={e => setTexte(e.target.value)}
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" className="min-h-11" disabled={envoi || !/\S/u.test(texte)} onClick={() => void envoyer()}>
          {envoi ? 'En cours…' : 'Enregistrer la version'}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={envoi}
          onClick={() => {
            setTexte('');
            setOuverte(false);
          }}
        >
          Annuler
        </Button>
      </div>
    </div>
  );
}

function Rubrique({
  optionId,
  r,
  structure,
  peutDecider,
  saisieOuverte,
  envoi,
  soumettre,
}: {
  optionId: string;
  r: RubriqueAffichee;
  structure: EtatBibliotheque;
  peutDecider: boolean;
  saisieOuverte: boolean;
  envoi: boolean;
  soumettre: Soumettre;
}) {
  const badge = libelleEtatRubrique(r.etat);
  const v = r.version;
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-foreground">{nomRubriqueOption(r.rubrique)}</h4>
        <Badge variant={badge.variante}>{badge.texte}</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Renvois de la structure : {r.renvois.length > 0 ? r.renvois.map(libelleRenvoi).join(' · ') : 'aucun'}
      </p>
      {v && (
        <div className="flex flex-col gap-1">
          <p className="whitespace-pre-wrap text-sm text-foreground">{v.texte}</p>
          <p className="text-xs text-muted-foreground">
            Version {v.numero} sur {v.nombreVersions}, saisie le {formatDate(v.creeLe)}
            {v.dernierActe
              ? ` — ${v.dernierActe.acte === 'validee' ? 'validée' : 'retirée'} le ${formatDate(v.dernierActe.le)}`
              : ''}
            {v.dernierActe?.acte === 'retiree' && v.dernierActe.motif ? ` (motif : ${v.dernierActe.motif})` : ''}
          </p>
        </div>
      )}
      {peutDecider && v && r.etatActes && (
        <GesteTexte
          // Une instance par texte et par dernier acte : la déclaration de
          // relecture retombe dès que l'un change.
          key={`${v.texteSha256}|${v.jeton ?? ''}`}
          nomDuTexte="ce texte"
          etat={r.etatActes}
          obstacle={obstacleValidation(r.etat, structure)}
          peutDecider={peutDecider}
          envoi={envoi}
          onConfirmer={(acte, relectureIntegrale, motif) =>
            void soumettre(
              '/api/praticien/atelier-options/actes',
              JSON.stringify({ idTexte: v.id, acte, empreinteVue: v.texteSha256, dernierActeVu: v.jeton, relectureIntegrale, motif }),
              acte === 'validee' ? 'Texte validé.' : 'Texte retiré.',
            )
          }
        />
      )}
      {peutDecider && saisieOuverte && (
        <SaisieTexte
          key={v?.id ?? 'aucune'}
          optionId={optionId}
          rubrique={r.rubrique}
          derniereVersionVue={v?.id ?? null}
          envoi={envoi}
          soumettre={soumettre}
        />
      )}
    </li>
  );
}

export function AtelierOptionsPanel() {
  const [atelier, setAtelier] = useState<AtelierOptions | null>(null);
  const [peutDecider, setPeutDecider] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [retour, setRetour] = useState<Retour | null>(null);
  const [envoi, setEnvoi] = useState(false);
  // Seule la réponse du DERNIER chargement s'applique.
  const generation = useRef(0);

  const charger = useCallback(async () => {
    const mienne = ++generation.current;
    try {
      const res = await fetch('/api/praticien/atelier-options', { cache: 'no-store' });
      const data = (await res.json()) as AtelierOptionsApiResponse;
      if (mienne !== generation.current) return;
      if (!data.ok) {
        setErreur(data.error);
        return;
      }
      setErreur(null);
      setAtelier(data.atelier);
      setPeutDecider(data.peutDecider);
    } catch {
      if (mienne === generation.current) setErreur('L’atelier n’a pas pu être chargé.');
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  const soumettre = useCallback<Soumettre>(
    async (chemin, corps, succes) => {
      setEnvoi(true);
      setRetour(null);
      const r = await ecrire(chemin, corps);
      setRetour(r.ok ? { type: 'succes', texte: succes } : { type: 'erreur', texte: r.error });
      // Les gestes restent suspendus jusqu'au résultat de la relecture.
      try {
        await charger();
      } finally {
        setEnvoi(false);
      }
      return r.ok;
    },
    [charger],
  );

  if (!atelier) {
    return erreur ? (
      <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-status-danger">
        <span>{erreur}</span>
        <Button type="button" variant="outline" onClick={() => void charger()}>
          Recharger
        </Button>
      </div>
    ) : (
      <p className="text-sm text-muted-foreground">Chargement de l’atelier…</p>
    );
  }

  const structure = LIBELLE_ETAT_STRUCTURE[atelier.structure.etat];
  // Une erreur de relecture suspend les gestes : aucun ne part sur l'état d'avant.
  const gestes = peutDecider && !erreur;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={structure.variante}>{structure.texte}</Badge>
          <span className="text-sm text-muted-foreground">
            {atelier.structure.nombreOptions === 0
              ? 'La structure ne déclare encore aucune option.'
              : `${atelier.structure.nombreOptions} option${atelier.structure.nombreOptions > 1 ? 's' : ''} déclarée${atelier.structure.nombreOptions > 1 ? 's' : ''}.`}
          </span>
        </div>
        {!peutDecider && (
          <p className="text-sm text-muted-foreground">Lecture seule : saisir, valider et retirer sont réservés au responsable.</p>
        )}
      </div>

      {erreur && (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-status-danger">
          <span>{erreur} Les gestes sont suspendus tant que l’état n’est pas relu.</span>
          <Button type="button" variant="outline" onClick={() => void charger()}>
            Recharger
          </Button>
        </div>
      )}
      {retour && (
        <p role="status" className={retour.type === 'succes' ? 'text-sm text-status-success' : 'text-sm text-status-danger'}>
          {retour.texte}
        </p>
      )}

      {atelier.options.map(option => (
        <section key={option.id} aria-labelledby={`option-${option.id}`} className="flex flex-col gap-3">
          <div>
            <h3 id={`option-${option.id}`} className="text-base font-semibold text-foreground">
              {option.id}
            </h3>
            <p className="text-xs text-muted-foreground">
              Hypothèse {option.hypothese} · population{option.populations.length > 1 ? 's' : ''} {option.populations.join(', ')}
            </p>
          </div>
          <ul className="flex flex-col gap-3">
            {option.rubriques.map(r => (
              <Rubrique
                key={r.rubrique}
                optionId={option.id}
                r={r}
                structure={atelier.structure.etat}
                peutDecider={gestes}
                saisieOuverte
                envoi={envoi}
                soumettre={soumettre}
              />
            ))}
          </ul>
        </section>
      ))}

      {atelier.horsStructure.length > 0 && (
        <section aria-labelledby="options-hors-structure" className="flex flex-col gap-3">
          <div>
            <h3 id="options-hors-structure" className="text-base font-semibold text-foreground">
              Textes d’options hors de la structure
            </h3>
            <p className="text-xs text-muted-foreground">
              Ces options ne sont plus déclarées par la structure : leur texte ne se valide plus, il peut être retiré.
            </p>
          </div>
          {atelier.horsStructure.map(o => (
            <div key={o.optionId} className="flex flex-col gap-2">
              <h4 className="text-sm font-semibold text-foreground">{o.optionId}</h4>
              <ul className="flex flex-col gap-3">
                {o.rubriques.map(r => (
                  <Rubrique
                    key={r.rubrique}
                    optionId={o.optionId}
                    r={r}
                    structure={atelier.structure.etat}
                    peutDecider={gestes}
                    saisieOuverte={false}
                    envoi={envoi}
                    soumettre={soumettre}
                  />
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
