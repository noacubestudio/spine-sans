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
        bottomFont: "double",
        colHeight: 16,
        fontSize: 12,
        effectContext: "2d",
        colEffect: "bend",
        colBottomOffset: 0
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
    mainCanvasObj.elStack[0].addEventListener('click', () => {
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
        const desiredHeight = canvasObj.params.fontSize * (fontMetrics["bold"].halfHeight*2 + canvasObj.params.colHeight + 6)
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
    mainCanvasCtx.fillStyle = "#000000";
    mainCanvasCtx.fillRect(0, 0, mainCanvasObj.elStack[0].width, mainCanvasObj.elStack[0].height);

    // draw text without columns by giving drawWord a special keyword
    mainCanvasCtx.fillStyle = '#ffffffff';
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
    effectCtx.fillStyle = '#ffffffff';
    mainCanvasObj.words.forEach((word) => {
        drawWord(effectCtx, word.xPos, word.yPos, word, mainCanvasObj.params, "columnsOnly");
    });

    // draw columns
    console.log("redrawing effects canvas!", effectCtx);
}

function drawWord(ctx, x, y, wordObj, parameters, onlyDrawPartially) {
    ctx.save();
    ctx.translate(x, y);
    
    const scale = parameters.fontSize || 10;
    ctx.scale(scale, scale);
    ctx.lineWidth = 2/scale;

    // draw the halves
    if (onlyDrawPartially !== "columnsOnly") {
        ctx.save();
        wordObj.chars.forEach((charObj) => {
            // draw
            drawGlyphHalves(ctx, charObj.char, parameters);
    
            // advance to next character
            const styleMetrics = fontMetrics[parameters.topFont];
            const advanceWidth = charObj.columns * (styleMetrics.colWidth + styleMetrics.colGap) * styleMetrics.colMultiplier;
            ctx.translate(advanceWidth, 0);
        });
        ctx.restore();
    }

    // draw the columns
    if (onlyDrawPartially !== "halvesOnly") {
        ctx.translate(0, fontMetrics[parameters.topFont].halfHeight);
        drawColumns(ctx, wordObj.chars, wordObj.totalCols, parameters);
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

function drawColumns(ctx, charObjArray, totalCols, parameters) {
    if (parameters.colHeight === undefined || parameters.colHeight === 0) return;
    if (parameters.colEffect === "none") return;
    if (charObjArray.length === 0) return;

    //default
    const colWidth = fontMetrics["bold"].colWidth;
    const advanceWidth = colWidth + fontMetrics["bold"].colGap;

    // clipping rectangle
    ctx.beginPath();
    ctx.rect(0, 0, advanceWidth * (totalCols-1) + colWidth, parameters.colHeight);
    ctx.save();
    ctx.clip();

    
    // effect stuff
    const topTotalCols = totalCols * fontMetrics[parameters.topFont].colMultiplier;
    const bottomTotalCols = totalCols * fontMetrics[parameters.bottomFont].colMultiplier;
    const maxTotalCols = Math.max(topTotalCols, bottomTotalCols);

    // basic rectangles
    // for (let col = 0; col < totalCols; col++) {
    //     ctx.fillRect(col * (advanceWidth), 0, colWidth, parameters.colHeight);
    // }

    // bend effect
    const bendCols = 0;
    const topWidth = fontMetrics[parameters.topFont].colWidth;
    const bottomWidth = fontMetrics[parameters.bottomFont].colWidth;
    const topAdvanceWidth = topWidth + fontMetrics[parameters.topFont].colGap;
    const bottomAdvanceWidth = bottomWidth + fontMetrics[parameters.bottomFont].colGap;

    for (let topCol = min(-bendCols,0); topCol < maxTotalCols + max(-bendCols,0); topCol++) {
        curvedRect(ctx, topAdvanceWidth * topCol, bottomAdvanceWidth * (topCol + bendCols), 0, topWidth, bottomWidth, parameters.colHeight)
    }


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
        words.push({chars: charsArr, totalCols, params: inputObj.params});
    })
    return words;
}


galleryCanvasObjsDir["baseFontCanvas"].params = {
    colHeight: 1,
    fontSize: 5,
    colEffect: "none"
};
galleryCanvasObjsDir["baseFontCanvas"].words = setWordsArrWithParams([
    {string: "ab", params: {topFont: "bold", bottomFont: "bold"}},
    {string: "ab", params: {topFont: "double", bottomFont: "double"}},
    {string: "ab", params: {topFont: "double", bottomFont: "bold"}},
    {string: "ab", params: {topFont: "bold", bottomFont: "double"}},
]);
galleryCanvasObjsDir["effectCanvas"].params = {
    colHeight: 4,
    fontSize: 5,
};
galleryCanvasObjsDir["effectCanvas"].words = setWordsArrWithParams([
    {string: "ab", params: {colEffect: "none"}},
    {string: "ab", params: {colEffect: "bend"}},
]);
sliderCanvasObjsDir["sizeSlider"].range = {min: 4, max: 16};
sliderCanvasObjsDir["sizeSlider"].paramName = "fontSize";
sliderCanvasObjsDir["heightSlider"].range = {min: 0, max: 24};
sliderCanvasObjsDir["heightSlider"].paramName = "colHeight";

function redrawGalleryCanvas(canvasObj) {
    // background
    //canvasObj.ctx.fillStyle = "#000000";
    canvasObj.ctx.clearRect(0, 0, canvasObj.el.width, canvasObj.el.height);
    
    // assuming the advance width is the same regardless of specific style
    // draw in a row for now
    const styleMetrics = fontMetrics["bold"];
    const advanceWidth = (styleMetrics.colWidth + styleMetrics.colGap) * styleMetrics.colMultiplier;

    let colsAdvanced = 0;

    canvasObj.words.forEach((word, index) => {
        const xPos = 20 + (colsAdvanced * advanceWidth) * canvasObj.params.fontSize + index * 14;
        const yPos = 3 * canvasObj.params.fontSize;
        const assembledParams = assembleWordParams(canvasObj, index, Object.keys(mainCanvasObj.params));

        // check match
        
        word.paramsMatchMainCanvas = mainCanvasMatchesParams(word.params);
        const wordFocused = (canvasObj.focusedWord === index);

        if (word.paramsMatchMainCanvas && wordFocused) {
            // already active
            canvasObj.ctx.fillStyle = '#BBB';
        } else if (wordFocused) {
            // focused
            canvasObj.ctx.fillStyle = '#444';
        } else if (word.paramsMatchMainCanvas) {
            // active
            canvasObj.ctx.fillStyle = '#FFF';
        } else {
            // unfocused
            canvasObj.ctx.fillStyle = '#888';
        }
        drawWord(canvasObj.ctx, xPos, yPos, word, assembledParams);
        colsAdvanced += (word.totalCols);
    });
}

function redrawSliderCanvas(sliderObj) {
    sliderObj.ctx.fillStyle = (sliderObj.focused) ? '#444' : "#757575";
    sliderObj.ctx.fillRect(0, 0, sliderObj.el.width, sliderObj.el.height);

    // draw the handle
    if (sliderObj.percentage !== undefined) {
        sliderObj.ctx.fillStyle = (sliderObj.focused) ? '#BBB' : "#FFF";
        sliderObj.ctx.fillRect(0, 0, sliderObj.percentage * sliderObj.el.width, sliderObj.el.height);
    }
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
    const percentage = (mouseX / rect.width);
    const clampedPercentage = Math.min(Math.max(percentage, 0), 1);
    sliderObj.percentage = clampedPercentage;
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
        const percentage = (mouseX / rect.width);
        const clampedPercentage = Math.min(Math.max(percentage, 0), 1);
        sliderObj.percentage = clampedPercentage;
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