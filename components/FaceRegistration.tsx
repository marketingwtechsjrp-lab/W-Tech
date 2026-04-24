
import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';
import { loadFaceApiModels, getFaceDescriptor } from '../lib/faceRecognition';
import { Camera, Check, Loader2, X, RefreshCw } from 'lucide-react';

interface FaceRegistrationProps {
    onCapture: (descriptor: number[]) => void;
    onCancel: () => void;
}

const FaceRegistration: React.FC<FaceRegistrationProps> = ({ onCapture, onCancel }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isModelsLoaded, setIsModelsLoaded] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [detectionError, setDetectionError] = useState<string | null>(null);
    const [capturedDescriptor, setCapturedDescriptor] = useState<Float32Array | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    useEffect(() => {
        const init = async () => {
            const loaded = await loadFaceApiModels();
            setIsModelsLoaded(loaded);
            if (loaded) {
                startVideo();
            }
        };
        init();

        return () => {
            stopVideo();
        };
    }, []);

    const startVideo = () => {
        navigator.mediaDevices
            .getUserMedia({ video: { width: 300 } })
            .then((s) => {
                setStream(s);
                if (videoRef.current) {
                    videoRef.current.srcObject = s;
                }
            })
            .catch((err) => {
                console.error("Camera Error:", err);
                setDetectionError("Erro ao acessar câmera.");
            });
    };

    const stopVideo = () => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
        }
    };

    const handleCapture = async () => {
        if (!videoRef.current || !isModelsLoaded) return;

        setIsScanning(true);
        setDetectionError(null);

        try {
            const descriptor = await getFaceDescriptor(videoRef.current);
            if (descriptor) {
                setCapturedDescriptor(descriptor);
                stopVideo();
            } else {
                setDetectionError("Rosto não detectado. Tente novamente com boa iluminação.");
            }
        } catch (error) {
            console.error(error);
            setDetectionError("Erro no processamento.");
        } finally {
            setIsScanning(false);
        }
    };

    const handleConfirm = () => {
        if (capturedDescriptor) {
            onCapture(Array.from(capturedDescriptor));
        }
    };

    const handleRetake = () => {
        setCapturedDescriptor(null);
        startVideo();
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-sm mx-auto text-center border border-gray-200">
            <h3 className="font-bold text-lg mb-4 text-gray-800">Cadastro Facial</h3>

            {!isModelsLoaded ? (
                <div className="py-8 flex flex-col items-center gap-2">
                    <Loader2 className="animate-spin text-wtech-gold" size={32} />
                    <p className="text-sm text-gray-500">Carregando IA...</p>
                </div>
            ) : (
                <div className="relative w-full aspect-square bg-black rounded-lg overflow-hidden mb-4 border-2 border-dashed border-gray-300">
                    {!capturedDescriptor ? (
                        <>
                            <video 
                                ref={videoRef} 
                                autoPlay 
                                muted 
                                className="w-full h-full object-cover transform -scale-x-100"
                            />
                            {/* Face Overlay Guide */}
                            <div className="absolute inset-0 border-4 border-white/30 rounded-full m-8 pointer-events-none"></div>
                        </>
                    ) : (
                         <div className="w-full h-full flex items-center justify-center bg-green-50">
                            <Check size={48} className="text-green-500" />
                            <p className="absolute bottom-4 text-green-700 font-bold text-sm">Rosto Capturado!</p>
                         </div>
                    )}
                    <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
                </div>
            )}

            {detectionError && (
                <p className="text-red-500 text-xs font-bold mb-4 bg-red-50 p-2 rounded">{detectionError}</p>
            )}

            <div className="flex gap-2 justify-center">
                {!capturedDescriptor ? (
                    <button 
                        onClick={handleCapture} 
                        disabled={!isModelsLoaded || isScanning}
                        className="bg-wtech-black text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-800 disabled:opacity-50"
                    >
                        {isScanning ? <Loader2 className="animate-spin" size={18} /> : <Camera size={18} />}
                        Capturar Rosto
                    </button>
                ) : (
                    <>
                        <button 
                            onClick={handleRetake}
                            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-300"
                        >
                            <RefreshCw size={18} /> Tentar Novamente
                        </button>
                        <button 
                            onClick={handleConfirm}
                            className="bg-wtech-gold text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:brightness-110"
                        >
                            <Check size={18} /> Confirmar Cadastro
                        </button>
                    </>
                )}
                 {!capturedDescriptor && <button onClick={onCancel} className="bg-gray-100 text-gray-500 p-2 rounded-lg hover:bg-gray-200"><X size={20} /></button>}
            </div>
        </div>
    );
};

export default FaceRegistration;
