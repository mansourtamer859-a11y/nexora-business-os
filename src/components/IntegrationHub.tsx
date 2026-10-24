import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocale } from '../i18n/useLocale';

type Channel = {
  id: string;
  name: string;
  initials: string;
  description: string;
  color: string;
};

const channels: Channel[] = [
  { id: 'whatsapp', name: 'WhatsApp', initials: 'WA', description: 'رسائل العملاء والمحادثات', color: 'whatsapp' },
  { id: 'messenger', name: 'Messenger', initials: 'M', description: 'رسائل Facebook Messenger', color: 'messenger' },
  { id: 'instagram', name: 'Instagram', initials: 'IG', description: 'الرسائل والتعليقات الواردة', color: 'instagram' },
  { id: 'tiktok', name: 'TikTok', initials: '♪', description: 'استفسارات العملاء المحتملين', color: 'tiktok' },
];

function HubIcon({ children }: { children: ReactNode }) {
  return <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
}

export function IntegrationHub({ onSyncLead }: { onSyncLead: (channelName: string) => void }) {
  const { t, locale, direction } = useLocale();
  const [connected, setConnected] = useState<Record<string, boolean>>({
    whatsapp: true,
    messenger: true,
    instagram: false,
    tiktok: false,
  });
  const [parsedMessages, setParsedMessages] = useState(128);
  const [answeredInquiries, setAnsweredInquiries] = useState(96);
  const [syncedLeads, setSyncedLeads] = useState(24);

  const activeCount = channels.filter((channel) => connected[channel.id]).length;

  useEffect(() => {
    if (activeCount === 0) return undefined;
    const timer = window.setInterval(() => {
      setParsedMessages((count) => count + activeCount);
      setAnsweredInquiries((count) => count + Math.max(1, Math.floor(activeCount / 2)));
    }, 7000);
    return () => window.clearInterval(timer);
  }, [activeCount]);

  const syncLead = (channel: Channel) => {
    onSyncLead(channel.name);
    setSyncedLeads((count) => count + 1);
  };

  return <div className="integration-page" dir={direction} lang={locale}>
    <header className="integration-heading">
      <div>
        <p className="eyebrow">{t('NEXUS · DEMO CONNECTORS')}</p>
        <h1>{t('الربط الذكي الموحد وقنوات الذكاء الاصطناعي')}</h1>
        <p className="integration-description">{t('إدارة قنوات التواصل ومزامنة العملاء المحتملين ضمن مساحة عملك.')}</p>
      </div>
      <span className="simulation-badge"><i />{t('محاكاة محلية · لا توجد حسابات خارجية مرتبطة')}</span>
    </header>

    <section className="integration-metrics" aria-label={t('إحصاءات محاكاة القنوات')}>
      <article className="integration-metric"><span className="integration-metric-icon"><HubIcon><path d="M12 3v18m9-9H3" /></HubIcon></span><span><small>{t('القنوات النشطة تجريبياً')}</small><strong>{activeCount} <i>/ 4</i></strong></span></article>
      <article className="integration-metric"><span className="integration-metric-icon blue"><HubIcon><path d="M4 5h16v12H8l-4 4V5Z" /><path d="M8 9h8m-8 4h5" /></HubIcon></span><span><small>{t('رسائل تم تحليلها تجريبياً')}</small><strong>{parsedMessages.toLocaleString(locale)}</strong></span></article>
      <article className="integration-metric"><span className="integration-metric-icon violet"><HubIcon><path d="M4 12a8 8 0 0 1 14-5l2 2" /><path d="M20 4v5h-5M20 12a8 8 0 0 1-14 5l-2-2" /><path d="M4 20v-5h5" /></HubIcon></span><span><small>{t('استفسارات تم الرد عليها')}</small><strong>{answeredInquiries.toLocaleString(locale)}</strong></span></article>
      <article className="integration-metric"><span className="integration-metric-icon amber"><HubIcon><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 8v6m3-3h-6" /></HubIcon></span><span><small>{t('عملاء محتملون للمزامنة')}</small><strong>{syncedLeads}</strong></span></article>
    </section>

    <section className="integration-callout">
      <span className="integration-ai-mark"><HubIcon><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 14 .8 2.2L22 17l-2.2.8L19 20l-.8-2.2L15 17l2.2-.8L19 14Z" /></HubIcon></span>
      <div><strong>{t('مساعد Nexus · معالجة تجريبية')}</strong><p>{t('محاكاة تحليل الرسائل الواردة، إعداد الردود، وربط بيانات العملاء بوحدة إدارة علاقات العملاء.')}</p></div>
      <span className="simulation-running"><i />{t('تحديث تجريبي')}</span>
    </section>

    <section className="channel-grid" aria-label={t('قنوات التواصل الاجتماعي')}>
      {channels.map((channel) => {
        const isConnected = Boolean(connected[channel.id]);
        return <article className="channel-card" key={channel.id}>
          <div className="channel-card-top">
            <span className={`channel-brand ${channel.color}`}>{channel.initials}</span>
            <span className={`channel-state ${isConnected ? 'active' : ''}`}><i />{t(isConnected ? 'نشط تجريبياً' : 'غير مربوط')}</span>
          </div>
          <h2>{channel.name}</h2>
          <p>{t(channel.description)}</p>
          <div className="channel-activity"><span><i className={isConnected ? 'activity-active' : ''} />{t('تحليل الرسائل')}</span><span>{t(isConnected ? 'محاكاة' : 'متوقف')}</span></div>
          <div className="channel-activity"><span><i className={isConnected ? 'activity-active' : ''} />{t('إجابات المساعد')}</span><span>{t(isConnected ? 'محاكاة' : 'متوقف')}</span></div>
          <div className="channel-actions">
            <button className={`channel-toggle ${isConnected ? 'enabled' : ''}`} role="switch" aria-checked={isConnected} aria-label={`${t(isConnected ? 'إيقاف' : 'تفعيل')} ${t('محاكاة')} ${channel.name}`} onClick={() => setConnected((current) => ({ ...current, [channel.id]: !current[channel.id] }))}><i /></button>
            <button className="channel-sync" disabled={!isConnected} onClick={() => syncLead(channel)}>{t('مزامنة عميل تجريبي')}</button>
          </div>
        </article>;
      })}
    </section>
    <p className="integration-footnote">{t('هذه الواجهة تعرض بيانات محاكاة محلية فقط. يلزم إعداد واجهات API ومفاتيح موفر الخدمة على الخادم قبل استقبال أي رسائل حقيقية.')}</p>
  </div>;
}
