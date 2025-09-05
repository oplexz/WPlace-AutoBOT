import { build } from 'esbuild';

let userscriptHeaders = `// ==UserScript==
// @name         WPlace Auto-Image
// @namespace    https://wplace.live/
// @version      0.0.1
// @description  WPlace Auto-Image, but I went ahead and removed half the features.
// @author       DarkModde + community
// @match        https://wplace.live/*
// @match        https://www.wplace.live/*
// @run-at       document-idle
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wplace.live
// @grant        none
// ==/UserScript==`;

const args = new Set(process.argv.slice(2));
const watch = args.has('--watch');

console.log(`Building...`);

const buildOptions = {
    entryPoints: ['src/index.js'],
    outfile: 'dist/Auto-Image.user.js',
    bundle: true,
    format: 'iife',
    target: ['es2019'],
    legalComments: 'none',
    minify: true,
    sourcemap: false,
    banner: {
        js: userscriptHeaders,
    },
};

if (watch) {
    buildOptions.watch = {
        onRebuild(error, _result) {
            if (error) {
                console.error('⛔ Build failed:', error);
            } else {
                console.log('✅ Rebuilt Auto-Image.js');
            }
        },
    };
}

try {
    await build(buildOptions);
    console.log(`Build completed successfully!`);

    if (watch) {
        console.log('Watching for changes... Press Ctrl+C to stop.');
    }
} catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
}
