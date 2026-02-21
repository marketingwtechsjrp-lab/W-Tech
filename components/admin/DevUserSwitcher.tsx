
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Users, User as UserIcon, X, Shield, RefreshCw } from 'lucide-react';

const DevUserSwitcher = ({ onClose }: { onClose?: () => void }) => {
    const { user, impersonateUser } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(true);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        // Select * to ensure we get all fields including role_id
        const { data, error } = await supabase
            .from('SITE_Users')
            .select('*');
        
        if (error) {
            console.error("DevUserSwitcher Error:", error);
            setUsers([]);
        } else if (data) {
            // Sort: Current User first, then Admins, then others
            const sorted = data.sort((a, b) => {
                 if (a.id === user?.id) return -1;
                 if (b.id === user?.id) return 1;
                 return 0;
            });
            setUsers(sorted);
        }
        setLoading(false);
    };

    const handleSwitch = async (targetUser: any) => {
        // Construct a User object compatible with AuthContext
        let roleData = null;
        if (targetUser.role_id) {
             const { data: rData } = await supabase
                 .from('SITE_Roles')
                 .select('*')
                 .eq('id', targetUser.role_id)
                 .single();
             roleData = rData;
        }

        const newUserObj = {
            id: targetUser.id,
            name: targetUser.full_name || targetUser.name,
            email: targetUser.email,
            role: roleData || targetUser.role || 'User',
            avatar: targetUser.avatar,
            permissions: targetUser.permissions || (roleData?.permissions) || {},
            status: targetUser.status
        };

        impersonateUser(newUserObj);
    };

    if (!isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 left-4 z-[9999] bg-red-600 text-white p-3 rounded-full shadow-lg hover:bg-red-700 transition-colors border-2 border-white/20"
                title="Abrir Super Admin"
            >
                <Shield size={20} />
            </button>
        );
    }

    return (
        <div className="fixed bottom-4 left-4 z-[9999] w-72 bg-gray-900 border border-gray-700 shadow-2xl rounded-xl overflow-hidden font-sans text-gray-100 flex flex-col max-h-[500px]">
            {/* Header */}
            <div className="bg-red-600 px-4 py-3 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2">
                    <Shield size={16} className="text-white" />
                    <span className="text-xs font-black uppercase tracking-wider text-white">Super Admin</span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchUsers} className="text-white/80 hover:text-white"><RefreshCw size={14} /></button>
                    <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white"><X size={16} /></button>
                </div>
            </div>

            {/* Current User Info */}
            <div className="bg-gray-800 p-3 border-b border-gray-700">
                <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Logado como:</p>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden border border-gray-600">
                        {user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : <UserIcon size={16} />}
                    </div>
                    <div className="truncate">
                        <div className="text-sm font-bold text-white truncate">{user?.name}</div>
                        <div className="text-xs text-blue-400 font-mono">
                            {typeof user?.role === 'string' ? user.role : (user?.role as any)?.name}
                        </div>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto p-2 space-y-1 custom-scrollbar flex-1 bg-black/20">
                {loading ? (
                    <div className="text-center p-4 text-xs text-gray-500">Carregando usuários...</div>
                ) : (
                    users.map(u => {
                        const isCurrent = u.id === user?.id;
                        const roleName = typeof u.role === 'string' ? u.role : 'User'; // Or parse JSON if needed
                        
                        return (
                            <button
                                key={u.id}
                                onClick={() => handleSwitch(u)}
                                disabled={isCurrent}
                                className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all text-left ${
                                    isCurrent 
                                    ? 'bg-green-900/20 border border-green-900/50 opacity-50 cursor-default' 
                                    : 'hover:bg-gray-800 border border-transparent hover:border-gray-700'
                                }`}
                            >
                                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-400">
                                    {u.avatar ? <img src={u.avatar} className="w-full h-full rounded-full object-cover" /> : u.full_name?.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                    <div className={`text-xs font-bold truncate ${isCurrent ? 'text-green-500' : 'text-gray-200'}`}>
                                        {u.full_name} {isCurrent && '(Você)'}
                                    </div>
                                    <div className="text-[10px] text-gray-500 truncate">{roleName}</div>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
            
            <div className="p-2 bg-gray-800 border-t border-gray-700 text-center">
                 <p className="text-[10px] text-gray-500">Troca instantânea de contexto (Frontend)</p>
            </div>
        </div>
    );
};

export default DevUserSwitcher;
