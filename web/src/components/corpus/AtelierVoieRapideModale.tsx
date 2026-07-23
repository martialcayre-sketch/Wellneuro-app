'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { ClaimEnRevue } from '@/lib/rag/claims/revue';
import type { ClaimRestitution } from '@/lib/rag/claims/recherche';
import type { CorpusClaimsApiResponse } from '@/app/api/praticien/corpus/claims/route';
import type {
  CorpusLotTirageApiResponse,
  CorpusLotTirageOuvertApiResponse,
} from '@/app/api/praticien/corpus/claims/lot/tirage/route';
import type { CorpusLotDecisionApiResponse } from '@/app/api/praticien/corpus/claims/lot/decision/route';
import type { CorpusQuestionnaireApiResponse } from '@/app/api/praticien/corpus/claims/questionnaire/route';
import type { CorpusRechercheApiResponse } from '@/app/api/praticien/corpus/claims/recherche/route';

// Atelier corpus v2 — VOIE RAPIDE en MODALE plein écran, une source à la fois.
//
// La modale s'ouvre depuis la vue d'ensemble des sources (jamais de saisie
// manuelle d'identifiant) et porte tout le déroulé sans faire défiler la page
// principale : tirage serveur (repris s'il en existe un ouvert), confrontation
// de l'échantillon au verbatim, questionnaire de restitution joué sur le
// corpus, puis signature du lot entier ou bascule motivée — armée puis
// confirmée. Échap ou « Fermer » interrompt sans conclure : le tirage ouvert
// se retrouve tel quel à la prochaine ouverture (il ne se re-tire pas).

type VerdictLocal = 'conforme' | 'non_conforme' | null;

type QuestionLocale = {
  question: string;
  reponse: string;
  claimsCites: string[];
  chunksCites: string[];
  resultats: ClaimRestitution[];
  verdict: VerdictLocal;
  enCours: boolean;
};

export function AtelierVoieRapideModale({
  sourceId,
  titre,
  onClose,
  onConclu,
}: {
  sourceId: string;
  titre: string;
  onClose: () => void;
  /** Appelé après une issue (signature ou bascule) : le parent rafraîchit ses listes. */
  onConclu: () => void;
}) {
  const [phase, setPhase] = useState<'preparation' | 'revue' | 'conclu'>('preparation');
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');

  const [tirageId, setTirageId] = useState<number | null>(null);
  const [taux, setTaux] = useState<number | null>(null);
  const [tirageRepris, setTirageRepris] = useState(false);
  const [tires, setTires] = useState<string[]>([]);
  const [claimsSource, setClaimsSource] = useState<ClaimEnRevue[]>([]);
  const [verdicts, setVerdicts] = useState<Record<string, VerdictLocal>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const [questions, setQuestions] = useState<QuestionLocale[]>([]);
  const [nouvelleQuestion, setNouvelleQuestion] = useState('');
  const [generationEnCours, setGenerationEnCours] = useState(false);
  const [avertissementGeneration, setAvertissementGeneration] = useState('');

  const [issueArmee, setIssueArmee] = useState<'valider' | 'basculer' | null>(null);
  const [motifBascule, setMotifBascule] = useState('');
  const [conclusion, setConclusion] = useState('');

  const fermerRef = useRef(onClose);
  fermerRef.current = onClose;

  // Échap ferme la modale (sans conclure : le tirage ouvert persiste).
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fermerRef.current();
    };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, []);

  const claimsParId = useMemo(() => new Map(claimsSource.map((c) => [c.id, c])), [claimsSource]);
  const echantillon = useMemo(
    () => tires.map((id) => claimsParId.get(id)).filter((c): c is ClaimEnRevue => Boolean(c)),
    [tires, claimsParId],
  );

  // Couverture : chunks ATTEIGNABLES = cités par au moins un claim de la
  // source ; COUVERTS = cités par les claims que les questions conformes
  // citent — le serveur revérifie à la signature.
  const chunksAtteignables = useMemo(() => {
    const chunks = new Set<string>();
    for (const claim of claimsSource) for (const s of claim.sources) chunks.add(s.chunkId);
    return chunks;
  }, [claimsSource]);
  const chunksCouverts = useMemo(() => {
    const chunks = new Set<string>();
    for (const q of questions) {
      if (q.verdict !== 'conforme') continue;
      for (const chunk of q.chunksCites) if (chunksAtteignables.has(chunk)) chunks.add(chunk);
    }
    return chunks;
  }, [questions, chunksAtteignables]);

  const verdictsComplets =
    echantillon.length > 0 && echantillon.every((c) => verdicts[c.id] === 'conforme');
  const unVerdictNegatif =
    Object.values(verdicts).includes('non_conforme') ||
    questions.some((q) => q.verdict === 'non_conforme');
  const questionnaireConforme =
    questions.length > 0 && questions.every((q) => q.verdict === 'conforme');
  const couvertureComplete =
    chunksAtteignables.size > 0 && chunksCouverts.size === chunksAtteignables.size;
  const signaturePossible = verdictsComplets && questionnaireConforme && couvertureComplete;

  const chargerClaimsSource = useCallback(async (): Promise<ClaimEnRevue[]> => {
    const reponse = await fetch(
      `/api/praticien/corpus/claims?statut=EN_ATTENTE_VALIDATION&source=${encodeURIComponent(sourceId)}&limit=100`,
    );
    const payload = (await reponse.json()) as CorpusClaimsApiResponse;
    if (!reponse.ok || !payload.ok) {
      throw new Error(payload.ok ? 'File de revue illisible.' : payload.error);
    }
    return payload.claims;
  }, [sourceId]);

  const entrerEnRevue = useCallback(
    async (id: number, tauxTirage: number, tiresTirage: string[], repris: boolean) => {
      const claims = await chargerClaimsSource();
      setTirageId(id);
      setTaux(tauxTirage);
      setTires(tiresTirage);
      setTirageRepris(repris);
      setClaimsSource(claims);
      setVerdicts({});
      setNotes({});
      setQuestions([]);
      setIssueArmee(null);
      setMotifBascule('');
      setPhase('revue');
    },
    [chargerClaimsSource],
  );

  // À l'ouverture : reprendre le tirage ouvert s'il existe — sinon rester en
  // préparation, le tirage est un acte explicite (il est journalisé).
  useEffect(() => {
    let annule = false;
    (async () => {
      setChargement(true);
      try {
        const reponse = await fetch(
          `/api/praticien/corpus/claims/lot/tirage?sourceId=${encodeURIComponent(sourceId)}`,
        );
        const payload = (await reponse.json()) as CorpusLotTirageOuvertApiResponse;
        if (annule) return;
        if (reponse.ok && payload.ok && payload.tirage) {
          await entrerEnRevue(
            payload.tirage.tirageId,
            payload.tirage.taux,
            payload.tirage.tires,
            true,
          );
        }
      } catch {
        if (!annule) setErreur('Erreur technique au chargement.');
      } finally {
        if (!annule) setChargement(false);
      }
    })();
    return () => {
      annule = true;
    };
  }, [sourceId, entrerEnRevue]);

  const tirer = useCallback(async () => {
    setChargement(true);
    setErreur('');
    try {
      const reponse = await fetch('/api/praticien/corpus/claims/lot/tirage', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sourceId }),
      });
      const payload = (await reponse.json()) as CorpusLotTirageApiResponse;
      if (!reponse.ok || !payload.ok) {
        setErreur(payload.ok ? 'Tirage impossible.' : payload.error);
        return;
      }
      await entrerEnRevue(payload.tirageId, payload.taux, payload.tires, false);
    } catch {
      setErreur('Erreur technique pendant le tirage.');
    } finally {
      setChargement(false);
    }
  }, [sourceId, entrerEnRevue]);

  const jouerQuestion = useCallback(
    async (index: number) => {
      const question = questions[index];
      if (!question || question.enCours) return;
      setQuestions((qs) => qs.map((q, i) => (i === index ? { ...q, enCours: true } : q)));
      try {
        const reponse = await fetch('/api/praticien/corpus/claims/recherche', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sourceId, question: question.question }),
        });
        const payload = (await reponse.json()) as CorpusRechercheApiResponse;
        if (!reponse.ok || !payload.ok) {
          setErreur(payload.ok ? 'Restitution impossible.' : payload.error);
          setQuestions((qs) => qs.map((q, i) => (i === index ? { ...q, enCours: false } : q)));
          return;
        }
        const resultats = payload.claims;
        setQuestions((qs) =>
          qs.map((q, i) =>
            i === index
              ? {
                  ...q,
                  enCours: false,
                  resultats,
                  reponse: resultats.map((r) => r.texteNormalise).join('\n'),
                  claimsCites: [...new Set(resultats.map((r) => r.claimId))],
                  chunksCites: [...new Set(resultats.flatMap((r) => r.chunksCites))],
                  verdict: null,
                }
              : q,
          ),
        );
      } catch {
        setErreur('Erreur technique pendant la restitution.');
        setQuestions((qs) => qs.map((q, i) => (i === index ? { ...q, enCours: false } : q)));
      }
    },
    [questions, sourceId],
  );

  const ajouterQuestions = useCallback((libelles: string[]) => {
    const nouvelles = libelles
      .map((q) => q.trim())
      .filter((q) => q.length >= 3)
      .map((question) => ({
        question,
        reponse: '',
        claimsCites: [] as string[],
        chunksCites: [] as string[],
        resultats: [] as ClaimRestitution[],
        verdict: null as VerdictLocal,
        enCours: false,
      }));
    if (nouvelles.length) setQuestions((qs) => [...qs, ...nouvelles]);
  }, []);

  // Génération serveur : une question par chunk atteignable, depuis les
  // claims du chunk. Les doublons (question déjà à l'écran) sont écartés ;
  // chaque question reste à JOUER sur le corpus puis à juger — la génération
  // ne décide rien.
  const genererQuestionnaire = useCallback(async () => {
    if (generationEnCours) return;
    setGenerationEnCours(true);
    setAvertissementGeneration('');
    setErreur('');
    try {
      const reponse = await fetch('/api/praticien/corpus/claims/questionnaire', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sourceId }),
      });
      const payload = (await reponse.json()) as CorpusQuestionnaireApiResponse;
      if (!reponse.ok || !payload.ok) {
        setErreur(payload.ok ? 'Génération impossible.' : payload.error);
        return;
      }
      const dejaLa = new Set(questions.map((q) => q.question));
      ajouterQuestions(
        payload.questionnaire.questions.map((q) => q.question).filter((q) => !dejaLa.has(q)),
      );
      if (!payload.questionnaire.couvertureComplete) {
        setAvertissementGeneration(
          `Génération incomplète : ${payload.questionnaire.chunksSansQuestion.length} chunk(s) sans question — complétez à la main ou régénérez.`,
        );
      }
    } catch {
      setErreur('Erreur technique pendant la génération.');
    } finally {
      setGenerationEnCours(false);
    }
  }, [generationEnCours, sourceId, questions, ajouterQuestions]);

  const conclure = useCallback(
    async (issue: 'valider' | 'basculer') => {
      if (tirageId === null || chargement) return;
      setChargement(true);
      setErreur('');
      try {
        const verdictsEnvoyes = tires.map((id) => ({
          id,
          verdict: verdicts[id] === 'conforme' ? ('conforme' as const) : ('non_conforme' as const),
          ...(notes[id]?.trim() ? { note: notes[id].trim() } : {}),
        }));
        const questionnaireEnvoye = {
          questions: questions
            .filter((q) => q.verdict !== null && q.reponse !== '')
            .map((q) => ({
              question: q.question,
              reponse: q.reponse,
              claimsCites: q.claimsCites,
              verdict: q.verdict as 'conforme' | 'non_conforme',
            })),
        };
        const corps =
          issue === 'valider'
            ? {
                sourceId,
                tirageId,
                issue,
                verdicts: verdictsEnvoyes,
                questionnaire: questionnaireEnvoye,
              }
            : {
                sourceId,
                tirageId,
                issue,
                motif: motifBascule.trim(),
                ...(verdictsEnvoyes.length ? { verdicts: verdictsEnvoyes } : {}),
                ...(questionnaireEnvoye.questions.length
                  ? { questionnaire: questionnaireEnvoye }
                  : {}),
              };
        const reponse = await fetch('/api/praticien/corpus/claims/lot/decision', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(corps),
        });
        const payload = (await reponse.json()) as CorpusLotDecisionApiResponse;
        if (!reponse.ok || !payload.ok) {
          setErreur(payload.ok ? 'Issue impossible.' : payload.error);
          return;
        }
        setConclusion(
          payload.issue === 'valider'
            ? `Lot signé : ${payload.valides} claims validés.`
            : 'Source basculée en revue individuelle — motif journalisé.',
        );
        setPhase('conclu');
        onConclu();
      } catch {
        setErreur('Erreur technique pendant la conclusion.');
      } finally {
        setChargement(false);
        setIssueArmee(null);
      }
    },
    [tirageId, chargement, tires, verdicts, notes, questions, sourceId, motifBascule, onConclu],
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Voie rapide — ${sourceId}`}
      className="fixed inset-0 z-50 flex flex-col bg-background"
    >
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[.06em] text-solar-ink">
            Voie rapide · {sourceId}
            {taux !== null ? ` · échantillon ${Math.round(taux * 100)} %` : ''}
            {tirageRepris ? ' · tirage repris' : ''}
          </p>
          <h3 className="truncate font-display text-lg font-bold text-foreground">{titre}</h3>
        </div>
        <Button variant="outline" onClick={onClose}>
          Fermer
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {erreur ? (
          <p role="alert" className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {erreur}
          </p>
        ) : null}

        {phase === 'preparation' ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted-foreground">
              Le serveur tire l&apos;échantillon (jamais vous — anti-biais) et le journalise :
              un tirage défavorable ne s&apos;efface pas en re-tirant.
            </p>
            <Button onClick={tirer} disabled={chargement}>
              {chargement ? 'Tirage…' : 'Tirer l’échantillon'}
            </Button>
          </div>
        ) : null}

        {phase === 'revue' ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <section aria-label="Échantillon à confronter au verbatim">
              <h4 className="text-sm font-semibold uppercase tracking-[.05em] text-solar-ink">
                1 · Échantillon ({echantillon.length} claims — tirage #{tirageId})
              </h4>
              <ul className="mt-3 flex flex-col gap-3">
                {echantillon.map((claim) => (
                  <li key={claim.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {claim.claimId} · {claim.typologieLecture}
                        </p>
                        <p className="mt-1 text-sm text-foreground">{claim.texteNormalise}</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant={verdicts[claim.id] === 'conforme' ? 'primary' : 'outline'}
                          onClick={() => setVerdicts((v) => ({ ...v, [claim.id]: 'conforme' }))}
                        >
                          Conforme
                        </Button>
                        <Button
                          variant={verdicts[claim.id] === 'non_conforme' ? 'danger' : 'outline'}
                          onClick={() => setVerdicts((v) => ({ ...v, [claim.id]: 'non_conforme' }))}
                        >
                          Non conforme
                        </Button>
                      </div>
                    </div>
                    {claim.sources.map((s) => (
                      <blockquote
                        key={`${s.chunkId}@${s.versionChunk}`}
                        className="mt-2 border-l-2 border-border pl-3 text-xs text-muted-foreground"
                      >
                        <span className="font-medium">{s.chunkId}</span> — {s.extrait}
                        {s.tronque ? '…' : ''}
                      </blockquote>
                    ))}
                    {verdicts[claim.id] === 'non_conforme' ? (
                      <input
                        value={notes[claim.id] ?? ''}
                        onChange={(e) => setNotes((n) => ({ ...n, [claim.id]: e.target.value }))}
                        placeholder="Note sur le défaut constaté"
                        className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs"
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>

            <section aria-label="Questionnaire de restitution">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-semibold uppercase tracking-[.05em] text-solar-ink">
                  2 · Restitution — couverture {chunksCouverts.size}/{chunksAtteignables.size} chunks
                </h4>
                <Button variant="outline" onClick={genererQuestionnaire} disabled={generationEnCours}>
                  {generationEnCours ? 'Génération…' : 'Générer le questionnaire'}
                </Button>
              </div>
              {avertissementGeneration ? (
                <p className="mt-2 rounded-lg bg-solar-500/10 px-3 py-2 text-xs text-solar-ink">
                  {avertissementGeneration}
                </p>
              ) : null}
              <ul className="mt-3 flex flex-col gap-3">
                {questions.map((q, index) => (
                  <li key={index} className="rounded-xl border border-border p-3">
                    <p className="text-sm font-medium text-foreground">{q.question}</p>
                    {q.resultats.length > 0 ? (
                      <div className="mt-2 flex flex-col gap-1">
                        {q.resultats.map((r) => (
                          <p
                            key={`${r.claimId}@${r.versionClaim}`}
                            className="text-xs text-muted-foreground"
                          >
                            <span className="font-medium">{r.claimId}</span>{' '}
                            ({Math.round(r.similarity * 100)} %) — {r.texteNormalise}
                          </p>
                        ))}
                        <div className="mt-2 flex gap-1">
                          <Button
                            variant={q.verdict === 'conforme' ? 'primary' : 'outline'}
                            onClick={() =>
                              setQuestions((qs) =>
                                qs.map((x, i) => (i === index ? { ...x, verdict: 'conforme' } : x)),
                              )
                            }
                          >
                            Restitution conforme
                          </Button>
                          <Button
                            variant={q.verdict === 'non_conforme' ? 'danger' : 'outline'}
                            onClick={() =>
                              setQuestions((qs) =>
                                qs.map((x, i) =>
                                  i === index ? { ...x, verdict: 'non_conforme' } : x,
                                ),
                              )
                            }
                          >
                            Non conforme
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button className="mt-2" onClick={() => jouerQuestion(index)} disabled={q.enCours}>
                        {q.enCours ? 'Restitution…' : 'Jouer sur le corpus'}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <input
                  value={nouvelleQuestion}
                  onChange={(e) => setNouvelleQuestion(e.target.value)}
                  placeholder="Question libre (en plus du généré)"
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    ajouterQuestions([nouvelleQuestion]);
                    setNouvelleQuestion('');
                  }}
                >
                  Ajouter
                </Button>
              </div>
            </section>
          </div>
        ) : null}

        {phase === 'conclu' ? (
          <div className="flex items-center gap-3">
            <p className="text-sm font-medium text-foreground">{conclusion}</p>
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
          </div>
        ) : null}
      </div>

      {phase === 'revue' ? (
        <footer className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3">
          {issueArmee === 'valider' ? (
            <Button onClick={() => conclure('valider')} disabled={chargement}>
              Confirmer la signature du lot ({claimsSource.length} claims)
            </Button>
          ) : (
            <Button
              onClick={() => setIssueArmee('valider')}
              disabled={!signaturePossible || chargement}
              title={
                signaturePossible
                  ? undefined
                  : 'Signature possible quand tout l’échantillon et tout le questionnaire sont conformes, couverture complète.'
              }
            >
              Signer le lot
            </Button>
          )}
          {issueArmee === 'basculer' ? (
            <Button
              variant="danger"
              onClick={() => conclure('basculer')}
              disabled={chargement || motifBascule.trim().length === 0}
            >
              Confirmer la bascule
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => setIssueArmee('basculer')}
              disabled={chargement || !unVerdictNegatif}
              title={
                unVerdictNegatif
                  ? undefined
                  : 'La bascule se justifie par un défaut constaté (échantillon ou questionnaire).'
              }
            >
              Basculer en revue individuelle
            </Button>
          )}
          {issueArmee === 'basculer' ? (
            <input
              value={motifBascule}
              onChange={(e) => setMotifBascule(e.target.value)}
              placeholder="Motif de la bascule (obligatoire)"
              className="min-w-64 flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
            />
          ) : null}
          {issueArmee ? (
            <Button variant="outline" onClick={() => setIssueArmee(null)}>
              Annuler
            </Button>
          ) : null}
        </footer>
      ) : null}
    </div>
  );
}
