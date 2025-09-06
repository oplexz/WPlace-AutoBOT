/**
 * Coordinate generation utilities for WPlace Auto-Image Bot
 */
export class CoordinateGenerator {
    /**
     * Generate coordinates based on the specified mode and parameters
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @param {string} mode - Generation mode ('rows', 'columns', 'circle-out', 'circle-in', 'blocks', 'shuffle-blocks')
     * @param {string} direction - Starting direction ('top-left', 'top-right', 'bottom-left', 'bottom-right')
     * @param {boolean} snake - Whether to use snake pattern (zigzag)
     * @param {number} blockWidth - Block width for block modes
     * @param {number} blockHeight - Block height for block modes
     * @returns {Array<Array<number>>} Array of [x, y] coordinates
     */
    static generateCoordinates(width, height, mode, direction, snake, blockWidth, blockHeight) {
        const coords = [];
        console.log(
            'Generating coordinates with \n  mode:',
            mode,
            '\n  direction:',
            direction,
            '\n  snake:',
            snake,
            '\n  blockWidth:',
            blockWidth,
            '\n  blockHeight:',
            blockHeight
        );

        // --------- Standard 4 corners traversal ----------
        let xStart, xEnd, xStep;
        let yStart, yEnd, yStep;
        switch (direction) {
            case 'top-left':
                xStart = 0;
                xEnd = width;
                xStep = 1;
                yStart = 0;
                yEnd = height;
                yStep = 1;
                break;
            case 'top-right':
                xStart = width - 1;
                xEnd = -1;
                xStep = -1;
                yStart = 0;
                yEnd = height;
                yStep = 1;
                break;
            case 'bottom-left':
                xStart = 0;
                xEnd = width;
                xStep = 1;
                yStart = height - 1;
                yEnd = -1;
                yStep = -1;
                break;
            case 'bottom-right':
                xStart = width - 1;
                xEnd = -1;
                xStep = -1;
                yStart = height - 1;
                yEnd = -1;
                yStep = -1;
                break;
            default:
                throw new Error(`Unknown direction: ${direction}`);
        }

        // --------- Traversal modes ----------
        if (mode === 'rows') {
            for (let y = yStart; y !== yEnd; y += yStep) {
                if (snake && (y - yStart) % 2 !== 0) {
                    for (let x = xEnd - xStep; x !== xStart - xStep; x -= xStep) {
                        coords.push([x, y]);
                    }
                } else {
                    for (let x = xStart; x !== xEnd; x += xStep) {
                        coords.push([x, y]);
                    }
                }
            }
        } else if (mode === 'columns') {
            for (let x = xStart; x !== xEnd; x += xStep) {
                if (snake && (x - xStart) % 2 !== 0) {
                    for (let y = yEnd - yStep; y !== yStart - yStep; y -= yStep) {
                        coords.push([x, y]);
                    }
                } else {
                    for (let y = yStart; y !== yEnd; y += yStep) {
                        coords.push([x, y]);
                    }
                }
            }
        } else if (mode === 'circle-out') {
            const cx = Math.floor(width / 2);
            const cy = Math.floor(height / 2);
            const maxRadius = Math.ceil(Math.sqrt(cx * cx + cy * cy));

            for (let r = 0; r <= maxRadius; r++) {
                for (let y = cy - r; y <= cy + r; y++) {
                    for (let x = cx - r; x <= cx + r; x++) {
                        if (x >= 0 && x < width && y >= 0 && y < height) {
                            const dist = Math.max(Math.abs(x - cx), Math.abs(y - cy));
                            if (dist === r) coords.push([x, y]);
                        }
                    }
                }
            }
        } else if (mode === 'circle-in') {
            const cx = Math.floor(width / 2);
            const cy = Math.floor(height / 2);
            const maxRadius = Math.ceil(Math.sqrt(cx * cx + cy * cy));

            for (let r = maxRadius; r >= 0; r--) {
                for (let y = cy - r; y <= cy + r; y++) {
                    for (let x = cx - r; x <= cx + r; x++) {
                        if (x >= 0 && x < width && y >= 0 && y < height) {
                            const dist = Math.max(Math.abs(x - cx), Math.abs(y - cy));
                            if (dist === r) coords.push([x, y]);
                        }
                    }
                }
            }
        } else if (mode === 'blocks' || mode === 'shuffle-blocks') {
            const blocks = [];
            for (let by = 0; by < height; by += blockHeight) {
                for (let bx = 0; bx < width; bx += blockWidth) {
                    const block = [];
                    for (let y = by; y < Math.min(by + blockHeight, height); y++) {
                        for (let x = bx; x < Math.min(bx + blockWidth, width); x++) {
                            block.push([x, y]);
                        }
                    }
                    blocks.push(block);
                }
            }

            if (mode === 'shuffle-blocks') {
                // Simple Fisher-Yates shuffle
                for (let i = blocks.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
                }
            }

            // Concatenate all blocks
            for (const block of blocks) {
                coords.push(...block);
            }
        } else {
            throw new Error(`Unknown mode: ${mode}`);
        }

        return coords;
    }
}
