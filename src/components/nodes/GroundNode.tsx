import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const GroundNode = ({ data }: NodeProps) => {
    return (
        <div className="flex flex-col items-center min-w-[140px]">
            <div className="px-5 py-4 bg-[#16171a] border border-gray-800 rounded-xl flex flex-col gap-3 w-full shadow-2xl">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-600 rounded-full" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Neutral Point</span>
                </div>

                <div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-tighter mb-1">Return Path</div>
                    <div className="text-lg font-black text-white leading-none uppercase tracking-tighter italic">Drain Site</div>
                </div>

                <div className="flex flex-col items-center gap-1.5 py-2 border-t border-gray-800 opacity-40">
                    <div className="w-10 h-px bg-white" />
                    <div className="w-6 h-px bg-white" />
                    <div className="w-3 h-px bg-white" />
                </div>
            </div>

            <Handle
                type="target"
                position={Position.Top}
                className="w-4 h-1 bg-gray-700 !border-0 !rounded-none hover:bg-white transition-colors"
                style={{ top: -1 }}
            />
        </div>
    );
};

export default memo(GroundNode);
