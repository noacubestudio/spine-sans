// load fonts into this
const loadedFonts = {
    bold: {},
    double: {},
    ormanents: {}
};

const printMode = false;

// font details
const fontMetrics = {
    bold: { // this one is assumed to be always used for font spacing calculations, since they end up with the same effect
        halfHeight: 3.5,
        colMultiplier: 1,
        colWidth: 3,
        colGap: 1,
    },
    double: {
        halfHeight: 3.5,
        colMultiplier: 2,
        colWidth: 1,
        colGap: 1,
    }
}

// global dev settings, temporary
const debugColors = false;

// canvases
function collectCanvases(querySelector) {
    const canvasData = {};
  
    const canvases = document.querySelectorAll(querySelector);
    canvases.forEach(canvas => {
        const id = canvas.getAttribute('id');
        if (id) {
            const ctx = canvas.getContext('2d');
            canvasData[id] = { el: canvas, ctx: ctx };

            // also get the label
            const choiceLabel = canvas.previousElementSibling.querySelector('div.settingChoice');
            if (choiceLabel) {canvasData[id].labelChoiceEl = choiceLabel;};
        }
    });
  
    return canvasData;
}
const galleryCanvasObjsDir = collectCanvases('canvas.gallery');
const sliderCanvasObjsDir = collectCanvases('canvas.slider');

// main canvas and parameters
const mainCanvasObj = {
    elStack: [
        document.getElementById("mainCanvas"), 
        document.getElementById("effectCanvas2d"), 
    ], 
    ctxStack: [
        document.getElementById("mainCanvas").getContext('2d', {alpha: false}),
        document.getElementById("effectCanvas2d").getContext('2d'),
    ],
    params: {
        // the redraw conditions for these from sidebar changes are in
        // updateMainCanvasesFromChange(), make sure its up to date

        topFont: "bold",
        bottomFont: "bold",
        colHeight: 12,
        fontSize: (printMode) ? 11 : 10,

        alternateA: false,

        colEffect: "default",
        colBottomOffset: 1,
        applyEffectPer: "letter",
        isFlipped: "odd",

        textHue: 0,
        textChroma: 0.0,
        textLuminance: 1.0
    },
    words: []
}
const sidebarHue = 320;
const sidebarChroma = 0.2;

function updateMainCanvasSize() {
    const newWidth = Math.floor(window.innerWidth - 400);
    const newHeight = Math.floor(window.innerHeight - (printMode ? 0 : 62));
    const scale = window.devicePixelRatio; // Change to 1 on retina screens to see blurry canvas.
    document.getElementById('mainCanvasStack').height = newHeight;
    mainCanvasObj.elStack.forEach((el) => {
        el.width = newWidth * scale;
        el.height = newHeight * scale;
        el.style.width = newWidth + 'px';
        el.style.height = newHeight + 'px';
    });
}

// function updateSettingsCanvasesSize() {
//     galleryCanvasObjsDir.forEach(({el, ctx}) => {
//         print(el, ctx)
//     });
// }

window.addEventListener('DOMContentLoaded', updateMainCanvasSize);

// text
let textInputEl = document.getElementById("textInput");

window.setup = () => {
    noCanvas();
    // load jsons 
    const font1Promise = fetch('./fonts/SpineSans_Bold_svg.json').then((response) => response.json());
    const font2Promise = fetch('./fonts/SpineSans_Double_svg.json').then((response) => response.json());
    const symbols1Promise = fetch('./fonts/SpineSans_Ornaments_svg.json').then((response) => response.json());
    Promise.all([font1Promise, font2Promise, symbols1Promise])
    .then((results) => {
        loadedFonts["bold"] = results[0];
        loadedFonts["double"] = results[1];
        loadedFonts["ornaments"] = results[2];
        jsonFontsLoaded();
    })
    .catch((error) => {
        console.error("Error loading fonts:", error);
    });
}

function jsonFontsLoaded() {

    // gui
    // canvas events
    document.getElementById("mainCanvasStack").addEventListener('click', () => {
        if (document.activeElement !== textInputEl) {
            textInputEl.focus();
            textInputEl.select();
        }
    });

    // gallery canvases
    for (key in galleryCanvasObjsDir) {
        const canvasEl = galleryCanvasObjsDir[key].el;
        canvasEl.addEventListener('click', (e) => galleryHandleClick(e));
        canvasEl.addEventListener('mousemove', (e) => galleryHandleMouseMove(e));
        canvasEl.addEventListener('mouseleave', (e) => galleryHandleMouseLeave(e));
    }
    // slider canvases
    for (key in sliderCanvasObjsDir) {
        const sliderEl = sliderCanvasObjsDir[key].el;
        sliderEl.addEventListener("mousedown", (e) => sliderHandleMouseDown(e));
        sliderEl.addEventListener("mouseup", (e) => sliderHandleMouseUp(e));
        sliderEl.addEventListener("mousemove", (e) => sliderHandleMouseMove(e));
        sliderEl.addEventListener("mouseleave", (e) => sliderHandleMouseLeave(e));
    }

    textInputEl.addEventListener("input", () => {
        mainCanvasObj.words = setWordsArrFromString(textInputEl.value);
        setMainCanvasWordPositions();
        redrawMainCanvas();
        redrawCurrentEffectCanvas();
    });
      
    window.addEventListener('resize', () => {
        updateMainCanvasSize(); 
        setMainCanvasWordPositions();
        redrawMainCanvas()
        redrawCurrentEffectCanvas();
    });

    mainCanvasObj.words = setWordsArrFromString(textInputEl.value);
    setMainCanvasWordPositions();
    redrawMainCanvas();
    redrawCurrentEffectCanvas();
    console.log("mainCanvas", mainCanvasObj);

    // initial draw of gallery canvases
    for (key in galleryCanvasObjsDir) {
        // first check size
        const canvasObj = galleryCanvasObjsDir[key];
        const desiredHeight = canvasObj.params.fontSize * (fontMetrics["bold"].halfHeight*2 + canvasObj.params.colHeight + 8)

        const newWidth = 400;
        const newHeight = desiredHeight;
        const scale = window.devicePixelRatio;
        canvasObj.el.width = newWidth * scale;
        canvasObj.el.height = newHeight * scale;
        canvasObj.el.style.width = newWidth + 'px';
        canvasObj.el.style.height = newHeight + 'px';

        redrawGalleryCanvas(galleryCanvasObjsDir[key]);
        console.log(key, galleryCanvasObjsDir[key]);
    }

    // initial draw of slider canvases
    for (key in sliderCanvasObjsDir) {
        const sliderObj = sliderCanvasObjsDir[key];

        const newWidth = 360;
        const newHeight = 30;
        const scale = window.devicePixelRatio;
        sliderObj.el.width = newWidth * scale;
        sliderObj.el.height = newHeight * scale;
        sliderObj.el.style.width = newWidth + 40 + 'px';
        sliderObj.el.style.height = newHeight + 40 + 'px';

        updateSliderFromMainParam(sliderObj);
        redrawSliderCanvas(sliderObj);
        console.log(key, sliderObj);
    }
}

// this currently runs before every redraw, but is really only needed if 
// a) the input text changed
// b) the font size, column height or canvas size changed 
function setMainCanvasWordPositions() {
    const styleMetrics = fontMetrics[mainCanvasObj.params.topFont];
    const advanceWidth = (styleMetrics.colWidth + styleMetrics.colGap) * styleMetrics.colMultiplier;
    const advanceHeight = styleMetrics.halfHeight * 2 + mainCanvasObj.params.colHeight + 3;

    const maxColsInLine = getLineWidth();

    function getLineWidth() {
        const canvasWidth = mainCanvasObj.elStack[0].width;

        const advanceWidth = (fontMetrics.bold.colWidth + fontMetrics.bold.colGap);
        const unitScale = window.devicePixelRatio * mainCanvasObj.params.fontSize
        const pixelsPerLine = advanceWidth * unitScale;
        
        return Math.floor((canvasWidth / pixelsPerLine) - 1.6);
    }

    let colsAdvanced = 0;
    let linesAdvanced = 0;

    const leftEdge = (printMode) ? 60 : 40;
    const topEdge = (printMode) ? (mainCanvasObj.params.colHeight > 6 ? 60 : 320) : 50;

    mainCanvasObj.words.forEach((word) => {
        if (colsAdvanced + word.totalCols > maxColsInLine && word.totalCols <= maxColsInLine) {
            colsAdvanced = 0;
            linesAdvanced++;
        }
        word.xPos = leftEdge + colsAdvanced * advanceWidth * mainCanvasObj.params.fontSize;
        word.yPos = topEdge + linesAdvanced * advanceHeight * mainCanvasObj.params.fontSize;
        colsAdvanced += (word.totalCols + 1);
    });
}

function redrawMainCanvas() {
    const mainCanvasCtx = mainCanvasObj.ctxStack[0];
    mainCanvasCtx.save();
    mainCanvasCtx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // background
    mainCanvasCtx.fillStyle = "black"; //chroma.oklch(0.5, 0.2, mainCanvasObj.params.textHue).css();
    mainCanvasCtx.fillRect(0, 0, mainCanvasObj.elStack[0].width, mainCanvasObj.elStack[0].height);

    // draw text without columns by giving drawWord a special keyword
    mainCanvasCtx.fillStyle = chromaColorFromParams(mainCanvasObj.params);
    mainCanvasObj.words.forEach((word, index) => {
        drawWord(mainCanvasCtx, word.xPos, word.yPos, word, mainCanvasObj.params, "halvesOnly", index);
    });
    mainCanvasCtx.restore();
    //console.log("mainCanvas", mainCanvasObj);
}

function redrawCurrentEffectCanvas() {
    const effectCtx = mainCanvasObj.ctxStack[1];
    effectCtx.save();
    effectCtx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // clear background, same dimensions as main canvas
    effectCtx.clearRect(0, 0, mainCanvasObj.elStack[0].width, mainCanvasObj.elStack[0].height);

    // draw columns only by giving drawWord a special keyword
    effectCtx.fillStyle = chromaColorFromParams(mainCanvasObj.params);
    mainCanvasObj.words.forEach((word, index) => {
        drawWord(effectCtx, word.xPos, word.yPos, word, mainCanvasObj.params, "columnsOnly", index);
    });

    effectCtx.restore();
    //console.log("redrawing effects canvas!", effectCtx);
}

function drawWord(ctx, x, y, wordObj, parameters, onlyDrawPartially, wordIndex) {
    if (wordObj.chars.length === 0) return;

    ctx.save();
    ctx.translate(x, y);
    
    const scale = parameters.fontSize || 10;
    ctx.scale(scale, scale);
    ctx.lineWidth = 2/scale;

    // calculate with bold as default, used to go to next letter
    const styleMetrics = fontMetrics["bold"];
    const advanceWidth = (styleMetrics.colWidth + styleMetrics.colGap) * styleMetrics.colMultiplier;

    // draw the halves
    if (onlyDrawPartially !== "columnsOnly") {
        ctx.save();
        print(wordObj.chars)
        wordObj.chars.forEach((charObj, index) => {
            const lastCharObj = wordObj.chars[index-1] || {char: ""};
            // draw
            drawGlyphHalves(ctx, charObj.char, parameters, lastCharObj.char);
            // advance to next character
            ctx.translate(charObj.columns * advanceWidth, 0);
        });
        ctx.restore();
    }

    // draw the columns
    if (onlyDrawPartially !== "halvesOnly") {
        ctx.translate(0, fontMetrics[parameters.topFont].halfHeight);

        if (parameters.applyEffectPer === "letter") {
            // per letter, split first
            wordObj.chars.forEach((charObj, index) => {
                // draw
                drawColumns(ctx, charObj.columns, parameters, index);
                // advance to next character
                ctx.translate(charObj.columns * advanceWidth, 0);
            });
        } else {
            // per word
            drawColumns(ctx, wordObj.totalCols, parameters, wordIndex);
        }
    }
    
    ctx.restore();
}

function drawGlyphHalves(ctx, char, parameters, lastChar) {
    const colHeight = parameters.colHeight;

    const glyphKeys = getGlyphKeysFromChar(char, parameters, lastChar);

    // get the svg data
    let svgGlyphTop = loadedFonts[parameters.topFont].characters[glyphKeys[0].top];
    let svgGlyphBot = loadedFonts[parameters.bottomFont].characters[glyphKeys[0].bottom];

    if (svgGlyphTop === undefined || svgGlyphBot === undefined) {
        console.log(char + " was not found in the font object");
        ctx.translate(4, 0);
        return;
    }

    ctx.save();

    // draw top
    glyphKeys.forEach((glyphKey, index) => {
        if (index !== 0) {
            svgGlyphTop = loadedFonts[parameters.topFont].characters[glyphKey.top];
        }

        ctx.save();
        if (svgGlyphTop.top.up !== undefined) ctx.translate(0, -Number(svgGlyphTop.top.up));
        if (svgGlyphTop.top.left !== undefined) ctx.translate(-Number(svgGlyphTop.top.left), 0);
        svgGlyphTop.top.paths.forEach((path) => ctx.fill(new Path2D(path)));
        ctx.restore();
    });

    // go down top half height and column height
    ctx.translate(0, fontMetrics[parameters.topFont].halfHeight + colHeight);

    // draw bottom
    ctx.save();
    if (svgGlyphBot.bottom.left !== undefined) ctx.translate(-Number(svgGlyphTop.bottom.left), 0);
    svgGlyphBot.bottom.paths.forEach((path) => ctx.fill(new Path2D(path)));
    ctx.restore();

    ctx.restore();
}

function getGlyphKeysFromChar(char, params, lastChar) {
    let key = {top: "", bottom: ""};
    const additionalKeys = [];

    // convert umlaut, leaving the regular char to work with next
    if (char === "ä") {
        char = "a";
        additionalKeys.push({top: "umlaut"});
    } else if (char === "ö") {
        char = "o";
        additionalKeys.push({top: "umlaut"});
    } else if (char === "ü") {
        char = "u";
        additionalKeys.push({top: "umlaut"});
    }

    // alternates
    if (char === "a" && params.alternateA === true) {
        key = {top: "aSingleStory", bottom: "aSingleStory"};
    } else if (params.topFont === "bold") {
        if (lastChar === "r" && char === "f") {
            key = {top: "fLeftMissing", bottom: "f"};
        } else if (lastChar === "r" && char === "t") {
            key = {top: "tLeftMissing", bottom: "t"};
        } else if (lastChar === "f" && char === "i") {
            key = {top: "iLeftF", bottom: "i"};
        } else if (lastChar === "f" && char === "j") {
            key = {top: "jLeftF", bottom: "j"};
        } else {
            key = {top: char, bottom: char};
        }
    } else {
        key = {top: char, bottom: char};
    }

    return [key, ...additionalKeys];
}

function drawColumns(ctx, totalCols, parameters, index) {
    if (parameters.colHeight === undefined || parameters.colHeight === 0) return;
    if (parameters.colEffect === "none") return;

    if (index === undefined) index = 0;

    const topTotalCols = totalCols * fontMetrics[parameters.topFont].colMultiplier;
    const bottomTotalCols = totalCols * fontMetrics[parameters.bottomFont].colMultiplier;
    const maxTotalCols = Math.max(topTotalCols, bottomTotalCols);
    const minTotalCols = Math.min(topTotalCols, bottomTotalCols);

    const topWidth = fontMetrics[parameters.topFont].colWidth;
    const bottomWidth = fontMetrics[parameters.bottomFont].colWidth;
    const topAdvanceWidth = topWidth + fontMetrics[parameters.topFont].colGap;
    const bottomAdvanceWidth = bottomWidth + fontMetrics[parameters.bottomFont].colGap;

    // if not on pixel grid
    if ((parameters.fontSize * window.devicePixelRatio) % 2 !== 0) {
        //shapes at top and bottom to slightly overshoot stuff
        for (let col = 0; col < topTotalCols; col++) {
            ctx.fillRect(col * topAdvanceWidth, 0.1, fontMetrics[parameters.topFont].colWidth, -0.2);
        }
        for (let col = 0; col < bottomTotalCols; col++) {
            ctx.fillRect(col * bottomAdvanceWidth, parameters.colHeight-0.1, fontMetrics[parameters.bottomFont].colWidth, 0.2);
        }
    }



    // clipping rectangle
    const defaultColWidth = fontMetrics["bold"].colWidth;
    const defaultAdvanceWidth = defaultColWidth + fontMetrics["bold"].colGap;
    ctx.beginPath();
    ctx.rect(0, 0, defaultAdvanceWidth * (totalCols-1) + defaultColWidth, parameters.colHeight);
    ctx.save();
    ctx.clip();

    // useful for effects
    const isSingleFont = (parameters.topFont === parameters.bottomFont);

    if (parameters.colEffect === "default") {
        if (isSingleFont) {
            for (let col = 0; col < topTotalCols; col++) {
                ctx.fillRect(col * topAdvanceWidth, 0, fontMetrics[parameters.topFont].colWidth, parameters.colHeight);
            }
        } else {
            let gradient = ctx.createLinearGradient(0, 0, 0, parameters.colHeight);
            if (parameters.topFont === "double") {
                gradient.addColorStop(0, chromaColorFromParams(parameters, 0.0));
                gradient.addColorStop(1, chromaColorFromParams(parameters));
            } else {
                gradient.addColorStop(0, chromaColorFromParams(parameters));
                gradient.addColorStop(1, chromaColorFromParams(parameters, 0.0));
            }
            ctx.fillStyle = gradient;
            for (let col = 0; col < totalCols * fontMetrics["bold"].colMultiplier; col++) {
                ctx.fillRect(col * defaultAdvanceWidth, 0, defaultColWidth, parameters.colHeight);
            }
            // doubles on top
            ctx.fillStyle = chromaColorFromParams(parameters);
            for (let col = 0; col < totalCols * fontMetrics["double"].colMultiplier; col++) {
                ctx.fillRect(col * (fontMetrics["double"].colWidth + fontMetrics["double"].colGap), 0, fontMetrics["double"].colWidth, parameters.colHeight);
            }
        }
    } else if (parameters.colEffect === "bend" || parameters.colEffect === "bendCross") {
        // is there room for a bend to show?
        const isRoomForBend = (maxTotalCols > Math.abs(parameters.colBottomOffset));

        // offset bend effect. matching halves only.
        // scale bend effect. for different halves.
        // contained bend effect. first and last are connected in the background with a gradient

        const flipNumber = (parameters.isFlipped === "odd") ? (index % 2 === 0 ? 1 : -1) : 1;

        // draw curves behind the rest, always uses gradient
        if (parameters.colEffect === "bendCross") {
            let gradient = ctx.createLinearGradient(0, 0, 0, parameters.colHeight);
            if (isSingleFont) {
                gradient.addColorStop(0, chromaColorFromParams(parameters));
                gradient.addColorStop(0.5, chromaColorFromParams(parameters, 0.2));
                gradient.addColorStop(1, chromaColorFromParams(parameters));
                ctx.fillStyle = gradient;
                const topX = (flipNumber === 1) ? topAdvanceWidth * (topTotalCols-1) : 0;
                const bottomX = (flipNumber === -1) ? bottomAdvanceWidth * (bottomTotalCols-1) : 0;
                curvedRect(ctx, topX, bottomX, 0, topWidth, bottomWidth, parameters.colHeight)
            } else {
                if (topTotalCols > bottomTotalCols) {
                    gradient.addColorStop(0, chromaColorFromParams(parameters));
                    gradient.addColorStop(1, chromaColorFromParams(parameters, 0.2));
                } else {
                    gradient.addColorStop(0, chromaColorFromParams(parameters, 0.2));
                    gradient.addColorStop(1, chromaColorFromParams(parameters));
                }
                
                ctx.fillStyle = gradient;

                for (let n = 0; n < minTotalCols; n++) {
                    const topCol = (flipNumber === -1 || topTotalCols < bottomTotalCols) ? n : n + minTotalCols;
                    const botCol = (flipNumber === -1 || bottomTotalCols < topTotalCols) ? n : n + minTotalCols;
                    curvedRect(ctx, topAdvanceWidth * topCol, bottomAdvanceWidth * botCol, 0, topWidth, bottomWidth, parameters.colHeight)
                }
            }
            
        }

        let bendCols = 0;
        if (isRoomForBend && isSingleFont) {
            bendCols = parameters.colBottomOffset * flipNumber;
        } else if (isRoomForBend) {
            if (flipNumber === -1) bendCols = -topTotalCols+bottomTotalCols;
        }

        const topStart = (parameters.colEffect === "bendCross") ? max(-bendCols,0) : min(-bendCols,0);
        const topEnd = (parameters.colEffect === "bendCross") ? (flipNumber === -1 ? maxTotalCols : minTotalCols) + min(-bendCols,0) : maxTotalCols + max(-bendCols,0);

        // for bends going out the clip area
        const useGradients = false //Math.abs(topTotalCols-bottomTotalCols) <= 1;
        ctx.fillStyle = chromaColorFromParams(parameters);

        // foreground bends
        for (let topCol = topStart; topCol < topEnd; topCol++) {

            if (useGradients) {
                const botCol = topCol + bendCols;
                let gradient = ctx.createLinearGradient(0, 0, 0, parameters.colHeight);
                gradient.addColorStop(0, chromaColorFromParams(parameters));
                gradient.addColorStop(1, chromaColorFromParams(parameters, 0.2));
                // bottom gets out of view
                if (botCol < 0 || botCol >= bottomTotalCols) {
                    ctx.fillStyle = gradient;
                } else if (topCol < 0 || topCol >= topTotalCols) {
                    // top gets out of view
                    gradient = ctx.createLinearGradient(0, 0, 0, parameters.colHeight);
                    gradient.addColorStop(0, chromaColorFromParams(parameters, 0.2));
                    gradient.addColorStop(1, chromaColorFromParams(parameters));
                    ctx.fillStyle = gradient;
                } else {
                    ctx.fillStyle = chromaColorFromParams(parameters);
                }
            }

            // draw the shape
            curvedRect(ctx, topAdvanceWidth * topCol, bottomAdvanceWidth * (topCol + bendCols), 0, topWidth, bottomWidth, parameters.colHeight)
        }


        // // 3d perspective effect
        // // never flipped 

        // for (let topCol = 0; topCol < maxTotalCols; topCol++) {
        //     const topX = topAdvanceWidth * topCol;
        //     const bottomX = bottomAdvanceWidth * topCol;

        //     let middleX = (topX + bottomX) / 2;
        //     const middleWidth = (topWidth + bottomWidth) / 2;

        //     // perspective
        //     let referenceCol = (maxTotalCols-1) / 2;
        //     let columnsOff = topCol - referenceCol;
        //     let minimumColumnsOff = ((topCol < referenceCol) ? Math.max(topCol, bottomCol) : Math.min(topCol, bottomCol)) - referenceCol;
        //     let depth = -noise(topCol)
        //     print(topCol, columnsOff, depth)
        //     middleX += columnsOff * depth * fontMetrics["bold"].colGap;

        //     let gradient = ctx.createLinearGradient(0, 0, 0, parameters.colHeight);
        //     gradient.addColorStop(0, "white");
        //     gradient.addColorStop(0.5, `hsl(${0}, ${0}%, ${map(depth, 0, -1.5, 100, 0, true)}%, 1)`);
        //     gradient.addColorStop(1, "white");
        //     ctx.fillStyle = gradient;

        //     curvedRect(ctx, topX, middleX, 0, topWidth, middleWidth, parameters.colHeight / 2)
        //     curvedRect(ctx, middleX, bottomX, parameters.colHeight / 2, middleWidth, bottomWidth, parameters.colHeight / 2)
        // }
    } else if (parameters.colEffect === "depth") {

        // reference column
        const referenceColIndex = (minTotalCols-1) / 2;

        // go through smaller number of columns
        for (let n = 0; n < minTotalCols; n++) {
            // start by drawing columns until reference is reached
            // then draw the rest backwards from the reference
            const nx = (n < referenceColIndex) ? n : minTotalCols - 1 - (n - Math.ceil(referenceColIndex));
            
            // calculate perspective
            const columnsOff = nx - referenceColIndex;
            const depth = -1;
            const baseX = topAdvanceWidth * nx;
            const middleX = baseX + columnsOff * depth * fontMetrics["bold"].colGap * 0.5;
            const width = fontMetrics["bold"].colWidth;

            let gradient = ctx.createLinearGradient(0, 0, 0, parameters.colHeight);
            gradient.addColorStop(0, chromaColorFromParams(parameters));
            gradient.addColorStop(0.5, chromaColorFromParams(parameters, 1.0 + depth * 0.5));
            gradient.addColorStop(1, chromaColorFromParams(parameters));
            ctx.fillStyle = gradient;

            curvedRect(ctx, baseX, middleX, 0, width, width, parameters.colHeight / 2)
            curvedRect(ctx, middleX, baseX, parameters.colHeight / 2, width, width, parameters.colHeight / 2)
        }
    } else if (parameters.colEffect === "spines") {
        // paths are contained in
        const ornamentDetails = loadedFonts["ornaments"].symbols;

        // figure out which ornaments to use
        const totalHeight = parameters.colHeight;
        const pixelHeight = Math.floor(totalHeight);

        // Create transformation matrix, change last item to move down by right height
        let m = new DOMMatrix();
        m.a = 1;
        m.b = 0;
        m.c = 0;
        m.d = 1;
        m.e = 0;
        m.f = 0;

        // draw the ornaments
        let combinePath = new Path2D();

        while (m.f < pixelHeight) {

            // draw one ornament
            const ornamentAttachFont = (!isSingleFont) ? "double" : parameters.topFont;
            const {ornamentPick, ornamentHeight} = pickOrnament(pixelHeight - m.f, ornamentAttachFont, m.f === 0 && !isSingleFont)
            // end early if there's no more room
            if (m.f + ornamentHeight > pixelHeight) break;
            
            // per path
            for (let pathIndex = 0; pathIndex < ornamentPick.paths.length; pathIndex++) {
                const ornamentSVG = ornamentPick.paths[pathIndex];
                const ornamentPath = new Path2D(ornamentSVG);
                m.e = -ornamentPick.left || 0;
                combinePath.addPath(ornamentPath, m);
            }
             
            // before next path, add height
            m.f += ornamentHeight;
        }

        function pickOrnament(remainingHeight, basicFont, switchFonts) {
            const connectionsType = (switchFonts) ? "boldOverDouble" : basicFont;
            const avaliableHeights = Object.keys(ornamentDetails[connectionsType]);
            avaliableHeights.filter((height) => Number(height) <= remainingHeight);

            const randomHeight = random(avaliableHeights);
            const randomOrnament = random(ornamentDetails[connectionsType][randomHeight]);
            return {
                ornamentPick: randomOrnament, 
                ornamentHeight: Number(randomHeight) || 3,
            };
        }

        const usedHeight = m.f;
        

        // repeat the pattern
        ctx.save();
        for (let col = 0; col < totalCols * fontMetrics["bold"].colMultiplier; col++) {
            // wip
            if (parameters.topFont === "double" && parameters.bottomFont === "bold") {
                ctx.save();
                ctx.scale(1, -1);
                ctx.translate(0, -usedHeight);
                ctx.fill(combinePath);
                ctx.restore();
            } else {
                ctx.fill(combinePath);
            }

            ctx.translate(defaultAdvanceWidth, 0);
        }
        ctx.restore();

        ctx.save();
        // add bottom edge of straight pieces to fill remaining gap
        if (totalHeight > usedHeight) {
            for (let col = 0; col < bottomTotalCols; col++) {
                ctx.fillRect(0, usedHeight, bottomWidth, totalHeight-usedHeight);
                ctx.translate(bottomAdvanceWidth, 0);
            }
        }
        ctx.restore();
    }


    // end clipping
    ctx.restore();
}

// function generateOrnamentsMap(ornamentSet) {
//     const ornamentsMap = {};

//     ornamentSet["bold"].forEach((ornament, index) => {   
//         ornamentsMap["b,"+ornament.height+",b"] = index;
//     });
//     ornamentSet["double"].forEach((ornament, index) => {   
//         ornamentsMap["d,"+ornament.height+",d"] = index;
//     });
//     ornamentSet["boldOverDouble"].forEach((ornament, index) => {   
//         ornamentsMap["b,"+ornament.height+",d"] = index;
//         ornamentsMap["d,"+ornament.height+",b"] = index;
//     });
//     print(ornamentsMap);

//     const maxHeight = 

//     ornamentsMap["d2b"] = [];
//     ornamentsMap["b6b"] = ["2d4", "3b3"];
// }

function curvedRect(ctx, xTop, xBottom, y, widthTop, widthBottom, height) {
    ctx.beginPath();

    // Top side
    ctx.moveTo(xTop, y);
    ctx.lineTo(xTop + widthTop, y);

    // Right side with vertical bezier handle
    ctx.bezierCurveTo(
        xTop + widthTop, y + height * 0.5, 
        xBottom + widthBottom, y + height * 0.5, 
        xBottom + widthBottom, y + height
    );

    // Bottom side
    ctx.lineTo(xBottom, y + height);

    // Left side with vertical bezier handle
    ctx.bezierCurveTo(
        xBottom, y + height * 0.5,
        xTop, y + height * 0.5,
        xTop, y
    );

    ctx.fill();
}

function diamond(ctx, x, y, width, height) {
    ctx.beginPath();

    ctx.moveTo(x + width * 0.5, y);
    ctx.lineTo(x + width, y + height * 0.5);
    ctx.lineTo(x + width * 0.5, y + height);
    ctx.lineTo(x, y + height * 0.5);

    ctx.fill();
}

function setWordsArrFromString(inputString) {
    const splitWords = [""];
    inputString.toLowerCase().split("").forEach((char) => {
        if ("abcdefghijklmnopqrstuvwxyzäöü".includes(char)) {
            splitWords[splitWords.length-1] += char;
        } else {
            splitWords.push("");
        }
    });
    print(splitWords)
    const words = [];
    splitWords.forEach((wordString) => {
        if (wordString.length > 0) {
            const charsArr = arrFromWordString(wordString);
            const totalCols = charsArr.reduce((total, obj) => total + obj.columns, 0);
            words.push({chars: charsArr, totalCols})
        }
    });
    return words;
}

function setWordsArrWithParams(inputArr) {
    const words = [];
    inputArr.forEach((inputObj) => {
        const charsArr = arrFromWordString(inputObj.string);
        const totalCols = charsArr.reduce((total, obj) => total + obj.columns, 0);
        const name = inputObj.galleryOptionName;
        words.push({chars: charsArr, galleryOptionName: name, totalCols, params: inputObj.params});
    })
    return words;
}


galleryCanvasObjsDir["baseFontCanvas"].params = {
    colHeight: 1,
    fontSize: 5,
    colEffect: "none",
    textHue: sidebarHue,
    textChroma: sidebarChroma,
};
galleryCanvasObjsDir["baseFontCanvas"].words = setWordsArrWithParams([
    {string: "ab", galleryOptionName: "bold", params: {topFont: "bold", bottomFont: "bold"}},
    {string: "ab", galleryOptionName: "double", params: {topFont: "double", bottomFont: "double"}},
    {string: "ab", galleryOptionName: "bold/ double", params: {topFont: "bold", bottomFont: "double"}},
    {string: "ab", galleryOptionName: "double/ bold", params: {topFont: "double", bottomFont: "bold"}},
]);
galleryCanvasObjsDir["effectCanvas"].params = {
    colHeight: 10,
    fontSize: 5,
    textHue: sidebarHue,
    textChroma: sidebarChroma,
};
galleryCanvasObjsDir["effectCanvas"].words = setWordsArrWithParams([
    // {string: "ab", galleryOptionName: "none", params: {colEffect: "none"}},
    {string: "ab", galleryOptionName: "default", params: {colEffect: "default"}},
    {string: "ab", galleryOptionName: "bend", params: {colEffect: "bend"}},
    {string: "ab", galleryOptionName: "cross", params: {colEffect: "bendCross"}},
    {string: "ab", galleryOptionName: "spines", params: {colEffect: "spines"}},
    //{string: "ab", galleryOptionName: "depth", params: {colEffect: "depth"}},
]);
sliderCanvasObjsDir["sizeSlider"].range = {min: 4, max: 16};
sliderCanvasObjsDir["sizeSlider"].paramName = "fontSize";
sliderCanvasObjsDir["heightSlider"].range = {min: 0, max: 24};
sliderCanvasObjsDir["heightSlider"].paramName = "colHeight";
galleryCanvasObjsDir["rangeCanvas"].params = {
    colHeight: 10,
    fontSize: 5,
    textHue: sidebarHue,
    textChroma: sidebarChroma,
};
galleryCanvasObjsDir["rangeCanvas"].words = setWordsArrWithParams([
    {string: "word", galleryOptionName: "per word", params: {applyEffectPer: "word"}},
    {string: "letter", galleryOptionName: "per letter", params: {applyEffectPer: "letter"}},
]);
galleryCanvasObjsDir["alternateACanvas"].params = {
    colHeight: 1,
    fontSize: 5,
    colEffect: "none",
    textHue: sidebarHue,
    textChroma: sidebarChroma,
};
galleryCanvasObjsDir["alternateACanvas"].words = setWordsArrWithParams([
    {string: "ab", galleryOptionName: "double story", params: {alternateA: false}},
    {string: "ab", galleryOptionName: "single story", params: {alternateA: true}},
]);

function redrawGalleryCanvas(canvasObj) {
    canvasObj.ctx.save();
    canvasObj.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    // background
    canvasObj.ctx.clearRect(0, 0, canvasObj.el.width, canvasObj.el.height);
    
    // assuming the advance width is the same regardless of specific style
    // draw in a row for now
    const styleMetrics = fontMetrics["bold"];
    const advanceWidth = (styleMetrics.colWidth + styleMetrics.colGap) * styleMetrics.colMultiplier;

    let colsAdvanced = 0;

    canvasObj.labelChoiceEl.textContent = "";

    canvasObj.words.forEach((word, index) => {
        const xPos = 20 + (colsAdvanced * advanceWidth) * canvasObj.params.fontSize + index * 14;
        const yPos = 4 * canvasObj.params.fontSize;
        const assembledParams = assembleWordParams(canvasObj, index, Object.keys(mainCanvasObj.params));

        // check match
        
        word.paramsMatchMainCanvas = mainCanvasMatchesParams(word.params);
        const wordFocused = (canvasObj.focusedWord === index);

        // text
        if (word.paramsMatchMainCanvas && canvasObj.focusedWord === undefined || wordFocused) {
            canvasObj.labelChoiceEl.textContent += word.galleryOptionName;
        }

        if (word.paramsMatchMainCanvas && wordFocused) {
            // already active
            assembledParams.textLuminance = 0.95;
            assembledParams.textChroma *= 0.5;
        } else if (wordFocused) {
            // focused
            assembledParams.textLuminance = 0.7;
        } else if (word.paramsMatchMainCanvas) {
            // active
            assembledParams.textLuminance = 0.95;
            assembledParams.textChroma *= 0.5;
        } else {
            // unfocused
            assembledParams.textLuminance = 0.6;
        }
        canvasObj.ctx.fillStyle = chromaColorFromParams(assembledParams);
        drawWord(canvasObj.ctx, xPos, yPos, word, assembledParams, 0); //dont give actual index
        colsAdvanced += (word.totalCols);
    });
    canvasObj.ctx.restore();
}

function redrawSliderCanvas(sliderObj) {

    const handleColor = chroma.oklch((sliderObj.focused) ? 0.95 : 0.8, sidebarChroma * 0.5, sidebarHue).css();
    const lineColor = chroma.oklch((sliderObj.focused) ? 0.6 : 0.5, sidebarChroma, sidebarHue).css();

    // background
    sliderObj.ctx.clearRect(0, 0, sliderObj.el.width, sliderObj.el.height);
    
    sliderObj.ctx.fillStyle = lineColor;
    const sliderLineHeight = 5 * 1 * window.devicePixelRatio;
    sliderObj.ctx.fillRect(0, sliderObj.el.height / 2 - sliderLineHeight / 2, sliderObj.el.width, sliderLineHeight);

    // draw the handle
    if (sliderObj.percentage !== undefined) {
        sliderObj.ctx.fillStyle = handleColor;
        const handleWidth = 5 * 3 * window.devicePixelRatio;//sliderObj.el.height;
        const handleLeft = lerp(0, sliderObj.el.width - handleWidth, sliderObj.percentage);
        sliderObj.ctx.fillRect(handleLeft, 0, handleWidth, sliderObj.el.height);
    }

    sliderObj.labelChoiceEl.textContent = formatParamForString(mainCanvasObj.params[sliderObj.paramName]);
}

function updateSliderFromMainParam(sliderObj) {
    const matchValue = mainCanvasObj.params[sliderObj.paramName];
    sliderObj.percentage = map(matchValue, sliderObj.range.min, sliderObj.range.max, 0, 1);
}

function mainCanvasMatchesParams(params) {
    for (let key in params) {
            if (params.hasOwnProperty(key)) {
                if (params[key] !== mainCanvasObj.params[key]) {
                    return false;
                }
            }
        }
    return true;
}

function countColumnsOfChar(char) {
    return "wm".includes(char) ? 3
        : "ijltfr".includes(char) ? 1
        : 2; // Default value if not found in single or triple column sets
}

function arrFromWordString(text) {
    return [...text].map((c) => {
        return {
            char: c, 
            columns: countColumnsOfChar(c)
        } 
    });
}

function getWordParam(canvasObj, wordIndex, key) {
    // first look in the specific word
    const wordLocalParam = canvasObj.words[wordIndex].params[key];
    if (wordLocalParam !== undefined) {
        return wordLocalParam;
    } 
    // try looking in the basic params for the canvas instead
    const canvasParam = canvasObj.params[key];
    if (canvasParam !== undefined) {
        return canvasParam;
    }
    // otherwise, return the main canvas param and return a warning for now
    const mainParam = mainCanvasObj.params[key];
    if (mainParam !== undefined) {
        //console.warn("parameter at " + key + " could only be found in the main canvas. Is this intentional?");
        return mainParam;
    } else {
        console.error("parameter with " + key + " not found");
    }
}

function assembleWordParams(canvasObj, wordIndex, keysArr) {
    const assembledParams = {};
    keysArr.forEach((key) => {
        assembledParams[key] = getWordParam(canvasObj, wordIndex, key);
    });
    return assembledParams;
}

function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function setWordParamsToDestinationCanvas(wordsObj, wordIndex, destinationCanvas) {
    // save previous values
    destinationCanvas.lastParams = deepClone(destinationCanvas.params);

    // get all params from the word and apply those to the destination canvas params
    function overwriteProperties(destObj, sourceObj) {
        for (const key in sourceObj) {
          if (destObj.hasOwnProperty(key)) {
            destObj[key] = sourceObj[key];
          } else {
            console.warn("There is no key: " + key + " in the destination object");
          }
        }
    }

    overwriteProperties(destinationCanvas.params, wordsObj[wordIndex].params);
}

function galleryHandleClick(event) {
    const canvasObj = galleryCanvasObjsDir[event.target.id];

    // check focused word, isn't already active?
    const focusedWordObj = canvasObj.words[canvasObj.focusedWord];
    if (focusedWordObj.paramsMatchMainCanvas !== true) {
        // then update those properties in the main canvas obj
        setWordParamsToDestinationCanvas(canvasObj.words, canvasObj.focusedWord, mainCanvasObj);
        // see which main canvases need to change and what else needs to be recalculated
        updateMainCanvasesFromChange(Object.keys(focusedWordObj.params));
        // also redraw the canvas you just clicked on
        redrawGalleryCanvas(canvasObj);
        // redraw any canvases that inherit from the main canvas the properties that have just been changed
        redrawGalleriesThatInherit(focusedWordObj.params);
    }
}

function updateMainCanvasesFromChange(usedKeysArr) {
    let wordsMaybeMoved = false;
    let lettersMaybeChanged = false;
    usedKeysArr.forEach((key) => {
        if (["fontSize", "colHeight"].includes(key)) wordsMaybeMoved = true;
        if (["topFont", "bottomFont", "alternateA"].includes(key)) lettersMaybeChanged = true;
    });
    console.log(`wordPos ${wordsMaybeMoved}, lettersChanged ${lettersMaybeChanged}`);
    
    if (wordsMaybeMoved) {
        setMainCanvasWordPositions();
    }
    // redraw the letters
    if (wordsMaybeMoved || lettersMaybeChanged) {
        redrawMainCanvas();
    }
    // only effects changed, so maybe launch animation mode
    if (!wordsMaybeMoved && !lettersMaybeChanged) {
        const animationParams = getAnimationParamsFromDiff(mainCanvasObj.params, mainCanvasObj.lastParams);
        print("animation changes", animationParams);
        if (Object.keys(animationParams).length > 0) {
            animateMainCanvas(animationParams, 1000);
        } else {
            redrawCurrentEffectCanvas();
        }
    } else {
        redrawCurrentEffectCanvas();
    }
}

function renderMainCanvasFrame(progress) {
    if (progress === 0 || progress === 1) console.log(progress === 0 ? "main anim started!" : "main anim stopped!");

    // assume that this only involves effect changes
    redrawCurrentEffectCanvas();
}

function getAnimationParamsFromDiff(current, last) {
    if (last === undefined) return {};

    const animationObject = {};

    // Collect numerical parameters and store their "before" and "after" values
    for (const key in current) {
        if (typeof current[key] === 'number' && typeof last[key] === 'number' && current[key] !== last[key]) {
            animationObject[key] = {
                before: last[key],
                after: current[key]
            };
        }
    }
    return animationObject;
}

function animateMainCanvas(animationParams, duration) {

    const currentParams = mainCanvasObj.params;
    let startTime = null;

    function animationStep(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
    
        // Update the values based on the progress
        for (const key in animationParams) {
            const { before, after } = animationParams[key];
            currentParams[key] = lerp(before, after, progress);
        }
    
        // Render the updated values
        renderMainCanvasFrame(progress);
    
        if (progress < 1) {
            // Continue the animation until the duration is reached
            requestAnimationFrame(animationStep);
        } 
    }
    
    // Start the animation
    requestAnimationFrame(animationStep);
}

function redrawGalleriesThatInherit(paramsToCheck) {
    // if a settings canvas doesn't specify a parameter and neither does an example word (just checking the first)
    // that means that parameter is inherited from mainCanvas, so it needs to be redrawn

    Object.entries(galleryCanvasObjsDir).forEach(([canvasKey, value]) => {
        const containsChangedParam = Object.keys(paramsToCheck).some(key => value.params.hasOwnProperty(key) || value.words[0].params.hasOwnProperty(key));
        //print(Object.keys(paramsToCheck), value.params, containsChangedParam)
        if (!containsChangedParam) redrawGalleryCanvas(value);
    });
}

function galleryHandleMouseMove(event) {
    const canvasObj = galleryCanvasObjsDir[event.target.id];

    const rect = canvasObj.el.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    //const mouseY = event.clientY - rect.top;
    const lastFocusedWord = canvasObj.focusedWord;
    canvasObj.focusedWord = getFocusedWordIndex(canvasObj, mouseX);
    if (lastFocusedWord !== canvasObj.focusedWord) {
        redrawGalleryCanvas(canvasObj);
    }
}

function galleryHandleMouseLeave(event) {
    const canvasObj = galleryCanvasObjsDir[event.target.id];

    canvasObj.focusedWord = undefined;
    redrawGalleryCanvas(canvasObj);
}

function setSliderParamToDestinationCanvas(sliderObj, mainCanvasObj) {
    // save previous values
    mainCanvasObj.lastParams = deepClone(mainCanvasObj.params);

    const newValue = Math.round(lerp(sliderObj.range.min, sliderObj.range.max, sliderObj.percentage));
    mainCanvasObj.params[sliderObj.paramName] = newValue;
}

function sliderHandleMouseDown(event) {
    const sliderObj = sliderCanvasObjsDir[event.target.id];
    sliderObj.dragging = true;
    
    const rect = sliderObj.el.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    sliderObj.percentage = map(mouseX, rect.height/2, rect.width-rect.height/2, 0, 1, true);
    setSliderParamToDestinationCanvas(sliderObj, mainCanvasObj);
    updateMainCanvasesFromChange([sliderObj.paramName]);
    redrawSliderCanvas(sliderObj);
}
function sliderHandleMouseUp(event) {
    const sliderObj = sliderCanvasObjsDir[event.target.id];
    sliderObj.dragging = false;
}

function sliderHandleMouseMove(event) {
    const sliderObj = sliderCanvasObjsDir[event.target.id];
    sliderObj.focused = true;

    if (sliderObj.dragging) {
        const rect = sliderObj.el.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        sliderObj.percentage = map(mouseX, rect.height/2, rect.width-rect.height/2, 0, 1, true);
        setSliderParamToDestinationCanvas(sliderObj, mainCanvasObj);
        updateMainCanvasesFromChange([sliderObj.paramName]);
    }
    redrawSliderCanvas(sliderObj);
}

function sliderHandleMouseLeave(event) {
    const sliderObj = sliderCanvasObjsDir[event.target.id];

    sliderObj.focused = false;
    sliderObj.dragging = false;
    redrawSliderCanvas(sliderObj);
}

function getFocusedWordIndex(canvasObj, mouseX) {
    // for now, manually match redrawSettingsCanvas
    const fontSize = canvasObj.params.fontSize;
    const leftEdge = 20;
    const wordsGap = 14;

    const styleMetrics = fontMetrics["bold"];
    const advanceWidth = (styleMetrics.colWidth + styleMetrics.colGap) * styleMetrics.colMultiplier;


    // check if it's under the right edge of word. if not, keep going to check edge of next word

    let currentRightEdge = leftEdge;
    for (let focusedIndex = 0; focusedIndex < canvasObj.words.length; focusedIndex++) {
        currentRightEdge += canvasObj.words[focusedIndex].totalCols * advanceWidth * fontSize + wordsGap;
        if (mouseX < currentRightEdge) return focusedIndex;
    }
    return canvasObj.words.length-1;
}

function chromaColorFromParams(params, lightness) {
    lightness ??= 1.0;
    const adjustedLuminance = params.textLuminance * lightness;
    const adjustedChroma = (adjustedLuminance < 1.0) ? params.textChroma : 0.0;
    return chroma.oklch(adjustedLuminance, adjustedChroma, debugColors ? random(360) : params.textHue).css();
}

function formatParamForString(string) {
    if (typeof string !== 'number') {
        return string;
    }
    if (string % 1 !== 0) {
        return string.toFixed(2);
    } 
    return string.toString();
}