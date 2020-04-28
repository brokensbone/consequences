import datetime
import json
import logging
from functools import wraps

from flask import Flask, request, abort
from waitress import serve

from src import controller

app = Flask("consequences")

logger = logging.getLogger("web")
logger.setLevel("DEBUG")
handler = logging.StreamHandler()
handler.setLevel("DEBUG")
logger.addHandler(handler)
logger.debug("LOG ON")

def get_gamecode():
    c = request.args.get("game")
    logger.debug("gamecode={}".format(c))
    return c

@app.route("/")
def hello():
    return "And the consequence was..."

@app.route("/newgame")
def newgame():
    return controller.new_game()

@app.route("/checkgame")
def check():
    try:
        controller.find_game(get_gamecode())
        return "Valid"
    except controller.InvalidGame as i:
        return "Invalid", 400

@app.route("/submit")
def submit():
    controller.answers(get_gamecode(), answers)

@app.route("/endgame")
def endgame():
    gamecode = get_gamecode()
    controller.end_game(gamecode)
    return "Ending game {}".format(gamecode)

def launch():
    serve(app, host='0.0.0.0', port=8000)
