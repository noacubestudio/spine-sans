let canvas; let ctx; let guiTextInput;

// input
let inputText = '';
const validKeysForTextInput = 'an';

// font details
const stepSize = 41;
const ysUpper = 3;
const ysLower = 3;
const ysColumn = 6;
const xsColumn = 3;
const xsGap = 1;
const oneColumnWideLetters = ['i', 'l', ' ', 'j', '.'];
const threeColumnWideLetters = ['m', 'w'];

// Load the font file
opentype.load('fonts/Columna_Bold_WIP_v1.ttf', function(err, font) {
    if (err) {
        alert('Could not load font: ' + err);
        return;
    }

    // gui
    canvas = document.getElementById('canvas');

    guiTextInput = document.getElementById("inputArea");
    guiTextInput.addEventListener("input", (e) => {
        inputText = guiTextInput.value;
        redraw(font);
    });

    // draw
    ctx = canvas.getContext('2d');
    ctx.scale(1, -1);
    ctx.translate(0, -canvas.height);

    inputText = guiTextInput.value;
    redraw(font);
});

function redraw(font) {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawInputText(inputText, font, 2, 4);
}

function drawInputText(text, font, x, y) {
    ctx.save();

    let totalColumns = 0;

    // draw the top and bottom halves of letters
    ctx.translate(x * stepSize, y * stepSize);
    text.split("").forEach((char) => {
        drawLetter(char, font, totalColumns * (xsColumn + xsGap), 0);
        const letterColumnsWidth = (oneColumnWideLetters.includes(char)) ? 1 : ((threeColumnWideLetters.includes(char)) ? 3 : 2);
        totalColumns += letterColumnsWidth;
    });

    // columns start higher up
    ctx.translate(0, ysLower * stepSize);
    drawColumns(0, totalColumns, 'curveRight');

    ctx.restore();
}

function drawLetter(char, font, x, y) {
    ctx.save();

    // Get the glyph for the letter 'A'
    const glyph = font.charToGlyph(char);
    console.log(char, glyph);

    // Create a new path object
    const path = new opentype.Path();

    // Add the glyph outlines to the path object
    glyph.path.commands.forEach(function(command) {
        if (command.type === 'M') {
            path.moveTo(command.x, command.y);
        } else if (command.type === 'L') {
            path.lineTo(command.x, command.y);
        } else if (command.type === 'Q') {
            path.quadraticCurveTo(command.x1, command.y1, command.x, command.y);
        } else if (command.type === 'C') {
            path.curveTo(command.x1, command.y1, command.x2, command.y2, command.x, command.y);
        } else if (command.type === 'Z') {
            path.closePath();
        }
    });

    // Draw the path on the canvas
    ctx.translate(x * stepSize, y * stepSize);
    path.fill = 'white';
    path.draw(ctx);

    ctx.restore();
}

function drawColumns(start, count, type) {
    if (count === undefined || count < 1) return;

    ctx.save();

    ctx.translate((xsColumn+xsGap) * stepSize * start, 0);

    ctx.rect(0, 0, (count * xsColumn + (count-1)*xsGap)*stepSize, ysColumn*stepSize)
    ctx.clip();

    if (type === 'repeat') {
        for (let i = 0; i < count; i++) {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, xsColumn * stepSize, ysColumn * stepSize);

            ctx.translate((xsColumn+xsGap) * stepSize * 1, 0);
        }
    } else if (type === "curveRight") {
        ctx.translate((xsColumn+xsGap) * stepSize * -1, 0);
        for (let i = 0; i < count+1; i++) {
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            //go right
            ctx.lineTo(xsColumn*stepSize, 0);
            //go up
            ctx.bezierCurveTo(
                (xsColumn                 )*stepSize, ysColumn*stepSize*0.5, 
                (xsColumn*2+xsGap)*stepSize, ysColumn*stepSize*0.5,
                (xsColumn*2+xsGap)*stepSize, ysColumn*stepSize*1
            );
            //go left
            ctx.lineTo((xsColumn+xsGap)*stepSize, ysColumn*stepSize*1);
            //go down
            ctx.bezierCurveTo(
                (xsColumn+xsGap)*stepSize, ysColumn*stepSize*0.5,
                0, ysColumn*stepSize*0.5,
                0, 0
            );
            ctx.fill();
            ctx.translate((xsColumn+xsGap) * stepSize * 1, 0);
        }
    }

    ctx.restore();
}