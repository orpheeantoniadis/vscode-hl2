const vscode           = require('vscode');
const HepiaLight2Com   = require('./hl2-com.js');
const HepiaLight2Prog  = require('./hl2-prog.js');

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

    async execute(code) {
        await this.destroy();
        try {
            this.board = new HepiaLight2Com(
                line => this.sendEcho(line),
                err => this.sendErr(err)
            );
            await this.board.connect();
            await this.board.executeRaw(code);
        } catch (err) {
            this.sendErr(`Cannot write to board: ${err}`);
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
