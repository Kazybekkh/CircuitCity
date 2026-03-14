import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Zap } from 'lucide-react';

const PowerPlantNode = ({ data }: NodeProps) => {
    return (
        <div className="px-5 py-4 bg-[#16171a] border border-gray-800 rounded-xl flex flex-col gap-3 min-w-[180px] shadow-2xl">
            {/* Widget Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#20c997] rounded-full shadow-[0_0_8px_rgba(32,201,151,0.5)]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Stability OK</span>
                </div>
                <Zap className="w-4 h-4 text-white opacity-40" />
            </div>

            <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-tighter mb-1">Source Node</div>
                <div className="text-lg font-black text-white leading-none uppercase italic tracking-tighter">Power Plant</div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-gray-800">
                <div className="px-2 py-0.5 bg-[#1c1d21] border border-gray-800 rounded text-[9px] font-bold text-[#20c997] uppercase">
                    Generating
                </div>
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

export default memo(PowerPlantNode);
