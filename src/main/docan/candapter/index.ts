import { spawn } from 'child_process';
import path from 'path';
import { EventEmitter } from 'events';
import { CanBase, CanBaseInfo, CanMsgType, CanDevice, CanMessage, CAN_ID_TYPE } from '../../share/can';

export class CANDAPTER_CAN extends CanBase {
    info: CanBaseInfo;
    event: EventEmitter;
    private proc: any;
    private msgQueue = new Map();
    private msgId = 0;

    constructor(info: CanBaseInfo) {
        super();
        this.info = info;
        this.event = new EventEmitter();
        console.log(info);
        
        const libDir = path.join(process.cwd(), 'src', 'main', 'docan', 'candapter', 'lib');
        console.log('libDir:', libDir);
        this.proc = spawn('java', [
            '-cp', 
            `${libDir}/EECanbus.jar${path.delimiter}${libDir}/jSerialComm-2.11.0.jar${path.delimiter}${libDir}/gson-2.12.1.jar`,
            'canbus.CandapterServer'  // main class name
        ], {
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        console.log('proc:', this.proc);

        // handle responses
        this.proc.stdout.on('data', (data: Buffer) => {
            const msgs = data.toString().split('\n').filter(Boolean);
            console.log('received:', msgs);
            for (const msg of msgs) {
                try {
                    const parsed = JSON.parse(msg);
                    // handle both direct responses and incoming CAN frames
                    if (parsed.id) {
                        const resolve = this.msgQueue.get(parsed.id);
                        if (resolve) {
                            resolve(parsed.data);
                            this.msgQueue.delete(parsed.id);
                        }
                    } else if (parsed.type === 'frame') {
                        console.log('received frame:', parsed.data);
                        // emit received frames to listeners
                        this.event.emit('can-frame', {
                            id: parsed.data.id,
                            data: Buffer.from(parsed.data.data, 'hex'),
                            ts: Date.now(),
                            dir: 'IN', 
                            msgType: { 
                              brs: false,
                              canfd: false,
                              idType: parsed.data.extended,
                              remote: false
                            }
                        } as CanMessage);
                    }
                } catch (e) {
                    console.error('failed to parse:', e);
                }
            }
        });
        
        this.proc.stderr.on('data', (data: Buffer) => {
            console.error('stderr:', data.toString());
        });

        this.proc.on('exit', (code: number) => {
            console.error('process exited:', code);
        });

        this.proc.on('error', (err: Error) => {
            console.error('process error:', err);
        });

        this.send('open', { port: "COM13" });
    }

    private async send(cmd: string, data: any = null): Promise<any> {
        const id = this.msgId++;
        const promise = new Promise(resolve => this.msgQueue.set(id, resolve));
        this.proc.stdin.write(JSON.stringify({ id, cmd, data }) + '\n');
        console.log('sent:', JSON.stringify({ id, cmd, data }));
        return promise;
    }

    async writeBase(id: number, msgType: CanMsgType, data: Buffer): Promise<number> {
        await this.send('write', { 
            id, 
            data: data.toString('hex'),
            extended: msgType.idType === CAN_ID_TYPE.EXTENDED 
        });
        return 0;
    }

    async readBase(id: number, msgType: CanMsgType, timeout: number): Promise<{data: Buffer, ts: number}> {
        const result = await this.send('read');
        if (!result) return { data: Buffer.alloc(0), ts: Date.now() };

        return {
            data: Buffer.from(result.data, 'hex'),
            ts: Date.now()
        };
    }

    getReadBaseId(id: number, msgType: CanMsgType): string {
        return `${id}-${msgType.idType}`;
    }

    setOption(cmd: string, val: any): void {
        this.send('option', { cmd, val });
    }

    close(): void {
        this.send('close');
        this.proc.kill();
    }

    static getValidDevices(): CanDevice[] {
        const com13 = {
            name: 'COM13',
            desc: 'COM13',
            vendor: 'Ewert Energy',
            channel: 0,
            label: 'COM13',
            id: 'com13',
            handle: 'handle_com13'
        };
        
        return [com13];
    }

    static getLibVersion(): string {
        return '1.0.0';
    }
}