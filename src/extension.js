const vscode = require('vscode');
const path = require('path');
const {PythonShell} = require("python-shell");

function activate(context) {
	let run_disposable = vscode.commands.registerCommand('extension.run', function () {
		let editor = vscode.window.activeTextEditor;
		if (editor) {
			let document = editor.document;
			let script_path = path.resolve(__dirname, '../scripts/hl2-bridge.py');
			PythonShell.run(script_path, {args : [document.fileName]}, function(err, results) {
				if (err) throw err;
				results.forEach(element => {
					vscode.window.showInformationMessage(element);
				});
			});
		}
	});

	let update_disposable = vscode.commands.registerCommand('extension.update', function () {
		let script_path = path.resolve(__dirname, '../scripts/hl2-program.py');
		let firmware_path = path.resolve(__dirname, "../resources/binaries/hepialight2-firmware.bin");
		PythonShell.run(script_path, {args : [firmware_path]}, function(err, results) {
			if (err) throw err;
			results.forEach(element => {
				vscode.window.showInformationMessage(element);
			});
		});
	});

	context.subscriptions.push(run_disposable);
}
exports.activate = activate;

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
