import os
import json
import hashlib
import shutil
import logging
import random
import threading
import string
import smtplib
import ssl

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

DATA_LOCATION = "/data"
CONF_LOCATION = os.path.join(DATA_LOCATION, "conf")
GAME_LOCATION = os.path.join(DATA_LOCATION, "games")

if not os.path.exists(GAME_LOCATION):
    os.mkdir(GAME_LOCATION)
if not os.path.exists(CONF_LOCATION):
    os.mkdir(CONF_LOCATION)

class MissingAnswer(Exception):
    pass

class InvalidGame(Exception):
    pass

class SimpleEmailBasedGame:

    def __init__(self, gamecode):
        self.gamecode = gamecode

    def prepare(self):
        self.clear()
        game_dir = self.get_game_dir()
        os.mkdir(game_dir)

    def exists(self):
        game_dir = self.get_game_dir()
        return os.path.exists(game_dir)

    def get_game_dir(self):
        return os.path.join(GAME_LOCATION, self.gamecode)

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
                logger.error("Mising answer {}".format(q.qid))
                raise MissingAnswer()
            if len(a) == 0:
                logger.error("Empty answer {}".format(q.qid))
                raise MissingAnswer()
        # Grab the email. That's our key
        email = answer_json[EMAIL.qid]
        email = hashlib.md5(email.encode()).hexdigest()

        fp = os.path.join(GAME_LOCATION, self.gamecode, email)
        if os.path.exists(fp):
            print("Uh oh, file already exists.")
        with open(fp, 'w') as f:
            j = json.dumps(answer_json)
            f.write(j)

    def end_game(self, emails=True):
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
                answer = answer.strip()
                game.add(answer)


        # Send stuff.
        if emails:
            for g in game_wrappers:
                g.write_and_send()

        # Tidy up
        return {g.email_to : g.answers for g in game_wrappers}

    def count_answers(self):
        return len(self.find_answers())

    def find_answers(self):
        game_dir = self.get_game_dir()
        return [f for f in os.listdir(game_dir) if os.path.isfile(os.path.join(game_dir, f))]

    def load_all_answers(self):
        logger.debug("Loading answers")
        maps = []
        game_dir = self.get_game_dir()

        onlyfiles = self.find_answers()
        for fp in onlyfiles:
            fullpath = os.path.join(game_dir, fp)
            with open(fullpath, 'r') as f:
                logger.debug("Reading from {}".format(fullpath))
                str = f.read()
                logger.debug(str)
                map = json.loads(str)
                maps.append(map)
        return maps

    def clear(self):
        game_dir = self.get_game_dir()
        if os.path.exists(game_dir):
            shutil.rmtree(game_dir)

class GameWrapper:
    def __init__(self, email_to):
        self.email_to = email_to
        self.answers = []

    def add(self, answer):
        self.answers.append(answer)

    def write_and_send(self):
        m = "Subject: Consequences!\n\n"
        m+= "{0} met {1} at {2}\n"
        m+= "He said \"{3}\"\n"
        m+= "She said \"{4}\"\n"
        m+= "And the consequence was {5}\n"
        m+= "And the world said: {6}"
        m = m.format(*self.answers)

        logger.debug("About to send to {}".format(self.email_to))
        logger.debug(m)

        send_email(m, self.email_to)


def new_game():
    gamecode = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
    game = SimpleEmailBasedGame(gamecode)
    game.prepare()
    return gamecode

def answers(gamecode, answers):
    game = find_game(gamecode)
    game.handle_answers(answers)

def end_game(gamecode, emails=True):
    game = find_game(gamecode)
    t = threading.Thread(target=game.end_game, args=[emails])
    t.start()

def find_game(gamecode):
    game = SimpleEmailBasedGame(gamecode)
    if not game.exists():
        raise InvalidGame()
    return game

def list_games():
    base_dir = GAME_LOCATION
    dirs = [f for f in os.listdir(base_dir) if os.path.isdir(os.path.join(base_dir, f))]
    map = {d: SimpleEmailBasedGame(d).count_answers() for d in dirs }
    return map

def send_email(msg, receiver_email=None):
    with open(os.path.join(CONF_LOCATION, "smtp"), 'r') as f:
        str = f.read()
        creds = json.loads(str)
    port = creds["port"]
    password = creds["pwd"]
    host = creds["host"]
    user = creds["username"]
    sender = creds["sender"]
    if receiver_email is None:
        receiver_email = creds["sender"] ## TODO: TESTING1

    context = ssl.create_default_context()
    with smtplib.SMTP_SSL(host, port, context=context) as server:
        server.login(user, password)
        # TODO: Send email here
        server.sendmail(sender, receiver_email, msg)


def run ():
    print("Controller run")
