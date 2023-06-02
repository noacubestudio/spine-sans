// load fonts into this
const loadedFonts = {
    bold: {},
    double: {}
};

// font details
const fontMetrics = {
    bold: {
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

// later, different buffers will have their own parameters?
// but those are set...
// also, I need to have an a/b set to lerp between? or at least swap out with animation
const parameters = {
    topFont: "bold",
    bottomFont: "double",
    colHeight: 16,
    fontSize: 12
}


// DOM elements
let mainCanvasEl; let ctx; 
let textInputEl;

// current text to display, also contains column counts
// computed from the actual string
let words = [];


function updateCanvasSize() {
    const newWidth = Math.floor(window.innerWidth - 400);
    mainCanvasEl.width = newWidth;
    mainCanvasEl.style.width = newWidth + 'px';
}

mainCanvasEl = document.getElementById('mainCanvas');
window.addEventListener('DOMContentLoaded', updateCanvasSize);

textInputEl = document.getElementById("textInput");


window.setup = () => {
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
    mainCanvasEl.addEventListener('click', () => {
        if (document.activeElement !== textInputEl) {
            textInputEl.focus();
        }
    });
    textInputEl.addEventListener("input", () => {
        updateWordsArray(textInputEl.value);
        redraw();
    });
      
    window.addEventListener('resize', () => {updateCanvasSize(); redraw()});

    // draw
    ctx = mainCanvasEl.getContext('2d');

    updateWordsArray(textInputEl.value);
    redraw();
}

function updateWordsArray(inputString) {
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

    const splitWords = inputString.toLowerCase().split(/[^a-z]/i);
    words = [];
    splitWords.forEach((wordString) => {
        if (wordString.length > 0) {
            const charsArr = arrFromWordString(wordString);
            const totalCols = charsArr.reduce((total, obj) => total + obj.columns, 0);
            words.push({chars: charsArr, totalCols})
        }
    });
}

function redraw() {
    // background
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, mainCanvasEl.width, mainCanvasEl.height);

    // draw text and columns
    ctx.fillStyle = '#ffffffff';
    
    const styleMetrics = fontMetrics[parameters.topFont];
    const advanceWidth = (styleMetrics.colWidth + styleMetrics.colGap) * styleMetrics.colMultiplier;
    const advanceHeight = styleMetrics.halfHeight * 2 + parameters.colHeight + 3;

    const maxColsInLine = 26;
    let colsAdvanced = 0;
    let linesAdvanced = 0;

    words.forEach((word) => {
        if (colsAdvanced + word.totalCols > maxColsInLine && word.totalCols <= maxColsInLine) {
            colsAdvanced = 0;
            linesAdvanced++;
        }
        const xPos = 30 + colsAdvanced * advanceWidth * parameters.fontSize;
        const yPos = 50 + linesAdvanced * advanceHeight * parameters.fontSize;
        drawWord(xPos, yPos, word, parameters);
        colsAdvanced += (word.totalCols + 1);
    });
    

    // buffer test drawing
    // buffer3d.fill(0);
    // buffer3d.box(100);
    // ctx.drawImage(buffer3d.canvas, 0, 0, 1360, 800);
}

function drawWord(x, y, wordObj, parameters) {
    ctx.save();
    ctx.translate(x, y);
    
    const scale = parameters.fontSize || 30;
    ctx.scale(scale, scale);
    ctx.lineWidth = 2/scale;

    // draw the halves
    ctx.save();
    wordObj.chars.forEach((charObj) => {
        // draw
        drawGlyphHalves(charObj.char, parameters);

        // advance to next character
        const styleMetrics = fontMetrics[parameters.topFont];
        const advanceWidth = charObj.columns * (styleMetrics.colWidth + styleMetrics.colGap) * styleMetrics.colMultiplier;
        ctx.translate(advanceWidth, 0);
    });
    ctx.restore();

    // draw the columns
    // WIP...
    ctx.translate(0, fontMetrics[parameters.topFont].halfHeight);
    drawColumns(wordObj.chars, wordObj.totalCols, parameters);
    
    ctx.restore();
}

function drawGlyphHalves(char, parameters) {
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

function drawColumns(charObjArray, totalCols, parameters) {
    if (parameters.colHeight === undefined || parameters.colHeight === 0) return;
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
        curvedRect(topAdvanceWidth * topCol, bottomAdvanceWidth * (topCol + bendCols), 0, topWidth, bottomWidth, parameters.colHeight)
    }


    // end clipping
    ctx.restore();
}

function curvedRect(xTop, xBottom, y, widthTop, widthBottom, height) {
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