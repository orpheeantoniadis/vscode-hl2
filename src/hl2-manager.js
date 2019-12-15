const vscode           = require('vscode');
const path             = require('path');
const HepiaLight2Com   = require('./hl2-com.js');
const HepiaLight2Prog  = require('./hl2-prog.js');

const firmware_version = '0.4.1';
const firmware_path    = path.resolve(__dirname, `../resources/binaries/firmware-${firmware_version}.bin`);

class HepiaLight2Manager {
    constructor(outputChannel) {
        this.outputChannel = outputChannel;
        this.board = null;
        this.fimware_uptodate = false;
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
                console.error(
                    `Failed to destroy to board:\n${err.message}\n${err.stack}`
                );
                this.sendErr(`Failed to destroy to board: ${err}`);
            }
            this.board = null;
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
        await this.destroy();
        let programmer = new HepiaLight2Prog(this.board);
        await programmer.start();
    }
}

module.exports = HepiaLight2Manager;
