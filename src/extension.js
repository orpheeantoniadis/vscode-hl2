const vscode        = require('vscode');
const fs = require('fs');
const HepiaLight2Manager = require('./hl2-manager.js');

const  hepiaLight2Manager = new HepiaLight2Manager(vscode.window.createOutputChannel('HL2 REPL'));

function activate(context) {
    let run_disposable = vscode.commands.registerCommand('extension.run', function () {
        let editor = vscode.window.activeTextEditor;
        if (editor) {
            let document = editor.document;
            hepiaLight2Manager.outputChannel.show(preserveFocus=true);
            try {
                const data = fs.readFileSync(document.fileName, 'utf8');
                hepiaLight2Manager.execute(data);
            } catch (err) {
                vscode.window.showErrorMessage(err.message);
            }
        }
    });

    let update_disposable = vscode.commands.registerCommand('extension.update', function () {
        hepiaLight2Manager.outputChannel.hide();
        try {
            hepiaLight2Manager.update();
        } catch (err) {
            vscode.window.showErrorMessage(err.message);
        }
    });

    context.subscriptions.push(run_disposable, update_disposable);
}
exports.activate = activate;

function deactivate() {}

module.exports = {
    activate,
    deactivate
}
