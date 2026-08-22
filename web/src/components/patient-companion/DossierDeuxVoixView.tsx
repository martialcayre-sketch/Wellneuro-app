'use client';

import { useCallback, useEffect, useState } from 'react';
import { PatientButton } from '@/components/patient/ui/PatientButton';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { PatientInlineMessage } from '@/components/patient/ui/PatientInlineMessage';
import { PatientPageHeader } from '@/components/patient/ui/PatientPageHeader';
import type { PortailDossierResponse } from '@/app/api/portail/dossier/route';

// Le « dossier à deux voix » (Alliance 6.0-A, LOT-06) — surface PATIENT.
//
// Trois blocs, une seule écriture : le patient LIT l'objectif négocié, ce qu'il
// a déposé lui-même, et la synthèse de compréhension — et il peut RÉPONDRE à
// l'objectif : « c'est bien ça » ou « ce n'est pas exactement ça ».
//
// AUCUNE NOTE, AUCUNE ÉCHELLE, AUCUN DÉCOMPTE. Ni « 3 entrées », ni pouce, ni
// curseur d'accord. Graduer une ratification en ferait une mesure de l'accord
// entre deux personnes (`DC-19`/`DC-20`), et compter les entrées d'un patient
// transformerait sa parole en série.
//
// UNE RÉPONSE NE SE RETIRE PAS, et l'écran le dit AVANT le geste plutôt que de
// le laisser découvrir après. Changer d'avis, c'est répondre à nouveau — la
// réponse précédente reste, et c'est la dernière qui vaut.
//
// UN BLOC FERMÉ PAR DRAPEAU EST ABSENT, pas vide : la route rend `null`, et
// l'écran ne rend rien du tout. Écrire « pas encore ouvert » parlerait au
// patient de l'état d'un déploiement ; afficher un bloc vide lui ferait lire un
// silence de son praticien là où il n'y en a pas (`DC-24`).

type Assemblage = Extract<PortailDossierResponse, { objectifs: unknown }>;

type Etat =
  | { phase: 'chargement' }
  | { phase: 'erreur'; message: string }
  | { phase: 'pret'; donnees: Assemblage };

/** Date lisible en français, ou `null` — jamais comblée par autre chose. */
function dateLisible(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Ce que l'écran dit de l'état d'une réponse. `en_attente` NE DIT RIEN DU
 * PATIENT — ni « non ratifié », ni « en retard », ni « refusé » : il ne s'est
 * pas encore prononcé, et c'est tout ce qu'on en sait (`DC-24`).
 */
const LIBELLE_ETAT: Record<string, string> = {
  en_attente: 'Vous ne vous êtes pas encore prononcé sur cet objectif.',
  ratifie: 'Vous avez répondu : c’est bien ça.',
  conteste: 'Vous avez répondu : ce n’est pas exactement ça.',
};

export function DossierDeuxVoixView({ token }: { token: string }) {
  const [etat, setEtat] = useState<Etat>({ phase: 'chargement' });
  const [envoi, setEnvoi] = useState(false);
  const [erreurEnvoi, setErreurEnvoi] = useState('');
  const [repondu, setRepondu] = useState(false);

  const charger = useCallback(async () => {
    try {
      const res = await fetch('/api/portail/dossier');
      // SESSION ABSENTE OU EXPIRÉE : retour au gate du portail, comme le fait
      // le hub. Afficher un message d'erreur laisserait le patient dans une
      // impasse — la page ne se rechargera jamais toute seule, et rien à
      // l'écran ne dit qu'il faut se reconnecter.
      if (res.status === 401) {
        window.location.href = `/portail/${token}`;
        return;
      }
      const data = (await res.json()) as PortailDossierResponse;
      if (res.ok && data.ok && 'objectifs' in data) {
        setEtat({ phase: 'pret', donnees: data });
      } else {
        setEtat({
          phase: 'erreur',
          message:
            (!data.ok && data.error) || 'Cette page n’a pas pu être chargée. Réessayez plus tard.',
        });
      }
    } catch {
      setEtat({ phase: 'erreur', message: 'Erreur réseau. Réessayez plus tard.' });
    }
  }, [token]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const repondre = useCallback(
    async (idObjectif: string, sens: 'ratifie' | 'conteste') => {
      setEnvoi(true);
      setErreurEnvoi('');
      // Le succès précédent est retiré AVANT de repartir : sans cela, un refus
      // s'afficherait à côté d'un « c'est transmis » toujours à l'écran, et le
      // patient lirait les deux à la fois sans savoir lequel le concerne.
      setRepondu(false);
      try {
        const res = await fetch('/api/portail/dossier', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          // Le corps ne porte que la version visée et le sens. Pas
          // d'identifiant patient : la session le dit, et la route ne lirait pas
          // celui-ci de toute façon. Pas de date non plus : le geste est posé
          // maintenant, et c'est le serveur qui l'horodate.
          body: JSON.stringify({ idObjectif, sens }),
        });
        const data = (await res.json()) as { ok: boolean; error?: string };
        if (res.ok && data.ok) {
          setRepondu(true);
          await charger();
        } else {
          setErreurEnvoi(data.error ?? 'Votre réponse n’a pas pu être enregistrée.');
        }
      } catch {
        setErreurEnvoi('Erreur réseau. Réessayez.');
      } finally {
        setEnvoi(false);
      }
    },
    [charger],
  );

  if (etat.phase === 'chargement') {
    return (
      <PatientCard className="space-y-4">
        <PatientPageHeader title="Mon dossier, à deux voix" />
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </PatientCard>
    );
  }

  if (etat.phase === 'erreur') {
    return (
      <PatientCard className="space-y-4">
        <PatientPageHeader title="Mon dossier, à deux voix" />
        <PatientInlineMessage tone="error">{etat.message}</PatientInlineMessage>
      </PatientCard>
    );
  }

  const { objectifs, ratifiable, ceQuiCompte, comprehension } = etat.donnees;

  return (
    <div className="space-y-4">
      <PatientCard className="space-y-5">
        <PatientPageHeader
          title="Mon dossier, à deux voix"
          subtitle="Ce que vous avez dit, ce que votre praticien en a compris, et ce que vous en pensez. Rien ici n’est une note."
        />

        {/* ── L'OBJECTIF NÉGOCIÉ ─────────────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Ce sur quoi nous travaillons
          </h2>

          {objectifs.length === 0 ? (
            <PatientInlineMessage tone="info">
              Aucun objectif n’a encore été écrit avec votre praticien. Cela ne veut rien dire de
              plus : c’est une page qui n’a pas encore été remplie.
            </PatientInlineMessage>
          ) : (
            <>
              {/* DEUX VERSIONS COEXISTANTES : on les MONTRE toutes les deux et on
                  le dit, au lieu de choisir la plus récente en silence. Une
                  discordance se signale (`DC-30`). Le message ne diagnostique
                  pas sa cause — deux reformulations concurrentes ou une version
                  écrite indépendamment produisent la même situation. */}
              {/* `ratifiable` vaut « exactement une tête » côté route : sur une
                  liste non vide, `!ratifiable` suffit à dire qu'il y en a
                  plusieurs. Doubler la condition laisserait croire que les deux
                  peuvent diverger. */}
              {!ratifiable && (
                <PatientInlineMessage tone="info">
                  Deux versions de votre objectif coexistent. Nous préférons vous les montrer toutes
                  les deux plutôt que d’en choisir une à votre place — votre praticien les
                  départagera, et vous pourrez répondre ensuite.
                </PatientInlineMessage>
              )}

              {objectifs.map((objectif) => (
                <div key={objectif.id} className="space-y-2 rounded-lg border border-border p-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Ce que vous avez dit</p>
                    {/* `whitespace-pre-wrap` : les mots sont rendus TELS QUELS,
                        retours à la ligne compris. Les reformater serait déjà
                        les réécrire. */}
                    <p className="whitespace-pre-wrap text-base leading-relaxed">
                      {objectif.enoncePatient}
                    </p>
                  </div>

                  {objectif.reformulationPraticien && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Ce que votre praticien en a compris
                      </p>
                      <p className="whitespace-pre-wrap text-base leading-relaxed">
                        {objectif.reformulationPraticien}
                      </p>
                    </div>
                  )}

                  {objectif.priorite && (
                    <p className="text-sm text-muted-foreground">
                      Priorité retenue : {objectif.priorite}
                    </p>
                  )}

                  {dateLisible(objectif.negocieLe) && (
                    <p className="text-xs text-muted-foreground">
                      Convenu le {dateLisible(objectif.negocieLe)}
                    </p>
                  )}

                  <p className="text-sm">{LIBELLE_ETAT[objectif.etat] ?? LIBELLE_ETAT.en_attente}</p>

                  {ratifiable && (
                    <div className="space-y-2 pt-1">
                      <p className="text-xs text-muted-foreground">
                        Votre réponse reste dans votre dossier et ne s’efface pas. Si vous changez
                        d’avis, répondez à nouveau : c’est la dernière réponse qui vaut.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <PatientButton
                          type="button"
                          variant="primary"
                          disabled={envoi}
                          onClick={() => void repondre(objectif.id, 'ratifie')}
                        >
                          C’est bien ça
                        </PatientButton>
                        <PatientButton
                          type="button"
                          variant="neutral"
                          disabled={envoi}
                          onClick={() => void repondre(objectif.id, 'conteste')}
                        >
                          Ce n’est pas exactement ça
                        </PatientButton>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {repondu && (
                <PatientInlineMessage tone="success">
                  C’est transmis. Votre praticien le verra tel que vous l’avez indiqué.
                </PatientInlineMessage>
              )}
              {erreurEnvoi && (
                <PatientInlineMessage tone="error">{erreurEnvoi}</PatientInlineMessage>
              )}
            </>
          )}
        </section>
      </PatientCard>

      {/* ── CE QUI COMPTE POUR MOI ────────────────────────────────────────
          `null` = bloc non ouvert : rien n'est rendu, pas même un titre. */}
      {ceQuiCompte !== null && (
        <PatientCard className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Ce qui compte pour moi
          </h2>
          {ceQuiCompte.length === 0 ? (
            <PatientInlineMessage tone="info">
              Vous n’avez encore rien déposé ici. Rien ne vous y oblige.
            </PatientInlineMessage>
          ) : (
            <ul className="space-y-3">
              {ceQuiCompte.map((entree) => (
                <li key={entree.id} className="space-y-1 border-l-2 border-border pl-3">
                  {/* JAMAIS `saisiLe ?? creeLe`. Les deux dates ne disent pas
                      la même chose : `saisiLe` est ce que le patient a DÉCLARÉ
                      (« cela se rapporte à ce jour-là »), `creeLe` est le
                      moment où la ligne a été écrite. Les fusionner ferait lire
                      au patient, en tête de sa propre parole, une date qu'il
                      n'a jamais donnée — une absence rendue comme une réponse
                      (`DC-24`), et exactement ce que le LOT-03 s'interdit
                      « ici ni à l'affichage ». Rien n'est affiché quand rien
                      n'a été déclaré : le silence reste un silence. */}
                  {dateLisible(entree.saisiLe) && (
                    <p className="text-xs text-muted-foreground">
                      Concerne le {dateLisible(entree.saisiLe)}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap text-base leading-relaxed">{entree.texte}</p>
                </li>
              ))}
            </ul>
          )}
          <a
            href={`/portail/${token}/ce-qui-compte`}
            className="inline-flex text-sm text-primary hover:underline"
          >
            Déposer ce qui compte pour moi aujourd’hui
          </a>
        </PatientCard>
      )}

      {/* ── CE QUE MON PRATICIEN A COMPRIS ────────────────────────────────── */}
      {comprehension !== null && (
        <PatientCard className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Ce que mon praticien a compris de moi
          </h2>
          {!comprehension.synthese ? (
            <PatientInlineMessage tone="info">
              Votre praticien n’a encore rien publié ici. Cela ne veut rien dire de plus : il n’a
              simplement pas encore écrit cette page.
            </PatientInlineMessage>
          ) : (
            <>
              {/* MÊME RÈGLE, DEUXIÈME DATE. « Écrit le » sur une date de
                  PUBLICATION attribuerait au praticien une déclaration qu'il
                  n'a pas faite : `redigeeLe` est ce qu'il déclare, `publieeLe`
                  le moment où il a remis le texte. On dit celle qu'on a, sous
                  son vrai nom, sans jamais faire passer l'une pour l'autre. */}
              {dateLisible(comprehension.synthese.redigeeLe) ? (
                <p className="text-xs text-muted-foreground">
                  Écrit le {dateLisible(comprehension.synthese.redigeeLe)}
                </p>
              ) : (
                dateLisible(comprehension.synthese.publieeLe) && (
                  <p className="text-xs text-muted-foreground">
                    Publié le {dateLisible(comprehension.synthese.publieeLe)}
                  </p>
                )
              )}
              <p className="whitespace-pre-wrap text-base leading-relaxed">
                {comprehension.synthese.texte}
              </p>
              {/* CE QUE LE PATIENT A DÉJÀ RÉPONDU, sur CETTE version. Sans ce
                  bloc, un patient qui a contesté au LOT-04 ne le verrait nulle
                  part ici, et l'invitation ci-dessous lui parlerait comme s'il
                  n'avait rien dit — la parenté exacte du défaut trouvé en revue
                  au LOT-04. Le filtre sur `idSynthese` compte : un désaccord
                  visant une version antérieure ne répond pas à ce texte-ci, et
                  l'afficher sous lui le ferait dire autre chose. */}
              {comprehension.desaccords
                .filter((desaccord) => desaccord.idSynthese === comprehension.synthese!.id)
                .map((desaccord) => (
                  <div
                    key={desaccord.id}
                    className="space-y-1 rounded-lg border border-border bg-surface p-3"
                  >
                    <p className="text-xs text-muted-foreground">Vous avez répondu à ce texte</p>
                    {desaccord.texte && (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {desaccord.texte}
                      </p>
                    )}
                  </div>
                ))}

              {/* Le désaccord se DÉPOSE sur sa page, pas ici : il n'y a qu'un
                  seul endroit dans l'application qui en écrit un, et c'est une
                  garde structurelle qui le tient. */}
              <a
                href={`/portail/${token}/comprehension`}
                className="inline-flex text-sm text-primary hover:underline"
              >
                Répondre à ce texte
              </a>
            </>
          )}
        </PatientCard>
      )}
    </div>
  );
}
