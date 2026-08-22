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
  const [envoi, setEnvoi] = useState<EtatEnvoi>('repos');
  const [message, setMessage] = useState('');
  /** Question du registre restée sans réponse : le praticien doit trancher. */
  const [registreAConfirmer, setRegistreAConfirmer] = useState(false);

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
          }),
        });
        const data = (await res.json()) as { ok: boolean; reason?: string; error?: string };
        if (res.ok && data.ok) {
          setTexte('');
          setRedigeeLe('');
          setRevise(null);
          setRegistreAConfirmer(false);
          setEnvoi('repos');
          await charger();
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
    [idPatient, texte, redigeeLe, revise, charger],
  );

  const tropLong = texte.length > LONGUEUR_MAX_SYNTHESE;

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
              <p className="text-xs text-muted-foreground">
                Répondre, c’est publier une nouvelle version. Un message ne se ferme pas et ne
                s’efface pas. Pour qu’il apparaisse comme répondu, révisez la version contestée :
                une version écrite indépendamment ne s’y rattache pas.
              </p>
            </div>
          )}

          {/* ── Rédaction ────────────────────────────────────────────────── */}
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
                  }}
                >
                  Écrire une version indépendante
                </button>
              </p>
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
                disabled={envoi === 'envoi' || texte.trim().length === 0 || !surfaceOuverte}
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
        </div>
      )}
    </section>
  );
}
