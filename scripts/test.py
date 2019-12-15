period = 0.01
ball_x = 0
ball_y = 0
reverse = False

while True:
    allumer_led(ball_x, ball_y, ROUGE)
    delai(period)
    eteindre_led(ball_x, ball_y)

    if not reverse:
        if ball_x != 9:
            ball_x += 1
        else:
            ball_y += 1
    else:
        if ball_x != 0:
            ball_x -= 1
        else:
            ball_y -= 1

    if ball_y == 9:
        reverse = True
    elif ball_y == 0:
        reverse = False
    