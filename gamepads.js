// TODO: gamepad button/axis display doesn't go away when controller disconnects
// TODO: right-click menu on gamepad list to allow enabling/disabling sending controllers
// TODO: show display for first gamepad when it connects

function getGamepads() {
    return Array.from(navigator.getGamepads()).filter(gamepad => gamepad);
}

function getSortedGamepads() {
    var sortedGamepads = [];
    $("#gamepad-list #gamepad").each(function() {
        sortedGamepads.push(getGamepads().find(gamepad => gamepad.index == $(this).val()));
    });
    return sortedGamepads;
}

function anyGamepadsConnected() {
    return Boolean(getGamepads().length);
}

function getSelectedGamepad() {
    var index = $("#gamepad-list .active").val();
    return getGamepads().find(gamepad => gamepad.index == index); 
}

function addGamepadLI(text, isGamepad, index) {
    $("#gamepad-list").append(
        "<li class=\"collection-item\" id=\"" + (isGamepad ? "gamepad" : "default")
        + "\" value=\"" + index + "\" style=\"white-space: nowrap; max-width: "
        + $("#gamepad-list").css("width") + "; overflow: hidden; text-overflow: ellipsis\">"
        + text + "</li>");
    if (isGamepad) $("#gamepad-list").children().last().click(function() {
        if ($(this).hasClass("active")) {
            $(this).removeClass("active");
            clearGamepadState();
        } else {
            $("#gamepad-list").children("#gamepad").removeClass("active");
            $(this).addClass("active");
        }
    });
}

function updateGamepads() {
    $("#gamepad-list").children().remove();
    if (anyGamepadsConnected()) getGamepads().forEach(gamepad => {
        addGamepadLI(getFriendlyGamepadId(gamepad), true, gamepad.index)
    });
    else addGamepadLI("Connect a controller or push a button");
}

function getFriendlyGamepadId(gamepad) {
    return gamepad.id.substring(0, gamepad.id.indexOf('(') - 1);
}

// TODO: can we do this only when state changes maybe?
function renderGamepadState() {
    var gamepad = getSelectedGamepad();
    if (!gamepad) return;
    clearGamepadState();
    var context = $("#gamepad-state").get(0).getContext("2d");
    context.font = "14px Arial" // TODO font
    context.textBaseline = "top";
    context.fillStyle = "white";
    context.fillText("Axes", 20, 10);
    const startY = 40;
    const gapY = 20;
    var col = 0;
    gamepad.axes.forEach(axis => {
        context.beginPath();
        context.moveTo(20, startY + col * gapY);
        context.lineTo(100, startY + col * gapY);
        context.lineWidth = "15";
        context.strokeStyle = "grey";
        context.stroke();
        context.beginPath();
        context.moveTo(20, startY + col * gapY);
        context.lineTo(axis * 40 + 60, startY + col * gapY);
        context.lineWidth = "15";
        context.strokeStyle = "green";
        context.stroke();
        context.font = "14px Arial"
        context.textBaseline = "middle";
        context.fillStyle = "white";
        context.fillText(col + ": " + axis.toFixed(2), 22, startY + col * gapY);
        col++;
    });
    context.font = "14px Arial"
    context.textBaseline = "top";
    context.fillStyle = "white";
    context.fillText("Buttons", 140, 10);
    const startX = 140;
    const gapX = 40;
    const maxButtonsPerCol = 5;
    var col = 0;
    var row = 0;
    gamepad.buttons.forEach(button => {
        context.beginPath();
        context.moveTo(startX + row * gapX, startY + col * gapY);
        context.lineTo(startX + row * gapX + 20, startY + col * gapY);
        context.lineWidth = "15";
        context.strokeStyle = button.value ? "green" : "grey";
        context.stroke();
        context.font = "14px Arial"
        context.textBaseline = "middle";
        context.fillStyle = "white";
        var label = col + row * maxButtonsPerCol;
        var textOffset = context.measureText(label).width * 0.5;
        context.fillText(label, startX + row * gapX + 10 - textOffset, startY + col * gapY);
        if (++col >= maxButtonsPerCol) {
            row++;
            col = 0;
        }
    });
}

function clearGamepadState() {
    var context = $("#gamepad-state").get(0).getContext("2d");
    context.clearRect(0, 0, $("#gamepad-state")[0].width, $("#gamepad-state")[0].height);
}

module.exports = {
    update: updateGamepads,
    renderState: renderGamepadState,
    getSorted: getSortedGamepads
}

