
var URL = "./api/";

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
      xhr.open("GET", URL+"checkgame?game="+code, true);
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
    document.getElementById("gamecode").value = code;
  }, function(error) {
    alert("Gamecode '" + code + "' isn't valid")
    window.location.href = "../";
  });
}
