'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ArrowUpFromLine, ArrowDownToLine } from 'lucide-react';
import useCircuitStore from '@/store/useCircuitStore';

const SwitchNode = ({ id, data }: NodeProps) => {
    const toggleSwitch = useCircuitStore((s) => s.toggleSwitch);
    const isClosed = data.isClosed ?? true;

    return (
        <div
            className={`px-5 py-4 bg-[#16171a] border border-gray-800 rounded-xl flex flex-col gap-3 min-w-[200px] shadow-2xl transition-all duration-300 ${isClosed ? '' : 'border-orange-500/30'}`}
        >
            {/* Widget Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isClosed ? 'bg-[#20c997] shadow-[0_0_8px_rgba(32,201,151,0.5)]' : 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]'}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                        {isClosed ? 'Flow Nominal' : 'Path Terminated'}
                    </span>
                </div>
            </div>

            <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-tighter mb-1">Logical Break</div>
                <div className="text-lg font-black text-white leading-none uppercase tracking-tighter italic">Drawbridge</div>
            </div>

            <button
                onClick={() => toggleSwitch(id)}
                className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-gray-800 bg-[#1c1d21] hover:bg-[#232429] hover:border-gray-600 transition-all text-[11px] font-black uppercase tracking-widest ${isClosed ? 'text-white' : 'text-orange-500'}`}
            >
                {isClosed ? (
                    <>
                        <ArrowDownToLine className="w-4 h-4 opacity-60" />
                        ENGAGED
                    </>
                ) : (
                    <>
                        <ArrowUpFromLine className="w-4 h-4" />
                        DISENGAGED
                    </>
                )}
            </button>

            {/* Visual indicator minimized for clean dashboard look */}
            <div className="flex items-center justify-center gap-1 opacity-20">
                <div className="h-px w-full bg-white" />
                <div className={`h-2 min-w-[12px] border border-white rounded-sm ${isClosed ? 'bg-white' : ''}`} />
                <div className="h-px w-full bg-white" />
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

export default memo(SwitchNode);
