// TODO: can we show friendly port names
// TODO: this would probably all be cleaner if reorganized to use promises instead of the serialport events
//   or just using something for synchronization. ex: the port-select dropdown greys out when connecting and
//   connected because disconnecting and connecting to a new port at the same time forms a race condition where
//   if the disconnection happens after connecting to a new port, the UI breaks because onPortClose runs while
//   a connection stays open. idea: use state variable like a semaphore so methods will hang until state is
//   connected/disconnected like they expect.
// TODO: open button should be disabled when port is open
// TODO: automatic reconnecting

const terminal = require("./terminal.js");

const serialport = require("serialport");

const States = {
    DISCONNECTED: 0,
    CONNECTED: 1,
    RECONNECTING: 2,
    WAITING: 3
}

let state = States.CONNECTED;
let port = null;

function updatePortList() {
    return serialport.list().then(ports => {
        $("#port-select").val("default");
        $("#port-select").children("#port").remove();
        var portArray = Object.keys(ports).map(key => { return [key, ports[key]]; });
        portArray.sort((a, b) => { return a[1].path.localeCompare(b[1].path); });
        $.each(portArray, (i, metadata) => {
            $("#port-select").append(
                "<option id=port value=\"" + metadata[1].path + "\">"
                + metadata[1].path
                + "</option>"
            );
        });
        $("#port-select").formSelect();
    });
}

function openPort(portId, callback) {
    if (portId == null) {
        terminal.writeErr("No serial port is selected.", 5, "port-open-null");
        return;
    } else if (port && portId == port.path && port.isOpen) {
        terminal.writeErr("Connection with " + port.path + " is already open.", 5,
            "port-already-open");
        return;
    } else if (port && port.isOpen) port.close();
    
    // Even if we're reopening the same port, we want to construct a new serialport because of the
    // ESP32 failure described in https://github.com/espressif/arduino-esp32/issues/3657. If this
    // deadlock happens, the serialport no longer displays new text, even after the ESP32 is hard
    // reset, which fixes the problem ESP32-side and lets the ESP32 start sending text again.
    // Constructing a new serialport every time means that hard resetting the ESP32, then opening
    // and closing the connection will fix the problem.
    port = new serialport(portId, { // TODO: baud configuration
        autoOpen: false
    });
    port.on("open", () => onPortOpen(callback));
    port.on("data", data => onPortData(data));
    // TODO: is "readable" event better than "data"? https://serialport.io/docs/api-stream
    port.on("error", err => onPortError(err));
    port.on("close", err => onPortClose(err));
    // TODO: drain event
    $("#port-select").attr("disabled", "true");
    $("#port-select").formSelect();
    terminal.writeInfo("Connecting to " + port.path + "..."); // TODO: loading indicator
    port.open();
}

function onPortOpen(callback) {
    terminal.clearError("port-open-fail");
    terminal.clearError("port-disconnected");
    terminal.clearError("port-write-closed");
    $("#port-close").removeClass("disabled");
    updatePortList().then(() => {  // TODO: can we do this only if the port is not already in there
        $("#port-select").val(port.path)
        $("#port-select").formSelect();
    });
    terminal.writeInfo("Connection with " + port.path + " opened. Baud rate: " + port.baudRate + ".");
    state = States.CONNECTED;
    if (callback) callback();
}

function onPortError(err) {
    terminal.clearInfo();
    if (err.message.startsWith("Opening")) terminal.writeErr("Connection with " + port.path + " could not be opened.", 5, "port-open-fail");
    $("#port-select").removeAttr("disabled");
    $("#port-select").formSelect();
    state = States.DISCONNECTED;
}

function onPortClose(err) {
    if (err && err.disconnected) terminal.writeErr(port.path + " disconnected.", 0, "port-disconnected");
    else terminal.writeInfo("Connection with " + port.path + " closed.");
    $("#port-close").addClass("disabled");
    $("#port-select").removeAttr("disabled");
    $("#port-select").formSelect();
    state = States.DISCONNECTED;
}

function onPortData(data) {
    terminal.write(data.toString());
}

function closePort() {
    if (port && port.isOpen) port.close();
    else terminal.writeErr("No connection is open.", 5, "port-close-null");
}

function send(str) {
    if (port != null) port.write(str, err => {
        if (err) terminal.writeErr("Write to " + port.path + " failed.", 5, "port-write-failed");
    });
    else terminal.writeErr("No serial port is open.", 5, "port-write-closed");
}

function sendEcho(str) {
    terminal.writeEcho(str);
    send(str); // TODO: delimiter here should be pickable
}

function isPortOpen() {
    if (port) return port.isOpen;
    return false;
}

module.exports = {
    updateList: updatePortList,
    open: openPort,
    close: closePort,
    send: send,
    sendEcho: sendEcho,
    isOpen: isPortOpen
}
