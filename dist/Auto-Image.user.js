// ==UserScript==
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
// ==/UserScript==
"use strict";(()=>{(async()=>{let p={COOLDOWN_DEFAULT:31e3,TRANSPARENCY_THRESHOLD:100,WHITE_THRESHOLD:250,LOG_INTERVAL:10,PAINTING_SPEED:{MIN:1,MAX:1e3,DEFAULT:5},BATCH_MODE:"normal",RANDOM_BATCH_RANGE:{MIN:3,MAX:20},PAINTING_SPEED_ENABLED:!0,AUTO_CAPTCHA_ENABLED:!0,TOKEN_SOURCE:"generator",COOLDOWN_CHARGE_THRESHOLD:1,OVERLAY:{OPACITY_DEFAULT:.2,BLUE_MARBLE_DEFAULT:!1,ditheringEnabled:!1},COLOR_MAP:{0:{id:1,name:"Black",rgb:{r:0,g:0,b:0}},1:{id:2,name:"Dark Gray",rgb:{r:60,g:60,b:60}},2:{id:3,name:"Gray",rgb:{r:120,g:120,b:120}},3:{id:4,name:"Light Gray",rgb:{r:210,g:210,b:210}},4:{id:5,name:"White",rgb:{r:255,g:255,b:255}},5:{id:6,name:"Deep Red",rgb:{r:96,g:0,b:24}},6:{id:7,name:"Red",rgb:{r:237,g:28,b:36}},7:{id:8,name:"Orange",rgb:{r:255,g:127,b:39}},8:{id:9,name:"Gold",rgb:{r:246,g:170,b:9}},9:{id:10,name:"Yellow",rgb:{r:249,g:221,b:59}},10:{id:11,name:"Light Yellow",rgb:{r:255,g:250,b:188}},11:{id:12,name:"Dark Green",rgb:{r:14,g:185,b:104}},12:{id:13,name:"Green",rgb:{r:19,g:230,b:123}},13:{id:14,name:"Light Green",rgb:{r:135,g:255,b:94}},14:{id:15,name:"Dark Teal",rgb:{r:12,g:129,b:110}},15:{id:16,name:"Teal",rgb:{r:16,g:174,b:166}},16:{id:17,name:"Light Teal",rgb:{r:19,g:225,b:190}},17:{id:20,name:"Cyan",rgb:{r:96,g:247,b:242}},18:{id:44,name:"Light Cyan",rgb:{r:187,g:250,b:242}},19:{id:18,name:"Dark Blue",rgb:{r:40,g:80,b:158}},20:{id:19,name:"Blue",rgb:{r:64,g:147,b:228}},21:{id:21,name:"Indigo",rgb:{r:107,g:80,b:246}},22:{id:22,name:"Light Indigo",rgb:{r:153,g:177,b:251}},23:{id:23,name:"Dark Purple",rgb:{r:120,g:12,b:153}},24:{id:24,name:"Purple",rgb:{r:170,g:56,b:185}},25:{id:25,name:"Light Purple",rgb:{r:224,g:159,b:249}},26:{id:26,name:"Dark Pink",rgb:{r:203,g:0,b:122}},27:{id:27,name:"Pink",rgb:{r:236,g:31,b:128}},28:{id:28,name:"Light Pink",rgb:{r:243,g:141,b:169}},29:{id:29,name:"Dark Brown",rgb:{r:104,g:70,b:52}},30:{id:30,name:"Brown",rgb:{r:149,g:104,b:42}},31:{id:31,name:"Beige",rgb:{r:248,g:178,b:119}},32:{id:52,name:"Light Beige",rgb:{r:255,g:197,b:165}},33:{id:32,name:"Medium Gray",rgb:{r:170,g:170,b:170}},34:{id:33,name:"Dark Red",rgb:{r:165,g:14,b:30}},35:{id:34,name:"Light Red",rgb:{r:250,g:128,b:114}},36:{id:35,name:"Dark Orange",rgb:{r:228,g:92,b:26}},37:{id:37,name:"Dark Goldenrod",rgb:{r:156,g:132,b:49}},38:{id:38,name:"Goldenrod",rgb:{r:197,g:173,b:49}},39:{id:39,name:"Light Goldenrod",rgb:{r:232,g:212,b:95}},40:{id:40,name:"Dark Olive",rgb:{r:74,g:107,b:58}},41:{id:41,name:"Olive",rgb:{r:90,g:148,b:74}},42:{id:42,name:"Light Olive",rgb:{r:132,g:197,b:115}},43:{id:43,name:"Dark Cyan",rgb:{r:15,g:121,b:159}},44:{id:45,name:"Light Blue",rgb:{r:125,g:199,b:255}},45:{id:46,name:"Dark Indigo",rgb:{r:77,g:49,b:184}},46:{id:47,name:"Dark Slate Blue",rgb:{r:74,g:66,b:132}},47:{id:48,name:"Slate Blue",rgb:{r:122,g:113,b:196}},48:{id:49,name:"Light Slate Blue",rgb:{r:181,g:174,b:241}},49:{id:53,name:"Dark Peach",rgb:{r:155,g:82,b:73}},50:{id:54,name:"Peach",rgb:{r:209,g:128,b:120}},51:{id:55,name:"Light Peach",rgb:{r:250,g:182,b:164}},52:{id:50,name:"Light Brown",rgb:{r:219,g:164,b:99}},53:{id:56,name:"Dark Tan",rgb:{r:123,g:99,b:82}},54:{id:57,name:"Tan",rgb:{r:156,g:132,b:107}},55:{id:36,name:"Light Tan",rgb:{r:214,g:181,b:148}},56:{id:51,name:"Dark Beige",rgb:{r:209,g:128,b:81}},57:{id:61,name:"Dark Stone",rgb:{r:109,g:100,b:63}},58:{id:62,name:"Stone",rgb:{r:148,g:140,b:107}},59:{id:63,name:"Light Stone",rgb:{r:205,g:197,b:158}},60:{id:58,name:"Dark Slate",rgb:{r:51,g:57,b:65}},61:{id:59,name:"Slate",rgb:{r:109,g:117,b:141}},62:{id:60,name:"Light Slate",rgb:{r:179,g:185,b:209}},63:{id:0,name:"Transparent",rgb:null}},CSS_CLASSES:{BUTTON_PRIMARY:`
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        color: white; border: none; border-radius: 8px; padding: 10px 16px;
        cursor: pointer; font-weight: 500; transition: all 0.3s ease;
        display: flex; align-items: center; gap: 8px;
      `,BUTTON_SECONDARY:`
        background: rgba(255,255,255,0.1); color: white;
        border: 1px solid rgba(255,255,255,0.2); border-radius: 8px;
        padding: 8px 12px; cursor: pointer; transition: all 0.3s ease;
      `,MODERN_CARD:`
        background: rgba(255,255,255,0.1); border-radius: 12px;
        padding: 18px; border: 1px solid rgba(255,255,255,0.1);
        backdrop-filter: blur(5px);
      `,GRADIENT_TEXT:`
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        background-clip: text; font-weight: bold;
      `},THEME:{primary:"#000000",secondary:"#111111",accent:"#222222",text:"#ffffff",highlight:"#775ce3",success:"#00ff00",error:"#ff0000",warning:"#ffaa00",fontFamily:"'Segoe UI', Roboto, sans-serif",borderRadius:"12px",borderStyle:"solid",borderWidth:"1px",boxShadow:"0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)",backdropFilter:"blur(10px)"},PAINT_UNAVAILABLE:!0,COORDINATE_MODE:"rows",COORDINATE_DIRECTION:"top-left",COORDINATE_SNAKE:!0,COORDINATE_BLOCK_WIDTH:6,COORDINATE_BLOCK_HEIGHT:2};function pa(){document.documentElement.classList.remove("wplace-theme-classic","wplace-theme-classic-light","wplace-theme-neon"),document.documentElement.classList.add("wplace-theme-classic");let t=document.documentElement,a=(n,i)=>{try{t.style.setProperty(n,i)}catch{}};a("--wplace-primary",p.THEME.primary),a("--wplace-secondary",p.THEME.secondary),a("--wplace-accent",p.THEME.accent),a("--wplace-text",p.THEME.text),a("--wplace-highlight",p.THEME.highlight),a("--wplace-success",p.THEME.success),a("--wplace-error",p.THEME.error),a("--wplace-warning",p.THEME.warning),a("--wplace-font",p.THEME.fontFamily||"'Segoe UI', Roboto, sans-serif"),a("--wplace-radius",""+(p.THEME.borderRadius||"12px")),a("--wplace-border-style",""+(p.THEME.borderStyle||"solid")),a("--wplace-border-width",""+(p.THEME.borderWidth||"1px")),a("--wplace-backdrop",""+(p.THEME.backdropFilter||"blur(10px)")),a("--wplace-border-color","rgba(255,255,255,0.1)")}let Gt=new Map,Ue={},ha=async(t=0)=>{if(Ue.en)return Ue.en;let n="https://wplace-autobot.github.io/WPlace-AutoBOT/main/lang/en.json",i=3,o=1e3;try{console.log(t===0?"\u{1F504} Loading en translations from CDN...":`\u{1F504} Retrying en translations (attempt ${t+1}/${i+1})...`);let c=await fetch(n);if(c.ok){let r=await c.json();if(typeof r=="object"&&r!==null&&Object.keys(r).length>0)return Ue.en=r,console.log(`\u{1F4DA} Loaded en translations successfully from CDN (${Object.keys(r).length} keys)`),r;throw console.warn("\u274C Invalid translation format for en"),new Error("Invalid translation format")}else throw console.warn(`\u274C CDN returned HTTP ${c.status}: ${c.statusText} for en translations`),new Error(`HTTP ${c.status}: ${c.statusText}`)}catch(c){if(console.error(`\u274C Failed to load en translations from CDN (attempt ${t+1}):`,c),t<i){let r=o*Math.pow(2,t);return console.log(`\u23F3 Retrying in ${r}ms...`),await new Promise(g=>setTimeout(g,r)),ha(t+1)}}return null},ma=t=>{try{let a=document.createElement("div");a.style.cssText=`
        position: fixed; top: 10px; right: 10px; z-index: 10001;
        background: rgba(255, 193, 7, 0.95); color: #212529; padding: 12px 16px;
        border-radius: 8px; font-size: 14px; font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 1px solid rgba(255, 193, 7, 0.8);
        max-width: 300px; word-wrap: break-word;
      `,a.textContent=t,document.body.appendChild(a),setTimeout(()=>{a.parentNode&&a.remove()},8e3)}catch(a){console.warn("Failed to show translation warning UI:",a)}},La=async()=>{try{console.log("\u{1F310} Initializing translation system..."),Ue.en||await ha()||(console.warn("\u26A0\uFE0F Failed to load English translations from CDN, using fallback"),ma("\u26A0\uFE0F Translation loading failed, using basic fallbacks")),console.log(`\u2705 Translation system initialized. Active language: ${e.language}`)}catch(t){console.error("\u274C Translation initialization failed:",t),e.language||(e.language="en"),console.warn("\u26A0\uFE0F Using fallback translations due to initialization failure"),ma("\u26A0\uFE0F Translation system error, using basic English")}},fa={en:{title:"WPlace Auto-Image",toggleOverlay:"Toggle Overlay",scanColors:"Scan Colors",uploadImage:"Upload Image",resizeImage:"Resize Image",selectPosition:"Select Position",startPainting:"Start Painting",stopPainting:"Stop Painting",progress:"Progress",pixels:"Pixels",charges:"Charges",batchSize:"Batch Size",cooldownSettings:"Cooldown Settings",waitCharges:"Wait for Charges",settings:"Settings",showStats:"Show Statistics",compactMode:"Compact Mode",minimize:"Minimize",tokenCapturedSuccess:"Token captured successfully",turnstileInstructions:"Complete the verification",hideTurnstileBtn:"Hide",chargesReadyMessage:"Charges are ready",chargesReadyNotification:"WPlace AutoBot",initMessage:"Click 'Upload Image' to begin"}},e={running:!1,imageLoaded:!1,processing:!1,totalPixels:0,paintedPixels:0,availableColors:[],activeColorPalette:[],paintWhitePixels:!0,fullChargeData:null,fullChargeInterval:null,paintTransparentPixels:!1,displayCharges:0,preciseCurrentCharges:0,maxCharges:1,cooldown:p.COOLDOWN_DEFAULT,imageData:null,stopFlag:!1,colorsChecked:!1,startPosition:null,selectingPosition:!1,region:null,minimized:!1,lastPosition:{x:0,y:0},estimatedTime:0,language:"en",paintingSpeed:p.PAINTING_SPEED.DEFAULT,batchMode:p.BATCH_MODE,randomBatchMin:p.RANDOM_BATCH_RANGE.MIN,randomBatchMax:p.RANDOM_BATCH_RANGE.MAX,cooldownChargeThreshold:p.COOLDOWN_CHARGE_THRESHOLD,chargesThresholdInterval:null,tokenSource:p.TOKEN_SOURCE,initialSetupComplete:!1,overlayOpacity:p.OVERLAY.OPACITY_DEFAULT,blueMarbleEnabled:p.OVERLAY.BLUE_MARBLE_DEFAULT,ditheringEnabled:!0,colorMatchingAlgorithm:"lab",enableChromaPenalty:!0,chromaPenaltyWeight:.15,customTransparencyThreshold:p.TRANSPARENCY_THRESHOLD,customWhiteThreshold:p.WHITE_THRESHOLD,resizeSettings:null,originalImage:null,resizeIgnoreMask:null,paintUnavailablePixels:p.PAINT_UNAVAILABLE,coordinateMode:p.COORDINATE_MODE,coordinateDirection:p.COORDINATE_DIRECTION,coordinateSnake:p.COORDINATE_SNAKE,blockWidth:p.COORDINATE_BLOCK_WIDTH,blockHeight:p.COORDINATE_BLOCK_HEIGHT,_lastSavePixelCount:0,_lastSaveTime:0,_saveInProgress:!1,paintedMap:null},me=()=>{},Mt=null;class Ba{constructor(){this.isEnabled=!1,this.startCoords=null,this.imageBitmap=null,this.chunkedTiles=new Map,this.originalTiles=new Map,this.originalTilesData=new Map,this.tileSize=1e3,this.processPromise=null,this.lastProcessedHash=null,this.workerPool=null}toggle(){return this.isEnabled=!this.isEnabled,console.log(`Overlay ${this.isEnabled?"enabled":"disabled"}.`),this.isEnabled}enable(){this.isEnabled=!0}disable(){this.isEnabled=!1}clear(){this.disable(),this.imageBitmap=null,this.chunkedTiles.clear(),this.originalTiles.clear(),this.originalTilesData.clear(),this.lastProcessedHash=null,this.processPromise&&(this.processPromise=null)}async setImage(a){this.imageBitmap=a,this.lastProcessedHash=null,this.imageBitmap&&this.startCoords&&await this.processImageIntoChunks()}async setPosition(a,n){if(!a||!n){this.startCoords=null,this.chunkedTiles.clear(),this.lastProcessedHash=null;return}this.startCoords={region:n,pixel:a},this.lastProcessedHash=null,this.imageBitmap&&await this.processImageIntoChunks()}_generateProcessHash(){if(!this.imageBitmap||!this.startCoords)return null;let{width:a,height:n}=this.imageBitmap,{x:i,y:o}=this.startCoords.pixel,{x:c,y:r}=this.startCoords.region;return`${a}x${n}_${i},${o}_${c},${r}_${e.blueMarbleEnabled}_${e.overlayOpacity}`}async processImageIntoChunks(){if(!this.imageBitmap||!this.startCoords)return;if(this.processPromise)return this.processPromise;let a=this._generateProcessHash();if(this.lastProcessedHash===a&&this.chunkedTiles.size>0){console.log(`\u{1F4E6} Using cached overlay chunks (${this.chunkedTiles.size} tiles)`);return}this.processPromise=this._doProcessImageIntoChunks();try{await this.processPromise,this.lastProcessedHash=a}finally{this.processPromise=null}}async _doProcessImageIntoChunks(){let a=performance.now();this.chunkedTiles.clear();let{width:n,height:i}=this.imageBitmap,{x:o,y:c}=this.startCoords.pixel,{x:r,y:g}=this.startCoords.region,{startTileX:l,startTileY:u,endTileX:d,endTileY:b}=s.calculateTileRange(r,g,o,c,n,i,this.tileSize),y=(d-l+1)*(b-u+1);console.log(`\u{1F504} Processing ${y} overlay tiles...`);let v=4,f=[];for(let T=u;T<=b;T++)for(let C=l;C<=d;C++)f.push({tx:C,ty:T});for(let T=0;T<f.length;T+=v){let C=f.slice(T,T+v);await Promise.all(C.map(async({tx:I,ty:B})=>{let N=`${I},${B}`,M=await this._processTile(I,B,n,i,o,c,r,g);M&&this.chunkedTiles.set(N,M)})),T+v<f.length&&await new Promise(I=>setTimeout(I,0))}let m=performance.now()-a;console.log(`\u2705 Overlay processed ${this.chunkedTiles.size} tiles in ${Math.round(m)}ms`)}async _processTile(a,n,i,o,c,r,g,l){let u=(a-g)*this.tileSize-c,d=(n-l)*this.tileSize-r,b=Math.max(0,u),y=Math.max(0,d),v=Math.min(i-b,this.tileSize-(b-u)),f=Math.min(o-y,this.tileSize-(y-d));if(v<=0||f<=0)return null;let m=Math.max(0,-u),T=Math.max(0,-d),C=new OffscreenCanvas(this.tileSize,this.tileSize),I=C.getContext("2d");if(I.imageSmoothingEnabled=!1,I.drawImage(this.imageBitmap,b,y,v,f,m,T,v,f),e.blueMarbleEnabled){let B=I.getImageData(m,T,v,f),N=B.data;for(let M=0;M<N.length;M+=4){let X=M/4,pe=Math.floor(X/v);(X%v+pe)%2===0&&N[M+3]>0&&(N[M+3]=0)}I.putImageData(B,m,T)}return await C.transferToImageBitmap()}async processAndRespondToTileRequest(a){let{endpoint:n,blobID:i,blobData:o}=a,c=o;if(this.isEnabled&&this.chunkedTiles.size>0){let r=n.match(/(\d+)\/(\d+)\.png/);if(r){let g=parseInt(r[1],10),l=parseInt(r[2],10),u=`${g},${l}`,d=this.chunkedTiles.get(u);try{let b=await createImageBitmap(o);this.originalTiles.set(u,b);try{let y,v;typeof OffscreenCanvas!="undefined"?(y=new OffscreenCanvas(b.width,b.height),v=y.getContext("2d")):(y=document.createElement("canvas"),y.width=b.width,y.height=b.height,v=y.getContext("2d")),v.imageSmoothingEnabled=!1,v.drawImage(b,0,0);let f=v.getImageData(0,0,b.width,b.height);this.originalTilesData.set(u,{w:b.width,h:b.height,data:new Uint8ClampedArray(f.data)})}catch(y){console.warn("OverlayManager: could not cache ImageData for",u,y)}}catch(b){console.warn("OverlayManager: could not create original bitmap for",u,b)}if(d)try{c=await this._compositeTileOptimized(o,d)}catch(b){console.error("Error compositing overlay:",b),c=o}}}window.postMessage({source:"auto-image-overlay",blobID:i,blobData:c},"*")}async getTilePixelColor(a,n,i,o){let c=`${a},${n}`,r=e.customTransparencyThreshold||p.TRANSPARENCY_THRESHOLD,g=this.originalTilesData.get(c);if(g&&g.data&&g.w>0&&g.h>0){let u=Math.max(0,Math.min(g.w-1,i)),d=Math.max(0,Math.min(g.h-1,o)),b=(d*g.w+u)*4,y=g.data,v=y[b+3];return!e.paintTransparentPixels&&v<r?(window._overlayDebug&&console.debug("OverlayManager: pixel transparent (cached), skipping",c,u,d,v),null):[y[b],y[b+1],y[b+2],v]}let l=3;for(let u=1;u<=l;u++){let d=this.originalTiles.get(c);if(!d){u===l?console.warn("OverlayManager: no bitmap for",c,"after",l,"attempts"):await s.sleep(50*u);continue}try{let b,y;typeof OffscreenCanvas!="undefined"?(b=new OffscreenCanvas(d.width,d.height),y=b.getContext("2d")):(b=document.createElement("canvas"),b.width=d.width,b.height=d.height,y=b.getContext("2d")),y.imageSmoothingEnabled=!1,y.drawImage(d,0,0);let v=Math.max(0,Math.min(d.width-1,i)),f=Math.max(0,Math.min(d.height-1,o)),m=y.getImageData(v,f,1,1).data,T=m[3];return!e.paintTransparentPixels&&T<r?(window._overlayDebug&&console.debug("OverlayManager: pixel transparent (fallback)",c,v,f,T),null):[m[0],m[1],m[2],T]}catch(b){console.warn("OverlayManager: failed to read pixel (attempt",u,")",c,b),u<l?await s.sleep(50*u):console.error("OverlayManager: failed to read pixel after",l,"attempts",c)}}return null}async _compositeTileOptimized(a,n){let i=await createImageBitmap(a),o=new OffscreenCanvas(i.width,i.height),c=o.getContext("2d");return c.imageSmoothingEnabled=!1,c.drawImage(i,0,0),c.globalAlpha=e.overlayOpacity,c.globalCompositeOperation="source-over",c.drawImage(n,0,0),await o.convertToBlob({type:"image/png",quality:.95})}async waitForTiles(a,n,i,o,c=0,r=0,g=1e4){let{startTileX:l,startTileY:u,endTileX:d,endTileY:b}=s.calculateTileRange(a,n,c,r,i,o,this.tileSize),y=[];for(let f=u;f<=b;f++)for(let m=l;m<=d;m++)y.push(`${m},${f}`);if(y.length===0)return!0;let v=Date.now();for(;Date.now()-v<g;){if(e.stopFlag)return console.log("waitForTiles: stopped by user"),!1;if(y.filter(m=>!this.originalTiles.has(m)).length===0)return console.log(`\u2705 All ${y.length} required tiles are loaded`),!0;await s.sleep(100)}return console.warn(`\u274C Timeout waiting for tiles: ${y.length} required, 
        ${y.filter(f=>this.originalTiles.has(f)).length} loaded`),!1}}let Se=new Ba,fe=null,Yt=0,Xt=!1,Re=null,lt=new Promise(t=>{Re=t}),ba=10,$a=24e4;function at(t){Re&&(Re(t),Re=null),fe=t,Yt=Date.now()+$a,console.log("\u2705 Turnstile token set successfully")}function rt(){return fe&&Date.now()<Yt}function Da(){fe=null,Yt=0,console.log("\u{1F5D1}\uFE0F Token invalidated, will force fresh generation")}async function wa(t=!1){if(rt()&&!t)return fe;if(t&&Da(),Xt)return console.log("\u{1F504} Token generation already in progress, waiting..."),await s.sleep(2e3),rt()?fe:null;Xt=!0;try{console.log("\u{1F504} Token expired or missing, generating new one...");let a=await ya();if(a&&a.length>20)return at(a),console.log("\u2705 Token captured and cached successfully"),a;console.log("\u26A0\uFE0F Invisible Turnstile failed, forcing browser automation...");let n=await At();return n&&n.length>20?(at(n),console.log("\u2705 Fallback token captured successfully"),n):(console.log("\u274C All token generation methods failed"),null)}finally{Xt=!1}}async function ya(){let t=performance.now();try{let{sitekey:a,token:n}=await s.obtainSitekeyAndToken();if(!a)throw new Error("No valid sitekey found");console.log("\u{1F511} Using sitekey:",a),typeof window!="undefined"&&window.navigator&&console.log("\u{1F9ED} UA:",window.navigator.userAgent.substring(0,50)+"...","Platform:",window.navigator.platform);let i=null;if(n&&typeof n=="string"&&n.length>20?(console.log("\u267B\uFE0F Reusing pre-generated Turnstile token"),i=n):rt()?(console.log("\u267B\uFE0F Using existing cached token (from previous session)"),i=fe):(console.log("\u{1F510} Generating new token with executeTurnstile..."),i=await s.executeTurnstile(a,"paint"),i&&at(i)),i&&typeof i=="string"&&i.length>20){let o=Math.round(performance.now()-t);return console.log(`\u2705 Turnstile token generated successfully in ${o}ms`),i}else throw new Error(`Invalid or empty token received - Length: ${(i==null?void 0:i.length)||0}`)}catch(a){let n=Math.round(performance.now()-t);throw console.error(`\u274C Turnstile token generation failed after ${n}ms:`,a),a}}function za(t){var n;let a=document.createElement("script");a.textContent=`(${t})();`,(n=document.documentElement)==null||n.appendChild(a),a.remove()}za(()=>{let t=new Map;window.addEventListener("message",n=>{let{source:i,blobID:o,blobData:c}=n.data;if(i==="auto-image-overlay"&&o&&c){let r=t.get(o);typeof r=="function"&&r(c),t.delete(o)}});let a=window.fetch;window.fetch=async function(...n){var c;let i=await a.apply(this,n),o=n[0]instanceof Request?n[0].url:n[0];if(typeof o=="string"){if(o.includes("https://backend.wplace.live/s0/pixel/"))try{let g=JSON.parse(n[1].body);g.t&&(console.log(`\u{1F50D}\u2705 Turnstile Token Captured - Type: ${typeof g.t}, Value: ${g.t?typeof g.t=="string"?g.t.length>50?g.t.substring(0,50)+"...":g.t:JSON.stringify(g.t):"null/undefined"}, Length: ${((c=g.t)==null?void 0:c.length)||0}`),window.postMessage({source:"turnstile-capture",token:g.t},"*"))}catch(g){console.error("\u274C Error capturing Turnstile token:",g)}if((i.headers.get("content-type")||"").includes("image/png")&&o.includes(".png")){let g=i.clone();return new Promise(l=>{let u=crypto.randomUUID();g.blob().then(d=>{t.set(u,b=>{l(new Response(b,{headers:g.headers,status:g.status,statusText:g.statusText}))}),window.postMessage({source:"auto-image-tile",endpoint:o,blobID:u,blobData:d},"*")})})}}return i}}),window.addEventListener("message",t=>{var r;let{source:a,endpoint:n,blobID:i,blobData:o,token:c}=t.data;a==="auto-image-tile"&&n&&i&&o&&Se.processAndRespondToTileRequest(t.data),a==="turnstile-capture"&&c&&(at(c),(r=document.querySelector("#statusText"))!=null&&r.textContent.includes("CAPTCHA")&&(s.showAlert(s.t("tokenCapturedSuccess"),"success"),R("colorsFound","success",{count:e.availableColors.length})))});let s={sleep:t=>new Promise(a=>setTimeout(a,t)),dynamicSleep:async function(t){let a=Math.max(0,await t());for(;a>0;){let n=a>5e3?2e3:a>1e3?500:100;await this.sleep(Math.min(n,a)),a=Math.max(0,await t())}},waitForSelector:async(t,a=200,n=5e3)=>{let i=Date.now();for(;Date.now()-i<n;){let o=document.querySelector(t);if(o)return o;await s.sleep(a)}return null},msToTimeText(t){let a=Math.ceil(t/1e3),n=Math.floor(a/3600),i=Math.floor(a%3600/60),o=a%60;return n>0?`${n}h ${i}m ${o}s`:i>0?`${i}m ${o}s`:`${o}s`},createScrollToAdjust:(t,a,n,i,o=1)=>{let c=null,r=g=>{g.target===t&&(g.preventDefault(),g.stopPropagation(),c&&clearTimeout(c),c=setTimeout(()=>{let l=parseInt(t.value)||0,u=g.deltaY>0?-o:o,d=Math.max(n,Math.min(i,l+u));d!==l&&(t.value=d,a(d))},50))};return t.addEventListener("wheel",r,{passive:!1}),()=>{c&&clearTimeout(c),t.removeEventListener("wheel",r)}},calculateTileRange(t,a,n,i,o,c,r=1e3){let g=n+o,l=i+c;return{startTileX:t+Math.floor(n/r),startTileY:a+Math.floor(i/r),endTileX:t+Math.floor((g-1)/r),endTileY:a+Math.floor((l-1)/r)}},turnstileLoaded:!1,_turnstileContainer:null,_turnstileOverlay:null,_turnstileWidgetId:null,_lastSitekey:null,async loadTurnstile(){return window.turnstile?(this.turnstileLoaded=!0,Promise.resolve()):new Promise((t,a)=>{if(document.querySelector('script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]')){let i=()=>{window.turnstile?(this.turnstileLoaded=!0,t()):setTimeout(i,100)};return i()}let n=document.createElement("script");n.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",n.async=!0,n.defer=!0,n.onload=()=>{this.turnstileLoaded=!0,console.log("\u2705 Turnstile script loaded successfully"),t()},n.onerror=()=>{console.error("\u274C Failed to load Turnstile script"),a(new Error("Failed to load Turnstile"))},document.head.appendChild(n)})},ensureTurnstileContainer(){return(!this._turnstileContainer||!document.body.contains(this._turnstileContainer))&&(this._turnstileContainer&&this._turnstileContainer.remove(),this._turnstileContainer=document.createElement("div"),this._turnstileContainer.className="wplace-turnstile-hidden",this._turnstileContainer.setAttribute("aria-hidden","true"),this._turnstileContainer.id="turnstile-widget-container",document.body.appendChild(this._turnstileContainer)),this._turnstileContainer},ensureTurnstileOverlayContainer(){if(this._turnstileOverlay&&document.body.contains(this._turnstileOverlay))return this._turnstileOverlay;let t=document.createElement("div");t.id="turnstile-overlay-container",t.className="wplace-turnstile-overlay wplace-overlay-hidden";let a=document.createElement("div");a.textContent=s.t("turnstileInstructions"),a.className="wplace-turnstile-title";let n=document.createElement("div");n.id="turnstile-overlay-host",n.className="wplace-turnstile-host";let i=document.createElement("button");return i.textContent=s.t("hideTurnstileBtn"),i.className="wplace-turnstile-hide-btn",i.addEventListener("click",()=>t.remove()),t.appendChild(a),t.appendChild(n),t.appendChild(i),document.body.appendChild(t),this._turnstileOverlay=t,t},async executeTurnstile(t,a="paint"){var i;if(await this.loadTurnstile(),this._turnstileWidgetId&&this._lastSitekey===t&&((i=window.turnstile)!=null&&i.execute))try{console.log("\u{1F504} Reusing existing Turnstile widget...");let o=await Promise.race([window.turnstile.execute(this._turnstileWidgetId,{action:a}),new Promise((c,r)=>setTimeout(()=>r(new Error("Execute timeout")),15e3))]);if(o&&o.length>20)return console.log("\u2705 Token generated via widget reuse"),o}catch(o){console.log("\uFFFD Widget reuse failed, will create a fresh widget:",o.message)}let n=await this.createTurnstileWidget(t,a);return n&&n.length>20?n:(console.log("\uFFFD Falling back to interactive Turnstile (visible)."),await this.createTurnstileWidgetInteractive(t,a))},async createTurnstileWidget(t,a){return new Promise(n=>{var i,o;try{if(this._turnstileWidgetId&&((i=window.turnstile)!=null&&i.remove))try{window.turnstile.remove(this._turnstileWidgetId),console.log("\u{1F9F9} Cleaned up existing Turnstile widget")}catch(g){console.warn("\u26A0\uFE0F Widget cleanup warning:",g.message)}let c=this.ensureTurnstileContainer();if(c.innerHTML="",!((o=window.turnstile)!=null&&o.render)){console.error("\u274C Turnstile not available for rendering"),n(null);return}console.log("\u{1F527} Creating invisible Turnstile widget...");let r=window.turnstile.render(c,{sitekey:t,action:a,size:"invisible",retry:"auto","retry-interval":8e3,callback:g=>{console.log("\u2705 Invisible Turnstile callback"),n(g)},"error-callback":()=>n(null),"timeout-callback":()=>n(null)});if(this._turnstileWidgetId=r,this._lastSitekey=t,!r)return n(null);Promise.race([window.turnstile.execute(r,{action:a}),new Promise((g,l)=>setTimeout(()=>l(new Error("Invisible execute timeout")),12e3))]).then(n).catch(()=>n(null))}catch(c){console.error("\u274C Invisible Turnstile creation failed:",c),n(null)}})},async createTurnstileWidgetInteractive(t,a){return console.log("\u{1F504} Creating interactive Turnstile widget (visible)"),new Promise(n=>{var i;try{if(this._turnstileWidgetId&&((i=window.turnstile)!=null&&i.remove))try{window.turnstile.remove(this._turnstileWidgetId)}catch(l){console.warn("\u26A0\uFE0F Widget cleanup warning:",l.message)}let o=this.ensureTurnstileOverlayContainer();o.classList.remove("wplace-overlay-hidden"),o.style.display="block";let c=o.querySelector("#turnstile-overlay-host");c.innerHTML="";let r=setTimeout(()=>{console.warn("\u23F0 Interactive Turnstile widget timeout"),o.classList.add("wplace-overlay-hidden"),o.style.display="none",n(null)},6e4),g=window.turnstile.render(c,{sitekey:t,action:a,size:"normal",theme:"light",callback:l=>{clearTimeout(r),o.classList.add("wplace-overlay-hidden"),o.style.display="none",console.log("\u2705 Interactive Turnstile completed successfully"),typeof l=="string"&&l.length>20?n(l):(console.warn("\u274C Invalid token from interactive widget"),n(null))},"error-callback":l=>{clearTimeout(r),o.classList.add("wplace-overlay-hidden"),o.style.display="none",console.warn("\u274C Interactive Turnstile error:",l),n(null)}});this._turnstileWidgetId=g,this._lastSitekey=t,g?console.log("\u2705 Interactive Turnstile widget created, waiting for user interaction..."):(clearTimeout(r),o.classList.add("wplace-overlay-hidden"),o.style.display="none",console.warn("\u274C Failed to create interactive Turnstile widget"),n(null))}catch(o){console.error("\u274C Interactive Turnstile creation failed:",o),n(null)}})},cleanupTurnstile(){var t;if(this._turnstileWidgetId&&((t=window.turnstile)!=null&&t.remove))try{window.turnstile.remove(this._turnstileWidgetId)}catch(a){console.warn("Failed to cleanup Turnstile widget:",a)}this._turnstileContainer&&document.body.contains(this._turnstileContainer)&&this._turnstileContainer.remove(),this._turnstileOverlay&&document.body.contains(this._turnstileOverlay)&&this._turnstileOverlay.remove(),this._turnstileWidgetId=null,this._turnstileContainer=null,this._turnstileOverlay=null,this._lastSitekey=null},async obtainSitekeyAndToken(t="0x4AAAAAABpqJe8FO0N84q0F"){var o;if(this._cachedSitekey)return console.log("\u{1F50D} Using cached sitekey:",this._cachedSitekey),rt()?{sitekey:this._cachedSitekey,token:fe}:{sitekey:this._cachedSitekey,token:null};let a=["0x4AAAAAABpqJe8FO0N84q0F","0x4AAAAAAAJ7xjKAp6Mt_7zw","0x4AAAAAADm5QWx6Ov2LNF2g"],n=async(c,r)=>{if(!c||c.length<10)return null;console.log(`\u{1F50D} Testing sitekey from ${r}:`,c);let g=await this.executeTurnstile(c);return g&&g.length>=20?(console.log(`\u2705 Valid token generated from ${r} sitekey`),at(g),this._cachedSitekey=c,{sitekey:c,token:g}):(console.log(`\u274C Failed to get token from ${r} sitekey`),null)};try{let c=document.querySelector("[data-sitekey]");if(c){let u=c.getAttribute("data-sitekey"),d=await n(u,"data attribute");if(d)return d}let r=document.querySelector(".cf-turnstile");if((o=r==null?void 0:r.dataset)!=null&&o.sitekey){let u=r.dataset.sitekey,d=await n(u,"turnstile element");if(d)return d}let g=document.querySelectorAll('meta[name*="turnstile"], meta[property*="turnstile"]');for(let u of g){let d=u.getAttribute("content"),b=await n(d,"meta tag");if(b)return b}if(window.__TURNSTILE_SITEKEY){let u=await n(window.__TURNSTILE_SITEKEY,"global variable");if(u)return u}let l=document.querySelectorAll("script");for(let u of l){let b=(u.textContent||u.innerHTML).match(/(?:sitekey|data-sitekey)['"\s[\]:=(]*['"]?([0-9a-zA-Z_-]{20,})['"]?/i);if(b&&b[1]){let y=b[1].replace(/['"]/g,""),v=await n(y,"script content");if(v)return v}}console.log("\u{1F50D} Testing known potential sitekeys...");for(let u of a){let d=await n(u,"known list");if(d)return d}}catch(c){console.warn("\u26A0\uFE0F Error during sitekey detection:",c)}console.log("\u{1F527} Trying fallback sitekey:",t);let i=await n(t,"fallback");return i||(console.error("\u274C No working sitekey or token found."),{sitekey:null,token:null})},createElement:(t,a={},n=[])=>{let i=document.createElement(t);return Object.entries(a).forEach(([o,c])=>{o==="style"&&typeof c=="object"?Object.assign(i.style,c):o==="className"?i.className=c:o==="innerHTML"?i.innerHTML=c:i.setAttribute(o,c)}),typeof n=="string"?i.textContent=n:Array.isArray(n)&&n.forEach(o=>{typeof o=="string"?i.appendChild(document.createTextNode(o)):i.appendChild(o)}),i},createButton:(t,a,n,i,o=p.CSS_CLASSES.BUTTON_PRIMARY)=>{let c=s.createElement("button",{id:t,style:o,innerHTML:`${n?`<i class="${n}"></i>`:""}<span>${a}</span>`});return i&&c.addEventListener("click",i),c},t:(t,a={})=>{var o,c,r,g;let n=`${e.language}_${t}`;if(Gt.has(n)){let l=Gt.get(n);return Object.keys(a).forEach(u=>{l=l.replace(`{${u}}`,a[u])}),l}if((o=Ue[e.language])!=null&&o[t]){let l=Ue[e.language][t];return Gt.set(n,l),Object.keys(a).forEach(u=>{l=l.replace(`{${u}}`,a[u])}),l}if(e.language!=="en"&&((c=Ue.en)!=null&&c[t])){let l=Ue.en[t];return Object.keys(a).forEach(u=>{l=l.replace(`{${u}}`,a[u])}),l}let i=((r=fa[e.language])==null?void 0:r[t])||((g=fa.en)==null?void 0:g[t])||t;return Object.keys(a).forEach(l=>{i=i.replace(new RegExp(`\\{${l}\\}`,"g"),a[l])}),i===t&&t!=="undefined"&&console.warn(`\u26A0\uFE0F Missing translation for key: ${t} (language: ${e.language})`),i},showAlert:(t,a="info")=>{let n=document.createElement("div");n.className=`wplace-alert-base wplace-alert-${a}`,n.textContent=t,document.body.appendChild(n),setTimeout(()=>{n.style.animation="slide-down 0.3s ease-out reverse",setTimeout(()=>{document.body.removeChild(n)},300)},4e3)},colorDistance:(t,a)=>Math.sqrt(Math.pow(t[0]-a[0],2)+Math.pow(t[1]-a[1],2)+Math.pow(t[2]-a[2],2)),_labCache:new Map,_rgbToLab:(t,a,n)=>{let i=C=>(C/=255,C<=.04045?C/12.92:Math.pow((C+.055)/1.055,2.4)),o=i(t),c=i(a),r=i(n),g=o*.4124+c*.3576+r*.1805,l=o*.2126+c*.7152+r*.0722,u=o*.0193+c*.1192+r*.9505;g/=.95047,l/=1,u/=1.08883;let d=C=>C>.008856?Math.cbrt(C):7.787*C+16/116,b=d(g),y=d(l),v=d(u),f=116*y-16,m=500*(b-y),T=200*(y-v);return[f,m,T]},_lab:(t,a,n)=>{let i=t<<16|a<<8|n,o=s._labCache.get(i);return o||(o=s._rgbToLab(t,a,n),s._labCache.set(i,o)),o},findClosestPaletteColor:(t,a,n,i)=>{if((!i||i.length===0)&&(i=Object.values(p.COLOR_MAP).filter(d=>d.rgb).map(d=>[d.rgb.r,d.rgb.g,d.rgb.b])),e.colorMatchingAlgorithm==="legacy"){let d=1/0,b=[0,0,0];for(let y=0;y<i.length;y++){let[v,f,m]=i[y],T=(v+t)/2,C=v-t,I=f-a,B=m-n,N=Math.sqrt(((512+T)*C*C>>8)+4*I*I+((767-T)*B*B>>8));N<d&&(d=N,b=[v,f,m])}return b}let[o,c,r]=s._lab(t,a,n),g=Math.sqrt(c*c+r*r),l=null,u=1/0;for(let d=0;d<i.length;d++){let[b,y,v]=i[d],[f,m,T]=s._lab(b,y,v),C=o-f,I=c-m,B=r-T,N=C*C+I*I+B*B;if(e.enableChromaPenalty&&g>20){let M=Math.sqrt(m*m+T*T);if(M<g){let X=g-M;N+=X*X*e.chromaPenaltyWeight}}if(N<u&&(u=N,l=i[d],u===0))break}return l||[0,0,0]},isWhitePixel:(t,a,n)=>{let i=e.customWhiteThreshold||p.WHITE_THRESHOLD;return t>=i&&a>=i&&n>=i},resolveColor(t,a,n=!1){if(!a||a.length===0)return{id:null,rgb:t};let i=`${t[0]},${t[1]},${t[2]}|${e.colorMatchingAlgorithm}|${e.enableChromaPenalty?"c":"nc"}|${e.chromaPenaltyWeight}|${n?"exact":"closest"}`;if(qe.has(i))return qe.get(i);if(n){let u=a.find(b=>b.rgb[0]===t[0]&&b.rgb[1]===t[1]&&b.rgb[2]===t[2]),d=u?{id:u.id,rgb:[...u.rgb]}:{id:null,rgb:t};return qe.set(i,d),d}let o=e.customWhiteThreshold||p.WHITE_THRESHOLD;if(t[0]>=o&&t[1]>=o&&t[2]>=o){let u=a.find(d=>d.rgb[0]>=o&&d.rgb[1]>=o&&d.rgb[2]>=o);if(u){let d={id:u.id,rgb:[...u.rgb]};return qe.set(i,d),d}}let c=a[0].id,r=[...a[0].rgb],g=1/0;if(e.colorMatchingAlgorithm==="legacy")for(let u=0;u<a.length;u++){let d=a[u],[b,y,v]=d.rgb,f=(b+t[0])/2,m=b-t[0],T=y-t[1],C=v-t[2],I=Math.sqrt(((512+f)*m*m>>8)+4*T*T+((767-f)*C*C>>8));if(I<g&&(g=I,c=d.id,r=[...d.rgb],I===0))break}else{let[u,d,b]=s._lab(t[0],t[1],t[2]),y=Math.sqrt(d*d+b*b),v=e.enableChromaPenalty?e.chromaPenaltyWeight||.15:0;for(let f=0;f<a.length;f++){let m=a[f],[T,C,I]=m.rgb,[B,N,M]=s._lab(T,C,I),X=u-B,pe=d-N,Oe=b-M,ce=X*X+pe*pe+Oe*Oe;if(v>0&&y>20){let be=Math.sqrt(N*N+M*M);if(be<y){let Ie=y-be;ce+=Ie*Ie*v}}if(ce<g&&(g=ce,c=m.id,r=[...m.rgb],ce===0))break}}let l={id:c,rgb:r};if(qe.set(i,l),qe.size>15e3){let u=qe.keys().next().value;qe.delete(u)}return l},createImageUploader:()=>new Promise(t=>{let a=document.createElement("input");a.type="file",a.accept="image/png,image/jpeg",a.onchange=()=>{let n=new FileReader;n.onload=()=>t(n.result),n.readAsDataURL(a.files[0])},a.click()}),extractAvailableColors:()=>{let t=document.querySelectorAll('.tooltip button[id^="color-"]');if(t.length===0)return console.log("\u274C No color elements found on page"),null;let a=[],n=[];return Array.from(t).forEach(i=>{let o=Number.parseInt(i.id.replace("color-",""));if(o===0)return;let c=i.style.backgroundColor.match(/\d+/g);if(!c||c.length<3){console.warn(`Skipping color element ${i.id} \u2014 cannot parse RGB`);return}let r=c.map(Number),g=Object.values(p.COLOR_MAP).find(d=>d.id===o),l=g?g.name:`Unknown Color ${o}`,u={id:o,name:l,rgb:r};i.querySelector("svg")?n.push(u):a.push(u)}),console.log("=== CAPTURED COLORS STATUS ==="),console.log(`Total available colors: ${a.length}`),console.log(`Total unavailable colors: ${n.length}`),console.log(`Total colors scanned: ${a.length+n.length}`),a.length>0&&(console.log(`
--- AVAILABLE COLORS ---`),a.forEach((i,o)=>{console.log(`${o+1}. ID: ${i.id}, Name: "${i.name}", RGB: (${i.rgb[0]}, ${i.rgb[1]}, ${i.rgb[2]})`)})),n.length>0&&(console.log(`
--- UNAVAILABLE COLORS ---`),n.forEach((i,o)=>{console.log(`${o+1}. ID: ${i.id}, Name: "${i.name}", RGB: (${i.rgb[0]}, ${i.rgb[1]}, ${i.rgb[2]}) [LOCKED]`)})),console.log("=== END COLOR STATUS ==="),a},formatTime:t=>{let a=Math.floor(t/1e3%60),n=Math.floor(t/(1e3*60)%60),i=Math.floor(t/(1e3*60*60)%24),o=Math.floor(t/(1e3*60*60*24)),c="";return o>0&&(c+=`${o}d `),(i>0||o>0)&&(c+=`${i}h `),(n>0||i>0||o>0)&&(c+=`${n}m `),c+=`${a}s`,c},calculateEstimatedTime:(t,a,n)=>{if(t<=0)return 0;let i=e.paintingSpeed>0?1e3/e.paintingSpeed:1e3,o=t*i,r=Math.ceil(t/Math.max(a,1))*n;return o+r},initializePaintedMap:(t,a)=>{(!e.paintedMap||e.paintedMap.length!==a)&&(e.paintedMap=Array(a).fill().map(()=>Array(t).fill(!1)),console.log(`\u{1F4CB} Initialized painted map: ${t}x${a}`))},markPixelPainted:(t,a,n=0,i=0)=>{let o=t+n,c=a+i;e.paintedMap&&e.paintedMap[c]&&o>=0&&o<e.paintedMap[c].length&&(e.paintedMap[c][o]=!0)},isPixelPainted:(t,a,n=0,i=0)=>{let o=t+n,c=a+i;return e.paintedMap&&e.paintedMap[c]&&o>=0&&o<e.paintedMap[c].length?e.paintedMap[c][o]:!1},shouldAutoSave:()=>{let t=Date.now(),a=e.paintedPixels-e._lastSavePixelCount,n=t-e._lastSaveTime;return!e._saveInProgress&&a>=25&&n>=3e4},performSmartSave:()=>{if(!s.shouldAutoSave())return!1;e._saveInProgress=!0;let t=s.saveProgress();return t&&(e._lastSavePixelCount=e.paintedPixels,e._lastSaveTime=Date.now(),console.log(`\u{1F4BE} Auto-saved at ${e.paintedPixels} pixels`)),e._saveInProgress=!1,t},packPaintedMapToBase64:(t,a,n)=>{if(!t||!a||!n)return null;let i=a*n,o=Math.ceil(i/8),c=new Uint8Array(o),r=0;for(let u=0;u<n;u++){let d=t[u];for(let b=0;b<a;b++){let y=d&&d[b]?1:0,v=r>>3,f=r&7;y&&(c[v]|=1<<f),r++}}let g="",l=32768;for(let u=0;u<c.length;u+=l)g+=String.fromCharCode.apply(null,c.subarray(u,Math.min(u+l,c.length)));return btoa(g)},unpackPaintedMapFromBase64:(t,a,n)=>{if(!t||!a||!n)return null;let i=atob(t),o=new Uint8Array(i.length);for(let g=0;g<i.length;g++)o[g]=i.charCodeAt(g);let c=Array(n).fill().map(()=>Array(a).fill(!1)),r=0;for(let g=0;g<n;g++)for(let l=0;l<a;l++){let u=r>>3,d=r&7;c[g][l]=(o[u]>>d&1)===1,r++}return c},buildPaintedMapPacked(){if(e.paintedMap&&e.imageData){let t=s.packPaintedMapToBase64(e.paintedMap,e.imageData.width,e.imageData.height);if(t)return{width:e.imageData.width,height:e.imageData.height,data:t}}return null},buildProgressData(){return{timestamp:Date.now(),version:"2.2",state:{totalPixels:e.totalPixels,paintedPixels:e.paintedPixels,lastPosition:e.lastPosition,startPosition:e.startPosition,region:e.region,imageLoaded:e.imageLoaded,colorsChecked:e.colorsChecked,coordinateMode:e.coordinateMode,coordinateDirection:e.coordinateDirection,coordinateSnake:e.coordinateSnake,blockWidth:e.blockWidth,blockHeight:e.blockHeight,availableColors:e.availableColors},imageData:e.imageData?{width:e.imageData.width,height:e.imageData.height,pixels:Array.from(e.imageData.pixels),totalPixels:e.imageData.totalPixels}:null,paintedMapPacked:s.buildPaintedMapPacked()}},saveProgress:()=>{try{let t=s.buildProgressData(e);return localStorage.setItem("wplace-bot-progress",JSON.stringify(t)),!0}catch(t){return console.error("Error saving progress:",t),!1}},loadProgress:()=>{try{let t=localStorage.getItem("wplace-bot-progress");return t?JSON.parse(t):null}catch(t){return console.error("Error loading progress:",t),null}},clearProgress:()=>{try{return localStorage.removeItem("wplace-bot-progress"),e.paintedMap=null,e._lastSavePixelCount=0,e._lastSaveTime=0,e.coordinateMode=p.COORDINATE_MODE,e.coordinateDirection=p.COORDINATE_DIRECTION,e.coordinateSnake=p.COORDINATE_SNAKE,e.blockWidth=p.COORDINATE_BLOCK_WIDTH,e.blockHeight=p.COORDINATE_BLOCK_HEIGHT,console.log("\u{1F4CB} Progress and painted map cleared"),!0}catch(t){return console.error("Error clearing progress:",t),!1}},restoreProgress:t=>{try{if(Object.assign(e,t.state),t.state.coordinateMode&&(e.coordinateMode=t.state.coordinateMode),t.state.coordinateDirection&&(e.coordinateDirection=t.state.coordinateDirection),t.state.coordinateSnake!==void 0&&(e.coordinateSnake=t.state.coordinateSnake),t.state.blockWidth&&(e.blockWidth=t.state.blockWidth),t.state.blockHeight&&(e.blockHeight=t.state.blockHeight),t.imageData){e.imageData={...t.imageData,pixels:new Uint8ClampedArray(t.imageData.pixels)};try{let a=document.createElement("canvas");a.width=e.imageData.width,a.height=e.imageData.height;let n=a.getContext("2d"),i=new ImageData(e.imageData.pixels,e.imageData.width,e.imageData.height);n.putImageData(i,0,0);let o=new Vt("");o.img=a,o.canvas=a,o.ctx=n,e.imageData.processor=o}catch(a){console.warn("Could not rebuild processor from saved image data:",a)}}if(t.paintedMapPacked&&t.paintedMapPacked.data){let{width:a,height:n,data:i}=t.paintedMapPacked;e.paintedMap=s.unpackPaintedMapFromBase64(i,a,n)}else t.paintedMap&&(e.paintedMap=t.paintedMap.map(a=>Array.from(a)));return!0}catch(a){return console.error("Error restoring progress:",a),!1}},restoreOverlayFromData:async()=>{if(!e.imageLoaded||!e.imageData||!e.startPosition||!e.region)return!1;try{let t=new ImageData(e.imageData.pixels,e.imageData.width,e.imageData.height),a=new OffscreenCanvas(e.imageData.width,e.imageData.height);a.getContext("2d").putImageData(t,0,0);let i=await a.transferToImageBitmap();await Se.setImage(i),await Se.setPosition(e.startPosition,e.region),Se.enable();let o=document.getElementById("toggleOverlayBtn");return o&&(o.disabled=!1,o.classList.add("active")),console.log("Overlay restored from data"),!0}catch(t){return console.error("Failed to restore overlay from data:",t),!1}},updateCoordinateUI({mode:t,directionControls:a,snakeControls:n,blockControls:i}){let o=t==="rows"||t==="columns",c=t==="blocks"||t==="shuffle-blocks";a&&(a.style.display=o?"block":"none"),n&&(n.style.display=o?"block":"none"),i&&(i.style.display=c?"block":"none")}};class Vt{constructor(a){this.imageSrc=a,this.img=null,this.canvas=null,this.ctx=null}async load(){return new Promise((a,n)=>{this.img=new Image,this.img.crossOrigin="anonymous",this.img.onload=()=>{this.canvas=document.createElement("canvas"),this.ctx=this.canvas.getContext("2d"),this.canvas.width=this.img.width,this.canvas.height=this.img.height,this.ctx.drawImage(this.img,0,0),a()},this.img.onerror=n,this.img.src=this.imageSrc})}getDimensions(){return{width:this.canvas.width,height:this.canvas.height}}getPixelData(){return this.ctx.getImageData(0,0,this.canvas.width,this.canvas.height).data}resize(a,n){let i=document.createElement("canvas"),o=i.getContext("2d");return i.width=a,i.height=n,o.imageSmoothingEnabled=!1,o.drawImage(this.canvas,0,0,a,n),this.canvas.width=a,this.canvas.height=n,this.ctx.imageSmoothingEnabled=!1,this.ctx.drawImage(i,0,0),this.ctx.getImageData(0,0,a,n).data}generatePreview(a,n){let i=document.createElement("canvas"),o=i.getContext("2d");return i.width=a,i.height=n,o.imageSmoothingEnabled=!1,o.drawImage(this.img,0,0,a,n),i.toDataURL()}}let Oa={async paintPixelInRegion(t,a,n,i,o){try{if(await wa(),!fe)return"token_error";let c={coords:[n,i],colors:[o],t:fe},r=await fetch(`https://backend.wplace.live/s0/pixel/${t}/${a}`,{method:"POST",headers:{"Content-Type":"text/plain;charset=UTF-8"},credentials:"include",body:JSON.stringify(c)});if(r.status===403)return console.error("\u274C 403 Forbidden. Turnstile token might be invalid or expired."),fe=null,lt=new Promise(l=>{Re=l}),"token_error";let g=await r.json();return(g==null?void 0:g.painted)===1}catch(c){return console.error("Paint request failed:",c),!1}},async getCharges(){var a,n,i,o,c,r;let t={charges:0,max:1,cooldown:p.COOLDOWN_DEFAULT};try{let g=await fetch("https://backend.wplace.live/me",{credentials:"include"});if(!g.ok)return console.error(`Failed to get charges: HTTP ${g.status}`),t;let l=await g.json();return{charges:(n=(a=l.charges)==null?void 0:a.count)!=null?n:0,max:(o=(i=l.charges)==null?void 0:i.max)!=null?o:1,cooldown:(r=(c=l.charges)==null?void 0:c.cooldownMs)!=null?r:p.COOLDOWN_DEFAULT}}catch(g){return console.error("Failed to get charges:",g),t}}},qe=new Map,R=()=>{},Fe=()=>{},Pt=()=>{};function It(){var a;e.activeColorPalette=[];let t=document.querySelectorAll(".wplace-color-swatch.active");t&&t.forEach(n=>{let i=n.getAttribute("data-rgb");if(i){let o=i.split(",").map(Number);e.activeColorPalette.push(o)}}),((a=document.querySelector(".resize-container"))==null?void 0:a.style.display)==="block"&&me()}function va(t,a=!1){let n=document.querySelectorAll(".wplace-color-swatch");n&&n.forEach(i=>{let o=i.classList.contains("unavailable");(!o||a)&&(o||i.classList.toggle("active",t))}),It()}function _a(){let t=document.querySelectorAll(".wplace-color-swatch");t&&t.forEach(a=>{let n=parseInt(a.getAttribute("data-color-id"),10);!isNaN(n)&&n>=32&&a.classList.toggle("active",!1)}),It()}function Na(t){var o,c,r;let a=t.querySelector("#colors-container"),n=t.querySelector("#showAllColorsToggle");if(!a)return;if(!e.availableColors||e.availableColors.length===0){a.innerHTML=`<div class="wplace-colors-placeholder">${s.t("uploadImageFirst")}</div>`;return}function i(g=!1){a.innerHTML="";let l=0,u=0;Object.values(p.COLOR_MAP).filter(b=>b.rgb!==null).forEach(b=>{let{id:y,name:v,rgb:f}=b,m=`${f.r},${f.g},${f.b}`;u++;let T=e.availableColors.some(N=>N.rgb[0]===f.r&&N.rgb[1]===f.g&&N.rgb[2]===f.b);if(!g&&!T)return;T&&l++;let C=s.createElement("div",{className:"wplace-color-item"}),I=s.createElement("button",{className:`wplace-color-swatch ${T?"":"unavailable"}`,title:`${v} (ID: ${y})${T?"":" (Unavailable)"}`,"data-rgb":m,"data-color-id":y});I.style.backgroundColor=`rgb(${f.r}, ${f.g}, ${f.b})`,T?I.classList.add("active"):(I.style.opacity="0.4",I.style.filter="grayscale(50%)",I.disabled=!0);let B=s.createElement("span",{className:"wplace-color-item-name",style:T?"":"color: #888; font-style: italic;"},v+(T?"":" (N/A)"));T&&I.addEventListener("click",()=>{I.classList.toggle("active"),It()}),C.appendChild(I),C.appendChild(B),a.appendChild(C)}),It()}i(!1),n&&n.addEventListener("change",g=>{i(g.target.checked)}),(o=t.querySelector("#selectAllBtn"))==null||o.addEventListener("click",()=>va(!0,n==null?void 0:n.checked)),(c=t.querySelector("#unselectAllBtn"))==null||c.addEventListener("click",()=>va(!1,n==null?void 0:n.checked)),(r=t.querySelector("#unselectPaidBtn"))==null||r.addEventListener("click",()=>_a())}async function jt(){let t=performance.now();if(e.tokenSource==="manual")return console.log("\u{1F3AF} Manual token source selected - using pixel placement automation"),await At();try{let{sitekey:a,token:n}=await s.obtainSitekeyAndToken();if(!a)throw new Error("No valid sitekey found");console.log("\u{1F511} Generating Turnstile token for sitekey:",a),console.log("\u{1F9ED} UA:",navigator.userAgent.substring(0,50)+"...","Platform:",navigator.platform),window.turnstile||await s.loadTurnstile();let i=null;if(n&&typeof n=="string"&&n.length>20?(console.log("\u267B\uFE0F Reusing pre-generated token from sitekey detection phase"),i=n):rt()?(console.log("\u267B\uFE0F Using existing cached token (from previous operation)"),i=fe):(console.log("\u{1F510} No valid pre-generated or cached token, creating new one..."),i=await s.executeTurnstile(a,"paint"),i&&at(i)),console.log(`\u{1F50D} Token received - Type: ${typeof i}, Value: ${i?typeof i=="string"?i.length>50?i.substring(0,50)+"...":i:JSON.stringify(i):"null/undefined"}, Length: ${(i==null?void 0:i.length)||0}`),typeof i=="string"&&i.length>20){let o=Math.round(performance.now()-t);return console.log(`\u2705 Turnstile token generated successfully in ${o}ms`),i}else throw new Error(`Invalid or empty token received - Type: ${typeof i}, Value: ${JSON.stringify(i)}, Length: ${(i==null?void 0:i.length)||0}`)}catch(a){let n=Math.round(performance.now()-t);if(console.error(`\u274C Turnstile token generation failed after ${n}ms:`,a),e.tokenSource==="hybrid")return console.log("\u{1F504} Hybrid mode: Generator failed, automatically switching to manual pixel placement..."),await At();throw a}}async function At(){return new Promise(async(t,a)=>{try{Re||(lt=new Promise(o=>{Re=o}));let n=s.sleep(2e4).then(()=>a(new Error("Auto-CAPTCHA timed out."))),i=(async()=>{let o=await s.waitForSelector("button.btn.btn-primary.btn-lg, button.btn-primary.sm\\:btn-xl",200,1e4);if(!o)throw new Error("Could not find the main paint button.");o.click(),await s.sleep(500);let c=await s.waitForSelector("button#color-0",200,5e3);if(!c)throw new Error("Could not find the transparent color button.");c.click(),await s.sleep(500);let r=await s.waitForSelector("canvas",200,5e3);if(!r)throw new Error("Could not find the canvas element.");r.setAttribute("tabindex","0"),r.focus();let g=r.getBoundingClientRect(),l=Math.round(g.left+g.width/2),u=Math.round(g.top+g.height/2);r.dispatchEvent(new MouseEvent("mousemove",{clientX:l,clientY:u,bubbles:!0})),r.dispatchEvent(new KeyboardEvent("keydown",{key:" ",code:"Space",bubbles:!0})),await s.sleep(50),r.dispatchEvent(new KeyboardEvent("keyup",{key:" ",code:"Space",bubbles:!0})),await s.sleep(500),await s.sleep(800),(async()=>{for(;!fe;){let y=await s.waitForSelector("button.btn.btn-primary.btn-lg, button.btn.btn-primary.sm\\:btn-xl");if(!y){let v=Array.from(document.querySelectorAll("button.btn-primary"));y=v.length?v[v.length-1]:null}y&&y.click(),await s.sleep(500)}})();let b=await lt;await s.sleep(300),t(b)})();await Promise.race([i,n])}catch(n){console.error("Auto-CAPTCHA process failed:",n),a(n)}})}async function Ha(){let t=document.getElementById("wplace-image-bot-container"),a=document.getElementById("wplace-stats-container"),n=document.getElementById("wplace-settings-container"),i=document.querySelector(".resize-container"),o=document.querySelector(".resize-overlay");t&&t.remove(),a&&a.remove(),n&&n.remove(),i&&i.remove(),o&&o.remove(),await La(),pa();function c(w,A={}){if(Array.from(document.head.querySelectorAll("link")).some(j=>j.href===w))return;let O=document.createElement("link");O.rel="stylesheet",O.href=w;for(let[j,Y]of Object.entries(A))O.setAttribute(j,Y);document.head.appendChild(O)}c("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css"),c("https://wplace-autobot.github.io/WPlace-AutoBOT/main/auto-image-styles.css",{"data-wplace-theme":"true"});let r=document.createElement("div");r.id="wplace-image-bot-container",r.innerHTML=`
      <div class="wplace-header">
        <div class="wplace-header-title">
          <i class="fas fa-image"></i>
          <span>${s.t("title")}</span>
        </div>
        <div class="wplace-header-controls">
          <button id="settingsBtn" class="wplace-header-btn" title="${s.t("settings")}">
            <i class="fas fa-cog"></i>
          </button>
          <button id="statsBtn" class="wplace-header-btn" title="${s.t("showStats")}">
            <i class="fas fa-chart-bar"></i>
          </button>
          <button id="compactBtn" class="wplace-header-btn" title="${s.t("compactMode")}">
            <i class="fas fa-compress"></i>
          </button>
          <button id="minimizeBtn" class="wplace-header-btn" title="${s.t("minimize")}">
            <i class="fas fa-minus"></i>
          </button>
        </div>
      </div>
      <div class="wplace-content">
        <!-- Status Section - Always visible -->
        <div class="wplace-status-section">
          <div id="statusText" class="wplace-status status-default">
            ${s.t("initMessage")}
          </div>
          <div class="wplace-progress">
            <div id="progressBar" class="wplace-progress-bar" style="width: 0%"></div>
          </div>
        </div>

        <!-- Image Section -->
        <div class="wplace-section">
          <div class="wplace-section-title">\u{1F5BC}\uFE0F Image Management</div>
          <div class="wplace-controls">
            <div class="wplace-row">
              <button id="uploadBtn" class="wplace-btn wplace-btn-upload" disabled title="${s.t("waitingSetupComplete")}">
                <i class="fas fa-upload"></i>
                <span>${s.t("uploadImage")}</span>
              </button>
              <button id="resizeBtn" class="wplace-btn wplace-btn-primary" disabled>
                <i class="fas fa-expand"></i>
                <span>${s.t("resizeImage")}</span>
              </button>
            </div>
            <div class="wplace-row single">
              <button id="selectPosBtn" class="wplace-btn wplace-btn-select" disabled>
                <i class="fas fa-crosshairs"></i>
                <span>${s.t("selectPosition")}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Control Section -->
        <div class="wplace-section">
          <div class="wplace-section-title">\u{1F3AE} Painting Control</div>
          <div class="wplace-controls">
            <div class="wplace-row">
              <button id="startBtn" class="wplace-btn wplace-btn-start" disabled>
                <i class="fas fa-play"></i>
                <span>${s.t("startPainting")}</span>
              </button>
              <button id="stopBtn" class="wplace-btn wplace-btn-stop" disabled>
                <i class="fas fa-stop"></i>
                <span>${s.t("stopPainting")}</span>
              </button>
            </div>
            <div class="wplace-row single">
                <button id="toggleOverlayBtn" class="wplace-btn wplace-btn-overlay" disabled>
                    <i class="fas fa-eye"></i>
                    <span>${s.t("toggleOverlay")}</span>
                </button>
            </div>
          </div>
        </div>

        <!-- Cooldown Section -->
        <div class="wplace-section">
            <div class="wplace-section-title">\u23F1\uFE0F ${s.t("cooldownSettings")}</div>
            <div class="wplace-cooldown-control">
                <label id="cooldownLabel">${s.t("waitCharges")}:</label>
                <div class="wplace-dual-control-compact">
                    <div class="wplace-slider-container-compact">
                        <input type="range" id="cooldownSlider" class="wplace-slider" min="1" max="1" value="${e.cooldownChargeThreshold}">
                    </div>
                    <div class="wplace-input-group-compact">
                        <button id="cooldownDecrease" class="wplace-input-btn-compact" type="button">-</button>
                        <input type="number" id="cooldownInput" class="wplace-number-input-compact" min="1" max="999" value="${e.cooldownChargeThreshold}">
                        <button id="cooldownIncrease" class="wplace-input-btn-compact" type="button">+</button>
                        <span id="cooldownValue" class="wplace-input-label-compact">${s.t("charges")}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Data Section -->
        <div class="wplace-section">
          <div class="wplace-section-title">\u{1F4BE} Data Management</div>
          <div class="wplace-controls">
            <div class="wplace-row">
              <button id="saveBtn" class="wplace-btn wplace-btn-primary" disabled>
                <i class="fas fa-save"></i>
                <span>${s.t("saveData")}</span>
              </button>
              <button id="loadBtn" class="wplace-btn wplace-btn-primary" disabled title="${s.t("waitingTokenGenerator")}">
                <i class="fas fa-folder-open"></i>
                <span>${s.t("loadData")}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;let g=document.createElement("div");g.id="wplace-stats-container",g.style.display="none",g.innerHTML=`
      <div class="wplace-header">
        <div class="wplace-header-title">
          <i class="fas fa-chart-bar"></i>
          <span>${s.t("paintingStats")}</span>
        </div>
        <div class="wplace-header-controls">
          <button id="refreshChargesBtn" class="wplace-header-btn" title="${s.t("refreshCharges")}">
            <i class="fas fa-sync"></i>
          </button>
          <button id="closeStatsBtn" class="wplace-header-btn" title="${s.t("closeStats")}">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
      <div class="wplace-content">
        <div class="wplace-stats">
          <div id="statsArea">
            <div class="wplace-stat-item">
              <div class="wplace-stat-label"><i class="fas fa-info-circle"></i> ${s.t("initMessage")}</div>
            </div>
          </div>
        </div>
      </div>
    `;let l=document.createElement("div");l.id="wplace-settings-container";let u=`linear-gradient(135deg, ${p.THEME.primary} 0%, ${p.THEME.secondary||p.THEME.primary} 100%)`;l.className="wplace-settings-container-base",l.style.background=u,l.style.cssText+=`
      min-width: 420px;
      max-width: 480px;
      z-index: 99999;
      color: ${p.THEME.text};
      font-family: ${p.THEME.fontFamily};
      box-shadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)';
      backdrop-filter: ${p.THEME.backdropFilter};
      overflow: hidden;
      animation: settings-slide-in 0.4s ease-out;
    `,l.innerHTML=`
      <div class="wplace-settings-header">
        <div class="wplace-settings-title-wrapper">
          <h3 class="wplace-settings-title">
            <i class="fas fa-cog wplace-settings-icon"></i>
            ${s.t("settings")}
          </h3>
          <button id="closeSettingsBtn" class="wplace-settings-close-btn">\u2715</button>
        </div>
      </div>

      <div class="wplace-settings-content">
        
        <!-- Token Source Selection -->
        <div class="wplace-settings-section">
          <label class="wplace-settings-section-label">
            <i class="fas fa-key wplace-icon-key"></i>
            Token Source
          </label>
          <div class="wplace-settings-section-wrapper">
            <select id="tokenSourceSelect" class="wplace-settings-select">
              <option value="generator" ${e.tokenSource==="generator"?"selected":""} class="wplace-settings-option">\u{1F916} Automatic Token Generator (Recommended)</option>
              <option value="hybrid" ${e.tokenSource==="hybrid"?"selected":""} class="wplace-settings-option">\u{1F504} Generator + Auto Fallback</option>
              <option value="manual" ${e.tokenSource==="manual"?"selected":""} class="wplace-settings-option">\u{1F3AF} Manual Pixel Placement</option>
            </select>
            <p class="wplace-settings-description">
              Generator mode creates tokens automatically. Hybrid mode falls back to manual when generator fails. Manual mode only uses pixel placement.
            </p>
          </div>
        </div>

        <!-- Automation Section -->
        <div class="wplace-settings-section">
          <label class="wplace-settings-section-label">
            <i class="fas fa-robot wplace-icon-robot"></i>
            ${s.t("automation")}
          </label>
          <!-- Token generator is always enabled - settings moved to Token Source above -->
        </div>

        <!-- Overlay Settings Section -->
        <div class="wplace-settings-section">
          <label class="wplace-settings-section-label" style="color: ${p.THEME.text||"white"};">
            <i class="fas fa-eye wplace-icon-eye" style="color: ${p.THEME.highlight||"#48dbfb"};"></i>
            Overlay Settings
          </label>
          <div class="wplace-settings-section-wrapper wplace-overlay-wrapper" style="
            background: ${p.THEME.accent?`${p.THEME.accent}20`:"rgba(255,255,255,0.1)"}; 
            border-radius: ${p.THEME.borderRadius||"12px"}; 
            padding: 18px; 
            border: 1px solid ${p.THEME.accent||"rgba(255,255,255,0.1)"};
          ">
              <!-- Opacity Slider -->
              <div class="wplace-overlay-opacity-control">
                <div class="wplace-overlay-opacity-header">
                   <span class="wplace-overlay-opacity-label" style="color: ${p.THEME.text||"white"};">Overlay Opacity</span>
                   <div id="overlayOpacityValue" class="wplace-overlay-opacity-value" style="
                     background: ${p.THEME.secondary||"rgba(0,0,0,0.2)"}; 
                     color: ${p.THEME.text||"white"};
                     padding: 4px 8px; 
                     border-radius: ${p.THEME.borderRadius==="0"?"0":"6px"}; 
                     font-size: 12px;
                     border: 1px solid ${p.THEME.accent||"transparent"};
                   ">${Math.round(e.overlayOpacity*100)}%</div>
                </div>
                <input type="range" id="overlayOpacitySlider" min="0.1" max="1" step="0.05" value="${e.overlayOpacity}" class="wplace-overlay-opacity-slider" style="
                  background: linear-gradient(to right, ${p.THEME.highlight||"#48dbfb"} 0%, '#d3a4ff' 100%); 
                  border-radius: ${p.THEME.borderRadius==="0"?"0":"4px"}; 
                ">
              </div>
              <!-- Blue Marble Toggle -->
              <label for="enableBlueMarbleToggle" class="wplace-settings-toggle">
                  <div>
                      <span class="wplace-settings-toggle-title" style="color: ${p.THEME.text||"white"};">Blue Marble Effect</span>
                      <p class="wplace-settings-toggle-description" style="color: ${p.THEME.text?`${p.THEME.text}BB`:"rgba(255,255,255,0.7)"};">Renders a dithered "shredded" overlay.</p>
                  </div>
                  <input type="checkbox" id="enableBlueMarbleToggle" ${e.blueMarbleEnabled?"checked":""} class="wplace-settings-checkbox" style="
                    accent-color: ${p.THEME.highlight||"#48dbfb"};
                  "/>
              </label>
          </div>
        </div>

        <!-- Paint Options Section -->
        <div class="wplace-settings-section">
          <label class="wplace-settings-section-label">
            <i class="fas fa-paint-brush wplace-icon-paint"></i>
            ${s.t("paintOptions")}
          </label>
          <!-- Pixel Filter Toggles -->
          <div id="pixelFilterControls" class="wplace-settings-section-wrapper wplace-pixel-filter-controls">
            <!-- Paint White Pixels -->
            <label class="wplace-settings-toggle">
              <div>
                <span class="wplace-settings-toggle-title" style="color: ${p.THEME.text||"white"};">
                  ${s.t("paintWhitePixels")}
                </span>
                <p class="wplace-settings-toggle-description" style="color: ${p.THEME.text?`${p.THEME.text}BB`:"rgba(255,255,255,0.7)"};">
                  ${s.t("paintWhitePixelsDescription")}
                </p>
              </div>
              <input type="checkbox" id="settingsPaintWhiteToggle" ${e.paintWhitePixels?"checked":""} 
                class="wplace-settings-checkbox"
                style="accent-color: ${p.THEME.highlight||"#48dbfb"};"/>
            </label>
            
            <!-- Paint Transparent Pixels -->
            <label class="wplace-settings-toggle">
              <div>
                <span class="wplace-settings-toggle-title" style="color: ${p.THEME.text||"white"};">
                  ${s.t("paintTransparentPixels")}
                </span>
                <p class="wplace-settings-toggle-description" style="color: ${p.THEME.text?`${p.THEME.text}BB`:"rgba(255,255,255,0.7)"};">
                  ${s.t("paintTransparentPixelsDescription")}
                </p>
              </div>
              <input type="checkbox" id="settingsPaintTransparentToggle" ${e.paintTransparentPixels?"checked":""} 
                class="wplace-settings-checkbox"
                style="accent-color: ${p.THEME.highlight||"#48dbfb"};"/>
            </label>
            <label class="wplace-settings-toggle">
              <div>
                <span class="wplace-settings-toggle-title" style="color: ${p.THEME.text||"white"};">${s.t("paintUnavailablePixels")}</span>
                <p class="wplace-settings-toggle-description" style="color: ${p.THEME.text?`${p.THEME.text}BB`:"rgba(255,255,255,0.7)"};">${s.t("paintUnavailablePixelsDescription")}</p>
              </div>
              <input type="checkbox" id="paintUnavailablePixelsToggle" ${e.paintUnavailablePixels?"checked":""} class="wplace-settings-checkbox" style="
                    accent-color: ${p.THEME.highlight||"#48dbfb"};
                  "/>
            </label>
          </div>
        </div>

        <!-- Speed Control Section -->
        <div class="wplace-settings-section">
          <label class="wplace-settings-section-label">
            <i class="fas fa-tachometer-alt wplace-icon-speed"></i>
            ${s.t("paintingSpeed")}
          </label>
          
          <!-- Batch Mode Selection -->
          <div class="wplace-mode-selection">
            <label class="wplace-mode-label">
              <i class="fas fa-dice wplace-icon-dice"></i>
              Batch Mode
            </label>
            <select id="batchModeSelect" class="wplace-settings-select">
              <option value="normal" class="wplace-settings-option">\u{1F4E6} Normal (Fixed Size)</option>
              <option value="random" class="wplace-settings-option">\u{1F3B2} Random (Range)</option>
            </select>
          </div>
          
          <!-- Normal Mode: Fixed Size Controls -->
          <div id="normalBatchControls" class="wplace-batch-controls wplace-normal-batch-controls">
            <div class="wplace-batch-size-header">
              <span class="wplace-batch-size-label">${s.t("batchSize")}</span>
            </div>
            <div class="wplace-dual-control-compact">
                <div class="wplace-speed-slider-container-compact">
                  <input type="range" id="speedSlider" min="${p.PAINTING_SPEED.MIN}" max="${p.PAINTING_SPEED.MAX}" value="${p.PAINTING_SPEED.DEFAULT}" class="wplace-speed-slider">
                </div>
                <div class="wplace-speed-input-container-compact">
                  <div class="wplace-input-group-compact">
                    <button id="speedDecrease" class="wplace-input-btn-compact" type="button">-</button>
                    <input type="number" id="speedInput" class="wplace-number-input-compact" min="${p.PAINTING_SPEED.MIN}" max="${p.PAINTING_SPEED.MAX}" value="${p.PAINTING_SPEED.DEFAULT}">
                    <button id="speedIncrease" class="wplace-input-btn-compact" type="button">+</button>
                    <span id="speedValue" class="wplace-input-label-compact">pixels</span>
                  </div>
                </div>
            </div>
            <div class="wplace-speed-labels">
              <span class="wplace-speed-min"><i class="fas fa-turtle"></i> ${p.PAINTING_SPEED.MIN}</span>
              <span class="wplace-speed-max"><i class="fas fa-rabbit"></i> ${p.PAINTING_SPEED.MAX}</span>
            </div>
          </div>
          
          <!-- Random Mode: Range Controls -->
          <div id="randomBatchControls" class="wplace-batch-controls wplace-random-batch-controls">
            <div class="wplace-random-batch-grid">
              <div>
                <label class="wplace-random-batch-label">
                  <i class="fas fa-arrow-down wplace-icon-min"></i>
                  Minimum Batch Size
                </label>
                <input type="number" id="randomBatchMin" min="1" max="1000" value="${p.RANDOM_BATCH_RANGE.MIN}" class="wplace-settings-number-input">
              </div>
              <div>
                <label class="wplace-random-batch-label">
                  <i class="fas fa-arrow-up wplace-icon-max"></i>
                  Maximum Batch Size
                </label>
                <input type="number" id="randomBatchMax" min="1" max="1000" value="${p.RANDOM_BATCH_RANGE.MAX}" class="wplace-settings-number-input">
              </div>
            </div>
            <p class="wplace-random-batch-description">
              \u{1F3B2} Random batch size between min and max values
            </p>
          </div>
          
          <!-- Speed Control Toggle -->
          <label class="wplace-speed-control-toggle">
            <input type="checkbox" id="enableSpeedToggle" ${p.PAINTING_SPEED_ENABLED?"checked":""} class="wplace-speed-checkbox"/>
            <span>${s.t("enablePaintingSpeedLimit")}</span>
          </label>
        </div>
        
        <!-- Coordinate Generation Section -->
        <div class="wplace-settings-section">
          <label class="wplace-settings-section-label">
            <i class="fas fa-route wplace-icon-route"></i>
            Coordinate Generation
          </label>
          
          <!-- Mode Selection -->
          <div class="wplace-mode-selection">
            <label class="wplace-mode-label">
              <i class="fas fa-th wplace-icon-table"></i>
              Generation Mode
            </label>
            <select id="coordinateModeSelect" class="wplace-settings-select">
              <option value="rows" class="wplace-settings-option">\u{1F4CF} Rows (Horizontal Lines)</option>
              <option value="columns" class="wplace-settings-option">\u{1F4D0} Columns (Vertical Lines)</option>
              <option value="circle-out" class="wplace-settings-option">\u2B55 Circle Out (Center \u2192 Edges)</option>
              <option value="circle-in" class="wplace-settings-option">\u2B55 Circle In (Edges \u2192 Center)</option>
              <option value="blocks" class="wplace-settings-option">\u{1F7EB} Blocks (Ordered)</option>
              <option value="shuffle-blocks" class="wplace-settings-option">\u{1F3B2} Shuffle Blocks (Random)</option>
            </select>
          </div>
          
          <!-- Direction Selection (only for rows/columns) -->
          <div id="directionControls" class="wplace-mode-selection">
            <label class="wplace-mode-label">
              <i class="fas fa-compass wplace-icon-compass"></i>
              Starting Direction
            </label>
            <select id="coordinateDirectionSelect" class="wplace-settings-select">
              <option value="top-left" class="wplace-settings-option">\u2196\uFE0F Top-Left</option>
              <option value="top-right" class="wplace-settings-option">\u2197\uFE0F Top-Right</option>
              <option value="bottom-left" class="wplace-settings-option">\u2199\uFE0F Bottom-Left</option>
              <option value="bottom-right" class="wplace-settings-option">\u2198\uFE0F Bottom-Right</option>
            </select>
          </div>
          
          <!-- Snake Pattern Toggle (only for rows/columns) -->
          <div id="snakeControls" class="wplace-snake-pattern-controls wplace-settings-section-wrapper">
            <label class="wplace-settings-toggle">
              <div>
                <span class="wplace-settings-toggle-title" style="color: ${p.THEME.text||"white"};">Snake Pattern</span>
                <p class="wplace-settings-toggle-description" style="color: ${p.THEME.text?`${p.THEME.text}BB`:"rgba(255,255,255,0.7)"};">Alternate direction for each row/column (zigzag pattern)</p>
              </div>
              <input type="checkbox" id="coordinateSnakeToggle" ${e.coordinateSnake?"checked":""} class="wplace-settings-checkbox" style="
                    accent-color: ${p.THEME.highlight||"#48dbfb"};
                  "/>
            </label>
          </div>
          
          <!-- Block Size Controls (only for blocks/shuffle-blocks) -->
          <div id="blockControls" class="wplace-block-size-controls wplace-settings-section-wrapper wplace-shuffle-block-size-controls">
            <div class="wplace-block-size-grid">
              <div>
                <label class="wplace-block-size-label">
                  <i class="fas fa-arrows-alt-h wplace-icon-width"></i>
                  Block Width
                </label>
                <input type="number" id="blockWidthInput" min="1" max="50" value="6" class="wplace-settings-number-input">
              </div>
              <div>
                <label style="display: block; color: rgba(255,255,255,0.8); font-size: 12px; margin-bottom: 8px;">
                  <i class="fas fa-arrows-alt-v wplace-icon-height"></i>
                  Block Height
                </label>
                <input type="number" id="blockHeightInput" min="1" max="50" value="2" class="wplace-settings-number-input">
              </div>
            </div>
            <p class="wplace-block-size-description">
              \u{1F9F1} Block dimensions for block-based generation modes
            </p>
          </div>
        </div>
      </div>

        <div class="wplace-settings-footer">
             <button id="applySettingsBtn" class="wplace-settings-apply-btn">
                 <i class="fas fa-check"></i> ${s.t("applySettings")}
          </button>
        </div>

      <style>
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes settings-slide-in {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @keyframes settings-fade-out {
          from {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          to {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
          }
        }

        #speedSlider::-webkit-slider-thumb, #cooldownSlider::-webkit-slider-thumb, #overlayOpacitySlider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          box-shadow: 0 3px 6px rgba(0,0,0,0.3), 0 0 0 2px #4facfe;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        #speedSlider::-webkit-slider-thumb:hover, #cooldownSlider::-webkit-slider-thumb:hover, #overlayOpacitySlider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 4px 8px rgba(0,0,0,0.4), 0 0 0 3px #4facfe;
        }

        #speedSlider::-moz-range-thumb, #cooldownSlider::-moz-range-thumb, #overlayOpacitySlider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          box-shadow: 0 3px 6px rgba(0,0,0,0.3), 0 0 0 2px #4facfe;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
        }

        .wplace-dragging {
          opacity: 0.9;
          box-shadow: 0 30px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.2);
          transition: none;
        }

        .wplace-settings-header:hover {
          background: rgba(255,255,255,0.15) !important;
        }

        .wplace-settings-header:active {
          background: rgba(255,255,255,0.2) !important;
        }

        /* Custom Scrollbar for Content Area */
        .wplace-content::-webkit-scrollbar {
          width: 6px;
        }

        .wplace-content::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
        }

        .wplace-content::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.3);
          border-radius: 3px;
        }

        .wplace-content::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.5);
        }
      </style>
    `;let d=document.createElement("div");d.className="resize-container",d.innerHTML=`
      <h3 class="resize-dialog-title" style="color: ${p.THEME.text}">${s.t("resizeImage")}</h3>
      <div class="resize-controls">
        <label class="resize-control-label">
          Width: <span id="widthValue">0</span>px
          <input type="range" id="widthSlider" class="resize-slider" min="10" max="500" value="100">
        </label>
        <label class="resize-control-label">
          Height: <span id="heightValue">0</span>px
          <input type="range" id="heightSlider" class="resize-slider" min="10" max="500" value="100">
        </label>
        <label class="resize-checkbox-label">
          <input type="checkbox" id="keepAspect" checked>
          ${s.t("keepAspectRatio")}
        </label>
        <label class="resize-checkbox-label">
            <input type="checkbox" id="paintWhiteToggle" checked>
            ${s.t("paintWhitePixels")}
        </label>
        <label class="resize-checkbox-label">
            <input type="checkbox" id="paintTransparentToggle" checked>
            ${s.t("paintTransparentPixels")}
        </label>
        <div class="resize-zoom-controls">
          <button id="zoomOutBtn" class="wplace-btn resize-zoom-btn" title="${s.t("zoomOut")}"><i class="fas fa-search-minus"></i></button>
          <input type="range" id="zoomSlider" class="resize-slider resize-zoom-slider" min="0.1" max="20" value="1" step="0.05">
          <button id="zoomInBtn" class="wplace-btn resize-zoom-btn" title="${s.t("zoomIn")}"><i class="fas fa-search-plus"></i></button>
          <button id="zoomFitBtn" class="wplace-btn resize-zoom-btn" title="${s.t("fitToView")}">${s.t("fit")}</button>
          <button id="zoomActualBtn" class="wplace-btn resize-zoom-btn" title="${s.t("actualSize")}">${s.t("hundred")}</button>
          <button id="panModeBtn" class="wplace-btn resize-zoom-btn" title="${s.t("panMode")}">
            <i class="fas fa-hand-paper"></i>
          </button>
          <span id="zoomValue" class="resize-zoom-value">100%</span>
          <div id="cameraHelp" class="resize-camera-help">
            Drag to pan \u2022 Pinch to zoom \u2022 Double\u2011tap to zoom
          </div>
        </div>
      </div>

      <div class="resize-preview-wrapper">
          <div id="resizePanStage" class="resize-pan-stage">
            <div id="resizeCanvasStack" class="resize-canvas-stack resize-canvas-positioned">
              <canvas id="resizeCanvas" class="resize-base-canvas"></canvas>
              <canvas id="maskCanvas" class="resize-mask-canvas"></canvas>
            </div>
          </div>
      </div>
      <div class="resize-tools">
        <div class="resize-tools-container">
          <div class="resize-brush-controls">
              <div class="resize-brush-control">
                <label class="resize-tool-label">Brush</label>
                <div class="resize-tool-input-group">
                  <input id="maskBrushSize" type="range" min="1" max="7" step="1" value="1" class="resize-tool-slider">
                  <span id="maskBrushSizeValue" class="resize-tool-value">1</span>
                </div>
              </div>
            <div class="resize-brush-control">
              <label class="resize-tool-label">Row/col size</label>
              <div class="resize-tool-input-group">
                <input id="rowColSize" type="range" min="1" max="7" step="1" value="1" class="resize-tool-slider">
                <span id="rowColSizeValue" class="resize-tool-value">1</span>
              </div>
            </div>
          </div>
          <div class="resize-mode-controls">
            <label class="resize-tool-label">Mode</label>
            <div class="mask-mode-group resize-mode-group">
              <button id="maskModeIgnore" class="wplace-btn resize-mode-btn">Ignore</button>
              <button id="maskModeUnignore" class="wplace-btn resize-mode-btn">Unignore</button>
              <button id="maskModeToggle" class="wplace-btn wplace-btn-primary resize-mode-btn">Toggle</button>
            </div>
          </div>
          <button id="clearIgnoredBtn" class="wplace-btn resize-clear-btn" title="Clear all ignored pixels">Clear</button>
          <button id="invertMaskBtn" class="wplace-btn resize-invert-btn" title="Invert mask">Invert</button>
          <span class="resize-shortcut-help">Shift = Row \u2022 Alt = Column</span>
        </div>
      </div>

      <div class="wplace-section resize-color-palette-section" id="color-palette-section">
          <div class="wplace-section-title">
              <i class="fas fa-palette"></i>&nbsp;Color Palette
          </div>
          <div class="wplace-controls">
              <div class="wplace-row single">
                  <label class="resize-color-toggle-label">
                      <input type="checkbox" id="showAllColorsToggle" class="resize-color-checkbox">
                      <span>${s.t("showAllColorsIncluding")}</span>
                  </label>
              </div>
              <div class="wplace-row" style="display: flex;">
                  <button id="selectAllBtn" class="wplace-btn" style="flex: 1;">Select All</button>
                  <button id="unselectAllBtn" class="wplace-btn" style="flex: 1;">Unselect All</button>
                  <button id="unselectPaidBtn" class="wplace-btn">Unselect Paid</button>
              </div>
              <div id="colors-container" class="wplace-color-grid"></div>
          </div>
      </div>

      <div class="wplace-section resize-advanced-color-section" id="advanced-color-section">
        <div class="wplace-section-title">
          <i class="fas fa-flask"></i>&nbsp;Advanced Color Matching
        </div>
        <div class="resize-advanced-controls">
          <label class="resize-advanced-label">
            <span class="resize-advanced-label-text">Algorithm</span>
            <select id="colorAlgorithmSelect" class="resize-advanced-select">
              <option value="lab" ${e.colorMatchingAlgorithm==="lab"?"selected":""}>Perceptual (Lab)</option>
            <option value="legacy" ${e.colorMatchingAlgorithm==="legacy"?"selected":""}>Legacy (RGB)</option>
            </select>
          </label>
          <label class="resize-advanced-toggle">
            <div class="resize-advanced-toggle-content">
              <span class="resize-advanced-label-text">Chroma Penalty</span>
              <div class="resize-advanced-description">Preserve vivid colors (Lab only)</div>
            </div>
            <input type="checkbox" id="enableChromaPenaltyToggle" ${e.enableChromaPenalty?"checked":""} class="resize-advanced-checkbox" />
          </label>
          <div class="resize-chroma-weight-control">
            <div class="resize-chroma-weight-header">
              <span>${s.t("chromaWeight")}</span>
              <span id="chromaWeightValue" class="resize-chroma-weight-value">${e.chromaPenaltyWeight}</span>
            </div>
            <input type="range" id="chromaPenaltyWeightSlider" min="0" max="0.5" step="0.01" value="${e.chromaPenaltyWeight}" class="resize-chroma-weight-slider" />
          </div>
          <label class="resize-advanced-toggle">
            <div class="resize-advanced-toggle-content">
              <span class="resize-advanced-label-text">Enable Dithering</span>
              <div class="resize-advanced-description">Floyd\u2013Steinberg error diffusion in preview and applied output</div>
            </div>
            <input type="checkbox" id="enableDitheringToggle" ${e.ditheringEnabled?"checked":""} class="resize-advanced-checkbox" />
          </label>
          <div class="resize-threshold-controls">
            <label class="resize-threshold-label">
              <span class="resize-advanced-label-text">Transparency</span>
              <input type="number" id="transparencyThresholdInput" min="0" max="255" value="${e.customTransparencyThreshold}" class="resize-threshold-input" />
            </label>
            <label class="resize-threshold-label">
              <span class="resize-advanced-label-text">White Thresh</span>
              <input type="number" id="whiteThresholdInput" min="200" max="255" value="${e.customWhiteThreshold}" class="resize-threshold-input" />
            </label>
          </div>
          <button id="resetAdvancedColorBtn" class="wplace-btn resize-reset-advanced-btn">Reset Advanced</button>
        </div>
      </div>

      <div class="resize-buttons">
        <button id="downloadPreviewBtn" class="wplace-btn wplace-btn-primary">
          <i class="fas fa-download"></i>
          <span>${s.t("downloadPreview")}</span>
        </button>
        <button id="confirmResize" class="wplace-btn wplace-btn-start">
          <i class="fas fa-check"></i>
          <span>${s.t("apply")}</span>
        </button>
        <button id="cancelResize" class="wplace-btn wplace-btn-stop">
          <i class="fas fa-times"></i>
          <span>${s.t("cancel")}</span>
        </button>
      </div>
    `;let b=document.createElement("div");b.className="resize-overlay",document.body.appendChild(r),document.body.appendChild(b),document.body.appendChild(d),document.body.appendChild(g),document.body.appendChild(l),r.style.display="block";let y=r.querySelector("#uploadBtn"),v=r.querySelector("#resizeBtn"),f=r.querySelector("#selectPosBtn"),m=r.querySelector("#startBtn"),T=r.querySelector("#stopBtn"),C=r.querySelector("#saveBtn"),I=r.querySelector("#loadBtn");r.querySelectorAll(".wplace-section-title").forEach(w=>{if(!w.querySelector("i.arrow")){let A=document.createElement("i");A.className="fas fa-chevron-down arrow",w.appendChild(A)}w.addEventListener("click",()=>{w.parentElement.classList.toggle("collapsed")})}),I&&(I.disabled=!e.initialSetupComplete,I.title=e.initialSetupComplete?"":"\u{1F504} Waiting for initial setup to complete..."),y&&(y.disabled=!e.initialSetupComplete,y.title=e.initialSetupComplete?"":"\u{1F504} Waiting for initial setup to complete...");let B=r.querySelector("#minimizeBtn"),N=r.querySelector("#compactBtn"),M=r.querySelector("#statsBtn"),X=r.querySelector("#toggleOverlayBtn"),pe=r.querySelector("#statusText"),Oe=r.querySelector("#progressBar"),ce=g.querySelector("#statsArea"),be=r.querySelector(".wplace-content"),Ie=g.querySelector("#closeStatsBtn"),_e=g.querySelector("#refreshChargesBtn"),We=r.querySelector("#cooldownSlider"),Ne=r.querySelector("#cooldownInput"),gt=r.querySelector("#cooldownDecrease"),ut=r.querySelector("#cooldownIncrease"),pt=r.querySelector("#cooldownValue");(!y||!f||!m||!T)&&console.error("Some UI elements not found:",{uploadBtn:!!y,selectPosBtn:!!f,startBtn:!!m,stopBtn:!!T}),nt(r);function nt(w){let A=0,z=0,O=0,j=0,Y=!1,oe=w.querySelector(".wplace-header")||w.querySelector(".wplace-settings-header");if(!oe){console.warn("No draggable header found for element:",w);return}oe.onmousedown=ue;function ue(Q){if(Q.target.closest(".wplace-header-btn")||Q.target.closest("button"))return;Q.preventDefault(),Y=!0;let U=w.getBoundingClientRect();w.style.transform="none",w.style.top=U.top+"px",w.style.left=U.left+"px",O=Q.clientX,j=Q.clientY,w.classList.add("wplace-dragging"),document.onmouseup=ne,document.onmousemove=ae,document.body.style.userSelect="none"}function ae(Q){if(!Y)return;Q.preventDefault(),A=O-Q.clientX,z=j-Q.clientY,O=Q.clientX,j=Q.clientY;let U=w.offsetTop-z,le=w.offsetLeft-A,ye=w.getBoundingClientRect(),De=window.innerHeight-ye.height,ge=window.innerWidth-ye.width;U=Math.max(0,Math.min(U,De)),le=Math.max(0,Math.min(le,ge)),w.style.top=U+"px",w.style.left=le+"px"}function ne(){Y=!1,w.classList.remove("wplace-dragging"),document.onmouseup=null,document.onmousemove=null,document.body.style.userSelect=""}}nt(g),nt(r),M&&Ie&&(M.addEventListener("click",()=>{g.style.display!=="none"?(g.style.display="none",M.innerHTML='<i class="fas fa-chart-bar"></i>',M.title=s.t("showStats")):(g.style.display="block",M.innerHTML='<i class="fas fa-chart-line"></i>',M.title=s.t("hideStats"))}),Ie.addEventListener("click",()=>{g.style.display="none",M.innerHTML='<i class="fas fa-chart-bar"></i>',M.title=s.t("showStats")}),_e&&_e.addEventListener("click",async()=>{_e.innerHTML='<i class="fas fa-spinner fa-spin"></i>',_e.disabled=!0;try{await Fe(!0)}catch(w){console.error("Error refreshing charges:",w)}finally{_e.innerHTML='<i class="fas fa-sync"></i>',_e.disabled=!1}})),g&&M&&(M.innerHTML='<i class="fas fa-chart-bar"></i>',M.title=s.t("showStats"));let ht=r.querySelector("#settingsBtn"),ct=l.querySelector("#closeSettingsBtn"),dt=l.querySelector("#applySettingsBtn");if(ht&&ct&&dt){ht.addEventListener("click",()=>{l.classList.contains("show")?(l.style.animation="settings-fade-out 0.3s ease-out forwards",l.classList.remove("show"),setTimeout(()=>{l.style.animation=""},300)):(l.style.top="50%",l.style.left="50%",l.style.transform="translate(-50%, -50%)",l.classList.add("show"),l.style.animation="settings-slide-in 0.4s ease-out")}),ct.addEventListener("click",()=>{l.style.animation="settings-fade-out 0.3s ease-out forwards",l.classList.remove("show"),setTimeout(()=>{l.style.animation="",l.style.top="50%",l.style.left="50%",l.style.transform="translate(-50%, -50%)"},300)}),dt.addEventListener("click",()=>{let S=document.getElementById("colorAlgorithmSelect");S&&(e.colorMatchingAlgorithm=S.value);let L=document.getElementById("enableChromaPenaltyToggle");L&&(e.enableChromaPenalty=L.checked);let ve=document.getElementById("chromaPenaltyWeightSlider");ve&&(e.chromaPenaltyWeight=parseFloat(ve.value)||.15);let Ke=document.getElementById("transparencyThresholdInput");if(Ke){let Ae=parseInt(Ke.value,10);!isNaN(Ae)&&Ae>=0&&Ae<=255&&(e.customTransparencyThreshold=Ae)}let $t=document.getElementById("whiteThresholdInput");if($t){let Ae=parseInt($t.value,10);!isNaN(Ae)&&Ae>=200&&Ae<=255&&(e.customWhiteThreshold=Ae)}p.TRANSPARENCY_THRESHOLD=e.customTransparencyThreshold,p.WHITE_THRESHOLD=e.customWhiteThreshold,G(),s.showAlert(s.t("settingsSaved"),"success"),ct.click()}),nt(l);let w=l.querySelector("#tokenSourceSelect");w&&w.addEventListener("change",S=>{e.tokenSource=S.target.value,G(),console.log(`\u{1F511} Token source changed to: ${e.tokenSource}`);let L={generator:"Automatic Generator",hybrid:"Generator + Auto Fallback",manual:"Manual Pixel Placement"};s.showAlert(s.t("tokenSourceSet",{source:L[e.tokenSource]}),"success")});let A=l.querySelector("#batchModeSelect"),z=l.querySelector("#normalBatchControls"),O=l.querySelector("#randomBatchControls"),j=l.querySelector("#randomBatchMin"),Y=l.querySelector("#randomBatchMax");A&&A.addEventListener("change",S=>{e.batchMode=S.target.value,z&&O&&(S.target.value==="random"?(z.style.display="none",O.style.display="block"):(z.style.display="block",O.style.display="none")),G(),console.log(`\u{1F4E6} Batch mode changed to: ${e.batchMode}`),s.showAlert(s.t("batchModeSet",{mode:e.batchMode==="random"?s.t("randomRange"):s.t("normalFixedSize")}),"success")}),j&&j.addEventListener("input",S=>{let L=parseInt(S.target.value);L>=1&&L<=1e3&&(e.randomBatchMin=L,Y&&L>e.randomBatchMax&&(e.randomBatchMax=L,Y.value=L),G())}),Y&&Y.addEventListener("input",S=>{let L=parseInt(S.target.value);L>=1&&L<=1e3&&(e.randomBatchMax=L,j&&L<e.randomBatchMin&&(e.randomBatchMin=L,j.value=L),G())});let oe=l.querySelector("#overlayOpacitySlider"),ue=l.querySelector("#overlayOpacityValue"),ae=l.querySelector("#enableBlueMarbleToggle"),ne=l.querySelector("#settingsPaintWhiteToggle"),Q=l.querySelector("#settingsPaintTransparentToggle");if(oe&&ue){let S=L=>{let ve=parseFloat(L);e.overlayOpacity=ve,oe.value=ve,ue.textContent=`${Math.round(ve*100)}%`};oe.addEventListener("input",L=>{S(L.target.value)}),s.createScrollToAdjust(oe,S,0,1,.05)}ne&&(ne.checked=e.paintWhitePixels,ne.addEventListener("change",S=>{e.paintWhitePixels=S.target.checked,G(),console.log(`\u{1F3A8} Paint white pixels: ${e.paintWhitePixels?"ON":"OFF"}`);let L=e.paintWhitePixels?"White pixels in the template will be painted":"White pixels will be skipped";s.showAlert(L,"success")})),Q&&(Q.checked=e.paintTransparentPixels,Q.addEventListener("change",S=>{e.paintTransparentPixels=S.target.checked,G(),console.log(`\u{1F3A8} Paint transparent pixels: ${e.paintTransparentPixels?"ON":"OFF"}`);let L=e.paintTransparentPixels?"Transparent pixels in the template will be painted with the closest available color":"Transparent pixels will be skipped";s.showAlert(L,"success")}));let U=l.querySelector("#speedSlider"),le=l.querySelector("#speedInput"),ye=l.querySelector("#speedDecrease"),De=l.querySelector("#speedIncrease"),ge=l.querySelector("#speedValue");if(U&&le&&ge&&ye&&De){let S=L=>{let ve=Math.max(p.PAINTING_SPEED.MIN,Math.min(p.PAINTING_SPEED.MAX,parseInt(L)));e.paintingSpeed=ve,U.value=ve,le.value=ve,ge.textContent="pixels",G()};U.addEventListener("input",L=>{S(L.target.value)}),le.addEventListener("input",L=>{S(L.target.value)}),ye.addEventListener("click",()=>{S(parseInt(le.value)-1)}),De.addEventListener("click",()=>{S(parseInt(le.value)+1)}),s.createScrollToAdjust(U,S,p.PAINTING_SPEED.MIN,p.PAINTING_SPEED.MAX,1)}ae&&ae.addEventListener("click",async()=>{e.blueMarbleEnabled=ae.checked,e.imageLoaded&&Se.imageBitmap&&(s.showAlert(s.t("reprocessingOverlay"),"info"),await Se.processImageIntoChunks(),s.showAlert(s.t("overlayUpdated"),"success"))})}let we=d.querySelector("#widthSlider"),xe=d.querySelector("#heightSlider"),mt=d.querySelector("#widthValue"),ft=d.querySelector("#heightValue"),bt=d.querySelector("#keepAspect"),wt=d.querySelector("#paintWhiteToggle"),yt=d.querySelector("#paintTransparentToggle"),Be=d.querySelector("#zoomSlider"),it=d.querySelector("#zoomValue"),Ge=d.querySelector("#zoomInBtn"),Ye=d.querySelector("#zoomOutBtn"),vt=d.querySelector("#zoomFitBtn"),Tt=d.querySelector("#zoomActualBtn"),Xe=d.querySelector("#panModeBtn"),se=d.querySelector("#resizePanStage"),Ve=d.querySelector("#resizeCanvasStack"),W=d.querySelector("#resizeCanvas"),de=d.querySelector("#maskCanvas"),$e=W.getContext("2d"),je=de.getContext("2d"),Va=d.querySelector("#confirmResize"),ja=d.querySelector("#cancelResize"),Ka=d.querySelector("#downloadPreviewBtn"),fn=d.querySelector("#clearIgnoredBtn"),Jt=l.querySelector("#coordinateModeSelect"),Zt=l.querySelector("#coordinateDirectionSelect"),Qt=l.querySelector("#coordinateSnakeToggle"),Ja=l.querySelector("#directionControls"),Za=l.querySelector("#snakeControls"),Qa=l.querySelector("#blockControls"),ea=l.querySelector("#blockWidthInput"),ta=l.querySelector("#blockHeightInput"),aa=l.querySelector("#paintUnavailablePixelsToggle");aa&&(aa.checked=e.paintUnavailablePixels,aa.addEventListener("change",w=>{e.paintUnavailablePixels=w.target.checked,G(),console.log(`\u{1F3A8} Paint unavailable colors: ${e.paintUnavailablePixels?"ON":"OFF"}`);let A=e.paintUnavailablePixels?"Unavailable template colors will be painted with the closest available color":"Unavailable template colors will be skipped";s.showAlert(A,"success")})),Jt&&(Jt.value=e.coordinateMode,Jt.addEventListener("change",w=>{e.coordinateMode=w.target.value,s.updateCoordinateUI({mode:e.coordinateMode,directionControls:Ja,snakeControls:Za,blockControls:Qa}),G(),console.log(`\u{1F504} Coordinate mode changed to: ${e.coordinateMode}`),s.showAlert(`Coordinate mode set to: ${e.coordinateMode}`,"success")})),Zt&&(Zt.value=e.coordinateDirection,Zt.addEventListener("change",w=>{e.coordinateDirection=w.target.value,G(),console.log(`\u{1F9ED} Coordinate direction changed to: ${e.coordinateDirection}`),s.showAlert(`Coordinate direction set to: ${e.coordinateDirection}`,"success")})),Qt&&(Qt.checked=e.coordinateSnake,Qt.addEventListener("change",w=>{e.coordinateSnake=w.target.checked,G(),console.log(`\u{1F40D} Snake pattern ${e.coordinateSnake?"enabled":"disabled"}`),s.showAlert(`Snake pattern ${e.coordinateSnake?"enabled":"disabled"}`,"success")})),ea&&(ea.value=e.blockWidth,ea.addEventListener("input",w=>{let A=parseInt(w.target.value);A>=1&&A<=50&&(e.blockWidth=A,G())})),ta&&(ta.value=e.blockHeight,ta.addEventListener("change",w=>{let A=parseInt(w.target.value);A>=1&&A<=50&&(e.blockHeight=A,G())})),N&&N.addEventListener("click",()=>{r.classList.toggle("wplace-compact"),r.classList.contains("wplace-compact")?(N.innerHTML='<i class="fas fa-expand"></i>',N.title=s.t("expandMode")):(N.innerHTML='<i class="fas fa-compress"></i>',N.title=s.t("compactMode"))}),B&&B.addEventListener("click",()=>{e.minimized=!e.minimized,e.minimized?(r.classList.add("wplace-minimized"),be.classList.add("wplace-hidden"),B.innerHTML='<i class="fas fa-expand"></i>',B.title=s.t("restore")):(r.classList.remove("wplace-minimized"),be.classList.remove("wplace-hidden"),B.innerHTML='<i class="fas fa-minus"></i>',B.title=s.t("minimize")),G()}),X&&X.addEventListener("click",()=>{let w=Se.toggle();X.classList.toggle("active",w),X.setAttribute("aria-pressed",w?"true":"false"),s.showAlert(w?s.t("overlayEnabled"):s.t("overlayDisabled"),"info")}),e.minimized?(r.classList.add("wplace-minimized"),be.classList.add("wplace-hidden"),B&&(B.innerHTML='<i class="fas fa-expand"></i>',B.title=s.t("restore"))):(r.classList.remove("wplace-minimized"),be.classList.remove("wplace-hidden"),B&&(B.innerHTML='<i class="fas fa-minus"></i>',B.title=s.t("minimize"))),C&&C.addEventListener("click",()=>{if(!e.imageLoaded){s.showAlert(s.t("missingRequirements"),"error");return}s.saveProgress()?(R("autoSaved","success"),s.showAlert(s.t("autoSaved"),"success")):s.showAlert(s.t("errorSavingProgress"),"error")}),I&&I.addEventListener("click",()=>{if(!e.initialSetupComplete){s.showAlert(s.t("pleaseWaitInitialSetup"),"warning");return}let w=s.loadProgress();if(!w){R("noSavedData","warning"),s.showAlert(s.t("noSavedData"),"warning");return}confirm(`${s.t("savedDataFound")}

Saved: ${new Date(w.timestamp).toLocaleString()}
Progress: ${w.state.paintedPixels}/${w.state.totalPixels} pixels`)&&(s.restoreProgress(w)?(R("dataLoaded","success"),s.showAlert(s.t("dataLoaded"),"success"),Pt(),Fe(),s.restoreOverlayFromData().catch(O=>{console.error("Failed to restore overlay from localStorage:",O)}),e.colorsChecked?(y.disabled=!1,f.disabled=!1):y.disabled=!1,e.imageLoaded&&e.startPosition&&e.region&&e.colorsChecked&&(m.disabled=!1)):s.showAlert(s.t("errorLoadingProgress"),"error"))}),R=(w,A="default",z={},O=!1)=>{let j=s.t(w,z);pe.textContent=j,pe.className=`wplace-status status-${A}`,O||(pe.style.animation="none",pe.offsetWidth,pe.style.animation="slide-in 0.3s ease-out")};function Ta(w){let A=document.getElementById("wplace-stat-charges-value"),z=document.getElementById("wplace-stat-fullcharge-value");if(!z&&!A)return;if(!e.fullChargeData){z.textContent="--:--:--";return}let{current:O,max:j,cooldownMs:Y,startTime:oe,spentSinceShot:ue}=e.fullChargeData,ne=(Date.now()-oe)/Y,Q=O+ne-ue,U=Math.min(Q,j),le;U-Math.floor(U)>=.95?le=Math.ceil(U):le=Math.floor(U),e.displayCharges=Math.max(0,le),e.preciseCurrentCharges=U;let De=Kt(U,j,e.cooldown,w),ge=s.msToTimeText(De);A&&(A.innerHTML=`${e.displayCharges} / ${e.maxCharges}`),e.displayCharges<e.cooldownChargeThreshold&&!e.stopFlag&&e.running&&Ra(w),z&&(e.displayCharges>=j?z.innerHTML='<span style="color:#10b981;">FULL</span>':z.innerHTML=`
            <span style="color:#f59e0b;">${ge}</span>
          `)}Fe=async(w=!1)=>{var De,ge;let A=w,z=!((De=e.fullChargeData)!=null&&De.startTime),O=6e4,Y=O+Math.random()*(9e4-O),ue=Date.now()-(((ge=e.fullChargeData)==null?void 0:ge.startTime)||0)>=Y;if(A||z||ue){let{charges:S,max:L,cooldown:ve}=await Oa.getCharges();e.displayCharges=Math.floor(S),e.preciseCurrentCharges=S,e.cooldown=ve,e.maxCharges=Math.floor(L)>1?Math.floor(L):e.maxCharges,e.fullChargeData={current:S,max:L,cooldownMs:ve,startTime:Date.now(),spentSinceShot:0}}e.fullChargeInterval&&(clearInterval(e.fullChargeInterval),e.fullChargeInterval=null);let ne=1e3;e.fullChargeInterval=setInterval(()=>Ta(ne),ne),We&&We.max!==e.maxCharges&&(We.max=e.maxCharges),Ne&&Ne.max!==e.maxCharges&&(Ne.max=e.maxCharges);let Q="";if(e.imageLoaded){let S=e.totalPixels>0?Math.round(e.paintedPixels/e.totalPixels*100):0,L=e.totalPixels-e.paintedPixels;e.estimatedTime=s.calculateEstimatedTime(L,e.displayCharges,e.cooldown),Oe.style.width=`${S}%`,Q=`
          <div class="wplace-stat-item">
            <div class="wplace-stat-label"><i class="fas fa-image"></i> ${s.t("progress")}</div>
            <div class="wplace-stat-value">${S}%</div>
          </div>
          <div class="wplace-stat-item">
            <div class="wplace-stat-label"><i class="fas fa-paint-brush"></i> ${s.t("pixels")}</div>
            <div class="wplace-stat-value">${e.paintedPixels}/${e.totalPixels}</div>
          </div>
          <div class="wplace-stat-item">
            <div class="wplace-stat-label"><i class="fas fa-clock"></i> ${s.t("estimatedTime")}</div>
            <div class="wplace-stat-value">${s.formatTime(e.estimatedTime)}</div>
          </div>
        `}let U="";e.availableColors=e.availableColors.filter(S=>S.name!=="Unknown CoIor NaN"&&S.id!==null);let le=s.extractAvailableColors(),ye=Array.isArray(le)?le.length:0;if(ye===0&&w)s.showAlert(s.t("noColorsFound"),"warning");else if(ye>0&&e.availableColors.length<ye){let S=e.availableColors.length;s.showAlert(s.t("colorsUpdated",{oldCount:S,newCount:ye,diffCount:ye-S}),"success"),e.availableColors=le}e.colorsChecked&&(U=e.availableColors.map(S=>`<div class="wplace-stat-color-swatch" style="background-color: ${`rgb(${S.rgb.join(",")})`};" title="${s.t("colorTooltip",{id:S.id,rgb:S.rgb.join(", ")})}"></div>`).join("")),ce.innerHTML=`
            ${Q}
            <div class="wplace-stat-item">
              <div class="wplace-stat-label">
                <i class="fas fa-bolt"></i> ${s.t("charges")}
              </div>
              <div class="wplace-stat-value" id="wplace-stat-charges-value">
                ${e.displayCharges} / ${e.maxCharges}
              </div>
            </div>
            <div class="wplace-stat-item">
              <div class="wplace-stat-label">
                <i class="fas fa-battery-half"></i> ${s.t("fullChargeIn")}
              </div>
              <div class="wplace-stat-value" id="wplace-stat-fullcharge-value">--:--:--</div>
            </div>
            ${e.colorsChecked?`
            <div class="wplace-colors-section">
                <div class="wplace-stat-label"><i class="fas fa-palette"></i> ${s.t("availableColors",{count:e.availableColors.length})}</div>
                <div class="wplace-stat-colors-grid">
                    ${U}
                </div>
            </div>
            `:""}
        `,Ta(ne)},Pt=()=>{let w=e.imageLoaded&&e.imageData;C.disabled=!w},Pt();function en(w){var Aa;let A=w,z,O;if((Aa=e.originalImage)!=null&&Aa.dataUrl)A=new Vt(e.originalImage.dataUrl),z=e.originalImage.width,O=e.originalImage.height;else{let h=w.getDimensions();z=h.width,O=h.height}let j=z/O,Y=e.resizeSettings;we.max=z*2,xe.max=O*2;let oe=z,ue=O;Y&&Number.isFinite(Y.width)&&Number.isFinite(Y.height)&&Y.width>0&&Y.height>0&&(oe=Y.width,ue=Y.height),oe=Math.max(parseInt(we.min,10)||10,Math.min(oe,parseInt(we.max,10))),ue=Math.max(parseInt(xe.min,10)||10,Math.min(ue,parseInt(xe.max,10))),we.value=oe,xe.value=ue,mt.textContent=oe,ft.textContent=ue,Be.value=1,it&&(it.textContent="100%"),wt.checked=e.paintWhitePixels,yt.checked=e.paintTransparentPixels;let ae=null,ne=0,Q=!1,U=1,le=null,ye=null,De=h=>((!le||le.length!==h*3)&&(le=new Float32Array(h*3)),(!ye||ye.length!==h)&&(ye=new Uint8Array(h)),{work:le,eligible:ye}),ge=null,S=null,L=null,ve=()=>{L={minX:1/0,minY:1/0,maxX:-1,maxY:-1}},Ke=(h,x)=>{L||ve(),h<L.minX&&(L.minX=h),x<L.minY&&(L.minY=x),h>L.maxX&&(L.maxX=h),x>L.maxY&&(L.maxY=x)},$t=()=>{if(!L||L.maxX<L.minX||L.maxY<L.minY)return;let h=Math.max(0,L.minX),x=Math.max(0,L.minY),k=Math.min(de.width-h,L.maxX-h+1),E=Math.min(de.height-x,L.maxY-x+1);k>0&&E>0&&je.putImageData(ge,0,0,h,x,k,E),ve()},Ae=(h,x,k=!1)=>{if((!ge||ge.width!==h||ge.height!==x)&&(ge=je.createImageData(h,x),S=ge.data,k=!0),k){let E=e.resizeIgnoreMask,P=S;if(P.fill(0),E){for(let $=0;$<E.length;$++)if(E[$]){let J=$*4;P[J]=255,P[J+1]=0,P[J+2]=0,P[J+3]=150}}je.putImageData(ge,0,0),ve()}},an=(h,x)=>{(!e.resizeIgnoreMask||e.resizeIgnoreMask.length!==h*x)&&(e.resizeIgnoreMask=new Uint8Array(h*x)),W.width=h,W.height=x,de.width=h,de.height=x,je.clearRect(0,0,de.width,de.height),Ae(h,x,!0)};me=async()=>{let h=++ne,x=parseInt(we.value,10),k=parseInt(xe.value,10);if(U=parseFloat(Be.value),mt.textContent=x,ft.textContent=k,an(x,k),Ve.style.width=x+"px",Ve.style.height=k+"px",$e.imageSmoothingEnabled=!1,!e.availableColors||e.availableColors.length===0){A!==w&&(!A.img||!A.canvas)&&await A.load(),$e.clearRect(0,0,x,k),$e.drawImage(A.img,0,0,x,k),je.clearRect(0,0,de.width,de.height),ge&&je.putImageData(ge,0,0),ia();return}A!==w&&(!A.img||!A.canvas)&&await A.load(),$e.clearRect(0,0,x,k),$e.drawImage(A.img,0,0,x,k);let E=$e.getImageData(0,0,x,k),P=E.data,$=e.customTransparencyThreshold||p.TRANSPARENCY_THRESHOLD,J=()=>{let D=x,F=k,ie=D*F,{work:_,eligible:V}=De(ie);for(let q=0;q<F;q++)for(let re=0;re<D;re++){let Z=q*D+re,Te=Z*4,Me=P[Te],K=P[Te+1],ee=P[Te+2],te=P[Te+3],he=(e.paintTransparentPixels||te>=$)&&(e.paintWhitePixels||!s.isWhitePixel(Me,K,ee));V[Z]=he?1:0,_[Z*3]=Me,_[Z*3+1]=K,_[Z*3+2]=ee,he||(P[Te+3]=0)}let H=(q,re,Z,Te,Me,K)=>{if(q<0||q>=D||re<0||re>=F)return;let ee=re*D+q;if(!V[ee])return;let te=ee*3;_[te]=Math.min(255,Math.max(0,_[te]+Z*K)),_[te+1]=Math.min(255,Math.max(0,_[te+1]+Te*K)),_[te+2]=Math.min(255,Math.max(0,_[te+2]+Me*K))};for(let q=0;q<F;q++)for(let re=0;re<D;re++){let Z=q*D+re;if(!V[Z])continue;let Te=Z*3,Me=_[Te],K=_[Te+1],ee=_[Te+2],[te,he,ze]=s.findClosestPaletteColor(Me,K,ee,e.activeColorPalette),Pe=Z*4;P[Pe]=te,P[Pe+1]=he,P[Pe+2]=ze,P[Pe+3]=255;let Le=Me-te,ke=K-he,tt=ee-ze;H(re+1,q,Le,ke,tt,7/16),H(re-1,q+1,Le,ke,tt,3/16),H(re,q+1,Le,ke,tt,5/16),H(re+1,q+1,Le,ke,tt,1/16)}};if(e.ditheringEnabled&&!Q)J();else for(let D=0;D<P.length;D+=4){let F=P[D],ie=P[D+1],_=P[D+2],V=P[D+3];if(!e.paintTransparentPixels&&V<$||!e.paintWhitePixels&&s.isWhitePixel(F,ie,_)){P[D+3]=0;continue}let[H,q,re]=s.findClosestPaletteColor(F,ie,_,e.activeColorPalette);P[D]=H,P[D+1]=q,P[D+2]=re,P[D+3]=255}h===ne&&($e.putImageData(E,0,0),je.clearRect(0,0,de.width,de.height),ge&&je.putImageData(ge,0,0),ia())};let nn=()=>{bt.checked&&(xe.value=Math.round(parseInt(we.value,10)/j)),me();let h=parseInt(we.value,10),x=parseInt(xe.value,10);e.resizeSettings={baseWidth:z,baseHeight:O,width:h,height:x},G();let k=typeof Je=="function"?Je():1;!isNaN(k)&&isFinite(k)&&He(k)},sn=()=>{bt.checked&&(we.value=Math.round(parseInt(xe.value,10)*j)),me();let h=parseInt(we.value,10),x=parseInt(xe.value,10);e.resizeSettings={baseWidth:z,baseHeight:O,width:h,height:x},G();let k=typeof Je=="function"?Je():1;!isNaN(k)&&isFinite(k)&&He(k)};wt.onchange=h=>{e.paintWhitePixels=h.target.checked,me(),G()},yt.onchange=h=>{e.paintTransparentPixels=h.target.checked,me(),G()};let Ee=0,Ce=0,on=()=>{let h=(se==null?void 0:se.getBoundingClientRect())||{width:0,height:0},x=(W.width||1)*U,k=(W.height||1)*U;if(x<=h.width)Ee=Math.floor((h.width-x)/2);else{let E=h.width-x;Ee=Math.min(0,Math.max(E,Ee))}if(k<=h.height)Ce=Math.floor((h.height-k)/2);else{let E=h.height-k;Ce=Math.min(0,Math.max(E,Ce))}},na=0,Dt=()=>{na||(na=requestAnimationFrame(()=>{on(),Ve.style.transform=`translate3d(${Math.round(Ee)}px, ${Math.round(Ce)}px, 0) scale(${U})`,na=0}))},ia=()=>{let h=W.width||1,x=W.height||1;W.style.width=h+"px",W.style.height=x+"px",de.style.width=h+"px",de.style.height=x+"px",Ve.style.width=h+"px",Ve.style.height=x+"px",Dt()},He=h=>{U=Math.max(.05,Math.min(20,h||1)),Be.value=U,ia(),it&&(it.textContent=`${Math.round(U*100)}%`)};Be.addEventListener("input",()=>{He(parseFloat(Be.value))}),Ge&&Ge.addEventListener("click",()=>He(parseFloat(Be.value)+.1)),Ye&&Ye.addEventListener("click",()=>He(parseFloat(Be.value)-.1));let Je=()=>{let h=se==null?void 0:se.getBoundingClientRect();if(!h)return 1;let x=W.width||1,k=W.height||1,E=10,P=(h.width-E)/x,$=(h.height-E)/k;return Math.max(.05,Math.min(20,Math.min(P,$)))};vt&&vt.addEventListener("click",()=>{He(Je()),xt()}),Tt&&Tt.addEventListener("click",()=>{He(1),xt()});let xt=()=>{if(!se)return;let h=se.getBoundingClientRect(),x=(W.width||1)*U,k=(W.height||1)*U;Ee=Math.floor((h.width-x)/2),Ce=Math.floor((h.height-k)/2),Dt()},Ze=!1,zt=0,Ot=0,_t=0,Nt=0,Qe=!1,st=!1,ln=h=>h.button===1||h.button===2,ot=h=>{se&&(se.style.cursor=h)},rn=h=>st||Qe||ln(h),ka=()=>{Xe&&(Xe.classList.toggle("active",st),Xe.setAttribute("aria-pressed",st?"true":"false"))};if(Xe&&(ka(),Xe.addEventListener("click",()=>{st=!st,ka(),ot(st?"grab":"")})),se){se.addEventListener("contextmenu",E=>{Qe&&E.preventDefault()}),window.addEventListener("keydown",E=>{E.code==="Space"&&(Qe=!0,ot("grab"))}),window.addEventListener("keyup",E=>{E.code==="Space"&&(Qe=!1,Ze||ot(""))}),se.addEventListener("mousedown",E=>{rn(E)&&(E.preventDefault(),Ze=!0,zt=E.clientX,Ot=E.clientY,_t=Ee,Nt=Ce,ot("grabbing"))}),window.addEventListener("mousemove",E=>{if(!Ze)return;let P=E.clientX-zt,$=E.clientY-Ot;Ee=_t+P,Ce=Nt+$,Dt()}),window.addEventListener("mouseup",()=>{Ze&&(Ze=!1,ot(Qe?"grab":""))}),se.addEventListener("wheel",E=>{if(!E.ctrlKey&&!E.metaKey)return;E.preventDefault();let P=se.getBoundingClientRect(),$=E.clientX-P.left-Ee,J=E.clientY-P.top-Ce,D=U,F=Math.max(.05,Math.min(.5,Math.abs(E.deltaY)>20?.2:.1)),ie=Math.max(.05,Math.min(20,D+(E.deltaY>0?-F:F)));if(ie===D)return;let _=ie/D;Ee=Ee-$*(_-1),Ce=Ce-J*(_-1),He(ie)},{passive:!1});let h=null,x=0,k=null;se.addEventListener("touchstart",E=>{if(E.touches.length===1){let P=E.touches[0];Ze=!0,zt=P.clientX,Ot=P.clientY,_t=Ee,Nt=Ce,ot("grabbing");let $=Date.now();if($-x<300){let J=Math.abs(U-1)<.01?Je():1;He(J),xt(),k&&clearTimeout(k)}else x=$,k=setTimeout(()=>{k=null},320)}else if(E.touches.length===2){let[P,$]=E.touches;h=Math.hypot($.clientX-P.clientX,$.clientY-P.clientY)}},{passive:!0}),se.addEventListener("touchmove",E=>{if(E.touches.length===1&&Ze){let P=E.touches[0],$=P.clientX-zt,J=P.clientY-Ot;Ee=_t+$,Ce=Nt+J,Dt()}else if(E.touches.length===2&&h!=null){E.preventDefault();let[P,$]=E.touches,J=Math.hypot($.clientX-P.clientX,$.clientY-P.clientY),D=se.getBoundingClientRect(),F=(P.clientX+$.clientX)/2-D.left-Ee,ie=(P.clientY+$.clientY)/2-D.top-Ce,_=U,V=J/(h||J),H=Math.max(.05,Math.min(20,_*V));H!==_&&(Ee=Ee-F*(H/_-1),Ce=Ce-ie*(H/_-1),He(H)),h=J}},{passive:!1}),se.addEventListener("touchend",()=>{Ze=!1,h=null,ot(st||Qe?"grab":"")})}let sa=()=>{ae&&clearTimeout(ae);let h=()=>{ae=null,me()};window.requestIdleCallback?ae=setTimeout(()=>requestIdleCallback(h,{timeout:150}),50):ae=setTimeout(()=>requestAnimationFrame(h),50)},Sa=()=>{Q=!0},Ea=()=>{Q=!1,sa()};we.addEventListener("pointerdown",Sa),xe.addEventListener("pointerdown",Sa),we.addEventListener("pointerup",Ea),xe.addEventListener("pointerup",Ea),we.addEventListener("input",()=>{nn(),sa()}),xe.addEventListener("input",()=>{sn(),sa()});let Ht=!1,cn=-1,dn=-1,Rt=1,kt=1,et="ignore",St=d.querySelector("#maskBrushSize"),oa=d.querySelector("#maskBrushSizeValue"),la=d.querySelector("#maskModeIgnore"),ra=d.querySelector("#maskModeUnignore"),ca=d.querySelector("#maskModeToggle"),Ca=d.querySelector("#clearIgnoredBtn"),Ma=d.querySelector("#invertMaskBtn"),Et=d.querySelector("#rowColSize"),da=d.querySelector("#rowColSizeValue"),Pa=()=>{let h=[[la,"ignore"],[ra,"unignore"],[ca,"toggle"]];for(let[x,k]of h){if(!x)continue;let E=et===k;x.classList.toggle("active",E),x.setAttribute("aria-pressed",E?"true":"false")}},ga=h=>{et=h,Pa()};St&&oa&&(St.addEventListener("input",()=>{Rt=parseInt(St.value,10)||1,oa.textContent=Rt}),oa.textContent=St.value,Rt=parseInt(St.value,10)||1),Et&&da&&(Et.addEventListener("input",()=>{kt=parseInt(Et.value,10)||1,da.textContent=kt}),da.textContent=Et.value,kt=parseInt(Et.value,10)||1),la&&la.addEventListener("click",()=>ga("ignore")),ra&&ra.addEventListener("click",()=>ga("unignore")),ca&&ca.addEventListener("click",()=>ga("toggle")),Pa();let gn=(h,x)=>{let k=W.getBoundingClientRect(),E=k.width/W.width,P=k.height/W.height,$=(h-k.left)/E,J=(x-k.top)/P,D=Math.floor($),F=Math.floor(J);return{x:D,y:F}},ua=(h,x)=>{(!e.resizeIgnoreMask||e.resizeIgnoreMask.length!==h*x)&&(e.resizeIgnoreMask=new Uint8Array(h*x))},un=(h,x,k,E)=>{let P=W.width,$=W.height;ua(P,$);let J=k*k;for(let D=x-k;D<=x+k;D++)if(!(D<0||D>=$))for(let F=h-k;F<=h+k;F++){if(F<0||F>=P)continue;let ie=F-h,_=D-x;if(ie*ie+_*_<=J){let V=D*P+F,H=e.resizeIgnoreMask[V];if(et==="toggle"?H=H?0:1:et==="ignore"?H=1:H=0,e.resizeIgnoreMask[V]=H,S){let q=V*4;H?(S[q]=255,S[q+1]=0,S[q+2]=0,S[q+3]=150):(S[q]=0,S[q+1]=0,S[q+2]=0,S[q+3]=0),Ke(F,D)}}}},pn=(h,x)=>{let k=W.width,E=W.height;if(ua(k,E),h<0||h>=E)return;let P=Math.floor(kt/2),$=Math.max(0,h-P),J=Math.min(E-1,h+P);for(let D=$;D<=J;D++){for(let F=0;F<k;F++){let ie=D*k+F,_=e.resizeIgnoreMask[ie];if(et==="toggle"?_=_?0:1:et==="ignore"?_=1:_=0,e.resizeIgnoreMask[ie]=_,S){let V=ie*4;_?(S[V]=255,S[V+1]=0,S[V+2]=0,S[V+3]=150):(S[V]=0,S[V+1]=0,S[V+2]=0,S[V+3]=0)}}S&&(Ke(0,D),Ke(k-1,D))}},hn=(h,x)=>{let k=W.width,E=W.height;if(ua(k,E),h<0||h>=k)return;let P=Math.floor(kt/2),$=Math.max(0,h-P),J=Math.min(k-1,h+P);for(let D=$;D<=J;D++){for(let F=0;F<E;F++){let ie=F*k+D,_=e.resizeIgnoreMask[ie];if(et==="toggle"?_=_?0:1:et==="ignore"?_=1:_=0,e.resizeIgnoreMask[ie]=_,S){let V=ie*4;_?(S[V]=255,S[V+1]=0,S[V+2]=0,S[V+3]=150):(S[V]=0,S[V+1]=0,S[V+2]=0,S[V+3]=0)}}S&&(Ke(D,0),Ke(D,E-1))}},mn=()=>{$t()},Ia=h=>{if((h.buttons&4)===4||(h.buttons&2)===2||Qe)return;let{x,y:k}=gn(h.clientX,h.clientY),E=W.width,P=W.height;if(x<0||k<0||x>=E||k>=P)return;let $=Math.max(1,Math.floor(Rt/2));h.shiftKey?pn(k):h.altKey?hn(x):un(x,k,$),cn=x,dn=k,mn()};de.addEventListener("mousedown",h=>{h.button===1||h.button===2||Qe||(Ht=!0,Ia(h))}),de.addEventListener("touchstart",h=>{},{passive:!0}),de.addEventListener("touchmove",h=>{},{passive:!0}),de.addEventListener("touchend",h=>{},{passive:!0}),window.addEventListener("mousemove",h=>{Ht&&Ia(h)}),window.addEventListener("mouseup",()=>{Ht&&(Ht=!1,G())}),Ca&&Ca.addEventListener("click",()=>{let h=W.width,x=W.height;e.resizeIgnoreMask&&e.resizeIgnoreMask.fill(0),Ae(h,x,!0),me(),G()}),Ma&&Ma.addEventListener("click",()=>{if(!e.resizeIgnoreMask)return;for(let k=0;k<e.resizeIgnoreMask.length;k++)e.resizeIgnoreMask[k]=e.resizeIgnoreMask[k]?0:1;let h=W.width,x=W.height;Ae(h,x,!0),me(),G()}),Va.onclick=async()=>{let h=parseInt(we.value,10),x=parseInt(xe.value,10),k=document.createElement("canvas"),E=k.getContext("2d");k.width=h,k.height=x,E.imageSmoothingEnabled=!1,A!==w&&(!A.img||!A.canvas)&&await A.load(),E.drawImage(A.img,0,0,h,x);let P=E.getImageData(0,0,h,x),$=P.data,J=e.customTransparencyThreshold||p.TRANSPARENCY_THRESHOLD,D=0,F=e.resizeIgnoreMask&&e.resizeIgnoreMask.length===h*x?e.resizeIgnoreMask:null,ie=async()=>{let H=h,q=x,re=H*q,{work:Z,eligible:Te}=De(re);for(let K=0;K<q;K++){for(let ee=0;ee<H;ee++){let te=K*H+ee,he=te*4,ze=$[he],Pe=$[he+1],Le=$[he+2],ke=$[he+3],Ct=!(F&&F[te])&&(e.paintTransparentPixels||ke>=J)&&(e.paintWhitePixels||!s.isWhitePixel(ze,Pe,Le));Te[te]=Ct?1:0,Z[te*3]=ze,Z[te*3+1]=Pe,Z[te*3+2]=Le,Ct||($[he+3]=0)}(K&15)===0&&await Promise.resolve()}let Me=(K,ee,te,he,ze,Pe)=>{if(K<0||K>=H||ee<0||ee>=q)return;let Le=ee*H+K;if(!Te[Le])return;let ke=Le*3;Z[ke]=Math.min(255,Math.max(0,Z[ke]+te*Pe)),Z[ke+1]=Math.min(255,Math.max(0,Z[ke+1]+he*Pe)),Z[ke+2]=Math.min(255,Math.max(0,Z[ke+2]+ze*Pe))};for(let K=0;K<q;K++){for(let ee=0;ee<H;ee++){let te=K*H+ee;if(!Te[te])continue;let he=te*3,ze=Z[he],Pe=Z[he+1],Le=Z[he+2],[ke,tt,Ct]=s.findClosestPaletteColor(ze,Pe,Le,e.activeColorPalette),Wt=te*4;$[Wt]=ke,$[Wt+1]=tt,$[Wt+2]=Ct,$[Wt+3]=255,D++;let Ft=ze-ke,Ut=Pe-tt,qt=Le-Ct;Me(ee+1,K,Ft,Ut,qt,7/16),Me(ee-1,K+1,Ft,Ut,qt,3/16),Me(ee,K+1,Ft,Ut,qt,5/16),Me(ee+1,K+1,Ft,Ut,qt,1/16)}await Promise.resolve()}};if(e.ditheringEnabled)await ie();else for(let H=0;H<$.length;H+=4){let q=$[H],re=$[H+1],Z=$[H+2],Te=$[H+3],Me=F&&F[H>>2],K=!e.paintTransparentPixels&&Te<J||Me,ee=!e.paintWhitePixels&&s.isWhitePixel(q,re,Z);if(K||ee){$[H+3]=0;continue}D++;let[te,he,ze]=s.findClosestPaletteColor(q,re,Z,e.activeColorPalette);$[H]=te,$[H+1]=he,$[H+2]=ze,$[H+3]=255}E.putImageData(P,0,0);let _=new Uint8ClampedArray(P.data);e.imageData.pixels=_,e.imageData.width=h,e.imageData.height=x,e.imageData.totalPixels=D,e.totalPixels=D,e.paintedPixels=0,e.resizeSettings={baseWidth:z,baseHeight:O,width:h,height:x},G();let V=await createImageBitmap(k);await Se.setImage(V),Se.enable(),X.classList.add("active"),X.setAttribute("aria-pressed","true"),Fe(),R("resizeSuccess","success",{width:h,height:x}),xa()},Ka.onclick=()=>{try{let h=W.width,x=W.height,k=document.createElement("canvas");k.width=h,k.height=x;let E=k.getContext("2d");E.imageSmoothingEnabled=!1,E.drawImage(W,0,0),E.drawImage(de,0,0);let P=document.createElement("a");P.download="wplace-preview.png",P.href=k.toDataURL(),P.click()}catch(h){console.warn("Failed to download preview:",h)}},ja.onclick=xa,b.style.display="block",d.style.display="block",Na(d),me(),Mt=()=>{try{Be.replaceWith(Be.cloneNode(!0))}catch{}try{Ge&&Ge.replaceWith(Ge.cloneNode(!0))}catch{}try{Ye&&Ye.replaceWith(Ye.cloneNode(!0))}catch{}},setTimeout(()=>{if(typeof Je=="function"){let h=Je();!isNaN(h)&&isFinite(h)&&(He(h),xt())}else xt()},0)}function xa(){try{typeof Mt=="function"&&Mt()}catch{}b.style.display="none",d.style.display="none",me=()=>{};try{typeof cancelAnimationFrame=="function"&&_panRaf&&cancelAnimationFrame(_panRaf)}catch{}try{_previewTimer&&(clearTimeout(_previewTimer),_previewTimer=null)}catch{}_maskImageData=null,_maskData=null,_dirty=null,_ditherWorkBuf=null,_ditherEligibleBuf=null,Mt=null}y&&y.addEventListener("click",async()=>{let w=s.extractAvailableColors();if(w===null||w.length<10){R("noColorsFound","error"),s.showAlert(s.t("noColorsFound"),"error");return}e.colorsChecked||(e.availableColors=w,e.colorsChecked=!0,R("colorsFound","success",{count:w.length}),Fe(),f.disabled=!1,e.imageLoaded&&(v.disabled=!1));try{R("loadingImage","default");let A=await s.createImageUploader();if(!A){R("colorsFound","success",{count:e.availableColors.length});return}let z=new Vt(A);await z.load();let{width:O,height:j}=z.getDimensions(),Y=z.getPixelData(),oe=0;for(let ae=0;ae<Y.length;ae+=4){let ne=!e.paintTransparentPixels&&Y[ae+3]<(e.customTransparencyThreshold||p.TRANSPARENCY_THRESHOLD),Q=!e.paintWhitePixels&&s.isWhitePixel(Y[ae],Y[ae+1],Y[ae+2]);!ne&&!Q&&oe++}e.imageData={width:O,height:j,pixels:Y,totalPixels:oe,processor:z},e.totalPixels=oe,e.paintedPixels=0,e.imageLoaded=!0,e.lastPosition={x:0,y:0},s.initializePaintedMap(O,j),e.resizeSettings=null,e.resizeIgnoreMask=null,e.originalImage={dataUrl:A,width:O,height:j},G();let ue=await createImageBitmap(z.img);await Se.setImage(ue),Se.enable(),X.disabled=!1,X.classList.add("active"),X.setAttribute("aria-pressed","true"),e.colorsChecked&&(v.disabled=!1),C.disabled=!1,e.startPosition&&(m.disabled=!1),Fe(),Pt(),R("imageLoaded","success",{count:oe})}catch{R("imageError","error")}}),v&&v.addEventListener("click",()=>{e.imageLoaded&&e.imageData.processor&&e.colorsChecked?en(e.imageData.processor):e.colorsChecked||s.showAlert(s.t("uploadImageFirstColors"),"warning")}),f&&f.addEventListener("click",async()=>{if(e.selectingPosition)return;e.selectingPosition=!0,e.startPosition=null,e.region=null,m.disabled=!0,s.showAlert(s.t("selectPositionAlert"),"info"),R("waitingPosition","default");let w=async(z,O)=>{var j;if(typeof z=="string"&&z.includes("https://backend.wplace.live/s0/pixel/")&&((j=O==null?void 0:O.method)==null?void 0:j.toUpperCase())==="POST")try{let Y=await A(z,O),ue=await Y.clone().json();if((ue==null?void 0:ue.painted)===1){let ae=z.match(/\/pixel\/(\d+)\/(\d+)/);ae&&ae.length>=3&&(e.region={x:Number.parseInt(ae[1]),y:Number.parseInt(ae[2])});let ne=JSON.parse(O.body);ne!=null&&ne.coords&&Array.isArray(ne.coords)&&(e.startPosition={x:ne.coords[0],y:ne.coords[1]},e.lastPosition={x:0,y:0},await Se.setPosition(e.startPosition,e.region),e.imageLoaded&&(m.disabled=!1),window.fetch=A,e.selectingPosition=!1,R("positionSet","success"))}return Y}catch{return A(z,O)}return A(z,O)},A=window.fetch;window.fetch=w,setTimeout(()=>{e.selectingPosition&&(window.fetch=A,e.selectingPosition=!1,R("positionTimeout","error"),s.showAlert(s.t("positionTimeout"),"error"))},12e4)});async function tn(){if(!e.imageLoaded||!e.startPosition||!e.region){R("missingRequirements","error");return}if(await wa(),!!fe){e.running=!0,e.stopFlag=!1,m.disabled=!0,T.disabled=!1,y.disabled=!0,f.disabled=!0,v.disabled=!0,C.disabled=!0,X.disabled=!0,R("startPaintingMsg","success");try{await Fa()}catch(w){console.error("Unexpected error:",w),R("paintingError","error")}finally{e.running=!1,T.disabled=!0,C.disabled=!1,e.stopFlag?m.disabled=!1:(m.disabled=!0,y.disabled=!1,f.disabled=!1,v.disabled=!1),X.disabled=!1}}}if(m&&m.addEventListener("click",tn),T&&T.addEventListener("click",()=>{e.stopFlag=!0,e.running=!1,T.disabled=!0,R("paintingStoppedByUser","warning"),e.imageLoaded&&e.paintedPixels>0&&(s.saveProgress(),s.showAlert(s.t("autoSaved"),"success"))}),setTimeout(()=>{let w=s.loadProgress();if(w&&w.state.paintedPixels>0){let A=new Date(w.timestamp).toLocaleString(),z=Math.round(w.state.paintedPixels/w.state.totalPixels*100);s.showAlert(`${s.t("savedDataFound")}

Saved: ${A}
Progress: ${w.state.paintedPixels}/${w.state.totalPixels} pixels (${z}%)
${s.t("clickLoadToContinue")}`,"info")}},1e3),We&&Ne&&pt&&gt&&ut){let w=A=>{let z=Math.max(1,Math.min(e.maxCharges||999,parseInt(A)));e.cooldownChargeThreshold=z,We.value=z,Ne.value=z,pt.textContent=`${s.t("charges")}`,G()};We.addEventListener("input",A=>{w(A.target.value)}),Ne.addEventListener("input",A=>{w(A.target.value)}),gt.addEventListener("click",()=>{w(parseInt(Ne.value)-1)}),ut.addEventListener("click",()=>{w(parseInt(Ne.value)+1)}),s.createScrollToAdjust(We,w,1,e.maxCharges,1)}Ya()}function Kt(t,a,n,i=0){let o=a-t;return Math.max(0,o*n-i)}function Ra(t){if(e.stopFlag)return;let a=e.cooldownChargeThreshold,n=Kt(e.preciseCurrentCharges,a,e.cooldown,t),i=s.msToTimeText(n);R("noChargesThreshold","warning",{threshold:a,current:e.displayCharges,time:i},!0)}function Wa(t,a,n,i,o,c,r){let g=[];console.log(`Generating coordinates with 
  mode:`,n,`
  direction:`,i,`
  snake:`,o,`
  blockWidth:`,c,`
  blockHeight:`,r);let l,u,d,b,y,v;switch(i){case"top-left":l=0,u=t,d=1,b=0,y=a,v=1;break;case"top-right":l=t-1,u=-1,d=-1,b=0,y=a,v=1;break;case"bottom-left":l=0,u=t,d=1,b=a-1,y=-1,v=-1;break;case"bottom-right":l=t-1,u=-1,d=-1,b=a-1,y=-1,v=-1;break;default:throw new Error(`Unknown direction: ${i}`)}if(n==="rows")for(let f=b;f!==y;f+=v)if(o&&(f-b)%2!==0)for(let m=u-d;m!==l-d;m-=d)g.push([m,f]);else for(let m=l;m!==u;m+=d)g.push([m,f]);else if(n==="columns")for(let f=l;f!==u;f+=d)if(o&&(f-l)%2!==0)for(let m=y-v;m!==b-v;m-=v)g.push([f,m]);else for(let m=b;m!==y;m+=v)g.push([f,m]);else if(n==="circle-out"){let f=Math.floor(t/2),m=Math.floor(a/2),T=Math.ceil(Math.sqrt(f*f+m*m));for(let C=0;C<=T;C++)for(let I=m-C;I<=m+C;I++)for(let B=f-C;B<=f+C;B++)B>=0&&B<t&&I>=0&&I<a&&Math.max(Math.abs(B-f),Math.abs(I-m))===C&&g.push([B,I])}else if(n==="circle-in"){let f=Math.floor(t/2),m=Math.floor(a/2),T=Math.ceil(Math.sqrt(f*f+m*m));for(let C=T;C>=0;C--)for(let I=m-C;I<=m+C;I++)for(let B=f-C;B<=f+C;B++)B>=0&&B<t&&I>=0&&I<a&&Math.max(Math.abs(B-f),Math.abs(I-m))===C&&g.push([B,I])}else if(n==="blocks"||n==="shuffle-blocks"){let f=[];for(let m=0;m<a;m+=r)for(let T=0;T<t;T+=c){let C=[];for(let I=m;I<Math.min(m+r,a);I++)for(let B=T;B<Math.min(T+c,t);B++)C.push([B,I]);f.push(C)}if(n==="shuffle-blocks")for(let m=f.length-1;m>0;m--){let T=Math.floor(Math.random()*(m+1));[f[m],f[T]]=[f[T],f[m]]}for(let m of f)g.push(...m)}else throw new Error(`Unknown mode: ${n}`);return g}async function Lt(t){if(!t||t.pixels.length===0)return!0;let a=t.pixels.length;console.log(`\u{1F4E6} Sending batch with ${a} pixels (region: ${t.regionX},${t.regionY})`);let n=await qa(t.pixels,t.regionX,t.regionY);if(n){if(t.pixels.forEach(i=>{e.paintedPixels++,s.markPixelPainted(i.x,i.y,t.regionX,t.regionY)}),e.fullChargeData={...e.fullChargeData,spentSinceShot:e.fullChargeData.spentSinceShot+a},Fe(),R("paintingProgress","default",{painted:e.paintedPixels,total:e.totalPixels}),s.performSmartSave(),p.PAINTING_SPEED_ENABLED&&e.paintingSpeed>0&&a>0){let i=1e3/e.paintingSpeed,o=Math.max(100,i*a);await s.sleep(o)}}else console.error("\u274C Batch failed permanently after retries. Stopping painting."),e.stopFlag=!0,R("paintingBatchFailed","error");return t.pixels=[],n}async function Fa(){let{width:t,height:a,pixels:n}=e.imageData,{x:i,y:o}=e.startPosition,{x:c,y:r}=e.region;if(!await Se.waitForTiles(c,r,t,a,i,o,1e4)){R("overlayTilesNotLoaded","error"),e.stopFlag=!0;return}let l=null,u={transparent:0,white:0,alreadyPainted:0,colorUnavailable:0},d=e.customTransparencyThreshold||p.TRANSPARENCY_THRESHOLD;function b(v,f){let m=(f*t+v)*4,T=n[m],C=n[m+1],I=n[m+2],B=n[m+3];if(!e.paintTransparentPixels&&B<d)return{eligible:!1,reason:"transparent"};if(!e.paintWhitePixels&&s.isWhitePixel(T,C,I))return{eligible:!1,reason:"white"};let N=s.isWhitePixel(T,C,I)?[255,255,255]:s.findClosestPaletteColor(T,C,I,e.activeColorPalette),M=s.resolveColor(N,e.availableColors,!e.paintUnavailablePixels);return!e.paintUnavailablePixels&&!M.id?{eligible:!1,reason:"colorUnavailable",r:T,g:C,b:I,a:B,mappedColorId:M.id}:{eligible:!0,r:T,g:C,b:I,a:B,mappedColorId:M.id}}function y(v,f,m,T,C){v!=="transparent"&&console.log(`Skipped pixel for ${v} (id: ${f}, (${m.join(", ")})) at (${T}, ${C})`),u[v]++}try{let v=Wa(t,a,e.coordinateMode,e.coordinateDirection,e.coordinateSnake,e.blockWidth,e.blockHeight);e:for(let[f,m]of v){if(e.stopFlag){l&&l.pixels.length>0&&(console.log(`\u{1F3AF} Sending last batch before stop with ${l.pixels.length} pixels`),await Lt(l)),e.lastPosition={x:f,y:m},R("paintingPaused","warning",{x:f,y:m});break e}let T=b(f,m),C=i+f,I=o+m,B=Math.floor(C/1e3),N=Math.floor(I/1e3),M=C%1e3,X=I%1e3,pe=T.mappedColorId;if(!T.eligible){y(T.reason,pe,[T.r,T.g,T.b],M,X);continue}if(!l||l.regionX!==c+B||l.regionY!==r+N){if(l&&l.pixels.length>0)if(console.log(`\u{1F30D} Sending region-change batch with ${l.pixels.length} pixels (switching to region ${c+B},${r+N})`),await Lt(l)){if(p.PAINTING_SPEED_ENABLED&&e.paintingSpeed>0&&l.pixels.length>0){let be=Math.max(1,100/e.paintingSpeed),Ie=Math.max(100,be*l.pixels.length);await s.sleep(Ie)}Fe()}else{console.error("\u274C Batch failed permanently after retries. Stopping painting."),e.stopFlag=!0,R("paintingBatchFailed","error");break e}l={regionX:c+B,regionY:r+N,pixels:[]}}try{let ce=[l.regionX,l.regionY],be=await Se.getTilePixelColor(ce[0],ce[1],M,X);if(be&&Array.isArray(be)){let Ie=s.resolveColor(be.slice(0,3),e.availableColors),_e=Ie.id===pe;if(_e){y("alreadyPainted",pe,[T.r,T.g,T.b],M,X);continue}console.debug(`[COMPARE] Pixel at \u{1F4CD} (${M}, ${X}) in region (${c+B}, ${r+N})
  \u251C\u2500\u2500 Current color: rgb(${be.slice(0,3).join(", ")}) (id: ${Ie.id})
  \u251C\u2500\u2500 Target color:  rgb(${T.r}, ${T.g}, ${T.b}) (id: ${pe})
  \u2514\u2500\u2500 Status: ${_e?"\u2705 Already painted \u2192 SKIP":"\u{1F534} Needs paint \u2192 PAINT"}
`)}}catch(ce){console.error(`[DEBUG] Error checking existing pixel at (${M}, ${X}):`,ce),R("paintingPixelCheckFailed","error",{x:M,y:X}),e.stopFlag=!0;break e}l.pixels.push({x:M,y:X,color:pe,localX:f,localY:m});let Oe=Ua();if(l.pixels.length>=Oe){let ce=e.batchMode==="random"?`random (${e.randomBatchMin}-${e.randomBatchMax})`:"normal";if(console.log(`\u{1F4E6} Sending batch with ${l.pixels.length} pixels (mode: ${ce}, target: ${Oe})`),!await Lt(l)){console.error("\u274C Batch failed permanently after retries. Stopping painting."),e.stopFlag=!0,R("paintingBatchFailed","error");break e}l.pixels=[]}if(e.displayCharges<e.cooldownChargeThreshold&&!e.stopFlag&&await s.dynamicSleep(()=>e.displayCharges>=e.cooldownChargeThreshold||e.stopFlag?0:Kt(e.preciseCurrentCharges,e.cooldownChargeThreshold,e.cooldown)),e.stopFlag)break e}l&&l.pixels.length>0&&!e.stopFlag&&(console.log(`\u{1F3C1} Sending final batch with ${l.pixels.length} pixels`),await Lt(l)||console.warn(`\u26A0\uFE0F Final batch failed with ${l.pixels.length} pixels after all retries.`))}finally{window._chargesInterval&&clearInterval(window._chargesInterval),window._chargesInterval=null}if(e.stopFlag)s.saveProgress();else{R("paintingComplete","success",{count:e.paintedPixels}),e.lastPosition={x:0,y:0},s.saveProgress(),Se.clear();let v=document.getElementById("toggleOverlayBtn");v&&(v.classList.remove("active"),v.disabled=!0)}console.log("\u{1F4CA} Pixel Statistics:"),console.log(`   Painted: ${e.paintedPixels}`),console.log(`   Skipped - Transparent: ${u.transparent}`),console.log(`   Skipped - White (disabled): ${u.white}`),console.log(`   Skipped - Already painted: ${u.alreadyPainted}`),console.log(`   Skipped - Color Unavailable: ${u.colorUnavailable}`),console.log(`   Total processed: ${e.paintedPixels+u.transparent+u.white+u.alreadyPainted+u.colorUnavailable}`),Fe()}function Ua(){let t;if(e.batchMode==="random"){let i=Math.max(1,e.randomBatchMin),o=Math.max(i,e.randomBatchMax);t=Math.floor(Math.random()*(o-i+1))+i,console.log(`\u{1F3B2} Random batch size generated: ${t} (range: ${i}-${o})`)}else t=e.paintingSpeed;let a=e.displayCharges;return Math.min(t,a)}async function qa(t,a,n,i=ba){let o=0;for(;o<i&&!e.stopFlag;){o++,console.log(`\u{1F504} Attempting to send batch (attempt ${o}/${i}) for region ${a},${n} with ${t.length} pixels`);let c=await Ga(t,a,n);if(c===!0)return console.log(`\u2705 Batch succeeded on attempt ${o}`),!0;if(c==="token_error"){console.log(`\u{1F511} Token error on attempt ${o}, regenerating...`),R("captchaSolving","warning");try{await jt(),o--;continue}catch(r){console.error(`\u274C Token regeneration failed on attempt ${o}:`,r),R("captchaFailed","error"),await s.sleep(5e3)}}else{console.warn(`\u26A0\uFE0F Batch failed on attempt ${o}, retrying...`);let r=Math.min(1e3*Math.pow(2,o-1),3e4),g=Math.random()*1e3;await s.sleep(r+g)}}return o>=i&&(console.error(`\u274C Batch failed after ${i} attempts (MAX_BATCH_RETRIES=${ba}). This will stop painting to prevent infinite loops.`),R("paintingError","error")),!1}async function Ga(t,a,n){let i=fe;if(!i)try{console.log("\u{1F511} Generating Turnstile token for pixel batch..."),i=await jt(),fe=i}catch(r){return console.error("\u274C Failed to generate Turnstile token:",r),lt=new Promise(g=>{Re=g}),"token_error"}let o=new Array(t.length*2),c=new Array(t.length);for(let r=0;r<t.length;r++){let g=t[r];o[r*2]=g.x,o[r*2+1]=g.y,c[r]=g.color}try{let r={coords:o,colors:c,t:i},g=await fetch(`https://backend.wplace.live/s0/pixel/${a}/${n}`,{method:"POST",headers:{"Content-Type":"text/plain;charset=UTF-8"},credentials:"include",body:JSON.stringify(r)});if(g.status===403){let u=null;try{u=await g.json()}catch{}console.error("\u274C 403 Forbidden. Turnstile token might be invalid or expired.");try{console.log("\u{1F504} Regenerating Turnstile token after 403..."),i=await jt(),fe=i;let d={coords:o,colors:c,t:i},b=await fetch(`https://backend.wplace.live/s0/pixel/${a}/${n}`,{method:"POST",headers:{"Content-Type":"text/plain;charset=UTF-8"},credentials:"include",body:JSON.stringify(d)});if(b.status===403)return fe=null,lt=new Promise(v=>{Re=v}),"token_error";let y=await b.json();return(y==null?void 0:y.painted)===t.length}catch(d){return console.error("\u274C Token regeneration failed:",d),fe=null,lt=new Promise(b=>{Re=b}),"token_error"}}let l=await g.json();return(l==null?void 0:l.painted)===t.length}catch(r){return console.error("Batch paint request failed:",r),!1}}function G(){var t,a;try{let n={paintingSpeed:e.paintingSpeed,paintingSpeedEnabled:(t=document.getElementById("enableSpeedToggle"))==null?void 0:t.checked,batchMode:e.batchMode,randomBatchMin:e.randomBatchMin,randomBatchMax:e.randomBatchMax,cooldownChargeThreshold:e.cooldownChargeThreshold,tokenSource:e.tokenSource,minimized:e.minimized,overlayOpacity:e.overlayOpacity,blueMarbleEnabled:(a=document.getElementById("enableBlueMarbleToggle"))==null?void 0:a.checked,ditheringEnabled:e.ditheringEnabled,colorMatchingAlgorithm:e.colorMatchingAlgorithm,enableChromaPenalty:e.enableChromaPenalty,chromaPenaltyWeight:e.chromaPenaltyWeight,customTransparencyThreshold:e.customTransparencyThreshold,customWhiteThreshold:e.customWhiteThreshold,paintWhitePixels:e.paintWhitePixels,paintTransparentPixels:e.paintTransparentPixels,resizeSettings:e.resizeSettings,paintUnavailablePixels:e.paintUnavailablePixels,coordinateMode:e.coordinateMode,coordinateDirection:e.coordinateDirection,coordinateSnake:e.coordinateSnake,blockWidth:e.blockWidth,blockHeight:e.blockHeight,resizeIgnoreMask:e.resizeIgnoreMask&&e.resizeSettings&&e.resizeSettings.width*e.resizeSettings.height===e.resizeIgnoreMask.length?{w:e.resizeSettings.width,h:e.resizeSettings.height,data:btoa(String.fromCharCode(...e.resizeIgnoreMask))}:null,originalImage:e.originalImage};p.PAINTING_SPEED_ENABLED=n.paintingSpeedEnabled,localStorage.setItem("wplace-bot-settings",JSON.stringify(n))}catch(n){console.warn("Could not save bot settings:",n)}}function Ya(){var t,a,n,i,o,c,r,g,l,u,d,b,y,v,f,m,T,C,I,B;try{let N=localStorage.getItem("wplace-bot-settings");if(!N)return;let M=JSON.parse(N);if(e.paintingSpeed=M.paintingSpeed||p.PAINTING_SPEED.DEFAULT,e.batchMode=M.batchMode||p.BATCH_MODE,e.randomBatchMin=M.randomBatchMin||p.RANDOM_BATCH_RANGE.MIN,e.randomBatchMax=M.randomBatchMax||p.RANDOM_BATCH_RANGE.MAX,e.cooldownChargeThreshold=M.cooldownChargeThreshold||p.COOLDOWN_CHARGE_THRESHOLD,e.tokenSource=M.tokenSource||p.TOKEN_SOURCE,e.minimized=(t=M.minimized)!=null?t:!1,p.PAINTING_SPEED_ENABLED=(a=M.paintingSpeedEnabled)!=null?a:!1,p.AUTO_CAPTCHA_ENABLED=(n=M.autoCaptchaEnabled)!=null?n:!1,e.overlayOpacity=(i=M.overlayOpacity)!=null?i:p.OVERLAY.OPACITY_DEFAULT,e.blueMarbleEnabled=(o=M.blueMarbleEnabled)!=null?o:p.OVERLAY.BLUE_MARBLE_DEFAULT,e.ditheringEnabled=(c=M.ditheringEnabled)!=null?c:!1,e.colorMatchingAlgorithm=M.colorMatchingAlgorithm||"lab",e.enableChromaPenalty=(r=M.enableChromaPenalty)!=null?r:!0,e.chromaPenaltyWeight=(g=M.chromaPenaltyWeight)!=null?g:.15,e.customTransparencyThreshold=(l=M.customTransparencyThreshold)!=null?l:p.TRANSPARENCY_THRESHOLD,e.customWhiteThreshold=(u=M.customWhiteThreshold)!=null?u:p.WHITE_THRESHOLD,e.paintWhitePixels=(d=M.paintWhitePixels)!=null?d:!0,e.paintTransparentPixels=(b=M.paintTransparentPixels)!=null?b:!1,e.resizeSettings=(y=M.resizeSettings)!=null?y:null,e.originalImage=(v=M.originalImage)!=null?v:null,e.paintUnavailablePixels=(f=M.paintUnavailablePixels)!=null?f:p.PAINT_UNAVAILABLE,e.coordinateMode=(m=M.coordinateMode)!=null?m:p.COORDINATE_MODE,e.coordinateDirection=(T=M.coordinateDirection)!=null?T:p.COORDINATE_DIRECTION,e.coordinateSnake=(C=M.coordinateSnake)!=null?C:p.COORDINATE_SNAKE,e.blockWidth=(I=M.blockWidth)!=null?I:p.COORDINATE_BLOCK_WIDTH,e.blockHeight=(B=M.blockHeight)!=null?B:p.COORDINATE_BLOCK_HEIGHT,M.resizeIgnoreMask&&M.resizeIgnoreMask.data&&e.resizeSettings&&M.resizeIgnoreMask.w===e.resizeSettings.width&&M.resizeIgnoreMask.h===e.resizeSettings.height)try{let W=atob(M.resizeIgnoreMask.data),de=new Uint8Array(W.length);for(let $e=0;$e<W.length;$e++)de[$e]=W.charCodeAt($e);e.resizeIgnoreMask=de}catch{e.resizeIgnoreMask=null}else e.resizeIgnoreMask=null;let X=document.getElementById("coordinateModeSelect");X&&(X.value=e.coordinateMode);let pe=document.getElementById("coordinateDirectionSelect");pe&&(pe.value=e.coordinateDirection);let Oe=document.getElementById("coordinateSnakeToggle");Oe&&(Oe.checked=e.coordinateSnake);let ce=document.getElementById("wplace-settings-container"),be=ce.querySelector("#directionControls"),Ie=ce.querySelector("#snakeControls"),_e=ce.querySelector("#blockControls");s.updateCoordinateUI({mode:e.coordinateMode,directionControls:be,snakeControls:Ie,blockControls:_e});let We=document.getElementById("paintUnavailablePixelsToggle");We&&(We.checked=e.paintUnavailablePixels);let Ne=ce.querySelector("#settingsPaintWhiteToggle");Ne&&(Ne.checked=e.paintWhitePixels);let gt=ce.querySelector("#settingsPaintTransparentToggle");gt&&(gt.checked=e.paintTransparentPixels);let ut=document.getElementById("speedSlider"),pt=document.getElementById("speedInput"),nt=document.getElementById("speedValue");ut&&(ut.value=e.paintingSpeed),pt&&(pt.value=e.paintingSpeed),nt&&(nt.textContent="pixels");let ht=document.getElementById("enableSpeedToggle");ht&&(ht.checked=p.PAINTING_SPEED_ENABLED);let ct=document.getElementById("batchModeSelect");ct&&(ct.value=e.batchMode);let dt=document.getElementById("normalBatchControls"),we=document.getElementById("randomBatchControls");dt&&we&&(e.batchMode==="random"?(dt.style.display="none",we.style.display="block"):(dt.style.display="block",we.style.display="none"));let xe=document.getElementById("randomBatchMin");xe&&(xe.value=e.randomBatchMin);let mt=document.getElementById("randomBatchMax");mt&&(mt.value=e.randomBatchMax);let ft=document.getElementById("cooldownSlider"),bt=document.getElementById("cooldownInput"),wt=document.getElementById("cooldownValue");ft&&(ft.value=e.cooldownChargeThreshold),bt&&(bt.value=e.cooldownChargeThreshold),wt&&(wt.textContent=`${s.t("charges")}`);let yt=document.getElementById("overlayOpacitySlider");yt&&(yt.value=e.overlayOpacity);let Be=document.getElementById("overlayOpacityValue");Be&&(Be.textContent=`${Math.round(e.overlayOpacity*100)}%`);let it=document.getElementById("enableBlueMarbleToggle");it&&(it.checked=e.blueMarbleEnabled);let Ge=document.getElementById("tokenSourceSelect");Ge&&(Ge.value=e.tokenSource);let Ye=document.getElementById("colorAlgorithmSelect");Ye&&(Ye.value=e.colorMatchingAlgorithm);let vt=document.getElementById("enableChromaPenaltyToggle");vt&&(vt.checked=e.enableChromaPenalty);let Tt=document.getElementById("chromaPenaltyWeightSlider");Tt&&(Tt.value=e.chromaPenaltyWeight);let Xe=document.getElementById("chromaWeightValue");Xe&&(Xe.textContent=e.chromaPenaltyWeight);let se=document.getElementById("transparencyThresholdInput");se&&(se.value=e.customTransparencyThreshold);let Ve=document.getElementById("whiteThresholdInput");Ve&&(Ve.value=e.customWhiteThreshold)}catch(N){console.warn("Could not load bot settings:",N)}}console.log("\u{1F680} WPlace Auto-Image with Turnstile Token Generator loaded"),console.log("\u{1F511} Turnstile token generator: ALWAYS ENABLED (Background mode)"),console.log("\u{1F3AF} Manual pixel captcha solving: Available as fallback/alternative"),console.log("\u{1F4F1} Turnstile widgets: DISABLED - pure background token generation only!");function Bt(){e.initialSetupComplete=!0;let t=document.querySelector("#loadBtn"),a=document.querySelector("#uploadBtn");t&&(t.disabled=!1,t.title="",t.style.animation="pulse 0.6s ease-in-out",setTimeout(()=>{t&&(t.style.animation="")},600),console.log("\u2705 Load Progress button enabled after initial setup")),a&&(a.disabled=!1,a.title="",a.style.animation="pulse 0.6s ease-in-out",setTimeout(()=>{a&&(a.style.animation="")},600),console.log("\u2705 Upload Image button enabled after initial setup")),s.showAlert(s.t("fileOperationsAvailable"),"success")}async function Xa(){if(rt()){console.log("\u2705 Valid token already available, skipping initialization"),R("tokenReady","success"),Bt();return}try{console.log("\u{1F527} Initializing Turnstile token generator..."),R("initializingToken","default"),console.log("Attempting to load Turnstile script..."),await s.loadTurnstile(),console.log("Turnstile script loaded. Attempting to generate token...");let t=await ya();t?(at(t),console.log("\u2705 Startup token generated successfully"),R("tokenReady","success"),s.showAlert(s.t("tokenGeneratorReady"),"success"),Bt()):(console.warn("\u26A0\uFE0F Startup token generation failed (no token received), will retry when needed"),R("tokenRetryLater","warning"),Bt())}catch(t){console.error("\u274C Critical error during Turnstile initialization:",t),R("tokenRetryLater","warning"),Bt()}}pa(),Ha().then(()=>{setTimeout(Xa,1e3),setTimeout(()=>{let a=document.getElementById("chromaPenaltyWeightSlider"),n=document.getElementById("chromaWeightValue"),i=document.getElementById("resetAdvancedColorBtn"),o=document.getElementById("colorAlgorithmSelect"),c=document.getElementById("enableChromaPenaltyToggle"),r=document.getElementById("transparencyThresholdInput"),g=document.getElementById("whiteThresholdInput"),l=document.getElementById("enableDitheringToggle");o&&o.addEventListener("change",u=>{e.colorMatchingAlgorithm=u.target.value,G(),me()}),c&&c.addEventListener("change",u=>{e.enableChromaPenalty=u.target.checked,G(),me()}),a&&n&&a.addEventListener("input",u=>{e.chromaPenaltyWeight=parseFloat(u.target.value)||.15,n.textContent=e.chromaPenaltyWeight.toFixed(2),G(),me()}),r&&r.addEventListener("change",u=>{let d=parseInt(u.target.value,10);!isNaN(d)&&d>=0&&d<=255&&(e.customTransparencyThreshold=d,p.TRANSPARENCY_THRESHOLD=d,G(),me())}),g&&g.addEventListener("change",u=>{let d=parseInt(u.target.value,10);!isNaN(d)&&d>=200&&d<=255&&(e.customWhiteThreshold=d,p.WHITE_THRESHOLD=d,G(),me())}),l&&l.addEventListener("change",u=>{e.ditheringEnabled=u.target.checked,G(),me()}),i&&i.addEventListener("click",()=>{e.colorMatchingAlgorithm="lab",e.enableChromaPenalty=!0,e.chromaPenaltyWeight=.15,e.customTransparencyThreshold=p.TRANSPARENCY_THRESHOLD=100,e.customWhiteThreshold=p.WHITE_THRESHOLD=250,G();let u=document.getElementById("colorAlgorithmSelect");u&&(u.value="lab");let d=document.getElementById("enableChromaPenaltyToggle");d&&(d.checked=!0),a&&(a.value=.15),n&&(n.textContent="0.15"),r&&(r.value=100),g&&(g.value=250),me(),s.showAlert(s.t("advancedColorSettingsReset"),"success")})},500),window.addEventListener("beforeunload",()=>{s.cleanupTurnstile()})})})();})();
