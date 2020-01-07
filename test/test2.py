from utime import *

f = open('hello.txt', 'w+')
f.close()

for i in range(15):
    with open('hello.txt', 'a') as file:
        for j in range(10):
            file.write("hello\n")
            sleep_ms(500)
    sleep_ms(500)
