'use babel';

const vscode         = require('vscode');
const Readline       = require('@serialport/parser-readline');
const ByteLength     = require('@serialport/parser-byte-length');
const glob           = require('glob');
const path           = require('path');
const fs             = require('fs');
const semver         = require('semver');
const { crc32 }      = require('crc');
const HepiaLight2Com = require('./hl2-com.js');

const EOL             = '\x0A\x0D';
const CHAR_CTRL_C     = '\x03';
const DATA_CHUNK_SIZE = 256;

class HepiaLight2Prog {
    constructor(progressCallback) {
        this.board           = null;
        this.bootloaderMode  = false;
        this.firmwareVersion = '0.0.0';
        this.firmwarePath    = '';
        this.firmwareLength  = 0;
        this.progressCallback = progressCallback;
    }

    async destroy() {
        if (this.board) {
            try {
                await this.board.destroy();
            } catch (err) {
                console.error(
                    `Failed to destroy board:\n${err.message}\n${err.stack}`
                );
                this.sendErr(`Failed to destroy board: ${err}`);
            }
            this.board = null;
        }
    }

    async findFirmware() {
        return new Promise((resolve, reject) => {
            glob(__dirname + '/../resources/binaries/firmware-*.bin', {}, (err, files) => {
                files.forEach(file => {
                    let words = path.basename(file, path.extname(file)).split('-');
                    if (words.length == 2) {
                        if (words[0] == 'firmware' && semver.valid(words[1])) {
                            if (semver.gte(words[1], this.firmwareVersion)) {
                                this.firmwareVersion = words[1];
                                this.firmwarePath = file;
                            }
                        }
                    }
                });
                if (this.firmwareVersion == '0.0.0') {
                    reject('No valid firmware found');
                }
                this.firmwareLength = fs.statSync(this.firmwarePath).size;
                resolve();
            });
        });
    }

    async checkBootloaderMode() {
        try {
            this.board = new HepiaLight2Com(
                data => this.onData(data),
                err => this.onError(err),
                new Readline('\n')
            );
            await this.board.connect();
            await this.board.executeIntervalCommands([CHAR_CTRL_C, EOL]);
            return new Promise(async (resolve) => {
                const timeoutCallback = () => {
                    this.destroy();
                    this.bootloaderMode = true;
                    console.log('Board is in bootloader mode')
                    resolve();
                };
                let timeout = setTimeout(timeoutCallback, 2000);
                let data = await this.board.read();
                while (data != '>>> \r' && !this.bootloaderMode) {
                    data = await this.board.read();
                }
                clearTimeout(timeout);
                await this.destroy();
                resolve();
            });
        } catch (err) {
            throw err;
        }
    }

    async checkVersion() {
        if (!this.bootloaderMode) {
            this.board = new HepiaLight2Com(
                data => this.onData(data),
                err => this.onError(err),
                new Readline('\n')
            );
            await this.board.connect();
            await this.board.executeIntervalCommands([CHAR_CTRL_C, 'version()', EOL]);
            let data = await this.board.read();
            while (data != '>>> version()\r') {
                data = await this.board.read();
            }
            data = await this.board.read();
            let boardVersion = data.substring(1, data.length-2);
            await this.destroy();
            if (semver.valid(boardVersion)) {
                return semver.gt(this.firmwareVersion, boardVersion);
            } else {
                throw "Invalid Version : The board's firmware version must be greater than or equal to 0.4.0 to use this functionality"
            }
        }
        return true;
    }

    async callBootloader() {
        if (!this.bootloaderMode) {
            this.board = new HepiaLight2Com(
                data => this.onData(data),
                err => this.onError(err),
                new Readline('\n')
            );
            await this.board.connect();
            await this.board.executeIntervalCommands([CHAR_CTRL_C, 'update()', EOL]);
            await this.destroy();
            this.bootloaderMode = true;
        }
    }

    async put(data) {
        await this.board.write(data);
    }

    async putInt(data) {
        let buffer = Buffer.alloc(4);
        buffer.writeUInt32BE(data);
        await this.put(buffer);
    }

    async get() {
        return await this.board.read();
    }

    async wait(data) {
        while (await this.get() != data);
    }

    async handshake() {
        this.board = new HepiaLight2Com(
            data => this.onData(data),
            err => this.onError(err),
            new ByteLength({length: 1})
        );
        await this.board.connect();
        await this.put('r');
        await this.wait('r');
    }

    async waitOk() {
        let char = '\0';
        while (char != 'o')  {
            char = await this.get();
            if (char == 'e') {
                return true;
            }
        }
        return false;
    }

    async sendSize() {
        let error = true;
        while (error) {
            await this.putInt(this.firmwareLength);
            error = await this.waitOk();
        }
    }

    async sendData(data) {
        let error = true;
        let dataChecksum = crc32(data);
        while (error) {
            await this.put('d');
            error = await this.waitOk();
            if (!error) {
                await this.putInt(dataChecksum);
                error = await this.waitOk();
                if (!error) {
                    await this.put(data);
                    error = await this.waitOk();
                }
            }
        }
    }

    async sendFirmware() {
        let dataSend = 0
        let fd = fs.openSync(this.firmwarePath, 'r+');
        while (dataSend < this.firmwareLength) {
            let buffer = Buffer.alloc(DATA_CHUNK_SIZE);
            let dataRead = fs.readSync(fd, buffer, 0, DATA_CHUNK_SIZE, dataSend);
            buffer = buffer.slice(0, dataRead);
            await this.sendData(buffer);
            dataSend += buffer.length;
            this.progressCallback(buffer.length, this.firmwareLength, `${dataSend}/${this.firmwareLength}`);
        }
    }

    async sendChecksum() {
        let error = true;
        let firmwareChecksum = crc32(fs.readFileSync(this.firmwarePath));
        while (error) {
            await this.put('c');
            error = await this.waitOk();
            if (!error) {
                this.putInt(firmwareChecksum);
                error = await this.waitOk();
            }
        }
    }

    async start() {
        try {
            await this.findFirmware();
            await this.checkBootloaderMode();
            if (await this.checkVersion()) {
                this.progressCallback(0, 'Resetting device');
                await this.callBootloader();
                await new Promise(resolve => setTimeout(resolve, 2000));
                this.progressCallback(0, 'Handshaking with device');
                await this.handshake();
                this.progressCallback(0, 'Programming device');
                await this.sendSize();
                await this.sendFirmware();
                this.progressCallback(0, 'Sending firmware checksum');
                await this.sendChecksum();
                vscode.window.showInformationMessage('Device successfully program');
            } else {
                vscode.window.showInformationMessage(`Firmware is up to date (version ${this.firmwareVersion})`);
            }
        } catch (err) {
            this.onError(`Programmer failed: ${err}`);
        }
    }

    onData(data) {
        // console.log(data);
    }

    onError(err) {
        vscode.window.showErrorMessage(err);
    }
}

module.exports = HepiaLight2Prog;
