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
            print("hepiaLight2 connected at port {}".format(self.port))
        else:
            print("No hepiaLight2 connected")
        
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

class HepiaLight2Uploader(HepiaLight2Communicator):
    def __init__(self, path):
        super().__init__()
        with open(path, 'rb') as fp :
            self.lines = fp.readlines()

    def send_line(self, line):
        command = ''
        indentation = 0

        for i in range(len(line)):
            if line[i] != ' ':
                indentation = -1 if i % 2 else i
                break

        if indentation < self.last_indentation:
            nb_backspace = int((self.last_indentation - indentation) / 2)
            for i in range(nb_backspace):
                command += BACKSPACE
            if indentation == 0 and self.last_indentation > 0: 
                command += EOL

        self.last_indentation = indentation

        command += line.strip()
        command += EOL
        self.put_string(command)

    def send_file(self):
        self.put_string(BREAK)
        self.last_indentation = 0
        for line in self.lines:
            if (line and line != b'\n'):
                self.send_line(line.decode())
                time.sleep(INSTRUCTION_INTERVAL / 1000)
        self.send_line('')
            
if __name__ == "__main__":
    if len(sys.argv) <= 1:
        print("Usage: python hl2-bridge.py <path>")
    else :
        path = sys.argv[1]
        uploader = HepiaLight2Uploader(path)
        if uploader.usb != None:
            uploader.send_file()
            uploader.deinit()
