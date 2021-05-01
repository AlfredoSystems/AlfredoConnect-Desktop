const { ipcRenderer } = nodeRequire("electron");

$("#download-current-version").text(window.process.argv[window.process.argv.length - 1]);
$("#download-new-version").text(window.process.argv[window.process.argv.length - 2]);

let downloadStarted = false;
$("#update-now-button").on("click", () => {
    ipcRenderer.send("update-now");
    $("#update-now-button").hide();
    $("#update-on-quit-button").hide();
    $("#dont-update-button").hide();
    $("#download-progress").show();
    $("#download-progress-wrapper").css("margin-top", "25px")
    $("#download-progress-wrapper").height("10px");
    downloadStarted = true;
});

ipcRenderer.on("update-progress", (e, progress) => {
    $("#download-progress").width(progress.percent + "%");
});

$("#update-on-quit-button").on("click", () => {
    ipcRenderer.send("update-on-quit");
    window.close();
});

$("#dont-update-button").on("click", () => {
    ipcRenderer.send("dont-update");
    window.close()
});

$(document).on("keydown", (e) => {
    if (e.key == "Escape" && !downloadStarted) window.close();
});

$(window).on("beforeunload", () => {
    ipcRenderer.send("abort-update");
});