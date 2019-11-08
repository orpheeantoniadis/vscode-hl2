const vscode = require('vscode');
const path = require('path');
const {PythonShell} = require("python-shell");

const find_script_path = path.resolve(__dirname, '../scripts/hl2-find.py');
const bridge_script_path = path.resolve(__dirname, '../scripts/hl2-bridge.py');
const program_script_path = path.resolve(__dirname, '../scripts/hl2-program.py');
const firmware_path = path.resolve(__dirname, "../resources/binaries/hepialight2-firmware.bin");

let script_running = false;

function activate(context) {
	let run_disposable = vscode.commands.registerCommand('extension.run', function () {
		let editor = vscode.window.activeTextEditor;

		if (script_running) {
			vscode.window.showErrorMessage("hepiaLight2 is busy");
		} else {
			if (editor) {
				let document = editor.document;

				script_running = true;
				PythonShell.run(find_script_path, {}, function(err, results) {
					results.forEach(element => {
						if (element != "No hepiaLight2 connected") {
							vscode.window.showInformationMessage("Running on " + element);
						} else {
							vscode.window.showErrorMessage(element);
							script_running = false;
						}
					});
				});

				PythonShell.run(bridge_script_path, {args : [document.fileName]}, function(err, results) {
					results.forEach(element => {
						vscode.window.showInformationMessage(element);
						script_running = false;
					});
				});
			}
		}
	});

	let update_disposable = vscode.commands.registerCommand('extension.update', function () {
		if (script_running) {
			vscode.window.showErrorMessage("hepiaLight2 is busy");
		} else {
			script_running = true;	
			PythonShell.run(find_script_path, {}, function(err, results) {
				results.forEach(element => {
					if (element != "No hepiaLight2 connected") {
						vscode.window.showInformationMessage("Updating " + element);
					} else {
						vscode.window.showErrorMessage(element);
						script_running = false;
					}
					
				});
			});

			PythonShell.run(program_script_path, {args : [firmware_path]}, function(err, results) {
				results.forEach(element => {
					vscode.window.showInformationMessage(element);
					script_running = false;
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
