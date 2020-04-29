const vscode = require('vscode');
const command = require('./lib/command.js');

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
            let connect = vscode.commands.registerCommand('hl2.connect', () => command.connect());
            let disconnect = vscode.commands.registerCommand('hl2.disconnect', () => command.disconnect());
            let run = vscode.commands.registerCommand('hl2.run', () => command.run());
            let upload = vscode.commands.registerCommand('hl2.upload', () => command.upload());
            let update = vscode.commands.registerCommand('hl2.update', () => command.update());
            context.subscriptions.push(
                connect,
                disconnect,
                run,
                upload,
                update,
            );
        }
    });
}
exports.activate = activate;

function deactivate() {}
exports.deactivate = deactivate
