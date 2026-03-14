import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { AlertTriangle } from 'lucide-react';

type DistrictState = 'healthy' | 'overload' | 'off';

const stateStyles: Record<DistrictState, { container: string; label: string; dot: string }> = {
    healthy: {
        container: 'bg-[#16171a] border-gray-800',
        label: 'text-white',
        dot: 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]',
    },
    overload: {
        container: 'bg-[#16171a] border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]',
        label: 'text-red-500',
        dot: 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-pulse',
    },
    off: {
        container: 'bg-[#16171a] border-gray-900 opacity-60',
        label: 'text-gray-600',
        dot: 'bg-gray-800',
    },
};

const stateLabels: Record<DistrictState, string> = {
    healthy: 'Nominal Load',
    overload: 'CRITICAL ALARM',
    off: 'Load Terminated',
};

const DistrictNode = ({ data }: NodeProps) => {
    // Derive state: explicit `data.state` takes priority, then fall back to isPowered boolean
    const state: DistrictState =
        data.state === 'healthy' || data.state === 'overload' || data.state === 'off'
            ? data.state
            : data.isPowered
                ? 'healthy'
                : 'off';

    const styles = stateStyles[state];

    return (
        <div
            className={`px-5 py-4 border rounded-xl shadow-2xl transition-all duration-300 min-w-[180px] flex flex-col gap-3 ${styles.container}`}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${styles.dot}`} />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${state === 'overload' ? 'text-red-500 animate-pulse' : 'text-gray-500'}`}>
                        {stateLabels[state]}
                    </span>
                </div>
            </div>

            <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-tighter mb-1">District Asset</div>
                <div className={`text-lg font-black leading-none uppercase tracking-tighter ${styles.label}`}>
                    Load Center
                </div>
            </div>

            {state === 'overload' && (
                <div className="mt-1 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div className="text-[9px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3" />
                        HIGH VOLTAGE BREACH
                    </div>
                </div>
            )}

            <Handle
                type="target"
                position={Position.Top}
                className="w-4 h-1 bg-gray-700 !border-0 !rounded-none hover:bg-white transition-colors"
                style={{ top: -1 }}
            />
            <Handle
                type="source"
                position={Position.Bottom}
                className="w-4 h-1 bg-gray-700 !border-0 !rounded-none hover:bg-white transition-colors"
                style={{ bottom: -1 }}
            />
        </div>
    );
};

export default memo(DistrictNode);
