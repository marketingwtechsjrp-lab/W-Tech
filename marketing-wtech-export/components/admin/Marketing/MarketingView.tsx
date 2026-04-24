import React, { useState, useEffect } from 'react';
import { 
    BarChart2, BookOpen, Layout, Fingerprint, Award, Rocket
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

// Imports for Integrated Marketing Center
import BlogManagerView from '../Blog/BlogManagerView';
import AnalyticsView from '../Analytics/AnalyticsView';
import CertificateManagerView from '../Certificates/CertificateManagerView';
import LandingPagesView from './LandingPagesView';
import BioPageManager from './BioPageManager';

const MarketingView = ({ permissions }: { permissions?: any }) => {
    const { user } = useAuth();
    
    // Permission check helper
    const hasPerm = (key: string) => {
        if (!permissions) return true; 
        if (permissions.admin_access) return true;
        // Permissive check for marketing view entry point
        if (key === 'marketing_general') {
            return permissions.blog_view || permissions.landing_pages_view || permissions.analytics_view || permissions.certificates_view || permissions.marketing_view;
        }
        return !!permissions[key] || !!permissions['manage_marketing']; 
    };

    const tabs = [
        { id: 'Blog', icon: BookOpen, label: 'Blog', permission: 'blog_view' },
        { id: 'LP', icon: Layout, label: 'Landing Pages', permission: 'landing_pages_view' },
        { id: 'Bio', icon: Fingerprint, label: 'Bio Link', permission: 'marketing_view' },
        { id: 'Analytics', icon: BarChart2, label: 'Analytics', permission: 'analytics_view' },
        { id: 'Certificates', icon: Award, label: 'Certificados', permission: 'certificates_view' },
    ].filter(tab => hasPerm(tab.permission));

    const [activeTab, setActiveTab] = useState<string>(
        tabs.length > 0 ? tabs[0].id : ''
    );

    useEffect(() => {
        if (tabs.length > 0 && (!activeTab || !tabs.find(t => t.id === activeTab))) {
            setActiveTab(tabs[0].id);
        }
    }, [permissions, tabs]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {/* Header */}
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 dark:border-gray-800 pb-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                        <Rocket className="text-wtech-gold" /> Marketing
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Gestão de conteúdo, páginas, links e análise de dados.</p>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex bg-white dark:bg-[#1A1A1A] p-1 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 w-full overflow-x-auto custom-scrollbar">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                            activeTab === tab.id 
                            ? 'bg-black text-white shadow-lg dark:bg-white dark:text-black' 
                            : 'text-gray-500 hover:bg-gray-50 hover:text-black dark:text-gray-400 dark:hover:bg-[#333] dark:hover:text-white'
                        }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className={`bg-white dark:bg-[#1A1A1A] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm min-h-[600px] ${['Analytics', 'Certificates', 'Blog', 'LP', 'Bio'].includes(activeTab) ? '' : 'p-6'}`}>
                {activeTab === 'Blog' && <BlogManagerView permissions={permissions} />}
                {activeTab === 'LP' && <LandingPagesView permissions={permissions} />}
                {activeTab === 'Bio' && <BioPageManager />}
                {activeTab === 'Analytics' && <AnalyticsView permissions={permissions} />}
                {activeTab === 'Certificates' && <CertificateManagerView />}
                
                {tabs.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-[400px] text-gray-500">
                        <Rocket size={48} className="mb-4 opacity-20" />
                        <p>Você não possui permissões para acessar os módulos de marketing.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MarketingView;
