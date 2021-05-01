// TODO: small window has horizontal scroll bar when not needed

const gamepads = nodeRequire("./gamepads.js");
const keyboard = nodeRequire("./keyboard.js");
const terminal = nodeRequire("./terminal.js");
const connection = nodeRequire("./connection.js");
// const configManager = nodeRequire("./config-manager.js");
const packetAssembler = nodeRequire("./packet-assembler.js");

nodeRequire("jquery-sortablejs");

let packetSender = null;

// function onConfigLoad(config) {
//     connection.open(config.port, onPortOpen);
// }

function onPortOpen() {
    packetSender = window.setInterval(() => {
        if (connection.isOpen()) {
            let packet = packetAssembler.assemblePacket(keyboard.getPressed(), gamepads.getSorted());
            if (packet) connection.send(packet); // TODO: option for send echo? maybe not, probably not useful
        } else clearInterval(packetSender);
    }, 1000.0 / 60.0); // TODO: packets per second
}

$(() => {
    window.setInterval(gamepads.renderState, 20);
    connection.updateList();
    gamepads.update();
    $("#port-refresh").on("click", connection.updateList);
    $("#port-select").on("change", () => terminal.clearError("port-open-null"));
    $("#port-open").on("click", () => connection.open($("#port-select").val(), onPortOpen));
    $("#port-close").on("click", connection.close);
    // $("#config-file").on("input", () => configManager.read(onConfigLoad));
    $("#terminal-input").on("keydown", (e) => {
        if (e.key == "Enter" && !e.shiftKey) {
            e.preventDefault();    
            connection.sendEcho(terminal.getInput());
            terminal.clearInput();
        }
    });
    $("#terminal-send").on("click", () => {
        connection.sendEcho(terminal.getInput()); // TODO: terminal sending should have option delimiter
        terminal.clearInput();
    });
    $("#gamepad-list").sortable();
    $(window).on("gamepadconnected", gamepads.update);
    $(window).on("gamepaddisconnected", gamepads.update);
    $(window).on("resize", () => {
        $("#gamepad-list").children().css("max-width", $("#gamepad-list").css("width"));
        $("html").height(Math.max($(window).height(), $(document).height()) + "px");
    });
});