
import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';
import { loadFaceApiModels, getFaceDescriptor, createFaceMatcher } from '../lib/faceRecognition';
import { Loader2, X, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface FaceLoginProps {
    onMatch: (userId: string) => void;
    onCancel: () => void;
}

const FaceLogin: React.FC<FaceLoginProps> = ({ onMatch, onCancel }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isModelsLoaded, setIsModelsLoaded] = useState(false);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const [status, setStatus] = useState("Iniciando...");
    const [faceMatcher, setFaceMatcher] = useState<faceapi.FaceMatcher | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    // Initialization
    useEffect(() => {
        const init = async () => {
            setStatus("Carregando Modelos...");
            const modelsLoaded = await loadFaceApiModels();
            if (!modelsLoaded) {
                setStatus("Erro ao carregar IA.");
                return;
            }
            setIsModelsLoaded(true);

            setStatus("Buscando dados faciais...");
            const { data: users, error } = await supabase
                .from('SITE_Users')
                .select('id, face_descriptor')
                .not('face_descriptor', 'is', null);
            
            if (error || !users || users.length === 0) {
                setStatus("Nenhum registro facial encontrado no sistema.");
                setIsLoadingUsers(false);
                return;
            }

            // Create Matcher
            const matcher = createFaceMatcher(users);
            setFaceMatcher(matcher);
            setIsLoadingUsers(false);
            
            if (matcher) {
                setStatus("Posicione seu rosto...");
                startVideo();
            } else {
                setStatus("Erro ao processar dados faciais.");
            }
        };

        init();
        return () => stopVideo();
    }, []);

    const startVideo = () => {
        navigator.mediaDevices
            .getUserMedia({ video: { width: 300 } })
            .then((s) => {
                setStream(s);
                if (videoRef.current) {
                    videoRef.current.srcObject = s;
                }
                startDetectionLoop();
            })
            .catch(() => setStatus("Erro ao acessar câmera."));
    };

    const stopVideo = () => {
        if (stream) {
            stream.getTracks().forEach(t => t.stop());
            setStream(null);
        }
    };

    const startDetectionLoop = async () => {
        if (!videoRef.current) return;

        const interval = setInterval(async () => {
            if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;

            try {
                const descriptor = await getFaceDescriptor(videoRef.current);
                if (descriptor && faceMatcher) {
                    const bestMatch = faceMatcher.findBestMatch(descriptor);
                    
                    if (bestMatch.label !== 'unknown' && bestMatch.distance < 0.5) { // Strict threshold
                        clearInterval(interval);
                        stopVideo();
                        onMatch(bestMatch.label);
                    }
                }
            } catch (e) {
                // Ignore transient errors
            }
        }, 1000); // Check every second

        // Cleanup interval on unmount handled by stopping video ideally, but here we depend on component unmount
        return () => clearInterval(interval);
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-sm mx-auto text-center border border-gray-200">
            <h3 className="font-bold text-lg mb-4 text-gray-800">Login Facial</h3>

            <div className="relative w-full aspect-square bg-black rounded-lg overflow-hidden mb-4 border-2 border-dashed border-gray-300">
                {isModelsLoaded && !isLoadingUsers && faceMatcher ? (
                     <video 
                        ref={videoRef} 
                        autoPlay 
                        muted 
                        className="w-full h-full object-cover transform -scale-x-100"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-white/50">
                        <Loader2 className="animate-spin mb-2" />
                        <span className="text-xs">{status}</span>
                    </div>
                )}
                 {/* Face Overlay Guide */}
                 <div className="absolute inset-0 border-4 border-white/30 rounded-full m-8 pointer-events-none"></div>
            </div>

            <p className="text-xs font-bold text-gray-500 mb-4 animate-pulse uppercase">{status}</p>

            <button onClick={onCancel} className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200">
                Cancelar
            </button>
        </div>
    );
};

export default FaceLogin;
