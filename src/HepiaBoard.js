const SerialPort = require('serialport');
const VENDOR_ID = '1fc9';
const PRODUCT_ID = '0083';
const INSTRUCTION_INTERVAL = 1;
const EOL = '\x0A\x0D';
const BACKSPACE = '\x08';
const CHAR_CTRL_C = '\x03';
const CHAR_CTRL_D = '\x04';
const CHAR_CTRL_E = '\x05';

class HepiaBoard {
    constructor(dataCb, errorCb) {
        this.dataCb = dataCb;
        this.errorCb = errorCb;
    }

    async findHepiaLightCom() {
        const ports = await SerialPort.list();
        return ports.find(
            port => port.vendorId == VENDOR_ID && port.productId == PRODUCT_ID
        );
    }

    async connect() {
        const comPort = await this.findHepiaLightCom();
        if (!comPort) throw 'No hepia light card found';
        this.port = new SerialPort(comPort.path, {
            baudRate: 9600,
            dataBits: 8,
            parity: 'none',
            stopBits: 1,
            rtscts: true,
            highWaterMark: 1024
        });
        this.parser = new SerialPort.parsers.Readline({ delimiter: '\n', encoding: 'utf-8', includeDelimiter: false });
        this.port.pipe(this.parser);
        this.port.on('close', () => this.onClose());
        this.parser.on('data', data => this.onData(data));
        this.port.on('error', err => this.onError(err));
    }

    onClose() {
        if (!this.destroying) this.onError(new Error('Card disconnected!'));
    }

    onError(err) {
        this.errorRaised = true;
        console.log('Serial Error: ', err.message);
        this.errorCb(err.message);
    }

    onData(data) {
        console.log(data);
        this.dataCb(data.toString());
    }

    splitCodeIntoCommands(code) {
        let commands = [
            EOL,
            CHAR_CTRL_C,
            'eteindre_tout()',
            EOL,
            CHAR_CTRL_E,
            '### NEW PROGRAM ###',
            EOL
        ];

        for (let line of code.split('\n')) {
            if (!line || line == '\r') continue;
            commands.push(line);
            commands.push(EOL);
        }
        commands.push(CHAR_CTRL_D);
        return commands;
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

    async execute(code) {
        return new Promise(resolve => {
            let commandsToExecute = this.splitCodeIntoCommands(code);

            const executeNext = () => {
                if (this.errorRaised || commandsToExecute.length == 0) {
                    clearInterval(this.executionInterval);
                    if (this.errorRaised) {
                        console.log('Error port disposed');
                    }
                    this.port.flush(() => this.port.drain());
                    resolve();
                    return;
                }
                let cmd = commandsToExecute.shift();
                this.port.write(cmd);
                this.port.flush();
                this.port.drain();
            };

            this.executionInterval = setInterval(
                executeNext,
                INSTRUCTION_INTERVAL
            );
        });
    }
}

module.exports = HepiaBoard;
