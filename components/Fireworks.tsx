import React from 'react';

interface FireworkBurst {
    id: string;
    top: string;
    left: string;
    delay: number;
    scale?: number;
}

const burstConfig: FireworkBurst[] = [
    { id: 'burst-nw', top: '18%', left: '22%', delay: 0, scale: 1 },
    { id: 'burst-ne', top: '20%', left: '72%', delay: 400, scale: 0.9 },
    { id: 'burst-sw', top: '60%', left: '18%', delay: 800, scale: 0.85 },
    { id: 'burst-se', top: '62%', left: '78%', delay: 1200, scale: 1.1 },
    { id: 'burst-mid', top: '35%', left: '50%', delay: 600, scale: 1.2 },
];

const particleVariants = ['warm', 'cool', 'gold'];

const Fireworks: React.FC = () => {
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {burstConfig.map(burst => (
                <div
                    key={burst.id}
                    className="firework"
                    style={{
                        top: burst.top,
                        left: burst.left,
                        animationDelay: `${burst.delay}ms`,
                        transform: `scale(${burst.scale ?? 1})`,
                    }}
                >
                    {Array.from({ length: 8 }).map((_, idx) => (
                        <span
                            key={`${burst.id}-${idx}`}
                            className="firework__particle-wrapper"
                            style={{ transform: `rotate(${idx * 45}deg)` }}
                        >
                            <span
                                className={`firework__particle firework__particle--${particleVariants[idx % particleVariants.length]}`}
                                style={{ animationDelay: `${burst.delay}ms` }}
                            />
                        </span>
                    ))}
                </div>
            ))}
        </div>
    );
};

export default Fireworks;
