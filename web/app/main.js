/*eslint-env es6*/ // Enables es6 error checking for that file
/*eslint-env jquery*/
/*global document, window, URLSearchParams, alert, XMLHttpRequest, console*/

/***
 *  This is the main file. For now.
 *
 *
 */

/*************************************************** CONSTANTS **********************/

var URL = "/api/";
const QUERY_PARAM_ACTION = "action";
const QUERY_PARAM_SERVER = "server";

const RESOURCE_NEW = "new";
const RESOURCE_RANDOM = "random";
const RESOURCE_MPD = "mpd";
const RESOURCE_SEARCH_ARTIST = "searchartist";

const ELEMENT_ID_CONTAINER = "container"

/*************************************************** CONTROLLERS **********************/

/**
 * WebApp.
 * Responsible for kicking off the whole damn show.
 *
 */
class WebApp {
    constructor() {
        this.params = new URLSearchParams(window.location.search)
    }

    /**
     * Use URL to construct a controller, then delegate page load to it.
     */
    go() {
        let resource = this.getResType()
        let controller = this.constructController(resource)
        let container = document.getElementById(ELEMENT_ID_CONTAINER);
        controller.start(container)
    }

    getResType() {
        if (this.params.has(QUERY_PARAM_ACTION)) {
            return this.params.get(QUERY_PARAM_ACTION);
        }
        return RESOURCE_NEW;
    }

    constructController(resource) {
        if (resource == RESOURCE_NEW){
            /*
            let e = document.getElementById("container-footer")
            let url = "new"
            if ("minAdded" in e.dataset) {
                let minAdded = e.dataset.minAdded
                url += `?max_added=${minAdded}`
            }*/
            return AlbumViewController.factoryNew();
        } else if (resource == RESOURCE_RANDOM) {
            return AlbumViewController.factoryRandom();
        } else if (resource == RESOURCE_MPD) {
            return new MpdServerController(this.params.get(QUERY_PARAM_SERVER));
        } else if (resource == RESOURCE_SEARCH_ARTIST) {
            return new ArtistSearchController();
        } else {
            return this.constructController(RESOURCE_NEW);
        }
    }

}

/**
 * A page for a MPD server
 */
class MpdServerController {
    constructor(name) {
        this.model = new MpdServerModel(name)
        this.view = new MpdServerView(this.model)
        this.name = name
    }

    start(parentView) {

        this.view.show(parentView)

        this.model.fetchStatus().then(value => {
            console.log("Got status")
           this.view.showStatus(value.response)
        });

        this.model.fetchPlaylist().then(value => {
            console.log("Got playlist")
            this.view.addPlaylistTable(value.response)
        });
    }
}

/**
 * A page for a displaying some albums
 */
class AlbumViewController{
    constructor(model) {
        this.model = model
        this.loadingData = false
    }

    static factoryNew() {
        return new AlbumViewController(RecordBox.factoryNew());
    }
    static factoryRandom() {
        return new AlbumViewController(RecordBox.factoryRandom());
    }

    loadDataIntoView(view) {
        if (this.loadingData) {
          //console.log("IZ BIZZY BYE")
          return
        }

        this.loadingData = true;

        //console.log("LOADS DATA INNIT")
        let model = this.model
        model.fetch().then((value) => {
            let albums = model.read(value)
            view.show(albums, this)
            //console.log("IZ NO MORE BIZZI")
            this.loadingData = false
        });
    }

    start(parentView) {
        let view = new AlbumPageView(parentView)

        view.showLoadButton(() => { this.loadDataIntoView(view) })

        this.loadDataIntoView(view)
    }

    albumButtonPressed(record, action) {
        switch (action) {
            case "Play":
                record.albumPlayButtonPressed(action);
                break;
            case "Queue":
                record.albumPlayButtonPressed(action);
                break;
            case "Info":
                this.showAlbumInfo(record)
                break;
            default:
                alert("I'm sorry. I don't know what to do with that button")
        }
    }

    showAlbumInfo(record) {
        let albumArtist = record.json.albumartist
        let albumTitle = record.json.album

        //Pop up a modal.
        let builder = new ModalBuilder()
        builder.title(`${albumArtist} - ${albumTitle}`)
        builder.show()

        //Ask the server for the tracks.
        this.model.fetchTracks(record).then((values) => {
            //And show them!
            let body = builder.main()

            let tab = builder.viewUtil.uiCreateElement(body, "table", "table table-striped")
            let bod = builder.viewUtil.uiCreateElement(tab, "tbody", "")

            //for (var track in values.tracks) {
            for (var i=0; i<values.tracks.length; i++) {
                let track = values.tracks[i]
                let row = builder.viewUtil.uiCreateElement(bod, "tr", "")

                let keyField = builder.viewUtil.uiCreateElement(row, "th", "")
                keyField.setAttribute("scope", "row")
                keyField.innerHTML = track.track

                let artistField = builder.viewUtil.uiCreateElement(row, "td", "")
                artistField.innerHTML = track.artist

                let textField = builder.viewUtil.uiCreateElement(row, "td", "")
                textField.innerHTML = track.title
            }
        })
    }
}

class ArtistSearchController {
    constructor() {
        this.ui = new ViewUtil()
        this.searchView = new SearchBarView()
        this.albumView = null //Late init because it needs parent component :(
        this.recordBox = new RecordBoxSearchArtist()
    }
    start(parentView) {
        let searchDiv = this.ui.div(parentView)
        let resultDiv = this.ui.div(parentView)

        this.searchView.show(searchDiv)
        this.searchView.button.onclick = (() => {
            this.doSearch()
        })
        this.searchView.input.addEventListener("keyup", (event) => {
            if (event.key === "Enter") {
                this.doSearch()
            }
        });

        this.albumPageView = new AlbumPageView(resultDiv)
    }
    doSearch() {

        let albumViewController = AlbumViewController.factoryRandom()

        this.albumPageView.clear()
        let text = this.searchView.getSearchText()
        console.log(text)
        this.recordBox.queryString = text
        this.recordBox.fetch().then( (value) => {
            let albums = this.recordBox.read(value)
            this.albumPageView.show(albums, albumViewController) //// TODO: This is broken
        })
    }
}

/************************************************************* UTILITIES **************/

/**
 * Simple utility stuff for putting views together.
 */
class ViewUtil {
    uiCreateCard(parent) {
        var div = document.createElement("div");
        div.className = "card bg-light mb-3"
        //div.style = "width: 18rem;"
        if (parent != null) {
            parent.appendChild(div);
        }
        return div;
    }
    uiCreateCardBody(parent) {
        var innerDiv = document.createElement("div")
        innerDiv.className = "card-body"
        parent.appendChild(innerDiv)
        return innerDiv;
    }
    uiCreateCardTitle(parent, titleText) {
        var textTitle = document.createElement("h5");
        textTitle.className = "card-title";
        textTitle.innerHTML = titleText;
        parent.appendChild(textTitle)
        return textTitle;
    }
    uiCreateElement(parent, tagName, className) {
        let tag =  document.createElement(tagName)
        tag.className = className
        parent.appendChild(tag)
        return tag
    }

    div(parent, className="") {
        return this.uiCreateElement(parent, "div", className)
    }
    removeAllChildren(element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }
}

/**
 * Tidies away mucky HTTP stuff.
 */
class NetUtil {
    promiseGetJson(url) {
        return new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'json';
            xhr.onload = function() {
              var status = xhr.status;
              if (status === 200) {
                resolve(xhr.response);
              } else {
                reject(xhr.response);
              }
            };
            xhr.send();
        });
    }

    promisePostJson(url, jsonData) {
        return new Promise(function(resolve, reject) {
            let json = JSON.stringify(jsonData)
            //console.log(json)
            var xhr = new XMLHttpRequest();
            xhr.responseType = 'json';
            xhr.open("POST", url, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.onload = function() {
                if (xhr.status === 200) {
                    resolve(xhr.response);
                } else {
                    reject(xhr.response);
                }
            }
            xhr.send(json);
        });
    }
}

class ModalBuilder {
    constructor() {
        this.viewUtil = new ViewUtil()

        let divModal = this.viewUtil.div(document.body, "modal")
        divModal.setAttribute("tabIndex", "-1")
        divModal.setAttribute("role", "dialog")

        let divModalDialog = this.viewUtil.div(divModal, "modal-dialog")
        divModalDialog.setAttribute("role", "document")

        let divModalContent = this.viewUtil.div(divModalDialog, "modal-content")
        let divModalHeader = this.viewUtil.div(divModalContent, "modal-header")
        let titleElement = this.viewUtil.uiCreateElement(divModalHeader, "h5", "modal-title")
        titleElement.innerHTML = "Default tile"

        let closeButton = this.viewUtil.uiCreateElement(divModalHeader, "button", "close")
        closeButton.setAttribute("type", "button")
        closeButton.setAttribute("data-dismiss", "modal")
        closeButton.setAttribute("aria-label", "Close")

        let span = this.viewUtil.uiCreateElement(closeButton, "span")
        span.setAttribute("aria-hidden", "true")
        span.nodeValue = "&times;"

        let modalBody = this.viewUtil.div(divModalContent, "modal-body")

        let modalFooter = this.viewUtil.div(divModalContent, "modal-footer")

        //Keep the bits we'll need later
        this.modalElement = divModal
        this.titleElement = titleElement
        this.bodyElement = modalBody
    }

    title(titleText) {
        this.titleElement.innerHTML = titleText
    }

    main() {
        return this.bodyElement
    }

    show() {
        let jQueryElement = jQuery(this.modalElement)
        jQueryElement.modal({show: true})
    }



    /*
    <div class="modal" tabindex="-1" role="dialog" id="dialog-pick-server">
      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Modal title</h5>
            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body">
            <p>Modal body text goes here.</p>
          </div>
          <div class="modal-footer" id="dialog-pick-server-footer" >
            <button type="button" class="btn btn-primary" data-dismiss="modal">Kitchen</button>
            <button type="button" class="btn btn-primary" data-dismiss="modal">Frontroom</button>
          </div>
        </div>
      </div>
    </div>*/
}

/************************************************************ VIEWS ***************/

/**
 * Draws a page of albums
 */
class AlbumPageView {
    constructor(parentView) {
        this.parentView = parentView
        this.ui = new ViewUtil()
        this.albumDiv = this.ui.uiCreateElement(parentView, "div", "")
        this.buttonDiv = this.ui.uiCreateElement(parentView, "div", "")
    }

    show(albums, controller) {
        var container = this.albumDiv
        var deck = container
        for (var i=0; i<albums.length; i++) {

            if (i % 3 === 0) {
                deck = document.createElement("div")
                deck.className = "card-deck"
                container.appendChild(deck)
            }

            let record = albums[i]
            let albumPanel = new AlbumPanel(record)
            albumPanel.show(deck, controller);
        }
    }

    showLoadButton(callback) {
        let ui = new ViewUtil()

        let button = ui.uiCreateElement(this.buttonDiv, "buttn", "btn btn-outline-primary mx-1")
        button.innerHTML = "Load More"
        button.onclick = callback

        const config = {
          root: null, 	// sets the framing element to the viewport
          rootMargin: '0px',
          threshold: 1
        };

        let observer = new IntersectionObserver((entry, observer) => {
          let ratio = entry.intersectionRatio
            //console.log("BUT IS VIZ??")
            callback()
        });

        observer.observe(button)

    }
    clear() {
        this.ui.removeAllChildren(this.albumDiv)
    }
}

/**
 * Draws a single album
 */
class AlbumPanel {
    constructor(record) {
        this.record = record
        this.album = record.json
        this.util = new ViewUtil()
    }

    show(parent, controller) {
        var artist = this.album.albumartist,
        title = this.album.album;

        let divWrapper = this.util.uiCreateCard(parent)
        let innerDiv = this.util.uiCreateCardBody(divWrapper)

        this.util.uiCreateCardTitle(innerDiv, artist)

        var textTitle = document.createElement("h6");
        textTitle.className = "card-subtitle mb-2 text-muted";
        textTitle.innerHTML = title;
        innerDiv.appendChild(textTitle)

        //Genre, albumtype, year
        var genre = this.album.genre,
            albumtype = this.album.albumtype,
            year = this.album.year
        let text = this.util.uiCreateElement(innerDiv, "p", "card-text")
        //text.innerHTML = `${genre} - ${albumtype} - ${year}`
        text.innerHTML = [year, albumtype, genre].filter(Boolean).join(" - ")

        //Footer
        let footer = this.util.uiCreateElement(divWrapper, "div", "card-footer")
        //footer.innerHTML = "Play Kitchen Play frontroom"

        let actions = ["Play", "Queue", "Info"]
        for (var i=0; i<actions.length; i++) {
            let action = actions[i]
            var btn = this.util.uiCreateElement(footer, "buttn", "btn btn-outline-primary mx-1")
            btn.type = "button";
            btn.innerHTML = action;
            btn.onclick = (() => {
                //this.record.albumButtonPressed(this.album, action)
                controller.albumButtonPressed(this.record, action)
            });
        }
    }
}

/**
 * Draws a single MPD server
 */
class MpdServerView {
    constructor(mpdServerModel) {
        this.model = mpdServerModel
        this.viewmap = {}
        this.vu = new ViewUtil()
    }

    show(parent) {

        var deck = document.createElement("div")
        deck.className = "card-deck"
        let card = this.vu.uiCreateCard(deck);
        let body = this.vu.uiCreateCardBody(card);
        this.getMpdServerElement(body);
        parent.appendChild(deck)

        this.viewmap.card = card
        this.viewmap.body = body
    }

    showStatus(json) {
        let table = this.createMpdStatusTable(json)
        this.viewmap.body.appendChild(table);
    }

    createPlaybackButton(command) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "btn btn-outline-primary mx-1";
        button.innerHTML = command;
        button.onclick = (() => {
            this.model.mpdPlaybackButtonPressed(command);
        });
        return button
    }

    getMpdServerElement(body) {
        this.vu.uiCreateCardTitle(body, this.model.name)

        body.appendChild(this.createPlaybackButton("prev"))
        body.appendChild(this.createPlaybackButton("pause"))
        body.appendChild(this.createPlaybackButton("play"))
        body.appendChild(this.createPlaybackButton("next"))
    }

    createMpdStatusTable(statusJson) {
        console.log(statusJson)
        let interestingFeatures = ["state", "volume", "repeat"]

        var wrap = document.createElement("p")
        wrap.className = "card-text"

        let tab = document.createElement("table");
        tab.className = "table";
        let bod = document.createElement("tbody");
        tab.appendChild(bod);

        for (var key in statusJson) {
            if (!interestingFeatures.includes(key)) {
                continue;
            }

            let val  = statusJson[key]

            let r = document.createElement("tr")
            bod.appendChild(r)

            let keyField = document.createElement("th")
            keyField.setAttribute("scope", "row")
            keyField.innerHTML = key

            let valField = document.createElement("td")
            valField.innerHTML = val

            r.appendChild(keyField)
            r.appendChild(valField)
        }
        //return tab
        wrap.appendChild(tab)
        return wrap
    }

    addPlaylistTable(playlistJson) {
        let parent = this.viewmap.body

        var wrap = document.createElement("p")
        wrap.className = "card-text"
        parent.appendChild(wrap)

        let tab = this.vu.uiCreateElement(wrap, "table", "table table-striped")
        let bod = this.vu.uiCreateElement(tab, "tbody", "")

        for (var i=0; i<playlistJson.length; i++) {
            let track = playlistJson[i]
            let row = this.vu.uiCreateElement(bod, "tr", "")

            let keyField = this.vu.uiCreateElement(row, "th", "")
            keyField.setAttribute("scope", "row")
            keyField.innerHTML = i+1

            let artistField = this.vu.uiCreateElement(row, "td", "")
            artistField.innerHTML = track.artist

            let textField = this.vu.uiCreateElement(row, "td", "")
            textField.innerHTML = track.title
        }
    }
}


class SearchBarView {
    constructor() {
        this.input = null
        this.button = null
    }
    show(element) {
        let ui =  new ViewUtil()

        this.wrapper = ui.div(element, "input-group mb-3")

        this.input = ui.uiCreateElement(this.wrapper, "input", "form-control")
        this.input.setAttribute("placeholder", "Artist name")
        this.input.setAttribute("aria-label", "Artist's name")
        this.input.setAttribute("aria-described-by", "basic-addon2")

        let buttonWrapper = ui.div(this.wrapper, "input-group-append")
        this.button = ui.uiCreateElement(buttonWrapper, "button", "btn btn-outline-secondary")
        this.button.type = "button"
        this.button.innerHTML = "Search"
    }

    getSearchText() {
        return this.input.value
    }
}

/************************************************************ MODELS ******************/

/**
 * This is an MPD server
 */
class MpdServerModel {
    constructor(name) {
        this.name = name
        this.net = new NetUtil()
    }

    fetchStatus() {
        return this.net.promisePostJson(URL+"mpdcommand", {mpd:this.name, cmd:"status"});
    }
    fetchPlaylist() {
        return this.net.promisePostJson(URL+"mpdcommand", {mpd:this.name, cmd:"playlist"});
    }


    mpdPlaybackButtonPressed(command) {
        this.net.promisePostJson(URL+"mpdcommand", {mpd:this.name, cmd:command});
    }

}

/**
 * A bunch of albums
 */
class RecordBox {
    constructor(apiCall) {
        this.apiCall = apiCall
        this.net = new NetUtil()
    }

    static factoryNew() {
        return new RecordBoxNew()
    }
    static factoryRandom() {
        return new RecordBox("random")
    }

    fetch() {
        return this.net.promiseGetJson(this.buildUrl())
    }

    buildUrl() {
        return URL+this.apiCall
    }

    read(json) {
        return json.albums.map(albumJson => new Record(albumJson))
    }

    fetchTracks(record) {
        return this.net.promiseGetJson(`${URL}tracks?album=${record.json.id}`)
    }
}

/**
 * Get new ones, with a date limit.
 */
class RecordBoxNew extends RecordBox {
    constructor() {
        super("new")
        this.minAdded = null
    }
    buildUrl() {
        let url = super.buildUrl()
        if (this.minAdded != null) {
            url += `?max_added=${this.minAdded}`
        }
        return url
    }
    read(json) {
        let allAdded = json.albums.map(x => x.added)
        this.minAdded = Math.min.apply(Math, allAdded)
        return super.read(json)
    }
}

class RecordBoxSearchArtist extends RecordBox {
    constructor() {
        super("searchartist")
        this.queryString = "None"
    }
    buildUrl() {
        return super.buildUrl() + `?query=${this.queryString}`
    }
}

/**
 * A single album.
 */
class Record {
    constructor(json) {
        this.json = json
        this.net = new NetUtil()
    }

    albumPlayButtonPressed(action) {
        let net = this.net
        let albumJson = this.json

        //This is gross. Nicked from https://stackoverflow.com/questions/28270333
        $('#dialog-pick-server .modal-footer button').on('click', function(event) {
            var $button = $(event.target); // The clicked button

            $(this).closest('.modal').one('hidden.bs.modal', function() {
                // Fire if the button element
                let txt = $button.text()
                //console.log('The button that closed the modal is: ', txt);
                //console.log(`I want to ${action} album ${albumJson.id} on ${txt}`)
                let playNow = (action == "Play")
                net.promisePostJson(URL+"playalbum", { mpd: txt, album: albumJson.id, play: playNow})
            });


            $('#dialog-pick-server .modal-footer button').off('click');
        });

        $('#dialog-pick-server').modal({show: true})
    }
}

function onLoadIndex() {
    let app = new WebApp()
    app.go()
}

function getGamecode() {
  let url = new URLSearchParams(window.location.search)
  if (url.has("game")){
    return url.get("game")
  }
  return "<No Game Specified>"
}

function checkGameValid() {
  console.log("Running")
  let code = getGamecode()
  console.log("Prepare fn")
  let p = new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      //xhr.responseType = 'json';
      xhr.open("GET", URL+"checkgame?game=", true);
      //xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onload = function() {
          if (xhr.status === 200) {
              resolve(xhr.response);
          } else {
              reject(xhr.response);
          }
      }
      console.log("Fn send")
      xhr.send();
  });
  p.then(function(result){
    console.log("OK")
  }, function(error) {
    alert("YOur gamecode isn't valid")
  });
}
