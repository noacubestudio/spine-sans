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
    colHeight: 8,
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


window.setup = () => {
    // load json 
    fetch('./fonts/SpineSans_Bold_svg.json')
    .then((response) => response.json())
    .then((json) => jsonLoaded(json, "bold"));
}
function jsonLoaded(json, fontNameKey) {

    // p5 setup
    //buffer3d = createGraphics(1360, 800, WEBGL);

    // gui
    
    textInputEl = document.getElementById("textInput");

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

    //json
    loadedFonts[fontNameKey] = json;

    updateWordsArray(textInputEl.value);
    redraw();
}

function updateWordsArray(inputString) {
    function countColumnsOfChar(char) {
        return "wm".includes(char) ? 3
            : "ijltf. ".includes(char) ? 1
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
    
    const styleMetrics = fontMetrics["bold"];
    const advanceWidth = (styleMetrics.colWidth + styleMetrics.colGap) * styleMetrics.colMultiplier;
    const advanceHeight = styleMetrics.halfHeight * 2 + parameters.colHeight + 3;

    let colsAdvanced = 0;
    let linesAdvanced = 0;

    words.forEach((word) => {
        if (colsAdvanced + word.totalCols > 20 && word.totalCols <= 20) {
            colsAdvanced = 0;
            linesAdvanced++;
        }
        const xPos = 30 + colsAdvanced * advanceWidth * parameters.fontSize;
        const yPos = 50 + linesAdvanced * advanceHeight * parameters.fontSize;
        drawWord(xPos, yPos, word, "bold", parameters);
        colsAdvanced += (word.totalCols + 1);
    });
    

    // buffer test drawing
    // buffer3d.fill(0);
    // buffer3d.box(100);
    // ctx.drawImage(buffer3d.canvas, 0, 0, 1360, 800);
}

function drawWord(x, y, wordObj, style, parameters) {
    ctx.save();
    ctx.translate(x, y);
    
    const scale = parameters.fontSize || 30;
    ctx.scale(scale, scale);
    ctx.lineWidth = 2/scale;

    // draw the halves
    ctx.save();
    wordObj.chars.forEach((charObj) => {
        // draw
        drawGlyphHalves(charObj.char, style, parameters.colHeight);

        // advance to next character
        const styleMetrics = fontMetrics[style];
        const advanceWidth = charObj.columns * (styleMetrics.colWidth + styleMetrics.colGap) * styleMetrics.colMultiplier;
        ctx.translate(advanceWidth, 0);
    });
    ctx.restore();

    // draw the columns
    // WIP...
    ctx.translate(0, fontMetrics[style].halfHeight);
    drawColumns(wordObj.chars, wordObj.totalCols, style, parameters);
    
    ctx.restore();
}

function drawGlyphHalves(char, style, colHeight) {
    // get the svg data
    const svgGlyphObj = loadedFonts[style].characters[char];
    if (svgGlyphObj === undefined) {
        console.log(char + " was not found in the font object");
        ctx.translate(4, 0);
        return;
    }

    ctx.save();

    // draw top
    ctx.save();
    if (svgGlyphObj.top.up !== undefined) ctx.translate(0, -Number(svgGlyphObj.top.up));
    if (svgGlyphObj.top.left !== undefined) ctx.translate(-Number(svgGlyphObj.top.left), 0);
    svgGlyphObj.top.paths.forEach((path) => ctx.fill(new Path2D(path)));
    ctx.restore();

    // go down top half height and column height
    ctx.translate(0, fontMetrics[style].halfHeight + colHeight);

    // draw bottom
    ctx.save();
    if (svgGlyphObj.bottom.left !== undefined) ctx.translate(-Number(svgGlyphObj.bottom.left), 0);
    svgGlyphObj.bottom.paths.forEach((path) => ctx.fill(new Path2D(path)));
    ctx.restore();

    ctx.restore();
}

function drawColumns(charObjArray, totalCols, style, parameters) {
    if (parameters.colHeight === undefined || parameters.colHeight === 0) return;
    if (charObjArray.length === 0) return;

    const colWidth = fontMetrics[style].colWidth;
    const advanceWidth = colWidth + fontMetrics[style].colGap;

    // basic rectangles
    // for (let col = 0; col < totalCols; col++) {
    //     ctx.fillRect(col * (advanceWidth), 0, colWidth, parameters.colHeight);
    // }

    // clipping rectangle
    ctx.beginPath();
    ctx.rect(0, 0, advanceWidth * (totalCols-1) + colWidth, parameters.colHeight);
    // ctx.strokeStyle = "red";
    // ctx.stroke();

    ctx.save();
    ctx.clip();

    // bend effect
    for (let topCol = -1; topCol < totalCols; topCol++) {
        curvedRect(advanceWidth * topCol, 0, colWidth, parameters.colHeight, advanceWidth)
    }

    // end clipping
    ctx.restore();
}

function curvedRect(x, y, width, height, xBottomOffset) {
    ctx.beginPath();

    // Top side
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);

    // Right side with vertical bezier handle
    ctx.bezierCurveTo(
        x + width, y + height * 0.5, 
        x + width + xBottomOffset, y + height * 0.5, 
        x + width + xBottomOffset, y + height
    );

    // Bottom side
    ctx.lineTo(x + xBottomOffset, y + height);

    // Left side with vertical bezier handle
    ctx.bezierCurveTo(
        x + xBottomOffset, y + height * 0.5,
        x, y + height * 0.5,
        x, y
    );

    ctx.fill();
}


// function drawColumns(start, count, type) {
//     if (count === undefined || count < 1) return;

//     ctx.save();

//     ctx.translate((xsColumn+xsGap) * stepSize * start, 0);

//     ctx.rect(0, 0, (count * xsColumn + (count-1)*xsGap)*stepSize, ysColumn*stepSize)
//     ctx.clip();

//     if (type === 'repeat') {
//         for (let i = 0; i < count; i++) {
//             ctx.fillStyle = 'white';
//             ctx.fillRect(0, 0, xsColumn * stepSize, ysColumn * stepSize);

//             ctx.translate((xsColumn+xsGap) * stepSize * 1, 0);
//         }
//     } else if (type === "curveRight") {
//         ctx.translate((xsColumn+xsGap) * stepSize * -1, 0);
//         for (let i = 0; i < count+1; i++) {
//             ctx.fillStyle = 'white';
//             ctx.beginPath();
//             ctx.moveTo(0, 0);
//             //go right
//             ctx.lineTo(xsColumn*stepSize, 0);
//             //go up
//             ctx.bezierCurveTo(
//                 (xsColumn                 )*stepSize, ysColumn*stepSize*0.5, 
//                 (xsColumn*2+xsGap)*stepSize, ysColumn*stepSize*0.5,
//                 (xsColumn*2+xsGap)*stepSize, ysColumn*stepSize*1
//             );
//             //go left
//             ctx.lineTo((xsColumn+xsGap)*stepSize, ysColumn*stepSize*1);
//             //go down
//             ctx.bezierCurveTo(
//                 (xsColumn+xsGap)*stepSize, ysColumn*stepSize*0.5,
//                 0, ysColumn*stepSize*0.5,
//                 0, 0
//             );
//             ctx.fill();
//             ctx.translate((xsColumn+xsGap) * stepSize * 1, 0);
//         }
//     }

//     ctx.restore();
// }