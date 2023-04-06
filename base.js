let canvas; let ctx;

// font details
const unitSize = 41;
const unitsUpperHalf = 3;
const unitsLowerHalf = 3;
const unitsColumnHeight = 6;
const unitsColumnWidth = 3;
const unitsColumnGap = 1;

// Load the font file
opentype.load('fonts/230406_test.ttf', function(err, font) {
    if (err) {
      alert('Could not load font: ' + err);
      return;
    }

    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    ctx.scale(1, -1)
    ctx.translate(0, -canvas.height)
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.translate(1 * unitSize, 2 * unitSize);
    drawLetter('a', font, 0, 0);
    drawLetter('n', font, 8, 0);
    drawLetter('n', font, 16, 0);

    ctx.translate(0, unitsLowerHalf * unitSize);
    drawColumns(0, 6, "repeat");
});

function drawLetter(char, font, x, y) {
    ctx.save();

    // Get the glyph for the letter "A"
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
    ctx.translate(x * unitSize, y * unitSize);
    path.fill = "white";
    path.draw(ctx);

    ctx.restore();
}

function drawColumns(start, count, type) {
    ctx.save();

    ctx.translate((unitsColumnWidth+unitsColumnGap) * unitSize * start, 0);

    if (type === "repeat") {
        for (let i = 0; i < count; i++) {
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, unitsColumnWidth * unitSize, unitsColumnHeight * unitSize);

            ctx.translate((unitsColumnWidth+unitsColumnGap) * unitSize * 1, 0);
        }
    }

    ctx.restore();
}