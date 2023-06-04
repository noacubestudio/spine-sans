// load fonts into this
const loadedFonts = {
    bold: {},
    double: {}
};

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
        document.getElementById("effectCanvas3d")
    ], 
    ctxStack: [
        document.getElementById("mainCanvas").getContext('2d', {alpha: false}),
        document.getElementById("effectCanvas2d").getContext('2d'),
        document.getElementById("effectCanvas3d").getContext('webgl'),
    ],
    params: {
        // the redraw conditions for these from sidebar changes are in
        // updateMainCanvasesFromChange(), make sure its up to date

        topFont: "bold",
        bottomFont: "bold",
        colHeight: 16,
        fontSize: 12,
        effectContext: "2d",
        colEffect: "bend",
        colBottomOffset: 1,
        applyEffectPer: "letter",
        isFlipped: "odd",
        textHue: 150,
        textChroma: 0.1,
        textLuminance: 1.0
    },
    words: []
}

function updateMainCanvasSize() {
    const newWidth = Math.floor(window.innerWidth - 400);
    mainCanvasObj.elStack.forEach((el) => {
        el.width = newWidth;
        el.style.width = newWidth + 'px';
    });
}
window.addEventListener('DOMContentLoaded', updateMainCanvasSize);

// text
let textInputEl = document.getElementById("textInput");

window.setup = () => {
    noCanvas();
    // load jsons 
    const font1Promise = fetch('./fonts/SpineSans_Bold_svg.json').then((response) => response.json());
    const font2Promise = fetch('./fonts/SpineSans_Double_svg.json').then((response) => response.json());
    Promise.all([font1Promise, font2Promise])
    .then((results) => {
        loadedFonts["bold"] = results[0];
        loadedFonts["double"] = results[1];
        jsonFontsLoaded();
    })
    .catch((error) => {
        console.error("Error loading fonts:", error);
    });
}

function jsonFontsLoaded() {

    // p5 setup
    //buffer3d = createGraphics(1360, 800, WEBGL);

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
    updateEffectCanvasVisibility();
    redrawCurrentEffectCanvas();
    console.log("mainCanvas", mainCanvasObj);

    // initial draw of gallery canvases
    for (key in galleryCanvasObjsDir) {
        // first check size
        const canvasObj = galleryCanvasObjsDir[key];
        const desiredHeight = canvasObj.params.fontSize * (fontMetrics["bold"].halfHeight*2 + canvasObj.params.colHeight + 8)
        if (canvasObj.el.height !== desiredHeight) {
            canvasObj.el.height = desiredHeight;
        }
        redrawGalleryCanvas(galleryCanvasObjsDir[key]);
        console.log(key, galleryCanvasObjsDir[key]);
    }

    // initial draw of slider canvases
    for (key in sliderCanvasObjsDir) {
        const sliderObj = sliderCanvasObjsDir[key];
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

    const maxColsInLine = 26;
    let colsAdvanced = 0;
    let linesAdvanced = 0;

    mainCanvasObj.words.forEach((word) => {
        if (colsAdvanced + word.totalCols > maxColsInLine && word.totalCols <= maxColsInLine) {
            colsAdvanced = 0;
            linesAdvanced++;
        }
        word.xPos = 40 + colsAdvanced * advanceWidth * mainCanvasObj.params.fontSize;
        word.yPos = 50 + linesAdvanced * advanceHeight * mainCanvasObj.params.fontSize;
        colsAdvanced += (word.totalCols + 1);
    });
}

function redrawMainCanvas() {
    const mainCanvasCtx = mainCanvasObj.ctxStack[0];
    // background
    mainCanvasCtx.fillStyle = chromaColorFromParams(mainCanvasObj.params, 0.0);
    mainCanvasCtx.fillRect(0, 0, mainCanvasObj.elStack[0].width, mainCanvasObj.elStack[0].height);

    // draw text without columns by giving drawWord a special keyword
    mainCanvasCtx.fillStyle = chromaColorFromParams(mainCanvasObj.params);
    mainCanvasObj.words.forEach((word) => {
        drawWord(mainCanvasCtx, word.xPos, word.yPos, word, mainCanvasObj.params, "halvesOnly");
    });
    
    //console.log("mainCanvas", mainCanvasObj);
}

function redrawCurrentEffectCanvas() {
    const effectCtx = (mainCanvasObj.params.effectContext === "2d") ? mainCanvasObj.ctxStack[1] : mainCanvasObj.ctxStack[2];

    // clear background, same dimensions as main canvas
    effectCtx.clearRect(0, 0, mainCanvasObj.elStack[0].width, mainCanvasObj.elStack[0].height);

    // draw columns only by giving drawWord a special keyword
    effectCtx.fillStyle = chromaColorFromParams(mainCanvasObj.params);
    mainCanvasObj.words.forEach((word) => {
        drawWord(effectCtx, word.xPos, word.yPos, word, mainCanvasObj.params, "columnsOnly");
    });

    // draw columns
    console.log("redrawing effects canvas!", effectCtx);
}

function drawWord(ctx, x, y, wordObj, parameters, onlyDrawPartially) {
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
        wordObj.chars.forEach((charObj) => {
            // draw
            drawGlyphHalves(ctx, charObj.char, parameters);
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
            drawColumns(ctx, wordObj.totalCols, parameters);
        }
    }
    
    ctx.restore();
}

function drawGlyphHalves(ctx, char, parameters) {
    const colHeight = parameters.colHeight;

    // get the svg data
    const svgGlyphTop = loadedFonts[parameters.topFont].characters[char];
    const svgGlyphBot = loadedFonts[parameters.bottomFont].characters[char];
    if (svgGlyphTop === undefined || svgGlyphBot === undefined) {
        console.log(char + " was not found in the font object");
        ctx.translate(4, 0);
        return;
    }

    ctx.save();

    // draw top
    ctx.save();
    if (svgGlyphTop.top.up !== undefined) ctx.translate(0, -Number(svgGlyphTop.top.up));
    if (svgGlyphTop.top.left !== undefined) ctx.translate(-Number(svgGlyphTop.top.left), 0);
    svgGlyphTop.top.paths.forEach((path) => ctx.fill(new Path2D(path)));
    ctx.restore();

    // go down top half height and column height
    ctx.translate(0, fontMetrics[parameters.topFont].halfHeight + colHeight);

    // draw bottom
    ctx.save();
    if (svgGlyphBot.bottom.left !== undefined) ctx.translate(-Number(svgGlyphTop.bottom.left), 0);
    svgGlyphBot.bottom.paths.forEach((path) => ctx.fill(new Path2D(path)));
    ctx.restore();

    ctx.restore();
}

function drawColumns(ctx, totalCols, parameters, index) {
    if (parameters.colHeight === undefined || parameters.colHeight === 0) return;
    if (parameters.colEffect === "none") return;

    if (index === undefined) index = 0;

    const topTotalCols = totalCols * fontMetrics[parameters.topFont].colMultiplier;
    const bottomTotalCols = totalCols * fontMetrics[parameters.bottomFont].colMultiplier;
    const maxTotalCols = Math.max(topTotalCols, bottomTotalCols);

    const topWidth = fontMetrics[parameters.topFont].colWidth;
    const bottomWidth = fontMetrics[parameters.bottomFont].colWidth;
    const topAdvanceWidth = topWidth + fontMetrics[parameters.topFont].colGap;
    const bottomAdvanceWidth = bottomWidth + fontMetrics[parameters.bottomFont].colGap;

    // shapes at top and bottom to slightly overshoot stuff
    for (let col = 0; col < topTotalCols; col++) {
        ctx.fillRect(col * topAdvanceWidth, 0.1, fontMetrics[parameters.topFont].colWidth, -0.2);
    }
    for (let col = 0; col < bottomTotalCols; col++) {
        ctx.fillRect(col * bottomAdvanceWidth, parameters.colHeight-0.1, fontMetrics[parameters.bottomFont].colWidth, 0.2);
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
    // is there room for a bend to show?
    const isRoomForBend = (maxTotalCols > Math.abs(parameters.colBottomOffset));

    // offset bend effect. matching halves only.
    // scale bend effect. for different halves.
    // contained bend effect. first and last are connected in the background with a gradient

    const flipNumber = (parameters.isFlipped === "odd") ? (index % 2 === 0 ? 1 : -1) : 1;
    const bendCols = (maxTotalCols > 1 || !isSingleFont) ? parameters.colBottomOffset * flipNumber : 0;

    for (let topCol = min(-bendCols,0); topCol < maxTotalCols + max(-bendCols,0); topCol++) {

        // gradient test
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



    // end clipping
    ctx.restore();
}

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
    const splitWords = inputString.toLowerCase().split(/[^a-z]/i);
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
    colEffect: "none"
};
galleryCanvasObjsDir["baseFontCanvas"].words = setWordsArrWithParams([
    {string: "ab", galleryOptionName: "bold", params: {topFont: "bold", bottomFont: "bold"}},
    {string: "ab", galleryOptionName: "double", params: {topFont: "double", bottomFont: "double"}},
    {string: "ab", galleryOptionName: "double/bold", params: {topFont: "double", bottomFont: "bold"}},
    {string: "ab", galleryOptionName: "bold/double", params: {topFont: "bold", bottomFont: "double"}},
]);
galleryCanvasObjsDir["effectCanvas"].params = {
    colHeight: 10,
    fontSize: 5,
};
galleryCanvasObjsDir["effectCanvas"].words = setWordsArrWithParams([
    {string: "ab", galleryOptionName: "none", params: {colEffect: "none"}},
    {string: "ab", galleryOptionName: "bend", params: {colEffect: "bend"}},
]);
sliderCanvasObjsDir["sizeSlider"].range = {min: 4, max: 16};
sliderCanvasObjsDir["sizeSlider"].paramName = "fontSize";
sliderCanvasObjsDir["heightSlider"].range = {min: 0, max: 24};
sliderCanvasObjsDir["heightSlider"].paramName = "colHeight";
galleryCanvasObjsDir["rangeCanvas"].params = {
    colHeight: 10,
    fontSize: 5,
};
galleryCanvasObjsDir["rangeCanvas"].words = setWordsArrWithParams([
    {string: "word", galleryOptionName: "per word", params: {applyEffectPer: "word"}},
    {string: "letter", galleryOptionName: "per letter", params: {applyEffectPer: "letter"}},
]);

function redrawGalleryCanvas(canvasObj) {
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
        if (word.paramsMatchMainCanvas) {
            canvasObj.labelChoiceEl.textContent += word.galleryOptionName;
        }

        if (word.paramsMatchMainCanvas && wordFocused) {
            // already active
            assembledParams.textLuminance = 0.85;
        } else if (wordFocused) {
            // focused
            assembledParams.textLuminance = 0.7;
        } else if (word.paramsMatchMainCanvas) {
            // active
            assembledParams.textLuminance = 1.0;
        } else {
            // unfocused
            assembledParams.textLuminance = 0.6;
        }
        canvasObj.ctx.fillStyle = chromaColorFromParams(assembledParams);
        drawWord(canvasObj.ctx, xPos, yPos, word, assembledParams);
        colsAdvanced += (word.totalCols);
    });
}

function redrawSliderCanvas(sliderObj) {
    
    sliderObj.ctx.fillStyle = chromaColorFromParams(mainCanvasObj.params, (sliderObj.focused) ? 0.6 : 0.5);
    sliderObj.ctx.fillRect(0, 0, sliderObj.el.width, sliderObj.el.height);

    // draw the handle
    if (sliderObj.percentage !== undefined) {
        sliderObj.ctx.fillStyle = chromaColorFromParams(mainCanvasObj.params, (sliderObj.focused) ? 0.98 : 1.0);
        const handleDiameter = sliderObj.el.height;
        const handleLeft = lerp(0, sliderObj.el.width - handleDiameter, sliderObj.percentage);
        sliderObj.ctx.fillRect(handleLeft, 0, handleDiameter, handleDiameter);
    }

    sliderObj.labelChoiceEl.textContent = mainCanvasObj.params[sliderObj.paramName];
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
    let effectsVisibilityChanged = false;
    usedKeysArr.forEach((key) => {
        if (["fontSize", "colHeight"].includes(key)) wordsMaybeMoved = true;
        if (["topFont", "bottomFont"].includes(key)) lettersMaybeChanged = true;
        if (["effectContext"].includes(key)) effectsVisibilityChanged = true;
    });
    console.log(`wordPos ${wordsMaybeMoved}, lettersChanged ${lettersMaybeChanged}, effectsChanged ${effectsVisibilityChanged}`);
    
    if (wordsMaybeMoved) {
        setMainCanvasWordPositions();
    }
    // redraw the letters
    if (wordsMaybeMoved || lettersMaybeChanged) {
        redrawMainCanvas();
    }
    // visibility of effect canvas might have been switched
    if (effectsVisibilityChanged) {
        updateEffectCanvasVisibility();
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

function updateEffectCanvasVisibility() {
    if (mainCanvasObj.params.effectContext === "2d") {
        mainCanvasObj.elStack[1].style.display = "block";
        mainCanvasObj.elStack[2].style.display = "none";
    } else {
        mainCanvasObj.elStack[1].style.display = "none";
        mainCanvasObj.elStack[2].style.display = "block";
    }
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
    canvasObj.focusedWord = getFocusedWordIndex(canvasObj, mouseX);
    redrawGalleryCanvas(canvasObj);
}

function galleryHandleMouseLeave(event) {
    const canvasObj = galleryCanvasObjsDir[event.target.id];

    canvasObj.focusedWord = undefined;
    redrawGalleryCanvas(canvasObj);
}

function setSliderParamToDestinationCanvas(sliderObj, mainCanvasObj) {
    // save previous values
    mainCanvasObj.lastParams = deepClone(mainCanvasObj.params);

    const newValue = lerp(sliderObj.range.min, sliderObj.range.max, sliderObj.percentage);
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
    lightness ??= 1.0
    return chroma.oklch(params.textLuminance * lightness, params.textChroma, params.textHue).css();
}