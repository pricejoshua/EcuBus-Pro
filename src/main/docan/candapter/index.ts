import { CanBase, CanBaseInfo, CanMsgType, CanError, CAN_ERROR_ID, CanDevice } from '../../share/can';
import { EventEmitter } from 'events';
import java from 'java';
import path from 'path';

const bindingDir = path.join(__dirname, 'lib');
java.classpath.push(bindingDir, path.join(bindingDir, 'EECanbus.jar'));
java.classpath.push(path.join(bindingDir, 'jSerialComm-2.11.0.jar'));

export class CANDAPTER_CAN extends CanBase {
  info: CanBaseInfo;
  event: EventEmitter;
  private cnt: number;
  private rejectBaseMap: Map<number, { reject: (reason: CanError) => void, msgType: CanMsgType }>;
  private readAbort: AbortController;

  private port: any;

  constructor(info: CanBaseInfo) {
    super();
    this.info = info;
    this.event = new EventEmitter();
    this.cnt = 0;
    this.rejectBaseMap = new Map();
    this.readAbort = new AbortController();

    this.port = java.newInstanceSync('canbus.CandapterPort');
  }

  close(): void {
    this.rejectBaseMap.clear();
    this.event.removeAllListeners();
    // Add any additional cleanup logic here
  }

  readBase(id: number, msgType: CanMsgType, timeout: number): Promise<{ data: Buffer; ts: number }> {
    return new Promise((resolve, reject) => {
      const cmdId = this.getReadBaseId(id, msgType);
      const cnt = this.cnt++;
      this.rejectBaseMap.set(cnt, { reject, msgType });

      this.readAbort.signal.onabort = () => {
        if (this.rejectBaseMap.has(cnt)) {
          this.rejectBaseMap.delete(cnt);
          reject(new CanError(CAN_ERROR_ID.CAN_BUS_CLOSED, msgType));
        }
        this.event.off(cmdId, readCb);
      };

      const readCb = (val: any) => {
        clearTimeout(timer);
        if (this.rejectBaseMap.has(cnt)) {
          if (val instanceof CanError) {
            reject(val);
          } else {
            resolve({ data: val.data, ts: val.ts });
          }
          this.rejectBaseMap.delete(cnt);
        }
      };

      const timer = setTimeout(() => {
        this.event.off(cmdId, readCb);
        if (this.rejectBaseMap.has(cnt)) {
          this.rejectBaseMap.delete(cnt);
          reject(new CanError(CAN_ERROR_ID.CAN_READ_TIMEOUT, msgType));
        }
      }, timeout);

      this.event.on(cmdId, readCb);
    });
  }

  writeBase(id: number, msgType: CanMsgType, data: Buffer, extra?: { database?: string, name?: string }): Promise<number> {
    return new Promise((resolve, reject) => {
      let maxLen = msgType.canfd ? 64 : 8;
      if (data.length > maxLen) {
        reject(new CanError(CAN_ERROR_ID.CAN_PARAM_ERROR, msgType, data));
        return;
      }

      const cmdId = `writeBase-${this.getReadBaseId(id, msgType)}`;
      // Add logic to send the CAN message here

      resolve(0); // Replace with actual logic to return the result
    });
  }

  getReadBaseId(id: number, msgType: CanMsgType): string {
    return `${id}-${msgType}`;
  }

  setOption(cmd: string, val: any): void {
    // Implement logic to set options here
  }

  static getValidDevices(): CanDevice[] {
    java.callStaticMethodSync('canbus.CandapterPort', 'getPorts', (err: any, res: any) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log(res);
    });
    return [];
  }

  static getLibVersion(): string {
    return '1.0.0';
  }
}



