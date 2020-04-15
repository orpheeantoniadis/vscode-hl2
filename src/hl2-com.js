'use babel';

const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');

const INSTRUCTION_INTERVAL = 10;
const EOL         = '\x0A\x0D';
const CHAR_CTRL_C = '\x03';
const CHAR_CTRL_D = '\x04';
const CHAR_CTRL_E = '\x05';

var VENDOR_IDS  = ['1fc9', '1f00'];
var PRODUCT_IDS = ['0083', '2012'];

export async function find() {
    const portList = await SerialPort.list();
    let ports = [];
    let indexOfVendorId = -1;
    let indexOfProductId = -1;
    return new Promise((resolve, reject) => {
        portList.forEach(port => {
            indexOfVendorId = VENDOR_IDS.indexOf(port.vendorId);
            indexOfProductId = PRODUCT_IDS.indexOf(port.productId);
            if (indexOfVendorId == indexOfProductId && indexOfVendorId != -1) {
                ports.push(port.path);
            }
        });
        if (ports.length == 0) {
            reject('No hepiaLight2 found');
        }
        resolve(ports);
    });
}

export class HepiaLight2Com {
    constructor(dataCb, errorCb, parser = new Readline('\n')) {
        this.dataCb      = dataCb;
        this.errorCb     = errorCb;
        this.parser      = parser;
        this.port        = null;
        this.rx          = [];
        this.destroying  = false;
        this.errorRaised = false;
        if (process.platform === 'win32') {
            VENDOR_IDS = VENDOR_IDS.map(vendorId => vendorId.toUpperCase());
            PRODUCT_IDS = PRODUCT_IDS.map(productId => productId.toUpperCase());
        }
    }

    async connect_to(port) {
        try {
            this.port = new SerialPort(port);
            this.port.on('error', err => this.onError(err));
            this.port.on('open', () => this.onOpen());
        } catch(err) {
            this.errorCb(err.message);
        }
    }

    async connect() {
        try {
            const ports = await find();
            this.port = new SerialPort(ports[0]);
            this.port.on('error', err => this.onError(err));
            this.port.on('open', () => this.onOpen());
        } catch(err) {
            this.errorCb(err.message);
        }
    }

    async destroy() {
        this.destroying = true;
        return new Promise((resolve, reject) => {
            try {
                if (this.port == null) {
                    resolve();
                } else {
                    this.port.close(() => {
                        this.port.destroy();
                        resolve();
                    });
                }
            } catch (err) {
                console.error(`Error while disposing: ${err} `);
                reject(err);
            }
        });
    }

    write(data) {
        this.port.write(data);
        this.port.drain();
    }

    async read() {
        return new Promise(resolve => {
            const readNext = () => {
                if (this.rx.length != 0) {
                    clearInterval(this.readInterval);
                    resolve(this.rx.shift());
                }
            };
            this.readInterval = setInterval(readNext, 1);
        });
    }

    async sendKeyboardInterrupt() {
        this.write(CHAR_CTRL_C);
    }

    async executeCommand(command) {
        let data = '';
        let stdout = [];
        if (!this.errorRaised) {
            this.write(command + "\r\n\r");
            while (await this.read() != `>>> ${command}` + '\r');
            while ((data = await this.read()) != '>>> \r') {
                stdout.push(data)
            }
        }
        return stdout;
    }

    async executeIntervalCommands(commands, interval=INSTRUCTION_INTERVAL, progressCallback=null) {
        return new Promise((resolve, reject) => {
            // for (let command of commands) {
            //     if (this.errorRaised) {
            //         this.port.drain();
            //         console.log("reject");
            //         reject();
            //         break;
            //     }
            //     this.write(command);
            //     if (progressCallback != null) {
            //         progressCallback();
            //     }
            //     // await new Promise(resolve => setTimeout(resolve, interval));
            // }
            // resolve();

            const executeNext = () => {
                let cmd = '';
                if (this.errorRaised || commands.length == 0) {
                    clearInterval(this.executionInterval);
                    this.port.drain();
                    return;
                }
                cmd = commands.shift();
                this.write(cmd);
                if (progressCallback != null) {
                    progressCallback();
                }
            };
            this.executionInterval = setInterval(
                executeNext,
                interval
            );
        });
    }

    async executeRaw(code) {
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
        return this.executeIntervalCommands(commands);
    }

    onOpen() {
        this.port.pipe(this.parser);
        this.port.on('close', () => this.onClose());
        this.parser.on('data', data => this.onData(data));
    }

    onClose() {
        this.port = null;
        this.rx = [];
        if (!this.destroying) {
            this.onError(new Error('Card disconnected!'));
        }
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
