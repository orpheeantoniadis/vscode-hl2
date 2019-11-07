#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import os
import serial
import struct
import binascii
import time
from serial.tools import list_ports

VID = 0x1FC9
PID = 0x0083

INSTRUCTION_INTERVAL = 50
EOL                  = '\r\n'
BACKSPACE            = '\x08'
BREAK                = '\x03'

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

    def deinit(self):
        if self.usb != None:
            self.usb.close()
        
    def put_char(self, char):
        self.usb.write(char.encode())

    def put_string(self, string):
        self.usb.write(string.encode())
        
    def put_int(self, int):
        self.usb.write(struct.pack('>I', int))
        
    def put_array(self, data):
        self.usb.write(data)
        
    def get_char(self):
        return self.usb.read().decode()
        
    def wait_char(self, char):
        while self.get_char() != char :
            pass
            
if __name__ == "__main__":
    com = HepiaLight2Communicator()
    if com.usb != None:
        print("hepiaLight2 connected at port {}".format(com.port))
    else:
        print("No hepiaLight2 connected")
    com.deinit()
