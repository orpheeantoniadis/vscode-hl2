const vscode     = require('vscode');
const HepiaBoard = require('./HepiaBoard.js');

class HepiaBoardManager {
    constructor(outputChannel) {
        this.outputChannel = outputChannel;
        this.board = null;
    }

    sendEcho(str) {
        this.outputChannel.append(str);
    }

    sendErr(err) {
        console.log(err);
    }

    async write(code) {
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

        try {
            this.board = new HepiaBoard(
                line => this.sendEcho(line),
                err => this.sendErr(err)
            );
            await this.board.connect();
            await this.board.execute(code);
        } catch (err) {
            console.error(
                `Cannot write to board:\n${err.message}\n${err.stack}`
            );
            this.sendErr(`Cannot write to board: ${err}`);
        }
    }
}

module.exports = HepiaBoardManager;
