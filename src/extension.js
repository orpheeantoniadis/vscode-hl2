const vscode = require('vscode');
const path = require('path');
const {PythonShell} = require("python-shell");

function activate(context) {
	let run_disposable = vscode.commands.registerCommand('extension.run', function () {
		let editor = vscode.window.activeTextEditor;
		if (editor) {
			let find_script_path = path.resolve(__dirname, '../scripts/hl2-find.py');
			let bridge_script_path = path.resolve(__dirname, '../scripts/hl2-bridge.py');
			let document = editor.document;

			PythonShell.run(find_script_path, {}, function(err, results) {
				results.forEach(element => {
					if (element != "No hepiaLight2 connected") {
						element = "Running on " + element;
					}
					vscode.window.showInformationMessage(element);
				});
			});

			PythonShell.run(bridge_script_path, {args : [document.fileName]}, function(err, results) {
				results.forEach(element => {
					vscode.window.showInformationMessage(element);
				});
			});
		}
	});

	let update_disposable = vscode.commands.registerCommand('extension.update', function () {
		let find_script_path = path.resolve(__dirname, '../scripts/hl2-find.py');
		let program_script_path = path.resolve(__dirname, '../scripts/hl2-program.py');
		let firmware_path = path.resolve(__dirname, "../resources/binaries/hepialight2-firmware.bin");

		PythonShell.run(find_script_path, {}, function(err, results) {
			results.forEach(element => {
				if (element != "No hepiaLight2 connected") {
					element = "Updating " + element;
				}
				vscode.window.showInformationMessage(element);
			});
		});

		PythonShell.run(program_script_path, {args : [firmware_path]}, function(err, results) {
			results.forEach(element => {
				vscode.window.showInformationMessage(element);
			});
		});
	});

	context.subscriptions.push(run_disposable, update_disposable);
}
exports.activate = activate;

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
