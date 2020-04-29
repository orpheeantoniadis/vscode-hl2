'use babel';

const vscode = require('vscode');
const HepiaLight2Manager = require('./hl2-manager.js');
var hepiaLight2Manager = new HepiaLight2Manager(vscode.window.createOutputChannel('HL2 REPL'));

export async function connect() {
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
}

export async function disconnect() {
    await hepiaLight2Manager.disconnect();
}

export function run() {
    let editor = vscode.window.activeTextEditor;
    if (editor) {
        let document = editor.document;
        hepiaLight2Manager.execute(document.fileName);
    }
}

export function upload() {
    let editor = vscode.window.activeTextEditor;
    if (editor) {
        let document = editor.document;
        try {
            hepiaLight2Manager.upload(document.fileName);
        } catch (err) {
            vscode.window.showErrorMessage(err.message);
        }
    }
}

export function update() {
    try {
        hepiaLight2Manager.update();
    } catch (err) {
        vscode.window.showErrorMessage(err.message);
    }
}