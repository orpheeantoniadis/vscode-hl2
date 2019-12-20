'use babel';

const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');

const VENDOR_ID = '1fc9';
const PRODUCT_ID = '0083';

const INSTRUCTION_INTERVAL = 10;
const EOL = '\x0A\x0D';
const CHAR_CTRL_C = '\x03';
const CHAR_CTRL_D = '\x04';
const CHAR_CTRL_E = '\x05';

class HepiaLight2Com {
    constructor(dataCb, errorCb, parser = new Readline('\n')) {
        this.dataCb = dataCb;
        this.errorCb = errorCb;
        this.parser = parser;
        this.rx = [];
    }

    async find() {
        const ports = await SerialPort.list();
        return ports.find(
            port => port.vendorId == VENDOR_ID && port.productId == PRODUCT_ID
        );
    }

    async connect() {
        const comPort = await this.find();
        if (!comPort) throw 'No hepiaLight2 found';
        this.port = new SerialPort(comPort.path);
        this.port.on('open', () => this.onOpen());
    }

    async destroy() {
        this.destroying = true;
        return new Promise(resolve => {
            try {
                this.port.close(() => {
                    this.port.destroy();
                    resolve();
                });
            } catch (err) {
                console.error(`Error while disposing: +${err} `);
                resolve();
            }
        });
    }

    async write(data) {
        this.port.write(data);
        this.port.drain();
    }

    async read() {
        return new Promise(resolve => {
            const executeNext = () => {
                if (this.rx.length != 0) {
                    clearInterval(this.executionInterval);
                    resolve(this.rx.shift());
                }
            };

            this.executionInterval = setInterval(executeNext, 1);
        });
    }

    async executeCommands(commands) {
        return new Promise(resolve => {
            const executeNext = () => {
                if (this.errorRaised || commands.length == 0) {
                    clearInterval(this.executionInterval);
                    if (this.errorRaised) {
                        console.log('Error port disposed');
                    }
                    this.port.drain();
                    resolve();
                    return;
                }
                let cmd = commands.shift();
                this.write(cmd);
            };

            this.executionInterval = setInterval(
                executeNext,
                INSTRUCTION_INTERVAL
            );
        });
    }

    splitCodeIntoCommands(code) {
        let commands = [
            CHAR_CTRL_C,
            'eteindre_tout()',
            EOL,
            CHAR_CTRL_E
        ];
        for (let line of code.split('\n')) {
            commands.push(line + '\r');
        }
        commands.push(CHAR_CTRL_D);
        return commands;
    }

    async executeRaw(data) {
        let commandsToExecute = this.splitCodeIntoCommands(data);
        return this.executeCommands(commandsToExecute);
    }

    onOpen() {
        this.port.pipe(this.parser);
        this.port.on('close', () => this.onClose());
        this.parser.on('data', data => this.onData(data));
        this.port.on('error', err => this.onError(err));
    }

    onClose() {
        this.rx = [];
        if (!this.destroying) this.onError(new Error('Card disconnected!'));
    }

    onError(err) {
        this.errorRaised = true;
        this.errorCb(err.message);
        console.error(err);
    }

    onData(data) {
        this.rx.push(data.toString('utf8'));
        this.dataCb(data.toString('utf8'));
    }
}

module.exports = HepiaLight2Com;
