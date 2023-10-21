async function getQR() { // have not yet addressed
  return new Promise((resolve, reject) => {
    let overlay = document.createElement("div");
    overlay.id = "__otpOverlayDiv";
    document.body.appendChild(overlay);

    async function returnBox(box) {
      return new Promise((resolve, reject) => {

        function anon(e) {
          if (e.key == "Escape") {
            document.removeEventListener("keydown", anon)
            document.body.removeChild(overlay)
            overlay.removeEventListener("mousemove",mouseM);
            overlay.removeEventListener("mousedown",mouseD);
            overlay.removeEventListener("mouseup",mouseU);

            return
          }
        }

        document.addEventListener("keydown", anon)

        var selectionDiv = document.createElement("div");
        selectionDiv.id = "__otpSelectionDiv";
        overlay.appendChild(selectionDiv);
        overlay.style.display = "block";

        let startX, startY;

        function mouseM(e) {
          testMin = Math.min(startX, e.clientX)
          testMax = Math.max(startX, e.clientX)

          testYMin = Math.min(startY, e.clientY)
          testYMax = Math.max(startY, e.clientY)

          selectionDiv.style.left = testMin + "px";
          selectionDiv.style.top = testYMin + "px";

          selectionDiv.style.width = testMax - testMin + "px";
          selectionDiv.style.height = testYMax - testYMin + "px";
        }

        function mouseD(e) {
          selectionDiv.style.borderWidth = "2px";
          startX = e.clientX;
          startY = e.clientY;
        }

        function mouseU(e) {
          selectionDiv.style.borderWidth = "0px";
          document.body.removeChild(overlay)

          resolve({
            x: Math.floor(testMin),
            y: Math.floor(testYMin),
            width: Math.floor(testMax - testMin),
            height: Math.floor(testYMax - testYMin)
          });

          overlay.removeEventListener("mousemove",mouseM);
          overlay.removeEventListener("mousedown",mouseD);
          overlay.removeEventListener("mouseup",mouseU);
        }
        overlay.addEventListener("mousedown", mouseD);
        overlay.addEventListener("mousemove", mouseM);
        overlay.addEventListener("mouseup", mouseU);
      });
    }

    returnBox().then((box)=>{

      let full = {box:box, page:{x: window.pageXOffset,y: window.pageYOffset,width:window.innerWidth, heigh:window.innerHeight}}
      resolve(full)
    })
  })
}

function storeData(user, secret, issuer, settings) {

  chrome.storage.sync.get(null, (sync) => {
    
    let userGUID = crypto.randomUUID()

    if (sync.internal.tokens[issuer]) {
      sync.internal.tokens[issuer][userGUID] = 
      {
        "username": user,
        "secret":secret
      };
    }

    else {
      sync.internal.tokens[issuer] = {
        [userGUID]:
            {
              "username": user,
              "secret":secret
            }
      };
    }

    if (!(sync[issuer])) {
      sync[issuer] = settings;
    }
    chrome.storage.sync.set(sync);
  })
}

function getFavicon(response, callback) {
  const imageUrl = response; 
  (async () => {
    let response;
    try {
      response = await fetch(imageUrl)
    }
    catch(e) {
      chrome.runtime.sendMessage({type:"favicon", url:imageUrl}, function (te){
        callback(te.favicon);
      });
    }
    const imageBlob = await response.blob()
    const reader = new FileReader();
    reader.readAsDataURL(imageBlob);
    reader.onloadend = () => {
      const imageData = reader.result;
      if (!(Math.round((imageData.split(",")[1].length)*3/4) > 7900)) { // need to check whether (png vs webp) b64 encodes it differently
        callback(imageData);                                            // in reference to the '* 3/4'
      }
      else {
        getImageDataURL(imageData, (updatedImageData) => {callback(updatedImageData)});
      }
    }
  })()
}

function getImageDataURL(source, callback){
  let image = new Image();
  let cans = document.createElement('canvas');
  
  image.onload = function() {
    cans.width = image.naturalWidth;
    cans.height = image.naturalHeight;
    cans.getContext('2d').drawImage(image, 0,0);
    let q = 1
    while (cans.toDataURL("image/webp", q).length > 7900) { // 7900 is semi-arbitrary. icon data + other < 8KB quota
      q -= 0.1;
    }
    callback(cans.toDataURL("image/webp", q));
  }
  image.src = source;
}

chrome.runtime.onMessage.addListener(
     function(message, sender, sendResponse) {
        switch(message.type) {
            case "fav_url":

              let t_fav = window.location.href;

              if (!(t_fav.includes(".svg"))) { // .svg pages don't have a DOM (?) so handled differently.
                  getImageDataURL(t_fav, (imageData) => {
                    sendResponse({favi:imageData});
                    window.close();
                    return true
                  });
              }
              else {
                var svgIconElement = document.querySelector("svg").outerHTML;
                var svgDataURL = `data:image/svg+xml,${encodeURIComponent(svgIconElement)}`; // SO - 28450471
                sendResponse({favi:svgDataURL});
                window.close();
                return true
              }

            case "getQR":
              var totp = new jsOTP.totp();
              getQR().then((value)=>{

                chrome.runtime.sendMessage({type:"qr"}, (response)=> {
                  
                  let t = value.box;
                  let canvas = document.createElement("canvas");
                  canvas.width = t.width;
                  canvas.height = t.height;
                  const ctx = canvas.getContext("2d");
                  var scale = window.devicePixelRatio;

                  let img = new Image();
                  img.src= response.tabC; //should this go after image.onload?

                  img.onload = function () {
                    
                    ctx.drawImage(img, t.x * scale, t.y * scale, t.width * scale, t.height * scale, 0, 0, t.width, t.height);
                    // console.log( canvas.toDataURL("image/webp", 0.5).length) // webp for less data? (but quality is fine)
                    let url = canvas.toDataURL();
                    
                    let im = new Image()
                    im.src = url

                    function parseQR(res) {
                      
                      // not addressed: Digits, Type, Counter, non-standard params. 

                      if (!(res.startsWith("otp"))) {
                        alert(res)
                        return
                      }
                      console.log(res)
                      const otpURI = new URL(decodeURIComponent(res));
                      var otpObj = {};

                      for (let [x, y] of otpURI.searchParams) {
                        otpObj[x] = y
                      }
                      otpObj = Object.assign(otpObj, {
                        host: otpURI.pathname.split("/").at(-1).includes(":") ? otpURI.pathname.split("/").at(-1).split(":")[0] : "", //kind of redundant
                        user: otpURI.pathname.split("/").at(-1).includes(":") ? otpURI.pathname.split("/").at(-1).split(":")[1]  : otpURI.pathname.split("/").at(-1)
                      });

                      let issuer = otpObj.issuer ? otpObj.issuer : (otpObj.host) ? otpObj.host : ""
                      issuer = issuer.toLowerCase() 

                      let keyCode = totp.getOtp(otpObj.secret)

                      alert(`Added ${otpObj.user} | Verification Code: ${keyCode.slice(0,3)} ${keyCode.slice(3)}`)
                      
                      // Store Data

                      chrome.storage.local.get(["external"], (local) => {

                        if (local.external[issuer]) { // check for exisiting stored icon
                          storeData(otpObj.user, otpObj.secret, issuer, local.external[issuer])
                        }
                        else {
                          getFavicon(response.fav, function(favicon) {
                            let issuerSettings = {
                              "settings": {
                                  "favicon": favicon,
                                  "icon_page": response.fav,
                                  "setup_page" : window.location.href
                                }
                            }
                            local.external[issuer] = issuerSettings;
                            chrome.storage.local.set(local);
                            storeData(otpObj.user, otpObj.secret, issuer, issuerSettings);
                          })
                        }
                      })
                    }

                    const qrcode = new QRCode.Decoder();
                    qrcode
                      .scan(url)
                      .then(result => {
                        parseQR(result.data); //try to alert secret, etc asap (for UX)
                      })
                      .catch(error => {

                        alert("Invalid QR code. Try Again") 
                        // console.log(error);      // on sucessive fails, suggest manual?
                      });
                  };
                })
              });
              return true

            case "updateIcon": // have not yet addressed
                chrome.storage.local.get(["external"], (local) => {
                  chrome.runtime.sendMessage({type:"faviconUrl"}, (response)=> {
                    getFavicon(response.fav, function(favicon) {
                        getImageDataURL(favicon, (favicon) => {
                          if (!(favicon.toDataURL() > 7900)) {

                            const issuerSettings = {
                              "settings":
                              {
                                "host":window.location.hostname.substring(window.location.hostname.lastIndexOf(".", window.location.hostname.lastIndexOf(".") - 1) + 1), //function?
                                "setup_page" : window.location.href,
                                "favicon" : favicon.toDataURL()
                              }
                        }
                            local.external[message.issuer] = issuerSettings;
                            chrome.storage.local.set(local)
                            chrome.storage.sync.set({[message.issuer]: issuerSettings});
                          }
                          else {
                            reduceImageSize(favicon.toDataURL(), (favicon)=> {
                              const issuerSettings = {
                                "settings":
                                {
                                  "host":window.location.hostname.substring(window.location.hostname.lastIndexOf(".", window.location.hostname.lastIndexOf(".") - 1) + 1), //function?
                                  "setup_page" : window.location.href,
                                  "favicon" : favicon.toDataURL()
                                }
                              }
                              local.external[message.issuer] = issuerSettings;
                              chrome.storage.local.set(local)
                              chrome.storage.sync.set({[message.issuer]: issuerSettings});
                            })
                          }
                        })
                      })
                    })
                });
                return true
            default:
                console.error("Unrecognised message: ", message);
        }
});
