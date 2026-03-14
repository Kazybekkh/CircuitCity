import React from 'react';
import { EdgeProps, getBezierPath } from 'reactflow';

export default function EnergyWire({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    markerEnd,
}: EdgeProps) {
    const [edgePath] = getBezierPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
    });

    const isOverloaded = data?.isOverloaded === true;
    const strokeColor = isOverloaded ? '#ef4444' : '#22d3ee';
    const glowColor = isOverloaded ? 'rgba(239,68,68,0.4)' : 'rgba(34,211,238,0.3)';
    const animDuration = isOverloaded ? '0.3s' : '1.2s';

    return (
        <>
            {/* Glow layer */}
            <path
                d={edgePath}
                fill="none"
                stroke={glowColor}
                strokeWidth={8}
                strokeLinecap="round"
            />

            {/* Base wire */}
            <path
                d={edgePath}
                fill="none"
                stroke="#4b5563"
                strokeWidth={3}
                strokeLinecap="round"
            />

            {/* Animated current */}
            <path
                d={edgePath}
                fill="none"
                stroke={strokeColor}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeDasharray="6 6"
                markerEnd={markerEnd}
                style={{
                    animation: `energyFlow ${animDuration} linear infinite`,
                }}
            />
        </>
    );
}
