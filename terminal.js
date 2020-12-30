// TODO what if i let people send html to the terminal?
// TODO or just terminal colors (ansi_up npm lib)
// TODO or maybe being able to edit the previous line (loading bars etc)
// TODO: hash symbol (#) shouldn't be allowed to be typed into terminal without selecting an option
// TODO: right click on terminal for clear output

let lines = 0;
const MAX_LINES = 200; // TODO: make this configurable with a performance warning

let terminalTextHeight;

// TODO: scroll to bottom button (bottom right of terminal, floating circle button) only when not at bottom
// TODO: doesn't seem like there's any way to make autoscrolling performant for the size that the terminal-text
// div is going to grow to. probably means we need to start throwing out old text at some point instead of keeping
// it all. profile to figure out how big the div can grow before old lines should be removed.
function terminalWrite(str) {
    lines += str.split("\n").length - 1;
    $("#terminal-text").append(document.createTextNode(str));
    while (lines > MAX_LINES) {
        let removed = $("#terminal-text").contents().first(() => { return this.nodeType === 3; }).remove();
        lines -= removed.text().split("\n").length - 1;
    }
    // Scroll down when scroll bar appears to activate scroll anchor
    if (terminalTextHeight && terminalTextHeight <= $("#terminal-window").height() &&
            $("#terminal-text").height() > $("#terminal-window").height()) {
        $("#terminal-window").scrollTop($("#terminal-window").prop("scrollHeight"));
    }
    terminalTextHeight = $("#terminal-text").height();
}

function terminalWriteln(str) {
    terminalWrite(str + "\n");
}

function terminalWriteInfo(str) {
    displayInfo("[Info] " + str);
}

function terminalWriteErr(str, timeout, value) {
    displayError("[Error] " + str, timeout, value);
}

function terminalWriteEcho(str) {
    terminalWrite(">>> " + str + "\n");
}

function getTerminalInput() {
    return $("#terminal-input").val();
}

function clearTerminalInput() {
    $("#terminal-input").val("");
    M.textareaAutoResize($("#terminal-input"));
}

function displayInfo(str) {
    clearInfo(() =>
        $("#terminal-info").html(document.createTextNode(str))
    );
}

function clearInfo(callback) {
    $.when($("#terminal-info").empty()).then(() => { if (callback) callback() });
}

function displayError(str, timeout, value) {
    clearError(value);
    var el = $("<div id=\"terminal-error\">" + str + "</div>").appendTo("#terminal-error-container");
    if (value) el.val(value);
    if (timeout) setTimeout(() => el.remove(), timeout * 1000);
}

function clearError(value) {
    $("#terminal-error-container").children().each(function() {
        if (value == $(this).val() || (!value && !$(this).val())) $(this).remove();
    });
}

module.exports = {
    write: terminalWrite,
    writeln: terminalWriteln,
    writeInfo: terminalWriteInfo,
    writeErr: terminalWriteErr,
    writeEcho: terminalWriteEcho,
    getInput: getTerminalInput,
    clearInput: clearTerminalInput,
    clearInfo: clearInfo,
    clearError: clearError
}
