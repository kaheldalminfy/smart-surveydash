import { supabase } from '@/integrations/supabase/client';
export { scopeRows, scopeMetrics, evidenceRequirements } from '../../supabase/functions/_shared/accreditation-metrics';
export type { Dataset, ReportRow, Action } from '../../supabase/functions/_shared/accreditation-metrics';
import type { Dataset } from '../../supabase/functions/_shared/accreditation-metrics';

export async function loadAccreditationReport(frameworkId: string, year: string): Promise<Dataset> {
  const standardsResult = await supabase.from('accreditation_standards').select('id,code,name').eq('framework_id', frameworkId).order('order_index');
  if (standardsResult.error) throw standardsResult.error;
  const standards = standardsResult.data ?? [];
  if (!standards.length) return { standards, indicators: [], assessments: [], evidence: [], actions: [] };
  const indicatorsResult = await supabase.from('accreditation_indicators').select('id,standard_id,code,name,required_evidence,responsible_party').in('standard_id', standards.map(s => s.id)).order('order_index');
  if (indicatorsResult.error) throw indicatorsResult.error;
  const indicators = indicatorsResult.data ?? [];
  if (!indicators.length) return { standards, indicators, assessments: [], evidence: [], actions: [] };
  const ids = indicators.map(i => i.id);
  const [responses, actions] = await Promise.all([
    supabase.from('indicator_responses').select('id,indicator_id,program_id,academic_year,compliance_percentage,status,responsible_person,due_date,follow_up_notes,gaps').in('indicator_id', ids).eq('academic_year', year),
    supabase.from('recommendations').select('id,accreditation_indicator_id,program_id,academic_year,title,description,status,responsible_person,due_date,evidence_notes').eq('source_type', 'accreditation').in('accreditation_indicator_id', ids).eq('academic_year', year),
  ]);
  if (responses.error) throw responses.error;
  if (actions.error) throw actions.error;
  const assessments = responses.data ?? [];
  const evidenceResult = assessments.length ? await supabase.from('indicator_evidence').select('id,response_id,title,file_url').in('response_id', assessments.map(r => r.id)) : { data: [], error: null };
  if (evidenceResult.error) throw evidenceResult.error;
  return { standards, indicators, assessments, evidence: evidenceResult.data ?? [], actions: actions.data ?? [] };
}
