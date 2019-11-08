#!/usr/bin/env python
# -*- coding: utf-8 -*-

from hl2.com import *
            
if __name__ == "__main__":
    com = HepiaLight2Communicator()
    if com.usb != None:
        print("hepiaLight2 connected at port {}".format(com.port))
    else:
        print("No hepiaLight2 connected")
    com.deinit()
