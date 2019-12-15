const vscode         = require('vscode');
const path           = require('path');
const HepiaLight2Com = require('./hl2-com.js');
const Readline = require('@serialport/parser-readline');
const ByteLength     = require('@serialport/parser-byte-length');
const glob = require('glob');
const semver = require('semver');

const EOL = '\x0A\x0D';
const CHAR_CTRL_C = '\x03';

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
                    `Failed to destroy to board:\n${err.message}\n${err.stack}`
                );
                this.sendErr(`Failed to destroy to board: ${err}`);
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
                resolve();
            });
        });
    }

    async getVersion() {
        
    }

    async start() {
        const version_commands = [
            CHAR_CTRL_C,
            'version()',
            EOL
        ]
        const update_commands = [
            CHAR_CTRL_C,
            'update()',
            EOL
        ];
        await this.destroy();
        try {
            await this.findFirmware();
            console.log(this.firmwarePath, this.firmwareVersion);
            this.board = new HepiaLight2Com(
                data => this.onData(data),
                err => this.onError(err),
                new Readline('\n')
            );
            await this.board.connect();
            await this.board.executeCommands(version_commands);
            let data = await this.board.read();
            while (data != '>>> version()\r\n') {
                console.log(data);
                data = await this.board.read();
            }

            // await this.board.executeCommands(update_commands);
            // await this.board.destroy();
            // await new Promise(resolve => setTimeout(resolve, 2000));
            // await this.board.connect();
        } catch (err) {
            this.onError(`Programmer failed: ${err}`);
        }
        // this.handshake();
    }

    onData(data) {
        console.log(data);
    }

    onError(err) {
        vscode.window.showErrorMessage(err);
    }

    put(data) {
        this.board.write(data);
    }

    get() {
        let data;
        while ((data = this.board.read()) == undefined);
        return data;
    }

    wait(data) {
        while (this.get != data);
    }

    handshake() {
        this.put('r');
        this.wait('r');
    }

    wait_ok() {
        let char = '\0';
        while (char != 'o')  {
            char = this.get();
            if (char == 'e') {
                return true;
            }
        }
        return false;
    }
}

module.exports = HepiaLight2Prog;
