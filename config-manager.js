const keyboard = require("./keyboard.js");
const terminal = require("./terminal.js");

const fs = require("fs");

let config = {
    port: null,
    autoport: false,
    legacy: false,
    baud: null,
    maxSendRate: null,
    joystick: false,
    inputs: []
}

const inputType = {
    JOY_BUTTON: 0,
    JOY_AXIS: 1,
    KEY_BUTTON: 2,
    KEY_AXIS: 3
}

function readConfig(onSuccessfulLoad) {
    resetConfig();
    if (!$("#config-file").get(0).files[0]) {
        terminal.writeErr("No configuration file selected.");
        return;
    }
    var path = $("#config-file").get(0).files[0].path;
    fs.readFile(path, (err, data) => {
        if (err) terminal.writeErr("The configuration file " + path + " could not be loaded.");
        var lines = data.toString().split('\n');
        var i = 1;
        try {
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
                    var button = line.split(',');
                    if (isNaN(parseInt(button[2]))) {
                        config.inputs.push({
                            type: inputType.KEY_BUTTON, 
                            name: button[1],
                            key: button[2].replace('#', '').charCodeAt(0)
                        });
                    } else {
                        config.joystick = true;
                        config.inputs.push({
                            type: inputType.JOY_BUTTON, 
                            name: button[1],
                            joyIndex: parseInt(button[2]),
                            index: parseInt(button[3])
                        });
                    }
                } else if (line.startsWith("axis")) {
                    var axis = line.split(',');
                    if (isNaN(parseInt(axis[2]))) {
                        config.inputs.push({
                            type: inputType.KEY_AXIS,
                            name: axis[1],
                            forwardKey: axis[2].replace('#', '').charCodeAt(0),
                            backwardKey: axis[3].replace('#', '').charCodeAt(0)
                        });
                    } else {
                        config.joystick = true;
                        config.inputs.push({
                            type: inputType.JOY_AXIS,
                            name: axis[1],
                            joyIndex: parseInt(axis[2]),
                            index: parseInt(axis[3])
                        });
                    }
                }
                i++;
            });
            module.exports.valid = true;
            onSuccessfulLoad(config);
        } catch (err) {
            terminal.writeErr("Parsing of " + path + " failed on line " + i + ".");
            resetConfig();
        }
    });
}

function resetConfig() {
    config = {
        port: null,
        autoport: false,
        legacy: false,
        baud: null,
        maxSendRate: null,
        joystick: false,
        inputs: []
    }
}

function doGamepadsSatisfyConfig(gamepads) {
    var gamepadsRequired = 0;
    var buttonsRequired = [];
    var axesRequired = [];
    config.inputs.forEach(input => {
        if (input.type === inputType.JOY_BUTTON) {
            gamepadsRequired = Math.max(gamepadsRequired, input.joyIndex + 1);
            if (!buttonsRequired[input.joyIndex]) buttonsRequired[input.joyIndex] = 0;
            buttonsRequired[input.joyIndex] = Math.max(buttonsRequired[input.joyIndex], input.index + 1);
        }
        else if (input.type === inputType.JOY_AXIS) {
            gamepadsRequired = Math.max(gamepadsRequired, input.joyIndex + 1);
            if (!axesRequired[input.joyIndex]) axesRequired[input.joyIndex] = 0;
            axesRequired[input.joyIndex] = Math.max(axesRequired[input.joyIndex], input.index + 1);
        }
    });
    if (gamepadsRequired > gamepads.length) {
        terminal.writeErr("Configuration file requires " + gamepadsRequired + " gamepads, but "
            + (gamepads.length > 0 ? "only " + gamepads.length : "none")
            + (gamepads.length === 1 ? " is" : " are") + " connected. "
            + "Waiting for gamepad requirement to be satisfied.");
        return false;
    }
    for (var i = 0; i < buttonsRequired.length; i++) {
        if (buttonsRequired[i] > gamepads[i].buttons.length) {
            terminal.writeErr("Configuration file requires " + buttonsRequired[i] + " buttons on gamepad " + i
                + ", but " + (gamepads[i].buttons.length > 0 ? "only " + gamepads[i].buttons.length : "none")
                + (gamepads[i].buttons.length === 1 ? " is" : " are") + " present. "
                + "Waiting for button requirement to be satisfied.");
            return false;
        }
    }
    for (var i = 0; i < axesRequired.length; i++) {
        if (axesRequired[i] > gamepads[i].axes.length) {
            terminal.writeErr("Configuration file requires " + axesRequired[i] + " axes on gamepad " + i
                + ", but " + (gamepads[i].axes.length > 0 ? "only " + gamepads[i].axes.length : "none")
                + (gamepads[i].axes.length === 1 ? " is" : " are") + " present. "
                + "Waiting for axis requirement to be satisfied.");
            return false;
        }
    }
    return true;
}

function assembleConfigPacket(gamepads) {
    if (!doGamepadsSatisfyConfig(gamepads)) return null;
    var packet = config.legacy ? "z" : "a";
    config.inputs.forEach(input => {
        switch (input.type) {
            case inputType.JOY_BUTTON:
                packet += +gamepads[input.joyIndex].buttons[input.index].value.toFixed(2);
                break;
            case inputType.JOY_AXIS:
                packet += +gamepads[input.joyIndex].axes[input.index].toFixed(2);
                break;
            case inputType.KEY_BUTTON:
                packet += Key.isDown(input.key) ? 1 : 0;
                break;
            case inputType.KEY_AXIS:
                if (keyboard.isDown(input.forwardKey) && !keyboard.isDown(input.backWardKey)) packet += 1;
                else if (keyboard.isDown(input.backwardKey) && !keyboard.isDown(input.forwardKey)) packet += -1;
                else packet += 0
                break;
        }
        packet += ";";
    });
    if (!config.legacy) packet += "z";
    return packet;
}

module.exports = {
    read: readConfig,
    assemblePacket: assembleConfigPacket,
    valid: false 
}
