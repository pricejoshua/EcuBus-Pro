import { UdsDevice } from "../share/uds";
import { PEAK_TP } from "./peak";
import dllLib from '../../../resources/lib/zlgcan.dll?asset&asarUnpack'
import path from "path";
import { ZLG_CAN } from "./zlg";
import { KVASER_CAN } from "./kvaser";
import { SIMULATE_CAN } from "./simulate";
import { CANDAPTER_CAN } from "./candapter";
import { CanBase, CanBaseInfo } from "../share/can";


const libPath = path.dirname(dllLib)
PEAK_TP.loadDllPath(libPath)
ZLG_CAN.loadDllPath(libPath)
KVASER_CAN.loadDllPath(libPath)

export function openCanDevice(canDevice: CanBaseInfo) {
    let canBase: CanBase | undefined



    // #v-ifdef IGNORE_NODE!='1'
    if (canDevice.vendor == 'peak') {
        canBase = new PEAK_TP(canDevice)
    } else if (canDevice.vendor == 'zlg') {
        canBase = new ZLG_CAN(canDevice)
    } else if (canDevice.vendor == 'kvaser') {
        canBase = new KVASER_CAN(canDevice)
    } else if (canDevice.vendor == 'simulate') {
        canBase = new SIMULATE_CAN(canDevice)
    } else if (canDevice.vendor == 'candapter') {
        canBase = new CANDAPTER_CAN(canDevice)
    }

    return canBase
}


export function getCanVersion(vendor: string) {
    // #v-ifdef IGNORE_NODE!='1'
    vendor = vendor.toUpperCase()
    if (vendor === 'PEAK') {
        return PEAK_TP.getLibVersion()
    } else if (vendor === 'ZLG') {
        return ZLG_CAN.getLibVersion()
    } else if (vendor === 'KVASER') {
        return KVASER_CAN.getLibVersion()
    } else if (vendor === 'SIMULATE') {
        return SIMULATE_CAN.getLibVersion()
    } else if (vendor === 'CANDAPTER') {
        return CANDAPTER_CAN.getLibVersion()
    }
    else
    // #v-endif
    {
        return 'unknown'
    }

}

export function getCanDevices(vendor: string) {
    vendor = vendor.toUpperCase()
    // #v-ifdef IGNORE_NODE!='1'
    if (vendor === 'PEAK') {
        return PEAK_TP.getValidDevices()
    } else if (vendor === 'ZLG') {
        return ZLG_CAN.getValidDevices()
    } else if (vendor === 'KVASER') {
        return KVASER_CAN.getValidDevices()
    } else if (vendor === 'SIMULATE') {
        return SIMULATE_CAN.getValidDevices()
    } else if (vendor === 'CANDAPTER') {
        return CANDAPTER_CAN.getValidDevices()
    }
    else
    // #v-endif
    {
        return []
    }
}

export function canClean(){
    KVASER_CAN.unloadDll()
}