async function getQR() {
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
    if (sync.internal.tokens[issuer]) {
      sync.internal.tokens[issuer]["accounts"][user] =
      {
        "secret":secret,
      };
    }
    else {
      sync.internal.tokens[issuer] =
      {
        "accounts":
          {
          [user]:
              {
                "secret":secret
              }
          }
      };
    }
    debugger
    if (!(sync[issuer])) {
      sync.internal.active.push(issuer);
      sync[issuer] = settings;
      // chrome.storage.sync.set({[issuer]: settings});
    }
    chrome.storage.sync.set(sync);
  })
}

function getFavicon(response, callback) {
  const imageUrl = response; //https://thewebdev.info/2021/09/25/how-to-use-the-fetch-api-to-get-an-image-from-a-url/
  (async () => {
    let response;
    try {
      response = await fetch(imageUrl)
    }
    catch(e) {
      getImageDataURL(imageUrl, (faviconDataURL) => {
        try {
          let data = faviconDataURL.toDataURL()
          callback(data);
        }
        catch (e) {
          chrome.runtime.sendMessage({type:"favicon", url:imageUrl}, function (te){
            callback(te.favicon);
          });
        }
      })
    }
    const imageBlob = await response.blob()
    const reader = new FileReader();
    reader.readAsDataURL(imageBlob);
    reader.onloadend = () => {
      const base64data = reader.result;
      // if (!(Math.round((base64data.split(",")[1].length)*3/4) > 7500)) {
        callback(base64data);
      // }
      // else {
        // getImageDataURL(base64data, (faviconDataURL) => {callback(faviconDataURL.toDataURL())});
      // }
    }
  })()


}

function getImageDataURL(source, callback){
  let image = new Image();
  image.src = source;
  image.onload = function() {
    var cans = document.createElement('canvas');
    cans.width = image.naturalWidth;
    cans.height = image.naturalHeight;
    cans.getContext('2d').drawImage(image, 0,0);
    callback(cans);
  }
}

function reduceImageSize(source, callback, size=128){
  let image = new Image();
  image.src = source;
  image.onload = function() {
    var cans = document.createElement('canvas');
    cans.width = size;
    cans.height = size;
    context = cans.getContext('2d')
    context.scale(size/image.width,  size/image.height);
    context.drawImage(image, 0,0);
    if (Math.round((cans.toDataURL().split(",")[1].length)) > 7500) {
      reduceImageSize(cans.toDataURL(), (cans)=> {callback(cans)}, size=96)
    }
    else {
      callback(cans);
    }
  }
}

chrome.runtime.onMessage.addListener(
     function(message, sender, sendResponse) {
        switch(message.type) {
            case "fav_url":

              let t_fav = window.location.href;

              if (!(t_fav.includes(".svg"))) {
                  getImageDataURL(t_fav, (faviconDataURL) => {
                    if (!(Math.round((faviconDataURL.toDataURL().split(",")[1].length)*3/4) > 7500)) {
                      sendResponse({favi:faviconDataURL.toDataURL()});
                      window.close();
                      return true
                    }
                    else {
                      reduceImageSize(faviconDataURL.toDataURL(), (faviconDataURL) => {
                        sendResponse({favi:faviconDataURL.toDataURL()});
                        window.close();
                        return true
                      })
                    }
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
              getQR().then((value)=>{

                chrome.runtime.sendMessage({type:"qr"}, (response)=> {
                  let img = new Image();
                  img.src= response.tabC;

                  img.onload = function () {
                    let t = value.box;
                    let canvas = document.createElement("canvas");
                    canvas.width = t.width;
                    canvas.height = t.height;
                    const ctx = canvas.getContext("2d");
                    var scale = window.devicePixelRatio;
                    ctx.drawImage(img, t.x * scale, t.y * scale, t.width * scale, t.height * scale, 0, 0, t.width, t.height);
                    let url = canvas.toDataURL();

                    let im = new Image()
                    im.src = url
                    var totp = new jsOTP.totp();

                    function slow(res) {
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

                      let te = otpObj?.digits;
                      let issuer = otpObj.issuer ? otpObj.issuer : (otpObj.user.includes("@")) ? otpObj.user.split("@")[1].split(".")[0] : "";
                      issuer = issuer.toLowerCase() //could save this line by appending it to here ------------------------------------^  just need to be sure all issuers are lowercase

                      console.log("lowe2")

                      alert(`Added ${otpObj.user} | Verification Code: ${totp.getOtp(otpObj.secret)}`)
                      chrome.storage.local.get(["external"], (local) => {
                        console.log("lower")
                        if (local.external[issuer]) {
                          storeData(otpObj.user, otpObj.secret, issuer, local.external[issuer])
                        }
                        else {
                          debugger
                          getFavicon(response.fav, function(favicon) {
                            debugger
                            console.log("here")
                            let issuerSettings = {
                              "settings":
                                {
                                  "host":window.location.hostname.substring(window.location.hostname.lastIndexOf(".", window.location.hostname.lastIndexOf(".") - 1) + 1), //function?
                                  "setup_page" : window.location.href
                                }
                            }
                            if (Math.round((favicon.split(",")[1].length)*3/4) > 7500) {
                              // console.log("reducing")
                              reduceImageSize(favicon, (e)=> {
                                issuerSettings.settings["favicon"] = e.toDataURL();
                                // console.log(Math.round((e.toDataURL().split(",")[1].length)*3/4))
                                local.external[issuer] = issuerSettings;
                                chrome.storage.local.set(local);
                                storeData(otpObj.user, otpObj.secret, issuer, issuerSettings);
                              });
                            }
                            else {
                              issuerSettings.settings["favicon"] = favicon;
                              local.external[issuer] = issuerSettings;
                              chrome.storage.local.set(local);
                              storeData(otpObj.user, otpObj.secret, issuer, issuerSettings);
                            }



                          })
                        }
                      })
                    }

                    const qrcode = new QRCode.Decoder();
                    qrcode
                      .scan(url)
                      .then(result => {
                        slow(result.data);
                      })
                      .catch(error => {

                        alert("Invalid QR code")
                        console.log(error);
                      });
                  };
                })
              });
              return true

            case "updateIcon":
                chrome.storage.local.get(["external"], (local) => {
                  chrome.runtime.sendMessage({type:"faviconUrl"}, (response)=> {
                    getFavicon(response.fav, function(favicon) {
                        getImageDataURL(favicon, (favicon) => {
                          if (!(favicon.toDataURL() > 8000)) {

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
