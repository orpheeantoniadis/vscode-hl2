const vscode        = require('vscode');
const path          = require('path');
const {PythonShell} = require("python-shell");
const semver        = require('semver');
const fs = require('fs');
const HepiaBoardManager = require('./HepiaBoardManager.js');

const firmware_version    = '0.4.1';
const find_script_path    = path.resolve(__dirname, '../scripts/hl2-find.py');
const run_script_path     = path.resolve(__dirname, '../scripts/hl2-run.py');
const program_script_path = path.resolve(__dirname, '../scripts/hl2-program.py');
const version_script_path = path.resolve(__dirname, '../scripts/hl2-version.py');
const firmware_path       = path.resolve(__dirname, `../resources/binaries/firmware-${firmware_version}.bin`);

const  hepiaBoardManager = new HepiaBoardManager(vscode.window.createOutputChannel('HL2 REPL'));

let script_running = false;
let fimware_uptodate = false;

function activate(context) {
    let run_disposable = vscode.commands.registerCommand('extension.run', function () {
        if (script_running) {
            vscode.window.showErrorMessage('hepiaLight2 is busy');
        } else {
            let editor = vscode.window.activeTextEditor;
            if (editor) {
                let document = editor.document;
                hepiaBoardManager.outputChannel.show();
                try {
                    const data = fs.readFileSync(document.fileName, 'utf8');
                    hepiaBoardManager.write(data);
                } catch (err) {
                    console.error(err);
                }

                // PythonShell.run(find_script_path, {}, function(err, results) {
                //     results.forEach(element => {
                //         if (element == 'No hepiaLight2 connected') {
                //             vscode.window.showErrorMessage(element);
                //             script_running = false;
                //         } else {
                //             vscode.window.showInformationMessage(element);
                //             vscode.window.showInformationMessage(`Running ${path.basename(document.fileName)} on hepiaLight2...`);
                //             PythonShell.run(run_script_path, {args : [document.fileName]}, function(err, results) {
                //                 results.forEach(element => {
                //                     vscode.window.showInformationMessage(element);
                //                     script_running = false;
                //                 });
                //             });
                //         }
                //     });
                // });
            }
        }
    });

    let update_disposable = vscode.commands.registerCommand('extension.update', function () {
        if (script_running) {
            vscode.window.showErrorMessage('hepiaLight2 is busy');
        } else {
            script_running = true;	
            PythonShell.run(find_script_path, {}, function(err, results) {
                results.forEach(element => {
                    if (element == 'No hepiaLight2 connected') {
                        vscode.window.showErrorMessage(element);
                        script_running = false;
                    } else {
                        vscode.window.showInformationMessage(element);
                        PythonShell.run(version_script_path, {}, function(err, results) {
                            results.forEach(element => {
                                fimware_uptodate = semver.gte(element, firmware_version);
                                if (!fimware_uptodate) {
                                    vscode.window.showInformationMessage(`Updating hepiaLight2 firmware to version ${firmware_version}...`);
                                    PythonShell.run(program_script_path, {args : [firmware_path]}, function(err, results) {
                                        results.forEach(element => {
                                            vscode.window.showInformationMessage(element);
                                            script_running = false;
                                            fimware_uptodate = true;
                                        });
                                    });
                                } else {
                                    vscode.window.showInformationMessage(`Firmware is up to date (version ${element})`);
                                    script_running = false;
                                }
                            });
                        });
                    }
                });
            });
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
