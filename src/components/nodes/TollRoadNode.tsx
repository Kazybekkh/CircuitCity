import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const stateStyles = {
    healthy: {
        dot: 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]',
        label: 'Impedance Active',
    },
    overload: {
        dot: 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-pulse',
        label: 'CRITICAL OVERLOAD',
    },
    off: {
        dot: 'bg-gray-700',
        label: 'Impedance Standby',
    },
};

const TollRoadNode = ({ data }: NodeProps) => {
    const resistance = data.value ?? '1kΩ';
    const state = (data.state as 'healthy' | 'overload' | 'off') || 'off';
    const styles = stateStyles[state];

    return (
        <div className={`px-5 py-4 bg-[#16171a] border rounded-xl flex flex-col gap-3 min-w-[180px] shadow-2xl transition-all duration-300 ${state === 'overload' ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]' : 'border-gray-800'}`}>
            {/* Widget Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${styles.dot}`} />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${state === 'overload' ? 'text-red-500' : 'text-gray-500'}`}>
                        {styles.label}
                    </span>
                </div>
            </div>

            <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-tighter mb-1">Restricting Node</div>
                <div className={`text-lg font-black leading-none uppercase tracking-tighter ${state === 'overload' ? 'text-red-500' : 'text-white'}`}>Toll Booth</div>
            </div>

            <div className={`flex items-center justify-between pt-2 border-t ${state === 'overload' ? 'border-red-500/20' : 'border-gray-800'}`}>
                <span className="text-[10px] font-bold text-gray-500 uppercase">Value</span>
                <span className={`text-xs font-black px-2 py-0.5 rounded-md ${state === 'overload' ? 'text-red-500 bg-red-500/10 border border-red-500/20' : 'text-white bg-orange-500/10 border border-orange-500/20'}`}>
                    {resistance}
                </span>
            </div>

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

export default memo(TollRoadNode);
