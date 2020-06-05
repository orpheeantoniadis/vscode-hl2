'use babel';

const vscode     = require('vscode');
const fs         = require('fs');
const ByteLength = require('@serialport/parser-byte-length');
const hl2_com    = require('./hl2-com.js');
const hl2_prog   = require('./hl2-prog.js');

class HepiaLight2Manager {
    constructor(outputChannel) {
        this.outputChannel = outputChannel;
        this.port = {};
        this.board = null;
        this.programmer = new hl2_prog.HepiaLight2Prog();
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

    async destroy() {
        await this.destroyBoard();
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

    async enterBootloader(fileName) {
        try {
            await this.connectToEditor(fileName);
            this.programmer.setBoard(this.board);
            await this.programmer.findFirmware();
            if (await this.board.interpreterIsActive()) {
                if (await this.programmer.checkVersion()) {
                    await this.board.update();
                    await new Promise(resolve => setTimeout(resolve, 2000)); // need to wait a little so the device can reboot
                    await this.connectToEditor(fileName);
                } else {
                    vscode.window.showInformationMessage('Firmware is up to date');
                    return false;
                }
            }
            await this.board.updateParser(new ByteLength({length: 1}));
            await new Promise(resolve => setTimeout(resolve, 1000)); // need to wait a little because of the change of the parser
            this.programmer.setBoard(this.board);
            return true;
        } catch(err) {
            throw err;
        }
    }

    async update(progressCallback) {
        try {
            this.programmer.setProgressCallback(progressCallback);
            await this.programmer.start();
        } catch(err) {
            throw err;
        }
    }
}

module.exports = HepiaLight2Manager;
