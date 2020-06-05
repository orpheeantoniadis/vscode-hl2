'use babel';

const vscode = require('vscode');
const HepiaLight2Manager = require('./hl2-manager.js');
var hepiaLight2Manager = new HepiaLight2Manager(vscode.window.createOutputChannel('HL2 REPL'));

export async function connect() {
    try {
        let editor = vscode.window.activeTextEditor;
        if (editor) {
            let document = editor.document;
            let ports = await hepiaLight2Manager.getPorts();
            if (ports) {
                await vscode.window.showQuickPick(ports).then(async (port) => {
                    if (port) {
                        await hepiaLight2Manager.connect(document.fileName, port);
                    }
                });
            }
        }
    } catch (err) {
        await hepiaLight2Manager.destroy();
        hepiaLight2Manager.sendErr(`Cannot connect to board: ${err.message}`);
    }
}

export async function disconnect() {
    await hepiaLight2Manager.disconnect();
}

export async function run() {
    try {
        let editor = vscode.window.activeTextEditor;
        if (editor) {
            let document = editor.document;
            await hepiaLight2Manager.connectToEditor(document.fileName);
            hepiaLight2Manager.outputChannel.show(true);
            await hepiaLight2Manager.execute(document.fileName);
        }
    } catch (err) {
        hepiaLight2Manager.sendErr(`Cannot write to board: ${err.message}`);
    }
}

export async function upload() {
    try {
        let editor = vscode.window.activeTextEditor;
        if (editor) {
            let document = editor.document;
            await hepiaLight2Manager.connectToEditor(document.fileName);
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Uploading file to device's main.py",
                cancellable: false
            }, async (progress, token) => {
                let progressCounter = 0;
                let percentCount = 0;
                const progressCallback = (total) => {
                    progressCounter++;
                    let percent = progressCounter * 100.0 / total;
                    if (percent >= 1) {
                        percentCount += percent;
                        progress.report({ increment: percent, message: `${Math.round(percentCount)}%` });
                        progressCounter = 0;
                    }
                };
                hepiaLight2Manager.outputChannel.hide();
                await hepiaLight2Manager.upload(document.fileName, progressCallback);
            });
            await new Promise(resolve => setTimeout(resolve, 1000)); // Need to wait a little because the writing in the FS is asynchronous
            vscode.window.showInformationMessage('File uploaded to main.py');
            await hepiaLight2Manager.board.reset();
            await hepiaLight2Manager.disconnect();
            hepiaLight2Manager.outputChannel.clear();
        }
    } catch (err) {
        hepiaLight2Manager.sendErr(`Cannot upload to device's main.py: ${err.message}`);
    }
}

export async function update() {
    try {
        let editor = vscode.window.activeTextEditor;
        if (editor) {
            let document = editor.document;
            if (await hepiaLight2Manager.enterBootloader(document.fileName)) {
                vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: 'Updating device',
                    cancellable: true
                }, async (progress, token) => {
                    token.onCancellationRequested(() => {
                        hepiaLight2Manager.destroy();
                        hepiaLight2Manager.sendErr('Update canceled. Please disconnect and reconnect the board');
                    });
                    let progressCounter = 0;
                    const progressCallback = (increment, total, message) => {
                        progressCounter += increment;
                        let percent = progressCounter * 100.0 / total;
                        if (percent >= 1) {
                            progress.report({ increment: percent, message: message });
                            progressCounter = 0;
                        }
                    };
                    await hepiaLight2Manager.update(progressCallback);
                    vscode.window.showInformationMessage('Device successfully updated');
                    await hepiaLight2Manager.disconnect();
                    hepiaLight2Manager.outputChannel.clear();
                });
            }
        }
    } catch (err) {
        vscode.window.showErrorMessage(`Cannot update device: ${err.message}`);
    }
}