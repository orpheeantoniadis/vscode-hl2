const vscode         = require('vscode');
const path           = require('path');
const fs             = require('fs');
const HepiaLight2Com = require('./hl2-com.js');
const Readline       = require('@serialport/parser-readline');
const ByteLength     = require('@serialport/parser-byte-length');
const glob           = require('glob');
const semver         = require('semver');
const crc            = require('node-crc')

const EOL = '\x0A\x0D';
const CHAR_CTRL_C = '\x03';
const DATA_CHUNK_SIZE = 256;

class HepiaLight2Prog {
    constructor() {
        this.board = null;
        this.firmwareVersion = '0.0.0';
        this.firmwarePath = '';
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

    async checkVersion() {
        const version_commands = [
            CHAR_CTRL_C,
            'version()',
            EOL
        ];
        this.board = new HepiaLight2Com(
            data => this.onData(data),
            err => this.onError(err),
            new Readline('\n')
        );
        await this.board.connect();
        await this.board.executeCommands(version_commands);
        let data = await this.board.read();
        while (data != '>>> version()\r') {
            data = await this.board.read();
        }
        data = await this.board.read();
        let boardVersion = data.substring(1, data.length-2);
        await this.board.destroy();
        return semver.gt(this.firmwareVersion, boardVersion);
    }

    async callBootloader() {
        const update_commands = [
            CHAR_CTRL_C,
            'update()',
            EOL
        ];
        this.board = new HepiaLight2Com(
            data => this.onData(data),
            err => this.onError(err),
            new Readline('\n')
        );
        await this.board.connect();
        await this.board.executeCommands(update_commands);
        await new Promise(resolve => setTimeout(resolve, 2000));
        await this.board.destroy();
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
        let dataChecksum = crc.crc32(data);
        while (error) {
            await this.put('d');
            error = await this.waitOk();
            if (!error) {
                await this.put(dataChecksum);
                error = await this.waitOk();
                if (!error) {
                    // console.log(data);
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
        }
    }

    async sendChecksum() {
        let error = true;
        let firmware_checksum = crc.crc32(fs.readFileSync(this.firmwarePath));
        while (error) {
            await this.put('c');
            error = await this.waitOk();
            if (!error) {
                this.put(firmware_checksum);
                error = await this.waitOk();
            }
        }
    }

    async start() {
        try {
            await this.findFirmware();
            // if (await this.checkVersion()) {
                // await this.callBootloader();
                await this.handshake();
                await this.sendSize();
                await this.sendFirmware();
                await this.sendChecksum();
            // }
        } catch (err) {
            this.onError(`Programmer failed: ${err}`);
        }
    }

    onData(data) {
        console.log(data);
    }

    onError(err) {
        console.log(err);
        vscode.window.showErrorMessage(err);
    }
}

module.exports = HepiaLight2Prog;
