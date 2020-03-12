const serialport = require("serialport");
require("jquery-sortablejs");
const fs = require("fs");
let port = null;

function updatePorts() {
    serialport.list().then(ports => {
        $("#port-select").val("default");
        $("#port-select").children("#port").remove();
        var portArray = Object.keys(ports).map(key => { return [key, ports[key]]; });
        portArray.sort((a, b) => { return a[1].path.localeCompare(b[1].path); });
        $.each(portArray, (i, metadata) => 
            $("#port-select").append("<option id=port value=\"" + metadata[1].path + "\">" + metadata[1].path + "</option>"));
        $('#port-select').formSelect();
    });
}

function openPort() {
    var portId = $("#port-select").val();
    if (portId != null) {
        // TODO: baud rate is 9600 here, not auto
        port = new serialport(portId, err => {
            if (err) console.log("open error", err.message);
            else {
                $("#port-close").removeClass("disabled");
                setUpPort();
            }
        });
        console.log("port opened", port);
    } else console.log("port null!");
}

function closePort() {
    if (port) port.close();
}

function onData(data) {
    consoleWrite(data.toString());
}

function setUpPort() {
    port.on("data", (data) => onData(data));
    // TODO: port.on("readable", () => console.log("recv: ", port.read().toString()));
    port.on("close", (err) => {
        console.log("port closed: ", err ? err.message : "clean");
        $("#port-close").addClass("disabled");
    });
}

function send(str) {
    if (port != null) port.write(str, err => {
        if (err) console.log("write error", err.message);
    });
    else consoleWrite("[Error] No serial port is open.\n"); 
}

function consoleSend() {
    consoleWrite(">>> " + $("#console-input").val() + "\n");
    send($("#console-input").val() + "\n"); // TODO: delimiter here should be pickable
    $("#console-input").val("");
    M.textareaAutoResize($("#console-input"));
}

// TODO what if i let people send html to the console?
// TODO or just terminal colors (ansi_up npm lib)
// TODO or maybe being able to edit the previous line (loading bars etc)
function consoleWrite(str) {
    $("#console-text").append(document.createTextNode(str)); // TODO: color?
    $("#console").scrollTop($("#console").prop("scrollHeight"));
}

function getGamepads() {
    return Array.from(navigator.getGamepads()).filter(gamepad => gamepad);
}

function anyGamepadsConnected() {
    return Boolean(Array.from(navigator.getGamepads()).filter(gamepad => gamepad).length);
}

function getSelectedGamepad() {
    var id = $("#gamepad-list .active").text();
    return getGamepads().find(gamepad => gamepad.id.valueOf() == id.valueOf()); 
}

function addGamepadLI(text, isGamepad) {
    $("#gamepad-list").append(
        "<li class=\"collection-item\" id=\"" + (isGamepad ? "gamepad" : "default")
        + "\" style=\"white-space: nowrap; max-width: "
        + $("#gamepad-list").css("width") + "; overflow: hidden; text-overflow: ellipsis\">"
        + text + "</li>");
    // TODO: make sure this works with multiple controllers
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
    if (anyGamepadsConnected()) getGamepads().forEach(gamepad => addGamepadLI(gamepad.id, true));
    else addGamepadLI("Connect a controller or push a button");
}

// TODO: can we do this only when state changes maybe?
function renderGamepadState(gamepad) {
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

function readConfig(filename) {
    var config = {
        port: null,
        autoport: false,
        legacy: false,
        baud: null,
        maxSendRate: null,
        joystick: false,
        buttons: [],
        axes: [],
    }
    fs.readFile(filename, (err, data) => {
        if (err) return console.log("couldn't open " + filename);
        var lines = data.toString().split('\n');
        lines.forEach(line => {
            if (line.startsWith("COM")) {
                var num = parseInt(line.substring(3).replace('=', ''));
                if (!isNaN(num)) config.port = "COM" + num;
                else config.port = line.substring(3).replace('=', '').trim();
            } else if (line.startsWith("AUTOPORT") && line.indexOf("true") != -1) config.autoport = true;
            else if (line.startsWith("LEGACY") && line.indexOf("true") != -1) config.legacy = true;
            else if (line.startsWith("BAUD")) config.baud = parseInt(line.split("=")[1]);
            else if (line.startsWith("FPS")) config.maxSendRate = parseInt(line.split("=")[1]);
            else if (line.startsWith("JOYSTICK") && line.indexOf("true") != -1) config.joystick = true; 
            else if (line.startsWith("button")) {
                var button = line.split(",");
                if (parseInt(button[2]) != -1) {
                    config.joystick = true;
                    config.buttons.push([0, button[1], button[2], button[3]]);
                } else {
                    config.buttons.push([button[1], button[2].replace('#', ''), button[3].replace('#', '')]);
                }
            } else if (line.startsWith("axis")) {
                var axisConfig = line.split(",");
                if (parseInt(axisConfig[2]) != -1) {
                    config.joystick = true;
                    config.axes.push([1, axisConfig[1], axisConfig[2], axisConfig[3]]);
                } else {
                    config.axes.push([button[1], button[2].replace('#', ''), button[3].replace('#', '')]);
                }
            }
        });
    });
    console.log(config);
    return config;
}

$(document).ready(() => {
    window.setInterval(() => renderGamepadState(getSelectedGamepad()), 20);
    updatePorts();
    updateGamepads();
    $("#port-refresh").click(updatePorts);
    $("#port-open").click(openPort);
    $("#port-close").click(closePort);
    $("#config-file").on("change", () => readConfig($("#config-file").get(0).files[0].path));
    $("#console-input").keydown((e) => {
        if (e.keyCode == 13 && !e.shiftKey) {
            e.preventDefault();    
            consoleSend();
        }
    });
    $("#gamepad-list").sortable();
    $(window).on("gamepadconnected", updateGamepads);
    $(window).on("gamepaddisconnected", updateGamepads);
    $(window).on("resize", () => $("#gamepad-list").children().css("max-width", $("#gamepad-list").css("width")));
});
