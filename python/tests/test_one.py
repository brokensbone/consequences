from src import controller
import os
import json

def test_basics():
    #game = controller.SimpleEmailBasedGame("XTEST")
    gamecode = controller.new_game()
    game = controller.find_game(gamecode)
    #game.prepare()

    questions = game.get_questions()

    answers = {question[0]: question[1].swapcase() for question in questions}
    answers2 = {question[0]: question[1][::-1] for question in questions}
    answers3 = {question[0]: "JJJ" for question in questions}
    email = "user@example.com"
    answers[controller.EMAIL.qid] = email

    email2 = "other@example.come"
    answers2[controller.EMAIL.qid] = email2

    email3 = "jjj@jjj.k"
    answers3[controller.EMAIL.qid] = email3

    #game.handle_answers(answers)
    #game.handle_answers(answers2)
    #game.handle_answers(answers3)
    controller.answers(gamecode, answers)
    assert game.count_answers() == 1
    controller.answers(gamecode, answers2)
    controller.answers(gamecode, answers3)
    assert game.count_answers() == 3

    results = game.end_game(emails=False)

    r1 = results[email]
    r2 = results[email2]

    d = game.get_game_dir()
    fp = os.path.join(d, "output.txt")
    with open(fp, 'w') as f:
        f.write(json.dumps(results))

    game.clear()
    assert 1 == 1

def test_email():
    msg = """Subject:Test EMAIL

    This is my email.

    Hey there.

    """
    #controller.send_email(msg)
    assert 2 == 2
