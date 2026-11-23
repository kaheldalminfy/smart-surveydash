import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Download, FileSpreadsheet, Plus, Sparkles, RefreshCw, Edit, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { canEditScope, type RoleRow } from '@/lib/accreditationScope';
import { loadAccreditationReport, scopeMetrics, type Dataset, type ReportRow } from '@/lib/accreditationReport';
import { accreditationLabels } from '@/lib/accreditationLabels';
import { exportAccreditationExcel, exportAccreditationPDF, type AccreditationAnalysis } from '@/utils/exportAccreditation';

type Props = { framework: { id: string; name: string; type: 'institutional' | 'programmatic' }; programId: string | null; year: string; roles: RoleRow[]; programs: { id: string; name: string }[]; revision: unknown };
type Editor = { id: string | null; indicatorId: string; programId: string | null; title: string; description: string; responsible_person: string; due_date: string; evidence_notes: string; status: 'pending' | 'in_progress' | 'completed' | 'postponed' };
export function AccreditationReportPanel({ framework, programId, year, roles, programs, revision }: Props) {
 const { language } = useLanguage(); const L = accreditationLabels(language); const { toast } = useToast(); const navigate = useNavigate();
 const [params] = useSearchParams();
 const [data, setData] = useState<Dataset | null>(null); const [error, setError] = useState(''); const [loading,setLoading] = useState(true);
 const [refresh,setRefresh] = useState(0); const [college,setCollege] = useState(false); const [busy,setBusy] = useState(false); const [analysis,setAnalysis] = useState<AccreditationAnalysis | null>(null); const [editor,setEditor] = useState<Editor | null>(null);
 const global = roles.some(r => r.role === 'admin' || r.role === 'dean');
 const scopes = framework.type === 'institutional' ? [{ id: null, name: L.college }] : college && global ? programs : programs.filter(p => p.id === programId);
 useEffect(() => {
  let cancelled = false; setLoading(true); setError(''); setData(null);
  loadAccreditationReport(framework.id,year).then(value => { if(!cancelled) setData(value); }).catch(e => { if(!cancelled) setError(e.message); }).finally(() => { if(!cancelled) setLoading(false); });
  return () => { cancelled = true; };
 },[framework.id,year,revision,refresh]);
 useEffect(() => { setAnalysis(null); setEditor(null); },[framework.id,year,programId,college,refresh,revision]);
 const fail = (e: unknown) => toast({ title:L.error,description:e instanceof Error ? e.message : String((e as {message?: string})?.message ?? e),variant:'destructive' });
 const exportFile = async (format: 'pdf'|'excel') => {
  if (!data) return; setBusy(true);
  try { const input = { framework:framework.name,year,language,scopes,data,analysis }; await (format === 'pdf' ? exportAccreditationPDF(input) : exportAccreditationExcel(input)); } catch(e) { fail(e); } finally { setBusy(false); }
 };
 const generate = async () => {
  setBusy(true);
  try {
   for (const p of scopes.filter(p => canEditScope(roles,p.id))) {
    const { error } = await supabase.rpc('create_accreditation_improvement_plan',{p_framework_id:framework.id,p_program_id:p.id,p_year:year,p_language:language});
    if(error) throw error;
   }
   setRefresh(v=>v+1); toast({title:L.created});
  } catch(e) { fail(e); } finally { setBusy(false); }
 };
 const analyze = async () => {
  setBusy(true); setAnalysis(null);
  try {
   const { data: result, error: invocationError } = await supabase.functions.invoke('analyze-accreditation-report',{body:{ frameworkId:framework.id,year,programId:framework.type === 'institutional' ? null : programId,college:framework.type === 'programmatic' && college,language }});
   if(invocationError) {
    let message = invocationError.message;
    if(invocationError.context instanceof Response) { const body = await invocationError.context.json().catch(()=>null); message = body?.message ?? body?.error ?? message; }
    throw new Error(message);
   }
   if(result?.error) throw new Error(result.error);
   if(!result?.summary || !Array.isArray(result.recommendations)) throw new Error(L.error);
   setAnalysis(result);
  } catch(e) { fail(e); } finally { setBusy(false); }
 };
 const edit = (r: ReportRow, pid: string | null) => {
  const a = r.action;
  setEditor({ id:a?.id ?? null,indicatorId:r.indicator.id,programId:pid,title:a?.title ?? `${r.indicator.code} — ${r.indicator.name}`,description:a?.description ?? '',responsible_person:a?.responsible_person ?? r.assessment?.responsible_person ?? r.indicator.responsible_party ?? '',due_date:a?.due_date?.slice(0,10) ?? r.assessment?.due_date ?? '',evidence_notes:a?.evidence_notes ?? '',status:(a?.status ?? 'pending') as Editor['status'] });
 };
 const save = async (event: React.FormEvent) => {
  event.preventDefault(); if(!editor) return; setBusy(true);
  try {
   const values = {title:editor.title.trim(),description:editor.description.trim(),responsible_person:editor.responsible_person.trim() || null,due_date:editor.due_date ? `${editor.due_date}T12:00:00Z` : null,evidence_notes:editor.evidence_notes.trim() || null,status:editor.status,completed_at:editor.status === 'completed' ? new Date().toISOString() : null};
   const result = editor.id ? await supabase.from('recommendations').update(values).eq('id',editor.id) : await supabase.from('recommendations').insert({...values,source_type:'accreditation',source_id:editor.indicatorId,accreditation_indicator_id:editor.indicatorId,program_id:editor.programId,academic_year:year,priority:'high'});
   if(result.error) throw result.error;
   setEditor(null); setRefresh(v=>v+1); toast({title:L.saved});
  } catch(e) { fail(e); } finally { setBusy(false); }
 };
 if(loading) return <div className="py-8 flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" />{L.loading}</div>;
 if(error) return <Alert variant="destructive"><AlertDescription>{error}<Button variant="outline" onClick={()=>setRefresh(v=>v+1)}>{L.retry}</Button></AlertDescription></Alert>;
 if(!data) return null;
 const hasIndicators = data.indicators.length > 0;
 const canGenerate = scopes.some(p => canEditScope(roles,p.id));
 return <section className="border-t pt-8 mt-8 space-y-6" aria-label={L.report}>
  <div className="flex flex-wrap items-center justify-between gap-3">
   <h2 className="text-xl font-bold">{L.report}</h2>
   <div className="flex flex-wrap gap-2">
    <Button variant="ghost" size="icon" title={L.refresh} aria-label={L.refresh} disabled={busy} onClick={()=>setRefresh(v=>v+1)}><RefreshCw className="h-4 w-4" /></Button>
    <Button variant="outline" disabled={busy || !hasIndicators || !scopes.length} onClick={()=>exportFile('pdf')}><Download className="h-4 w-4 me-2" />{L.exportPDF}</Button>
    <Button variant="outline" disabled={busy || !hasIndicators || !scopes.length} onClick={()=>exportFile('excel')}><FileSpreadsheet className="h-4 w-4 me-2" />{L.exportExcel}</Button>
   </div>
  </div>
  {global && framework.type === 'programmatic' && <div className="max-w-sm"><Label>{L.reportScope}</Label><Select value={college ? 'college' : 'program'} onValueChange={v=>setCollege(v === 'college')} disabled={busy}><SelectTrigger aria-label={L.reportScope}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="program">{L.selectedProgram}</SelectItem><SelectItem value="college">{L.allPrograms}</SelectItem></SelectContent></Select></div>}
  <Tabs defaultValue={params.get('tab') === 'plans' ? 'plans' : 'report'}>
   <TabsList className="mb-4"><TabsTrigger value="report">{L.report}</TabsTrigger><TabsTrigger value="plans">{L.plans}</TabsTrigger></TabsList>
   <TabsContent value="report" className="space-y-6">
    {!hasIndicators && <p className="text-muted-foreground py-8">{L.none}</p>}
    {hasIndicators && scopes.map(p => { const m = scopeMetrics(data,p.id); return <div key={p.id ?? 'college'} className="space-y-4">
     <h3 className="font-semibold text-lg">{p.name}</h3>
     <dl className="grid grid-cols-2 lg:grid-cols-4 gap-4 border-y py-4">
      {[[L.compliance,`${m.compliance ?? '—'}%`],[L.assessed,`${m.assessed}/${data.indicators.length}`],[L.evidence,`${m.evidenceCoverage ?? '—'}%`],[L.progress,m.planProgress === null ? '—' : `${m.planProgress}%`]].map(([label,value])=><div key={label}><dt className="text-sm text-muted-foreground">{label}</dt><dd className="text-2xl font-bold mt-1">{value}</dd></div>)}
     </dl>
     <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>{L.indicator}</TableHead><TableHead>{L.compliance}</TableHead><TableHead>{L.requirements}</TableHead><TableHead>{L.attachments}</TableHead><TableHead>{L.missing}</TableHead><TableHead>{L.gaps}</TableHead><TableHead /></TableRow></TableHeader><TableBody>
      {m.rows.map(r=><TableRow key={r.indicator.id}><TableCell className="min-w-48"><span className="font-medium">{r.indicator.code} — {r.indicator.name}</span>{r.assessment?.compliance_percentage == null && <Badge variant="outline" className="block w-fit mt-1">{L.unassessed}</Badge>}</TableCell><TableCell>{r.compliance}%</TableCell><TableCell className="min-w-40">{(r.requirements.length ? r.requirements : [L.supporting]).join('؛ ')}</TableCell><TableCell className="min-w-40">{r.evidence.map(e=><div key={e.id} className="break-words">{e.title}</div>)}{!r.evidence.length && '—'}</TableCell><TableCell>{r.missing}</TableCell><TableCell className="min-w-40">{Array.isArray(r.assessment?.gaps) ? r.assessment.gaps.filter(g=>typeof g === 'string').join('؛ ') || '—' : '—'}</TableCell><TableCell><Button size="icon" variant="ghost" aria-label={L.open} title={L.open} onClick={()=>navigate(`/accreditation/indicator/${r.indicator.id}?year=${year}${p.id ? `&program=${p.id}` : ''}`)}><ExternalLink className="h-4 w-4" /></Button></TableCell></TableRow>)}
     </TableBody></Table></div>
    </div>; })}
    {hasIndicators && <div className="text-xs text-muted-foreground space-y-1"><p>{L.zeroNote}</p><p>{L.countNote}</p></div>}
    <Button disabled={busy || !hasIndicators || !scopes.length} onClick={analyze}>{busy ? <Loader2 className="h-4 w-4 me-2 animate-spin"/> : <Sparkles className="h-4 w-4 me-2"/>}{L.analyze}</Button>
    {analysis && <div className="space-y-3 border-t pt-5"><h3 className="font-bold">{L.summary}</h3><p className="whitespace-pre-wrap leading-relaxed">{analysis.summary}</p><h3 className="font-bold">{L.proposals} <Badge variant="outline">{L.proposedNote}</Badge></h3><ul className="list-disc ps-6 space-y-2">{analysis.recommendations.map((r,i)=><li key={i}>{r}</li>)}</ul></div>}
   </TabsContent>
   <TabsContent value="plans" className="space-y-5">
    <div className="flex flex-wrap gap-2"><Button disabled={busy || !hasIndicators || !canGenerate} onClick={generate}><Plus className="h-4 w-4 me-2" />{L.generate}</Button><Button variant="outline" onClick={()=>navigate('/recommendations')}>{L.central}</Button></div>
    {scopes.map(p => { const rows = scopeMetrics(data,p.id).rows.filter(r=>r.action || r.needsImprovement); return <div key={p.id ?? 'college'} className="space-y-3"><h3 className="font-semibold">{p.name}</h3>{!rows.length ? <p className="text-muted-foreground">{L.noGaps}</p> : <div className="overflow-auto"><Table><TableHeader><TableRow><TableHead>{L.indicator}</TableHead><TableHead>{L.action}</TableHead><TableHead>{L.owner}</TableHead><TableHead>{L.due}</TableHead><TableHead>{L.evidenceNotes}</TableHead><TableHead>{L.status}</TableHead><TableHead /></TableRow></TableHeader><TableBody>{rows.map(r=><TableRow key={r.indicator.id}><TableCell className="min-w-40">{r.indicator.code} — {r.indicator.name}</TableCell><TableCell className="min-w-48 whitespace-pre-wrap">{r.action?.description ?? '—'}</TableCell><TableCell>{r.action?.responsible_person ?? '—'}</TableCell><TableCell className="whitespace-nowrap">{r.action?.due_date?.slice(0,10) ?? '—'}</TableCell><TableCell className="min-w-40 whitespace-pre-wrap">{r.action?.evidence_notes ?? '—'}</TableCell><TableCell>{r.action ? L[(r.action.status ?? 'pending') as Editor['status']] : L.noPlans}</TableCell><TableCell><Button variant="outline" size="sm" disabled={busy || !canEditScope(roles,p.id)} title={r.action ? L.edit : L.createOne} aria-label={r.action ? L.edit : L.createOne} onClick={()=>edit(r,p.id)}>{r.action ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}</Button></TableCell></TableRow>)}</TableBody></Table></div>}</div>; })}
   </TabsContent>
  </Tabs>
  <Dialog open={Boolean(editor)} onOpenChange={open=>{ if(!open && !busy) setEditor(null); }}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{L.edit}</DialogTitle><DialogDescription>{L.plans} — {year}</DialogDescription></DialogHeader>{editor && <form onSubmit={save} className="space-y-4">
   <div><Label htmlFor="action-title">{L.title}</Label><Input id="action-title" required maxLength={500} value={editor.title} onChange={e=>setEditor({...editor,title:e.target.value})} /></div>
   <div><Label htmlFor="action-description">{L.action}</Label><Textarea id="action-description" required maxLength={10000} value={editor.description} onChange={e=>setEditor({...editor,description:e.target.value})}/></div>
   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><Label htmlFor="action-owner">{L.owner}</Label><Input id="action-owner" value={editor.responsible_person} onChange={e=>setEditor({...editor,responsible_person:e.target.value})} /></div><div><Label htmlFor="action-due">{L.due}</Label><Input id="action-due" type="date" value={editor.due_date} onChange={e=>setEditor({...editor,due_date:e.target.value})}/></div></div>
   <div><Label htmlFor="action-evidence">{L.evidenceNotes}</Label><Textarea id="action-evidence" value={editor.evidence_notes} onChange={e=>setEditor({...editor,evidence_notes:e.target.value})}/></div>
   <div><Label>{L.status}</Label><Select value={editor.status} onValueChange={v=>setEditor({...editor,status:v as Editor['status']})}><SelectTrigger aria-label={L.status}><SelectValue /></SelectTrigger><SelectContent>{(['pending','in_progress','completed','postponed'] as const).map(s=><SelectItem key={s} value={s}>{L[s]}</SelectItem>)}</SelectContent></Select></div>
   <Button type="submit" disabled={busy || !editor.title.trim() || !editor.description.trim()}>{busy && <Loader2 className="h-4 w-4 animate-spin me-2" />}{L.save}</Button>
  </form>}</DialogContent></Dialog>
 </section>;
}
