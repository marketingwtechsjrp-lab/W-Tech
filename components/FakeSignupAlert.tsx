import React, { useState, useEffect } from 'react';
import { User, MapPin, CheckCircle } from 'lucide-react';

interface FakeSignupAlertProps {
    courseName?: string;
}

const names = [
    'Daniel Marques', 'Ricardo Silva', 'Marcos Santos', 'Felipe Souza', 'Bruno Ferreira', 
    'Rodrigo Alves', 'Gustavo Pereira', 'Marcelo Vieira', 'Thiago Barbosa', 'André Ribeiro', 
    'Vinícius Santos', 'Gabriel Jesus', 'Lucas Moura', 'Rafael Cabral', 'Eduardo Paes', 
    'Mateus Solano', 'Paulo Andrade', 'Fernando Henrique', 'Cláudio Ferreira', 'José Souza',
    'Antônio Carlos', 'João Pedro', 'Carlos Alberto', 'Luís Eduardo', 'Marcos Paulo',
    'Sebastião Silva', 'Ronaldo Junior', 'Sérgio Santos', 'Márcio Oliveira', 'Roberto Carlos'
];

const cities = [
    'São José dos Campos - SP', 'São Paulo - SP', 'Rio de Janeiro - RJ', 'Curitiba - PR', 'Belo Horizonte - MG',
    'Porto Alegre - RS', 'Salvador - BA', 'Fortaleza - CE', 'Brasília - DF', 'Campinas - SP',
    'Goiânia - GO', 'Manaus - AM', 'Recife - PE', 'Belém - PA', 'Florianópolis - SC',
    'Vitória - ES', 'Natal - RN', 'Campo Grande - MS', 'Cuiabá - MT', 'João Pessoa - PB',
    'Aracaju - SE', 'Teresina - PI', 'Maceió - AL', 'São Luís - MA', 'Porto Velho - RO',
    'Rio Branco - AC', 'Macapá - AP', 'Boa Vista - RR', 'Palmas - TO', 'Ribeirão Preto - SP'
];

export const FakeSignupAlert: React.FC<FakeSignupAlertProps> = ({ courseName = 'este curso' }) => {
    const [visible, setVisible] = useState(false);
    const [currentData, setCurrentData] = useState({ name: '', city: '' });

    useEffect(() => {
        let timer: NodeJS.Timeout;

        const scheduleNext = () => {
            const delay = Math.floor(Math.random() * 5000) + 10000; // 10-15 seconds
            timer = setTimeout(() => {
                showRandomAlert();
                scheduleNext();
            }, delay);
        };

        const showRandomAlert = () => {
            const randomName = names[Math.floor(Math.random() * names.length)];
            const randomCity = cities[Math.floor(Math.random() * cities.length)];
            
            setCurrentData({ name: randomName, city: randomCity });
            setVisible(true);

            // Hide after 6 seconds
            setTimeout(() => {
                setVisible(false);
            }, 6000);
        };

        // First alert after 5 seconds
        const initialTimer = setTimeout(() => {
            showRandomAlert();
            scheduleNext();
        }, 5000);

        return () => {
            clearTimeout(initialTimer);
            clearTimeout(timer);
        };
    }, []);

    if (!visible) return null;

    return (
        <div className="fixed bottom-6 left-6 z-[60] animate-fade-in-up">
            <div className="bg-black/80 backdrop-blur-xl border border-wtech-gold/30 p-4 rounded-xl shadow-2xl flex items-center gap-4 max-w-sm">
                <div className="w-12 h-12 bg-wtech-gold/10 text-wtech-gold rounded-full flex items-center justify-center shrink-0">
                    <User size={24} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-bold text-white text-sm truncate">{currentData.name}</p>
                        <CheckCircle size={14} className="text-blue-400 fill-blue-400/10 shrink-0" />
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
                        <MapPin size={10} />
                        <span className="truncate">{currentData.city}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                        Se inscreveu para <span className="text-wtech-gold">{courseName}</span>
                    </p>
                </div>
                {/* Micro animation for "Just Now" */}
                <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-green-500/10 px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-green-500 tracking-tighter">
                    <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></span>
                    Agora mesmo
                </div>
            </div>
        </div>
    );
};
