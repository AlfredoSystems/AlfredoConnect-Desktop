// TODO what if i let people send html to the terminal?
// TODO or just terminal colors (ansi_up npm lib)
// TODO or maybe being able to edit the previous line (loading bars etc)
function terminalWrite(str) {
    $("#terminal-text").append(document.createTextNode(str));
    $("#terminal-text").scrollTop($("#terminal-text").prop("scrollHeight"));
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
