'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  ComprehensionApiResponse,
  DesaccordExpose,
  SyntheseExposee,
  TrajectoireSynthese,
} from '@/app/api/praticien/comprehension/route';
import { LONGUEUR_MAX_SYNTHESE } from '@/lib/praticien/syntheseComprehension';

// « Ce que j'ai compris de vous » (Alliance 6.0-A, LOT-04) — surface praticien,
// phase « Compréhension » du poste de pilotage, sous l'objectif négocié.
//
// Le panneau est AUTONOME : il ne reçoit que l'identifiant du dossier et lit
// tout ce dont il a besoin. Il vit hors du runtime clinique, comme
// `ObjectifNegociePanel` — une compréhension s'écrit avant qu'un épisode soit
// confirmé, pas après.
//
// Le refus qui fait foi (dossier clos, bornes, registre anxiogène, surface
// fermée) est celui de la ROUTE : ce que l'écran empêche est une courtoisie, et
// le message du serveur s'affiche tel quel s'il survient. En particulier, le
// refus CONFIRMABLE du registre est rendu comme une QUESTION au praticien, pas
// comme une erreur — c'est le sens du régime (`D-090`).

type EtatDossier = 'chargement' | 'chargee' | 'erreur';

/**
 * Le tirage servi par la route, réduit à ce dont l'écran a besoin.
 *
 * `id` EN FAIT PARTIE : c'est lui qui repart comme `sourceId` à l'envoi. Ni le
 * modèle ni la version de consigne ne voyagent jusqu'ici — le serveur les lit
 * sur la ligne, et un navigateur ne doit pas pouvoir les déclarer.
 */
type Tirage = { id: string; texte: string; rang: number };

/** Ce qui manque pour qu'un résumé puisse être proposé, dit en toutes lettres. */
const LIBELLE_MANQUE_RESUME: Record<string, string> = {
  deux_syntheses_validees: 'une seconde synthèse validée',
  second_rideau: 'un second rideau de questionnaires',
};
type EtatEnvoi = 'repos' | 'envoi' | 'erreur';

const LIBELLE_DESACCORD: Record<DesaccordExpose['etat'], string> = {
  // JAMAIS « non traité » ni « ignoré » : l'état est DÉRIVÉ de l'existence
  // d'une version publiée postérieure, et son absence ne dit rien du praticien
  // (`DC-24` — une donnée absente n'est ni zéro ni un refus).
  en_attente: 'Pas encore de réponse',
  repondu: 'Une version publiée depuis répond à ce message',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Une version, telle qu'elle se lit — courante ou antérieure. */
function LigneSynthese({ ligne }: { ligne: SyntheseExposee }) {
  return (
    <div className="text-base text-foreground">
      <p className="whitespace-pre-wrap">{ligne.texte}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {ligne.publieeLe
          ? `Publiée le ${formatDate(ligne.publieeLe)}`
          : 'Brouillon — le patient ne la voit pas'}
        {ligne.redigeeLe && ` · rédigée le ${formatDate(ligne.redigeeLe)}`}
        {` · enregistrée le ${formatDate(ligne.creeLe)}`}
      </p>
    </div>
  );
}

export function ComprehensionPanel({ idPatient }: { idPatient: string }) {
  const [etat, setEtat] = useState<EtatDossier>('chargement');
  const [syntheses, setSyntheses] = useState<SyntheseExposee[]>([]);
  const [trajectoires, setTrajectoires] = useState<TrajectoireSynthese[]>([]);
  const [desaccords, setDesaccords] = useState<DesaccordExpose[]>([]);
  const [surfaceOuverte, setSurfaceOuverte] = useState(false);

  const [texte, setTexte] = useState('');
  const [redigeeLe, setRedigeeLe] = useState('');
  const [revise, setRevise] = useState<string | null>(null);
  /** Rédaction d'une version indépendante, ouverte par geste explicite. */
  const [redactionLibre, setRedactionLibre] = useState(false);
  const [envoi, setEnvoi] = useState<EtatEnvoi>('repos');
  const [message, setMessage] = useState('');
  /** Question du registre restée sans réponse : le praticien doit trancher. */
  const [registreAConfirmer, setRegistreAConfirmer] = useState(false);

  // LE RÉSUMÉ PROPOSÉ — état du tirage courant, et de ce qui manque pour en
  // avoir un. `null` n'est pas `[]` : « rien n'a été tiré » et « la barre n'est
  // pas franchie » sont deux phrases différentes (`DC-24`).
  const [tirage, setTirage] = useState<Tirage | null>(null);
  const [manqueResume, setManqueResume] = useState<string[] | null>(null);
  const [tirageEnCours, setTirageEnCours] = useState(false);

  const charger = useCallback(async () => {
    setEtat('chargement');
    try {
      const res = await fetch(
        `/api/praticien/comprehension?idPatient=${encodeURIComponent(idPatient)}`,
      );
      const data = (await res.json()) as ComprehensionApiResponse;
      if (res.ok && data.ok && 'syntheses' in data) {
        setSyntheses(data.syntheses);
        setTrajectoires(data.trajectoires);
        setDesaccords(data.desaccords);
        setSurfaceOuverte(data.surfacePatientOuverte);
        setEtat('chargee');
      } else {
        setEtat('erreur');
      }
    } catch {
      setEtat('erreur');
    }
  }, [idPatient]);

  useEffect(() => {
    void charger();
  }, [charger]);

  /**
   * Lit le tirage figé. N'EN PRODUIT JAMAIS : c'est un GET, et la route ne
   * fait parler la machine que sur un POST. Ouvrir la phase 3 d'un dossier ne
   * doit pas dépenser un appel.
   */
  const chargerTirage = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/praticien/comprehension/proposition?idPatient=${encodeURIComponent(idPatient)}`,
      );
      const data = (await res.json()) as {
        ok: boolean;
        etat?: string;
        manque?: string[];
        proposition?: Tirage;
      };
      if (!res.ok || !data.ok) return;
      // `?? null` ET NON L'AFFECTATION NUE : un champ absent doit se lire comme
      // absent, pas comme `undefined` qui se comparerait mal plus bas.
      setManqueResume(data.etat === 'sources_manquantes' ? (data.manque ?? []) : null);
      setTirage(data.proposition ?? null);
    } catch {
      // Silencieux À DESSEIN : le résumé proposé est un confort. Son absence ne
      // doit pas afficher une erreur sur un écran dont le reste fonctionne.
    }
  }, [idPatient]);

  useEffect(() => {
    void chargerTirage();
  }, [chargerTirage]);

  /**
   * PRÉ-REMPLIT SANS ÉCRASER. `setTexte((actuel) => …)` et non `setTexte(texte)` :
   * le tirage peut arriver APRÈS que le praticien ait commencé à écrire, et la
   * forme fonctionnelle est la seule qui lise l'état au moment du rendu. Le
   * piège s'est refermé deux fois dans cette campagne.
   */
  useEffect(() => {
    if (tirage === null) return;
    setTexte((actuel) => (actuel.trim() === '' ? tirage.texte : actuel));
  }, [tirage]);

  /** Demande un tirage — ou un de plus. C'est le seul geste qui appelle. */
  const demanderTirage = useCallback(
    async (remplacer: boolean) => {
      setTirageEnCours(true);
      try {
        const res = await fetch('/api/praticien/comprehension/proposition', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ idPatient }),
        });
        const data = (await res.json()) as { ok: boolean; proposition?: Tirage };
        if (res.ok && data.ok && data.proposition) {
          setTirage(data.proposition);
          // « UNE AUTRE » REMPLACE LE TEXTE, le premier tirage ne fait que
          // pré-remplir. Le praticien qui demande une autre formulation
          // demande à voir l'autre ; celui qui ouvre l'écran n'a rien demandé.
          if (remplacer) setTexte(data.proposition.texte);
        }
      } catch {
        // Même silence : rien ne dépend de ce confort.
      } finally {
        setTirageEnCours(false);
      }
    },
    [idPatient],
  );

  /**
   * LE VERROU, CÔTÉ ÉCRAN. Ce n'est qu'une commodité : le refus qui compte est
   * celui de la route, qui ne fait pas confiance au navigateur (`D-164`). Le
   * bouton grisé évite au praticien un aller-retour, il ne garantit rien.
   */
  const identiqueAuTirage = tirage !== null && texte.trim() === tirage.texte.trim();

  const envoyer = useCallback(
    async (publier: boolean, confirmerRegistre: boolean) => {
      setEnvoi('envoi');
      setMessage('');
      try {
        const res = await fetch('/api/praticien/comprehension', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            idPatient,
            texte,
            redigeeLe: redigeeLe || null,
            publier,
            confirmerRegistre,
            supersedesSyntheseId: revise,
            // LE SEUL CHAMP DE PROVENANCE QUE L'ÉCRAN DÉCLARE. Le modèle, la
            // version de consigne et la valeur de `source` sont lus par le
            // serveur sur la ligne du tirage (`D-164`).
            sourceId: tirage?.id ?? null,
          }),
        });
        const data = (await res.json()) as { ok: boolean; reason?: string; error?: string };
        if (res.ok && data.ok) {
          setTexte('');
          setRedigeeLe('');
          setRevise(null);
          setRedactionLibre(false);
          setRegistreAConfirmer(false);
          setEnvoi('repos');
          setTirage(null);
          await charger();
          await chargerTirage();
          return;
        }
        // LE REGISTRE EST UNE QUESTION, PAS UNE ERREUR : le praticien voit le
        // terme relevé et choisit — reformuler, ou publier tel quel. Le rendre
        // comme un échec ferait croire à un blocage.
        setRegistreAConfirmer(data.reason === 'REGISTRE_ANXIOGENE');
        setMessage(data.error ?? 'Cette version n’a pas pu être enregistrée.');
        setEnvoi('erreur');
      } catch {
        setRegistreAConfirmer(false);
        setMessage('Erreur réseau. Réessayez — votre texte est conservé ici.');
        setEnvoi('erreur');
      }
    },
    [idPatient, texte, redigeeLe, revise, charger, chargerTirage, tirage],
  );

  const tropLong = texte.length > LONGUEUR_MAX_SYNTHESE;

  // LE FORMULAIRE NE S'OUVRE QUE SUR UN GESTE dès qu'une version existe —
  // même correctif que le panneau voisin (ObjectifNegociePanel) : un
  // formulaire vide affiché en permanence sous une version publiée la fait
  // passer pour un brouillon. Sans aucune version, la rédaction reste la
  // première chose visible, comme avant.
  const editionOuverte = syntheses.length === 0 || revise !== null || redactionLibre;

  return (
    <section className="mt-6 rounded-lg border border-border bg-card p-4">
      <header className="mb-3">
        <h3 className="text-base font-semibold">Ce que j’ai compris de vous</h3>
        <p className="text-sm text-muted-foreground">
          Votre compréhension, écrite pour le patient et publiée telle quelle. Ce n’est ni un
          diagnostic, ni une orientation : c’est ce que vous avez retenu de lui.
        </p>
      </header>

      {etat === 'chargement' && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {etat === 'erreur' && (
        <p className="text-sm text-status-error">Ce panneau n’a pas pu être chargé.</p>
      )}

      {etat === 'chargee' && (
        <div className="space-y-5">
          {/* L'écran DIT LA VÉRITÉ sur ce que le patient voit. Sans cette
              bannière, « publiée » se lirait comme « remise » alors que la
              surface patient peut être fermée. */}
          {!surfaceOuverte && (
            <p className="rounded border border-border bg-muted/40 p-2 text-sm text-muted-foreground">
              La surface patient n’est pas ouverte : vous pouvez préparer et réviser des
              brouillons, mais aucune publication n’est possible pour l’instant.
            </p>
          )}

          {syntheses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Rien d’écrit pour ce dossier. Le patient ne voit donc rien — et ne voit pas non plus
              qu’il n’y a rien.
            </p>
          ) : (
            <>
              {/* DEUX TÊTES = UNE COURSE, ET ON LE DIT. Départager en silence
                  ferait disparaître une version sans qu'aucun message ne le
                  signale (`DC-30` — une discordance se signale). */}
              {syntheses.length > 1 && (
                <p className="rounded border border-status-warning/40 bg-status-warning/10 p-2 text-sm">
                  Plusieurs versions courantes coexistent — soit révisées en parallèle, soit écrites
                  indépendamment. Aucune n’a été écartée, et le patient ne voit que la plus récente
                  publiée : relisez-les avant d’en publier une nouvelle.
                </p>
              )}
              <ul className="space-y-4">
                {trajectoires.map((trajectoire) => (
                  <li key={trajectoire.idSynthese} className="border-l-2 border-border pl-3">
                    <LigneSynthese ligne={trajectoire.lignes[0]} />
                    {trajectoire.lignes.length > 1 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-muted-foreground">
                          {trajectoire.lignes.length - 1} version(s) antérieure(s)
                        </summary>
                        <ul className="mt-2 space-y-2 border-l border-dashed border-border pl-3">
                          {trajectoire.lignes.slice(1).map((ligne) => (
                            <li key={ligne.id}>
                              <LigneSynthese ligne={ligne} />
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                    <button
                      type="button"
                      className="mt-2 text-xs text-primary hover:underline"
                      onClick={() => {
                        setRevise(trajectoire.idSynthese);
                        setTexte(trajectoire.lignes[0].texte);
                        setMessage('');
                        setRegistreAConfirmer(false);
                      }}
                    >
                      Réviser cette version
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Les désaccords du patient. AUCUN DÉCOMPTE, aucun taux : la liste
              dit ce qui a été dit, et l'état dérivé de chaque message. */}
          {desaccords.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">« Ce n’est pas exactement ça »</h4>
              <ul className="space-y-2">
                {desaccords.map((desaccord) => (
                  <li
                    key={desaccord.id}
                    className="rounded border border-border bg-muted/30 p-2 text-sm"
                  >
                    {desaccord.texte ? (
                      <p className="whitespace-pre-wrap">{desaccord.texte}</p>
                    ) : (
                      <p className="italic text-muted-foreground">
                        Signalé sans texte : le patient a indiqué que ce n’était pas exactement ça.
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(desaccord.exprimeLe ?? desaccord.creeLe)} ·{' '}
                      {LIBELLE_DESACCORD[desaccord.etat]}
                    </p>
                  </li>
                ))}
              </ul>
              {/* LA MÉCANIQUE DE L'ÉTAT DÉRIVÉ EST DITE, parce qu'elle a un
                  angle mort : « répondu » se calcule sur la DESCENDANCE de la
                  version contestée. Publier une version indépendante répond au
                  patient mais laisse le message en « pas encore de réponse »,
                  définitivement. Le praticien doit pouvoir le savoir plutôt que
                  de le découvrir. (Revue LOT-04, M2.) */}
              {/* En repli depuis l'audit 2026-09-02 : règle d'usage utile une
                  fois, pas à chaque consultation. Le texte reste entier dans
                  le DOM (details natif) — le banc qui l'exige passe tel quel. */}
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer">Comment un message devient « répondu »</summary>
                <p className="mt-1">
                  Répondre, c’est publier une nouvelle version. Un message ne se ferme pas et ne
                  s’efface pas. Pour qu’il apparaisse comme répondu, révisez la version contestée :
                  une version écrite indépendamment ne s’y rattache pas.
                </p>
              </details>
            </div>
          )}

          {/* ── Rédaction ────────────────────────────────────────────────── */}
          {!editionOuverte && (
            <div className="border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setRedactionLibre(true)}
                className="rounded border border-border px-3 py-2 text-sm text-foreground hover:bg-accent/10"
              >
                Écrire une nouvelle version
              </button>
            </div>
          )}
          {editionOuverte && (
          <form
            className="space-y-3 border-t border-border pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              void envoyer(false, false);
            }}
          >
            {revise && (
              <p className="text-xs text-muted-foreground">
                Révision d’une version existante — l’ancienne reste lisible.{' '}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => {
                    setRevise(null);
                    setTexte('');
                    setRedactionLibre(true);
                  }}
                >
                  Écrire une version indépendante
                </button>
              </p>
            )}
            {!revise && redactionLibre && (
              <p className="text-xs text-muted-foreground">
                Nouvelle version indépendante.{' '}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => {
                    setRedactionLibre(false);
                    setTexte('');
                    setMessage('');
                    setRegistreAConfirmer(false);
                  }}
                >
                  Annuler
                </button>
              </p>
            )}

            {/* ── LE RÉSUMÉ PROPOSÉ ─────────────────────────────────────────
                À LA DEMANDE, JAMAIS À L'OUVERTURE : le bouton est le seul geste
                qui fait parler la machine. Ce qui manque est NOMMÉ pièce par
                pièce plutôt que résumé en « indisponible » — un écran qui
                affirme une cause qu'il n'a pas vérifiée est le défaut fermé
                deux fois dans cette campagne. */}
            {manqueResume !== null ? (
              <p className="rounded border border-border bg-muted/40 p-2 text-xs text-muted-foreground">
                Un résumé de ce dossier pourra vous être proposé quand il y aura{' '}
                {manqueResume.map((m) => LIBELLE_MANQUE_RESUME[m] ?? m).join(' et ')}. D’ici là,
                écrivez de votre main.
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={tirageEnCours}
                  onClick={() => void demanderTirage(tirage !== null)}
                  className="rounded border border-border px-3 py-1.5 text-xs disabled:opacity-50"
                >
                  {tirageEnCours
                    ? 'En cours…'
                    : tirage === null
                      ? 'Proposer un résumé'
                      : 'Une autre'}
                </button>
                {tirage !== null && (
                  <span className="text-xs text-muted-foreground">
                    Proposé par la machine, à relire. Réécrivez-le : il partira sous votre
                    signature.
                  </span>
                )}
              </div>
            )}

            <label className="block text-sm font-medium" htmlFor="comprehension-texte">
              Ce que j’ai compris
            </label>
            {/* Aucun `maxLength` : il ferait couper le navigateur en silence.
                La borne est opposée par la route, en refus, avec un message. */}
            <textarea
              id="comprehension-texte"
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              rows={6}
              placeholder="Ce que vous me dites, tel que je l’entends…"
              className="w-full rounded border border-border bg-background p-2 text-sm"
            />
            <p
              className={`text-xs ${tropLong ? 'text-status-warning' : 'text-muted-foreground'}`}
            >
              {texte.length} / {LONGUEUR_MAX_SYNTHESE} caractères
              {tropLong && ' — au-delà de la limite : raccourcissez avant d’enregistrer.'}
            </p>

            <label className="block text-sm font-medium" htmlFor="comprehension-date">
              Date de cette compréhension{' '}
              <span className="font-normal text-muted-foreground">(facultatif)</span>
            </label>
            <input
              id="comprehension-date"
              type="date"
              value={redigeeLe}
              onChange={(e) => setRedigeeLe(e.target.value)}
              className="rounded border border-border bg-background p-2 text-sm"
            />

            {message && (
              <p
                className={`rounded p-2 text-sm ${
                  registreAConfirmer
                    ? 'border border-status-warning/40 bg-status-warning/10'
                    : 'text-status-error'
                }`}
              >
                {message}
              </p>
            )}

            {/* LE VERROU, DIT. Un bouton grisé sans phrase est une énigme ;
                celui-ci explique ce qu'il attend. Le refus qui compte reste
                celui de la route (`D-164`) — ceci n'est qu'une courtoisie. */}
            {identiqueAuTirage && (
              <p className="rounded border border-status-warning/40 bg-status-warning/10 p-2 text-sm">
                Ce texte est exactement celui qui vous a été proposé. Relisez-le et réécrivez-le :
                il sera publié sous votre signature. Vous pouvez l’enregistrer en brouillon tel
                quel.
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={envoi === 'envoi' || texte.trim().length === 0}
                className="rounded bg-secondary px-3 py-2 text-sm disabled:opacity-50"
              >
                Enregistrer en brouillon
              </button>
              <button
                type="button"
                disabled={
                  envoi === 'envoi' ||
                  texte.trim().length === 0 ||
                  !surfaceOuverte ||
                  identiqueAuTirage
                }
                onClick={() => void envoyer(true, false)}
                className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
              >
                Publier au patient
              </button>
              {/* LE SECOND GESTE EST DISTINCT DU PREMIER : confirmer le registre
                  ne se fait pas d'un clic qui voudrait dire aussi « publier ».
                  Il n'apparaît QUE si la route a posé la question. */}
              {registreAConfirmer && (
                <button
                  type="button"
                  disabled={envoi === 'envoi'}
                  onClick={() => void envoyer(true, true)}
                  className="rounded border border-status-warning px-3 py-2 text-sm"
                >
                  Publier tel quel
                </button>
              )}
            </div>
          </form>
          )}
        </div>
      )}
    </section>
  );
}
