const serialport = require('serialport');
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

function consoleWrite(str) {
    $("#console-text").append(document.createTextNode(str)); // TODO: color?
    $("#console").scrollTop($("#console").prop("scrollHeight"));
}

$(document).ready(() => {
    updatePorts();
    $("#port-refresh").click(updatePorts);
    $("#port-open").click(openPort);
    $("#port-close").click(closePort);
    $("#w").click(() => send("w"));
    $("#console-input").keydown((e) => {
        if (e.keyCode == 13 && !e.shiftKey) {
            e.preventDefault();    
            consoleSend();
        }
    });
});
