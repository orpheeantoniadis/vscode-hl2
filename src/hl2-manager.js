'use babel';

const vscode           = require('vscode');
const fs               = require('fs');
const hl2_com          = require('./hl2-com.js');
const hl2_prog         = require('./hl2-prog.js');

const EOL         = '\x0D\x0A';
const CHAR_CTRL_C = '\x03';

class HepiaLight2Manager {
    constructor(outputChannel) {
        this.outputChannel = outputChannel;
        this.port = {};
        this.board = null;
        this.programmer = null;
    }

    sendEcho(str) {
        this.outputChannel.append(str);
    }

    sendErr(err) {
        vscode.window.showErrorMessage(err);
        console.error(err);
    }

    async destroy() {
        if (this.board) {
            try {
                await this.board.destroy();
            } catch(err) {
                this.sendErr(`Failed to destroy board: ${err}`);
            }
            this.board = null;
        } else if (this.programmer) {
            await this.programmer.destroy();
            this.programmer = null;
        }
    }

    async get_port() {
        try {
            let ports = await hl2_com.find();
            return ports;
        } catch (err) {
            this.sendErr(`${err}`);
        }
    }

    async connect(fileName, port=undefined) {
        try {
            if (port === undefined) {
                let ports = await hl2_com.find();
                if (ports) {
                    port = ports[0];
                }
            }
            await this.destroy();
            this.board = new hl2_com.HepiaLight2Com(
                line => this.sendEcho(line),
                err => this.sendErr(err)
            );
            await this.board.connect_to(port);
            this.port[fileName] = port;
            vscode.window.showInformationMessage(`Connect to ${port}`);
        } catch (err) {
            this.sendErr(`Cannot connect to any board: ${err}`);
        }
    }

    async execute(fileName) {
        try {
            const data = fs.readFileSync(fileName, 'utf8');
            let ports = await hl2_com.find();
            let port = ports.find(port => port == this.port[fileName]);
            if (this.board === null || !port) {
                await this.connect(fileName, port);
            } else if (this.board.port.path != port) {
                await this.connect(fileName, port);
            }
            await this.board.executeRaw(data);
        } catch (err) {
            this.sendErr(`Cannot write to board: ${err}`);
        }
    }

    async upload(filepath) {
        try {
            if (!this.board) {
                this.board = new hl2_com.HepiaLight2Com(
                    () => {},
                    err => this.sendErr(err)
                );
                await this.board.connect();
            }

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
                await this.board.executeIntervalCommands(commands, 100, progressCallback);
                vscode.window.showInformationMessage('File uploaded to main.py');
            });
        } catch (err) {
            this.sendErr(`Cannot import file to board: ${err}`);
        }
    }

    async update() {
        try {
            await this.destroy();
            await hl2_com.find();
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
                this.programmer = new hl2_prog.HepiaLight2Prog(progressCallback);
                await this.programmer.start();
            });
        } catch (err) {
            this.sendErr(`Cannot update board: ${err}`);
        }
    }
}

module.exports = HepiaLight2Manager;
