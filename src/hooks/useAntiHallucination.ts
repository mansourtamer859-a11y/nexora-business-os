import { useCallback, useState } from 'react';

const approvedRequests = new Map([
  ['Generate quarter sales report', 'تم تجهيز تقرير المبيعات التجريبي من البيانات المحلية المحددة.'],
  ['Audit payroll operations', 'اكتملت مراجعة بيانات الرواتب التجريبية المحددة.'],
  ['Show low-stock inventory', 'تمت مراجعة عناصر المخزون التجريبية ومؤشرات حدّ إعادة الطلب.'],
  ['Summarize this week’s cash flow', 'تم إعداد ملخص التدفق النقدي التجريبي للفترة المحددة.'],
  ['Review synced leads', 'تمت مراجعة العملاء المحتملين التجريبيين في مسار CRM.'],
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
