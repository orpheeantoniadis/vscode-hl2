const vscode = require('vscode');
const fs     = require('fs');
var HepiaLight2Manager;

function prepareSerialPort(cb) {
    try {
        require("serialport");
        cb()
    } catch (e) {
        console.log("Error while loading serialport library");
        console.log(e);
    }
}

function activate(context) {
    prepareSerialPort(function(error) {
        if (error) {
            var err_mess = "There was an error with your serialport module. The extension will likely not work properly. Please try to install again or report an issue on our github.";
            vscode.window.showErrorMessage(err_mess);
            console.log(err_mess);
            console.log(error);
        } else {
            HepiaLight2Manager = require('./lib/hl2-manager.js');
            var  hepiaLight2Manager = new HepiaLight2Manager(vscode.window.createOutputChannel('HL2 REPL'));

            let run_disposable = vscode.commands.registerCommand('hl2.run', function () {
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
            let upload_disposable = vscode.commands.registerCommand('hl2.upload', function () {
                let editor = vscode.window.activeTextEditor;
                if (editor) {
                    let document = editor.document;
                    try {
                        hepiaLight2Manager.upload(document.fileName);
                    } catch (err) {
                        vscode.window.showErrorMessage(err.message);
                    }
                }
            });
            let update_disposable = vscode.commands.registerCommand('hl2.update', function () {
                try {
                    hepiaLight2Manager.update();
                } catch (err) {
                    vscode.window.showErrorMessage(err.message);
                }
            });
            context.subscriptions.push(
                run_disposable,
                upload_disposable,
                update_disposable
            );
        }
    });
}
exports.activate = activate;

function deactivate() {}
exports.deactivate = deactivate
