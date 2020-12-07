const keyToNum = require("./keyboard-code-map.js").keyToNum;

const MAX_BUTTONS_PRESSED = 106;
let keysPressed = new Uint8Array(MAX_BUTTONS_PRESSED);
let keysPressedSize = 0;

let keysNewlyPressed = new Uint8Array(MAX_BUTTONS_PRESSED);
let keysNewlyPressedSize = 0;

let keysToRemove = new Uint8Array(MAX_BUTTONS_PRESSED);
let keysToRemoveSize = 0;

$(document).ready(() => {
    $(window).on("keydown", (event) => {
        let key = keyToNum[event.code];
        // In case the key was already flagged for removal, don't remove it
        keysToRemoveSize = removeAll(keysToRemove, keysToRemoveSize, key);
        if (!keysPressed.subarray(0, keysPressedSize).some(value => { return value == key; })) {
            keysPressed[keysPressedSize++] = key;
            keysNewlyPressed[keysNewlyPressedSize++] = key;
        }
    });
    $(window).on("keyup", (event) => {
        let key = keyToNum[event.code];
        // If the key was pressed and released without being read, flag it for removal after being read
        if (keysNewlyPressed.subarray(0, keysNewlyPressedSize).some(value => { return value == key; })) {
            keysToRemove[keysToRemoveSize++] = keyToNum[event.code];
        } else keysPressedSize = removeAll(keysPressed, keysPressedSize, key);
    });
    $(window).on("blur", () => {
        keysPressedSize = 0;
        keysNewlyPressedSize = 0;
        keysToRemoveSize = 0;
    });
});

/**
 * Returns a Uint8Array where each byte corresponds to a pressed key, based on the keyToNum map in ./keyboard-code-map.js.
 */
function getKeysPressed() {
    let ret = keysPressed.slice(0, keysPressedSize);
    // Now that pressed keys have been read at least once, remove keys that have been released
    keysToRemove.forEach(key => keysPressedSize = removeAll(keysPressed, keysPressedSize, key));
    keysToRemoveSize = 0;
    keysNewlyPressedSize = 0;
    return ret;
}

/**
 * Helper function to remove all instances of a value from a Uint8Array and left-shifts on deletion.
 * Returns the new size of the array.
 * @param {Uint8Array} array
 * @param {Number} size
 * @param {Number} value
 */
function removeAll(array, size, value) {
    for (let i = size - 1; i >= 0; i--) {
        if (array[i] == value) {
            size--;
            for (let j = i; j < size; j++) array[j] = array[j + 1];
        }
    }
    return size;
}

module.exports.getPressed = getKeysPressed;