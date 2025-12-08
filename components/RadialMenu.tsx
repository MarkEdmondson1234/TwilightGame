/**
 * RadialMenu Component
 * Displays interaction options in a circular menu around the clicked position
 */

import React, { useEffect, useState } from 'react';

export interface RadialMenuOption {
    id: string;
    label: string;
    icon?: string;
    color?: string;
    onSelect: () => void;
}

interface RadialMenuProps {
    /** Screen position where menu should appear (in pixels) */
    position: { x: number; y: number };
    /** Available interaction options */
    options: RadialMenuOption[];
    /** Callback when menu is closed without selection */
    onClose: () => void;
}

const RadialMenu: React.FC<RadialMenuProps> = ({ position, options, onClose }) => {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    // Close menu on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Calculate position for each option in a circle
    const radius = 80; // Distance from center to each option
    const angleStep = (2 * Math.PI) / options.length;
    const startAngle = -Math.PI / 2; // Start at top (12 o'clock)

    const handleOptionClick = (option: RadialMenuOption, index: number) => {
        setSelectedIndex(index);
        // Small delay for visual feedback
        setTimeout(() => {
            option.onSelect();
            onClose();
        }, 100);
    };

    return (
        <>
            {/* Backdrop - click to close */}
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    zIndex: 1000,
                }}
                onClick={onClose}
            />

            {/* Center dot at click position */}
            <div
                style={{
                    position: 'fixed',
                    left: position.x,
                    top: position.y,
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#fff',
                    borderRadius: '50%',
                    border: '2px solid #333',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 1001,
                    pointerEvents: 'none',
                }}
            />

            {/* Options arranged in a circle */}
            {options.map((option, index) => {
                const angle = startAngle + index * angleStep;
                const x = position.x + radius * Math.cos(angle);
                const y = position.y + radius * Math.sin(angle);
                const isSelected = selectedIndex === index;

                return (
                    <div
                        key={option.id}
                        style={{
                            position: 'fixed',
                            left: x,
                            top: y,
                            transform: 'translate(-50%, -50%)',
                            zIndex: 1001,
                        }}
                    >
                        {/* Connection line from center to option */}
                        <svg
                            style={{
                                position: 'absolute',
                                left: '50%',
                                top: '50%',
                                width: radius,
                                height: radius,
                                pointerEvents: 'none',
                                transform: 'translate(-50%, -50%)',
                            }}
                        >
                            <line
                                x1={radius / 2}
                                y1={radius / 2}
                                x2={position.x - x + radius / 2}
                                y2={position.y - y + radius / 2}
                                stroke={option.color || '#888'}
                                strokeWidth="2"
                                opacity="0.5"
                            />
                        </svg>

                        {/* Option button */}
                        <button
                            onClick={() => handleOptionClick(option, index)}
                            onMouseEnter={() => setSelectedIndex(index)}
                            onMouseLeave={() => setSelectedIndex(null)}
                            style={{
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                padding: '12px',
                                minWidth: '80px',
                                backgroundColor: isSelected ? (option.color || '#4a90e2') : '#fff',
                                color: isSelected ? '#fff' : '#333',
                                border: `2px solid ${option.color || '#4a90e2'}`,
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontFamily: 'Arial, sans-serif',
                                fontWeight: '600',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                                transition: 'all 0.15s ease',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {option.icon && (
                                <span style={{ fontSize: '20px' }}>{option.icon}</span>
                            )}
                            <span>{option.label}</span>
                        </button>
                    </div>
                );
            })}
        </>
    );
};

export default RadialMenu;
