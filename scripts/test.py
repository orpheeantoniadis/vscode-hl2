period = 0.01
ball_x = 0
ball_y = 9
reverse = False

while True:
    allumer_led(ball_x, ball_y, ROUGE)
    delai(period)
    eteindre_led(ball_x, ball_y)

    if not reverse:
        ball_x += 1
    else:
        ball_x -= 1
    if ball_x == 9 and not reverse:
        reverse = True
    elif ball_x == 0 and reverse:
        reverse = False
    