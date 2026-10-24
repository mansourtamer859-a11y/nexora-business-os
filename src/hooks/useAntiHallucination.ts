import { useCallback, useState } from 'react';

const approvedRequests = new Map([
  ['Generate quarter sales report', 'تم تجهيز تقرير المبيعات التجريبي من البيانات المحلية المحددة.'],
  ['Audit payroll operations', 'اكتملت مراجعة بيانات الرواتب التجريبية المحددة.'],
  ['Show low-stock inventory', 'تمت مراجعة عناصر المخزون التجريبية ومؤشرات حدّ إعادة الطلب.'],
  ['Summarize this week’s cash flow', 'تم إعداد ملخص التدفق النقدي التجريبي للفترة المحددة.'],
  ['Review synced leads', 'تمت مراجعة العملاء المحتملين التجريبيين في مسار CRM.'],
]);

const spokenCommands = new Map([
  ['generate quarter sales report', 'Generate quarter sales report'],
  ['audit payroll operations', 'Audit payroll operations'],
  ['show low stock inventory', 'Show low-stock inventory'],
  ['show low-stock inventory', 'Show low-stock inventory'],
  ['summarize this weeks cash flow', 'Summarize this week’s cash flow'],
  ['review synced leads', 'Review synced leads'],
  ['إنشاء تقرير المبيعات', 'Generate quarter sales report'],
  ['مراجعة عمليات الرواتب', 'Audit payroll operations'],
  ['مراجعة المخزون المنخفض', 'Show low-stock inventory'],
  ['تلخيص التدفق النقدي لهذا الأسبوع', 'Summarize this week’s cash flow'],
  ['مراجعة العملاء المحتملين', 'Review synced leads'],
]);

const explanationSteps = [
  'تحليل الطلب ومطابقته مع الإجراءات المسموح بها',
  'التحقق من نطاق البيانات التجريبية المحلية',
  'تنفيذ إجراء واجهة محدد مسبقاً دون توليد بيانات جديدة',
  'عرض النتيجة مع توضيح أنها محاكاة',
];

export type AssistantDecision = {
  approved: boolean;
  response: string;
  steps: string[];
  status: 'checking' | 'complete' | 'rejected';
};

export function resolveTrustedAssistantRequest(request: string): Omit<AssistantDecision, 'status'> | null {
  const response = approvedRequests.get(request);
  if (!response) return null;

  return {
    approved: true,
    response,
    steps: explanationSteps,
  };
}

export function resolveSpokenCommand(transcript: string): string | null {
  const normalized = transcript
    .normalize('NFC')
    .trim()
    .replace(/[.!?؟،,]+$/u, '')
    .replace(/\s+/gu, ' ')
    .toLocaleLowerCase('en');
  return spokenCommands.get(normalized) ?? null;
}

export function useAntiHallucination() {
  const [decision, setDecision] = useState<AssistantDecision | null>(null);

  const beginRequest = useCallback((request: string) => {
    const trusted = resolveTrustedAssistantRequest(request);
    const result: AssistantDecision = trusted
      ? { ...trusted, status: 'checking' }
      : {
      approved: false,
      response: 'لم يتم تنفيذ الطلب: هذا النموذج ينفذ الإجراءات التجريبية المعتمدة فقط.',
      steps: ['رفض الطلب غير المدرج في قائمة الإجراءات التجريبية المسموح بها'],
      status: 'rejected',
    };
    setDecision(result);
    return result;
  }, []);

  const completeRequest = useCallback((request: string) => {
    const trusted = resolveTrustedAssistantRequest(request);
    const result: AssistantDecision = trusted
      ? { ...trusted, status: 'complete' }
      : {
        approved: false,
        response: 'لم يتم تنفيذ الطلب: هذا النموذج ينفذ الإجراءات التجريبية المعتمدة فقط.',
        steps: ['رفض الطلب غير المدرج في قائمة الإجراءات التجريبية المسموح بها'],
        status: 'rejected',
      };
    setDecision(result);
    return result;
  }, []);

  const cancelRequest = useCallback(() => {
    setDecision({
      approved: false,
      response: 'تم إيقاف الاستماع قبل تنفيذ أي إجراء.',
      steps: ['إلغاء المحاكاة قبل التنفيذ'],
      status: 'rejected',
    });
  }, []);

  return { decision, beginRequest, completeRequest, cancelRequest };
}
