'use client';

import React from 'react';
import { Play, AlertTriangle, Trash2 } from 'lucide-react';
import useCircuitStore from '@/store/useCircuitStore';

export default function ControlPanel() {
    const simulationState = useCircuitStore((s) => s.simulationState);
    const executeSimulation = useCircuitStore((s) => s.executeSimulation);
    const triggerFault = useCircuitStore((s) => s.triggerFault);
    const resetSimulation = useCircuitStore((s) => s.resetSimulation);
    const clearCanvas = useCircuitStore((s) => s.clearCanvas);

    return (
        <div className="absolute top-6 right-6 z-20 flex items-center gap-1.5 p-2 bg-[#16171a]/80 backdrop-blur-md border border-gray-800 rounded-2xl shadow-2xl pointer-events-auto">
            <div className="px-3 py-2 flex flex-col gap-0.5 border-r border-gray-800 mr-1">
                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Simulation</span>
                <span className={`text-[10px] font-bold uppercase ${simulationState === 'running' ? 'text-[#20c997]' : simulationState === 'fault' ? 'text-red-500 animate-pulse' : 'text-gray-400'}`}>
                    {simulationState}
                </span>
            </div>

            <button
                onClick={executeSimulation}
                className={`flex items-center gap-2 px-4 py-2 bg-[#1c1d21] border rounded-xl transition-all ${simulationState === 'running'
                    ? 'border-[#20c997] shadow-[0_0_15px_rgba(32,201,151,0.3)]'
                    : 'border-gray-800 hover:bg-[#232429] hover:border-white/20'
                    } text-white text-[11px] font-bold uppercase`}
            >
                <Play className={`w-3.5 h-3.5 ${simulationState === 'running' ? 'fill-[#20c997] text-[#20c997]' : 'text-[#20c997]'}`} />
                Execute
            </button>

            <button
                onClick={triggerFault}
                className={`flex items-center gap-2 px-4 py-2 bg-[#1c1d21] border rounded-xl transition-all ${simulationState === 'fault'
                    ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse'
                    : 'border-gray-800 hover:bg-[#232429] hover:border-red-500/40'
                    } text-red-500 text-[11px] font-bold uppercase`}
            >
                <AlertTriangle className="w-3.5 h-3.5" />
                Fault
            </button>

            <button
                onClick={resetSimulation}
                className="p-2.5 bg-[#1c1d21] border border-gray-800 rounded-xl hover:bg-white/5 hover:border-white/20 text-gray-400 hover:text-white transition-all"
                title="Reset simulation"
            >
                <Play className="w-4 h-4 rotate-180 opacity-50" />
            </button>

            <button
                onClick={clearCanvas}
                className="p-2.5 bg-[#1c1d21] border border-gray-800 rounded-xl hover:bg-red-500/10 hover:border-red-500/40 text-gray-400 hover:text-red-500 transition-all"
                title="Clear canvas"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    );
}
