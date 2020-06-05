'use babel';

const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');

const MAX_DETETCION_ATTEMPTS = 7;
const INSTRUCTION_INTERVAL   = 10;

export const EOL         = '\x0A\x0D';
export const CHAR_CTRL_C = '\x03';
export const CHAR_CTRL_D = '\x04';
export const CHAR_CTRL_E = '\x05';

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
            if (indexOfVendorId === indexOfProductId && indexOfVendorId !== -1) {
                ports.push(port.path);
            }
        });
        if (ports.length === 0) {
            reject(new Error('No hepiaLight2 found'));
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
        this.sending     = false;
        this.destroying  = false;
        this.errorRaised = false;
        if (process.platform === 'win32') {
            VENDOR_IDS = VENDOR_IDS.map(vendorId => vendorId.toUpperCase());
            PRODUCT_IDS = PRODUCT_IDS.map(productId => productId.toUpperCase());
        }
    }

    onOpen() {
        this.port.pipe(this.parser);
        this.port.on('close', () => this.onClose());
        this.parser.on('data', data => this.onData(data));
    }

    onClose() {
        this.port = null;
        if (!this.destroying) {
            this.onError(new Error('Card disconnected!'));
        }
    }

    onError(err) {
        this.errorRaised = true;
        this.errorCb(`Node SerialPort: ${err.message}`);
        console.error(err);
    }

    onData(data) {
        if (this.readCallback !== undefined) {
            this.readCallback(data.toString('utf8'));
        }
        this.dataCb(data.toString('utf8'));
    }

    write(data) {
        this.port.write(data);
        this.port.drain();
    }

    attach(callback) {
        this.readCallback = callback;
    }

    detach() {
        this.readCallback = undefined;
    }

    async connectTo(port) {
        return new Promise((resolve, reject) => {
            this.detectionAttempts = 0;
            const checkConnection = async () => {
                if (!this.sending && this.port.binding.writeOperation === null && this.port.binding.poller._eventsCount === 0) {
                    this._detectionAttempts++;
                } else {
                    this._detectionAttempts = 0;
                }
                if (this._detectionAttempts >= MAX_DETETCION_ATTEMPTS) {
                    let error = new Error(`Port ${this.port.path} disconnected`);
                    this.errorCb(error.message);
                    console.error(error);
                    await this.destroy();
                }
            };
            let self = this;
            this.port = new SerialPort(port, {
                baudRate: 9600,
                autoOpen: false,
            });
            this.port.on('error', err => this.onError(err));
            this.port.on('open', () => this.onOpen());
            this.port.open(function (err) {
                if (err !== null) {
                    reject(err);
                }
                self.checkConnectionInterval = setInterval(checkConnection, 100);
                resolve();
            });
        });
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
                clearInterval(this.checkConnectionInterval);
                if (this.port === null) {
                    resolve();
                } else {
                    this.port.close(() => {
                        if (this.port != null) {
                            this.port.destroy();
                        }
                        resolve();
                    });
                }
            } catch (err) {
                console.error(`Error while disposing: ${err} `);
                reject(err);
            }
        });
    }

    async updateParser(parser) {
        let path = this.port.path;
        await this.destroy();
        this.parser = parser;
        await this.connectTo(path);
    }

    async read() {
        return new Promise(resolve => {
            this.attach((data) => {
                this.detach();
                resolve(data);
            });
        });
    }

    async executeCommand(command) {
        return new Promise(async (resolve, reject) => {
            let stdout = [];
            if (!this.errorRaised) {
                this.sending = true;
                this.write(`${command}${EOL}${EOL}`);
                this.stdoutStart = false;
                this.attach((line) => {
                    if (this.stdoutStart) {
                        if (line !== '>>> \r') {
                            stdout.push(line)
                        } else {
                            this.detach();
                            this.stdoutStart = false;
                            this.sending = false;
                            resolve(stdout);
                        }
                    } else if (line === `>>> ${command}\r`) {
                        this.stdoutStart = true;
                    }
                });
            } else {
                reject(new Error('An error occured with serialport module'));
            }
        });
    }

    async executeIntervalCommands(commands, interval=INSTRUCTION_INTERVAL, progressCallback=null) {
        this.sending = true;
        return new Promise(resolve => {
            const executeNext = () => {
                let cmd = '';
                if (this.errorRaised || commands.length == 0) {
                    clearInterval(this.executionInterval);
                    this.port.drain();
                    this.sending = false;
                    resolve();
                } else {
                    cmd = commands.shift();
                    this.write(cmd);
                    if (progressCallback != null) {
                        progressCallback();
                    }
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
            `eteindre_tout()${EOL}`,
            CHAR_CTRL_E
        ];
        for (let line of code.split('\n')) {
            commands.push(line + '\r');
        }
        commands.push(CHAR_CTRL_D);
        return this.executeIntervalCommands(commands);
    }

    async uploadFile(fileName, data, progressCallback=null) {
        var commands = [
            CHAR_CTRL_C,
            `eteindre_tout()${EOL}`,
            `file = open('${fileName}', 'w+')${EOL}`
        ];
        for (let line of data.split('\n')) {
            line = line.split(String.raw`'`).join(String.raw`\'`);
            line = line.split(String.raw`"`).join(String.raw`\"`);
            commands.push(String.raw`file.write('${line}\n')${EOL}`);
        }
        commands.push(`file.close()${EOL}`);
        let total = commands.length;
        await this.executeIntervalCommands(commands, 50, () => progressCallback(total));
    }

    async sendKeyboardInterrupt() {
        this.write(CHAR_CTRL_C);
    }

    async interpreterIsActive() {
        return new Promise(async (resolve) => {
            let timeout = setTimeout(() => resolve(false), 2000);
            await this.sendKeyboardInterrupt();
            await this.executeCommand('');
            clearTimeout(timeout);
            resolve(true);
        });
    }

    async reset() {
        let commands = [
            CHAR_CTRL_C,
            `import machine${EOL}`,
            `machine.reset()${EOL}`
        ];
        await this.executeIntervalCommands(commands);
    }

    async version() {
        await this.sendKeyboardInterrupt();
        let data = await this.executeCommand('version()');
        return data[0].substring(1, data[0].length-2);
    }

    async update() {
        let commands = [
            CHAR_CTRL_C,
            `update()${EOL}`
        ];
        await this.executeIntervalCommands(commands);
        await this.destroy();
    }
}
