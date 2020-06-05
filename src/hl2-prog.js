'use babel';

const vscode         = require('vscode');
const glob           = require('glob');
const path           = require('path');
const fs             = require('fs');
const semver         = require('semver');
const { crc32 }      = require('crc');

const DATA_CHUNK_SIZE = 256;
const MIN_FIRMWARE_VERSION = '0.4.0';

export class HepiaLight2Prog {
    constructor(board = null, progressCallback = null) {
        this.board            = board;
        this.firmwareVersion  = '0.0.0';
        this.firmwarePath     = '';
        this.firmwareLength   = 0;
        this.progressCallback = progressCallback;
    }

    setBoard(board) {
        this.board = board;
    }

    setProgressCallback(progressCallback) {
        this.progressCallback = progressCallback;
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
        let boardVersion = await this.board.version();
        if (!semver.valid(boardVersion)) {
            throw new Error("Firmware's version not valid");
        } else if (semver.lt(this.firmwareVersion, MIN_FIRMWARE_VERSION)) {
            throw new Error("Firmware's version not supported");
        } else {
            return semver.gt(this.firmwareVersion, boardVersion);
        }
    }

    put(data) {
        this.board.write(data);
    }

    putInt(data) {
        let buffer = Buffer.alloc(4);
        buffer.writeUInt32BE(data);
        this.put(buffer);
    }

    async get() {
        return await this.board.read();
    }

    async wait(data) {
        while (await this.get() != data);
    }

    async handshake() {
        this.put('r');
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
            this.putInt(this.firmwareLength);
            error = await this.waitOk();
        }
    }

    async sendData(data) {
        let error = true;
        let dataChecksum = crc32(data);
        while (error) {
            this.put('d');
            error = await this.waitOk();
            if (!error) {
                this.putInt(dataChecksum);
                error = await this.waitOk();
                if (!error) {
                    this.put(data);
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
            this.put('c');
            error = await this.waitOk();
            if (!error) {
                this.putInt(firmwareChecksum);
                error = await this.waitOk();
            }
        }
    }

    async start() {
        try {
            this.progressCallback(0, this.firmwareLength, 'Handshaking with device');
            await this.handshake();
            this.progressCallback(0, this.firmwareLength, 'Programming device');
            await this.sendSize();
            await this.sendFirmware();
            this.progressCallback(0, this.firmwareLength, 'Sending firmware checksum');
            await this.sendChecksum();
            vscode.window.showInformationMessage('Device successfully program');
        } catch(err) {
            throw err;
        }
    }
}
