import React, { useState } from 'react';
import { MessageCircle, Bot, BarChart3 } from 'lucide-react';
import WhatsAppCloudInbox from './CloudInbox/WhatsAppCloudInbox';
import AITrainingView from './AITrainingView';
import AIAnalyticsView from './AIAnalyticsView';

type Tab = 'inbox' | 'ai' | 'analytics';

interface Props {
  /** Permissões resolvidas para esconder abas/recursos (opcional). */
  canTrainAI?: boolean;
  canViewMetrics?: boolean;
  /** Ver todas as conversas; senão, só as atribuídas ao próprio usuário. */
  canViewAll?: boolean;
}

const WhatsAppModule: React.FC<Props> = ({ canTrainAI = true, canViewMetrics = true, canViewAll = true }) => {
  const [tab, setTab] = useState<Tab>('inbox');

  const tabs: { id: Tab; label: string; Icon: React.ElementType; show: boolean }[] = [
    { id: 'inbox', label: 'Conversas', Icon: MessageCircle, show: true },
    { id: 'ai', label: 'IA de Atendimento', Icon: Bot, show: canTrainAI },
    { id: 'analytics', label: 'Métricas', Icon: BarChart3, show: canViewMetrics },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Abas do módulo */}
      <div className="flex items-center gap-1 mb-3 shrink-0">
        {tabs.filter((t) => t.show).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              tab === t.id
                ? 'bg-[#25D366] text-white'
                : 'bg-[var(--admin-surface-2)] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-3)]'
            }`}
          >
            <t.Icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {tab === 'inbox' && <WhatsAppCloudInbox canViewAll={canViewAll} />}
        {tab === 'ai' && canTrainAI && <AITrainingView />}
        {tab === 'analytics' && canViewMetrics && <AIAnalyticsView />}
      </div>
    </div>
  );
};

export default WhatsAppModule;
