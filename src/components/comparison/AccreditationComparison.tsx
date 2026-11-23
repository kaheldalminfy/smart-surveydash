import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useAccreditationScope, academicYearOptions } from '@/lib/accreditationScope';
import { loadAccreditationReport, scopeMetrics, type Dataset } from '@/lib/accreditationReport';
import { accreditationLabels } from '@/lib/accreditationLabels';
import { Loader2, RefreshCw } from 'lucide-react';
type Framework = { id: string; name: string; type: 'institutional' | 'programmatic' };
export function AccreditationComparison() {
 const { language } = useLanguage(); const L = accreditationLabels(language); const navigate = useNavigate();
 const [frameworks,setFrameworks] = useState<Framework[]>([]); const [frameworkId,setFrameworkId] = useState(''); const [data,setData] = useState<Dataset | null>(null); const [error,setError] = useState(''); const [loading,setLoading] = useState(true); const [refresh,setRefresh] = useState(0); const [selection,setSelection] = useState<string[]>([]);
 const framework = frameworks.find(f=>f.id === frameworkId); const scope = useAccreditationScope(framework?.type);
 useEffect(()=>{ let cancelled=false; supabase.from('accreditation_frameworks').select('id,name,type').eq('is_active',true).order('name').then(({data,error})=>{ if(cancelled) return; if(error) setError(error.message); else {setFrameworks(data ?? []);setFrameworkId(data?.[0]?.id ?? '');} setLoading(false); });return()=>{cancelled=true;}; },[refresh]);
 useEffect(()=>{setSelection(scope.programs.map(p=>p.id));},[scope.programs]);
 useEffect(()=>{
  if(!frameworkId || !scope.ready) return; let cancelled=false; setLoading(true); setError(''); setData(null);
  loadAccreditationReport(frameworkId,scope.year).then(d=>{if(!cancelled)setData(d);}).catch(e=>{if(!cancelled)setError(e.message);}).finally(()=>{if(!cancelled)setLoading(false);}); return()=>{cancelled=true;};
 },[frameworkId,scope.year,scope.ready,refresh]);
 const programs = framework?.type === 'institutional' ? [{ id:null,name:L.college }] : scope.programs.filter(p=>selection.includes(p.id));
 const metrics = data ? programs.map(p=>({ ...p, ...scopeMetrics(data,p.id) })) : [];
 const chart = data?.standards.map(s=>({ standard:s.code, name:s.name, ...Object.fromEntries(metrics.map((m,i)=>[`p${i}`,m.standards.find(st=>st.id === s.id)?.compliance ?? 0])) })) ?? [];
 const heat = (n:number|null) => n === null ? 'bg-muted text-muted-foreground' : n >=80 ? 'bg-secondary/15 text-secondary' : n>=50 ? 'bg-accent/15 text-accent' : 'bg-destructive/15 text-destructive';
 return <section className="space-y-6" aria-label={L.comparison}>
  <div className="grid gap-4 sm:grid-cols-2"><div><Label>{L.framework}</Label><Select value={frameworkId} onValueChange={setFrameworkId}><SelectTrigger aria-label={L.framework}><SelectValue placeholder={L.selectFramework}/></SelectTrigger><SelectContent>{frameworks.map(f=><SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent></Select></div><div><Label>{L.year}</Label><Select value={scope.year} onValueChange={year=>scope.update({year})}><SelectTrigger aria-label={L.year}><SelectValue/></SelectTrigger><SelectContent>{academicYearOptions().map(y=><SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent></Select></div></div>
  {framework?.type === 'institutional' ? <Badge variant="outline">{L.institutional}</Badge> : <div className="flex flex-wrap gap-4">{scope.programs.map(p=><label key={p.id} className="flex items-center gap-2 text-sm"><Checkbox checked={selection.includes(p.id)} onCheckedChange={checked=>setSelection(prev=>checked ? [...prev,p.id] : prev.filter(id=>id!==p.id))}/>{p.name}</label>)}</div>}
  {error && <div className="text-destructive flex items-center gap-3">{error}<Button variant="outline" onClick={()=>setRefresh(v=>v+1)}><RefreshCw className="h-4 w-4 me-2"/>{L.retry}</Button></div>}
  {loading ? <div className="py-10 flex gap-2"><Loader2 className="h-5 w-5 animate-spin"/>{L.loading}</div> : !frameworks.length ? <p className="py-10 text-muted-foreground">{L.noFrameworks}</p> : !data?.indicators.length ? <p className="py-10 text-muted-foreground">{L.none}</p> : <>
   <div className="space-y-3"><h2 className="text-xl font-bold">{L.matrix}</h2><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>{L.program}</TableHead>{data.standards.map(s=><TableHead key={s.id} className="min-w-36">{s.code} — {s.name}</TableHead>)}<TableHead>{L.compliance}</TableHead></TableRow></TableHeader><TableBody>{metrics.map(m=><TableRow key={m.id ?? 'college'}><TableCell className="font-semibold min-w-40">{m.name}</TableCell>{m.standards.map(s=><TableCell key={s.id} className={heat(s.compliance)}><Button variant="ghost" className="font-semibold w-full" title={`${s.name}: ${s.compliance ?? L.noData}%`} onClick={()=>navigate(`/accreditation/framework/${frameworkId}?year=${scope.year}${m.id ? `&program=${m.id}` : ''}`)}>{s.compliance === null ? '—' : `${s.compliance}%`}</Button></TableCell>)}<TableCell className="font-bold">{m.compliance ?? '—'}%</TableCell></TableRow>)}</TableBody></Table></div><div className="flex gap-4 flex-wrap text-xs"><span className="text-destructive">{L.low}</span><span className="text-accent">{L.partial}</span><span className="text-secondary">{L.strong}</span></div></div>
   {metrics.length > 0 && data.standards.length >= 3 && <div className="space-y-3"><h2 className="text-xl font-bold">{L.radar}</h2><div className="h-[420px] min-w-0" dir="ltr"><ResponsiveContainer width="100%" height="100%"><RadarChart data={chart} outerRadius="65%"><PolarGrid stroke="hsl(var(--border))"/><PolarAngleAxis dataKey="standard" tick={{fill:'hsl(var(--foreground))',fontSize:12}}/><PolarRadiusAxis domain={[0,100]} tick={{fill:'hsl(var(--muted-foreground))'}}/><Tooltip labelFormatter={(_label,payload)=>payload?.[0]?.payload?.name ?? _label} formatter={(v,name)=>[`${v}%`,name]}/><Legend/>{metrics.map((m,i)=><Radar key={m.id ?? 'college'} dataKey={`p${i}`} name={m.name} stroke={`hsl(var(--program-${i%8+1}))`} fill={`hsl(var(--program-${i%8+1}))`} fillOpacity={0.08} isAnimationActive={false}/>)}</RadarChart></ResponsiveContainer></div></div>}
   <div className="space-y-3 border-t pt-6"><h2 className="text-xl font-bold">{L.evidence} / {L.progress}</h2><div className="overflow-auto"><Table><TableHeader><TableRow><TableHead>{L.program}</TableHead><TableHead>{L.assessed}</TableHead><TableHead>{L.evidence}</TableHead><TableHead>{L.missing}</TableHead><TableHead>{L.progress}</TableHead></TableRow></TableHeader><TableBody>{metrics.map(m=><TableRow key={m.id ?? 'college'}><TableCell className="font-medium">{m.name}</TableCell><TableCell>{m.assessed}/{data.indicators.length}</TableCell><TableCell className="min-w-44"><div className="flex gap-3 items-center"><Progress value={m.evidenceCoverage ?? 0} className="w-24 h-2"/><span>{m.evidenceCoverage ?? '—'}%</span></div></TableCell><TableCell>{m.missing}</TableCell><TableCell className="min-w-44"><div className="flex gap-3 items-center"><Progress value={m.planProgress ?? 0} className="w-24 h-2"/><span>{m.planProgress === null ? L.noData : `${m.planProgress}%`} ({m.completedActions}/{m.actionCount})</span></div></TableCell></TableRow>)}</TableBody></Table></div></div>
   <div className="text-xs text-muted-foreground space-y-1"><p>{L.zeroNote}</p><p>{L.countNote}</p></div>
  </>}
 </section>;
}
