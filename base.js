let canvasEl; let ctx; 
let textInputEl;

// wip
//let buffer3d; let buffer2d;


// input
let inputText = 'aa';
const skipColumnDrawingChars = ". ";

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
    colHeight: 1,
    fontSize: 20
}


// load p5 first
window.setup = () => {
    // p5 setup
    //buffer2d = createGraphics(1360, 800);
    //buffer3d = createGraphics(1360, 800, WEBGL);

    // load json 
    fetch('./fonts/SpineSans_Bold_svg.json')
    .then((response) => response.json())
    .then((json) => jsonLoaded(json, "bold"));
}

function jsonLoaded(json, fontNameKey) {
    // gui
    canvasEl = document.getElementById('canvas');

    textInputEl = document.getElementById("inputArea");
    textInputEl.addEventListener("input", (e) => {
        inputText = textInputEl.value;
        redraw();
    });

    // draw
    ctx = canvasEl.getContext('2d');

    //json
    loadedFonts[fontNameKey] = json;

    inputText = textInputEl.value;
    redraw();
}

function redraw() {
    // background
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

    // draw text and columns
    ctx.fillStyle = 'white';
    drawText(50, 70, inputText, "bold", parameters);

    // buffer test drawing
    // buffer2d.background(255);
    // buffer2d.fill(0);
    // buffer2d.rect(100, 100, 200, 200);

    // buffer3d.fill(0);
    // buffer3d.box(100);

    // ctx.drawImage(buffer3d.canvas, 0, 0, 1360, 800);
}

function drawText(x, y, text, style, parameters) {
    ctx.save();
    ctx.translate(x, y);
    
    const scale = parameters.fontSize || 30;
    ctx.scale(scale, scale);

    const charObjArray = charObjArrayFromString(text);

    // draw the halves
    charObjArray.forEach((charObj) => {
        // draw
        drawGlyphHalves(charObj.char, style, parameters.colHeight);

        // advance to next character
        const styleMetrics = fontMetrics[style];
        const advanceWidth = charObj.columns * (styleMetrics.colWidth + styleMetrics.colGap) * styleMetrics.colMultiplier;
        ctx.translate(advanceWidth, 0);
    });

    // draw the columns
    // WIP...
    
    ctx.restore();
}

function getColumnCount(char) {
    return "wm".includes(char) ? 3
        : "ijltf. ".includes(char) ? 1
        : 2; // Default value if not found in single or triple column sets
}

function charObjArrayFromString(text) {
    return [...text].map((c) => {
        return {
            char: c, 
            columns: getColumnCount(c)
        } 
    });
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