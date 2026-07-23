'use client';

import { useCallback, useMemo, useState } from 'react';
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
import type { CorpusRechercheApiResponse } from '@/app/api/praticien/corpus/claims/recherche/route';

// Atelier corpus v2 — VOIE RAPIDE : validation par lot d'une source
// (procédure « validation à deux vitesses » actée le 2026-07-23).
//
// Le déroulé matérialise la procédure, dans l'ordre, sans raccourci :
//  1. tirage d'échantillon — par le SERVEUR, jamais choisi ici (anti-biais),
//     repris tel quel si un tirage ouvert existe déjà ;
//  2. confrontation de CHAQUE claim tiré à son verbatim → verdict ;
//  3. questionnaire de restitution joué SUR le corpus (les réponses citent
//     les claims) → verdict par question, couverture des chunks affichée ;
//  4. issue : signature du lot entier (tout conforme + couverture complète)
//     ou bascule de la source en revue individuelle, motif à l'appui.
// Les deux issues sont en deux temps (armer puis confirmer), comme en v1.

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

const SOURCE_RE = /^WN-SRC-\d{4}$/;

export function AtelierVoieRapide() {
  const [sourceId, setSourceId] = useState('');
  const [phase, setPhase] = useState<'source' | 'revue' | 'conclu'>('source');
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');

  const [tirageId, setTirageId] = useState<number | null>(null);
  const [taux, setTaux] = useState<number | null>(null);
  const [tires, setTires] = useState<string[]>([]);
  const [claimsSource, setClaimsSource] = useState<ClaimEnRevue[]>([]);
  const [verdicts, setVerdicts] = useState<Record<string, VerdictLocal>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const [questions, setQuestions] = useState<QuestionLocale[]>([]);
  const [nouvelleQuestion, setNouvelleQuestion] = useState('');

  const [issueArmee, setIssueArmee] = useState<'valider' | 'basculer' | null>(null);
  const [motifBascule, setMotifBascule] = useState('');
  const [conclusion, setConclusion] = useState('');

  const claimsParId = useMemo(() => new Map(claimsSource.map((c) => [c.id, c])), [claimsSource]);
  const echantillon = useMemo(
    () => tires.map((id) => claimsParId.get(id)).filter((c): c is ClaimEnRevue => Boolean(c)),
    [tires, claimsParId],
  );

  // Couverture : les chunks ATTEIGNABLES sont ceux cités par au moins un
  // claim de la source ; les chunks COUVERTS, ceux cités par les claims que
  // les questions citent — le serveur revérifie à la signature.
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

  const chargerClaimsSource = useCallback(async (source: string): Promise<ClaimEnRevue[]> => {
    const reponse = await fetch(
      `/api/praticien/corpus/claims?statut=EN_ATTENTE_VALIDATION&sourceId=${encodeURIComponent(source)}&limit=100`,
    );
    const payload = (await reponse.json()) as CorpusClaimsApiResponse;
    if (!reponse.ok || !payload.ok) {
      throw new Error(payload.ok ? 'File de revue illisible.' : payload.error);
    }
    return payload.claims;
  }, []);

  const demarrer = useCallback(async () => {
    const source = sourceId.trim().toUpperCase();
    if (!SOURCE_RE.test(source)) {
      setErreur('Identifiant de source attendu : WN-SRC-0000.');
      return;
    }
    setChargement(true);
    setErreur('');
    try {
      // Reprise d'un tirage ouvert avant tout : re-tirer serait refusé (et
      // c'est voulu — un tirage défavorable ne s'efface pas).
      const ouvertReponse = await fetch(
        `/api/praticien/corpus/claims/lot/tirage?sourceId=${encodeURIComponent(source)}`,
      );
      const ouvert = (await ouvertReponse.json()) as CorpusLotTirageOuvertApiResponse;
      let id: number;
      let tauxTirage: number;
      let tiresTirage: string[];
      if (ouvertReponse.ok && ouvert.ok && ouvert.tirage) {
        id = ouvert.tirage.tirageId;
        tauxTirage = ouvert.tirage.taux;
        tiresTirage = ouvert.tirage.tires;
      } else {
        const tirageReponse = await fetch('/api/praticien/corpus/claims/lot/tirage', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sourceId: source }),
        });
        const tirage = (await tirageReponse.json()) as CorpusLotTirageApiResponse;
        if (!tirageReponse.ok || !tirage.ok) {
          setErreur(tirage.ok ? 'Tirage impossible.' : tirage.error);
          return;
        }
        id = tirage.tirageId;
        tauxTirage = tirage.taux;
        tiresTirage = tirage.tires;
      }

      const claims = await chargerClaimsSource(source);
      setSourceId(source);
      setTirageId(id);
      setTaux(tauxTirage);
      setTires(tiresTirage);
      setClaimsSource(claims);
      setVerdicts({});
      setNotes({});
      setQuestions([]);
      setIssueArmee(null);
      setMotifBascule('');
      setConclusion('');
      setPhase('revue');
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Erreur technique.');
    } finally {
      setChargement(false);
    }
  }, [sourceId, chargerClaimsSource]);

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
            ? `Lot signé : ${payload.valides} claims validés pour ${sourceId}.`
            : `Source ${sourceId} basculée en revue individuelle — motif journalisé.`,
        );
        setPhase('conclu');
      } catch {
        setErreur('Erreur technique pendant la conclusion.');
      } finally {
        setChargement(false);
        setIssueArmee(null);
      }
    },
    [tirageId, chargement, tires, verdicts, notes, questions, sourceId, motifBascule],
  );

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-bold text-foreground">
            Voie rapide — validation par lot
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Échantillon tiré par le serveur, questionnaire de restitution joué sur le corpus,
            signature du lot entier — ou bascule en revue individuelle au premier défaut.
            Prescriptifs et interprétés restent en revue individuelle.
          </p>
        </div>
        {taux !== null && phase !== 'source' ? (
          <Badge>{`Échantillon ${Math.round(taux * 100)} %`}</Badge>
        ) : null}
      </div>

      {erreur ? (
        <p role="alert" className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {erreur}
        </p>
      ) : null}

      {phase === 'source' ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label htmlFor="voie-rapide-source" className="text-sm font-medium text-foreground">
            Source
          </label>
          <input
            id="voie-rapide-source"
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            placeholder="WN-SRC-0056"
            className="w-40 rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
          />
          <Button onClick={demarrer} disabled={chargement}>
            {chargement ? 'Tirage…' : 'Tirer l’échantillon'}
          </Button>
        </div>
      ) : null}

      {phase === 'revue' ? (
        <div className="mt-5 flex flex-col gap-6">
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-[.05em] text-solar-ink">
              1 · Échantillon à confronter au verbatim ({echantillon.length} claims — tirage #{tirageId})
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
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-[.05em] text-solar-ink">
              2 · Questionnaire de restitution — couverture {chunksCouverts.size}/
              {chunksAtteignables.size} chunks
            </h4>
            <ul className="mt-3 flex flex-col gap-3">
              {questions.map((q, index) => (
                <li key={index} className="rounded-xl border border-border p-3">
                  <p className="text-sm font-medium text-foreground">{q.question}</p>
                  {q.resultats.length > 0 ? (
                    <div className="mt-2 flex flex-col gap-1">
                      {q.resultats.map((r) => (
                        <p key={`${r.claimId}@${r.versionClaim}`} className="text-xs text-muted-foreground">
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
                    <Button
                      className="mt-2"
                     
                      onClick={() => jouerQuestion(index)}
                      disabled={q.enCours}
                    >
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
                placeholder="Question de restitution (générée ou libre)"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
              />
              <Button
                variant="outline"
                onClick={() => {
                  const question = nouvelleQuestion.trim();
                  if (question.length < 3) return;
                  setQuestions((qs) => [
                    ...qs,
                    {
                      question,
                      reponse: '',
                      claimsCites: [],
                      chunksCites: [],
                      resultats: [],
                      verdict: null,
                      enCours: false,
                    },
                  ]);
                  setNouvelleQuestion('');
                }}
              >
                Ajouter
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
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
          </div>
        </div>
      ) : null}

      {phase === 'conclu' ? (
        <div className="mt-4 flex items-center gap-3">
          <p className="text-sm font-medium text-foreground">{conclusion}</p>
          <Button
            variant="outline"
           
            onClick={() => {
              setPhase('source');
              setSourceId('');
              setConclusion('');
            }}
          >
            Autre source
          </Button>
        </div>
      ) : null}
    </section>
  );
}
