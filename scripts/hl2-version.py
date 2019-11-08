#!/usr/bin/env python
# -*- coding: utf-8 -*-

import time
from hl2.com import *
            
if __name__ == "__main__":
    com = HepiaLight2Communicator()
    if com.usb != None:
        char = 'a'
        output = ''

        com.usb.write('\x03\r\n'.encode())
        com.usb.write('version()\r\n'.encode())

        while char != '':
            char = com.get_char()
            output += char

        output = output.split('\r\n')
        version_index = output.index('>>> version()') + 1
        version = output[version_index].replace('\'', '')
        com.deinit()
        print(version)
