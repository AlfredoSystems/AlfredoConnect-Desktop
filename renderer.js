// TODO: small window has horizontal scroll bar when not needed

const gamepads = require("./gamepads.js");
const keyboard = require("./keyboard.js");
const terminal = require("./terminal.js");
const connection = require("./connection.js");
const configManager = require("./config-manager.js");
const packetAssembler = require("./packet-assembler.js");

require("jquery-sortablejs");

let packetSender = null;

function onConfigLoad(config) {
    connection.open(config.port, onPortOpen);
}

// function onPortOpen() {
//     if (!configManager.valid) return;
//     packetSender = window.setInterval(() => {
//         if (connection.isOpen()) {
//             var packet = configManager.assemblePacket(gamepads.getSorted());
//             if (packet) connection.send(packet); 
//         }
//         else clearInterval(packetSender);
//     }, configManager.maxSendRate ? (1000.0 / config.maxSendRate) : 20);
// }

function onPortOpen() {
    packetSender = window.setInterval(() => {
        if (connection.isOpen()) {
            let packet = packetAssembler.assemblePacket(keyboard.getPressed(), gamepads.getSorted());
            if (packet) connection.send(packet);
        } else clearInterval(packetSender);
    }, 1000.0 / 60.0);
}

$(document).ready(() => {
    window.setInterval(gamepads.renderState, 20);
    connection.updateList();
    gamepads.update();
    $("#port-refresh").click(connection.updateList);
    $("#port-select").on("change", () => terminal.clearError("port-open-null"));
    $("#port-open").click(() => connection.open($("#port-select").val(), onPortOpen));
    $("#port-close").click(connection.close);
    $("#config-file").on("input", () => configManager.read(onConfigLoad));
    $("#terminal-input").keydown((e) => {
        if (e.keyCode == 13 && !e.shiftKey) {
            e.preventDefault();    
            connection.sendEcho(terminal.getInput());
            terminal.clearInput();
        }
    });
    $("#terminal-send").click(() => {
        connection.sendEcho(terminal.getInput()); // TODO: terminal sending should have option delimiter
        terminal.clearInput();
    });
    $("#gamepad-list").sortable();
    $(window).on("gamepadconnected", gamepads.update);
    $(window).on("gamepaddisconnected", gamepads.update);
    $(window).on("resize", () => $("#gamepad-list").children().css("max-width", $("#gamepad-list").css("width")));
});
