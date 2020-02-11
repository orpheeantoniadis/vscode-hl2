'use babel';

const vscode           = require('vscode');
const fs               = require('fs');
const hl2_com   = require('./hl2-com.js');
const HepiaLight2Prog  = require('./hl2-prog.js');

const EOL         = '\x0D\x0A';
const CHAR_CTRL_C = '\x03';
const CHAR_CTRL_D = '\x04';
const CHAR_CTRL_E = '\x05';

class HepiaLight2Manager {
    constructor(outputChannel) {
        this.outputChannel = outputChannel;
        this.board = null;
        this.programmer = null;
    }

    sendEcho(str) {
        this.outputChannel.append(str);
    }

    sendErr(err) {
        vscode.window.showErrorMessage(err);
    }

    async destroy() {
        if (this.board) {
            try {
                await this.board.destroy();
            } catch (err) {
                this.sendErr(`Failed to destroy board: ${err}`);
                console.error(
                    `Failed to destroy board:\n${err.message}\n${err.stack}`
                );
            }
            this.board = null;
        } else if (this.programmer) {
            try {
                await this.programmer.destroy();
            } catch (err) {
                this.sendErr(`Failed to destroy programmer: ${err}`);
                console.error(
                    `Failed to destroy programmer:\n${err.message}\n${err.stack}`
                );
            }
            this.programmer = null;
        }
    }

    async connect() {
        let ports = await hl2_com.find_all();
        vscode.window.showQuickPick(ports).then(val => {
            vscode.window.showInformationMessage(`Connect to ${val}`);
        });
        console.log(ports);
    }

    async execute(code) {
        await this.destroy();
        try {
            this.board = new hl2_com.HepiaLight2Com(
                line => this.sendEcho(line),
                err => this.sendErr(err)
            );
            await this.board.connect();
            await this.board.executeRaw(code);
        } catch (err) {
            this.sendErr(`Cannot write to board: ${err}`);
        }
    }

    async upload(filepath) {
        await this.destroy();
        try {
            var commands = [
                CHAR_CTRL_C,
                "file = open('main.py', 'w+')",
                EOL
            ];
            let data = fs.readFileSync(filepath, 'utf8');
            for (let line of data.split('\n')) {
                line = line.split(String.raw`'`).join(String.raw`\'`);
                line = line.split(String.raw`"`).join(String.raw`\"`);
                commands.push(String.raw`file.write('${line}\n')`);
                commands.push(EOL);
            }
            commands.push('file.close()');
            commands.push(EOL);

            this.board = new hl2_com.HepiaLight2Com(
                () => {},
                err => this.sendErr(err)
            );

            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Uploading file to device's main.py",
                cancellable: false
            }, async (progress, token) => {
                let progressCounter = 0;
                let total = commands.length;
                let percentCount = 0;
                const progressCallback = () => {
                    progressCounter++;
                    let percent = progressCounter * 100.0 / total;
                    if (percent >= 1) {
                        percentCount += percent;
                        progress.report({ increment: percent, message: `${Math.round(percentCount)}%` });
                        progressCounter = 0;
                    }
                };

                await this.board.connect();
                await this.board.executeIntervalCommands(commands, 100, progressCallback);
                vscode.window.showInformationMessage('File uploaded to main.py');
            });
        } catch (err) {
            this.sendErr(`Cannot import file to board: ${err}`);
        }
    }

    async update() {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Updating device',
            cancellable: true
        }, async (progress, token) => {
            token.onCancellationRequested(() => {
                this.destroy();
                this.sendErr('Update canceled. Please disconnect and reconnect the board');
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

            await this.destroy();
            this.programmer = new HepiaLight2Prog(progressCallback);
            await this.programmer.start();
        });
    }
}

module.exports = HepiaLight2Manager;
