import os
import json
import hashlib
import shutil
import logging
import random
import threading
import string

logger = logging.getLogger()
logger.setLevel('DEBUG')
ch = logging.StreamHandler()
logger.addHandler(ch)

class Q:
    def __init__(self, qid, text):
        self.qid = str(qid)
        self.text = text
    def as_value(self):
        return [self.qid, self.text]

HIS_NAME = Q(1, "His name")
HER_NAME = Q(2, "Her name")
PLACE = Q(3, "Where they met")
HE_SAID = Q(4, "He said")
SHE_SAID = Q(5, "She said")
CONSEQUENCE = Q(6, "And the consequence was")
WORLD_SAID = Q(7, "And the world said")

EMAIL = Q(100, "What's your email")

GAME_QS =[HIS_NAME, HER_NAME, PLACE, HE_SAID, SHE_SAID, CONSEQUENCE, WORLD_SAID]
ALL_QS = [EMAIL, HIS_NAME, HER_NAME, PLACE, HE_SAID, SHE_SAID, CONSEQUENCE, WORLD_SAID]

class MissingAnswer(Exception):
    pass

class InvalidGame(Exception):
    pass

class SimpleEmailBasedGame:
    data_location = "/data/"

    def __init__(self, gamecode):
        self.gamecode = gamecode

    def prepare(self):
        game_dir = self.get_game_dir()
        if os.path.exists(game_dir):
            shutil.rmtree(game_dir)
        os.mkdir(game_dir)

    def exists(self):
        game_dir = self.get_game_dir()
        return os.path.exists(game_dir)

    def get_game_dir(self):
        return os.path.join(self.data_location, self.gamecode)

    def get_questions(self):
        """
        This should return the questions you're going to have to answer.
        All the expected plus your email address
        """
        return [q.as_value() for q in ALL_QS]

    def handle_answers(self, answer_json):
        # Check they're all there
        for q in ALL_QS:
            a = answer_json.get(q.qid, None)
            if a is None:
                raise MissingAnswer()
            if len(a) == 0:
                raise MissingAnswer()
        # Grab the email. That's our key
        email = answer_json[EMAIL.qid]
        email = hashlib.md5(email.encode()).hexdigest()

        fp = os.path.join(self.data_location, self.gamecode, email)
        if os.path.exists(fp):
            print("Uh oh, file already exists.")
        with open(fp, 'w') as f:
            j = json.dumps(answer_json)
            f.write(j)

    def end_game(self):
        maps = self.load_all_answers()
        ordered_maps = list(maps)

        # Build the game wrappers
        game_wrappers = [GameWrapper(x[EMAIL.qid]) for x in maps]

        # Build a list for each question
        for q in GAME_QS:
            qid = q.qid
            ordered_maps = ordered_maps[1:]+ordered_maps[:1]
            for game, answers in zip(game_wrappers, ordered_maps):
                answer = answers[qid]
                game.add(qid, answer)


        # Send stuff.

        # Tidy up
        return {g.email_to : g.answers_map for g in game_wrappers}

    def load_all_answers(self):
        logger.debug("Loading answers")
        maps = []
        game_dir = self.get_game_dir()

        onlyfiles = [f for f in os.listdir(game_dir) if os.path.isfile(os.path.join(game_dir, f))]
        for fp in onlyfiles:
            fullpath = os.path.join(game_dir, fp)
            with open(fullpath, 'r') as f:
                logger.debug("Reading from {}".format(fullpath))
                str = f.read()
                logger.debug(str)
                map = json.loads(str)
                maps.append(map)
        return maps

class GameWrapper:
    def __init__(self, email_to):
        self.email_to = email_to
        self.answers_map = {}
    def add(self, qid, answer):
        self.answers_map[qid] = answer

def new_game():
    gamecode = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
    game = SimpleEmailBasedGame(gamecode)
    game.prepare()
    return gamecode

def answers(gamecode, answers):
    game = find_game(gamecode)
    game.handle_answers(answers)

def end_game(gamecode):
    game = find_game(gamecode)
    t = threading.Thread(target=game.end_game)
    t.start()

def find_game(gamecode):
    game = SimpleEmailBasedGame(gamecode)
    if not game.exists():
        raise InvalidGame()
    return game

def run ():
    print("Controller run")
