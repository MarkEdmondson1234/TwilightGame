/**
 * RadialMenu Component
 * Displays interaction options in a circular menu around the clicked position
 * Cottage-core styled with click-to-select behaviour
 */

import React, { useEffect, useState, useRef } from 'react';

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
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
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

    // Calculate position for each option in a vertical list (cottage-core feels more natural)
    const spacing = 70; // Vertical spacing between options
    const startY = position.y - ((options.length - 1) * spacing) / 2;

    const handleOptionHover = (index: number) => {
        setHoveredIndex(index);
    };

    const handleOptionLeave = () => {
        setHoveredIndex(null);
    };

    const handleOptionClick = (option: RadialMenuOption, index: number) => {
        // Immediate selection on click
        setSelectedIndex(index);
        setTimeout(() => {
            option.onSelect();
            onClose();
        }, 100);
    };

    return (
        <>
            {/* Invisible backdrop - click to close (no darkening) */}
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'transparent',
                    zIndex: 1000,
                }}
                onClick={onClose}
            />

            {/* Options arranged vertically with cottage-core styling */}
            {options.map((option, index) => {
                const y = startY + index * spacing;
                const isHovered = hoveredIndex === index;
                const isSelected = selectedIndex === index;

                return (
                    <div
                        key={option.id}
                        style={{
                            position: 'fixed',
                            left: position.x,
                            top: y,
                            transform: 'translate(-50%, -50%)',
                            zIndex: 1001,
                        }}
                    >
                        {/* Option button - cottage-core styled */}
                        <button
                            onClick={() => handleOptionClick(option, index)}
                            onMouseEnter={() => handleOptionHover(index)}
                            onMouseLeave={handleOptionLeave}
                            style={{
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                padding: '14px 20px',
                                minWidth: '160px',
                                // Cottage-core warm brown palette
                                backgroundColor: isSelected
                                    ? '#4a6741' // Sage green when selected
                                    : isHovered
                                        ? '#6b5344' // Darker warm brown on hover
                                        : '#5c4a3d', // Warm brown base
                                color: '#f5efe8', // Cream text
                                border: `3px solid ${isSelected ? '#7a9970' : isHovered ? '#a08060' : '#8b7355'}`,
                                borderRadius: '12px',
                                cursor: 'pointer',
                                fontSize: '15px',
                                fontFamily: 'Georgia, serif',
                                fontWeight: '500',
                                boxShadow: isHovered
                                    ? '0 6px 20px rgba(92, 74, 61, 0.5), inset 0 1px 0 rgba(255,255,255,0.1)'
                                    : '0 4px 12px rgba(92, 74, 61, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                                transition: 'all 0.2s ease',
                                whiteSpace: 'nowrap',
                                // Parchment texture effect
                                backgroundImage: isSelected
                                    ? 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)'
                                    : 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%, rgba(0,0,0,0.08) 100%)',
                            }}
                        >
                            {option.icon && (
                                <>
                                    {(option.icon.startsWith('/') || option.icon.startsWith('http')) ? (
                                        <img
                                            src={option.icon}
                                            alt={option.label}
                                            style={{
                                                width: '32px',
                                                height: '32px',
                                                objectFit: 'contain'
                                            }}
                                        />
                                    ) : (
                                        <span style={{ fontSize: '22px' }}>{option.icon}</span>
                                    )}
                                </>
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
