'use babel';

const vscode           = require('vscode');
const fs               = require('fs');
const hl2_com          = require('./hl2-com.js');
const hl2_prog         = require('./hl2-prog.js');

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
    }

    async destroyBoard() {
        let port = '';
        if (this.board !== null) {
            try {
                if (this.board.port !== null) {
                    port = this.board.port.path;
                    await this.board.destroy();
                }
                this.board = null;
            } catch(err) {
                this.sendErr(`Failed to disconnect board: ${err.message}`);
                console.error(err);
            }
        }
        return port;
    }

    async destroyProgrammer() {
        if (this.programmer !== null) {
            await this.programmer.destroy();
            this.programmer = null;
        }
    }

    async destroy() {
        await this.destroyBoard();
        await this.destroyProgrammer();
    }

    async getPorts() {
        try {
            let ports = await hl2_com.find();
            return ports;
        } catch (err) {
            this.sendErr(`${err.message}`);
            console.error(err);
        }
    }

    async connect(fileName, port=undefined) {
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
        await this.board.connectTo(port);
        this.port[fileName] = port;
        vscode.window.showInformationMessage(`Connect to ${port}`);
    }

    async disconnect() {
        let port = await this.destroyBoard();
        if (port !== '') {
            vscode.window.showInformationMessage(`Disconnect port ${port}`);
        }
    }

    async connectToEditor(fileName) {
        let ports = await hl2_com.find();
        let port = ports.find(port => port == this.port[fileName]);
        if (this.board === null || this.board.port === null || port === undefined) {
            await this.connect(fileName, port);
        } else if (this.board.port.path != port) {
            await this.connect(fileName, port);
        }
        if (this.board === null) {
            throw new Error('Connection failed');
        }
    }

    async execute(fileName) {
        const data = fs.readFileSync(fileName, 'utf8');
        await this.board.executeRaw(data);
    }

    async upload(fileName, progressCallback) {
        let data = fs.readFileSync(fileName, 'utf8');
        await this.board.uploadFile('main.py', data, progressCallback);
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
