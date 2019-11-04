// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const path = require('path');
const {PythonShell} = require("python-shell");

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let upload_disposable = vscode.commands.registerCommand('extension.upload', function () {
		let editor = vscode.window.activeTextEditor;
		if (editor) {
			let document = editor.document;
			PythonShell.run(path.resolve(__dirname, 'hl2-bridge.py'), {args : [document.fileName]}, function(err, results) {
				if (err) throw err;
				results.forEach(element => {
					vscode.window.showInformationMessage(element);
				});
			});
		}
	});

	context.subscriptions.push(upload_disposable);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
