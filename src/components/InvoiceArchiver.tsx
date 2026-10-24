import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from 'react';

type ArchivedDocument = {
  id: string;
  name: string;
  size: number;
  kind: string;
  status: 'scanning' | 'archived';
};

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);

function isSupportedDocument(file: File) {
  if (file.size <= 0) return false;
  const extensionType = file.name.toLowerCase().endsWith('.pdf')
    ? 'application/pdf'
    : /\.(jpe?g)$/i.test(file.name)
      ? 'image/jpeg'
      : file.name.toLowerCase().endsWith('.png')
        ? 'image/png'
        : null;
  return extensionType !== null
    && (!file.type || allowedTypes.has(file.type))
    && (!file.type || file.type === extensionType);
}

export function InvoiceArchiver() {
  const [documents, setDocuments] = useState<ArchivedDocument[]>([]);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const pendingIds = documents.filter((document) => document.status === 'scanning').map((document) => document.id);
    if (!pendingIds.length) return undefined;
    const timer = window.setTimeout(() => {
      setDocuments((current) => current.map((document) =>
        pendingIds.includes(document.id) ? { ...document, status: 'archived' } : document,
      ));
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [documents]);

  const addFiles = (fileList: FileList | File[]) => {
    setError('');
    const accepted: ArchivedDocument[] = [];
    for (const file of Array.from(fileList)) {
      if (!isSupportedDocument(file)) {
        setError('اختر ملفات PDF أو PNG أو JPEG فقط.');
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError('الحد الأقصى لحجم المستند التجريبي هو 10 ميغابايت.');
        continue;
      }
      accepted.push({
        id: `${Date.now()}-${accepted.length}-${file.name}`,
        name: file.name.slice(0, 120),
        size: file.size,
        kind: file.type || file.name.split('.').pop()?.toUpperCase() || 'DOCUMENT',
        status: 'scanning',
      });
    }
    if (accepted.length) setDocuments((current) => [...accepted, ...current].slice(0, 5));
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.currentTarget.files) addFiles(event.currentTarget.files);
    event.currentTarget.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  };

  return <Panel className="invoice-archiver">
    <PanelTitle title="أرشفة المستندات والفواتير" subtitle="تحليل محلي تجريبي لبيانات الملف الوصفية فقط" />
    <button
      className={`invoice-dropzone ${dragging ? 'dragging' : ''}`}
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      aria-describedby="archive-disclaimer"
    >
      <span className="invoice-drop-icon" aria-hidden="true">↑</span>
      <strong>اسحب المستند هنا أو اختر ملفاً</strong>
      <small>PDF أو PNG أو JPEG · حتى 10 ميغابايت · لا يتم رفع الملف</small>
    </button>
    <input ref={inputRef} className="visually-hidden" type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" multiple onChange={handleChange} />
    {error && <p className="archive-error" role="alert">{error}</p>}
    <p className="archive-disclaimer" id="archive-disclaimer">محاكاة واجهة فقط: لا تُقرأ محتويات الملفات أو تُرسل إلى خدمة خارجية. لا يوجد OCR أو توزيع محاسبي حقيقي.</p>
    {documents.length > 0 && <div className="archive-list" aria-live="polite">
      {documents.map((document) => <article className="archive-item" key={document.id}>
        <span className="archive-file-type">{document.kind.slice(0, 4)}</span>
        <span className="archive-file-copy"><strong>{document.name}</strong><small>{(document.size / 1024).toFixed(0)} KB · {document.status === 'scanning' ? 'فحص تجريبي للبيانات الوصفية…' : 'أُضيف إلى مصفوفة العرض · بانتظار مراجعة بشرية'}</small></span>
        <span className={`archive-status ${document.status}`} aria-label={document.status === 'scanning' ? 'Scanning simulated' : 'Archived in demo'}>{document.status === 'scanning' ? 'جارٍ' : 'تجريبي'}</span>
      </article>)}
    </div>}
  </Panel>;
}

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{children}</section>;
}

function PanelTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return <div className="panel-title"><div><h2>{title}</h2><p>{subtitle}</p></div></div>;
}
