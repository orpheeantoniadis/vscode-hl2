#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import os
import serial
import struct
import binascii
import time
from serial.tools import list_ports
from tqdm import tqdm

VID = 0x1FC9
PID = 0x0083
MAX_FIRMWARE_SIZE = 0x58000
SEND_BUFFER_SIZE = 256

class HepiaLight2Communicator:
    def __init__(self):
        self.port = None
        self.usb = None
        device_list = list_ports.comports()
        for device in device_list:
            if (device.vid == VID and device.pid == PID):
                self.port = device.device
                break
        if self.port != None:
            self.usb = serial.Serial(self.port)
            print("hepiaLight2 connected at port {}".format(self.port))
        else:
            print("No hepiaLight2 connected")
        
    def deinit(self):
        self.usb.close()
        
    def put_char(self, char):
        self.usb.write(char.encode())
        
    def put_int(self, int):
        self.usb.write(struct.pack('>I', int))
        
    def put_array(self, data):
        self.usb.write(data)
        
    def get_char(self):
        return self.usb.read().decode()
        
    def wait_char(self, char):
        while self.get_char() != char :
            pass
        
class HepiaLight2Programmer(HepiaLight2Communicator):
    def __init__(self, firmware_path):
        super().__init__()
        with open(firmware_path, 'rb') as firmware_file :
            self.firmware = bytearray(firmware_file.read(MAX_FIRMWARE_SIZE))
            self.firmware_length = os.path.getsize(firmware_path)
            
    def handshake(self):
        self.put_char('r')
        self.wait_char('r')
        
    def wait_ok(self):
        self.wait_char('o')
        
    def send_firmware(self):
        self.put_int(self.firmware_length)
        self.wait_ok()
        data_send = 0
        pbar = tqdm(total=self.firmware_length)
        while data_send < self.firmware_length:
            buffer = self.firmware[data_send:data_send+SEND_BUFFER_SIZE]
            error = False
            self.put_char('d')
            self.wait_ok()
            self.put_int(binascii.crc32(buffer))
            self.wait_ok()
            self.put_array(buffer)
            while self.get_char() != 'o' :
                if self.get_char() == 'e' :
                    error = True
                    break
            if not error :
                data_send += len(buffer)
                pbar.n = data_send
                pbar.refresh()
        pbar.close()
                
    def send_checksum(self):
        self.put_char('c')
        self.put_int(binascii.crc32(self.firmware))
        
    def start(self):
        print("Rebooting device")
        self.usb.write('update()\r\n'.encode())
        self.usb.close()
        time.sleep(2)
        self.usb.open()
        print("Handshaking with device")
        self.handshake()
        print("Programming device")
        self.send_firmware()
        print("Sending firmware checksum")
        self.send_checksum()
        print("Device successfully program")
        self.deinit()

if __name__ == "__main__":
    if len(sys.argv) <= 1:
        print("Usage: py send_firmware.py <firmware.bin>")
    else :
        firmware_path = sys.argv[1]
        programmer = HepiaLight2Programmer(firmware_path)
        if programmer.usb != None:
            programmer.start()
        else:
            sys.exit()
