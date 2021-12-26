const backupTypeToClassColor = {
    SCHEDULED: 'text-secondary',
    MANUAL: 'text-info',
    ON_STOP: 'text-primary',
    ON_FORCED_STOP: 'text-danger',
}

function getClassForBackup(backupName) {
    const backupType = backupName.replace(/((\d+_)|(\.zip))/gi, '');
    return backupTypeToClassColor[backupType] || '';
}

function formatBytes(a, b = 3) {
    if (0 === a) return "0 Bytes";
    const c = 0 > b ? 0 : b,
        d = Math.floor(Math.log(a) / Math.log(1024));
    return (
        parseFloat((a / Math.pow(1024, d)).toFixed(c)) +
        " " + ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"][d]
    );
}

function sec2time(timeInSeconds) {
    var pad = function(num, size) {
            return ("000" + num).slice(size * -1);
        },
        time = parseFloat(timeInSeconds).toFixed(3),
        hours = Math.floor(time / 3600),
        minutes = Math.floor(time / 60) % 60,
        seconds = Math.floor(time - minutes * 60),
        milliseconds = time.slice(-3);
    return (
        pad(hours, 2) +
        ":" +
        pad(minutes, 2) +
        ":" +
        pad(seconds, 2) +
        "." +
        pad(milliseconds, 3)
    );
}

let inputAdminCodeHash;

function updateCurrentAdminCodeHash() {
    inputAdminCodeHash = sjcl.codec.hex
        .fromBits(
            sjcl.hash.sha256.hash(
                document.getElementById("admin-code").value || ""
            )
        )
        .toUpperCase();
}

const interactionButtons = [
    "toggle-restore-backup-controls-button",
    "stop-server-button",
    "trigger-manual-backup-button",
    "print-resource-usage-button",
    "print-player-list-button",
    "restore-backup-dropdown-button",
    "trigger-restore-backup-button"
].map(id => document.getElementById(id));

function disableInteraction() {
    interactionButtons.forEach(button => {
        button.disabled = true;
    });
}

function enableInteraction() {
    interactionButtons.forEach(button => {
        button.disabled = false;
    });
}

function attemptLogin() {
    fetch("/salt")
        .then(response => response.text())
        .then(salt => {
            updateCurrentAdminCodeHash();
            const xhr = new XMLHttpRequest();
            xhr.open("GET", "/is-auth-valid", true);
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.setRequestHeader(
                "Authorization",
                sjcl.codec.hex.fromBits(
                    sjcl.hash.sha256.hash(
                        inputAdminCodeHash + salt.toUpperCase()
                    )
                )
            );
            xhr.send(JSON.stringify({}));
            xhr.onload = (res) => {
                if (xhr.response === 'true') {
                    document.getElementById('login-content').hidden = true;
                    document.getElementById('post-login-content').hidden = false;
                } else {
                    alert('Incorrect admin code');
                }
                enableInteraction();
            };
        });

}

function refreshTerminalOutput() {
    fetch("/terminal-out")
        .then(response => response.text())
        .then(text => {
            document.getElementById("server-terminal-output").innerHTML = text;
        }).catch(function() {
            document.getElementById("server-terminal-output").innerHTML = 'Error connecting to server';
        });
}

function refreshServerResourceUsageInfo() {
    fetch("/resource-usage")
        .then(response => response.json())
        .then(stats => {
            const statsText = [];
            statsText.push(
                `Resource Usage as of ${new Date().toLocaleString()}:`
            );
            statsText.push(
                `CPU Percentage (from 0 to 100*vcore): ${stats.cpu.toFixed(3)}%`
            );
            statsText.push(`RAM: ${formatBytes(stats.memory)}`);
            statsText.push(
                `Wrapped Server Uptime : ${sec2time(
                    Math.round(stats.elapsed / 1000)
                )} (hh:mm:ss)`
            );
            document.getElementById(
                "server-resource-usage-text"
            ).innerHTML = statsText.join("\n");
        }).catch(function() {
            document.getElementById("server-resource-usage-text").innerHTML = 'Error connecting to server';
        });
}

function refreshServerInfo() {
    refreshTerminalOutput();
    refreshServerResourceUsageInfo();
}

let refreshInterval;
document.getElementById("refresh-rate").value = 5000;

function setRefreshRate() {
    const refreshRate = document.getElementById("refresh-rate").value;
    refreshServerInfo();
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    refreshInterval = setInterval(refreshServerInfo, refreshRate);
}
setRefreshRate();

document.getElementById("refresh-rate").addEventListener("change", setRefreshRate);

function stopServer() {
    disableInteraction();
    fetch("/salt")
        .then(response => response.text())
        .then(salt => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", "/stop", true);
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.setRequestHeader(
                "Authorization",
                sjcl.codec.hex.fromBits(
                    sjcl.hash.sha256.hash(
                        inputAdminCodeHash + salt.toUpperCase()
                    )
                )
            );
            xhr.send(JSON.stringify({}));
            xhr.onload = () => {
                setSelectedBackup(null);
                enableInteraction();
            };
        });
}

function triggerManualBackup() {
    disableInteraction();
    fetch("/salt")
        .then(response => response.text())
        .then(salt => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", "/trigger-manual-backup", true);
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.setRequestHeader(
                "Authorization",
                sjcl.codec.hex.fromBits(
                    sjcl.hash.sha256.hash(
                        inputAdminCodeHash + salt.toUpperCase()
                    )
                )
            );
            xhr.send(JSON.stringify({}));
            xhr.onload = () => {
                enableInteraction();
            };
        });
}

function triggerPrintResourceUsage() {
    disableInteraction();
    fetch("/salt")
        .then(response => response.text())
        .then(salt => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", "/trigger-print-resource-usage", true);
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.setRequestHeader(
                "Authorization",
                sjcl.codec.hex.fromBits(
                    sjcl.hash.sha256.hash(
                        inputAdminCodeHash + salt.toUpperCase()
                    )
                )
            );

            xhr.send(JSON.stringify({}));
            xhr.onload = () => {
                enableInteraction();
            };
        });
}

function triggerPrintPlayerList() {
    disableInteraction();
    fetch("/salt")
        .then(response => response.text())
        .then(salt => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", "/trigger-print-player-list", true);
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.setRequestHeader(
                "Authorization",
                sjcl.codec.hex.fromBits(
                    sjcl.hash.sha256.hash(
                        inputAdminCodeHash + salt.toUpperCase()
                    )
                )
            );

            xhr.send(JSON.stringify({}));
            xhr.onload = () => {
                enableInteraction();
            };
        });
}

function triggerRestoreBackup() {
    disableInteraction();
    fetch("/salt")
        .then(response => response.text())
        .then(salt => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", "/trigger-restore-backup", true);
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.setRequestHeader(
                "Authorization",
                sjcl.codec.hex.fromBits(
                    sjcl.hash.sha256.hash(
                        inputAdminCodeHash + salt.toUpperCase()
                    )
                )
            );
            xhr.send(
                JSON.stringify({
                    backup: document.getElementById("selected-backup").innerHTML
                })
            );
            xhr.onload = () => {
                enableInteraction();
            };
        });
}

function getBackupDescriptionString(backup) {
    if (!backup) {
        return '';
    }
    const numberPrefixRegex = /^\d*/;
    const timestamp = (backup.name || "").match(numberPrefixRegex)[0];
    return timestamp ?
        ` (${backup.sizeString}, Likely created on ${new Date(timestamp * 1000).toLocaleString()})` :
        "";
}

function refreshBackupList() {
    setSelectedBackup(null);
    fetch("/backup-size-list")
        .then(response => response.json())
        .then(backups => {
            const dropdownOptions = document.getElementById(
                "restore-backup-options"
            );
            dropdownOptions.innerHTML = "";
            backups.forEach(backup => {
                const option = document.createElement("a");
                option.className = "dropdown-item " + getClassForBackup(backup.name);
                option.textContent = backup.name + getBackupDescriptionString(backup);
                option.value = backup.name;
                option.addEventListener("click", () =>
                    setSelectedBackup(backup)
                );
                dropdownOptions.appendChild(option);
            });
        });
}

function setSelectedBackup(backup) {
    document.getElementById("selected-backup").innerHTML = backup?.name || '';
    document.getElementById(
        "selected-backup-timestamp"
    ).innerHTML = getBackupDescriptionString(backup);
    if (!backup) {
        document.getElementById(
            "trigger-restore-backup-button"
        ).disabled = true;
    } else {
        document.getElementById(
            "trigger-restore-backup-button"
        ).disabled = false;
    }
}

document
    .getElementById("login-button")
    .addEventListener("click", attemptLogin);

document
    .getElementById("admin-code")
    .addEventListener("keyup", function(event) {
        if (event.keyCode === 13) { // "Enter" key
            // Cancel the default action, if needed
            event.preventDefault();
            // Trigger the button element with a click
            document.getElementById("login-button").click();
        }
    });

document
    .getElementById("stop-server-button")
    .addEventListener("click", stopServer);

document
    .getElementById("trigger-manual-backup-button")
    .addEventListener("click", triggerManualBackup);

document
    .getElementById("print-resource-usage-button")
    .addEventListener("click", triggerPrintResourceUsage);

document
    .getElementById("print-player-list-button")
    .addEventListener("click", triggerPrintPlayerList);

document
    .getElementById("toggle-restore-backup-controls-button")
    .addEventListener("click", refreshBackupList); // also refreshes it on close, but nbd

document
    .getElementById("trigger-restore-backup-button")
    .addEventListener("click", triggerRestoreBackup);
