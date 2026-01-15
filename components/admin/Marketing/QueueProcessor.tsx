import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { MarketingCampaign, CampaignQueueItem } from '../../../types';
import { sendWhatsAppMessage } from '../../../lib/whatsapp';
import { useAuth } from '../../../context/AuthContext';
import { Loader2, Pause, Play, CheckCircle, AlertTriangle } from 'lucide-react';

interface QueueProcessorProps {
    campaign: MarketingCampaign;
    onComplete: () => void;
}

const QueueProcessor: React.FC<QueueProcessorProps> = ({ campaign, onComplete }) => {
    const { user } = useAuth();
    const [isProcessRunning, setIsProcessRunning] = useState(true);
    const [lastProcessed, setLastProcessed] = useState<string | null>(null);
    const [countdown, setCountdown] = useState(0);
    const [stats, setStats] = useState({ sent: 0, failed: 0, pending: 0 });
    
    // Refs for interval management
    const processorRef = useRef<NodeJS.Timeout | null>(null);
    const countdownRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        fetchQueueStats();
        if (isProcessRunning) {
            processNextItem();
        }
        return () => stopProcessor();
    }, [campaign.id]);

    const stopProcessor = () => {
        if (processorRef.current) clearTimeout(processorRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
    };

    const fetchQueueStats = async () => {
        const { count: pending } = await supabase.from('SITE_CampaignQueue').select('*', { count: 'exact', head: true }).eq('campaign_id', campaign.id).eq('status', 'Pending');
        const { count: sent } = await supabase.from('SITE_CampaignQueue').select('*', { count: 'exact', head: true }).eq('campaign_id', campaign.id).eq('status', 'Sent');
        const { count: failed } = await supabase.from('SITE_CampaignQueue').select('*', { count: 'exact', head: true }).eq('campaign_id', campaign.id).eq('status', 'Failed');
        setStats({ sent: sent || 0, failed: failed || 0, pending: pending || 0 });
        
        if (pending === 0 && (sent || 0) + (failed || 0) > 0) {
            // Campaign finished
            await supabase.from('SITE_MarketingCampaigns').update({ status: 'Completed' }).eq('id', campaign.id);
            onComplete();
        }
    };

    const processNextItem = async () => {
        stopProcessor(); // Clear existing

        if (!isProcessRunning) return;

        // 1. Fetch NEXT Pending Item
        const { data: items } = await supabase
            .from('SITE_CampaignQueue')
            .select('*')
            .eq('campaign_id', campaign.id)
            .eq('status', 'Pending')
            .limit(1); // Take 1
        
        const item = items?.[0];

        if (!item) {
            // No more items? Check stats again
            fetchQueueStats();
            return;
        }

        // 2. Send Message
        let success = false;
        let errorMsg = '';

        try {
            // Replace Variables
            let content = campaign.content || '';
            content = content.replace('{{name}}', item.recipient_name || 'Cliente');
            content = content.replace('{{phone}}', item.recipient_phone || '');
            
            if (campaign.channel === 'WhatsApp') {
                // Use user from context
                const result = await sendWhatsAppMessage(item.recipient_phone, content, user?.id);
                if (result.success) success = true;
                else throw new Error(JSON.stringify(result.error));
            } else {
                 // Email Logic (Placeholder)
                 // await sendEmail(...)
                 success = true; // Simulating success for now
            }
        } catch (err: any) {
            errorMsg = err.message;
            success = false;
        }

        // 3. Update Queue Item
        await supabase.from('SITE_CampaignQueue').update({
            status: success ? 'Sent' : 'Failed',
            sent_at: new Date().toISOString(),
            error_message: errorMsg
        }).eq('id', item.id);

        // 4. Update Stats in UI
        setLastProcessed(`${item.recipient_name} (${success ? 'Enviado' : 'Falha'})`);
        fetchQueueStats();

        // 5. Schedule Next with Delay
        const delay = (campaign.throttlingSettings?.delay_seconds || 120) * 1000;
        
        // Start Countdown Timer for UI
        let timeLeft = delay / 1000;
        setCountdown(timeLeft);
        countdownRef.current = setInterval(() => {
            timeLeft -= 1;
            setCountdown(timeLeft);
            if (timeLeft <= 0 && countdownRef.current) clearInterval(countdownRef.current);
        }, 1000);

        // Schedule next execution
        processorRef.current = setTimeout(() => {
            processNextItem();
        }, delay);
    };

    const togglePause = () => {
        setIsProcessRunning(!isProcessRunning);
        if (!isProcessRunning) {
            processNextItem(); // Resume
        } else {
            stopProcessor(); // Pause
        }
    };

    return (
        <div className="bg-white border-l-4 border-purple-600 shadow-lg rounded-r-lg p-4 mb-6 animate-in slide-in-from-top-2">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="relative">
                         <Loader2 className={`text-purple-600 ${isProcessRunning ? 'animate-spin' : ''}`} size={24} />
                         {isProcessRunning && <span className="absolute -top-1 -right-1 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span></span>}
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800 flex items-center gap-2">
                            Enviando Campanha: {campaign.name}
                        </h4>
                        <div className="text-xs text-gray-500 flex gap-4 mt-1">
                             <span className="text-green-600 font-bold">{stats.sent} Enviados</span>
                             <span className="text-red-500 font-bold">{stats.failed} Falhas</span>
                             <span className="text-blue-500 font-bold">{stats.pending} Pendentes</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* Countdown */}
                    {isProcessRunning && countdown > 0 && (
                        <div className="text-center">
                            <span className="text-2xl font-black text-gray-200">{countdown}s</span>
                            <p className="text-[10px] text-gray-400 uppercase">Próximo envio</p>
                        </div>
                    )}

                    {/* Controls */}
                    <div className="flex items-center gap-2">
                        <button onClick={togglePause} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full">
                            {isProcessRunning ? <Pause size={20} /> : <Play size={20} />}
                        </button>
                    </div>
                </div>
            </div>

            {lastProcessed && (
                <div className="mt-2 bg-gray-50 p-2 rounded text-xs text-gray-500 flex items-center gap-2">
                    <CheckCircle size={12} className="text-gray-400" />
                    Último processamento: <strong>{lastProcessed}</strong>
                </div>
            )}
            
            <div className="mt-2 text-[10px] text-red-400 bg-red-50 p-1 rounded text-center">
                 ⚠️ Mantenha esta aba aberta e o computador ligado até o fim do processo.
            </div>
        </div>
    );
};

export default QueueProcessor;
