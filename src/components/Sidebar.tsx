import React, { useRef, useState } from 'react';
import { Zap, Building2, Construction, Upload, Sparkles, ToggleLeft, CircleOff, Loader2 } from 'lucide-react';
import useCircuitStore from '@/store/useCircuitStore';

const componentsList = [
    {
        type: 'powerPlant',
        label: 'Power Plant',
        description: 'Primary Source',
        icon: Zap,
    },
    {
        type: 'tollRoad',
        label: 'Toll Booth',
        description: 'Impedance',
        icon: Construction,
    },
    {
        type: 'district',
        label: 'District',
        description: 'Load Center',
        icon: Building2,
    },
    {
        type: 'switch',
        label: 'Drawbridge',
        description: 'Logical Break',
        icon: ToggleLeft,
    },
    {
        type: 'ground',
        label: 'Drain',
        description: 'Ground',
        icon: CircleOff,
    },
];

export default function Sidebar() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const setNodes = useCircuitStore((s) => s.setNodes);
    const setEdges = useCircuitStore((s) => s.setEdges);

    const onDragStart = (event: React.DragEvent, nodeType: string) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsAnalyzing(true);
        try {
            const base64 = await convertToBase64(file);
            const response = await fetch('/api/vision', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64 }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
                throw new Error(errorData.error || 'Analysis failed');
            }

            const data = await response.json();

            // Map AI components to React Flow Nodes with default layouts
            const nodes = data.components.map((c: any, index: number) => ({
                id: c.id,
                type: c.type,
                position: { x: 250, y: index * 150 + 50 },
                data: { label: c.label, state: 'off' },
            }));

            const edges = data.edges.map((e: any) => ({
                id: e.id || `e-${e.source}-${e.target}`,
                source: e.source,
                target: e.target,
                type: 'energyWire',
                data: { state: 'inactive' },
            }));

            setNodes(nodes);
            setEdges(edges);
        } catch (error) {
            console.error('Vision Error:', error);
            alert('Failed to analyze schematic. Please try again.');
        } finally {
            setIsAnalyzing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const convertToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
        });
    };

    return (
        <aside className="w-60 h-full bg-[#16171a] border border-gray-800 rounded-2xl flex flex-col p-5 gap-6 select-none pointer-events-auto shadow-2xl overflow-y-auto backdrop-blur-sm">
            {/* Header / Logo Section */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                        Automation Engine
                    </h2>
                </div>

                <button
                    onClick={() => !isAnalyzing && fileInputRef.current?.click()}
                    disabled={isAnalyzing}
                    className={`w-full flex items-center gap-3 p-3 bg-[#1c1d21] border rounded-xl transition-all cursor-pointer group ${isAnalyzing ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)] animate-pulse' : 'border-gray-800 hover:bg-[#232429] hover:border-gray-700'}`}
                >
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                        {isAnalyzing ? (
                            <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                        ) : (
                            <Upload className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
                        )}
                    </div>
                    <div className="text-left">
                        <span className="block text-[11px] font-bold text-white uppercase leading-none mb-1">
                            {isAnalyzing ? 'Analyzing...' : 'Upload Vision'}
                        </span>
                        <span className="block text-[9px] text-gray-500 uppercase tracking-tighter cursor-default">
                            {isAnalyzing ? 'Gemini is thinking' : 'Gemini Schematic AI'}
                        </span>
                    </div>
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                />
            </div>

            <div className="h-px bg-gray-800 w-full" />

            {/* Components Section */}
            <div className="flex-1">
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-4">
                    Telemetry Assets
                </h2>

                <div className="flex flex-col gap-2">
                    {componentsList.map((comp) => {
                        const Icon = comp.icon;
                        return (
                            <div
                                key={comp.type}
                                draggable
                                onDragStart={(e) => onDragStart(e, comp.type)}
                                className="flex items-center justify-between p-3 bg-[#1c1d21] border border-gray-800 rounded-xl cursor-grab active:cursor-grabbing hover:border-gray-600 hover:bg-[#232429] transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg border border-gray-800 bg-[#0b0c10] group-hover:bg-[#16171a]`}>
                                        <Icon className="w-4 h-4 text-gray-400 group-hover:text-white" />
                                    </div>
                                    <div>
                                        <div className="text-[11px] font-bold text-white uppercase tracking-tight">{comp.label}</div>
                                        <div className="text-[9px] text-gray-600 uppercase font-medium">{comp.description}</div>
                                    </div>
                                </div>
                                <div className={`w-1.5 h-1.5 rounded-full ${comp.type === 'powerPlant' ? 'bg-[#20c997]' : comp.type === 'district' ? 'bg-cyan-500' : 'bg-gray-700'}`} />
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="pt-4 border-t border-gray-800">
                <div className="flex items-center justify-center gap-2 px-3 py-2 bg-[#0b0c10] border border-gray-800 rounded-lg">
                    <div className="w-1.5 h-1.5 bg-[#20c997] rounded-full animate-pulse" />
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest text-center">
                        System Ready
                    </p>
                </div>
            </div>
        </aside>
    );
}
